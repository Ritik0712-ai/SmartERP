import { prisma } from '../../config/prisma';
import { createCompanySchema, updateCompanySchema } from '@smarterp/shared';
import { ConflictError, NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Request } from 'express';
import { Currency, UserRole } from '@prisma/client';

const MAX_COMPANIES_PER_USER = 5;

interface ReqMeta {
    ip: string;
    userAgent: string;
}

function reqMetaFromRequest(req?: Request): ReqMeta {
    if (!req) return { ip: '', userAgent: '' };
    return {
        ip: (req.ip || (req.headers['x-forwarded-for'] as string) || '').slice(0, 255),
        userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    };
}

/**
 * List all companies the current user has access to (across roles).
 */
export async function listUserCompanies(userId: string) {
    const roles = await prisma.userCompanyRole.findMany({
        where: { userId, isActive: true },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                    gstNumber: true,
                    currency: true,
                    financialYearStart: true,
                    financialYearEnd: true,
                    isActive: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
    return roles
        .filter((r) => r.company.isActive)
        .map((r) => ({
            id: r.company.id,
            name: r.company.name,
            address: r.company.address,
            gstNumber: r.company.gstNumber,
            currency: r.company.currency,
            financialYearStart: r.company.financialYearStart,
            financialYearEnd: r.company.financialYearEnd,
            role: r.role,
            createdAt: r.company.createdAt,
        }));
}

/**
 * Get a single company (must have access).
 */
export async function getCompany(userId: string, companyId: string) {
    await assertCompanyAccess(userId, companyId);
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
            financialYears: { orderBy: { startDate: 'desc' } },
            _count: {
                select: {
                    ledgers: true,
                    customers: true,
                    suppliers: true,
                    stockItems: true,
                    vouchers: true,
                    invoices: true,
                    userRoles: true,
                },
            },
        },
    });
    if (!company) throw new NotFoundError('Company not found');
    return company;
}

/**
 * Create a new company. User becomes ADMIN. Enforces 5-companies-per-user cap.
 * Also seeds default ledger groups, units, stock group, system ledgers, financial year.
 */
export async function createCompany(userId: string, input: unknown, req?: Request) {
    const data = createCompanySchema.parse(input);

    // Enforce max 5 companies
    const existingCount = await prisma.userCompanyRole.count({
        where: { userId, isActive: true },
    });
    if (existingCount >= MAX_COMPANIES_PER_USER) {
        throw new ForbiddenError(`Maximum ${MAX_COMPANIES_PER_USER} companies per account reached`);
    }

    // Validate financial year ordering
    if (data.financialYearEnd <= data.financialYearStart) {
        throw new BadRequestError('Financial year end must be after start');
    }

    const company = await prisma.company.create({
        data: {
            name: data.name,
            address: data.address,
            contactNumber: data.contactNumber,
            email: data.email,
            gstNumber: data.gstNumber,
            panNumber: data.panNumber,
            state: data.state,
            stateCode: data.stateCode,
            currency: (data.currency as Currency) ?? Currency.INR,
            financialYearStart: data.financialYearStart,
            financialYearEnd: data.financialYearEnd,
            createdById: userId,
        },
    });

    // Add user as ADMIN
    await prisma.userCompanyRole.create({
        data: { userId, companyId: company.id, role: UserRole.ADMIN },
    });

    // Current financial year
    await prisma.financialYear.create({
        data: {
            companyId: company.id,
            yearName: `${data.financialYearStart.getFullYear()}-${(data.financialYearEnd.getFullYear() % 100).toString().padStart(2, '0')}`,
            startDate: data.financialYearStart,
            endDate: data.financialYearEnd,
            isCurrent: true,
        },
    });

    // Seed default chart of accounts (sequential due to parent references)
    await seedCompanyDefaults(company.id);

    await writeAudit(
        {
            userId,
            companyId: company.id,
            module: 'company',
            entityType: 'company',
            entityId: company.id,
            action: 'CREATE',
            description: `Company ${company.name} created`,
        },
        req,
    );

    return company;
}

/**
 * Update company info.
 */
export async function updateCompany(userId: string, companyId: string, input: unknown, req?: Request) {
    await assertCompanyAccess(userId, companyId, [UserRole.ADMIN]);
    const data = updateCompanySchema.parse(input);

    if (data.financialYearStart && data.financialYearEnd && data.financialYearEnd <= data.financialYearStart) {
        throw new BadRequestError('Financial year end must be after start');
    }

    const oldCompany = await prisma.company.findUnique({ where: { id: companyId } });
    if (!oldCompany) throw new NotFoundError('Company not found');

    const company = await prisma.company.update({
        where: { id: companyId },
        data: {
            name: data.name ?? undefined,
            address: data.address ?? undefined,
            contactNumber: data.contactNumber ?? undefined,
            email: data.email ?? undefined,
            gstNumber: data.gstNumber ?? undefined,
            panNumber: data.panNumber ?? undefined,
            state: data.state ?? undefined,
            stateCode: data.stateCode ?? undefined,
            currency: data.currency ? (data.currency as Currency) : undefined,
            financialYearStart: data.financialYearStart ?? undefined,
            financialYearEnd: data.financialYearEnd ?? undefined,
        },
    });

    await writeAudit(
        {
            userId,
            companyId,
            module: 'company',
            entityType: 'company',
            entityId: companyId,
            action: 'UPDATE',
            description: `Company ${company.name} updated`,
            oldValue: oldCompany as any,
            newValue: company as any,
        },
        req,
    );

    return company;
}

/**
 * Soft delete a company (sets isActive=false). Only ADMIN of the company.
 * Company remains queryable for historical data; user loses access.
 */
export async function deleteCompany(userId: string, companyId: string, req?: Request) {
    await assertCompanyAccess(userId, companyId, [UserRole.ADMIN]);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundError('Company not found');

    await prisma.company.update({ where: { id: companyId }, data: { isActive: false } });
    // Deactivate user's role in this company
    await prisma.userCompanyRole.updateMany({
        where: { userId, companyId },
        data: { isActive: false },
    });

    await writeAudit(
        {
            userId,
            companyId,
            module: 'company',
            entityType: 'company',
            entityId: companyId,
            action: 'DELETE',
            description: `Company ${company.name} soft-deleted`,
        },
        req,
    );
}

/**
 * Helper: assert user has access to company; optionally check specific roles.
 */
export async function assertCompanyAccess(userId: string, companyId: string, allowedRoles?: UserRole[]) {
    const role = await prisma.userCompanyRole.findUnique({
        where: { userId_companyId: { userId, companyId } },
    });
    if (!role || !role.isActive) {
        throw new ForbiddenError('You do not have access to this company');
    }
    if (allowedRoles && !allowedRoles.includes(role.role)) {
        throw new ForbiddenError(`Requires role: ${allowedRoles.join(' or ')}`);
    }
    return role.role;
}

/**
 * Seed default chart of accounts, units, and stock group for a new company.
 * Idempotent: skips if already exists (e.g. on re-seed).
 */
async function seedCompanyDefaults(companyId: string) {
    const existing = await prisma.ledgerGroup.count({ where: { companyId } });
    if (existing > 0) return;

    const groups = [
        { name: 'Assets', groupType: 'ASSET' as const },
        { name: 'Liabilities', groupType: 'LIABILITY' as const },
        { name: 'Income', groupType: 'INCOME' as const },
        { name: 'Expenses', groupType: 'EXPENSE' as const },
        { name: 'Capital', groupType: 'LIABILITY' as const, parent: 'Liabilities' },
        { name: 'Sundry Debtors', groupType: 'ASSET' as const, parent: 'Assets' },
        { name: 'Sundry Creditors', groupType: 'LIABILITY' as const, parent: 'Liabilities' },
        { name: 'Sales Account', groupType: 'INCOME' as const, parent: 'Income' },
        { name: 'Purchase Account', groupType: 'EXPENSE' as const, parent: 'Expenses' },
        { name: 'Cash', groupType: 'ASSET' as const, parent: 'Assets' },
        { name: 'Bank', groupType: 'ASSET' as const, parent: 'Assets' },
        { name: 'Duties & Taxes', groupType: 'LIABILITY' as const, parent: 'Liabilities' },
    ];

    const groupIdMap = new Map<string, string>();
    for (const g of groups) {
        const created = await prisma.ledgerGroup.create({
            data: {
                companyId,
                name: g.name,
                groupType: g.groupType,
                parentGroupId: g.parent ? groupIdMap.get(g.parent) ?? null : null,
            },
        });
        groupIdMap.set(g.name, created.id);
    }

    // System ledgers
    await prisma.ledger.createMany({
        data: [
            { companyId, ledgerGroupId: groupIdMap.get('Cash')!, name: 'Cash in Hand', isSystem: true },
            { companyId, ledgerGroupId: groupIdMap.get('Bank')!, name: 'Bank', isSystem: true },
            { companyId, ledgerGroupId: groupIdMap.get('Sales Account')!, name: 'Sales', isSystem: true },
            { companyId, ledgerGroupId: groupIdMap.get('Purchase Account')!, name: 'Purchase', isSystem: true },
        ],
    });

    // Default units
    const units = [
        { name: 'PCS', symbol: 'pcs', decimals: 0 },
        { name: 'KG', symbol: 'kg', decimals: 3 },
        { name: 'LTR', symbol: 'L', decimals: 2 },
        { name: 'BOX', symbol: 'box', decimals: 0 },
        { name: 'MTR', symbol: 'm', decimals: 2 },
        { name: 'DOZ', symbol: 'dz', decimals: 0 },
    ];
    for (const u of units) {
        await prisma.unit.create({ data: { ...u, companyId } });
    }

    // Default stock group
    await prisma.stockGroup.create({ data: { companyId, name: 'General' } });
}

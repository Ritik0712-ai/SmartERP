import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Prisma, UserRole } from '@prisma/client';
import { Request } from 'express';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  mobile: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(1000).optional(),
  gstNumber: z.string().max(50).optional(),
  panNumber: z.string().max(20).optional(),
  state: z.string().max(100).optional(),
  stateCode: z.string().max(10).optional(),
  openingBalance: z.coerce.number().default(0),
  creditLimit: z.coerce.number().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
});

export const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  search: z.string().optional(),
  includeInactive: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

interface ReqMeta { ip: string; userAgent: string }
function reqMeta(req?: Request): ReqMeta {
  if (!req) return { ip: '', userAgent: '' };
  return {
    ip: (req.ip || (req.headers['x-forwarded-for'] as string) || '').slice(0, 255),
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
  };
}

/** Get the "Sundry Debtors" group for a company, or create it if missing. */
async function getOrCreateSundryDebtorsGroup(companyId: string): Promise<string> {
  let g = await prisma.ledgerGroup.findFirst({
    where: { companyId, name: 'Sundry Debtors', isActive: true },
  });
  if (!g) {
    g = await prisma.ledgerGroup.create({
      data: { companyId, name: 'Sundry Debtors', groupType: 'ASSET' },
    });
  }
  return g.id;
}

export async function listCustomers(companyId: string, opts: { search?: string; includeInactive?: boolean; page: number; pageSize: number }) {
  const where: Prisma.CustomerWhereInput = { companyId };
  if (!opts.includeInactive) where.isActive = true;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { mobile: { contains: opts.search } },
      { email: { contains: opts.search, mode: 'insensitive' } },
      { gstNumber: { contains: opts.search, mode: 'insensitive' } },
    ];
  }
  const skip = (opts.page - 1) * opts.pageSize;
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { ledger: { select: { id: true, currentBalance: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: opts.pageSize,
    }),
    prisma.customer.count({ where }),
  ]);
  return { customers, total };
}

export async function getCustomer(companyId: string, id: string) {
  const c = await prisma.customer.findFirst({
    where: { id, companyId },
    include: { ledger: { select: { id: true, currentBalance: true, name: true } } },
  });
  if (!c) throw new NotFoundError('Customer not found');
  return c;
}

export async function createCustomer(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createCustomerSchema.parse(input);
  // Check uniqueness
  const existing = await prisma.customer.findFirst({
    where: { companyId, name: data.name, isActive: true },
  });
  if (existing) throw new ConflictError(`A customer named "${data.name}" already exists`);

  // Create the customer + linked ledger (sequential to avoid $transaction pooler issue)
  const groupId = await getOrCreateSundryDebtorsGroup(companyId);
  const ledger = await prisma.ledger.create({
    data: {
      companyId,
      ledgerGroupId: groupId,
      name: data.name,
      openingBalance: data.openingBalance,
      currentBalance: data.openingBalance,
    },
  });
  const customer = await prisma.customer.create({
    data: {
      companyId,
      ledgerId: ledger.id,
      name: data.name,
      mobile: data.mobile,
      email: data.email || null,
      address: data.address,
      gstNumber: data.gstNumber,
      panNumber: data.panNumber,
      state: data.state,
      stateCode: data.stateCode,
      openingBalance: data.openingBalance,
      creditLimit: data.creditLimit,
    },
    include: { ledger: { select: { id: true, currentBalance: true } } },
  });
  await writeAudit({
    userId, companyId, module: 'customer', entityType: 'customer', entityId: customer.id,
    action: 'CREATE', description: `Customer "${customer.name}" created`,
  }, req);
  return customer;
}

export async function updateCustomer(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateCustomerSchema.parse(input);
  const old = await getCustomer(companyId, id);
  if (data.name && data.name !== old.name) {
    const existing = await prisma.customer.findFirst({
      where: { companyId, name: data.name, isActive: true, id: { not: id } },
    });
    if (existing) throw new ConflictError(`A customer named "${data.name}" already exists`);
  }
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      mobile: data.mobile ?? undefined,
      email: data.email === '' ? null : data.email ?? undefined,
      address: data.address ?? undefined,
      gstNumber: data.gstNumber ?? undefined,
      panNumber: data.panNumber ?? undefined,
      state: data.state ?? undefined,
      stateCode: data.stateCode ?? undefined,
      creditLimit: data.creditLimit ?? undefined,
      isActive: data.isActive ?? undefined,
    },
    include: { ledger: { select: { id: true, currentBalance: true } } },
  });
  // Update linked ledger name if changed
  if (data.name && data.name !== old.name) {
    await prisma.ledger.update({ where: { id: old.ledgerId }, data: { name: data.name } });
  }
  await writeAudit({
    userId, companyId, module: 'customer', entityType: 'customer', entityId: id,
    action: 'UPDATE', description: `Customer "${customer.name}" updated`,
  }, req);
  return customer;
}

export async function deleteCustomer(userId: string, companyId: string, id: string, req?: Request) {
  const old = await getCustomer(companyId, id);
  await prisma.customer.update({ where: { id }, data: { isActive: false } });
  await prisma.ledger.update({ where: { id: old.ledgerId }, data: { isActive: false } });
  await writeAudit({
    userId, companyId, module: 'customer', entityType: 'customer', entityId: id,
    action: 'DELETE', description: `Customer "${old.name}" deleted`,
  }, req);
}

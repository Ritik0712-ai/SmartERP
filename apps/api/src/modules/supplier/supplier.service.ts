import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Prisma } from '@prisma/client';
import { Request } from 'express';

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  mobile: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(1000).optional(),
  gstNumber: z.string().max(50).optional(),
  panNumber: z.string().max(20).optional(),
  state: z.string().max(100).optional(),
  stateCode: z.string().max(10).optional(),
  openingBalance: z.coerce.number().default(0),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
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

async function getOrCreateSundryCreditorsGroup(companyId: string): Promise<string> {
  let g = await prisma.ledgerGroup.findFirst({
    where: { companyId, name: 'Sundry Creditors', isActive: true },
  });
  if (!g) {
    g = await prisma.ledgerGroup.create({
      data: { companyId, name: 'Sundry Creditors', groupType: 'LIABILITY' },
    });
  }
  return g.id;
}

export async function listSuppliers(companyId: string, opts: { search?: string; includeInactive?: boolean; page: number; pageSize: number }) {
  const where: Prisma.SupplierWhereInput = { companyId };
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
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { ledger: { select: { id: true, currentBalance: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: opts.pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);
  return { suppliers, total };
}

export async function getSupplier(companyId: string, id: string) {
  const s = await prisma.supplier.findFirst({
    where: { id, companyId },
    include: { ledger: { select: { id: true, currentBalance: true, name: true } } },
  });
  if (!s) throw new NotFoundError('Supplier not found');
  return s;
}

export async function createSupplier(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createSupplierSchema.parse(input);
  const existing = await prisma.supplier.findFirst({
    where: { companyId, name: data.name, isActive: true },
  });
  if (existing) throw new ConflictError(`A supplier named "${data.name}" already exists`);

  const groupId = await getOrCreateSundryCreditorsGroup(companyId);
  const ledger = await prisma.ledger.create({
    data: {
      companyId,
      ledgerGroupId: groupId,
      name: data.name,
      openingBalance: -data.openingBalance, // payable shown as credit (negative)
      currentBalance: -data.openingBalance,
    },
  });
  const supplier = await prisma.supplier.create({
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
    },
    include: { ledger: { select: { id: true, currentBalance: true } } },
  });
  await writeAudit({
    userId, companyId, module: 'supplier', entityType: 'supplier', entityId: supplier.id,
    action: 'CREATE', description: `Supplier "${supplier.name}" created`,
  }, req);
  return supplier;
}

export async function updateSupplier(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateSupplierSchema.parse(input);
  const old = await getSupplier(companyId, id);
  if (data.name && data.name !== old.name) {
    const existing = await prisma.supplier.findFirst({
      where: { companyId, name: data.name, isActive: true, id: { not: id } },
    });
    if (existing) throw new ConflictError(`A supplier named "${data.name}" already exists`);
  }
  const supplier = await prisma.supplier.update({
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
      isActive: data.isActive ?? undefined,
    },
    include: { ledger: { select: { id: true, currentBalance: true } } },
  });
  if (data.name && data.name !== old.name) {
    await prisma.ledger.update({ where: { id: old.ledgerId }, data: { name: data.name } });
  }
  await writeAudit({
    userId, companyId, module: 'supplier', entityType: 'supplier', entityId: id,
    action: 'UPDATE', description: `Supplier "${supplier.name}" updated`,
  }, req);
  return supplier;
}

export async function deleteSupplier(userId: string, companyId: string, id: string, req?: Request) {
  const old = await getSupplier(companyId, id);
  await prisma.supplier.update({ where: { id }, data: { isActive: false } });
  await prisma.ledger.update({ where: { id: old.ledgerId }, data: { isActive: false } });
  await writeAudit({
    userId, companyId, module: 'supplier', entityType: 'supplier', entityId: id,
    action: 'DELETE', description: `Supplier "${old.name}" deleted`,
  }, req);
}

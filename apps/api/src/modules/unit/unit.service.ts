import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Request } from 'express';

export const createUnitSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  symbol: z.string().max(20).optional(),
  decimals: z.coerce.number().int().min(0).max(6).default(2),
});

export const updateUnitSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  symbol: z.string().max(20).optional(),
  decimals: z.coerce.number().int().min(0).max(6).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  includeInactive: z.coerce.boolean().default(false),
});

export async function listUnits(companyId: string, includeInactive = false) {
  return prisma.unit.findMany({
    where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { name: 'asc' },
  });
}

export async function getUnit(companyId: string, id: string) {
  const u = await prisma.unit.findFirst({ where: { id, companyId } });
  if (!u) throw new NotFoundError('Unit not found');
  return u;
}

export async function createUnit(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createUnitSchema.parse(input);
  const existing = await prisma.unit.findFirst({ where: { companyId, name: data.name } });
  if (existing) throw new ConflictError(`Unit "${data.name}" already exists`);
  const unit = await prisma.unit.create({
    data: { companyId, name: data.name, symbol: data.symbol, decimals: data.decimals },
  });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'unit', entityId: unit.id, action: 'CREATE', description: `Unit "${unit.name}" created` }, req);
  return unit;
}

export async function updateUnit(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateUnitSchema.parse(input);
  const old = await getUnit(companyId, id);
  if (data.name && data.name !== old.name) {
    const dup = await prisma.unit.findFirst({ where: { companyId, name: data.name, id: { not: id } } });
    if (dup) throw new ConflictError(`Unit "${data.name}" already exists`);
  }
  const unit = await prisma.unit.update({
    where: { id },
    data: { name: data.name, symbol: data.symbol, decimals: data.decimals, isActive: data.isActive },
  });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'unit', entityId: id, action: 'UPDATE', description: `Unit "${unit.name}" updated` }, req);
  return unit;
}

export async function deleteUnit(userId: string, companyId: string, id: string, req?: Request) {
  const old = await getUnit(companyId, id);
  const used = await prisma.stockItem.count({ where: { companyId, unitId: id, isActive: true } });
  if (used > 0) throw new ConflictError(`Cannot delete: ${used} active stock item(s) use this unit`);
  await prisma.unit.update({ where: { id }, data: { isActive: false } });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'unit', entityId: id, action: 'DELETE', description: `Unit "${old.name}" deleted` }, req);
}

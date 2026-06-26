import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Prisma } from '@prisma/client';
import { Request } from 'express';

export const createStockGroupSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  parentGroupId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional(),
});

export const updateStockGroupSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  parentGroupId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  includeInactive: z.coerce.boolean().default(false),
});

export async function listStockGroups(companyId: string, includeInactive = false) {
  return prisma.stockGroup.findMany({
    where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
    include: {
      parentGroup: { select: { id: true, name: true } },
      _count: { select: { stockItems: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getStockGroup(companyId: string, id: string) {
  const g = await prisma.stockGroup.findFirst({
    where: { id, companyId },
    include: { parentGroup: { select: { id: true, name: true } } },
  });
  if (!g) throw new NotFoundError('Stock group not found');
  return g;
}

export async function createStockGroup(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createStockGroupSchema.parse(input);
  if (data.parentGroupId) {
    const parent = await prisma.stockGroup.findFirst({
      where: { id: data.parentGroupId, companyId, isActive: true },
    });
    if (!parent) throw new NotFoundError('Parent stock group not found');
  }
  const existing = await prisma.stockGroup.findFirst({
    where: { companyId, name: data.name, ...(data.parentGroupId ? { parentGroupId: data.parentGroupId } : { parentGroupId: null }) },
  });
  if (existing) throw new ConflictError(`Stock group "${data.name}" already exists`);
  const group = await prisma.stockGroup.create({
    data: { companyId, name: data.name, parentGroupId: data.parentGroupId ?? null, description: data.description },
    include: { parentGroup: { select: { id: true, name: true } } },
  });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'stock_group', entityId: group.id, action: 'CREATE', description: `Stock group "${group.name}" created` }, req);
  return group;
}

export async function updateStockGroup(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateStockGroupSchema.parse(input);
  const old = await getStockGroup(companyId, id);
  if (data.parentGroupId && data.parentGroupId === id) {
    throw new ConflictError('A group cannot be its own parent');
  }
  if (data.parentGroupId) {
    const parent = await prisma.stockGroup.findFirst({ where: { id: data.parentGroupId, companyId, isActive: true } });
    if (!parent) throw new NotFoundError('Parent stock group not found');
  }
  if (data.name && data.name !== old.name) {
    const dup = await prisma.stockGroup.findFirst({
      where: { companyId, name: data.name, id: { not: id } },
    });
    if (dup) throw new ConflictError(`Stock group "${data.name}" already exists`);
  }
  const group = await prisma.stockGroup.update({
    where: { id },
    data: {
      name: data.name,
      parentGroupId: data.parentGroupId === null ? null : (data.parentGroupId ?? undefined),
      description: data.description,
      isActive: data.isActive,
    },
    include: { parentGroup: { select: { id: true, name: true } } },
  });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'stock_group', entityId: id, action: 'UPDATE', description: `Stock group "${group.name}" updated` }, req);
  return group;
}

export async function deleteStockGroup(userId: string, companyId: string, id: string, req?: Request) {
  const old = await getStockGroup(companyId, id);
  const itemCount = await prisma.stockItem.count({ where: { companyId, stockGroupId: id, isActive: true } });
  if (itemCount > 0) {
    throw new ConflictError(`Cannot delete: ${itemCount} active stock item(s) in this group`);
  }
  const childCount = await prisma.stockGroup.count({ where: { companyId, parentGroupId: id, isActive: true } });
  if (childCount > 0) {
    throw new ConflictError(`Cannot delete: ${childCount} child group(s) under this group`);
  }
  await prisma.stockGroup.update({ where: { id }, data: { isActive: false } });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'stock_group', entityId: id, action: 'DELETE', description: `Stock group "${old.name}" deleted` }, req);
}

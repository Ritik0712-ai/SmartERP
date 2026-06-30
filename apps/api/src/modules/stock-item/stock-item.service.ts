import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Request } from 'express';

export const createStockItemSchema = z.object({
  stockGroupId: z.string().uuid(),
  unitId: z.string().uuid(),
  name: z.string().min(1).max(255).trim(),
  sku: z.string().min(1).max(100).trim().toUpperCase(),
  barcode: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  hsnCode: z.string().max(20).optional(),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  mrp: z.coerce.number().min(0).optional(),
  gstPercentage: z.coerce.number().min(0).max(100).default(0),
  openingQuantity: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).optional(),
});

export const updateStockItemSchema = z.object({
  stockGroupId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  sku: z.string().min(1).max(100).trim().toUpperCase().optional(),
  barcode: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  hsnCode: z.string().max(20).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
  gstPercentage: z.coerce.number().min(0).max(100).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  search: z.string().optional(),
  stockGroupId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().default(false),
  lowStockOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
});

export async function listStockItems(
  companyId: string,
  opts: {
    search?: string;
    stockGroupId?: string;
    includeInactive?: boolean;
    lowStockOnly?: boolean;
    page: number;
    pageSize: number;
  },
) {
  const where: any = { companyId };
  if (!opts.includeInactive) where.isActive = true;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
    ];
  }
  if (opts.stockGroupId) where.stockGroupId = opts.stockGroupId;
  if (opts.lowStockOnly) {
    where.isActive = true;
    // Low stock: reorderLevel is set AND currentQuantity < reorderLevel
    // We handle this post-filter for the page; mark filter so DB call is efficient
  }
  const skip = (opts.page - 1) * opts.pageSize;
  const rawItems = await prisma.stockItem.findMany({
    where,
    include: {
      stockGroup: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, symbol: true, decimals: true } },
    },
    orderBy: { name: 'asc' },
    skip,
    take: opts.pageSize,
  });
  const items = opts.lowStockOnly
    ? rawItems.filter(i => i.reorderLevel != null && Number(i.currentQuantity) < Number(i.reorderLevel))
    : rawItems;
  const total = opts.lowStockOnly ? items.length : await prisma.stockItem.count({ where });
  return { items, total };
}

export async function getStockItem(companyId: string, id: string) {
  const item = await prisma.stockItem.findFirst({
    where: { id, companyId },
    include: {
      stockGroup: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, symbol: true } },
    },
  });
  if (!item) throw new NotFoundError('Stock item not found');
  return item;
}

export async function createStockItem(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createStockItemSchema.parse(input);
  const [group, unit] = await Promise.all([
    prisma.stockGroup.findFirst({ where: { id: data.stockGroupId, companyId, isActive: true } }),
    prisma.unit.findFirst({ where: { id: data.unitId, companyId, isActive: true } }),
  ]);
  if (!group) throw new NotFoundError('Stock group not found');
  if (!unit) throw new NotFoundError('Unit not found');
  const dupSku = await prisma.stockItem.findFirst({ where: { companyId, sku: data.sku } });
  if (dupSku) throw new ConflictError(`SKU "${data.sku}" already exists`);
  const item = await prisma.stockItem.create({
    data: {
      companyId,
      stockGroupId: data.stockGroupId,
      unitId: data.unitId,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      description: data.description,
      hsnCode: data.hsnCode,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      mrp: data.mrp,
      gstPercentage: data.gstPercentage,
      openingQuantity: data.openingQuantity,
      currentQuantity: data.openingQuantity,
      reorderLevel: data.reorderLevel,
    },
    include: {
      stockGroup: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, symbol: true } },
    },
  });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'stock_item', entityId: item.id, action: 'CREATE', description: `Stock item "${item.name}" (SKU: ${item.sku}) created` }, req);
  return item;
}

export async function updateStockItem(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateStockItemSchema.parse(input);
  const old = await getStockItem(companyId, id);
  if (data.stockGroupId) {
    const g = await prisma.stockGroup.findFirst({ where: { id: data.stockGroupId, companyId, isActive: true } });
    if (!g) throw new NotFoundError('Stock group not found');
  }
  if (data.unitId) {
    const u = await prisma.unit.findFirst({ where: { id: data.unitId, companyId, isActive: true } });
    if (!u) throw new NotFoundError('Unit not found');
  }
  if (data.sku && data.sku !== old.sku) {
    const dup = await prisma.stockItem.findFirst({ where: { companyId, sku: data.sku, id: { not: id } } });
    if (dup) throw new ConflictError(`SKU "${data.sku}" already exists`);
  }
  const item = await prisma.stockItem.update({
    where: { id },
    data: {
      stockGroupId: data.stockGroupId,
      unitId: data.unitId,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      description: data.description,
      hsnCode: data.hsnCode,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      mrp: data.mrp,
      gstPercentage: data.gstPercentage,
      reorderLevel: data.reorderLevel,
      isActive: data.isActive,
    },
    include: {
      stockGroup: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true, symbol: true } },
    },
  });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'stock_item', entityId: id, action: 'UPDATE', description: `Stock item "${item.name}" updated` }, req);
  return item;
}

export async function deleteStockItem(userId: string, companyId: string, id: string, req?: Request) {
  const old = await getStockItem(companyId, id);
  await prisma.stockItem.update({ where: { id }, data: { isActive: false } });
  await writeAudit({ userId, companyId, module: 'inventory', entityType: 'stock_item', entityId: id, action: 'DELETE', description: `Stock item "${old.name}" deleted` }, req);
}

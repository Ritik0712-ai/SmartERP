import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError, BadRequestError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { GroupType, Prisma } from '@prisma/client';
import { Request } from 'express';

export const createLedgerGroupSchema = z.object({
  name: z.string().min(1).max(255),
  parentGroupId: z.string().uuid().nullable().optional(),
  groupType: z.nativeEnum(GroupType),
  description: z.string().max(1000).optional(),
});

export const updateLedgerGroupSchema = createLedgerGroupSchema.partial();

export const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  search: z.string().optional(),
  groupType: z.nativeEnum(GroupType).optional(),
  includeInactive: z.coerce.boolean().default(false),
});

interface ReqMeta { ip: string; userAgent: string }
function reqMeta(req?: Request): ReqMeta {
  if (!req) return { ip: '', userAgent: '' };
  return {
    ip: (req.ip || (req.headers['x-forwarded-for'] as string) || '').slice(0, 255),
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
  };
}

export async function listLedgerGroups(companyId: string, opts: { search?: string; groupType?: GroupType; includeInactive?: boolean }) {
  const where: Prisma.LedgerGroupWhereInput = { companyId };
  if (!opts.includeInactive) where.isActive = true;
  if (opts.search) where.name = { contains: opts.search, mode: 'insensitive' };
  if (opts.groupType) where.groupType = opts.groupType;
  return prisma.ledgerGroup.findMany({
    where,
    orderBy: [{ groupType: 'asc' }, { name: 'asc' }],
  });
}

export async function getLedgerGroup(companyId: string, id: string) {
  const g = await prisma.ledgerGroup.findFirst({ where: { id, companyId } });
  if (!g) throw new NotFoundError('Ledger group not found');
  return g;
}

export async function createLedgerGroup(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createLedgerGroupSchema.parse(input);
  // Check uniqueness
  const existing = await prisma.ledgerGroup.findFirst({
    where: { companyId, name: data.name, isActive: true },
  });
  if (existing) throw new ConflictError(`A group named "${data.name}" already exists`);
  // Validate parent
  if (data.parentGroupId) {
    const parent = await prisma.ledgerGroup.findFirst({
      where: { id: data.parentGroupId, companyId },
    });
    if (!parent) throw new BadRequestError('Parent group not found');
  }
  const g = await prisma.ledgerGroup.create({
    data: {
      companyId,
      name: data.name,
      groupType: data.groupType,
      parentGroupId: data.parentGroupId ?? null,
      description: data.description,
    },
  });
  await writeAudit({
    userId, companyId, module: 'ledger-group', entityType: 'ledger_group', entityId: g.id,
    action: 'CREATE', description: `Ledger group "${g.name}" created`,
  }, req);
  return g;
}

export async function updateLedgerGroup(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateLedgerGroupSchema.parse(input);
  const old = await getLedgerGroup(companyId, id);
  if (data.name && data.name !== old.name) {
    const existing = await prisma.ledgerGroup.findFirst({
      where: { companyId, name: data.name, isActive: true, id: { not: id } },
    });
    if (existing) throw new ConflictError(`A group named "${data.name}" already exists`);
  }
  if (data.parentGroupId && data.parentGroupId === id) {
    throw new BadRequestError('A group cannot be its own parent');
  }
  const g = await prisma.ledgerGroup.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      groupType: data.groupType ?? undefined,
      parentGroupId: data.parentGroupId ?? undefined,
      description: data.description ?? undefined,
    },
  });
  await writeAudit({
    userId, companyId, module: 'ledger-group', entityType: 'ledger_group', entityId: id,
    action: 'UPDATE', description: `Ledger group "${g.name}" updated`,
  }, req);
  return g;
}

export async function deleteLedgerGroup(userId: string, companyId: string, id: string, req?: Request) {
  const g = await getLedgerGroup(companyId, id);
  // Check no ledgers
  const ledgerCount = await prisma.ledger.count({ where: { ledgerGroupId: id, isActive: true } });
  if (ledgerCount > 0) {
    throw new BadRequestError(`Cannot delete: ${ledgerCount} ledger(s) use this group`);
  }
  // Check no child groups
  const childCount = await prisma.ledgerGroup.count({ where: { parentGroupId: id, isActive: true } });
  if (childCount > 0) {
    throw new BadRequestError(`Cannot delete: ${childCount} sub-group(s) exist`);
  }
  await prisma.ledgerGroup.update({ where: { id }, data: { isActive: false } });
  await writeAudit({
    userId, companyId, module: 'ledger-group', entityType: 'ledger_group', entityId: id,
    action: 'DELETE', description: `Ledger group "${g.name}" deleted`,
  }, req);
}

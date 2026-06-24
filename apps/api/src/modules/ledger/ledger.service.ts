import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { NotFoundError, ConflictError, BadRequestError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Prisma } from '@prisma/client';
import { Request } from 'express';

export const createLedgerSchema = z.object({
  ledgerGroupId: z.string().uuid(),
  name: z.string().min(1).max(255),
  openingBalance: z.coerce.number().default(0),
  description: z.string().max(1000).optional(),
});

export const updateLedgerSchema = z.object({
  ledgerGroupId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  openingBalance: z.coerce.number().optional(),
  description: z.string().max(1000).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const listQuerySchema = z.object({
  companyId: z.string().uuid(),
  search: z.string().optional(),
  ledgerGroupId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

interface ReqMeta { ip: string; userAgent: string }
function reqMeta(req?: Request): ReqMeta {
  if (!req) return { ip: '', userAgent: '' };
  return {
    ip: (req.ip || (req.headers['x-forwarded-for'] as string) || '').slice(0, 255),
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
  };
}

export async function listLedgers(companyId: string, opts: { search?: string; ledgerGroupId?: string; includeInactive?: boolean; page: number; pageSize: number }) {
  const where: Prisma.LedgerWhereInput = { companyId };
  if (!opts.includeInactive) where.isActive = true;
  if (opts.search) where.name = { contains: opts.search, mode: 'insensitive' };
  if (opts.ledgerGroupId) where.ledgerGroupId = opts.ledgerGroupId;
  const skip = (opts.page - 1) * opts.pageSize;
  const [ledgers, total] = await Promise.all([
    prisma.ledger.findMany({
      where,
      include: { ledgerGroup: { select: { id: true, name: true, groupType: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: opts.pageSize,
    }),
    prisma.ledger.count({ where }),
  ]);
  return { ledgers, total };
}

export async function getLedger(companyId: string, id: string) {
  const l = await prisma.ledger.findFirst({
    where: { id, companyId },
    include: { ledgerGroup: { select: { id: true, name: true, groupType: true } } },
  });
  if (!l) throw new NotFoundError('Ledger not found');
  return l;
}

export async function createLedger(userId: string, companyId: string, input: unknown, req?: Request) {
  const data = createLedgerSchema.parse(input);
  // Check group exists
  const group = await prisma.ledgerGroup.findFirst({
    where: { id: data.ledgerGroupId, companyId, isActive: true },
  });
  if (!group) throw new BadRequestError('Ledger group not found');
  // Check uniqueness
  const existing = await prisma.ledger.findFirst({
    where: { companyId, name: data.name, isActive: true },
  });
  if (existing) throw new ConflictError(`A ledger named "${data.name}" already exists`);
  const ledger = await prisma.ledger.create({
    data: {
      companyId,
      ledgerGroupId: data.ledgerGroupId,
      name: data.name,
      openingBalance: data.openingBalance,
      currentBalance: data.openingBalance,
      description: data.description,
    },
    include: { ledgerGroup: { select: { id: true, name: true, groupType: true } } },
  });
  await writeAudit({
    userId, companyId, module: 'ledger', entityType: 'ledger', entityId: ledger.id,
    action: 'CREATE', description: `Ledger "${ledger.name}" created`,
  }, req);
  return ledger;
}

export async function updateLedger(userId: string, companyId: string, id: string, input: unknown, req?: Request) {
  const data = updateLedgerSchema.parse(req.body);
  const old = await getLedger(companyId, id);
  if (data.name && data.name !== old.name) {
    const existing = await prisma.ledger.findFirst({
      where: { companyId, name: data.name, isActive: true, id: { not: id } },
    });
    if (existing) throw new ConflictError(`A ledger named "${data.name}" already exists`);
  }
  if (data.ledgerGroupId && data.ledgerGroupId !== old.ledgerGroupId) {
    const g = await prisma.ledgerGroup.findFirst({ where: { id: data.ledgerGroupId, companyId, isActive: true } });
    if (!g) throw new BadRequestError('Ledger group not found');
  }
  const ledger = await prisma.ledger.update({
    where: { id },
    data: {
      ledgerGroupId: data.ledgerGroupId ?? undefined,
      name: data.name ?? undefined,
      description: data.description ?? undefined,
      isActive: data.isActive ?? undefined,
    },
    include: { ledgerGroup: { select: { id: true, name: true, groupType: true } } },
  });
  await writeAudit({
    userId, companyId, module: 'ledger', entityType: 'ledger', entityId: id,
    action: 'UPDATE', description: `Ledger "${ledger.name}" updated`,
  }, req);
  return ledger;
}

export async function deleteLedger(userId: string, companyId: string, id: string, req?: Request) {
  const old = await getLedger(companyId, id);
  if (old.isSystem) throw new BadRequestError('System ledgers cannot be deleted');
  // Check no voucher entries
  const entryCount = await prisma.voucherEntry.count({ where: { ledgerId: id } });
  if (entryCount > 0) {
    throw new BadRequestError(`Cannot delete: ${entryCount} voucher entries use this ledger`);
  }
  await prisma.ledger.update({ where: { id }, data: { isActive: false } });
  await writeAudit({
    userId, companyId, module: 'ledger', entityType: 'ledger', entityId: id,
    action: 'DELETE', description: `Ledger "${old.name}" deleted`,
  }, req);
}

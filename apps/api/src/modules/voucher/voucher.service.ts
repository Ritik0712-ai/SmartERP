import { prisma } from '../../config/prisma';
import { z } from 'zod';
import { Prisma, EntryType, VoucherTypeCode, InventoryTxnType } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler';
import { writeAudit } from '../../utils/audit';
import { Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Schemas ────────────────────────────────────────────────────────────────

export const createVoucherEntrySchema = z.object({
  ledgerId: z.string().uuid(),
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive('Amount must be positive'),
  narration: z.string().optional(),
});

export const createStockLineSchema = z.object({
  stockItemId: z.string().uuid(),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  narration: z.string().optional(),
});

export const createVoucherSchema = z.object({
  voucherTypeCode: z.enum(['PURCHASE', 'SALES', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'CREDIT_NOTE', 'DEBIT_NOTE']),
  voucherDate: z.string().or(z.date()),
  referenceNumber: z.string().optional(),
  narration: z.string().optional(),
  partyLedgerId: z.string().uuid().optional(),
  entries: z.array(createVoucherEntrySchema).min(1),
  stockLines: z.array(createStockLineSchema).optional().default([]),
});

export const listVouchersSchema = z.object({
  companyId: z.string().uuid(),
  voucherTypeCode: z.enum(['PURCHASE', 'SALES', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'CREDIT_NOTE', 'DEBIT_NOTE']).optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateVoucherType(code: VoucherTypeCode) {
  const existing = await prisma.voucherType.findUnique({ where: { code } });
  if (existing) return existing;
  const names: Record<VoucherTypeCode, string> = {
    PURCHASE: 'Purchase Voucher',
    SALES: 'Sales Voucher',
    RECEIPT: 'Receipt Voucher',
    PAYMENT: 'Payment Voucher',
    JOURNAL: 'Journal Voucher',
    CONTRA: 'Contra Voucher',
    CREDIT_NOTE: 'Credit Note',
    DEBIT_NOTE: 'Debit Note',
  };
  return prisma.voucherType.create({ data: { code, name: names[code] } });
}

async function nextVoucherNumber(companyId: string, voucherTypeId: string) {
  const last = await prisma.voucher.findFirst({
    where: { companyId, voucherTypeId },
    orderBy: { createdAt: 'desc' },
    select: { voucherNumber: true },
  });
  const prefix = 'VCH';
  if (!last) return `${prefix}-00001`;
  const num = parseInt(last.voucherNumber.split('-')[1] ?? '0', 10) + 1;
  return `${prefix}-${String(num).padStart(5, '0')}`;
}

async function updateStockQuantity(
  companyId: string,
  stockItemId: string,
  txnType: InventoryTxnType,
  quantity: number,
  rate: number,
  voucherId: string,
  voucherDate: Date,
) {
  const amount = quantity * rate;
  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        companyId,
        voucherId,
        stockItemId,
        transactionType: txnType,
        quantity: new Prisma.Decimal(quantity),
        rate: new Prisma.Decimal(rate),
        amount: new Prisma.Decimal(amount),
        transactionDate: voucherDate,
      },
    }),
    // Update current quantity on stock item
    prisma.stockItem.update({
      where: { id: stockItemId },
      data: { currentQuantity: { increment: new Prisma.Decimal(quantity) } },
    }),
  ]);
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listVouchers(opts: z.infer<typeof listVouchersSchema>) {
  const { companyId, voucherTypeCode, search, fromDate, toDate, page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  // Resolve voucherTypeId if code provided
  let voucherTypeFilter: Prisma.VoucherWhereInput['voucherType'] = {};
  if (voucherTypeCode) {
    const vt = await prisma.voucherType.findUnique({ where: { code: voucherTypeCode as VoucherTypeCode } });
    if (vt) voucherTypeFilter = { id: vt.id };
  }

  const where: Prisma.VoucherWhereInput = {
    companyId,
    isCancelled: false,
    ...(voucherTypeCode ? { voucherType: voucherTypeFilter } : {}),
    ...(search
      ? {
          OR: [
            { voucherNumber: { contains: search, mode: 'insensitive' } },
            { narration: { contains: search, mode: 'insensitive' } },
            { referenceNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(fromDate || toDate
      ? {
          voucherDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
  };

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        voucherType: { select: { code: true, name: true } },
        voucherEntries: {
          include: { ledger: { select: { id: true, name: true } } },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.voucher.count({ where }),
  ]);

  return { vouchers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getVoucher(companyId: string, id: string) {
  const voucher = await prisma.voucher.findFirst({
    where: { id, companyId, isCancelled: false },
    include: {
      voucherType: true,
      voucherEntries: {
        include: { ledger: { select: { id: true, name: true, ledgerGroupId: true } } },
      },
      inventoryTxns: {
        include: {
          stockItem: { select: { id: true, name: true, sku: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!voucher) throw new NotFoundError('Voucher not found');
  return voucher;
}

export async function createVoucher(
  userId: string,
  companyId: string,
  input: unknown,
  req?: Request,
) {
  const data = createVoucherSchema.parse(input);
  const voucherDate = typeof data.voucherDate === 'string' ? new Date(data.voucherDate) : data.voucherDate;

  // Validate double-entry: total debits == total credits
  const totalDebit = data.entries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((s, e) => s + e.amount, 0);
  const totalCredit = data.entries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((s, e) => s + e.amount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new BadRequestError(
      `Voucher is not balanced: Debit ₹${totalDebit.toFixed(2)} ≠ Credit ₹${totalCredit.toFixed(2)}`,
    );
  }

  // Validate all ledgers belong to this company
  const ledgerIds = data.entries.map((e) => e.ledgerId);
  const stockItemIds = data.stockLines.map((s) => s.stockItemId);
  const [ledgers, stockItems] = await Promise.all([
    prisma.ledger.findMany({
      where: { id: { in: ledgerIds }, companyId, isActive: true },
      include: { ledgerGroup: true },
    }),
    prisma.stockItem.findMany({ where: { id: { in: stockItemIds }, companyId, isActive: true } }),
  ]);

  if (ledgers.length !== ledgerIds.length) {
    const found = new Set(ledgers.map((l) => l.id));
    const missing = ledgerIds.filter((id) => !found.has(id));
    throw new BadRequestError(`Invalid ledger IDs: ${missing.join(', ')}`);
  }
  if (stockItems.length !== stockItemIds.length) {
    const found = new Set(stockItems.map((s) => s.id));
    const missing = stockItemIds.filter((id) => !found.has(id));
    throw new BadRequestError(`Invalid stock item IDs: ${missing.join(', ')}`);
  }

  // Get or create voucher type
  const voucherType = await getOrCreateVoucherType(data.voucherTypeCode as VoucherTypeCode);
  const voucherNumber = await nextVoucherNumber(companyId, voucherType.id);

  // Calculate totals
  const stockLinesTotal = data.stockLines.reduce((s, sl) => {
    const taxable = sl.quantity * sl.rate * (1 - sl.discountPercent / 100);
    return s + taxable;
  }, 0);
  const totalAmount = totalDebit;
  const grandTotal = totalAmount; // could add tax here later

  // Create voucher + entries + inventory transactions in one transaction
  const voucher = await prisma.$transaction(async (tx) => {
    const v = await tx.voucher.create({
      data: {
        companyId,
        voucherTypeId: voucherType.id,
        voucherNumber,
        voucherDate,
        referenceNumber: data.referenceNumber,
        narration: data.narration,
        partyLedgerId: data.partyLedgerId,
        totalAmount: new Prisma.Decimal(totalAmount),
        grandTotal: new Prisma.Decimal(grandTotal),
        taxAmount: new Prisma.Decimal(0),
        createdById: userId,
        voucherEntries: {
          create: data.entries.map((e) => ({
            ledgerId: e.ledgerId,
            entryType: e.entryType as EntryType,
            amount: new Prisma.Decimal(e.amount),
            narration: e.narration,
          })),
        },
      },
      include: {
        voucherType: true,
        voucherEntries: { include: { ledger: { select: { id: true, name: true } } } },
      },
    });

    // Update ledger balances
    for (const entry of data.entries) {
      const delta = entry.entryType === 'DEBIT'
        ? new Prisma.Decimal(entry.amount)
        : new Prisma.Decimal(-entry.amount);

      // For ASSET/EXPENSE groups: DR increases, CR decreases
      // For LIABILITY/INCOME groups: CR increases, DR decreases
      const ledger = ledgers.find((l) => l.id === entry.ledgerId)!;
      const groupType = ledger.ledgerGroup.groupType;
      const adjustment = (groupType === 'ASSET' || groupType === 'EXPENSE') ? delta : delta.mul(-1);

      await tx.ledger.update({
        where: { id: entry.ledgerId },
        data: { currentBalance: { increment: adjustment } },
      });
    }

    // Inventory transactions for stock lines
    for (const sl of data.stockLines) {
      const taxable = sl.quantity * sl.rate * (1 - sl.discountPercent / 100);
      const txnType: InventoryTxnType =
        data.voucherTypeCode === 'PURCHASE'
          ? InventoryTxnType.PURCHASE
          : data.voucherTypeCode === 'SALES'
          ? InventoryTxnType.SALE
          : InventoryTxnType.ADJUSTMENT_IN;

      await tx.inventoryTransaction.create({
        data: {
          companyId,
          voucherId: v.id,
          stockItemId: sl.stockItemId,
          transactionType: txnType,
          quantity: new Prisma.Decimal(sl.quantity),
          rate: new Prisma.Decimal(sl.rate),
          amount: new Prisma.Decimal(taxable),
          transactionDate: voucherDate,
          remarks: sl.narration,
        },
      });

      // Update current quantity
      const qtyDelta =
        data.voucherTypeCode === 'SALES' || data.voucherTypeCode === 'CREDIT_NOTE'
          ? new Prisma.Decimal(-sl.quantity)
          : new Prisma.Decimal(sl.quantity);

      await tx.stockItem.update({
        where: { id: sl.stockItemId },
        data: { currentQuantity: { increment: qtyDelta } },
      });
    }

    return v;
  });

  await writeAudit({
    userId,
    companyId,
    module: 'voucher',
    entityType: 'voucher',
    entityId: voucher.id,
    action: 'CREATE',
    description: `${voucherType.name} ${voucherNumber} created — ₹${grandTotal.toFixed(2)}`,
  }, req);

  return voucher;
}

export async function cancelVoucher(
  userId: string,
  companyId: string,
  id: string,
  reason: string,
  req?: Request,
) {
  const voucher = await getVoucher(companyId, id);

  await prisma.$transaction(async (tx) => {
    // Mark cancelled
    await tx.voucher.update({
      where: { id },
      data: { isCancelled: true, cancelledAt: new Date(), cancelReason: reason },
    });

    // Reverse ledger balances
    const entries = await tx.voucherEntry.findMany({ where: { voucherId: id } });
    for (const entry of entries) {
      const delta = entry.entryType === 'DEBIT'
        ? new Prisma.Decimal(-entry.amount.toNumber())
        : new Prisma.Decimal(entry.amount.toNumber());

      const ledger = await tx.ledger.findUnique({ where: { id: entry.ledgerId }, include: { ledgerGroup: true } });
      if (!ledger) continue;
      const adjustment = (ledger.ledgerGroup.groupType === 'ASSET' || ledger.ledgerGroup.groupType === 'EXPENSE')
        ? delta
        : delta.mul(-1);

      await tx.ledger.update({
        where: { id: entry.ledgerId },
        data: { currentBalance: { increment: adjustment } },
      });
    }

    // Reverse inventory transactions
    const txns = await tx.inventoryTransaction.findMany({ where: { voucherId: id } });
    for (const txn of txns) {
      const reverseQty = new Prisma.Decimal(-txn.quantity.toNumber());
      await tx.stockItem.update({
        where: { id: txn.stockItemId },
        data: { currentQuantity: { increment: reverseQty } },
      });
      await tx.inventoryTransaction.delete({ where: { id: txn.id } });
    }
  });

  await writeAudit({
    userId,
    companyId,
    module: 'voucher',
    entityType: 'voucher',
    entityId: id,
    action: 'DELETE',
    description: `Voucher ${voucher.voucherNumber} cancelled: ${reason}`,
  }, req);

  return { message: 'Voucher cancelled successfully' };
}

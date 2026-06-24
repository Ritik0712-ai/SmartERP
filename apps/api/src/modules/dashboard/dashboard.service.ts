import { prisma } from '../../config/prisma';
import { BadRequestError } from '../../middleware/errorHandler';
import { startOfMonth, endOfMonth, subMonths, startOfMonth as som } from '../../utils/dates';

export interface KpiSummary {
  totalSales: number;
  totalPurchases: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  stockValue: number;
  lowStockCount: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalStockItems: number;
  totalInvoices: number;
  totalVouchers: number;
  from: string;
  to: string;
}

export interface ChartPoint {
  month: string; // 'YYYY-MM'
  label: string; // 'Jan 2025'
  sales: number;
  purchases: number;
}

export interface RecentVoucher {
  id: string;
  voucherNumber: string;
  type: string;
  date: string;
  amount: number;
  partyName: string | null;
}

export interface TopParty {
  id: string;
  name: string;
  total: number;
  invoiceCount: number;
}

export interface TopItem {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
}

function rangeOrDefault(from?: string, to?: string) {
  const start = from ? new Date(from) : startOfMonth(new Date());
  const end = to ? new Date(to) : endOfMonth(new Date());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestError('Invalid date range');
  }
  if (start > end) {
    throw new BadRequestError('from must be before to');
  }
  return { start, end };
}

/**
 * Aggregate all KPIs for a company in a date range.
 */
export async function getKpis(companyId: string, from?: string, to?: string): Promise<KpiSummary> {
  await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const { start, end } = rangeOrDefault(from, to);

  // Sales (sum of grandTotal on invoices in range, status ISSUED or PAID)
  const salesAgg = await prisma.invoice.aggregate({
    where: {
      companyId,
      invoiceDate: { gte: start, lte: end },
      status: { in: ['ISSUED', 'PAID', 'PARTIALLY_PAID'] },
    },
    _sum: { grandTotal: true },
    _count: { _all: true },
  });

  // Purchases (sum of grandTotal on purchase vouchers in range)
  const purchasesAgg = await prisma.voucher.aggregate({
    where: {
      companyId,
      voucherDate: { gte: start, lte: end },
      voucherType: { code: 'PURCHASE' },
      isCancelled: false,
    },
    _sum: { grandTotal: true },
  });

  // Outstanding receivables (unpaid customer invoices) — sum of balanceDue
  const receivablesAgg = await prisma.invoice.aggregate({
    where: {
      companyId,
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
    },
    _sum: { balanceDue: true },
  });

  // Outstanding payables — sum of supplier balance across all purchase vouchers
  // (For MVP, we approximate: sum of all purchase voucher grandTotal - amountPaid if tracked;
  //  we use a simpler "purchases not matched by payments" view)
  // Since we don't have payment vouchers yet (Day 9), treat receivables/payables as
  // sum of balance due on unpaid customer invoices / sum of grandTotal on PURCHASE vouchers
  // minus amountPaid (0 for now). For a clean view we'll just sum grandTotal of unpaid
  // purchase vouchers vs unpaid customer invoices.
  const payablesAgg = await prisma.voucher.aggregate({
    where: {
      companyId,
      voucherType: { code: 'PURCHASE' },
      isCancelled: false,
      // unpaid = balanceDue > 0
    },
    _sum: { grandTotal: true },
  });
  // We'll re-use the same number for now; once we add payments, subtract paid amounts.

  // Stock value = sum(currentQuantity * purchasePrice)
  const stockAgg = await prisma.stockItem.findMany({
    where: { companyId, isActive: true },
    select: { currentQuantity: true, purchasePrice: true, reorderLevel: true },
  });
  const stockValue = stockAgg.reduce(
    (acc, s) => acc + Number(s.currentQuantity) * Number(s.purchasePrice),
    0,
  );
  const lowStockCount = stockAgg.filter(
    (s) => s.reorderLevel != null && Number(s.currentQuantity) < Number(s.reorderLevel),
  ).length;

  // Counts
  const [totalCustomers, totalSuppliers, totalStockItems, totalInvoices, totalVouchers] = await Promise.all([
    prisma.customer.count({ where: { companyId, isActive: true } }),
    prisma.supplier.count({ where: { companyId, isActive: true } }),
    prisma.stockItem.count({ where: { companyId, isActive: true } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.voucher.count({ where: { companyId, isCancelled: false } }),
  ]);

  return {
    totalSales: Number(salesAgg._sum.grandTotal ?? 0),
    totalPurchases: Number(purchasesAgg._sum.grandTotal ?? 0),
    outstandingReceivables: Number(receivablesAgg._sum.balanceDue ?? 0),
    outstandingPayables: Number(payablesAgg._sum.grandTotal ?? 0),
    stockValue,
    lowStockCount,
    totalCustomers,
    totalSuppliers,
    totalStockItems,
    totalInvoices,
    totalVouchers,
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/**
 * Monthly sales + purchases for the last N months.
 */
export async function getSalesChart(companyId: string, months = 6): Promise<ChartPoint[]> {
  await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const now = new Date();
  const points: ChartPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = som(subMonths(now, i));
    const end = endOfMonth(start);
    const [sales, purchases] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          invoiceDate: { gte: start, lte: end },
          status: { in: ['ISSUED', 'PAID', 'PARTIALLY_PAID'] },
        },
        _sum: { grandTotal: true },
      }),
      prisma.voucher.aggregate({
        where: {
          companyId,
          voucherDate: { gte: start, lte: end },
          voucherType: { code: 'PURCHASE' },
          isCancelled: false,
        },
        _sum: { grandTotal: true },
      }),
    ]);
    points.push({
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label: start.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      sales: Number(sales._sum.grandTotal ?? 0),
      purchases: Number(purchases._sum.grandTotal ?? 0),
    });
  }
  return points;
}

export async function getRecentVouchers(companyId: string, limit = 10): Promise<RecentVoucher[]> {
  await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const rows = await prisma.voucher.findMany({
    where: { companyId, isCancelled: false },
    orderBy: { voucherDate: 'desc' },
    take: Math.min(limit, 50),
    include: {
      voucherType: { select: { code: true, name: true } },
    },
  });
  return rows.map((v) => ({
    id: v.id,
    voucherNumber: v.voucherNumber,
    type: v.voucherType.code,
    date: v.voucherDate.toISOString(),
    amount: Number(v.grandTotal),
    partyName: v.narration ?? null,
  }));
}

export async function getTopCustomers(companyId: string, limit = 5): Promise<TopParty[]> {
  await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  // Aggregate by customer
  const grouped = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: {
      companyId,
      status: { in: ['ISSUED', 'PAID', 'PARTIALLY_PAID'] },
    },
    _sum: { grandTotal: true },
    _count: { _all: true },
    orderBy: { _sum: { grandTotal: 'desc' } },
    take: Math.min(limit, 20),
  });
  // Hydrate names
  const customerIds = grouped.map((g) => g.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(customers.map((c) => [c.id, c.name]));
  return grouped.map((g) => ({
    id: g.customerId,
    name: nameById.get(g.customerId) ?? 'Unknown',
    total: Number(g._sum.grandTotal ?? 0),
    invoiceCount: g._count._all,
  }));
}

export async function getTopItems(companyId: string, limit = 5): Promise<TopItem[]> {
  await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  // Sum invoice item quantities
  const grouped = await prisma.invoiceItem.groupBy({
    by: ['stockItemId'],
    where: {
      invoice: { companyId },
    },
    _sum: { quantity: true, amount: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: Math.min(limit, 20),
  });
  const ids = grouped.map((g) => g.stockItemId);
  const items = await prisma.stockItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, sku: true },
  });
  const meta = new Map(items.map((i) => [i.id, i]));
  return grouped.map((g) => {
    const m = meta.get(g.stockItemId);
    return {
      id: g.stockItemId,
      name: m?.name ?? 'Unknown',
      sku: m?.sku ?? '',
      totalQuantity: Number(g._sum.quantity ?? 0),
      totalRevenue: Number(g._sum.amount ?? 0),
    };
  });
}

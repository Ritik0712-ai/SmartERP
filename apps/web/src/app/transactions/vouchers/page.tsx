'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Loader2, ArrowUpDown, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiSuccess } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

type VoucherTypeCode = 'PURCHASE' | 'SALES' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

const VOUCHER_LABELS: Record<VoucherTypeCode, string> = {
  PURCHASE: 'Purchase',
  SALES: 'Sales',
  RECEIPT: 'Receipt',
  PAYMENT: 'Payment',
  JOURNAL: 'Journal',
  CONTRA: 'Contra',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
};

const VOUCHER_COLORS: Record<VoucherTypeCode, string> = {
  PURCHASE: 'bg-orange-100 text-orange-800',
  SALES: 'bg-green-100 text-green-800',
  RECEIPT: 'bg-blue-100 text-blue-800',
  PAYMENT: 'bg-red-100 text-red-800',
  JOURNAL: 'bg-purple-100 text-purple-800',
  CONTRA: 'bg-gray-100 text-gray-800',
  CREDIT_NOTE: 'bg-teal-100 text-teal-800',
  DEBIT_NOTE: 'bg-amber-100 text-amber-800',
};

const TYPE_OPTIONS: VoucherTypeCode[] = ['PURCHASE', 'SALES', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'CREDIT_NOTE', 'DEBIT_NOTE'];

export default function VouchersPage() {
  const { activeCompanyId } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<VoucherTypeCode | ''>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  async function load() {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: activeCompanyId,
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(typeFilter ? { voucherTypeCode: typeFilter } : {}),
      });
      const res = await api.get<ApiSuccess<any>>(`/vouchers?${params}`);
      if (res.data.success) {
        setVouchers(res.data.data.vouchers);
        setTotal(res.data.data.total);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [activeCompanyId, page, typeFilter, search]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Vouchers"
          description="All accounting transactions — purchases, sales, payments, receipts"
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/transactions/vouchers/purchase/new">+ Purchase</Link>
              </Button>
              <Button asChild>
                <Link href="/transactions/vouchers/sales/new">+ Sale</Link>
              </Button>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search voucher number, narration…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => { setTypeFilter(''); setPage(1); }}
              className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${!typeFilter ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-accent'}`}
            >
              All
            </button>
            {TYPE_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-accent'}`}
              >
                {VOUCHER_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : vouchers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-foreground">No vouchers yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create your first purchase or sales voucher</p>
                <Button asChild className="mt-4"><Link href="/transactions/vouchers/purchase/new">New Purchase Voucher</Link></Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Voucher #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Narration</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount (₹)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-foreground">{v.voucherNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${VOUCHER_COLORS[v.voucherType.code as VoucherTypeCode] ?? 'bg-gray-100 text-gray-800'}`}>
                          {VOUCHER_LABELS[v.voucherType.code as VoucherTypeCode] ?? v.voucherType.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(v.voucherDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">{v.narration || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-foreground">{formatCurrency(Number(v.grandTotal))}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/transactions/vouchers/${v.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

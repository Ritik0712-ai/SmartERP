'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiSuccess } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

type VoucherTypeCode = 'PURCHASE' | 'SALES' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

const VOUCHER_COLORS: Record<string, string> = {
  PURCHASE: 'bg-orange-100 text-orange-800',
  SALES: 'bg-green-100 text-green-800',
  RECEIPT: 'bg-blue-100 text-blue-800',
  PAYMENT: 'bg-red-100 text-red-800',
  JOURNAL: 'bg-purple-100 text-purple-800',
  CONTRA: 'bg-gray-100 text-gray-800',
  CREDIT_NOTE: 'bg-teal-100 text-teal-800',
  DEBIT_NOTE: 'bg-amber-100 text-amber-800',
};

export default function VoucherDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeCompanyId } = useAuth();
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!activeCompanyId || !params.id) return;
    api.get<ApiSuccess<any>>(`/vouchers/${params.id}?companyId=${activeCompanyId}`)
      .then(res => { if (res.data.success) setVoucher(res.data.data); })
      .finally(() => setLoading(false));
  }, [activeCompanyId, params.id]);

  async function handleCancel() {
    if (!activeCompanyId || !params.id) return;
    const reason = prompt('Enter reason for cancellation:');
    if (!reason) return;
    setCancelling(true);
    try {
      await api.delete(`/vouchers/${params.id}?companyId=${activeCompanyId}`, { data: { reason } });
      router.push('/transactions/vouchers');
    } catch {
      alert('Failed to cancel voucher');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    </AppShell>
  );

  if (!voucher) return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Voucher not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/transactions/vouchers')}>Back to Vouchers</Button>
      </div>
    </AppShell>
  );

  const code = voucher.voucherType?.code ?? 'JOURNAL';
  const typeColor = VOUCHER_COLORS[code] ?? 'bg-gray-100 text-gray-800';

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={voucher.voucherType?.name ?? 'Voucher'}
          description={`Voucher #${voucher.voucherNumber}`}
          backHref="/transactions/vouchers"
          actions={
            !voucher.isCancelled ? (
              <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Cancel Voucher
              </Button>
            ) : (
              <span className="rounded bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Cancelled</span>
            )
          }
        />

        {/* Voucher info */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Voucher Number', value: voucher.voucherNumber },
            { label: 'Type', value: voucher.voucherType?.name, badge: true, color: typeColor },
            { label: 'Date', value: new Date(voucher.voucherDate).toLocaleDateString('en-IN') },
            { label: 'Reference', value: voucher.referenceNumber || '—' },
            { label: 'Created By', value: voucher.createdBy?.name },
            { label: 'Created At', value: new Date(voucher.createdAt).toLocaleString('en-IN') },
          ].map(({ label, value, badge, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                {badge ? (
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{value}</span>
                ) : (
                  <p className="mt-1 font-medium text-foreground">{value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {voucher.narration && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Narration</p>
              <p className="mt-1 text-sm text-foreground">{voucher.narration}</p>
            </CardContent>
          </Card>
        )}

        {/* Accounting entries */}
        <Card>
          <CardHeader><CardTitle className="text-base">Accounting Entries</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Ledger</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Narration</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {voucher.voucherEntries?.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${entry.entryType === 'DEBIT' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{entry.ledger?.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.narration || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-medium text-foreground">
                      {formatCurrency(Number(entry.amount))}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/20">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{formatCurrency(Number(voucher.grandTotal))}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Inventory transactions */}
        {voucher.inventoryTxns?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Stock Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Item</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Rate (₹)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.inventoryTxns.map((txn: any) => (
                    <tr key={txn.id} className="border-b border-border">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{txn.stockItem?.name}</td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">{txn.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{formatCurrency(Number(txn.rate))}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-foreground">{formatCurrency(Number(txn.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Cancelled state */}
        {voucher.isCancelled && (
          <Card className="border-destructive/50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive">This voucher was cancelled on {new Date(voucher.cancelledAt).toLocaleString('en-IN')}</p>
              {voucher.cancelReason && <p className="mt-1 text-sm text-muted-foreground">Reason: {voucher.cancelReason}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

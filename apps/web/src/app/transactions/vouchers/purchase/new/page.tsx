'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api, ApiSuccess } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

interface LedgerOption { id: string; name: string; ledgerGroupId: string; groupType: string }
interface StockItemOption { id: string; name: string; sku: string; purchasePrice: string; gstPercentage: string; currentQuantity: string }

interface EntryRow { ledgerId: string; entryType: 'DEBIT' | 'CREDIT'; amount: string; narration: string }
interface StockRow { stockItemId: string; quantity: string; rate: string; discountPercent: string; narration: string }

export default function NewPurchaseVoucherPage() {
  const router = useRouter();
  const { activeCompanyId } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);
  const [stockItems, setStockItems] = useState<StockItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');
  const [supplierLedgerId, setSupplierLedgerId] = useState(''); // party ledger

  const [entries, setEntries] = useState<EntryRow[]>([
    { ledgerId: '', entryType: 'DEBIT', amount: '', narration: '' },
    { ledgerId: '', entryType: 'CREDIT', amount: '', narration: '' },
  ]);
  const [stockLines, setStockLines] = useState<StockRow[]>([]);

  // Load ledgers, suppliers, stock items
  useEffect(() => {
    if (!activeCompanyId) return;
    Promise.all([
      api.get<ApiSuccess<{ ledgers: LedgerOption[] }>>(`/ledgers?companyId=${activeCompanyId}`),
      api.get<ApiSuccess<{ suppliers: any[] }>>(`/suppliers?companyId=${activeCompanyId}`),
      api.get<ApiSuccess<{ items: StockItemOption[] }>>(`/stock-items?companyId=${activeCompanyId}&pageSize=500`),
    ]).then(([ledgerRes, supplierRes, stockRes]) => {
      if (ledgerRes.data.success) setLedgers(ledgerRes.data.data.ledgers);
      if (supplierRes.data.success) setSuppliers(supplierRes.data.data.suppliers);
      if (stockRes.data.success) setStockItems(stockRes.data.data.items);
    });
  }, [activeCompanyId]);

  function updateEntry(i: number, field: keyof EntryRow, value: string) {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function addEntry() {
    setEntries(prev => [...prev, { ledgerId: '', entryType: 'DEBIT', amount: '', narration: '' }]);
  }

  function removeEntry(i: number) {
    if (entries.length <= 2) return;
    setEntries(prev => prev.filter((_, idx) => idx !== i));
  }

  function addStockLine() {
    setStockLines(prev => [...prev, { stockItemId: '', quantity: '1', rate: '', discountPercent: '0', narration: '' }]);
  }

  function removeStockLine(i: number) {
    setStockLines(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateStockLine(i: number, field: keyof StockRow, value: string) {
    setStockLines(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  // Auto-fill stock line from stock item selection
  function onStockItemSelect(i: number, stockItemId: string) {
    const item = stockItems.find(s => s.id === stockItemId);
    if (item) {
      setStockLines(prev => prev.map((s, idx) =>
        idx === i
          ? { ...s, stockItemId, rate: item.purchasePrice || s.rate }
          : s
      ));
    } else {
      updateStockLine(i, 'stockItemId', stockItemId);
    }
  }

  // Calculate totals
  const totalDebit = entries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalCredit = entries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    if (!isBalanced) {
      setServerError(`Voucher is not balanced: Debit ₹${totalDebit.toFixed(2)} ≠ Credit ₹${totalCredit.toFixed(2)}`);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const validEntries = entries.filter(e => e.ledgerId && parseFloat(e.amount) > 0);
      const validStockLines = stockLines.filter(s => s.stockItemId && parseFloat(s.quantity) > 0);

      const payload = {
        voucherTypeCode: 'PURCHASE',
        voucherDate,
        referenceNumber: referenceNumber || undefined,
        narration: narration || undefined,
        partyLedgerId: supplierLedgerId || undefined,
        entries: validEntries.map(e => ({
          ledgerId: e.ledgerId,
          entryType: e.entryType,
          amount: parseFloat(e.amount),
          narration: e.narration || undefined,
        })),
        stockLines: validStockLines.map(s => ({
          stockItemId: s.stockItemId,
          quantity: parseFloat(s.quantity),
          rate: parseFloat(s.rate) || 0,
          discountPercent: parseFloat(s.discountPercent) || 0,
          narration: s.narration || undefined,
        })),
      };

      const res = await api.post<ApiSuccess<any>>(`/vouchers?companyId=${activeCompanyId}`, payload);
      if (!res.data.success) {
        const err = res.data as unknown as { success: false; error: { message: string } };
        throw new Error(err.error?.message ?? 'Failed to create voucher');
      }
      router.push('/transactions/vouchers');
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="New Purchase Voucher"
          description="Record a purchase transaction with double-entry accounting"
          backHref="/transactions/vouchers"
        />

        {serverError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Header fields */}
          <Card>
            <CardHeader><CardTitle className="text-base">Voucher Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} required />
              </div>
              <div>
                <Label>Reference #</Label>
                <Input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="Invoice / GRN number" />
              </div>
              <div>
                <Label>Supplier *</Label>
                <Select value={supplierLedgerId} onChange={e => setSupplierLedgerId(e.target.value)} required>
                  <option value="">— Select supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.ledgerId}>{s.name}</option>)}
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label>Narration</Label>
                <Input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Goods purchased from supplier" />
              </div>
            </CardContent>
          </Card>

          {/* Stock lines */}
          {stockLines.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Stock Items</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addStockLine}>
                  <Plus className="mr-1 h-4 w-4" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {stockLines.map((sl, i) => {
                  const item = stockItems.find(s => s.id === sl.stockItemId);
                  const qty = parseFloat(sl.quantity) || 0;
                  const rate = parseFloat(sl.rate) || 0;
                  const disc = parseFloat(sl.discountPercent) || 0;
                  const lineTotal = qty * rate * (1 - disc / 100);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-3 bg-muted/20">
                      <div className="col-span-3">
                        <Label className="text-xs">Item</Label>
                        <Select value={sl.stockItemId} onChange={e => onStockItemSelect(i, e.target.value)}>
                          <option value="">— Select item —</option>
                          {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min="0" step="1" value={sl.quantity} onChange={e => updateStockLine(i, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Rate (₹)</Label>
                        <Input type="number" min="0" step="0.01" value={sl.rate} onChange={e => updateStockLine(i, 'rate', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Disc %</Label>
                        <Input type="number" min="0" max="100" step="1" value={sl.discountPercent} onChange={e => updateStockLine(i, 'discountPercent', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Amount</Label>
                        <p className="flex h-9 items-center text-sm font-medium">{formatCurrency(lineTotal)}</p>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeStockLine(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {stockLines.length === 0 && (
                  <button type="button" onClick={addStockLine} className="w-full rounded-md border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    + Add stock items (optional)
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Accounting entries */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Accounting Entries (Double Entry)</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addEntry}>
                <Plus className="mr-1 h-4 w-4" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-1">Dr/Cr</div>
                <div className="col-span-5">Ledger</div>
                <div className="col-span-3">Amount (₹)</div>
                <div className="col-span-2">Narration</div>
                <div className="col-span-1"></div>
              </div>

              {entries.map((entry, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1">
                    <Select value={entry.entryType} onChange={e => updateEntry(i, 'entryType', e.target.value as 'DEBIT' | 'CREDIT')}>
                      <option value="DEBIT">DR</option>
                      <option value="CREDIT">CR</option>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Select value={entry.ledgerId} onChange={e => updateEntry(i, 'ledgerId', e.target.value)}>
                      <option value="">— Select ledger —</option>
                      {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.amount}
                      onChange={e => updateEntry(i, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input value={entry.narration} onChange={e => updateEntry(i, 'narration', e.target.value)} placeholder="Narration" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeEntry(i)} disabled={entries.length <= 2}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totals row */}
              <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Debit: </span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(totalDebit)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Credit: </span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(totalCredit)}</span>
                  </div>
                </div>
                <div>
                  {isBalanced ? (
                    <span className="rounded bg-success/10 px-3 py-1 text-xs font-medium text-success">✓ Balanced</span>
                  ) : (
                    <span className="rounded bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                      Difference: {formatCurrency(difference)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild><Link href="/transactions/vouchers">Cancel</Link></Button>
            <Button type="submit" disabled={submitting || !isBalanced}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Purchase Voucher
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api, ApiSuccess } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

interface LedgerOpt { id: string; name: string }
type EntryRow = { ledgerId: string; entryType: 'DEBIT' | 'CREDIT'; amount: string; narration: string };

export default function ReceiptVoucherPage() {
  const router = useRouter();
  const { activeCompanyId } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [parties, setParties] = useState([]);
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');
  const [partyLedgerId, setPartyLedgerId] = useState('');
  const [entries, setEntries] = useState([
    { ledgerId: '', entryType: 'DEBIT', amount: '', narration: '' },
    { ledgerId: '', entryType: 'CREDIT', amount: '', narration: '' },
  ]);

  useEffect(() => {
    if (!activeCompanyId) return;
    Promise.all([
      api.get('/ledgers?companyId=' + activeCompanyId),
      api.get('/customers?companyId=' + activeCompanyId),
    ]).then(([lr, pr]) => {
      if (lr.data.success) setLedgers(lr.data.data.ledgers);
      if (pr.data.success) setParties(pr.data.data.customers);
    });
  }, [activeCompanyId]);

  function updateEntry(i, field, value) {
    setEntries(prev => prev.map((e, idx) => idx === i ? Object.assign({}, e, { [field]: value }) : e));
  }
  function addEntry() { setEntries(prev => [...prev, { ledgerId: '', entryType: 'DEBIT', amount: '', narration: '' }]); }
  function removeEntry(i: number) { if (entries.length > 2) setEntries(prev => prev.filter((_, idx) => idx !== i)); }

  const totalDebit = entries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalCredit = entries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function onSubmit(e) {
    e.preventDefault();
    if (!activeCompanyId) return;
    if (!isBalanced) { setServerError('Voucher is not balanced. Debit: ' + formatCurrency(totalDebit) + ', Credit: ' + formatCurrency(totalCredit)); return; }
    setSubmitting(true);
    setServerError(null);
    try {
      const validEntries = entries.filter(e => e.ledgerId && parseFloat(e.amount) > 0);
      const payload = {
        voucherTypeCode: 'RECEIPT',
        voucherDate,
        referenceNumber: referenceNumber || undefined,
        narration: narration || undefined,
        partyLedgerId: partyLedgerId || undefined,
        entries: validEntries.map(e => ({ ledgerId: e.ledgerId, entryType: e.entryType, amount: parseFloat(e.amount), narration: e.narration || undefined })),
      };
      const res = await api.post('/vouchers?companyId=' + activeCompanyId, payload);
      if (!res.data.success) throw new Error((res.data).error && (res.data).error.message || 'Failed');
      router.push('/transactions/vouchers');
    } catch (err) { setServerError(err && err.response && err.response.data && err.response.data.error && err.response.data.error.message || err.message || 'Failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Receipt Voucher" description="Record money received from a customer" backHref="/transactions/vouchers" />
        {serverError && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Voucher Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="v-date">Date *</Label>
                <Input id="v-date" type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="v-ref">Reference #</Label>
                <Input id="v-ref" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="Ref number" />
              </div>
              <div>
                <Label htmlFor="v-party">Customer *</Label>
                <select id="v-party" value={partyLedgerId} onChange={e => setPartyLedgerId(e.target.value)} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— Select customer —</option>
                  {parties.map(p => <option key={p.id} value={p.ledgerId}>{p.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="v-nar">Narration</Label>
                <Input id="v-nar" value={narration} onChange={e => setNarration(e.target.value)} placeholder="Enter narration" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Accounting Entries</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addEntry}><Plus className="mr-1 h-4 w-4" /> Add Row</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1 mb-1">
                <div className="col-span-1">Dr/Cr</div>
                <div className="col-span-5">Ledger</div>
                <div className="col-span-3">Amount</div>
                <div className="col-span-2">Narration</div>
                <div className="col-span-1"></div>
              </div>
              {entries.map((entry, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1">
                    <select value={entry.entryType} onChange={e => updateEntry(i, 'entryType', e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                      <option value="DEBIT">DR</option><option value="CREDIT">CR</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <select value={entry.ledgerId} onChange={e => updateEntry(i, 'ledgerId', e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                      <option value="">— Select ledger —</option>
                      {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.01" value={entry.amount} onChange={e => updateEntry(i, 'amount', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <Input value={entry.narration} onChange={e => updateEntry(i, 'narration', e.target.value)} placeholder="Narration" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeEntry(i)} disabled={entries.length <= 2}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <span>Total Debit: <strong>{formatCurrency(totalDebit)}</strong></span>
                  <span>Total Credit: <strong>{formatCurrency(totalCredit)}</strong></span>
                </div>
                <div>
                  {isBalanced
                    ? <span className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Balanced</span>
                    : <span className="rounded bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Not Balanced</span>
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild><Link href="/transactions/vouchers">Cancel</Link></Button>
            <Button type="submit" disabled={submitting || !isBalanced}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Receipt Voucher
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function LedgerForm({ mode, ledgerId }: { mode: 'create' | 'edit'; ledgerId?: string }) {
  const router = useRouter();
  const { activeCompanyId } = useAuth();
  const [groups, setGroups] = useState<{ id: string; name: string; groupType: string }[]>([]);
  const [form, setForm] = useState({ name: '', ledgerGroupId: '', openingBalance: '0', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    if (!activeCompanyId) return;
    api.get<ApiSuccess<{ groups: any[] }> | ApiError>(`/ledger-groups?companyId=${activeCompanyId}`)
      .then((r) => { if (r.data.success) setGroups((r.data as ApiSuccess<{ groups: any[] }>).data.groups); });
  }, [activeCompanyId]);

  useEffect(() => {
    if (mode === 'edit' && ledgerId && activeCompanyId) {
      api.get<ApiSuccess<any> | ApiError>(`/ledgers/${ledgerId}?companyId=${activeCompanyId}`)
        .then((res) => {
          if (res.data.success) {
            const l = (res.data as ApiSuccess<any>).data;
            setForm({
              name: l.name ?? '',
              ledgerGroupId: l.ledgerGroupId ?? '',
              openingBalance: String(l.openingBalance ?? 0),
              description: l.description ?? '',
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [mode, ledgerId, activeCompanyId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSubmitting(true); setServerError(null);
    try {
      const payload: any = {
        name: form.name,
        ledgerGroupId: form.ledgerGroupId,
        openingBalance: Number(form.openingBalance || 0),
        description: form.description || undefined,
      };
      const res = mode === 'create'
        ? await api.post<ApiSuccess<any> | ApiError>(`/ledgers?companyId=${activeCompanyId}`, payload)
        : await api.patch<ApiSuccess<any> | ApiError>(`/ledgers/${ledgerId}?companyId=${activeCompanyId}`, payload);
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      router.push('/masters/ledgers');
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to save');
    } finally { setSubmitting(false); }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={mode === 'create' ? 'New Ledger' : 'Edit Ledger'} backHref="/masters/ledgers" />
        {serverError && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader><CardTitle className="text-base">Ledger Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Ledger name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="ledgerGroupId">Group *</Label>
                  <Select id="ledgerGroupId" value={form.ledgerGroupId} onChange={(e) => setForm((f) => ({ ...f, ledgerGroupId: e.target.value }))} required>
                    <option value="">— Select group —</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.groupType})</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="openingBalance">Opening balance (₹)</Label>
                  <Input id="openingBalance" type="number" value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/masters/ledgers')}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {mode === 'create' ? 'Create Ledger' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

export default function NewLedgerPage() {
  return <ProtectedRoute><LedgerForm mode="create" /></ProtectedRoute>;
}

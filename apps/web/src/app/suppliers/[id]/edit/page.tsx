'use client';

import { useParams } from 'next/navigation';
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
import { INDIAN_STATES } from '@smarterp/shared';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function EditSupplierForm({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const { activeCompanyId } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', address: '', gstNumber: '', panNumber: '',
    state: '', stateCode: '', openingBalance: '0',
  });

  useEffect(() => {
    if (supplierId && activeCompanyId) {
      api.get<ApiSuccess<any> | ApiError>(`/suppliers/${supplierId}?companyId=${activeCompanyId}`)
        .then((res) => {
          if (res.data.success) {
            const s = (res.data as ApiSuccess<any>).data;
            setForm({
              name: s.name ?? '', mobile: s.mobile ?? '', email: s.email ?? '',
              address: s.address ?? '', gstNumber: s.gstNumber ?? '', panNumber: s.panNumber ?? '',
              state: s.state ?? '', stateCode: s.stateCode ?? '',
              openingBalance: String(s.openingBalance ?? 0),
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [supplierId, activeCompanyId]);

  function update<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload: any = {
        name: form.name, mobile: form.mobile || undefined, email: form.email || undefined,
        address: form.address || undefined, gstNumber: form.gstNumber || undefined,
        panNumber: form.panNumber || undefined, state: form.state || undefined,
        stateCode: form.stateCode || undefined, openingBalance: Number(form.openingBalance || 0),
      };
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });
      const res = await api.patch<ApiSuccess<any> | ApiError>(`/suppliers/${supplierId}?companyId=${activeCompanyId}`, payload);
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      router.push('/suppliers');
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to save');
    } finally { setSubmitting(false); }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Edit Supplier" description="Update supplier details" backHref="/suppliers" />
        {serverError && <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Supplier Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Supplier name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
                </div>
                <div><Label htmlFor="mobile">Mobile</Label><Input id="mobile" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
                <div className="md:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={form.address} onChange={(e) => update('address', e.target.value)} /></div>
                <div><Label htmlFor="gstNumber">GSTIN</Label><Input id="gstNumber" value={form.gstNumber} onChange={(e) => update('gstNumber', e.target.value)} /></div>
                <div><Label htmlFor="panNumber">PAN</Label><Input id="panNumber" value={form.panNumber} onChange={(e) => update('panNumber', e.target.value)} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Location & Financials</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select id="state" value={form.state} onChange={(e) => {
                    update('state', e.target.value);
                    const m = INDIAN_STATES.find((s) => s.name === e.target.value);
                    if (m) update('stateCode', m.code);
                  }}>
                    <option value="">— Select state —</option>
                    {INDIAN_STATES.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="stateCode">State code</Label>
                  <Input id="stateCode" value={form.stateCode} onChange={(e) => update('stateCode', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="openingBalance">Opening payable (₹)</Label>
                  <Input id="openingBalance" type="number" value={form.openingBalance} onChange={(e) => update('openingBalance', e.target.value)} />
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/suppliers')}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

export default function EditSupplierPage() {
  const params = useParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <EditSupplierForm supplierId={params.id} />
    </ProtectedRoute>
  );
}

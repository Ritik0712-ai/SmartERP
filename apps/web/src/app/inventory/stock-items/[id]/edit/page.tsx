'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function EditStockItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { activeCompanyId } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    stockGroupId: '',
    unitId: '',
    hsnCode: '',
    purchasePrice: '0',
    sellingPrice: '0',
    mrp: '',
    gstPercentage: '0',
    reorderLevel: '',
    barcode: '',
    description: '',
  });

  useEffect(() => {
    if (!activeCompanyId || !itemId) return;
    Promise.all([
      api.get<ApiSuccess<any>>(`/stock-groups?companyId=${activeCompanyId}`),
      api.get<ApiSuccess<any>>(`/units?companyId=${activeCompanyId}`),
      api.get<ApiSuccess<any>>(`/stock-items/${itemId}?companyId=${activeCompanyId}`),
    ]).then(([sgRes, unitRes, itemRes]) => {
      if (sgRes.data.success) setStockGroups(sgRes.data.data.groups);
      if (unitRes.data.success) setUnits(unitRes.data.data.units);
      if (itemRes.data.success) {
        const item = itemRes.data.data;
        setForm({
          name: item.name ?? '',
          sku: item.sku ?? '',
          stockGroupId: item.stockGroupId ?? '',
          unitId: item.unitId ?? '',
          hsnCode: item.hsnCode ?? '',
          purchasePrice: String(item.purchasePrice ?? 0),
          sellingPrice: String(item.sellingPrice ?? 0),
          mrp: item.mrp != null ? String(item.mrp) : '',
          gstPercentage: String(item.gstPercentage ?? 0),
          reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : '',
          barcode: item.barcode ?? '',
          description: item.description ?? '',
        });
      }
    }).finally(() => setLoading(false));
  }, [activeCompanyId, itemId]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !itemId) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        stockGroupId: form.stockGroupId,
        unitId: form.unitId,
        hsnCode: form.hsnCode.trim() || undefined,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        gstPercentage: parseFloat(form.gstPercentage) || 0,
        reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : undefined,
        barcode: form.barcode.trim() || undefined,
        description: form.description.trim() || undefined,
        mrp: form.mrp ? parseFloat(form.mrp) : undefined,
      };
      Object.keys(payload).forEach(k => {
        if (payload[k] === '' || payload[k] === undefined) delete payload[k];
      });
      const res = await api.patch<ApiSuccess<any>>(`/stock-items/${itemId}?companyId=${activeCompanyId}`, payload);
      if (!res.data.success) throw new Error((res.data as unknown as ApiError).error.message);
      router.push('/inventory/stock-items');
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Edit Stock Item" description="Update item details" backHref="/inventory/stock-items" />

        {serverError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Item Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Item name *</Label>
                  <Input value={form.name} onChange={e => update('name', e.target.value)} required />
                </div>
                <div>
                  <Label>SKU *</Label>
                  <Input value={form.sku} onChange={e => update('sku', e.target.value)} required />
                </div>
                <div>
                  <Label>HSN Code</Label>
                  <Input value={form.hsnCode} onChange={e => update('hsnCode', e.target.value)} />
                </div>
                <div>
                  <Label>Stock group *</Label>
                  <Select value={form.stockGroupId} onChange={e => update('stockGroupId', e.target.value)} required>
                    <option value="">— Select group —</option>
                    {stockGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Unit *</Label>
                  <Select value={form.unitId} onChange={e => update('unitId', e.target.value)} required>
                    <option value="">— Select unit —</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name} {u.symbol ? `(${u.symbol})` : ''}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input value={form.barcode} onChange={e => update('barcode', e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => update('description', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Purchase price (₹)</Label>
                  <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => update('purchasePrice', e.target.value)} />
                </div>
                <div>
                  <Label>Selling price (₹)</Label>
                  <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => update('sellingPrice', e.target.value)} />
                </div>
                <div>
                  <Label>MRP (₹)</Label>
                  <Input type="number" min="0" step="0.01" value={form.mrp} onChange={e => update('mrp', e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>GST %</Label>
                  <Select value={form.gstPercentage} onChange={e => update('gstPercentage', e.target.value)}>
                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Stock Settings</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Reorder level (low stock alert)</Label>
                  <Input type="number" min="0" step="1" value={form.reorderLevel} onChange={e => update('reorderLevel', e.target.value)} />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">Opening/current quantity can only be changed via Purchase or Sales vouchers.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" asChild><Link href="/inventory/stock-items">Cancel</Link></Button>
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

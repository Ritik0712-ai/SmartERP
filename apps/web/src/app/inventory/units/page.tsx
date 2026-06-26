'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { PageHeader, NewButton } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useParams } from 'next/navigation';

function UnitsPageInner() {
  const { activeCompanyId } = useAuth();
  const router = useRouter();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', symbol: '', decimals: '2' });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await api.get<ApiSuccess<any>>(`/units?companyId=${activeCompanyId}&includeInactive=true`);
      if (res.data.success) setUnits(res.data.data.units);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeCompanyId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        name: form.name.trim(),
        symbol: form.symbol.trim() || undefined,
        decimals: parseInt(form.decimals) || 2,
      };
      let res: any;
      if (editingId) {
        res = await api.patch<ApiSuccess<any>>(`/units/${editingId}?companyId=${activeCompanyId}`, payload);
      } else {
        res = await api.post<ApiSuccess<any>>(`/units?companyId=${activeCompanyId}`, payload);
      }
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', symbol: '', decimals: '2' });
      load();
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!activeCompanyId || !confirm('Deactivate this unit?')) return;
    setDeletingId(id);
    try {
      const res = await api.delete<any>(`/units/${id}?companyId=${activeCompanyId}`);
      if (res.status === 204) load();
      else if (!res.data.success) alert((res.data as ApiError).error.message);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(u: any) {
    setEditingId(u.id);
    setForm({ name: u.name, symbol: u.symbol ?? '', decimals: String(u.decimals) });
    setShowForm(true);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Units of Measure"
          description="Units like PCS, KG, LTR for your stock items"
          actions={<Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', symbol: '', decimals: '2' }); }}><Plus className="mr-2 h-4 w-4" /> New Unit</Button>}
        />

        {serverError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>
        )}

        {showForm && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Unit name *</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kilogram" required />
                </div>
                <div className="w-32">
                  <Label>Symbol</Label>
                  <Input value={form.symbol} onChange={(e) => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="KG" />
                </div>
                <div className="w-24">
                  <Label>Decimals</Label>
                  <Input type="number" min="0" max="6" value={form.decimals} onChange={(e) => setForm(f => ({ ...f, decimals: e.target.value }))} />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : units.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No units yet. Create your first unit above.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Decimals</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b border-border text-sm">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.symbol ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.decimals}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(u.id)} disabled={deletingId === u.id}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function UnitsPage() {
  return (
    <ProtectedRoute>
      <UnitsPageInner />
    </ProtectedRoute>
  );
}

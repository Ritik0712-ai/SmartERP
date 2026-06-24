'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, NewButton } from '@/components/page-header';
import { Plus, Pencil, Trash2, Search, Loader2, Phone, Mail } from 'lucide-react';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  openingBalance: string;
  isActive: boolean;
  ledger?: { id: string; currentBalance: string } | null;
}

function SuppliersContent() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  async function load(q: string) {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const url = `/suppliers?companyId=${activeCompanyId}&search=${encodeURIComponent(q)}`;
      const res = await api.get<ApiSuccess<{ suppliers: Supplier[]; total: number }> | ApiError>(url);
      if (res.data.success) {
        const data = (res.data as ApiSuccess<{ suppliers: Supplier[]; total: number }>).data;
        setItems(data.suppliers);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, [activeCompanyId]);
  useEffect(() => { const t = setTimeout(() => load(search), 250); return () => clearTimeout(t); }, [search]);

  async function handleDelete(s: Supplier) {
    if (!activeCompanyId) return;
    if (!confirm(`Delete "${s.name}"?`)) return;
    await api.delete(`/suppliers/${s.id}?companyId=${activeCompanyId}`);
    load(search);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Suppliers"
          description={`${total} supplier${total === 1 ? '' : 's'} · people you buy from`}
          actions={<NewButton href="/suppliers/new" label="New Supplier" />}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, email, GSTIN…"
              className="pl-9"
            />
          </div>
        </div>
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No suppliers yet</p>
              <Button asChild className="mt-4">
                <Link href="/suppliers/new"><Plus className="mr-2 h-4 w-4" /> Add your first supplier</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-left">GSTIN</th>
                    <th className="px-4 py-2 text-right">Payable</th>
                    <th className="px-4 py-2 text-right">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => {
                    const payable = -Number(s.ledger?.currentBalance ?? -Number(s.openingBalance));
                    return (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {s.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.mobile}</span>}
                            {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.gstNumber ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(payable)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/suppliers/${s.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(s)} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default function SuppliersPage() {
  return (
    <ProtectedRoute>
      <SuppliersContent />
    </ProtectedRoute>
  );
}

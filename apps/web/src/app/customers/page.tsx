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
import { useRouter } from 'next/navigation';

interface Customer {
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

function CustomersContent() {
  const router = useRouter();
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  async function load(q: string) {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const url = `/customers?companyId=${activeCompanyId}&search=${encodeURIComponent(q)}`;
      const res = await api.get<ApiSuccess<{ customers: Customer[]; total: number }> | ApiError>(url);
      if (res.data.success) {
        const data = (res.data as ApiSuccess<{ customers: Customer[]; total: number }>).data;
        setItems(data.customers);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
  }, [activeCompanyId]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  async function handleDelete(c: Customer) {
    if (!activeCompanyId) return;
    if (!confirm(`Delete "${c.name}"? They will be marked inactive but historical data is preserved.`)) return;
    await api.delete(`/customers/${c.id}?companyId=${activeCompanyId}`);
    load(search);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Customers"
          description={`${total} customer${total === 1 ? '' : 's'} · people you sell to`}
          actions={<NewButton href="/customers/new" label="New Customer" />}
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No customers yet</p>
              <Button asChild className="mt-4">
                <Link href="/customers/new">
                  <Plus className="mr-2 h-4 w-4" /> Add your first customer
                </Link>
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
                    <th className="px-4 py-2 text-right">Balance</th>
                    <th className="px-4 py-2 text-right">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const bal = Number(c.ledger?.currentBalance ?? c.openingBalance);
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {c.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.mobile}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.gstNumber ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(bal)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/customers/${c.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(c)} aria-label="Delete">
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

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <CustomersContent />
    </ProtectedRoute>
  );
}

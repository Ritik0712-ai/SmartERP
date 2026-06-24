'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader, NewButton } from '@/components/page-header';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Ledger {
  id: string;
  name: string;
  openingBalance: string;
  currentBalance: string;
  isActive: boolean;
  isSystem: boolean;
  ledgerGroup?: { id: string; name: string; groupType: string } | null;
}

function LedgersContent() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  async function load(q: string, gid: string) {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ companyId: activeCompanyId, search: q });
      if (gid) params.set('ledgerGroupId', gid);
      const res = await api.get<ApiSuccess<{ ledgers: Ledger[]; total: number }> | ApiError>(`/ledgers?${params}`);
      if (res.data.success) {
        const data = (res.data as ApiSuccess<{ ledgers: Ledger[]; total: number }>).data;
        setItems(data.ledgers);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeCompanyId) return;
    api.get<ApiSuccess<{ groups: any[] }> | ApiError>(`/ledger-groups?companyId=${activeCompanyId}`)
      .then((r) => { if (r.data.success) setGroups((r.data as ApiSuccess<{ groups: any[] }>).data.groups); });
  }, [activeCompanyId]);

  useEffect(() => { load('', ''); }, [activeCompanyId]);
  useEffect(() => { const t = setTimeout(() => load(search, groupId), 250); return () => clearTimeout(t); }, [search, groupId]);

  async function handleDelete(l: Ledger) {
    if (!activeCompanyId) return;
    if (l.isSystem) { alert('System ledgers cannot be deleted.'); return; }
    if (!confirm(`Delete ledger "${l.name}"?`)) return;
    await api.delete(`/ledgers/${l.id}?companyId=${activeCompanyId}`);
    load(search, groupId);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Ledgers"
          description={`${total} ledger${total === 1 ? '' : 's'} · chart of accounts`}
          actions={<NewButton href="/masters/ledgers/new" label="New Ledger" />}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ledgers by name…"
              className="pl-9"
            />
          </div>
          <div className="w-56">
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">All groups</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
        </div>
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No ledgers yet</p>
              <Button asChild className="mt-4">
                <Link href="/masters/ledgers/new"><Plus className="mr-2 h-4 w-4" /> Create your first ledger</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Group</th>
                    <th className="px-4 py-2 text-right">Opening</th>
                    <th className="px-4 py-2 text-right">Current Balance</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {l.name}
                        {l.isSystem && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">SYSTEM</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {l.ledgerGroup?.name ?? '—'} <span className="text-xs">({l.ledgerGroup?.groupType})</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(Number(l.openingBalance))}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(Number(l.currentBalance))}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/masters/ledgers/${l.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(l)} aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default function LedgersPage() {
  return (
    <ProtectedRoute>
      <LedgersContent />
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, Search, AlertTriangle } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

export default function StockItemsPage() {
  const { activeCompanyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 20;

  async function load() {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: activeCompanyId,
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(lowStockOnly ? { lowStockOnly: 'true' } : {}),
      });
      const res = await api.get<ApiSuccess<any>>(`/stock-items?${params}`);
      if (res.data.success) {
        setItems(res.data.data.items);
        setTotal(res.data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeCompanyId, page, lowStockOnly]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function onDelete(id: string) {
    if (!activeCompanyId || !confirm('Deactivate this stock item?')) return;
    setDeletingId(id);
    try {
      const res = await api.delete<any>(`/stock-items/${id}?companyId=${activeCompanyId}`);
      if (res.status === 204) load();
      else alert((res.data as ApiError).error?.message);
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const isLowStock = (item: any) =>
    item.reorderLevel != null && Number(item.currentQuantity) < Number(item.reorderLevel);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Stock Items"
          description="All products/materials in your inventory"
          actions={
            <Link href="/inventory/stock-items/new">
              <Button><Plus className="mr-2 h-4 w-4" /> New Stock Item</Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Button
                variant={lowStockOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Low Stock
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No stock items found.</p>
                <Link href="/inventory/stock-items/new" className="mt-2">
                  <Button variant="link" size="sm">Create your first item</Button>
                </Link>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Purchase</th>
                      <th className="px-4 py-3 text-right">Selling</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-border text-sm">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {isLowStock(item) && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                            {item.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.stockGroup?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={isLowStock(item) ? 'text-warning font-medium' : ''}>
                            {Number(item.currentQuantity).toFixed(item.unit?.decimals ?? 2)} {item.unit?.symbol ?? ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(Number(item.purchasePrice))}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(Number(item.sellingPrice))}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(item.currentQuantity) * Number(item.purchasePrice))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild><Link href={`/inventory/stock-items/${item.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} disabled={deletingId === item.id}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                      <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

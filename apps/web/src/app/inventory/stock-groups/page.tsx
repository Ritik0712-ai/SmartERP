'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function buildTree(groups: any[]): any[] {
  const map = new Map<string, any>();
  groups.forEach(g => map.set(g.id, { ...g, children: [] }));
  const roots: any[] = [];
  map.forEach(g => {
    if (g.parentGroupId && map.has(g.parentGroupId)) {
      map.get(g.parentGroupId).children.push(g);
    } else {
      roots.push(g);
    }
  });
  return roots;
}

function GroupRow({ group, onEdit, onDelete, depth }: { group: any; onEdit: (g: any) => void; onDelete: (id: string) => void; depth: number }) {
  return (
    <>
      <tr className="border-b border-border text-sm">
        <td className="px-4 py-3">
          <span style={{ paddingLeft: `${depth * 24}px` }} className="flex items-center gap-1 font-medium">
            {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            {group.name}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{group.parentGroup?.name ?? '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">{group._count?.stockItems ?? 0}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs ${group.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {group.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(group)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(group.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </td>
      </tr>
      {(group.children ?? []).map((child: any) => (
        <GroupRow key={child.id} group={child} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />
      ))}
    </>
  );
}

export default function StockGroupsPage() {
  const { activeCompanyId } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', parentGroupId: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await api.get<ApiSuccess<any>>(`/stock-groups?companyId=${activeCompanyId}&includeInactive=true`);
      if (res.data.success) setGroups(res.data.data.groups);
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
        parentGroupId: form.parentGroupId || null,
        description: form.description.trim() || undefined,
      };
      let res: any;
      if (editingId) {
        res = await api.patch<ApiSuccess<any>>(`/stock-groups/${editingId}?companyId=${activeCompanyId}`, payload);
      } else {
        res = await api.post<ApiSuccess<any>>(`/stock-groups?companyId=${activeCompanyId}`, payload);
      }
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', parentGroupId: '', description: '' });
      load();
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!activeCompanyId || !confirm('Deactivate this stock group?')) return;
    setDeletingId(id);
    try {
      const res = await api.delete<any>(`/stock-groups/${id}?companyId=${activeCompanyId}`);
      if (res.status === 204) load();
      else alert((res.data as ApiError).error?.message);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(g: any) {
    setEditingId(g.id);
    setForm({ name: g.name, parentGroupId: g.parentGroupId ?? '', description: g.description ?? '' });
    setShowForm(true);
  }

  const tree = buildTree(groups);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Stock Groups"
          description="Organize your stock items into groups"
          actions={<Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', parentGroupId: '', description: '' }); }}><Plus className="mr-2 h-4 w-4" /> New Group</Button>}
        />

        {serverError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>
        )}

        {showForm && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Group name *</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Electronics" required />
                  </div>
                  <div>
                    <Label>Parent group</Label>
                    <Select value={form.parentGroupId} onChange={(e) => setForm(f => ({ ...f, parentGroupId: e.target.value }))}>
                      <option value="">— No parent —</option>
                      {groups.filter(g => !editingId || g.id !== editingId).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="All electronic items" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingId ? 'Update' : 'Create'} Group
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No stock groups yet. Create your first group above.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Parent</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tree.map(g => (
                    <GroupRow key={g.id} group={g} onEdit={startEdit} onDelete={onDelete} depth={0} />
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

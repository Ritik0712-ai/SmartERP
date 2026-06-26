'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { Plus, Pencil, Trash2, Search, Loader2, FolderTree, X, Save } from 'lucide-react';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { GroupType } from '@prisma/client';

interface Group {
  id: string;
  name: string;
  groupType: GroupType;
  parentGroupId?: string | null;
  description?: string | null;
  isActive: boolean;
}

const TYPE_COLORS: Record<GroupType, string> = {
  ASSET: 'bg-blue-500/10 text-blue-700',
  LIABILITY: 'bg-orange-500/10 text-orange-700',
  INCOME: 'bg-green-500/10 text-green-700',
  EXPENSE: 'bg-red-500/10 text-red-700',
};

function LedgerGroupsContent() {
  const { activeCompanyId } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);

  async function load() {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await api.get<ApiSuccess<{ groups: Group[] }> | ApiError>(`/ledger-groups?companyId=${activeCompanyId}&includeInactive=true`);
      if (res.data.success) setGroups((res.data as ApiSuccess<{ groups: Group[] }>).data.groups);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [activeCompanyId]);

  const filtered = groups.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()));
  const byId = new Map(filtered.map((g) => [g.id, g]));
  const roots = filtered.filter((g) => !g.parentGroupId || !byId.has(g.parentGroupId));

  async function handleDelete(g: Group) {
    if (!activeCompanyId) return;
    if (!confirm(`Delete ledger group "${g.name}"?`)) return;
    await api.delete(`/ledger-groups/${g.id}?companyId=${activeCompanyId}`);
    load();
  }

  function GroupNode({ group, depth = 0 }: { group: Group; depth?: number }) {
    const children = filtered.filter((g) => g.parentGroupId === group.id);
    return (
      <div>
        <div
          className="flex items-center justify-between border-b border-border py-2 pr-3 hover:bg-muted/30"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {depth > 0 && <span className="text-muted-foreground">└─</span>}
            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground truncate">{group.name}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[group.groupType]}`}>{group.groupType}</span>
            {!group.isActive && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">INACTIVE</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => { setEditing(group); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="outline" onClick={() => handleDelete(group)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </div>
        {children.map((c) => <GroupNode key={c.id} group={c} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Ledger Groups"
          description="Hierarchical chart of accounts — 4 types: Asset, Liability, Income, Expense"
          actions={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> New Group</Button>}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups…" className="pl-9" />
          </div>
        </div>
        {showForm && (
          <GroupForm
            group={editing}
            groups={groups}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          />
        )}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No ledger groups yet</p>
            </div>
          ) : (
            <div className="p-2">
              {roots.map((g) => <GroupNode key={g.id} group={g} />)}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function GroupForm({ group, groups, onClose, onSaved }: { group: Group | null; groups: Group[]; onClose: () => void; onSaved: () => void }) {
  const { activeCompanyId } = useAuth();
  const [name, setName] = useState(group?.name ?? '');
  const [groupType, setGroupType] = useState<GroupType>(group?.groupType ?? 'ASSET');
  const [parentGroupId, setParentGroupId] = useState(group?.parentGroupId ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSubmitting(true); setError(null);
    try {
      const payload: any = { name, groupType, parentGroupId: parentGroupId || null, description: description || undefined };
      const res = group
        ? await api.patch<ApiSuccess<any> | ApiError>(`/ledger-groups/${group.id}?companyId=${activeCompanyId}`, payload)
        : await api.post<ApiSuccess<any> | ApiError>(`/ledger-groups?companyId=${activeCompanyId}`, payload);
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to save');
    } finally { setSubmitting(false); }
  }

  const possibleParents = groups.filter((g) => g.id !== group?.id);

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="font-semibold">{group ? 'Edit Group' : 'New Group'}</p>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="groupType">Type *</Label>
            <Select id="groupType" value={groupType} onChange={(e) => setGroupType(e.target.value as GroupType)} required>
              <option value="ASSET">ASSET</option>
              <option value="LIABILITY">LIABILITY</option>
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="parentGroupId">Parent group (optional)</Label>
            <Select id="parentGroupId" value={parentGroupId} onChange={(e) => setParentGroupId(e.target.value)}>
              <option value="">— None (top level) —</option>
              {possibleParents.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.groupType})</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        {error && <div className="mx-4 mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {group ? 'Update' : 'Create'} Group
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function LedgerGroupsPage() {
  return (
    <ProtectedRoute>
      <LedgerGroupsContent />
    </ProtectedRoute>
  );
}

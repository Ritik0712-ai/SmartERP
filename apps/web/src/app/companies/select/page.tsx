'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Company {
    id: string;
    name: string;
    address?: string | null;
    gstNumber?: string | null;
    currency: string;
    financialYearStart: string;
    financialYearEnd: string;
    role: string;
    createdAt: string;
}

function CompanySelectContent() {
    const router = useRouter();
    const { user, activeCompanyId, setActiveCompanyId } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function fetchCompanies() {
        setLoading(true);
        try {
            const res = await api.get<ApiSuccess<{ companies: Company[] }> | ApiError>('/companies');
            if (res.data.success) {
                setCompanies((res.data as ApiSuccess<{ companies: Company[] }>).data.companies);
            }
        } catch (err) {
            console.error('Failed to load companies', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCompanies();
    }, []);

    function openCompany(id: string) {
        localStorage.setItem('smarterp_activeCompanyId', id);
        setActiveCompanyId(id);
        router.push('/dashboard');
    }

    async function deleteCompany(id: string, name: string) {
        if (!confirm(`Delete "${name}"? This will soft-delete the company and you will lose access. Past vouchers and reports are preserved for audit purposes.`)) {
            return;
        }
        setDeletingId(id);
        try {
            await api.delete(`/companies/${id}`);
            // If we just deleted the active company, clear it
            if (activeCompanyId === id) {
                setActiveCompanyId('');
                localStorage.removeItem('smarterp_activeCompanyId');
            }
            await fetchCompanies();
        } catch (err: any) {
            alert(err?.response?.data?.error?.message || 'Failed to delete company');
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Select Company</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose the company you want to work with. You can manage up to 5 companies.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/companies/new">
                            <Plus className="mr-2 h-4 w-4" /> New Company
                        </Link>
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : companies.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <Building2 className="h-12 w-12 text-muted-foreground/40" />
                            <h2 className="mt-4 text-lg font-semibold text-foreground">No companies yet</h2>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Create your first company to start managing accounting, inventory, and billing.
                            </p>
                            <Button asChild className="mt-6">
                                <Link href="/companies/new">
                                    <Plus className="mr-2 h-4 w-4" /> Create your first company
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {companies.map((c) => (
                            <Card key={c.id} className={activeCompanyId === c.id ? 'border-primary' : ''}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{c.name}</CardTitle>
                                                <CardDescription className="mt-0.5 text-xs">
                                                    FY {formatDate(c.financialYearStart)} – {formatDate(c.financialYearEnd)}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="muted" className="text-[10px]">{c.role}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {c.gstNumber && (
                                        <p className="text-xs text-muted-foreground">GSTIN: <span className="font-mono">{c.gstNumber}</span></p>
                                    )}
                                    {c.address && <p className="line-clamp-2 text-xs text-muted-foreground">{c.address}</p>}
                                    <div className="flex gap-2 pt-2">
                                        <Button size="sm" onClick={() => openCompany(c.id)} className="flex-1">
                                            Open
                                        </Button>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`/companies/${c.id}/edit`}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        {c.role === 'ADMIN' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deleteCompany(c.id, c.name)}
                                                disabled={deletingId === c.id}
                                                aria-label="Delete company"
                                            >
                                                {deletingId === c.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}

export default function CompanySelectPage() {
    return (
        <ProtectedRoute>
            <CompanySelectContent />
        </ProtectedRoute>
    );
}
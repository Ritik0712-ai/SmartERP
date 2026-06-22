'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { CompanyForm } from '@/components/company-form';
import { api, ApiSuccess, ApiError } from '@/lib/api';

type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

interface CompanyData {
    name: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    gstNumber?: string;
    panNumber?: string;
    state?: string;
    stateCode?: string;
    currency: Currency;
    financialYearStart: string;
    financialYearEnd: string;
}

function EditCompanyContent() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const [data, setData] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const res = await api.get<ApiSuccess<any> | ApiError>(`/companies/${id}`);
                if (!cancelled && res.data.success) {
                    const c = (res.data as ApiSuccess<any>).data;
                    setData({
                        name: c.name,
                        address: c.address ?? '',
                        contactNumber: c.contactNumber ?? '',
                        email: c.email ?? '',
                        gstNumber: c.gstNumber ?? '',
                        panNumber: c.panNumber ?? '',
                        state: c.state ?? '',
                        stateCode: c.stateCode ?? '',
                        currency: (c.currency as Currency) ?? 'INR',
                        financialYearStart: c.financialYearStart?.split('T')[0] ?? '',
                        financialYearEnd: c.financialYearEnd?.split('T')[0] ?? '',
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (id) load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Company</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Update company details and financial year</p>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data ? (
                    <CompanyForm mode="edit" companyId={id} initialData={data} />
                ) : (
                    <p className="text-sm text-destructive">Failed to load company details.</p>
                )}
            </div>
        </AppShell>
    );
}

export default function EditCompanyPage() {
    return (
        <ProtectedRoute>
            <EditCompanyContent />
        </ProtectedRoute>
    );
}

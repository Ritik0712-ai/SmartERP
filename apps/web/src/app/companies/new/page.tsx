'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { CompanyForm } from '@/components/company-form';

function NewCompanyContent() {
    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Company</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Set up a new business entity. We&apos;ll automatically create the chart of accounts, units, and current financial year for you.
                    </p>
                </div>
                <CompanyForm mode="create" />
            </div>
        </AppShell>
    );
}

export default function NewCompanyPage() {
    return (
        <ProtectedRoute>
            <NewCompanyContent />
        </ProtectedRoute>
    );
}
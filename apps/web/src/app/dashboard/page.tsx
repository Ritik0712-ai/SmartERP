'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Truck,
  Package,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowRight,
  Building2,
  ArrowLeftRight,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function DashboardContent() {
  const router = useRouter();
  const { user, activeCompanyId } = useAuth();
  const activeCompany = user?.companies.find((c) => c.id === activeCompanyId);

  // If no active company, push to selection
  useEffect(() => {
    if (user && (!activeCompanyId || !activeCompany)) {
      router.replace('/companies/select');
    }
  }, [user, activeCompanyId, activeCompany, router]);

  if (!activeCompany) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No company selected</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Select or create a company to start working.
          </p>
          <Button asChild className="mt-6">
            <Link href="/companies/select">Choose a company</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const kpis = [
    { label: 'Total Sales', value: '—', icon: TrendingUp, color: 'text-success' },
    { label: 'Total Purchases', value: '—', icon: TrendingDown, color: 'text-warning' },
    { label: 'Outstanding Receivables', value: '—', icon: Wallet, color: 'text-primary' },
    { label: 'Outstanding Payables', value: '—', icon: Receipt, color: 'text-destructive' },
  ];

  const quickActions = [
    { label: 'New Sales Voucher', href: '/transactions/vouchers/sales/new', icon: ArrowLeftRight, shortcut: 'F8' },
    { label: 'New Purchase Voucher', href: '/transactions/vouchers/purchase/new', icon: ArrowLeftRight, shortcut: 'F9' },
    { label: 'New Customer', href: '/customers/new', icon: Users, shortcut: 'Ctrl+C' },
    { label: 'New Supplier', href: '/suppliers/new', icon: Truck, shortcut: 'Ctrl+S' },
    { label: 'New Stock Item', href: '/inventory/stock-items/new', icon: Package, shortcut: 'Alt+S' },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Working in <span className="font-medium text-foreground">{activeCompany.name}</span>
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label}>
                <CardContent className="flex items-start justify-between p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{kpi.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Live data arrives Day 7</p>
                  </div>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Most common workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((qa) => {
                const Icon = qa.icon;
                return (
                  <Link
                    key={qa.label}
                    href={qa.href}
                    className="group flex items-center justify-between rounded-md border border-border bg-background px-4 py-3 transition-colors hover:border-primary hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <span className="text-sm font-medium text-foreground">{qa.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
                        {qa.shortcut}
                      </kbd>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent + Setup status */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest vouchers and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity yet. Create your first voucher.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Checklist</CardTitle>
              <CardDescription>Get the most out of SmartERP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Company created', done: true },
                { label: 'Add customers', done: false, href: '/customers/new' },
                { label: 'Add suppliers', done: false, href: '/suppliers/new' },
                { label: 'Add stock items', done: false, href: '/inventory/stock-items/new' },
                { label: 'Record your first sales voucher', done: false, href: '/transactions/vouchers/sales/new' },
              ].map((item, i) => (
                <Link
                  key={i}
                  href={item.href ?? '#'}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full border ${item.done ? 'border-success bg-success' : 'border-muted-foreground'}`}
                    >
                      {item.done && (
                        <svg className="h-full w-full text-success-foreground" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M13.485 1.929a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L5.5 8.94l6.97-7.01a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                      )}
                    </div>
                    <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
                      {item.label}
                    </span>
                  </div>
                  {!item.done && <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

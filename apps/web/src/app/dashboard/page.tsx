'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Package,
  Users,
  Truck,
  ArrowRight,
  Building2,
  ArrowLeftRight,
  Plus,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKpis, useSalesChart, useRecentVouchers } from '@/hooks/use-dashboard-data';
import { formatCurrency } from '@/lib/utils';

function ChartBars({ data }: { data: { label: string; sales: number; purchases: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }
  const max = Math.max(1, ...data.flatMap((d) => [d.sales, d.purchases]));
  return (
    <div className="flex h-48 items-end justify-between gap-2">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-40 w-full items-end justify-center gap-1">
            <div
              className="w-1/2 rounded-t bg-primary/80"
              style={{ height: `${(d.sales / max) * 100}%` }}
              title={`Sales: ${formatCurrency(d.sales)}`}
            />
            <div
              className="w-1/2 rounded-t bg-warning/80"
              style={{ height: `${(d.purchases / max) * 100}%` }}
              title={`Purchases: ${formatCurrency(d.purchases)}`}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user, activeCompanyId } = useAuth();
  const activeCompany = user?.companies.find((c) => c.id === activeCompanyId);

  useEffect(() => {
    if (user && (!activeCompanyId || !activeCompany)) {
      router.replace('/companies/select');
    }
  }, [user, activeCompanyId, activeCompany, router]);

  const kpis = useKpis(activeCompanyId);
  const chart = useSalesChart(activeCompanyId, 6);
  const recent = useRecentVouchers(activeCompanyId, 5);

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

  function reload() {
    kpis.reload();
    chart.reload();
    recent.reload();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Working in <span className="font-medium text-foreground">{activeCompany.name}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Sales (this month)"
            value={kpis.data?.totalSales ?? 0}
            prefix="₹"
            icon={TrendingUp}
            tone="success"
            loading={kpis.loading}
            hint={kpis.data ? `as of ${new Date(kpis.data.to).toLocaleDateString()}` : undefined}
          />
          <KpiCard
            label="Total Purchases (this month)"
            value={kpis.data?.totalPurchases ?? 0}
            prefix="₹"
            icon={TrendingDown}
            tone="warning"
            loading={kpis.loading}
          />
          <KpiCard
            label="Outstanding Receivables"
            value={kpis.data?.outstandingReceivables ?? 0}
            prefix="₹"
            icon={Wallet}
            tone="primary"
            loading={kpis.loading}
          />
          <KpiCard
            label="Outstanding Payables"
            value={kpis.data?.outstandingPayables ?? 0}
            prefix="₹"
            icon={Receipt}
            tone="destructive"
            loading={kpis.loading}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Stock Value" value={kpis.data?.stockValue ?? 0} prefix="₹" icon={Package} loading={kpis.loading} />
          <KpiCard
            label="Low Stock Items"
            value={kpis.data?.lowStockCount ?? 0}
            icon={AlertTriangle}
            tone={(kpis.data?.lowStockCount ?? 0) > 0 ? 'warning' : 'default'}
            loading={kpis.loading}
          />
          <KpiCard label="Customers" value={kpis.data?.totalCustomers ?? 0} icon={Users} loading={kpis.loading} />
          <KpiCard label="Suppliers" value={kpis.data?.totalSuppliers ?? 0} icon={Truck} loading={kpis.loading} />
        </div>

        {/* Chart + Recent + Quick actions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Sales vs Purchases — last 6 months</CardTitle>
                  <CardDescription>Trend across the selected company</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-primary" /> Sales
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-warning" /> Purchases
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartBars data={chart.data?.points ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Vouchers</CardTitle>
              <CardDescription>Latest activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (recent.data?.vouchers ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {(recent.data?.vouchers ?? []).map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{v.voucherNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.type} · {new Date(v.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-mono text-sm">{formatCurrency(v.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions + Setup */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Press <kbd className="rounded border px-1 font-mono text-[10px]">Ctrl+K</kbd> to search any action</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { label: 'New Sales Voucher', href: '/transactions/vouchers/sales/new', icon: ArrowLeftRight, shortcut: 'F8' },
                  { label: 'New Purchase Voucher', href: '/transactions/vouchers/purchase/new', icon: ArrowLeftRight, shortcut: 'F9' },
                  { label: 'New Customer', href: '/customers/new', icon: Users, shortcut: 'Ctrl+C' },
                  { label: 'New Supplier', href: '/suppliers/new', icon: Truck, shortcut: 'Ctrl+S' },
                  { label: 'New Stock Item', href: '/inventory/stock-items/new', icon: Package, shortcut: 'Alt+S' },
                  { label: 'View Reports', href: '/reports/trial-balance', icon: FileText },
                ].map((qa) => {
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
                        {qa.shortcut && (
                          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {qa.shortcut}
                          </kbd>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </Link>
                  );
                })}
              </div>
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
                        <svg
                          className="h-full w-full text-success-foreground"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
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

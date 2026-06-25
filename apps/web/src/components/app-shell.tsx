'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Package,
  Users,
  Truck,
  FileBarChart,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  ChevronDown,
  Building2,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
// palette moved to GlobalKeyboard
import {



} from '@/hooks/use-keyboard-shortcuts';
import { useTheme } from '@/lib/theme';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'Ctrl+H' }],
  },
  {
    title: 'Masters',
    items: [
      { href: '/masters/ledgers', label: 'Ledgers', icon: BookOpen, shortcut: 'Alt+L' },
      { href: '/masters/ledger-groups', label: 'Ledger Groups', icon: BookOpen },
      { href: '/inventory/stock-items', label: 'Stock Items', icon: Package, shortcut: 'Alt+S' },
      { href: '/inventory/stock-groups', label: 'Stock Groups', icon: Package },
      { href: '/inventory/units', label: 'Units', icon: Package },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { href: '/transactions/vouchers/sales/new', label: 'Sales Voucher', icon: ArrowLeftRight, shortcut: 'F8' },
      { href: '/transactions/vouchers/purchase/new', label: 'Purchase Voucher', icon: ArrowLeftRight, shortcut: 'F9' },
      { href: '/transactions/vouchers', label: 'All Vouchers', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Parties',
    items: [
      { href: '/customers', label: 'Customers', icon: Users, shortcut: 'Ctrl+C' },
      { href: '/suppliers', label: 'Suppliers', icon: Truck, shortcut: 'Ctrl+S' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { href: '/reports/trial-balance', label: 'Trial Balance', icon: FileBarChart, shortcut: 'Alt+T' },
      { href: '/reports/profit-loss', label: 'Profit & Loss', icon: FileBarChart, shortcut: 'Alt+P' },
      { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: FileBarChart, shortcut: 'Alt+B' },
      { href: '/reports/stock-summary', label: 'Stock Summary', icon: FileBarChart, shortcut: 'Alt+R' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/companies/select', label: 'Switch Company', icon: Building2, shortcut: 'F1' },
      { href: '/admin/users', label: 'Users', icon: ShieldCheck },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function ShellInner({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, activeCompanyId } = useAuth();
  const { theme, setTheme, resolved } = useTheme();
  const activeCompany = (user?.companies ?? []).find((c) => c.id === activeCompanyId);


  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">


      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-200',
          collapsed ? 'w-[72px]' : 'w-[280px]',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            S
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-foreground">SmartERP</p>
              <p className="truncate text-xs text-muted-foreground">{activeCompany?.name ?? 'No company'}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                        title={collapsed ? `${item.label}${item.shortcut ? ` (${item.shortcut})` : ''}` : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.shortcut && (
                              <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground group-hover:inline">
                                {item.shortcut}
                              </kbd>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User menu */}
        <div className="border-t border-border p-3">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-foreground">{user?.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/companies/select"
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {activeCompany?.name ?? 'Select company'}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
            {activeCompany && (
              <Badge variant="muted" className="font-mono text-[10px]">
                {activeCompany.role}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Command palette trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground md:flex"
              aria-label="Open command palette"
            >
              <Command className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </button>
            <ThemeToggle />
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                {user?.name?.split(' ')[0]}
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <ShellInner>{children}</ShellInner>;
}

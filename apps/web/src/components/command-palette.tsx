'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Plus,
  Search,
  ArrowRight,
  Users,
  Truck,
  Package,
  FileBarChart,
  ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  group: 'Navigation' | 'Create' | 'Actions' | 'Theme';
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
  keywords?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { user, logout, activeCompanyId, setActiveCompanyId } = useAuth();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [open]);

  const navigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };
  const navigateAfter = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', group: 'Navigation', icon: LayoutDashboard, shortcut: 'Ctrl+H', action: () => navigate('/dashboard'), keywords: 'home' },
      { id: 'nav-companies', label: 'Switch Company', group: 'Navigation', icon: Building2, shortcut: 'F1', action: () => navigate('/companies/select'), keywords: 'firm business' },
      { id: 'nav-profile', label: 'My Profile', group: 'Navigation', icon: UserIcon, action: () => navigate('/profile'), keywords: 'account me' },
      { id: 'nav-settings', label: 'Settings', group: 'Navigation', icon: Settings, action: () => navigate('/settings'), keywords: 'preferences config' },
    ];
    if (activeCompanyId) {
      list.push(
        { id: 'create-customer', label: 'New Customer', group: 'Create', icon: Users, shortcut: 'Ctrl+C', action: () => navigate('/customers/new'), keywords: 'party debtor buyer client' },
        { id: 'create-supplier', label: 'New Supplier', group: 'Create', icon: Truck, shortcut: 'Ctrl+S', action: () => navigate('/suppliers/new'), keywords: 'party creditor vendor' },
        { id: 'create-item', label: 'New Stock Item', group: 'Create', icon: Package, shortcut: 'Alt+S', action: () => navigate('/inventory/stock-items/new'), keywords: 'product sku' },
        { id: 'create-sales', label: 'New Sales Voucher', group: 'Create', icon: ArrowLeftRight, shortcut: 'F8', action: () => navigate('/transactions/vouchers/sales/new'), keywords: 'sell invoice bill' },
        { id: 'create-purchase', label: 'New Purchase Voucher', group: 'Create', icon: ArrowLeftRight, shortcut: 'F9', action: () => navigate('/transactions/vouchers/purchase/new'), keywords: 'buy' },
      );
      // Switch company items
      if (user?.companies && user.companies.length > 1) {
        user.companies.forEach((c) => {
          if (c.id === activeCompanyId) return;
          list.push({
            id: `switch-${c.id}`,
            label: `Switch to "${c.name}"`,
            group: 'Actions',
            icon: Building2,
            action: () => navigateAfter(() => setActiveCompanyId(c.id)),
            keywords: 'company',
          });
        });
      }
    }
    // Reports
    list.push(
      { id: 'nav-tb', label: 'Trial Balance', group: 'Navigation', icon: FileBarChart, action: () => navigate('/reports/trial-balance') },
      { id: 'nav-pl', label: 'Profit & Loss', group: 'Navigation', icon: FileBarChart, action: () => navigate('/reports/profit-loss') },
      { id: 'nav-bs', label: 'Balance Sheet', group: 'Navigation', icon: FileBarChart, action: () => navigate('/reports/balance-sheet') },
      { id: 'nav-stock', label: 'Stock Summary', group: 'Navigation', icon: FileBarChart, action: () => navigate('/reports/stock-summary') },
    );
    // Theme
    list.push(
      { id: 'theme-light', label: 'Theme: Light', group: 'Theme', icon: Sun, action: () => navigateAfter(() => setTheme('light')) },
      { id: 'theme-dark', label: 'Theme: Dark', group: 'Theme', icon: Moon, action: () => navigateAfter(() => setTheme('dark')) },
      { id: 'theme-system', label: 'Theme: System', group: 'Theme', icon: Monitor, action: () => navigateAfter(() => setTheme('system')) },
    );
    // Logout
    list.push({
      id: 'logout',
      label: 'Logout',
      group: 'Actions',
      icon: LogOut,
      shortcut: 'Ctrl+Shift+L',
      action: () => navigateAfter(() => logout().then(() => router.push('/login'))),
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeCompanyId, theme]);

  // Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const hay = [i.label, i.group, i.keywords ?? ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  // Reset highlight on query change
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Arrow keys + Enter
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[highlight];
      if (item) item.action();
    }
  };

  if (!open) return null;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 p-4 pt-24 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands, pages, or actions…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {list.map((item) => {
                  const globalIndex = filtered.indexOf(item);
                  const active = globalIndex === highlight;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => item.action()}
                      onMouseEnter={() => setHighlight(globalIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <kbd
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[10px] font-mono',
                            active
                              ? 'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground',
                          )}
                        >
                          {item.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className={cn('h-3.5 w-3.5', active ? 'opacity-100' : 'opacity-0')} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">Esc</kbd>
              to close
            </span>
          </div>
          <Plus className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

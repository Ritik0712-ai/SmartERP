'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { Sun, Moon, Monitor, Building2, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

function SettingsContent() {
  const { theme, setTheme, resolved } = useTheme();
  const { user, logout, activeCompanyId } = useAuth();
  const router = useRouter();
  const activeCompany = user?.companies.find((c) => c.id === activeCompanyId);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', desc: 'Always light mode', Icon: Sun },
    { value: 'dark' as const, label: 'Dark', desc: 'Always dark mode', Icon: Moon },
    { value: 'system' as const, label: 'System', desc: 'Follow OS preference', Icon: Monitor },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your appearance, account, and company preferences
          </p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Appearance
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Current: {resolved}
              </span>
            </CardTitle>
            <CardDescription>Switch between light, dark, or follow your system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {themeOptions.map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-md border border-border p-4 text-left transition-colors hover:border-primary',
                    theme === value && 'border-primary bg-primary/5',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Quick toggle:</span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Account quick links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" /> Account
            </CardTitle>
            <CardDescription>Manage your profile and session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" onClick={() => router.push('/profile')}>
                View profile
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Company */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Company
            </CardTitle>
            <CardDescription>Switch or manage your companies (max 5)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="font-medium text-foreground">
                  {activeCompany?.name ?? 'No company selected'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.companies.length ?? 0} of 5 companies · Role: {activeCompany?.role ?? '—'}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/companies/select')}>
                Switch company
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          SmartERP v0.1 · Day 3 · Keyboard: Ctrl+K (Command Palette — coming in Day 4)
        </p>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

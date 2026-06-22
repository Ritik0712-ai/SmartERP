'use client';

import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

function DashboardContent() {
  const { user, logout, activeCompanyId } = useAuth();
  const router = useRouter();
  const activeCompany = user?.companies.find((c) => c.id === activeCompanyId);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeCompany ? (
                <>Active company: <span className="font-medium text-foreground">{activeCompany.name}</span> · Role: {activeCompany.role}</>
              ) : (
                'No active company yet'
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/profile')}>Profile</Button>
            <Button variant="destructive" onClick={handleLogout}>Logout</Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Total Sales', 'Total Purchases', 'Customers', 'Suppliers'].map((label) => (
            <Card key={label} className="p-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">—</p>
              <p className="mt-1 text-xs text-muted-foreground">Live data arrives Day 4</p>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Your companies</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {user?.companies.map((c) => (
              <Card key={c.id} className="p-4">
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Role: {c.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

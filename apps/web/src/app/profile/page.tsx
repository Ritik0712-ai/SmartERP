'use client';

import { useAuth } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

function ProfileContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>← Dashboard</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{user.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email verified</p>
                <p className="font-medium text-foreground">{user.emailVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last login</p>
                <p className="font-medium text-foreground">
                  {user.lastLogin ? formatDate(user.lastLogin) : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Member since</p>
                <p className="font-medium text-foreground">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your companies ({user.companies.length}/5)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.companies.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Role: {c.role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

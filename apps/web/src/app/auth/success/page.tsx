'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function GoogleSuccessPage() {
  const router = useRouter();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    async function consume() {
      // Read the short-lived httpOnly cookies set by /auth/callback
      // They contain accessToken, refreshToken, user
      const res = await fetch('/api/google/consume', { method: 'POST' });
      if (!res.ok) {
        router.replace('/login?error=google_consume_failed');
        return;
      }
      const json = await res.json();
      if (json.accessToken && json.refreshToken && json.user) {
        await loginWithTokens(json.accessToken, json.refreshToken, json.user);
        router.replace('/dashboard');
      } else {
        router.replace('/login?error=google_no_tokens');
      }
    }
    void consume();
  }, [router, loginWithTokens]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in with Google…</p>
      </div>
    </main>
  );
}

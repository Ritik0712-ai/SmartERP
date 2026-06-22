import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-2xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
          SmartERP
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          The Tally-inspired ERP,
          <br />
          built for the modern web.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Manage accounting, inventory, billing, GST, banking, and reports — all
          from one keyboard-first platform. Built for small and medium
          businesses.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Create Account</Link>
          </Button>
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          Day 2 build — full auth + RBAC live.
        </p>
      </div>
    </main>
  );
}

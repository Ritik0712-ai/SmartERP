import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Create Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Day 2 will wire this up to the API.
        </p>
        <div className="mt-6 space-y-4">
          <Button className="w-full" disabled>
            Register (Day 2)
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

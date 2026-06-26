'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { LedgerForm } from '@/components/ledger-form';

export default function NewLedgerPage() {
  return (
    <ProtectedRoute>
      <LedgerForm mode="create" />
    </ProtectedRoute>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { LedgerForm } from '@/app/masters/ledgers/new/page';

export default function EditLedgerPage() {
  const params = useParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <LedgerForm mode="edit" ledgerId={params.id} />
    </ProtectedRoute>
  );
}

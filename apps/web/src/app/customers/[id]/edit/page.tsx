'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { CustomerForm } from '@/components/customer-form';

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <CustomerForm mode="edit" customerId={params.id} />
    </ProtectedRoute>
  );
}

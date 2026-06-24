'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { CustomerForm } from '@/components/customer-form';

export default function NewCustomerPage() {
  return (
    <ProtectedRoute>
      <CustomerForm mode="create" />
    </ProtectedRoute>
  );
}

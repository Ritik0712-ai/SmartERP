'use client';

import { useEffect, useState } from 'react';
import { api, ApiSuccess, ApiError } from '@/lib/api';

export interface KpiSummary {
  totalSales: number;
  totalPurchases: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  stockValue: number;
  lowStockCount: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalStockItems: number;
  totalInvoices: number;
  totalVouchers: number;
  from: string;
  to: string;
}

export interface ChartPoint {
  month: string;
  label: string;
  sales: number;
  purchases: number;
}

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useResource<T>(path: string | null): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!path, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<ApiSuccess<T> | ApiError>(path)
      .then((res) => {
        if (cancelled) return;
        if (res.data.success) {
          setState({ data: (res.data as ApiSuccess<T>).data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: (res.data as ApiError).error.message });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: err?.response?.data?.error?.message ?? err?.message ?? 'Network error' });
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function useKpis(companyId: string | null) {
  return useResource<KpiSummary>(
    companyId ? `/dashboard/kpis?companyId=${companyId}` : null,
  );
}

export function useSalesChart(companyId: string | null, months = 6) {
  return useResource<{ points: ChartPoint[] }>(
    companyId ? `/dashboard/sales-chart?companyId=${companyId}&months=${months}` : null,
  );
}

export function useRecentVouchers(companyId: string | null, limit = 5) {
  return useResource<{ vouchers: any[] }>(
    companyId ? `/dashboard/recent-vouchers?companyId=${companyId}&limit=${limit}` : null,
  );
}

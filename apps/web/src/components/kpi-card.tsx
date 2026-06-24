'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Optional sub-label (e.g. "vs last month") */
  hint?: string;
  /** Trend direction */
  trend?: 'up' | 'down' | 'flat';
  /** Color hint: success | warning | destructive | primary */
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  loading?: boolean;
  prefix?: string; // e.g. ₹ or $
}

const toneClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  primary: 'text-primary',
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = 'default',
  loading,
  prefix = '',
}: KpiCardProps) {
  const display = typeof value === 'number'
    ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : value;

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-9 w-32 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 truncate text-3xl font-semibold text-foreground">
              {prefix}{display}
            </p>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md bg-muted/40',
              toneClasses[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'flat' && 'text-muted-foreground',
              )}
            >
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
              {trend !== 'flat' && <span>{trend === 'up' ? '+' : '-'}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

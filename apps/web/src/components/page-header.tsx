'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, backHref, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {backHref && (
          <Link href={backHref} className="mb-1 inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> Back
          </Link>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function NewButton({ href, label = 'New' }: { href: string; label?: string }) {
  return (
    <Button asChild>
      <Link href={href}>
        <Plus className="mr-2 h-4 w-4" /> {label}
      </Link>
    </Button>
  );
}

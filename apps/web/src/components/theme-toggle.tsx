'use client';

import { useTheme } from '@/lib/theme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-border bg-card p-1 shadow-lg">
            {[
              { value: 'light' as const, label: 'Light', Icon: Sun },
              { value: 'dark' as const, label: 'Dark', Icon: Moon },
              { value: 'system' as const, label: 'System', Icon: Monitor },
            ].map(({ value, label, Icon: I }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                  theme === value && 'bg-accent font-medium text-foreground',
                )}
              >
                <I className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

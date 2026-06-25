'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { GlobalKeyboard } from '@/components/global-keyboard';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <GlobalKeyboard />
      </AuthProvider>
    </ThemeProvider>
  );
}

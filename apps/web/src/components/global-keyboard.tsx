'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandPalette } from '@/components/command-palette';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useGlobalKeyboardListener, useAppShortcuts } from '@/hooks/use-keyboard-shortcuts';

/**
 * Mounts the global keyboard listener and command palette ONCE at the app root,
 * so Cmd+K works on every page (including login, register, etc.).
 */
export function GlobalKeyboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const { setTheme, resolved } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global listener
  useGlobalKeyboardListener();

  // App shortcuts (Ctrl+K palette, Ctrl+H dashboard, Ctrl+Shift+T theme, Ctrl+Shift+L logout)
  useAppShortcuts({
    onOpenPalette: () => setPaletteOpen(true),
    onLogout: async () => {
      await logout();
      router.push('/login');
    },
    onToggleTheme: () => {
      const next = resolved === 'dark' ? 'light' : 'dark';
      setTheme(next);
    },
  });

  return <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />;
}

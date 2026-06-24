'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

let shortcuts: ShortcutConfig[] = [];
let openPaletteHandler: (() => void) | null = null;

export function setPaletteOpener(fn: (() => void) | null) {
  openPaletteHandler = fn;
}

export function openCommandPalette() {
  openPaletteHandler?.();
}

/**
 * Register a global keyboard shortcut. Pass an empty deps array.
 */
export function useKeyboardShortcuts(config: ShortcutConfig) {
  useEffect(() => {
    shortcuts.push(config);
    return () => {
      shortcuts = shortcuts.filter((s) => s !== config);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function isTextInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function handleKeyDown(e: KeyboardEvent) {
  // Don't intercept when typing in an input — except for Escape and Ctrl+K
  if (isTextInput(e.target) && e.key !== 'Escape' && !(e.ctrlKey || e.metaKey)) {
    return;
  }

  for (const s of shortcuts) {
    if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;
    if (Boolean(s.ctrl) !== e.ctrlKey) continue;
    if (Boolean(s.meta) !== e.metaKey) continue;
    if (Boolean(s.shift) !== e.shiftKey) continue;
    if (Boolean(s.alt) !== e.altKey) continue;
    e.preventDefault();
    s.action();
    return;
  }
}

/**
 * Mount the global key listener. Call once at app root.
 */
export function useGlobalKeyboardListener() {
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

/**
 * Pre-defined shortcuts for the app.
 */
export function useAppShortcuts(opts: {
  onOpenPalette: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
}) {
  const router = useRouter();
  // Ctrl+K — command palette
  useKeyboardShortcuts({ key: 'k', ctrl: true, meta: true, action: opts.onOpenPalette });
  // Ctrl+H — dashboard
  useKeyboardShortcuts({ key: 'h', ctrl: true, meta: true, action: () => router.push('/dashboard') });
  // F1 — companies
  useKeyboardShortcuts({ key: 'F1', action: () => router.push('/companies/select') });
  // F8 — sales voucher (placeholder route for now)
  useKeyboardShortcuts({ key: 'F8', action: () => router.push('/transactions/vouchers/sales/new') });
  // F9 — purchase voucher (placeholder route for now)
  useKeyboardShortcuts({ key: 'F9', action: () => router.push('/transactions/vouchers/purchase/new') });
  // Ctrl+Shift+T — toggle theme
  useKeyboardShortcuts({ key: 't', ctrl: true, meta: true, shift: true, action: opts.onToggleTheme });
  // Ctrl+Shift+L — logout
  useKeyboardShortcuts({ key: 'l', ctrl: true, meta: true, shift: true, action: opts.onLogout });
  // ESC handled at the page level (close palette, etc.)
}

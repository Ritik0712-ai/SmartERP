'use client';

import { useEffect, useRef } from 'react';

interface ShortcutConfig {
  key?: string;
  code?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

function isTextInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function matchesShortcut(s: ShortcutConfig, e: KeyboardEvent): boolean {
  if (s.code && e.code !== s.code) return false;
  if (!s.code && s.key && e.key.toLowerCase() !== s.key.toLowerCase()) return false;
  if (Boolean(s.ctrl) !== e.ctrlKey) return false;
  if (Boolean(s.meta) !== e.metaKey) return false;
  if (Boolean(s.shift) !== e.shiftKey) return false;
  if (Boolean(s.alt) !== e.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  const ref = useRef(config);
  ref.current = config;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTextInput(e.target) && !(e.ctrlKey || e.metaKey || e.altKey)) return;
      if (!matchesShortcut(ref.current, e)) return;
      e.preventDefault();
      e.stopPropagation();
      ref.current.action();
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true } as any);
  }, []);
}

export function useGlobalKeyboardListener() {
  // No-op (each shortcut has its own listener)
}

export function useAppShortcuts(opts: {
  onOpenPalette: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
}) {
  // Ctrl+K on Windows/Linux, Cmd+K on Mac
  useKeyboardShortcuts({ code: 'KeyK', ctrl: true, meta: true, action: opts.onOpenPalette });
  // Ctrl+H (Cmd+H) — dashboard
  useKeyboardShortcuts({ code: 'KeyH', ctrl: true, meta: true, action: () => { window.location.href = '/dashboard'; } });
  // F1 — companies
  useKeyboardShortcuts({ code: 'F1', action: () => { window.location.href = '/companies/select'; } });
  // F8 — sales voucher
  useKeyboardShortcuts({ code: 'F8', action: () => { window.location.href = '/transactions/vouchers/sales/new'; } });
  // F9 — purchase voucher
  useKeyboardShortcuts({ code: 'F9', action: () => { window.location.href = '/transactions/vouchers/purchase/new'; } });
  // Ctrl+Shift+T (Cmd+Shift+T) — toggle theme
  useKeyboardShortcuts({ code: 'KeyT', ctrl: true, meta: true, shift: true, action: opts.onToggleTheme });
  // Ctrl+Shift+L (Cmd+Shift+L) — logout
  useKeyboardShortcuts({ code: 'KeyL', ctrl: true, meta: true, shift: true, action: opts.onLogout });
}

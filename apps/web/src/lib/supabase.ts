'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Browser client (for client components - uses cookies automatically)
let _supabase: ReturnType<typeof createBrowserClient> | null = null;
export function getSupabaseBrowser() {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _supabase;
}

// Plain client for non-SSR contexts (one-shot calls)
let _plain: ReturnType<typeof createClient> | null = null;
export function getSupabase() {
  if (!_plain) {
    _plain = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _plain;
}

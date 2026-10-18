import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('your-supabase-project-url') &&
  !rawUrl.includes('placeholder') &&
  rawKey.length > 20 &&
  !rawKey.includes('your-supabase-anon-key')
);

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key-for-local-development-only';

if (!isSupabaseConfigured) {
  console.warn(
    '[MTR HIDE & SEEK] Supabase credentials not found or placeholder used. App is running in local fallback mode. Realtime multi-device sync is disabled until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are provided in .env.local.'
  );
}

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? rawUrl! : fallbackUrl,
  isSupabaseConfigured ? rawKey! : fallbackKey
);

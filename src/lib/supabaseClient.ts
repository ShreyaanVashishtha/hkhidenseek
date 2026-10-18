import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
const rawKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.SUPABASE_ANON_KEY
)?.trim();

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
    '[MTR HIDE & SEEK] Supabase credentials not detected. Running in local-first mode. Multi-device cloud sync will activate once Supabase is connected in Vercel or .env.local.'
  );
}

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? rawUrl! : fallbackUrl,
  isSupabaseConfigured ? rawKey! : fallbackKey
);

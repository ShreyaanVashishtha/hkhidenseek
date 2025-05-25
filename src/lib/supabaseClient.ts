
import { createClient } from '@supabase/supabase-js';

const supabaseUrlFromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyFromEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the variables are undefined or null first
if (supabaseUrlFromEnv === undefined || supabaseUrlFromEnv === null) {
  throw new Error(
    `Supabase URL (NEXT_PUBLIC_SUPABASE_URL) is undefined. Ensure it's set in your .env file and the development server has been restarted.`
  );
}
if (supabaseAnonKeyFromEnv === undefined || supabaseAnonKeyFromEnv === null) {
  throw new Error(
    `Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is undefined. Ensure it's set in your .env file and the development server has been restarted.`
  );
}

// Trim whitespace from the variables
const trimmedSupabaseUrl = supabaseUrlFromEnv.trim();
const trimmedSupabaseAnonKey = supabaseAnonKeyFromEnv.trim();

// Check if, after trimming, the URL or key is an empty string or doesn't look like a valid URL/key
if (trimmedSupabaseUrl === "" || !trimmedSupabaseUrl.startsWith('http') || trimmedSupabaseUrl.includes("your-supabase-project-url")) {
  throw new Error(
    `Supabase URL is empty, a placeholder, or not a valid HTTP(S) URL after trimming. Received original: "${supabaseUrlFromEnv}", trimmed: "${trimmedSupabaseUrl}". Ensure NEXT_PUBLIC_SUPABASE_URL in your .env file is correct (e.g., https://your-project.supabase.co) and the server restarted.`
  );
}

if (trimmedSupabaseAnonKey === "" || trimmedSupabaseAnonKey.length < 20 || trimmedSupabaseAnonKey.includes("your-supabase-anon-key")) { // Basic length check for anon key
  throw new Error(
    `Supabase Anon Key is empty, a placeholder, or too short after trimming. Received original: "${supabaseAnonKeyFromEnv}". Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file is correct and the server restarted.`
  );
}

export const supabase = createClient(trimmedSupabaseUrl, trimmedSupabaseAnonKey);


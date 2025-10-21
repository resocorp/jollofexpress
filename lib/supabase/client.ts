// Supabase client for client-side operations
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Use new publishable key (recommended) with fallback to legacy anon key
  const apiKey = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||  // New format: sb_publishable_...
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;            // Legacy format: eyJhbGciOiJI...
  
  if (!apiKey) {
    throw new Error('Missing Supabase API key. Please add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    apiKey
  );
}

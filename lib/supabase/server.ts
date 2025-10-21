// Supabase client for server-side operations
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  // Use new publishable key (recommended) with fallback to legacy anon key
  const apiKey = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||  // New format: sb_publishable_...
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;            // Legacy format: eyJhbGciOiJI...
  
  if (!apiKey) {
    throw new Error('Missing Supabase API key. Please add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    apiKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

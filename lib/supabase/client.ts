// Supabase client for client-side operations
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Use new publishable key (recommended) with fallback to legacy anon key
  const apiKey = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||  // New format: sb_publishable_...
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;            // Legacy format: eyJhbGciOiJI...
  
  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in environment variables');
    throw new Error('Missing Supabase URL. Please add NEXT_PUBLIC_SUPABASE_URL to your .env.local file.');
  }
  
  if (!apiKey) {
    console.error('❌ Missing Supabase API key in environment variables');
    throw new Error('Missing Supabase API key. Please add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
  }
  
  // Log configuration (without exposing sensitive data)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Supabase Client Config:', {
      url: supabaseUrl,
      keyType: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'publishable' : 'anon (legacy)',
      keyPrefix: apiKey.substring(0, 15) + '...',
    });
  }
  
  return createBrowserClient(
    supabaseUrl,
    apiKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'jollofexpress-web',
        },
      },
    }
  );
}

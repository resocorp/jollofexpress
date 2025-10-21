// Supabase service role client for server-side operations that bypass RLS
// Use this ONLY for trusted server-side operations (order creation, admin tasks)
import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Use new secret key (recommended) with fallback to legacy service_role key
  const supabaseSecretKey = 
    process.env.SUPABASE_SECRET_KEY ||           // New format: sb_secret_...
    process.env.SUPABASE_SERVICE_ROLE_KEY;       // Legacy format: eyJhbGciOiJI...

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase credentials. Please add SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

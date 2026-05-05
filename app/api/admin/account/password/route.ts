// Clear the must_change_password flag for the logged-in staff user.
//
// The actual password update happens client-side via
// `supabase.auth.updateUser({ password })` so the user's existing session is
// refreshed in place. Doing it server-side via `auth.admin.updateUserById`
// revokes ALL sessions for that user, leaving the client polling with a stale
// access token (manifested as "Auth session missing!" on every API call).

import { NextRequest, NextResponse } from 'next/server';
import { verifyAnyStaff } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const auth = await verifyAnyStaff(request);
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', auth.user.id);

    if (error) {
      console.error('[account:password]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[account:password] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

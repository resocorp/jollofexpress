// Surface the logged-in staff user's id, name, role, and onboarding flags.
// Used by the WhatsApp comms panel for claim attribution and bubble labels,
// by the role-aware admin sidebar, and by the read-only enforcement on
// orders/customers pages.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  disabled: boolean;
  must_change_password: boolean;
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, disabled, must_change_password')
    .eq('id', session.user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email ?? session.user.email ?? null,
    name: data.name,
    role: data.role as UserRole,
    disabled: !!data.disabled,
    must_change_password: !!data.must_change_password,
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
}

// Admin user management — list + create staff users.
// Admin-only: only accounts with role='admin' can manage other accounts.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';

const STAFF_ROLES = ['admin', 'kitchen', 'customer_care_agent'] as const;

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone is required'),
  role: z.enum(STAFF_ROLES),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  must_change_password: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, phone, name, role, disabled, must_change_password, created_at')
      .in('role', STAFF_ROLES as unknown as string[])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[users:list]', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    console.error('[users:list] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, role, password, must_change_password } = parsed.data;
    const supabase = createServiceClient();

    // Reject duplicates up-front so we don't create an orphan auth user.
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email or phone already exists' },
        { status: 409 }
      );
    }

    // 1. Create auth user (idempotent-by-email at Supabase level).
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (authError || !authData.user) {
      console.error('[users:create] auth error', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user' },
        { status: 500 }
      );
    }

    // 2. Insert matching public.users row using the auth uid as PK.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        phone,
        name,
        role,
        must_change_password,
      })
      .select()
      .single();

    if (profileError || !profile) {
      // Roll back the auth user so we don't leak orphans.
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      console.error('[users:create] profile error', profileError);
      return NextResponse.json(
        { error: profileError?.message || 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (error) {
    console.error('[users:create] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

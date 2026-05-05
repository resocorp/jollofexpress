// Update or delete a staff user.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';

const STAFF_ROLES = ['admin', 'kitchen', 'customer_care_agent'] as const;

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(7).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  disabled: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
  reset_password: z.string().min(8).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { reset_password, ...profilePatch } = parsed.data;

    if (reset_password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(id, {
        password: reset_password,
      });
      if (pwError) {
        console.error('[users:update] password reset error', pwError);
        return NextResponse.json(
          { error: pwError.message },
          { status: 500 }
        );
      }
      // Force agent to change again on next login if admin reset their password.
      profilePatch.must_change_password = profilePatch.must_change_password ?? true;
    }

    if (Object.keys(profilePatch).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data, error } = await supabase
      .from('users')
      .update(profilePatch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[users:update] profile error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('[users:update] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;

    if (id === auth.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Soft-delete: flip the disabled flag rather than dropping rows.
    // This preserves agent_id references on history (notes, message bubbles).
    const { error } = await supabase
      .from('users')
      .update({ disabled: true })
      .eq('id', id);

    if (error) {
      console.error('[users:delete]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[users:delete] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

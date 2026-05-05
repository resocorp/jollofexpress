// CRUD on whatsapp_quick_replies. GET is open to admins + agents,
// mutating verbs are admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrAgent, verifyAdminOnly } from '@/lib/auth/admin-auth';
import { createServiceClient } from '@/lib/supabase/service';

const upsertSchema = z.object({
  name: z.string().min(1).max(80),
  body: z.string().min(1).max(4096),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOrAgent(request);
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('whatsapp_quick_replies')
      .select('id, name, body, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('[whatsapp:templates:list]', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
    return NextResponse.json({ templates: data ?? [] });
  } catch (error) {
    console.error('[whatsapp:templates:list] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('whatsapp_quick_replies')
      .insert({ ...parsed.data, created_by: auth.user.id })
      .select()
      .single();

    if (error) {
      console.error('[whatsapp:templates:create]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    console.error('[whatsapp:templates:create] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('whatsapp_quick_replies')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[whatsapp:templates:update]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('[whatsapp:templates:update] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase.from('whatsapp_quick_replies').delete().eq('id', id);
    if (error) {
      console.error('[whatsapp:templates:delete]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[whatsapp:templates:delete] unexpected', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

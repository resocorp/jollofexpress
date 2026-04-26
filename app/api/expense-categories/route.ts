import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  description: z.string().max(280).optional(),
  display_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

// GET - admin OR kitchen (used to populate the procurement form dropdown)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.response;

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('include_inactive') === 'true';

  let query = supabase
    .from('expense_categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[expense-categories] list failed:', error.message);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

// POST - admin only
export async function POST(request: NextRequest) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      display_order: parsed.data.display_order ?? 0,
      is_active: parsed.data.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 },
      );
    }
    console.error('[expense-categories] create failed:', error.message);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  category_id: z.string().uuid().optional(),
  item_name: z.string().min(2).max(120).trim().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(30).nullable().optional(),
  unit_cost: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  vendor: z.string().max(120).nullable().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
        *,
        category:expense_categories(id, name)
      `,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[expenses] get failed:', error.message);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH - admin only (kitchen logs entries; admin curates them)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const update: Record<string, unknown> = { ...parsed.data };

  // If qty or unit_cost change but total isn't sent, recompute it
  if (
    parsed.data.total_cost === undefined &&
    (parsed.data.quantity !== undefined || parsed.data.unit_cost !== undefined)
  ) {
    const { data: existing, error: fetchErr } = await supabase
      .from('expenses')
      .select('quantity, unit_cost')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) {
      console.error('[expenses] fetch-for-recalc failed:', fetchErr.message);
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }
    if (existing) {
      const q = parsed.data.quantity ?? Number(existing.quantity);
      const u = parsed.data.unit_cost ?? Number(existing.unit_cost);
      update.total_cost = Number((q * u).toFixed(2));
    }
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(update)
    .eq('id', id)
    .select(
      `
        *,
        category:expense_categories(id, name)
      `,
    )
    .single();
  if (error) {
    console.error('[expenses] update failed:', error.message);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE - admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) {
    console.error('[expenses] delete failed:', error.message);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}

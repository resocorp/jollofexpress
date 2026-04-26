import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  category_id: z.string().uuid(),
  item_name: z.string().min(2).max(120).trim(),
  quantity: z.number().positive(),
  unit: z.string().max(30).optional(),
  unit_cost: z.number().min(0),
  total_cost: z.number().min(0).optional(),
  vendor: z.string().max(120).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  notes: z.string().max(1000).optional(),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET - admin OR kitchen. Filters: from, to (YYYY-MM-DD), category_id, search.
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.response;

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const categoryId = searchParams.get('category_id');
  const search = searchParams.get('search');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '500', 10) || 500, 1), 2000);

  let query = supabase
    .from('expenses')
    .select(
      `
        *,
        category:expense_categories(id, name)
      `,
    )
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (from && ISO_DATE.test(from)) query = query.gte('purchase_date', from);
  if (to && ISO_DATE.test(to)) query = query.lte('purchase_date', to);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (search && search.trim()) {
    const needle = search.trim().toLowerCase();
    query = query.ilike('item_name_normalized', `%${needle}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[expenses] list failed:', error.message);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

// POST - admin OR kitchen
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
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

  const { data: category, error: catError } = await supabase
    .from('expense_categories')
    .select('id, is_active')
    .eq('id', parsed.data.category_id)
    .maybeSingle();
  if (catError) {
    console.error('[expenses] category lookup failed:', catError.message);
    return NextResponse.json({ error: 'Failed to verify category' }, { status: 500 });
  }
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 400 });
  }
  if (!category.is_active) {
    return NextResponse.json({ error: 'Category is inactive' }, { status: 400 });
  }

  const totalCost =
    parsed.data.total_cost ??
    Number((parsed.data.quantity * parsed.data.unit_cost).toFixed(2));

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category_id: parsed.data.category_id,
      item_name: parsed.data.item_name,
      // item_name_normalized is set by the DB trigger
      item_name_normalized: parsed.data.item_name.trim().toLowerCase(),
      quantity: parsed.data.quantity,
      unit: parsed.data.unit ?? null,
      unit_cost: parsed.data.unit_cost,
      total_cost: totalCost,
      vendor: parsed.data.vendor ?? null,
      purchase_date: parsed.data.purchase_date,
      notes: parsed.data.notes ?? null,
      created_by: auth.user.id,
    })
    .select(
      `
        *,
        category:expense_categories(id, name)
      `,
    )
    .single();

  if (error) {
    console.error('[expenses] create failed:', error.message);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const itemSchema = z.object({
  category_id: z.string().uuid(),
  item_name: z.string().min(2).max(120).trim(),
  quantity: z.number().positive(),
  unit: z.string().max(30).optional(),
  unit_cost: z.number().min(0),
  total_cost: z.number().min(0).optional(),
  vendor: z.string().max(120).optional(),
  purchase_date: z.string().regex(ISO_DATE).optional(),
  notes: z.string().max(1000).optional(),
});

const bodySchema = z.object({
  default_purchase_date: z.string().regex(ISO_DATE),
  default_vendor: z.string().max(120).optional(),
  default_notes: z.string().max(1000).optional(),
  items: z.array(itemSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Verify all referenced categories exist + are active in one query
  const categoryIds = Array.from(new Set(parsed.data.items.map((i) => i.category_id)));
  const { data: cats, error: catError } = await supabase
    .from('expense_categories')
    .select('id, is_active')
    .in('id', categoryIds);
  if (catError) {
    console.error('[expenses/batch] category lookup failed:', catError.message);
    return NextResponse.json({ error: 'Failed to verify categories' }, { status: 500 });
  }
  const catMap = new Map((cats ?? []).map((c) => [c.id, c.is_active]));
  for (const id of categoryIds) {
    if (!catMap.has(id)) {
      return NextResponse.json({ error: `Unknown category: ${id}` }, { status: 400 });
    }
    if (!catMap.get(id)) {
      return NextResponse.json({ error: `Inactive category: ${id}` }, { status: 400 });
    }
  }

  const rows = parsed.data.items.map((it) => {
    const purchaseDate = it.purchase_date ?? parsed.data.default_purchase_date;
    const vendor = it.vendor ?? parsed.data.default_vendor ?? null;
    const notes = it.notes ?? parsed.data.default_notes ?? null;
    const totalCost =
      it.total_cost ?? Number((it.quantity * it.unit_cost).toFixed(2));
    return {
      category_id: it.category_id,
      item_name: it.item_name,
      // trigger sets the canonical value, but supplying it satisfies the NOT NULL constraint
      item_name_normalized: it.item_name.trim().toLowerCase(),
      quantity: it.quantity,
      unit: it.unit ?? null,
      unit_cost: it.unit_cost,
      total_cost: totalCost,
      vendor,
      purchase_date: purchaseDate,
      notes,
      created_by: auth.user.id,
    };
  });

  const { data, error } = await supabase
    .from('expenses')
    .insert(rows)
    .select(
      `
        *,
        category:expense_categories(id, name)
      `,
    );

  if (error) {
    console.error('[expenses/batch] insert failed:', error.message);
    return NextResponse.json({ error: 'Failed to save expenses' }, { status: 500 });
  }

  const totalSpend = (data ?? []).reduce((sum, row) => sum + Number(row.total_cost), 0);

  return NextResponse.json(
    {
      inserted: data?.length ?? 0,
      total_spend: totalSpend,
      items: data ?? [],
    },
    { status: 201 },
  );
}

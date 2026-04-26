import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(2).max(60).trim().optional(),
  description: z.string().max(280).nullable().optional(),
  display_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

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
  const { data, error } = await supabase
    .from('expense_categories')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 },
      );
    }
    console.error('[expense-categories] update failed:', error.message);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

// DELETE: hard delete only if no expenses reference this category;
// otherwise soft-delete by setting is_active=false (preserves history).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminOnly(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const supabase = createServiceClient();

  const { count, error: countError } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) {
    console.error('[expense-categories] usage check failed:', countError.message);
    return NextResponse.json({ error: 'Failed to check category usage' }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    const { error: softError } = await supabase
      .from('expense_categories')
      .update({ is_active: false })
      .eq('id', id);
    if (softError) {
      console.error('[expense-categories] soft delete failed:', softError.message);
      return NextResponse.json({ error: 'Failed to deactivate category' }, { status: 500 });
    }
    return NextResponse.json({ deactivated: true, message: 'Category deactivated (has expense history)' });
  }

  const { error: delError } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id);
  if (delError) {
    console.error('[expense-categories] delete failed:', delError.message);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}

// Admin endpoint: Update/Delete a specific delivery window template
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// PATCH - Update a delivery window
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      'name', 'order_open_time', 'cutoff_time', 'delivery_start',
      'delivery_end', 'max_capacity', 'is_active', 'display_order', 'days_of_week',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('delivery_windows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery window:', error);
      return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ window: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE - Soft-delete (deactivate) a delivery window
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('delivery_windows')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating delivery window:', error);
      return NextResponse.json({ error: 'Failed to deactivate' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

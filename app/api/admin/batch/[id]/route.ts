// Admin endpoint: Update a specific batch (status, capacity, cancel)
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { advanceBatchStatus, revertBatchStatus } from '@/lib/batch/batch-service';

// PATCH - Update batch status/capacity or advance to next status
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

    // If "advance" action is requested, use the service
    if (body.action === 'advance') {
      const result = await advanceBatchStatus(id, body.target_status);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, new_status: result.newStatus });
    }

    // If "revert" action is requested, go back to previous status
    if (body.action === 'revert') {
      const result = await revertBatchStatus(id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, new_status: result.newStatus });
    }

    // Otherwise, update specific fields
    const allowedFields = ['status', 'max_capacity', 'override_reason'];
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
      .from('batches')
      .update(updates)
      .eq('id', id)
      .select('*, delivery_window:delivery_windows(*)')
      .single();

    if (error) {
      console.error('Error updating batch:', error);
      return NextResponse.json({ error: error.message || 'Failed to update batch' }, { status: 500 });
    }

    return NextResponse.json({ batch: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

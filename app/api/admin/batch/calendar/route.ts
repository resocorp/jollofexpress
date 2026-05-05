// Admin endpoint: Get batches for a date range (calendar view)
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { getBatchesForRange } from '@/lib/batch/batch-service';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date query params required' },
        { status: 400 }
      );
    }

    const batches = await getBatchesForRange(startDate, endDate);

    const response = batches.map(batch => ({
      id: batch.id,
      delivery_date: batch.delivery_date,
      window_name: batch.delivery_window?.name || 'Batch',
      status: batch.status,
      total_orders: batch.total_orders,
      delivery_stops: batch.delivery_stops ?? 0,
      max_capacity: batch.max_capacity,
      delivery_window: batch.delivery_window
        ? `${batch.delivery_window.delivery_start} – ${batch.delivery_window.delivery_end}`
        : '',
    }));

    return NextResponse.json({ batches: response });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

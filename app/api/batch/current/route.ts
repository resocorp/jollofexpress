// Public endpoint: Get all today's batches with status and capacity
import { NextResponse } from 'next/server';
import { getOrCreateTodayBatches, formatDeliveryWindow } from '@/lib/batch/batch-service';

export async function GET() {
  try {
    const batches = await getOrCreateTodayBatches();

    const response = batches.map(batch => {
      const dw = batch.delivery_window;
      return {
        batch_id: batch.id,
        delivery_date: batch.delivery_date,
        delivery_window: dw
          ? formatDeliveryWindow(dw.delivery_start, dw.delivery_end)
          : '',
        window_name: dw?.name || 'Batch',
        status: batch.status,
        orders_placed: batch.total_orders,
        max_capacity: batch.max_capacity,
        capacity_percent: batch.max_capacity > 0
          ? Math.round((batch.total_orders / batch.max_capacity) * 100)
          : 0,
      };
    });

    return NextResponse.json({ batches: response });
  } catch (error) {
    console.error('Error in /api/batch/current:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current batches' },
      { status: 500 }
    );
  }
}

// Public endpoint: Get current order window status for frontend
import { NextResponse } from 'next/server';
import { getOrderWindowStatus } from '@/lib/batch/order-window-service';

export async function GET() {
  try {
    const status = await getOrderWindowStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in /api/order-window/status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order window status' },
      { status: 500 }
    );
  }
}

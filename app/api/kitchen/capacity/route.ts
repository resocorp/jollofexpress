// Kitchen capacity status endpoint
import { NextResponse } from 'next/server';
import { getCapacityStatus } from '@/lib/kitchen-capacity';

/**
 * GET /api/kitchen/capacity
 * Returns current kitchen capacity status
 */
export async function GET() {
  try {
    const status = await getCapacityStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching capacity status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capacity status' },
      { status: 500 }
    );
  }
}

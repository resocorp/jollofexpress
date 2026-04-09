import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { autoAssignOrder } from '@/lib/delivery/auto-assign';
import { z } from 'zod';

const autoAssignSchema = z.object({
  order_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { order_id } = autoAssignSchema.parse(body);

    const result = await autoAssignOrder(order_id);

    if (!result.success) {
      const status = result.error === 'Order not found' ? 404
        : result.error === 'No available drivers' ? 404
        : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      assignment: result.assignment,
      driver: result.driver,
      scoring: result.scoring,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Auto-assign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

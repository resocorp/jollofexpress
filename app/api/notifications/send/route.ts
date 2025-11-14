// Manual Send Notification API - Send custom notifications
import { NextRequest, NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/notifications/notification-service';
import { z } from 'zod';

const sendSchema = z.object({
  phone: z.string().regex(/^(\+234|234|0)[789]\d{9}$/, 'Invalid Nigerian phone number format'),
  message: z.string().min(1).max(4096).optional(),
});

/**
 * POST /api/notifications/send
 * Send a manual notification
 * 
 * Body:
 * - phone: Recipient phone number
 * - message: Message content (optional, uses test template if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 Test notification request:', body);

    // Validate request
    const validation = sendSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phone } = validation.data;

    console.log('📞 Sending test notification to:', phone);

    // Send notification
    const success = await sendTestNotification(phone);

    if (success) {
      console.log('✅ Test notification sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully',
      });
    } else {
      console.error('❌ Failed to send notification (returned false)');
      return NextResponse.json(
        { error: 'Failed to send notification. Check server logs for details.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Unexpected error in POST /api/notifications/send:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

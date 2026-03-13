// Test Notification Connection API
import { NextRequest, NextResponse } from 'next/server';
import { testNotificationConnection, sendTestNotification } from '@/lib/notifications/notification-service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';

/**
 * POST /api/notifications/test
 * Send a test WhatsApp message to a phone number
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'phone is required' }, { status: 400 });
    }

    const success = await sendTestNotification(phone);

    if (success) {
      return NextResponse.json({ success: true, message: 'Test message sent successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send test message. Check WhatsApp connection and notification settings.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/test:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * GET /api/notifications/test
 * Test connection to Baileys sidecar
 */
export async function GET() {
  try {
    const result = await testNotificationConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.message 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications/test:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

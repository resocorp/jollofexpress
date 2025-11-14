// Test Notification Connection API
import { NextResponse } from 'next/server';
import { testNotificationConnection } from '@/lib/notifications/notification-service';

/**
 * GET /api/notifications/test
 * Test connection to UltraMsg API
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

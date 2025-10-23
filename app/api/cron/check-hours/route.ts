// Cron endpoint to auto-open/close restaurant based on operating hours
// Call this endpoint every 1-5 minutes via external cron service or Vercel Cron
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { shouldBeOpenNow } from '@/lib/operating-hours';

/**
 * GET /api/cron/check-hours
 * Automatically opens or closes restaurant based on operating hours
 * 
 * Security: Should be called by a cron service with authentication
 * Can be secured with Authorization header or Vercel Cron Secret
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Check if restaurant should be open based on operating hours
    const hoursCheck = await shouldBeOpenNow();
    
    // Get current restaurant status
    const { data: currentSettings, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'order_settings')
      .single();

    if (fetchError || !currentSettings) {
      console.error('❌ Error fetching restaurant settings:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    const currentStatus = currentSettings.value as {
      is_open: boolean;
      auto_close_when_busy: boolean;
      [key: string]: any;
    };

    const isCurrentlyOpen = currentStatus.is_open;
    const shouldBeOpen = hoursCheck.shouldBeOpen;

    // Determine if action is needed
    let actionTaken = 'none';
    let message = '';

    // Need to close?
    if (isCurrentlyOpen && !shouldBeOpen) {
      const updatedSettings = {
        ...currentStatus,
        is_open: false,
      };

      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: updatedSettings })
        .eq('key', 'order_settings');

      if (updateError) {
        console.error('❌ Error closing restaurant:', updateError);
        return NextResponse.json(
          { error: 'Failed to close restaurant' },
          { status: 500 }
        );
      }

      actionTaken = 'closed';
      message = `Restaurant auto-closed: ${hoursCheck.reason}`;
      console.log(`🏪 ${message}`);
    }

    // Need to open?
    if (!isCurrentlyOpen && shouldBeOpen) {
      const updatedSettings = {
        ...currentStatus,
        is_open: true,
      };

      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: updatedSettings })
        .eq('key', 'order_settings');

      if (updateError) {
        console.error('❌ Error opening restaurant:', updateError);
        return NextResponse.json(
          { error: 'Failed to open restaurant' },
          { status: 500 }
        );
      }

      actionTaken = 'opened';
      message = `Restaurant auto-opened: ${hoursCheck.reason}`;
      console.log(`🏪 ${message}`);
    }

    // No action needed
    if (actionTaken === 'none') {
      message = `No action needed. Status: ${isCurrentlyOpen ? 'Open' : 'Closed'}, Should be: ${shouldBeOpen ? 'Open' : 'Closed'}`;
      console.log(`⏰ ${message}`);
    }

    return NextResponse.json({
      success: true,
      action: actionTaken,
      message,
      details: {
        currentlyOpen: isCurrentlyOpen,
        shouldBeOpen: shouldBeOpen,
        reason: hoursCheck.reason,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Unexpected error in cron check-hours:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility with different cron services
export async function POST(request: NextRequest) {
  return GET(request);
}

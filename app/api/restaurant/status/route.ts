// Public endpoint to fetch restaurant operational status
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFormattedTodayHours, getTimeUntilStatusChange, getAllFormattedHours, shouldBeOpenNow } from '@/lib/operating-hours';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'order_settings')
      .single();

    if (error) {
      console.error('Error fetching restaurant status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch restaurant status' },
        { status: 500 }
      );
    }

    const settings = data.value as {
      is_open: boolean;
      current_prep_time: number;
      default_prep_time: number;
    };

    // Get operating hours information
    const todayHours = await getFormattedTodayHours();
    const statusChange = await getTimeUntilStatusChange();
    const allHours = await getAllFormattedHours();
    const hoursCheck = await shouldBeOpenNow();

    // Calculate effective status: Must be within operating hours AND manually open
    const manuallyOpen = settings.is_open;
    const withinOperatingHours = hoursCheck.shouldBeOpen;
    const effectivelyOpen = withinOperatingHours && manuallyOpen;

    // Build dynamic message based on effective status
    let message = '';
    let closedReason = '';
    
    if (effectivelyOpen) {
      // Restaurant is open
      message = 'Currently open and accepting orders';
      if (statusChange?.action === 'close') {
        message += `. Closes at ${statusChange.formattedTime}`;
      }
    } else {
      // Restaurant is closed - determine why
      if (!withinOperatingHours) {
        // Closed due to operating hours
        message = 'Currently closed';
        closedReason = hoursCheck.reason;
        if (statusChange?.action === 'open') {
          message += `. Opens at ${statusChange.formattedTime}`;
        } else if (todayHours === 'Closed today') {
          message += ' - Closed today';
        } else {
          message += '. Please check back during operating hours';
        }
      } else if (!manuallyOpen) {
        // Closed due to manual toggle (within operating hours but manually closed)
        message = 'Currently closed';
        closedReason = 'Manually closed by staff';
        message += '. Please check back later';
      }
    }

    return NextResponse.json({
      is_open: effectivelyOpen, // Effective status considering both factors
      estimated_prep_time: settings.current_prep_time || settings.default_prep_time,
      message,
      closed_reason: effectivelyOpen ? null : closedReason,
      manual_override: manuallyOpen, // Show manual toggle state separately
      within_hours: withinOperatingHours, // Show if within operating hours
      hours: {
        today: todayHours,
        all: allHours,
      },
      next_status_change: statusChange ? {
        action: statusChange.action,
        time: statusChange.formattedTime,
        minutes: statusChange.minutes,
      } : null,
    });

  } catch (error) {
    console.error('Unexpected error in /api/restaurant/status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

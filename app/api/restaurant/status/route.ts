// Public endpoint to fetch restaurant operational status
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    return NextResponse.json({
      is_open: settings.is_open,
      estimated_prep_time: settings.current_prep_time || settings.default_prep_time,
      message: settings.is_open 
        ? 'Currently open and accepting orders' 
        : 'Currently closed. Please check back during operating hours.',
    });

  } catch (error) {
    console.error('Unexpected error in /api/restaurant/status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

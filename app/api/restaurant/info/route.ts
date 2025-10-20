// Public endpoint to fetch restaurant information
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'restaurant_info')
      .single();

    if (error) {
      console.error('Error fetching restaurant info:', error);
      return NextResponse.json(
        { error: 'Failed to fetch restaurant information' },
        { status: 500 }
      );
    }

    return NextResponse.json(data.value);

  } catch (error) {
    console.error('Unexpected error in /api/restaurant/info:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

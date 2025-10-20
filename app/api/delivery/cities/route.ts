// Public endpoint to fetch supported delivery cities
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'delivery_settings')
      .single();

    if (error) {
      console.error('Error fetching delivery settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch delivery cities' },
        { status: 500 }
      );
    }

    const settings = data.value as { cities: string[] };

    return NextResponse.json(settings.cities || ['Awka']);

  } catch (error) {
    console.error('Unexpected error in /api/delivery/cities:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

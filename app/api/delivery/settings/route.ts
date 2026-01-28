// Public endpoint to fetch delivery settings
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DeliverySettings } from '@/types/database';

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
        { error: 'Failed to fetch delivery settings' },
        { status: 500 }
      );
    }

    const settings = data.value as DeliverySettings;

    return NextResponse.json({
      enabled: settings.enabled ?? true,
      cities: settings.cities || ['Awka'],
      min_order: settings.min_order || 0,
      delivery_fee: settings.delivery_fee || 0,
      free_delivery_threshold: settings.free_delivery_threshold ?? null,
    });

  } catch (error) {
    console.error('Unexpected error in /api/delivery/settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

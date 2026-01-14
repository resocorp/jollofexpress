// Public endpoint to fetch payment settings (tax rate)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PaymentSettings } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_settings')
      .single();

    if (error) {
      console.error('Error fetching payment settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment settings' },
        { status: 500 }
      );
    }

    const settings = data.value as PaymentSettings;

    return NextResponse.json({
      tax_rate: settings.tax_rate ?? 0,
      accept_cash: settings.accept_cash ?? true,
      accept_card: settings.accept_card ?? true,
      accept_transfer: settings.accept_transfer ?? false,
    });

  } catch (error) {
    console.error('Unexpected error in /api/payment/settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

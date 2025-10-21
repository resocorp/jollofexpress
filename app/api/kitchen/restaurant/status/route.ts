// Update restaurant open/closed status and prep time
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const statusSchema = z.object({
  is_open: z.boolean().optional(),
  prep_time: z.number().min(10).max(120).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = statusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { is_open, prep_time } = validation.data;
    const supabase = createServiceClient();

    // Get current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'order_settings')
      .single();

    if (fetchError) {
      console.error('Error fetching settings:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Update settings
    const updatedSettings = {
      ...currentSettings.value,
      ...(is_open !== undefined && { is_open }),
      ...(prep_time !== undefined && { current_prep_time: prep_time }),
    };

    const { error: updateError } = await supabase
      .from('settings')
      .update({ value: updatedSettings })
      .eq('key', 'order_settings');

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update restaurant status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_open: updatedSettings.is_open,
      prep_time: updatedSettings.current_prep_time,
      message: 'Restaurant status updated successfully',
    });

  } catch (error) {
    console.error('Unexpected error updating restaurant status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

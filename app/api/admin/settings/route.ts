// Admin endpoints for restaurant settings management
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { z } from 'zod';

// Validation schemas for different setting types
const restaurantInfoSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string(),
  logo_url: z.string().url().optional().or(z.literal('')),
  banner_url: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
});

const orderSettingsSchema = z.object({
  is_open: z.boolean(),
  default_prep_time: z.number().int().min(10).max(120),
  current_prep_time: z.number().int().min(10).max(120),
  auto_close_when_busy: z.boolean().optional(),
  max_active_orders: z.number().int().min(5).max(50).optional(),
  max_advance_order_days: z.number().int().min(0).max(30).optional(),
});

const deliverySettingsSchema = z.object({
  enabled: z.boolean(),
  cities: z.array(z.string()),
  min_order: z.number().min(0),
  delivery_fee: z.number().min(0),
});

const paymentSettingsSchema = z.object({
  tax_rate: z.number().min(0).max(100),
  accept_cash: z.boolean().optional(),
  accept_card: z.boolean().optional(),
  accept_transfer: z.boolean().optional(),
});

const operatingHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
});

// GET - Get all settings
export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();

    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Convert array to object for easier access
    const settingsObj: Record<string, any> = {};
    settings?.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json(settingsObj);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    console.log('Updating setting:', key);
    console.log('Value received:', JSON.stringify(value, null, 2));

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Validate based on key
    let validatedValue = value;
    
    try {
      switch (key) {
        case 'restaurant_info':
          validatedValue = restaurantInfoSchema.parse(value);
          break;
        case 'order_settings':
          validatedValue = orderSettingsSchema.parse(value);
          break;
        case 'delivery_settings':
          console.log('Validating delivery settings...');
          validatedValue = deliverySettingsSchema.parse(value);
          console.log('Validation passed:', validatedValue);
          break;
        case 'payment_settings':
          validatedValue = paymentSettingsSchema.parse(value);
          break;
        case 'operating_hours':
          validatedValue = operatingHoursSchema.parse(value);
          break;
        default:
          // For unknown keys, just use the value as-is
          break;
      }
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationError.issues || validationError.message 
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Update or insert setting
    const { data: setting, error } = await supabase
      .from('settings')
      .upsert({ key, value: validatedValue }, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      console.error('Error updating setting:', error);
      console.error('Setting key:', key);
      console.error('Setting value:', validatedValue);
      return NextResponse.json(
        { error: 'Failed to update setting', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      setting,
      message: 'Setting updated successfully',
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Notification Settings API - Get and update notification configuration
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { z } from 'zod';

// Validation schema for notification settings
const settingsSchema = z.object({
  ultramsg: z.object({
    instance_id: z.string(),
    token: z.string(),
    enabled: z.boolean(),
  }).optional(),
  customer_notifications: z.object({
    order_confirmed: z.boolean(),
    order_preparing: z.boolean(),
    order_ready: z.boolean(),
    order_out_for_delivery: z.boolean(),
    order_completed: z.boolean(),
    payment_failed: z.boolean(),
  }).optional(),
  admin_notifications: z.object({
    enabled: z.boolean(),
    phone_numbers: z.array(z.string()),
    kitchen_capacity_alerts: z.boolean(),
    payment_failures: z.boolean(),
    daily_summary: z.boolean(),
    summary_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  }).optional(),
});

/**
 * GET /api/notifications/settings
 * Fetch all notification settings (admin only)
 */
export async function GET(request: NextRequest) {
  // Verify admin-only authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('notification_settings')
      .select('key, value')
      .in('key', ['ultramsg', 'customer_notifications', 'admin_notifications']);

    if (error) {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Transform array into object
    const settings: Record<string, any> = {};
    data.forEach((row) => {
      settings[row.key] = row.value;
    });

    // Mask sensitive data (don't expose full token)
    if (settings.ultramsg?.token) {
      const token = settings.ultramsg.token;
      settings.ultramsg.token_masked = token.length > 8 
        ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
        : '****';
      settings.ultramsg.token = ''; // Don't send actual token
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications/settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/settings
 * Update notification settings (admin only)
 */
export async function PATCH(request: NextRequest) {
  // Verify admin-only authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate request body
    const validation = settingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const updates: Array<{ key: string; value: any }> = [];

    // Prepare updates for each setting
    if (body.ultramsg) {
      // If token is empty, fetch existing token
      if (body.ultramsg.token === '') {
        const { data: existing } = await supabase
          .from('notification_settings')
          .select('value')
          .eq('key', 'ultramsg')
          .single();

        if (existing?.value?.token) {
          body.ultramsg.token = existing.value.token;
        }
      }
      updates.push({ key: 'ultramsg', value: body.ultramsg });
    }

    if (body.customer_notifications) {
      updates.push({ key: 'customer_notifications', value: body.customer_notifications });
    }

    if (body.admin_notifications) {
      updates.push({ key: 'admin_notifications', value: body.admin_notifications });
    }

    // Update each setting
    for (const update of updates) {
      const { error } = await supabase
        .from('notification_settings')
        .update({ value: update.value })
        .eq('key', update.key);

      if (error) {
        console.error(`Error updating ${update.key}:`, error);
        return NextResponse.json(
          { error: `Failed to update ${update.key}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/notifications/settings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

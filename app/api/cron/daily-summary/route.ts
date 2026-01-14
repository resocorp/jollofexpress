// Cron endpoint to send daily summary report to admins
// Call this endpoint at the configured summary time (e.g., 8:00 PM) via external cron service
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendDailySummary } from '@/lib/notifications/notification-service';
import type { DailySummaryData } from '@/lib/notifications/types';

/**
 * GET /api/cron/daily-summary
 * Generates and sends daily summary report to admin phone numbers
 * 
 * Query params:
 * - force: Set to 'true' to bypass time check and send immediately
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

    const forceParam = request.nextUrl.searchParams.get('force');
    const forceSend = forceParam === 'true';

    const supabase = createServiceClient();

    // Get notification settings to check if daily summary is enabled
    const { data: settingsData } = await supabase
      .from('notification_settings')
      .select('value')
      .eq('key', 'admin_notifications')
      .single();

    const adminSettings = settingsData?.value as {
      daily_summary?: boolean;
      summary_time?: string;
    } | null;

    if (!adminSettings?.daily_summary && !forceSend) {
      return NextResponse.json({
        success: false,
        message: 'Daily summary is disabled in settings',
      });
    }

    // Check if it's the right time (within 5 minutes of configured time)
    if (!forceSend && adminSettings?.summary_time) {
      const now = new Date();
      const [targetHour, targetMinute] = adminSettings.summary_time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      const targetMinutes = targetHour * 60 + targetMinute;
      const currentMinutes = currentHour * 60 + currentMinute;
      const diff = Math.abs(targetMinutes - currentMinutes);
      
      if (diff > 5 && diff < (24 * 60 - 5)) {
        return NextResponse.json({
          success: false,
          message: `Not the right time. Configured time: ${adminSettings.summary_time}, Current time: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        });
      }
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Fetch today's orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        status,
        payment_status,
        created_at
      `)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Fetch order items for top items calculation
    const orderIds = orders?.map(o => o.id) || [];
    let topItems: Array<{ name: string; quantity: number; revenue: number }> = [];

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('name, quantity, price')
        .in('order_id', orderIds);

      if (orderItems) {
        // Aggregate items by name
        const itemMap = new Map<string, { quantity: number; revenue: number }>();
        orderItems.forEach(item => {
          const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
          itemMap.set(item.name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + (item.price * item.quantity),
          });
        });

        topItems = Array.from(itemMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);
      }
    }

    // Calculate summary data
    const paidOrders = orders?.filter(o => o.payment_status === 'paid') || [];
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
    const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;
    const pendingOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)).length || 0;

    const summaryData: DailySummaryData = {
      date: today.toLocaleDateString('en-NG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      total_orders: orders?.length || 0,
      total_revenue: totalRevenue,
      avg_order_value: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
      completed_orders: completedOrders,
      cancelled_orders: cancelledOrders,
      pending_orders: pendingOrders,
      top_items: topItems,
    };

    console.log('📊 Sending daily summary:', summaryData);

    // Send the summary
    const sent = await sendDailySummary(summaryData);

    if (sent) {
      console.log('✅ Daily summary sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Daily summary sent successfully',
        data: summaryData,
      });
    } else {
      console.log('⚠️ Daily summary not sent (check settings or admin phone numbers)');
      return NextResponse.json({
        success: false,
        message: 'Failed to send daily summary. Check admin phone numbers and settings.',
        data: summaryData,
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error in daily-summary cron:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: String(error) },
      { status: 500 }
    );
  }
}

// Support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}

// Notification Logs API - Fetch notification history with filtering
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/notifications/logs
 * Fetch notification logs with optional filters
 * 
 * Query Parameters:
 * - date_from: Start date (ISO 8601)
 * - date_to: End date (ISO 8601)
 * - status: Filter by status (pending, sent, failed, delivered)
 * - type: Filter by notification type (customer, admin)
 * - event: Filter by event type
 * - search: Search by phone number or order number
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const event = searchParams.get('event');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('notification_logs')
      .select(`
        *,
        order:orders(order_number, customer_name, total)
      `, { count: 'exact' });

    // Apply filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    if (status && ['pending', 'sent', 'failed', 'delivered'].includes(status)) {
      query = query.eq('status', status);
    }

    if (type && ['customer', 'admin'].includes(type)) {
      query = query.eq('notification_type', type);
    }

    if (event) {
      query = query.eq('event_type', event);
    }

    if (search) {
      // Search in phone number or via order number
      query = query.or(`recipient_phone.ilike.%${search}%,order.order_number.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notification logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    // Calculate pagination info
    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      logs: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications/logs:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

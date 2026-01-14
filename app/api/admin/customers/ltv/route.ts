// Customer Lifetime Value (LTV) analytics endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// GET - Get customer LTV data
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const influencerId = searchParams.get('influencer_id');
    const sortBy = searchParams.get('sort_by') || 'lifetime_value';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const minOrders = parseInt(searchParams.get('min_orders') || '1');

    // Build the query for customer LTV from orders
    // We aggregate all successful orders by customer_phone
    const { data: customerData, error } = await supabase
      .from('orders')
      .select(`
        customer_phone,
        customer_name,
        customer_email,
        total,
        created_at
      `)
      .eq('payment_status', 'success');

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer data' },
        { status: 500 }
      );
    }

    // Aggregate by customer phone
    const customerMap = new Map<string, {
      customer_phone: string;
      customer_name: string;
      customer_email?: string;
      total_orders: number;
      lifetime_value: number;
      first_order_date: string;
      last_order_date: string;
    }>();

    (customerData || []).forEach(order => {
      const existing = customerMap.get(order.customer_phone);
      if (existing) {
        existing.total_orders += 1;
        existing.lifetime_value += order.total;
        if (new Date(order.created_at) < new Date(existing.first_order_date)) {
          existing.first_order_date = order.created_at;
        }
        if (new Date(order.created_at) > new Date(existing.last_order_date)) {
          existing.last_order_date = order.created_at;
          existing.customer_name = order.customer_name; // Use latest name
        }
      } else {
        customerMap.set(order.customer_phone, {
          customer_phone: order.customer_phone,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          total_orders: 1,
          lifetime_value: order.total,
          first_order_date: order.created_at,
          last_order_date: order.created_at,
        });
      }
    });

    // Get attributions for all customers
    const { data: attributions } = await supabase
      .from('customer_attributions')
      .select(`
        customer_phone,
        influencer_id,
        first_promo_code,
        influencers(name)
      `);

    const attributionMap = new Map(
      (attributions || []).map(a => [a.customer_phone, a])
    );

    // Convert to array and add attribution info
    let customers = Array.from(customerMap.values())
      .filter(c => c.total_orders >= minOrders)
      .map(c => {
        const attribution = attributionMap.get(c.customer_phone);
        return {
          ...c,
          avg_order_value: c.lifetime_value / c.total_orders,
          attributed_influencer_id: attribution?.influencer_id,
          attributed_influencer_name: (attribution?.influencers as any)?.name,
          attribution_promo_code: attribution?.first_promo_code,
        };
      });

    // Filter by influencer if specified
    if (influencerId) {
      customers = customers.filter(c => c.attributed_influencer_id === influencerId);
    }

    // Sort
    customers.sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Calculate totals
    const totals = {
      total_customers: customers.length,
      total_ltv: customers.reduce((sum, c) => sum + c.lifetime_value, 0),
      total_orders: customers.reduce((sum, c) => sum + c.total_orders, 0),
      avg_ltv: customers.length > 0 
        ? customers.reduce((sum, c) => sum + c.lifetime_value, 0) / customers.length 
        : 0,
      avg_orders_per_customer: customers.length > 0
        ? customers.reduce((sum, c) => sum + c.total_orders, 0) / customers.length
        : 0,
      attributed_customers: customers.filter(c => c.attributed_influencer_id).length,
    };

    // Paginate
    const paginatedCustomers = customers.slice(offset, offset + limit);

    return NextResponse.json({
      totals,
      customers: paginatedCustomers,
      pagination: {
        total: customers.length,
        limit,
        offset,
        has_more: offset + limit < customers.length,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

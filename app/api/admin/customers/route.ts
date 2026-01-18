import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

interface CustomerLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  order_count: number;
  last_order_date: string;
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort_by') || 'last_order_date';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const hasLocation = searchParams.get('has_location');
    const influencerId = searchParams.get('influencer_id');

    // Fetch all successful orders with customer info
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_phone,
        customer_name,
        customer_email,
        delivery_address,
        delivery_city,
        customer_latitude,
        customer_longitude,
        total,
        promo_code,
        created_at
      `)
      .eq('payment_status', 'success')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 });
    }

    // Aggregate customers by phone number with multiple locations tracking
    const customerMap = new Map<string, {
      customer_phone: string;
      customer_name: string;
      customer_email?: string;
      delivery_address?: string;
      delivery_city?: string;
      customer_latitude?: number;
      customer_longitude?: number;
      total_orders: number;
      total_spent: number;
      first_order_date: string;
      last_order_date: string;
      promo_codes_used: string[];
      locations: Map<string, CustomerLocation>;
    }>();

    // Helper to create location key (round to ~100m precision for grouping nearby locations)
    const getLocationKey = (lat: number, lng: number) => {
      return `${lat.toFixed(3)},${lng.toFixed(3)}`;
    };

    (orders || []).forEach(order => {
      const existing = customerMap.get(order.customer_phone);
      
      if (existing) {
        existing.total_orders += 1;
        existing.total_spent += order.total;
        
        // Update to latest order info
        if (new Date(order.created_at) > new Date(existing.last_order_date)) {
          existing.last_order_date = order.created_at;
          existing.customer_name = order.customer_name;
          existing.customer_email = order.customer_email || existing.customer_email;
          existing.delivery_address = order.delivery_address || existing.delivery_address;
          existing.delivery_city = order.delivery_city || existing.delivery_city;
          if (order.customer_latitude && order.customer_longitude) {
            existing.customer_latitude = order.customer_latitude;
            existing.customer_longitude = order.customer_longitude;
          }
        }
        
        // Track first order
        if (new Date(order.created_at) < new Date(existing.first_order_date)) {
          existing.first_order_date = order.created_at;
        }
        
        // Collect promo codes
        if (order.promo_code && !existing.promo_codes_used.includes(order.promo_code)) {
          existing.promo_codes_used.push(order.promo_code);
        }

        // Track location if available
        if (order.customer_latitude && order.customer_longitude) {
          const locKey = getLocationKey(order.customer_latitude, order.customer_longitude);
          const existingLoc = existing.locations.get(locKey);
          if (existingLoc) {
            existingLoc.order_count += 1;
            if (new Date(order.created_at) > new Date(existingLoc.last_order_date)) {
              existingLoc.last_order_date = order.created_at;
              existingLoc.address = order.delivery_address || existingLoc.address;
              existingLoc.city = order.delivery_city || existingLoc.city;
            }
          } else {
            existing.locations.set(locKey, {
              latitude: order.customer_latitude,
              longitude: order.customer_longitude,
              address: order.delivery_address,
              city: order.delivery_city,
              order_count: 1,
              last_order_date: order.created_at,
            });
          }
        }
      } else {
        const locations = new Map<string, CustomerLocation>();
        if (order.customer_latitude && order.customer_longitude) {
          const locKey = getLocationKey(order.customer_latitude, order.customer_longitude);
          locations.set(locKey, {
            latitude: order.customer_latitude,
            longitude: order.customer_longitude,
            address: order.delivery_address,
            city: order.delivery_city,
            order_count: 1,
            last_order_date: order.created_at,
          });
        }

        customerMap.set(order.customer_phone, {
          customer_phone: order.customer_phone,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          delivery_address: order.delivery_address,
          delivery_city: order.delivery_city,
          customer_latitude: order.customer_latitude,
          customer_longitude: order.customer_longitude,
          total_orders: 1,
          total_spent: order.total,
          first_order_date: order.created_at,
          last_order_date: order.created_at,
          promo_codes_used: order.promo_code ? [order.promo_code] : [],
          locations,
        });
      }
    });

    // Get influencer attributions from customer_attributions table
    // This tracks the FIRST promo code used and its associated influencer
    const { data: attributions, error: attrError } = await supabase
      .from('customer_attributions')
      .select('customer_phone, influencer_id, first_promo_code, first_order_date');

    if (attrError) {
      console.error('Error fetching attributions:', attrError);
    }

    // Fetch influencers separately to avoid join issues
    const { data: influencersList } = await supabase
      .from('influencers')
      .select('id, name');
    
    const influencersMap = new Map(
      (influencersList || []).map(i => [i.id, i.name])
    );

    console.log('[CUSTOMERS] Found attributions:', attributions?.length || 0);
    console.log('[CUSTOMERS] Found influencers:', influencersList?.length || 0);

    const attributionMap = new Map(
      (attributions || []).map(a => [a.customer_phone, {
        ...a,
        influencer_name: influencersMap.get(a.influencer_id) || null
      }])
    );

    // Convert to array and enrich with attribution data
    let customers = Array.from(customerMap.values()).map(c => {
      const attribution = attributionMap.get(c.customer_phone);
      const locationsArray = Array.from(c.locations.values())
        .sort((a, b) => new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime());
      
      return {
        customer_phone: c.customer_phone,
        customer_name: c.customer_name,
        customer_email: c.customer_email,
        delivery_address: c.delivery_address,
        delivery_city: c.delivery_city,
        customer_latitude: c.customer_latitude,
        customer_longitude: c.customer_longitude,
        total_orders: c.total_orders,
        total_spent: c.total_spent,
        first_order_date: c.first_order_date,
        last_order_date: c.last_order_date,
        promo_codes_used: c.promo_codes_used,
        avg_order_value: c.total_spent / c.total_orders,
        has_location: !!(c.customer_latitude && c.customer_longitude),
        locations: locationsArray,
        location_count: locationsArray.length,
        // Attribution from first promo code used
        influencer_id: attribution?.influencer_id || null,
        influencer_name: attribution?.influencer_name || null,
        influencer_code: attribution?.first_promo_code || null,
        first_promo_code: attribution?.first_promo_code || null,
        attribution_date: attribution?.first_order_date || null,
      };
    });

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c =>
        c.customer_name.toLowerCase().includes(searchLower) ||
        c.customer_phone.includes(search) ||
        (c.customer_email && c.customer_email.toLowerCase().includes(searchLower)) ||
        (c.delivery_address && c.delivery_address.toLowerCase().includes(searchLower))
      );
    }

    if (hasLocation === 'true') {
      customers = customers.filter(c => c.has_location);
    } else if (hasLocation === 'false') {
      customers = customers.filter(c => !c.has_location);
    }

    if (influencerId) {
      customers = customers.filter(c => c.influencer_id === influencerId);
    }

    // Sort
    customers.sort((a, b) => {
      let aVal: any = (a as any)[sortBy];
      let bVal: any = (b as any)[sortBy];
      
      // Handle date sorting
      if (sortBy.includes('date')) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });

    // Calculate summary stats
    const summary = {
      total_customers: customers.length,
      customers_with_location: customers.filter(c => c.has_location).length,
      customers_with_influencer: customers.filter(c => c.influencer_id).length,
      total_revenue: customers.reduce((sum, c) => sum + c.total_spent, 0),
      total_orders: customers.reduce((sum, c) => sum + c.total_orders, 0),
    };

    // Paginate
    const paginatedCustomers = customers.slice(offset, offset + limit);

    return NextResponse.json({
      summary,
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
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

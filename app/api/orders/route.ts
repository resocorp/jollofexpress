// Order management endpoints
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isRestaurantOpen, checkAndManageCapacity } from '@/lib/kitchen-capacity';
import { shouldBeOpenNow } from '@/lib/operating-hours';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { z } from 'zod';

// Validation schema for order creation
const orderSchema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(/^(\+234|0)[789]\d{9}$/),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone_alt: z.string().regex(/^(\+234|0)[789]\d{9}$/).optional().or(z.literal('')),
  order_type: z.enum(['delivery', 'carryout']),
  delivery_city: z.string().optional(),
  delivery_address: z.string().optional(),
  address_type: z.enum(['house', 'office', 'hotel', 'church', 'school', 'other']).optional(),
  unit_number: z.string().optional(),
  delivery_instructions: z.string().max(200).optional(),
  customer_latitude: z.number().optional(),
  customer_longitude: z.number().optional(),
  delivery_region_id: z.string().uuid().optional(),
  delivery_region_name: z.string().optional(),
  payment_method_type: z.enum(['paystack', 'cod']).optional(),
  subtotal: z.number().positive(),
  delivery_fee: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().positive(),
  promo_code: z.string().optional(),
  items: z.array(z.object({
    item_id: z.string().uuid(),
    item_name: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    selected_variation: z.object({
      name: z.string(),
      option: z.string(),
      price_adjustment: z.number(),
    }).optional(),
    selected_addons: z.array(z.object({
      name: z.string(),
      price: z.number(),
    })).optional(),
    special_instructions: z.string().max(200).optional(),
    subtotal: z.number().positive(),
  })).min(1),
}).superRefine((data, ctx) => {
  // Only validate delivery fields if order type is 'delivery'
  if (data.order_type === 'delivery') {
    if (!data.delivery_city || data.delivery_city.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery city is required for delivery orders',
        path: ['delivery_city'],
      });
    }

    if (!data.delivery_address || data.delivery_address.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery address is required for delivery orders',
        path: ['delivery_address'],
      });
    } else if (data.delivery_address.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery address must be at least 4 characters',
        path: ['delivery_address'],
      });
    }
  }
});

type OrderData = z.infer<typeof orderSchema>;

// Generate unique order number
function generateOrderNumber(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${date}-${random}`;
}

// Initialize Paystack transaction
async function initializePaystackPayment(
  email: string,
  amount: number,
  orderNumber: string,
  orderId: string,
  customerPhone: string
) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!paystackSecretKey) {
    throw new Error('Paystack secret key not configured');
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email || `${customerPhone.replace(/\D/g, '')}@jollofexpress.com`,
      amount: Math.round(amount * 100), // Convert to kobo (Paystack uses smallest currency unit)
      reference: `${orderNumber}-${Date.now()}`,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        customer_phone: customerPhone,
        custom_fields: [
          {
            display_name: 'Order Number',
            variable_name: 'order_number',
            value: orderNumber,
          },
          {
            display_name: 'Customer Phone',
            variable_name: 'customer_phone',
            value: customerPhone,
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to initialize payment');
  }

  const data = await response.json();
  return {
    payment_url: data.data.authorization_url,
    payment_reference: data.data.reference,
    access_code: data.data.access_code,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = orderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const orderData: OrderData = validationResult.data;
    
    // Debug logging for order pricing (without sensitive data)
    console.log('[ORDER CREATE] Pricing breakdown:', {
      subtotal: orderData.subtotal,
      delivery_fee: orderData.delivery_fee,
      tax: orderData.tax,
      discount: orderData.discount,
      total: orderData.total,
      order_type: orderData.order_type,
      items_count: orderData.items.length,
      promo_code: orderData.promo_code, // Added promo code logging
      calculated_total: orderData.subtotal + orderData.delivery_fee + orderData.tax - orderData.discount
    });
    
    // CHECK 0: Check if within operating hours (but allow orders to be scheduled)
    const hoursCheck = await shouldBeOpenNow();
    const isOutsideHours = !hoursCheck.shouldBeOpen;
    
    // CHECK 1: Check if restaurant is manually closed or at capacity
    const restaurantOpen = await isRestaurantOpen();
    const isManuallyClosedOrAtCapacity = !restaurantOpen && hoursCheck.shouldBeOpen;
    
    // CHECK 2: Check kitchen capacity only if within operating hours
    let capacityCheck = null;
    if (!isOutsideHours) {
      capacityCheck = await checkAndManageCapacity();
      if (capacityCheck.action === 'closed') {
        return NextResponse.json(
          { 
            error: 'Kitchen at capacity',
            message: `We're currently experiencing high demand (${capacityCheck.activeOrders} active orders). Please try again in a few minutes.`,
            details: {
              activeOrders: capacityCheck.activeOrders,
              maxOrders: capacityCheck.threshold,
            }
          },
          { status: 503 }
        );
      }
    }
    
    const supabase = createServiceClient();
    
    // Determine order status based on restaurant availability
    let orderStatus = 'pending';
    let scheduledNote = '';
    
    if (isOutsideHours) {
      orderStatus = 'scheduled';
      scheduledNote = `Order placed outside operating hours. Will be processed when restaurant opens: ${hoursCheck.reason}`;
      console.log('📅 Creating scheduled order (outside operating hours):', scheduledNote);
    } else if (isManuallyClosedOrAtCapacity) {
      orderStatus = 'scheduled';
      scheduledNote = 'Order placed while restaurant was temporarily closed. Will be processed when restaurant reopens.';
      console.log('📅 Creating scheduled order (manually closed):', scheduledNote);
    } else {
      console.log('✅ Restaurant open, creating order...');
    }

    // Generate unique order number
    const orderNumber = generateOrderNumber();

    // Get estimated prep time from settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'order_settings')
      .single();

    const prepTime = settingsData?.value?.current_prep_time || 30;

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_phone_alt: orderData.customer_phone_alt,
        customer_email: orderData.customer_email,
        order_type: orderData.order_type,
        delivery_city: orderData.delivery_city,
        delivery_address: orderData.delivery_address,
        address_type: orderData.address_type,
        unit_number: orderData.unit_number,
        delivery_instructions: orderData.delivery_instructions,
        customer_latitude: orderData.customer_latitude,
        customer_longitude: orderData.customer_longitude,
        delivery_region_id: orderData.delivery_region_id,
        delivery_region_name: orderData.delivery_region_name,
        payment_method_type: orderData.payment_method_type || 'paystack',
        status: orderStatus,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        tax: orderData.tax,
        discount: orderData.discount,
        total: orderData.total,
        payment_status: 'pending',
        payment_method: orderData.payment_method_type || 'paystack',
        promo_code: orderData.promo_code,
        estimated_prep_time: prepTime,
        notes: scheduledNote || undefined,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Insert order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected_variation: item.selected_variation,
      selected_addons: item.selected_addons,
      special_instructions: item.special_instructions,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Initialize Paystack payment
    let paymentUrl = '';
    let paymentReference = '';

    try {
      const paymentData = await initializePaystackPayment(
        orderData.customer_email || '',
        orderData.total,
        orderNumber,
        order.id,
        orderData.customer_phone
      );

      paymentUrl = paymentData.payment_url;
      paymentReference = paymentData.payment_reference;

      // Update order with payment reference
      await supabase
        .from('orders')
        .update({ payment_reference: paymentReference })
        .eq('id', order.id);

    } catch (paymentError) {
      console.error('Paystack initialization error:', paymentError);
      
      // Don't fail the order creation, but return error info
      return NextResponse.json(
        {
          order: { ...order, items: orderItems },
          payment_url: null,
          error: 'Payment initialization failed. Please contact support.',
        },
        { status: 201 }
      );
    }

    // Return order and payment URL
    return NextResponse.json(
      {
        order: { ...order, items: orderItems },
        payment_url: paymentUrl,
        scheduled: orderStatus === 'scheduled',
        scheduled_note: scheduledNote || undefined,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in POST /api/orders:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET: List orders with optional filters (requires admin/kitchen auth)
export async function GET(request: NextRequest) {
  // Verify authentication - only admin/kitchen staff can list orders
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Filter by status (supports comma-separated values)
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query = query.in('status', statuses);
    }
    
    // Filter by order type (delivery/carryout)
    if (type) {
      query = query.eq('order_type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error('Unexpected error in GET /api/orders:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

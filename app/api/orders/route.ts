// Order creation endpoint with Paystack payment initialization
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for order creation
const orderSchema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(/^(\+234|0)[789]\d{9}$/),
  customer_email: z.string().email().optional(),
  customer_phone_alt: z.string().regex(/^(\+234|0)[789]\d{9}$/).optional(),
  order_type: z.enum(['delivery', 'carryout']),
  delivery_city: z.string().optional(),
  delivery_address: z.string().min(20).optional(),
  address_type: z.enum(['house', 'office', 'hotel', 'church', 'school', 'other']).optional(),
  unit_number: z.string().optional(),
  delivery_instructions: z.string().max(200).optional(),
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
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const orderData: OrderData = validationResult.data;
    const supabase = await createClient();

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
        status: 'pending',
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        tax: orderData.tax,
        discount: orderData.discount,
        total: orderData.total,
        payment_status: 'pending',
        payment_method: 'paystack',
        promo_code: orderData.promo_code,
        estimated_prep_time: prepTime,
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

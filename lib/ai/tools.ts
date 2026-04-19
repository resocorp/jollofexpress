// AI Tool definitions for WhatsApp AI and future voice agent
// These tools let Claude interact with the JollofExpress system during conversations

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/service';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://myshawarma.express';
const BAILEYS_URL = process.env.BAILEYS_SIDECAR_URL || 'http://localhost:3001';
const BAILEYS_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

// ============================================
// TOOL DEFINITIONS (passed to Claude)
// ============================================

export const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'browse_menu',
    description:
      'Get the restaurant menu. Returns categories with items, prices, variations, and addons. ' +
      'Use this when a customer asks what is available, wants to see the menu, or asks about a specific item.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Optional category name to filter by (e.g., "Shawarma", "Drinks"). Leave empty to get full menu.',
        },
      },
      required: [],
    },
  },
  {
    name: 'check_order_status',
    description:
      'Check the status of an order. Can look up by order number (e.g., "ORD-20260331-1234") or by customer phone number (returns most recent order).',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_number: { type: 'string', description: 'Order number like ORD-XXXXXXXX-XXXX' },
        phone: { type: 'string', description: 'Customer phone number to find their latest order' },
      },
      required: [],
    },
  },
  {
    name: 'get_delivery_info',
    description:
      'Get information about delivery windows, fees, and areas. Use when a customer asks about delivery times, fees, or whether we deliver to their area.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_business_hours',
    description:
      'Check if the restaurant is currently open and get operating hours. Use when customer asks about hours or if we are open.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'escalate_to_manager',
    description:
      'Escalate an issue to the restaurant manager. Use this when a customer has a complaint, problem, or request you cannot resolve ' +
      '(e.g., wrong order, refund, missing items, delivery problems, food quality issues, special requests). ' +
      'This sends a message to all admin phone numbers with the details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_phone: { type: 'string', description: 'Customer phone number or identifier' },
        customer_name: { type: 'string', description: 'Customer name if known' },
        issue_summary: { type: 'string', description: 'Brief summary of the issue' },
        order_number: { type: 'string', description: 'Related order number if applicable' },
      },
      required: ['customer_phone', 'issue_summary'],
    },
  },
  {
    name: 'find_recent_pending_feedback_order',
    description:
      'Find the most recent completed order for this customer that has had a feedback request sent but no rating submitted yet. ' +
      'Use this to resolve which order a customer is rating when they reply with something like "5 stars" or "was great".',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Customer WhatsApp phone number' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'submit_feedback',
    description:
      'Record a customer rating + optional comment for a completed order. Use after resolving the target order via find_recent_pending_feedback_order.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: { type: 'string', description: 'UUID of the order being rated' },
        rating: { type: 'integer', description: '1–5 star rating', minimum: 1, maximum: 5 },
        comment: { type: 'string', description: 'Optional free-text comment from the customer' },
      },
      required: ['order_id', 'rating'],
    },
  },
];

// ============================================
// TOOL HANDLERS
// ============================================

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'browse_menu':
      return browseMenu(toolInput.category as string | undefined);
    case 'check_order_status':
      return checkOrderStatus(
        toolInput.order_number as string | undefined,
        toolInput.phone as string | undefined
      );
    case 'get_delivery_info':
      return getDeliveryInfo();
    case 'get_business_hours':
      return getBusinessHours();
    case 'escalate_to_manager':
      return escalateToManager(
        toolInput.customer_phone as string,
        toolInput.issue_summary as string,
        toolInput.customer_name as string | undefined,
        toolInput.order_number as string | undefined
      );
    case 'find_recent_pending_feedback_order':
      return findRecentPendingFeedbackOrder(toolInput.phone as string);
    case 'submit_feedback':
      return submitFeedback(
        toolInput.order_id as string,
        toolInput.rating as number,
        toolInput.comment as string | undefined
      );
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ---- browse_menu ----
async function browseMenu(category?: string): Promise<string> {
  const supabase = createServiceClient();

  let categoryQuery = supabase
    .from('menu_categories')
    .select('id, name, description, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (category) {
    categoryQuery = categoryQuery.ilike('name', `%${category}%`);
  }

  const { data: categories, error: catError } = await categoryQuery;
  if (catError || !categories?.length) {
    return category
      ? `No category matching "${category}" found. Try asking for the full menu.`
      : 'Menu is currently unavailable.';
  }

  const categoryIds = categories.map((c) => c.id);

  const { data: items } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, base_price, promo_price, is_available, dietary_tag')
    .in('category_id', categoryIds)
    .eq('is_available', true)
    .order('display_order', { ascending: true });

  if (!items?.length) {
    return 'No items currently available on the menu.';
  }

  const itemIds = items.map((i) => i.id);

  const [{ data: variations }, { data: addons }] = await Promise.all([
    supabase.from('item_variations').select('*').in('item_id', itemIds),
    supabase.from('item_addons').select('*').in('item_id', itemIds).eq('is_available', true),
  ]);

  // Format for AI consumption
  const menuText = categories
    .map((cat) => {
      const catItems = items.filter((i) => i.category_id === cat.id);
      if (!catItems.length) return '';

      const itemsText = catItems
        .map((item) => {
          const price = item.promo_price ?? item.base_price;
          let text = `  - ${item.name} (ID: ${item.id}): NGN ${price}`;
          if (item.promo_price && item.promo_price < item.base_price) {
            text += ` (was NGN ${item.base_price})`;
          }
          if (item.description) text += `\n    ${item.description}`;
          if (item.dietary_tag && item.dietary_tag !== 'none') text += ` [${item.dietary_tag}]`;

          const itemVars = variations?.filter((v) => v.item_id === item.id) || [];
          if (itemVars.length) {
            text += '\n    Variations:';
            for (const v of itemVars) {
              const options = Array.isArray(v.options) ? v.options : [];
              const optStr = options
                .map((o: { name: string; price_adjustment: number }) =>
                  `${o.name}${o.price_adjustment ? ` (+NGN ${o.price_adjustment})` : ''}`
                )
                .join(', ');
              text += `\n      ${v.name}: ${optStr}`;
            }
          }

          const itemAddons = addons?.filter((a) => a.item_id === item.id) || [];
          if (itemAddons.length) {
            text += '\n    Addons:';
            for (const a of itemAddons) {
              text += `\n      ${a.name}: +NGN ${a.price}`;
            }
          }

          return text;
        })
        .join('\n');

      return `📂 ${cat.name}:\n${itemsText}`;
    })
    .filter(Boolean)
    .join('\n\n');

  return menuText;
}

// ---- place_order ----
async function placeOrder(input: Record<string, unknown>): Promise<string> {
  const items = input.items as Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    selected_variation?: { name: string; option: string; price_adjustment: number };
    selected_addons?: Array<{ name: string; price: number }>;
    special_instructions?: string;
    subtotal: number;
  }>;

  if (!items?.length) return 'Error: No items provided for the order.';

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const deliveryFee = input.order_type === 'delivery' ? 0 : 0; // Delivery fee calculated by system
  const tax = 0;
  const discount = 0;
  const total = subtotal + deliveryFee + tax - discount;

  const orderPayload = {
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    order_type: input.order_type,
    delivery_address: input.delivery_address || undefined,
    delivery_city: input.delivery_city || undefined,
    payment_method_type: 'paystack',
    subtotal,
    delivery_fee: deliveryFee,
    tax,
    discount,
    total,
    items: items.map((item) => ({
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected_variation: item.selected_variation,
      selected_addons: item.selected_addons,
      special_instructions: item.special_instructions,
      subtotal: item.subtotal,
    })),
  };

  try {
    const response = await fetch(`${APP_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return `Order failed: ${data.error || data.message || 'Unknown error'}. ${data.details ? JSON.stringify(data.details) : ''}`;
    }

    const order = data.order;
    const paymentUrl = data.payment_url;

    // Send payment link via WhatsApp
    if (paymentUrl) {
      try {
        await fetch(`${BAILEYS_URL}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Secret': BAILEYS_SECRET,
          },
          body: JSON.stringify({
            phone: input.customer_phone as string,
            message:
              `🧾 *Order Created - ${order.order_number}*\n\n` +
              `Total: NGN ${total.toLocaleString()}\n\n` +
              `💳 Pay here: ${paymentUrl}\n\n` +
              `Your order will be confirmed once payment is received.\n\n` +
              `_- myshawarma.express_`,
          }),
        });
      } catch (e) {
        console.error('Failed to send payment link via WhatsApp:', e);
      }
    }

    const batchInfo = data.batch
      ? `Delivery: ${data.batch.delivery_window} on ${data.batch.delivery_date}`
      : '';

    return (
      `Order placed successfully!\n` +
      `Order Number: ${order.order_number}\n` +
      `Total: NGN ${total.toLocaleString()}\n` +
      `${batchInfo}\n` +
      `Payment link has been sent to the customer's WhatsApp.\n` +
      `Payment URL: ${paymentUrl || 'N/A'}`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return `Failed to place order: ${msg}`;
  }
}

// ---- check_order_status ----
async function checkOrderStatus(orderNumber?: string, phone?: string): Promise<string> {
  const supabase = createServiceClient();

  let query = supabase
    .from('orders')
    .select('id, order_number, status, payment_status, total, customer_name, delivery_city, delivery_address, order_type, delivery_window, delivery_date, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (orderNumber) {
    query = query.eq('order_number', orderNumber);
  } else if (phone) {
    // Normalize phone for lookup
    let normalized = phone.replace(/[^\d]/g, '');
    if (normalized.startsWith('234')) normalized = '0' + normalized.substring(3);
    if (!normalized.startsWith('0') && !normalized.startsWith('+')) normalized = '0' + normalized;
    query = query.or(`customer_phone.eq.${normalized},customer_phone.eq.+234${normalized.substring(1)}`);
  } else {
    return 'Please provide an order number or phone number to look up.';
  }

  const { data: orders, error } = await query;
  if (error || !orders?.length) {
    return orderNumber
      ? `No order found with number ${orderNumber}.`
      : 'No recent orders found for this phone number.';
  }

  const order = orders[0];

  const statusLabels: Record<string, string> = {
    pending: 'Pending payment',
    confirmed: 'Confirmed - being prepared',
    preparing: 'Being prepared by our kitchen',
    ready: 'Ready for pickup/delivery',
    out_for_delivery: 'Out for delivery',
    completed: 'Delivered/Completed',
    cancelled: 'Cancelled',
  };

  return (
    `Order: ${order.order_number}\n` +
    `Status: ${statusLabels[order.status] || order.status}\n` +
    `Payment: ${order.payment_status}\n` +
    `Total: NGN ${order.total?.toLocaleString()}\n` +
    `Type: ${order.order_type}\n` +
    (order.delivery_window ? `Delivery Window: ${order.delivery_window}\n` : '') +
    (order.delivery_date ? `Delivery Date: ${order.delivery_date}\n` : '') +
    `Placed: ${new Date(order.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`
  );
}

// ---- get_delivery_info ----
async function getDeliveryInfo(): Promise<string> {
  const supabase = createServiceClient();

  const { data: windows } = await supabase
    .from('delivery_windows')
    .select('name, order_open_time, cutoff_time, delivery_start, delivery_end, is_active, days_of_week')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!windows?.length) {
    return 'No delivery windows are currently active. We may be closed or only accepting carryout.';
  }

  const { data: regions } = await supabase
    .from('delivery_regions')
    .select('name, base_fee, is_active')
    .eq('is_active', true);

  let text = 'Delivery Windows:\n';
  for (const w of windows) {
    text += `- ${w.name}: Orders open ${w.order_open_time} - Cutoff ${w.cutoff_time}, Delivery ${w.delivery_start} - ${w.delivery_end}\n`;
  }

  if (regions?.length) {
    text += '\nDelivery Areas & Fees:\n';
    for (const r of regions) {
      text += `- ${r.name}: NGN ${r.base_fee}\n`;
    }
  }

  return text;
}

// ---- get_business_hours ----
async function getBusinessHours(): Promise<string> {
  const supabase = createServiceClient();

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['operating_hours', 'order_settings']);

  const hoursData = settings?.find((s) => s.key === 'operating_hours')?.value;
  const orderSettings = settings?.find((s) => s.key === 'order_settings')?.value;

  const now = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });

  let text = `Current time (Nigeria): ${now}\n`;

  if (hoursData) {
    text += '\nOperating Hours:\n';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const day of days) {
      const hours = hoursData[day];
      if (hours?.is_open) {
        text += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.open} - ${hours.close}\n`;
      } else {
        text += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
      }
    }
  }

  if (orderSettings) {
    if (orderSettings.is_accepting_orders === false) {
      text += '\nStatus: NOT currently accepting orders.';
    } else {
      text += '\nStatus: Accepting orders.';
    }
    if (orderSettings.current_prep_time) {
      text += `\nEstimated prep time: ${orderSettings.current_prep_time} minutes`;
    }
  }

  return text;
}

// ---- send_payment_link ----
async function sendPaymentLink(orderNumber?: string, phone?: string): Promise<string> {
  if (!phone) return 'Phone number is required to send the payment link.';

  const supabase = createServiceClient();

  let query = supabase
    .from('orders')
    .select('id, order_number, total, payment_status, payment_reference')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);

  if (orderNumber) {
    query = query.eq('order_number', orderNumber);
  } else {
    let normalized = phone.replace(/[^\d]/g, '');
    if (normalized.startsWith('234')) normalized = '0' + normalized.substring(3);
    if (!normalized.startsWith('0')) normalized = '0' + normalized;
    query = query.or(`customer_phone.eq.${normalized},customer_phone.eq.+234${normalized.substring(1)}`);
  }

  const { data: orders } = await query;
  if (!orders?.length) {
    return 'No pending (unpaid) order found. The order may already be paid or cancelled.';
  }

  const order = orders[0];
  const paymentUrl = `${APP_URL}/orders/${order.id}`;

  // Send via WhatsApp
  try {
    await fetch(`${BAILEYS_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': BAILEYS_SECRET,
      },
      body: JSON.stringify({
        phone,
        message:
          `💳 *Payment Link - ${order.order_number}*\n\n` +
          `Total: NGN ${order.total?.toLocaleString()}\n\n` +
          `Pay here: ${paymentUrl}\n\n` +
          `_- myshawarma.express_`,
      }),
    });
    return `Payment link for ${order.order_number} (NGN ${order.total?.toLocaleString()}) has been sent to WhatsApp.`;
  } catch (e) {
    return `Found order ${order.order_number} but failed to send WhatsApp message. Customer can pay at: ${paymentUrl}`;
  }
}

// ---- escalate_to_manager ----
async function escalateToManager(
  customerPhone: string,
  issueSummary: string,
  customerName?: string,
  orderNumber?: string
): Promise<string> {
  const supabase = createServiceClient();

  // Get admin phone numbers from notification settings
  const { data } = await supabase
    .from('notification_settings')
    .select('key, value')
    .eq('key', 'admin_notifications')
    .single();

  const adminSettings = data?.value as { phone_numbers?: string[]; enabled?: boolean } | null;

  if (!adminSettings?.enabled || !adminSettings?.phone_numbers?.length) {
    console.error('[AI] No admin phone numbers configured for escalation');
    return 'Escalation noted but no admin contacts configured. The issue has been logged.';
  }

  const timestamp = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const message =
    `⚠️ *Customer Issue — Escalation*\n\n` +
    `👤 Customer: ${customerName || 'Unknown'}\n` +
    `📞 Phone: ${customerPhone}\n` +
    (orderNumber ? `📋 Order: ${orderNumber}\n` : '') +
    `\n📝 *Issue:*\n${issueSummary}\n\n` +
    `⏰ ${timestamp}\n` +
    `_Source: WhatsApp AI Chat_`;

  let sentCount = 0;
  for (const adminPhone of adminSettings.phone_numbers) {
    try {
      const res = await fetch(`${BAILEYS_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': BAILEYS_SECRET,
        },
        body: JSON.stringify({ phone: adminPhone, message }),
      });
      if (res.ok) sentCount++;
    } catch (e) {
      console.error(`[AI] Failed to send escalation to ${adminPhone}:`, e);
    }
  }

  return sentCount > 0
    ? `Issue escalated to ${sentCount} manager(s). They have been notified via WhatsApp.`
    : 'Failed to reach managers via WhatsApp, but the issue has been logged.';
}

// ---- find_recent_pending_feedback_order ----
// The feedback-worker sets orders.feedback_requested_at when it sends the
// prompt. We look up the most recent such order with no feedback row yet
// (completed within the last 48h) — that's what the customer's rating refers to.
async function findRecentPendingFeedbackOrder(phone: string): Promise<string> {
  if (!phone) return 'Phone number is required.';

  const supabase = createServiceClient();

  // Normalize phone to match stored format variants
  let normalized = phone.replace(/[^\d]/g, '');
  if (normalized.startsWith('234')) normalized = '0' + normalized.substring(3);
  if (!normalized.startsWith('0')) normalized = '0' + normalized;

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, completed_at, feedback_requested_at, total')
    .or(
      `customer_phone.eq.${normalized},customer_phone.eq.+234${normalized.substring(1)}`
    )
    .eq('status', 'completed')
    .not('feedback_requested_at', 'is', null)
    .gte('feedback_requested_at', cutoff)
    .order('feedback_requested_at', { ascending: false })
    .limit(5);

  if (!orders?.length) {
    return 'No recent pending-feedback order found for this phone. Do not submit feedback — thank the customer for the message and move on.';
  }

  // Exclude orders that already have a feedback row.
  const ids = orders.map((o) => o.id);
  const { data: existing } = await supabase
    .from('order_feedback')
    .select('order_id')
    .in('order_id', ids);

  const ratedIds = new Set((existing || []).map((r) => r.order_id));
  const pending = orders.find((o) => !ratedIds.has(o.id));

  if (!pending) {
    return 'All recent orders for this customer already have feedback recorded.';
  }

  return (
    `Order ${pending.order_number} (id: ${pending.id}), completed ${new Date(
      pending.completed_at
    ).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}. ` +
    `Call submit_feedback with order_id="${pending.id}".`
  );
}

// ---- submit_feedback ----
async function submitFeedback(
  orderId: string,
  rating: number,
  comment?: string
): Promise<string> {
  if (!orderId) return 'order_id is required.';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'rating must be an integer between 1 and 5.';
  }

  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, customer_phone')
    .eq('id', orderId)
    .single();

  if (!order) {
    return `Order ${orderId} not found.`;
  }

  const { error } = await supabase.from('order_feedback').insert({
    order_id: order.id,
    customer_phone: order.customer_phone,
    rating,
    comment: comment?.trim() || null,
    source: 'whatsapp_inline',
  });

  if (error) {
    // Duplicate order_id (unique constraint) — graceful dedupe.
    if (error.code === '23505') {
      return `Feedback for order ${order.order_number} was already recorded. Thank the customer and note the rating was already received.`;
    }
    console.error('[AI] submit_feedback insert failed:', error);
    return `Failed to record feedback: ${error.message}`;
  }

  return `Feedback recorded for order ${order.order_number}: rating=${rating}${
    comment ? `, comment="${comment}"` : ''
  }. Thank the customer briefly.`;
}

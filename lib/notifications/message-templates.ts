// WhatsApp Message Templates for Customer and Admin Notifications
import type { OrderWithItems } from '@/types/database';
import type { DailySummaryData, KitchenCapacityData } from './types';
import { formatCurrency } from '@/lib/formatters';

/**
 * Format order items for display in messages
 */
function formatOrderItems(items: OrderWithItems['items']): string {
  if (!items || items.length === 0) return '';

  return items
    .map((item) => {
      let itemText = `• ${item.quantity}x ${item.item_name}`;
      
      // Add variation if present
      if (item.selected_variation) {
        itemText += ` (${item.selected_variation.option})`;
      }
      
      return itemText;
    })
    .join('\n');
}

/**
 * Format delivery information
 */
function formatDeliveryInfo(order: OrderWithItems): string {
  if (order.order_type === 'carryout') {
    return '📍 Type: Carryout\nPick up at: JollofExpress, Awka';
  }

  return `📍 Delivery Address:\n${order.delivery_address}\n${order.delivery_city}`;
}

/**
 * Get app URL from environment
 */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://jollofexpress.com';
}

// ============================================
// CUSTOMER MESSAGE TEMPLATES
// ============================================

/**
 * Order Confirmed Message
 */
export function orderConfirmedMessage(order: OrderWithItems): string {
  const appUrl = getAppUrl();
  const trackingUrl = `${appUrl}/orders/${order.id}`;
  
  return `🎉 *Order Confirmed!*

📋 Order #: ${order.order_number}
💰 Total: ${formatCurrency(order.total)}
⏱️ Estimated Prep Time: ${order.estimated_prep_time || 30} minutes

🍲 *Your Order:*
${formatOrderItems(order.items)}

${formatDeliveryInfo(order)}

✅ We'll notify you when your order is ready!

Track your order: ${trackingUrl}

_- JollofExpress 🍲_`;
}

/**
 * Order Preparing Message
 */
export function orderPreparingMessage(order: OrderWithItems): string {
  return `👨‍🍳 *Your Order is Being Prepared!*

📋 Order #${order.order_number}
Status: Preparing

Your delicious meal is being prepared with care by our chefs.

_- JollofExpress 🍲_`;
}

/**
 * Order Ready Message
 */
export function orderReadyMessage(order: OrderWithItems): string {
  const deliveryMessage = order.order_type === 'carryout'
    ? '🏪 *Ready for pickup!*\nPlease come to our location to collect your order.'
    : '📦 *Ready for delivery!*\nYour order will be dispatched shortly.';

  return `✅ *Your Order is Ready!*

📋 Order #${order.order_number}

${deliveryMessage}

_- JollofExpress 🍲_`;
}

/**
 * Order Out for Delivery Message
 */
export function orderOutForDeliveryMessage(order: OrderWithItems): string {
  const eta = order.estimated_prep_time 
    ? `${Math.round(order.estimated_prep_time * 1.5)} minutes` 
    : '30-45 minutes';

  return `🛵 *Your Order is On The Way!*

📋 Order #${order.order_number}
📍 Delivering to: ${order.delivery_city}
⏰ Estimated Arrival: ${eta}

Get ready to enjoy your meal! 😋

_- JollofExpress 🍲_`;
}

/**
 * Order Completed Message
 */
export function orderCompletedMessage(order: OrderWithItems): string {
  const appUrl = getAppUrl();
  const menuUrl = `${appUrl}/menu`;

  return `🎊 *Order Delivered!*

Thank you for choosing JollofExpress!

📋 Order #${order.order_number}

We hope you enjoyed your meal! 🍽️

Order again: ${menuUrl}

_- JollofExpress 🍲_`;
}

/**
 * Payment Failed Message
 */
export function paymentFailedMessage(order: OrderWithItems): string {
  const appUrl = getAppUrl();
  const orderUrl = `${appUrl}/orders/${order.id}`;

  return `⚠️ *Payment Failed*

📋 Order #${order.order_number}
💰 Amount: ${formatCurrency(order.total)}

Your payment could not be processed. Please try again or contact support.

Retry payment: ${orderUrl}

_- JollofExpress 🍲_`;
}

// ============================================
// ADMIN MESSAGE TEMPLATES
// ============================================

/**
 * Kitchen Closed Alert (Capacity Exceeded)
 */
export function kitchenClosedMessage(data: KitchenCapacityData): string {
  const timestamp = new Date(data.timestamp).toLocaleString('en-NG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return `⚠️ *KITCHEN ALERT*

🔴 Kitchen has been *CLOSED* due to high order volume.

📊 Active Orders: ${data.active_orders}/${data.max_orders}
⏰ Time: ${timestamp}

Orders will resume automatically when capacity is available.

_- JollofExpress System_`;
}

/**
 * Kitchen Reopened Alert
 */
export function kitchenReopenedMessage(data: KitchenCapacityData): string {
  const timestamp = new Date(data.timestamp).toLocaleString('en-NG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return `✅ *KITCHEN REOPENED*

🟢 Kitchen is now *accepting orders* again.

📊 Active Orders: ${data.active_orders}/${data.max_orders}
⏰ Time: ${timestamp}

_- JollofExpress System_`;
}

/**
 * Payment Failure Alert (Admin)
 */
export function paymentFailureAlertMessage(order: OrderWithItems): string {
  return `💳 *Payment Failure Alert*

📋 Order #${order.order_number}
👤 Customer: ${order.customer_name}
📞 Phone: ${order.customer_phone}
💰 Amount: ${formatCurrency(order.total)}

Payment verification failed. Customer may need assistance.

_- JollofExpress System_`;
}

/**
 * Daily Summary Report
 */
export function dailySummaryMessage(data: DailySummaryData): string {
  const appUrl = getAppUrl();
  const dashboardUrl = `${appUrl}/admin`;

  const topItemsList = data.top_items
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.name} (${item.quantity} orders)`)
    .join('\n');

  return `📊 *Daily Report - ${data.date}*

📦 *Orders:* ${data.total_orders}
💰 *Revenue:* ${formatCurrency(data.total_revenue)}
📈 *Avg Order:* ${formatCurrency(data.avg_order_value)}

*Status Breakdown:*
✅ Completed: ${data.completed_orders}
🚫 Cancelled: ${data.cancelled_orders}
⏳ Pending: ${data.pending_orders}

🏆 *Top Items:*
${topItemsList || 'No orders today'}

View dashboard: ${dashboardUrl}

_- JollofExpress Analytics_`;
}

/**
 * System Alert Message (Generic)
 */
export function systemAlertMessage(title: string, message: string): string {
  const timestamp = new Date().toLocaleString('en-NG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return `🔔 *System Alert*

*${title}*

${message}

⏰ ${timestamp}

_- JollofExpress System_`;
}

/**
 * New Order Alert (Admin)
 */
export function newOrderAlertMessage(order: OrderWithItems): string {
  const timestamp = new Date().toLocaleString('en-NG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const orderType = order.order_type === 'delivery' ? '🚚 Delivery' : '🏪 Carryout';
  const orderSource = order.order_source === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web';

  return `🔔 *NEW ORDER!*

📋 Order #${order.order_number}
${orderSource} | ${orderType}

👤 *Customer:* ${order.customer_name}
📞 *Phone:* ${order.customer_phone}
💰 *Total:* ${formatCurrency(order.total)}

🍲 *Items:*
${formatOrderItems(order.items)}

${order.order_type === 'delivery' ? `📍 *Deliver to:*\n${order.delivery_address}` : ''}

⏰ ${timestamp}

_- JollofExpress System_`;
}

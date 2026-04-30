// Main Notification Service - Orchestrates WhatsApp notifications via Baileys sidecar
import { createServiceClient } from '@/lib/supabase/service';
import { appendAssistantMessage } from '@/lib/ai/session-log';
import { normalizePhone } from '@/lib/whatsapp/identity';
import * as templates from './message-templates';
import type { 
  NotificationSettings,
  NotificationType,
  EventType,
  SendNotificationOptions,
  KitchenCapacityData,
  DailySummaryData,
} from './types';
import type { OrderWithItems } from '@/types/database';

// Baileys sidecar configuration
const BAILEYS_URL = process.env.BAILEYS_SIDECAR_URL || 'http://localhost:3001';
const BAILEYS_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

/**
 * Fetch notification settings from database
 */
async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('key, value')
      .in('key', ['whatsapp', 'ultramsg', 'customer_notifications', 'admin_notifications']);

    if (error || !data) {
      console.error('Error fetching notification settings:', error);
      return null;
    }

    // Transform array into object
    const settings: Record<string, unknown> = {};
    data.forEach((row) => {
      settings[row.key] = row.value;
    });

    // Support both old 'ultramsg' key and new 'whatsapp' key
    if (!settings.ultramsg && settings.whatsapp) {
      settings.ultramsg = settings.whatsapp;
    }

    return settings as unknown as NotificationSettings;
  } catch (error) {
    console.error('Error in getNotificationSettings:', error);
    return null;
  }
}

/**
 * Log notification attempt to database
 */
async function logNotification(
  notificationType: NotificationType,
  eventType: EventType,
  recipientPhone: string,
  messageBody: string,
  status: 'pending' | 'sent' | 'failed',
  orderId?: string,
  messageId?: string,
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceClient();

  try {
    const logEntry: Record<string, unknown> = {
      notification_type: notificationType,
      event_type: eventType,
      recipient_phone: recipientPhone,
      message_body: messageBody,
      status,
      order_id: orderId,
      ultramsg_id: messageId,
      error_message: errorMessage,
    };

    if (status === 'sent') {
      logEntry.sent_at = new Date().toISOString();
    }

    await supabase.from('notification_logs').insert(logEntry);
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

/**
 * Send a WhatsApp message via Baileys sidecar HTTP API
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${BAILEYS_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': BAILEYS_SECRET,
      },
      body: JSON.stringify({ phone, message }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, messageId: data.messageId };
    }

    return { success: false, error: data.error || data.message || 'Send failed' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Baileys sidecar error:', errorMsg);
    return { success: false, error: `Baileys connection error: ${errorMsg}` };
  }
}

/**
 * Check Baileys sidecar connection status
 */
export async function getBaileysStatus(): Promise<{ status: string; uptime: number }> {
  try {
    const response = await fetch(`${BAILEYS_URL}/status`, {
      headers: { 'X-API-Secret': BAILEYS_SECRET },
    });
    return await response.json();
  } catch {
    return { status: 'unreachable', uptime: 0 };
  }
}

/**
 * Send a WhatsApp notification
 */
async function sendNotification(options: SendNotificationOptions): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings || !settings.ultramsg.enabled) {
    console.log('⚠️ WhatsApp notifications are disabled');
    return false;
  }

  try {
    const result = await sendWhatsAppMessage(options.phone, options.message);

    if (result.success) {
      await logNotification(
        options.notificationType,
        options.eventType,
        options.phone,
        options.message,
        'sent',
        options.orderId,
        result.messageId
      );

      // Mirror customer-facing notifications into the AI session so the AI
      // has context when the customer replies ("when will it arrive?").
      // Admin notifications go to staff phones, not customer threads.
      // Key the session under the normalized digit form so inbound replies
      // (which the sidecar resolves to the same canonical phone) land in the
      // same row.
      if (options.notificationType === 'customer') {
        try {
          const canonical = normalizePhone(options.phone);
          if (canonical) {
            await appendAssistantMessage(canonical, options.message, 'system');
          }
        } catch (err) {
          console.error('[notify] appendAssistantMessage failed:', err);
        }
      }

      console.log(`✅ Notification sent: ${options.eventType} to ${options.phone}`);
      return true;
    } else {
      await logNotification(
        options.notificationType,
        options.eventType,
        options.phone,
        options.message,
        'failed',
        options.orderId,
        undefined,
        result.error || 'Send failed'
      );

      console.error('Failed to send notification:', result.error);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logNotification(
      options.notificationType,
      options.eventType,
      options.phone,
      options.message,
      'failed',
      options.orderId,
      undefined,
      errorMessage
    );

    console.error('Error sending notification:', error);
    return false;
  }
}

// ============================================
// CUSTOMER NOTIFICATIONS
// ============================================

/**
 * Send order confirmation notification
 */
export async function sendOrderConfirmation(order: OrderWithItems): Promise<boolean> {
  const settings = await getNotificationSettings();
  
  if (!settings?.customer_notifications.order_confirmed) {
    return false;
  }

  const message = templates.orderConfirmedMessage(order);

  return sendNotification({
    phone: order.customer_phone,
    message,
    notificationType: 'customer',
    eventType: 'order_confirmed',
    orderId: order.id,
  });
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusUpdate(order: OrderWithItems): Promise<boolean> {
  const settings = await getNotificationSettings();
  
  if (!settings) return false;

  let message = '';
  let eventType: EventType = 'order_preparing';

  // Determine which message template to use based on status
  // Note: 'preparing' and 'ready' statuses are skipped - no notifications sent for these
  switch (order.status) {
    case 'preparing':
    case 'ready':
      // Skip notifications for these intermediate statuses (workflow simplified)
      return false;

    case 'out_for_delivery':
      if (!settings.customer_notifications.order_out_for_delivery) return false;
      message = templates.orderOutForDeliveryMessage(order);
      eventType = 'order_out_for_delivery';
      break;

    case 'completed':
      if (!settings.customer_notifications.order_completed) return false;
      message = templates.orderCompletedMessage(order);
      eventType = 'order_completed';
      break;

    default:
      // No notification for other statuses
      return false;
  }

  return sendNotification({
    phone: order.customer_phone,
    message,
    notificationType: 'customer',
    eventType,
    orderId: order.id,
  });
}

/**
 * Send payment failed notification to customer
 */
export async function sendPaymentFailedNotification(order: OrderWithItems): Promise<boolean> {
  const settings = await getNotificationSettings();
  
  if (!settings?.customer_notifications.payment_failed) {
    return false;
  }

  const message = templates.paymentFailedMessage(order);

  return sendNotification({
    phone: order.customer_phone,
    message,
    notificationType: 'customer',
    eventType: 'payment_failed',
    orderId: order.id,
  });
}

// ============================================
// ADMIN NOTIFICATIONS
// ============================================

/**
 * Send notification to all admin phone numbers
 */
async function sendAdminNotification(
  message: string,
  eventType: EventType
): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings?.admin_notifications.enabled) {
    return false;
  }

  const adminPhones = settings.admin_notifications.phone_numbers;

  if (!adminPhones || adminPhones.length === 0) {
    console.log('No admin phone numbers configured');
    return false;
  }

  // Send to all admin numbers
  const results = await Promise.all(
    adminPhones.map((phone) =>
      sendNotification({
        phone,
        message,
        notificationType: 'admin',
        eventType,
      })
    )
  );

  return results.some((result) => result === true);
}

/**
 * Send kitchen capacity alert to admins
 */
export async function sendKitchenCapacityAlert(
  action: 'closed' | 'reopened',
  activeOrders: number,
  maxOrders: number
): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings?.admin_notifications.kitchen_capacity_alerts) {
    return false;
  }

  const data: KitchenCapacityData = {
    action,
    active_orders: activeOrders,
    max_orders: maxOrders,
    timestamp: new Date().toISOString(),
  };

  const message = action === 'closed'
    ? templates.kitchenClosedMessage(data)
    : templates.kitchenReopenedMessage(data);

  const eventType = action === 'closed' ? 'kitchen_closed' : 'kitchen_reopened';

  return sendAdminNotification(message, eventType);
}

/**
 * Send payment failure alert to admins
 */
export async function sendPaymentFailureAlert(order: OrderWithItems): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings?.admin_notifications.payment_failures) {
    return false;
  }

  const message = templates.paymentFailureAlertMessage(order);

  return sendAdminNotification(message, 'payment_failure');
}

/**
 * Send new order alert to admins
 */
export async function sendNewOrderAlert(order: OrderWithItems): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings?.admin_notifications.new_order_alerts) {
    return false;
  }

  const message = templates.newOrderAlertMessage(order);

  return sendAdminNotification(message, 'new_order');
}

/**
 * Send daily summary report to admins
 */
export async function sendDailySummary(data: DailySummaryData): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings?.admin_notifications.daily_summary) {
    return false;
  }

  const message = templates.dailySummaryMessage(data);

  return sendAdminNotification(message, 'daily_summary');
}

/**
 * Send system alert to admins
 */
export async function sendSystemAlert(title: string, alertMessage: string): Promise<boolean> {
  const message = templates.systemAlertMessage(title, alertMessage);
  return sendAdminNotification(message, 'system_alert');
}

// ============================================
// DELIVERY TRACKING NOTIFICATIONS
// ============================================

/**
 * Send rider nearby notification to customer
 */
export async function sendRiderNearbyNotification(
  phone: string,
  customerName: string,
  orderNumber: string,
  deliveryAddress: string,
  orderId: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://myshawarma.express';
  const trackingUrl = `${appUrl}/orders/${orderId}`;
  const message =
    `🏍️ *Your rider is nearby!*\n\n` +
    `Hi ${customerName}, your MyShawarma delivery (Order #${orderNumber}) ` +
    `is almost at your location. Please be ready to receive your order!\n\n` +
    `📍 Delivering to: ${deliveryAddress}\n\n` +
    `🔗 Track your rider live: ${trackingUrl}\n\n` +
    `Thank you for ordering from MyShawarma! 🌯`;

  return sendNotification({
    phone,
    message,
    notificationType: 'customer',
    eventType: 'rider_nearby',
    orderId,
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test notification connection (Baileys sidecar health check)
 */
export async function testNotificationConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const status = await getBaileysStatus();

    if (status.status === 'connected') {
      return { success: true, message: 'WhatsApp connected via Baileys' };
    }

    if (status.status === 'awaiting_scan') {
      return { success: false, message: 'WhatsApp awaiting QR scan. Please scan from admin panel.' };
    }

    if (status.status === 'unreachable') {
      return { success: false, message: 'Baileys sidecar is not running. Start it with: pm2 start ecosystem.config.js' };
    }

    return { success: false, message: `WhatsApp status: ${status.status}` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}

/**
 * Send test notification to a phone number
 */
export async function sendTestNotification(phone: string): Promise<boolean> {
  const message = templates.systemAlertMessage(
    'Test Notification',
    'This is a test message from myshawarma.express. If you received this, your WhatsApp notifications are working correctly! 🎉'
  );

  return sendNotification({
    phone,
    message,
    notificationType: 'admin',
    eventType: 'system_alert',
  });
}

// Main Notification Service - Orchestrates WhatsApp notifications
import { createServiceClient } from '@/lib/supabase/service';
import { UltraMsgClient } from './ultramsg-client';
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

/**
 * Fetch notification settings from database
 */
async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('key, value')
      .in('key', ['ultramsg', 'customer_notifications', 'admin_notifications']);

    if (error || !data) {
      console.error('Error fetching notification settings:', error);
      return null;
    }

    // Transform array into object
    const settings: any = {};
    data.forEach((row) => {
      settings[row.key] = row.value;
    });

    return settings as NotificationSettings;
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
  ultramsgId?: string,
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceClient();

  try {
    const logEntry: any = {
      notification_type: notificationType,
      event_type: eventType,
      recipient_phone: recipientPhone,
      message_body: messageBody,
      status,
      order_id: orderId,
      ultramsg_id: ultramsgId,
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
 * Send a WhatsApp notification
 */
async function sendNotification(options: SendNotificationOptions): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings || !settings.ultramsg.enabled) {
    console.log('⚠️ WhatsApp notifications are disabled');
    return false;
  }

  // Check for credentials in database first, then fall back to env vars
  const instanceId = settings.ultramsg.instance_id || process.env.ULTRAMSG_INSTANCE_ID;
  const token = settings.ultramsg.token || process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.error('❌ UltraMsg credentials not configured in database or environment variables');
    console.error('Database settings:', { 
      hasInstanceId: !!settings.ultramsg.instance_id, 
      hasToken: !!settings.ultramsg.token 
    });
    return false;
  }

  console.log('✅ Using UltraMsg credentials:', {
    instanceId,
    tokenLength: token.length,
    source: settings.ultramsg.instance_id ? 'database' : 'environment'
  });

  const client = new UltraMsgClient(instanceId, token);

  // Validate phone number
  if (!UltraMsgClient.validatePhoneNumber(options.phone)) {
    console.error('Invalid phone number:', options.phone);
    await logNotification(
      options.notificationType,
      options.eventType,
      options.phone,
      options.message,
      'failed',
      options.orderId,
      undefined,
      'Invalid phone number format'
    );
    return false;
  }

  try {
    // Send message via UltraMsg
    const response = await client.sendMessage({
      to: options.phone,
      body: options.message,
      referenceId: options.orderId,
    });

    if (response.sent) {
      // Log success
      await logNotification(
        options.notificationType,
        options.eventType,
        options.phone,
        options.message,
        'sent',
        options.orderId,
        response.id
      );

      console.log(`✅ Notification sent: ${options.eventType} to ${options.phone}`);
      return true;
    } else {
      // Log failure
      await logNotification(
        options.notificationType,
        options.eventType,
        options.phone,
        options.message,
        'failed',
        options.orderId,
        undefined,
        response.message || 'Send failed'
      );

      console.error('Failed to send notification:', response.message);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error
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
// UTILITY FUNCTIONS
// ============================================

/**
 * Test notification connection
 */
export async function testNotificationConnection(): Promise<{ success: boolean; message: string }> {
  const settings = await getNotificationSettings();

  // Check for credentials in database first, then fall back to env vars
  const instanceId = settings?.ultramsg.instance_id || process.env.ULTRAMSG_INSTANCE_ID;
  const token = settings?.ultramsg.token || process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.error('❌ UltraMsg credentials not configured');
    console.error('Database settings:', settings?.ultramsg);
    console.error('Env vars:', {
      hasInstanceId: !!process.env.ULTRAMSG_INSTANCE_ID,
      hasToken: !!process.env.ULTRAMSG_TOKEN,
    });
    return {
      success: false,
      message: 'UltraMsg credentials not configured in database or environment variables',
    };
  }

  console.log('🔍 Testing connection with:', {
    instanceId,
    tokenLength: token.length,
    source: settings?.ultramsg.instance_id ? 'database' : 'environment'
  });

  const client = new UltraMsgClient(instanceId, token);

  return client.testConnection();
}

/**
 * Send test notification to a phone number
 */
export async function sendTestNotification(phone: string): Promise<boolean> {
  const message = templates.systemAlertMessage(
    'Test Notification',
    'This is a test message from JollofExpress. If you received this, your WhatsApp notifications are working correctly! 🎉'
  );

  return sendNotification({
    phone,
    message,
    notificationType: 'admin',
    eventType: 'system_alert',
  });
}

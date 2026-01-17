// TypeScript types for WhatsApp notification system

export type NotificationType = 'customer' | 'admin';

export type CustomerEventType = 
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready'
  | 'order_out_for_delivery'
  | 'order_completed'
  | 'payment_failed';

export type AdminEventType = 
  | 'kitchen_closed'
  | 'kitchen_reopened'
  | 'payment_failure'
  | 'daily_summary'
  | 'system_alert'
  | 'new_order';

export type EventType = CustomerEventType | AdminEventType;

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

// UltraMsg Settings
export interface UltraMsgSettings {
  instance_id: string;
  token: string;
  enabled: boolean;
}

// Customer Notification Settings
export interface CustomerNotificationSettings {
  order_confirmed: boolean;
  order_preparing: boolean;
  order_ready: boolean;
  order_out_for_delivery: boolean;
  order_completed: boolean;
  payment_failed: boolean;
}

// Admin Notification Settings
export interface AdminNotificationSettings {
  enabled: boolean;
  phone_numbers: string[];
  new_order_alerts: boolean;
  kitchen_capacity_alerts: boolean;
  payment_failures: boolean;
  daily_summary: boolean;
  summary_time: string; // HH:mm format
}

// Combined Settings
export interface NotificationSettings {
  ultramsg: UltraMsgSettings;
  customer_notifications: CustomerNotificationSettings;
  admin_notifications: AdminNotificationSettings;
}

// Notification Log Entry
export interface NotificationLog {
  id: string;
  notification_type: NotificationType;
  event_type: EventType;
  recipient_phone: string;
  message_body: string;
  order_id?: string;
  status: NotificationStatus;
  ultramsg_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

// UltraMsg API Request - Text Message
export interface UltraMsgSendRequest {
  to: string; // Phone number with international format
  body: string; // Message text
  priority?: number;
  referenceId?: string;
}

// UltraMsg API Request - Image Message
export interface UltraMsgImageRequest {
  to: string; // Phone number with international format
  image: string; // HTTP URL or base64-encoded image
  caption?: string; // Optional caption (max 1024 chars)
  priority?: number;
  referenceId?: string;
}

// UltraMsg API Response
export interface UltraMsgSendResponse {
  sent: boolean;
  message: string;
  id?: string; // Message ID
}

// UltraMsg API Error Response
export interface UltraMsgErrorResponse {
  error: string;
  message: string;
}

// Notification Service Options
export interface SendNotificationOptions {
  phone: string;
  message: string;
  notificationType: NotificationType;
  eventType: EventType;
  orderId?: string;
}

// Daily Summary Data
export interface DailySummaryData {
  date: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  completed_orders: number;
  cancelled_orders: number;
  pending_orders: number;
  top_items: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

// Kitchen Capacity Alert Data
export interface KitchenCapacityData {
  action: 'closed' | 'reopened';
  active_orders: number;
  max_orders: number;
  timestamp: string;
}

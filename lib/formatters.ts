// Utility functions for formatting data
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';

/**
 * Format amount in Naira (₦)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as: 0801 234 5678
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  // Format international: +234 801 234 5678
  if (cleaned.length === 13 && cleaned.startsWith('234')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  return phone;
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

/**
 * Format date only
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  return format(new Date(date), 'h:mm a');
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format exact time for kitchen display (e.g., "Oct 21, 4:30 PM")
 */
export function formatKitchenTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, h:mm a');
}

/**
 * Get order age in minutes
 */
export function getOrderAgeMinutes(createdAt: string | Date): number {
  return differenceInMinutes(new Date(), new Date(createdAt));
}

/**
 * Get order age color class based on time elapsed
 */
export function getOrderAgeColor(createdAt: string | Date): string {
  const minutes = getOrderAgeMinutes(createdAt);
  
  if (minutes < 10) return 'border-green-500';
  if (minutes < 20) return 'border-yellow-500';
  return 'border-red-500';
}

/**
 * Format order status for display
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Payment Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  
  return statusMap[status] || status;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ORD-${date}-${random}`;
}

/**
 * Format dietary tag for display
 */
export function formatDietaryTag(tag: string): string {
  const tagMap: Record<string, string> = {
    veg: 'Vegetarian',
    non_veg: 'Non-Vegetarian',
    vegan: 'Vegan',
    halal: 'Halal',
    none: '',
  };
  
  return tagMap[tag] || tag;
}

/**
 * Get dietary tag icon/emoji
 */
export function getDietaryTagIcon(tag: string): string {
  const iconMap: Record<string, string> = {
    veg: '🥬',
    non_veg: '🍗',
    vegan: '🌱',
    halal: '☪️',
    none: '',
  };
  
  return iconMap[tag] || '';
}

/**
 * Calculate total with tax and delivery
 */
export function calculateTotal(
  subtotal: number,
  taxRate: number,
  deliveryFee: number,
  discount: number = 0
): {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
} {
  const tax = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + tax + deliveryFee - discount;
  
  return {
    subtotal,
    tax,
    deliveryFee,
    discount,
    total: Math.max(0, total),
  };
}

/**
 * Format address for display
 */
export function formatAddress(
  address: string,
  addressType?: string,
  unitNumber?: string
): string {
  let formatted = address;
  
  if (unitNumber) {
    formatted = `${unitNumber}, ${formatted}`;
  }
  
  if (addressType && addressType !== 'other') {
    formatted = `${formatted} (${addressType})`;
  }
  
  return formatted;
}

/**
 * Get order status badge color
 */
export function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    confirmed: 'default',
    preparing: 'secondary',
    ready: 'default',
    out_for_delivery: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
  };
  
  return variantMap[status] || 'default';
}

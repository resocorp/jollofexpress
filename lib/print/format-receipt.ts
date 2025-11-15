// Receipt formatter - converts order data to print-ready format
import type { OrderWithItems } from '@/types/database';
import { formatPhoneNumber } from '@/lib/formatters';

/**
 * Format currency for thermal printer (using NGN instead of ₦ symbol)
 */
function formatCurrency(amount: number): string {
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `NGN${formatted}`;
}

export interface ReceiptData {
  orderNumber: string;
  orderDate: string;
  orderTime: string;
  orderType: 'delivery' | 'carryout';
  
  // Customer info
  customerName: string;
  customerPhone: string;
  customerPhoneAlt?: string;
  
  // Delivery info (if applicable)
  deliveryAddress?: string;
  deliveryCity?: string;
  addressType?: string;
  unitNumber?: string;
  deliveryInstructions?: string;
  
  // Items
  items: ReceiptItem[];
  
  // Pricing breakdown
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  promoCode?: string;
  
  // Payment
  paymentStatus: string;
  paymentMethod: string;
  
  // Kitchen info
  estimatedPrepTime?: number;
  specialInstructions: string[];
}

export interface ReceiptItem {
  quantity: number;
  name: string;
  variation?: string;
  addons: string[];
  specialInstructions?: string;
  price: number;
}

/**
 * Format order data into receipt structure
 */
export function formatReceipt(order: OrderWithItems): ReceiptData {
  // Format date and time
  const orderDate = new Date(order.created_at);
  const dateStr = orderDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = orderDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Extract special instructions from items
  const specialInstructions: string[] = [];
  order.items?.forEach(item => {
    if (item.special_instructions) {
      specialInstructions.push(`${item.item_name}: ${item.special_instructions}`);
    }
  });

  // Format items
  const items: ReceiptItem[] = order.items?.map(item => ({
    quantity: item.quantity,
    name: item.item_name,
    variation: item.selected_variation?.option,
    addons: item.selected_addons?.map(a => a.name) || [],
    specialInstructions: item.special_instructions || undefined,
    price: item.subtotal,
  })) || [];

  // Get pricing breakdown from order
  const subtotal = order.subtotal;
  const deliveryFee = order.delivery_fee || 0;
  const tax = order.tax || 0;
  const discount = order.discount || 0;
  const total = order.total;

  // Debug logging to identify the issue
  console.log('[RECEIPT FORMAT] Order pricing:', {
    order_id: order.id,
    order_number: order.order_number,
    order_type: order.order_type,
    subtotal,
    deliveryFee,
    tax,
    discount,
    total,
    calculated_total: subtotal + deliveryFee + tax - discount
  });

  return {
    orderNumber: order.order_number,
    orderDate: dateStr,
    orderTime: timeStr,
    orderType: order.order_type,
    
    customerName: order.customer_name,
    customerPhone: formatPhoneNumber(order.customer_phone),
    customerPhoneAlt: order.customer_phone_alt ? formatPhoneNumber(order.customer_phone_alt) : undefined,
    
    deliveryAddress: order.delivery_address || undefined,
    deliveryCity: order.delivery_city || undefined,
    addressType: order.address_type || undefined,
    unitNumber: order.unit_number || undefined,
    deliveryInstructions: order.delivery_instructions || undefined,
    
    items,
    
    subtotal,
    deliveryFee,
    tax,
    discount,
    total,
    promoCode: order.promo_code || undefined,
    
    paymentStatus: order.payment_status === 'success' ? 'PAID' : order.payment_status.toUpperCase(),
    paymentMethod: 'Paystack',
    
    estimatedPrepTime: order.estimated_prep_time || 25,
    specialInstructions,
  };
}

/**
 * Format receipt as plain text (for thermal printers)
 * 48 characters per line for 80mm paper
 */
export function formatReceiptText(receipt: ReceiptData): string {
  const lines: string[] = [];
  const width = 48;

  // Helper functions
  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const line = (char = '=') => char.repeat(width);
  
  const leftRight = (left: string, right: string) => {
    const spacing = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spacing) + right;
  };

  // Header
  lines.push(line());
  lines.push(center('JOLLOF EXPRESS'));
  lines.push(line());
  lines.push('');
  
  // Order info - Make order number prominent
  lines.push(center(`ORDER #${receipt.orderNumber}`));
  lines.push('');
  lines.push(`Date: ${receipt.orderDate} ${receipt.orderTime}`);
  lines.push(line('-'));
  lines.push('');
  
  // Customer details
  lines.push('CUSTOMER DETAILS');
  lines.push(`Name: ${receipt.customerName}`);
  lines.push(`Phone: ${receipt.customerPhone}`);
  if (receipt.customerPhoneAlt) {
    lines.push(`Alt: ${receipt.customerPhoneAlt}`);
  }
  lines.push(`Type: ${receipt.orderType.toUpperCase()}`);
  lines.push('');
  
  // Delivery address
  if (receipt.orderType === 'delivery' && receipt.deliveryAddress) {
    lines.push('DELIVERY ADDRESS');
    lines.push(receipt.deliveryCity || '');
    lines.push(receipt.deliveryAddress);
    if (receipt.addressType) {
      lines.push(`Type: ${receipt.addressType}`);
    }
    if (receipt.unitNumber) {
      lines.push(`Unit: ${receipt.unitNumber}`);
    }
    if (receipt.deliveryInstructions) {
      lines.push('');
      lines.push('Nearest Landmark:');
      lines.push(receipt.deliveryInstructions);
    }
    lines.push('');
  }
  
  lines.push(line('-'));
  lines.push('ITEMS');
  lines.push(line('-'));
  
  // Items
  receipt.items.forEach(item => {
    // Main item line with quantity and name
    lines.push(`${item.quantity}  ${item.name}`);
    
    // Show variation as a bullet point
    if (item.variation) {
      lines.push(`    • ${item.variation}`);
    }
    
    // Show addons as bullet points
    if (item.addons.length > 0) {
      item.addons.forEach(addon => {
        lines.push(`    • ${addon}`);
      });
    }
    
    lines.push('');
  });
  
  // Special instructions
  if (receipt.specialInstructions.length > 0) {
    lines.push(line('-'));
    lines.push('⚠️  SPECIAL INSTRUCTIONS:');
    receipt.specialInstructions.forEach(instruction => {
      lines.push(`   • ${instruction}`);
    });
    lines.push('');
  }
  
  lines.push(line('-'));
  
  // Pricing breakdown
  lines.push(leftRight('Subtotal:', formatCurrency(receipt.subtotal)));
  
  // Always show delivery fee for delivery orders (even if 0, to highlight the issue)
  if (receipt.orderType === 'delivery') {
    lines.push(leftRight('Delivery Fee:', formatCurrency(receipt.deliveryFee)));
  }
  
  if (receipt.tax > 0) {
    lines.push(leftRight('Tax (7.5%):', formatCurrency(receipt.tax)));
  }
  
  if (receipt.discount > 0) {
    lines.push('');
    if (receipt.promoCode) {
      lines.push(`Discount Applied: ${receipt.promoCode}`);
    }
    lines.push(leftRight('Discount Applied', `-${formatCurrency(receipt.discount)}`));
  }
  
  lines.push(line('='));
  lines.push(leftRight('TOTAL:', formatCurrency(receipt.total)));
  lines.push(line('='));
  lines.push('');
  
  // Payment status
  lines.push(`Payment: ${receipt.paymentStatus} (${receipt.paymentMethod})`);
  lines.push('');
  
  // Kitchen prep time (subtle for customer)
  lines.push(line('-'));
  if (receipt.estimatedPrepTime) {
    lines.push(center(`Prep Time: ~${receipt.estimatedPrepTime} min`));
  }
  lines.push(line('-'));
  lines.push('');
  
  // Marketing copy and thank you message
  lines.push(center('Thank You!'));
  lines.push('');
  lines.push(center('We appreciate your order!'));
  lines.push(center('Enjoy authentic Nigerian flavors'));
  lines.push(center('made with love.'));
  lines.push('');
  lines.push(line('-'));
  lines.push(center('Order again: www.jollofexpress.ng'));
  lines.push(center('Follow us @jollofexpress'));
  lines.push('');
  lines.push(center('REFER A FRIEND & GET 10% OFF!'));
  lines.push(line('='));

  return lines.join('\n');
}

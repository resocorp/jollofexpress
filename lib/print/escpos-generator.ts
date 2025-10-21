/**
 * ESC/POS Command Generator for 80mm Thermal Printers
 * Generates raw ESC/POS commands for thermal receipt printers
 */

import type { ReceiptData } from './format-receipt';

// ESC/POS Command Constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';
const CUT = GS + 'V' + '\x41' + '\x00'; // Partial cut

// Alignment
const ALIGN_LEFT = ESC + 'a' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_RIGHT = ESC + 'a' + '\x02';

// Text Size & Style
const NORMAL = ESC + '!' + '\x00';
const BOLD = ESC + '!' + '\x08';
const DOUBLE_HEIGHT = ESC + '!' + '\x10';
const DOUBLE_WIDTH = ESC + '!' + '\x20';
const LARGE = ESC + '!' + '\x30'; // Double height + double width

// Character encoding
const CHAR_SET_USA = ESC + 'R' + '\x00';

// Line spacing
const LINE_SPACING_DEFAULT = ESC + '2'; // Default line spacing
const LINE_SPACING_NARROW = ESC + '3' + '\x10'; // Narrow spacing

/**
 * Generate ESC/POS commands from receipt data
 */
export function generateESCPOS(receipt: ReceiptData): Buffer {
  const commands: string[] = [];
  
  // Initialize printer
  commands.push(ESC + '@'); // Initialize
  commands.push(CHAR_SET_USA); // Set character set
  commands.push(LINE_SPACING_NARROW); // Narrow line spacing
  
  // Header
  commands.push(ALIGN_CENTER);
  commands.push(LARGE);
  commands.push('JOLLOF EXPRESS' + LF);
  commands.push(NORMAL);
  commands.push(line('=', 48) + LF);
  commands.push(LF);
  
  // Order info
  commands.push(ALIGN_LEFT);
  commands.push(BOLD);
  commands.push(`Order: ${receipt.orderNumber}` + LF);
  commands.push(NORMAL);
  commands.push(`Date: ${receipt.orderDate} ${receipt.orderTime}` + LF);
  commands.push(line('-', 48) + LF);
  commands.push(LF);
  
  // Customer details
  commands.push(BOLD);
  commands.push('CUSTOMER DETAILS' + LF);
  commands.push(NORMAL);
  commands.push(`Name: ${receipt.customerName}` + LF);
  commands.push(`Phone: ${receipt.customerPhone}` + LF);
  if (receipt.customerPhoneAlt) {
    commands.push(`Alt: ${receipt.customerPhoneAlt}` + LF);
  }
  commands.push(`Type: ${receipt.orderType.toUpperCase()}` + LF);
  commands.push(LF);
  
  // Delivery address
  if (receipt.orderType === 'delivery' && receipt.deliveryAddress) {
    commands.push(BOLD);
    commands.push('DELIVERY ADDRESS' + LF);
    commands.push(NORMAL);
    if (receipt.deliveryCity) {
      commands.push(receipt.deliveryCity + LF);
    }
    commands.push(receipt.deliveryAddress + LF);
    if (receipt.addressType) {
      commands.push(`Type: ${receipt.addressType}` + LF);
    }
    if (receipt.unitNumber) {
      commands.push(`Unit: ${receipt.unitNumber}` + LF);
    }
    if (receipt.deliveryInstructions) {
      commands.push(LF);
      commands.push(BOLD + 'Delivery Instructions:' + NORMAL + LF);
      commands.push(receipt.deliveryInstructions + LF);
    }
    commands.push(LF);
  }
  
  // Items section
  commands.push(line('-', 48) + LF);
  commands.push(BOLD);
  commands.push('ITEMS' + LF);
  commands.push(NORMAL);
  commands.push(line('-', 48) + LF);
  
  // Items
  receipt.items.forEach(item => {
    commands.push(`${item.quantity}x ${item.name}` + LF);
    if (item.variation) {
      commands.push(`   • ${item.variation}` + LF);
    }
    if (item.addons.length > 0) {
      commands.push(`   • Add-ons: ${item.addons.join(', ')}` + LF);
    }
    // Price aligned right
    const priceStr = formatCurrency(item.price);
    commands.push(padRight('', priceStr, 48) + LF);
    commands.push(LF);
  });
  
  // Special instructions
  if (receipt.specialInstructions.length > 0) {
    commands.push(line('-', 48) + LF);
    commands.push(BOLD);
    commands.push('⚠️  SPECIAL INSTRUCTIONS:' + LF);
    commands.push(NORMAL);
    receipt.specialInstructions.forEach(instruction => {
      commands.push(`   • ${instruction}` + LF);
    });
    commands.push(LF);
  }
  
  // Totals
  commands.push(line('-', 48) + LF);
  commands.push(padRight('Subtotal:', formatCurrency(receipt.subtotal), 48) + LF);
  if (receipt.deliveryFee > 0) {
    commands.push(padRight('Delivery Fee:', formatCurrency(receipt.deliveryFee), 48) + LF);
  }
  if (receipt.discount > 0) {
    commands.push(padRight('Discount:', `-${formatCurrency(receipt.discount)}`, 48) + LF);
  }
  commands.push(line('=', 48) + LF);
  commands.push(BOLD);
  commands.push(DOUBLE_HEIGHT);
  commands.push(padRight('TOTAL:', formatCurrency(receipt.total), 48) + LF);
  commands.push(NORMAL);
  commands.push(line('=', 48) + LF);
  commands.push(LF);
  
  // Payment status
  commands.push(`Payment: ${receipt.paymentStatus} (${receipt.paymentMethod})` + LF);
  commands.push(LF);
  
  // Kitchen instructions
  commands.push(line('-', 48) + LF);
  commands.push(ALIGN_CENTER);
  commands.push(BOLD);
  commands.push(DOUBLE_HEIGHT);
  commands.push('Kitchen - Start Prep Now!' + LF);
  commands.push(NORMAL);
  if (receipt.estimatedPrepTime) {
    commands.push(`Estimated Time: ${receipt.estimatedPrepTime} min` + LF);
  }
  commands.push(line('=', 48) + LF);
  
  // Feed and cut
  commands.push(LF + LF + LF);
  commands.push(CUT);
  
  // Convert to buffer
  return Buffer.from(commands.join(''), 'binary');
}

/**
 * Format currency (₦)
 */
function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate a line of repeated characters
 */
function line(char: string, width: number): string {
  return char.repeat(width);
}

/**
 * Pad text with right-aligned value
 */
function padRight(left: string, right: string, width: number): string {
  const spacing = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spacing) + right;
}

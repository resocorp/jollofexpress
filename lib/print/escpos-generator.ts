/**
 * ESC/POS Command Generator for 80mm Thermal Printers
 * Generates raw ESC/POS commands for thermal receipt printers
 */

import type { ReceiptData } from './format-receipt';

// ESC/POS Command Constants (Tested with printer at 192.168.100.160)
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';
const CUT = GS + 'V' + '\x00'; // Full cut (tested working)

// Alignment
const ALIGN_LEFT = ESC + 'a' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_RIGHT = ESC + 'a' + '\x02';

// Text Size (using 1B 21 XX - tested working)
const NORMAL = ESC + '!' + '\x00';
const DOUBLE_HEIGHT = ESC + '!' + '\x10';
const DOUBLE_WIDTH = ESC + '!' + '\x20';
const LARGE = ESC + '!' + '\x30'; // Double height + double width

// Text Style (using 1B 45 XX - tested working)
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';

// Additional styles (tested working)
const UNDERLINE_ON = ESC + '-' + '\x01';
const UNDERLINE_OFF = ESC + '-' + '\x00';
const INVERTED_ON = GS + 'B' + '\x01';
const INVERTED_OFF = GS + 'B' + '\x00';

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
  
  // Order info - Make order number prominent
  commands.push(ALIGN_CENTER);
  commands.push(BOLD_ON);
  commands.push(LARGE);
  commands.push(`ORDER #${receipt.orderNumber}` + LF);
  commands.push(NORMAL);
  commands.push(BOLD_OFF);
  commands.push(LF);
  commands.push(ALIGN_LEFT);
  commands.push(`Date: ${receipt.orderDate} ${receipt.orderTime}` + LF);
  commands.push(line('-', 48) + LF);
  commands.push(LF);
  
  // Customer details
  commands.push(BOLD_ON);
  commands.push('CUSTOMER DETAILS' + LF);
  commands.push(BOLD_OFF);
  commands.push(`Name: ${receipt.customerName}` + LF);
  commands.push(`Phone: ${receipt.customerPhone}` + LF);
  if (receipt.customerPhoneAlt) {
    commands.push(`Alt: ${receipt.customerPhoneAlt}` + LF);
  }
  commands.push(`Type: ${receipt.orderType.toUpperCase()}` + LF);
  commands.push(LF);
  
  // Delivery address
  if (receipt.orderType === 'delivery' && receipt.deliveryAddress) {
    commands.push(BOLD_ON);
    commands.push('DELIVERY ADDRESS' + LF);
    commands.push(BOLD_OFF);
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
      commands.push(BOLD_ON + 'Delivery Instructions:' + BOLD_OFF + LF);
      commands.push(receipt.deliveryInstructions + LF);
    }
    commands.push(LF);
  }
  
  // Items section
  commands.push(line('-', 48) + LF);
  commands.push(BOLD_ON);
  commands.push('ITEMS' + LF);
  commands.push(BOLD_OFF);
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
    commands.push(BOLD_ON);
    commands.push('⚠️  SPECIAL INSTRUCTIONS:' + LF);
    commands.push(BOLD_OFF);
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
  commands.push(BOLD_ON);
  commands.push(DOUBLE_HEIGHT);
  commands.push(padRight('TOTAL:', formatCurrency(receipt.total), 48) + LF);
  commands.push(BOLD_OFF);
  commands.push(NORMAL);
  commands.push(line('=', 48) + LF);
  commands.push(LF);
  
  // Payment status
  commands.push(`Payment: ${receipt.paymentStatus} (${receipt.paymentMethod})` + LF);
  commands.push(LF);
  
  // Kitchen prep time (subtle for customer)
  commands.push(line('-', 48) + LF);
  commands.push(ALIGN_CENTER);
  if (receipt.estimatedPrepTime) {
    commands.push(`Prep Time: ~${receipt.estimatedPrepTime} min` + LF);
  }
  commands.push(line('-', 48) + LF);
  commands.push(LF);
  
  // Marketing copy and thank you message
  commands.push(BOLD_ON);
  commands.push(DOUBLE_HEIGHT);
  commands.push('Thank You!' + LF);
  commands.push(BOLD_OFF);
  commands.push(NORMAL);
  commands.push(LF);
  commands.push('We appreciate your order!' + LF);
  commands.push('Enjoy authentic Nigerian flavors' + LF);
  commands.push('made with love.' + LF);
  commands.push(LF);
  commands.push(line('-', 48) + LF);
  commands.push('Order again: www.jollofexpress.app' + LF);
  commands.push('Follow us @jollofexpress' + LF);
  commands.push(LF);
  commands.push(BOLD_ON);
  commands.push('REFER A FRIEND & GET 10% OFF!' + LF);
  commands.push(BOLD_OFF);
  commands.push(line('=', 48) + LF);
  
  // Feed and cut
  commands.push(LF + LF + LF);
  commands.push(CUT);
  
  // Convert to buffer
  return Buffer.from(commands.join(''), 'binary');
}

/**
 * Format currency with naira sign (₦)
 */
function formatCurrency(amount: number): string {
  // Format with proper thousands separator and 2 decimal places
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₦${formatted}`;
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

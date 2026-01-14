// WhatsApp Menu Formatter - Formats menu and responses for WhatsApp display

import { createServiceClient } from '@/lib/supabase/service';
import { formatCurrency } from '@/lib/formatters';
import type { 
  MenuCategory, 
  MenuItem, 
  CartItem, 
  WhatsAppSession,
  CategoryItem,
  AddonOption,
  OrderSummary,
  ReturningCustomerData
} from './types';

const EMOJI = {
  welcome: '👋',
  menu: '📋',
  category: '📂',
  item: '🍽️',
  cart: '🛒',
  money: '💰',
  delivery: '🚚',
  location: '📍',
  time: '⏰',
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  star: '⭐',
  fire: '🔥',
  phone: '📞',
  link: '🔗',
  back: '⬅️',
  forward: '➡️',
  numbers: ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
};

/**
 * Fetch menu categories with items from database
 */
export async function fetchMenu(): Promise<MenuCategory[]> {
  const supabase = createServiceClient();
  
  // Fetch categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name, description, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (!categories || categories.length === 0) {
    return [];
  }
  
  // Fetch items
  const categoryIds = categories.map(c => c.id);
  const { data: items } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, base_price, image_url')
    .in('category_id', categoryIds)
    .eq('is_available', true)
    .order('display_order', { ascending: true });
  
  // Fetch variations
  const itemIds = items?.map(i => i.id) || [];
  const { data: variations } = await supabase
    .from('item_variations')
    .select('*')
    .in('item_id', itemIds);
  
  // Fetch addons
  const { data: addons } = await supabase
    .from('item_addons')
    .select('*')
    .in('item_id', itemIds)
    .eq('is_available', true);
  
  // Build menu structure
  return categories.map(category => ({
    ...category,
    items: (items || [])
      .filter(item => item.category_id === category.id)
      .map(item => ({
        ...item,
        variations: (variations || []).filter(v => v.item_id === item.id),
        addons: (addons || []).filter(a => a.item_id === item.id),
      })),
  }));
}

/**
 * Fetch delivery regions
 */
export async function fetchDeliveryRegions(): Promise<{ id: string; name: string; delivery_fee: number; free_delivery_threshold?: number }[]> {
  const supabase = createServiceClient();
  
  const { data } = await supabase
    .from('delivery_regions')
    .select('id, name, delivery_fee, free_delivery_threshold')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  return data || [];
}

/**
 * Get restaurant status and operating hours
 */
export async function getRestaurantStatus(): Promise<{
  isOpen: boolean;
  message?: string;
  nextOpenTime?: string;
}> {
  const supabase = createServiceClient();
  
  // Get order settings
  const { data: orderSettings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'order_settings')
    .single();
  
  // Get operating hours
  const { data: hoursSettings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'operating_hours')
    .single();
  
  const isManuallyOpen = orderSettings?.value?.is_open ?? true;
  
  if (!isManuallyOpen) {
    return {
      isOpen: false,
      message: 'Restaurant is currently closed',
    };
  }
  
  // Check operating hours
  const hours = hoursSettings?.value;
  if (hours) {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];
    const todayHours = hours[today];
    
    if (todayHours?.closed) {
      // Find next open day
      for (let i = 1; i <= 7; i++) {
        const nextDay = dayNames[(now.getDay() + i) % 7];
        const nextHours = hours[nextDay];
        if (nextHours && !nextHours.closed) {
          return {
            isOpen: false,
            message: `Closed today`,
            nextOpenTime: `${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)} at ${nextHours.open}`,
          };
        }
      }
    }
    
    if (todayHours?.open && todayHours?.close) {
      const [openHour, openMin] = todayHours.open.split(':').map(Number);
      const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      
      if (currentMinutes < openMinutes) {
        return {
          isOpen: false,
          message: `Opens at ${todayHours.open}`,
          nextOpenTime: todayHours.open,
        };
      }
      
      if (currentMinutes >= closeMinutes) {
        return {
          isOpen: false,
          message: `Closed for today (closes at ${todayHours.close})`,
        };
      }
    }
  }
  
  return { isOpen: true };
}

// ============================================
// MESSAGE FORMATTERS
// ============================================

/**
 * Format welcome message
 */
export function formatWelcomeMessage(customerName?: string, isReturning?: boolean): string {
  const greeting = customerName 
    ? `${EMOJI.welcome} Welcome back, *${customerName}*!`
    : `${EMOJI.welcome} Welcome to *Ur' Shawarma Express*!`;
  
  const tagline = isReturning
    ? `Great to see you again! Ready for another delicious meal?`
    : `Fresh shawarma & more, delivered hot to your door! 🌯`;
  
  let message = `${greeting}\n\n${tagline}\n\n`;
  
  if (isReturning) {
    message += `🔄 *REORDER* - Repeat your last order\n`;
  }
  message += `📋 *MENU* - Browse our menu\n`;
  message += `❓ *HELP* - View all commands`;
  
  return message;
}

/**
 * Format menu categories
 */
export function formatCategoriesMessage(categories: MenuCategory[]): string {
  let message = `${EMOJI.menu} *UR' SHAWARMA EXPRESS MENU*\n\n`;
  message += `Select a category:\n\n`;
  
  categories.forEach((cat, index) => {
    const num = index + 1;
    message += `*${num}.* ${cat.name}`;
    if (cat.description) {
      message += ` - _${cat.description}_`;
    }
    message += '\n';
  });
  
  message += `\n─────────────────`;
  message += `\nReply with the *number* to view items`;
  message += `\n\n${EMOJI.cart} Type *CART* to view your cart`;
  
  return message;
}

/**
 * Format category items
 */
export function formatCategoryItemsMessage(
  categoryName: string,
  items: MenuItem[]
): { message: string; categoryItems: CategoryItem[] } {
  let message = `${EMOJI.category} *${categoryName.toUpperCase()}*\n\n`;
  
  const categoryItems: CategoryItem[] = [];
  
  items.forEach((item, index) => {
    const num = index + 1;
    const hasVariations = item.variations && item.variations.length > 0;
    const hasAddons = item.addons && item.addons.length > 0;
    
    categoryItems.push({
      index: num,
      id: item.id,
      name: item.name,
      description: item.description,
      base_price: item.base_price,
      has_variations: hasVariations,
      has_addons: hasAddons,
    });
    
    message += `*${num}.* ${item.name} - ${formatCurrency(item.base_price)}`;
    if (item.description) {
      message += `\n    _${item.description}_`;
    }
    if (hasVariations) {
      message += ` 📐`;
    }
    if (hasAddons) {
      message += ` ➕`;
    }
    message += '\n\n';
  });
  
  message += `─────────────────`;
  message += `\nReply with *number(s)* to add items`;
  message += `\n(e.g., "1" or "1, 2, 3")`;
  message += `\n\n${EMOJI.back} Type *BACK* for categories`;
  message += `\n${EMOJI.cart} Type *CART* to view cart`;
  
  return { message, categoryItems };
}

/**
 * Format variation selection message
 */
export function formatVariationMessage(
  itemName: string,
  variationName: string,
  options: { name: string; price_adjustment: number }[]
): string {
  let message = `${EMOJI.item} *${itemName}*\n\n`;
  message += `Choose your *${variationName}*:\n\n`;
  
  options.forEach((opt, index) => {
    const priceText = opt.price_adjustment > 0 
      ? ` (+${formatCurrency(opt.price_adjustment)})`
      : opt.price_adjustment < 0 
        ? ` (${formatCurrency(opt.price_adjustment)})`
        : '';
    message += `*${index + 1}.* ${opt.name}${priceText}\n`;
  });
  
  message += `\n${EMOJI.back} Type *BACK* to cancel`;
  
  return message;
}

/**
 * Format addons selection message
 */
export function formatAddonsMessage(
  itemName: string,
  addons: { id: string; name: string; price: number }[]
): { message: string; addonOptions: AddonOption[] } {
  let message = `${EMOJI.item} *${itemName}*\n\n`;
  message += `➕ *Add extras?*\n\n`;
  
  const addonOptions: AddonOption[] = [];
  
  addons.forEach((addon, index) => {
    const num = index + 1;
    addonOptions.push({
      index: num,
      id: addon.id,
      name: addon.name,
      price: addon.price,
    });
    message += `*${num}.* ${addon.name} (+${formatCurrency(addon.price)})\n`;
  });
  
  message += `\nReply with numbers to add (e.g., "1, 2")`;
  message += `\nOr type *DONE* to skip extras`;
  
  return { message, addonOptions };
}

/**
 * Format quantity confirmation message
 */
export function formatQuantityMessage(itemName: string, price: number): string {
  return `${EMOJI.check} *${itemName}* - ${formatCurrency(price)}

How many would you like?
Reply with a number (1-10)

Or type *BACK* to cancel`;
}

/**
 * Format item added confirmation
 */
export function formatItemAddedMessage(
  itemName: string,
  quantity: number,
  subtotal: number
): string {
  return `${EMOJI.check} Added to cart!

*${quantity}x ${itemName}* - ${formatCurrency(subtotal)}

${EMOJI.forward} Continue shopping or type *CART* to review`;
}

/**
 * Format cart message
 */
export function formatCartMessage(cart: CartItem[], subtotal: number): string {
  if (cart.length === 0) {
    return `${EMOJI.cart} *YOUR CART IS EMPTY*

Type *MENU* to browse our menu`;
  }
  
  let message = `${EMOJI.cart} *YOUR CART*\n\n`;
  
  cart.forEach((item, index) => {
    message += `• ${item.quantity}x ${item.item_name}`;
    if (item.selected_variation) {
      message += ` (${item.selected_variation.option})`;
    }
    message += ` - ${formatCurrency(item.subtotal)}\n`;
    
    if (item.selected_addons && item.selected_addons.length > 0) {
      item.selected_addons.forEach(addon => {
        message += `  + ${addon.name}\n`;
      });
    }
  });
  
  message += `\n─────────────────`;
  message += `\n*Subtotal:* ${formatCurrency(subtotal)}`;
  message += `\n─────────────────`;
  message += `\n\n${EMOJI.check} *CHECKOUT* - Proceed to order`;
  message += `\n${EMOJI.menu} *MENU* - Add more items`;
  message += `\n${EMOJI.cross} *CLEAR* - Empty cart`;
  
  return message;
}

/**
 * Format delivery regions selection
 */
export function formatRegionsMessage(
  regions: { id: string; name: string; delivery_fee: number; free_delivery_threshold?: number }[],
  subtotal: number
): string {
  let message = `${EMOJI.location} *SELECT YOUR DELIVERY AREA*\n\n`;
  
  regions.forEach((region, index) => {
    const num = index + 1;
    const isFreeDelivery = region.free_delivery_threshold && subtotal >= region.free_delivery_threshold;
    
    if (isFreeDelivery) {
      message += `*${num}.* ${region.name} - ~${formatCurrency(region.delivery_fee)}~ *FREE!* 🎉\n`;
    } else {
      message += `*${num}.* ${region.name} - ${formatCurrency(region.delivery_fee)}\n`;
      if (region.free_delivery_threshold) {
        const amountNeeded = region.free_delivery_threshold - subtotal;
        if (amountNeeded > 0 && amountNeeded < 5000) {
          message += `   _Add ${formatCurrency(amountNeeded)} for free delivery_\n`;
        }
      }
    }
  });
  
  message += `\nReply with the *number* of your area`;
  message += `\n\n${EMOJI.back} Type *BACK* to return to cart`;
  
  return message;
}

/**
 * Format address collection message
 */
export function formatAddressRequestMessage(): string {
  return `${EMOJI.location} *DELIVERY ADDRESS*

Please send your delivery address with a landmark.

You can either:
1️⃣ *Type* your full address
   _(e.g., "10 Ecwa Road, near Total Filling Station, Awka")_

2️⃣ *Share your location* using WhatsApp's location feature 📍
   _(Tap the + button → Location → Send your current location)_`;
}

/**
 * Format returning customer location confirmation
 */
export function formatLocationConfirmationMessage(
  customerData: ReturningCustomerData
): string {
  let message = `${EMOJI.location} *CONFIRM YOUR LOCATION*\n\n`;
  message += `Last delivery address:\n`;
  message += `*${customerData.last_address}*`;
  
  if (customerData.last_region_name) {
    message += `\n_(${customerData.last_region_name})_`;
  }
  
  message += `\n\nIs this correct?`;
  message += `\n\n*YES* - Use this address`;
  message += `\n*NO* - Enter new address`;
  
  return message;
}

/**
 * Format name collection message
 */
export function formatNameRequestMessage(): string {
  return `${EMOJI.check} Great! Just a few more details.

What name should we put on the order?`;
}

/**
 * Format order summary for confirmation
 */
export function formatOrderSummaryMessage(
  cart: CartItem[],
  summary: OrderSummary,
  customerName: string,
  address: string
): string {
  let message = `${EMOJI.check} *ORDER SUMMARY*\n\n`;
  
  // Items
  cart.forEach(item => {
    message += `• ${item.quantity}x ${item.item_name}`;
    if (item.selected_variation) {
      message += ` (${item.selected_variation.option})`;
    }
    message += ` - ${formatCurrency(item.subtotal)}\n`;
  });
  
  message += `\n─────────────────`;
  message += `\nSubtotal: ${formatCurrency(summary.subtotal)}`;
  message += `\nDelivery (${summary.region_name}): ${formatCurrency(summary.delivery_fee)}`;
  if (summary.tax > 0) {
    message += `\nVAT: ${formatCurrency(summary.tax)}`;
  }
  message += `\n─────────────────`;
  message += `\n*TOTAL: ${formatCurrency(summary.total)}*`;
  message += `\n─────────────────`;
  
  message += `\n\n${EMOJI.location} *Deliver to:*`;
  message += `\n${address}`;
  message += `\n\n*Name:* ${customerName}`;
  
  message += `\n\n─────────────────`;
  message += `\n${EMOJI.check} Type *YES* to confirm & pay`;
  message += `\n${EMOJI.cross} Type *NO* to cancel`;
  
  return message;
}

/**
 * Format payment link message
 */
export function formatPaymentMessage(
  orderNumber: string,
  total: number,
  paymentUrl: string
): string {
  return `${EMOJI.money} *PAYMENT*

Order #${orderNumber}
Amount: *${formatCurrency(total)}*

${EMOJI.link} Click below to pay securely:
${paymentUrl}

${EMOJI.time} This link expires in 30 minutes.

After payment, you'll receive a confirmation message.`;
}

/**
 * Format order confirmed message
 */
export function formatOrderConfirmedMessage(
  orderNumber: string,
  estimatedTime: number
): string {
  return `${EMOJI.check} *ORDER CONFIRMED!*

Order #${orderNumber}

${EMOJI.time} Estimated delivery: *${estimatedTime} minutes*

You'll receive updates as your order is prepared and delivered.

Thank you for ordering with Ur' Shawarma Express! ${EMOJI.fire}`;
}

/**
 * Format restaurant closed message
 */
export function formatClosedMessage(nextOpenTime?: string): string {
  let message = `${EMOJI.time} *We're Currently Closed*\n\n`;
  
  if (nextOpenTime) {
    message += `We'll reopen: *${nextOpenTime}*\n\n`;
  }
  
  message += `${EMOJI.check} *Good news!* You can still place your order now.\n`;
  message += `Your order will be prepared and delivered when we reopen.\n\n`;
  message += `Type *MENU* to browse and order ahead!`;
  
  return message;
}

/**
 * Format help message
 */
export function formatHelpMessage(): string {
  return `${EMOJI.menu} *UR' SHAWARMA EXPRESS COMMANDS*

*MENU* - Browse our menu
*CART* - View your cart
*REORDER* - Repeat your last order
*CHECKOUT* - Proceed to payment
*CLEAR* - Empty your cart
*BACK* - Go to previous screen
*HELP* - Show this message

${EMOJI.location} You can share your WhatsApp location for delivery!

Need help? Call us: +234 810 682 8147`;
}

/**
 * Format error message
 */
export function formatErrorMessage(context?: string): string {
  let message = `${EMOJI.warning} Sorry, I didn't understand that.\n\n`;
  
  if (context) {
    message += `${context}\n\n`;
  }
  
  message += `Type *HELP* for available commands.`;
  
  return message;
}

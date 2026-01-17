// WhatsApp Conversation Handler V2 - Enhanced UX with images and better cart management
// Flow: Hi → Menu → Select Item → More/Checkout → Details (name+address+notes) → Payment

import { createServiceClient } from '@/lib/supabase/service';
import {
  getOrCreateSession,
  updateSession,
  clearSessionCart,
  resetSession,
  setPendingOrder,
  getReturningCustomerData,
  getLastOrderItems,
  logMessage,
} from './session-manager';
import { parseCommand } from './message-parser';
import type {
  WhatsAppSession,
  ParsedMessage,
  ParsedCommand,
  CartItem,
  WhatsAppResponse,
} from './types';

// Helper to create text response
const text = (message: string): WhatsAppResponse => ({ type: 'text', message });

// Helper to create image response
const image = (imageUrl: string, caption?: string): WhatsAppResponse => ({ 
  type: 'image', 
  imageUrl, 
  caption 
});

// Settings types for checkout
interface CheckoutSettings {
  deliveryFee: number;
  minOrder: number;
  taxRate: number; // percentage (e.g., 7.5 for 7.5%)
  deliveryEnabled: boolean;
}

// Fetch delivery and payment settings from database
async function getCheckoutSettings(): Promise<CheckoutSettings> {
  const supabase = createServiceClient();
  
  // Fetch both settings in parallel
  const [deliveryResult, paymentResult] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'delivery_settings').single(),
    supabase.from('settings').select('value').eq('key', 'payment_settings').single(),
  ]);
  
  const deliverySettings = deliveryResult.data?.value as { 
    enabled?: boolean; 
    delivery_fee?: number; 
    min_order?: number;
  } | null;
  
  const paymentSettings = paymentResult.data?.value as { 
    tax_rate?: number;
  } | null;
  
  return {
    deliveryFee: deliverySettings?.delivery_fee ?? 500,
    minOrder: deliverySettings?.min_order ?? 0,
    taxRate: paymentSettings?.tax_rate ?? 0,
    deliveryEnabled: deliverySettings?.enabled ?? true,
  };
}

// Simplified types for menu (matches DB structure)
interface SimpleMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  variations?: { id: string; name: string; option: string; price_adjustment: number }[];
}

interface SimpleMenuCategory {
  id: string;
  name: string;
  description?: string;
  items: SimpleMenuItem[];
}

const TAX_RATE = 0; // No tax for simplicity

/**
 * Main entry point - handle incoming message
 */
export async function handleIncomingMessage(
  message: ParsedMessage
): Promise<WhatsAppResponse[]> {
  const session = await getOrCreateSession(message.phone);
  
  // Log inbound message
  await logMessage(
    session.id,
    message.phone,
    'inbound',
    message.text || 'Unknown',
    { messageType: message.type, stateBefore: session.state }
  );
  
  // Parse command
  const command = parseCommand(message.text || '');
  
  // Handle global commands
  const globalResponse = await handleGlobalCommands(session, command);
  if (globalResponse) return globalResponse;
  
  // Route by state
  return await routeByState(session, command);
}

/**
 * Global commands that work anywhere
 */
async function handleGlobalCommands(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[] | null> {
  switch (command.type) {
    case 'HELP':
      return [text(getHelpMessage())];
    
    case 'MENU':
      await updateSession(session.id, {
        state: 'BROWSING_MENU',
        selected_category_id: null,
        message_context: {},
      });
      return await showMenu(session);
    
    case 'CART':
      return [text(getCartMessage(session.cart))];
    
    case 'CLEAR':
      await clearSessionCart(session.id);
      return [text('🗑️ Cart cleared!\n\nType *MENU* to order.')];
    
    case 'CANCEL':
      await resetSession(session.id);
      return [text('Order cancelled. Type *MENU* to start again.')];
    
    case 'REORDER':
      return await handleReorder(session);
    
    case 'CHECKOUT':
      return await startCheckout(session);
    
    // Quick number shortcuts (only when cart has items)
    case 'NUMBER_SELECTION':
      if (session.cart.length > 0) {
        const num = Array.isArray(command.value) ? command.value[0] : command.value;
        if (num === 0) {
          await clearSessionCart(session.id);
          return [text('🗑️ Cart cleared!\n\nType *MENU* to order.')];
        }
        if (num === 1 && session.state !== 'BROWSING_MENU' && session.state !== 'VIEWING_CATEGORY') {
          await updateSession(session.id, { state: 'BROWSING_MENU' });
          return await showMenu(session);
        }
        if (num === 2) {
          return await startCheckout(session);
        }
      }
      return null;
    
    default:
      return null;
  }
}

/**
 * Route to state handler
 */
async function routeByState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  switch (session.state) {
    case 'IDLE':
      return await handleIdle(session, command);
    
    case 'BROWSING_MENU':
      return await handleBrowsingMenu(session, command);
    
    case 'VIEWING_CATEGORY':
      return await handleViewingCategory(session, command);
    
    case 'SELECTING_VARIATIONS':
      return await handleSelectingVariations(session, command);
    
    case 'AWAITING_MORE_OR_CHECKOUT':
      return await handleMoreOrCheckout(session, command);
    
    case 'COLLECTING_DETAILS':
      return await handleCollectingDetails(session, command);
    
    case 'PAYMENT_PENDING':
      return [text('⏳ Please complete payment using the link sent.\n\nType *MENU* to start a new order.')];
    
    case 'ORDER_COMPLETE':
      await resetSession(session.id);
      return await handleIdle(session, command);
    
    default:
      return await showMenu(session);
  }
}

// ============================================
// STATE HANDLERS
// ============================================

async function handleIdle(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  const returning = await getReturningCustomerData(session.phone);
  
  if (returning) {
    await updateSession(session.id, {
      customer_name: returning.name,
      state: 'BROWSING_MENU',
    });
  } else {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
  }
  
  const welcome = returning
    ? `👋 Welcome back, *${returning.name}*!\n\n🔄 Type *R* to reorder your last order\n📋 Or select from our menu:`
    : `👋 Welcome to *Ur' Shawarma Express*!\n\n🌯 Fresh shawarma & more!\n\nSelect a category:`;
  
  const menu = await getMenuCategories();
  let msg = welcome + '\n\n';
  menu.forEach((cat, i) => {
    msg += `*${i + 1}.* ${cat.name}\n`;
  });
  msg += '\n💡 Reply with number to select';
  
  return [text(msg)];
}

async function handleBrowsingMenu(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  if (command.type === 'NUMBER_SELECTION') {
    const num = Array.isArray(command.value) ? command.value[0] : command.value;
    if (typeof num === 'number') {
      return await selectCategory(session, num);
    }
  }
  return await showMenu(session);
}

async function handleViewingCategory(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMenu(session);
  }
  
  if (command.type === 'NUMBER_SELECTION') {
    const num = Array.isArray(command.value) ? command.value[0] : command.value;
    if (typeof num === 'number') {
      return await selectItem(session, num);
    }
  }
  
  // Show category items again
  return await showCategoryItems(session);
}

async function handleSelectingVariations(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, { state: 'VIEWING_CATEGORY' });
    return await showCategoryItems(session);
  }
  
  if (command.type === 'NUMBER_SELECTION') {
    const num = Array.isArray(command.value) ? command.value[0] : command.value;
    if (typeof num === 'number') {
      return await selectVariation(session, num);
    }
  }
  
  return [text('Please select a variation number.')];
}

async function handleMoreOrCheckout(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  // Handle quantity changes: +1, -1, remove
  const qtyMatch = command.raw.match(/^([+-])?(\d+)$/i);
  if (qtyMatch && session.cart.length > 0) {
    const sign = qtyMatch[1];
    const num = parseInt(qtyMatch[2], 10);
    
    // If it's a cart item index for quantity change
    if (sign === '+' || sign === '-') {
      return await adjustCartQuantity(session, session.cart.length - 1, sign === '+' ? 1 : -1);
    }
  }
  
  // Handle remove command
  if (command.raw.toLowerCase().startsWith('remove ')) {
    const itemNum = parseInt(command.raw.replace(/remove\s*/i, ''), 10);
    if (!isNaN(itemNum) && itemNum >= 1 && itemNum <= session.cart.length) {
      return await removeCartItem(session, itemNum - 1);
    }
  }
  
  // "1" or "MORE" = add more items
  if (command.type === 'NUMBER_SELECTION') {
    const num = Array.isArray(command.value) ? command.value[0] : command.value;
    if (num === 1) {
      await updateSession(session.id, { state: 'BROWSING_MENU' });
      return await showMenu(session);
    }
    if (num === 2) {
      return await startCheckout(session);
    }
  }
  
  if (command.raw.toUpperCase() === 'MORE' || command.raw.toUpperCase() === 'M') {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMenu(session);
  }
  
  if (command.type === 'CHECKOUT' || command.raw.toUpperCase() === 'PAY' || command.raw === '2') {
    return await startCheckout(session);
  }
  
  // Show cart with options
  return [text(getEnhancedCartMessage(session.cart))];
}

async function handleCollectingDetails(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<WhatsAppResponse[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, { state: 'AWAITING_MORE_OR_CHECKOUT' });
    return [text(getCartMessage(session.cart) + '\n\n*1.* Add more\n*2.* Checkout')];
  }
  
  // Parse the details from user message
  const inputText = command.raw.trim();
  
  if (inputText.length < 5) {
    return [text('Please provide your details:\n\n*Name*\n*Address*\n*Notes* (optional)\n\nExample:\n_John Doe_\n_15 Aroma Junction, Awka_\n_Extra pepper please_')];
  }
  
  // Split by newlines or parse as single block
  const lines = inputText.split('\n').map(l => l.trim()).filter(l => l);
  
  let name = '';
  let address = '';
  let notes = '';
  
  if (lines.length >= 2) {
    name = lines[0];
    address = lines[1];
    notes = lines.slice(2).join(' ');
  } else {
    // Single line - try to parse
    const parts = inputText.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      name = parts[0];
      address = parts.slice(1).join(', ');
    } else {
      return [text('Please provide details in this format:\n\n*Name*\n*Address*\n\nExample:\n_John Doe_\n_15 Aroma Junction, near Total, Awka_')];
    }
  }
  
  if (name.length < 2 || address.length < 5) {
    return [text('Please provide:\n- Your *name* (first line)\n- Your *address* (second line)\n\nExample:\n_John_\n_15 Aroma, Awka_')];
  }
  
  // Create order and get payment link
  return await createOrder(session, name, address, notes);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function showMenu(session: WhatsAppSession): Promise<WhatsAppResponse[]> {
  const menu = await getMenuCategories();
  let msg = '📋 *MENU*\n\n';
  menu.forEach((cat, i) => {
    msg += `*${i + 1}.* ${cat.name}\n`;
  });
  msg += '\n💡 Reply with number';
  if (session.cart.length > 0) {
    const total = session.cart.reduce((sum, c) => sum + c.subtotal * c.quantity, 0);
    msg += `\n\n🛒 *Cart: ${session.cart.length} item(s) - ₦${total.toLocaleString()}*`;
    msg += `\nType *CART* to view`;
  }
  return [text(msg)];
}

async function selectCategory(
  session: WhatsAppSession,
  num: number
): Promise<WhatsAppResponse[]> {
  const menu = await getMenuCategories();
  
  if (num < 1 || num > menu.length) {
    return [text(`Please select 1-${menu.length}`)];
  }
  
  const category = menu[num - 1];
  
  await updateSession(session.id, {
    state: 'VIEWING_CATEGORY',
    selected_category_id: category.id,
    message_context: {},
  });
  
  let msg = `📦 *${category.name.toUpperCase()}*\n\n`;
  category.items.forEach((item: SimpleMenuItem, i: number) => {
    msg += `*${i + 1}.* ${item.name} - ₦${item.price.toLocaleString()}\n`;
  });
  msg += '\n💡 Reply with number\n*B* = Back to menu';
  
  return [text(msg)];
}

async function showCategoryItems(session: WhatsAppSession): Promise<WhatsAppResponse[]> {
  const menu = await getMenuCategories();
  const category = menu.find(c => c.id === session.selected_category_id);
  
  if (!category) {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMenu(session);
  }
  
  let msg = `📦 *${category.name.toUpperCase()}*\n\n`;
  category.items.forEach((item: SimpleMenuItem, i: number) => {
    msg += `*${i + 1}.* ${item.name} - ₦${item.price.toLocaleString()}\n`;
  });
  msg += '\n💡 Reply with number\n*B* = Back';
  
  return [text(msg)];
}

async function selectItem(
  session: WhatsAppSession,
  num: number
): Promise<WhatsAppResponse[]> {
  const menu = await getMenuCategories();
  const category = menu.find(c => c.id === session.selected_category_id);
  
  if (!category) {
    return await showMenu(session);
  }
  
  if (num < 1 || num > category.items.length) {
    return [text(`Please select 1-${category.items.length}`)];
  }
  
  const item = category.items[num - 1];
  const responses: WhatsAppResponse[] = [];
  
  // Send item image if available
  if (item.image_url) {
    responses.push(image(item.image_url, `🍽️ *${item.name}*\n${item.description || ''}\n₦${item.price.toLocaleString()}`));
  }
  
  // Check if item has variations
  if (item.variations && item.variations.length > 0) {
    await updateSession(session.id, {
      state: 'SELECTING_VARIATIONS',
      selected_item_id: item.id,
      message_context: {
        ...session.message_context,
        pending_item: item,
      },
    });
    
    let msg = `🍽️ *${item.name.toUpperCase()}*\n\nSelect size/type:\n\n`;
    item.variations.forEach((v: { id: string; name: string; option: string; price_adjustment: number }, i: number) => {
      const price = item.price + (v.price_adjustment || 0);
      msg += `*${i + 1}.* ${v.option} - ₦${price.toLocaleString()}\n`;
    });
    msg += '\n*B* = Back';
    
    responses.push(text(msg));
    return responses;
  }
  
  // No variations - add directly to cart
  return await addToCart(session, item);
}

async function selectVariation(
  session: WhatsAppSession,
  num: number
): Promise<WhatsAppResponse[]> {
  const item = session.message_context.pending_item as SimpleMenuItem;
  
  if (!item || !item.variations) {
    await updateSession(session.id, { state: 'VIEWING_CATEGORY' });
    return await showCategoryItems(session);
  }
  
  if (num < 1 || num > item.variations.length) {
    return [text(`Please select 1-${item.variations.length}`)];
  }
  
  const variation = item.variations[num - 1];
  
  return await addToCart(session, item, variation);
}

async function addToCart(
  session: WhatsAppSession,
  item: SimpleMenuItem,
  variation?: { name: string; option: string; price_adjustment: number }
): Promise<WhatsAppResponse[]> {
  const price = item.price + (variation?.price_adjustment || 0);
  
  const cartItem: CartItem = {
    item_id: item.id,
    item_name: item.name,
    base_price: price,
    quantity: 1,
    selected_variation: variation ? {
      name: variation.name,
      option: variation.option,
      price_adjustment: variation.price_adjustment,
    } : undefined,
    selected_addons: [],
    subtotal: price,
  };
  
  const newCart = [...session.cart, cartItem];
  
  await updateSession(session.id, {
    cart: newCart,
    state: 'AWAITING_MORE_OR_CHECKOUT',
    selected_item_id: null,
    message_context: {},
  });
  
  const itemDesc = variation ? `${item.name} (${variation.option})` : item.name;
  const total = newCart.reduce((sum, c) => sum + c.subtotal * c.quantity, 0);
  
  let msg = `✅ Added *${itemDesc}* to cart!\n\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `🛒 *CART SUMMARY*\n\n`;
  newCart.forEach((c, i) => {
    msg += `${i + 1}. ${c.quantity}x ${c.item_name}`;
    if (c.selected_variation) msg += ` (${c.selected_variation.option})`;
    msg += ` - ₦${(c.subtotal * c.quantity).toLocaleString()}\n`;
  });
  msg += `\n*Total: ₦${total.toLocaleString()}*\n`;
  msg += `━━━━━━━━━━━━━━━\n\n`;
  msg += `👇 *What next?*\n`;
  msg += `*1.* 🍽 Add more items\n`;
  msg += `*2.* 💳 Checkout & Pay\n\n`;
  msg += `💡 Reply with number`;
  
  return [text(msg)];
}

async function startCheckout(session: WhatsAppSession): Promise<WhatsAppResponse[]> {
  if (session.cart.length === 0) {
    return [text('Your cart is empty! Type *MENU* to order.')];
  }
  
  // Fetch settings
  const settings = await getCheckoutSettings();
  
  const subtotal = session.cart.reduce((sum, c) => sum + c.subtotal * c.quantity, 0);
  
  // Validate minimum order amount
  if (settings.minOrder > 0 && subtotal < settings.minOrder) {
    return [text(
      `❌ *Minimum order is ₦${settings.minOrder.toLocaleString()}*\n\n` +
      `Your cart: ₦${subtotal.toLocaleString()}\n` +
      `Add ₦${(settings.minOrder - subtotal).toLocaleString()} more to checkout.\n\n` +
      `Type *MENU* to add more items.`
    )];
  }
  
  // Calculate totals with settings
  const tax = settings.taxRate > 0 ? Math.round(subtotal * settings.taxRate / 100) : 0;
  const deliveryFee = settings.deliveryFee;
  const total = subtotal + tax + deliveryFee;
  
  await updateSession(session.id, { state: 'COLLECTING_DETAILS' });
  
  let msg = '📝 *CHECKOUT*\n\n';
  msg += `Subtotal: ₦${subtotal.toLocaleString()}\n`;
  if (tax > 0) {
    msg += `Tax (${settings.taxRate}%): ₦${tax.toLocaleString()}\n`;
  }
  msg += `Delivery: ₦${deliveryFee.toLocaleString()}\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `*Total: ₦${total.toLocaleString()}*\n\n`;
  msg += 'Send your details:\n\n';
  msg += '*Line 1:* Your name\n';
  msg += '*Line 2:* Delivery address\n';
  msg += '*Line 3:* Notes (optional)\n\n';
  msg += '_Example:_\n';
  msg += '_John Doe_\n';
  msg += '_15 Aroma Junction, Awka_';
  
  return [text(msg)];
}

async function createOrder(
  session: WhatsAppSession,
  name: string,
  address: string,
  notes: string
): Promise<WhatsAppResponse[]> {
  const supabase = createServiceClient();
  
  // Fetch settings for accurate pricing
  const settings = await getCheckoutSettings();
  
  // Calculate totals using settings
  const subtotal = session.cart.reduce((sum, item) => sum + item.subtotal * item.quantity, 0);
  const tax = settings.taxRate > 0 ? Math.round(subtotal * settings.taxRate / 100) : 0;
  const deliveryFee = settings.deliveryFee;
  const total = subtotal + tax + deliveryFee;
  
  // Generate order number
  const orderNumber = `JE${Date.now().toString(36).toUpperCase()}`;
  
  // Create order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: name,
      customer_phone: session.phone,
      delivery_address: address,
      notes: notes || null,
      subtotal,
      delivery_fee: deliveryFee,
      tax,
      total,
      order_type: 'delivery',
      status: 'pending',
      payment_status: 'pending',
      payment_method_type: 'paystack',
      order_source: 'whatsapp',
      whatsapp_session_id: session.id,
    })
    .select()
    .single();
  
  if (error || !order) {
    console.error('Order creation error:', error);
    return [text('❌ Error creating order. Please try again or call +234 810 682 8147')];
  }
  
  // Insert order items
  const orderItems = session.cart.map(item => ({
    order_id: order.id,
    item_id: item.item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.base_price,
    subtotal: item.subtotal * item.quantity,
    selected_variation: item.selected_variation ? {
      name: item.selected_variation.name,
      option: item.selected_variation.option,
      price_adjustment: item.selected_variation.price_adjustment || 0,
    } : null,
  }));
  
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    console.error('❌ Order items insert error:', itemsError);
  }
  
  // Initialize Paystack payment
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?phone=${session.phone}`;
  
  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `${session.phone}@whatsapp.urshawarma.ng`,
        amount: Math.round(total * 100),
        reference: order.id,
        callback_url: callbackUrl,
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          customer_name: name,
          customer_phone: session.phone,
        },
      }),
    });
    
    const paystackData = await paystackRes.json();
    
    if (!paystackData.status || !paystackData.data?.authorization_url) {
      throw new Error('Paystack initialization failed');
    }
    
    // Update order with payment reference
    await supabase
      .from('orders')
      .update({ payment_reference: paystackData.data.reference })
      .eq('id', order.id);
    
    // Update session
    await setPendingOrder(session.id, order.id);
    
    // Send payment link
    let msg = `✅ *ORDER #${orderNumber}*\n\n`;
    msg += `📦 ${session.cart.length} item(s)\n`;
    msg += `📍 ${address}\n`;
    msg += `💰 Total: *₦${total.toLocaleString()}*\n\n`;
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `💳 *PAY NOW:*\n${paystackData.data.authorization_url}\n\n`;
    msg += `⏰ Link expires in 30 mins`;
    
    return [text(msg)];
    
  } catch (err) {
    console.error('Payment init error:', err);
    return [text('❌ Payment error. Please try again or call +234 810 682 8147')];
  }
}

async function handleReorder(session: WhatsAppSession): Promise<WhatsAppResponse[]> {
  const lastOrder = await getLastOrderItems(session.phone);
  
  if (!lastOrder) {
    return [text('No previous orders found. Type *MENU* to order.')];
  }
  
  // Convert to cart
  const cart: CartItem[] = lastOrder.items.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    base_price: item.unit_price,
    quantity: item.quantity,
    selected_variation: item.variation_name ? {
      name: item.variation_name,
      option: item.variation_option || '',
      price_adjustment: 0,
    } : undefined,
    selected_addons: [],
    subtotal: item.unit_price * item.quantity,
  }));
  
  await updateSession(session.id, {
    cart,
    customer_name: lastOrder.customer_name,
    state: 'COLLECTING_DETAILS',
  });
  
  const total = cart.reduce((sum, c) => sum + c.subtotal, 0);
  
  let msg = `🔄 *REORDER*\n\n`;
  cart.forEach(item => {
    msg += `• ${item.quantity}x ${item.item_name}\n`;
  });
  msg += `\nTotal: *₦${total.toLocaleString()}*\n\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `Confirm your details:\n\n`;
  msg += `*Line 1:* Name\n`;
  msg += `*Line 2:* Address\n\n`;
  msg += `_Last address: ${lastOrder.delivery_address}_`;
  
  return [text(msg)];
}

// Cart management helper functions
async function adjustCartQuantity(
  session: WhatsAppSession,
  itemIndex: number,
  change: number
): Promise<WhatsAppResponse[]> {
  if (itemIndex < 0 || itemIndex >= session.cart.length) {
    return [text('Invalid item. Type *CART* to view your cart.')];
  }
  
  const newCart = [...session.cart];
  newCart[itemIndex].quantity += change;
  
  // Remove item if quantity is 0 or less
  if (newCart[itemIndex].quantity <= 0) {
    newCart.splice(itemIndex, 1);
  }
  
  await updateSession(session.id, { cart: newCart });
  
  if (newCart.length === 0) {
    return [text('🗑️ Item removed. Cart is now empty.\n\nType *MENU* to order.')];
  }
  
  const total = newCart.reduce((sum, c) => sum + c.subtotal * c.quantity, 0);
  let msg = `✅ Cart updated!\n\n`;
  msg += getEnhancedCartMessage(newCart);
  
  return [text(msg)];
}

async function removeCartItem(
  session: WhatsAppSession,
  itemIndex: number
): Promise<WhatsAppResponse[]> {
  if (itemIndex < 0 || itemIndex >= session.cart.length) {
    return [text('Invalid item number. Type *CART* to view your cart.')];
  }
  
  const removedItem = session.cart[itemIndex];
  const newCart = session.cart.filter((_, i) => i !== itemIndex);
  
  await updateSession(session.id, { cart: newCart });
  
  if (newCart.length === 0) {
    return [text(`🗑️ Removed *${removedItem.item_name}*. Cart is now empty.\n\nType *MENU* to order.`)];
  }
  
  let msg = `🗑️ Removed *${removedItem.item_name}*\n\n`;
  msg += getEnhancedCartMessage(newCart);
  
  return [text(msg)];
}

function getEnhancedCartMessage(cart: CartItem[]): string {
  if (cart.length === 0) {
    return '🛒 Cart is empty\n\nType *MENU* to order';
  }
  
  let msg = '🛒 *YOUR CART*\n\n';
  let total = 0;
  
  cart.forEach((item, i) => {
    const itemTotal = item.subtotal * item.quantity;
    total += itemTotal;
    msg += `*${i + 1}.* ${item.quantity}x ${item.item_name}`;
    if (item.selected_variation) {
      msg += ` (${item.selected_variation.option})`;
    }
    msg += ` - ₦${itemTotal.toLocaleString()}\n`;
  });
  
  msg += `\n━━━━━━━━━━━━━━━\n`;
  msg += `*Total: ₦${total.toLocaleString()}*\n`;
  msg += `━━━━━━━━━━━━━━━\n\n`;
  msg += `👇 *Options:*\n`;
  msg += `*1.* 🍽 Add more items\n`;
  msg += `*2.* 💳 Checkout & Pay\n\n`;
  msg += `_Edit cart:_\n`;
  msg += `• *+1* - Add 1 more of last item\n`;
  msg += `• *-1* - Remove 1 of last item\n`;
  msg += `• *remove 1* - Remove item #1\n`;
  msg += `• *CLEAR* - Empty cart`;
  
  return msg;
}

function getCartMessage(cart: CartItem[]): string {
  if (cart.length === 0) {
    return '🛒 Cart is empty\n\nType *MENU* to order';
  }
  
  let msg = '🛒 *YOUR CART*\n\n';
  let total = 0;
  
  cart.forEach(item => {
    const itemTotal = item.subtotal * item.quantity;
    total += itemTotal;
    msg += `• ${item.quantity}x ${item.item_name}`;
    if (item.selected_variation) {
      msg += ` (${item.selected_variation.option})`;
    }
    msg += ` - ₦${itemTotal.toLocaleString()}\n`;
  });
  
  msg += `\n*Total: ₦${total.toLocaleString()}*\n\n`;
  msg += `👇 *Quick actions:*\n`;
  msg += `*1.* 🍽 Add more items\n`;
  msg += `*2.* 💳 Checkout & Pay\n`;
  msg += `*0.* 🗑 Clear cart\n\n`;
  msg += `💡 Reply with number`;
  
  return msg;
}

function getHelpMessage(): string {
  return `📋 *COMMANDS*

*MENU* - Browse menu
*CART* - View cart
*R* - Reorder last order
*CHECKOUT* - Pay now
*CLEAR* - Empty cart
*HELP* - This message

📞 Need help? +234 810 682 8147`;
}

async function getMenuCategories(): Promise<SimpleMenuCategory[]> {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('menu_categories')
    .select(`
      id,
      name,
      description,
      menu_items (
        id,
        name,
        description,
        base_price,
        image_url,
        is_available,
        item_variations (
          id,
          variation_name,
          options
        )
      )
    `)
    .eq('is_active', true)
    .order('display_order');
  
  if (error) {
    console.error('❌ Error fetching menu categories:', error);
    return [];
  }
  
  console.log('📋 Menu categories fetched:', data?.length || 0, 'categories');
  
  if (!data) return [];
  
  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    items: (cat.menu_items || [])
      .filter((item: { is_available: boolean }) => item.is_available)
      .map((item: {
        id: string;
        name: string;
        description: string;
        base_price: number;
        image_url?: string;
        item_variations?: { id: string; variation_name: string; options: { name: string; price_adjustment: number }[] }[];
      }) => {
        // Flatten variations from JSONB options array
        const variations: { id: string; name: string; option: string; price_adjustment: number }[] = [];
        if (item.item_variations) {
          item.item_variations.forEach(v => {
            if (v.options && Array.isArray(v.options)) {
              v.options.forEach(opt => {
                variations.push({
                  id: v.id,
                  name: v.variation_name,
                  option: opt.name,
                  price_adjustment: opt.price_adjustment || 0,
                });
              });
            }
          });
        }
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.base_price),
          image_url: item.image_url,
          variations,
        };
      }),
  }));
}

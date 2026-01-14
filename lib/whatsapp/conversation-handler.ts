// WhatsApp Conversation Handler - Main state machine for order flow

import { createServiceClient } from '@/lib/supabase/service';
import {
  getOrCreateSession,
  updateSession,
  updateSessionCart,
  clearSessionCart,
  resetSession,
  setPendingOrder,
  getReturningCustomerData,
  getLastOrderItems,
  logMessage,
} from './session-manager';
import {
  parseCommand,
  parseLocationCommand,
  extractAddress,
} from './message-parser';
import {
  fetchMenu,
  fetchDeliveryRegions,
  getRestaurantStatus,
  formatWelcomeMessage,
  formatCategoriesMessage,
  formatCategoryItemsMessage,
  formatVariationMessage,
  formatAddonsMessage,
  formatQuantityMessage,
  formatItemAddedMessage,
  formatCartMessage,
  formatRegionsMessage,
  formatAddressRequestMessage,
  formatLocationConfirmationMessage,
  formatNameRequestMessage,
  formatOrderSummaryMessage,
  formatPaymentMessage,
  formatOrderConfirmedMessage,
  formatClosedMessage,
  formatHelpMessage,
  formatErrorMessage,
} from './menu-formatter';
import type {
  WhatsAppSession,
  ParsedMessage,
  ParsedCommand,
  BotResponse,
  CartItem,
  MenuCategory,
  MenuItem,
  OrderSummary,
} from './types';

const TAX_RATE = 7.5;

/**
 * Main entry point - handle incoming message
 */
export async function handleIncomingMessage(
  message: ParsedMessage
): Promise<string[]> {
  const session = await getOrCreateSession(message.phone);
  const stateBefore = session.state;
  
  // Log inbound message
  await logMessage(
    session.id,
    message.phone,
    'inbound',
    message.text || (message.location ? 'Location shared' : 'Unknown'),
    {
      messageType: message.type,
      locationLatitude: message.location?.latitude,
      locationLongitude: message.location?.longitude,
      stateBefore,
    }
  );
  
  // Parse command from message
  let command: ParsedCommand;
  if (message.type === 'location' && message.location) {
    command = parseLocationCommand(
      message.location.latitude,
      message.location.longitude,
      message.location.address
    );
  } else {
    command = parseCommand(message.text || '');
  }
  
  // Handle global commands that work in any state
  const globalResponse = await handleGlobalCommands(session, command);
  if (globalResponse) {
    return globalResponse;
  }
  
  // Route to state-specific handler
  const responses = await routeByState(session, command, message);
  
  return responses;
}

/**
 * Handle commands that work in any state
 */
async function handleGlobalCommands(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[] | null> {
  switch (command.type) {
    case 'HELP':
      return [formatHelpMessage()];
    
    case 'MENU':
      // Reset to menu browsing
      await updateSession(session.id, {
        state: 'BROWSING_MENU',
        selected_category_id: null,
        selected_item_id: null,
        message_context: {},
      });
      return await showMainMenu(session);
    
    case 'CART':
      return await showCart(session);
    
    case 'CLEAR':
      await clearSessionCart(session.id);
      return [`🗑️ Cart cleared!\n\nType *MENU* to browse our menu.`];
    
    case 'CANCEL':
      if (session.state === 'PAYMENT_PENDING') {
        // Don't allow cancel during payment
        return [`⚠️ You have a pending payment. Please complete payment or wait for it to expire.`];
      }
      await resetSession(session.id);
      return [`Order cancelled.\n\nType *MENU* to start a new order.`];
    
    case 'REORDER':
      return await handleReorder(session);
    
    default:
      return null;
  }
}

/**
 * Route message to appropriate state handler
 */
async function routeByState(
  session: WhatsAppSession,
  command: ParsedCommand,
  message: ParsedMessage
): Promise<string[]> {
  switch (session.state) {
    case 'IDLE':
      return await handleIdleState(session, command);
    
    case 'BROWSING_MENU':
      return await handleBrowsingMenuState(session, command);
    
    case 'VIEWING_CATEGORY':
      return await handleViewingCategoryState(session, command);
    
    case 'SELECTING_VARIATIONS':
      return await handleSelectingVariationsState(session, command);
    
    case 'SELECTING_ADDONS':
      return await handleSelectingAddonsState(session, command);
    
    case 'CONFIRMING_ITEM':
      return await handleConfirmingItemState(session, command);
    
    case 'CART_REVIEW':
      return await handleCartReviewState(session, command);
    
    case 'COLLECTING_NAME':
      return await handleCollectingNameState(session, command);
    
    case 'CONFIRMING_LOCATION':
      return await handleConfirmingLocationState(session, command);
    
    case 'COLLECTING_ADDRESS':
      return await handleCollectingAddressState(session, command, message);
    
    case 'SELECTING_REGION':
      return await handleSelectingRegionState(session, command);
    
    case 'CONFIRMING_ORDER':
      return await handleConfirmingOrderState(session, command);
    
    case 'PAYMENT_PENDING':
      return await handlePaymentPendingState(session, command);
    
    case 'ORDER_COMPLETE':
      return await handleOrderCompleteState(session, command);
    
    default:
      return await handleIdleState(session, command);
  }
}

// ============================================
// STATE HANDLERS
// ============================================

async function handleIdleState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  // Check if returning customer
  const returningCustomer = await getReturningCustomerData(session.phone);
  
  // Check restaurant status
  const status = await getRestaurantStatus();
  
  const responses: string[] = [];
  
  // Welcome message
  responses.push(formatWelcomeMessage(
    returningCustomer?.name || session.customer_name || undefined,
    !!returningCustomer
  ));
  
  // If closed, show closed message
  if (!status.isOpen) {
    responses.push(formatClosedMessage(status.nextOpenTime));
  }
  
  // Update session with returning customer data
  if (returningCustomer && !session.customer_name) {
    await updateSession(session.id, {
      customer_name: returningCustomer.name,
      delivery_address: returningCustomer.last_address,
      delivery_region_id: returningCustomer.last_region_id,
      customer_latitude: returningCustomer.last_latitude,
      customer_longitude: returningCustomer.last_longitude,
      state: 'BROWSING_MENU',
    });
  } else {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
  }
  
  // Show menu
  const menuResponses = await showMainMenu(session);
  responses.push(...menuResponses);
  
  return responses;
}

async function handleBrowsingMenuState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'NUMBER_SELECTION') {
    const selection = Array.isArray(command.value) ? command.value[0] : command.value;
    if (typeof selection === 'number') {
      return await selectCategory(session, selection);
    }
  }
  
  if (command.type === 'CHECKOUT') {
    return await startCheckout(session);
  }
  
  return [formatErrorMessage('Please select a category number from the menu.')];
}

async function handleViewingCategoryState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, {
      state: 'BROWSING_MENU',
      selected_category_id: null,
      message_context: {},
    });
    return await showMainMenu(session);
  }
  
  if (command.type === 'NUMBER_SELECTION') {
    const selections = Array.isArray(command.value) ? command.value : [command.value];
    return await selectItems(session, selections as number[]);
  }
  
  if (command.type === 'CHECKOUT') {
    return await startCheckout(session);
  }
  
  return [formatErrorMessage('Please select item number(s) or type *BACK*.')];
}

async function handleSelectingVariationsState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, {
      state: 'VIEWING_CATEGORY',
      pending_variation_selection: null,
      message_context: { ...session.message_context, temp_item: undefined },
    });
    return await showCategoryItems(session);
  }
  
  if (command.type === 'NUMBER_SELECTION') {
    const selection = Array.isArray(command.value) ? command.value[0] : command.value;
    if (typeof selection === 'number') {
      return await selectVariation(session, selection);
    }
  }
  
  return [formatErrorMessage('Please select an option number.')];
}

async function handleSelectingAddonsState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'DONE' || command.type === 'NO') {
    return await confirmItemQuantity(session);
  }
  
  if (command.type === 'BACK') {
    await updateSession(session.id, {
      state: 'VIEWING_CATEGORY',
      message_context: { ...session.message_context, temp_item: undefined, selected_addons: undefined },
    });
    return await showCategoryItems(session);
  }
  
  if (command.type === 'NUMBER_SELECTION') {
    const selections = Array.isArray(command.value) ? command.value : [command.value];
    return await selectAddons(session, selections as number[]);
  }
  
  return [formatErrorMessage('Select addon numbers, or type *DONE* to skip.')];
}

async function handleConfirmingItemState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, {
      state: 'VIEWING_CATEGORY',
      message_context: { ...session.message_context, temp_item: undefined },
    });
    return await showCategoryItems(session);
  }
  
  if (command.type === 'NUMBER_SELECTION' || command.type === 'QUANTITY') {
    const qty = typeof command.value === 'number' ? command.value : 1;
    if (qty >= 1 && qty <= 10) {
      return await addItemToCart(session, qty);
    }
    return ['Please enter a quantity between 1 and 10.'];
  }
  
  return [formatErrorMessage('Please enter a quantity (1-10).')];
}

async function handleCartReviewState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'CHECKOUT' || command.type === 'YES') {
    return await startCheckout(session);
  }
  
  if (command.type === 'BACK' || command.type === 'MENU') {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMainMenu(session);
  }
  
  return [formatErrorMessage('Type *CHECKOUT* to proceed or *MENU* to add more.')];
}

async function handleCollectingNameState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'TEXT_INPUT' && typeof command.value === 'string') {
    const name = command.value.trim();
    if (name.length >= 2 && name.length <= 50) {
      await updateSession(session.id, {
        customer_name: name,
      });
      
      // Check if returning customer with saved address
      const returningCustomer = await getReturningCustomerData(session.phone);
      if (returningCustomer?.last_address) {
        await updateSession(session.id, {
          state: 'CONFIRMING_LOCATION',
          delivery_address: returningCustomer.last_address,
          delivery_region_id: returningCustomer.last_region_id,
          customer_latitude: returningCustomer.last_latitude,
          customer_longitude: returningCustomer.last_longitude,
        });
        return [formatLocationConfirmationMessage(returningCustomer)];
      }
      
      // New customer - collect address
      await updateSession(session.id, { state: 'COLLECTING_ADDRESS' });
      return [formatAddressRequestMessage()];
    }
    return ['Please enter a valid name (2-50 characters).'];
  }
  
  if (command.type === 'BACK') {
    return await showCart(session);
  }
  
  return [formatNameRequestMessage()];
}

async function handleConfirmingLocationState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'YES') {
    // Use saved address, proceed to region selection if needed
    if (session.delivery_region_id) {
      await updateSession(session.id, { state: 'CONFIRMING_ORDER' });
      return await showOrderConfirmation(session);
    }
    await updateSession(session.id, { state: 'SELECTING_REGION' });
    return await showRegionSelection(session);
  }
  
  if (command.type === 'NO') {
    await updateSession(session.id, {
      state: 'COLLECTING_ADDRESS',
      delivery_address: null,
      delivery_region_id: null,
      customer_latitude: null,
      customer_longitude: null,
    });
    return [formatAddressRequestMessage()];
  }
  
  return [formatErrorMessage('Type *YES* to use this address or *NO* to enter a new one.')];
}

async function handleCollectingAddressState(
  session: WhatsAppSession,
  command: ParsedCommand,
  message: ParsedMessage
): Promise<string[]> {
  // Handle location pin
  if (command.type === 'LOCATION' && message.location) {
    await updateSession(session.id, {
      customer_latitude: message.location.latitude,
      customer_longitude: message.location.longitude,
      delivery_address: message.location.address || `Location: ${message.location.latitude}, ${message.location.longitude}`,
      state: 'SELECTING_REGION',
    });
    
    return [
      `📍 Location received!`,
      ...(await showRegionSelection(session)),
    ];
  }
  
  // Handle text address
  if (command.type === 'TEXT_INPUT' && typeof command.value === 'string') {
    const address = extractAddress(command.value);
    if (address) {
      await updateSession(session.id, {
        delivery_address: address,
        state: 'SELECTING_REGION',
      });
      return await showRegionSelection(session);
    }
    return [`⚠️ Please provide a more detailed address with a landmark.\n\nExample: "10 Ecwa Road, near Total Filling Station, Awka"`];
  }
  
  if (command.type === 'BACK') {
    return await showCart(session);
  }
  
  return [formatAddressRequestMessage()];
}

async function handleSelectingRegionState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'BACK') {
    await updateSession(session.id, { state: 'COLLECTING_ADDRESS' });
    return [formatAddressRequestMessage()];
  }
  
  if (command.type === 'NUMBER_SELECTION') {
    const selection = Array.isArray(command.value) ? command.value[0] : command.value;
    if (typeof selection === 'number') {
      return await selectRegion(session, selection);
    }
  }
  
  return [formatErrorMessage('Please select your delivery area number.')];
}

async function handleConfirmingOrderState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  if (command.type === 'YES') {
    return await createOrder(session);
  }
  
  if (command.type === 'NO' || command.type === 'BACK') {
    await updateSession(session.id, { state: 'CART_REVIEW' });
    return await showCart(session);
  }
  
  return [formatErrorMessage('Type *YES* to confirm or *NO* to go back.')];
}

async function handlePaymentPendingState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  // Check if order was already paid
  if (session.pending_order_id) {
    const supabase = createServiceClient();
    const { data: order } = await supabase
      .from('orders')
      .select('payment_status, order_number')
      .eq('id', session.pending_order_id)
      .single();
    
    if (order?.payment_status === 'success') {
      await updateSession(session.id, {
        state: 'ORDER_COMPLETE',
        cart: [],
        pending_order_id: null,
      });
      return [formatOrderConfirmedMessage(order.order_number, 30)];
    }
  }
  
  return [`⏳ Awaiting payment...\n\nPlease complete payment using the link sent earlier.\n\nIf you've already paid, please wait a moment for confirmation.`];
}

async function handleOrderCompleteState(
  session: WhatsAppSession,
  command: ParsedCommand
): Promise<string[]> {
  // Any message after order complete starts new session
  await resetSession(session.id);
  return await handleIdleState(session, command);
}

// ============================================
// REORDER FEATURE
// ============================================

async function handleReorder(session: WhatsAppSession): Promise<string[]> {
  const lastOrder = await getLastOrderItems(session.phone);
  
  if (!lastOrder) {
    return [`🔄 *REORDER*\n\nYou don't have any previous orders yet!\n\nType *MENU* to browse our menu and place your first order.`];
  }
  
  // Convert last order items to cart items
  const cartItems: CartItem[] = lastOrder.items.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    base_price: item.unit_price,
    quantity: item.quantity,
    selected_variation: item.variation_name ? {
      name: item.variation_name,
      option: item.variation_option || '',
      price_adjustment: 0,
    } : undefined,
    selected_addons: item.addons || [],
    subtotal: item.unit_price * item.quantity,
  }));
  
  // Update session with cart and customer details
  await updateSession(session.id, {
    cart: cartItems,
    customer_name: lastOrder.customer_name,
    delivery_address: lastOrder.delivery_address,
    delivery_region_id: lastOrder.delivery_region_id,
    customer_latitude: lastOrder.customer_latitude,
    customer_longitude: lastOrder.customer_longitude,
    state: 'CONFIRMING_LOCATION',
  });
  
  // Format reorder confirmation message
  const orderDate = new Date(lastOrder.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  });
  
  let message = `🔄 *REORDER - Last Order (${orderDate})*\n\n`;
  message += `📦 *Items:*\n`;
  
  lastOrder.items.forEach(item => {
    message += `• ${item.quantity}x ${item.item_name}`;
    if (item.variation_option) {
      message += ` (${item.variation_option})`;
    }
    message += `\n`;
  });
  
  message += `\n📍 *Deliver to:*\n${lastOrder.delivery_address}`;
  if (lastOrder.delivery_region_name) {
    message += `\n_(${lastOrder.delivery_region_name})_`;
  }
  
  message += `\n\n─────────────────`;
  message += `\nIs this correct?\n`;
  message += `\n*YES* - Proceed to checkout`;
  message += `\n*NO* - Enter new address`;
  message += `\n*MENU* - Modify order`;
  
  return [message];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function showMainMenu(session: WhatsAppSession): Promise<string[]> {
  const menu = await fetchMenu();
  
  if (menu.length === 0) {
    return ['Sorry, our menu is currently unavailable. Please try again later.'];
  }
  
  return [formatCategoriesMessage(menu)];
}

async function selectCategory(
  session: WhatsAppSession,
  categoryIndex: number
): Promise<string[]> {
  const menu = await fetchMenu();
  
  if (categoryIndex < 1 || categoryIndex > menu.length) {
    return [formatErrorMessage(`Please select a number between 1 and ${menu.length}.`)];
  }
  
  const category = menu[categoryIndex - 1];
  
  if (category.items.length === 0) {
    return ['No items available in this category right now. Please select another.'];
  }
  
  const { message, categoryItems } = formatCategoryItemsMessage(category.name, category.items);
  
  await updateSession(session.id, {
    state: 'VIEWING_CATEGORY',
    selected_category_id: category.id,
    message_context: { category_items: categoryItems },
  });
  
  return [message];
}

async function showCategoryItems(session: WhatsAppSession): Promise<string[]> {
  const menu = await fetchMenu();
  const category = menu.find(c => c.id === session.selected_category_id);
  
  if (!category) {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMainMenu(session);
  }
  
  const { message, categoryItems } = formatCategoryItemsMessage(category.name, category.items);
  
  await updateSession(session.id, {
    message_context: { ...session.message_context, category_items: categoryItems },
  });
  
  return [message];
}

async function selectItems(
  session: WhatsAppSession,
  itemIndices: number[]
): Promise<string[]> {
  const categoryItems = session.message_context.category_items;
  
  if (!categoryItems || categoryItems.length === 0) {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMainMenu(session);
  }
  
  // For now, handle first item (multi-select can be enhanced later)
  const itemIndex = itemIndices[0];
  const itemInfo = categoryItems.find(i => i.index === itemIndex);
  
  if (!itemInfo) {
    return [formatErrorMessage(`Please select a number between 1 and ${categoryItems.length}.`)];
  }
  
  // Fetch full item details
  const menu = await fetchMenu();
  let selectedItem: MenuItem | undefined;
  for (const cat of menu) {
    selectedItem = cat.items.find(i => i.id === itemInfo.id);
    if (selectedItem) break;
  }
  
  if (!selectedItem) {
    return ['Item not found. Please try again.'];
  }
  
  // Start building temp item
  const tempItem: Partial<CartItem> = {
    item_id: selectedItem.id,
    item_name: selectedItem.name,
    base_price: selectedItem.base_price,
    quantity: 1,
    selected_addons: [],
  };
  
  // Check if item has variations
  if (selectedItem.variations && selectedItem.variations.length > 0) {
    const variation = selectedItem.variations[0];
    
    await updateSession(session.id, {
      state: 'SELECTING_VARIATIONS',
      selected_item_id: selectedItem.id,
      pending_variation_selection: {
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        base_price: selectedItem.base_price,
        variation_name: variation.variation_name,
        options: variation.options.map((opt, idx) => ({
          index: idx + 1,
          name: opt.name,
          price_adjustment: opt.price_adjustment,
        })),
      },
      message_context: { ...session.message_context, temp_item: tempItem },
    });
    
    return [formatVariationMessage(selectedItem.name, variation.variation_name, variation.options)];
  }
  
  // Check if item has addons
  if (selectedItem.addons && selectedItem.addons.length > 0) {
    const { message, addonOptions } = formatAddonsMessage(selectedItem.name, selectedItem.addons);
    
    await updateSession(session.id, {
      state: 'SELECTING_ADDONS',
      selected_item_id: selectedItem.id,
      message_context: {
        ...session.message_context,
        temp_item: tempItem,
        available_addons: addonOptions,
        selected_addons: [],
      },
    });
    
    return [message];
  }
  
  // No variations or addons - go to quantity
  await updateSession(session.id, {
    state: 'CONFIRMING_ITEM',
    selected_item_id: selectedItem.id,
    message_context: { ...session.message_context, temp_item: tempItem },
  });
  
  return [formatQuantityMessage(selectedItem.name, selectedItem.base_price)];
}

async function selectVariation(
  session: WhatsAppSession,
  optionIndex: number
): Promise<string[]> {
  const pending = session.pending_variation_selection;
  
  if (!pending) {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMainMenu(session);
  }
  
  const option = pending.options.find(o => o.index === optionIndex);
  
  if (!option) {
    return [formatErrorMessage(`Please select a number between 1 and ${pending.options.length}.`)];
  }
  
  const tempItem = session.message_context.temp_item || {};
  tempItem.selected_variation = {
    name: pending.variation_name,
    option: option.name,
    price_adjustment: option.price_adjustment,
  };
  
  // Fetch item to check for addons
  const menu = await fetchMenu();
  let selectedItem: MenuItem | undefined;
  for (const cat of menu) {
    selectedItem = cat.items.find(i => i.id === pending.item_id);
    if (selectedItem) break;
  }
  
  if (selectedItem?.addons && selectedItem.addons.length > 0) {
    const { message, addonOptions } = formatAddonsMessage(selectedItem.name, selectedItem.addons);
    
    await updateSession(session.id, {
      state: 'SELECTING_ADDONS',
      pending_variation_selection: null,
      message_context: {
        ...session.message_context,
        temp_item: tempItem,
        available_addons: addonOptions,
        selected_addons: [],
      },
    });
    
    return [message];
  }
  
  // No addons - go to quantity
  await updateSession(session.id, {
    state: 'CONFIRMING_ITEM',
    pending_variation_selection: null,
    message_context: { ...session.message_context, temp_item: tempItem },
  });
  
  const price = pending.base_price + option.price_adjustment;
  return [formatQuantityMessage(`${pending.item_name} (${option.name})`, price)];
}

async function selectAddons(
  session: WhatsAppSession,
  addonIndices: number[]
): Promise<string[]> {
  const availableAddons = session.message_context.available_addons;
  
  if (!availableAddons) {
    return await confirmItemQuantity(session);
  }
  
  const selectedAddons = session.message_context.selected_addons || [];
  
  for (const idx of addonIndices) {
    const addon = availableAddons.find(a => a.index === idx);
    if (addon && !selectedAddons.find(s => s.name === addon.name)) {
      selectedAddons.push({
        name: addon.name,
        price: addon.price,
        quantity: 1,
      });
    }
  }
  
  await updateSession(session.id, {
    message_context: { ...session.message_context, selected_addons: selectedAddons },
  });
  
  // Confirm and proceed to quantity
  const addonNames = selectedAddons.map(a => a.name).join(', ');
  return [
    `✅ Added: ${addonNames}\n\nType more numbers to add, or *DONE* to continue.`,
  ];
}

async function confirmItemQuantity(session: WhatsAppSession): Promise<string[]> {
  const tempItem = session.message_context.temp_item;
  
  if (!tempItem || !tempItem.item_name) {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMainMenu(session);
  }
  
  // Add selected addons to temp item
  tempItem.selected_addons = session.message_context.selected_addons || [];
  
  // Calculate price
  let price = tempItem.base_price || 0;
  if (tempItem.selected_variation) {
    price += tempItem.selected_variation.price_adjustment;
  }
  tempItem.selected_addons.forEach(addon => {
    price += addon.price * addon.quantity;
  });
  
  await updateSession(session.id, {
    state: 'CONFIRMING_ITEM',
    message_context: { ...session.message_context, temp_item: tempItem },
  });
  
  let itemDescription = tempItem.item_name;
  if (tempItem.selected_variation) {
    itemDescription += ` (${tempItem.selected_variation.option})`;
  }
  
  return [formatQuantityMessage(itemDescription, price)];
}

async function addItemToCart(
  session: WhatsAppSession,
  quantity: number
): Promise<string[]> {
  const tempItem = session.message_context.temp_item;
  
  if (!tempItem || !tempItem.item_id || !tempItem.item_name) {
    await updateSession(session.id, { state: 'BROWSING_MENU' });
    return await showMainMenu(session);
  }
  
  // Calculate subtotal
  let unitPrice = tempItem.base_price || 0;
  if (tempItem.selected_variation) {
    unitPrice += tempItem.selected_variation.price_adjustment;
  }
  
  let addonsPrice = 0;
  (tempItem.selected_addons || []).forEach(addon => {
    addonsPrice += addon.price * addon.quantity;
  });
  
  const subtotal = (unitPrice + addonsPrice) * quantity;
  
  const cartItem: CartItem = {
    item_id: tempItem.item_id,
    item_name: tempItem.item_name,
    base_price: tempItem.base_price || 0,
    quantity,
    selected_variation: tempItem.selected_variation,
    selected_addons: tempItem.selected_addons || [],
    subtotal,
  };
  
  // Add to cart
  const newCart = [...session.cart, cartItem];
  
  await updateSession(session.id, {
    cart: newCart,
    state: 'VIEWING_CATEGORY',
    message_context: { ...session.message_context, temp_item: undefined, selected_addons: undefined },
  });
  
  let itemName = tempItem.item_name;
  if (tempItem.selected_variation) {
    itemName += ` (${tempItem.selected_variation.option})`;
  }
  
  return [
    formatItemAddedMessage(itemName, quantity, subtotal),
    ...(await showCategoryItems(session)),
  ];
}

async function showCart(session: WhatsAppSession): Promise<string[]> {
  const cart = session.cart;
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  await updateSession(session.id, { state: 'CART_REVIEW' });
  
  return [formatCartMessage(cart, subtotal)];
}

async function startCheckout(session: WhatsAppSession): Promise<string[]> {
  if (session.cart.length === 0) {
    return ['Your cart is empty! Type *MENU* to browse our menu.'];
  }
  
  // Check if we have customer name
  if (!session.customer_name) {
    await updateSession(session.id, { state: 'COLLECTING_NAME' });
    return [formatNameRequestMessage()];
  }
  
  // Check if returning customer with saved address
  const returningCustomer = await getReturningCustomerData(session.phone);
  if (returningCustomer?.last_address && !session.delivery_address) {
    await updateSession(session.id, {
      state: 'CONFIRMING_LOCATION',
      delivery_address: returningCustomer.last_address,
      delivery_region_id: returningCustomer.last_region_id,
      customer_latitude: returningCustomer.last_latitude,
      customer_longitude: returningCustomer.last_longitude,
    });
    return [formatLocationConfirmationMessage(returningCustomer)];
  }
  
  // Check if we have address
  if (!session.delivery_address) {
    await updateSession(session.id, { state: 'COLLECTING_ADDRESS' });
    return [formatAddressRequestMessage()];
  }
  
  // Check if we have region
  if (!session.delivery_region_id) {
    await updateSession(session.id, { state: 'SELECTING_REGION' });
    return await showRegionSelection(session);
  }
  
  // Show order confirmation
  await updateSession(session.id, { state: 'CONFIRMING_ORDER' });
  return await showOrderConfirmation(session);
}

async function showRegionSelection(session: WhatsAppSession): Promise<string[]> {
  const regions = await fetchDeliveryRegions();
  const subtotal = session.cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  if (regions.length === 0) {
    return ['Delivery regions not configured. Please contact support.'];
  }
  
  // Store regions in context for selection
  await updateSession(session.id, {
    message_context: {
      ...session.message_context,
      available_regions: regions,
    },
  });
  
  return [formatRegionsMessage(regions, subtotal)];
}

async function selectRegion(
  session: WhatsAppSession,
  regionIndex: number
): Promise<string[]> {
  const regions = await fetchDeliveryRegions();
  
  if (regionIndex < 1 || regionIndex > regions.length) {
    return [formatErrorMessage(`Please select a number between 1 and ${regions.length}.`)];
  }
  
  const region = regions[regionIndex - 1];
  
  await updateSession(session.id, {
    delivery_region_id: region.id,
    state: 'CONFIRMING_ORDER',
    message_context: {
      ...session.message_context,
      selected_region: region,
    },
  });
  
  return await showOrderConfirmation(session);
}

async function showOrderConfirmation(session: WhatsAppSession): Promise<string[]> {
  const supabase = createServiceClient();
  
  // Get region details
  const { data: region } = await supabase
    .from('delivery_regions')
    .select('name, delivery_fee, free_delivery_threshold')
    .eq('id', session.delivery_region_id)
    .single();
  
  if (!region) {
    await updateSession(session.id, { state: 'SELECTING_REGION' });
    return await showRegionSelection(session);
  }
  
  const subtotal = session.cart.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = region.free_delivery_threshold && subtotal >= region.free_delivery_threshold
    ? 0
    : region.delivery_fee;
  const tax = Math.round(((subtotal + deliveryFee) * TAX_RATE) / 100);
  const total = subtotal + deliveryFee + tax;
  
  const summary: OrderSummary = {
    subtotal,
    delivery_fee: deliveryFee,
    tax,
    total,
    region_name: region.name,
  };
  
  await updateSession(session.id, {
    message_context: { ...session.message_context, order_summary: summary },
  });
  
  return [formatOrderSummaryMessage(
    session.cart,
    summary,
    session.customer_name || 'Customer',
    session.delivery_address || 'Address not set'
  )];
}

async function createOrder(session: WhatsAppSession): Promise<string[]> {
  const summary = session.message_context.order_summary;
  
  if (!summary || !session.customer_name || !session.delivery_address || !session.delivery_region_id) {
    return ['Missing order details. Please start checkout again.'];
  }
  
  try {
    const supabase = createServiceClient();
    
    // Get region name
    const { data: region } = await supabase
      .from('delivery_regions')
      .select('name')
      .eq('id', session.delivery_region_id)
      .single();
    
    // Generate order number
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `ORD-${date}-${random}`;
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: session.customer_name,
        customer_phone: session.phone.startsWith('234') ? '0' + session.phone.substring(3) : session.phone,
        order_type: 'delivery',
        delivery_address: session.delivery_address,
        delivery_city: 'Awka',
        delivery_region_id: session.delivery_region_id,
        delivery_region_name: region?.name,
        customer_latitude: session.customer_latitude,
        customer_longitude: session.customer_longitude,
        payment_method_type: 'paystack',
        status: 'pending',
        subtotal: summary.subtotal,
        delivery_fee: summary.delivery_fee,
        tax: summary.tax,
        discount: 0,
        total: summary.total,
        payment_status: 'pending',
        payment_method: 'paystack',
        order_source: 'whatsapp',
        whatsapp_session_id: session.id,
      })
      .select()
      .single();
    
    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return ['Sorry, there was an error creating your order. Please try again.'];
    }
    
    // Create order items
    const orderItems = session.cart.map(item => ({
      order_id: order.id,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.base_price,
      selected_variation: item.selected_variation,
      selected_addons: item.selected_addons,
      subtotal: item.subtotal,
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      return ['Sorry, there was an error creating your order. Please try again.'];
    }
    
    // Initialize Paystack payment
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!paystackSecretKey) {
      return ['Payment service not configured. Please contact support.'];
    }
    
    const customerPhone = session.phone.startsWith('234') ? '0' + session.phone.substring(3) : session.phone;
    const email = `${customerPhone.replace(/\D/g, '')}@jollofexpress.com`;
    
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(summary.total * 100),
        reference: `${orderNumber}-${Date.now()}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          customer_phone: customerPhone,
          order_source: 'whatsapp',
        },
      }),
    });
    
    if (!paystackResponse.ok) {
      console.error('Paystack initialization failed');
      return ['Payment initialization failed. Please try again.'];
    }
    
    const paystackData = await paystackResponse.json();
    const paymentUrl = paystackData.data.authorization_url;
    const paymentReference = paystackData.data.reference;
    
    // Update order with payment reference
    await supabase
      .from('orders')
      .update({ payment_reference: paymentReference })
      .eq('id', order.id);
    
    // Update session
    await setPendingOrder(session.id, order.id);
    
    return [formatPaymentMessage(orderNumber, summary.total, paymentUrl)];
    
  } catch (error) {
    console.error('Error in createOrder:', error);
    return ['Sorry, there was an error processing your order. Please try again.'];
  }
}

/**
 * Handle payment confirmation (called from Paystack webhook)
 */
export async function handlePaymentConfirmation(
  orderId: string,
  success: boolean
): Promise<void> {
  const supabase = createServiceClient();
  
  // Find session with this pending order
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('pending_order_id', orderId)
    .single();
  
  if (!session) {
    console.log('No WhatsApp session found for order:', orderId);
    return;
  }
  
  if (success) {
    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .single();
    
    // Update session
    await supabase
      .from('whatsapp_sessions')
      .update({
        state: 'ORDER_COMPLETE',
        cart: [],
        pending_order_id: null,
        message_context: {},
        last_activity: new Date().toISOString(),
      })
      .eq('id', session.id);
    
    // Send confirmation message via Ultra MSG
    const { UltraMsgClient } = await import('@/lib/notifications/ultramsg-client');
    
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    
    if (instanceId && token) {
      const client = new UltraMsgClient(instanceId, token);
      await client.sendMessage({
        to: session.phone,
        body: formatOrderConfirmedMessage(order?.order_number || 'Unknown', 30),
      });
    }
  }
}

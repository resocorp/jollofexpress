// WhatsApp Ordering System Types

export type ConversationState =
  | 'IDLE'                    // New conversation, show welcome
  | 'BROWSING_MENU'           // Viewing categories
  | 'VIEWING_CATEGORY'        // Viewing items in a category
  | 'SELECTING_VARIATIONS'    // Selecting item variations (only if item has variations)
  | 'AWAITING_MORE_OR_CHECKOUT' // After adding item - more items or checkout?
  | 'COLLECTING_DETAILS'      // Getting name + address + notes in ONE message
  | 'PAYMENT_PENDING'         // Waiting for Paystack payment
  | 'ORDER_COMPLETE';         // Order confirmed

export interface WhatsAppSession {
  id: string;
  phone: string;
  customer_name: string | null;
  state: ConversationState;
  cart: CartItem[];
  selected_category_id: string | null;
  selected_item_id: string | null;
  pending_variation_selection: PendingVariation | null;
  delivery_address: string | null;
  delivery_region_id: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  pending_order_id: string | null;
  last_message_id: string | null;
  message_context: MessageContext;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  item_id: string;
  item_name: string;
  base_price: number;
  quantity: number;
  selected_variation?: {
    name: string;
    option: string;
    price_adjustment: number;
  };
  selected_addons: {
    name: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
}

export interface PendingVariation {
  item_id: string;
  item_name: string;
  base_price: number;
  variation_name: string;
  options: {
    index: number;
    name: string;
    price_adjustment: number;
  }[];
}

export interface MessageContext {
  awaiting_quantity?: boolean;
  selected_item_index?: number;
  category_items?: CategoryItem[];
  available_addons?: AddonOption[];
  selected_addons?: { name: string; price: number; quantity: number }[];
  temp_item?: Partial<CartItem>;
  order_summary?: OrderSummary;
  available_regions?: { id: string; name: string; delivery_fee: number; free_delivery_threshold?: number }[];
  selected_region?: { id: string; name: string; delivery_fee: number; free_delivery_threshold?: number };
  // Simplified flow - pending item for variation selection
  pending_item?: {
    id: string;
    name: string;
    price: number;
    variations?: { id: string; name: string; option: string; price_adjustment: number }[];
  };
}

export interface CategoryItem {
  index: number;
  id: string;
  name: string;
  description?: string;
  base_price: number;
  has_variations: boolean;
  has_addons: boolean;
}

export interface AddonOption {
  index: number;
  id: string;
  name: string;
  price: number;
}

export interface OrderSummary {
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  region_name?: string;
}

// Ultra MSG Webhook payload types
export interface UltraMsgWebhookPayload {
  event_type: 'message_received' | 'message_create' | 'message_ack';
  instanceId: string;
  data: UltraMsgMessageData;
}

export interface UltraMsgMessageData {
  id: string;
  from: string;           // e.g., "2348012345678@c.us"
  to: string;
  ack: string;
  type: 'chat' | 'image' | 'location' | 'document' | 'audio' | 'video' | 'vcard';
  body: string;
  fromMe: boolean;
  time: number;
  // Location message fields (nested object from UltraMsg)
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  // Legacy location fields (some versions use these)
  lat?: number;
  lng?: number;
  loc?: string;
  // Media fields
  media?: string;
  caption?: string;
  mimetype?: string;
  filename?: string;
}

// Parsed incoming message
export interface ParsedMessage {
  phone: string;
  messageId: string;
  type: 'text' | 'location' | 'media' | 'unknown';
  text?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: number;
}

// Command types that can be extracted from messages
export type CommandType =
  | 'MENU'
  | 'CART'
  | 'CHECKOUT'
  | 'CLEAR'
  | 'HELP'
  | 'CANCEL'
  | 'BACK'
  | 'YES'
  | 'NO'
  | 'DONE'
  | 'REORDER'
  | 'NUMBER_SELECTION'
  | 'QUANTITY'
  | 'TEXT_INPUT'
  | 'LOCATION'
  | 'UNKNOWN';

export interface ParsedCommand {
  type: CommandType;
  value?: string | number | number[];
  raw: string;
}

// Response to send back
export interface BotResponse {
  message: string;
  newState?: ConversationState;
  updateSession?: Partial<WhatsAppSession>;
}

// Menu data structures
export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  variations: ItemVariation[];
  addons: ItemAddon[];
}

export interface ItemVariation {
  id: string;
  variation_name: string;
  options: {
    name: string;
    price_adjustment: number;
  }[];
}

export interface ItemAddon {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

// Returning customer data
export interface ReturningCustomerData {
  name: string;
  phone: string;
  last_address?: string;
  last_region_id?: string;
  last_region_name?: string;
  last_latitude?: number;
  last_longitude?: number;
  total_orders: number;
}

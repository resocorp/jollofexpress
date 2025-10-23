// Database types matching the PostgreSQL schema

export type UserRole = 'customer' | 'kitchen' | 'admin';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type OrderType = 'delivery' | 'carryout';
export type PrintStatus = 'pending' | 'printed' | 'failed';
export type DietaryTag = 'veg' | 'non_veg' | 'vegan' | 'halal' | 'none';
export type DiscountType = 'percentage' | 'fixed_amount';
export type AddressType = 'house' | 'office' | 'hotel' | 'church' | 'school' | 'other';

export interface User {
  id: string;
  email?: string;
  phone: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
  is_available: boolean;
  dietary_tag: DietaryTag;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ItemVariationOption {
  name: string;
  price_adjustment: number;
}

export interface ItemVariation {
  id: string;
  item_id: string;
  variation_name: string;
  options: ItemVariationOption[];
  created_at: string;
}

export interface ItemAddon {
  id: string;
  item_id: string;
  name: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_alt?: string;
  customer_email?: string;
  order_type: OrderType;
  delivery_city?: string;
  delivery_address?: string;
  address_type?: AddressType;
  unit_number?: string;
  delivery_instructions?: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  discount: number;
  total: number;
  payment_status: PaymentStatus;
  payment_reference?: string;
  payment_method?: string;
  promo_code?: string;
  estimated_prep_time?: number;
  print_status: PrintStatus;
  print_attempts: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SelectedVariation {
  name: string;
  option: string;
  price_adjustment: number;
}

export interface SelectedAddon {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_variation?: SelectedVariation;
  selected_addons?: SelectedAddon[];
  special_instructions?: string;
  subtotal: number;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrintQueue {
  id: string;
  order_id: string;
  print_data: any;
  status: PrintStatus;
  attempts: number;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export interface RestaurantInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  logo_url: string;
  banner_url: string;
  description: string;
}

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface DeliverySettings {
  enabled: boolean;
  cities: string[];
  min_order: number;
  delivery_fee: number;
}

export interface PaymentSettings {
  tax_rate: number;
}

export interface OrderSettings {
  default_prep_time: number;
  auto_close_when_busy: boolean;
  max_active_orders?: number;
  is_open: boolean;
  current_prep_time: number;
}

export interface Settings {
  key: string;
  value: RestaurantInfo | OperatingHours | DeliverySettings | PaymentSettings | OrderSettings;
  updated_at: string;
}

// Extended types with relations
export interface MenuItemWithDetails extends MenuItem {
  category?: MenuCategory;
  variations?: ItemVariation[];
  addons?: ItemAddon[];
}

export interface OrderWithItems extends Order {
  items?: OrderItem[];
}

// Cart types
export interface CartItem {
  item: MenuItem;
  quantity: number;
  selected_variation?: {
    variation_name: string;
    option: ItemVariationOption;
  };
  selected_addons: ItemAddon[];
  special_instructions?: string;
  subtotal: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface MenuResponse {
  categories: (MenuCategory & {
    items: MenuItemWithDetails[];
  })[];
}

export interface RestaurantStatusResponse {
  is_open: boolean; // Effective status (within hours AND manually open)
  estimated_prep_time: number;
  message?: string;
  closed_reason?: string | null; // Why restaurant is closed
  manual_override?: boolean; // Manual toggle state
  within_hours?: boolean; // Whether within operating hours
  hours?: {
    today: string;
    all: Record<string, string>;
  };
  next_status_change?: {
    action: 'open' | 'close';
    time: string;
    minutes: number;
  } | null;
}

export interface PromoValidationResponse {
  valid: boolean;
  discount_amount: number;
  message: string;
}

// Payment types
export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    authorization: any;
  };
}

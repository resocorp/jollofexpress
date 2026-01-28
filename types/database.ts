// Database types matching the PostgreSQL schema

export type UserRole = 'customer' | 'kitchen' | 'admin';
export type OrderStatus = 'pending' | 'scheduled' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type OrderType = 'delivery' | 'carryout';
export type PrintStatus = 'pending' | 'printed' | 'failed';
export type DietaryTag = 'veg' | 'non_veg' | 'vegan' | 'halal' | 'none';
export type DiscountType = 'percentage' | 'fixed_amount';
export type AddressType = 'house' | 'office' | 'hotel' | 'church' | 'school' | 'other';
export type CommissionType = 'percentage' | 'fixed_amount';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

// Delivery tracking types
export type DriverStatus = 'available' | 'busy' | 'offline';
export type AssignmentStatus = 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
export type PaymentMethodType = 'paystack' | 'cod';
export type CodStatus = 'pending' | 'collected' | 'settled';

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
  promo_price?: number | null;
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
  notes?: string;
  print_status: PrintStatus;
  print_attempts: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  
  // Delivery tracking fields
  payment_method_type?: PaymentMethodType;
  assigned_driver_id?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  driver_pickup_time?: string;
  delivery_start_time?: string;
  delivery_completion_time?: string;
  cash_collected?: boolean;
  traccar_order_id?: number;
  customer_geofence_id?: number;
  
  // Delivery region fields
  delivery_region_id?: string;
  delivery_region_name?: string;
  
  // Order source tracking
  order_source?: 'web' | 'whatsapp';
  whatsapp_session_id?: string;
}

// ============ DELIVERY TRACKING INTERFACES ============

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  traccar_device_id?: number;
  traccar_driver_id?: number;
  status: DriverStatus;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  vehicle_type: string;
  vehicle_plate?: string;
  cod_balance: number;
  total_deliveries: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  driver_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  delivery_photo_url?: string;
  recipient_name?: string;
  distance_meters?: number;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface CodCollection {
  id: string;
  order_id: string;
  driver_id: string;
  amount: number;
  status: CodStatus;
  collected_at?: string;
  settled_at?: string;
  settled_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverWithAssignment extends Driver {
  current_assignment?: DeliveryAssignment;
}

export interface OrderWithDriver extends Order {
  driver?: Driver;
  assignment?: DeliveryAssignment;
}

export interface SelectedVariation {
  name: string;
  option: string;
  price_adjustment: number;
  quantity?: number; // Quantity for this variation option
}

export interface SelectedAddon {
  name: string;
  price: number;
  quantity: number; // Quantity for this addon
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
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  expiry_date?: string;
  is_active: boolean;
  influencer_id?: string;
  created_at: string;
  updated_at: string;
}

// ============ INFLUENCER TRACKING INTERFACES ============

export interface Influencer {
  id: string;
  name: string;
  email: string;
  phone: string;
  access_token?: string;
  token_expires_at?: string;
  commission_type: CommissionType;
  commission_value: number;
  social_handle?: string;
  platform?: string;
  profile_image_url?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAttribution {
  id: string;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  influencer_id: string;
  promo_code_id?: string;
  first_promo_code: string;
  first_order_id?: string;
  first_order_date: string;
  first_order_total: number;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InfluencerPayout {
  id: string;
  influencer_id: string;
  payout_month: string;
  total_orders: number;
  total_revenue_generated: number;
  commission_earned: number;
  status: PayoutStatus;
  paid_amount?: number;
  paid_at?: string;
  payment_reference?: string;
  payment_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeUsage {
  id: string;
  promo_code_id: string;
  order_id: string;
  influencer_id?: string;
  customer_phone: string;
  customer_name?: string;
  order_total: number;
  discount_applied: number;
  commission_amount: number;
  is_first_order: boolean;
  is_new_customer: boolean;
  created_at: string;
}

// Extended influencer types
export interface PromoCodeWithInfluencer extends PromoCode {
  influencer?: Influencer;
}

export interface InfluencerWithPromoCode extends Influencer {
  promo_code?: PromoCode;
}

export interface InfluencerPerformance {
  influencer_id: string;
  influencer_name: string;
  email: string;
  social_handle?: string;
  platform?: string;
  commission_type: CommissionType;
  commission_value: number;
  is_active: boolean;
  promo_code_id?: string;
  promo_code?: string;
  used_count: number;
  total_customers: number;
  total_customer_ltv: number;
  total_orders: number;
  total_revenue_generated: number;
  total_commission_earned: number;
  avg_order_value: number;
}

export interface CustomerLTV {
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  total_orders: number;
  lifetime_value: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  attributed_influencer_id?: string;
  attributed_influencer_name?: string;
  attribution_promo_code?: string;
}

export interface PromoAnalytics {
  promo_code_id: string;
  code: string;
  total_uses: number;
  total_revenue: number;
  total_discount_given: number;
  unique_customers: number;
  new_customers: number;
  avg_order_value: number;
  conversion_rate?: number;
}

export interface PromoAnalyticsTrend {
  date: string;
  uses: number;
  revenue: number;
  discount: number;
  new_customers: number;
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
  delivery_fee: number; // Deprecated: Use delivery regions instead
  free_delivery_threshold?: number | null; // Orders above this amount get free delivery
}

// ============ DELIVERY REGIONS ============

export interface DeliveryRegionGroup {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRegion {
  id: string;
  group_id?: string;
  name: string;
  description?: string;
  delivery_fee: number;
  free_delivery_threshold?: number; // NULL means no free delivery
  display_order: number;
  is_active: boolean;
  geofence_coordinates?: { lat: number; lng: number }[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryRegionWithGroup extends DeliveryRegion {
  group?: DeliveryRegionGroup;
}

export interface DeliveryRegionGroupWithRegions extends DeliveryRegionGroup {
  regions: DeliveryRegion[];
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
    quantity?: number; // Quantity for this variation
  };
  selected_addons: (ItemAddon & { quantity: number })[]; // Add quantity to addons
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

// Notification types
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type NotificationType = 'customer' | 'admin';
export type EventType = 
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready'
  | 'order_out_for_delivery'
  | 'order_completed'
  | 'payment_failed'
  | 'kitchen_closed'
  | 'kitchen_reopened'
  | 'payment_failure'
  | 'daily_summary'
  | 'system_alert';

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

export interface NotificationSettings {
  id: string;
  key: string;
  value: any; // JSONB field
  updated_at: string;
}

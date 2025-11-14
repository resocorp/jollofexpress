// Form validation schemas using Zod
import { z } from 'zod';

// Nigerian phone number validation
const nigerianPhoneRegex = /^(\+234|0)[789]\d{9}$/;

export const phoneSchema = z
  .string()
  .regex(nigerianPhoneRegex, 'Please enter a valid Nigerian phone number (e.g., 08012345678)');

// Address validation schema
export const deliveryAddressSchema = z.object({
  orderType: z.enum(['delivery', 'carryout']),
  fullAddress: z.string().optional(),
  phone: phoneSchema,
  phoneAlt: z
    .string()
    .regex(nigerianPhoneRegex, 'Please enter a valid Nigerian phone number')
    .optional()
    .or(z.literal('')),
  deliveryInstructions: z.string().max(200).optional(),
});

export type DeliveryAddressFormData = z.infer<typeof deliveryAddressSchema>;

// Customer info validation schema
export const customerInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: phoneSchema,
  email: z.string().min(1, 'Email is required to process payment').email('Please enter a valid email address'),
});

export type CustomerInfoFormData = z.infer<typeof customerInfoSchema>;

// Checkout validation schema with conditional delivery address validation
export const checkoutSchema = deliveryAddressSchema
  .merge(customerInfoSchema)
  .superRefine((data, ctx) => {
    // Only validate delivery fields if order type is 'delivery'
    if (data.orderType === 'delivery') {
      if (!data.fullAddress || data.fullAddress.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please provide your delivery address',
          path: ['fullAddress'],
        });
      } else if (data.fullAddress.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please provide a more detailed address (minimum 10 characters)',
          path: ['fullAddress'],
        });
      }
    }
  });

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// Menu item customization schema
export const itemCustomizationSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1').max(50, 'Maximum quantity is 50'),
  selectedVariation: z
    .object({
      variation_name: z.string(),
      option: z.object({
        name: z.string(),
        price_adjustment: z.number(),
      }),
    })
    .optional(),
  selectedAddons: z.array(z.string()).optional(),
  specialInstructions: z.string().max(200, 'Instructions too long').optional(),
});

export type ItemCustomizationFormData = z.infer<typeof itemCustomizationSchema>;

// Admin: Menu item schema
export const menuItemSchema = z.object({
  category_id: z.string().uuid('Invalid category'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  base_price: z.number().min(0, 'Price must be positive'),
  dietary_tag: z.enum(['veg', 'non_veg', 'vegan', 'halal', 'none']),
  is_available: z.boolean().default(true),
  display_order: z.number().default(0),
});

export type MenuItemFormData = z.infer<typeof menuItemSchema>;

// Admin: Promo code schema
export const promoCodeSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code too long')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only'),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().min(0, 'Discount must be positive'),
  min_order_value: z.number().min(0).optional(),
  max_discount: z.number().min(0).optional(),
  usage_limit: z.number().min(1).optional(),
  expiry_date: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type PromoCodeFormData = z.infer<typeof promoCodeSchema>;

// Settings schemas
export const restaurantInfoSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  address: z.string().min(10).max(300),
  description: z.string().max(500).optional(),
});

export const deliverySettingsSchema = z.object({
  enabled: z.boolean(),
  cities: z.array(z.string()),
  min_order: z.number().min(0),
  delivery_fee: z.number().min(0),
});

export const orderSettingsSchema = z.object({
  default_prep_time: z.number().min(10).max(120),
  auto_close_when_busy: z.boolean(),
  is_open: z.boolean(),
  current_prep_time: z.number().min(10).max(120),
});

export const paymentSettingsSchema = z.object({
  tax_rate: z.number().min(0).max(100),
});

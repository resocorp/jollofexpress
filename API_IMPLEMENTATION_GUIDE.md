# API Implementation Guide

This document provides detailed guidance for implementing the API routes for JollofExpress.

## Overview

The API is built using Next.js 14 App Router API routes. All routes are located in the `app/api` directory.

## API Structure

```
app/api/
├── menu/                    # Public menu endpoints
├── restaurant/              # Restaurant info endpoints
├── delivery/                # Delivery configuration
├── orders/                  # Order creation and tracking
├── promo/                   # Promo code validation
├── kitchen/                 # Kitchen operations
├── admin/                   # Admin dashboard operations
└── webhook/                 # Third-party webhooks
```

## Required API Routes

### Public Endpoints

#### GET `/api/menu`
Returns complete menu with categories, items, variations, and addons.

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Main Course",
      "description": "Our signature dishes",
      "items": [
        {
          "id": "uuid",
          "name": "Jollof Rice",
          "description": "...",
          "base_price": 2500,
          "image_url": "...",
          "is_available": true,
          "dietary_tag": "non_veg",
          "variations": [...],
          "addons": [...]
        }
      ]
    }
  ]
}
```

**Implementation Steps:**
1. Query `menu_categories` with `is_active = true`
2. For each category, query `menu_items` where `is_available = true`
3. For each item, fetch `item_variations` and `item_addons`
4. Return nested structure

#### GET `/api/restaurant/info`
Returns restaurant information for public display.

**Response:**
```json
{
  "name": "JollofExpress",
  "phone": "+234 XXX XXX XXXX",
  "address": "123 Main Street, Awka",
  "logo_url": "https://...",
  "banner_url": "https://...",
  "description": "..."
}
```

**Implementation:**
```typescript
// app/api/restaurant/info/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'restaurant_info')
    .single();
    
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json(data.value);
}
```

#### GET `/api/restaurant/status`
Returns current restaurant status (open/closed, prep time).

**Response:**
```json
{
  "is_open": true,
  "estimated_prep_time": 30,
  "message": "Currently open and accepting orders"
}
```

#### GET `/api/delivery/cities`
Returns list of supported delivery cities.

**Response:**
```json
["Awka"]
```

#### POST `/api/orders`
Creates a new order and initializes Paystack payment.

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_phone": "08012345678",
  "customer_email": "john@example.com",
  "order_type": "delivery",
  "delivery_city": "Awka",
  "delivery_address": "No. 12 Zik Avenue...",
  "address_type": "house",
  "unit_number": "Flat 3",
  "delivery_instructions": "Call on arrival",
  "customer_phone_alt": "08087654321",
  "subtotal": 5000,
  "delivery_fee": 200,
  "tax": 375,
  "discount": 0,
  "total": 5575,
  "promo_code": null,
  "items": [
    {
      "item_id": "uuid",
      "item_name": "Jollof Rice",
      "quantity": 2,
      "unit_price": 2500,
      "selected_variation": {...},
      "selected_addons": [...],
      "special_instructions": "Extra spicy",
      "subtotal": 5000
    }
  ]
}
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "order_number": "ORD-20251020-0001",
    ...
  },
  "payment_url": "https://checkout.paystack.com/..."
}
```

**Implementation Steps:**
1. Validate request body (use Zod schema)
2. Generate unique order number
3. Insert order into `orders` table
4. Insert items into `order_items` table
5. Initialize Paystack transaction
6. Return order and payment URL

**Paystack Integration:**
```typescript
const response = await fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: customer_email || `${customer_phone}@jollofexpress.com`,
    amount: total * 100, // Paystack uses kobo
    reference: `${order.order_number}-${Date.now()}`,
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      customer_phone: customer_phone,
    },
  }),
});
```

#### POST `/api/orders/verify-payment`
Verifies payment after Paystack redirect.

**Request Body:**
```json
{
  "order_id": "uuid",
  "payment_reference": "ORD-20251020-0001-1234567890"
}
```

**Response:**
```json
{
  "id": "uuid",
  "order_number": "ORD-20251020-0001",
  "status": "confirmed",
  "payment_status": "success",
  ...
}
```

**Implementation:**
1. Verify payment with Paystack API
2. Update order status to "confirmed"
3. Update payment_status to "success"
4. Add to print queue
5. Send confirmation SMS/email
6. Return updated order

#### GET `/api/orders/[id]`
Retrieves order details for tracking.

**Query Parameters:**
- `phone` - Customer phone for verification (optional)

**Response:**
```json
{
  "id": "uuid",
  "order_number": "ORD-20251020-0001",
  "status": "preparing",
  "items": [...],
  ...
}
```

#### POST `/api/promo/validate`
Validates a promo code.

**Request Body:**
```json
{
  "code": "WELCOME10",
  "order_total": 5000
}
```

**Response:**
```json
{
  "valid": true,
  "discount_amount": 500,
  "message": "10% discount applied successfully"
}
```

**Implementation:**
1. Query `promo_codes` table
2. Check if code is active and not expired
3. Verify usage limit not exceeded
4. Check minimum order value
5. Calculate discount amount
6. Return validation result

#### POST `/api/webhook/paystack`
Handles Paystack webhook events.

**Headers:**
- `x-paystack-signature` - Webhook signature for verification

**Implementation:**
1. Verify webhook signature
2. Parse event data
3. Handle different event types:
   - `charge.success` - Update order status
   - `charge.failed` - Mark payment as failed
4. Ensure idempotency (check if already processed)
5. Return 200 OK

### Kitchen Endpoints

These require kitchen staff authentication.

#### GET `/api/kitchen/orders`
Returns active orders for KDS.

**Response:**
```json
[
  {
    "id": "uuid",
    "order_number": "ORD-20251020-0001",
    "status": "confirmed",
    "items": [...],
    ...
  }
]
```

**Filter:**
- Status: confirmed, preparing, ready, out_for_delivery
- Created today

#### PATCH `/api/kitchen/orders/[id]/status`
Updates order status.

**Request Body:**
```json
{
  "status": "preparing"
}
```

#### POST `/api/kitchen/orders/[id]/print`
Manually triggers a reprint.

#### PATCH `/api/kitchen/items/[id]/availability`
Toggles item availability (sold out).

**Request Body:**
```json
{
  "is_available": false
}
```

#### PATCH `/api/kitchen/restaurant/status`
Updates restaurant operational status.

**Request Body:**
```json
{
  "is_open": true,
  "prep_time": 30
}
```

### Admin Endpoints

These require admin authentication.

#### Menu Management

- `GET /api/admin/menu/categories` - List all categories
- `POST /api/admin/menu/categories` - Create category
- `PATCH /api/admin/menu/categories/[id]` - Update category
- `DELETE /api/admin/menu/categories/[id]` - Delete category

- `GET /api/admin/menu/items` - List all items
- `POST /api/admin/menu/items` - Create item
- `PATCH /api/admin/menu/items/[id]` - Update item
- `DELETE /api/admin/menu/items/[id]` - Delete item

#### Order Management

- `GET /api/admin/orders` - List all orders with filters
- `PATCH /api/admin/orders/[id]` - Update order (admin override)
- `POST /api/admin/orders/[id]/refund` - Process refund

#### Promo Codes

- `GET /api/admin/promos` - List all promo codes
- `POST /api/admin/promos` - Create promo code
- `PATCH /api/admin/promos/[id]` - Update promo code
- `DELETE /api/admin/promos/[id]` - Delete promo code

#### Settings

- `GET /api/admin/settings` - Get all settings
- `PATCH /api/admin/settings` - Update settings

## Authentication

### Supabase Auth Setup

```typescript
// lib/auth.ts
import { createClient } from '@/lib/supabase/server';

export async function requireAuth(requiredRole?: 'kitchen' | 'admin') {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  if (requiredRole) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (userData?.role !== requiredRole && userData?.role !== 'admin') {
      throw new Error('Forbidden');
    }
  }
  
  return user;
}
```

### Usage in API Routes

```typescript
// app/api/kitchen/orders/route.ts
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth('kitchen');
    
    // Handle request
    ...
  } catch (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }
}
```

## Error Handling

Standard error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Implement rate limiting for public endpoints:

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
});

export function checkRateLimit(identifier: string, limit: number = 10) {
  const tokenCount = rateLimit.get(identifier) || 0;
  
  if (tokenCount >= limit) {
    return false;
  }
  
  rateLimit.set(identifier, tokenCount + 1);
  return true;
}
```

## Testing APIs

### Using curl

```bash
# Get menu
curl http://localhost:3000/api/menu

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"John Doe",...}'

# Validate promo
curl -X POST http://localhost:3000/api/promo/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"WELCOME10","order_total":5000}'
```

### Using Postman

Import the provided Postman collection from `postman/jollofexpress-api.json` (to be created).

## Next Steps

1. Implement API routes in order:
   - Public endpoints first (menu, restaurant info)
   - Order creation and payment
   - Kitchen endpoints
   - Admin endpoints

2. Test each endpoint thoroughly

3. Add proper error handling and logging

4. Implement rate limiting

5. Set up monitoring and alerts

6. Document API with OpenAPI/Swagger (optional)

## Security Checklist

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS protection (sanitize inputs)
- [ ] CSRF tokens for form submissions
- [ ] Rate limiting on public endpoints
- [ ] Webhook signature verification
- [ ] Proper authentication on protected endpoints
- [ ] HTTPS enforcement in production
- [ ] Environment variables for secrets
- [ ] Audit logging for admin actions

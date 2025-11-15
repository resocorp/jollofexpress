# Scheduled Orders Feature

## Overview
Customers can now place orders even when the restaurant is closed. These orders are marked as "scheduled" and will be automatically processed when the restaurant reopens.

## How It Works

### 1. **Customer Experience**
- When the restaurant is closed, customers see an **informational notice** (amber/warning style) instead of an error
- The notice explains:
  - Restaurant is currently closed
  - Current operating hours
  - When the restaurant will reopen
  - **They can still place their order**
  - Payment will be processed immediately
  - Order will be prepared when restaurant reopens

### 2. **Order Processing**
When an order is placed outside operating hours:
- Payment is processed immediately via Paystack
- Order status is set to `'scheduled'` instead of `'pending'`
- A note is added to the order explaining it was placed outside hours
- Customer receives confirmation and payment receipt

### 3. **Automatic Activation**
- A cron job (`/api/cron/check-hours`) runs every 1-5 minutes
- When the restaurant opens:
  - Restaurant status is updated to `is_open: true`
  - All paid scheduled orders are automatically moved to `'confirmed'` status
  - Orders appear in the kitchen display system
  - Kitchen staff can begin preparing them

### 4. **Kitchen Display**
- Scheduled orders do NOT appear in the kitchen display until activated
- Only shows orders with status: `confirmed`, `preparing`, `ready`, `out_for_delivery`
- When restaurant opens, scheduled orders automatically appear

## Technical Implementation

### Files Modified

#### 1. **Order Creation API** (`app/api/orders/route.ts`)
- Removed blocking validation for operating hours
- Added logic to determine if order should be scheduled
- Sets `status: 'scheduled'` for orders placed outside hours
- Adds explanatory note to order

#### 2. **Checkout Form** (`components/checkout/checkout-form.tsx`)
- Changed alert from destructive (red) to warning (amber)
- Updated message to be informational rather than blocking
- Shows toast notification when scheduled order is created
- Removed error handling for "outside operating hours"

#### 3. **Cron Job** (`app/api/cron/check-hours/route.ts`)
- Added logic to process scheduled orders when restaurant opens
- Queries for `status: 'scheduled'` AND `payment_status: 'paid'`
- Updates them to `status: 'confirmed'`
- Logs activated orders

#### 4. **Type Definitions**
- `types/database.ts`: Added `'scheduled'` to `OrderStatus` type
- `hooks/use-orders.ts`: Updated return type to include `scheduled` and `scheduled_note`
- `database/schema.sql`: Updated enum to include `'scheduled'`

#### 5. **Database Migration**
- `database/migrations/add_scheduled_order_status.sql`: Adds 'scheduled' to order_status enum

## Order Status Flow

```
Outside Hours:
Payment → scheduled → (restaurant opens) → confirmed → preparing → ready → out_for_delivery/completed

During Hours:
Payment → pending → confirmed → preparing → ready → out_for_delivery/completed
```

## Benefits

1. **Increased Revenue**: Capture orders 24/7, even when closed
2. **Better Customer Experience**: No frustration from rejected orders
3. **Automatic Processing**: No manual intervention needed
4. **Clear Communication**: Customers know exactly what to expect

## Configuration

### Cron Job Setup
The cron job should run every 1-5 minutes:
- **Vercel**: Add to `vercel.json`
- **External**: Use services like cron-job.org or EasyCron
- **Endpoint**: `GET /api/cron/check-hours`
- **Auth**: Set `CRON_SECRET` environment variable

### Operating Hours
Configure in admin panel under Settings → Operating Hours

## Testing

1. **Test Scheduled Order Creation**:
   - Manually close restaurant in admin panel
   - Place an order as a customer
   - Verify order status is 'scheduled'
   - Verify payment is processed

2. **Test Automatic Activation**:
   - Create scheduled orders
   - Manually open restaurant or wait for cron
   - Verify orders move to 'confirmed'
   - Verify orders appear in kitchen display

3. **Test Edge Cases**:
   - Order placed 1 minute before closing
   - Order placed during closed day
   - Multiple scheduled orders activated at once

## Future Enhancements

- Email/SMS notification when scheduled order is activated
- Admin view to manually activate scheduled orders
- Estimated preparation time based on opening time
- Scheduled delivery time selection for customers

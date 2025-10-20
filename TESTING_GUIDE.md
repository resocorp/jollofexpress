# 🧪 JollofExpress API Testing Guide

**Complete guide for testing all 24 API endpoints**

---

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Ensure dev server is running
npm run dev

# 2. Have Supabase configured in .env.local
# 3. Database schema loaded with sample data
# 4. Paystack test keys configured (optional for payment tests)
```

### Testing Tools
- **Browser** - For GET requests
- **curl** - Command line testing
- **Postman** - Full API testing (recommended)
- **Thunder Client** - VS Code extension

---

## 📋 Test Case Collection

### 1. Public APIs - Menu & Restaurant

#### Test 1.1: Get Menu
```bash
curl http://localhost:3000/api/menu
```

**Expected Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Main Course",
      "items": [...]
    }
  ]
}
```

**Success Criteria:**
- ✅ Returns 200 status
- ✅ Contains categories array
- ✅ Each category has items array
- ✅ Items have variations and addons

#### Test 1.2: Get Restaurant Info
```bash
curl http://localhost:3000/api/restaurant/info
```

**Expected Response:**
```json
{
  "name": "JollofExpress",
  "phone": "+234 XXX XXX XXXX",
  "address": "123 Main Street, Awka",
  "logo_url": "https://...",
  "description": "..."
}
```

#### Test 1.3: Get Restaurant Status
```bash
curl http://localhost:3000/api/restaurant/status
```

**Expected Response:**
```json
{
  "is_open": true,
  "estimated_prep_time": 30,
  "message": "Currently open and accepting orders"
}
```

#### Test 1.4: Get Delivery Cities
```bash
curl http://localhost:3000/api/delivery/cities
```

**Expected Response:**
```json
["Awka"]
```

---

### 2. Public APIs - Orders

#### Test 2.1: Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "08012345678",
    "customer_email": "john@example.com",
    "order_type": "delivery",
    "delivery_city": "Awka",
    "delivery_address": "No. 12 Zik Avenue, opposite First Bank, near Aroma Junction, Awka",
    "address_type": "house",
    "subtotal": 5000,
    "delivery_fee": 200,
    "tax": 375,
    "discount": 0,
    "total": 5575,
    "items": [
      {
        "item_id": "your-item-id-from-menu",
        "item_name": "Jollof Rice",
        "quantity": 2,
        "unit_price": 2500,
        "subtotal": 5000
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "order": {
    "id": "uuid",
    "order_number": "ORD-20251020-0001",
    "status": "pending",
    "payment_status": "pending",
    ...
  },
  "payment_url": "https://checkout.paystack.com/..."
}
```

**Success Criteria:**
- ✅ Returns 201 status
- ✅ Order created with unique order_number
- ✅ Payment URL returned
- ✅ Order items inserted

#### Test 2.2: Verify Payment
```bash
curl -X POST http://localhost:3000/api/orders/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order-uuid-from-create",
    "reference": "payment-reference-from-paystack"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "confirmed",
    "payment_status": "success",
    ...
  },
  "message": "Payment verified successfully"
}
```

#### Test 2.3: Track Order
```bash
curl "http://localhost:3000/api/orders/ORDER_ID?phone=08012345678"
```

**Expected Response:**
```json
{
  "id": "uuid",
  "order_number": "ORD-20251020-0001",
  "status": "preparing",
  "items": [...],
  ...
}
```

---

### 3. Public APIs - Promo & Webhook

#### Test 3.1: Validate Promo Code
```bash
curl -X POST http://localhost:3000/api/promo/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME10",
    "order_total": 5000
  }'
```

**Expected Response (Valid):**
```json
{
  "valid": true,
  "discount_amount": 500,
  "discount_type": "percentage",
  "message": "10% discount applied",
  "promo_code": "WELCOME10"
}
```

**Expected Response (Invalid):**
```json
{
  "valid": false,
  "message": "Invalid promo code"
}
```

#### Test 3.2: Paystack Webhook
```bash
# This is called by Paystack, test signature verification
curl -X POST http://localhost:3000/api/webhook/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: your-test-signature" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test-reference",
      "metadata": {
        "order_id": "order-uuid"
      }
    }
  }'
```

---

### 4. Kitchen APIs

#### Test 4.1: Get Active Orders
```bash
curl http://localhost:3000/api/kitchen/orders
```

**Expected Response:**
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

#### Test 4.2: Update Order Status
```bash
curl -X PATCH http://localhost:3000/api/kitchen/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "preparing",
    ...
  }
}
```

#### Test 4.3: Reprint Order
```bash
curl -X POST http://localhost:3000/api/kitchen/orders/ORDER_ID/print
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Print job queued for order ORD-20251020-0001"
}
```

#### Test 4.4: Toggle Item Availability
```bash
curl -X PATCH http://localhost:3000/api/kitchen/items/ITEM_ID/availability \
  -H "Content-Type: application/json" \
  -d '{
    "is_available": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "item": {...},
  "message": "Item marked as sold out"
}
```

#### Test 4.5: Update Restaurant Status
```bash
curl -X PATCH http://localhost:3000/api/kitchen/restaurant/status \
  -H "Content-Type: application/json" \
  -d '{
    "is_open": false,
    "prep_time": 45
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "is_open": false,
  "prep_time": 45,
  "message": "Restaurant status updated successfully"
}
```

---

### 5. Admin APIs - Menu Management

#### Test 5.1: List Categories
```bash
curl http://localhost:3000/api/admin/menu/categories
```

#### Test 5.2: Create Category
```bash
curl -X POST http://localhost:3000/api/admin/menu/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beverages",
    "description": "Refreshing drinks",
    "display_order": 5
  }'
```

#### Test 5.3: Update Category
```bash
curl -X PATCH http://localhost:3000/api/admin/menu/categories/CATEGORY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cold Beverages",
    "is_active": true
  }'
```

#### Test 5.4: Delete Category
```bash
curl -X DELETE http://localhost:3000/api/admin/menu/categories/CATEGORY_ID
```

#### Test 5.5: List Items
```bash
# All items
curl http://localhost:3000/api/admin/menu/items

# Items in specific category
curl "http://localhost:3000/api/admin/menu/items?category_id=CATEGORY_ID"
```

#### Test 5.6: Create Item
```bash
curl -X POST http://localhost:3000/api/admin/menu/items \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "CATEGORY_ID",
    "name": "Fried Rice",
    "description": "Delicious fried rice with vegetables",
    "base_price": 2000,
    "dietary_tag": "non_veg",
    "is_available": true
  }'
```

#### Test 5.7: Update Item
```bash
curl -X PATCH http://localhost:3000/api/admin/menu/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "base_price": 2200,
    "is_available": false
  }'
```

#### Test 5.8: Delete Item
```bash
curl -X DELETE http://localhost:3000/api/admin/menu/items/ITEM_ID
```

---

### 6. Admin APIs - Order Management

#### Test 6.1: List All Orders
```bash
# All orders
curl http://localhost:3000/api/admin/orders

# With filters
curl "http://localhost:3000/api/admin/orders?status=confirmed&page=1&limit=20"

# Search
curl "http://localhost:3000/api/admin/orders?search=ORD-20251020"
```

**Expected Response:**
```json
{
  "orders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Test 6.2: Update Order (Admin Override)
```bash
curl -X PATCH http://localhost:3000/api/admin/orders/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "admin_notes": "Customer requested early delivery"
  }'
```

#### Test 6.3: Process Refund
```bash
curl -X POST http://localhost:3000/api/admin/orders/ORDER_ID/refund \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer cancelled order",
    "amount": 5575
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order": {...},
  "refund": {...},
  "message": "Refund processed successfully"
}
```

---

### 7. Admin APIs - Promo Codes

#### Test 7.1: List Promos
```bash
# All promos
curl http://localhost:3000/api/admin/promos

# Active only
curl "http://localhost:3000/api/admin/promos?is_active=true"
```

#### Test 7.2: Create Promo
```bash
curl -X POST http://localhost:3000/api/admin/promos \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LAUNCH50",
    "description": "50% off launch promotion",
    "discount_type": "percentage",
    "discount_value": 50,
    "max_discount_amount": 2000,
    "min_order_value": 3000,
    "max_uses": 100,
    "expires_at": "2025-12-31T23:59:59Z",
    "is_active": true
  }'
```

#### Test 7.3: Update Promo
```bash
curl -X PATCH http://localhost:3000/api/admin/promos/PROMO_ID \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false,
    "max_uses": 50
  }'
```

#### Test 7.4: Delete Promo
```bash
curl -X DELETE http://localhost:3000/api/admin/promos/PROMO_ID
```

---

### 8. Admin APIs - Settings

#### Test 8.1: Get All Settings
```bash
curl http://localhost:3000/api/admin/settings
```

**Expected Response:**
```json
{
  "restaurant_info": {...},
  "order_settings": {...},
  "delivery_settings": {...},
  "payment_settings": {...},
  "operating_hours": {...}
}
```

#### Test 8.2: Update Settings
```bash
curl -X PATCH http://localhost:3000/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{
    "key": "order_settings",
    "value": {
      "is_open": true,
      "default_prep_time": 30,
      "current_prep_time": 25,
      "max_advance_order_days": 7
    }
  }'
```

---

## 🎯 Complete Test Sequence

### End-to-End Customer Flow

```bash
# 1. Customer browses menu
curl http://localhost:3000/api/menu

# 2. Customer checks restaurant status
curl http://localhost:3000/api/restaurant/status

# 3. Customer validates promo code
curl -X POST http://localhost:3000/api/promo/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "WELCOME10", "order_total": 5000}'

# 4. Customer creates order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{...order data...}'

# 5. Customer pays (redirected to Paystack)
# 6. Payment verified
curl -X POST http://localhost:3000/api/orders/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"order_id": "xxx", "reference": "xxx"}'

# 7. Customer tracks order
curl "http://localhost:3000/api/orders/ORDER_ID?phone=08012345678"
```

### Kitchen Workflow

```bash
# 1. Kitchen sees new order
curl http://localhost:3000/api/kitchen/orders

# 2. Kitchen starts preparing
curl -X PATCH http://localhost:3000/api/kitchen/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing"}'

# 3. Kitchen marks ready
curl -X PATCH http://localhost:3000/api/kitchen/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "ready"}'

# 4. Order out for delivery
curl -X PATCH http://localhost:3000/api/kitchen/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "out_for_delivery"}'
```

---

## ✅ Success Criteria Checklist

### For Each Endpoint:
- [ ] Returns correct HTTP status code
- [ ] Response matches expected JSON structure
- [ ] Validation errors return 400 with details
- [ ] Not found errors return 404
- [ ] Server errors return 500
- [ ] Database updates persist
- [ ] Related data loads correctly

### Integration Tests:
- [ ] Order creation adds to database
- [ ] Payment verification updates status
- [ ] Order tracking works with/without phone
- [ ] Kitchen status updates reflect immediately
- [ ] Admin changes persist
- [ ] Promo codes calculate correctly
- [ ] Refunds process through Paystack

---

## 🐛 Troubleshooting

### Common Issues:

**1. 500 Internal Server Error**
- Check Supabase connection in `.env.local`
- Verify database tables exist
- Check server console for errors

**2. 404 Not Found**
- Verify IDs exist in database
- Check API route path

**3. 400 Validation Error**
- Review request body format
- Check required fields
- Validate data types

**4. Webhook Signature Failed**
- Verify `PAYSTACK_SECRET_KEY` in `.env.local`
- Check signature header format

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________

Public APIs:
✅ Menu fetch - PASS
✅ Restaurant info - PASS
✅ Restaurant status - PASS
✅ Delivery cities - PASS
✅ Order creation - PASS
✅ Payment verification - PASS
✅ Order tracking - PASS
✅ Promo validation - PASS
✅ Webhook - PASS

Kitchen APIs:
✅ Get orders - PASS
✅ Update status - PASS
✅ Reprint - PASS
✅ Toggle availability - PASS
✅ Restaurant status - PASS

Admin APIs:
✅ Category CRUD - PASS
✅ Item CRUD - PASS
✅ Order management - PASS
✅ Refunds - PASS
✅ Promo CRUD - PASS
✅ Settings - PASS

Notes:
_________________________
_________________________
```

---

## 🚀 Next Steps After Testing

1. ✅ **All tests pass** - Proceed to authentication
2. ✅ **Found bugs** - Fix and retest
3. ✅ **Need improvements** - Document and prioritize
4. ✅ **Ready for frontend** - Connect React hooks to APIs

---

**Happy Testing! 🧪**

# Testing Checklist - JollofExpress Order System

## ✅ All Fixed Issues

### 1. Payment Verification Parameter ✅
- **Was:** Sending `payment_reference` to API
- **Now:** Sending `reference` (correct)
- **File:** `hooks/use-orders.ts`

### 2. Payment Confirmation Status ✅  
- **Was:** Using `createClient()` with RLS blocking updates
- **Now:** Using `createServiceClient()` to bypass RLS
- **Files:** `app/api/orders/verify-payment/route.ts`, `app/api/webhook/paystack/route.ts`

### 3. Admin Orders Page ✅
- **Was:** 404 error at `/admin/orders`
- **Now:** Full admin orders management page created
- **File:** `app/admin/orders/page.tsx`

### 4. Admin Orders API Response ✅
- **Was:** Hook expected array, API returned object
- **Now:** Hook extracts `orders` from response
- **File:** `hooks/use-orders.ts`

---

## 🧪 Complete Testing Guide

### Phase 1: Environment Setup ✅

**Check your `.env.local` file has:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SECRET_KEY=your_service_role_key
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Start the dev server:**
```bash
npm run dev
```

---

### Phase 2: Customer Order Flow 🛒

#### Test Case 1: Browse Menu
1. ✅ Go to `http://localhost:3000/menu`
2. ✅ Verify menu items load with images and prices
3. ✅ Check dietary tags display (🥬 veg, 🍗 non-veg, etc.)
4. ✅ Click on a menu item to view details

#### Test Case 2: Add to Cart
1. ✅ Click "Add to Cart" on any item
2. ✅ Cart icon should show item count
3. ✅ Click cart icon to open cart sheet
4. ✅ Verify item appears with correct price
5. ✅ Test quantity increase/decrease buttons
6. ✅ Test "Remove" button
7. ✅ Add items with variations (if available)
8. ✅ Add items with add-ons (if available)

#### Test Case 3: Checkout Form - Validation
1. ✅ Add item(s) to cart
2. ✅ Click "Checkout" button
3. ✅ Try to submit empty form → Should show errors
4. ✅ Test each validation:
   - **Name:** Must be at least 2 characters
   - **Phone:** Must match format 08012345678 or +2348012345678
   - **Email:** Must be valid email (required for Paystack)
   - **Delivery Address:** Required for delivery, min 20 characters

#### Test Case 4: Successful Order & Payment
1. ✅ Fill in **ALL required fields:**
   ```
   Name: Test Customer
   Phone: 08012345678
   Email: test@example.com
   Delivery Address: 10 Ecwa Road, Near Coker Junction, Awka, Anambra State
   ```
2. ✅ Select **Delivery** or **Carryout**
3. ✅ Click "Proceed to Payment"
4. ✅ Verify redirects to Paystack payment page
5. ✅ Use Paystack test card:
   ```
   Card: 4084 0840 8408 4081
   CVV: 408
   Expiry: 12/25
   PIN: 0000
   OTP: 123456
   ```
6. ✅ Complete payment
7. ✅ Should redirect to `/orders/[id]?reference=...`
8. ✅ Wait for "Verifying payment..." message
9. ✅ **CRITICAL:** Verify green success card appears
10. ✅ **CRITICAL:** Verify "Payment Confirmed" status is lit/highlighted
11. ✅ Verify order number displays (e.g., ORD-20251021-2665)
12. ✅ Check order details on right side

#### Test Case 5: Order Tracking Updates
1. ✅ Stay on order tracking page
2. ✅ Status should auto-update every 10 seconds
3. ✅ Watch for status changes as kitchen processes order
4. ✅ Verify status indicators light up progressively

---

### Phase 3: Kitchen Display System 👨‍🍳

#### Test Case 6: Kitchen View
1. ✅ Open new browser tab/window
2. ✅ Go to `http://localhost:3000/kitchen`
3. ✅ Verify order appears in **"New Orders"** column
4. ✅ Check order card shows:
   - Order number
   - Customer name and phone
   - Delivery address (if delivery)
   - Order items
   - Time since order placed
   - Total amount

#### Test Case 7: Order Status Updates
1. ✅ Click on order card in "New Orders"
2. ✅ Verify details dialog opens
3. ✅ Click "Start Preparing" button
4. ✅ Order should move to **"Preparing"** column
5. ✅ Click order again, click "Mark Ready"
6. ✅ Order should move to **"Ready for Pickup"** column
7. ✅ If delivery, click "Out for Delivery"
8. ✅ Order should move to **"Out for Delivery"** column

#### Test Case 8: Real-time Sync
1. ✅ Keep both tabs open (customer tracking + kitchen)
2. ✅ Update status in kitchen
3. ✅ Switch to customer tracking tab
4. ✅ Wait up to 10 seconds
5. ✅ Verify status updates automatically

#### Test Case 9: Kitchen Features
1. ✅ Test "Reprint" button (queues print job)
2. ✅ Check order age color coding:
   - Green border: < 10 minutes
   - Yellow border: 10-20 minutes
   - Red border: > 20 minutes
3. ✅ Verify special instructions show in yellow box
4. ✅ Test Restaurant Status toggle in kitchen controls

---

### Phase 4: Admin Panel 👨‍💼

#### Test Case 10: Admin Dashboard
1. ✅ Go to `http://localhost:3000/admin`
2. ✅ Verify dashboard loads
3. ✅ Stats show (currently placeholder data)
4. ✅ Click "View Orders" link

#### Test Case 11: Admin Orders Page
1. ✅ Should redirect to `/admin/orders`
2. ✅ Verify order appears in orders table
3. ✅ Check order details:
   - Order number
   - Customer name & phone
   - Order type (delivery/carryout)
   - Status badge with color
   - Payment status badge
   - Total amount
   - Timestamp

#### Test Case 12: Order Search & Filters
1. ✅ Test search box with:
   - Order number
   - Customer name
   - Phone number
2. ✅ Test status filter dropdown
3. ✅ Test payment status filter
4. ✅ Verify results update correctly

#### Test Case 13: Order Details & Updates
1. ✅ Click "View" button on any order
2. ✅ Verify order details dialog opens
3. ✅ Check customer information displays
4. ✅ Check delivery address (if delivery)
5. ✅ Verify all order items list correctly
6. ✅ Check price breakdown (subtotal, tax, delivery, total)
7. ✅ Click status update buttons
8. ✅ Verify status changes immediately
9. ✅ Check status reflects in kitchen view

---

### Phase 5: Error Handling 🚨

#### Test Case 14: Payment Failures
1. ✅ Create new order
2. ✅ Use failing test card: `5060 6666 6666 6666`
3. ✅ Verify payment fails
4. ✅ Check order status shows "Payment Failed"
5. ✅ Verify order NOT in kitchen

#### Test Case 15: Form Validation Errors
1. ✅ Try submitting with invalid phone: `1234` → Should error
2. ✅ Try submitting with invalid email: `notanemail` → Should error
3. ✅ Try short address (delivery): `Test` → Should error (min 20 chars)
4. ✅ Verify error messages display clearly
5. ✅ Verify form scrolls to first error

#### Test Case 16: Network Errors
1. ✅ Stop dev server
2. ✅ Try to submit order
3. ✅ Verify error message displays
4. ✅ Restart server and retry

---

### Phase 6: Edge Cases 🔍

#### Test Case 17: Empty Cart
1. ✅ Clear cart if items exist
2. ✅ Try to access `/checkout` directly
3. ✅ Should redirect to menu with message

#### Test Case 18: Multiple Items
1. ✅ Add 5+ different items to cart
2. ✅ Complete checkout
3. ✅ Verify all items display in:
   - Order tracking
   - Kitchen display
   - Admin panel

#### Test Case 19: Promo Codes (if implemented)
1. ✅ Apply valid promo code
2. ✅ Verify discount applies
3. ✅ Check discounted total matches Paystack amount

#### Test Case 20: Order History
1. ✅ Complete multiple orders with same phone
2. ✅ Access `/orders/[id]` with `?phone=...` parameter
3. ✅ Verify can view own orders

---

## 📊 Test Results Summary

| Test Phase | Status | Notes |
|------------|--------|-------|
| Environment Setup | ⏳ Pending | Check .env file |
| Customer Order Flow | ⏳ Pending | Test all 5 cases |
| Kitchen Display | ⏳ Pending | Test all 4 cases |
| Admin Panel | ⏳ Pending | Test all 4 cases |
| Error Handling | ⏳ Pending | Test all 3 cases |
| Edge Cases | ⏳ Pending | Test all 3 cases |

---

## 🐛 If Something Breaks

### Payment not confirming?
1. Check browser console for errors
2. Verify `PAYSTACK_SECRET_KEY` is set
3. Check Network tab → `/api/orders/verify-payment`
4. Look for "Missing required fields" (should be fixed now)

### Order not appearing in kitchen?
1. Check order status is "confirmed" or later
2. Open `/api/kitchen/orders` directly
3. Check browser console for errors
4. Verify order created_at is today

### Admin orders 404?
1. **FIXED** - Page now exists at `/admin/orders`
2. Clear browser cache if still seeing 404
3. Restart dev server

### Status not updating?
1. Wait up to 10 seconds (polling interval)
2. Check browser console for API errors
3. Verify service client is used (already fixed)

---

## ✨ Success Criteria

Your system is working correctly if:

1. ✅ Order completes successfully with test payment
2. ✅ "Payment Confirmed" status lights up on order tracking
3. ✅ Order appears immediately in kitchen display
4. ✅ Kitchen can update order status
5. ✅ Status changes reflect in customer view within 10 seconds
6. ✅ Admin can view and manage all orders
7. ✅ No console errors during normal flow

---

## 🚀 Next Steps After Testing

1. **Configure Real Payment**
   - Replace test keys with live Paystack keys
   - Test with small real transaction

2. **Add Notifications**
   - SMS via Termii/Africa's Talking
   - Email via Resend/SendGrid
   - Push notifications

3. **Implement Dashboard Stats**
   - Daily revenue
   - Order count
   - Average order value
   - Peak hours

4. **Deploy to Production**
   - Vercel/Netlify for frontend
   - Supabase already hosted
   - Configure domain

5. **Monitor & Optimize**
   - Check Supabase logs
   - Monitor Paystack dashboard
   - Gather user feedback

---

**Last Updated:** 2025-10-21  
**Version:** 1.0  
**Status:** Ready for Testing ✅

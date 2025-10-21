# Checkout Settings - Quick Testing Guide

## 🚀 Quick Start
```bash
npm run dev
```
Visit: http://localhost:3000

## 📋 Test Scenario 1: Minimum Order Validation (Delivery)

### Setup
1. Go to Menu page
2. Add **1x Jollof Rice** (₦2,500) to cart
3. Click "Checkout"

### Expected Result ✅
- Order type: "Delivery" selected
- Subtotal: ₦2,500
- Delivery Fee: **₦750** (not ₦200)
- Alert: NO alert (above minimum)
- Button: "Proceed to Payment" is **ENABLED**

---

## 📋 Test Scenario 2: Below Minimum Order (Delivery)

### Setup
1. Go to Menu page
2. Add **1x Small Item** (< ₦2,000) to cart
3. Click "Checkout"

### Expected Result ✅
- Order type: "Delivery" selected
- Subtotal: < ₦2,000
- **RED ALERT appears**:
  ```
  ⚠️ Minimum order amount for delivery is ₦2,000.
  Your current subtotal is ₦XXX.
  Please add ₦XXX more to proceed.
  ```
- Delivery Fee: **₦750**
- Button: "Proceed to Payment" is **DISABLED** (grayed out)
- Clicking button shows error toast

---

## 📋 Test Scenario 3: Carryout Order (No Minimum)

### Setup
1. Add any item to cart (even < ₦2,000)
2. Go to Checkout
3. Select **"Carryout"** option

### Expected Result ✅
- Order type: "Carryout" selected
- Delivery Fee: **₦0** (zero)
- Alert: NO alert (no minimum for carryout)
- Button: "Proceed to Payment" is **ENABLED**
- Can proceed with any order amount

---

## 📋 Test Scenario 4: Switch Between Order Types

### Setup
1. Add small item (< ₦2,000) to cart
2. Go to Checkout
3. Select "Delivery" → See alert
4. Select "Carryout" → Alert disappears
5. Select "Delivery" → Alert reappears

### Expected Result ✅
- Delivery fee updates: ₦750 ↔ ₦0
- Alert shows/hides correctly
- Order Summary updates in real-time
- Button enabled/disabled correctly

---

## 📋 Test Scenario 5: Add Items to Reach Minimum

### Setup
1. Add item worth ₦1,000 to cart
2. Go to Checkout (Delivery)
3. See red alert
4. Click "Back to Menu"
5. Add another ₦1,000+ item
6. Return to Checkout

### Expected Result ✅
- First visit: Alert shows "Add ₦1,000 more"
- After adding items: Alert **disappears**
- Button becomes **enabled**
- Can proceed to payment

---

## 🎨 Visual Indicators to Verify

### Order Summary (Right Panel)
```
Order Summary
─────────────
1x Jollof rice         ₦2,500

Subtotal              ₦2,500
Delivery Fee            ₦750  ← Should be ₦750, not ₦200
Tax (7.5%)              ₦188
─────────────
Total                 ₦3,438
```

### Alert Component (When Below Minimum)
```
┌─────────────────────────────────────────────┐
│ ⚠️ Minimum order amount for delivery is     │
│    ₦2,000. Your current subtotal is ₦500.  │
│    Please add ₦1,500 more to proceed.       │
└─────────────────────────────────────────────┘
```

### Button States
- **Enabled**: Blue background, clickable
- **Disabled**: Gray background, not clickable, cursor: not-allowed

---

## 🔧 Admin Settings Verification

### Check Current Settings
1. Login to Admin Panel: http://localhost:3000/admin
2. Go to **Settings** → **Delivery** tab
3. Verify:
   - ✅ Minimum Order Amount (₦): **2000**
   - ✅ Standard Delivery Fee (₦): **750**
   - ✅ Delivery Cities: Awka, Nsukka

### Test Settings Update
1. Change Minimum Order to **3000**
2. Click "Save Changes"
3. Open new tab → Go to Checkout
4. Verify alert now says "Minimum order amount is ₦3,000"

---

## 🐛 Common Issues & Fixes

### Issue: Still showing ₦200 delivery fee
**Fix**: 
- Hard refresh the page (Ctrl+Shift+R)
- Clear browser cache
- Settings cache: 10 minutes

### Issue: Alert component not found error
**Fix**: 
- Check `components/ui/alert.tsx` exists
- Restart TypeScript server
- Restart dev server

### Issue: Minimum order not enforcing
**Fix**:
- Check browser console for errors
- Verify `/api/delivery/settings` returns correct data
- Check network tab for API calls

---

## ✅ Success Criteria

All of these should work:
- [x] Delivery fee is ₦750 (from settings, not hardcoded)
- [x] Minimum order ₦2,000 enforced for delivery
- [x] No minimum for carryout orders
- [x] Alert appears when below minimum
- [x] Button disabled when below minimum
- [x] Order summary shows correct delivery fee
- [x] Switching order types updates fees correctly
- [x] Adding items removes alert when threshold reached

---

## 📊 API Endpoints to Check

### Test API Directly
```bash
# Get delivery settings
curl http://localhost:3000/api/delivery/settings

# Expected response:
{
  "enabled": true,
  "cities": ["Awka", "Nsukka"],
  "min_order": 2000,
  "delivery_fee": 750
}
```

---

## 🎯 Final Verification

1. ✅ Can place order ≥ ₦2,000 (delivery)
2. ✅ Cannot place order < ₦2,000 (delivery)
3. ✅ Can place any order (carryout)
4. ✅ Delivery fee is correct
5. ✅ UI provides clear feedback
6. ✅ Settings updates take effect

**Status**: Implementation Complete ✅

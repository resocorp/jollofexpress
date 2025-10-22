# Promo Code Module - Quick Start Guide

## 🚀 Start Testing in 3 Steps

### 1. Start Development Server
```bash
npm run dev
```

### 2. Navigate to Admin Promo Page
```
http://localhost:3000/admin/promos
```

### 3. Create Your First Promo Code

**Example: 10% Off Welcome Promo**
- Code: `WELCOME10`
- Type: Percentage
- Value: `10`
- Min Order: `1000`
- Max Discount: `2000`
- Usage Limit: `100`
- Expiry: 30 days from today

---

## 📍 Quick Access URLs

| Feature | URL | Description |
|---------|-----|-------------|
| **Admin Promos** | `/admin/promos` | Manage all promo codes |
| **Customer Menu** | `/menu` | Browse menu & add to cart |
| **Customer Cart** | Click cart icon | Apply promo codes |
| **Checkout** | `/checkout` | Complete order with promo |

---

## 🎯 Test Scenarios

### Scenario 1: Create & Apply Promo
1. Create promo code `TEST50` - 50% off, min ₦2000
2. Add items worth ₦3000 to cart
3. Apply `TEST50` in cart
4. Verify ₦1500 discount applied
5. Complete checkout

### Scenario 2: Expired Promo
1. Create promo with yesterday's date
2. Try to apply in cart
3. Verify "expired" error shows

### Scenario 3: Usage Limit
1. Create promo with limit of 1
2. Use it once (complete order)
3. Try to use again
4. Verify "max uses" error shows

### Scenario 4: Min Order Value
1. Create promo with ₦5000 minimum
2. Add items worth ₦3000
3. Try to apply promo
4. Verify min order error shows

---

## 🔑 Sample Promo Codes to Create

### New Customer Welcome
```
Code: WELCOME10
Type: Percentage
Value: 10
Min Order: 1000
Max Discount: 2000
Usage Limit: -
Expiry: 30 days
```

### Flash Sale
```
Code: FLASH50
Type: Fixed Amount
Value: 500
Min Order: 2000
Usage Limit: 50
Expiry: 7 days
```

### Loyal Customer
```
Code: LOYAL15
Type: Percentage
Value: 15
Min Order: 5000
Max Discount: 3000
Usage Limit: -
Expiry: -
```

---

## 🐛 Troubleshooting

### Promo not applying?
- Check if code is active (toggle in edit dialog)
- Verify not expired
- Check usage limit not reached
- Ensure cart meets minimum order value

### Can't edit code?
- If promo has been used, code field is locked
- This preserves order history integrity
- You can still edit other fields

### Delete vs Deactivate?
- **Never used** → Full delete from database
- **Has been used** → Deactivates only (preserves orders)

---

## 📊 Status Meanings

| Badge | Meaning | Action |
|-------|---------|--------|
| 🟢 **Active** | Valid & usable | Customers can apply |
| 🟡 **Expiring Soon** | <7 days left | Consider extending |
| 🔴 **Expired** | Past expiry date | Reactivate or delete |
| 🟣 **Maxed Out** | Usage limit reached | Increase limit or create new |

---

## 💡 Pro Tips

1. **Test First**: Create test promos with short expiry to test flows
2. **Track Usage**: Monitor which promos are most popular
3. **Set Limits**: Use max discount to control costs on percentage promos
4. **Min Orders**: Encourage larger orders with minimum values
5. **Clear Codes**: Use memorable, descriptive codes (SUMMER20, NEWYEAR15)

---

## 🔒 Security Notes

- All validation happens server-side
- Customers can only see active, valid promos
- Discount calculations are verified on checkout
- Admin access required for management
- Used count increments automatically on order creation

---

## 📱 Mobile Testing

Don't forget to test on mobile:
1. Cart sheet promo input
2. Form visibility on small screens
3. Dialog scrolling
4. Table responsiveness

---

**Ready to test? Start with Scenario 1 above! 🚀**

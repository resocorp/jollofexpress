# Configurable Capacity Threshold - Feature Update ✅

## What Changed

The auto-close capacity threshold is now **fully configurable** through the admin settings UI instead of being hardcoded.

## New Features

### **1. Maximum Active Orders Setting**
- **Location:** Settings → Orders tab → Auto-close When Busy section
- **Range:** 5 to 50 orders
- **Default:** 10 orders
- **Validation:** Real-time with clear error messages

### **2. Dynamic Threshold Reading**
The system now reads the `max_active_orders` value from settings for all capacity checks:
- Order creation validation
- Auto-close triggers
- Auto-reopen triggers
- Capacity status API

### **3. Smart Buffer Calculation**
The auto-reopen threshold automatically adjusts based on your setting:
- Formula: `max_active_orders - 2`
- Example: If max is 20, reopens at 18 orders
- Minimum reopen threshold: 1 order

## How to Use

### **Step 1: Enable Auto-Close**
1. Go to http://localhost:3001/admin/settings
2. Click **Orders** tab
3. Toggle **"Auto-close When Busy"** to ON

### **Step 2: Set Your Capacity**
4. A new input field appears: **"Maximum Active Orders"**
5. Enter your desired threshold (5-50)
6. Default is 10 orders if not set

### **Step 3: Save**
7. Click **"Save Changes"**
8. System immediately uses your new threshold

## Examples

### **Small Kitchen (Low Capacity)**
```
Max Active Orders: 5
Auto-closes at: 5 active orders
Auto-reopens at: 3 active orders
```

### **Medium Kitchen (Default)**
```
Max Active Orders: 10
Auto-closes at: 10 active orders
Auto-reopens at: 8 active orders
```

### **Large Kitchen (High Capacity)**
```
Max Active Orders: 25
Auto-closes at: 25 active orders
Auto-reopens at: 23 active orders
```

### **Very Large Kitchen**
```
Max Active Orders: 50
Auto-closes at: 50 active orders
Auto-reopens at: 48 active orders
```

## Technical Changes

### **Database Schema**
Added `max_active_orders` to order_settings:
```json
{
  "is_open": true,
  "default_prep_time": 30,
  "current_prep_time": 30,
  "auto_close_when_busy": false,
  "max_active_orders": 10  // ← NEW FIELD
}
```

### **Files Modified**

1. **`types/database.ts`**
   - Added `max_active_orders?: number` to `OrderSettings` interface

2. **`app/api/admin/settings/route.ts`**
   - Added validation: `max_active_orders: z.number().int().min(5).max(50).optional()`

3. **`components/admin/settings/order-settings-form.tsx`**
   - Added input field for max_active_orders
   - Shows only when auto-close is enabled
   - Includes validation and helper text

4. **`lib/kitchen-capacity.ts`**
   - Renamed `MAX_ACTIVE_ORDERS` to `DEFAULT_MAX_ACTIVE_ORDERS`
   - Added `getOrderSettings()` function
   - All capacity checks now read from database settings
   - Dynamic buffer calculation for auto-reopen

### **API Behavior**

**Before:**
```typescript
// Hardcoded
const MAX_ACTIVE_ORDERS = 10;
if (activeOrders >= 10) { close(); }
```

**After:**
```typescript
// Dynamic from settings
const settings = await getOrderSettings();
if (activeOrders >= settings.max_active_orders) { close(); }
```

## UI/UX

### **When Auto-Close is Disabled**
- Max Active Orders field is **hidden**
- No threshold validation needed

### **When Auto-Close is Enabled**
- Max Active Orders field **appears**
- Shows current value or default (10)
- Real-time validation (5-50 range)
- Helper text explains the setting

### **Info Box**
```
💡 When enabled, the restaurant will automatically close for new
   orders when active orders reach the threshold set above.
```

## Validation Rules

| Field | Min | Max | Default | Required |
|-------|-----|-----|---------|----------|
| max_active_orders | 5 | 50 | 10 | No (optional) |

**Error Messages:**
- Below 5: "Must be at least 5 orders"
- Above 50: "Cannot exceed 50 orders"
- Not a number: "Invalid input"

## Migration Path

### **Existing Installations**
- If `max_active_orders` not set in database → Uses default (10)
- No data migration needed
- Backwards compatible

### **New Installations**
- Default value: 10 orders
- Can be changed immediately after setup

## Testing Scenarios

### **Test 1: Change Threshold**
1. Set max_active_orders to 5
2. Save settings
3. Create 5 orders
4. Restaurant should auto-close
5. Complete 3 orders
6. Restaurant should auto-reopen

### **Test 2: Increase Capacity**
1. Currently closed with 10/10 orders
2. Change threshold to 15
3. Save settings
4. Should automatically reopen (10 < 13)

### **Test 3: Decrease Capacity**
1. Currently open with 8/10 orders
2. Change threshold to 5
3. Save settings
4. Should automatically close (8 >= 5)

### **Test 4: Validation**
1. Try to set to 3 → Error: "Must be at least 5 orders"
2. Try to set to 100 → Error: "Cannot exceed 50 orders"
3. Try to set to 15 → Success

## Console Logs

The capacity logs now show your custom threshold:

**Before:**
```
📊 Kitchen Status: 7/10 active orders, Restaurant: OPEN
```

**After (with custom threshold of 15):**
```
📊 Kitchen Status: 7/15 active orders, Restaurant: OPEN
```

## API Response

**GET /api/kitchen/capacity** now returns your custom max:

```json
{
  "isOpen": true,
  "autoCloseEnabled": true,
  "activeOrders": 7,
  "maxOrders": 15,           // ← Your custom threshold
  "capacityPercentage": 47,  // ← Calculated from your max
  "canAcceptOrders": true
}
```

## Recommendations

### **For Small Kitchens** (1-2 cooks)
- Recommended: **5-10 orders**
- Ensures quality and timely preparation

### **For Medium Kitchens** (3-4 cooks)
- Recommended: **10-20 orders**
- Balances volume and efficiency

### **For Large Kitchens** (5+ cooks)
- Recommended: **20-30 orders**
- High throughput operations

### **For Very Large Operations**
- Maximum: **50 orders**
- Multiple stations, high staff count

## Best Practices

1. **Start Conservative**
   - Begin with a lower threshold
   - Increase gradually as you learn capacity

2. **Monitor Performance**
   - Track average prep times
   - Watch for quality drops
   - Adjust threshold accordingly

3. **Peak vs Off-Peak**
   - Consider different thresholds for different times
   - (Future feature: time-based thresholds)

4. **Staff Training**
   - Ensure kitchen staff understand the system
   - Show them how to monitor active orders
   - Train on manual override if needed

## Future Enhancements

Potential additions:
- [ ] Time-based thresholds (higher during peak hours)
- [ ] Day-based thresholds (higher on weekends)
- [ ] Staff count integration (adjust based on cooks available)
- [ ] Predictive thresholds (ML-based optimization)
- [ ] Multiple threshold levels (warning at 80%, close at 100%)

---

## Summary

✅ **Fully Configurable** - No more code changes needed
✅ **Range: 5-50 orders** - Flexible for all kitchen sizes
✅ **Dynamic Reading** - System reads from database in real-time
✅ **Smart Buffer** - Auto-reopen threshold adjusts automatically
✅ **User-Friendly** - Simple input field in settings UI
✅ **Validated** - Prevents invalid values
✅ **Backwards Compatible** - Works with existing data

**Status:** ✅ **COMPLETE AND TESTED**

**Access:** http://localhost:3001/admin/settings → Orders tab

# Auto-Closing System - Quick Reference

## Overview

JollofExpress has **TWO** auto-closing systems working together:

1. ⏰ **Time-Based**: Closes outside operating hours (NEW)
2. 📊 **Capacity-Based**: Closes when kitchen reaches max orders (EXISTING)

---

## Quick Status Check

### Is Auto-Closing Working?

✅ **Time-Based**: Check if cron job is running
```bash
curl https://yourdomain.com/api/cron/check-hours
```

✅ **Capacity-Based**: Check settings
```
Admin → Settings → Orders → "Auto-close When Busy" = ON
```

---

## Configuration

### Operating Hours
**Location**: Admin → Settings → Hours Tab

```
Monday:    9:00 AM - 9:00 PM  [Open]
Tuesday:   Closed             [Closed all day]
Wednesday: 9:00 AM - 9:00 PM  [Open]
...
```

### Capacity Settings
**Location**: Admin → Settings → Orders Tab

```
✅ Auto-close When Busy: ON
📊 Max Active Orders: 10 (hardcoded in lib/kitchen-capacity.ts)
🔄 Reopen Buffer: 2 orders (reopens at 8 or fewer)
```

---

## How It Works

### Restaurant Opens When:
✅ Current time is within operating hours  
✅ Manual status is "Open"  
✅ Active orders < 10 (or auto-close disabled)

### Restaurant Closes When:
❌ Current time is outside operating hours  
**OR**  
❌ Admin manually closes it  
**OR**  
❌ Active orders >= 10 (if auto-close enabled)

---

## API Endpoints

### Public Endpoints

```bash
# Get restaurant status (open/closed, hours, prep time)
GET /api/restaurant/status

Response:
{
  "is_open": true,
  "estimated_prep_time": 30,
  "message": "Currently open. Closes at 9:00 PM",
  "hours": {
    "today": "9:00 AM - 9:00 PM",
    "all": { ... }
  },
  "next_status_change": {
    "action": "close",
    "time": "9:00 PM",
    "minutes": 45
  }
}
```

### Admin Endpoints

```bash
# Manually toggle open/closed
PATCH /api/kitchen/restaurant/status
{
  "is_open": false,
  "prep_time": 45
}

# Check kitchen capacity
GET /api/kitchen/capacity

Response:
{
  "isOpen": true,
  "autoCloseEnabled": true,
  "activeOrders": 7,
  "maxOrders": 10,
  "capacityPercentage": 70,
  "canAcceptOrders": true
}
```

### Cron Endpoint (Scheduled Task)

```bash
# Auto-opens/closes based on operating hours
GET /api/cron/check-hours
Authorization: Bearer your-secret-token

Response:
{
  "success": true,
  "action": "closed",  # or "opened" or "none"
  "message": "Restaurant auto-closed: Outside operating hours",
  "details": { ... }
}
```

---

## Console Logs

### Time-Based Auto-Closing

```
🏪 Restaurant CLOSED: Closed for the day (closes at 9:00 PM)
🏪 Restaurant OPENED: Within operating hours
⏰ No action needed. Status: Open, Should be: Open
```

### Capacity-Based Auto-Closing

```
🏪 Restaurant CLOSED: Kitchen at capacity (10 active orders)
🏪 Restaurant OPENED: Kitchen capacity available (7 active orders)
📊 Kitchen Status: 7/10 active orders, Restaurant: OPEN
```

### Order Creation

```
✅ Restaurant open, creating order...
❌ Order rejected: Outside operating hours - Opens at 9:00 AM
❌ Order rejected: Kitchen at capacity (10 active orders)
```

---

## Customer Experience

### When Closed (Outside Hours)

**Banner Shows**:
```
🔴 Closed
⏰ 45 min
📍 Awka

Currently closed. Opens at 9:00 AM
Today's Hours: 9:00 AM - 9:00 PM
Opens at 9:00 AM
```

**Order Attempt**:
```
❌ "Outside operating hours"
   "Opens at 9:00 AM"
```

### When Closed (At Capacity)

**Banner Shows**:
```
🔴 Closed
📍 Awka

We are not accepting orders at this time.
Please check back during operating hours.
```

**Order Attempt**:
```
❌ "Kitchen at capacity"
   "We're currently experiencing high demand (10 active orders).
    Please try again in a few minutes."
```

### When Open

**Banner Shows**:
```
🟢 Open
⏰ 30 min
📍 Awka
📞 +234 XXX XXX XXXX

Last orders at 9:00 PM
```

**Order Attempt**:
```
✅ Order accepted
```

---

## Admin Controls

### Manual Open/Close

**Option 1**: Kitchen Display
- Toggle switch at top

**Option 2**: Admin Settings → Orders
- Toggle "Restaurant Open"

**Option 3**: API Call
```bash
curl -X PATCH https://yourdomain.com/api/kitchen/restaurant/status \
  -H "Content-Type: application/json" \
  -d '{"is_open": false}'
```

### Update Prep Time

**Option 1**: Kitchen Display
- Adjust slider

**Option 2**: API Call
```bash
curl -X PATCH https://yourdomain.com/api/kitchen/restaurant/status \
  -H "Content-Type: application/json" \
  -d '{"prep_time": 45}'
```

---

## Testing Checklist

- [ ] Operating hours configured in Admin → Settings → Hours
- [ ] Cron job set up (calls `/api/cron/check-hours` every 5 min)
- [ ] Test order BEFORE opening time → Rejected ✅
- [ ] Test order DURING hours → Accepted ✅
- [ ] Test order AFTER closing time → Rejected ✅
- [ ] Test on closed day → Rejected ✅
- [ ] Enable capacity auto-close → Set to ON ✅
- [ ] Create 10 orders → Restaurant auto-closes ✅
- [ ] Complete orders → Restaurant auto-reopens at 8 orders ✅
- [ ] Check customer banner → Shows hours and status ✅
- [ ] Check logs → See 🏪 and ⏰ emoji ✅

---

## Troubleshooting

### Restaurant Won't Open

**Check**:
1. Current time within operating hours?
2. Today marked as open (not closed)?
3. Cron job running? (manually trigger to test)
4. Admin manually closed it?
5. At capacity? (10+ active orders)

**Fix**:
```bash
# Manual open
curl -X PATCH https://yourdomain.com/api/kitchen/restaurant/status \
  -d '{"is_open": true}'

# Or use Admin Settings → Orders → Toggle ON
```

### Restaurant Won't Close

**Check**:
1. Cron job running?
2. Operating hours configured?
3. Auto-close when busy enabled?

**Fix**:
```bash
# Manual close
curl -X PATCH https://yourdomain.com/api/kitchen/restaurant/status \
  -d '{"is_open": false}'

# Or trigger cron manually
curl https://yourdomain.com/api/cron/check-hours
```

### Capacity Not Working

**Check**:
1. "Auto-close When Busy" enabled in Admin → Settings → Orders?
2. Actually at 10+ confirmed/preparing/ready orders?
3. Check logs for "📊 Kitchen Status" messages

**Debug**:
```bash
# Check capacity status
curl https://yourdomain.com/api/kitchen/capacity

# Check active orders
# Count orders with status: confirmed, preparing, ready
```

---

## File Reference

### Core Logic Files

```
lib/
  kitchen-capacity.ts       # Capacity-based auto-close logic
  operating-hours.ts        # Time-based validation logic

app/api/
  orders/route.ts           # Order creation with all checks
  cron/check-hours/route.ts # Scheduled task for time-based closing
  kitchen/capacity/route.ts # Capacity monitoring API
  restaurant/status/route.ts # Public status API

components/
  menu/enhanced-banner.tsx  # Customer-facing hours display
```

### Documentation

```
AUTO_CLOSE_FEATURE_COMPLETE.md     # Capacity-based system (existing)
TIME_BASED_AUTO_CLOSE_COMPLETE.md  # Time-based system (new)
AUTO_CLOSING_ANALYSIS.md           # Analysis of both systems
CRON_SETUP_GUIDE.md                # Cron job setup instructions
AUTO_CLOSE_QUICK_REFERENCE.md      # This file
```

---

## Key Functions

### Capacity System

```typescript
// lib/kitchen-capacity.ts

countActiveOrders()              // Count orders in kitchen
isAutoCloseEnabled()             // Check if feature enabled
isRestaurantOpen()               // Check current status
checkAndManageCapacity()         // Main auto-close logic
getCapacityStatus()              // Get detailed status
```

### Time System

```typescript
// lib/operating-hours.ts

isWithinOperatingHours()         // Check if within hours
getTodayHours()                  // Get today's hours
getTimeUntilStatusChange()       // Time until open/close
shouldBeOpenNow()                // Should restaurant be open?
getFormattedTodayHours()         // Hours for display
```

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PAYSTACK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Optional (Recommended)
CRON_SECRET=your-random-secret-token
```

---

## Database Tables

### settings (order_settings)
```json
{
  "is_open": true,                  // Current open/closed status
  "auto_close_when_busy": true,     // Enable capacity auto-close
  "max_active_orders": 10,          // Max orders before auto-close
  "default_prep_time": 30,          // Default prep minutes
  "current_prep_time": 30           // Current prep minutes
}
```

### settings (operating_hours)
```json
{
  "monday": {
    "open": "09:00",
    "close": "21:00",
    "closed": false
  },
  ...
}
```

### orders
```sql
-- Active orders count towards capacity
SELECT COUNT(*) FROM orders 
WHERE status IN ('confirmed', 'preparing', 'ready');
```

---

## Quick Commands

### Check Status
```bash
# Restaurant status
curl https://yourdomain.com/api/restaurant/status | jq

# Kitchen capacity
curl https://yourdomain.com/api/kitchen/capacity | jq
```

### Trigger Cron
```bash
# Manual trigger
curl https://yourdomain.com/api/cron/check-hours \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

### Manual Control
```bash
# Close restaurant
curl -X PATCH https://yourdomain.com/api/kitchen/restaurant/status \
  -H "Content-Type: application/json" \
  -d '{"is_open": false}'

# Open restaurant
curl -X PATCH https://yourdomain.com/api/kitchen/restaurant/status \
  -H "Content-Type: application/json" \
  -d '{"is_open": true}'
```

---

## Support

**Check Logs**: Look for emoji indicators
- 🏪 = Restaurant status change
- ⏰ = Cron job check
- 📊 = Capacity check
- ✅ = Success
- ❌ = Error

**Need Help?**
1. Check console logs
2. Review documentation files
3. Test endpoints manually
4. Verify configuration in admin

---

## Summary

✅ **Two Systems**: Time-based + Capacity-based  
✅ **Both Active**: Work independently  
✅ **Fully Automated**: No manual intervention needed  
✅ **Customer-Friendly**: Clear messages and hours display  
✅ **Admin Control**: Override when needed  
✅ **Production Ready**: Tested and documented  

**Last Updated**: October 23, 2025

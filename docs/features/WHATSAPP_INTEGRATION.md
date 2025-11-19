# 📱 UltraMsg WhatsApp Integration - Implementation Plan

## Overview
This document outlines the comprehensive plan for integrating UltraMsg WhatsApp API into JollofExpress for customer notifications and admin situation reports.

## 🎯 Integration Goals

### Customer Notifications
1. **Order Confirmation** - After successful payment
2. **Status Updates** - Order progress (preparing, ready, out for delivery, completed)
3. **Order Details** - Full order summary with items and delivery info
4. **Delivery Updates** - Estimated time, driver details (future)

### Admin Notifications
1. **Kitchen Capacity Alerts** - When kitchen closes due to excess orders
2. **Kitchen Reopening** - When capacity becomes available
3. **Payment Failures** - Failed payment attempts
4. **System Alerts** - Critical operational issues
5. **Daily Reports** - Order summaries, revenue reports

## 📊 Database Schema Changes

### 1. New Tables

#### `notification_settings` Table
```sql
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Initial Settings:**
```json
{
  "ultramsg": {
    "instance_id": "instance123456",
    "token": "your_token_here",
    "enabled": true
  },
  "customer_notifications": {
    "order_confirmed": true,
    "order_preparing": true,
    "order_ready": true,
    "order_out_for_delivery": true,
    "order_completed": true,
    "payment_failed": true
  },
  "admin_notifications": {
    "enabled": true,
    "phone_numbers": ["+234XXXXXXXXXX"],
    "kitchen_capacity_alerts": true,
    "payment_failures": true,
    "daily_summary": true,
    "summary_time": "20:00"
  }
}
```

#### `notification_logs` Table
```sql
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type TEXT NOT NULL, -- 'customer' | 'admin'
    event_type TEXT NOT NULL, -- 'order_confirmed', 'kitchen_closed', etc.
    recipient_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'delivered'
    ultramsg_id TEXT, -- Message ID from UltraMsg
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient_phone);
```

### 2. Migration File
Create: `database/migrations/add_notification_system.sql`

## 🔧 Implementation Architecture

### File Structure
```
lib/
├── notifications/
│   ├── ultramsg-client.ts      # UltraMsg API client
│   ├── message-templates.ts    # WhatsApp message templates
│   ├── notification-service.ts # Main notification service
│   └── types.ts                # TypeScript types

app/api/
├── notifications/
│   ├── send/route.ts           # Manual send endpoint
│   ├── settings/route.ts       # Get/update settings
│   ├── logs/route.ts           # Fetch notification logs
│   └── test/route.ts           # Test notification

app/admin/
├── notifications/
│   ├── page.tsx                # Notification center dashboard
│   ├── settings/
│   │   └── page.tsx            # Settings configuration
│   └── logs/
│       └── page.tsx            # Notification history

components/admin/
└── notifications/
    ├── notification-settings-form.tsx
    ├── notification-logs-table.tsx
    ├── test-notification-dialog.tsx
    └── admin-phone-manager.tsx

hooks/
└── use-notifications.ts        # React Query hooks
```

## 📝 Implementation Steps

### Phase 1: Core Infrastructure (Day 1-2)

#### Step 1.1: Database Setup
- [ ] Create migration file `add_notification_system.sql`
- [ ] Add `notification_settings` table
- [ ] Add `notification_logs` table
- [ ] Add RLS policies
- [ ] Insert default notification settings
- [ ] Run migration on Supabase

#### Step 1.2: UltraMsg Client Library
**File:** `lib/notifications/ultramsg-client.ts`
```typescript
- Create UltraMsg API client class
- Implement sendMessage() method
- Implement error handling
- Add retry logic with exponential backoff
- Add request/response logging
```

#### Step 1.3: Message Templates
**File:** `lib/notifications/message-templates.ts`
```typescript
- Create template functions for each notification type
- Support dynamic data injection
- Format currency properly (Nigerian Naira)
- Add emojis for better engagement
- Keep messages under 4096 characters
```

#### Step 1.4: Notification Service
**File:** `lib/notifications/notification-service.ts`
```typescript
- Create main notification orchestrator
- Implement customer notification methods
- Implement admin notification methods
- Add logging to notification_logs table
- Handle settings validation
```

### Phase 2: API Endpoints (Day 2-3)

#### Step 2.1: Settings API
**File:** `app/api/notifications/settings/route.ts`
- [ ] GET: Fetch current notification settings
- [ ] PATCH: Update notification settings
- [ ] Validate UltraMsg credentials
- [ ] Admin-only access control

#### Step 2.2: Manual Send API
**File:** `app/api/notifications/send/route.ts`
- [ ] POST: Send test/manual notifications
- [ ] Support customer and admin notifications
- [ ] Validate phone numbers
- [ ] Admin-only access

#### Step 2.3: Logs API
**File:** `app/api/notifications/logs/route.ts`
- [ ] GET: Fetch notification history
- [ ] Support filtering (date, type, status)
- [ ] Support pagination
- [ ] Include order details if applicable

#### Step 2.4: Test API
**File:** `app/api/notifications/test/route.ts`
- [ ] POST: Send test notification
- [ ] Validate UltraMsg connection
- [ ] Return detailed error messages

### Phase 3: Integration Points (Day 3-4)

#### Step 3.1: Order Confirmation
**Update:** `app/api/orders/verify-payment/route.ts`
```typescript
// After successful payment verification (line 128-129)
import { sendOrderConfirmation } from '@/lib/notifications/notification-service';

// Add after line 126
await sendOrderConfirmation(completeOrder);
```

#### Step 3.2: Status Updates
**Update:** `app/api/kitchen/orders/[id]/status/route.ts`
```typescript
// After status update (line 67-68)
import { sendOrderStatusUpdate } from '@/lib/notifications/notification-service';

// Add after line 56
await sendOrderStatusUpdate(order);
```

#### Step 3.3: Kitchen Capacity Alerts
**Update:** `lib/kitchen-capacity.ts`
```typescript
// When kitchen closes (line 159)
import { sendKitchenCapacityAlert } from '@/lib/notifications/notification-service';

await sendKitchenCapacityAlert('closed', activeOrders, maxActiveOrders);

// When kitchen reopens (line 176)
await sendKitchenCapacityAlert('opened', activeOrders, maxActiveOrders);
```

### Phase 4: Admin UI - Notification Center (Day 4-6)

#### Step 4.1: Notification Dashboard
**File:** `app/admin/notifications/page.tsx`
- [ ] Overview cards (total sent, success rate, recent failures)
- [ ] Quick test notification button
- [ ] Recent notifications table
- [ ] Charts (notifications per day, success/failure rate)
- [ ] Link to settings and logs

#### Step 4.2: Settings Page
**File:** `app/admin/notifications/settings/page.tsx`
- [ ] UltraMsg credentials form (instance_id, token)
- [ ] Test connection button
- [ ] Customer notification toggles (per event type)
- [ ] Admin notification toggles
- [ ] Admin phone numbers management (add/remove)
- [ ] Daily summary configuration
- [ ] Save/reset buttons

#### Step 4.3: Notification Logs
**File:** `app/admin/notifications/logs/page.tsx`
- [ ] Filterable table (date range, type, status, recipient)
- [ ] Search by phone number or order number
- [ ] View message content in dialog
- [ ] Retry failed notifications
- [ ] Export logs (CSV)
- [ ] Pagination

#### Step 4.4: Components
**Files:** `components/admin/notifications/`
- [ ] NotificationSettingsForm
- [ ] NotificationLogsTable
- [ ] TestNotificationDialog
- [ ] AdminPhoneManager
- [ ] NotificationStatsCards

#### Step 4.5: Update Admin Sidebar
**File:** `components/admin/admin-sidebar.tsx`
```typescript
// Add to navigation array (line 18-27)
{ name: 'Notifications', href: '/admin/notifications', icon: Bell },
```

### Phase 5: React Query Hooks (Day 6)

**File:** `hooks/use-notifications.ts`
```typescript
- useNotificationSettings() - Fetch settings
- useUpdateSettings() - Update settings
- useNotificationLogs() - Fetch logs with filters
- useSendTestNotification() - Send test
- useNotificationStats() - Dashboard stats
```

### Phase 6: Environment Variables (Day 1)

**Update:** `.env.example`
```env
# UltraMsg WhatsApp API
ULTRAMSG_INSTANCE_ID=instance123456
ULTRAMSG_TOKEN=your_ultramsg_token_here
```

## 📋 Message Templates

### Customer Messages

#### Order Confirmed
```
🎉 Order Confirmed! 

Order #: {order_number}
Total: ₦{total}
Estimated Prep Time: {prep_time} minutes

Items:
{items_list}

{delivery_info}

We'll notify you when your order is ready!

Track your order: {tracking_url}

- JollofExpress 🍲
```

#### Order Preparing
```
👨‍🍳 Your Order is Being Prepared!

Order #{order_number}
Status: Preparing

Your delicious meal is being prepared with care.

- JollofExpress 🍲
```

#### Order Ready
```
✅ Your Order is Ready!

Order #{order_number}
{delivery_or_pickup_message}

- JollofExpress 🍲
```

#### Order Out for Delivery
```
🛵 Your Order is On The Way!

Order #{order_number}
Estimated Arrival: {eta}

Get ready to enjoy your meal!

- JollofExpress 🍲
```

#### Order Completed
```
🎊 Order Delivered!

Thank you for choosing JollofExpress!

Order #{order_number}

We hope you enjoyed your meal. 
Rate your experience: {rating_url}

Order again: {menu_url}

- JollofExpress 🍲
```

### Admin Messages

#### Kitchen Closed (Capacity)
```
⚠️ KITCHEN ALERT

Kitchen has been CLOSED due to high order volume.

Active Orders: {active_orders}/{max_orders}
Time: {timestamp}

Orders will resume when capacity is available.

- JollofExpress System
```

#### Kitchen Reopened
```
✅ KITCHEN REOPENED

Kitchen is now accepting orders again.

Active Orders: {active_orders}/{max_orders}
Time: {timestamp}

- JollofExpress System
```

#### Daily Summary
```
📊 Daily Report - {date}

Orders: {total_orders}
Revenue: ₦{total_revenue}
Avg Order: ₦{avg_order}

Status Breakdown:
✅ Completed: {completed}
🚫 Cancelled: {cancelled}
⏳ Pending: {pending}

Top Items:
{top_items_list}

View dashboard: {dashboard_url}

- JollofExpress Analytics
```

## 🔐 Security Considerations

1. **Environment Variables**
   - Store UltraMsg credentials in `.env.local`
   - Never commit credentials to git
   - Use different instances for development/production

2. **Access Control**
   - All notification endpoints require admin authentication
   - RLS policies on notification tables
   - Rate limiting on send endpoints

3. **Data Privacy**
   - Phone number validation
   - Encrypt sensitive data in logs
   - Implement log retention policy (90 days)

4. **Error Handling**
   - Never expose API credentials in error messages
   - Log failures without exposing tokens
   - Implement retry with backoff

## 📊 Testing Strategy

### Unit Tests
- [ ] UltraMsg client connection
- [ ] Message template generation
- [ ] Phone number validation
- [ ] Settings validation

### Integration Tests
- [ ] Send test notification to admin
- [ ] Verify notification logging
- [ ] Test retry mechanism
- [ ] Test error handling

### E2E Tests
1. **Customer Flow:**
   - Place order → Verify confirmation message
   - Update status → Verify status message
   - Complete order → Verify completion message

2. **Admin Flow:**
   - Configure settings → Save successfully
   - Add admin phone → Receive test message
   - View logs → See sent notifications

### Manual Testing Checklist
- [ ] Test with real UltraMsg instance
- [ ] Verify message delivery on WhatsApp
- [ ] Test all notification types
- [ ] Test with invalid credentials
- [ ] Test with invalid phone numbers
- [ ] Test notification toggles (enable/disable)
- [ ] Test admin phone management
- [ ] Verify logs are created correctly

## 📈 Monitoring & Maintenance

### Metrics to Track
1. **Delivery Rate** - Percentage of successfully delivered messages
2. **Failure Rate** - Track and alert on high failure rates
3. **Response Time** - UltraMsg API response times
4. **Daily Volume** - Number of notifications per day
5. **Cost Tracking** - Monitor UltraMsg usage

### Alerts Setup
- Alert if delivery rate drops below 90%
- Alert if UltraMsg API is unreachable
- Alert on repeated failures for same recipient

### Log Retention
- Keep notification logs for 90 days
- Archive older logs to cloud storage
- Implement automated cleanup job

## 💰 Cost Estimation

UltraMsg Pricing: $39/month (unlimited messages)

**Estimated Monthly Volume:**
- Assuming 500 orders/month
- 4 notifications per order (confirmed, preparing, ready, completed)
- = 2,000 customer notifications

- 60 admin alerts (2/day average)
- 30 daily summaries (1/day)
- = 90 admin notifications

**Total: ~2,100 messages/month** (well within unlimited plan)

## 🚀 Deployment Steps

1. **Setup UltraMsg Account**
   - Sign up at ultramsg.com
   - Create instance
   - Get instance_id and token
   - Connect WhatsApp number

2. **Database Migration**
   - Run migration on production Supabase
   - Verify tables created
   - Insert default settings

3. **Environment Variables**
   - Add ULTRAMSG_INSTANCE_ID
   - Add ULTRAMSG_TOKEN
   - Restart application

4. **Configuration**
   - Access admin notification settings
   - Configure admin phone numbers
   - Enable desired notification types
   - Test connection

5. **Gradual Rollout**
   - Week 1: Enable only order confirmation
   - Week 2: Enable all customer notifications
   - Week 3: Enable admin notifications
   - Monitor and adjust

## 📚 Documentation

### For Admins
- [ ] Create user guide for notification center
- [ ] Document how to add/remove admin phones
- [ ] Document how to read notification logs
- [ ] Create troubleshooting guide

### For Developers
- [ ] API endpoint documentation
- [ ] Message template customization guide
- [ ] Adding new notification types
- [ ] UltraMsg API reference

## 🎯 Success Criteria

1. ✅ Customers receive order confirmations within 30 seconds
2. ✅ 95%+ delivery success rate
3. ✅ Admins receive kitchen capacity alerts in real-time
4. ✅ All notifications logged for auditing
5. ✅ Admin can configure notifications without code changes
6. ✅ System handles UltraMsg API failures gracefully
7. ✅ Daily summaries sent at configured time
8. ✅ Notification logs accessible and filterable

## 🔄 Future Enhancements

1. **Message Templates Editor** - Allow admins to customize messages in UI
2. **Scheduled Notifications** - Send promotional messages
3. **Customer Opt-out** - Allow customers to disable notifications
4. **Rich Media** - Send images of prepared food
5. **Two-way Communication** - Handle customer replies
6. **Multi-language Support** - Support for different languages
7. **WhatsApp Business API** - Migrate to official API for verification badge
8. **Analytics Dashboard** - Detailed notification analytics

## 📞 Support & Resources

- **UltraMsg Documentation:** https://docs.ultramsg.com
- **UltraMsg Support:** Available via their dashboard
- **Nigerian Phone Format:** +234XXXXXXXXXX (E.164 format)
- **Rate Limits:** Check UltraMsg dashboard for limits

---

**Estimated Timeline:** 6-8 working days
**Priority:** High
**Dependencies:** UltraMsg account, WhatsApp number

**Next Steps:**
1. Review and approve this plan
2. Create UltraMsg account
3. Begin Phase 1: Database setup

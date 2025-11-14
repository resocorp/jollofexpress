# WhatsApp Notification System - Quick Setup Guide

## Overview

This guide will walk you through setting up WhatsApp notifications for JollofExpress using UltraMsg API.

**Estimated Time:** 15-20 minutes

## What You'll Need

- UltraMsg account (https://ultramsg.com)
- WhatsApp number for your business
- Access to Supabase dashboard
- Admin access to your application

## Step-by-Step Setup

### Part 1: UltraMsg Account Setup (5 minutes)

1. **Sign Up for UltraMsg**
   - Go to https://ultramsg.com
   - Click "Sign Up" or "Free Trial"
   - Enter your email and create password
   - Verify your email

2. **Create an Instance**
   - Log in to UltraMsg dashboard
   - Click "Create New Instance"
   - Choose your pricing plan:
     - Free trial: Limited messages for testing
     - Paid plan: $39/month unlimited messages
   - Click "Create Instance"

3. **Connect WhatsApp**
   - Scan QR code with WhatsApp on your phone
   - Wait for "Connected" status
   - **Important:** Keep your phone connected to internet
   - **Note:** Use WhatsApp Business app for better branding

4. **Get API Credentials**
   - Copy your **Instance ID** (looks like: `instance123456`)
   - Copy your **API Token** (long string of characters)
   - Keep these safe - you'll need them in the next step

### Part 2: Configure Application (5 minutes)

1. **Add Environment Variables**
   
   Open your `.env.local` file and add:
   ```env
   # UltraMsg WhatsApp API
   ULTRAMSG_INSTANCE_ID=instance123456
   ULTRAMSG_TOKEN=your_ultramsg_token_here
   ```

   Replace with your actual credentials from Part 1.

2. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### Part 3: Database Setup (3 minutes)

1. **Run Migration on Supabase**
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Copy contents from: `database/migrations/add_notification_system.sql`
   - Paste and run the SQL
   - Verify success message

2. **Verify Tables Created**
   - Go to Table Editor in Supabase
   - Check for new tables:
     - `notification_settings` ✓
     - `notification_logs` ✓

### Part 4: Configure Notifications (5 minutes)

1. **Access Admin Panel**
   - Navigate to: `http://localhost:3000/admin/notifications`
   - Click "Settings"

2. **Enter UltraMsg Credentials**
   - Instance ID: [paste from Part 1]
   - API Token: [paste from Part 1]
   - Toggle "Enable Notifications" ON

3. **Test Connection**
   - Click "Test Connection" button
   - Should see: ✅ "Connection successful"
   - If failed, verify credentials

4. **Configure Customer Notifications**
   - Order Confirmed: ✓ ON (recommended)
   - Order Preparing: ✓ ON (recommended)
   - Order Ready: ✓ ON (recommended)
   - Order Out for Delivery: ✓ ON (recommended)
   - Order Completed: ✓ ON (recommended)
   - Payment Failed: ☐ OFF (optional)

5. **Configure Admin Notifications**
   - Enable Admin Notifications: ✓ ON
   - Add your phone number: `+234XXXXXXXXXX`
   - Kitchen Capacity Alerts: ✓ ON
   - Payment Failure Alerts: ✓ ON (optional)
   - Daily Summary: ✓ ON
   - Summary Time: 20:00 (8 PM)

6. **Save Settings**
   - Click "Save Settings"
   - Verify success message

### Part 5: Testing (3 minutes)

1. **Test Admin Notification**
   - Scroll to "Send Test Notification"
   - Enter your phone number
   - Click "Send Test"
   - Check WhatsApp for test message

2. **Test Customer Flow**
   - Place a test order on your site
   - Complete payment
   - Check customer's WhatsApp for confirmation
   - Update order status in admin
   - Verify status update messages

3. **Verify Logs**
   - Go to Admin → Notifications → Logs
   - Should see test messages logged
   - Status should be "Sent" or "Delivered"

## Configuration Options Explained

### Customer Notifications

**Order Confirmed** - Sent immediately after successful payment
- Includes: Order number, items, total, delivery address, tracking link
- Recommended: ON

**Order Preparing** - When kitchen starts preparing
- Includes: Order number, status update
- Recommended: ON

**Order Ready** - When order is ready for pickup/delivery
- Includes: Order number, pickup/delivery instructions
- Recommended: ON

**Order Out for Delivery** - When order dispatched
- Includes: Order number, estimated arrival time
- Recommended: ON

**Order Completed** - When order delivered
- Includes: Thank you message, reorder link
- Recommended: ON

### Admin Notifications

**Kitchen Capacity Alerts** - When kitchen auto-closes/reopens
- Sent when: Active orders reach maximum threshold
- Recommended: ON

**Payment Failure Alerts** - When customer payment fails
- Sent when: Payment verification fails
- Recommended: OFF (can be noisy)

**Daily Summary** - End of day report
- Sent at: Configured time (default 8 PM)
- Includes: Orders, revenue, top items
- Recommended: ON

## Phone Number Format

**Important:** Use Nigerian E.164 format

✅ **Correct:**
- `+2348012345678`
- `+2347012345678`
- `+2349012345678`

❌ **Wrong:**
- `08012345678` (missing country code)
- `2348012345678` (missing +)
- `234-801-234-5678` (has dashes)

## Troubleshooting

### "Connection Failed"
- Verify Instance ID and Token are correct
- Check UltraMsg instance is active (green status)
- Ensure WhatsApp is connected to instance

### "Invalid Phone Number"
- Must use E.164 format: `+234XXXXXXXXXX`
- Must start with +234 followed by 10 digits
- First digit after 234 must be 7, 8, or 9

### "Notification Not Received"
- Check notification is enabled in settings
- Verify phone number is correct
- Check notification logs for errors
- Ensure recipient hasn't blocked your WhatsApp number

### "Database Error"
- Ensure migration ran successfully
- Check Supabase connection
- Verify service role key has permissions

## Best Practices

1. **Test Thoroughly**
   - Always test in development first
   - Send test notifications before going live
   - Place test orders to verify full flow

2. **Monitor Regularly**
   - Check notification logs weekly
   - Monitor success/failure rates
   - Review customer feedback

3. **Don't Spam**
   - Keep messages concise and valuable
   - Don't enable unnecessary notifications
   - Respect customer preferences

4. **Keep Phone Connected**
   - UltraMsg instance needs WhatsApp connected
   - Use dedicated phone/device for business
   - Keep device charged and online

5. **Backup Admin Numbers**
   - Add multiple admin phone numbers
   - Ensures alerts aren't missed
   - Use different numbers for redundancy

## Cost Breakdown

**UltraMsg Pricing:**
- Free Trial: Limited messages (testing)
- Standard Plan: $39/month unlimited messages

**Estimated Usage:**
- 500 orders/month × 4 notifications = 2,000 customer messages
- 90 admin alerts/month
- **Total: ~2,100 messages/month**

**Recommendation:** $39/month plan covers all needs

## Next Steps

After setup:

1. ✅ Test all notification types
2. ✅ Configure message preferences
3. ✅ Add admin phone numbers
4. ✅ Monitor logs for first week
5. ✅ Gather customer feedback
6. ✅ Adjust settings as needed

## Support

**UltraMsg Issues:**
- Visit UltraMsg dashboard
- Click "Support" or "Help"
- Live chat available

**Application Issues:**
- Check notification logs first
- Review troubleshooting section
- Contact development team

## Additional Resources

- UltraMsg Documentation: https://docs.ultramsg.com
- WhatsApp Business Best Practices: Official WhatsApp guidelines
- Nigerian Phone Format Validator: Built into the app

---

**Setup Complete! 🎉**

Your WhatsApp notification system is now ready to use. Customers will receive real-time updates on their orders, and admins will get important alerts.

**Questions?** Review the troubleshooting section or contact support.

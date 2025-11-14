# WhatsApp Notification System - Deployment Checklist

## Pre-Deployment Setup

### 1. UltraMsg Account Setup
- [ ] Sign up at https://ultramsg.com
- [ ] Create a new instance
- [ ] Connect your WhatsApp number to the instance
- [ ] Copy your Instance ID (e.g., `instance123456`)
- [ ] Copy your API Token
- [ ] Test the instance is active and connected

### 2. Environment Variables
- [ ] Add to `.env.local`:
  ```env
  ULTRAMSG_INSTANCE_ID=your_instance_id_here
  ULTRAMSG_TOKEN=your_token_here
  ```
- [ ] Verify environment variables are loaded (restart dev server)

### 3. Database Migration
- [x] Migration file created: `database/migrations/add_notification_system.sql`
- [ ] Run migration on Supabase (Production)
- [ ] Verify tables created:
  - `notification_settings`
  - `notification_logs`
- [ ] Verify default settings inserted
- [ ] Verify RLS policies applied

## Deployment Steps

### Step 1: Deploy Code
- [ ] Commit all changes to git
- [ ] Push to production branch
- [ ] Deploy to hosting platform (Vercel/Digital Ocean)
- [ ] Verify deployment successful

### Step 2: Configure Production Settings
- [ ] Access admin panel: `https://your-domain.com/admin/notifications/settings`
- [ ] Enter UltraMsg credentials
- [ ] Enable notifications
- [ ] Test connection
- [ ] Configure customer notification toggles
- [ ] Add admin phone numbers
- [ ] Configure admin alert preferences
- [ ] Set daily summary time

### Step 3: Testing

#### Test Connection
- [ ] Click "Test Connection" in settings
- [ ] Should return success message

#### Test Customer Notifications
- [ ] Place a test order
- [ ] Complete payment
- [ ] Verify order confirmation message received
- [ ] Update order status to "preparing"
- [ ] Verify status update message received
- [ ] Update to "ready" → verify message
- [ ] Update to "completed" → verify message

#### Test Admin Notifications
- [ ] Send test notification to admin phone
- [ ] Verify test message received
- [ ] Trigger kitchen capacity alert (create max orders)
- [ ] Verify admin receives kitchen closed alert
- [ ] Complete some orders
- [ ] Verify admin receives kitchen reopened alert

### Step 4: Monitoring
- [ ] Check notification logs in admin panel
- [ ] Verify success rate is >90%
- [ ] Monitor for failed notifications
- [ ] Check UltraMsg dashboard for usage stats

## Post-Deployment

### Week 1: Monitor & Adjust
- [ ] Monitor notification delivery rates daily
- [ ] Check for customer complaints about notifications
- [ ] Adjust notification toggles based on feedback
- [ ] Review notification logs for patterns
- [ ] Check UltraMsg quota usage

### Week 2: Optimize
- [ ] Review message templates for clarity
- [ ] Adjust admin alert thresholds if needed
- [ ] Fine-tune daily summary timing
- [ ] Document any issues and resolutions

### Ongoing Maintenance
- [ ] Weekly: Review notification logs
- [ ] Monthly: Check UltraMsg billing and usage
- [ ] Monthly: Review success/failure rates
- [ ] Quarterly: Update message templates if needed
- [ ] Monitor WhatsApp policy changes

## Troubleshooting Guide

### Issue: Notifications not sending
**Check:**
1. UltraMsg credentials are correct
2. Notifications are enabled in settings
3. Instance is active on UltraMsg dashboard
4. Phone numbers are in correct format (+234...)
5. Check notification_logs table for error messages

**Fix:**
- Test connection in settings page
- Verify environment variables loaded
- Check UltraMsg instance status
- Restart application

### Issue: Low delivery rate
**Check:**
1. Phone number format validation
2. UltraMsg account status
3. Error messages in logs
4. Customer phone numbers valid

**Fix:**
- Review failed notification logs
- Contact UltraMsg support
- Validate phone number format

### Issue: Admin not receiving alerts
**Check:**
1. Admin phone numbers added in settings
2. Admin notifications enabled
3. Specific alert types enabled
4. Phone numbers valid Nigerian format

**Fix:**
- Send test notification to admin
- Verify phone number format
- Check admin_notifications settings in database

### Issue: Database errors
**Check:**
1. Migration ran successfully
2. Tables exist with correct schema
3. RLS policies applied
4. Supabase connection working

**Fix:**
- Re-run migration
- Check Supabase logs
- Verify service role key has correct permissions

## Rollback Plan

If issues occur after deployment:

1. **Disable notifications quickly:**
   - Access settings: `/admin/notifications/settings`
   - Toggle "Enable Notifications" OFF
   - OR set environment variable: `ULTRAMSG_ENABLED=false`

2. **Revert code changes:**
   - Checkout previous commit
   - Redeploy
   
3. **Database rollback (if needed):**
   ```sql
   -- Drop notification tables
   DROP TABLE IF EXISTS notification_logs CASCADE;
   DROP TABLE IF EXISTS notification_settings CASCADE;
   ```

## Success Criteria

- [x] All code deployed successfully
- [ ] Database migration completed
- [ ] UltraMsg connected and active
- [ ] Test notifications sending successfully
- [ ] Customer receives order confirmations
- [ ] Admin receives capacity alerts
- [ ] Notification logs recording properly
- [ ] Success rate >90%
- [ ] No customer complaints about spam
- [ ] Daily summaries sending at configured time

## Support Contacts

- **UltraMsg Support:** Available via dashboard
- **Development Team:** [Your contact info]
- **Supabase Support:** Via Supabase dashboard

---

**Last Updated:** 2024-11-14
**Status:** Ready for deployment

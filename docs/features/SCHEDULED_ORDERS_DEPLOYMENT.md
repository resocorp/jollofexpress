# Scheduled Orders - Deployment Checklist

## Pre-Deployment

- [ ] Review all code changes
- [ ] Test locally with restaurant closed
- [ ] Test payment flow with scheduled orders
- [ ] Verify TypeScript compilation passes

## Database Migration

**IMPORTANT**: Run this migration on your Supabase database before deploying code changes.

```sql
-- Run this in Supabase SQL Editor
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'scheduled' AFTER 'pending';

COMMENT ON TYPE order_status IS 'Order status: pending (payment pending), scheduled (paid but outside hours), confirmed (ready to prepare), preparing, ready, out_for_delivery, completed, cancelled';

-- Add notes column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
```

Or use the migration file:
```bash
# Apply migration from file
psql $DATABASE_URL -f database/migrations/add_scheduled_order_status.sql
```

## Deployment Steps

1. **Apply Database Migration** (see above)
   - [ ] Migration applied successfully
   - [ ] Verify enum updated: `SELECT unnest(enum_range(NULL::order_status));`

2. **Deploy Code Changes**
   - [ ] Push to repository
   - [ ] Deploy to production (Vercel/hosting platform)
   - [ ] Verify deployment successful

3. **Verify Cron Job**
   - [ ] Cron job is running (`/api/cron/check-hours`)
   - [ ] Check logs for successful execution
   - [ ] Verify it runs every 1-5 minutes

## Post-Deployment Testing

### Test 1: Create Scheduled Order
1. [ ] Close restaurant in admin panel
2. [ ] Place test order as customer
3. [ ] Verify payment processes successfully
4. [ ] Check database: order status should be 'scheduled'
5. [ ] Verify customer receives payment confirmation

### Test 2: Automatic Activation
1. [ ] Keep test scheduled order(s) in database
2. [ ] Open restaurant (manually or wait for cron)
3. [ ] Wait 1-5 minutes for cron to run
4. [ ] Check database: order status should be 'confirmed'
5. [ ] Verify order appears in kitchen display
6. [ ] Check logs for activation message

### Test 3: Customer Experience
1. [ ] Close restaurant
2. [ ] Visit checkout page
3. [ ] Verify amber warning notice displays (not red error)
4. [ ] Verify message says "You can still place your order!"
5. [ ] Complete order and verify success

### Test 4: Edge Cases
1. [ ] Place order 1 minute before closing time
2. [ ] Place order on a closed day
3. [ ] Create multiple scheduled orders
4. [ ] Verify all activate when restaurant opens

## Monitoring

After deployment, monitor:
- [ ] Order creation success rate
- [ ] Scheduled order count
- [ ] Cron job execution logs
- [ ] Customer feedback/support tickets
- [ ] Payment processing errors

## Rollback Plan

If issues occur:

1. **Immediate**: Manually update scheduled orders
   ```sql
   UPDATE orders 
   SET status = 'confirmed' 
   WHERE status = 'scheduled' AND payment_status = 'paid';
   ```

2. **Code Rollback**: Revert to previous deployment
   - Previous behavior will reject orders when closed
   - Existing scheduled orders will remain in database
   - Manually process them if needed

## Success Criteria

- [ ] Customers can place orders when restaurant is closed
- [ ] Payments process successfully
- [ ] Orders automatically activate when restaurant opens
- [ ] No errors in logs
- [ ] Kitchen staff can see and process activated orders
- [ ] No customer complaints about the new flow

## Notes

- The cron job handles activation automatically
- No manual intervention needed for normal operation
- Scheduled orders won't appear in kitchen until activated
- Payment is processed immediately (not delayed)

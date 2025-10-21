# Print System Testing Guide

## Path A Implementation Complete! ✅

Browser-based auto-printing is now implemented. Follow this guide to test everything.

---

## What Was Implemented

### 1. Receipt Formatter (`lib/print/format-receipt.ts`)
- ✅ Converts order data to receipt format
- ✅ Formats customer info, items, prices
- ✅ Highlights special instructions
- ✅ Supports both delivery and carryout
- ✅ Text format ready for thermal printers (future)

### 2. Print Receipt Component (`components/print/print-receipt.tsx`)
- ✅ Print-optimized React component
- ✅ CSS styled for receipts
- ✅ 80mm width design (works on A4)
- ✅ Professional receipt layout
- ✅ Print-specific styles (@media print)

### 3. Auto-Print Handler (`components/print/auto-print-handler.tsx`)
- ✅ Monitors print_queue via Supabase realtime
- ✅ Automatically triggers printing
- ✅ Updates print status in database
- ✅ Error handling and retry logic
- ✅ Visual indicators for print queue

### 4. Updated APIs
- ✅ `/api/kitchen/orders/[id]/print` - Formats and queues reprints
- ✅ `/api/orders/verify-payment` - Auto-queues on payment success
- ✅ `/api/webhook/paystack` - Auto-queues on webhook

### 5. Kitchen Display Integration
- ✅ AutoPrintHandler added to `/kitchen` page
- ✅ Runs in background
- ✅ Debug indicators in development mode

---

## Prerequisites for Testing

Before testing, ensure:

### 1. Development Server Running
```bash
npm run dev
```
Access at: `http://localhost:3000`

### 2. LaserJet Configured
- [ ] Printer connected to network
- [ ] Printer set as default in Windows
- [ ] Printer has paper and toner
- [ ] Follow `LASERJET_SETUP_GUIDE.md` if not done

### 3. Browser Setup
- [ ] Chrome browser (recommended)
- [ ] Pop-ups allowed for localhost
- [ ] Default printer configured
- [ ] Optional: Kiosk mode for silent printing

### 4. Supabase Connection
- [ ] `.env.local` has correct Supabase credentials
- [ ] `print_queue` table exists
- [ ] Kitchen display can connect to Supabase

---

## Test Sequence

### Test 1: Kitchen Display Loads Auto-Print Handler ✅

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to: `http://localhost:3000/kitchen`
4. Look for console messages:
   ```
   🖨️  Print handler: Subscribing to print_queue changes
   Print queue subscription status: { status: 'SUBSCRIBED' }
   ```

**Expected Results:**
- ✅ Debug indicator appears bottom-left: "🖨️ Print Handler Active"
- ✅ No errors in console
- ✅ Console shows subscription confirmed

**Troubleshooting:**
- ❌ No debug indicator: Check if AutoPrintHandler is imported in `/kitchen/page.tsx`
- ❌ Subscription failed: Check Supabase credentials in `.env.local`
- ❌ Errors in console: Check network tab for failed requests

---

### Test 2: Manual Reprint Button ✅

**Steps:**
1. Stay on kitchen display: `http://localhost:3000/kitchen`
2. Ensure there's at least one order (create test order if needed)
3. Click the **Printer icon** button on an order card
4. Watch for:
   - Toast notification: "Reprint queued"
   - Print queue indicator: "Print Queue: 1 job(s)"
   - Print dialog opens (or auto-prints in kiosk mode)

**Expected Results:**
- ✅ Toast shows "Reprint queued"
- ✅ Blue notification badge appears with job count
- ✅ Print dialog opens within 2-5 seconds
- ✅ Receipt displays correctly in preview
- ✅ After clicking "Print", receipt prints on LaserJet
- ✅ Toast shows "Printed: Order ORD-XXX"
- ✅ Print queue badge disappears

**Check in Supabase:**
```sql
SELECT * FROM print_queue 
ORDER BY created_at DESC 
LIMIT 5;
```
- ✅ New row with status = 'printed'
- ✅ `print_data` column has complete receipt data (JSON)
- ✅ `processed_at` timestamp is set

**Troubleshooting:**
- ❌ No toast: Check if reprint API is working
- ❌ Print dialog doesn't appear: Check browser console for errors
- ❌ Status stuck on 'pending': Check AutoPrintHandler is processing
- ❌ Print dialog shows blank: Check receipt data formatting

---

### Test 3: Automatic Print After Payment ✅

**Steps:**
1. Keep kitchen display open in one tab/window
2. Open customer checkout in another tab: `http://localhost:3000`
3. Add items to cart
4. Go to checkout
5. Fill in customer details
6. Complete Paystack payment (use test card)
7. Watch kitchen display

**Expected Results:**
- ✅ Order appears on kitchen display within 5 seconds
- ✅ Print queue badge shows: "Print Queue: 1 job(s)"
- ✅ Print dialog opens automatically
- ✅ Receipt prints on LaserJet
- ✅ Toast notification: "Printed: Order ORD-XXX"
- ✅ Order card shows on kitchen board

**Check Payment Flow:**
```sql
-- 1. Check order was created and confirmed
SELECT id, order_number, status, payment_status, print_status 
FROM orders 
WHERE order_number = 'ORD-YYYYMMDD-XXXX';

-- 2. Check print queue was created
SELECT * FROM print_queue 
WHERE order_id = '<order_id_from_above>';
```

**Expected Database State:**
- ✅ `orders.status` = 'confirmed'
- ✅ `orders.payment_status` = 'success'
- ✅ `print_queue.status` = 'printed'
- ✅ `print_queue.print_data` contains receipt JSON

**Troubleshooting:**
- ❌ Order doesn't appear: Check payment webhook or verify-payment API
- ❌ No print job created: Check API logs for print_queue insert
- ❌ Print job stuck: Check AutoPrintHandler console logs
- ❌ Payment succeeds but no print: Check if order was added to print_queue

---

### Test 4: Multiple Orders (Queue Processing) ✅

**Steps:**
1. Keep kitchen display open
2. Create 3 orders quickly (use Paystack test cards)
3. Complete all payments
4. Watch print queue badge

**Expected Results:**
- ✅ Badge shows: "Print Queue: 3 job(s)"
- ✅ Prints process one by one (not simultaneously)
- ✅ Each print completes before next starts
- ✅ All 3 receipts print successfully
- ✅ Badge count decreases: 3 → 2 → 1 → 0

**Check Processing:**
- ✅ Only one print dialog at a time
- ✅ No duplicate prints
- ✅ All jobs marked as 'printed'

---

### Test 5: Receipt Content Validation ✅

Print a test receipt and verify all sections appear correctly:

**Header Section:**
- ✅ Restaurant name: "JOLLOF EXPRESS"
- ✅ Divider line

**Order Info:**
- ✅ Order number (e.g., ORD-20251021-1234)
- ✅ Date and time formatted correctly

**Customer Details:**
- ✅ Customer name
- ✅ Phone number formatted: 0806 123 4567
- ✅ Order type: DELIVERY or CARRYOUT

**Delivery Address (if delivery):**
- ✅ City
- ✅ Full address
- ✅ Address type (house, office, etc.)
- ✅ Unit number (if provided)
- ✅ Delivery instructions (if provided)

**Items Section:**
- ✅ Quantity and item name
- ✅ Selected variation (e.g., "Large", "Medium")
- ✅ Add-ons listed
- ✅ Item price aligned right
- ✅ Special instructions highlighted in yellow box

**Special Instructions Summary:**
- ✅ ⚠️ SPECIAL INSTRUCTIONS header
- ✅ All special instructions listed

**Totals:**
- ✅ Subtotal
- ✅ Delivery fee (if delivery)
- ✅ Total (bold, large)
- ✅ Payment status: PAID (Paystack)

**Kitchen Section:**
- ✅ "Kitchen - Start Prep Now!"
- ✅ Estimated prep time

---

### Test 6: Error Handling ✅

#### Test 6a: Printer Offline

**Steps:**
1. Turn off printer or disconnect network cable
2. Trigger a print (manual reprint button)
3. Watch behavior

**Expected Results:**
- ✅ Print dialog tries to open
- ✅ May fail to connect to printer
- ✅ Job marked as 'failed' in print_queue
- ✅ Error message in console
- ✅ Toast shows error: "Print failed: Order ORD-XXX"

**Recovery:**
- Reconnect printer
- Manually reprint the order

#### Test 6b: Browser Pop-up Blocked

**Steps:**
1. Enable pop-up blocker for localhost
2. Trigger a print
3. Watch behavior

**Expected Results:**
- ✅ Print dialog doesn't appear
- ✅ Browser shows pop-up blocked icon (address bar)
- ✅ Error in console: "Failed to open print window"
- ✅ Job marked as 'failed'

**Recovery:**
- Allow pop-ups for localhost
- Manually reprint the order

---

### Test 7: Realtime Subscription ✅

**Steps:**
1. Keep kitchen display open in Browser A
2. Open Supabase dashboard in Browser B
3. Go to Table Editor → print_queue
4. Manually insert a row:
   ```json
   {
     "order_id": "<existing_order_id>",
     "print_data": { "orderNumber": "TEST-001", ... },
     "status": "pending"
   }
   ```
5. Watch Browser A (kitchen display)

**Expected Results:**
- ✅ Print queue badge appears immediately
- ✅ Print dialog opens within 2 seconds
- ✅ Receipt prints

**This tests:** Supabase realtime subscriptions are working

---

### Test 8: Kitchen Display Reload/Refresh ✅

**Steps:**
1. Queue up some print jobs (create orders)
2. Before they print, refresh kitchen display (F5)
3. Watch behavior

**Expected Results:**
- ✅ Page reloads
- ✅ AutoPrintHandler reinitializes
- ✅ Fetches pending print jobs from database
- ✅ Processes remaining jobs
- ✅ No jobs lost

**This tests:** Persistence and recovery on page reload

---

## Verification Checklist

After testing, verify:

### Database State:
```sql
-- All orders should have print status
SELECT COUNT(*) FROM orders WHERE print_status IS NULL;
-- Should be 0

-- All print jobs should be completed
SELECT COUNT(*) FROM print_queue WHERE status = 'pending';
-- Should be 0 (unless actively processing)

-- Check for failed prints
SELECT * FROM print_queue WHERE status = 'failed';
-- Investigate any failures
```

### Kitchen Display:
- [ ] AutoPrintHandler loads without errors
- [ ] Debug indicator shows in development
- [ ] Realtime subscription active
- [ ] Print queue badge updates correctly
- [ ] Toast notifications appear

### Printing:
- [ ] Manual reprint works
- [ ] Automatic print after payment works
- [ ] Multiple orders queue and process
- [ ] Receipts print clearly on LaserJet
- [ ] All receipt sections appear correctly
- [ ] No duplicate prints
- [ ] Print status updates in database

### Error Handling:
- [ ] Failed prints marked correctly
- [ ] Error messages logged
- [ ] System recovers from errors
- [ ] Manual reprint works after failure

---

## Common Issues & Solutions

### Issue: Print dialog doesn't appear
**Causes:**
- Pop-up blocker enabled
- AutoPrintHandler not loaded
- JavaScript errors

**Solutions:**
1. Check browser console for errors
2. Allow pop-ups for localhost
3. Verify AutoPrintHandler is in kitchen page
4. Check Supabase connection

---

### Issue: Print jobs stuck in 'pending'
**Causes:**
- AutoPrintHandler not running
- Database connection issues
- Print window fails to open

**Solutions:**
1. Refresh kitchen display
2. Check console for subscription status
3. Manually update status in Supabase
4. Check network connectivity

---

### Issue: Receipt prints blank
**Causes:**
- print_data is empty or malformed
- Receipt component not rendering
- Print window closes too fast

**Solutions:**
1. Check print_data in print_queue table
2. Verify receipt formatting in API
3. Increase timeout in auto-print-handler
4. Check CSS @media print styles

---

### Issue: Duplicate prints
**Causes:**
- Multiple AutoPrintHandler instances
- Browser tab duplicated
- Realtime subscription issues

**Solutions:**
1. Ensure only one kitchen display tab open
2. Refresh page to reset subscriptions
3. Check print_queue for duplicate entries

---

## Performance Metrics

Track these metrics during testing:

| Metric | Target | Actual |
|--------|--------|--------|
| Payment → Print Start | < 5 seconds | _______ |
| Print Dialog → Complete | < 10 seconds | _______ |
| Total Payment → Printed | < 15 seconds | _______ |
| Manual Reprint Time | < 3 seconds | _______ |
| Failed Print Rate | < 1% | _______ |
| Queue Processing (10 orders) | < 2 minutes | _______ |

---

## Next Steps After Testing

### If All Tests Pass: ✅
1. ✅ Document any issues found
2. ✅ Train kitchen staff on manual reprint
3. ✅ Monitor for 24-48 hours
4. ✅ Collect feedback
5. 🔜 Plan migration to thermal printer (Path B)

### If Tests Fail: ❌
1. Document exact failure scenario
2. Check error logs and console
3. Verify all prerequisites met
4. Debug specific component
5. Reach out for support with logs

---

## Monitoring in Production

### Daily Checks:
- Check print_queue for failed jobs
- Verify printer connectivity
- Ensure kitchen display stays open
- Monitor toner/paper levels

### Weekly Review:
```sql
-- Print success rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'printed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'printed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM print_queue
WHERE created_at > NOW() - INTERVAL '7 days';
```

Target: > 99% success rate

---

## Support & Debugging

### Debug Mode:
Development mode shows helpful indicators:
- Print handler status (bottom-left)
- Print queue count
- Current job being processed

### Console Logs:
Key messages to look for:
```
🖨️  Print handler: Subscribing to print_queue changes
✓ Print job <id> marked as printed
✗ Print failed: <error>
```

### Enable Verbose Logging:
Add to auto-print-handler.tsx for more details:
```typescript
console.log('Print queue state:', printQueue);
console.log('Processing job:', currentJob);
```

---

## Conclusion

Path A implementation provides:
✅ Automatic printing after payment
✅ Manual reprint functionality  
✅ Real-time print queue monitoring
✅ Error handling and recovery
✅ LaserJet compatibility
✅ Foundation for thermal printer upgrade

**Ready for production testing with LaserJet!**

When ready for 80mm thermal printers, proceed to Path B in `PRINT_IMPLEMENTATION_PLAN.md`.

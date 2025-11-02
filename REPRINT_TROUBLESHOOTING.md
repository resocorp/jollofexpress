# Reprint Button Troubleshooting Guide

## Issue
The reprint button in the kitchen display is not working, even though manual printing via command line works:
```bash
printf "Hello from Linux\n\n\n" | nc 10.250.40.14 9100
```

## Diagnostic Steps

### 1. Check Environment Variables
Verify that your `.env.local` or production environment has the correct printer IP:

```bash
# Your printer is at 10.250.40.14, not 192.168.100.160
PRINTER_IP_ADDRESS=10.250.40.14
PRINTER_PORT=9100
```

**Action**: Update your environment file with the correct IP address.

### 2. Test the Reprint API Endpoint

Run the diagnostic test endpoint to see where the issue occurs:

```bash
# You can use either the UUID or the order number (e.g., ORD-20251023-8779)
node scripts/diagnose-reprint.js ORD-20251023-8779

# Or with UUID
node scripts/diagnose-reprint.js 123e4567-e89b-12d3-a456-426614174000

# Or via curl
curl https://jollofexpress.app/api/kitchen/orders/ORD-20251023-8779/print/test
```

This will show you exactly which step is failing:
- Step 1: Supabase connection
- Step 2: Fetch order
- Step 3: Format receipt
- Step 4: Generate ESC/POS
- Step 5: Insert into print_queue
- Step 6: Verify job in queue
- Step 7: Check printer config

### 3. Check Browser Console

Open the kitchen display page and click the reprint button. Check the browser console for:
- `[REPRINT] Initiating reprint for order:` - Should show order number and ID
- `[REPRINT] Success:` - Should show the API response
- Any error messages

### 4. Check Server Logs

On your production server, check the logs for:
```bash
# If using PM2
pm2 logs

# Look for:
# [REPRINT] Starting reprint for order ID: ...
# [REPRINT] Order found: ...
# [REPRINT] Receipt data formatted
# [REPRINT] Print job queued successfully: ...
```

### 5. Verify Print Queue Database

Check if jobs are being added to the print_queue table:

```sql
-- Check recent print jobs
SELECT id, order_id, status, attempts, error_message, created_at, processed_at
FROM print_queue
ORDER BY created_at DESC
LIMIT 10;

-- Check pending jobs
SELECT COUNT(*) as pending_jobs
FROM print_queue
WHERE status = 'pending';
```

### 6. Check Print Worker Status

Verify the print worker is running:

```bash
# If using PM2
pm2 status

# Should show "print-worker" as "online"
# If not running:
pm2 start ecosystem.config.js --only print-worker
```

Check print worker logs:
```bash
pm2 logs print-worker

# Look for:
# ✅ Processed X job(s): Y succeeded, Z failed
# Or errors like:
# ❌ Printer connection error
```

### 7. Test Printer Connectivity from Server

SSH into your production server and test the printer:

```bash
# Test connectivity
nc -zv 10.250.40.14 9100

# Test printing
printf "Test from server\n\n\n" | nc 10.250.40.14 9100
```

## Common Issues and Solutions

### Issue 1: Wrong Printer IP
**Symptom**: Print worker shows "Printer connection failed"
**Solution**: Update `PRINTER_IP_ADDRESS` in your environment to `10.250.40.14`

### Issue 2: Print Worker Not Running
**Symptom**: Jobs stay in "pending" status forever
**Solution**: Start the print worker:
```bash
pm2 start ecosystem.config.js --only print-worker
pm2 save
```

### Issue 3: RLS Policy Blocking Inserts
**Symptom**: Error "Failed to queue print job" with "permission denied"
**Solution**: The service client should bypass RLS. Check that `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is set correctly.

### Issue 4: Network/Firewall Issues
**Symptom**: Print worker can't reach printer (timeout errors)
**Solution**: 
- Verify VPN is connected (if using WireGuard)
- Check firewall rules allow outbound connections to port 9100
- Verify printer is on the same network or accessible via VPN

### Issue 5: Missing Environment Variables
**Symptom**: "Printer not configured" error
**Solution**: Ensure these are set:
```bash
PRINTER_IP_ADDRESS=10.250.40.14
PRINTER_PORT=9100
PRINT_PROCESSOR_SECRET=your_secret_here
```

## Quick Fix Commands

### Restart Everything
```bash
# Restart Next.js app
pm2 restart jollofexpress

# Restart print worker
pm2 restart print-worker

# Check status
pm2 status
pm2 logs --lines 50
```

### Manual Print Test
```bash
# Test from command line (your working command)
printf "Test Print\n\n\n" | nc 10.250.40.14 9100
```

### Force Process Print Queue
```bash
# Manually trigger print queue processing
curl -X POST https://jollofexpress.app/api/print/process-queue \
  -H "Authorization: Bearer YOUR_PRINT_PROCESSOR_SECRET"
```

## Next Steps

1. **Update printer IP**: Change `PRINTER_IP_ADDRESS` to `10.250.40.14` in your environment
2. **Restart services**: `pm2 restart all`
3. **Test reprint**: Click the reprint button and check logs
4. **Monitor**: Watch `pm2 logs` to see if jobs are processing

## Need More Help?

Run the diagnostic endpoint and share the output:
```bash
curl https://jollofexpress.app/api/kitchen/orders/ORDER_ID/print/test | jq
```

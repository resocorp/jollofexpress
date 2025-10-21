# 🚀 Network Printing - Quick Start Guide

Get your kitchen printer working in **5 minutes** (after VPN setup).

---

## Prerequisites Checklist

- [ ] **80mm thermal POS printer** connected to kitchen network
- [ ] **Printer IP address** noted (e.g., `192.168.100.50`)
- [ ] **WireGuard VPN** set up between Digital Ocean and kitchen
- [ ] Can ping printer from Digital Ocean server

---

## Step 1: Configure Environment (2 minutes)

Edit `.env.local`:

```env
# Printer Configuration
PRINTER_IP_ADDRESS=192.168.100.50  # ← Change to your printer IP
PRINTER_PORT=9100                   # ← Usually 9100 for thermal printers

# Print Processor Secret (generate random string)
PRINT_PROCESSOR_SECRET=your_secure_random_secret_change_this
PRINT_PROCESS_INTERVAL=15000        # Check queue every 15 seconds
```

Generate secure secret:
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## Step 2: Test Printer Connection (1 minute)

```bash
# From Digital Ocean server
ping 192.168.100.50

# Test printer port
nc -zv 192.168.100.50 9100

# Run printer test script
node scripts/test-printer.js
```

**Expected output:**
```
✅ SUCCESS: Connected to printer
✅ SUCCESS: Data sent to printer
🎉 All tests passed! Your printer is ready.
```

If test receipt prints, proceed to Step 3.

---

## Step 3: Start Services (2 minutes)

### Option A: Local Development

```bash
# Terminal 1 - Start Next.js app
npm run dev

# Terminal 2 - Start print worker
npm run print-worker
```

### Option B: Production (PM2)

```bash
# Build app
npm run build

# Start services
pm2 start npm --name "jollofexpress" -- start
pm2 start npm --name "print-worker" -- run print-worker

# Save PM2 config
pm2 save
pm2 startup  # Follow the command it outputs
```

---

## Step 4: Test End-to-End (1 minute)

1. **Place a test order**
   - Go to your app
   - Add items to cart
   - Complete checkout with test payment

2. **Check print worker logs**
   ```bash
   # Development
   # Check Terminal 2 output
   
   # Production
   pm2 logs print-worker
   ```

3. **Verify receipt printed**
   - Receipt should print within 15-20 seconds
   - Check for order details, items, totals

---

## ✅ Success Indicators

You know it's working when:

1. ✅ Print worker logs show:
   ```
   ✅ Processed 1 job(s): 1 succeeded, 0 failed (234ms)
   ```

2. ✅ Receipt prints with:
   - Restaurant name header
   - Order number and date
   - Customer details
   - Items with variations
   - Totals
   - "Kitchen - Start Prep Now!" footer

3. ✅ In Supabase `print_queue` table:
   - Status changes from `pending` → `printed`
   - `processed_at` timestamp is set

---

## 🔧 Quick Troubleshooting

### Printer doesn't print?

**Check 1: Connectivity**
```bash
ping 192.168.100.50
# Should get replies
```

**Check 2: VPN**
```bash
sudo wg show
# Look for "latest handshake" - should be recent (< 2 min)
```

**Check 3: Print worker running**
```bash
pm2 status
# print-worker should show "online"
```

**Check 4: Logs**
```bash
pm2 logs print-worker --lines 50
# Look for errors
```

**Check 5: Print queue**
```sql
-- In Supabase SQL Editor
SELECT * FROM print_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Common Fixes

| Problem | Solution |
|---------|----------|
| "Connection timeout" | Check VPN: `sudo systemctl restart wg-quick@wg0` |
| "Printer offline" | Check printer power and network cable |
| "No pending jobs" | Verify order payment completed successfully |
| "Print worker not running" | `pm2 restart print-worker` |

---

## 🎛️ Configuration Options

### Change processing interval

```env
# Check queue every 10 seconds (faster)
PRINT_PROCESS_INTERVAL=10000

# Check queue every 30 seconds (slower, less load)
PRINT_PROCESS_INTERVAL=30000
```

### Multiple printers

Update code to route based on order type:

```typescript
// lib/print/print-processor.ts
const printerHost = order.order_type === 'delivery' 
  ? process.env.KITCHEN_PRINTER_IP 
  : process.env.BAR_PRINTER_IP;
```

---

## 📊 Monitoring

### Check print worker status
```bash
pm2 status
pm2 monit  # Live dashboard
```

### View recent print jobs
```sql
SELECT 
  order_id,
  status,
  created_at,
  processed_at
FROM print_queue
ORDER BY created_at DESC
LIMIT 20;
```

### Print success rate today
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM print_queue
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

---

## 🆘 Emergency Procedures

### If printer goes offline during service

1. **Immediate action**
   - Orders still process normally
   - Print jobs queue up (status: pending)
   
2. **Fix printer**
   - Check power, network connection
   - Verify IP address hasn't changed
   - Test: `ping 192.168.100.50`

3. **Reprocess failed jobs**
   ```sql
   -- Reset failed jobs to retry
   UPDATE print_queue 
   SET status = 'pending', attempts = 0 
   WHERE status = 'failed' 
   AND created_at >= CURRENT_DATE;
   ```
   
4. **Verify recovery**
   ```bash
   pm2 logs print-worker
   # Should show jobs being processed
   ```

### If print worker crashes

```bash
# Check status
pm2 status

# View crash logs
pm2 logs print-worker --err --lines 50

# Restart
pm2 restart print-worker

# If keeps crashing, check environment
pm2 env print-worker
```

---

## 🔐 Security Notes

### Protect print processor endpoint

The `/api/print/process-queue` endpoint is protected by:
- `PRINT_PROCESSOR_SECRET` token in Authorization header
- Only accessible by authenticated print worker

**Don't share this secret publicly!**

### Firewall recommendations

```bash
# Digital Ocean server
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 51820/udp  # WireGuard VPN
sudo ufw enable
```

---

## 📞 Need Help?

### Useful Commands

```bash
# Print worker logs
pm2 logs print-worker

# Restart everything
pm2 restart all

# Test printer manually
node scripts/test-printer.js

# Check VPN
sudo wg show

# Process queue manually
curl -X POST \
  -H "Authorization: Bearer YOUR_PRINT_PROCESSOR_SECRET" \
  https://yourdomain.com/api/print/process-queue
```

### Check Documentation

- **Full Setup Guide**: `NETWORK_PRINTING_SETUP.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Implementation Details**: `PRINTING_IMPLEMENTATION_SUMMARY.md`

---

## ✅ You're Done!

Your kitchen printer should now automatically print receipts when orders are completed.

**Next steps:**
1. Monitor for first few days
2. Keep printer stocked with paper
3. Train kitchen staff on system
4. Set up monitoring alerts

**Happy Printing! 🖨️🎉**

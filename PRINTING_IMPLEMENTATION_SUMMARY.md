# 🖨️ Network Printing Implementation Summary

## Overview

Automatic receipt printing system for JollofExpress kitchen, featuring **server-side network printing** from Digital Ocean to an 80mm thermal POS printer over WireGuard VPN.

---

## ✅ What Has Been Implemented

### 1. **Core Printing Infrastructure**

#### ESC/POS Command Generator (`lib/print/escpos-generator.ts`)
- Generates thermal printer commands (ESC/POS protocol)
- Formats receipts for 80mm thermal paper (48 characters wide)
- Includes all order details: items, customer info, delivery address, totals
- Supports special instructions highlighting
- Auto-cut command at end of receipt

#### Network Printer Client (`lib/print/network-printer.ts`)
- Direct TCP communication with printer (port 9100)
- Connection timeout handling (10 seconds)
- Retry logic built-in
- Works seamlessly over VPN - printer appears as if on local LAN

#### Print Queue Processor (`lib/print/print-processor.ts`)
- Polls Supabase `print_queue` table for pending jobs
- Processes jobs sequentially (max 10 per batch)
- Retry logic: 3 attempts before marking as failed
- Updates order status in database
- Error tracking and logging

---

### 2. **API Endpoints**

#### Process Queue API (`/api/print/process-queue`)
- **POST**: Processes pending print jobs
- **GET**: Tests printer connectivity (health check)
- Authentication via `PRINT_PROCESSOR_SECRET`
- Returns detailed processing results

**Example POST Response:**
```json
{
  "success": true,
  "result": {
    "processed": 5,
    "succeeded": 5,
    "failed": 0
  },
  "timestamp": "2025-10-21T20:42:23.000Z"
}
```

**Example GET Response:**
```json
{
  "status": "online",
  "message": "Printer is online at 192.168.100.50:9100",
  "config": {
    "host": "192.168.100.50",
    "port": 9100
  }
}
```

---

### 3. **Background Print Worker**

#### Print Worker Script (`scripts/print-worker.js`)
- Runs continuously as background process
- Polls `/api/print/process-queue` every 15 seconds (configurable)
- Automatic error recovery
- Health checks every 5 minutes
- Graceful shutdown handling
- PM2-ready for auto-restart on crash

**Run with:**
```bash
npm run print-worker
# or
pm2 start npm --name "print-worker" -- run print-worker
```

---

### 4. **Testing & Utilities**

#### Printer Test Script (`scripts/test-printer.js`)
- Tests printer connectivity
- Sends test receipt to verify printing works
- Provides troubleshooting guidance

**Run with:**
```bash
node scripts/test-printer.js
```

---

### 5. **Documentation**

#### Setup Guides
1. **NETWORK_PRINTING_SETUP.md** - Complete WireGuard VPN + printer setup
2. **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment to Digital Ocean
3. **PRINTING_IMPLEMENTATION_SUMMARY.md** - This file

---

## 🔄 Complete Print Flow

```
1. Customer completes order & payment
         ↓
2. API adds job to print_queue table
   - Status: 'pending'
   - Contains: Receipt data (JSON)
         ↓
3. Print Worker polls every 15s
   - Detects new pending job
         ↓
4. Generate ESC/POS commands
   - Convert receipt JSON to thermal printer format
         ↓
5. Send via TCP to printer
   - Through WireGuard VPN tunnel
   - Connect to 192.168.100.50:9100
         ↓
6. Printer receives & prints
   - Receipt prints immediately
         ↓
7. Update database
   - Status: 'printed'
   - Update order.print_status
         ↓
8. Kitchen staff receives receipt
   - Begins preparing order
```

**⏱️ Total Time: 15-20 seconds** from order completion to printed receipt

---

## 🏗️ Architecture

### Network Topology

```
┌───────────────────────────────────────────────────┐
│         Internet                                  │
└─────────┬──────────────────────────┬──────────────┘
          │                          │
          │                          │
┌─────────▼──────────────┐  ┌────────▼─────────────┐
│  Digital Ocean Droplet │  │  Customer Browser    │
│  (Ubuntu Server)       │  │  (Places Orders)     │
│                        │  └──────────────────────┘
│  • Next.js App         │
│  • Print Worker        │
│  • WireGuard Client    │
│    IP: 10.8.0.1        │
└─────────┬──────────────┘
          │
    🔒 WireGuard VPN Tunnel (Encrypted)
          │
┌─────────▼──────────────────────────────────────┐
│  Kitchen Network                               │
│                                                 │
│  ┌──────────────────┐    ┌──────────────────┐ │
│  │ Router/Gateway   │    │  Kitchen Display │ │
│  │ WireGuard Server │    │  (View Orders)   │ │
│  │ IP: 10.8.0.2     │    │                  │ │
│  └────────┬─────────┘    └──────────────────┘ │
│           │                                     │
│  LAN: 192.168.100.0/24                         │
│           │                                     │
│  ┌────────▼─────────┐                          │
│  │  80mm Thermal    │                          │
│  │  POS Printer     │                          │
│  │  192.168.100.50  │                          │
│  │  Port: 9100      │                          │
│  └──────────────────┘                          │
└─────────────────────────────────────────────────┘
```

---

## 📝 Configuration

### Environment Variables (`.env.local`)

```env
# Printer Configuration
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100

# Print Processor Security
PRINT_PROCESSOR_SECRET=your_secure_random_secret
PRINT_PROCESS_INTERVAL=15000

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack (required)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 🚀 Deployment Steps (Quick Reference)

1. **Set up WireGuard VPN**
   - Configure on Digital Ocean droplet
   - Configure on kitchen router/gateway
   - Verify printer is reachable

2. **Deploy Application**
   - Clone repo to Digital Ocean
   - Install dependencies (`npm install`)
   - Configure `.env.local`
   - Build app (`npm run build`)

3. **Start Services with PM2**
   ```bash
   pm2 start npm --name "jollofexpress" -- start
   pm2 start npm --name "print-worker" -- run print-worker
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx + SSL**
   - Set up reverse proxy
   - Install SSL certificate with Certbot

5. **Test End-to-End**
   - Place test order
   - Verify receipt prints
   - Check kitchen display

**See `DEPLOYMENT_CHECKLIST.md` for detailed steps**

---

## 🧪 Testing

### Quick Tests

```bash
# Test printer connectivity
node scripts/test-printer.js

# Test print API manually
curl -X POST \
  -H "Authorization: Bearer YOUR_SECRET" \
  https://yourdomain.com/api/print/process-queue

# Check print worker logs
pm2 logs print-worker

# Check printer health
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://yourdomain.com/api/print/process-queue
```

### Database Queries

```sql
-- View recent print jobs
SELECT * FROM print_queue 
ORDER BY created_at DESC 
LIMIT 20;

-- Check failed prints
SELECT * FROM print_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Print success rate today
SELECT 
  status,
  COUNT(*) as count
FROM print_queue
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

---

## 🔧 Troubleshooting

### Printer Not Printing

**1. Check Connectivity**
```bash
ping 192.168.100.50
nc -zv 192.168.100.50 9100
```

**2. Check VPN**
```bash
sudo wg show
# Look for "latest handshake" - should be recent
```

**3. Check Print Worker**
```bash
pm2 status
pm2 logs print-worker --lines 50
```

**4. Test Manually**
```bash
node scripts/test-printer.js
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection timeout | VPN down or printer offline | Check WireGuard status, ping printer |
| Print jobs stuck | Print worker not running | Check `pm2 status`, restart if needed |
| Wrong IP address | Printer IP changed | Update `PRINTER_IP_ADDRESS` in `.env.local` |
| Port blocked | Firewall blocking port 9100 | Check printer firewall settings |

---

## 📊 Monitoring

### What to Monitor

1. **Print Worker Uptime**
   ```bash
   pm2 status
   ```

2. **Print Success Rate**
   ```sql
   SELECT 
     DATE(created_at) as date,
     status,
     COUNT(*) as count
   FROM print_queue
   WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
   GROUP BY DATE(created_at), status
   ORDER BY date DESC;
   ```

3. **Printer Connectivity**
   - Set up cron job to ping printer every 5 minutes
   - Alert if unreachable for > 15 minutes

4. **Failed Print Jobs**
   - Check daily for jobs with status = 'failed'
   - Investigate error messages

---

## 🔒 Security

### Best Practices

1. **Strong Secrets**
   - Use cryptographically random `PRINT_PROCESSOR_SECRET`
   - Never commit secrets to version control

2. **WireGuard Security**
   - Keep private keys secure (chmod 600)
   - Rotate keys every 6 months
   - Use strong firewall rules

3. **Firewall Configuration**
   ```bash
   # Digital Ocean
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw allow 51820/udp # WireGuard
   sudo ufw enable
   ```

4. **API Authentication**
   - All print API endpoints require `Authorization: Bearer TOKEN`
   - Use different secrets for different services

---

## 📈 Performance

### Optimizations

1. **Reduce Print Latency**
   - Decrease `PRINT_PROCESS_INTERVAL` to 10 seconds
   - Use `PersistentKeepalive = 15` in WireGuard config

2. **Handle High Volume**
   - Increase `batchSize` in print processor (default: 10)
   - Scale to multiple print workers if needed

3. **Printer Queue Management**
   - Archive old print jobs (> 30 days)
   - Set up automatic cleanup job

---

## 🎯 Key Benefits

✅ **No Print Server Required** - Direct network printing from cloud  
✅ **Works Over Internet** - VPN makes printer appear local  
✅ **Automatic & Reliable** - Background worker with retry logic  
✅ **Secure** - Encrypted VPN tunnel + authentication  
✅ **Scalable** - Easy to add more printers/locations  
✅ **Monitorable** - Detailed logging and error tracking  
✅ **Professional** - ESC/POS thermal printing like major POS systems  

---

## 📦 What's Included

### Files Created

```
lib/print/
  ├── escpos-generator.ts      # ESC/POS command generator
  ├── network-printer.ts        # TCP printer client
  ├── print-processor.ts        # Queue processor
  └── format-receipt.ts         # Receipt formatter (existing)

app/api/print/
  └── process-queue/
      └── route.ts              # Print API endpoint

scripts/
  ├── print-worker.js           # Background print worker
  └── test-printer.js           # Printer test utility

Documentation/
  ├── NETWORK_PRINTING_SETUP.md
  ├── DEPLOYMENT_CHECKLIST.md
  └── PRINTING_IMPLEMENTATION_SUMMARY.md (this file)
```

### Database Tables (Existing)

- `print_queue` - Stores pending print jobs
- `orders` - Tracks order print status
- `order_items` - Order line items

---

## 🚧 Future Enhancements

### Possible Additions

1. **Multiple Printers**
   - Route different order types to different printers
   - Bar printer, kitchen printer, packing station printer

2. **Advanced Features**
   - Print logos/images (requires printer support)
   - QR codes for order tracking
   - Custom receipt templates per location

3. **Monitoring Dashboard**
   - Real-time print queue status
   - Printer uptime tracking
   - Failed job alerts

4. **Print Notifications**
   - SMS/email alert when print fails
   - Push notification to kitchen staff app
   - Printer offline alerts

---

## ✅ Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| ESC/POS Generator | ✅ Complete | Ready for 80mm thermal printers |
| Network Printer Client | ✅ Complete | TCP port 9100 support |
| Print Processor | ✅ Complete | With retry logic & error handling |
| API Endpoints | ✅ Complete | POST + GET health check |
| Background Worker | ✅ Complete | PM2-ready, auto-restart |
| Test Scripts | ✅ Complete | Connectivity + print test |
| Documentation | ✅ Complete | Setup + deployment guides |
| Database Schema | ✅ Existing | print_queue table ready |
| VPN Setup Guide | ✅ Complete | WireGuard configuration |
| Deployment Checklist | ✅ Complete | Step-by-step guide |

---

## 📞 Next Steps

### For Local Testing
1. Get an 80mm thermal POS printer
2. Connect to your local network
3. Run test script: `node scripts/test-printer.js`
4. Update `.env.local` with printer IP
5. Start print worker: `npm run print-worker`

### For Production Deployment
1. Follow `DEPLOYMENT_CHECKLIST.md`
2. Set up WireGuard VPN
3. Deploy to Digital Ocean
4. Configure printer in kitchen
5. Test end-to-end flow

---

## 📚 Additional Resources

- **ESC/POS Command Reference**: https://reference.epson-biz.com/modules/ref_escpos/
- **WireGuard Documentation**: https://www.wireguard.com/quickstart/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **Thermal Printer Recommendations**: Look for ESC/POS compatible 80mm models

---

## 🎉 Conclusion

The network printing system is **fully implemented and ready for deployment**. 

It provides:
- Professional-grade thermal receipt printing
- Direct cloud-to-printer communication via VPN
- Automatic processing with robust error handling
- Complete monitoring and troubleshooting tools

Follow the deployment checklist to get it running in production. Test thoroughly before going live!

**Happy Printing! 🖨️**

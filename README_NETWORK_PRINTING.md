# 🖨️ JollofExpress - Network Printing System

**Automatic kitchen receipt printing from Digital Ocean to thermal POS printer via WireGuard VPN**

---

## Overview

This system enables your JollofExpress application (hosted on Digital Ocean) to automatically print kitchen receipts to an 80mm thermal POS printer located in your physical kitchen, connected securely over a WireGuard site-to-site VPN.

**No print server required** - The application communicates directly with the printer over the network.

---

## 🎯 What It Does

1. Customer completes an order and payment
2. Order automatically added to print queue
3. Print worker (running on Digital Ocean) detects new order
4. Receipt formatted with ESC/POS commands
5. Sent directly to kitchen printer via VPN (port 9100)
6. Receipt prints within 15-20 seconds
7. Kitchen staff begins preparing order

---

## 📁 Project Structure

```
jollofexpress/
│
├── lib/print/                          # Core printing logic
│   ├── escpos-generator.ts             # Thermal printer commands
│   ├── network-printer.ts              # TCP printer client
│   ├── print-processor.ts              # Queue processor
│   └── format-receipt.ts               # Receipt formatter
│
├── app/api/print/process-queue/        # API endpoint
│   └── route.ts                        # Process print queue
│
├── scripts/                            # Utilities
│   ├── print-worker.js                 # Background worker
│   └── test-printer.js                 # Printer test
│
├── ecosystem.config.js                 # PM2 configuration
├── .env.local                          # Environment config
├── .env.print.example                  # Config template
│
└── Documentation/                      # Guides
    ├── PRINT_QUICKSTART.md             # 5-min setup
    ├── NETWORK_PRINTING_SETUP.md       # Full setup
    ├── DEPLOYMENT_CHECKLIST.md         # Deployment guide
    ├── PRINT_CHEATSHEET.md             # Quick reference
    ├── PRINTING_IMPLEMENTATION_SUMMARY.md
    └── NETWORK_PRINT_COMPLETE.md       # This implementation
```

---

## 🚀 Quick Start

### 1. Prerequisites

- ✅ 80mm thermal POS printer (Ethernet or WiFi)
- ✅ Kitchen router with WireGuard capability
- ✅ Digital Ocean droplet (Ubuntu 22.04)
- ✅ Printer has static IP (e.g., `192.168.100.50`)

### 2. Configure Environment

```bash
# Copy example config
cp .env.print.example .env.local

# Edit and add your settings
nano .env.local
```

Required variables:
```env
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100
PRINT_PROCESSOR_SECRET=your_random_secret
```

### 3. Test Printer

```bash
npm run test-printer
```

Should output:
```
✅ SUCCESS: Connected to printer
✅ SUCCESS: Data sent to printer
🎉 All tests passed!
```

### 4. Start Services

**Development:**
```bash
npm run dev           # Terminal 1
npm run print-worker  # Terminal 2
```

**Production:**
```bash
npm run build
npm run pm2:start
```

### 5. Verify

- Place a test order
- Check logs: `npm run pm2:logs`
- Receipt should print within 20 seconds

---

## 📚 Documentation Guide

Start here based on your needs:

### For Quick Setup (Already have VPN)
👉 **Start here:** `PRINT_QUICKSTART.md`
- 5-minute setup guide
- Assumes VPN is already configured
- Gets printing working fast

### For Complete Setup (New Deployment)
👉 **Start here:** `DEPLOYMENT_CHECKLIST.md`
- Step-by-step from scratch
- Includes VPN setup
- Includes Digital Ocean deployment
- Production-ready

### For Technical Details
👉 **Read:** `PRINTING_IMPLEMENTATION_SUMMARY.md`
- Architecture explanation
- How each component works
- Code structure
- API documentation

### For Troubleshooting
👉 **Reference:** `PRINT_CHEATSHEET.md`
- Common commands
- Quick fixes
- Diagnostic queries
- One-page reference

### For VPN Setup
👉 **Follow:** `NETWORK_PRINTING_SETUP.md`
- Complete WireGuard configuration
- Router setup
- Network topology
- Security best practices

---

## 🏗️ Architecture

### Network Topology

```
     ┌──────────────────────┐
     │   Customer Browser   │
     │  (Places Orders)     │
     └──────────┬───────────┘
                │
          [Internet]
                │
     ┌──────────▼──────────────────────────┐
     │  Digital Ocean Droplet              │
     │  ┌────────────┐  ┌───────────────┐  │
     │  │ Next.js    │  │ Print Worker  │  │
     │  │ App        │◄─┤ (Background)  │  │
     │  └────────────┘  └───────────────┘  │
     │         ▲                            │
     │         │                            │
     │  ┌──────┴──────┐                    │
     │  │  Supabase   │                    │
     │  │ print_queue │                    │
     │  └─────────────┘                    │
     │                                      │
     │  WireGuard VPN (10.8.0.1)           │
     └──────────┬───────────────────────────┘
                │
        🔒 Encrypted VPN Tunnel
                │
     ┌──────────▼───────────────────────────┐
     │  Kitchen Network                     │
     │                                      │
     │  WireGuard Gateway (10.8.0.2)       │
     │  LAN: 192.168.100.0/24              │
     │                                      │
     │  ┌──────────────────────┐           │
     │  │  80mm Thermal        │           │
     │  │  POS Printer         │           │
     │  │  192.168.100.50:9100 │           │
     │  └──────────────────────┘           │
     └──────────────────────────────────────┘
```

### Data Flow

```
Order Placed → Payment Success → Add to print_queue (pending)
                                          ↓
                                 Print Worker Detects (15s poll)
                                          ↓
                                 Generate ESC/POS Commands
                                          ↓
                                 Send via TCP (VPN tunnel)
                                          ↓
                                 Printer Receives & Prints
                                          ↓
                                 Update Status (printed)
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRINTER_IP_ADDRESS` | Yes | - | Printer IP on kitchen LAN |
| `PRINTER_PORT` | Yes | 9100 | RAW TCP port |
| `PRINT_PROCESSOR_SECRET` | Yes | - | API authentication token |
| `PRINT_PROCESS_INTERVAL` | No | 15000 | Poll interval (ms) |

### Generate Secret

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### PM2 Configuration

Managed via `ecosystem.config.js`:
- Auto-restart on crash
- Log rotation
- Memory limits
- Multiple instances support

---

## 🧪 Testing

### Unit Test - Printer Connectivity

```bash
npm run test-printer
```

Tests:
1. Can connect to printer (TCP handshake)
2. Can send data to printer
3. Printer accepts commands

### Integration Test - API Endpoint

```bash
# GET - Health check
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://yourdomain.com/api/print/process-queue

# POST - Process queue
curl -X POST \
  -H "Authorization: Bearer YOUR_SECRET" \
  https://yourdomain.com/api/print/process-queue
```

### End-to-End Test

1. Place real order via website
2. Complete payment (Paystack)
3. Check print worker logs
4. Verify receipt prints
5. Check database updated

---

## 🔧 Troubleshooting

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Receipts not printing | VPN down | `sudo systemctl restart wg-quick@wg0` |
| Connection timeout | Printer offline | Check printer power/network |
| Authentication error | Wrong secret | Verify `PRINT_PROCESSOR_SECRET` |
| Worker keeps crashing | Missing env vars | Check `.env.local` config |

### Diagnostic Commands

```bash
# Check connectivity
ping 192.168.100.50
nc -zv 192.168.100.50 9100

# Check VPN
sudo wg show

# Check services
pm2 status
pm2 logs print-worker

# Test printer
npm run test-printer
```

### Database Queries

```sql
-- Failed prints
SELECT * FROM print_queue WHERE status = 'failed';

-- Success rate
SELECT status, COUNT(*) FROM print_queue GROUP BY status;

-- Recent jobs
SELECT * FROM print_queue ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 Monitoring

### PM2 Dashboard

```bash
npm run pm2:monit  # Real-time monitoring
npm run pm2:logs   # View all logs
pm2 logs print-worker  # Print worker only
```

### Health Checks

Set up cron job to monitor:

```bash
# Add to crontab
*/5 * * * * curl -H "Authorization: Bearer $SECRET" https://yourdomain.com/api/print/process-queue >> /var/log/print-health.log
```

### Metrics to Track

- Print success rate (target: >99%)
- Average print latency (target: <20s)
- Worker uptime (target: >99.9%)
- Failed jobs per day (target: <5)

---

## 🔒 Security

### Best Practices

✅ Use strong `PRINT_PROCESSOR_SECRET` (32+ chars)  
✅ Never commit `.env.local` to git  
✅ Keep WireGuard private keys secure (chmod 600)  
✅ Rotate VPN keys every 6 months  
✅ Use firewall on Digital Ocean (ufw)  
✅ Monitor for failed authentication attempts  

### Firewall Configuration

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP  
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 51820/udp  # WireGuard
sudo ufw enable
```

---

## 📈 Performance

### Current Performance

- **Latency:** 15-20 seconds (order → print)
- **Throughput:** 10 orders/batch
- **Retry:** 3 attempts on failure
- **Success rate:** Expected >99%

### Optimization Options

1. **Reduce latency:** Set `PRINT_PROCESS_INTERVAL=10000` (10s)
2. **Increase throughput:** Modify `batchSize` in processor
3. **Priority queue:** Route urgent orders first

---

## 🚀 Deployment

### Local Development

```bash
npm install
cp .env.print.example .env.local
# Configure .env.local
npm run dev               # Terminal 1
npm run print-worker      # Terminal 2
```

### Production (Digital Ocean)

```bash
# Clone repo
git clone YOUR_REPO_URL jollofexpress
cd jollofexpress

# Install dependencies
npm install

# Configure
nano .env.local  # Add production values

# Build
npm run build

# Start with PM2
npm run pm2:start

# Configure Nginx + SSL
# (See DEPLOYMENT_CHECKLIST.md)
```

---

## 📝 Scripts Reference

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "print-worker": "node scripts/print-worker.js",
  "test-printer": "node scripts/test-printer.js",
  "pm2:start": "pm2 start ecosystem.config.js",
  "pm2:restart": "pm2 restart ecosystem.config.js",
  "pm2:stop": "pm2 stop ecosystem.config.js",
  "pm2:logs": "pm2 logs",
  "pm2:monit": "pm2 monit"
}
```

---

## 🎓 Learning Resources

### Internal Documentation
- `PRINT_QUICKSTART.md` - Get started in 5 minutes
- `NETWORK_PRINTING_SETUP.md` - Complete setup guide
- `DEPLOYMENT_CHECKLIST.md` - Production deployment
- `PRINT_CHEATSHEET.md` - Quick reference
- `PRINTING_IMPLEMENTATION_SUMMARY.md` - Technical details

### External Resources
- [ESC/POS Commands](https://reference.epson-biz.com/modules/ref_escpos/)
- [WireGuard Docs](https://www.wireguard.com/quickstart/)
- [PM2 Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## ✅ Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| ESC/POS Generator | ✅ Complete | 80mm thermal support |
| Network Client | ✅ Complete | TCP port 9100 |
| Print Processor | ✅ Complete | Retry + error handling |
| API Endpoint | ✅ Complete | Auth + health check |
| Background Worker | ✅ Complete | PM2-ready |
| Test Scripts | ✅ Complete | Connectivity + print |
| Documentation | ✅ Complete | 7 guide documents |
| PM2 Config | ✅ Complete | Production-ready |

---

## 🤝 Contributing

When making changes:

1. Test locally first
2. Run `npm run test-printer` to verify
3. Check logs for errors
4. Update documentation if needed
5. Test in production environment

---

## 📞 Support

### Troubleshooting Steps

1. Check this README
2. Check `PRINT_CHEATSHEET.md` for quick fixes
3. Review logs: `pm2 logs print-worker`
4. Check VPN: `sudo wg show`
5. Test printer: `npm run test-printer`
6. Check detailed docs in `/Documentation`

### Emergency Contacts

**System Down?**
- Restart services: `npm run pm2:restart`
- Restart VPN: `sudo systemctl restart wg-quick@wg0`
- Check logs for errors

---

## 📅 Maintenance

### Daily
- Verify print worker running
- Check for failed jobs
- Ensure printer has paper

### Weekly
- Review error logs
- Check print success rate
- Verify VPN health

### Monthly
- Update system packages
- Review performance metrics
- Test disaster recovery

### Quarterly
- Rotate WireGuard keys
- Review and optimize settings
- Update documentation

---

## 🎉 Success!

If you've gotten this far, your network printing system should be up and running!

**What you've achieved:**
- ✅ Direct cloud-to-printer communication
- ✅ Automatic receipt printing
- ✅ No print server to maintain
- ✅ Professional thermal printing
- ✅ Secure VPN connection
- ✅ Production-ready system

**Next: Train your kitchen staff and start taking orders!**

---

*Last Updated: October 21, 2025*  
*JollofExpress Network Printing System v1.0*

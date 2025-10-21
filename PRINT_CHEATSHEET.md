# 🖨️ Network Printing - Quick Reference Card

One-page reference for common tasks and troubleshooting.

---

## 🚀 Common Commands

### Development
```bash
npm run dev              # Start Next.js dev server
npm run print-worker     # Start print worker
npm run test-printer     # Test printer connection
```

### Production
```bash
npm run build            # Build for production
npm run pm2:start        # Start all services
npm run pm2:restart      # Restart all services
npm run pm2:stop         # Stop all services
npm run pm2:logs         # View logs
npm run pm2:monit        # Live monitoring
```

### Testing
```bash
# Test printer
npm run test-printer

# Test API manually
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://yourdomain.com/api/print/process-queue

# Check VPN
sudo wg show

# Ping printer
ping 192.168.100.50
```

---

## ⚙️ Configuration

### Required Environment Variables
```env
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100
PRINT_PROCESSOR_SECRET=your_random_secret
```

### Generate Secret
```bash
openssl rand -hex 32
```

---

## 🔧 Troubleshooting

### Printer Not Printing

**Step 1: Check Connectivity**
```bash
ping 192.168.100.50
nc -zv 192.168.100.50 9100
```
❌ Fails? → Check printer power and network cable

**Step 2: Check VPN**
```bash
sudo wg show
```
❌ No handshake or old timestamp? → Restart VPN:
```bash
sudo systemctl restart wg-quick@wg0
```

**Step 3: Check Print Worker**
```bash
pm2 status
```
❌ Not running or errored? → Restart:
```bash
pm2 restart print-worker
```

**Step 4: Check Logs**
```bash
pm2 logs print-worker --lines 50
```
Look for connection errors or authentication issues.

**Step 5: Check Print Queue**
```sql
-- In Supabase SQL Editor
SELECT * FROM print_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🆘 Emergency Fixes

### Print Worker Crashed
```bash
pm2 restart print-worker
pm2 logs print-worker --lines 50  # Check why
```

### VPN Down
```bash
sudo systemctl restart wg-quick@wg0
sudo wg show  # Verify it's back up
```

### Printer Offline During Service
```bash
# 1. Fix printer (power, network)
# 2. Verify: ping 192.168.100.50
# 3. Reprocess failed jobs:
```
```sql
UPDATE print_queue 
SET status = 'pending', attempts = 0 
WHERE status = 'failed' 
AND created_at >= CURRENT_DATE;
```

### Everything Broken
```bash
# Nuclear option - restart all
pm2 restart all
sudo systemctl restart wg-quick@wg0
```

---

## 📊 Monitoring Queries

### Recent Print Jobs
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

### Failed Prints Today
```sql
SELECT * FROM print_queue 
WHERE status = 'failed' 
AND created_at >= CURRENT_DATE;
```

### Success Rate
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

## 🔍 Quick Diagnostics

### Health Check Script
```bash
#!/bin/bash
echo "=== Print System Health Check ==="
echo ""
echo "1. VPN Status:"
sudo wg show | grep -E "(handshake|transfer)"
echo ""
echo "2. Printer Connectivity:"
ping -c 1 192.168.100.50 && echo "✅ Printer reachable" || echo "❌ Printer offline"
echo ""
echo "3. Print Worker:"
pm2 describe print-worker | grep -E "(status|uptime|restarts)"
echo ""
echo "4. Recent Print Jobs:"
# Add Supabase query here
echo "Check Supabase for print_queue status"
```

---

## 📱 Quick Status Checks

### Is Everything Running?
```bash
pm2 status
# Both jollofexpress and print-worker should show "online"
```

### Are Prints Working?
```bash
# Check last 10 lines of print worker
pm2 logs print-worker --lines 10
# Should see "✅ Processed X job(s)"
```

### Is VPN Up?
```bash
sudo wg show | grep handshake
# Should show recent timestamp (< 2 min old)
```

### Can We Reach Printer?
```bash
ping -c 3 192.168.100.50
# Should get 3 replies
```

---

## 🎯 Performance Targets

| Metric | Target | Command to Check |
|--------|--------|------------------|
| Print latency | < 20s | Watch logs during order |
| Success rate | > 99% | Run SQL success rate query |
| Worker uptime | > 99.9% | `pm2 describe print-worker` |
| VPN latency | < 50ms | `ping 10.8.0.2` |

---

## 📋 Daily Checklist

**Morning:**
- [ ] `pm2 status` - All services online?
- [ ] Check printer has paper
- [ ] Run success rate query
- [ ] Any failed jobs overnight?

**During Service:**
- [ ] Monitor print worker logs
- [ ] Check kitchen has receipts
- [ ] Printer paper level OK?

**End of Day:**
- [ ] Review failed jobs (if any)
- [ ] Check PM2 logs for errors
- [ ] Verify VPN still healthy

---

## 🔐 Security Reminders

✅ **Never commit `.env.local` to git**  
✅ **Keep `PRINT_PROCESSOR_SECRET` confidential**  
✅ **Rotate WireGuard keys every 6 months**  
✅ **Use firewall (ufw) on Digital Ocean**  
✅ **Monitor failed authentication attempts**  

---

## 📞 Support Contacts

**Technical Issue?**
1. Check this cheatsheet
2. Check logs: `pm2 logs print-worker`
3. Check `NETWORK_PRINTING_SETUP.md`
4. Check `DEPLOYMENT_CHECKLIST.md`

**Emergency?**
- Restart everything: `pm2 restart all`
- Check VPN: `sudo systemctl restart wg-quick@wg0`
- Test printer: `npm run test-printer`

---

## 💡 Pro Tips

🔹 **Set up bash aliases** for common commands:
```bash
alias print-logs='pm2 logs print-worker'
alias print-status='pm2 describe print-worker'
alias print-test='npm run test-printer'
alias vpn-check='sudo wg show'
```

🔹 **Monitor in real-time:**
```bash
watch -n 5 'pm2 status && sudo wg show | grep handshake'
```

🔹 **Quick health check:**
```bash
curl -s -H "Authorization: Bearer $PRINT_PROCESSOR_SECRET" \
  https://yourdomain.com/api/print/process-queue | jq
```

---

## 🎓 Learn More

- `PRINT_QUICKSTART.md` - 5-minute setup guide
- `NETWORK_PRINTING_SETUP.md` - Full setup with VPN
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment
- `PRINTING_IMPLEMENTATION_SUMMARY.md` - Technical details
- `NETWORK_PRINT_COMPLETE.md` - Implementation summary

---

**Print this page and keep near your workstation!**

Last Updated: October 21, 2025

# Network Printing Setup Guide
## Direct Printing from Digital Ocean to Kitchen Printer via WireGuard VPN

This guide explains how to set up automatic receipt printing from your Digital Ocean-hosted Next.js app directly to an 80mm thermal POS printer in the kitchen, connected via WireGuard site-to-site VPN.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Digital Ocean Droplet                                       │
│                                                              │
│  ┌─────────────────┐      ┌──────────────────┐             │
│  │   Next.js App   │      │  Print Worker    │             │
│  │  (Port 3000)    │◄────►│  Background Job  │             │
│  │                 │      │  (15s interval)  │             │
│  └─────────────────┘      └──────────────────┘             │
│           │                         │                       │
│           ▼                         ▼                       │
│    ┌─────────────────────────────────────┐                 │
│    │     Supabase (print_queue)          │                 │
│    │     - Stores pending print jobs      │                 │
│    │     - Receipt data in JSON           │                 │
│    └─────────────────────────────────────┘                 │
│                                                              │
│  WireGuard VPN Interface (wg0)                              │
│  IP: 10.8.0.1                                               │
└──────────────────┬───────────────────────────────────────────┘
                   │
        🔒 Encrypted WireGuard Tunnel
                   │
┌──────────────────┴───────────────────────────────────────────┐
│ Kitchen Router/Gateway                                       │
│  WireGuard VPN Interface (wg0)                               │
│  IP: 10.8.0.2                                                │
│                                                              │
│  Local Network: 192.168.100.0/24                            │
│                                                              │
│    ┌─────────────────────────────────────┐                 │
│    │  80mm Thermal POS Printer            │                 │
│    │  IP: 192.168.100.50                  │                 │
│    │  Port: 9100 (RAW TCP)                │                 │
│    │  (Accessible via VPN as if local)    │                 │
│    └─────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔥 How It Works

### Order Complete → Print Flow

1. **Customer completes payment** → Order marked as complete
2. **API adds to print queue** → Insert into `print_queue` table with status `pending`
3. **Print worker detects job** (runs every 15 seconds)
4. **Generate ESC/POS commands** → Convert receipt data to thermal printer commands
5. **Send via TCP** → Connect to `192.168.100.50:9100` through VPN tunnel
6. **Printer receives & prints** → Receipt prints immediately
7. **Update status** → Mark as `printed` in database

**Total time: ~15-20 seconds** from order complete to printed receipt

---

## 📋 Prerequisites

### 1. Hardware
- ✅ **80mm Thermal POS Printer** with network interface (Ethernet or WiFi)
  - Examples: XPRINTER XP-80C, Epson TM-T82, Star TSP143
  - Must support ESC/POS commands
  - Network-enabled (RJ45 or WiFi)

- ✅ **Kitchen Router** with WireGuard support
  - Or separate device (Raspberry Pi, mini PC) running WireGuard

### 2. Network Setup
- ✅ Kitchen has **static public IP** or **dynamic DNS**
- ✅ Router port forwarding for WireGuard (UDP port 51820)
- ✅ Printer has **static IP** on kitchen LAN (e.g., 192.168.100.50)

### 3. Digital Ocean Droplet
- ✅ Ubuntu 22.04 LTS (or similar)
- ✅ Root or sudo access
- ✅ WireGuard installed

---

## ⚙️ Setup Instructions

### Step 1: Configure Printer Network Settings

#### Option A: Via Printer Control Panel
1. Access printer settings (usually button on printer)
2. Navigate to **Network Settings**
3. Set **Static IP**: `192.168.100.50`
4. Set **Subnet**: `255.255.255.0`
5. Set **Gateway**: `192.168.100.1` (your kitchen router)
6. Save and restart printer

#### Option B: Via Web Interface
1. Print network config page (hold feed button during power-on)
2. Note current IP address
3. Open browser: `http://<printer-ip>`
4. Login (default: admin/admin or check manual)
5. Set static IP: `192.168.100.50`
6. Enable **RAW TCP printing** on port **9100**
7. Save settings

#### Verify Printer Network
```bash
# From kitchen network, test connectivity
ping 192.168.100.50

# Test RAW TCP port
nc -zv 192.168.100.50 9100
# Should show: Connection to 192.168.100.50 9100 port [tcp/*] succeeded!
```

---

### Step 2: Set Up WireGuard VPN

#### On Digital Ocean Droplet (Server)

1. **Install WireGuard**
```bash
sudo apt update
sudo apt install wireguard -y
```

2. **Generate Keys**
```bash
cd /etc/wireguard
wg genkey | sudo tee privatekey | wg pubkey | sudo tee publickey
```

3. **Create WireGuard Config**
```bash
sudo nano /etc/wireguard/wg0.conf
```

Add:
```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_PRIVATE_KEY_FROM_ABOVE>

# Enable IP forwarding
PostUp = sysctl -w net.ipv4.ip_forward=1
PostDown = sysctl -w net.ipv4.ip_forward=0

[Peer]
# Kitchen Router/Gateway
PublicKey = <KITCHEN_PUBLIC_KEY>
AllowedIPs = 10.8.0.2/32, 192.168.100.0/24
PersistentKeepalive = 25
```

4. **Enable WireGuard**
```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
sudo systemctl status wg-quick@wg0
```

#### On Kitchen Router/Gateway

1. **Install WireGuard** (or use router GUI if supported)
```bash
sudo apt install wireguard -y
cd /etc/wireguard
wg genkey | sudo tee privatekey | wg pubkey | sudo tee publickey
```

2. **Create Config**
```bash
sudo nano /etc/wireguard/wg0.conf
```

Add:
```ini
[Interface]
Address = 10.8.0.2/24
PrivateKey = <KITCHEN_PRIVATE_KEY>

[Peer]
# Digital Ocean Server
PublicKey = <SERVER_PUBLIC_KEY>
Endpoint = <DROPLET_PUBLIC_IP>:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
```

3. **Enable WireGuard**
```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

4. **Add Route to Printer Network**
```bash
# Make printer LAN accessible via VPN
sudo ip route add 192.168.100.0/24 dev wg0
```

#### Verify VPN Connection

From Digital Ocean:
```bash
# Ping kitchen gateway
ping 10.8.0.2

# Ping printer through VPN
ping 192.168.100.50

# Test printer port
nc -zv 192.168.100.50 9100
```

✅ If all pings succeed, VPN is working!

---

### Step 3: Deploy Application to Digital Ocean

1. **Clone Repository**
```bash
cd ~
git clone <your-repo-url> jollofexpress
cd jollofexpress
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment Variables**
```bash
nano .env.local
```

Add:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=JollofExpress

# Printer (Kitchen via VPN)
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100

# Print Processor Security
PRINT_PROCESSOR_SECRET=your_secure_random_secret_here
PRINT_PROCESS_INTERVAL=15000

# Security
JWT_SECRET=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret
```

4. **Build Application**
```bash
npm run build
```

5. **Set Up PM2 for Process Management**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start Next.js app
pm2 start npm --name "jollofexpress" -- start

# Start print worker
pm2 start npm --name "print-worker" -- run print-worker

# Save PM2 config
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Follow the command it outputs
```

6. **Configure Nginx Reverse Proxy**
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/jollofexpress
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/jollofexpress /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. **Set Up SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

### Step 4: Test Printing

#### Test 1: API Connectivity
```bash
# On Digital Ocean server
curl -H "Authorization: Bearer your_print_processor_secret" \
  https://yourdomain.com/api/print/process-queue
```

Expected response:
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

#### Test 2: Manual Print Job
1. Create a test order on your website
2. Complete payment
3. Check print worker logs:
```bash
pm2 logs print-worker
```

You should see:
```
✅ Processed 1 job(s): 1 succeeded, 0 failed (234ms)
```

#### Test 3: Kitchen Display
1. Open kitchen display: `https://yourdomain.com/kitchen`
2. Order should appear
3. Click printer icon to manually trigger reprint
4. Receipt should print within 15 seconds

---

## 🔧 Troubleshooting

### Printer Not Printing

**Check printer is online:**
```bash
# From Digital Ocean
ping 192.168.100.50
nc -zv 192.168.100.50 9100
```

**Check print queue:**
```sql
-- In Supabase SQL Editor
SELECT * FROM print_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check for failed jobs:**
```sql
SELECT * FROM print_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check print worker logs:**
```bash
pm2 logs print-worker --lines 100
```

### VPN Connection Issues

**Check WireGuard status:**
```bash
sudo wg show
```

Should show:
```
interface: wg0
  public key: ...
  private key: (hidden)
  listening port: 51820

peer: <PEER_PUBLIC_KEY>
  endpoint: <IP>:51820
  allowed ips: 10.8.0.2/32, 192.168.100.0/24
  latest handshake: 30 seconds ago
  transfer: 12.34 KiB received, 56.78 KiB sent
```

**If "latest handshake" is old or missing:**
- Check firewall allows UDP 51820
- Verify public keys are correct
- Check endpoint IP is reachable

**Restart WireGuard:**
```bash
sudo systemctl restart wg-quick@wg0
```

### Print Worker Not Running

**Check PM2 status:**
```bash
pm2 status
```

**Restart print worker:**
```bash
pm2 restart print-worker
```

**Check environment variables:**
```bash
pm2 env print-worker
```

---

## 📊 Monitoring & Logs

### View Print Worker Logs
```bash
# Live logs
pm2 logs print-worker

# Last 100 lines
pm2 logs print-worker --lines 100

# Error logs only
pm2 logs print-worker --err
```

### Check Print Queue Stats
```sql
-- Total jobs today
SELECT 
  status,
  COUNT(*) as count
FROM print_queue
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

### Monitor Printer Uptime
Set up a cron job to check printer health:
```bash
crontab -e
```

Add:
```cron
# Check printer every 5 minutes
*/5 * * * * curl -H "Authorization: Bearer your_secret" https://yourdomain.com/api/print/process-queue >> /var/log/printer-check.log 2>&1
```

---

## 🔒 Security Best Practices

1. **Use Strong Secrets**
   - Generate random `PRINT_PROCESSOR_SECRET`
   - Don't use the same secret as `WEBHOOK_SECRET`

2. **Firewall Rules**
   ```bash
   # Only allow WireGuard port
   sudo ufw allow 51820/udp
   sudo ufw enable
   ```

3. **WireGuard Key Rotation**
   - Rotate keys every 6 months
   - Keep private keys secure (chmod 600)

4. **Monitor Failed Print Attempts**
   - Set up alerts for excessive failures
   - Could indicate unauthorized access attempts

---

## 🚀 Performance Optimization

### Reduce Print Latency
- Decrease `PRINT_PROCESS_INTERVAL` to 10 seconds (10000ms)
- Use WireGuard `PersistentKeepalive = 15` for faster reconnection

### Handle Multiple Printers
Update `.env.local`:
```env
# Kitchen Printer
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100

# Bar Printer (optional)
BAR_PRINTER_IP=192.168.100.51
BAR_PRINTER_PORT=9100
```

Modify print processor to route based on order type.

### Scale for Multiple Locations
Each location needs:
- Own WireGuard peer configuration
- Own printer IP in allowed IPs
- Separate print worker instance with location-specific env vars

---

## 📝 Maintenance Checklist

### Daily
- [ ] Check print worker is running (`pm2 status`)
- [ ] Verify no failed print jobs in queue

### Weekly
- [ ] Review print worker logs for errors
- [ ] Check printer paper levels
- [ ] Test manual reprint function

### Monthly
- [ ] Verify VPN tunnel health (`wg show`)
- [ ] Update system packages (`apt update && apt upgrade`)
- [ ] Check disk space for logs

### Quarterly
- [ ] Rotate WireGuard keys
- [ ] Review and optimize print queue settings
- [ ] Test disaster recovery (restart all services)

---

## 🆘 Emergency Procedures

### If Printer Goes Offline
1. Print worker will retry 3 times
2. Jobs marked as `failed` after 3 attempts
3. Staff can manually reprint from kitchen display
4. Fix printer, then reprocess failed jobs:
   ```sql
   -- Reset failed jobs to pending
   UPDATE print_queue 
   SET status = 'pending', attempts = 0 
   WHERE status = 'failed' 
   AND created_at >= CURRENT_DATE;
   ```

### If VPN Goes Down
1. Receipts won't print but orders still process
2. Fix VPN connection
3. Reprocess pending jobs (print worker will auto-retry)

### If Digital Ocean Goes Down
1. Kitchen display won't update
2. Customers can't order online
3. Use backup POS system if available
4. Once restored, all pending orders will auto-print

---

## 📞 Support

**Print Issues:** Check logs first (`pm2 logs print-worker`)  
**VPN Issues:** Verify `wg show` on both ends  
**Database Issues:** Check Supabase dashboard  

**Emergency Contact:** [Your support contact]

---

## ✅ Quick Reference Commands

```bash
# Check print worker status
pm2 status

# View print logs
pm2 logs print-worker

# Restart print worker
pm2 restart print-worker

# Test printer connection
ping 192.168.100.50
nc -zv 192.168.100.50 9100

# Check VPN status
sudo wg show

# Restart VPN
sudo systemctl restart wg-quick@wg0

# Process print queue manually
curl -X POST -H "Authorization: Bearer your_secret" \
  https://yourdomain.com/api/print/process-queue

# View recent print jobs
# (Run in Supabase SQL Editor)
SELECT * FROM print_queue ORDER BY created_at DESC LIMIT 20;
```

---

**Setup Complete! 🎉**

Your kitchen printer should now automatically print receipts when orders are completed.

# Deployment Checklist - Digital Ocean with Network Printing

Complete checklist for deploying JollofExpress with automatic network printing to kitchen.

---

## ☑️ Pre-Deployment

### Hardware & Network
- [ ] **80mm Thermal POS Printer** purchased and set up
  - [ ] Printer connected to kitchen network
  - [ ] Printer has static IP: `192.168.100.50` (or note your IP)
  - [ ] RAW TCP printing enabled on port `9100`
  - [ ] Test print from kitchen network successful

- [ ] **Kitchen Router/Gateway** ready
  - [ ] Has public IP or dynamic DNS
  - [ ] Can install WireGuard (or separate device available)
  - [ ] Port forwarding available for UDP 51820

- [ ] **Digital Ocean Account**
  - [ ] Account created
  - [ ] Payment method added
  - [ ] SSH key uploaded

### Software
- [ ] **Domain Name** registered
  - [ ] DNS pointed to Digital Ocean nameservers
  - [ ] A record ready to create

- [ ] **Supabase Project** set up
  - [ ] Database created
  - [ ] Tables migrated (see `database/schema.sql`)
  - [ ] RLS policies enabled
  - [ ] API keys obtained

- [ ] **Paystack Account** configured
  - [ ] Business account verified
  - [ ] Live API keys obtained (not test keys)
  - [ ] Webhook URL ready to configure

---

## 🖥️ Digital Ocean Droplet Setup

### 1. Create Droplet
- [ ] Create new Droplet
  - [ ] OS: **Ubuntu 22.04 LTS**
  - [ ] Size: **Basic Plan - $6/month** (1GB RAM, 1 vCPU)
  - [ ] Region: **Closest to your location**
  - [ ] Add SSH key
  - [ ] Enable monitoring (optional)

- [ ] Note droplet IP address: `___.___.___.___`

### 2. Initial Server Setup
```bash
# SSH into server
ssh root@YOUR_DROPLET_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Create deploy user
adduser deploy
usermod -aG sudo deploy
```

- [ ] Commands executed
- [ ] Deploy user created

### 3. Install Dependencies
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install WireGuard
sudo apt install -y wireguard

# Install Git
sudo apt install -y git

# Verify installations
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
pm2 --version     # Should show 5.x.x
nginx -v          # Should show nginx version
wg --version      # Should show wireguard version
```

- [ ] All dependencies installed
- [ ] Versions verified

---

## 🔒 WireGuard VPN Setup

### 4. Configure WireGuard on Digital Ocean

```bash
# Generate server keys
cd /etc/wireguard
sudo wg genkey | sudo tee privatekey | wg pubkey | sudo tee publickey

# View keys
sudo cat privatekey  # Copy this
sudo cat publickey   # Copy this
```

- [ ] Server private key: `_________________________________`
- [ ] Server public key: `_________________________________`

```bash
# Create config
sudo nano /etc/wireguard/wg0.conf
```

**Paste** (replace placeholders):
```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = YOUR_SERVER_PRIVATE_KEY

PostUp = sysctl -w net.ipv4.ip_forward=1
PostDown = sysctl -w net.ipv4.ip_forward=0

[Peer]
PublicKey = KITCHEN_PUBLIC_KEY_GOES_HERE
AllowedIPs = 10.8.0.2/32, 192.168.100.0/24
PersistentKeepalive = 25
```

```bash
# Start WireGuard
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

# Check status
sudo wg show
```

- [ ] WireGuard config created
- [ ] WireGuard service started
- [ ] `wg show` displays interface

### 5. Configure WireGuard on Kitchen Gateway

```bash
# On kitchen router/gateway (or Raspberry Pi)
sudo apt update
sudo apt install wireguard -y

cd /etc/wireguard
sudo wg genkey | sudo tee privatekey | wg pubkey | sudo tee publickey

# View keys
sudo cat privatekey  # Copy this
sudo cat publickey   # Copy this - ADD TO DROPLET CONFIG ABOVE
```

- [ ] Kitchen private key: `_________________________________`
- [ ] Kitchen public key: `_________________________________`
- [ ] **Go back and update Digital Ocean config with kitchen public key**

```bash
# Create kitchen config
sudo nano /etc/wireguard/wg0.conf
```

**Paste** (replace placeholders):
```ini
[Interface]
Address = 10.8.0.2/24
PrivateKey = KITCHEN_PRIVATE_KEY

[Peer]
PublicKey = SERVER_PUBLIC_KEY_FROM_DROPLET
Endpoint = YOUR_DROPLET_IP:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
```

```bash
# Start WireGuard
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
sudo systemctl status wg-quick@wg0

# Add route to printer network
sudo ip route add 192.168.100.0/24 dev wg0
```

- [ ] Kitchen WireGuard started
- [ ] Route to printer network added

### 6. Verify VPN Connection

**From Digital Ocean:**
```bash
ping 10.8.0.2                  # Ping kitchen gateway
ping 192.168.100.50            # Ping printer through VPN
nc -zv 192.168.100.50 9100     # Test printer port
```

- [ ] Can ping kitchen gateway (10.8.0.2)
- [ ] Can ping printer (192.168.100.50)
- [ ] Printer port 9100 is accessible

---

## 📦 Application Deployment

### 7. Clone and Configure Application

```bash
# Switch to deploy user
su - deploy

# Clone repository
cd ~
git clone YOUR_REPO_URL jollofexpress
cd jollofexpress

# Install dependencies
npm install

# Create .env.local
nano .env.local
```

**Paste** (fill in your values):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
PAYSTACK_SECRET_KEY=sk_live_your_key_here

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=JollofExpress

# Printer (accessible via VPN)
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100

# Print Processor
PRINT_PROCESSOR_SECRET=YOUR_SECURE_RANDOM_SECRET_HERE
PRINT_PROCESS_INTERVAL=15000

# Security
JWT_SECRET=YOUR_JWT_SECRET_HERE
WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE
```

- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment variables configured

### 8. Test Printer Connection

```bash
# Run printer test script
node scripts/test-printer.js
```

- [ ] Test shows "✅ SUCCESS: Connected to printer"
- [ ] Test receipt printed successfully
- [ ] All tests passed

### 9. Build and Start Application

```bash
# Build application
npm run build

# Start with PM2
pm2 start npm --name "jollofexpress" -- start
pm2 start npm --name "print-worker" -- run print-worker

# Check status
pm2 status

# View logs
pm2 logs jollofexpress --lines 20
pm2 logs print-worker --lines 20

# Save PM2 config
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

- [ ] Build successful
- [ ] Both processes running in PM2
- [ ] No errors in logs
- [ ] PM2 startup configured

---

## 🌐 Nginx & SSL Setup

### 10. Configure Nginx

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/jollofexpress
```

**Paste** (replace yourdomain.com):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/jollofexpress /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

- [ ] Nginx config created
- [ ] Config test passed
- [ ] Nginx restarted

### 11. Install SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

- [ ] SSL certificate installed
- [ ] HTTPS working at https://yourdomain.com
- [ ] HTTP redirects to HTTPS

---

## 🧪 Testing

### 12. Test Complete Order Flow

1. **Place Test Order**
   - [ ] Go to https://yourdomain.com
   - [ ] Add items to cart
   - [ ] Go to checkout
   - [ ] Fill in delivery details
   - [ ] Complete payment with Paystack

2. **Verify Order Processing**
   - [ ] Payment successful
   - [ ] Redirected to success page
   - [ ] Order appears in Supabase `orders` table

3. **Check Print Queue**
   ```bash
   # SSH into server
   pm2 logs print-worker --lines 50
   ```
   
   - [ ] Print job added to queue
   - [ ] Print worker processed job
   - [ ] Status shows "✅ Processed 1 job(s): 1 succeeded"

4. **Verify Receipt Printed**
   - [ ] Receipt printed at kitchen printer
   - [ ] All order details visible
   - [ ] Receipt is properly formatted

### 13. Test Kitchen Display

- [ ] Open https://yourdomain.com/kitchen
- [ ] Order appears in "New Orders" column
- [ ] Can drag order to "Preparing"
- [ ] Can mark as ready
- [ ] Manual reprint button works

### 14. Test Admin Dashboard

- [ ] Login to https://yourdomain.com/admin
- [ ] Can view orders
- [ ] Can view menu items
- [ ] Can update settings

---

## 🔔 Configure Webhooks

### 15. Paystack Webhook

1. Go to https://dashboard.paystack.com/settings/developer
2. Add webhook URL: `https://yourdomain.com/api/webhook/paystack`
3. Copy webhook secret to `.env.local` as `WEBHOOK_SECRET`
4. Test webhook delivery

- [ ] Webhook URL configured
- [ ] Webhook secret updated
- [ ] Test webhook successful

---

## 📊 Monitoring Setup

### 16. Set Up Basic Monitoring

```bash
# Create log directory
mkdir -p ~/logs

# Set up log rotation
sudo nano /etc/logrotate.d/jollofexpress
```

**Paste:**
```
/home/deploy/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
}
```

```bash
# Create health check script
nano ~/health-check.sh
```

**Paste:**
```bash
#!/bin/bash
curl -H "Authorization: Bearer $PRINT_PROCESSOR_SECRET" \
  https://yourdomain.com/api/print/process-queue >> ~/logs/health.log 2>&1
```

```bash
# Make executable
chmod +x ~/health-check.sh

# Add to crontab
crontab -e
```

**Add:**
```cron
# Health check every 5 minutes
*/5 * * * * /home/deploy/health-check.sh
```

- [ ] Log rotation configured
- [ ] Health check script created
- [ ] Cron job added

---

## ✅ Final Verification

### 17. Complete End-to-End Test

- [ ] Place real order with real payment
- [ ] Payment processes successfully
- [ ] Receipt prints within 30 seconds
- [ ] Order appears in kitchen display
- [ ] Can manage order through kitchen workflow
- [ ] Admin dashboard shows correct data

### 18. Performance Check

```bash
# Check server resources
htop  # (install if needed: sudo apt install htop)

# Check PM2 processes
pm2 status

# Check disk space
df -h

# Check memory usage
free -h
```

- [ ] CPU usage < 50%
- [ ] Memory usage < 80%
- [ ] Disk space > 20% free

---

## 📝 Documentation

### 19. Document Configuration

Create a document with:
- [ ] Droplet IP address
- [ ] Domain name
- [ ] WireGuard public keys
- [ ] Printer IP address
- [ ] All environment variable values (store securely!)
- [ ] Paystack keys
- [ ] Supabase keys
- [ ] Admin login credentials

### 20. Team Training

- [ ] Train kitchen staff on kitchen display
- [ ] Show how to manually reprint if needed
- [ ] Explain what to do if printer goes offline
- [ ] Provide troubleshooting contact

---

## 🎉 Launch Checklist

- [ ] All tests passed
- [ ] SSL certificate valid
- [ ] Monitoring active
- [ ] Backups configured (Supabase auto-backups)
- [ ] Team trained
- [ ] Emergency procedures documented
- [ ] Support contact available

---

## 🚀 Go Live!

**Congratulations! Your system is ready for production.**

### Post-Launch Monitoring (First 24 Hours)

- [ ] Monitor print worker logs every 2 hours
- [ ] Check for failed print jobs
- [ ] Verify all orders are printing
- [ ] Ensure printer paper is stocked
- [ ] Monitor server resources

### First Week

- [ ] Daily check of print queue status
- [ ] Review any error logs
- [ ] Gather feedback from kitchen staff
- [ ] Optimize timing if needed

---

## 📞 Support Contacts

**Technical Issues:**
- PM2 logs: `pm2 logs print-worker`
- Server logs: `sudo journalctl -u wg-quick@wg0`
- Supabase dashboard: https://app.supabase.com

**Printer Issues:**
- Check connectivity: `ping 192.168.100.50`
- Check VPN: `sudo wg show`
- Manual test: `node scripts/test-printer.js`

**Emergency:**
- Restart print worker: `pm2 restart print-worker`
- Restart app: `pm2 restart jollofexpress`
- Reboot server: `sudo reboot`

---

**Deployment Complete! 🎊**

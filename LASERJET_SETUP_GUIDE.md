# HP LaserJet Pro 400 M401dn - Browser Print Setup Guide

## Overview

This guide helps you configure your HP LaserJet Pro 400 M401dn for automatic printing from the Kitchen Display System using browser-based printing.

---

## Prerequisites

✅ HP LaserJet Pro 400 M401dn connected to your local network  
✅ Kitchen display computer connected to the same network  
✅ Browser: Chrome, Edge, or Firefox (Chrome recommended)  
✅ Kitchen display page open in browser: `http://localhost:3000/kitchen`

---

## Step 1: Find Your Printer's IP Address

### From the Printer Control Panel:

1. Press the **OK button** on the printer
2. Navigate to **"Network"** or **"Network Config"**
3. Select **"TCP/IP Config"**
4. Look for **"IPv4 Address"** - something like `192.168.1.100`
5. Write down this IP address

### From Windows:

1. Open **Settings** → **Devices** → **Printers & scanners**
2. Click on your **HP LaserJet Pro 400 M401dn**
3. Click **"Manage"**
4. Click **"Printer properties"**
5. Go to **"Ports"** tab
6. Look for the checked port (usually `IP_192.168.x.x`)

---

## Step 2: Add Printer to Windows

If not already added:

1. **Settings** → **Devices** → **Printers & scanners**
2. Click **"Add a printer or scanner"**
3. Wait for Windows to find it, or click **"The printer that I want isn't listed"**
4. Select **"Add a printer using a TCP/IP address or hostname"**
5. Enter the IP address (e.g., `192.168.1.100`)
6. Follow the wizard to install drivers
7. Windows should auto-detect it as **HP LaserJet Pro 400 M401dn**

---

## Step 3: Set as Default Printer

### Windows:

1. **Settings** → **Devices** → **Printers & scanners**
2. Click on **HP LaserJet Pro 400 M401dn**
3. Click **"Set as default"**
4. Turn **OFF** "Let Windows manage my default printer" (important!)

### macOS:

1. **System Preferences** → **Printers & Scanners**
2. Select **HP LaserJet Pro 400 M401dn**
3. Click **"Default printer"** dropdown
4. Select your LaserJet

---

## Step 4: Configure Browser Print Settings

### Chrome (Recommended):

1. Open **Chrome Settings** (three dots → Settings)
2. Search for **"Print"**
3. Click **"Site settings"** under Privacy and security
4. Click **"Additional permissions"**
5. Find and click **"Automatic downloads"** or **"Pop-ups"**
6. Add your site: `http://localhost:3000` → Allow
7. Go back to Settings → **"System"**
8. Enable **"Use system print dialog"** (optional for better control)

### Configure Default Print Settings:

1. Open any page and press **Ctrl+P** (Cmd+P on Mac)
2. Destination: Select **HP LaserJet Pro 400 M401dn**
3. Click **"More settings"**
4. Configure:
   - **Layout**: Portrait
   - **Color**: Black and white (save toner)
   - **Paper size**: A4 or Letter (8.5" x 11")
   - **Margins**: Default
   - **Scale**: 100%
   - **Pages per sheet**: 1
5. Click **"Save as PDF"** dropdown → Select your printer
6. Click **"Print"** to test

---

## Step 5: Enable Silent Printing (Optional)

⚠️ **Note**: True "silent printing" (no dialog) isn't possible with standard browser security. However, you can streamline it:

### Chrome Kiosk Mode (Best for Kitchen Display):

Run Chrome in kiosk mode with auto-print flags:

```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --app=http://localhost:3000/kitchen
```

Or create a desktop shortcut:
1. Right-click Desktop → New → Shortcut
2. Paste the command above
3. Name it: "Kitchen Display - Auto Print"
4. Double-click to launch

**Kiosk flags:**
- `--kiosk`: Fullscreen mode, no browser UI
- `--kiosk-printing`: Auto-prints to default printer without dialog
- `--app=URL`: Opens specific URL

### Firefox Alternative:

Firefox has better silent print support via `about:config`:

1. Type `about:config` in address bar
2. Accept the risk warning
3. Search: `print.always_print_silent`
4. Set to `true`
5. Search: `print.printer_<printer_name>.print_to_file`
6. Set to `false`

---

## Step 6: Test Print Functionality

### Test 1: Manual Print Button

1. Open **Kitchen Display**: `http://localhost:3000/kitchen`
2. Wait for an order to appear (or create a test order)
3. Click the **Printer icon** button on an order card
4. **Expected**: Print dialog appears (or auto-prints in kiosk mode)
5. **Expected**: Receipt prints on LaserJet
6. **Expected**: Toast notification: "Reprint queued"

### Test 2: Automatic Print After Payment

1. Create a new order as a customer
2. Complete Paystack payment
3. **Expected**: Kitchen display receives order
4. **Expected**: Print dialog appears automatically (or auto-prints)
5. **Expected**: Receipt prints within 2-5 seconds
6. **Expected**: Blue notification badge: "Print Queue: 1 job(s)"

### Troubleshooting:

**Print dialog doesn't appear:**
- Check browser console (F12) for errors
- Verify printer is online: `ping 192.168.1.100`
- Check browser pop-up blocker is disabled for localhost
- Ensure AutoPrintHandler is loaded (check debug indicator bottom-left)

**Print job stuck:**
- Open `print_queue` table in Supabase
- Look for status = 'failed'
- Check `error_message` column
- Common errors:
  - "Failed to open print window" → Pop-up blocker
  - Printer offline → Check network/power
  - No default printer set

**Receipt doesn't print:**
- Verify printer is default printer
- Check printer queue: Windows → Devices → Printers
- Clear print queue if stuck
- Restart printer

---

## Step 7: Production Deployment Notes

### For 24/7 Kitchen Display:

1. **Use dedicated PC/tablet** for kitchen display
2. **Auto-start Chrome in kiosk mode** on boot:
   - Windows: Add shortcut to Startup folder
   - Location: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp`
3. **Disable sleep/hibernate**:
   - Settings → Power → Sleep → Never
   - Settings → Power → Additional power settings → Change plan settings
4. **Keep browser updated** (Chrome auto-updates)
5. **Monitor printer connectivity** (ping alerts)

### Printer Maintenance:

- **Toner**: Check levels regularly (LaserJet can print ~6,500 pages per cartridge)
- **Paper**: Use standard copy paper (20lb/75gsm)
- **Network**: Assign static IP via DHCP reservation on router
- **Cleaning**: Clean pickup rollers every 1,000 pages

---

## Print Queue Status Monitoring

### Debug Indicator (Development Only):

Bottom-left corner shows:
```
🖨️ Print Handler Active
Queue: 2
Processing: Yes
Current: ORD-20251021-1234
```

### Production Monitoring:

1. **Supabase Dashboard**:
   - Table Editor → `print_queue`
   - Filter: `status = 'pending'` (should be empty)
   - Filter: `status = 'failed'` (investigate errors)

2. **Check print attempts**:
   ```sql
   SELECT * FROM print_queue 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **View orders table**:
   ```sql
   SELECT order_number, print_status, print_attempts 
   FROM orders 
   WHERE print_status = 'failed';
   ```

---

## Receipt Format (A4 Paper)

The receipt is optimized for 80mm thermal printers but will print on A4:

**Printed size on A4:**
- Width: ~80mm (8cm)
- Height: Variable based on order size
- Located: Top-left of page
- Rest of page: Blank (can cut paper if needed)

**Receipt sections:**
- Header: Restaurant name
- Order info: Order #, date, time
- Customer details: Name, phone, type
- Delivery address (if delivery)
- Items: Quantity, name, variations, price
- Special instructions (highlighted)
- Totals: Subtotal, delivery fee, total
- Payment status
- Kitchen instructions

---

## Keyboard Shortcuts (Kitchen Display)

While on kitchen display page:

- **Ctrl+P** (Cmd+P): Manual print dialog
- **F11**: Toggle fullscreen
- **F5**: Refresh page
- **Ctrl+Shift+I**: Open DevTools (debugging)

---

## Network Configuration

### Recommended Network Setup:

```
Router (192.168.1.1)
├── LaserJet Pro 400 (192.168.1.100) - Static IP
├── Kitchen Display PC (192.168.1.101) - Static IP
└── POS Terminal (192.168.1.102)
```

### Set Static IP for Printer:

#### Option 1: Via Router DHCP Reservation (Recommended)
1. Login to router admin (usually `192.168.1.1`)
2. Find DHCP settings
3. Add reservation:
   - MAC Address: (found on printer label)
   - Reserved IP: `192.168.1.100`
4. Restart printer

#### Option 2: Via Printer Control Panel
1. Printer control panel → Network → TCP/IP Config
2. Manual IP Configuration
3. Set IP: `192.168.1.100`
4. Subnet: `255.255.255.0`
5. Gateway: `192.168.1.1` (your router IP)

---

## FAQ

**Q: Can I use WiFi instead of Ethernet?**  
A: LaserJet Pro 400 M401dn is Ethernet-only. Consider USB or get a WiFi print server adapter.

**Q: Can multiple displays print to same printer?**  
A: Yes! Each kitchen display with AutoPrintHandler can print to the same default printer.

**Q: Will this work with other printers?**  
A: Yes! Any printer accessible via browser will work. Just set it as default.

**Q: Can I print to multiple printers (kitchen + bar)?**  
A: Not yet with browser print. Requires print server implementation (Path B).

**Q: What if internet goes down?**  
A: Browser print works locally. If Supabase is unreachable, print queue won't update, but local printing works.

**Q: How do I switch to thermal printer later?**  
A: Follow Path B in `PRINT_IMPLEMENTATION_PLAN.md` - build print server for ESC/POS.

---

## Support Checklist

If printing isn't working, check:

- [ ] Printer is powered on
- [ ] Printer has paper
- [ ] Printer is connected to network (ping test)
- [ ] Printer is set as default in Windows
- [ ] Browser allows pop-ups for localhost
- [ ] Kitchen display page is open (`/kitchen`)
- [ ] AutoPrintHandler is loaded (check debug indicator)
- [ ] print_queue table has pending jobs
- [ ] Browser console shows no errors (F12)

---

## Next Steps

Once browser printing works:
1. ✅ Test end-to-end: Payment → Auto print
2. ✅ Test manual reprint button
3. ✅ Monitor for failed prints
4. ✅ Document any issues for kitchen staff
5. 🔜 When ready for thermal printer, implement print server (Path B)

---

## Technical Details

**Print Flow:**
```
Payment Success
    ↓
Add to print_queue (Supabase)
    ↓
AutoPrintHandler detects (Realtime subscription)
    ↓
Format receipt HTML
    ↓
Open print window
    ↓
window.print() → Browser → OS → Printer
    ↓
Update print_queue status = 'printed'
```

**Browser Print API Limitations:**
- No true silent print (security restriction)
- Requires print dialog or kiosk mode
- Cannot select printer programmatically
- Uses OS default printer
- No advanced printer features (cut, beep)

**Advantages:**
- ✅ Easy setup (no additional software)
- ✅ Works with any printer
- ✅ Good for testing
- ✅ Cross-platform (Windows, Mac, Linux)

**Disadvantages:**
- ❌ Not truly automatic (unless kiosk mode)
- ❌ A4 paper waste (receipt is small on big page)
- ❌ Slower than thermal printers
- ❌ No ESC/POS commands (no beep, no auto-cut)

**Migration Path:**
When you get 80mm thermal printers, switch to print server implementation for better performance and true automatic printing.

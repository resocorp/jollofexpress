# Kitchen Printing System - Implementation Plan

## Current Implementation Analysis

### What's Already Built

1. **Database Infrastructure**
   - `print_queue` table exists with columns:
     - `id`, `order_id`, `print_data` (JSONB), `status`, `attempts`, `error_message`, `created_at`, `processed_at`
   - `orders` table has print tracking columns:
     - `print_status`, `print_attempts`
   - Print statuses: `pending`, `printed`, `failed`

2. **API Endpoints**
   - `POST /api/kitchen/orders/[id]/print` - Manual reprint trigger
   - Adds orders to `print_queue` table with status `pending`

3. **Frontend Integration**
   - Kitchen Display System (KDS) has print button on order cards
   - Uses `useReprintOrder()` hook to trigger manual prints
   - Shows "Failed to queue print job" error notification in kitchen view

4. **Automatic Print Triggers**
   - `POST /api/orders/verify-payment` - After successful Paystack payment verification
   - `POST /api/webhook/paystack` - On Paystack webhook `charge.success` event
   - Both add orders to `print_queue` automatically

5. **Environment Variables**
   ```env
   PRINT_SERVER_URL=http://192.168.1.100:8080
   PRINT_VPN_ENABLED=true
   ```

### What's Missing

❌ **No print processor/worker** - Nothing is consuming from `print_queue` table
❌ **No print server** - No service at the configured URL
❌ **No receipt formatting** - `print_data` JSONB is empty (schema says it should contain formatted receipt data)
❌ **No printer communication** - No code to send data to actual printers

---

## Printing Requirements

### Target Printers

1. **80mm Thermal POS Printers** (Production Use)
   - Typical receipt printers used in restaurants
   - Examples: XPRINTER, Star TSP, Epson TM-T82
   - Uses ESC/POS commands
   - Direct connection via USB, Network, or Bluetooth
   - Prints on 80mm thermal paper (no ink required)
   - Fast, purpose-built for receipts

2. **LaserJet Pro 400 M401dn** (Testing/Development)
   - Standard network printer
   - Uses standard print protocols (IPP, LPD, RAW)
   - Can print A4/Letter size documents
   - Slower than thermal printers
   - Good for development testing

---

## Implementation Options

### Option 1: Print Server Middleware (RECOMMENDED)

**Architecture:**
```
Next.js App → Print Server (Node.js) → Printers
              (Polls print_queue)    (via USB/Network)
```

**How It Works:**
1. Create separate Node.js service that runs on restaurant's local network
2. Service polls Supabase `print_queue` table every few seconds
3. When it finds `pending` jobs, it formats and sends to printer
4. Updates status to `printed` or `failed`

**Pros:**
✅ Separates concerns - web app doesn't handle printer drivers
✅ Can run on dedicated hardware (Raspberry Pi, old PC)
✅ Works with VPN/tunneling for remote restaurant management
✅ Can handle both printer types with adapter pattern
✅ Easy error handling and retry logic
✅ Can work offline from main server (local queue processing)

**Cons:**
❌ Requires separate service deployment
❌ Restaurant needs to maintain print server
❌ Network connectivity required between print server and Supabase

**Tech Stack:**
- Node.js/Bun for print server
- `node-thermal-printer` for 80mm ESC/POS printers
- `ipp` or `pdfkit` + `node-ipp` for standard printers
- `pg` or `@supabase/supabase-js` to poll print_queue

---

### Option 2: Browser-Based Printing (Silent Print)

**Architecture:**
```
Next.js App → Kitchen Browser → Window.print() → Printer
```

**How It Works:**
1. Kitchen display system monitors `print_queue` via Supabase realtime
2. When new job appears, generates HTML receipt
3. Opens hidden iframe/window and calls `window.print()`
4. Browser's print dialog sends to configured printer

**Pros:**
✅ No separate print server needed
✅ Uses browser's built-in print capabilities
✅ Works with any printer the browser can access
✅ Easy to implement

**Cons:**
❌ Requires browser to be open 24/7 on kitchen display
❌ Cannot guarantee silent printing (may show dialogs)
❌ Browser print API limitations
❌ Not reliable for thermal POS printers (formatting issues)
❌ No good way to handle errors automatically
❌ Different behavior across browsers

**Tech Stack:**
- React component with print styles
- Supabase realtime subscriptions
- CSS `@media print` queries

---

### Option 3: Cloud Print API (e.g., PrintNode)

**Architecture:**
```
Next.js App → PrintNode API → PrintNode Client → Printers
                              (Installed on PC)
```

**How It Works:**
1. Restaurant installs PrintNode client software
2. Your app sends print jobs to PrintNode cloud API
3. PrintNode routes to correct printer
4. Handles formatting and error handling

**Pros:**
✅ Professionally managed service
✅ Supports both thermal and standard printers
✅ Great error handling and monitoring
✅ Works from anywhere (cloud-based)
✅ Easy integration with Next.js API routes

**Cons:**
❌ **Costs money** - starts at $5/printer/month
❌ Requires internet connectivity to print
❌ Restaurant must install client software
❌ Data passes through third-party service

**Tech Stack:**
- PrintNode API
- PrintNode client software
- Optional: PrintNode webhooks for status updates

---

### Option 4: Hybrid Approach

**Architecture:**
```
Next.js App → Print Server (Fallback: Browser Print)
              (Primary for thermal printers)
```

**How It Works:**
1. Try Print Server first for thermal printers
2. Fallback to browser print for testing/backup
3. Use `print_queue` table as communication layer

**Pros:**
✅ Best of both worlds
✅ Redundancy if print server fails
✅ Easier development (can test without print server)

**Cons:**
❌ More complex to maintain
❌ Two different codepaths to debug

---

## Recommended Solution

### For Your Situation: **Option 1 (Print Server) + Browser Fallback for Testing**

**Why:**
1. You need to support 80mm thermal POS printers in production - these require ESC/POS commands that browsers can't handle well
2. You have a LaserJet for testing - browser print can work for this
3. Restaurant needs reliable, automatic printing
4. You want a professional solution that scales

**Implementation Plan:**

### Phase 1: Receipt Formatting Service
1. Create utility to format order data into receipt structure
2. Store formatted data in `print_queue.print_data` JSONB
3. Design receipt layout (see receipt format below)

### Phase 2: Browser Print for Testing (Quick Win)
1. Add Supabase realtime subscription to kitchen display
2. Listen for new `print_queue` entries
3. Generate HTML receipt and trigger `window.print()`
4. Use your LaserJet for testing
5. Update `print_queue` status after print attempt

### Phase 3: Print Server for Production
1. Create standalone Node.js/Bun service
2. Poll `print_queue` table (or use Supabase realtime webhooks)
3. Install `node-thermal-printer` library
4. Configure printer connection (USB/Network)
5. Format receipt using ESC/POS commands
6. Send to thermal printer
7. Update `print_queue` status
8. Deploy on Raspberry Pi or local PC at restaurant

### Phase 4: Error Handling & Monitoring
1. Retry logic for failed prints (max 3 attempts)
2. Admin dashboard to show print queue status
3. Alerts for failed prints (SMS/email to manager)
4. Printer health monitoring

---

## Receipt Format Design

### Essential Information to Print

```
================================
   JOLLOF EXPRESS
================================
Order: ORD-20251021-3301
Date: Oct 21, 2025 07:30 PM
--------------------------------

CUSTOMER DETAILS
Name: Chijioke Okonkwo
Phone: 0806 123 4567
Type: DELIVERY

DELIVERY ADDRESS
3x Jollof rice
Lagos, Nigeria
No 1 Adekunle St, Ikoyi

--------------------------------
ITEMS
--------------------------------
1x Jollof rice
   • Large
   • Extra chicken
                       ₦2,888

1x Chicken suya
   • Spicy
                       ₦1,500

⚠️ SPECIAL INSTRUCTIONS:
   • Jollof rice: Extra spicy

--------------------------------
SUBTOTAL:            ₦4,388.00
Delivery Fee:          ₦500.00
================================
TOTAL:               ₦4,888.00
================================
Payment: PAID (Paystack)

--------------------------------
Kitchen - Start Prep Now!
Estimated Time: 20-30 min
================================
```

### Key Features
- Large, bold order number
- Customer contact info prominently displayed
- Delivery address (if applicable)
- Clear item listing with variations/addons
- Highlighted special instructions
- Prominent total
- Call to action for kitchen staff

---

## Configuration for Both Printer Types

### For 80mm Thermal Printer (Production)
```javascript
// Print Server Configuration
{
  type: 'epson',  // or 'star'
  interface: 'tcp://192.168.1.100',  // Network printer
  width: 48,  // 48 characters per line for 80mm
  characterSet: 'PC437_USA',
  removeSpecialCharacters: false,
  lineCharacter: '=',
}
```

### For LaserJet M401dn (Testing)
```javascript
// Browser print or IPP configuration
{
  printer: 'HP-LaserJet-Pro-400-M401dn',
  host: '192.168.1.100',
  port: 631,  // IPP port
  format: 'application/pdf',  // Generate PDF
  paperSize: 'A4',
}
```

---

## Code Architecture

### 1. Receipt Formatter Service (`lib/print/format-receipt.ts`)
```typescript
interface ReceiptData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'carryout';
  items: ReceiptItem[];
  total: number;
  deliveryFee: number;
  deliveryAddress?: string;
  specialInstructions?: string[];
}

function formatReceipt(order: OrderWithItems): ReceiptData
```

### 2. Print Queue Manager (`lib/print/queue-manager.ts`)
```typescript
async function addToPrintQueue(orderId: string, type: 'new_order' | 'reprint')
async function processPrintQueue()
async function markAsPrinted(queueId: string)
async function markAsFailed(queueId: string, error: string)
```

### 3. Print Server (`print-server/index.ts`)
```typescript
// Standalone Node.js service
- Poll print_queue table
- Format for thermal printer (ESC/POS)
- Send to printer via USB/Network
- Update status
```

### 4. Browser Print Component (`components/kitchen/auto-print.tsx`)
```typescript
// React component for kitchen display
- Subscribe to print_queue realtime
- Generate HTML receipt
- Trigger window.print()
- Update status
```

---

## Testing Strategy

### Phase 1: Test with LaserJet
1. Implement browser-based printing
2. Test automatic prints after payment
3. Test manual reprint button
4. Verify receipt formatting

### Phase 2: Test with Thermal Printer
1. Get a USB thermal printer (or use network-connected one)
2. Deploy print server to local machine
3. Test ESC/POS command formatting
4. Test automatic queue processing
5. Test error handling (printer offline, paper out)

### Phase 3: Production Deployment
1. Deploy print server to Raspberry Pi at restaurant
2. Configure network connectivity
3. Set up monitoring and alerts
4. Train kitchen staff on troubleshooting

---

## Cost & Hardware Considerations

### Print Server Hardware Options

1. **Raspberry Pi 4 (Recommended)**
   - Cost: ~$50-75
   - Low power consumption
   - Can run 24/7
   - Easy to mount near printer
   - Runs Node.js perfectly

2. **Old Desktop PC**
   - Cost: Free (reuse existing)
   - More powerful
   - Higher power consumption
   - Takes up more space

3. **Mini PC (Intel NUC)**
   - Cost: ~$150-300
   - Compact
   - Powerful
   - Low power

### Printer Connection Options

1. **USB** (Simplest for single printer)
   - Direct connection to print server
   - Most reliable
   - Limited to printer's USB cable length

2. **Network/Ethernet** (Best for multiple locations)
   - Printer connects to router
   - Print server can be anywhere on network
   - Easier to manage multiple printers

3. **Bluetooth** (For mobile/portable)
   - Wireless
   - Can be unreliable
   - Limited range

---

## Questions to Decide

1. **Do you want to test browser printing first** (quick, works with your LaserJet)?
   - This gets you printing immediately for testing
   - Can migrate to print server later

2. **Will restaurants have thermal printers immediately** or can they start with regular printers?
   - Affects implementation priority

3. **What's the restaurant's network setup?**
   - Stable internet connection?
   - Local network for printer?
   - VPN requirements?

4. **Budget for print server hardware?**
   - Raspberry Pi = $50-75 per location
   - Or reuse existing PC?

5. **Who manages the print server?**
   - Restaurant staff?
   - Your team remotely?
   - Managed service?

---

## My Recommendation for Your Project

### Start Here (Next 2 Days):

1. **Implement Receipt Formatter**
   - Create `lib/print/format-receipt.ts`
   - Store formatted data in `print_queue.print_data`
   - Unit test with your existing orders

2. **Build Browser Print for Testing**
   - Add realtime subscription to kitchen display
   - Create print-ready HTML/CSS receipt
   - Test with your LaserJet M401dn
   - Verify automatic printing after payment
   - Test manual reprint button

3. **Document printer setup**
   - How to configure LaserJet as default printer
   - Browser print settings (silent print)

### Phase 2 (When Ready for Production):

4. **Build Print Server**
   - Standalone Node.js service
   - `node-thermal-printer` integration
   - Deploy to Raspberry Pi
   - Test with actual 80mm thermal printer

5. **Production Deployment**
   - Install at restaurant
   - Configure network printer
   - Set up monitoring
   - Train staff

---

## Summary

**Current State:** Print queue infrastructure exists, but no processor to consume it.

**Best Approach:** 
- **Short-term:** Browser-based printing for testing with your LaserJet
- **Long-term:** Print server middleware for production thermal printers

**Why:** Thermal POS printers need ESC/POS commands that browsers can't generate reliably. A dedicated print server is the professional solution used by all major restaurant POS systems.

**Next Steps:** Start with browser print for rapid testing, then build print server when you have thermal printer access.

# WhatsApp Ordering System Setup Guide

This guide explains how to set up and configure the WhatsApp ordering system for JollofExpress using Ultra MSG and Paystack.

## Overview

The WhatsApp ordering system allows customers to:
- Browse the menu via WhatsApp
- Add items to cart with variations and addons
- Share location for delivery
- Pay securely via Paystack payment link
- Receive order confirmations and updates

## Architecture

```
Customer (WhatsApp) → Ultra MSG → Webhook API → Conversation Handler → Paystack → Order Created
```

## Prerequisites

1. **Ultra MSG Account**: Sign up at [ultramsg.com](https://ultramsg.com)
2. **Paystack Account**: Already configured in your app
3. **Public URL**: Your app must be accessible via HTTPS for webhooks

## Environment Variables

Add these to your `.env.local`:

```env
# Ultra MSG Configuration (required)
ULTRAMSG_INSTANCE_ID=your_instance_id
ULTRAMSG_TOKEN=your_token

# Optional: Webhook verification token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_secret_string

# Existing (should already be set)
PAYSTACK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Migration

Run the migration to create WhatsApp tables:

```sql
-- Run this in your Supabase SQL editor
-- Or use: npx ts-node scripts/run-migration.ts

-- See: database/migrations/add_whatsapp_ordering.sql
```

This creates:
- `whatsapp_sessions` - Stores conversation state and cart
- `whatsapp_message_log` - Logs all messages for debugging
- Adds `order_source` and `whatsapp_session_id` columns to `orders` table

## Ultra MSG Configuration

### 1. Create an Instance

1. Log in to [Ultra MSG Dashboard](https://user.ultramsg.com)
2. Create a new instance
3. Scan the QR code with your business WhatsApp
4. Note your **Instance ID** and **Token**

### 2. Configure Webhook

In your Ultra MSG instance settings:

1. Set **Webhook URL** to:
   ```
   https://your-domain.com/api/whatsapp/webhook
   ```

2. Enable these webhook events:
   - ✅ Webhook on Received (message_received)
   - ❌ Webhook on Create (optional)
   - ❌ Webhook on Ack (optional)

3. Save settings

### 3. Test Connection

Send a message to your WhatsApp business number. You should see:
- Webhook logs in your server console
- A welcome message response

## User Flow

### Happy Path

```
1. Customer: "Hi"
   Bot: Welcome message + menu categories

2. Customer: "1" (selects category)
   Bot: Shows items with prices

3. Customer: "2" (selects item)
   Bot: Shows variations (if any)

4. Customer: "1" (selects variation)
   Bot: Shows addons (if any)

5. Customer: "DONE" (skip addons)
   Bot: Asks for quantity

6. Customer: "2"
   Bot: "Added 2x Item to cart" + shows category

7. Customer: "CART"
   Bot: Shows cart summary

8. Customer: "CHECKOUT"
   Bot: Asks for name (if new customer)

9. Customer: "John"
   Bot: Asks for address OR confirms saved address

10. Customer: Shares location pin
    Bot: Shows delivery regions

11. Customer: "1" (selects region)
    Bot: Shows order summary with total

12. Customer: "YES"
    Bot: Sends Paystack payment link

13. Customer pays via Paystack
    Bot: Sends order confirmation
```

### Commands Available

| Command | Action |
|---------|--------|
| MENU | Show menu categories |
| CART | View current cart |
| CHECKOUT | Proceed to payment |
| CLEAR | Empty cart |
| BACK | Go to previous screen |
| HELP | Show available commands |
| YES/NO | Confirm or cancel |
| DONE | Skip optional step |
| Numbers (1, 2, 3) | Select items |

## Features

### Returning Customers
- Automatically detected by phone number
- Previous order details (name, address) are saved
- Customers can confirm or update their address

### Location Sharing
- Accepts WhatsApp location pins
- Stores GPS coordinates for delivery tracking
- Can also accept text addresses with landmarks

### Operating Hours
- Checks restaurant status before ordering
- Informs customers when closed
- Allows placing orders for next opening time

### Kitchen Integration
- WhatsApp orders appear in the Kitchen Display System
- Same workflow as web orders
- Print queue integration for receipts

## Monitoring & Debugging

### View Message Logs

```sql
SELECT * FROM whatsapp_message_log 
ORDER BY created_at DESC 
LIMIT 50;
```

### View Active Sessions

```sql
SELECT 
  phone,
  state,
  customer_name,
  cart,
  last_activity
FROM whatsapp_sessions
WHERE last_activity > NOW() - INTERVAL '1 hour'
ORDER BY last_activity DESC;
```

### Clear Stale Sessions

```sql
SELECT cleanup_stale_whatsapp_sessions(60); -- 60 minutes timeout
```

## Troubleshooting

### Webhook Not Receiving Messages

1. Check Ultra MSG instance is authenticated (QR scanned)
2. Verify webhook URL is correct and HTTPS
3. Check server logs for incoming requests
4. Test with ngrok for local development

### Messages Not Sending

1. Verify `ULTRAMSG_INSTANCE_ID` and `ULTRAMSG_TOKEN` are correct
2. Check Ultra MSG dashboard for errors
3. Ensure phone number format is correct (234XXXXXXXXXX)

### Payment Link Not Working

1. Verify `PAYSTACK_SECRET_KEY` is set
2. Check `NEXT_PUBLIC_APP_URL` is your production URL
3. Review Paystack dashboard for failed transactions

### Session State Issues

```sql
-- Reset a specific session
UPDATE whatsapp_sessions
SET state = 'IDLE', cart = '[]', message_context = '{}'
WHERE phone = '2348012345678';
```

## Security Considerations

1. **Webhook Verification**: Consider adding signature verification
2. **Rate Limiting**: Monitor for spam/abuse
3. **Session Expiry**: Stale sessions are auto-cleaned
4. **Phone Validation**: Nigerian numbers only (can be expanded)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whatsapp/webhook` | POST | Receive messages from Ultra MSG |
| `/api/whatsapp/webhook` | GET | Webhook verification |

## Files Created

```
lib/whatsapp/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript types
├── session-manager.ts       # Session CRUD operations
├── message-parser.ts        # Parse incoming messages
├── menu-formatter.ts        # Format bot responses
└── conversation-handler.ts  # State machine logic

app/api/whatsapp/
└── webhook/
    └── route.ts             # Webhook endpoint

database/migrations/
└── add_whatsapp_ordering.sql # Database migration
```

## Next Steps

1. Run the database migration
2. Configure Ultra MSG instance
3. Set environment variables
4. Test with a real WhatsApp number
5. Monitor logs for first few orders

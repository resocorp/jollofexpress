# 🍲 JollofExpress - Food Ordering & Delivery System

A comprehensive online food ordering platform for a single restaurant with customer ordering, kitchen display system (KDS), and admin dashboard.

## ✨ Features

### Customer Application
- 📱 Responsive PWA-ready menu browsing
- 🛒 Real-time cart management with Zustand
- 🎨 Item customization (variations, add-ons, special instructions)
- 📍 Comprehensive address validation (minimum 20 characters)
- 🏠 Address type selection (House, Office, Hotel, etc.)
- 💳 Paystack payment integration
- 📦 Real-time order tracking
- 🎫 Promo code support

### Kitchen Display System (KDS)
- 📊 Kanban-style order board (4 columns)
- 🔴 Color-coded order cards by age (green < 10min, yellow < 20min, red > 20min)
- 🔔 Audio & visual alerts for new orders
- 🖨️ Auto-print functionality via VPN
- ⏱️ Real-time order age tracking
- 👨‍🍳 Drag-and-drop or tap to advance orders
- 🔄 Manual reprint capability
- 🍽️ Mark items as sold out
- 🔄 Toggle restaurant open/closed status

### Admin Dashboard
- 📊 Overview dashboard with key metrics
- 🍱 Full menu management (CRUD)
- 📦 Order management with filters
- 🎫 Promo code management
- ⚙️ Restaurant settings (hours, fees, delivery cities)
- 👥 User management (kitchen staff, admins)
- 📈 Analytics and reporting

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **State Management**: Zustand (cart), React Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: React DnD
- **Icons**: Lucide React

### Backend
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions
- **API**: Next.js API Routes

### Third-Party Services
- **Payment**: Paystack
- **SMS**: Termii / Africa's Talking
- **Email**: Resend / SendGrid

## 📁 Project Structure

```
jollofexpress/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin dashboard pages
│   ├── checkout/            # Checkout flow
│   ├── kitchen/             # Kitchen Display System
│   ├── menu/                # Menu browsing
│   └── orders/[id]/         # Order tracking
├── components/              # React components
│   ├── admin/              # Admin components
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Checkout forms
│   ├── kitchen/            # KDS components
│   ├── layout/             # Layout components
│   ├── menu/               # Menu display
│   └── orders/             # Order tracking
├── database/               # Database schema
│   └── schema.sql          # PostgreSQL schema
├── hooks/                  # Custom React hooks
│   ├── use-menu.ts
│   ├── use-orders.ts
│   ├── use-promo.ts
│   └── use-settings.ts
├── lib/                    # Utilities
│   ├── api-client.ts       # API client
│   ├── formatters.ts       # Formatting utils
│   ├── validations.ts      # Zod schemas
│   └── supabase/           # Supabase clients
├── store/                  # Zustand stores
│   └── cart-store.ts
├── types/                  # TypeScript types
│   └── database.ts
└── providers/              # React providers
    └── query-provider.tsx
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Paystack account
- SMS service account (Termii or Africa's Talking)

### 1. Clone and Install

```bash
git clone <repository-url>
cd jollofexpress
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory (see `ENV_SETUP.md` for full template):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=JollofExpress

# SMS Service
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=JollofExpress

# Email Service
EMAIL_API_KEY=your_email_api_key
EMAIL_FROM=noreply@jollofexpress.com

# Print Server (for production)
PRINT_SERVER_URL=http://192.168.1.100:8080
PRINT_VPN_ENABLED=true
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in the Supabase SQL editor
3. The schema includes:
   - All tables with relationships
   - Row Level Security (RLS) policies
   - Sample data for testing
   - Functions and triggers

### 4. Configure Supabase CORS (Important for Localhost)

For the app to work on localhost, you need to configure CORS in Supabase:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Scroll to **CORS Configuration**
5. Add these origins:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
6. Click **Save**

**Why this is needed**: The Kitchen Display System uses real-time Supabase subscriptions from the browser, which requires CORS configuration for localhost.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 🔧 Troubleshooting Localhost Issues

If the app works via ngrok but not on localhost, run the diagnostic tool:

```bash
npm run diagnose
```

This will check:
- ✅ Environment variables are set correctly
- ✅ Supabase is reachable
- ✅ Dependencies are installed
- ✅ Configuration files exist

For detailed troubleshooting, see **[LOCALHOST_TROUBLESHOOTING.md](./docs/setup/LOCALHOST_TROUBLESHOOTING.md)**

**Common issues:**
- **CORS errors**: Add localhost to Supabase CORS settings (see step 4)
- **Missing env vars**: Ensure `.env.local` exists and has all required variables
- **Cached env vars**: Restart dev server after changing `.env.local`

**Additional diagnostic tools:**
```bash
npm run diagnose:reprint ORDER_ID    # Diagnose reprint issues
npm run diagnose:print-worker        # Check print worker status
npm run diagnose:printer IP_ADDRESS  # Test printer connectivity
npm run diagnose:clear-jobs 24       # Clear old print jobs
```

## 📱 Application Routes

### Customer Routes
- `/` - Redirects to menu
- `/menu` - Browse menu and add items to cart
- `/checkout` - Checkout with address validation
- `/orders/[id]` - Track order status

### Kitchen Routes
- `/kitchen` - Kitchen Display System (KDS)

### Admin Routes
- `/admin` - Dashboard overview
- `/admin/menu` - Menu management
- `/admin/orders` - Order management
- `/admin/promos` - Promo code management
- `/admin/settings` - Restaurant settings

## 🎯 Key Features Explained

### Address Validation
The checkout form includes comprehensive address validation:
- **City Selection**: Currently supports Awka only
- **Full Address**: Minimum 20 characters with directions and landmarks
- **Address Type**: House, Office, Hotel, Church, School, Other
- **Unit Number**: Optional (Flat 3, Room 205, etc.)
- **Phone Numbers**: Primary + alternative Nigerian phone validation
- **Delivery Instructions**: Optional 200-character field

Example valid address:
```
City: Awka
Address: No. 12 Zik Avenue, opposite First Bank, near Aroma Junction, Awka
Type: House
Unit: Flat 3
Phone: 08012345678
Instructions: Call on arrival, gate code is 1234
```

### Kitchen Display System (KDS)
- **4 Columns**: New Orders → Preparing → Ready → Out for Delivery
- **Color Coding**: 
  - Green border: < 10 minutes old
  - Yellow border: 10-20 minutes old
  - Red border: > 20 minutes old
- **Audio Alert**: Plays sound for new orders
- **Visual Flash**: Screen flash for new orders (5 seconds)
- **Auto-refresh**: Orders update every 5 seconds
- **Print Integration**: Auto-print on order confirmation

### Payment Flow
1. Customer completes checkout form
2. Order created with status "pending"
3. Redirected to Paystack payment page
4. After payment, redirected back with reference
5. Payment verified via webhook
6. Order status updated to "confirmed"
7. Print job triggered
8. Customer sees order tracking page

## 🖨️ Print System (Production)

### Architecture
```
[Digital Ocean Server] 
    ↓ WireGuard VPN
[Restaurant Local Network]
    ↓ USB/Network
[Thermal Printer]
```

### Setup Instructions
1. Set up WireGuard VPN between server and restaurant
2. Install Node.js print server on local machine
3. Configure thermal printer (ESC/POS compatible)
4. Update environment variables with print server URL

See deployment documentation for detailed setup.

## 🔒 Security Features

- HTTPS/SSL enforcement
- PCI DSS compliance via Paystack
- Bcrypt password hashing
- JWT-based authentication
- Row Level Security (RLS) on all tables
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting
- VPN encryption for print system

## 📊 Database Schema

### Core Tables
- `users` - Customer, kitchen staff, admin accounts
- `menu_categories` - Menu organization
- `menu_items` - Food items with pricing
- `item_variations` - Size, spice level options
- `item_addons` - Extra toppings, sides
- `orders` - Order details and status
- `order_items` - Items in each order
- `promo_codes` - Discount codes
- `print_queue` - Print job management
- `settings` - Restaurant configuration

See `database/schema.sql` for complete schema with relationships.

## 🧪 Testing

### Test Cards (Paystack)
- **Success**: 5060666666666666666 (any CVV, future expiry)
- **Decline**: 5060000000000000000

### Test Address
```
City: Awka
Address: No. 5 Test Street, opposite Central Bank, near Market Square, Awka. Large white building with green gate.
Type: House
Phone: 08012345678
```

## 🚀 Deployment

### Prerequisites
- Digital Ocean droplet (Ubuntu 22.04, 2GB RAM minimum)
- Domain name
- SSL certificate (Let's Encrypt)

### Steps
1. Set up server infrastructure
2. Configure Nginx reverse proxy
3. Deploy Next.js application
4. Set up PM2 process manager
5. Configure WireGuard VPN (for print system)
6. Set up monitoring and alerts

See full deployment guide in the PRD documentation.

## 📈 Future Enhancements

### Phase 2 (Post-MVP)
- Rider mobile application
- Live delivery tracking
- Push notifications
- Customer reviews and ratings
- Order scheduling
- Multiple payment methods

### Phase 3 (Long-term)
- Native mobile apps (iOS/Android)
- Multi-restaurant support
- AI-powered recommendations
- Loyalty program
- Advanced analytics

## 📖 Documentation

Additional documentation is organized in the `/docs` directory:

- **[Setup Guides](./docs/setup/)** - Environment setup, troubleshooting, security configuration
- **[Deployment](./docs/deployment/)** - Production deployment, cron jobs, monitoring
- **[Features](./docs/features/)** - Feature-specific documentation and guides
- **[Diagnostics](./scripts/diagnostics/)** - Diagnostic scripts and troubleshooting tools

For the full documentation index, see **[docs/README.md](./docs/README.md)**

## 🤝 Contributing

This is a private project. For questions or support, contact the development team.

## 📄 License

Proprietary - All rights reserved.

## 📞 Support

For technical support or questions:
- Email: support@jollofexpress.com
- Phone: +234 XXX XXX XXXX

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Shadcn for the beautiful component library
- Supabase for the backend infrastructure
- Paystack for payment processing

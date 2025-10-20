# 🚀 Quick Start Guide

Get JollofExpress up and running in under 30 minutes!

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Supabase account (free tier works)
- [ ] Paystack account (for production)
- [ ] Code editor (VS Code recommended)

## 🎯 Step-by-Step Setup

### Step 1: Install Dependencies (2 minutes)

```bash
cd "c:/Users/conwu/Downloads/winsurf projects/jollofexpress"
npm install
```

This installs all required packages including Next.js, React, Tailwind, and Shadcn/ui components.

### Step 2: Set Up Supabase (5-10 minutes)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Name it: `jollofexpress`
   - Choose a database password (save it!)
   - Select a region (closest to you)
   - Wait 2-3 minutes for setup

2. **Run the Database Schema**
   - In Supabase Dashboard, go to "SQL Editor"
   - Click "New Query"
   - Copy the entire contents of `database/schema.sql`
   - Paste and click "Run"
   - You should see "Success. No rows returned"
   - Your database now has all tables, sample data, and security policies

3. **Get Your API Keys**
   - In Supabase Dashboard, go to "Settings" → "API"
   - Copy these values:
     - `Project URL`
     - `anon public` key
     - `service_role` key (click "Reveal" first)

### Step 3: Configure Environment Variables (3 minutes)

1. **Create `.env.local` file** in the project root:

```bash
# Create the file (Windows)
type nul > .env.local

# Or on Mac/Linux
touch .env.local
```

2. **Add your configuration** (paste these, replace with your values):

```env
# Supabase (REQUIRED for MVP)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=JollofExpress

# Paystack (Optional for testing - use test keys)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Optional Services (can skip for now)
SMS_API_KEY=
SMS_SENDER_ID=JollofExpress
EMAIL_API_KEY=
EMAIL_FROM=noreply@jollofexpress.com
```

**Note:** For testing without payment, you can leave Paystack keys empty initially.

### Step 4: Start Development Server (1 minute)

```bash
npm run dev
```

You should see:
```
✓ Ready in 3.2s
○ Local:   http://localhost:3000
```

### Step 5: Test the Application (5 minutes)

Open your browser and test each section:

#### ✅ Test Menu Browsing
1. Go to `http://localhost:3000`
2. You should see the menu with sample items:
   - Jollof Rice
   - Fried Rice
   - Pepper Soup
   - Plantain
   - Chapman
3. Try searching for "Jollof"
4. Filter by categories

#### ✅ Test Add to Cart
1. Click on "Jollof Rice"
2. Customize:
   - Select portion size (Regular/Large)
   - Select protein (Chicken/Beef/Fish)
   - Add extras (Extra Protein, Extra Sauce)
   - Add special instructions
3. Click "Add to Cart"
4. Cart icon should show (1)

#### ✅ Test Checkout
1. Click cart icon in header
2. Review your items
3. Click "Proceed to Checkout"
4. Fill the form:
   - Order Type: Delivery
   - City: Awka
   - Full Address: (type at least 20 characters with details)
   - Example: "No. 5 Test Street, opposite Central Bank, near Market Square, Awka"
   - Phone: 08012345678
   - Name: John Doe
5. Try submitting with short address - should show validation error
6. Complete the form properly

**Note:** Payment will fail without Paystack keys, but you can test the form validation.

#### ✅ Test Kitchen Display
1. Go to `http://localhost:3000/kitchen`
2. Should see empty kanban board with 4 columns:
   - New Orders
   - Preparing
   - Ready for Pickup
   - Out for Delivery
3. Click "Controls" button
4. Toggle restaurant Open/Closed
5. Adjust prep time
6. Mark menu items as sold out

#### ✅ Test Admin Dashboard
1. Go to `http://localhost:3000/admin`
2. See dashboard overview
3. Navigate through sidebar:
   - Menu Management
   - Orders
   - Promo Codes
   - Settings

## 🎨 What You Can Do Now

### Fully Functional Features (No API needed)

1. **Browse Menu** - Complete with filters, search, categories
2. **Customize Items** - Full variation and addon selection
3. **Manage Cart** - Add, remove, update quantities, persist on refresh
4. **Validate Forms** - Comprehensive address validation works
5. **View Layouts** - All pages and components render correctly

### Features Waiting for API Implementation

1. **Place Orders** - Needs order creation API
2. **Process Payments** - Needs Paystack integration
3. **Track Orders** - Needs order status API
4. **Kitchen Operations** - Needs order management API
5. **Admin CRUD** - Needs admin API routes

## 📝 Verify Your Setup

Run this checklist to ensure everything is working:

- [ ] `npm run dev` starts without errors
- [ ] Menu page loads at `http://localhost:3000`
- [ ] Sample menu items are visible
- [ ] Can add items to cart
- [ ] Cart persists on page refresh
- [ ] Checkout form validates properly
- [ ] Kitchen display page loads
- [ ] Admin dashboard loads
- [ ] No console errors in browser

## 🔧 Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Database tables not created

**Solution:**
- Make sure you ran the ENTIRE `database/schema.sql` file
- Check for errors in Supabase SQL Editor
- Try running in smaller chunks if timeout occurs

### Issue: Menu not loading / blank page

**Solution:**
1. Check browser console for errors (F12)
2. Verify `.env.local` has correct Supabase URL and keys
3. Ensure database has sample data:
   ```sql
   SELECT * FROM menu_items;
   ```
4. Restart dev server after changing `.env.local`

### Issue: "Failed to fetch menu" error

**Solution:**
1. Check Supabase project is active (not paused)
2. Verify API keys are correct
3. Check RLS policies in Supabase dashboard
4. Test connection:
   ```bash
   curl http://localhost:3000/api/menu
   ```

### Issue: Cart not persisting

**Solution:**
- Clear browser cache and cookies
- Check browser console for localStorage errors
- Try incognito/private mode

### Issue: Validation errors on checkout

**Solution:**
- Address must be at least 20 characters
- Phone must be valid Nigerian format: 08012345678
- City must be exactly "Awka"
- All required fields must be filled

## 🎯 Next Steps

Now that your environment is set up, you have two paths:

### Option A: Start with Sample API Routes (Recommended)

I've created 4 sample API routes to get you started:
- ✅ `GET /api/menu` - Fetch menu
- ✅ `GET /api/restaurant/info` - Restaurant details
- ✅ `GET /api/restaurant/status` - Open/closed status
- ✅ `GET /api/delivery/cities` - Delivery cities

**Test them:**
```bash
# Test menu endpoint
curl http://localhost:3000/api/menu

# Test restaurant info
curl http://localhost:3000/api/restaurant/info

# Test status
curl http://localhost:3000/api/restaurant/status
```

If these work, your frontend should now load real data from Supabase!

### Option B: Continue API Implementation

Follow `API_IMPLEMENTATION_GUIDE.md` to implement remaining endpoints:

**Critical Priority:**
1. `POST /api/orders` - Order creation
2. `POST /api/orders/verify-payment` - Payment verification
3. `GET /api/orders/[id]` - Order tracking
4. `GET /api/kitchen/orders` - Kitchen display data

See `PROJECT_STATUS.md` for full implementation roadmap.

## 📚 Learning Resources

### Understanding the Codebase

Start with these files:
1. `README.md` - Complete project overview
2. `PROJECT_STATUS.md` - Current progress and todos
3. `API_IMPLEMENTATION_GUIDE.md` - API specifications
4. `database/schema.sql` - Database structure
5. `types/database.ts` - TypeScript types

### Key Directories

- `app/` - Next.js pages and API routes
- `components/` - React components (organized by feature)
- `hooks/` - Custom React hooks for data fetching
- `lib/` - Utilities (validation, formatting, API client)
- `store/` - Zustand state management
- `types/` - TypeScript type definitions

### Development Tips

1. **Hot Reload**: Changes auto-refresh, no restart needed
2. **Type Safety**: VS Code shows TypeScript errors inline
3. **Component Library**: Use Shadcn/ui components (already installed)
4. **Debugging**: Use browser DevTools (F12) for React and Network tabs
5. **Database**: Use Supabase Table Editor to view/edit data

## 🆘 Getting Help

### Check These First
1. Browser console (F12) for JavaScript errors
2. Terminal for server errors
3. Supabase Dashboard → Logs for database errors
4. Network tab (F12) for API call failures

### Documentation
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- React Query: https://tanstack.com/query/latest
- Shadcn/ui: https://ui.shadcn.com

## ✅ Success Checklist

You're ready to continue when:

- [x] ✅ Project dependencies installed
- [x] ✅ Supabase project created and configured
- [x] ✅ Database schema loaded with sample data
- [x] ✅ Environment variables set
- [x] ✅ Dev server running without errors
- [x] ✅ Menu page displays sample items
- [x] ✅ Can add items to cart
- [x] ✅ Checkout form validates correctly
- [x] ✅ Kitchen and admin pages load

**Congratulations! 🎉 Your development environment is ready!**

Now you can:
1. Continue implementing API routes
2. Customize the design and branding
3. Add more menu items in Supabase
4. Test the complete user flow

---

**Time to complete:** ~20-30 minutes  
**Status after completion:** Frontend fully functional, ready for API integration  
**Next:** Implement order creation and payment APIs

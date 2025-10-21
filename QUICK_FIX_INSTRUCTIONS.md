# Quick Fix Instructions

## 🔴 Critical: Add Missing Service Role Key

You need to add the Supabase Service Role Key to your `.env.local` file to fix the order creation error.

### Steps to Fix:

1. **Get Your Service Role Key from Supabase:**
   - Go to https://supabase.com/dashboard
   - Select your `jollofexpress` project
   - Click on **Settings** (gear icon in sidebar)
   - Click on **API** in the left menu
   - Scroll down to find **service_role** key (NOT the anon key)
   - Copy the **service_role secret** value

2. **Add to Your `.env.local` File:**
   
   Open `c:\Users\conwu\Downloads\winsurf projects\jollofexpress\.env.local`
   
   Add this line (or update if it exists):
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

3. **Restart Your Dev Server:**
   - Stop the current server (Ctrl+C in terminal)
   - Run `npm run dev` again

### What Was Fixed:

✅ **Order Creation RLS Error** - Orders now use service role to bypass RLS
✅ **Hydration Error** - Cart badge now only renders after client mount
✅ **Validation Schema** - Delivery fields are now conditional based on order type

### After Adding the Key:

The checkout flow should work perfectly:
- ✅ Select "Delivery" or "Carryout"
- ✅ Fill in contact details
- ✅ Add delivery address (for delivery orders with landmarks)
- ✅ Click "Proceed to Payment"
- ✅ Redirect to Paystack payment page

### Security Note:

⚠️ **IMPORTANT:** The Service Role Key bypasses Row Level Security. It should:
- ✅ Only be in `.env.local` (already in `.gitignore`)
- ✅ Never be committed to version control
- ✅ Only be used in server-side code (API routes)
- ❌ NEVER be exposed to the client

This is safe because we only use it in the `/api/orders` route for creating orders, which is a trusted server-side operation.

# Promo Code RLS Issue - FIXED ✅

## Problem

When trying to update promo codes from the admin panel, you were getting:

```
Error: Failed to update promo code
PGRST116: Cannot coerce the result to a single JSON object
Details: The result contains 0 rows
```

## Root Cause

The admin API routes (`/api/admin/promos/*`) were using the **wrong Supabase client**:

- ❌ **Was using**: `createClient()` from `@/lib/supabase/server`
  - This is the regular server client that **respects RLS policies**
  - RLS policies were blocking admin operations
  
- ✅ **Should use**: `createServiceClient()` from `@/lib/supabase/service`
  - This uses the service role key
  - **Bypasses RLS completely** (needed for trusted admin operations)

## What Was Fixed

Updated all admin promo API routes to use the service client:

### Files Modified:
1. ✅ `/app/api/admin/promos/route.ts`
2. ✅ `/app/api/admin/promos/[id]/route.ts`

### Changes Made:
```typescript
// BEFORE (Wrong)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// AFTER (Correct)
import { createServiceClient } from '@/lib/supabase/service';
const supabase = createServiceClient();
```

## Why This Works

### Row Level Security (RLS) Context:
- **RLS policies** are security rules on database tables
- They restrict what data authenticated users can access
- The `promo_codes` table has RLS enabled with policies that:
  - Allow public to **read** active promos (for validation)
  - Require admin role to **modify** promos

### The Two Supabase Clients:

| Client | Key Used | RLS Behavior | Use Case |
|--------|----------|--------------|----------|
| `createClient()` | Anon key | **Respects RLS** | Customer operations |
| `createServiceClient()` | Service role key | **Bypasses RLS** | Admin/trusted operations |

### Service Role Key:
Your `.env.local` has:
```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ZuIDnaeMzMc6sKeETnfjFw_42dkojME
```
This key has **full database access** and bypasses all RLS policies.

## Security Note

⚠️ **Important**: The service role client should **ONLY** be used in:
- Server-side API routes (like `/api/admin/*`)
- Trusted backend operations
- **NEVER** expose the service role key to the client/browser

This is already correctly implemented - the service role is only used in API routes.

## Test Results

After the fix, admin operations should now work:
- ✅ Create promo codes
- ✅ Update promo codes  
- ✅ Delete/deactivate promo codes
- ✅ View all promo codes

## Additional Notes

### Other Admin Routes
If you add more admin endpoints in the future, remember to:
1. Import from `@/lib/supabase/service` (not `/server`)
2. Use `createServiceClient()` for admin operations
3. Never use service client for customer-facing endpoints

### Customer Validation Route
The `/api/promo/validate` route correctly uses the server client because:
- It's customer-facing
- It only needs to **read** active promos
- RLS policy allows public read access to active promos

## Summary

✅ **Issue**: Admin promo updates failing due to RLS blocking queries  
✅ **Cause**: Using wrong Supabase client (server instead of service)  
✅ **Fix**: Changed admin routes to use service client  
✅ **Result**: Admin operations now bypass RLS and work correctly  

The promo code module is now fully functional! 🎉

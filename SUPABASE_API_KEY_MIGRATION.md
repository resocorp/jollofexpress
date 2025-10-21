# 🔑 Supabase API Key Migration Guide

## 📊 CURRENT STATE: Using Legacy Keys

Your project currently uses the **Legacy JWT-based API keys**:

### Legacy Keys (Being Deprecated):
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...      # JWT format
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...          # JWT format
```

**Problems with Legacy Keys:**
- ❌ Tight coupling between JWT secret and API keys
- ❌ Cannot rotate independently
- ❌ Cannot roll back rotations
- ❌ 10-year expiry (security risk)
- ❌ Large, hard to parse
- ❌ No separate keys for different components

---

## ✨ NEW STATE: Modern API Keys

Supabase now provides **Independent, Manageable API keys**:

### New Keys (Recommended):
```
# Public (replaces anon key)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Server-side (replaces service_role key)
SUPABASE_SECRET_KEY=sb_secret_...
```

**Benefits of New Keys:**
- ✅ **Independent rotation** - No downtime when rotating
- ✅ **Multiple secret keys** - One per backend component
- ✅ **Better security** - Browser detection, shorter-lived
- ✅ **Gradual migration** - Both work simultaneously
- ✅ **Easy management** - Enable/disable via dashboard
- ✅ **Rollback support** - Can revert if needed
- ✅ **No forced JWT rotation** - Keys independent from JWT

---

## 🔄 MIGRATION PROCESS (Zero Downtime)

### Phase 1: Get New API Keys from Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/settings/api
   - Click on **"API Keys"** tab (not "Legacy API Keys")

2. **You'll see:**
   ```
   Publishable key: sb_publishable_...
   Secret keys: 
     - default: sb_secret_...
   ```

3. **Copy both keys** (we'll add them to your `.env.local`)

---

### Phase 2: Update Environment Variables

**Edit your `.env.local` file:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pijgeuspfgcccoxtjnby.supabase.co

# ==== NEW API KEYS (Recommended) ====
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... # PASTE HERE
SUPABASE_SECRET_KEY=sb_secret_... # PASTE HERE

# ==== OLD API KEYS (Keep during migration) ====
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...  # Keep for now
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...      # Keep for now

# Rest of your config...
```

**Why keep both?**
- Both keys work simultaneously
- Zero downtime migration
- Gradual rollout to production
- Easy rollback if issues

---

### Phase 3: Update Code to Use New Keys

#### 3.1 Client-Side (Browser) - Use Publishable Key

**File:** `lib/supabase/client.ts`

```typescript
// Before (Legacy):
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ❌ Old
  );
}

// After (New):
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||  // ✅ New (with fallback)
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!          // Fallback to old
  );
}
```

#### 3.2 Server-Side (API Routes) - Use Secret Key

**File:** `lib/supabase/service.ts`

```typescript
// Before (Legacy):
export function createServiceClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // ❌ Old
  
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {...});
}

// After (New):
export function createServiceClient() {
  const supabaseSecretKey = 
    process.env.SUPABASE_SECRET_KEY ||                    // ✅ New (preferred)
    process.env.SUPABASE_SERVICE_ROLE_KEY;                // Fallback to old
  
  if (!supabaseSecretKey) {
    throw new Error('Missing Supabase secret key');
  }
  
  return createClient(supabaseUrl, supabaseSecretKey, {...});
}
```

---

### Phase 4: Test & Verify

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Test all endpoints:**
   - ✅ Menu loading (uses publishable key)
   - ✅ Order creation (uses secret key)
   - ✅ Order tracking (uses secret key)
   - ✅ Admin dashboard (uses secret key)
   - ✅ Kitchen display (uses secret key)

3. **Check Supabase Dashboard:**
   - Go to API Keys page
   - Scroll to "Legacy API Keys" section
   - Check "Last request was X minutes ago"
   - If shows recent requests → old keys still in use
   - If shows "Last request was 6 minutes ago" (or old) → new keys working!

---

### Phase 5: Deactivate Legacy Keys (After Verification)

**⚠️ ONLY do this after confirming new keys work!**

1. **Monitor for 24-48 hours** in production
2. **Check "Last used" indicator** on dashboard
3. **If no recent usage:**
   - Click "Disable JWT-based API keys" button
   - Confirm deactivation
4. **Remove from `.env.local`:**
   ```bash
   # Remove these lines:
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # SUPABASE_SERVICE_ROLE_KEY=...
   ```

---

## 🔐 SECURITY IMPROVEMENTS

### New Secret Key Features:

1. **Browser Detection:**
   ```
   User-Agent header check → Always returns 401 in browser
   ```
   - Prevents accidental exposure in frontend code
   - Legacy service_role key didn't have this protection

2. **Multiple Keys for Different Components:**
   ```
   sb_secret_orders_...    → Order API
   sb_secret_admin_...     → Admin dashboard
   sb_secret_kitchen_...   → Kitchen display
   ```
   - If one leaks, only revoke that one
   - Others remain unaffected

3. **Easy Rotation:**
   ```
   Create new key → Deploy with new key → Delete old key
   ```
   - No downtime
   - No JWT secret rotation required
   - Can roll back instantly

---

## 📝 CODE CHANGES REQUIRED

### Files to Update:

1. **`lib/supabase/client.ts`** ✅
   - Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **`lib/supabase/service.ts`** ✅
   - Use `SUPABASE_SECRET_KEY`
   - Fallback to `SUPABASE_SERVICE_ROLE_KEY`

3. **`.env.local`** ✅
   - Add new keys
   - Keep old keys during migration
   - Remove old keys after verification

4. **`.env.example` / `ENV_SETUP.md`** (Optional)
   - Document new key format
   - Update setup instructions

---

## 🧪 TESTING CHECKLIST

### Before Deactivating Legacy Keys:

- [ ] New publishable key works in browser (menu loads)
- [ ] New secret key works in API routes (orders create)
- [ ] Admin dashboard works
- [ ] Kitchen display works
- [ ] Order tracking works
- [ ] Payment flow works
- [ ] "Last used" indicator shows old keys not used for 24+ hours
- [ ] Production deployed with new keys
- [ ] No errors in logs related to API keys

---

## ⚠️ ROLLBACK PLAN

**If something goes wrong:**

1. **Immediate:**
   - New keys already work alongside old ones
   - No action needed, old keys still valid

2. **If you deactivated legacy keys prematurely:**
   - Go to Supabase Dashboard
   - Click "Re-enable JWT-based API keys"
   - Keys reactivate immediately

3. **If code changes cause issues:**
   - Revert code changes
   - Old keys still in `.env.local`
   - Restart server

---

## 🎯 MIGRATION TIMELINE

### AI-Assisted Rapid Migration (15-30 minutes):

**Minute 0-5: Get Keys**
- [ ] Go to Supabase dashboard
- [ ] Copy new publishable + secret keys
- [ ] Paste into `.env.local`

**Minute 5-10: Deploy & Test**
- [ ] Restart dev server: `npm run dev`
- [ ] Test all features (menu, orders, admin, kitchen)
- [ ] Verify no errors in terminal

**Minute 10-15: Production Deploy**
- [ ] Push to production with new keys
- [ ] Verify production works
- [ ] Monitor for 5-10 minutes

**Minute 15-30: Cleanup**
- [ ] Check "Last used" indicator (should show old keys not used)
- [ ] Disable legacy keys in dashboard
- [ ] Remove old keys from `.env.local`
- [ ] Commit and push

**Total Time: 15-30 minutes for complete migration** 🚀

### Conservative Timeline (If paranoid):
- **Hour 1:** Add new keys, test locally
- **Hour 2:** Deploy to production, monitor
- **Hour 3:** Disable legacy keys, cleanup
- **Total: 3 hours max**

---

## 📚 ADDITIONAL RESOURCES

- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys)
- [JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## ✨ SUMMARY

**Current:** Using legacy JWT-based keys (being deprecated)  
**Target:** Using new publishable + secret keys (recommended)  
**Migration:** Zero-downtime, instant rollout with fallback  
**Timeline:** 15-30 minutes for complete migration (AI-assisted)  
**Benefit:** Better security, easier rotation, no downtime  

**Next Step:** Get your new API keys from the Supabase dashboard and migrate in the next 20 minutes! 🚀

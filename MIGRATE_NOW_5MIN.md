# ⚡ 5-MINUTE API KEY MIGRATION

You're building with AI. This takes **5 minutes, not 4 weeks**.

---

## ⏱️ STEP 1: Get Keys (1 minute)

1. Open: https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/settings/api
2. Click **"API Keys"** tab
3. Copy **Publishable key**: `sb_publishable_...`
4. Copy **Secret key** (default): `sb_secret_...`

---

## ⏱️ STEP 2: Update .env.local (1 minute)

Open your `.env.local` file and add these two lines:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_PASTE_YOUR_KEY_HERE
SUPABASE_SECRET_KEY=sb_secret_PASTE_YOUR_KEY_HERE
```

Keep your old keys for now (safety):
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...  # Keep this line
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...      # Keep this line
```

---

## ⏱️ STEP 3: Restart & Test (2 minutes)

```bash
npm run dev
```

**Test these:**
- ✅ Menu loads
- ✅ Add to cart → Checkout → Submit order
- ✅ Check terminal → No errors

---

## ⏱️ STEP 4: Cleanup (1 minute)

If everything works:

1. **Dashboard:** Settings → API Keys → Legacy API Keys → "Disable JWT-based API keys"
2. **Remove from .env.local:**
   ```bash
   # Delete these lines:
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. **Restart:** `npm run dev`

---

## ✅ DONE! (5 minutes total)

**Your app now uses:**
- ✅ Modern publishable key (client-side)
- ✅ Modern secret key (server-side)
- ✅ Better security
- ✅ Independent rotation
- ✅ Browser detection

**No more weeks of migration BS. Welcome to AI-speed development.** 🚀

---

## 🔥 Pro Move (Optional)

Want multiple secret keys for different components?

**Dashboard → API Keys → "+ New secret key"**

```bash
SUPABASE_SECRET_KEY_ORDERS=sb_secret_...    # For order APIs
SUPABASE_SECRET_KEY_ADMIN=sb_secret_...     # For admin APIs
SUPABASE_SECRET_KEY_KITCHEN=sb_secret_...   # For kitchen APIs
```

Then update your code to use specific keys per component. Leak one? Just revoke that one.

---

## ⚠️ If Something Breaks

**Don't panic. Old keys still work.**

1. Check terminal for errors
2. Verify you pasted keys correctly
3. Restart server
4. If still broken, keep using old keys (they're not going anywhere soon)

Your code already supports both old and new keys. Zero risk.

---

**GO. DO IT NOW. 5 MINUTES.** ⏱️

# 🔑 How to Get Your New Supabase API Keys

## Quick Steps to Get New Keys

### 1. **Go to Supabase Dashboard**
```
https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/settings/api
```

### 2. **Click on "API Keys" Tab**
You'll see **two tabs**:
- **"API Keys"** ← Click this one (new system)
- "Legacy API Keys" (old system - what you have now)

### 3. **Copy Your New Keys**

You'll see something like this:

#### **Publishable key** (Public - safe for browser)
```
sb_publishable_N9wXYfEgP7rJN7FBw3E_F45ihvkd
```
📋 Click "Copy" button

#### **Secret keys** (Server-side only - never expose!)
```
default: sb_secret_7uTngqwMzMcGsKeTnvfJe_42kojHE
```
📋 Click the eye icon to reveal, then copy

---

## 4. **Add to Your .env.local**

Open `c:\Users\conwu\Downloads\winsurf projects\jollofexpress\.env.local`

**Add these two lines:**
```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY_HERE
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY_HERE
```

**Keep your old keys for now** (for safe migration):
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...  # Keep this
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...      # Keep this
```

---

## 5. **Restart Your Dev Server**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## ✅ Verification

After restart, check your terminal for:
```
✓ Ready in XXXXms
- Local:        http://localhost:3000
```

Test your app:
1. Go to menu page → Should load ✅
2. Add items and checkout → Should work ✅
3. Check terminal logs → No API key errors ✅

---

## 🎯 What You're Looking For

**From the Supabase Dashboard > API Keys tab:**

### ✅ Correct Tab (NEW):
```
╔═══════════════════════════════════════════╗
║  API Keys    │  Legacy API Keys           ║
║  ▼                                         ║
║                                            ║
║  Publishable key                           ║
║  sb_publishable_...          [Copy]        ║
║                                            ║
║  Secret keys                               ║
║  NAME      API KEY              LAST SEEN  ║
║  default   sb_secret_...  [👁][Copy]  Never║
║            + New secret key                ║
╚═══════════════════════════════════════════╝
```

### ❌ Wrong Tab (LEGACY):
```
╔═══════════════════════════════════════════╗
║  API Keys    │  Legacy API Keys           ║
║                  ▼                         ║
║                                            ║
║  anon    public                            ║
║  eyJhbGciOiJI...             [Copy]        ║
║                                            ║
║  service_role  secret                      ║
║  eyJhbGciOiJI...             [Copy]        ║
╚═══════════════════════════════════════════╝
```

---

## 🔐 Security Notes

### Publishable Key (sb_publishable_...):
✅ Safe to expose in:
- Web pages
- Mobile apps
- Public GitHub repos
- Client-side JavaScript

### Secret Key (sb_secret_...):
❌ NEVER expose in:
- Web pages
- Client-side code
- Public repositories
- Browser console
- URLs or query params

✅ ONLY use in:
- Server-side API routes
- Backend services
- `.env.local` (gitignored)

---

## 📞 Need Help?

**If you can't find the API Keys tab:**
1. Make sure you're on the correct project (jollofexpress)
2. Try refreshing the dashboard page
3. Look for the tab at the top: "API Keys" (not "Legacy")

**If you don't see any new keys:**
1. Supabase might still be rolling out to your project
2. Contact Supabase support
3. For now, your legacy keys still work fine

---

## ⏭️ Next Steps

1. ✅ Get new keys from dashboard
2. ✅ Add to `.env.local`
3. ✅ Restart dev server
4. ✅ Test your app
5. ⏳ Wait 24-48 hours
6. ⏳ Monitor "Last used" on legacy keys
7. ⏳ Disable legacy keys when safe

---

**Your code is already updated to support both old and new keys! Just add the new keys and restart.** 🚀

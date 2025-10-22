# 🚨 SECURITY BREACH - QUICK ACTION CHECKLIST

**⏰ Complete these steps in the next 15 minutes**

---

## ✅ STEP 1: Stop the Bleeding (2 minutes)

### Close GitHub Alert
1. Go to: https://github.com/resocorp/jollofexpress/security/secret-scanning/1
2. Click "**Close as**" → "**Revoked**" (you'll do this after step 2)

---

## ✅ STEP 2: Rotate Supabase Keys (5 minutes)

### A. Open Supabase Dashboard
```
https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/settings/api
```

### B. Revoke Legacy Key (if using old format)
1. Click "**Legacy API Keys**" tab
2. Find "**service_role**" key
3. Click "**Revoke**" or "**Regenerate**"
4. Copy the NEW key → Save somewhere safe

### C. Generate New Secret Key (recommended)
1. Click "**API Keys**" tab (not Legacy)
2. Under "**Secret keys**" section
3. Click "**+ New secret key**"
4. Name: "production"
5. Copy the new key: `sb_secret_XXXXX`

---

## ✅ STEP 3: Update Local Environment (2 minutes)

### Open your `.env.local` file:
```bash
code .env.local
```

### Replace OLD keys with NEW keys:
```env
# DELETE THESE LINES (compromised):
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
# SUPABASE_SECRET_KEY=sb_secret_ZuIDnaeMzMc6sKeETnfjFw_42dkojME

# ADD THESE LINES (new safe keys):
SUPABASE_SECRET_KEY=sb_secret_YOUR_NEW_KEY_HERE
```

### Save the file (Ctrl+S)

---

## ✅ STEP 4: Test Application (2 minutes)

### Restart your dev server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Test basic functionality:
1. Open http://localhost:3000
2. Browse menu (should load)
3. Add item to cart (should work)
4. If errors appear, check the terminal for Supabase connection issues

---

## ✅ STEP 5: Remove .env.local from Git (4 minutes)

### Remove from current index:
```bash
git rm --cached .env.local
git commit -m "security: remove .env.local from repository"
```

### Remove from git history (CRITICAL):

**Option A: Quick Clean (Recommended for small repos)**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove .env.local from entire history
git filter-repo --path .env.local --invert-paths --force

# Force push to remote
git push origin --force --all
```

**Option B: Manual (if you can't install git-filter-repo)**
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

---

## ✅ STEP 6: Verify Security (2 minutes)

### Check GitHub:
1. Go back to: https://github.com/resocorp/jollofexpress/security/secret-scanning
2. Verify alert is gone or can be closed
3. Click "**Close as**" → "**Revoked**"

### Check Supabase:
1. Go to: https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/logs
2. Look for any suspicious activity in last 24 hours
3. Check for:
   - Unknown IP addresses
   - Mass data exports
   - Failed auth attempts

---

## ⏭️ NEXT STEPS (Complete within 24 hours)

See detailed guide: **SECURITY_INCIDENT_REMEDIATION.md**

- [ ] Generate new JWT_SECRET
- [ ] Generate new PRINT_PROCESSOR_SECRET
- [ ] Audit database for unauthorized access
- [ ] Review all documentation for hardcoded secrets
- [ ] Enable GitHub push protection
- [ ] Update production environment (if deployed)

---

## 🆘 IF YOU NEED HELP

**Can't remove from git history?**
- See SECURITY_INCIDENT_REMEDIATION.md for detailed instructions
- Alternative: Delete repo and re-create (nuclear option)

**Application won't start after key rotation?**
- Check .env.local has correct format (no extra spaces/quotes)
- Verify you copied the FULL key from Supabase
- Restart dev server completely

**Not sure if database was accessed?**
- Run audit queries in SECURITY_INCIDENT_REMEDIATION.md
- Contact Supabase support: support@supabase.com

---

## ✅ COMPLETION CHECKLIST

- [ ] Supabase keys rotated
- [ ] .env.local updated with new keys
- [ ] Application tested and working
- [ ] .env.local removed from git index
- [ ] .env.local removed from git history
- [ ] Force pushed to GitHub
- [ ] GitHub security alert closed
- [ ] Supabase logs reviewed

---

**Time Estimate:** 15-20 minutes total  
**Priority:** P0 - CRITICAL  
**Do NOT delay - keys are public for 20+ hours**

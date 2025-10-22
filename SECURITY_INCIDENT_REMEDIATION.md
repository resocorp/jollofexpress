# 🚨 SECURITY INCIDENT - IMMEDIATE ACTION REQUIRED

**Incident Date:** 2025-10-22  
**Severity:** CRITICAL  
**Status:** ACTIVE BREACH - Keys exposed for 20+ hours

---

## 📋 EXECUTIVE SUMMARY

Multiple API keys and secrets were committed to a public GitHub repository and detected by GitHub's secret scanning. The exposed credentials provide full database access and payment system access.

### Exposed Credentials:
1. ✅ **Supabase Service Role Key** (Legacy format)
2. ✅ **Supabase Secret Key** (New format)  
3. ⚠️ **Paystack Test Keys** (pk_test & sk_test)
4. ⚠️ **JWT Secret** (development)
5. ⚠️ **Print Processor Secret** (development)

### Impact Level:
- **Database**: FULL ACCESS - All customer data readable/modifiable
- **Payments**: TEST ONLY - No financial loss risk
- **Authentication**: Compromised JWT secret

---

## 🔥 IMMEDIATE ACTIONS (Do in Next 15 Minutes)

### ✅ Action 1: Remove .env.local from Git History

**Option A: Using git-filter-repo (Recommended)**
```bash
# Install git-filter-repo (if not installed)
pip install git-filter-repo

# Backup your repository first!
cd "c:\Users\conwu\Downloads\winsurf projects\jollofexpress"
git clone . ../jollofexpress-backup

# Remove .env.local from entire history
git filter-repo --path .env.local --invert-paths --force

# Force push to remote (THIS WILL REWRITE HISTORY)
git push origin --force --all
```

**Option B: Using BFG Repo-Cleaner**
```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
# Run in parent directory
java -jar bfg.jar --delete-files .env.local jollofexpress
cd jollofexpress
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

**⚠️ WARNING:** Force pushing will affect anyone who has cloned the repo. Coordinate with team members.

---

### ✅ Action 2: Rotate ALL Supabase Keys

#### A. Revoke Legacy Service Role Key
1. Go to: https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/settings/api
2. Click "**Legacy API Keys**" tab
3. Find "service_role" key
4. Click "**Revoke**" or "**Regenerate**"
5. Copy the NEW key

#### B. Rotate New Secret Keys
1. Stay in Supabase Dashboard → API Keys tab
2. Click the "**default**" secret key row
3. Click "**Revoke**" or regenerate
4. Click "**+ New secret key**"
5. Name it: "production-secret"
6. Copy the NEW secret key: `sb_secret_XXXXX`

#### C. Update Your Local .env.local
```env
# OLD (COMPROMISED) - DELETE THESE
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
# SUPABASE_SECRET_KEY=sb_secret_ZuIDnaeMzMc6sKeETnfjFw_42dkojME

# NEW (SAFE) - ADD THESE
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new_anon_key>
SUPABASE_SECRET_KEY=<new_secret_key>
```

---

### ✅ Action 3: Generate New Secrets

```bash
# Generate new JWT secret (PowerShell)
$bytes = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)

# Generate new print processor secret (PowerShell)
$bytes = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

Update in `.env.local`:
```env
JWT_SECRET=<output_from_first_command>
PRINT_PROCESSOR_SECRET=<output_from_second_command>
```

---

### ✅ Action 4: Check if Paystack Needs Rotation

**Since these are TEST keys, financial risk is minimal. However:**

1. Go to: https://dashboard.paystack.com/settings/developer
2. Check "**Recent Activity**" for suspicious transactions
3. **Optional**: Regenerate test keys for safety
4. **Before production**: Generate and use LIVE keys (never test keys)

---

## 🔍 Action 5: Audit Database for Unauthorized Access

### Check Supabase Logs
1. Go to: https://supabase.com/dashboard/project/pijgeuspfgcccoxtjnby/logs/explorer
2. Filter by date: Last 24 hours
3. Look for:
   - Unusual IP addresses
   - Mass data exports
   - Unexpected API calls
   - Failed authentication attempts

### Check for Data Exfiltration
```sql
-- Run in Supabase SQL Editor
-- Check for suspicious user logins
SELECT created_at, email, last_sign_in_at 
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check for mass order queries
SELECT created_at, COUNT(*) as order_count
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY created_at
HAVING COUNT(*) > 100;

-- Check for unauthorized admin users
SELECT id, email, created_at, role
FROM users
WHERE role = 'admin' 
AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 📝 Action 6: Update Production Environment

**If you have deployed to production:**

1. **SSH into your server:**
   ```bash
   ssh deploy@your-server-ip
   ```

2. **Update .env.local with new keys:**
   ```bash
   cd ~/jollofexpress
   nano .env.local
   # Paste new keys
   ```

3. **Restart application:**
   ```bash
   pm2 restart ecosystem.config.js
   pm2 save
   ```

4. **Verify logs:**
   ```bash
   pm2 logs jollofexpress --lines 50
   ```

---

## 🛡️ PREVENTIVE MEASURES

### 1. Fix .gitignore (Already done)
```gitignore
# env files - NEVER commit these!
.env*
.env.local
.env.production
.env.development
```

### 2. Add Pre-commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Prevent committing .env files

if git diff --cached --name-only | grep -E '\.env'; then
    echo "❌ ERROR: Attempting to commit .env files!"
    echo "Aborting commit."
    exit 1
fi

# Check for potential secrets
if git diff --cached | grep -iE '(sk_live|sk_test|eyJhbGciOiJI|sb_secret)'; then
    echo "⚠️  WARNING: Potential API key detected in commit!"
    echo "Review your changes before committing."
    exit 1
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 3. Use Environment Variable Management

**For Production:**
- Use Oracle Cloud Vault or environment variable injection
- Never store secrets in code or config files
- Use secret rotation policies (90 days)

### 4. Enable GitHub Secret Scanning Alerts

1. Go to: https://github.com/YOUR_USERNAME/jollofexpress/settings/security_analysis
2. Enable "**Secret scanning**"
3. Enable "**Push protection**" (prevents future commits with secrets)

### 5. Create .env.example Template

Create `.env.example` (safe to commit):
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SECRET_KEY=your_secret_key_here

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_or_live_key_here
PAYSTACK_SECRET_KEY=sk_test_or_live_key_here

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=JollofExpress

# Printer Configuration
PRINTER_IP_ADDRESS=192.168.100.50
PRINTER_PORT=9100

# Security Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=generate_secure_random_string_here
WEBHOOK_SECRET=from_paystack_dashboard
PRINT_PROCESSOR_SECRET=generate_secure_random_string_here
```

---

## ✅ VERIFICATION CHECKLIST

After completing all actions, verify:

- [ ] .env.local removed from git history
- [ ] Force pushed to GitHub (history rewritten)
- [ ] Old Supabase keys revoked in dashboard
- [ ] New Supabase keys generated and working
- [ ] New secrets generated for JWT and print processor
- [ ] Local .env.local updated with new keys
- [ ] Application starts successfully: `npm run dev`
- [ ] Can place test order end-to-end
- [ ] Production server updated (if deployed)
- [ ] Database audit shows no suspicious activity
- [ ] GitHub secret scanning alerts closed
- [ ] Pre-commit hooks installed
- [ ] .env.example created and committed
- [ ] Team notified (if applicable)

---

## 📊 INCIDENT TIMELINE

| Time | Event |
|------|-------|
| ~20 hours ago | Keys committed to public repository |
| ~20 hours ago | GitHub secret scanning detected breach |
| 2025-10-22 18:18 | Incident discovered by user |
| 2025-10-22 18:20 | Remediation started |
| TBD | All keys rotated |
| TBD | Git history cleaned |
| TBD | Incident closed |

---

## 📞 SUPPORT CONTACTS

**Supabase Support:**
- Dashboard: https://supabase.com/dashboard/support
- Email: support@supabase.com

**Paystack Support:**
- Dashboard: https://dashboard.paystack.com/support
- Email: support@paystack.com

**GitHub Support:**
- Secret scanning: https://docs.github.com/en/code-security/secret-scanning

---

## 📚 LESSONS LEARNED

1. **Never commit .env files** - Always add to .gitignore first
2. **Use .env.example** - Commit template, not actual values
3. **Enable push protection** - Prevent secrets from being committed
4. **Rotate keys regularly** - Even without breaches
5. **Monitor access logs** - Detect unauthorized use early
6. **Separate test/prod keys** - Limit blast radius of breaches

---

## 🎯 NEXT STEPS AFTER REMEDIATION

1. **Implement secret management** - Use vault or secret manager
2. **Set up monitoring** - Alert on unusual database access
3. **Review access logs** - Weekly audit of API usage
4. **Update documentation** - Remove any other hardcoded secrets
5. **Team training** - Educate on secret management best practices

---

**Status:** 🔴 ACTIVE - Complete all actions above immediately
**Priority:** P0 - CRITICAL
**Owner:** Development Team
**Due:** Within 24 hours of discovery

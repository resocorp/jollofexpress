# Cron Job Setup Guide - Time-Based Auto-Closing

## Quick Start (5 minutes)

You need to call `/api/cron/check-hours` every 1-5 minutes to automatically open/close the restaurant based on operating hours.

---

## Option 1: Vercel Cron ⚡ (EASIEST - If using Vercel)

### Step 1: Create `vercel.json`

Add this file to your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-hours",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Step 2: Deploy
```bash
git add vercel.json
git commit -m "Add cron job for auto-closing"
git push
```

### Step 3: Verify

Vercel will automatically set up the cron job. Check logs:
```bash
vercel logs --follow
```

Look for: `🏪 Restaurant OPENED` or `⏰ No action needed`

**Done!** ✅

---

## Option 2: cron-job.org 🌐 (FREE - Works anywhere)

### Step 1: Create Account

1. Go to https://cron-job.org/en/signup/
2. Sign up (free)
3. Verify email

### Step 2: Create Cron Job

1. Click **"Create cronjob"**
2. **Title**: Restaurant Auto-Closing
3. **Address**: `https://yourdomain.com/api/cron/check-hours`
4. **Execution schedule**:
   - **Every**: 5 minutes
   - Or use: `*/5 * * * *`
5. **Request method**: GET
6. **Authentication** (if using CRON_SECRET):
   - Click "Advanced" → "Headers"
   - Add header:
     - **Name**: `Authorization`
     - **Value**: `Bearer your-secret-token-here`
7. Click **"Create cronjob"**

### Step 3: Test

1. Click "Execute now" in cron-job.org dashboard
2. Check execution log - should show 200 OK
3. Check your app logs for: `🏪 Restaurant OPENED` or `⏰ No action needed`

**Done!** ✅

---

## Option 3: EasyCron 💼 (Alternative free service)

### Step 1: Create Account

1. Go to https://www.easycron.com/user/register
2. Sign up (free tier: 20 jobs)

### Step 2: Create Cron Job

1. Click **"Create Cron Job"**
2. **URL to call**: `https://yourdomain.com/api/cron/check-hours`
3. **Cron Expression**: `*/5 * * * *` (every 5 minutes)
4. **HTTP Method**: GET
5. **HTTP Headers** (if using secret):
   ```
   Authorization: Bearer your-secret-token
   ```
6. Click **"Create"**

### Step 3: Test

1. Click "Test" button
2. Should show: Status 200
3. Check your app logs

**Done!** ✅

---

## Option 4: GitHub Actions 🔄 (If using GitHub)

### Step 1: Create Workflow File

Create `.github/workflows/restaurant-hours.yml`:

```yaml
name: Check Restaurant Hours

on:
  schedule:
    # Runs every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch:  # Allows manual trigger

jobs:
  check-hours:
    runs-on: ubuntu-latest
    steps:
      - name: Call Restaurant Hours API
        run: |
          curl -X GET https://yourdomain.com/api/cron/check-hours \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
               -H "Content-Type: application/json"
```

### Step 2: Add Secret (if using authentication)

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. **Name**: `CRON_SECRET`
4. **Value**: Your secret token
5. Click "Add secret"

### Step 3: Enable and Test

1. Commit and push the workflow file
2. Go to Actions tab
3. Click "Check Restaurant Hours"
4. Click "Run workflow" to test manually

**Note**: GitHub Actions has a minimum schedule of 5 minutes.

**Done!** ✅

---

## Option 5: UptimeRobot 📊 (BONUS: Also monitors uptime)

### Step 1: Create Account

1. Go to https://uptimerobot.com/signUp
2. Sign up (free)

### Step 2: Create Monitor

1. Click **"Add New Monitor"**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: Restaurant Hours Check
4. **URL**: `https://yourdomain.com/api/cron/check-hours`
5. **Monitoring Interval**: 5 minutes
6. **HTTP Method**: GET (Custom HTTP headers available in paid plan)
7. Click **"Create Monitor"**

**Limitations**: 
- Free plan doesn't support custom headers (can't use CRON_SECRET)
- Consider removing CRON_SECRET or using another option

**Done!** ✅

---

## Security: Setting Up CRON_SECRET (RECOMMENDED)

### Why Use a Secret?

Without authentication, anyone could call your cron endpoint and force the restaurant open/closed.

### Step 1: Generate Secret

**On Mac/Linux**:
```bash
openssl rand -base64 32
```

**On Windows PowerShell**:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Or use online**: https://www.random.org/strings/

Example output: `k8fD3nP2mQ9vL7xR4tY6hJ5gN8bM1wS0`

### Step 2: Add to .env.local

```bash
CRON_SECRET=k8fD3nP2mQ9vL7xR4tY6hJ5gN8bM1wS0
```

### Step 3: Add to Production Environment

**Vercel**:
```bash
vercel env add CRON_SECRET
# Paste your secret when prompted
```

**Or via Vercel dashboard**:
1. Go to Project → Settings → Environment Variables
2. Add `CRON_SECRET` with your value
3. Redeploy

### Step 4: Update Cron Service

Add header to your cron service:
```
Authorization: Bearer k8fD3nP2mQ9vL7xR4tY6hJ5gN8bM1wS0
```

---

## Testing Your Setup

### 1. Manual Test

```bash
# Without secret
curl https://yourdomain.com/api/cron/check-hours

# With secret
curl https://yourdomain.com/api/cron/check-hours \
  -H "Authorization: Bearer your-secret-here"
```

**Expected Response**:
```json
{
  "success": true,
  "action": "none",
  "message": "No action needed. Status: Open, Should be: Open",
  "details": {
    "currentlyOpen": true,
    "shouldBeOpen": true,
    "reason": "Within operating hours",
    "timestamp": "2025-10-23T14:30:00.000Z"
  }
}
```

### 2. Check Logs

**Vercel**:
```bash
vercel logs --follow
```

**Local**:
```bash
npm run dev
# Watch console output
```

Look for:
- `🏪 Restaurant OPENED: Within operating hours`
- `🏪 Restaurant CLOSED: Outside operating hours`
- `⏰ No action needed. Status: Open, Should be: Open`

### 3. Verify Auto-Closing Works

1. Set operating hours to close in 5 minutes
2. Wait for cron job to run
3. Check restaurant status: Should auto-close
4. Check logs for: `🏪 Restaurant CLOSED`

---

## Troubleshooting

### Cron Not Running?

**Check**:
1. Is cron service active? (Check cron-job.org dashboard)
2. Is URL correct? (Should include https://)
3. Is app deployed and accessible?

**Test**:
```bash
curl -I https://yourdomain.com/api/cron/check-hours
# Should return: HTTP/1.1 200 OK
```

### Getting 401 Unauthorized?

**Cause**: CRON_SECRET mismatch

**Fix**:
1. Check `.env.local` or Vercel env vars
2. Update cron service header
3. Or temporarily remove secret for testing:
   ```typescript
   // In app/api/cron/check-hours/route.ts
   // Comment out these lines:
   // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
   //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   // }
   ```

### Restaurant Not Auto-Closing?

**Possible Issues**:
1. Operating hours not configured in admin
2. Cron job not running
3. Current time outside configured hours but cron hasn't run yet

**Debug**:
```bash
# Manually trigger cron
curl https://yourdomain.com/api/cron/check-hours

# Check response - should show action taken
```

---

## Recommendations

### Production Setup

✅ **Use**: Vercel Cron (if on Vercel) or cron-job.org
✅ **Enable**: CRON_SECRET authentication
✅ **Monitor**: Set up alerts in cron service
✅ **Frequency**: Every 5 minutes (good balance)

### Development Setup

✅ **Use**: Manual curl commands for testing
✅ **Skip**: CRON_SECRET (for easier testing)
✅ **Test**: Various times and scenarios

---

## Monitoring

### Set Up Alerts

**cron-job.org**:
1. Go to Settings → Notifications
2. Enable email alerts on failure
3. Add your email

**Vercel**:
1. Go to Project → Settings → Notifications
2. Enable cron failure alerts

### Check Health Regularly

```bash
# Get last execution time
curl https://yourdomain.com/api/cron/check-hours

# Should show recent timestamp in response
```

---

## Cost

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| Vercel Cron | ✅ Unlimited (with hosting) | $20/mo (Pro) |
| cron-job.org | ✅ 3 jobs, 1 min interval | $4.99/mo |
| EasyCron | ✅ 20 jobs | $2.99/mo |
| GitHub Actions | ✅ 2000 min/mo | Pay as you go |
| UptimeRobot | ✅ 50 monitors | $7/mo |

**Recommendation**: Use **Vercel Cron** (if on Vercel) or **cron-job.org free tier** (works perfectly).

---

## Summary

1. ✅ Choose a cron service (Vercel or cron-job.org recommended)
2. ✅ Set schedule: `*/5 * * * *` (every 5 minutes)
3. ✅ Add endpoint: `https://yourdomain.com/api/cron/check-hours`
4. ✅ Add authentication header (recommended)
5. ✅ Test with manual trigger
6. ✅ Monitor logs for first day
7. ✅ Done!

**Setup Time**: 5-10 minutes  
**Maintenance**: None (set and forget)

---

## Next Steps

After setting up cron:

1. Configure operating hours in Admin → Settings → Hours
2. Test by setting closing time to 5 minutes from now
3. Wait for cron to run
4. Verify restaurant auto-closes
5. Check customer-facing menu shows correct hours

**Need Help?** Check logs for 🏪 emoji - that's your cron working!

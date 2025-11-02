# Localhost Troubleshooting Guide

## Issue: App works on ngrok but not on localhost

### Root Cause
The Kitchen Display System uses **client-side Supabase connections** for real-time features (print queue monitoring). When running on localhost, browsers enforce stricter CORS policies that can block Supabase API requests.

### Solution Steps

#### 1. Verify Environment Variables

First, ensure your `.env.local` file has all required variables:

```bash
# Check if .env.local exists
ls .env.local

# If not, copy from example
cp .env.example .env.local
```

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
# OR (legacy)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...

SUPABASE_SECRET_KEY=sb_secret_xxxxx
# OR (legacy)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

#### 2. Configure Supabase CORS Settings

**Option A: Add localhost to Supabase allowed origins (Recommended)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Scroll down to **CORS Configuration**
5. Add the following origins:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
6. Click **Save**

**Option B: Use Supabase Local Development**

If you need full offline development:
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# This will give you local URLs to use in .env.local
```

#### 3. Verify Browser Console

Open your browser's Developer Tools (F12) and check:

1. **Console Tab**: Look for error messages
   - ✅ Should see: `✅ Supabase client initialized for print handler`
   - ❌ If you see CORS errors, go back to Step 2
   - ❌ If you see "Missing environment variables", go back to Step 1

2. **Network Tab**: Check API requests
   - Filter by "supabase.co"
   - Look for failed requests (red)
   - Check the response headers for CORS errors

#### 4. Restart Development Server

After making changes to `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

**Important**: Next.js caches environment variables, so you MUST restart the dev server after changing `.env.local`.

#### 5. Clear Browser Cache

Sometimes browsers cache CORS policies:

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or use incognito/private mode to test.

### Common Error Messages

#### Error: "Access to fetch at 'https://xxx.supabase.co' has been blocked by CORS policy"

**Solution**: Add localhost to Supabase CORS settings (Step 2, Option A)

#### Error: "Missing Supabase API key"

**Solution**: 
1. Check `.env.local` exists in project root
2. Verify `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
3. Restart dev server

#### Error: "Failed to fetch" or "Network error"

**Possible causes**:
1. Supabase project is paused (check dashboard)
2. Internet connection issues
3. Firewall blocking Supabase domains
4. Invalid Supabase URL

### Testing Checklist

- [ ] `.env.local` file exists and has all required variables
- [ ] Environment variables start with `NEXT_PUBLIC_` for client-side access
- [ ] Supabase dashboard shows project is active (not paused)
- [ ] localhost:3000 is added to Supabase CORS settings
- [ ] Development server restarted after env changes
- [ ] Browser cache cleared
- [ ] Console shows "✅ Supabase client initialized"
- [ ] No CORS errors in browser console

### Still Having Issues?

1. **Check Supabase Status**: https://status.supabase.com/
2. **Verify API Keys**: 
   - Go to Supabase Dashboard → Settings → API
   - Copy fresh keys
   - Update `.env.local`
3. **Test with curl**:
   ```bash
   curl -H "apikey: YOUR_ANON_KEY" \
        -H "Authorization: Bearer YOUR_ANON_KEY" \
        https://YOUR_PROJECT.supabase.co/rest/v1/
   ```
4. **Check Supabase Logs**:
   - Dashboard → Logs → API Logs
   - Look for rejected requests from localhost

### Why ngrok Works but localhost Doesn't

- **ngrok** provides an HTTPS URL with a public domain
- Supabase CORS settings may have wildcards that match ngrok domains
- Browsers treat `localhost` differently than public domains
- Some Supabase features require HTTPS (ngrok provides this)

### Production Deployment

When deploying to production:
1. Add your production domain to Supabase CORS settings
2. Update `NEXT_PUBLIC_APP_URL` in environment variables
3. Use HTTPS (required for Supabase realtime features)

### Additional Resources

- [Supabase CORS Documentation](https://supabase.com/docs/guides/api/cors)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

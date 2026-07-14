/**
 * Tracking Worker — DISABLED 2026-05-25
 *
 * The geofence state machine this worker drove was false-firing
 * "Order Delivered!" customer notifications on rider QR scan. The geofence
 * is disabled in lib/delivery/geofence.ts; this worker now has no purpose
 * and exits immediately. Removed from ecosystem.config.js — stop the live
 * PM2 process with `sudo -u nodeapp pm2 stop tracking-worker` then
 * `pm2 save`. To re-enable, restore the body below and re-add the entry
 * in ecosystem.config.js after fixing the root causes (stale Traccar reads,
 * tight thresholds, no trip-start guard).
 */

console.log('[tracking] worker disabled — exiting');
process.exit(0);

// eslint-disable-next-line no-unreachable
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  });
  console.log('✅ Loaded .env.local');
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.TRACKING_WORKER_APP_URL || 'http://localhost:3000';
const POLL_INTERVAL = parseInt(process.env.TRACKING_POLL_INTERVAL || '15000', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('📍 Tracking Worker starting...');
console.log(`   Poll every ${POLL_INTERVAL / 1000}s`);
console.log(`   App URL: ${APP_URL}`);

async function activeDriverIds() {
  const { data, error } = await supabase
    .from('orders')
    .select('assigned_driver_id')
    .eq('status', 'out_for_delivery')
    .eq('order_type', 'delivery')
    .not('assigned_driver_id', 'is', null)
    .not('customer_latitude', 'is', null)
    .not('customer_longitude', 'is', null);
  if (error) {
    console.error('[tracking] active drivers query failed:', error.message);
    return [];
  }
  return [...new Set((data || []).map((r) => r.assigned_driver_id))];
}

async function pokeDriver(driverId) {
  try {
    const res = await fetch(`${APP_URL}/api/drivers/${driverId}/location`, {
      method: 'GET',
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '');
      console.error(`[tracking] ${driverId}: ${res.status} ${body.substring(0, 200)}`);
    }
  } catch (err) {
    console.error(`[tracking] ${driverId} fetch failed:`, err.message);
  }
}

async function runOnce() {
  const driverIds = await activeDriverIds();
  if (driverIds.length === 0) return;
  console.log(`[tracking] poking ${driverIds.length} driver(s)`);
  await Promise.all(driverIds.map(pokeDriver));
}

async function loop() {
  try {
    await runOnce();
  } catch (err) {
    console.error('[tracking] tick error:', err);
  } finally {
    setTimeout(loop, POLL_INTERVAL);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Tracking worker shutting down');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n🛑 Tracking worker shutting down (SIGTERM)');
  process.exit(0);
});

setTimeout(loop, 10_000);

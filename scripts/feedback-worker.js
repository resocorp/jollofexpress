/**
 * Feedback Request Worker
 *
 * Polls for completed orders that are >=45 min old but <24h old, with no
 * feedback request sent yet, and sends a WhatsApp prompt asking the customer
 * for a rating. The AI handler (`lib/ai/whatsapp-ai.ts` + `submit_feedback`
 * tool) then records the customer's reply.
 *
 * Why a separate worker: feedback requests need to fire on a timer tied to
 * `orders.completed_at`, not on any HTTP event. Mirrors `print-worker.js`
 * under PM2.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *   BAILEYS_SIDECAR_URL (default http://localhost:3001)
 *   BAILEYS_API_SECRET
 *   FEEDBACK_WORKER_APP_URL (default http://localhost:3000) — for log-outbound
 *   FEEDBACK_POLL_INTERVAL (default 300000 ms = 5 min)
 *   FEEDBACK_DELAY_MIN / FEEDBACK_DELAY_MAX (minutes; default 45 / 1440)
 */

const path = require('path');
const fs = require('fs');

// Load .env.local if present (same pattern as print-worker.js)
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
const BAILEYS_URL = process.env.BAILEYS_SIDECAR_URL || 'http://localhost:3001';
const BAILEYS_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';
const APP_URL = process.env.FEEDBACK_WORKER_APP_URL || 'http://localhost:3000';
const POLL_INTERVAL = parseInt(process.env.FEEDBACK_POLL_INTERVAL || '300000', 10);
const DELAY_MIN = parseInt(process.env.FEEDBACK_DELAY_MIN || '45', 10);
const DELAY_MAX = parseInt(process.env.FEEDBACK_DELAY_MAX || '1440', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('📝 Feedback Request Worker starting...');
console.log(`   Poll every ${POLL_INTERVAL / 1000}s`);
console.log(`   Delay window: ${DELAY_MIN}–${DELAY_MAX} min after completion`);

function buildPrompt(order) {
  const name = (order.customer_name || '').split(' ')[0] || 'there';
  return (
    `🌯 *How was your order, ${name}?*\n\n` +
    `Order #${order.order_number}\n\n` +
    `Reply with a rating *1–5* (5 = best) and a quick comment if you'd like.\n` +
    `_Example:_ "5 — was amazing, thanks!"\n\n` +
    `_- myshawarma.express 🌯_`
  );
}

async function sendViaBaileys(phone, message) {
  const res = await fetch(`${BAILEYS_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Secret': BAILEYS_SECRET,
    },
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Baileys /send ${res.status}: ${body.substring(0, 200)}`);
  }
  return res.json();
}

async function logToSession(phone, message) {
  try {
    await fetch(`${APP_URL}/api/whatsapp/log-outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': BAILEYS_SECRET,
      },
      body: JSON.stringify({ phone, message, source: 'system' }),
    });
  } catch (err) {
    console.error(`[feedback] log-outbound failed for ${phone}:`, err.message);
  }
}

async function runOnce() {
  const now = Date.now();
  const maxCompletedAt = new Date(now - DELAY_MIN * 60_000).toISOString();
  const minCompletedAt = new Date(now - DELAY_MAX * 60_000).toISOString();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_phone, customer_name, completed_at')
    .eq('status', 'completed')
    .lt('completed_at', maxCompletedAt)
    .gt('completed_at', minCompletedAt)
    .is('feedback_requested_at', null)
    .limit(25);

  if (error) {
    console.error('[feedback] query failed:', error.message);
    return;
  }

  if (!orders?.length) return;

  // Exclude orders that already have a feedback row (should be rare — dedupe defense).
  const ids = orders.map((o) => o.id);
  const { data: alreadyRated } = await supabase
    .from('order_feedback')
    .select('order_id')
    .in('order_id', ids);
  const ratedSet = new Set((alreadyRated || []).map((r) => r.order_id));

  for (const order of orders) {
    if (ratedSet.has(order.id)) continue;
    if (!order.customer_phone) continue;

    const message = buildPrompt(order);
    try {
      await sendViaBaileys(order.customer_phone, message);
      await supabase
        .from('orders')
        .update({ feedback_requested_at: new Date().toISOString() })
        .eq('id', order.id);
      await logToSession(order.customer_phone, message);
      console.log(`📝 Feedback prompt sent for ${order.order_number}`);
    } catch (err) {
      console.error(`[feedback] failed for ${order.order_number}:`, err.message);
    }
  }
}

async function loop() {
  try {
    await runOnce();
  } catch (err) {
    console.error('[feedback] tick error:', err);
  } finally {
    setTimeout(loop, POLL_INTERVAL);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Feedback worker shutting down');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n🛑 Feedback worker shutting down (SIGTERM)');
  process.exit(0);
});

// Kick off on a short delay to let the app come up first
setTimeout(loop, 10_000);

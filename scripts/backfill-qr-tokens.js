#!/usr/bin/env node
// One-shot: backfill qr_token for orders that don't yet have one, in any status
// still eligible for dispatch. Safe to re-run (skips orders with tokens).
require('dotenv').config({ path: '/opt/jollofexpress/.env.local' });
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const secret = process.env.QR_SIGNING_SECRET;
if (!secret || secret.length < 16) {
  console.error('QR_SIGNING_SECRET missing or too short');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signOrderToken(orderId) {
  const idPart = b64url(Buffer.from(orderId, 'utf8'));
  const mac = crypto.createHmac('sha256', secret).update(orderId).digest().subarray(0, 16);
  return `${idPart}.${b64url(mac)}`;
}

async function main() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, status')
    .is('qr_token', null)
    .in('status', ['pending', 'scheduled', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);

  if (error) {
    console.error('Fetch failed:', error);
    process.exit(1);
  }

  console.log(`Found ${orders.length} orders needing qr_token`);

  let updated = 0;
  for (const order of orders) {
    const token = signOrderToken(order.id);
    const { error: updErr } = await supabase
      .from('orders')
      .update({ qr_token: token })
      .eq('id', order.id);
    if (updErr) {
      console.error(`Failed for ${order.order_number}:`, updErr.message);
    } else {
      updated++;
    }
  }

  console.log(`Backfilled ${updated}/${orders.length} orders`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * One-shot manual feedback import.
 *
 * Source data is the WhatsApp transcript paste from the user — feedback that
 * customers gave but never landed in `order_feedback` because of the AI-side
 * lookup bug fixed in Phase 1/2. Each row is human-attributed to a specific
 * order number, so confidence is high.
 *
 * Source label is 'whatsapp_manual' so dashboard filters can distinguish
 * these from live submissions and the recovery-script entries.
 *
 * Usage: node scripts/import-manual-feedback.js [--dry-run]
 */
const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '../.env.local');
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      const value = rest.join('=').trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DRY_RUN = process.argv.includes('--dry-run');

// Lagos timezone is UTC+01:00. ISO timestamps are explicit about that.
const ENTRIES = [
  { order: 'ORD-20260429-2789', rating: 5, comment: 'I enjoyed it', when: '2026-04-29T21:42:00+01:00' },
  { order: 'ORD-20260429-9191', rating: 5, comment: "I will rate a solid 5, cus it's soo creamy, tasty and affordable", when: '2026-04-29T20:54:00+01:00' },
  { order: 'ORD-20260427-9415', rating: 4, comment: "3.5 — it's nice", when: '2026-04-27T22:28:00+01:00' },
  { order: 'ORD-20260429-9432', rating: 5, comment: "It tastes so good and it's very creamy. I enjoyed it to the fullest.", when: '2026-04-29T22:02:00+01:00' },
  { order: 'ORD-20260429-1523', rating: 5, comment: 'Received, nice — I enjoyed it', when: '2026-04-29T19:50:00+01:00' },
  { order: 'ORD-20260428-5632', rating: 5, comment: null, when: '2026-04-29T15:20:00+01:00' },
  { order: 'ORD-20260429-3780', rating: 2, comment: "I honestly didn't like the shawarma — it was too spicy and I wasn't really feeling the chicken in it (in terms of taste), and it's my first time. But the packaging and delivery was amazing. I hope you do something about it.", when: '2026-04-30T08:19:00+01:00' },
  { order: 'ORD-20260429-5845', rating: 5, comment: null, when: '2026-04-29T21:38:00+01:00' },
  { order: 'ORD-20260429-4758', rating: 4, comment: 'Loved the level of pepper, thanks', when: '2026-04-29T21:33:00+01:00' },
  { order: 'ORD-20260429-1222', rating: 5, comment: "It was so good 👍👍", when: '2026-04-29T21:25:00+01:00' },
  { order: 'ORD-20260429-9160', rating: 4, comment: 'For the price, it was really nice', when: '2026-04-29T21:21:00+01:00' },
  { order: 'ORD-20260429-8140', rating: 5, comment: 'It was so nice honestly — I enjoyed it', when: '2026-04-29T21:20:00+01:00' },
  { order: 'ORD-20260429-5581', rating: 3, comment: 'Was good, but I hardly saw any beef', when: '2026-04-29T22:25:00+01:00' },
  { order: 'ORD-20260429-6090', rating: 5, comment: "It's really nice", when: '2026-04-29T22:08:00+01:00' },
  { order: 'ORD-20260427-3128', rating: 3, comment: '2.5 — was just there-ish, thanks!', when: '2026-04-27T19:58:00+01:00' },
  { order: 'ORD-20260425-7348', rating: 4, comment: 'The shawarma is soo nice and spicy the way I love. Please increase time limit in case of urgent craving. (Order had a mix-up — acknowledged by the team — but it was what was paid for.)', when: '2026-04-25T18:32:00+01:00' },
  { order: 'ORD-20260425-5718', rating: 4, comment: null, when: '2026-04-26T05:59:00+01:00' },
  { order: 'ORD-20260425-2137', rating: 3, comment: null, when: '2026-04-25T21:07:00+01:00' },
  { order: 'ORD-20260423-3532', rating: 5, comment: null, when: '2026-04-23T19:32:00+01:00' },
  { order: 'ORD-20260424-0085', rating: 5, comment: 'I really enjoyed my order', when: '2026-04-24T19:06:00+01:00' },
  { order: 'ORD-20260423-1041', rating: 5, comment: 'I really loved it — tasty and very spicy too. My boyfriend loved it too.', when: '2026-04-24T13:37:00+01:00' },
  { order: 'ORD-20260418-5856', rating: 4, comment: 'It was nice', when: '2026-04-22T15:25:00+01:00' },
  { order: 'ORD-20260419-2301', rating: 5, comment: 'But small', when: '2026-04-20T19:52:00+01:00' },
  { order: 'ORD-20260418-1035', rating: 4, comment: 'Nice', when: '2026-04-18T20:20:00+01:00' },
  { order: 'ORD-20260417-1510', rating: 5, comment: 'I really enjoyed it. Thanks a bunch. Will definitely patronize again', when: '2026-04-17T17:39:00+01:00' },
  { order: 'ORD-20260417-3104', rating: 5, comment: 'I love it 🥹', when: '2026-04-17T14:21:00+01:00' },
  { order: 'ORD-20260417-5262', rating: 4, comment: 'It was definitely amazing and worth the buy', when: '2026-04-17T14:12:00+01:00' },
];

(async () => {
  console.log(`📥 Manual feedback import — ${ENTRIES.length} entries — mode: ${DRY_RUN ? 'dry-run' : 'COMMIT'}`);

  const orderNums = ENTRIES.map((e) => e.order);
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_phone')
    .in('order_number', orderNums);
  if (error) throw error;

  const byNum = new Map(orders.map((o) => [o.order_number, o]));
  const missing = orderNums.filter((n) => !byNum.has(n));
  if (missing.length) {
    console.warn(`⚠  Missing orders (will skip):`, missing);
  }

  let inserted = 0;
  let duplicate = 0;
  let skipped = 0;

  for (const e of ENTRIES) {
    const order = byNum.get(e.order);
    if (!order) {
      skipped++;
      continue;
    }
    const row = {
      order_id: order.id,
      customer_phone: order.customer_phone,
      rating: e.rating,
      comment: e.comment,
      submitted_at: e.when,
      source: 'whatsapp_manual',
    };

    if (DRY_RUN) {
      console.log(`  [dry] ${e.order}  rating=${e.rating}  ${e.comment ? `"${e.comment.substring(0, 60)}…"` : '(no comment)'}`);
      inserted++;
      continue;
    }

    const { error: upErr } = await supabase.from('order_feedback').insert(row);
    if (upErr) {
      if (upErr.code === '23505') {
        duplicate++;
        console.log(`  ⏭ ${e.order}  already has feedback — skipped`);
        continue;
      }
      console.error(`  ❌ ${e.order}  insert failed:`, upErr.message);
      skipped++;
      continue;
    }
    inserted++;
    console.log(`  ✅ ${e.order}  rating=${e.rating}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Duplicate (skipped): ${duplicate}`);
  console.log(`Other skipped: ${skipped}`);
  if (!DRY_RUN) console.log('Run scripts/backfill-feedback-sentiment.js to score these.');
})().catch((err) => { console.error(err); process.exit(1); });

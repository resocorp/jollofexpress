/**
 * Backfill — score sentiment + themes on every order_feedback row that
 * doesn't have them yet. Runs once after the Phase 4 migration; also covers
 * any rows where live scoring failed and the recovered rows from Phase 3.
 *
 * Usage: node scripts/backfill-feedback-sentiment.js [--limit=N]
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SERVICE_ROLE_KEY),
 *      ANTHROPIC_API_KEY, AI_SENTIMENT_MODEL (default 'claude-haiku-4-5')
 */

const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
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
}

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk').default;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.AI_SENTIMENT_MODEL || 'claude-haiku-4-5';

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('❌ Missing required env (Supabase + Anthropic)');
  process.exit(1);
}

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const FEEDBACK_THEMES = [
  'food_quality',
  'delivery_speed',
  'delivery_accuracy',
  'temperature',
  'packaging',
  'price',
  'customer_service',
  'app_experience',
  'other',
];

const SYSTEM = `You analyze short customer feedback about a Nigerian food-delivery restaurant. Output STRICT JSON only — no prose, no code fences. Schema:
{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": number,
  "themes": string[]
}

Rules:
- Anchor sentiment to the rating: 5 → positive, 1–2 → negative, 3 → neutral by default unless comment is clearly polar.
- sentiment_score: 5 ≈ +0.8..+1.0, 4 ≈ +0.3..+0.7, 3 ≈ -0.2..+0.2, 2 ≈ -0.5..-0.8, 1 ≈ -0.8..-1.0.
- themes: subset of food_quality, delivery_speed, delivery_accuracy, temperature, packaging, price, customer_service, app_experience, other. Empty array if none clearly applies.`;

async function score(rating, comment) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Rating: ${rating}/5\nComment: ${comment?.trim() || '(none)'}`,
      },
    ],
  });
  const raw = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(raw);
  if (!['positive', 'neutral', 'negative'].includes(parsed.sentiment)) return null;
  const themes = Array.isArray(parsed.themes)
    ? parsed.themes.filter((t) => FEEDBACK_THEMES.includes(t))
    : [];
  return {
    sentiment: parsed.sentiment,
    sentiment_score: Math.max(-1, Math.min(1, Number(parsed.sentiment_score) || 0)),
    themes,
  };
}

async function main() {
  console.log(`🧠 Backfilling feedback sentiment — model: ${MODEL}, limit: ${LIMIT}`);

  const { data: rows, error } = await supabase
    .from('order_feedback')
    .select('id, rating, comment')
    .is('sentiment', null)
    .order('submitted_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} unscored rows.`);
  let scored = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const out = await score(row.rating, row.comment);
      if (!out) {
        failed++;
        continue;
      }
      const { error: upErr } = await supabase
        .from('order_feedback')
        .update({
          sentiment: out.sentiment,
          sentiment_score: out.sentiment_score,
          themes: out.themes,
        })
        .eq('id', row.id);
      if (upErr) throw upErr;
      scored++;
      if (scored % 25 === 0) console.log(`  ${scored}/${rows.length} scored…`);
    } catch (err) {
      console.error(`[backfill] row ${row.id} failed:`, err.message);
      failed++;
    }
  }

  console.log(`\n✅ Done. Scored: ${scored}, failed: ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

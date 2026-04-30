/**
 * Feedback Recovery — One-Shot Script
 *
 * Recovers customer feedback that was sent on WhatsApp but never attached to
 * the order (the bug fixed in Phase 1/2). Source of truth is the JSONB session
 * history in `whatsapp_ai_sessions.messages` — `whatsapp_message_log` is dead
 * code in this codebase.
 *
 * IMPORTANT: any reply that has been pushed past the 40-message-per-session
 * trim is unrecoverable. The script reports those as "no_session_message".
 *
 * Two-pass workflow:
 *   node scripts/recover-feedback.js --dry-run   → writes tmp/feedback-recovery-<date>.csv
 *   node scripts/recover-feedback.js --commit    → inserts rows where confidence ≥ 0.7
 *                                                   with source='whatsapp_recovered'
 *
 * Env (loaded from .env.local same as feedback-worker):
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *   ANTHROPIC_API_KEY
 *   AI_RECOVERY_MODEL (default 'claude-haiku-4-5')
 */

const path = require('path');
const fs = require('fs');

// Load .env.local (same pattern as print-worker / feedback-worker)
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
}

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk').default;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.AI_RECOVERY_MODEL || 'claude-haiku-4-5';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('❌ Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const COMMIT = args.has('--commit');
if (DRY_RUN === COMMIT) {
  console.error('Specify exactly one of --dry-run or --commit');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// Mirror lib/whatsapp/identity.ts:phoneVariants — kept inline because this
// script doesn't go through the Next bundler.
function normalizePhone(input) {
  if (!input) return '';
  let cleaned = String(input).replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
  else if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
  return cleaned;
}
function phoneVariants(input) {
  const canonical = normalizePhone(input);
  if (!canonical) return [];
  const local10 = canonical.startsWith('234') ? canonical.substring(3) : canonical;
  const set = new Set([canonical, `+${canonical}`, `0${local10}`, local10]);
  const raw = String(input || '').trim();
  if (raw) set.add(raw);
  return Array.from(set);
}

// Pre-pass: scan every LID-keyed session for any ORD-XXX reference; look up
// those orders to discover the customer phone the LID belongs to. The
// runtime whatsapp_lid_map is empty for historical sessions, so this fills
// the gap for recovery purposes only.
async function buildLidToPhoneMap() {
  const orderRe = /\bORD-\d{8}-\d{4}\b/g;
  let from = 0;
  const PAGE = 500;
  const lidToOrders = new Map(); // sessionPhone → Set<order_number>

  while (true) {
    const { data, error } = await supabase
      .from('whatsapp_ai_sessions')
      .select('phone, messages')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const s of data) {
      if (/^234\d{8,12}$/.test(s.phone)) continue; // skip phone-keyed
      const msgs = s.messages || [];
      const found = new Set();
      for (const m of msgs) {
        const matches = (m.content || '').match(orderRe);
        if (matches) for (const x of matches) found.add(x);
      }
      if (found.size) lidToOrders.set(s.phone, found);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const allNums = new Set();
  for (const set of lidToOrders.values()) for (const n of set) allNums.add(n);
  if (!allNums.size) return new Map();

  const { data: orders } = await supabase
    .from('orders')
    .select('order_number, customer_phone')
    .in('order_number', [...allNums]);
  const phoneByOrder = new Map((orders || []).map((o) => [o.order_number, o.customer_phone]));

  // session phone → canonical phone (only when unambiguous: all referenced
  // orders agree on one customer phone after normalization)
  const map = new Map();
  for (const [lid, ords] of lidToOrders) {
    const canonicals = new Set();
    for (const n of ords) {
      const p = phoneByOrder.get(n);
      if (p) canonicals.add(normalizePhone(p));
    }
    if (canonicals.size === 1) map.set(lid, [...canonicals][0]);
  }
  console.log(`LID-self-ID pre-pass: ${map.size} LIDs mapped to phones (from ${lidToOrders.size} candidate LID sessions).`);
  return map;
}

async function findOrphanOrders() {
  // Orders with a feedback prompt sent but no order_feedback row.
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, completed_at, feedback_requested_at, total')
    .not('feedback_requested_at', 'is', null)
    .eq('status', 'completed')
    .order('feedback_requested_at', { ascending: false });
  if (error) throw error;

  const ids = orders.map((o) => o.id);
  if (!ids.length) return [];

  const { data: rated } = await supabase
    .from('order_feedback')
    .select('order_id')
    .in('order_id', ids);
  const ratedSet = new Set((rated || []).map((r) => r.order_id));

  return orders.filter((o) => !ratedSet.has(o.id));
}

// Find every session that belongs to this order's customer:
//   1. Direct phone-keyed sessions (variants of order.customer_phone).
//   2. LID-keyed sessions resolved via:
//      a. whatsapp_lid_map (runtime cache; usually empty for historical data)
//      b. inferredLidMap (built by buildLidToPhoneMap from session contents)
async function findSessionsForOrder(order, inferredLidMap) {
  const variants = phoneVariants(order.customer_phone);
  if (!variants.length) return [];

  // Strategy 1: phone-keyed.
  const { data: phoneSessions } = await supabase
    .from('whatsapp_ai_sessions')
    .select('phone, messages, last_activity')
    .in('phone', variants);

  // Strategy 2a: LID-keyed via runtime lid_map.
  const { data: mappings } = await supabase
    .from('whatsapp_lid_map')
    .select('lid_jid, phone')
    .in('phone', variants);

  const lidPhonesFromMap = (mappings || [])
    .map((m) => m.lid_jid.replace(/@lid$/, ''))
    .filter(Boolean);

  // Strategy 2b: LID-keyed via inferred map (built from session contents).
  const canonical = normalizePhone(order.customer_phone);
  const lidPhonesFromInferred = [];
  for (const [lid, phone] of inferredLidMap) {
    if (phone === canonical) lidPhonesFromInferred.push(lid);
  }

  const allLidPhones = [...new Set([...lidPhonesFromMap, ...lidPhonesFromInferred])];

  let lidSessions = [];
  if (allLidPhones.length) {
    const { data } = await supabase
      .from('whatsapp_ai_sessions')
      .select('phone, messages, last_activity')
      .in('phone', allLidPhones);
    lidSessions = data || [];
  }

  return [...(phoneSessions || []), ...lidSessions];
}

// Collect candidate user replies from a session.
//   Strategy A (phone-keyed): find the prompt referencing this order, take
//                              user messages after it.
//   Strategy B (LID-keyed):   prompt isn't in this session, so use
//                              feedback_requested_at as the anchor and take
//                              user messages timestamped after, within 7d.
//
// Returns { source: 'phone-session'|'lid-session', candidates: [...] } or null.
function extractCandidateReplies(session, order) {
  if (!session?.messages?.length) return null;
  const messages = session.messages;
  const orderNum = order.order_number;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Strategy A: prompt is in this session.
  const promptIdx = messages.findIndex(
    (m) =>
      m.source === 'system' &&
      typeof m.content === 'string' &&
      /how was your order/i.test(m.content) &&
      m.content.includes(orderNum)
  );
  if (promptIdx !== -1) {
    const promptTs = messages[promptIdx].timestamp
      ? new Date(messages[promptIdx].timestamp).getTime()
      : null;
    const candidates = [];
    for (let i = promptIdx + 1; i < messages.length && candidates.length < 3; i++) {
      const m = messages[i];
      if (m.role !== 'user') continue;
      if (promptTs && m.timestamp) {
        const ts = new Date(m.timestamp).getTime();
        if (ts - promptTs > sevenDaysMs) break;
      }
      candidates.push(m);
    }
    if (candidates.length) {
      return { source: 'phone-session', sessionPhone: session.phone, candidates };
    }
  }

  // Strategy B: LID-keyed (or any session where the prompt landed elsewhere).
  // Anchor on the order's feedback_requested_at: take the first 1–3 user
  // messages timestamped after that, within 7 days.
  const anchorTs = order.feedback_requested_at
    ? new Date(order.feedback_requested_at).getTime()
    : null;
  if (!anchorTs) return null;

  const candidates = [];
  for (const m of messages) {
    if (m.role !== 'user') continue;
    if (!m.timestamp) continue;
    const ts = new Date(m.timestamp).getTime();
    if (ts < anchorTs) continue;
    if (ts - anchorTs > sevenDaysMs) break;
    candidates.push(m);
    if (candidates.length >= 3) break;
  }
  if (!candidates.length) return null;
  return { source: 'lid-session', sessionPhone: session.phone, candidates };
}

const CLASSIFY_SYSTEM = `You classify customer-support WhatsApp replies. The customer was asked to rate a recent food order on a scale of 1 (worst) to 5 (best). Decide whether their messages are feedback about that order.

Output STRICT JSON only, no prose. Schema:
{
  "is_feedback": boolean,
  "rating": 1|2|3|4|5|null,
  "comment": string|null,
  "sentiment": "positive"|"neutral"|"negative"|null,
  "confidence": number  // 0.0 to 1.0
}

Rules:
- is_feedback=true only if the messages clearly relate to that recent order's quality (food, delivery, service, packaging). Generic chatter, greetings, new orders, or unrelated questions are NOT feedback.
- If no number is given, infer rating from sentiment: great/amazing/loved → 5, good/nice → 4, ok/fine → 3, slow/cold/disappointing → 2, terrible/awful/never again → 1.
- comment = the customer's own words (concatenated if multiple), trimmed. Null if there's nothing useful to keep.
- confidence: how sure you are this is feedback for THIS order. Be conservative — 0.5 means coin flip.`;

async function classifyCandidates(order, candidates) {
  const text = candidates.map((c) => c.content).join('\n---\n');
  const userMsg =
    `Order: #${order.order_number}\n` +
    `Customer: ${order.customer_name || '(unknown)'}\n` +
    `Total: NGN ${order.total}\n` +
    `Completed at: ${order.completed_at}\n\n` +
    `Customer reply(ies) following the feedback prompt:\n"""\n${text}\n"""`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });
  const out = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  // Strip code fences if the model added them.
  const cleaned = out.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`[recover] JSON parse failed for ${order.order_number}:`, cleaned.substring(0, 200));
    return { is_feedback: false, rating: null, comment: null, sentiment: null, confidence: 0 };
  }
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log(`🔍 Feedback recovery — mode: ${DRY_RUN ? 'dry-run' : 'COMMIT'} — model: ${MODEL}`);

  const inferredLidMap = await buildLidToPhoneMap();
  const orphans = await findOrphanOrders();
  console.log(`Found ${orphans.length} orders with feedback_requested_at set but no order_feedback row.`);

  const rows = [];
  let recovered = 0;
  let skippedNoSession = 0;
  let skippedLowConfidence = 0;
  let skippedNotFeedback = 0;
  let skippedAlreadyClaimed = 0;

  // Prevent the same user message being attributed to multiple orphan orders.
  // Key: `${sessionPhone}|${message.timestamp}|${message.content.length}`
  const claimedMessages = new Set();

  // Newest-first → each user reply gets attributed to the most recent prompt
  // it could plausibly answer.
  orphans.sort(
    (a, b) =>
      new Date(b.feedback_requested_at).getTime() -
      new Date(a.feedback_requested_at).getTime()
  );

  for (const order of orphans) {
    const sessions = await findSessionsForOrder(order, inferredLidMap);
    if (!sessions.length) {
      rows.push({ order, status: 'no_session', verdict: null });
      skippedNoSession++;
      continue;
    }
    // Try every matching session; prefer phone-session matches over lid-session.
    let extracted = null;
    for (const s of sessions) {
      const r = extractCandidateReplies(s, order);
      if (!r) continue;
      if (r.source === 'phone-session') { extracted = r; break; }
      if (!extracted) extracted = r;
    }
    if (!extracted) {
      rows.push({ order, status: 'no_session_message', verdict: null });
      skippedNoSession++;
      continue;
    }

    // Drop already-claimed messages (a more recent orphan got them first).
    const fresh = extracted.candidates.filter((m) => {
      const k = `${extracted.sessionPhone}|${m.timestamp}|${(m.content || '').length}`;
      return !claimedMessages.has(k);
    });
    if (!fresh.length) {
      rows.push({ order, status: 'already_claimed', verdict: null });
      skippedAlreadyClaimed++;
      continue;
    }
    extracted.candidates = fresh;

    let verdict;
    try {
      verdict = await classifyCandidates(order, extracted.candidates);
    } catch (err) {
      console.error(`[recover] classify failed for ${order.order_number}:`, err.message);
      rows.push({ order, status: 'classify_error', verdict: null });
      continue;
    }

    const candidateText = extracted.candidates.map((c) => c.content).join(' | ');
    const matchInfo = `${extracted.source}:${extracted.sessionPhone}`;

    if (!verdict.is_feedback) {
      rows.push({ order, status: 'not_feedback', verdict, candidateText, matchInfo });
      skippedNotFeedback++;
      continue;
    }
    if (!verdict.rating || verdict.confidence < 0.8) {
      rows.push({ order, status: 'low_confidence', verdict, candidateText, matchInfo });
      skippedLowConfidence++;
      continue;
    }

    const submittedAt =
      extracted.candidates[0].timestamp || order.feedback_requested_at;

    if (COMMIT) {
      const { error } = await supabase.from('order_feedback').insert({
        order_id: order.id,
        customer_phone: order.customer_phone,
        rating: verdict.rating,
        comment: verdict.comment || null,
        submitted_at: submittedAt,
        source: 'whatsapp_recovered',
      });
      if (error && error.code !== '23505') {
        console.error(`[recover] insert failed for ${order.order_number}:`, error.message);
        rows.push({ order, status: 'insert_failed', verdict, candidateText: extracted.candidates.map((c) => c.content).join(' | ') });
        continue;
      }
    }

    recovered++;
    // Mark these messages as claimed so older orphans don't grab them too.
    for (const m of extracted.candidates) {
      claimedMessages.add(
        `${extracted.sessionPhone}|${m.timestamp}|${(m.content || '').length}`
      );
    }
    rows.push({
      order,
      status: COMMIT ? 'committed' : 'would_commit',
      verdict,
      candidateText,
      matchInfo,
    });
    console.log(
      `${COMMIT ? '✅' : '📝'} ${order.order_number}  rating=${verdict.rating}  conf=${verdict.confidence.toFixed(2)}  ${verdict.sentiment}  via ${extracted.source}`
    );
  }

  // Always write the CSV — useful audit trail for both dry-run and commit.
  const tmpDir = path.resolve(__dirname, '../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const csvPath = path.join(tmpDir, `feedback-recovery-${stamp}.csv`);
  const header =
    'order_number,customer_phone,completed_at,status,match_source,rating,confidence,sentiment,comment,candidate_text';
  const lines = rows.map((r) =>
    [
      r.order.order_number,
      r.order.customer_phone,
      r.order.completed_at,
      r.status,
      r.matchInfo ?? '',
      r.verdict?.rating ?? '',
      r.verdict?.confidence ?? '',
      r.verdict?.sentiment ?? '',
      r.verdict?.comment ?? '',
      r.candidateText ?? '',
    ]
      .map(csvEscape)
      .join(',')
  );
  fs.writeFileSync(csvPath, [header, ...lines].join('\n') + '\n');

  console.log('\n--- Summary ---');
  console.log(`Total orphan orders: ${orphans.length}`);
  console.log(`Recovered: ${recovered}`);
  console.log(`Skipped (no session/message): ${skippedNoSession}`);
  console.log(`Skipped (already claimed): ${skippedAlreadyClaimed}`);
  console.log(`Skipped (not feedback): ${skippedNotFeedback}`);
  console.log(`Skipped (low confidence): ${skippedLowConfidence}`);
  console.log(`CSV: ${csvPath}`);
  if (DRY_RUN) {
    console.log('\nNothing was written to order_feedback. Review the CSV, then re-run with --commit.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Baileys WhatsApp Sidecar Server
 * 
 * Standalone Express server that manages the Baileys WhatsApp connection.
 * Runs as a PM2 process alongside the Next.js app.
 * 
 * Endpoints:
 *   POST /send         - Send a WhatsApp message
 *   POST /send-bulk    - Send multiple messages with stagger delay
 *   GET  /status       - Get connection status
 *   GET  /qr           - Get QR code for scanning
 *   POST /reconnect    - Force reconnect
 *   GET  /health       - Basic health check
 * 
 * Usage:
 *   node scripts/baileys-server.js
 *   pm2 start scripts/baileys-server.js --name whatsapp-service
 */

// Load .env.local before anything else
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';
const AUTH_STORE_PATH = path.join(__dirname, '..', 'auth_store', 'whatsapp');

// AI Chat: forward incoming messages to the AI handler
const AI_CHAT_ENABLED = process.env.AI_CHAT_ENABLED === 'true';
const AI_CHAT_PROCESS_URL = process.env.AI_CHAT_URL || 'http://localhost:3000/api/whatsapp/ai';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const IDENTITY_RESOLVE_URL = `${APP_URL}/api/whatsapp/identity/resolve`;
// Phones that should NOT trigger AI (e.g., admin numbers)
const AI_CHAT_IGNORE_PHONES = (process.env.AI_CHAT_IGNORE_PHONES || '').split(',').filter(Boolean);

// Verbose-drop toggle. Set DEBUG_DROPS=1 in env to log every dropped message
// with its reason. Off by default to keep production logs quiet.
const DEBUG_DROPS = process.env.DEBUG_DROPS === '1';
function logDrop(msg, reason) {
  if (!DEBUG_DROPS) return;
  const jid = msg?.key?.remoteJid || '?';
  const id = msg?.key?.id || '?';
  console.log(`🗑️  drop ${reason} jid=${jid} id=${id}`);
}

/**
 * Ask the Next.js app to resolve a remoteJid (and optional senderPn) to the
 * canonical phone we use as the AI session key. The endpoint also persists
 * any new lid → phone mapping it learns.
 *
 * Returns null on failure so the caller can fall back to the bare-strip
 * behaviour without breaking the AI flow.
 */
async function resolveCanonicalPhone(remoteJid, msg) {
  try {
    const senderPn = msg?.key?.senderPn || msg?.key?.participantPn || null;
    const pushName = msg?.pushName || null;
    const res = await fetch(IDENTITY_RESOLVE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': API_SECRET,
      },
      body: JSON.stringify({ remoteJid, senderPn, pushName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.canonicalPhone || null;
  } catch (err) {
    console.error('identity/resolve failed:', err.message);
    return null;
  }
}

// Rate limiting: max messages per minute
const RATE_LIMIT_PER_MINUTE = 30;
const STAGGER_DELAY_MS = 2000; // 2 seconds between bulk messages

// State
let sock = null;
let connectionStatus = 'disconnected'; // 'connected' | 'disconnected' | 'awaiting_scan'
let currentQR = null;
let startTime = Date.now();
let messagesSentLastMinute = 0;
let rateLimitResetTime = Date.now();
// Reference to the auth store's saveCreds, exposed so the graceful-shutdown
// handler can flush pending Signal ratchet state before exit. Without this,
// PM2 restarts can interrupt a session advance mid-write and leave the
// on-disk ratchet out of sync with WhatsApp's server view, causing Bad MAC
// decrypt failures and eventual device logout.
let currentSaveCreds = null;
let shuttingDown = false;
// Track when connection was last established — used to process offline messages
// that arrived between disconnection and reconnection
let lastConnectionOpenTime = 0;
// Track processed message IDs to avoid duplicate AI replies during reconnection
const processedMessageIds = new Set();
const MAX_PROCESSED_IDS = 500;
// Track IDs of messages we (the sidecar) sent — AI replies, /send, /send-bulk.
// Used to distinguish "our own outbound" (skip) from "staff typed on the phone"
// (capture as source=staff) when fromMe events come back from Baileys.
const ourSentMessageIds = new Set();
const MAX_OUR_SENT_IDS = 2000;
function rememberOurSentId(id) {
  if (!id) return;
  ourSentMessageIds.add(id);
  if (ourSentMessageIds.size > MAX_OUR_SENT_IDS) {
    const firstId = ourSentMessageIds.values().next().value;
    ourSentMessageIds.delete(firstId);
  }
}

// Where to POST staff-typed fromMe messages so the Next.js app can log them
// into the AI session.
const LOG_OUTBOUND_URL =
  process.env.LOG_OUTBOUND_URL ||
  (process.env.AI_CHAT_URL
    ? process.env.AI_CHAT_URL.replace(/\/api\/whatsapp\/ai\/?$/, '/api/whatsapp/log-outbound')
    : 'http://localhost:3000/api/whatsapp/log-outbound');

async function logOutbound(phone, message, source) {
  try {
    await fetch(LOG_OUTBOUND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': API_SECRET,
      },
      body: JSON.stringify({ phone, message, source }),
    });
  } catch (err) {
    console.error(`[log-outbound] failed for ${phone}:`, err.message);
  }
}

// Reset rate limit counter every minute
setInterval(() => {
  messagesSentLastMinute = 0;
  rateLimitResetTime = Date.now();
}, 60000);

/**
 * Auth middleware
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['x-api-secret'] || req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  
  if (token !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(authMiddleware);

/**
 * Format Nigerian phone number to WhatsApp JID format
 */
function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * Initialize Baileys WhatsApp connection
 */
async function initWhatsApp() {
  // Ensure auth store directory exists
  if (!fs.existsSync(AUTH_STORE_PATH)) {
    fs.mkdirSync(AUTH_STORE_PATH, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_STORE_PATH);
  currentSaveCreds = saveCreds;
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'warn' }),
    browser: ['MyShawarma Express', 'Chrome', '120.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 30000,
    retryRequestDelayMs: 500,
    // Skip history sync so messages arrive immediately via messages.upsert
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: true,
  });

  // Use Baileys v7 ev.process() for reliable buffered event handling
  sock.ev.process(async (events) => {
    // Save credentials on update
    if (events['creds.update']) {
      await saveCreds();
    }

    // Handle connection events
    if (events['connection.update']) {
      const update = events['connection.update'];
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQR = await QRCode.toDataURL(qr);
          connectionStatus = 'awaiting_scan';
          console.log('📱 QR Code generated — scan from admin panel or terminal');
        } catch (err) {
          console.error('Error generating QR code:', err);
          currentQR = null;
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        currentQR = null;

        console.log(`⚠️ WhatsApp disconnected (code: ${statusCode})`);

        if (shouldReconnect) {
          console.log('🔄 Reconnecting in 5 seconds...');
          setTimeout(initWhatsApp, 5000);
        } else {
          console.log('❌ WhatsApp logged out. Re-scan needed from admin panel.');
          try {
            fs.rmSync(AUTH_STORE_PATH, { recursive: true, force: true });
            fs.mkdirSync(AUTH_STORE_PATH, { recursive: true });
          } catch (e) {
            console.error('Error clearing auth state:', e);
          }
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        currentQR = null;
        lastConnectionOpenTime = Math.floor(Date.now() / 1000);
        console.log('✅ WhatsApp connected successfully');
      }
    }

    // Handle incoming messages — forward to AI handler
    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert'];
      console.log(`[DEBUG] messages.upsert: type=${type}, count=${messages.length}`);

    for (const msg of messages) {

      if (!msg.message) {
        logDrop(msg, 'no-content');
        continue;
      }

      // fromMe can be: (a) a reply we sent from this process (AI / /send /
      // /send-bulk) or (b) a manual reply typed by staff on the business
      // phone. We log (b) to the AI session so the bot sees the exchange.
      if (msg.key.fromMe) {
        const msgId = msg.key.id;
        if (msgId && ourSentMessageIds.has(msgId)) {
          // Our own outbound echoing back — ignore.
          logDrop(msg, 'fromMe-self');
          continue;
        }
        const remoteJid = msg.key.remoteJid || '';
        if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
          logDrop(msg, 'fromMe-staff-group');
          continue;
        }
        if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid')) {
          logDrop(msg, 'fromMe-staff-jid');
          continue;
        }

        const staffText =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';
        if (!staffText.trim()) {
          logDrop(msg, 'fromMe-staff-empty');
          continue;
        }

        // Resolve LID/phone JID to a canonical phone so the AI session lookup
        // matches the one used by outbound system notifications.
        let staffPhone = await resolveCanonicalPhone(remoteJid, msg);
        if (!staffPhone) {
          staffPhone = remoteJid
            .replace(/@s\.whatsapp\.net$/, '')
            .replace(/@lid$/, '');
        }

        console.log(
          `👤 Staff manual reply to ${staffPhone}: ${staffText.substring(0, 80)}`
        );
        logOutbound(staffPhone, staffText, 'staff').catch(() => {});
        continue;
      }

      // Determine message age
      const msgTimestamp = typeof msg.messageTimestamp === 'number'
        ? msg.messageTimestamp
        : (msg.messageTimestamp?.low || 0);
      const nowSec = Math.floor(Date.now() / 1000);
      const msgAge = nowSec - msgTimestamp;

      // For real-time messages (notify), accept if within 2 minutes.
      // For offline batch messages (append), accept up to 30 minutes — covers
      // typical disconnect/reconnect cycles. processedMessageIds dedup below
      // prevents double-replies if the same id arrives in both notify and
      // append.
      const MAX_AGE_NOTIFY_SEC = 120;
      const MAX_AGE_APPEND_SEC = 1800;
      const maxAge = type === 'notify' ? MAX_AGE_NOTIFY_SEC : MAX_AGE_APPEND_SEC;
      if (msgAge > maxAge) {
        logDrop(msg, `too-old (age=${msgAge}s, max=${maxAge}s, type=${type})`);
        continue;
      }

      // Deduplicate — avoid replying twice if the same message arrives in both
      // an offline batch and a real-time notification
      const msgId = msg.key.id;
      if (processedMessageIds.has(msgId)) {
        logDrop(msg, 'dup');
        continue;
      }
      processedMessageIds.add(msgId);
      // Keep the set bounded
      if (processedMessageIds.size > MAX_PROCESSED_IDS) {
        const firstId = processedMessageIds.values().next().value;
        processedMessageIds.delete(firstId);
      }

      const remoteJid = msg.key.remoteJid || '';
      // Skip group messages, broadcasts, and status updates
      if (remoteJid.endsWith('@g.us')) {
        logDrop(msg, 'group');
        continue;
      }
      if (remoteJid === 'status@broadcast') {
        logDrop(msg, 'broadcast');
        continue;
      }
      // Only handle direct chats (@s.whatsapp.net or @lid)
      if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid')) {
        logDrop(msg, `unsupported-jid (${remoteJid})`);
        continue;
      }

      // Resolve to a canonical phone so the inbound session lookup matches
      // outbound system-notification logging. Falls back to bare LID if the
      // resolver can't match (still produces a session, just one that is not
      // unified with the order's phone).
      let from = await resolveCanonicalPhone(remoteJid, msg);
      if (!from) {
        from = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '');
      }

      const text = msg.message?.conversation ||
                   msg.message?.extendedTextMessage?.text || '';
      const imageMsg = msg.message?.imageMessage;

      if (imageMsg) {
        const caption = imageMsg.caption || '';
        const mimeType = imageMsg.mimetype || 'image/jpeg';
        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
          );
          const MAX_BYTES = 5 * 1024 * 1024;
          if (buffer.length > MAX_BYTES) {
            console.log(`📩 Incoming image from ${from} (${buffer.length} bytes) — too large, replying with size hint`);
            const sent = await sock.sendMessage(remoteJid, {
              text: "That image is a bit too large for me to read — could you send a smaller one (under 5 MB) or type your question?",
            });
            rememberOurSentId(sent?.key?.id);
            continue;
          }
          console.log(
            `📩 Incoming image from ${from} (${buffer.length} bytes, ${mimeType})${caption ? `: ${caption.substring(0, 80)}` : ''}`
          );
          if (AI_CHAT_ENABLED) {
            handleAIChat(remoteJid, from, caption, {
              base64: buffer.toString('base64'),
              mimeType,
            }).catch(err => {
              console.error(`❌ AI image handler error for ${from}:`, err.message);
            });
          }
        } catch (err) {
          console.error(`❌ Failed to download image from ${from}:`, err.message);
        }
        continue;
      }

      if (!text.trim()) {
        const msgType = Object.keys(msg.message || {}).join(', ');
        console.log(`📩 Incoming non-text message from ${from} (type: ${msgType}) — skipping`);
        continue;
      }

      console.log(`📩 Incoming message from ${from}: ${text.substring(0, 100)}`);

      // Forward to AI handler and reply directly using the original JID
      if (AI_CHAT_ENABLED) {
        handleAIChat(remoteJid, from, text).catch(err => {
          console.error(`❌ AI handler error for ${from}:`, err.message);
        });
      }
    }
    } // end messages.upsert
  }); // end sock.ev.process

  return sock;
}

/**
 * Handle AI chat: get response from AI endpoint, then reply directly via sock
 * Uses the original JID (remoteJid) to reply, avoiding phone number lookup issues with @lid format.
 *
 * `image` is optional. When present, the route forwards it as a Claude vision
 * content block alongside the (possibly empty) text caption.
 */
async function handleAIChat(remoteJid, phone, text, image) {
  // Skip ignored phones (admin numbers etc.)
  if (AI_CHAT_IGNORE_PHONES.some(p => phone.includes(p.replace(/[^\d]/g, '')))) {
    console.log(`🤖 AI: skipping ignored phone ${phone}`);
    return;
  }

  try {
    const body = { phone, message: text };
    if (image) body.image = image;
    const response = await fetch(AI_CHAT_PROCESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': API_SECRET,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`🤖 AI: error response (${response.status}):`, errorData);
      return;
    }

    const data = await response.json();
    const aiReply = data.reply;

    if (!aiReply) {
      console.log(`🤖 AI: no reply for ${phone}`);
      return;
    }

    // Send reply directly using the original JID (works for both @s.whatsapp.net and @lid)
    if (sock && connectionStatus === 'connected') {
      const sent = await sock.sendMessage(remoteJid, { text: aiReply });
      rememberOurSentId(sent?.key?.id);
      messagesSentLastMinute++;
      console.log(`🤖 AI: replied to ${phone}: ${aiReply.substring(0, 80)}...`);
    } else {
      console.error(`🤖 AI: cannot send reply — WhatsApp not connected`);
    }
  } catch (err) {
    console.error(`🤖 AI: failed:`, err.message);
  }
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /send - Send a single WhatsApp message
 */
app.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }

    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({ 
        error: 'WhatsApp not connected', 
        status: connectionStatus 
      });
    }

    // Rate limiting
    if (messagesSentLastMinute >= RATE_LIMIT_PER_MINUTE) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        limit: RATE_LIMIT_PER_MINUTE,
        reset_in_seconds: Math.ceil((60000 - (Date.now() - rateLimitResetTime)) / 1000),
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const jid = `${formattedPhone}@s.whatsapp.net`;

    // Check if number is on WhatsApp
    const [result] = await sock.onWhatsApp(jid);
    if (!result?.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'not_on_whatsapp',
        message: `${phone} is not registered on WhatsApp`,
      });
    }

    const sent = await sock.sendMessage(jid, { text: message });
    rememberOurSentId(sent?.key?.id);
    messagesSentLastMinute++;

    console.log(`📤 Message sent to ${formattedPhone}: ${message.substring(0, 50)}...`);

    return res.json({
      success: true,
      messageId: sent.key.id,
      phone: formattedPhone,
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send message' 
    });
  }
});

/**
 * POST /send-media - Send an image (with optional caption) by URL.
 * Body: { phone: string, mediaUrl: string, caption?: string }
 *
 * The caller (Next.js admin route) provides a short-lived signed URL pointing
 * at a Supabase Storage object. We fetch the bytes here and forward them to
 * Baileys as an image message. The returned messageId is added to
 * `ourSentMessageIds` so the inbound `messages.upsert` listener doesn't
 * double-log this send when WhatsApp echoes it back as fromMe.
 */
app.post('/send-media', async (req, res) => {
  try {
    const { phone, mediaUrl, caption } = req.body;

    if (!phone || !mediaUrl) {
      return res.status(400).json({ error: 'phone and mediaUrl are required' });
    }

    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({
        error: 'WhatsApp not connected',
        status: connectionStatus,
      });
    }

    if (messagesSentLastMinute >= RATE_LIMIT_PER_MINUTE) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: RATE_LIMIT_PER_MINUTE,
        reset_in_seconds: Math.ceil((60000 - (Date.now() - rateLimitResetTime)) / 1000),
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const jid = `${formattedPhone}@s.whatsapp.net`;

    const [onWA] = await sock.onWhatsApp(jid);
    if (!onWA?.exists) {
      return res.status(404).json({
        success: false,
        error: 'not_on_whatsapp',
        message: `${phone} is not registered on WhatsApp`,
      });
    }

    // Fetch the media bytes from the signed URL.
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) {
      return res.status(502).json({
        error: 'media_fetch_failed',
        message: `Failed to fetch media: ${mediaRes.status} ${mediaRes.statusText}`,
      });
    }
    const arrayBuffer = await mediaRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sent = await sock.sendMessage(jid, {
      image: buffer,
      caption: caption || undefined,
    });
    rememberOurSentId(sent?.key?.id);
    messagesSentLastMinute++;

    console.log(`📤 Image sent to ${formattedPhone}${caption ? `: ${caption.substring(0, 50)}` : ''}`);

    return res.json({
      success: true,
      messageId: sent.key.id,
      phone: formattedPhone,
    });
  } catch (error) {
    console.error('Error sending media:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send media',
    });
  }
});

/**
 * POST /send-bulk - Send multiple messages with stagger delay
 */
app.post('/send-bulk', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (!sock || connectionStatus !== 'connected') {
      return res.status(503).json({ 
        error: 'WhatsApp not connected', 
        status: connectionStatus 
      });
    }

    // Process in background, return immediately
    const results = { queued: messages.length, sent: 0, failed: 0, errors: [] };

    // Don't await — send in background
    (async () => {
      for (const msg of messages) {
        try {
          // Rate limit check
          if (messagesSentLastMinute >= RATE_LIMIT_PER_MINUTE) {
            console.log('⏳ Rate limit reached, waiting...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            messagesSentLastMinute = 0;
          }

          const formattedPhone = formatPhoneNumber(msg.phone);
          const jid = `${formattedPhone}@s.whatsapp.net`;

          const [onWA] = await sock.onWhatsApp(jid);
          if (onWA?.exists) {
            const sent = await sock.sendMessage(jid, { text: msg.message });
            rememberOurSentId(sent?.key?.id);
            messagesSentLastMinute++;
            results.sent++;
            console.log(`📤 Bulk: sent to ${formattedPhone}`);
          } else {
            results.failed++;
            results.errors.push({ phone: msg.phone, error: 'not_on_whatsapp' });
          }

          // Stagger delay between messages
          await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS));
        } catch (err) {
          results.failed++;
          results.errors.push({ phone: msg.phone, error: err.message });
        }
      }
      console.log(`📦 Bulk send complete: ${results.sent} sent, ${results.failed} failed`);
    })();

    return res.json({ 
      success: true, 
      queued: messages.length,
      message: 'Messages queued for sending',
    });

  } catch (error) {
    console.error('Error in bulk send:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status - Get WhatsApp connection status
 */
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    messages_sent_last_minute: messagesSentLastMinute,
    rate_limit: RATE_LIMIT_PER_MINUTE,
  });
});

/**
 * GET /qr - Get QR code for scanning
 */
app.get('/qr', (req, res) => {
  if (connectionStatus === 'connected') {
    return res.json({ status: 'connected', qr: null });
  }

  if (currentQR) {
    return res.json({ status: 'awaiting_scan', qr: currentQR });
  }

  return res.json({ 
    status: connectionStatus, 
    qr: null,
    message: 'QR code not yet generated. Connection may be initializing.',
  });
});

/**
 * POST /reconnect - Force reconnect
 */
app.post('/reconnect', async (req, res) => {
  try {
    console.log('🔄 Force reconnect requested');
    
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {
        // Ignore logout errors
      }
      sock = null;
    }

    connectionStatus = 'disconnected';
    currentQR = null;

    // Clear auth state for fresh QR
    try {
      fs.rmSync(AUTH_STORE_PATH, { recursive: true, force: true });
      fs.mkdirSync(AUTH_STORE_PATH, { recursive: true });
    } catch (e) {
      console.error('Error clearing auth state:', e);
    }

    // Reinitialize
    await initWhatsApp();

    res.json({ success: true, message: 'Reconnection initiated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health - Basic health check
 */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'whatsapp-baileys',
    status: connectionStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Baileys WhatsApp server running on port ${PORT}`);
  console.log(`🔑 API Secret: ${API_SECRET.substring(0, 4)}...`);
  
  // Initialize WhatsApp connection
  initWhatsApp().catch(err => {
    console.error('❌ Failed to initialize WhatsApp:', err);
  });
});

/**
 * Graceful shutdown — flush Signal ratchet state before exit.
 *
 * Racing PM2 SIGTERM against a pending `saveCreds()` is how sessions get
 * desynced: we ack an inbound message to WhatsApp (advancing their ratchet)
 * but die before the matching file write lands on disk. The next start then
 * decrypts with a stale key, hits Bad MAC on every message from that contact,
 * and WhatsApp eventually drops the device (code 401).
 *
 * Must finish before PM2's `kill_timeout` fires — we set that to 10s in
 * ecosystem.config.js, which leaves comfortable headroom for the 2s drain.
 */
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`🛑 ${signal} received — flushing session state before exit`);

  try {
    if (sock) sock.end();
  } catch (_) {
    // ignore
  }

  try {
    if (currentSaveCreds) {
      await currentSaveCreds();
      console.log('💾 Creds flushed to disk');
    }
  } catch (err) {
    console.error('saveCreds on shutdown failed:', err.message);
  }

  // Let any in-flight session-key file writes triggered by sock.end() settle.
  await new Promise(resolve => setTimeout(resolve, 2000));
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

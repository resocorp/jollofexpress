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
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
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
// Phones that should NOT trigger AI (e.g., admin numbers)
const AI_CHAT_IGNORE_PHONES = (process.env.AI_CHAT_IGNORE_PHONES || '').split(',').filter(Boolean);

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
        console.log('✅ WhatsApp connected successfully');
      }
    }

    // Handle incoming messages — forward to AI handler
    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert'];
      console.log(`[DEBUG] messages.upsert: type=${type}, count=${messages.length}`);
      // Only process real-time notifications, not historical sync
      if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;

      const remoteJid = msg.key.remoteJid || '';
      // Skip group messages, broadcasts, and status updates
      if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;
      // Only handle direct chats (@s.whatsapp.net or @lid)
      if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@lid')) continue;

      // Extract identifier for logging/session (phone or lid)
      const from = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '');

      const text = msg.message?.conversation ||
                   msg.message?.extendedTextMessage?.text || '';

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
 * Uses the original JID (remoteJid) to reply, avoiding phone number lookup issues with @lid format
 */
async function handleAIChat(remoteJid, phone, text) {
  // Skip ignored phones (admin numbers etc.)
  if (AI_CHAT_IGNORE_PHONES.some(p => phone.includes(p.replace(/[^\d]/g, '')))) {
    console.log(`🤖 AI: skipping ignored phone ${phone}`);
    return;
  }

  try {
    // Call the AI endpoint to get the response text (don't let it send the reply)
    const response = await fetch(AI_CHAT_PROCESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': API_SECRET,
      },
      body: JSON.stringify({ phone, message: text }),
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
      await sock.sendMessage(remoteJid, { text: aiReply });
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
            await sock.sendMessage(jid, { text: msg.message });
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Baileys server...');
  if (sock) {
    try {
      sock.end();
    } catch (e) {
      // ignore
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  if (sock) {
    try {
      sock.end();
    } catch (e) {
      // ignore
    }
  }
  process.exit(0);
});

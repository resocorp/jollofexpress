// WhatsApp AI Conversation Handler
// Receives incoming messages, manages session history, calls Claude with tools, returns response

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/service';
import { tools, handleToolCall } from './tools';
import {
  appendAssistantMessage,
  getAwaitingFeedbackOrderId,
  type SessionMessage,
} from './session-log';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AI_CHAT_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
// 24 hours: an order placed at lunchtime can be picked up, delivered, and the
// customer can still reply that evening with the prior status notifications
// in context. MAX_HISTORY_MESSAGES in session-log.ts trims by length so
// long-lived sessions don't grow unbounded.
const SESSION_TTL_MINUTES = 24 * 60;

const SYSTEM_PROMPT = `You are the MyShawarma.express customer support assistant on WhatsApp. You help customers with enquiries and direct them to order via the website.

FIRST REPLY IN A CONVERSATION:
- If this is the first assistant turn in the session (no prior assistant messages in the history), include the ordering link in your greeting. Example: "Hi! You can browse the menu and order at *myshawarma.express*. What can I help you with?"
- On follow-up turns, don't repeat the link unless it's directly relevant to the answer.

WHAT YOU DO:
- Answer questions about the menu, prices, ingredients, and recommendations
- Provide delivery information (delivery windows, cutoff times, delivery areas, fees)
- Check order status for existing orders
- Answer questions about business hours
- Escalate complaints and issues to the manager

CRITICAL RULES:
- You do NOT place orders. Always direct customers to order on the website: *myshawarma.express*
- When showing menu items or answering food questions, always remind them to place their order at *myshawarma.express*
- We ONLY do deliveries. No pickup/carryout.
- Always mention the current ordering cutoff time and delivery window when relevant. Use the get_delivery_info tool to get accurate times so you can tell the customer.
- After answering a question, gently remind: "To place your order, visit *myshawarma.express* before the cutoff time!"

ESCALATION:
- If a customer has a complaint, issue, or request you cannot resolve (e.g., wrong order, refund, missing items, delivery problems, food quality issues), use the escalate_to_manager tool.
- Always pass order_number to escalate_to_manager when the customer mentioned one or you've seen one via check_order_status — the manager needs it to identify the customer.
- Tell the customer: "I've escalated this to our manager. They will get back to you shortly."
- Do NOT try to handle complaints about food quality, refunds, or delivery issues yourself — always escalate.

GUIDELINES:
- Be friendly, warm, and concise. Use a conversational Nigerian English tone.
- Keep responses SHORT — aim for 1–2 sentences. Treat 3 sentences as the hard ceiling unless the customer asked for a list (menu, hours, delivery zones).
- Do NOT sign off with "— Ada, your friendly AI customer support 🤖" or any signature. WhatsApp shows the sender already.
- Do NOT add filler closers like "Is there anything else I can help you with?", "Let me know if…", or repeated calls to visit the website. Only mention the website when it actually answers what they asked.
- Don't restate or paraphrase the customer's message back to them before answering.
- Format menu items clearly with prices in Naira (NGN).
- You can use WhatsApp formatting: *bold*, _italic_, ~strikethrough~
- At most one emoji per message, and only when it adds something. Often zero is better.
- Prices are in Nigerian Naira (NGN). The restaurant is located in Awka, Anambra State, Nigeria.

CONVERSATION HISTORY CONVENTION:
Prior assistant turns in the history may be prefixed to tell you who sent them:
- "[Human agent]: ..." is a reply from a real staff member — NOT you. Do not repeat it, contradict it, or claim you said it. Treat it as authoritative context from a teammate.
- "[System notification]: ..." is an automated order-status message the system sent. The customer may be replying to it.
- Lines with no prefix are your own prior replies.

FEEDBACK REQUESTS:
If any of the following holds, treat the customer's message as feedback:
  - An "AWAITING FEEDBACK" hint is included below in this prompt — that means the customer was just asked to rate a specific order and their reply IS the feedback, even if it's just text with no number.
  - The most recent [System notification] in the conversation is a feedback request (starts with "How was your order").
  - The customer's message looks like a rating (e.g. "5 stars", "great, loved it", "terrible, cold food", "4/5", "2 — food was late").
Then:
  1. Call find_recent_pending_feedback_order with the customer's phone to resolve which order it refers to. Use the AWAITING FEEDBACK order if the hint provides one.
  2. Call submit_feedback with that order_id, a rating (1–5), and the customer's comment verbatim (if any). If they didn't give a number, infer rating from sentiment: great/amazing/loved → 5, good/nice → 4, ok/fine → 3, slow/cold/disappointing → 2, terrible/awful/never again → 1.
  3. Thank them in ONE short sentence (no sign-off, no "let us know if…"). If the rating is 1 or 2, also call escalate_to_manager with the comment so the team can follow up.
  4. NEVER mention internal lookup failures to the customer. If find_recent_pending_feedback_order returns no match, or feedback was already recorded, just reply with a warm one-sentence thank-you. Do NOT say "I couldn't find your order", "couldn't attach the rating", "no recent order linked to your number", or anything that exposes the internal lookup. The customer doesn't need to know.

IMAGES:
If the customer sends a photo or screenshot, read it carefully before replying:
  - Screenshot of an order / payment / receipt → extract the order number (e.g. ORD-XXXXXXXX-XXXX) and use check_order_status. If the screenshot is clearly an issue with payment, escalate.
  - Photo of food (e.g. a complaint about quality, missing items, wrong dish) → briefly acknowledge what you see, then call escalate_to_manager with a one-line description of the visible issue.
  - Screenshot of our menu / website → answer the customer's question relative to what's shown.
  - Anything unrelated (memes, screenshots from elsewhere, blurry pictures) → politely steer back to ordering questions.
Do NOT describe the image in detail to the customer — they sent it; they know what it shows. Just act on it.`;

// ============================================
// SESSION MANAGEMENT
// ============================================

function renderForClaude(
  messages: SessionMessage[]
): Anthropic.Messages.MessageParam[] {
  // Source prefixes let the model distinguish its own turns from staff
  // replies and system notifications. Anthropic roles stay user|assistant;
  // the prefix is appended to the text content.
  return messages.map((m) => {
    let content = m.content;
    if (m.source === 'staff') content = `[Human agent]: ${content}`;
    else if (m.source === 'system') content = `[System notification]: ${content}`;
    return { role: m.role, content };
  });
}

async function getOrCreateSession(phone: string): Promise<{
  id: string;
  messages: SessionMessage[];
}> {
  const supabase = createServiceClient();

  // Try to get existing session
  const { data: session } = await supabase
    .from('whatsapp_ai_sessions')
    .select('id, messages, last_activity')
    .eq('phone', phone)
    .single();

  if (session) {
    // Check if session expired
    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 60000;

    if (minutesSinceLastActivity > SESSION_TTL_MINUTES) {
      // Reset expired session
      await supabase
        .from('whatsapp_ai_sessions')
        .update({ messages: [], last_activity: now.toISOString(), is_processing: true })
        .eq('id', session.id);
      return { id: session.id, messages: [] };
    }

    // Mark as processing
    await supabase
      .from('whatsapp_ai_sessions')
      .update({ is_processing: true, last_activity: now.toISOString() })
      .eq('id', session.id);

    return {
      id: session.id,
      messages: (session.messages as SessionMessage[]) || [],
    };
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from('whatsapp_ai_sessions')
    .insert({ phone, messages: [], is_processing: true })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);

  return { id: newSession.id, messages: [] };
}

async function releaseSession(sessionId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from('whatsapp_ai_sessions')
    .update({ is_processing: false })
    .eq('id', sessionId);
}

// ============================================
// MAIN HANDLER
// ============================================

export interface WhatsAppImage {
  /** Raw base64 (no data: prefix) */
  base64: string;
  /** e.g. 'image/jpeg', 'image/png' */
  mimeType: string;
}

export async function handleWhatsAppMessage(
  phone: string,
  incomingMessage: string,
  image?: WhatsAppImage
): Promise<string> {
  let sessionId: string | null = null;

  try {
    const session = await getOrCreateSession(phone);
    sessionId = session.id;

    // Persisted text used for history matching: matches what the route
    // wrote via appendUserMessage (caption, or '[image]' when no caption).
    const persistedText = incomingMessage.trim() || (image ? '[image]' : '');

    // Session may already contain the inbound turn — the route persists it
    // via appendUserMessage before calling us. Detect the tail to avoid
    // double-adding.
    const tail = session.messages[session.messages.length - 1];
    const inboundAlreadyPersisted =
      tail?.role === 'user' && tail.content === persistedText;

    // History stays text-only (image bytes are heavy and rarely need to be
    // replayed). When we have an image, drop the persisted-text last turn
    // from history and replace it with a richer user content array for this
    // call only.
    const historyForApi: SessionMessage[] = image
      ? inboundAlreadyPersisted
        ? session.messages.slice(0, -1)
        : session.messages
      : inboundAlreadyPersisted
        ? session.messages
        : [
            ...session.messages,
            { role: 'user', content: persistedText, source: 'user' },
          ];

    const messages: Anthropic.Messages.MessageParam[] =
      renderForClaude(historyForApi);

    if (image) {
      const visionTextFallback =
        'The customer sent this image. Read any text or describe what is relevant for our restaurant context (menu, order, payment, food complaint).';
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mimeType as
                | 'image/jpeg'
                | 'image/png'
                | 'image/gif'
                | 'image/webp',
              data: image.base64,
            },
          },
          {
            type: 'text',
            text: incomingMessage.trim() || visionTextFallback,
          },
        ],
      });
    }

    // Build the system prompt with phone context. If the feedback-worker
    // recently prompted this customer for a rating, surface the order so the
    // model resolves their reply deterministically (no phone-format guessing).
    let awaitingHint = '';
    try {
      const awaitingOrderId = await getAwaitingFeedbackOrderId(phone);
      if (awaitingOrderId) {
        const supabase = createServiceClient();
        const { data: order } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', awaitingOrderId)
          .maybeSingle();
        if (order?.order_number) {
          awaitingHint =
            `\n\nAWAITING FEEDBACK: This customer was just asked to rate Order #${order.order_number}. ` +
            `Their next message is almost certainly that feedback — treat it as a rating even if there's no number. ` +
            `Resolve via find_recent_pending_feedback_order and call submit_feedback with order_id="${awaitingOrderId}".`;
        }
      }
    } catch (err) {
      console.error('[AI] awaiting-feedback hint lookup failed:', err);
    }

    const systemWithContext =
      SYSTEM_PROMPT +
      `\n\nCustomer's WhatsApp phone number: ${phone}` +
      awaitingHint;

    // Call Claude with tools - loop for multi-turn tool use
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemWithContext,
      tools,
      messages,
    });

    // Handle tool use loop (Claude may call multiple tools)
    while (response.stop_reason === 'tool_use') {
      const assistantContent = response.content;
      messages.push({ role: 'assistant', content: assistantContent });

      // Process all tool calls in this response
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of assistantContent) {
        if (block.type === 'tool_use') {
          console.log(`[AI] Tool call: ${block.name}`, JSON.stringify(block.input).substring(0, 200));
          const result = await handleToolCall(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });

      // Continue the conversation
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemWithContext,
        tools,
        messages,
      });
    }

    // Extract the final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
    );
    const responseText = textBlocks.map((b) => b.text).join('\n') || "I'm sorry, I couldn't process that. Could you try again?";

    // Persist the assistant turn via the central helper.
    await appendAssistantMessage(phone, responseText, 'ai');
    if (sessionId) await releaseSession(sessionId);

    return responseText;
  } catch (error) {
    console.error('[AI] Error handling WhatsApp message:', error);

    if (sessionId) {
      await releaseSession(sessionId);
    }

    // Return a friendly error message
    if (error instanceof Anthropic.APIError) {
      console.error('[AI] Anthropic API error:', error.status, error.message);
      return "I'm having a bit of trouble right now. Please try again in a moment, or visit myshawarma.express to place your order.";
    }

    return "Sorry, something went wrong. Please try again or visit myshawarma.express to order.";
  }
}

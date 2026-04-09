// WhatsApp AI Conversation Handler
// Receives incoming messages, manages session history, calls Claude with tools, returns response

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/service';
import { tools, handleToolCall } from './tools';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AI_CHAT_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const SESSION_TTL_MINUTES = 30;
const MAX_HISTORY_MESSAGES = 40; // Keep conversation manageable

const SYSTEM_PROMPT = `You are the MyShawarma.express customer support assistant on WhatsApp. You help customers with enquiries and direct them to order via the website.

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
- Tell the customer: "I've escalated this to our manager. They will get back to you shortly."
- Do NOT try to handle complaints about food quality, refunds, or delivery issues yourself — always escalate.

GUIDELINES:
- Be friendly, warm, and concise. Use a conversational Nigerian English tone.
- Keep responses SHORT — WhatsApp messages should be brief. No walls of text.
- Format menu items clearly with prices in Naira (NGN).
- You can use WhatsApp formatting: *bold*, _italic_, ~strikethrough~
- Don't use emojis excessively — one or two per message is fine.
- Prices are in Nigerian Naira (NGN). The restaurant is located in Awka, Anambra State, Nigeria.`;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

async function getOrCreateSession(phone: string): Promise<{
  id: string;
  messages: ConversationMessage[];
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
      messages: (session.messages as ConversationMessage[]) || [],
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

async function saveSession(
  sessionId: string,
  messages: ConversationMessage[]
): Promise<void> {
  const supabase = createServiceClient();

  // Trim history if too long (keep recent messages)
  const trimmed =
    messages.length > MAX_HISTORY_MESSAGES
      ? messages.slice(messages.length - MAX_HISTORY_MESSAGES)
      : messages;

  await supabase
    .from('whatsapp_ai_sessions')
    .update({
      messages: trimmed,
      is_processing: false,
      last_activity: new Date().toISOString(),
    })
    .eq('id', sessionId);
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

export async function handleWhatsAppMessage(
  phone: string,
  incomingMessage: string
): Promise<string> {
  let sessionId: string | null = null;

  try {
    const session = await getOrCreateSession(phone);
    sessionId = session.id;

    // Add customer's phone context and their message
    const messages: Anthropic.Messages.MessageParam[] = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add the new user message
    messages.push({ role: 'user', content: incomingMessage });

    // Build the system prompt with phone context
    const systemWithContext =
      SYSTEM_PROMPT +
      `\n\nCustomer's WhatsApp phone number: ${phone}`;

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

    // Sign every AI message
    const signedResponse = responseText + '\n\n— _Ada, your friendly AI customer support_ 🤖';

    // Save conversation history (simplified — just user text and assistant text)
    const updatedHistory: ConversationMessage[] = [
      ...session.messages,
      { role: 'user', content: incomingMessage },
      { role: 'assistant', content: responseText },
    ];

    await saveSession(sessionId, updatedHistory);

    return signedResponse;
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

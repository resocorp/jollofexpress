// WhatsApp Webhook Endpoint - Receives messages from Ultra MSG
import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/conversation-handler-v2';
import { logMessage, parseWebhookPayload } from '@/lib/whatsapp';
import { UltraMsgClient } from '@/lib/notifications/ultramsg-client';
import type { UltraMsgWebhookPayload } from '@/lib/whatsapp/types';

/**
 * POST - Handle incoming WhatsApp messages from Ultra MSG webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📥 WhatsApp webhook received:', JSON.stringify(body, null, 2));
    
    // Validate webhook payload
    if (!body || !body.data) {
      console.log('Invalid webhook payload - missing data');
      return NextResponse.json({ received: true });
    }
    
    const payload = body as UltraMsgWebhookPayload;
    
    // Only process message_received events
    if (payload.event_type !== 'message_received') {
      console.log(`Ignoring event type: ${payload.event_type}`);
      return NextResponse.json({ received: true });
    }
    
    // Parse the message
    const parsedMessage = parseWebhookPayload(payload);
    
    if (!parsedMessage) {
      console.log('Could not parse message or message is from self');
      return NextResponse.json({ received: true });
    }
    
    console.log('📨 Parsed message:', {
      phone: parsedMessage.phone,
      type: parsedMessage.type,
      text: parsedMessage.text?.substring(0, 50),
    });
    
    // Process the message and get responses
    const responses = await handleIncomingMessage(parsedMessage);
    
    // Send responses via Ultra MSG
    await sendResponses(parsedMessage.phone, responses);
    
    return NextResponse.json({ 
      received: true,
      processed: true,
      responses_sent: responses.length,
    });
    
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    // Always return 200 to prevent webhook retries
    return NextResponse.json({ 
      received: true, 
      error: 'Processing error' 
    });
  }
}

/**
 * GET - Webhook verification (if needed by Ultra MSG)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Some services require webhook verification
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');
  
  if (challenge) {
    // Verify token if configured
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (expectedToken && verifyToken !== expectedToken) {
      return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ 
    status: 'WhatsApp webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send multiple response messages to a phone number
 */
async function sendResponses(phone: string, messages: string[]): Promise<void> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  
  if (!instanceId || !token) {
    console.error('UltraMsg credentials not configured');
    return;
  }
  
  const client = new UltraMsgClient(instanceId, token);
  
  // Send messages with small delay between them
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    try {
      console.log(`📤 Sending response ${i + 1}/${messages.length} to ${phone.substring(0, 7)}****`);
      
      await client.sendMessage({
        to: phone,
        body: message,
      });
      
      // Log outbound message
      await logMessage(
        null,
        phone,
        'outbound',
        message,
        { messageType: 'text' }
      );
      
      // Small delay between messages to preserve order
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`Error sending message ${i + 1}:`, error);
    }
  }
}

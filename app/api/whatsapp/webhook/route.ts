// WhatsApp Webhook Endpoint - Receives messages from Ultra MSG
import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/conversation-handler-v2';
import { logMessage, parseWebhookPayload } from '@/lib/whatsapp';
import { UltraMsgClient } from '@/lib/notifications/ultramsg-client';
import type { UltraMsgWebhookPayload, WhatsAppResponse } from '@/lib/whatsapp/types';

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
    
    // Process the message and get responses (now supports text and image)
    const responses = await handleIncomingMessage(parsedMessage);
    
    // Send responses via Ultra MSG (supports both text and images)
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
 * Supports both text and image responses
 */
async function sendResponses(phone: string, responses: WhatsAppResponse[]): Promise<void> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;
  
  if (!instanceId || !token) {
    console.error('UltraMsg credentials not configured');
    return;
  }
  
  const client = new UltraMsgClient(instanceId, token);
  
  // Send messages with small delay between them
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    
    try {
      console.log(`📤 Sending response ${i + 1}/${responses.length} (${response.type}) to ${phone.substring(0, 7)}****`);
      
      if (response.type === 'image') {
        // Send image message
        await client.sendImage({
          to: phone,
          image: response.imageUrl,
          caption: response.caption,
        });
        
        // Log outbound image
        await logMessage(
          null,
          phone,
          'outbound',
          response.caption || '[Image]',
          { messageType: 'image', mediaUrl: response.imageUrl }
        );
      } else {
        // Send text message
        await client.sendMessage({
          to: phone,
          body: response.message,
        });
        
        // Log outbound message
        await logMessage(
          null,
          phone,
          'outbound',
          response.message,
          { messageType: 'text' }
        );
      }
      
      // Small delay between messages to preserve order
      if (i < responses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`Error sending response ${i + 1}:`, error);
    }
  }
}

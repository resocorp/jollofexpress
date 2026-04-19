// POST /api/whatsapp/log-outbound
// Called by the Baileys sidecar to record messages that left via WhatsApp
// but did not originate in the AI handler — namely:
//   - staff replies typed on the business phone (detected as fromMe with an
//     unknown message id; see scripts/baileys-server.js)
//   - future admin-UI-initiated sends that use the /send endpoint
//
// notification-service.ts skips this HTTP hop and calls appendAssistantMessage
// directly because it already runs inside the Next.js process.

import { NextRequest, NextResponse } from 'next/server';
import { appendAssistantMessage } from '@/lib/ai/session-log';

const API_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-api-secret');
  if (authHeader !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message : '';
    const source = body.source;

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'phone and message are required' },
        { status: 400 }
      );
    }

    if (source !== 'staff' && source !== 'system') {
      return NextResponse.json(
        { error: 'source must be "staff" or "system"' },
        { status: 400 }
      );
    }

    await appendAssistantMessage(phone, message, source);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[log-outbound] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

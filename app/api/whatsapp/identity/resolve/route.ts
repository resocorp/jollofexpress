// POST /api/whatsapp/identity/resolve
// Internal endpoint called by the Baileys sidecar (which has no Supabase
// access) to translate an inbound WhatsApp JID into the canonical phone
// number we use as the AI session key.
//
// The sidecar gets back { canonicalPhone, source, isPhone }. It uses
// canonicalPhone everywhere it would have stripped the suffix off remoteJid,
// which is what unifies inbound replies with outbound system notifications
// in the same whatsapp_ai_sessions row.

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionKey, type ResolveInput } from '@/lib/whatsapp/identity';

const API_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-api-secret');
  if (authHeader !== API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const remoteJid =
      typeof body?.remoteJid === 'string' ? body.remoteJid : '';

    if (!remoteJid) {
      return NextResponse.json(
        { error: 'remoteJid is required' },
        { status: 400 }
      );
    }

    const input: ResolveInput = {
      remoteJid,
      senderPn: typeof body.senderPn === 'string' ? body.senderPn : null,
      pushName: typeof body.pushName === 'string' ? body.pushName : null,
    };

    const result = await resolveSessionKey(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[whatsapp/identity/resolve] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

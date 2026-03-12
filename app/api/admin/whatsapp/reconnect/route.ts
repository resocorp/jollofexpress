// Admin endpoint: Force Baileys WhatsApp reconnect
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

const BAILEYS_URL = process.env.BAILEYS_SIDECAR_URL || 'http://localhost:3001';
const BAILEYS_SECRET = process.env.BAILEYS_API_SECRET || 'dev-secret-change-me';

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const response = await fetch(`${BAILEYS_URL}/reconnect`, {
      method: 'POST',
      headers: { 'X-API-Secret': BAILEYS_SECRET },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Baileys sidecar is not running' },
      { status: 503 }
    );
  }
}

// Admin endpoint: list / set / clear AI mutes for WhatsApp sessions.
// GET    → currently-muted phones (ai_muted_until in the future)
// POST   → mute a phone; body { phone: string, minutes?: number } (default 120)
// DELETE → unmute; body { phone: string }

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { clearMute, listMuted, setMute } from '@/lib/ai/session-log';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) return authResult.response;

  const muted = await listMuted();
  return NextResponse.json({ muted });
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const minutes = Number.isFinite(body.minutes) && body.minutes > 0 ? body.minutes : 120;

  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }

  const until = new Date(Date.now() + minutes * 60_000);
  await setMute(phone, until);
  return NextResponse.json({ success: true, phone, ai_muted_until: until.toISOString() });
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }

  await clearMute(phone);
  return NextResponse.json({ success: true, phone });
}

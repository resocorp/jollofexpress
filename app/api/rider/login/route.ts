import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createServiceClient } from '@/lib/supabase/service';
import { MemoryRateLimiter } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const rateLimiter = new MemoryRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 min
const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '');

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateCheck = await rateLimiter.check(`rider-login:${ip}`);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    );
  }

  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: 'Phone and PIN are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch shared rider PIN from settings
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'rider_pin')
      .single();

    if (!setting) {
      return NextResponse.json({ error: 'Rider access not configured' }, { status: 503 });
    }

    const storedPin = setting.value?.pin;
    if (!storedPin || pin !== storedPin) {
      return NextResponse.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    }

    // Look up active driver by phone
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, name, phone')
      .eq('phone', phone)
      .eq('is_active', true)
      .single();

    if (!driver) {
      return NextResponse.json({ error: 'Invalid phone or PIN' }, { status: 401 });
    }

    // Sign JWT
    const token = await new SignJWT({ driver_id: driver.id, name: driver.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('12h')
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({
      token,
      driver: { id: driver.id, name: driver.name },
    });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

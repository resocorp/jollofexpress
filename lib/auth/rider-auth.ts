import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

type RiderAuthResult =
  | { authenticated: true; driver_id: string; driver_name: string }
  | { authenticated: false; response: NextResponse };

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '');

export async function verifyRiderAuth(request: NextRequest): Promise<RiderAuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        response: NextResponse.json({ error: 'Missing authorization header' }, { status: 401 }),
      };
    }

    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if (!payload.driver_id || typeof payload.driver_id !== 'string') {
      return {
        authenticated: false,
        response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
      };
    }

    return {
      authenticated: true,
      driver_id: payload.driver_id as string,
      driver_name: (payload.name as string) || '',
    };
  } catch {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    };
  }
}

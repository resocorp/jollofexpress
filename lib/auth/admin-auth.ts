// Admin authentication middleware for API routes
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify admin authentication and authorization
 * Use this middleware in all /api/admin/* routes
 */
interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: string;
}

export async function verifyAdminAuth(request: NextRequest): Promise<
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; response: NextResponse }
> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Missing or invalid authorization header' },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[AUTH] Missing Supabase credentials');
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        ),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[AUTH] Token verification failed:', authError?.message);
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Invalid or expired token' },
          { status: 401 }
        ),
      };
    }

    // Check user role (admin or kitchen)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('[AUTH] Failed to fetch user profile:', profileError?.message);
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Unauthorized - User profile not found' },
          { status: 401 }
        ),
      };
    }

    // Verify user has admin or kitchen role
    if (userProfile.role !== 'admin' && userProfile.role !== 'kitchen') {
      console.warn('[AUTH] Access denied for user:', user.id, 'role:', userProfile.role);
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        ),
      };
    }

    // Authentication successful
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: userProfile.role,
      },
    };

  } catch (error) {
    console.error('[AUTH] Unexpected error:', error);
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Verify admin-only access (excludes kitchen role)
 */
export async function verifyAdminOnly(request: NextRequest): Promise<
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; response: NextResponse }
> {
  const authResult = await verifyAdminAuth(request);

  if (!authResult.authenticated) {
    return authResult;
  }

  // Check if user is specifically admin (not kitchen)
  if (authResult.user.role !== 'admin') {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

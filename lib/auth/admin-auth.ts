// Admin authentication middleware for API routes
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { UserRole } from '@/types/database';

/**
 * Verify admin authentication and authorization
 * Use this middleware in all /api/admin/* routes
 */
interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: UserRole;
}

type AuthResult =
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; response: NextResponse };

/**
 * Create a failed auth response
 */
function authFailure(error: string, status: number): AuthResult {
  return {
    authenticated: false,
    response: NextResponse.json({ error }, { status }),
  };
}

export async function verifyAdminAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return authFailure('Unauthorized - Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const supabase = createServiceClient();

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[AUTH] Token verification failed:', authError?.message);
      return authFailure('Unauthorized - Invalid or expired token', 401);
    }

    // Check user role (admin or kitchen)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('[AUTH] Failed to fetch user profile:', profileError?.message);
      return authFailure('Unauthorized - User profile not found', 401);
    }

    const role = userProfile.role as UserRole;

    // Verify user has admin or kitchen role
    if (role !== 'admin' && role !== 'kitchen') {
      console.warn('[AUTH] Access denied for user:', user.id, 'role:', role);
      return authFailure('Forbidden - Insufficient permissions', 403);
    }

    // Authentication successful
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    };

  } catch (error) {
    console.error('[AUTH] Unexpected error:', error);
    return authFailure('Authentication error', 500);
  }
}

/**
 * Verify admin-only access (excludes kitchen role)
 */
export async function verifyAdminOnly(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAdminAuth(request);

  if (!authResult.authenticated) {
    return authResult;
  }

  // Check if user is specifically admin (not kitchen)
  if (authResult.user.role !== 'admin') {
    return authFailure('Forbidden - Admin access required', 403);
  }

  return authResult;
}

// Admin authentication middleware for API routes
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { UserRole } from '@/types/database';

interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: UserRole;
}

type AuthResult =
  | { authenticated: true; user: AuthenticatedUser }
  | { authenticated: false; response: NextResponse };

const DEFAULT_ALLOWED_ROLES: UserRole[] = ['admin', 'kitchen'];

function authFailure(error: string, status: number): AuthResult {
  return {
    authenticated: false,
    response: NextResponse.json({ error }, { status }),
  };
}

/**
 * Verify an API caller is an authenticated user with one of the allowed roles.
 * Defaults to ['admin', 'kitchen'] for backwards compatibility.
 *
 * Pass a custom allowedRoles array on routes that should be reachable by
 * customer-care agents (e.g., the WhatsApp comms endpoints + read-only
 * orders/customers endpoints).
 */
export async function verifyAdminAuth(
  request: NextRequest,
  allowedRoles: UserRole[] = DEFAULT_ALLOWED_ROLES
): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return authFailure('Unauthorized - Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);

    const supabase = createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[AUTH] Token verification failed:', authError?.message);
      return authFailure('Unauthorized - Invalid or expired token', 401);
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, disabled')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('[AUTH] Failed to fetch user profile:', profileError?.message);
      return authFailure('Unauthorized - User profile not found', 401);
    }

    if (userProfile.disabled) {
      return authFailure('Forbidden - Account disabled', 403);
    }

    const role = userProfile.role as UserRole;

    if (!allowedRoles.includes(role)) {
      console.warn('[AUTH] Access denied for user:', user.id, 'role:', role, 'required:', allowedRoles);
      return authFailure('Forbidden - Insufficient permissions', 403);
    }

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
 * Verify admin-only access (excludes kitchen and agents).
 */
export async function verifyAdminOnly(request: NextRequest): Promise<AuthResult> {
  return verifyAdminAuth(request, ['admin']);
}

/**
 * Allow admin + customer-care agent. Used by the WhatsApp comms panel,
 * read-only orders, and read-only customers endpoints.
 */
export async function verifyAdminOrAgent(request: NextRequest): Promise<AuthResult> {
  return verifyAdminAuth(request, ['admin', 'customer_care_agent']);
}

/**
 * Verify a logged-in user (any role except 'customer').
 * Used by /api/admin/account/* (e.g., the password change endpoint).
 */
export async function verifyAnyStaff(request: NextRequest): Promise<AuthResult> {
  return verifyAdminAuth(request, ['admin', 'kitchen', 'customer_care_agent']);
}

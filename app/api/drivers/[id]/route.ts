// Single driver management API
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/auth/admin-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drivers/[id] - Get driver details
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error: any) {
    console.error('Driver fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch driver' },
      { status: 500 }
    );
  }
}

// PATCH /api/drivers/[id] - Update driver
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Verify admin-only authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceClient();

    const { data: driver, error } = await supabase
      .from('drivers')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(driver);
  } catch (error: any) {
    console.error('Driver update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update driver' },
      { status: 500 }
    );
  }
}

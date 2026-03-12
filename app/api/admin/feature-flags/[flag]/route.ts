// Admin endpoint: Toggle a specific feature flag
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// PATCH - Toggle a feature flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flag: string }> }
) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { flag } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .update({ enabled })
      .eq('key', flag)
      .select()
      .single();

    if (error) {
      console.error('Error updating feature flag:', error);
      return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    return NextResponse.json({ flag: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

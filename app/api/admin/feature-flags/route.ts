// Admin endpoint: List and manage feature flags
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// GET - List all feature flags
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      console.error('Error fetching feature flags:', error);
      return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
    }

    return NextResponse.json({ flags: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

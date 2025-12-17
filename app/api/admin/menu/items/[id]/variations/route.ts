import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

// GET - Fetch variations for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: variations, error } = await supabase
      .from('item_variations')
      .select('*')
      .eq('item_id', id);

    if (error) {
      console.error('Error fetching variations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch variations' },
        { status: 500 }
      );
    }

    return NextResponse.json(variations || []);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

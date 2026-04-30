// Bulk-restock: flip every currently-sold-out listed item back to available.
// Used by the kitchen "Mark all back in stock" button at start of service.
// Hidden (is_listed=false) items are not touched.
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available: true })
      .eq('is_listed', true)
      .eq('is_available', false)
      .select('id');

    if (error) {
      console.error('Error restocking items:', error);
      return NextResponse.json(
        { error: 'Failed to restock items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.length ?? 0,
      message: `Restocked ${data?.length ?? 0} item(s)`,
    });
  } catch (error) {
    console.error('Unexpected error in mark-all-available:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

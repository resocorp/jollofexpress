import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET - Fetch add-ons for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: addons, error } = await supabase
      .from('item_addons')
      .select('*')
      .eq('item_id', id);

    if (error) {
      console.error('Error fetching add-ons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch add-ons' },
        { status: 500 }
      );
    }

    return NextResponse.json(addons || []);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

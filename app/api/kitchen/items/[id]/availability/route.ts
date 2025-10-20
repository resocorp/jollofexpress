// Toggle menu item availability (mark as sold out)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const availabilitySchema = z.object({
  is_available: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request
    const validation = availabilitySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { is_available } = validation.data;
    const supabase = await createClient();

    // Update menu item
    const { data: item, error } = await supabase
      .from('menu_items')
      .update({ is_available })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item availability:', error);
      return NextResponse.json(
        { error: 'Failed to update item availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item,
      message: is_available 
        ? 'Item marked as available' 
        : 'Item marked as sold out',
    });

  } catch (error) {
    console.error('Unexpected error updating availability:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

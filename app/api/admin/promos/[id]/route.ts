// Admin endpoints for individual promo code operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const promoUpdateSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().optional(),
  description: z.string().max(200).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().positive().optional(),
  max_discount_amount: z.number().positive().optional(),
  min_order_value: z.number().min(0).optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

// PATCH - Update promo code
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate
    const validation = promoUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // If code is being changed, check if new code already exists
    if (validation.data.code) {
      const { data: existing } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', validation.data.code)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Promo code already exists' },
          { status: 400 }
        );
      }
    }

    // Update promo code
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating promo code:', error);
      return NextResponse.json(
        { error: 'Failed to update promo code' },
        { status: 500 }
      );
    }

    if (!promo) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(promo);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete promo code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if promo has been used
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('used_count, code')
      .eq('id', id)
      .single();

    if (!promo) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }

    if (promo.used_count > 0) {
      // Instead of deleting, deactivate it to preserve order history
      await supabase
        .from('promo_codes')
        .update({ is_active: false })
        .eq('id', id);

      return NextResponse.json({ 
        success: true, 
        message: 'Promo code deactivated (has been used)',
        deactivated: true,
      });
    }

    // Delete promo code if never used
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting promo code:', error);
      return NextResponse.json(
        { error: 'Failed to delete promo code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Promo code deleted successfully',
      deleted: true,
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

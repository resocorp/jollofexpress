// Admin endpoint for reordering delivery regions
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const reorderSchema = z.object({
  type: z.enum(['regions', 'groups']),
  items: z.array(z.object({
    id: z.string().uuid(),
    display_order: z.number().int().min(0),
  })),
});

// POST - Reorder regions or groups
export async function POST(request: NextRequest) {
  // Verify admin-only authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const validation = reorderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, items } = validation.data;
    const table = type === 'groups' ? 'delivery_region_groups' : 'delivery_regions';

    // Update each item's display_order
    for (const item of items) {
      const { error } = await supabase
        .from(table)
        .update({ display_order: item.display_order })
        .eq('id', item.id);

      if (error) {
        console.error(`Error updating ${type} order:`, error);
        return NextResponse.json(
          { error: `Failed to reorder ${type}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

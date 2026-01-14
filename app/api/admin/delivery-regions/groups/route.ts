// Admin endpoint for managing delivery region groups
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyAdminOnly } from '@/lib/auth/admin-auth';
import { z } from 'zod';

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// GET - Fetch all region groups
export async function GET(request: NextRequest) {
  // Verify admin-only authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();

    const { data: groups, error } = await supabase
      .from('delivery_region_groups')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching region groups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch region groups' },
        { status: 500 }
      );
    }

    return NextResponse.json({ groups: groups || [] });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create a new region group
export async function POST(request: NextRequest) {
  // Verify admin-only authentication
  const authResult = await verifyAdminOnly(request);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const validation = groupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { data: group, error } = await supabase
      .from('delivery_region_groups')
      .insert({
        name: validation.data.name,
        description: validation.data.description || null,
        display_order: validation.data.display_order || 0,
        is_active: validation.data.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating region group:', error);
      return NextResponse.json(
        { error: 'Failed to create region group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ group }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

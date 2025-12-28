// Driver status update API
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const statusSchema = z.object({
  status: z.enum(['available', 'busy', 'offline']),
});

// PATCH /api/drivers/[id]/status - Update driver status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = statusSchema.parse(body);
    
    const supabase = createServiceClient();

    const { data: driver, error } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(driver);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid status', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}

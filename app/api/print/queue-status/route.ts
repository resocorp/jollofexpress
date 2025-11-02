// Print Queue Status API
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get counts by status
    const { data: stats, error } = await supabase
      .from('print_queue')
      .select('status')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const pending = stats?.filter(s => s.status === 'pending').length || 0;
    const printed = stats?.filter(s => s.status === 'printed').length || 0;
    const failed = stats?.filter(s => s.status === 'failed').length || 0;

    // Get recent pending jobs
    const { data: recentPending } = await supabase
      .from('print_queue')
      .select('id, created_at, attempts')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      pending,
      printed,
      failed,
      total: stats?.length || 0,
      recentPending: recentPending || [],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

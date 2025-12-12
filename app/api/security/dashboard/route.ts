import { NextRequest, NextResponse } from 'next/server';
import { rscMonitor } from '@/lib/security/rsc-monitor';

/**
 * Security Dashboard API
 * Provides security statistics and recent events
 * 
 * IMPORTANT: Protect this endpoint with authentication in production!
 */
export async function GET(request: NextRequest) {
  // TODO: Add authentication check here
  // Example: const session = await getServerSession();
  // if (!session || !session.user.isAdmin) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats':
      return NextResponse.json(rscMonitor.getStatistics());

    case 'events':
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      return NextResponse.json(rscMonitor.getRecentEvents(limit));

    case 'by-type':
      const type = searchParams.get('type') as any;
      if (!type) {
        return NextResponse.json({ error: 'Type parameter required' }, { status: 400 });
      }
      return NextResponse.json(rscMonitor.getEventsByType(type));

    case 'by-ip':
      const ip = searchParams.get('ip');
      if (!ip) {
        return NextResponse.json({ error: 'IP parameter required' }, { status: 400 });
      }
      return NextResponse.json(rscMonitor.getEventsByIP(ip));

    default:
      return NextResponse.json({
        stats: rscMonitor.getStatistics(),
        recentEvents: rscMonitor.getRecentEvents(10),
      });
  }
}

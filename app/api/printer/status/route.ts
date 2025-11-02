// Printer Status API
// Check printer readiness and health
import { NextRequest, NextResponse } from 'next/server';
import { getPrinterStatus, getPaperStatus, isPrinterReady } from '@/lib/print/network-printer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const printerHost = process.env.PRINTER_IP_ADDRESS;
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

    if (!printerHost) {
      return NextResponse.json({
        success: false,
        error: 'Printer not configured',
        message: 'PRINTER_IP_ADDRESS environment variable is required',
      }, { status: 500 });
    }

    const config = {
      host: printerHost,
      port: printerPort,
      timeout: 3000,
    };

    // Get all status information
    const [printerStatus, paperStatus, readyCheck] = await Promise.all([
      getPrinterStatus(config),
      getPaperStatus(config),
      isPrinterReady(config),
    ]);

    return NextResponse.json({
      success: true,
      ready: readyCheck.ready,
      printer: printerStatus,
      paper: paperStatus,
      config: {
        host: printerHost,
        port: printerPort,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error checking printer status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check printer status',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Print Queue Processor API Route
 * Processes pending print jobs from the queue
 * 
 * Can be called:
 * 1. Manually (for testing)
 * 2. Via cron job (every 10-30 seconds)
 * 3. Via Supabase webhook (when new job added)
 * 
 * Authentication: Requires secret token
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPrintQueue } from '@/lib/print/print-processor';

export const maxDuration = 60; // Allow up to 60 seconds for processing
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (simple token-based auth)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Check against environment variable
    const expectedToken = process.env.PRINT_PROCESSOR_SECRET || process.env.WEBHOOK_SECRET;
    
    if (!expectedToken || token !== expectedToken) {
      console.warn('Unauthorized print processor access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get printer configuration from environment
    const printerHost = process.env.PRINTER_IP_ADDRESS || process.env.PRINT_SERVER_URL?.replace(/^https?:\/\//, '').split(':')[0];
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');
    
    if (!printerHost) {
      console.error('Printer IP address not configured');
      return NextResponse.json(
        { 
          error: 'Printer not configured',
          message: 'PRINTER_IP_ADDRESS environment variable is required',
        },
        { status: 500 }
      );
    }

    console.log(`Processing print queue... (printer: ${printerHost}:${printerPort})`);

    // Process the print queue
    const result = await processPrintQueue({
      printer: {
        host: printerHost,
        port: printerPort,
        timeout: 10000, // 10 second timeout
      },
      maxAttempts: 3,
      batchSize: 10,
    });

    // Return result
    return NextResponse.json({
      success: true,
      result: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in print processor:', error);
    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing printer connectivity
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const expectedToken = process.env.PRINT_PROCESSOR_SECRET || process.env.WEBHOOK_SECRET;
    
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const printerHost = process.env.PRINTER_IP_ADDRESS || process.env.PRINT_SERVER_URL?.replace(/^https?:\/\//, '').split(':')[0];
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

    if (!printerHost) {
      return NextResponse.json({
        status: 'error',
        message: 'Printer not configured',
        config: {
          PRINTER_IP_ADDRESS: 'not set',
          PRINTER_PORT: printerPort,
        },
      });
    }

    // Import here to avoid loading on every request
    const { testPrinterConnection } = await import('@/lib/print/network-printer');
    
    const testResult = await testPrinterConnection({
      host: printerHost,
      port: printerPort,
      timeout: 5000,
    });

    return NextResponse.json({
      status: testResult.success ? 'online' : 'offline',
      message: testResult.message,
      config: {
        host: printerHost,
        port: printerPort,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error testing printer:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

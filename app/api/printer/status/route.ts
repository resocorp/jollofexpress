// Printer Status API
// Check printer readiness and health using simple ESC/POS commands
import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

export const dynamic = 'force-dynamic';

interface StatusResult {
  connected: boolean;
  online?: boolean;
  coverClosed?: boolean;
  paperPresent?: boolean;
  paperNearEnd?: boolean;
  rawStatus?: number;
  rawPaper?: number;
  error?: string;
}

async function checkPrinterStatus(host: string, port: number): Promise<StatusResult> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let statusByte: number | undefined;
    let paperByte: number | undefined;
    let responseCount = 0;
    
    const timeout = setTimeout(() => {
      client.destroy();
      resolve({
        connected: false,
        error: 'Connection timeout',
      });
    }, 3000);

    client.connect(port, host, () => {
      // Send printer status command (DLE EOT 1)
      client.write(Buffer.from([0x10, 0x04, 0x01]));
      
      // Wait a bit then send paper status command (DLE EOT 4)
      setTimeout(() => {
        client.write(Buffer.from([0x10, 0x04, 0x04]));
      }, 100);
    });

    client.on('data', (data) => {
      responseCount++;
      
      if (responseCount === 1 && data.length > 0) {
        statusByte = data[0];
      } else if (responseCount === 2 && data.length > 0) {
        paperByte = data[0];
        
        // Got both responses, close connection
        clearTimeout(timeout);
        client.destroy();
        
        // Parse status bits
        const online = !(statusByte! & 0x08);
        const coverClosed = !(statusByte! & 0x20);
        const paperPresent = !(paperByte! & 0x60);
        const paperNearEnd = !!(paperByte! & 0x0C);
        
        resolve({
          connected: true,
          online,
          coverClosed,
          paperPresent,
          paperNearEnd,
          rawStatus: statusByte,
          rawPaper: paperByte,
        });
      }
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        connected: false,
        error: err.message,
      });
    });

    client.on('close', () => {
      clearTimeout(timeout);
      
      // If we got at least status byte, return partial info
      if (statusByte !== undefined && paperByte === undefined) {
        const online = !(statusByte & 0x08);
        const coverClosed = !(statusByte & 0x20);
        
        resolve({
          connected: true,
          online,
          coverClosed,
          rawStatus: statusByte,
          error: 'Paper status not available',
        });
      } else if (responseCount === 0) {
        resolve({
          connected: false,
          error: 'No response from printer',
        });
      }
    });
  });
}

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

    console.log(`[PRINTER-STATUS] Checking ${printerHost}:${printerPort}`);

    const status = await checkPrinterStatus(printerHost, printerPort);

    console.log(`[PRINTER-STATUS] Result:`, status);

    const ready = status.connected && 
                  (status.online !== false) && 
                  (status.coverClosed !== false) && 
                  (status.paperPresent !== false);

    return NextResponse.json({
      success: status.connected,
      ready,
      status: {
        connected: status.connected,
        online: status.online,
        coverClosed: status.coverClosed,
        paperPresent: status.paperPresent,
        paperNearEnd: status.paperNearEnd,
        rawStatus: status.rawStatus,
        rawPaper: status.rawPaper,
      },
      config: {
        host: printerHost,
        port: printerPort,
      },
      error: status.error,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[PRINTER-STATUS] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check printer status',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

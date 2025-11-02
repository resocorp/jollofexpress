// Simple Print Test API
// Tests if we can print at all
import { NextRequest, NextResponse } from 'next/server';
import { printToNetwork } from '@/lib/print/network-printer';
import { generateESCPOS } from '@/lib/print/escpos-generator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const printerHost = process.env.PRINTER_IP_ADDRESS;
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');

    if (!printerHost) {
      return NextResponse.json({
        success: false,
        error: 'PRINTER_IP_ADDRESS not configured',
      }, { status: 500 });
    }

    console.log(`[PRINT TEST] Attempting to print to ${printerHost}:${printerPort}`);

    // Create simple test receipt
    const now = new Date();
    const testReceipt = {
      orderNumber: 'TEST-' + Date.now(),
      orderDate: now.toLocaleDateString(),
      orderTime: now.toLocaleTimeString(),
      orderType: 'carryout' as const,
      customerName: 'System Test',
      customerPhone: '000-000-0000',
      items: [
        {
          name: 'Test Print Item',
          quantity: 1,
          price: 0,
          addons: [],
        },
      ],
      subtotal: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      paymentStatus: 'test',
      paymentMethod: 'test',
      specialInstructions: ['This is a test print from the admin panel'],
    };

    // Generate ESC/POS commands
    const escposData = generateESCPOS(testReceipt);
    
    console.log(`[PRINT TEST] Generated ${escposData.length} bytes of print data`);

    // Send to printer
    const result = await printToNetwork(escposData, {
      host: printerHost,
      port: printerPort,
      timeout: 5000,
    });

    console.log(`[PRINT TEST] Result:`, result);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      config: {
        host: printerHost,
        port: printerPort,
      },
      dataSize: escposData.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[PRINT TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST to test print',
    config: {
      PRINTER_IP_ADDRESS: process.env.PRINTER_IP_ADDRESS || 'NOT SET',
      PRINTER_PORT: process.env.PRINTER_PORT || '9100',
    },
  });
}

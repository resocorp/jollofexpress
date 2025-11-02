// Test endpoint to diagnose reprint issues
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatReceipt } from '@/lib/print/format-receipt';
import { generateESCPOS } from '@/lib/print/escpos-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const diagnostics: any = {
      orderId: id,
      steps: [],
      success: false,
    };

    // Step 1: Test Supabase connection
    diagnostics.steps.push({ step: 1, name: 'Supabase connection', status: 'testing' });
    const supabase = createServiceClient();
    diagnostics.steps[0].status = 'success';

    // Step 2: Fetch order
    diagnostics.steps.push({ step: 2, name: 'Fetch order', status: 'testing' });
    
    // Determine if id is UUID or order_number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const queryField = isUUID ? 'id' : 'order_number';
    diagnostics.steps[1].queryField = queryField;
    diagnostics.steps[1].queryValue = id;
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq(queryField, id)
      .single();

    if (orderError || !order) {
      diagnostics.steps[1].status = 'failed';
      diagnostics.steps[1].error = orderError?.message || 'Order not found';
      return NextResponse.json(diagnostics);
    }
    diagnostics.steps[1].status = 'success';
    diagnostics.steps[1].orderNumber = order.order_number;

    // Step 3: Format receipt
    diagnostics.steps.push({ step: 3, name: 'Format receipt', status: 'testing' });
    const receiptData = formatReceipt(order);
    diagnostics.steps[2].status = 'success';
    diagnostics.steps[2].receiptData = receiptData;

    // Step 4: Generate ESC/POS
    diagnostics.steps.push({ step: 4, name: 'Generate ESC/POS', status: 'testing' });
    const escposData = generateESCPOS(receiptData);
    diagnostics.steps[3].status = 'success';
    diagnostics.steps[3].dataSize = escposData.length;

    // Step 5: Test print_queue insert
    diagnostics.steps.push({ step: 5, name: 'Insert into print_queue', status: 'testing' });
    const { data: insertedJob, error: printError } = await supabase
      .from('print_queue')
      .insert({
        order_id: order.id, // Use the actual UUID from the fetched order
        print_data: receiptData,
        status: 'pending',
      })
      .select()
      .single();

    if (printError) {
      diagnostics.steps[4].status = 'failed';
      diagnostics.steps[4].error = printError.message;
      diagnostics.steps[4].errorDetails = printError;
      return NextResponse.json(diagnostics);
    }
    diagnostics.steps[4].status = 'success';
    diagnostics.steps[4].jobId = insertedJob.id;

    // Step 6: Verify job in queue
    diagnostics.steps.push({ step: 6, name: 'Verify job in queue', status: 'testing' });
    const { data: verifyJob, error: verifyError } = await supabase
      .from('print_queue')
      .select('*')
      .eq('id', insertedJob.id)
      .single();

    if (verifyError || !verifyJob) {
      diagnostics.steps[5].status = 'failed';
      diagnostics.steps[5].error = verifyError?.message || 'Job not found after insert';
      return NextResponse.json(diagnostics);
    }
    diagnostics.steps[5].status = 'success';
    diagnostics.steps[5].jobData = verifyJob;

    // Step 7: Check printer configuration
    diagnostics.steps.push({ step: 7, name: 'Check printer config', status: 'testing' });
    const printerHost = process.env.PRINTER_IP_ADDRESS;
    const printerPort = parseInt(process.env.PRINTER_PORT || '9100');
    
    if (!printerHost) {
      diagnostics.steps[6].status = 'warning';
      diagnostics.steps[6].message = 'PRINTER_IP_ADDRESS not configured';
    } else {
      diagnostics.steps[6].status = 'success';
      diagnostics.steps[6].config = { host: printerHost, port: printerPort };
    }

    diagnostics.success = true;
    diagnostics.message = 'All diagnostic steps passed';

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('Diagnostic test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

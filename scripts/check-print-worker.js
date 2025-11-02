/**
 * Check Print Worker Status
 * Verifies if print worker is running and processing jobs
 * 
 * Usage: node scripts/check-print-worker.js
 */

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Print Worker Status Checker');
console.log('==============================\n');

async function checkPrintQueue() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY\n');
    return null;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check pending jobs
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('print_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (pendingError) {
      console.error('❌ Error fetching pending jobs:', pendingError.message);
      return null;
    }

    // Check recent jobs (last 10)
    const { data: recentJobs, error: recentError } = await supabase
      .from('print_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent jobs:', recentError.message);
      return null;
    }

    return { pendingJobs, recentJobs };
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return null;
  }
}

async function checkPrinterConfig() {
  console.log('📋 Printer Configuration:');
  console.log('   PRINTER_IP_ADDRESS:', process.env.PRINTER_IP_ADDRESS || '❌ NOT SET');
  console.log('   PRINTER_PORT:', process.env.PRINTER_PORT || '9100 (default)');
  console.log('   PRINT_PROCESSOR_SECRET:', process.env.PRINT_PROCESSOR_SECRET ? '✅ SET' : '❌ NOT SET');
  console.log('');
}

async function testWorkerEndpoint() {
  console.log('🔧 Testing Print Worker Endpoint...\n');
  
  const secret = process.env.PRINT_PROCESSOR_SECRET || process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error('❌ PRINT_PROCESSOR_SECRET not set');
    console.log('   Set this environment variable to test the worker\n');
    return null;
  }

  try {
    const endpoint = `${APP_URL}/api/print/process-queue`;
    const url = new URL(endpoint);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = protocol.request(endpoint, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 100)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });

    if (response.status === 200) {
      console.log('✅ Worker endpoint accessible');
      if (response.data.result) {
        console.log(`   Processed: ${response.data.result.processed}`);
        console.log(`   Succeeded: ${response.data.result.succeeded}`);
        console.log(`   Failed: ${response.data.result.failed}`);
      }
      console.log('');
      return response.data;
    } else {
      console.error(`❌ Worker endpoint error (${response.status}):`, response.data);
      console.log('');
      return null;
    }
  } catch (error) {
    console.error('❌ Cannot connect to worker endpoint:', error.message);
    console.log('   Make sure the app is running\n');
    return null;
  }
}

async function main() {
  // Check printer config
  checkPrinterConfig();

  // Check print queue
  console.log('📊 Print Queue Status:\n');
  const queueStatus = await checkPrintQueue();
  
  if (queueStatus) {
    console.log(`   Pending Jobs: ${queueStatus.pendingJobs.length}`);
    
    if (queueStatus.pendingJobs.length > 0) {
      console.log('\n   ⚠️  Pending Jobs Details:');
      queueStatus.pendingJobs.forEach((job, index) => {
        const age = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000);
        console.log(`   ${index + 1}. Job ID: ${job.id.substring(0, 8)}... (${age}s ago, attempts: ${job.attempts})`);
      });
    }
    
    console.log(`\n   Recent Jobs (last 10):`);
    const statusCounts = {
      pending: 0,
      printed: 0,
      failed: 0
    };
    
    queueStatus.recentJobs.forEach(job => {
      statusCounts[job.status]++;
    });
    
    console.log(`      Pending: ${statusCounts.pending}`);
    console.log(`      Printed: ${statusCounts.printed}`);
    console.log(`      Failed: ${statusCounts.failed}`);
    console.log('');
  }

  // Test worker endpoint
  await testWorkerEndpoint();

  // Recommendations
  console.log('📝 Recommendations:\n');
  
  if (!queueStatus) {
    console.log('   ❌ Fix database connection first');
  } else if (queueStatus.pendingJobs.length > 0) {
    console.log('   ⚠️  You have pending print jobs that aren\'t being processed!');
    console.log('   \n   Possible causes:');
    console.log('   1. Print worker is not running');
    console.log('      → Check: pm2 status');
    console.log('      → Start: pm2 start ecosystem.config.js --only print-worker');
    console.log('   \n   2. Printer IP is incorrect');
    console.log('      → Current: ' + (process.env.PRINTER_IP_ADDRESS || 'NOT SET'));
    console.log('      → Should be: 10.250.40.14 (based on your tests)');
    console.log('      → Update .env.local and restart');
    console.log('   \n   3. Worker can\'t reach printer');
    console.log('      → Test: nc -zv 10.250.40.14 9100');
    console.log('      → Check VPN connection if using');
  } else if (queueStatus.recentJobs.every(j => j.status === 'printed')) {
    console.log('   ✅ Everything looks good! All recent jobs printed successfully.');
  } else {
    console.log('   ℹ️  No pending jobs currently.');
    console.log('   Test by clicking reprint button on an order.');
  }
}

main();

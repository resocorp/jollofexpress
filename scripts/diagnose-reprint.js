/**
 * Reprint Diagnostic Script
 * Run this to diagnose why the reprint button isn't working
 * 
 * Usage:
 *   node scripts/diagnose-reprint.js ORDER_ID
 * 
 * Example:
 *   node scripts/diagnose-reprint.js 123e4567-e89b-12d3-a456-426614174000
 */

const https = require('https');
const http = require('http');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ORDER_ID = process.argv[2];

if (!ORDER_ID) {
  console.error('❌ Error: Please provide an ORDER_ID');
  console.log('\nUsage:');
  console.log('  node scripts/diagnose-reprint.js ORDER_ID');
  console.log('\nExample:');
  console.log('  node scripts/diagnose-reprint.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

console.log('🔍 Reprint Diagnostic Tool');
console.log('==========================\n');
console.log(`App URL: ${APP_URL}`);
console.log(`Order ID: ${ORDER_ID}\n`);

async function runDiagnostics() {
  try {
    console.log('📋 Running diagnostic tests...\n');

    const endpoint = `${APP_URL}/api/kitchen/orders/${ORDER_ID}/print/test`;
    const url = new URL(endpoint);
    const protocol = url.protocol === 'https:' ? https : http;

    const response = await new Promise((resolve, reject) => {
      const req = protocol.request(endpoint, { method: 'GET' }, (res) => {
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
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout after 30s'));
      });

      req.end();
    });

    if (response.status !== 200) {
      console.error(`❌ HTTP ${response.status}:`, response.data);
      process.exit(1);
    }

    const diagnostics = response.data;

    console.log('📊 Diagnostic Results:\n');
    console.log(`Order ID: ${diagnostics.orderId}`);
    console.log(`Overall Success: ${diagnostics.success ? '✅' : '❌'}\n`);

    if (diagnostics.steps) {
      console.log('Steps:');
      console.log('------');
      diagnostics.steps.forEach((step) => {
        const icon = step.status === 'success' ? '✅' : 
                     step.status === 'failed' ? '❌' : 
                     step.status === 'warning' ? '⚠️' : '⏳';
        
        console.log(`${icon} Step ${step.step}: ${step.name} - ${step.status.toUpperCase()}`);
        
        if (step.orderNumber) {
          console.log(`   Order Number: ${step.orderNumber}`);
        }
        if (step.jobId) {
          console.log(`   Job ID: ${step.jobId}`);
        }
        if (step.dataSize) {
          console.log(`   ESC/POS Data Size: ${step.dataSize} bytes`);
        }
        if (step.config) {
          console.log(`   Printer: ${step.config.host}:${step.config.port}`);
        }
        if (step.error) {
          console.log(`   ❌ Error: ${step.error}`);
        }
        if (step.message) {
          console.log(`   ℹ️  ${step.message}`);
        }
        console.log('');
      });
    }

    if (diagnostics.success) {
      console.log('✅ All diagnostic tests passed!');
      console.log('\n📝 Next Steps:');
      console.log('1. Check if print worker is running: pm2 status');
      console.log('2. Check print worker logs: pm2 logs print-worker');
      console.log('3. Verify printer IP is correct in environment variables');
      console.log('4. Test printer connectivity: nc -zv PRINTER_IP 9100');
      console.log('\n💡 If the diagnostic passed but printing still fails:');
      console.log('   - The issue is likely with the print worker or printer connectivity');
      console.log('   - Check PRINTER_IP_ADDRESS environment variable');
      console.log('   - Ensure print worker is running and processing the queue');
    } else {
      console.log('❌ Diagnostic failed. Check the errors above.');
      console.log('\n📝 Common Issues:');
      console.log('- Order not found: Check the ORDER_ID is correct');
      console.log('- Database connection: Check Supabase credentials');
      console.log('- Print queue insert: Check RLS policies or service role key');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('1. Ensure the app is running');
    console.log('2. Check NEXT_PUBLIC_APP_URL is correct');
    console.log('3. Verify the ORDER_ID exists in the database');
    process.exit(1);
  }
}

runDiagnostics();

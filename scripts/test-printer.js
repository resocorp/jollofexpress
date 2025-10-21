/**
 * Test Printer Connectivity Script
 * Tests connection to thermal printer and sends a test receipt
 * 
 * Usage:
 *   node scripts/test-printer.js
 */

const net = require('net');

// Configuration (read from environment or use defaults)
const PRINTER_IP = process.env.PRINTER_IP_ADDRESS || '192.168.100.50';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');

console.log('🖨️  Thermal Printer Test Utility');
console.log('================================\n');
console.log(`Target Printer: ${PRINTER_IP}:${PRINTER_PORT}\n`);

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';
const CUT = GS + 'V' + '\x41' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_LEFT = ESC + 'a' + '\x00';
const NORMAL = ESC + '!' + '\x00';
const BOLD = ESC + '!' + '\x08';
const LARGE = ESC + '!' + '\x30';

/**
 * Test 1: Check printer connectivity
 */
async function testConnectivity() {
  console.log('Test 1: Checking printer connectivity...');
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on('connect', () => {
      console.log('✅ SUCCESS: Connected to printer\n');
      socket.end();
      resolve(true);
    });

    socket.on('error', (err) => {
      console.log(`❌ FAILED: Cannot connect to printer`);
      console.log(`   Error: ${err.message}\n`);
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      console.log('❌ FAILED: Connection timeout (5 seconds)\n');
      socket.destroy();
      resolve(false);
    });

    socket.connect(PRINTER_PORT, PRINTER_IP);
  });
}

/**
 * Test 2: Send test receipt
 */
async function testPrint() {
  console.log('Test 2: Sending test receipt...');
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(10000);

    // Build test receipt
    const commands = [];
    
    // Initialize
    commands.push(ESC + '@'); // Initialize
    
    // Header
    commands.push(ALIGN_CENTER);
    commands.push(LARGE);
    commands.push('JOLLOF EXPRESS' + LF);
    commands.push(NORMAL);
    commands.push('='.repeat(48) + LF);
    commands.push(LF);
    
    // Test info
    commands.push(ALIGN_LEFT);
    commands.push(BOLD);
    commands.push('PRINTER TEST RECEIPT' + LF);
    commands.push(NORMAL);
    commands.push(LF);
    
    commands.push(`Date: ${new Date().toLocaleString('en-GB')}` + LF);
    commands.push(`Printer: ${PRINTER_IP}:${PRINTER_PORT}` + LF);
    commands.push(LF);
    
    commands.push('-'.repeat(48) + LF);
    commands.push('Test Items:' + LF);
    commands.push('-'.repeat(48) + LF);
    commands.push('1x Jollof Rice                    ₦2,500.00' + LF);
    commands.push('1x Chicken Suya                   ₦1,500.00' + LF);
    commands.push(LF);
    commands.push('='.repeat(48) + LF);
    commands.push('TOTAL:                            ₦4,000.00' + LF);
    commands.push('='.repeat(48) + LF);
    commands.push(LF);
    
    commands.push(ALIGN_CENTER);
    commands.push(BOLD);
    commands.push('If you can read this,' + LF);
    commands.push('your printer is working!' + LF);
    commands.push(NORMAL);
    commands.push(LF);
    
    commands.push('='.repeat(48) + LF);
    
    // Feed and cut
    commands.push(LF + LF + LF);
    commands.push(CUT);
    
    const data = Buffer.from(commands.join(''), 'binary');

    socket.on('connect', () => {
      console.log('✅ Connected to printer');
      console.log(`   Sending ${data.length} bytes...`);
      
      socket.write(data, (err) => {
        if (err) {
          console.log(`❌ FAILED: Could not send data`);
          console.log(`   Error: ${err.message}\n`);
          socket.destroy();
          resolve(false);
        } else {
          console.log('✅ SUCCESS: Data sent to printer');
          console.log('   Check if receipt printed!\n');
          setTimeout(() => {
            socket.end();
            resolve(true);
          }, 100);
        }
      });
    });

    socket.on('error', (err) => {
      console.log(`❌ FAILED: Print error`);
      console.log(`   Error: ${err.message}\n`);
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      console.log('❌ FAILED: Print timeout (10 seconds)\n');
      socket.destroy();
      resolve(false);
    });

    socket.connect(PRINTER_PORT, PRINTER_IP);
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting printer tests...\n');
  
  // Test 1: Connectivity
  const connected = await testConnectivity();
  
  if (!connected) {
    console.log('⚠️  Cannot proceed with printing test - printer not reachable');
    console.log('\nTroubleshooting:');
    console.log('  1. Check printer is powered on');
    console.log('  2. Check printer is connected to network');
    console.log('  3. Verify printer IP address is correct');
    console.log('  4. If using VPN, check VPN is connected');
    console.log(`  5. Try: ping ${PRINTER_IP}`);
    console.log(`  6. Try: nc -zv ${PRINTER_IP} ${PRINTER_PORT}`);
    process.exit(1);
  }
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Print
  const printed = await testPrint();
  
  // Summary
  console.log('================================');
  console.log('Test Summary:');
  console.log(`  Connectivity: ${connected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Printing:     ${printed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('================================\n');
  
  if (connected && printed) {
    console.log('🎉 All tests passed! Your printer is ready.');
    console.log('\nNext steps:');
    console.log('  1. Update .env.local with correct PRINTER_IP_ADDRESS');
    console.log('  2. Deploy to Digital Ocean');
    console.log('  3. Start print worker: npm run print-worker');
    console.log('  4. Create a test order and complete payment');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please fix issues and try again.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

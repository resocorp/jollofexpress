/**
 * Check Printer Status
 * Tests printer connectivity and status using ESC/POS commands
 * 
 * Usage: node scripts/check-printer-status.js [PRINTER_IP]
 * Example: node scripts/check-printer-status.js 10.250.40.14
 */

const net = require('net');

const PRINTER_IP = process.argv[2] || process.env.PRINTER_IP_ADDRESS || '192.168.100.160';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');

console.log('🖨️  Printer Status Checker');
console.log('========================\n');
console.log(`Target: ${PRINTER_IP}:${PRINTER_PORT}\n`);

/**
 * Send command and get response
 */
function sendCommand(command, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = Buffer.alloc(0);
    let timer;

    client.setTimeout(timeout);

    client.on('connect', () => {
      client.write(Buffer.from(command));
      
      timer = setTimeout(() => {
        client.end();
        resolve(responseData);
      }, 500);
    });

    client.on('data', (data) => {
      responseData = Buffer.concat([responseData, data]);
      
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        client.end();
      }, 100);
    });

    client.on('close', () => {
      if (timer) clearTimeout(timer);
      resolve(responseData);
    });

    client.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    client.on('timeout', () => {
      if (timer) clearTimeout(timer);
      client.destroy();
      reject(new Error('Connection timeout'));
    });

    client.connect(PRINTER_PORT, PRINTER_IP);
  });
}

/**
 * Check printer status
 */
async function checkPrinterStatus() {
  try {
    const command = [0x10, 0x04, 0x01]; // DLE EOT n=1
    const response = await sendCommand(command);

    if (response.length === 0) {
      console.log('⚠️  No response (printer may not support status queries)');
      return null;
    }

    const statusByte = response[0];
    console.log('📊 Printer Status:');
    console.log(`   Raw byte: 0x${statusByte.toString(16).padStart(2, '0')} (${statusByte})`);
    console.log(`   Online: ${!(statusByte & 0x08) ? '✅ Yes' : '❌ No'}`);
    console.log(`   Cover: ${!(statusByte & 0x20) ? '✅ Closed' : '⚠️  Open'}`);
    console.log(`   Paper Feed: ${!(statusByte & 0x40) ? '✅ Normal' : '⚠️  Issue'}`);
    console.log(`   Error: ${!(statusByte & 0x40) ? '✅ None' : '❌ Yes'}`);
    
    return {
      online: !(statusByte & 0x08),
      coverClosed: !(statusByte & 0x20),
      noError: !(statusByte & 0x40),
    };
  } catch (error) {
    console.error('❌ Failed to get printer status:', error.message);
    return null;
  }
}

/**
 * Check paper status
 */
async function checkPaperStatus() {
  try {
    const command = [0x10, 0x04, 0x04]; // DLE EOT n=4
    const response = await sendCommand(command);

    if (response.length === 0) {
      console.log('⚠️  No response (printer may not support paper status)');
      return null;
    }

    const statusByte = response[0];
    console.log('\n📄 Paper Status:');
    console.log(`   Raw byte: 0x${statusByte.toString(16).padStart(2, '0')} (${statusByte})`);
    console.log(`   Paper Present: ${!(statusByte & 0x60) ? '✅ Yes' : '❌ No'}`);
    console.log(`   Paper Near End: ${!!(statusByte & 0x0C) ? '⚠️  Yes' : '✅ No'}`);
    
    return {
      paperPresent: !(statusByte & 0x60),
      paperNearEnd: !!(statusByte & 0x0C),
    };
  } catch (error) {
    console.error('❌ Failed to get paper status:', error.message);
    return null;
  }
}

/**
 * Test connectivity
 */
async function testConnectivity() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(3000);

    client.on('connect', () => {
      console.log('✅ Connected to printer\n');
      client.end();
      resolve(true);
    });

    client.on('error', (err) => {
      console.error(`❌ Cannot connect: ${err.message}\n`);
      resolve(false);
    });

    client.on('timeout', () => {
      console.error('❌ Connection timeout\n');
      client.destroy();
      resolve(false);
    });

    client.connect(PRINTER_PORT, PRINTER_IP);
  });
}

/**
 * Main
 */
async function main() {
  // Test connectivity
  const connected = await testConnectivity();
  
  if (!connected) {
    console.log('💡 Troubleshooting:');
    console.log('   1. Verify printer IP:', PRINTER_IP);
    console.log('   2. Check printer is powered on');
    console.log('   3. Verify network connectivity');
    console.log('   4. If using VPN, ensure it\'s connected');
    console.log(`\n   Try: nc -zv ${PRINTER_IP} ${PRINTER_PORT}`);
    process.exit(1);
  }

  // Check status
  const printerStatus = await checkPrinterStatus();
  const paperStatus = await checkPaperStatus();

  // Summary
  console.log('\n' + '='.repeat(40));
  
  const isReady = 
    connected &&
    printerStatus?.online &&
    printerStatus?.coverClosed &&
    printerStatus?.noError &&
    paperStatus?.paperPresent;

  if (isReady) {
    console.log('✅ PRINTER READY');
    console.log('\nYou can now print orders!');
  } else {
    console.log('⚠️  PRINTER NOT READY');
    console.log('\nIssues detected:');
    if (!printerStatus?.online) console.log('   - Printer is offline');
    if (!printerStatus?.coverClosed) console.log('   - Printer cover is open');
    if (!printerStatus?.noError) console.log('   - Printer has an error');
    if (!paperStatus?.paperPresent) console.log('   - No paper loaded');
    
    if (paperStatus?.paperNearEnd) {
      console.log('\n⚠️  Warning: Paper is running low');
    }
  }

  console.log('='.repeat(40));
}

main();

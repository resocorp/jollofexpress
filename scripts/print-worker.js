/**
 * Background Print Queue Worker
 * Runs continuously and processes print queue at regular intervals
 * 
 * Usage:
 *   NODE_ENV=production node scripts/print-worker.js
 * 
 * Or add to package.json:
 *   "print-worker": "node scripts/print-worker.js"
 * 
 * Deploy with PM2 for auto-restart:
 *   pm2 start scripts/print-worker.js --name "print-worker"
 */

// Load environment variables from .env.local
const path = require('path');
const fs = require('fs');

// Try to load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Only set if not already set (allow env vars to override file)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('✅ Loaded .env.local');
} else {
  console.warn('⚠️  .env.local not found, using environment variables');
}

const https = require('https');
const http = require('http');

// Configuration
// Use localhost for internal communication (faster, no proxy issues)
const APP_URL = process.env.PRINT_WORKER_APP_URL || 'http://localhost:3000';
const PROCESS_INTERVAL = parseInt(process.env.PRINT_PROCESS_INTERVAL || '15000'); // 15 seconds
const SECRET = process.env.PRINT_PROCESSOR_SECRET || process.env.WEBHOOK_SECRET;
const STARTUP_DELAY = parseInt(process.env.PRINT_WORKER_STARTUP_DELAY || '10000'); // Wait 10s for app to start

if (!SECRET) {
  console.error('❌ PRINT_PROCESSOR_SECRET or WEBHOOK_SECRET environment variable required');
  process.exit(1);
}

console.log('🖨️  Print Queue Worker Starting...');
console.log(`   App URL: ${APP_URL}`);
console.log(`   Interval: ${PROCESS_INTERVAL}ms (${PROCESS_INTERVAL / 1000}s)`);
console.log(`   Startup Delay: ${STARTUP_DELAY}ms (${STARTUP_DELAY / 1000}s)`);
console.log('');

let isProcessing = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;

/**
 * Process print queue via API call
 */
async function processPrintQueue() {
  if (isProcessing) {
    console.log('⏭️  Skipping - already processing');
    return;
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    const endpoint = `${APP_URL}/api/print/process-queue`;
    const url = new URL(endpoint);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET}`,
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
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout after 30s'));
      });

      req.end();
    });

    const duration = Date.now() - startTime;

    if (response.status === 200 && response.data.success) {
      const result = response.data.result;
      
      if (result.processed > 0) {
        console.log(`✅ Processed ${result.processed} job(s): ${result.succeeded} succeeded, ${result.failed} failed (${duration}ms)`);
        
        if (result.errors && result.errors.length > 0) {
          console.warn('⚠️  Errors:');
          result.errors.forEach(err => {
            console.warn(`   - Job ${err.jobId}: ${err.error}`);
          });
        }
      }
      
      consecutiveErrors = 0; // Reset error counter
    } else {
      console.error(`❌ API returned error: ${response.status}`, response.data);
      consecutiveErrors++;
    }

  } catch (error) {
    console.error(`❌ Processing error: ${error.message}`);
    consecutiveErrors++;
  } finally {
    isProcessing = false;
    
    // If too many consecutive errors, exit and let PM2 restart
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`💀 Too many consecutive errors (${consecutiveErrors}). Exiting...`);
      process.exit(1);
    }
  }
}

/**
 * Health check - test printer connectivity every 5 minutes
 */
async function healthCheck() {
  try {
    const endpoint = `${APP_URL}/api/print/process-queue`;
    const url = new URL(endpoint);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SECRET}`,
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
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });

      req.end();
    });

    if (response.status === 200) {
      const status = response.data.status;
      console.log(`🏥 Health: Printer ${status === 'online' ? '✅ online' : '❌ offline'} - ${response.data.message}`);
    }
  } catch (error) {
    console.error(`🏥 Health check failed: ${error.message}`);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down print worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down print worker...');
  process.exit(0);
});

/**
 * Wait for app to be ready
 */
async function waitForApp() {
  console.log('⏳ Waiting for app to be ready...');
  
  const maxAttempts = 30; // 30 attempts = 30 seconds
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const url = new URL(APP_URL);
      const protocol = url.protocol === 'https:' ? https : http;
      
      await new Promise((resolve, reject) => {
        const req = protocol.get(APP_URL, { timeout: 2000 }, (res) => {
          resolve(res.statusCode);
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      
      console.log('✅ App is ready!\n');
      return true;
    } catch (error) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  console.warn('⚠️  App not responding, starting anyway...\n');
  return false;
}

/**
 * Start the worker
 */
async function startWorker() {
  console.log('🚀 Starting print queue processor...\n');
  
  // Wait for app to be ready
  await waitForApp();
  
  // Process immediately on start
  processPrintQueue();
  
  // Then process at regular intervals
  setInterval(processPrintQueue, PROCESS_INTERVAL);
  
  // Health check every 5 minutes
  setInterval(healthCheck, 5 * 60 * 1000);
  
  console.log('✅ Print worker is running. Press Ctrl+C to stop.\n');
}

// Start with a delay to let the main app fully initialize
setTimeout(startWorker, STARTUP_DELAY);

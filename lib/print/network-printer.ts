/**
 * Network Printer Client with Status Checking
 * Sends raw data to thermal printer over TCP (port 9100)
 * Works with printers accessible over VPN as if they're on local LAN
 * Supports ESC/POS status query commands for real-time feedback
 */

import { Socket } from 'net';

export interface PrinterConfig {
  host: string;        // Printer IP address (e.g., "192.168.1.100")
  port: number;        // Usually 9100 for thermal printers
  timeout?: number;    // Connection timeout in ms (default: 5000)
}

export interface PrintResult {
  success: boolean;
  message: string;
  error?: Error;
}

export interface PrinterStatus {
  connected: boolean;
  online?: boolean;
  coverClosed?: boolean;
  paperNotFeeding?: boolean;
  noError?: boolean;
  rawStatus?: number;
  error?: string;
}

export interface PaperStatus {
  connected: boolean;
  paperPresent?: boolean;
  paperNearEnd?: boolean;
  rawStatus?: number;
  error?: string;
}

export interface ReadyCheck {
  ready: boolean;
  details: {
    connected: boolean;
    online?: boolean;
    coverClosed?: boolean;
    paperPresent?: boolean;
    paperNearEnd?: boolean;
  };
}

/**
 * Send raw data to network printer via TCP
 */
export async function printToNetwork(
  data: Buffer,
  config: PrinterConfig
): Promise<PrintResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const timeout = config.timeout || 5000;
    let isResolved = false;

    // Set timeout
    socket.setTimeout(timeout);

    // Connection successful
    socket.on('connect', () => {
      console.log(`✓ Connected to printer at ${config.host}:${config.port}`);
      
      // Send data to printer
      socket.write(data, (err) => {
        if (err) {
          if (!isResolved) {
            isResolved = true;
            socket.destroy();
            resolve({
              success: false,
              message: 'Failed to send data to printer',
              error: err,
            });
          }
        } else {
          console.log(`✓ Sent ${data.length} bytes to printer`);
          // Wait a moment for printer to receive all data
          setTimeout(() => {
            socket.end();
          }, 100);
        }
      });
    });

    // Connection closed successfully
    socket.on('close', () => {
      if (!isResolved) {
        isResolved = true;
        resolve({
          success: true,
          message: 'Print job sent successfully',
        });
      }
    });

    // Connection error
    socket.on('error', (err) => {
      console.error(`✗ Printer connection error: ${err.message}`);
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          success: false,
          message: `Printer connection failed: ${err.message}`,
          error: err,
        });
      }
    });

    // Timeout
    socket.on('timeout', () => {
      console.error(`✗ Printer connection timeout after ${timeout}ms`);
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          success: false,
          message: `Printer connection timeout (${timeout}ms)`,
          error: new Error('Connection timeout'),
        });
      }
    });

    // Initiate connection
    console.log(`Connecting to printer at ${config.host}:${config.port}...`);
    socket.connect(config.port, config.host);
  });
}

/**
 * Test printer connectivity
 */
export async function testPrinterConnection(config: PrinterConfig): Promise<PrintResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const timeout = config.timeout || 3000;
    let isResolved = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        socket.end();
        resolve({
          success: true,
          message: `Printer is online at ${config.host}:${config.port}`,
        });
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          success: false,
          message: `Cannot reach printer: ${err.message}`,
          error: err,
        });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          success: false,
          message: `Printer not responding (timeout: ${timeout}ms)`,
          error: new Error('Connection timeout'),
        });
      }
    });

    socket.connect(config.port, config.host);
  });
}

/**
 * Send command and wait for response
 */
async function sendCommandWithResponse(
  command: Buffer,
  config: PrinterConfig,
  timeout: number = 2000
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let responseData = Buffer.alloc(0);
    let responseTimer: NodeJS.Timeout;
    let isResolved = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.write(command, (err) => {
        if (err) {
          if (!isResolved) {
            isResolved = true;
            socket.destroy();
            resolve(null);
          }
        }
      });

      // Wait for response
      responseTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve(responseData.length > 0 ? responseData : null);
        }
      }, 500);
    });

    socket.on('data', (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
      
      // Reset timer when receiving data
      if (responseTimer) {
        clearTimeout(responseTimer);
      }
      responseTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          socket.end();
        }
      }, 100);
    });

    socket.on('close', () => {
      if (responseTimer) {
        clearTimeout(responseTimer);
      }
      if (!isResolved) {
        isResolved = true;
        resolve(responseData.length > 0 ? responseData : null);
      }
    });

    socket.on('error', () => {
      if (responseTimer) {
        clearTimeout(responseTimer);
      }
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(null);
      }
    });

    socket.on('timeout', () => {
      if (responseTimer) {
        clearTimeout(responseTimer);
      }
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(responseData.length > 0 ? responseData : null);
      }
    });

    socket.connect(config.port, config.host);
  });
}

/**
 * Get printer status using ESC/POS command
 * DLE EOT n=1 (0x10 0x04 0x01)
 */
export async function getPrinterStatus(config: PrinterConfig): Promise<PrinterStatus> {
  try {
    const statusCommand = Buffer.from([0x10, 0x04, 0x01]); // DLE EOT n=1
    const response = await sendCommandWithResponse(statusCommand, config);

    if (!response || response.length === 0) {
      return {
        connected: false,
        error: 'No response from printer',
      };
    }

    const statusByte = response[0];
    
    return {
      connected: true,
      online: !(statusByte & 0x08),
      coverClosed: !(statusByte & 0x20),
      paperNotFeeding: !(statusByte & 0x40),
      noError: !(statusByte & 0x40),
      rawStatus: statusByte,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get paper status using ESC/POS command
 * DLE EOT n=4 (0x10 0x04 0x04)
 */
export async function getPaperStatus(config: PrinterConfig): Promise<PaperStatus> {
  try {
    const statusCommand = Buffer.from([0x10, 0x04, 0x04]); // DLE EOT n=4
    const response = await sendCommandWithResponse(statusCommand, config);

    if (!response || response.length === 0) {
      return {
        connected: false,
        error: 'No response from printer',
      };
    }

    const statusByte = response[0];
    
    return {
      connected: true,
      paperPresent: !(statusByte & 0x60),
      paperNearEnd: !!(statusByte & 0x0C),
      rawStatus: statusByte,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if printer is ready to print
 */
export async function isPrinterReady(config: PrinterConfig): Promise<ReadyCheck> {
  const printerStatus = await getPrinterStatus(config);
  const paperStatus = await getPaperStatus(config);

  const ready = 
    printerStatus.connected &&
    printerStatus.online === true &&
    printerStatus.coverClosed === true &&
    paperStatus.connected &&
    paperStatus.paperPresent === true;

  return {
    ready,
    details: {
      connected: printerStatus.connected,
      online: printerStatus.online,
      coverClosed: printerStatus.coverClosed,
      paperPresent: paperStatus.paperPresent,
      paperNearEnd: paperStatus.paperNearEnd,
    },
  };
}

/**
 * Print with status verification
 */
export async function printToNetworkWithVerification(
  data: Buffer,
  config: PrinterConfig
): Promise<PrintResult> {
  // Check printer status first
  const readyCheck = await isPrinterReady(config);
  
  if (!readyCheck.ready) {
    const issues: string[] = [];
    if (!readyCheck.details.connected) issues.push('not connected');
    if (readyCheck.details.online === false) issues.push('offline');
    if (readyCheck.details.coverClosed === false) issues.push('cover open');
    if (readyCheck.details.paperPresent === false) issues.push('no paper');
    
    return {
      success: false,
      message: `Printer not ready: ${issues.join(', ')}`,
      error: new Error('Printer not ready'),
    };
  }

  // Warn if paper is near end
  if (readyCheck.details.paperNearEnd) {
    console.warn('⚠️  Printer paper is running low');
  }

  // Print normally
  return printToNetwork(data, config);
}

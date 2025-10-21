/**
 * Network Printer Client
 * Sends raw data to thermal printer over TCP (port 9100)
 * Works with printers accessible over VPN as if they're on local LAN
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

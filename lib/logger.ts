/**
 * Centralized logging utility
 * Provides structured logging with different levels
 * Automatically disables debug logs in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;
  private isServer: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    const emoji = this.getEmoji(level);
    
    return `${emoji} ${prefix} ${message}`;
  }

  /**
   * Get emoji for log level
   */
  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    return emojis[level];
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, options?: LoggerOptions): void {
    if (!this.isDevelopment) return;

    const formattedMessage = this.formatMessage('debug', message, options?.context);
    console.log(formattedMessage, options?.data || '');
  }

  /**
   * Info logging - all environments
   */
  info(message: string, options?: LoggerOptions): void {
    const formattedMessage = this.formatMessage('info', message, options?.context);
    console.info(formattedMessage, options?.data || '');
  }

  /**
   * Warning logging - all environments
   */
  warn(message: string, options?: LoggerOptions): void {
    const formattedMessage = this.formatMessage('warn', message, options?.context);
    console.warn(formattedMessage, options?.data || '');
  }

  /**
   * Error logging - all environments
   */
  error(message: string, error?: Error | unknown, options?: LoggerOptions): void {
    const formattedMessage = this.formatMessage('error', message, options?.context);
    
    if (error instanceof Error) {
      console.error(formattedMessage, {
        message: error.message,
        stack: error.stack,
        ...options?.data,
      });
    } else {
      console.error(formattedMessage, error, options?.data || '');
    }
  }

  /**
   * Performance logging - measures execution time
   */
  async measurePerformance<T>(
    label: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    if (!this.isDevelopment) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = await fn();
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`${label} completed in ${duration}ms`, { context });
      return result;
    } catch (error) {
      const duration = (performance.now() - start).toFixed(2);
      this.error(`${label} failed after ${duration}ms`, error, { context });
      throw error;
    }
  }

  /**
   * Log API request/response - development only
   */
  api(method: string, endpoint: string, status?: number, duration?: number): void {
    if (!this.isDevelopment) return;

    const statusEmoji = status && status < 400 ? '✅' : '❌';
    const durationText = duration ? ` (${duration.toFixed(2)}ms)` : '';
    
    this.debug(
      `${statusEmoji} ${method} ${endpoint}${durationText}`,
      { context: 'API', data: { status } }
    );
  }

  /**
   * Log database query - development only
   */
  db(query: string, duration?: number, error?: Error): void {
    if (!this.isDevelopment) return;

    if (error) {
      this.error(`DB Query failed: ${query}`, error, { context: 'Database' });
    } else {
      const durationText = duration ? ` (${duration.toFixed(2)}ms)` : '';
      this.debug(`Query${durationText}: ${query}`, { context: 'Database' });
    }
  }

  /**
   * Server-only logging
   */
  server(message: string, options?: LoggerOptions): void {
    if (!this.isServer) return;
    this.info(message, { ...options, context: options?.context || 'Server' });
  }

  /**
   * Client-only logging
   */
  client(message: string, options?: LoggerOptions): void {
    if (this.isServer) return;
    this.info(message, { ...options, context: options?.context || 'Client' });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export { Logger };

/**
 * Usage Examples:
 * 
 * // Debug (development only)
 * logger.debug('User data loaded', { context: 'Auth', data: { userId: '123' } });
 * 
 * // Info (all environments)
 * logger.info('Order placed successfully', { context: 'Orders' });
 * 
 * // Warning
 * logger.warn('Rate limit approaching', { context: 'API' });
 * 
 * // Error
 * logger.error('Failed to fetch orders', error, { context: 'Orders' });
 * 
 * // Performance measurement
 * const result = await logger.measurePerformance(
 *   'Fetch menu items',
 *   async () => await fetchMenuItems(),
 *   'Menu'
 * );
 * 
 * // API logging
 * logger.api('GET', '/api/orders', 200, 45.23);
 * 
 * // Database logging
 * logger.db('SELECT * FROM orders WHERE status = $1', 12.5);
 * 
 * // Server-only
 * logger.server('Cron job started');
 * 
 * // Client-only
 * logger.client('User clicked checkout button');
 */

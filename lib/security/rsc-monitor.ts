/**
 * RSC Security Monitor
 * Monitors and logs suspicious activity related to CVE-2025-55184 and CVE-2025-55183
 */

export interface SecurityEvent {
  type: 'rate_limit' | 'large_payload' | 'suspicious_request' | 'source_exposure_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  path: string;
  details: Record<string, any>;
  timestamp: string;
}

class RSCSecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(fullEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console based on severity
    const logMethod = this.getLogMethod(event.severity);
    logMethod('[RSC Security]', {
      type: event.type,
      severity: event.severity,
      ip: event.ip,
      path: event.path,
      details: event.details,
      timestamp: fullEvent.timestamp,
    });

    // In production, send to monitoring service (e.g., Sentry, DataDog)
    if (process.env.NODE_ENV === 'production' && event.severity === 'critical') {
      this.alertCriticalEvent(fullEvent);
    }
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by IP
   */
  getEventsByIP(ip: string): SecurityEvent[] {
    return this.events.filter(event => event.ip === ip);
  }

  /**
   * Check if IP is suspicious (multiple security events)
   */
  isSuspiciousIP(ip: string, threshold = 5): boolean {
    const ipEvents = this.getEventsByIP(ip);
    return ipEvents.length >= threshold;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentEvents = this.events.filter(
      event => new Date(event.timestamp).getTime() > oneHourAgo
    );

    return {
      totalEvents: this.events.length,
      eventsLastHour: recentEvents.length,
      byType: {
        rate_limit: this.events.filter(e => e.type === 'rate_limit').length,
        large_payload: this.events.filter(e => e.type === 'large_payload').length,
        suspicious_request: this.events.filter(e => e.type === 'suspicious_request').length,
        source_exposure_attempt: this.events.filter(e => e.type === 'source_exposure_attempt').length,
      },
      bySeverity: {
        low: this.events.filter(e => e.severity === 'low').length,
        medium: this.events.filter(e => e.severity === 'medium').length,
        high: this.events.filter(e => e.severity === 'high').length,
        critical: this.events.filter(e => e.severity === 'critical').length,
      },
    };
  }

  /**
   * Clear all events (useful for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  private getLogMethod(severity: SecurityEvent['severity']) {
    switch (severity) {
      case 'critical':
      case 'high':
        return console.error;
      case 'medium':
        return console.warn;
      case 'low':
      default:
        return console.log;
    }
  }

  private alertCriticalEvent(event: SecurityEvent): void {
    // TODO: Integrate with your monitoring service
    // Examples:
    // - Sentry.captureException()
    // - DataDog.logEvent()
    // - Send email/SMS alert
    // - Trigger incident response
    
    console.error('[CRITICAL SECURITY ALERT]', event);
  }
}

// Singleton instance
export const rscMonitor = new RSCSecurityMonitor();

/**
 * Helper function to detect potential source code exposure attempts
 */
export function detectSourceExposureAttempt(
  headers: Headers,
  body?: any
): boolean {
  // Check for suspicious patterns that might indicate CVE-2025-55183 exploitation
  const suspiciousPatterns = [
    'function',
    'export',
    'import',
    '__webpack',
    'sourceMap',
    '.map',
  ];

  const headerString = JSON.stringify(Object.fromEntries(headers.entries())).toLowerCase();
  const bodyString = body ? JSON.stringify(body).toLowerCase() : '';

  return suspiciousPatterns.some(
    pattern => headerString.includes(pattern) || bodyString.includes(pattern)
  );
}

/**
 * Helper function to validate RSC request integrity
 */
export function validateRSCRequest(request: {
  headers: Headers;
  method: string;
  url: string;
}): { valid: boolean; reason?: string } {
  // Check for malformed RSC requests
  const contentType = request.headers.get('content-type');
  const rscHeader = request.headers.get('rsc');

  // RSC requests should have specific characteristics
  if (rscHeader && contentType && !contentType.includes('text/x-component')) {
    return {
      valid: false,
      reason: 'Malformed RSC request: invalid content-type',
    };
  }

  // Check for suspicious method combinations
  if (rscHeader && !['GET', 'POST'].includes(request.method)) {
    return {
      valid: false,
      reason: `Suspicious RSC request method: ${request.method}`,
    };
  }

  return { valid: true };
}

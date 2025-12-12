# Security Documentation

## RSC Vulnerability Protections (CVE-2025-55184 & CVE-2025-55183)

This document outlines the security measures implemented to protect against React Server Components (RSC) vulnerabilities.

### Vulnerabilities Addressed

#### CVE-2025-55184 (High Severity - Denial of Service)
- **Description**: Malicious HTTP requests can cause server process to hang and consume CPU
- **Impact**: Server unavailability, resource exhaustion
- **Mitigation**: Rate limiting, payload validation, request monitoring

#### CVE-2025-55183 (Medium Severity - Source Code Exposure)
- **Description**: Malicious requests can expose compiled source code of Server Actions
- **Impact**: Business logic exposure, potential secret leakage if hardcoded
- **Mitigation**: Security headers, request validation, monitoring

---

## Implemented Protections

### 1. Next.js Version Update
- **Current Version**: 15.5.8 (includes patches for both CVEs)
- **Action Required**: Run `npm install` to update dependencies

### 2. Rate Limiting Middleware (`middleware.ts`)

#### Features:
- **RSC-specific rate limiting**: 100 requests per minute per IP
- **Payload size limits**: Maximum 1MB per request
- **Suspicious payload detection**: Logs payloads > 100KB
- **Client identification**: Uses X-Forwarded-For, X-Real-IP headers

#### Configuration:
```typescript
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,        // Max requests per window
  windowMs: 60000,         // 1 minute window
  maxPayloadSize: 1024 * 1024,  // 1MB max
  suspiciousPayloadThreshold: 100 * 1024,  // 100KB
};
```

#### Customization:
Edit `middleware.ts` to adjust limits based on your traffic patterns.

### 3. Security Headers (`next.config.ts`)

Implemented headers:
- `Strict-Transport-Security`: Enforces HTTPS
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Enables XSS filter
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features

### 4. Security Monitoring (`lib/security/rsc-monitor.ts`)

#### Features:
- Real-time event logging
- IP-based threat detection
- Statistical analysis
- Severity-based alerting

#### Event Types:
- `rate_limit`: Rate limit violations
- `large_payload`: Oversized payloads
- `suspicious_request`: Malformed RSC requests
- `source_exposure_attempt`: Potential CVE-2025-55183 exploitation

#### Usage:
```typescript
import { rscMonitor } from '@/lib/security/rsc-monitor';

rscMonitor.logEvent({
  type: 'suspicious_request',
  severity: 'high',
  ip: clientIp,
  path: request.url,
  details: { reason: 'Malformed RSC header' },
});
```

### 5. Security Dashboard API

**Endpoint**: `/api/security/dashboard`

**⚠️ IMPORTANT**: This endpoint is currently unprotected. Add authentication before deploying to production!

#### Available Actions:
- `?action=stats` - Get security statistics
- `?action=events&limit=100` - Get recent events
- `?action=by-type&type=rate_limit` - Filter by event type
- `?action=by-ip&ip=1.2.3.4` - Filter by IP address

---

## Deployment Checklist

### Before Deploying:

- [ ] Run `npm install` to update Next.js to 15.5.8
- [ ] Review and adjust rate limit configuration in `middleware.ts`
- [ ] Add authentication to `/api/security/dashboard` endpoint
- [ ] Set up production monitoring service integration
- [ ] Configure environment variables (if any)
- [ ] Test rate limiting with load testing tools
- [ ] Review security headers for your specific requirements
- [ ] Set up alerts for critical security events

### Production Monitoring:

1. **Integrate with Monitoring Service**
   - Edit `lib/security/rsc-monitor.ts` → `alertCriticalEvent()`
   - Add Sentry, DataDog, or your preferred service
   - Configure alert thresholds

2. **Use Redis for Rate Limiting**
   - Current implementation uses in-memory storage
   - For multi-instance deployments, use Redis:
   ```typescript
   // Example with Redis
   import Redis from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);
   ```

3. **Log Aggregation**
   - Forward security logs to centralized logging
   - Set up log retention policies
   - Create dashboards for security metrics

### Environment Variables:

Add to `.env.local` if needed:
```bash
# Security Configuration
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
MAX_PAYLOAD_SIZE=1048576

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
```

---

## Testing

### Manual Testing:

1. **Test Rate Limiting**:
   ```bash
   # Send multiple requests rapidly
   for i in {1..150}; do curl http://localhost:3000/; done
   ```

2. **Test Large Payload**:
   ```bash
   # Send large payload
   curl -X POST http://localhost:3000/api/test \
     -H "Content-Type: application/json" \
     -d @large-payload.json
   ```

3. **View Security Dashboard**:
   ```bash
   curl http://localhost:3000/api/security/dashboard?action=stats
   ```

### Automated Testing:

Consider adding security tests:
```typescript
// Example test
describe('RSC Security', () => {
  it('should block requests exceeding rate limit', async () => {
    // Send 101 requests
    // Expect 429 response
  });

  it('should reject oversized payloads', async () => {
    // Send 2MB payload
    // Expect 413 response
  });
});
```

---

## Incident Response

### If You Detect an Attack:

1. **Immediate Actions**:
   - Check `/api/security/dashboard` for attack details
   - Identify attacking IP addresses
   - Block IPs at firewall/CDN level if needed

2. **Investigation**:
   - Review security logs
   - Check for data exposure
   - Analyze attack patterns

3. **Mitigation**:
   - Adjust rate limits if needed
   - Update security rules
   - Deploy additional protections

4. **Post-Incident**:
   - Document the incident
   - Update security measures
   - Review and improve monitoring

---

## Additional Security Best Practices

### Server Actions:
1. **Never hardcode secrets** in Server Actions
2. **Always validate input** before processing
3. **Use environment variables** for sensitive data
4. **Implement proper error handling** (don't expose stack traces)

### Example Secure Server Action:
```typescript
'use server'

import { z } from 'zod';

const schema = z.object({
  userId: z.string(),
  action: z.enum(['create', 'update', 'delete']),
});

export async function secureAction(formData: FormData) {
  // 1. Validate input
  const parsed = schema.safeParse({
    userId: formData.get('userId'),
    action: formData.get('action'),
  });

  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  // 2. Authenticate
  const session = await getServerSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  // 3. Authorize
  if (session.user.id !== parsed.data.userId) {
    return { error: 'Forbidden' };
  }

  // 4. Process safely
  try {
    // Your business logic here
    return { success: true };
  } catch (error) {
    // Don't expose error details
    console.error('Action failed:', error);
    return { error: 'Operation failed' };
  }
}
```

---

## Maintenance

### Regular Tasks:
- [ ] Weekly: Review security dashboard statistics
- [ ] Monthly: Update dependencies (`npm audit`, `npm update`)
- [ ] Quarterly: Review and update security configurations
- [ ] Annually: Security audit and penetration testing

### Monitoring Checklist:
- [ ] Set up alerts for critical security events
- [ ] Monitor rate limit violations
- [ ] Track suspicious IP addresses
- [ ] Review payload size trends
- [ ] Monitor server resource usage

---

## Support and Resources

### Official Security Advisories:
- [Next.js Security](https://nextjs.org/docs/security)
- [React Security](https://react.dev/learn/security)
- [Vercel Security](https://vercel.com/security)

### Reporting Security Issues:
- Next.js: security@vercel.com
- React: security@react.dev

### Internal Contacts:
- Security Team: [Add your team contact]
- DevOps Team: [Add your team contact]
- On-Call Engineer: [Add on-call rotation]

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-12 | 1.0.0 | Initial security implementation for CVE-2025-55184 & CVE-2025-55183 |

---

**Last Updated**: December 12, 2025  
**Next Review**: March 12, 2025

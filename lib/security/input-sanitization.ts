// Input Sanitization Utilities
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize user input strings
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potential XSS patterns
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Nigerian phone validation
  const nigerianRegex = /^(\+?234|0)[789]\d{9}$/;

  if (!nigerianRegex.test(cleaned)) {
    throw new Error('Invalid Nigerian phone number format');
  }

  return cleaned;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  const sanitized = email.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number): number {
  const num = Number(input);

  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }

  return num;
}

/**
 * Validate price/monetary value
 */
export function validatePrice(price: number, min = 0, max = 1000000): number {
  const sanitized = sanitizeNumber(price);

  if (sanitized < min || sanitized > max) {
    throw new Error(`Price must be between ${min} and ${max}`);
  }

  // Round to 2 decimal places
  return Math.round(sanitized * 100) / 100;
}

/**
 * Sanitize object keys and values recursively
 */
export function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Prevent SQL injection by validating UUIDs
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Rate limit specific operations by key (e.g., by IP, user ID, etc.)
 * This is a simple in-memory implementation. For production, use Redis.
 */
const operationLimits = new Map<string, { count: number; resetTime: number }>();

export function checkOperationLimit(
  key: string,
  maxOperations: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = operationLimits.get(key);

  if (!record || now > record.resetTime) {
    operationLimits.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxOperations - 1 };
  }

  if (record.count >= maxOperations) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxOperations - record.count };
}

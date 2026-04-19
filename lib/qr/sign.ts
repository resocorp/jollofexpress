import crypto from 'crypto';

// HMAC-signed token used as the QR payload on printed receipts.
// Format: base64url(orderId).base64url(HMAC_SHA256(orderId, secret)[:16])
// Truncated MAC keeps the token short (~60 chars) — sufficient for dispatch auth
// since the token is also validated against a stored DB value.

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('QR_SIGNING_SECRET env var is missing or too short (min 16 chars)');
  }
  return secret;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signOrderToken(orderId: string): string {
  const secret = getSecret();
  const idPart = b64url(Buffer.from(orderId, 'utf8'));
  const mac = crypto.createHmac('sha256', secret).update(orderId).digest().subarray(0, 16);
  return `${idPart}.${b64url(mac)}`;
}

// Returns orderId if signature is valid, null otherwise.
export function verifyOrderToken(token: string): string | null {
  try {
    const [idPart, sigPart] = token.split('.');
    if (!idPart || !sigPart) return null;
    const orderId = b64urlDecode(idPart).toString('utf8');
    const expected = crypto
      .createHmac('sha256', getSecret())
      .update(orderId)
      .digest()
      .subarray(0, 16);
    const received = b64urlDecode(sigPart);
    if (expected.length !== received.length) return null;
    if (!crypto.timingSafeEqual(expected, received)) return null;
    return orderId;
  } catch {
    return null;
  }
}

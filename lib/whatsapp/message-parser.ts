// WhatsApp Message Parser - Parses incoming messages and extracts commands

import type { 
  UltraMsgWebhookPayload, 
  UltraMsgMessageData,
  ParsedMessage, 
  ParsedCommand, 
  CommandType 
} from './types';

/**
 * Parse raw webhook payload from Ultra MSG
 */
export function parseWebhookPayload(payload: UltraMsgWebhookPayload): ParsedMessage | null {
  const { data } = payload;
  
  // Ignore messages sent by us
  if (data.fromMe) {
    return null;
  }
  
  // Extract phone number (remove @c.us suffix)
  const phone = extractPhoneNumber(data.from);
  
  if (!phone) {
    console.error('Could not extract phone number from:', data.from);
    return null;
  }
  
  const baseMessage: ParsedMessage = {
    phone,
    messageId: data.id,
    type: 'unknown',
    timestamp: data.time,
  };
  
  // Handle different message types
  switch (data.type) {
    case 'chat':
      return {
        ...baseMessage,
        type: 'text',
        text: data.body?.trim() || '',
      };
    
    case 'location':
      // Handle nested location object (current UltraMsg format)
      if (data.location?.latitude !== undefined && data.location?.longitude !== undefined) {
        return {
          ...baseMessage,
          type: 'location',
          location: {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            address: data.location.address || undefined,
          },
        };
      }
      // Handle legacy flat format (fallback)
      if (data.lat !== undefined && data.lng !== undefined) {
        return {
          ...baseMessage,
          type: 'location',
          location: {
            latitude: data.lat,
            longitude: data.lng,
            address: data.loc || undefined,
          },
        };
      }
      return baseMessage;
    
    case 'image':
    case 'document':
    case 'audio':
    case 'video':
      return {
        ...baseMessage,
        type: 'media',
        text: data.caption || '',
      };
    
    default:
      return baseMessage;
  }
}

/**
 * Extract phone number from WhatsApp format (234XXXXXXXXXX@c.us)
 */
function extractPhoneNumber(from: string): string | null {
  // Remove @c.us or @s.whatsapp.net suffix
  const cleaned = from.replace(/@[cs]\.(us|whatsapp\.net)$/i, '');
  
  // Validate it looks like a phone number
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Parse user message text into a command
 */
export function parseCommand(text: string): ParsedCommand {
  const normalized = text.trim().toUpperCase();
  const raw = text.trim();
  
  // Check for exact keyword commands first
  const keywordCommands: Record<string, CommandType> = {
    'MENU': 'MENU',
    'M': 'MENU',
    'CART': 'CART',
    'C': 'CART',
    'CHECKOUT': 'CHECKOUT',
    'PAY': 'CHECKOUT',
    'ORDER': 'CHECKOUT',
    'CLEAR': 'CLEAR',
    'EMPTY': 'CLEAR',
    'HELP': 'HELP',
    'H': 'HELP',
    '?': 'HELP',
    'CANCEL': 'CANCEL',
    'X': 'CANCEL',
    'BACK': 'BACK',
    'B': 'BACK',
    'YES': 'YES',
    'Y': 'YES',
    'CONFIRM': 'YES',
    'OK': 'YES',
    'NO': 'NO',
    'N': 'NO',
    'DONE': 'DONE',
    'D': 'DONE',
    'FINISH': 'DONE',
    'REORDER': 'REORDER',
    'R': 'REORDER',
    'REPEAT': 'REORDER',
    'AGAIN': 'REORDER',
    'LAST ORDER': 'REORDER',
    'HI': 'MENU',
    'HELLO': 'MENU',
    'START': 'MENU',
  };
  
  if (keywordCommands[normalized]) {
    return {
      type: keywordCommands[normalized],
      raw,
    };
  }
  
  // Check for number selection (single number or comma-separated)
  // Matches: "1", "2", "1,2,3", "1, 2, 3", "1 2 3"
  const numberPattern = /^[\d,\s]+$/;
  if (numberPattern.test(normalized)) {
    const numbers = raw
      .split(/[,\s]+/)
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length > 0) {
      return {
        type: 'NUMBER_SELECTION',
        value: numbers.length === 1 ? numbers[0] : numbers,
        raw,
      };
    }
  }
  
  // Check for quantity format (e.g., "x2", "×3", "2x", "*2")
  const quantityPattern = /^[x×*]?\s*(\d+)\s*[x×*]?$/i;
  const quantityMatch = normalized.match(quantityPattern);
  if (quantityMatch) {
    const qty = parseInt(quantityMatch[1], 10);
    if (qty > 0 && qty <= 20) {
      return {
        type: 'QUANTITY',
        value: qty,
        raw,
      };
    }
  }
  
  // Check for "add X" or "X more" pattern
  const addPattern = /^(?:add\s+)?(\d+)(?:\s+more)?$/i;
  const addMatch = raw.match(addPattern);
  if (addMatch) {
    const qty = parseInt(addMatch[1], 10);
    if (qty > 0 && qty <= 20) {
      return {
        type: 'QUANTITY',
        value: qty,
        raw,
      };
    }
  }
  
  // Otherwise treat as text input
  return {
    type: 'TEXT_INPUT',
    value: raw,
    raw,
  };
}

/**
 * Parse location message
 */
export function parseLocationCommand(
  latitude: number,
  longitude: number,
  address?: string
): ParsedCommand {
  return {
    type: 'LOCATION',
    value: JSON.stringify({ latitude, longitude, address }),
    raw: address || `${latitude},${longitude}`,
  };
}

/**
 * Check if a message looks like a greeting
 */
export function isGreeting(text: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 
    'good evening', 'hola', 'yo', 'sup', 'start', 'begin',
    'order', 'menu', 'food', 'hungry', 'i want', 'can i'
  ];
  
  const normalized = text.toLowerCase().trim();
  return greetings.some(g => normalized.includes(g));
}

/**
 * Extract potential address from text
 */
export function extractAddress(text: string): string | null {
  const trimmed = text.trim();
  
  // Basic validation - address should be at least 10 characters
  if (trimmed.length < 10) {
    return null;
  }
  
  // Check if it looks like an address (contains letters and numbers or common words)
  const addressIndicators = [
    'street', 'road', 'avenue', 'close', 'crescent', 'lane',
    'estate', 'plaza', 'mall', 'near', 'opposite', 'beside',
    'behind', 'junction', 'bus stop', 'no.', 'no ', 'block',
    'flat', 'house', 'shop', 'market', 'church', 'school',
    'hospital', 'bank', 'filling station', 'petrol'
  ];
  
  const lowerText = trimmed.toLowerCase();
  const hasAddressWord = addressIndicators.some(word => lowerText.includes(word));
  const hasNumber = /\d/.test(trimmed);
  
  if (hasAddressWord || (hasNumber && trimmed.length > 15)) {
    return trimmed;
  }
  
  // If it's long enough and contains commas (likely an address), accept it
  if (trimmed.length > 20 && trimmed.includes(',')) {
    return trimmed;
  }
  
  return null;
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  // Convert 234XXXXXXXXXX to 0XXXXXXXXXX
  if (phone.startsWith('234')) {
    return '0' + phone.substring(3);
  }
  return phone;
}

/**
 * Normalize phone number to 234 format
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  
  return cleaned;
}

// UltraMsg WhatsApp API Client
import type { 
  UltraMsgSendRequest, 
  UltraMsgSendResponse, 
  UltraMsgErrorResponse 
} from './types';

export class UltraMsgClient {
  private instanceId: string;
  private token: string;
  private baseUrl: string = 'https://api.ultramsg.com';

  constructor(instanceId: string, token: string) {
    this.instanceId = instanceId;
    this.token = token;
  }

  /**
   * Send a WhatsApp message via UltraMsg API
   */
  async sendMessage(request: UltraMsgSendRequest): Promise<UltraMsgSendResponse> {
    const url = `${this.baseUrl}/${this.instanceId}/messages/chat`;

    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(request.to);
      
      // UltraMsg expects application/x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append('token', this.token);
      formData.append('to', formattedPhone);
      formData.append('body', request.body);
      if (request.priority) {
        formData.append('priority', request.priority.toString());
      }
      if (request.referenceId) {
        formData.append('referenceId', request.referenceId);
      }

      console.log('📤 Sending WhatsApp message:', {
        to: formattedPhone.substring(0, 7) + '****', // Mask phone number
        bodyLength: request.body.length,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      console.log('📥 UltraMsg response:', {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (!response.ok) {
        const error = data as UltraMsgErrorResponse;
        const errorMsg = error.message || error.error || JSON.stringify(data);
        console.error('❌ UltraMsg API Error:', errorMsg);
        throw new Error(`UltraMsg API Error: ${errorMsg}`);
      }

      // UltraMsg returns different response formats, normalize it
      if (data.sent === 'true' || data.sent === true) {
        console.log('✅ Message sent successfully:', data.id || data.chatId);
        return {
          sent: true,
          message: data.message || 'Message sent successfully',
          id: data.id || data.chatId,
        };
      }

      return data as UltraMsgSendResponse;
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while sending message');
    }
  }

  /**
   * Format phone number to UltraMsg format
   * UltraMsg expects: 234XXXXXXXXXX (no + sign)
   * Accepts: +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX
   * Returns: 234XXXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 234
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }
    
    // If doesn't start with 234, add it
    if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    // Nigerian phone number: +234 followed by 7-9 and 9 more digits
    const nigerianPhoneRegex = /^(\+234|234|0)[789]\d{9}$/;
    return nigerianPhoneRegex.test(phone.replace(/[^\d+]/g, ''));
  }

  /**
   * Test connection to UltraMsg API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${this.baseUrl}/${this.instanceId}/instance/status`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful',
        };
      }

      return {
        success: false,
        message: data.message || 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}

/**
 * Create UltraMsg client instance from environment variables
 */
export function createUltraMsgClient(): UltraMsgClient | null {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.warn('UltraMsg credentials not configured');
    return null;
  }

  return new UltraMsgClient(instanceId, token);
}

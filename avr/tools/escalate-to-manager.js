// Escalate issue to manager via WhatsApp (Baileys sidecar)
const BAILEYS_URL = process.env.BAILEYS_URL || 'http://159.65.83.92:3001';
const BAILEYS_SECRET = process.env.BAILEYS_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pijgeuspfgcccoxtjnby.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = {
  name: 'escalate_to_manager',
  description:
    'Escalate a customer issue to the restaurant manager. Use when a customer has a complaint, problem, or request you cannot resolve. ' +
    'This sends a WhatsApp message to all admin phone numbers with the issue details.',
  input_schema: {
    type: 'object',
    properties: {
      customer_phone: { type: 'string', description: 'Customer phone number or caller ID' },
      customer_name: { type: 'string', description: 'Customer name if known' },
      issue_summary: { type: 'string', description: 'Brief summary of the issue' },
      order_number: { type: 'string', description: 'Related order number if applicable' },
    },
    required: ['customer_phone', 'issue_summary'],
  },
  handler: async (input) => {
    try {
      // Get admin phone numbers from notification settings
      let adminPhones = [];

      if (SUPABASE_KEY) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/notification_settings?select=value&key=eq.admin_notifications`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const data = await res.json();
        const adminSettings = data?.[0]?.value;
        if (adminSettings?.enabled && adminSettings?.phone_numbers?.length) {
          adminPhones = adminSettings.phone_numbers;
        }
      }

      if (!adminPhones.length) {
        return 'Escalation noted but no admin contacts configured. The issue has been logged.';
      }

      const timestamp = new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'short',
        timeStyle: 'short',
      });

      const message =
        `\u26a0\ufe0f *Customer Issue \u2014 Phone Escalation*\n\n` +
        `\ud83d\udc64 Customer: ${input.customer_name || 'Unknown'}\n` +
        `\ud83d\udcde Phone: ${input.customer_phone}\n` +
        (input.order_number ? `\ud83d\udccb Order: ${input.order_number}\n` : '') +
        `\n\ud83d\udcdd *Issue:*\n${input.issue_summary}\n\n` +
        `\u23f0 ${timestamp}\n` +
        `_Source: Phone Call (Voice AI)_`;

      let sentCount = 0;
      for (const phone of adminPhones) {
        try {
          const sendRes = await fetch(`${BAILEYS_URL}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Secret': BAILEYS_SECRET,
            },
            body: JSON.stringify({ phone, message }),
          });
          if (sendRes.ok) sentCount++;
        } catch (e) {
          // continue to next admin
        }
      }

      return sentCount > 0
        ? `Issue escalated to ${sentCount} manager(s). They have been notified via WhatsApp.`
        : 'Could not reach managers via WhatsApp, but the issue has been noted.';
    } catch (err) {
      return 'Failed to escalate. The issue has been noted for follow-up.';
    }
  },
};

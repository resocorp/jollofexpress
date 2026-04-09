// Get business hours and open/closed status
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pijgeuspfgcccoxtjnby.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = {
  name: 'get_business_hours',
  description:
    'Check if the restaurant is currently open and get operating hours. Use when customer asks about hours or if we are open.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async () => {
    if (!SUPABASE_KEY) return 'Business hours lookup is not configured.';

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/settings?select=key,value&key=in.(operating_hours,order_settings)`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );

      const settings = await res.json();
      const hoursData = settings?.find((s) => s.key === 'operating_hours')?.value;
      const orderSettings = settings?.find((s) => s.key === 'order_settings')?.value;

      const now = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
      let text = `Current time in Nigeria: ${now}\n`;

      if (hoursData) {
        text += '\nOperating Hours:\n';
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (const day of days) {
          const h = hoursData[day];
          if (h?.is_open) {
            text += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} to ${h.close}\n`;
          } else {
            text += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
          }
        }
      }

      if (orderSettings) {
        text += orderSettings.is_accepting_orders === false
          ? '\nStatus: NOT currently accepting orders.'
          : '\nStatus: Currently accepting orders.';
        if (orderSettings.current_prep_time) {
          text += ` Estimated prep time: ${orderSettings.current_prep_time} minutes.`;
        }
      }

      return text;
    } catch (err) {
      return 'Sorry, I could not check our business hours right now.';
    }
  },
};

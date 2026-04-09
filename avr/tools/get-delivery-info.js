// Get delivery windows, cutoff times, and delivery areas
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pijgeuspfgcccoxtjnby.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = {
  name: 'get_delivery_info',
  description:
    'Get delivery windows, cutoff times, delivery areas, and fees. ' +
    'Use when a customer asks about delivery times, fees, or whether we deliver to their area. ' +
    'Always call this tool so you can tell the customer the current cutoff time.',
  input_schema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: async () => {
    if (!SUPABASE_KEY) return 'Delivery info is not configured.';

    try {
      const [windowsRes, regionsRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/delivery_windows?select=name,order_open_time,cutoff_time,delivery_start,delivery_end,is_active&is_active=eq.true&order=display_order.asc`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/delivery_regions?select=name,base_fee,is_active&is_active=eq.true`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        ),
      ]);

      const windows = await windowsRes.json();
      const regions = await regionsRes.json();

      let text = 'Delivery Windows:\n';
      if (windows && windows.length) {
        for (const w of windows) {
          text += `- ${w.name}: Order from ${w.order_open_time}, cutoff at ${w.cutoff_time}. Delivery between ${w.delivery_start} and ${w.delivery_end}.\n`;
        }
      } else {
        text += 'No active delivery windows right now.\n';
      }

      if (regions && regions.length) {
        text += '\nDelivery Areas:\n';
        for (const r of regions) {
          text += `- ${r.name}: ${r.base_fee} naira delivery fee.\n`;
        }
      }

      return text;
    } catch (err) {
      return 'Sorry, I could not load delivery information right now.';
    }
  },
};

// Check order status tool
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pijgeuspfgcccoxtjnby.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = {
  name: 'check_order_status',
  description:
    'Check the status of an order. Can look up by order number (e.g. ORD-20260331-1234) or by customer phone number (returns most recent order).',
  input_schema: {
    type: 'object',
    properties: {
      order_number: { type: 'string', description: 'Order number like ORD-XXXXXXXX-XXXX' },
      phone: { type: 'string', description: 'Customer phone number to find their latest order' },
    },
    required: [],
  },
  handler: async (input) => {
    if (!SUPABASE_KEY) return 'Order lookup is not configured.';

    try {
      let url = `${SUPABASE_URL}/rest/v1/orders?select=order_number,status,payment_status,total,customer_name,delivery_city,order_type,delivery_window,delivery_date,created_at&order=created_at.desc&limit=1`;

      if (input.order_number) {
        url += `&order_number=eq.${encodeURIComponent(input.order_number)}`;
      } else if (input.phone) {
        let phone = input.phone.replace(/[^\d]/g, '');
        if (phone.startsWith('234')) phone = '0' + phone.substring(3);
        if (!phone.startsWith('0') && !phone.startsWith('+')) phone = '0' + phone;
        url += `&or=(customer_phone.eq.${phone},customer_phone.eq.+234${phone.substring(1)})`;
      } else {
        return 'Please provide an order number or phone number.';
      }

      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      const orders = await res.json();
      if (!orders || !orders.length) {
        return input.order_number
          ? `No order found with number ${input.order_number}.`
          : 'No recent orders found for that phone number.';
      }

      const o = orders[0];
      const statusMap = {
        pending: 'pending payment',
        confirmed: 'confirmed and being prepared',
        preparing: 'being prepared in the kitchen',
        ready: 'ready for delivery',
        out_for_delivery: 'out for delivery',
        completed: 'delivered',
        cancelled: 'cancelled',
      };

      return (
        `Order ${o.order_number}: ${statusMap[o.status] || o.status}. ` +
        `Payment: ${o.payment_status}. ` +
        `Total: ${o.total} naira. ` +
        (o.delivery_window ? `Delivery window: ${o.delivery_window}. ` : '') +
        (o.delivery_date ? `Date: ${o.delivery_date}.` : '')
      );
    } catch (err) {
      return 'Sorry, I could not check the order status right now.';
    }
  },
};

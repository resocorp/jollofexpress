// Delivery manifest formatter for thermal printer
// 48 characters per line for 80mm paper

interface ManifestOrder {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_alt?: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_instructions: string | null;
  total: number;
  payment_method_type: string;
  payment_status: string;
  order_items: {
    item_name: string;
    quantity: number;
  }[];
}

interface ManifestData {
  batchDate: string;
  windowName: string;
  deliveryWindow: string;
  driverName?: string;
  orders: ManifestOrder[];
  totalDistance?: number;
}

function formatCurrency(amount: number): string {
  const formatted = amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `NGN${formatted}`;
}

export function formatDeliveryManifest(data: ManifestData): string {
  const lines: string[] = [];
  const width = 48;

  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const line = (char = '=') => char.repeat(width);

  const leftRight = (left: string, right: string) => {
    const spacing = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spacing) + right;
  };

  // Truncate text to fit width
  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen - 1) + '.' : text;

  // Header
  lines.push(line('='));
  lines.push(center('DELIVERY MANIFEST'));
  lines.push(line('='));
  lines.push(`Batch: ${data.windowName}`);
  lines.push(`Date:  ${data.batchDate}`);
  lines.push(`Window: ${data.deliveryWindow}`);
  lines.push(`Orders: ${data.orders.length}` + (data.driverName ? `  Driver: ${data.driverName}` : ''));
  if (data.totalDistance) {
    lines.push(`Est. Distance: ${(data.totalDistance / 1000).toFixed(1)} km`);
  }
  lines.push(line('='));
  lines.push('');

  // Orders
  let totalCOD = 0;
  const codOrders: string[] = [];

  data.orders.forEach((order, idx) => {
    const stopNum = idx + 1;
    const isCOD = order.payment_method_type === 'cod';
    const isPaid = order.payment_status === 'success';

    if (isCOD) {
      totalCOD += order.total;
      codOrders.push(`#${order.order_number}`);
    }

    lines.push(`STOP ${stopNum} ` + '-'.repeat(Math.max(1, width - `STOP ${stopNum} `.length)));
    lines.push(leftRight(
      `#${order.order_number}  ${truncate(order.customer_name, 20)}`,
      isPaid ? '[PAID]' : isCOD ? '[COD]' : `[${order.payment_status.toUpperCase()}]`
    ));
    if (order.customer_phone_alt) {
      lines.push(`WA:   ${order.customer_phone}`);
      lines.push(`Call: ${order.customer_phone_alt}`);
    } else {
      lines.push(`Tel: ${order.customer_phone}`);
    }

    if (order.delivery_city || order.delivery_address) {
      const addr = [order.delivery_city, order.delivery_address].filter(Boolean).join(', ');
      // Wrap long addresses
      if (addr.length > width) {
        lines.push(truncate(addr, width));
      } else {
        lines.push(addr);
      }
    }

    if (order.delivery_instructions) {
      lines.push(`LM: ${truncate(order.delivery_instructions, width - 4)}`);
    }

    // Items summary (compact)
    const itemsSummary = order.order_items
      .map(i => `${i.quantity}x ${i.item_name}`)
      .join(', ');
    if (itemsSummary.length > width) {
      // Split across lines if too long
      const items = order.order_items.map(i => `${i.quantity}x ${i.item_name}`);
      let currentLine = '';
      for (const item of items) {
        if (currentLine.length + item.length + 2 > width) {
          lines.push(currentLine);
          currentLine = item;
        } else {
          currentLine = currentLine ? `${currentLine}, ${item}` : item;
        }
      }
      if (currentLine) lines.push(currentLine);
    } else {
      lines.push(itemsSummary);
    }

    lines.push(leftRight('Total:', formatCurrency(order.total)));
    lines.push('');
  });

  // Footer
  lines.push(line('='));

  if (totalCOD > 0) {
    lines.push('');
    lines.push(center('*** COD COLLECTION ***'));
    lines.push(leftRight('TOTAL COD TO COLLECT:', formatCurrency(totalCOD)));
    lines.push(`COD Orders: ${codOrders.join(', ')}`);
    lines.push('');
  }

  lines.push(line('='));
  lines.push(center(`${data.orders.length} stops  ${data.batchDate}`));
  lines.push(center('MyShawarma.express'));

  return lines.join('\n');
}

// Browse menu tool — returns menu items formatted for voice readout
const API_URL = process.env.API_URL || 'http://159.65.83.92:3000';

module.exports = {
  name: 'browse_menu',
  description:
    'Get the restaurant menu. Returns categories with items and prices. ' +
    'Use when a customer asks what is available, wants to see the menu, or asks about a specific item or category.',
  input_schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Optional category name to filter by, e.g. Shawarma, Drinks. Leave empty for full menu.',
      },
    },
    required: [],
  },
  handler: async (input) => {
    try {
      const res = await fetch(`${API_URL}/api/menu`);
      if (!res.ok) return 'Sorry, the menu is not available right now.';

      const data = await res.json();
      const categories = data.categories || [];

      // Filter by category if specified
      const filtered = input.category
        ? categories.filter((c) => c.name.toLowerCase().includes(input.category.toLowerCase()))
        : categories;

      if (!filtered.length) {
        return input.category
          ? `No category matching "${input.category}". Available categories are: ${categories.map((c) => c.name).join(', ')}.`
          : 'The menu is currently empty.';
      }

      // Format for voice — concise, no UUIDs
      const lines = [];
      for (const cat of filtered) {
        const items = (cat.items || []).filter((i) => i.is_available);
        if (!items.length) continue;

        lines.push(`${cat.name}:`);
        for (const item of items) {
          const price = item.promo_price || item.base_price;
          let line = `  ${item.name} — ${price} naira`;
          if (item.promo_price && item.promo_price < item.base_price) {
            line += ` (on promo, normally ${item.base_price} naira)`;
          }
          lines.push(line);

          // Include variations briefly
          const variations = item.variations || [];
          if (variations.length) {
            for (const v of variations) {
              const opts = (v.options || []).map((o) =>
                o.price_adjustment ? `${o.name} (+${o.price_adjustment} naira)` : o.name
              );
              if (opts.length) lines.push(`    ${v.name}: ${opts.join(', ')}`);
            }
          }
        }
      }

      return lines.join('\n');
    } catch (err) {
      return 'Sorry, I could not load the menu right now. Please try again.';
    }
  },
};

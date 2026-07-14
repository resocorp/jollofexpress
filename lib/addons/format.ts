// Shared add-on formatting helpers.
//
// Add-on quantity is stored per item-unit (one unit of the menu item). Every
// surface that shows add-ons — cart, checkout, admin orders, kitchen display,
// thermal receipt, WhatsApp — runs through this module so the "effective
// total" math (per-unit qty x order-item qty) and legacy defaulting live in
// exactly one place.

/** A raw add-on as stored on an order item or held in a cart line. */
export type RawAddon = { name: string; price: number; quantity?: number | null };

/** An add-on with its effective (item-quantity-multiplied) count and totals. */
export interface AddonLine {
  name: string;
  /** Effective count = per-unit add-on qty x order-item qty. */
  count: number;
  /** Price of a single add-on. */
  unitPrice: number;
  /** count x unitPrice */
  lineTotal: number;
}

/**
 * Build effective add-on lines for an order/cart item.
 *
 * Legacy rows created before per-add-on quantity was persisted have no
 * `quantity` — those default to 1. `itemQuantity` multiplies the per-unit
 * add-on quantity into an effective total (so 2x Shawarma each with 1x Extra
 * Sauce yields a count of 2).
 */
export function getAddonLines(
  addons: RawAddon[] | null | undefined,
  itemQuantity: number = 1,
): AddonLine[] {
  if (!addons?.length) return [];
  const itemQty = Math.max(1, Math.round(itemQuantity || 1));
  return addons.map((a) => {
    const perUnit = Math.max(1, Math.round(a.quantity ?? 1));
    const count = perUnit * itemQty;
    return { name: a.name, count, unitPrice: a.price, lineTotal: a.price * count };
  });
}

/** Sum of all add-on line totals for an item (effective totals). */
export function getAddonsTotal(
  addons: RawAddon[] | null | undefined,
  itemQuantity: number = 1,
): number {
  return getAddonLines(addons, itemQuantity).reduce((sum, line) => sum + line.lineTotal, 0);
}

/** True when the item has at least one add-on. */
export function hasAddons(addons: RawAddon[] | null | undefined): boolean {
  return Array.isArray(addons) && addons.length > 0;
}

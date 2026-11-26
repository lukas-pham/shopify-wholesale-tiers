// Pure helpers, shared with the unit tests. No I/O: Shopify Functions cannot use network, clock or randomness.

/** @typedef {{ minQuantity: number, percentage: number }} Tier */

/**
 * Reads and sanity-checks the tier config from the shop metafield.
 * A broken config gives no discount rather than a wrong one.
 * @param {unknown} json
 * @returns {Tier[]}
 */
export function parseTiers(json) {
  const list = json && typeof json === "object" && Array.isArray(/** @type {any} */ (json).tiers) ? /** @type {any} */ (json).tiers : [];
  return list
    .filter((t) => Number.isInteger(t?.minQuantity) && t.minQuantity > 0 && typeof t?.percentage === "number" && t.percentage > 0 && t.percentage <= 50)
    .sort((a, b) => a.minQuantity - b.minQuantity);
}

/**
 * Highest tier the unit count reaches, or null.
 * @param {Tier[]} tiers
 * @param {number} units
 */
export function pickTier(tiers, units) {
  let best = null;
  for (const t of tiers) if (units >= t.minQuantity) best = t;
  return best;
}

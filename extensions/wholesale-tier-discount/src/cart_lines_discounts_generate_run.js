import { parseTiers, pickTier } from "./tiers";

/**
 * Wholesale tier discount.
 * - Only for customers whose app metafield `$app:wholesale_approved` is "true" (set by the merchant in the admin).
 * - Units are counted over eligible lines; products tagged `no-wholesale` neither count nor get the discount.
 * - The tier table comes from the shop metafield `$app:wholesale_tiers`, the same one the checkout progress bar reads.
 *
 * @param {import("../generated/api").CartInput} input
 * @returns {import("../generated/api").CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const none = { operations: [] };
  if (!input.discount.discountClasses.includes("PRODUCT")) return none;
  if (input.cart.buyerIdentity?.customer?.wholesaleApproved?.value !== "true") return none;

  const tiers = parseTiers(input.shop.tiers?.jsonValue);
  const eligible = input.cart.lines.filter((line) => line.merchandise.__typename === "ProductVariant" && !line.merchandise.product.excludedFromWholesale);
  const units = eligible.reduce((sum, line) => sum + line.quantity, 0);
  const tier = pickTier(tiers, units);
  if (!tier || !eligible.length) return none;

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: [
            {
              message: `Wholesale ${tier.percentage}% (${tier.minQuantity}+ units)`,
              targets: eligible.map((line) => ({ cartLine: { id: line.id } })),
              value: { percentage: { value: tier.percentage } },
            },
          ],
          selectionStrategy: "FIRST",
        },
      },
    ],
  };
}

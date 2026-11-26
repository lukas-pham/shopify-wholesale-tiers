# Wholesale Tiers — Shopify Function + Checkout UI Extension (built with AI)

Approved wholesale customers get tiered pricing **automatically at checkout** (10% at 12+ units, 15% at 24+, 20% at 48+), and see a progress bar telling them how many more units unlock the next tier. Built with Claude Code — see [BUILD_LOG.md](BUILD_LOG.md) for every step and every check that failed along the way.

> Status: **v1 — builds and passes tests.** 12 unit tests + 10 fixtures run through the compiled WebAssembly with Shopify's test harness. Input query, extension code and setup mutations validated with the Shopify AI Toolkit. `shopify app build` succeeds. **Not yet installed on a development store.**

## Pieces

| Path | What |
|---|---|
| `extensions/wholesale-tier-discount/` | **Discount Function** (JS → wasm), target `cart.lines.discounts.generate.run`, API 2026-07 |
| `extensions/wholesale-tier-progress/` | **Checkout UI Extension** (Preact + Polaris web components), target `purchase.checkout.cart-line-list.render-after` |
| `shopify.app.toml` | Declarative custom data: customer metafield `$app:wholesale_approved` (boolean), shop metafield `$app:wholesale_tiers` (JSON) |
| `scripts/setup.graphql` | Create the automatic discount, write the tier table, approve a customer |

## How it decides

```
customer.$app:wholesale_approved == "true"?      no  → no discount
eligible lines = product variants without the "no-wholesale" tag
units = sum of eligible quantities
tier  = highest tier in shop.$app:wholesale_tiers with minQuantity ≤ units
→ one product discount on every eligible line: "Wholesale 15% (24+ units)"
```

A missing or malformed tier table means **no discount**, never a wrong one; any tier above 50% is ignored.

## Run it

```bash
nvm use 22
npm install
npm test                 # unit tests (fast)
npm run test:wasm        # builds the Function to wasm and runs every fixture through it
npx shopify app build    # builds both extensions
```

On a store: `shopify app config link`, `shopify app deploy`, then run the three operations in `scripts/setup.graphql` (variables in `setup.variables.json`). Approve customers on their admin page ("Wholesale approved"). Tag products `no-wholesale` to exclude them. Add the **Wholesale tier progress** block in the checkout editor.

## Known gaps

See the end of [BUILD_LOG.md](BUILD_LOG.md): not yet on a dev store; the checkout block cannot see excluded products; customer metafields in checkout need protected customer data approval.

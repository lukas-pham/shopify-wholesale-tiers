# AI build log — Wholesale Tiers

How this app was built with an AI coding agent (Claude Code), step by step, including what the checks caught. Kept because the process is part of what a client buys: AI writes fast, and the checks are what make it shippable.

**Tools:** Claude Code (model: Claude Opus 5.5) · Shopify AI Toolkit (docs search + GraphQL / Functions / Polaris validators) · Shopify CLI 5.1 · Shopify's official extension templates · vitest + `@shopify/shopify-function-test-helpers`.

## 1. Spec (written by me, before any code)

> Approved wholesale customers get tiered pricing automatically at checkout: 10% at 12+ units, 15% at 24+, 20% at 48+. The merchant approves a customer in the admin, not in code. Some products are excluded. The buyer sees at checkout how many more units unlock the next tier. One config for tiers — the discount and the progress bar must never disagree.

## 2. Choosing the APIs (agent proposed, I checked)

| Decision | Why |
|---|---|
| **Discount Function API**, target `cart.lines.discounts.generate.run` | The current discount API. The old Product/Order Discount APIs are deprecated |
| Eligibility = app-owned **customer metafield** `$app:wholesale_approved`, not a customer tag | The Function can read tags, but a checkout UI extension cannot. A metafield both can read is the only single source of truth |
| Tiers = app-owned **shop metafield** `$app:wholesale_tiers` | Readable by the Function (`shop.metafield`) and by the extension (`appMetafields`) |
| Metafield definitions declared in `shopify.app.toml` | Declarative custom data: versioned and auto-created on install; merchants edit them in the admin |
| Checkout UI extension in **Preact + Polaris web components**, target `purchase.checkout.cart-line-list.render-after` | Current extension stack; the block sits right under the cart lines |

## 3. Scaffold

`shopify app generate extension` needs a logged-in Partner account, so the agent pulled the **same templates the CLI uses** from `github.com/Shopify/extensions-templates` (`functions-discount-js`, `checkout-extension`) and kept their structure, schema, test harness and API versions.

## 4. Code + checks (in the order they happened)

| Step | Result |
|---|---|
| Wrote the input query (`src/cart_lines_discounts_generate_run.graphql`) | **Validated** against the Discount Function schema 2026-07 ✅ |
| Wrote the Function + pure helpers (`tiers.js`) | 10 fixtures: guest, not approved, below tier, each tier, mixed cart with an excluded product and a custom item, excluded-only, wrong discount class, missing config, broken config |
| Unit tests (JS) | 12/12 ✅ |
| First `shopify app function build` | ❌ `[auth]: Required` in `shopify.app.toml` → added the `[auth]` section |
| Second build | ❌ GraphQL codegen had no config — the agent had trimmed the template's `codegen` block from `package.json` → restored it |
| Third build | ✅ `function.wasm` (3.2 KB) |
| Shopify's wasm test harness on all 10 fixtures (also validates fixtures against the schema) | 10/10 ✅ |
| Checkout extension, first validation | ❌ `s-progress`: `accessibilityLabel` got `string \| any[]` — `i18n.translate()` can return an array. Real bug a screen reader would have hit → converted to a string |
| Checkout extension, second validation | ✅ `s-banner, s-stack, s-text, s-progress` |
| `shopify app build` (both extensions) | ✅ checkout bundle 21.8 KB (≈ 7.8 KB compressed) |
| Setup mutations (`discountAutomaticAppCreate`, `metafieldsSet`) | **Validated** against Admin API 2026-07 ✅; `functionHandle` field checked with an inline-input validation |

## 5. What I reviewed by hand

- Units are counted only over eligible lines, so an excluded product cannot push the cart into a higher tier (fixture `excluded-products-do-not-count`).
- A broken or hostile config (string quantities, 95% off) gives **no** discount instead of a wrong one; percentages above 50 are ignored in both the Function and the extension.
- The Function never sees personal data: it reads one boolean metafield on the customer.

## 6. Not done yet

- Not installed on a development store, so no screenshot of the real checkout. The portfolio shows an interactive simulator that runs the same Function code in the browser.
- The checkout block counts all units; it cannot see the `no-wholesale` product tag. With excluded products in the cart it may say "add 3 more" while the Function still needs more. Fix: a product metafield the extension can read.
- Reading a customer metafield in checkout requires the app's **protected customer data** access (level 1) to be approved.

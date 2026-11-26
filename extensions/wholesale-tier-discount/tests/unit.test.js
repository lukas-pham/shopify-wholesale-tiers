import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { cartLinesDiscountsGenerateRun } from "../src/cart_lines_discounts_generate_run";
import { parseTiers, pickTier } from "../src/tiers";

// Runs every fixture through the JS function directly (fast). tests/wasm.test.js runs the same fixtures
// through the compiled WebAssembly with Shopify's test helpers.
const dir = path.join(__dirname, "fixtures");
describe("cart.lines.discounts.generate.run", () => {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    test(file.replace(".json", ""), () => {
      const { payload } = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      expect(cartLinesDiscountsGenerateRun(payload.input)).toEqual(payload.output);
    });
  }
});

describe("tiers", () => {
  const tiers = parseTiers({ tiers: [{ minQuantity: 48, percentage: 20 }, { minQuantity: 12, percentage: 10 }, { minQuantity: 24, percentage: 15 }] });
  test("sorts and picks the highest reached tier", () => {
    expect([11, 12, 23, 24, 47, 48, 500].map((u) => pickTier(tiers, u)?.percentage ?? 0)).toEqual([0, 10, 10, 15, 15, 20, 20]);
  });
  test("drops malformed or unsafe tiers", () => {
    expect(parseTiers({ tiers: [{ minQuantity: 0, percentage: 10 }, { minQuantity: 5, percentage: 80 }, { minQuantity: 5.5, percentage: 5 }] })).toEqual([]);
    expect(parseTiers(null)).toEqual([]);
  });
});

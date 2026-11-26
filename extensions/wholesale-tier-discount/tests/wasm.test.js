import path from "node:path";
import fs from "node:fs";
import { describe, beforeAll, test, expect } from "vitest";
import { buildFunction, getFunctionInfo, loadSchema, loadInputQuery, loadFixture, validateTestAssets, runFunction } from "@shopify/shopify-function-test-helpers";

// Shopify's integration harness (from the CLI template): builds the function to WebAssembly, validates each
// fixture against the input query and schema, and runs it. Needs Shopify CLI; skipped unless RUN_WASM=1.
describe.runIf(process.env.RUN_WASM === "1")("compiled function (wasm)", () => {
  let schema, functionRunnerPath, wasmPath, targeting, schemaPath;
  beforeAll(async () => {
    const functionDir = path.dirname(__dirname);
    await buildFunction(functionDir);
    ({ schemaPath, functionRunnerPath, wasmPath, targeting } = await getFunctionInfo(functionDir));
    schema = await loadSchema(schemaPath);
  }, 120000);

  const dir = path.join(__dirname, "fixtures");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    test(file, async () => {
      const fixture = await loadFixture(path.join(dir, file));
      const queryPath = targeting[fixture.target].inputQueryPath;
      const result = await validateTestAssets({ schema, fixture, inputQueryAST: await loadInputQuery(queryPath) });
      expect(result.inputQuery.errors).toEqual([]);
      expect(result.inputFixture.errors).toEqual([]);
      expect(result.outputFixture.errors).toEqual([]);
      const run = await runFunction(fixture, functionRunnerPath, wasmPath, queryPath, schemaPath);
      expect(run.error).toBeNull();
      expect(run.result.output).toEqual(fixture.expectedOutput);
    }, 20000);
  }
});

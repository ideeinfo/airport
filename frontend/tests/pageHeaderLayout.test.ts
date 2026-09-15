import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/generated/AIDemo.tsx", import.meta.url), "utf8");

test("uses a compact page title area and gives the module layouts more height", () => {
  assert.match(component, /\.page-head h2\{font-size:20px/);
  assert.match(component, /\.page-head p\{font-size:10px/);
  assert.match(component, /\.feedback-three-column,\.drawing-layout,\.kg-layout,\.assistant-layout\{height:calc\(100vh - 130px\)\}/);
});

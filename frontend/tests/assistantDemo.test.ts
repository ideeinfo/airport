import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/generated/AIDemo.tsx", import.meta.url), "utf8");

test("keeps the original AHU demo question and quick prompts", () => {
  assert.match(component, /设备是 AHU-0B2-04/);
  assert.match(component, /空调机组风量不足怎么排查/);
  assert.match(component, /生成本周过滤器维护计划/);
  assert.match(component, /查找该设备关联图纸/);
});

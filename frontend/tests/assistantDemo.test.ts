import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/generated/AIDemo.tsx", import.meta.url), "utf8");

test("keeps the original AHU demo question and quick prompts", () => {
  assert.match(component, /设备是 AHU-0B2-04/);
  assert.match(component, /空调机组风量不足怎么排查/);
  assert.match(component, /AHU-0B2-04 最近有哪些报警/);
  assert.match(component, /生成本周过滤器维护计划/);
  assert.match(component, /查找该设备关联图纸/);
});

test("offers preset questions for multiple real IFC assets", () => {
  assert.match(component, /送风口 5466537 风量不足如何复核/);
  assert.match(component, /风管 5466492 疑似漏风应检查什么/);
  assert.match(component, /阀门 5500084 卡滞如何排查/);
  assert.match(component, /波纹补偿器 5466510 巡检重点是什么/);
});

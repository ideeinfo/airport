import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { airflowAlarm, airflowDeviationPercent, buildAirflowAssistantQuestion } from "../src/demoFlow.ts";

const component = readFileSync(new URL("../src/components/generated/AIDemo.tsx", import.meta.url), "utf8");

test("airflow alarm uses the verified IFC terminal identity", () => {
  assert.equal(airflowAlarm.assetCode, "5466537");
  assert.equal(airflowAlarm.ifcGlobalId, "2LnU_nN4n7j8uYrOc9CFQf");
  assert.equal(airflowAlarm.location, "AR_-7.000");
  assert.equal(airflowDeviationPercent(), -27);
});

test("assistant handoff carries alarm, IFC and demo relation provenance", () => {
  const question = buildAirflowAssistantQuestion();
  assert.match(question, /ALM-AIR-5466537/);
  assert.match(question, /5466537 → 风管5466492/);
  assert.match(question, /Demo补充关系关联 SA 94 → AHU-0B2-04/);
  assert.match(question, /区分手册明确规定与一般工程建议/);
});

test("guided flow exposes all three page transitions and preserves the existing demo", () => {
  assert.match(component, /开始诊断/);
  assert.match(component, /复核末端风量/);
  assert.match(component, /咨询运维助手/);
  assert.match(component, /图谱上下文已带入/);
  assert.match(component, /图谱诊断摘要/);
  assert.match(component, /E-01-1 空调机组设备手册/);
  assert.match(component, /手册明确/);
  assert.match(component, /工程建议/);
  assert.match(component, /const initialAssistantQuestion = "根据现有资料/);
});

test("normal sidebar navigation clears guided context on graph and assistant pages", () => {
  assert.match(component, /const navigateNormally = \(nextPage: Page\) => \{\s*setDemoAlarm\(null\)/);
  assert.match(component, /<Shell page=\{page\} setPage=\{navigateNormally\}>/);
  assert.match(component, /key=\{demoAlarm\?\.alarmId \|\| "standard-graph"\}/);
  assert.match(component, /key=\{demoAlarm\?\.alarmId \|\| "standard-assistant"\}/);
  assert.match(component, /demoAlarm && <div className="assistant-flow-context"/);
  assert.match(component, /demoAlarm && <div className="message ai-message"/);
});

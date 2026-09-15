import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/generated/AIDemo.tsx", import.meta.url), "utf8");

test("normal assistant entry restores history without starting a new retrieval", () => {
  assert.match(component, /fetch\(`\/api\/assistant\/history/);
  assert.match(component, /if \(demoAlarm && !alarmRequestStarted\.current\)/);
  assert.doesNotMatch(component, /useEffect\(\(\) => \{\s*void requestAnswer\(seededQuestion/);
});

test("history list is searchable and restores the saved answer", () => {
  assert.match(component, /setHistoryQuery/);
  assert.match(component, /history\.map\(item/);
  assert.match(component, /selectHistory\(item\)/);
  assert.match(component, /setResponse\(historyResponse\)/);
});

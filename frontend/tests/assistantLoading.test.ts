import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/generated/AIDemo.tsx", import.meta.url), "utf8");

test("does not label an in-flight Open WebUI request as a local template answer", () => {
  assert.match(component, /loading \? "正在连接 Open WebUI" : providerLabel/);
});

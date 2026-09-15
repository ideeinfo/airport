import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const asset = new URL("../public/login-bg-wireframe.png", import.meta.url);
const optimizedAsset = new URL("../public/login-bg-wireframe.webp", import.meta.url);
const component = new URL("../src/components/generated/AIDemo.tsx", import.meta.url);
const html = new URL("../index.html", import.meta.url);

test("login uses the generated high-resolution airport wireframe", () => {
  const image = readFileSync(asset);
  assert.equal(image.subarray(1, 4).toString(), "PNG");
  assert.ok(image.readUInt32BE(16) >= 1600, "background width must be at least 1600 px");
  assert.ok(image.readUInt32BE(20) >= 900, "background height must be at least 900 px");
  const optimized = readFileSync(optimizedAsset);
  assert.equal(optimized.subarray(0, 4).toString(), "RIFF");
  assert.equal(optimized.subarray(8, 12).toString(), "WEBP");
  assert.ok(optimized.byteLength < 400 * 1024, "optimized background must stay below 400 KB");
  assert.match(readFileSync(component, "utf8"), /image-set\([^)]*login-bg-wireframe\.webp/);
  assert.match(readFileSync(component, "utf8"), /login-bg-wireframe\.png/);
  assert.match(readFileSync(html, "utf8"), /rel="preload"[^>]+login-bg-wireframe\.webp[^>]+fetchpriority="high"/);
});

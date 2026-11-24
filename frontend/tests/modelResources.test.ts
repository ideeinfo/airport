import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createModelBufferLoader, disposeModelResources, modelDownloadProgress, validateModelBuffer } from "../src/modelResources.ts";

function modelBuffer(): ArrayBuffer {
  const bytes = new ArrayBuffer(20);
  const header = new DataView(bytes);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, bytes.byteLength, true);
  return bytes;
}

test("compressed downloads stay in loading state until geometry has parsed", () => {
  assert.equal(modelDownloadProgress(180, 90), 95);
  assert.equal(modelDownloadProgress(25, 100), 24);
  assert.equal(modelDownloadProgress(10, 0), 0);
  assert.equal(modelDownloadProgress(Infinity, 10), 0);
});

test("truncated and HTML model responses are rejected", () => {
  assert.doesNotThrow(() => validateModelBuffer(modelBuffer()));
  assert.throws(() => validateModelBuffer(new ArrayBuffer(2)), /不完整/);
  assert.throws(() => validateModelBuffer(new TextEncoder().encode("<!doctype html><html></html>").buffer), /格式不正确/);
  const incomplete = modelBuffer();
  new DataView(incomplete).setUint32(8, 100, true);
  assert.throws(() => validateModelBuffer(incomplete), /下载不完整/);
});

test("viewers share one download and unmounted viewers no longer receive progress", async () => {
  let requests = 0;
  let respond!: (response: Response) => void;
  const load = createModelBufferLoader(async () => {
    requests += 1;
    return new Promise<Response>(resolve => { respond = resolve; });
  });
  const firstProgress: number[] = [];
  const secondProgress: number[] = [];
  const first = load(value => firstProgress.push(value));
  const second = load(value => secondProgress.push(value));
  first.unsubscribe();
  respond(new Response(modelBuffer(), { headers: { "content-length": "10" } }));
  const [firstBuffer, secondBuffer] = await Promise.all([first.promise, second.promise]);
  const cached = await load(() => undefined).promise;
  assert.equal(requests, 1);
  assert.equal(firstBuffer, secondBuffer);
  assert.equal(cached, firstBuffer);
  assert.deepEqual(firstProgress, [0]);
  assert.equal(secondProgress.at(-1), 95);
});

test("a failed download can be retried without reusing the failed cache", async () => {
  const cacheModes: Array<RequestCache | undefined> = [];
  const load = createModelBufferLoader(async (_input, init) => {
    cacheModes.push(init?.cache);
    return cacheModes.length === 1 ? new Response("unavailable", { status: 503 }) : new Response(modelBuffer());
  });
  await assert.rejects(load(() => undefined).promise, /503/);
  assert.equal((await load(() => undefined).promise).byteLength, 20);
  assert.deepEqual(cacheModes, ["default", "reload"]);
});

test("a stalled download times out and leaves the loader available for retry", async () => {
  let requests = 0;
  const load = createModelBufferLoader(async (_input, init) => {
    requests += 1;
    if (requests > 1) return new Response(modelBuffer());
    return new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  }, 10);
  await assert.rejects(load(() => undefined).promise, /超时/);
  assert.equal((await load(() => undefined).promise).byteLength, 20);
});

test("leaving a viewer releases shared geometry, materials, textures and grid exactly once", () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const grid = new THREE.GridHelper();
  scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, [material, material]), grid);
  const released = { geometry: 0, material: 0, texture: 0, grid: 0 };
  geometry.addEventListener("dispose", () => released.geometry++);
  material.addEventListener("dispose", () => released.material++);
  texture.addEventListener("dispose", () => released.texture++);
  grid.geometry.addEventListener("dispose", () => released.grid++);
  disposeModelResources(scene);
  assert.deepEqual(released, { geometry: 1, material: 1, texture: 1, grid: 1 });
});

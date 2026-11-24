import * as THREE from "three";

export const IFC_MODEL_URL = "/model/airport-mep-v2.glb";

export function modelDownloadProgress(loaded: number, total: number): number {
  if (total <= 0 || !Number.isFinite(loaded) || !Number.isFinite(total)) return 0;
  // Browsers report decoded bytes against the compressed Content-Length.
  return Math.max(0, Math.min(95, Math.round(loaded / total * 95)));
}

export function validateModelBuffer(buffer: ArrayBuffer): void {
  if (buffer.byteLength < 20) throw new Error("模型文件不完整，请重新加载");
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
    throw new Error("收到的模型文件格式不正确，请重新加载");
  }
  if (header.getUint32(8, true) !== buffer.byteLength) {
    throw new Error("模型文件下载不完整，请重新加载");
  }
}

export function createModelBufferLoader(fetcher: typeof fetch = fetch, timeoutMs = 60_000) {
  let pending: Promise<ArrayBuffer> | null = null;
  let progress = 0;
  let retry = false;
  const listeners = new Set<(value: number) => void>();
  const report = (value: number) => {
    progress = value;
    listeners.forEach(listener => listener(value));
  };

  async function download(): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(IFC_MODEL_URL, {
        signal: controller.signal,
        cache: retry ? "reload" : "default"
      });
      if (!response.ok) throw new Error(`模型服务暂不可用（${response.status}），请重试`);
      const total = Number(response.headers.get("content-length") || 0);
      const reader = response.body?.getReader();
      let buffer: ArrayBuffer;
      if (reader) {
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          report(modelDownloadProgress(loaded, total));
        }
        const bytes = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        buffer = bytes.buffer;
      } else {
        buffer = await response.arrayBuffer();
      }
      validateModelBuffer(buffer);
      report(95);
      return buffer;
    } catch (reason) {
      if (controller.signal.aborted) throw new Error("模型加载超时，请检查网络后重试");
      throw reason;
    } finally {
      clearTimeout(timeout);
    }
  }

  return (onProgress: (value: number) => void) => {
    listeners.add(onProgress);
    onProgress(progress);
    // Keep only the binary buffer shared; each viewer owns its parsed GPU resources.
    if (!pending) {
      pending = download().catch(reason => {
        pending = null;
        retry = true;
        progress = 0;
        throw reason;
      }).finally(() => listeners.clear());
    }
    return { promise: pending, unsubscribe: () => { listeners.delete(onProgress); } };
  };
}

export const loadModelBuffer = createModelBufferLoader();

export function disposeModelResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
}

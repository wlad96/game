import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Suspense-friendly GLB loader that works on strict-CSP hosts:
 * - `data:` URLs are decoded locally (fetch of data: is blocked there);
 * - embedded textures load through <img> instead of fetch(blob:);
 * - `rewrite` maps external texture paths (e.g. Kenney's Textures/colormap.png).
 */
interface Entry {
  promise: Promise<void>;
  scene?: THREE.Object3D;
  error?: unknown;
}
const cache = new Map<string, Entry>();

function decodeDataUrl(url: string) {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function load(url: string, rewrite?: (u: string) => string) {
  const buf = url.startsWith('data:') ? decodeDataUrl(url) : await (await fetch(url)).arrayBuffer();
  const manager = new THREE.LoadingManager();
  if (rewrite) manager.setURLModifier(rewrite);
  const w = window as unknown as { createImageBitmap?: typeof createImageBitmap };
  const cib = w.createImageBitmap;
  w.createImageBitmap = undefined;
  let pending: Promise<{ scene: THREE.Group }>;
  try {
    const base = url.startsWith('data:') ? '' : url.slice(0, url.lastIndexOf('/') + 1);
    pending = new GLTFLoader(manager).parseAsync(buf, base);
  } finally {
    w.createImageBitmap = cib;
  }
  return (await pending).scene;
}

export function loadGlb(url: string, rewrite?: (u: string) => string): THREE.Object3D {
  let e = cache.get(url);
  if (!e) {
    const entry: Entry = { promise: Promise.resolve() };
    entry.promise = load(url, rewrite)
      .then((s) => {
        entry.scene = s;
      })
      .catch((err) => {
        entry.error = err;
      });
    cache.set(url, entry);
    e = entry;
  }
  if (e.error) throw e.error;
  if (!e.scene) throw e.promise;
  return e.scene;
}

export function preloadGlb(url: string, rewrite?: (u: string) => string) {
  try {
    loadGlb(url, rewrite);
  } catch {
    // pending — that is the point of preloading
  }
}

// Builds both vehicles and writes one binary STL per part (Z-up, mm) plus a coloured GLB per assembly.
// Usage: npm run export
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildGoKart } from '../models/gokart.js';
import { buildWheelchair } from '../models/wheelchair.js';

// GLTFExporter relies on FileReader, which Node lacks.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'exports');
const stl = new STLExporter();
const gltf = new GLTFExporter();

function triCount(obj) {
  let n = 0;
  obj.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return Math.round(n);
}

for (const [name, build] of [['gokart', buildGoKart], ['wheelchair', buildWheelchair]]) {
  const { root: model, parts } = build();
  model.updateMatrixWorld(true);
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const box = new THREE.Box3();
  for (const p of parts) {
    if (!p.userData.exportable) continue;
    box.expandByObject(p);
    const data = stl.parse(p, { binary: true });
    writeFileSync(join(dir, `${p.name}.stl`), Buffer.from(data.buffer));
    console.log(`${name}/${p.name}.stl  ${triCount(p)} tris`);
  }
  const size = box.getSize(new THREE.Vector3());
  console.log(`${name} envelope (L×W×H): ${size.x.toFixed(0)} × ${size.y.toFixed(0)} × ${size.z.toFixed(0)} mm`);

  // GLB: Y-up and metres, as glTF expects; reference mannequins left out.
  const scene = new THREE.Scene();
  const wrap = new THREE.Group();
  wrap.rotation.x = -Math.PI / 2;
  wrap.scale.setScalar(0.001);
  for (const p of parts) if (p.userData.exportable) wrap.add(p);
  scene.add(wrap);
  const glb = await new Promise((res, rej) => gltf.parse(scene, res, rej, { binary: true }));
  writeFileSync(join(dir, `${name}-assembly.glb`), Buffer.from(glb));
  console.log(`${name}/${name}-assembly.glb`);
}

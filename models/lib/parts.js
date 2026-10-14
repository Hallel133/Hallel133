// Geometry helpers shared by the vehicle models.
// World frame for every model: millimetres, X forward, Y to the left, Z up.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const P = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]));
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const matCache = new Map();
export function mat(color, { metal = 0.25, rough = 0.5, opacity = 1 } = {}) {
  const key = `${color}|${metal}|${rough}|${opacity}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, metalness: metal, roughness: rough, side: THREE.DoubleSide,
      transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
    }));
  }
  return matCache.get(key);
}

// A top-level part: what the viewer toggles and what gets exported as one STL.
export function part(id, label, { exportable = true } = {}) {
  const g = new THREE.Group();
  g.name = id;
  g.userData = { part: true, id, label, exportable };
  return g;
}

export function add(group, ...objs) {
  for (const o of objs.flat()) if (o) group.add(o);
  return group;
}

// Straight round tube (solid rod for visual purposes) between two points.
export function rod(a, b, r, m, seg = 16) {
  a = P(a); b = P(b);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg, 1, false), m);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.normalize());
  return mesh;
}

// Tube along a polyline with radiused bends, like a CNC-bent chassis tube.
export function bentTube(points, r, m, bend = 60) {
  const pts = points.map(P);
  const path = new THREE.CurvePath();
  let cur = pts[0].clone();
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const uin = p.clone().sub(pts[i - 1]);
    const lin = uin.length(); uin.normalize();
    const uout = pts[i + 1].clone().sub(p);
    const lout = uout.length(); uout.normalize();
    const d = Math.min(bend, lin * 0.45, lout * 0.45);
    const s = p.clone().addScaledVector(uin, -d);
    const e = p.clone().addScaledVector(uout, d);
    if (cur.distanceTo(s) > 0.01) path.add(new THREE.LineCurve3(cur, s));
    path.add(new THREE.QuadraticBezierCurve3(s, p.clone(), e));
    cur = e;
  }
  path.add(new THREE.LineCurve3(cur, pts[pts.length - 1]));
  const segs = Math.max(8, Math.ceil(path.getLength() / 12));
  return new THREE.Mesh(new THREE.TubeGeometry(path, segs, r, 14, false), m);
}

// Smooth tube through points (cables, hoses, chains).
export function spline(points, r, m, closed = false, segs = 80) {
  const curve = new THREE.CatmullRomCurve3(points.map(P), closed, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 8, closed), m);
}

export function box(center, size, m, radius = 0) {
  const [sx, sy, sz] = size;
  const geo = radius > 0
    ? new RoundedBoxGeometry(sx, sy, sz, 3, Math.min(radius, sx / 2, sy / 2, sz / 2) - 0.01)
    : new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.copy(P(center));
  return mesh;
}

// Cylinder centred at `center` whose axis is 'x' | 'y' | 'z' or a vector.
export function cyl(center, axis, r, len, m, seg = 32, rTop = r) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, len, seg), m);
  mesh.position.copy(P(center));
  const dir = typeof axis === 'string'
    ? { x: new THREE.Vector3(1, 0, 0), y: Y_AXIS, z: Z_AXIS }[axis]
    : P(axis).normalize();
  mesh.quaternion.setFromUnitVectors(Y_AXIS, dir);
  return mesh;
}

export function sphere(center, r, m, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.66)), m);
  mesh.position.copy(P(center));
  return mesh;
}

// Revolve a closed profile [[radius, axial], ...] about the local Y axis.
export function lathe(profile, m, seg = 64) {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg), m);
}

export function annulus(rIn, rOut, width, m, seg = 64) {
  const h = width / 2;
  return lathe([[rIn, -h], [rOut, -h], [rOut, h], [rIn, h], [rIn, -h]], m, seg);
}

// Rounded-rectangle profile for a tyre: rim radius → outer radius, given width.
export function tyreProfile(rIn, rOut, width, corner) {
  const h = width / 2, c = Math.min(corner, h, (rOut - rIn) / 2);
  const pts = [[rIn, -h + 4]];
  const arc = (cx, cy, a0, a1) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      pts.push([cx + c * Math.cos(a), cy + c * Math.sin(a)]);
    }
  };
  arc(rOut - c, -h + c, -Math.PI / 2, 0);
  arc(rOut - c, h - c, 0, Math.PI / 2);
  pts.push([rIn, h - 4], [rIn, -h + 4]);
  return pts;
}

// Disc brake rotor: a flat ring with vent holes and spider cut-outs, axis = local Y.
export function brakeRotor(rOut, thickness, m, { bolts = 6, rHub = 26 } = {}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = (x, y, r) => { const h = new THREE.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); shape.holes.push(h); };
  hole(0, 0, rHub);
  const band = rOut - 13;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    hole(band * Math.cos(a), band * Math.sin(a), Math.max(3, rOut * 0.045));
  }
  const spider = (rHub + band) / 2 + 2;
  for (let i = 0; i < bolts; i++) {
    const a = ((i + 0.5) / bolts) * Math.PI * 2;
    hole(spider * Math.cos(a), spider * Math.sin(a), (band - rHub) * 0.28);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(geo, m);
}

// Loft along X through superellipse sections:
// { x, y = 0, z, w, ht, hb, n } — width, top/bottom half heights, squareness n (2 = ellipse).
export function loftX(keys, m, { steps = 60, ring = 64 } = {}) {
  const N = keys.length;
  const k = keys.map((s) => ({ y: 0, n: 3, ...s }));
  const fields = ['x', 'y', 'z', 'w', 'ht', 'hb', 'n'];
  const sample = (t) => {
    const i = Math.min(Math.floor(t), N - 2), f = t - i;
    const p0 = k[Math.max(i - 1, 0)], p1 = k[i], p2 = k[i + 1], p3 = k[Math.min(i + 2, N - 1)];
    const out = {};
    for (const key of fields) {
      const a = p0[key], b = p1[key], c = p2[key], d = p3[key];
      out[key] = 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    }
    return out;
  };
  const pos = [];
  const rings = steps + 1;
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < rings; i++) {
    const s = sample((i / steps) * (N - 1));
    const e = 2 / Math.max(s.n, 1.2);
    for (let j = 0; j < ring; j++) {
      const t = (j / ring) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      pos.push(s.x, s.y + (Math.max(s.w, 0.1) / 2) * sp(c, e), s.z + (sn >= 0 ? s.ht : s.hb) * sp(sn, e));
    }
  }
  const s0 = sample(0), s1 = sample(N - 1);
  const c0 = pos.length / 3; pos.push(s0.x, s0.y, s0.z);
  const c1 = c0 + 1; pos.push(s1.x, s1.y, s1.z);
  const idx = [];
  const id = (i, j) => i * ring + (j % ring);
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < ring; j++) {
      idx.push(id(i, j), id(i, j + 1), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i + 1, j));
    }
  }
  for (let j = 0; j < ring; j++) {
    idx.push(c0, id(0, j + 1), id(0, j));
    idx.push(c1, id(rings - 1, j), id(rings - 1, j + 1));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, m);
}

// Thick parametric surface (seats, panels, cushions). fn(u, v) -> [x, y, z], u,v in [0,1].
// The front face normal is dP/du x dP/dv; the solid extends `thickness` behind it.
export function sheet(fn, thickness, m, nu = 32, nv = 32) {
  const F = (u, v) => P(fn(u, v));
  const front = [], back = [];
  const e = 1e-3;
  for (let i = 0; i <= nv; i++) {
    for (let j = 0; j <= nu; j++) {
      const u = j / nu, v = i / nv;
      const p = F(u, v);
      const du = F(Math.min(u + e, 1), v).sub(F(Math.max(u - e, 0), v));
      const dv = F(u, Math.min(v + e, 1)).sub(F(u, Math.max(v - e, 0)));
      const n = du.cross(dv).normalize();
      front.push(p);
      back.push(p.clone().addScaledVector(n, -thickness));
    }
  }
  const pos = [];
  for (const p of front) pos.push(p.x, p.y, p.z);
  for (const p of back) pos.push(p.x, p.y, p.z);
  const B = front.length;
  const id = (i, j) => i * (nu + 1) + j;
  const idx = [];
  for (let i = 0; i < nv; i++) {
    for (let j = 0; j < nu; j++) {
      const a = id(i, j), b = id(i, j + 1), c = id(i + 1, j + 1), d = id(i + 1, j);
      idx.push(a, b, c, a, c, d);
      idx.push(B + a, B + c, B + b, B + a, B + d, B + c);
    }
  }
  const loop = [];
  for (let j = 0; j < nu; j++) loop.push(id(0, j));
  for (let i = 0; i < nv; i++) loop.push(id(i, nu));
  for (let j = nu; j > 0; j--) loop.push(id(nv, j));
  for (let i = nv; i > 0; i--) loop.push(id(i, 0));
  for (let q = 0; q < loop.length; q++) {
    const A = loop[q], Bn = loop[(q + 1) % loop.length];
    idx.push(A, B + Bn, Bn, A, B + A, B + Bn);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, m);
}

// Coil spring between two points.
export function coil(a, b, rCoil, rWire, turns, m) {
  a = P(a); b = P(b);
  const len = a.distanceTo(b);
  class Helix extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const ang = t * turns * Math.PI * 2;
      return target.set(rCoil * Math.cos(ang), t * len, rCoil * Math.sin(ang));
    }
  }
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), turns * 24, rWire, 8, false), m);
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, b.clone().sub(a).normalize());
  return mesh;
}

// Rounded limb for the reference mannequins. `widen` stretches it sideways (world Y).
export function limb(a, b, r, m, widen = 1) {
  a = P(a); b = P(b);
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(dir.length(), 1), 6, 14), m);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize());
  if (widen !== 1) {
    // find which local axis ends up closest to world Y and scale it
    const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(q), lz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    if (Math.abs(lx.y) > Math.abs(lz.y)) mesh.scale.x = widen; else mesh.scale.z = widen;
  }
  mesh.quaternion.copy(q);
  return mesh;
}

export const deg = (d) => (d * Math.PI) / 180;

// Medium-size electric go-kart: tubular chassis, aerodynamic body, dual motors,
// side-pod battery packs, rear electronics bay and Ackermann steering.
// Units: mm. Frame: X forward (origin on the rear axle line), Y left, Z up (ground = 0).
import * as THREE from 'three';
import {
  mat, part, add, rod, bentTube, spline, box, cyl, sphere, lathe, annulus,
  tyreProfile, brakeRotor, loftX, sheet, limb, deg, P,
} from './lib/parts.js';

export const KART = {
  wheelbase: 1050,
  trackFront: 980, // wheel centre to wheel centre
  trackRear: 1120,
  tubeOD: 30, // 4130 chromoly, 2 mm wall
  railZ: 55, // chassis tube centreline height (≈40 mm ground clearance)
  wheelFront: { d: 254, w: 115, rimD: 127 }, // 10x4.50-5
  wheelRear: { d: 280, w: 180, rimD: 127 }, // 11x7.10-5
  axleOD: 40,
  caster: 12, kpi: 10, // degrees
  kingpinY: 370,
  steeringArm: 100,
  motor: { d: 180, len: 110, x: 200, y: 290, z: 170, sprocket: 11 },
  axleSprocket: 32,
  battery: { size: [240, 170, 110], x: 600, y: 370, z: 140, config: '2 × 10S8P (21700) → 72 V 36 Ah' },
  bay: { size: [200, 340, 90], x: -200, z: 300 },
};

const C = {
  frame: mat('#c62828', { metal: 0.45, rough: 0.35 }),
  frameDark: mat('#7f1d1d', { metal: 0.5, rough: 0.4 }),
  body: mat('#1e6fd9', { metal: 0.15, rough: 0.3 }),
  bodyAccent: mat('#f5f5f5', { metal: 0.1, rough: 0.35 }),
  duct: mat('#111418', { metal: 0.1, rough: 0.8 }),
  steel: mat('#b8bec6', { metal: 0.9, rough: 0.25 }),
  alu: mat('#d4d8de', { metal: 0.8, rough: 0.3 }),
  dark: mat('#2a2e35', { metal: 0.4, rough: 0.5 }),
  tyre: mat('#1a1a1a', { metal: 0.0, rough: 0.9 }),
  rim: mat('#c9ced6', { metal: 0.85, rough: 0.25 }),
  battery: mat('#30343b', { metal: 0.3, rough: 0.55 }),
  label: mat('#ffcc00', { metal: 0.1, rough: 0.5 }),
  hv: mat('#ff7a00', { metal: 0.1, rough: 0.6 }),
  pcb: mat('#1b7f3a', { metal: 0.2, rough: 0.5 }),
  chip: mat('#111111', { metal: 0.3, rough: 0.4 }),
  cover: mat('#a8d8ff', { metal: 0.0, rough: 0.1, opacity: 0.35 }),
  seat: mat('#20242b', { metal: 0.2, rough: 0.45 }),
  screen: mat('#0b1a2a', { metal: 0.2, rough: 0.15 }),
  driver: mat('#8a93a3', { metal: 0.0, rough: 0.8, opacity: 0.55 }),
  helmet: mat('#e8eef5', { metal: 0.3, rough: 0.3, opacity: 0.6 }),
};

const T = KART.tubeOD / 2;
const Z = KART.railZ;
const SIDES = [1, -1];

function chassis() {
  const g = part('chassis', 'שלדה (כרום-מולי Ø30)');
  // Main perimeter: one continuous bent tube from rear-left, around the nose, to rear-right.
  add(g, bentTube([
    [-80, 330, Z], [400, 330, Z], [760, 220, Z], [1110, 220, Z], [1170, 120, Z],
    [1170, -120, Z], [1110, -220, Z], [760, -220, Z], [400, -330, Z], [-80, -330, Z],
  ], T, C.frame, 70));
  // Cross members
  add(g,
    rod([-80, -330, Z], [-80, 330, Z], T, C.frame),
    rod([60, -330, Z], [60, 330, Z], T, C.frame),
    rod([200, -330, Z], [200, 330, Z], 12.5, C.frame),
    rod([400, -330, Z], [400, 330, Z], T, C.frame),
    rod([760, -220, Z], [760, 220, Z], 12.5, C.frame),
    rod([1050, -220, Z], [1050, 220, Z], T, C.frame),
  );
  for (const s of SIDES) {
    // Kingpin outriggers + C-bracket
    add(g,
      rod([975, 220 * s, Z], [1050, 350 * s, 85], 12.5, C.frame),
      rod([1110, 220 * s, Z], [1050, 350 * s, 85], 12.5, C.frame),
      box([1050, 350 * s, 125], [36, 10, 130], C.frameDark),
      box([1050, 368 * s, 66], [46, 46, 8], C.frameDark),
      box([1050, 368 * s, 186], [46, 46, 8], C.frameDark),
    );
    // Side nerf bars (carry the side pods and protect the battery packs)
    add(g, bentTube([[230, 330 * s, 60], [290, 580 * s, 110], [760, 560 * s, 110], [840, 220 * s, 60]], 12.5, C.frame, 50));
    // Rear bumper / motor subframe
    add(g, bentTube([[-80, 330 * s, Z], [-140, 330 * s, 75], [-390, 330 * s, 115], [-430, 540 * s, 130], [-430, 0, 130]], 12.5, C.frame, 50));
    // Motor cradle: plate across main rail and seat cross member, like a kart engine mount
    add(g, box([200, 290 * s, 75], [200, 150, 8], C.frameDark));
    // Posts carrying the electronics bay rails off the rear bumper tubes
    add(g, rod([-140, 330 * s, 75], [-140, 330 * s, 250], 9, C.frame), rod([-270, 330 * s, 97], [-270, 330 * s, 250], 9, C.frame));
    // Axle bearing hangers
    add(g, box([0, 330 * s, 105], [80, 10, 110], C.frameDark));
    // Battery trays sitting on main rail + nerf bar
    add(g, box([600, 370 * s, 82], [250, 180, 5], C.alu));
    // Seat stays
    add(g,
      rod([480, 190 * s, Z], [460, 175 * s, 60], 9, C.steel),
      rod([-80, 200 * s, Z], [200, 170 * s, 330], 9, C.steel),
    );
  }
  add(g,
    rod([-140, -330, 255], [-140, 330, 255], 10, C.frame),
    rod([-270, -330, 255], [-270, 330, 255], 10, C.frame),
    box([40, 80, 100], [90, 10, 90], C.frameDark), // centre bearing hanger
  );
  // Floor pan
  add(g, box([855, 0, 37], [590, 430, 4], C.alu));
  // Front bumper loops (inside the nose)
  add(g,
    bentTube([[1170, 120, Z], [1360, 300, 95], [1360, -300, 95], [1170, -120, Z]], 11, C.frame, 60),
    bentTube([[1110, 200, 60], [1290, 380, 160], [1290, -380, 160], [1110, -200, 60]], 11, C.frame, 60),
  );
  // Steering column support (single tube between the driver's legs)
  add(g, rod([1080, 0, Z], [860, 0, 270], 10, C.frame));
  return g;
}

// --- Steering: kingpins with caster/KPI, Ackermann arms, column, wheel with dash ---
const COL_BOTTOM = new THREE.Vector3(980, 0, 85);
const COL_TOP = new THREE.Vector3(770, 0, 460);

function steering() {
  const g = part('steering', 'היגוי ודוושות');
  const { kingpinY, caster, kpi, steeringArm } = KART;
  for (const s of SIDES) {
    const K = new THREE.Vector3(KART.wheelbase, kingpinY * s, 127);
    const axis = new THREE.Vector3(-Math.tan(deg(caster)), -s * Math.tan(deg(kpi)), 1).normalize();
    add(g,
      rod(K.clone().addScaledVector(axis, -70), K.clone().addScaledVector(axis, 70), 7, C.steel),
      cyl(K, axis, 18, 100, C.dark),
      rod(K, [KART.wheelbase, (KART.trackFront / 2 - 40) * s, 127], 12, C.steel), // spindle
    );
    // Ackermann: arm points at the rear-axle centre so the tie-rod geometry gives a common turn centre.
    const toRear = new THREE.Vector3(-K.x, -K.y, 0).normalize();
    const armEnd = new THREE.Vector3(K.x, K.y, 100).addScaledVector(toRear, steeringArm);
    add(g,
      rod([K.x, K.y, 100], armEnd, 8, C.steel),
      rod([COL_BOTTOM.x - 15, 40 * s, 92], armEnd, 7, C.steel), // tie rod
      sphere(armEnd, 11, C.dark),
      sphere([COL_BOTTOM.x - 15, 40 * s, 92], 11, C.dark),
    );
  }
  // Pitman plate and column
  add(g,
    box([COL_BOTTOM.x - 10, 0, 90], [30, 110, 10], C.steel),
    rod(COL_BOTTOM, COL_TOP, 10, C.steel),
  );
  // Steering wheel Ø300 with three spokes and a dash display on the hub
  const u = COL_TOP.clone().sub(COL_BOTTOM).normalize();
  const sw = new THREE.Group();
  sw.position.copy(COL_TOP);
  sw.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), u);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(150, 13, 14, 72), C.dark);
  sw.add(rim);
  for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
    sw.add(rod([0, 0, 0], [140 * Math.cos(a), 140 * Math.sin(a), 0], 7, C.alu));
  }
  sw.add(cyl([0, 0, 0], 'z', 38, 30, C.alu));
  // dash: 4.3" display above the hub, tilted toward the driver
  const dash = box([55, 0, 28], [70, 120, 18], C.dark, 4);
  const scr = box([55, 0, 38], [56, 104, 2], C.screen);
  sw.add(dash, scr);
  g.add(sw);
  // Pedals: brake (left) and throttle (right)
  add(g, rod([1135, -160, 60], [1135, 160, 60], 8, C.steel));
  for (const [y, w] of [[110, 70], [-110, 60]]) {
    const pedal = box([0, 0, 55], [16, w, 110], C.alu, 3);
    const pg = new THREE.Group();
    pg.position.set(1135, y, 60);
    pg.rotation.y = deg(-28);
    pg.add(pedal);
    g.add(pg);
  }
  return g;
}

function kartWheel({ d, w, rimD }) {
  const g = new THREE.Group();
  const R = d / 2, rr = rimD / 2;
  g.add(lathe(tyreProfile(rr, R, w, w * 0.22), C.tyre, 72));
  g.add(annulus(rr - 8, rr + 2, w - 8, C.rim, 48));
  g.add(cyl([0, 0, 0], 'y', rr - 6, 6, C.rim, 40));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(cyl([Math.cos(a) * 36, 0, Math.sin(a) * 36], 'y', 9, 8, C.dark, 12));
  }
  g.add(cyl([0, 0, 0], 'y', 28, w * 0.55, C.alu, 24));
  return g;
}

function wheels() {
  const g = part('wheels', 'גלגלים (10" קדמי / 11" אחורי)');
  for (const s of SIDES) {
    const f = kartWheel(KART.wheelFront);
    f.position.set(KART.wheelbase, (KART.trackFront / 2) * s, KART.wheelFront.d / 2);
    const r = kartWheel(KART.wheelRear);
    r.position.set(0, (KART.trackRear / 2) * s, KART.wheelRear.d / 2);
    add(g, f, r);
  }
  return g;
}

function drivetrain() {
  const g = part('drivetrain', 'הנעה: 2 מנועים, שרשראות, סרן וברקס');
  const AZ = KART.wheelRear.d / 2;
  add(g, cyl([0, 0, AZ], 'y', KART.axleOD / 2, 1080, C.steel, 24));
  for (const s of SIDES) {
    add(g,
      cyl([0, 505 * s, AZ], 'y', 45, 70, C.alu, 24), // wheel hubs
      cyl([0, 330 * s, AZ], 'y', 34, 26, C.dark, 24), // bearings
    );
    const { d, len, x, y, z } = KART.motor;
    // Motor (PMSM, 72 V) with cooling fins
    add(g, cyl([x, y * s, z], 'y', d / 2, len, C.dark, 40));
    for (let i = -2; i <= 2; i++) add(g, cyl([x, (y + i * 20) * s, z], 'y', d / 2 + 6, 5, C.alu, 40));
    add(g, cyl([x, (y + len / 2 + 8) * s, z], 'y', 50, 16, C.alu, 24));
    add(g, box([x, y * s, 92], [150, 100, 14], C.alu)); // motor cradle feet
    // Sprockets 11T → 32T and chain (#219)
    const ys = 225 * s;
    add(g,
      cyl([x, ys, z], 'y', 24, 8, C.steel, 22),
      cyl([0, ys, AZ], 'y', 66, 6, C.steel, 48),
      cyl([x, (225 + 15) * s, z], 'y', 8, 40, C.steel, 12), // motor shaft
    );
    const chainPts = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 + (i / 12) * Math.PI; chainPts.push([x + 27 * Math.cos(a), ys, z + 27 * Math.sin(a)]); }
    for (let i = 0; i <= 18; i++) { const a = -Math.PI / 2 + (i / 18) * Math.PI; chainPts.push([69 * Math.cos(a), ys, AZ + 69 * Math.sin(a)]); }
    add(g, spline(chainPts, 3.5, C.steel, true, 120));
  }
  // Rear brake: Ø180 vented disc + 4-piston caliper (plus regen from the controllers)
  add(g, brakeRotor(90, 8, C.steel, { rHub: 22 }));
  g.children[g.children.length - 1].position.set(0, -80, AZ);
  const a = deg(215);
  add(g, box([82 * Math.cos(a), -80, AZ + 82 * Math.sin(a)], [56, 44, 60], C.label, 8));
  return g;
}

function battery() {
  const g = part('battery', 'סוללות 72V בתוך התאים הצדדיים');
  const { size, x, y, z } = KART.battery;
  for (const s of SIDES) {
    add(g,
      box([x, y * s, z], size, C.battery, 8),
      box([x, (y - size[1] / 2 - 1) * s, z + 10], [size[0] * 0.7, 2, 26], C.label),
      box([x - size[0] / 2 + 30, y * s, z + size[2] / 2 + 8], [40, 50, 16], C.dark, 3), // BMS / connector
    );
    // HV cables to the electronics bay
    add(g, spline([
      [x - size[0] / 2 + 10, y * s, z + 50], [380, 345 * s, 150], [60, 330 * s, 140], [-60, 310 * s, 220], [-120, 180 * s, 300],
    ], 6, C.hv));
  }
  return g;
}

function electronics() {
  const g = part('electronics', 'לוח בקרה: בקרי מנוע, VCU, BMS ומגען');
  const { size, x, z } = KART.bay;
  const [L, W, H] = size;
  add(g, box([x, 0, z - H / 2 + 3], [L, W, 6], C.alu));
  for (const s of SIDES) {
    // motor controllers (one per motor) with heat-sink fins
    add(g, box([x, 85 * s, z - H / 2 + 30], [180, 140, 48], C.alu, 4));
    for (let i = 0; i < 7; i++) add(g, box([x - 75 + i * 25, 85 * s, z - H / 2 + 58], [4, 130, 10], C.alu));
  }
  // main board (VCU + BMS master + IMU) on stand-offs
  add(g, box([x, 0, z + 18], [170, 300, 3], C.pcb));
  for (const [cx, cy, sx, sy] of [[-30, -60, 40, 40], [30, -60, 25, 25], [20, 40, 50, 30], [-40, 90, 30, 50], [50, 110, 20, 40]]) {
    add(g, box([x + cx, cy, z + 23], [sx, sy, 6], C.chip));
  }
  add(g, box([x + 60, -120, z + 30], [35, 45, 22], C.label)); // main contactor
  add(g, box([x, 0, z + 12], [L, W, H + 30], C.cover, 10)); // polycarbonate cover
  return g;
}

function seat() {
  const g = part('seat', 'מושב');
  // Bucket seat: one shell following a side-profile curve with raised bolsters.
  const prof = new THREE.CatmullRomCurve3([
    [530, 0, 52], [410, 0, 36], [300, 0, 42], [255, 0, 110], [215, 0, 300], [170, 0, 450], [130, 0, 570],
  ].map(P));
  add(g, sheet((u, v) => {
    const c = prof.getPoint(v), t = prof.getTangent(v);
    const nx = t.z, nz = -t.x; // towards the occupant
    const side = 2 * u - 1;
    const half = 185 + 15 * v;
    const wall = 75 * Math.pow(Math.abs(side), 4);
    return [c.x + nx * wall, side * half, c.z + nz * wall];
  }, 8, C.seat, 28, 40));
  return g;
}

function body() {
  const g = part('body', 'כיסוי אווירודינמי');
  // Nose: low wedge ahead of the front wheels, wide enough to shield ~70% of each tyre face.
  add(g, loftX([
    { x: 1250, w: 860, z: 150, ht: 100, hb: 95, n: 4 },
    { x: 1310, w: 930, z: 140, ht: 92, hb: 86, n: 4.5 },
    { x: 1390, w: 870, z: 126, ht: 62, hb: 72, n: 4 },
    { x: 1445, w: 700, z: 112, ht: 26, hb: 56, n: 3.5 },
    { x: 1468, w: 440, z: 106, ht: 4, hb: 34, n: 3 },
  ], C.body));
  add(g, box([1330, 0, 233], [70, 300, 4], C.bodyAccent)); // number plate band
  // Front panel: curved shield above the shins, sends air over the hands and torso.
  add(g, sheet((u, v) => {
    const side = 2 * u - 1;
    const half = 220 - 60 * v;
    return [940 - 75 * v - 45 * side * side, side * half, 265 + 175 * v];
  }, 4, C.body, 24, 12));
  // Side pods: close the gap between front and rear wheels, house the battery packs.
  for (const s of SIDES) {
    add(g, loftX([
      { x: 180, y: 505 * s, w: 290, z: 150, ht: 82, hb: 82, n: 5 },
      { x: 260, y: 505 * s, w: 290, z: 155, ht: 88, hb: 88, n: 5 },
      { x: 380, y: 462 * s, w: 376, z: 155, ht: 88, hb: 88, n: 5 },
      { x: 600, y: 450 * s, w: 380, z: 152, ht: 80, hb: 88, n: 4.5 },
      { x: 820, y: 420 * s, w: 260, z: 140, ht: 58, hb: 76, n: 4 },
      { x: 890, y: 395 * s, w: 140, z: 130, ht: 28, hb: 62, n: 3 },
      { x: 906, y: 390 * s, w: 50, z: 125, ht: 8, hb: 42, n: 3 },
    ], C.body));
    // NACA-style inlet on the pod top feeding air over the battery pack
    add(g, box([660, 470 * s, 230], [150, 60, 8], C.duct, 3));
    add(g, box([300, 505 * s, 245], [60, 260, 4], C.bodyAccent));
  }
  // Rear bumper/fairing: protects motors & rear wheels, closes the wake behind the wheels.
  add(g, loftX([
    { x: -462, w: 1000, z: 150, ht: 40, hb: 50, n: 3.5 },
    { x: -440, w: 1180, z: 150, ht: 76, hb: 80, n: 4.5 },
    { x: -385, w: 1240, z: 155, ht: 95, hb: 90, n: 5 },
    { x: -335, w: 1180, z: 150, ht: 80, hb: 80, n: 5 },
  ], C.body));
  return g;
}

function driver() {
  const g = part('driver', 'נהג לייחוס (1.80 מ\')', { exportable: false });
  const m = C.driver;
  add(g,
    limb([380, 0, 130], [255, 0, 470], 115, m, 1.55),
    limb([255, 0, 520], [240, 0, 600], 45, m),
    sphere([230, 0, 690], 135, C.helmet, 32),
  );
  for (const s of SIDES) {
    add(g,
      limb([380, 90 * s, 115], [760, 135 * s, 270], 70, m),
      limb([760, 135 * s, 270], [1065, 115 * s, 145], 55, m),
      limb([1065, 115 * s, 145], [1120, 115 * s, 215], 42, m),
      limb([265, 195 * s, 505], [500, 240 * s, 400], 45, m),
      limb([500, 240 * s, 400], [765, 150 * s, 462], 40, m),
    );
  }
  return g;
}

export function buildGoKart() {
  const root = new THREE.Group();
  root.name = 'gokart';
  const parts = [chassis(), body(), steering(), drivetrain(), battery(), electronics(), wheels(), seat(), driver()];
  add(root, parts);
  return { root, parts, spec: KART };
}

// Fast electric off-road wheelchair ("power chair" for sport / trails, not a medical device).
// Two 29" bicycle-style wheels laced to 72 V direct-drive hub motors, Ø203 hydraulic disc brakes,
// rigid aluminium chassis with bicycle-style rear triangles, sprung seat module, suspended casters.
// Units: mm. Frame: X forward (origin on the drive axle line), Y left, Z up (ground = 0).
import * as THREE from 'three';
import {
  mat, part, add, rod, bentTube, spline, box, cyl, sphere, lathe, annulus,
  tyreProfile, brakeRotor, sheet, coil, limb, deg, P,
} from './lib/parts.js';

export const CHAIR = {
  wheel: { bsd: 622, tyreW: 61, d: 742, spokes: 36 }, // 29 x 2.4"
  axleZ: 371,
  hubY: 365, // wheel centre plane
  camber: 2, // degrees, top of wheel inwards
  hubOLD: 135, // dropout spacing
  hub: { d: 230, w: 100 }, // direct-drive hub motor shell
  rotor: 203,
  caster: { d: 254, w: 75, pivotX: 800, y: 370, trail: 55 }, // 10" pneumatic, suspended fork
  antiTip: { x: -450, y: 200, d: 80 },
  tube: { main: 30, small: 25 }, // 6061-T6
  seat: { z: 480, width: 460, front: 500, back: -70, recline: 11 },
  battery: { size: [420, 210, 110], x: 170, z: 222, config: '20S6P (21700) → 72 V 27 Ah' },
  bay: { size: [170, 260, 80], x: -140, z: 208 },
};

const C = {
  frame: mat('#4a5563', { metal: 0.7, rough: 0.35 }),
  seatFrame: mat('#1f2937', { metal: 0.6, rough: 0.4 }),
  alu: mat('#d4d8de', { metal: 0.85, rough: 0.28 }),
  steel: mat('#b8bec6', { metal: 0.9, rough: 0.22 }),
  dark: mat('#23272e', { metal: 0.4, rough: 0.5 }),
  tyre: mat('#191919', { metal: 0.0, rough: 0.92 }),
  rim: mat('#2b2f36', { metal: 0.7, rough: 0.3 }),
  spoke: mat('#cfd3d8', { metal: 0.95, rough: 0.2 }),
  motor: mat('#3b4250', { metal: 0.6, rough: 0.35 }),
  accent: mat('#ff5a1f', { metal: 0.3, rough: 0.4 }),
  caliper: mat('#e11d48', { metal: 0.5, rough: 0.35 }),
  cushion: mat('#334155', { metal: 0.0, rough: 0.95 }),
  cushionEdge: mat('#0f172a', { metal: 0.0, rough: 0.95 }),
  battery: mat('#30343b', { metal: 0.3, rough: 0.55 }),
  label: mat('#ffcc00', { metal: 0.1, rough: 0.5 }),
  hv: mat('#ff7a00', { metal: 0.1, rough: 0.6 }),
  hose: mat('#111111', { metal: 0.1, rough: 0.7 }),
  pcb: mat('#1b7f3a', { metal: 0.2, rough: 0.5 }),
  guard: mat('#9cc7f0', { metal: 0.0, rough: 0.1, opacity: 0.35 }),
  screen: mat('#0b1a2a', { metal: 0.2, rough: 0.15 }),
  spring: mat('#facc15', { metal: 0.6, rough: 0.3 }),
  rider: mat('#8a93a3', { metal: 0.0, rough: 0.8, opacity: 0.55 }),
};

const SIDES = [1, -1];
const R1 = CHAIR.tube.main / 2, R2 = CHAIR.tube.small / 2;
const AZ = CHAIR.axleZ;
const IN_DROP = CHAIR.hubY - CHAIR.hubOLD / 2; // 297.5
const OUT_DROP = CHAIR.hubY + CHAIR.hubOLD / 2; // 432.5

function frame() {
  const g = part('frame', 'שלדה (אלומיניום 6061-T6)');
  const ZL = 180, ZU = 440, YR = 280;
  for (const s of SIDES) {
    add(g,
      rod([-330, YR * s, ZL], [570, YR * s, ZL], R1, C.frame), // lower inner rail
      rod([-230, YR * s, ZU], [520, YR * s, ZU], R1, C.frame), // upper inner rail
      rod([-330, YR * s, ZL], [-230, YR * s, ZU], R2, C.frame), // rear diagonal
      rod([570, YR * s, ZL], [520, YR * s, ZU], R1, C.frame), // front upright
      rod([-90, YR * s, ZL], [-90, YR * s, ZU], R2, C.frame),
      rod([90, YR * s, ZL], [90, YR * s, ZU], R2, C.frame),
      // inner dropout plate (6 mm) with post-mount for the brake caliper
      box([0, (IN_DROP - 5) * s, 310], [190, 10, 260], C.frame, 3),
      // outer "rear triangle" (bicycle-style) so the hub motor axle is clamped on both sides
      rod([0, OUT_DROP * s, AZ], [570, OUT_DROP * s, ZL], R2, C.frame),
      bentTube([[0, OUT_DROP * s, AZ], [470, OUT_DROP * s, 450], [520, YR * s, ZU]], R2, C.frame, 40),
      rod([470, OUT_DROP * s, 450], [570, OUT_DROP * s, ZL], R2, C.frame),
      box([0, (OUT_DROP + 4) * s, AZ - 10], [60, 8, 70], C.frame, 3), // outer dropout
      // caster outriggers + steering heads
      bentTube([[570, OUT_DROP * s, ZL], [650, 410 * s, 360], [CHAIR.caster.pivotX, CHAIR.caster.y * s, 360]], R2, C.frame, 40),
      cyl([CHAIR.caster.pivotX, CHAIR.caster.y * s, 362], 'z', 22, 66, C.frame),
      // anti-tip arms
      rod([-330, CHAIR.antiTip.y * s, ZL], [CHAIR.antiTip.x + 10, CHAIR.antiTip.y * s, 105], R2, C.frame),
      // footrest hangers
      rod([570, 150 * s, ZL], [630, 150 * s, 128], R2, C.frame),
      // seat pivot bushings and guard brackets
      cyl([520, 230 * s, ZU + 18], 'y', 16, 40, C.dark),
      rod([-150, YR * s, ZU], [-150, 300 * s, 500], 6, C.frame),
      rod([300, YR * s, ZU], [300, 300 * s, 500], 6, C.frame),
    );
  }
  add(g,
    rod([570, -OUT_DROP, ZL], [570, OUT_DROP, ZL], R1, C.frame), // front lower cross
    rod([-330, -YR, ZL], [-330, YR, ZL], R1, C.frame), // rear lower cross
    rod([520, -YR, ZU], [520, YR, ZU], R1, C.frame), // front upper cross (seat pivot)
    rod([-230, -YR, 280], [-230, YR, 280], R2, C.frame), // shock lower mount cross
    rod([-230, -YR, ZU], [-230, YR, ZU], R2, C.frame),
    box([85, 0, 162], [650, 560, 5], C.alu), // battery / electronics tray
    box([-230, 0, 280], [40, 40, 36], C.dark), // shock clevis
  );
  // Footrest with toe lip
  add(g,
    box([690, 0, 125], [150, 340, 6], C.alu, 2),
    box([764, 0, 145], [6, 340, 40], C.alu, 2),
  );
  return g;
}

// ----- 29" wheel laced to a direct-drive hub motor -----
function wheel29(s) {
  const W = CHAIR.wheel;
  const g = new THREE.Group();
  const bead = W.bsd / 2; // 311
  const rOut = W.d / 2; // 371
  // Tyre (29 x 2.4") with knob rows
  g.add(lathe(tyreProfile(bead - 2, rOut - 6, W.tyreW, 26), C.tyre, 96));
  const knobs = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    for (const [off, w] of (i % 2 ? [[0, 16]] : [[-19, 11], [19, 11]])) {
      const k = box([0, 0, 0], [7, w, 12], C.tyre);
      const r = rOut - 4 - (off ? 3 : 0);
      k.position.set(r * Math.cos(a), off, r * Math.sin(a));
      k.rotation.y = -a;
      knobs.push(k);
    }
  }
  add(g, knobs);
  // Rim (30 mm inner width, double wall)
  g.add(lathe([
    [296, -14], [296, 14], [305, 17.5], [318, 17.5], [318, 14], [311, 13], [311, -13], [318, -14], [318, -17.5], [305, -17.5], [296, -14],
  ], C.rim, 96));
  // Hub motor shell with cooling ribs and spoke flanges
  const { d, w } = CHAIR.hub;
  g.add(cyl([0, 0, 0], 'y', d / 2, w, C.motor, 48));
  for (let i = -2; i <= 2; i++) g.add(cyl([0, i * 18, 0], 'y', d / 2 + 3, 4, C.dark, 48));
  for (const f of [-1, 1]) {
    g.add(cyl([0, f * (w / 2 - 4), 0], 'y', d / 2 + 8, 6, C.alu, 48));
    g.add(cyl([0, f * (w / 2 + 2), 0], 'y', 40, 6, C.dark, 24)); // side cover
  }
  g.add(cyl([0, 0, 0], 'y', 7, CHAIR.hubOLD + 30, C.steel, 12)); // axle
  for (const f of [-1, 1]) g.add(cyl([0, f * (CHAIR.hubOLD / 2 + 9), 0], 'y', 12, 8, C.steel, 6)); // axle nuts
  // 36 spokes, 1-cross (short spokes for a large-flange hub motor)
  const flangeR = d / 2 + 4, rimR = 300;
  for (let i = 0; i < W.spokes; i++) {
    const side = i % 2 ? 1 : -1;
    const a = (i / W.spokes) * Math.PI * 2;
    const dir = Math.floor(i / 2) % 2 ? 1 : -1;
    const aRim = a + dir * deg(9);
    g.add(rod(
      [flangeR * Math.cos(a), side * (w / 2 - 4), flangeR * Math.sin(a)],
      [rimR * Math.cos(aRim), side * 3, rimR * Math.sin(aRim)],
      1.0, C.spoke, 6,
    ));
  }
  // Ø203 rotor on the inboard side (6-bolt)
  const rotor = brakeRotor(CHAIR.rotor / 2, 2, C.steel, { rHub: 24 });
  rotor.position.y = -s * 58;
  g.add(rotor);
  g.add(cyl([0, -s * 54, 0], 'y', 30, 8, C.alu, 24)); // rotor adapter
  return g;
}

function wheels() {
  const g = part('wheels29', 'גלגלי 29" עם מנועי רכזת');
  for (const s of SIDES) {
    const w = wheel29(s);
    w.position.set(0, CHAIR.hubY * s, AZ);
    w.rotation.x = deg(CHAIR.camber) * s;
    g.add(w);
  }
  return g;
}

function brakes() {
  const g = part('brakes', 'בלמי דיסק הידראוליים');
  for (const s of SIDES) {
    // 4-piston caliper on a post mount, rear-lower quadrant of the rotor
    const a = deg(225), r = CHAIR.rotor / 2 - 14;
    const cx = r * Math.cos(a), cz = AZ + r * Math.sin(a);
    const cal = new THREE.Group();
    cal.position.set(cx, (CHAIR.hubY - 58) * s, cz);
    cal.rotation.y = -a - Math.PI / 2;
    cal.add(box([0, 0, 0], [80, 38, 34], C.caliper, 8));
    cal.add(box([0, -s * 22, -6], [64, 10, 30], C.alu, 3)); // post-mount adapter
    g.add(cal);
    // Hose: caliper → T-splitter under the seat → single lever on the left armrest (linked braking)
    add(g, spline([
      [cx - 10, (CHAIR.hubY - 75) * s, cz + 20], [-110, 270 * s, 420], [-60, 150 * s, 455], [80, 0, 458],
    ], 3, C.hose, false, 40));
  }
  add(g,
    box([80, 0, 458], [30, 24, 16], C.alu, 3), // splitter
    spline([[80, 0, 458], [200, 120, 462], [330, 250, 520], [360, 258, 690], [395, 255, 726]], 3, C.hose, false, 50),
  );
  // Lever with master cylinder, left armrest
  add(g,
    cyl([395, 255, 735], 'y', 14, 50, C.dark),
    box([395, 255, 760], [30, 40, 22], C.dark, 4),
  );
  const lever = box([0, 0, 0], [110, 14, 8], C.alu, 3);
  const lg = new THREE.Group();
  lg.position.set(440, 255, 735);
  lg.rotation.y = deg(18);
  lg.add(lever);
  g.add(lg);
  return g;
}

function casters() {
  const g = part('casters', 'גלגלי היגוי קדמיים עם מתלה + אנטי-טיפ');
  const { d, w, pivotX, y, trail } = CHAIR.caster;
  for (const s of SIDES) {
    const px = pivotX, py = y * s;
    // suspended fork: stem with elastomer/coil spring, crown, two legs
    add(g,
      rod([px, py, 290], [px, py, 400], 9, C.steel),
      coil([px, py, 296], [px, py, 328], 16, 3, 5, C.spring),
      box([px - 10, py, 285], [60, w + 30, 18], C.dark, 4),
    );
    for (const f of [-1, 1]) add(g, rod([px - 10, py + f * (w / 2 + 10), 285], [px - trail, py + f * (w / 2 + 10), d / 2], 7, C.dark));
    // 10" pneumatic caster wheel
    const cw = new THREE.Group();
    cw.position.set(px - trail, py, d / 2);
    cw.add(lathe(tyreProfile(70, d / 2, w, 24), C.tyre, 64));
    cw.add(annulus(50, 72, w - 10, C.alu, 48));
    cw.add(cyl([0, 0, 0], 'y', 52, w - 20, C.dark, 32));
    cw.add(cyl([0, 0, 0], 'y', 8, w + 30, C.steel, 12));
    g.add(cw);
    // anti-tip wheel
    const at = CHAIR.antiTip;
    add(g,
      box([at.x, at.y * s, 105], [40, 44, 20], C.dark, 4),
      cyl([at.x - 15, at.y * s, at.d / 2 + 40], 'y', at.d / 2, 28, C.tyre, 32),
      cyl([at.x - 15, at.y * s, at.d / 2 + 40], 'y', 20, 32, C.alu, 16),
    );
  }
  return g;
}

function seatModule() {
  const g = part('seat', 'מושב מרופד על מתלה, משענות וידיות');
  const Zs = CHAIR.seat.z;
  const back = (z) => -70 - (z - Zs) * Math.tan(deg(CHAIR.seat.recline)); // backrest post x at height z
  for (const s of SIDES) {
    add(g,
      rod([-70, 230 * s, Zs], [500, 230 * s, Zs], R2, C.seatFrame),
      box([515, 230 * s, 462], [30, 14, 50], C.seatFrame), // pivot lug
      bentTube([[-70, 230 * s, Zs], [back(1060), 230 * s, 1060], [back(1060), 120 * s, 1080]], R2, C.seatFrame, 40),
      // armrests
      rod([340, 240 * s, Zs], [340, 255 * s, 722], 11, C.seatFrame),
      rod([back(722), 236 * s, 722], [380, 255 * s, 722], 11, C.seatFrame),
      box([190, 255 * s, 745], [330, 72, 34], C.cushionEdge, 14),
    );
  }
  add(g,
    rod([-70, -230, Zs], [-70, 230, Zs], R2, C.seatFrame),
    rod([500, -230, Zs], [500, 230, Zs], R2, C.seatFrame),
    rod([back(1080), -120, 1080], [back(1160), 0, 1160], 9, C.seatFrame),
  );
  // Contoured seat cushion: bolsters on the sides, raised front roll, 70 mm memory foam
  add(g, sheet((u, v) => {
    const x = -60 + 490 * u, side = 2 * v - 1;
    const bolster = 28 * Math.pow(Math.abs(side), 4);
    const roll = 14 * Math.pow(Math.max(0, (u - 0.75) / 0.25), 2);
    const dip = -10 * Math.exp(-Math.pow((u - 0.3) / 0.25, 2)) * (1 - side * side);
    return [x, side * 228, 562 + bolster + roll + dip];
  }, 70, C.cushion, 30, 24));
  // Backrest cushion with lumbar support and side wings
  add(g, sheet((u, v) => {
    const z = 520 + 520 * u, side = 2 * v - 1;
    const lumbar = 28 * Math.exp(-Math.pow((u - 0.22) / 0.16, 2));
    const wing = 55 * Math.pow(Math.abs(side), 3) * (1 - 0.4 * u);
    return [back(z) + 22 + 45 + lumbar + wing, -side * 225, z];
  }, 45, C.cushion, 30, 24));
  // Rigid back shell behind the cushion
  add(g, sheet((u, v) => {
    const z = 505 + 545 * u, side = 2 * v - 1;
    return [back(z) + 16, -side * 228, z];
  }, 5, C.seatFrame, 12, 12));
  // Headrest (important at speed)
  const hr = box([0, 0, 0], [70, 250, 140], C.cushion, 30);
  hr.position.set(back(1170) + 40, 0, 1170);
  hr.rotation.y = deg(-CHAIR.seat.recline);
  g.add(hr);
  // 4-point harness straps (simplified)
  for (const s of SIDES) {
    add(g, spline([[back(1020) + 50, 120 * s, 1030], [back(1020) + 150, 90 * s, 980], [150, 60 * s, 720], [220, 30 * s, 620]], 6, C.accent, false, 30));
  }
  return g;
}

function shock() {
  const g = part('suspension', 'בולם מושב (קפיץ-שמן 210×55)');
  const top = P([-70, 0, 470]), bot = P([-230, 0, 300]);
  const dir = top.clone().sub(bot);
  const len = dir.length();
  const u = dir.clone().normalize();
  const bodyEnd = bot.clone().addScaledVector(u, len * 0.55);
  add(g,
    rod(bot, bodyEnd, 22, C.dark),
    rod(bodyEnd, top, 8, C.steel),
    coil(bot.clone().addScaledVector(u, 25), top.clone().addScaledVector(u, -25), 34, 4.5, 8, C.spring),
    cyl(bot, 'y', 12, 40, C.alu),
    cyl(top, 'y', 12, 40, C.alu),
    cyl(bodyEnd.clone().addScaledVector(u, -20), u, 38, 8, C.accent), // preload collar
  );
  return g;
}

function battery() {
  const g = part('battery', 'סוללה 72V מתחת למושב');
  const { size, x, z } = CHAIR.battery;
  add(g,
    box([x, 0, z], size, C.battery, 10),
    box([x, size[1] / 2 + 1, z + 10], [size[0] * 0.7, 2, 30], C.label),
    box([x - size[0] / 2 + 40, 0, z + size[2] / 2 + 8], [50, 80, 16], C.dark, 3),
    spline([[x - size[0] / 2 + 15, 30, z + 40], [-20, 40, 260], [-90, 50, 240]], 7, C.hv, false, 30),
    spline([[x - size[0] / 2 + 15, -30, z + 40], [-20, -40, 260], [-90, -50, 240]], 7, C.hv, false, 30),
  );
  return g;
}

function electronics() {
  const g = part('electronics', 'לוח בקרה: 2 בקרים, VCU+IMU, ג\'ויסטיק ותצוגה');
  const { size, x, z } = CHAIR.bay;
  add(g,
    box([x, 0, z], size, C.dark, 6),
    box([x, 0, z + size[2] / 2 + 2], [size[0] - 20, size[1] - 20, 3], C.pcb),
  );
  for (let i = 0; i < 6; i++) add(g, box([x - 60 + i * 24, 0, z - size[2] / 2 - 4], [4, size[1] - 20, 8], C.alu));
  // motor phase cables to the hub axles
  for (const s of SIDES) {
    add(g, spline([[x, 120 * s, z + 10], [-160, 240 * s, 230], [-40, 270 * s, 300], [0, (IN_DROP - 14) * s, AZ - 6]], 6, C.hose, false, 40));
  }
  // Joystick + display on the right armrest
  add(g,
    box([375, -255, 772], [80, 70, 22], C.dark, 6),
    rod([385, -255, 783], [392, -255, 840], 6, C.steel),
    sphere([392, -255, 848], 17, C.dark),
  );
  const disp = box([0, 0, 0], [8, 96, 62], C.dark, 3);
  const scr = box([5, 0, 0], [1, 84, 50], C.screen);
  const dg = new THREE.Group();
  dg.position.set(300, -255, 800);
  dg.rotation.y = deg(-25);
  dg.add(disp, scr);
  g.add(dg);
  return g;
}

function guards() {
  const g = part('guards', 'מגני צד (פוליקרבונט) בין הגלגל לרוכב');
  for (const s of SIDES) {
    add(g, sheet((u, v) => {
      const x = -200 + 560 * u, z = 485 + 255 * v;
      const top = 1 - Math.pow(Math.abs(2 * u - 1), 6) * 0.35; // rounded top corners
      return [x, 303 * s, 485 + (z - 485) * top];
    }, 4, C.guard, 20, 8));
  }
  return g;
}

function rider() {
  const g = part('rider', 'רוכב לייחוס (1.80 מ\')', { exportable: false });
  const m = C.rider;
  add(g,
    limb([60, 0, 650], [-20, 0, 1010], 110, m, 1.5),
    limb([-25, 0, 1060], [-30, 0, 1120], 42, m),
    sphere([-40, 0, 1200], 100, m, 28),
  );
  for (const s of SIDES) {
    add(g,
      limb([60, 95 * s, 640], [420, 105 * s, 622], 72, m),
      limb([420, 105 * s, 622], [580, 110 * s, 225], 52, m),
      limb([580, 110 * s, 225], [715, 110 * s, 172], 40, m),
      limb([-20, 200 * s, 1040], [100, 240 * s, 790], 44, m),
      limb([100, 240 * s, 790], [s > 0 ? 400 : 385, 250 * s, s > 0 ? 780 : 830], 38, m),
    );
  }
  return g;
}

export function buildWheelchair() {
  const root = new THREE.Group();
  root.name = 'wheelchair';
  const parts = [frame(), wheels(), brakes(), casters(), seatModule(), shock(), battery(), electronics(), guards(), rider()];
  add(root, parts);
  return { root, parts, spec: CHAIR };
}

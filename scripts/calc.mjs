// First-pass engineering numbers for both vehicles: mass & CG, aero/rolling power,
// gearing, acceleration, stability. Inputs are estimates (see docs/); edit and re-run.
// Usage: npm run calc
const g = 9.81, rho = 1.2;
const kmh = (v) => v * 3.6;
const f = (x, d = 0) => Number(x).toFixed(d);

function cg(items) {
  const m = items.reduce((s, i) => s + i.m, 0);
  return {
    m,
    x: items.reduce((s, i) => s + i.m * i.x, 0) / m,
    z: items.reduce((s, i) => s + i.m * i.z, 0) / m,
  };
}

// 1-D straight-line launch: force limited by traction, motor torque and motor power.
function launch({ m, Fmax, Pmax, CdA, crr, vEnd, dt = 0.01 }) {
  let v = 0, t = 0;
  const marks = {};
  while (v < vEnd && t < 60) {
    const Fdrive = Math.min(Fmax(v), Pmax / Math.max(v, 0.1));
    const Fres = 0.5 * rho * CdA * v * v + crr * m * g;
    v += ((Fdrive - Fres) / m) * dt;
    t += dt;
    for (const k of [30, 40, 60, 80]) if (!marks[k] && kmh(v) >= k) marks[k] = t;
  }
  return marks;
}

// ---------------- Go-kart ----------------
{
  const L = 1050; // wheelbase mm
  const items = [
    { n: 'chassis', m: 22, x: 450, z: 70 },
    { n: 'body', m: 7, x: 500, z: 160 },
    { n: 'steering+pedals', m: 4, x: 900, z: 200 },
    { n: 'front wheels+spindles', m: 6, x: 1050, z: 127 },
    { n: 'rear wheels+axle+hubs+brake', m: 13, x: 0, z: 140 },
    { n: '2 motors', m: 18, x: 200, z: 170 },
    { n: '2 battery packs', m: 15, x: 600, z: 140 },
    { n: 'electronics bay', m: 4, x: -200, z: 300 },
    { n: 'seat', m: 3, x: 380, z: 200 },
    { n: 'driver 80 kg', m: 80, x: 410, z: 330 },
  ];
  const c = cg(items);
  const rearPct = (1 - c.x / L) * 100;
  const rWheel = 0.14, ratio = 32 / 11, motorRpm = 5000, eta = 0.9;
  const vTop = ((motorRpm / ratio) / 60) * 2 * Math.PI * rWheel;
  const CdA = 0.45, CdAopen = 0.55, crr = 0.015;
  const Pat = (v, cda) => (0.5 * rho * cda * v ** 3 + crr * c.m * g * v) / eta;
  const mu = 1.1, hm = c.z / 1000, Lm = L / 1000;
  const aTrac = (mu * g * (rearPct / 100)) / (1 - (mu * hm) / Lm);
  const Tpeak = 45; // Nm per motor
  const Ftorque = (2 * Tpeak * ratio * eta) / rWheel;
  const marks = launch({
    m: c.m, CdA, crr, vEnd: vTop * 0.98, Pmax: 2 * 12000 * eta,
    Fmax: () => Math.min(Ftorque, aTrac * c.m),
  });
  const Wh = 72 * 36;
  console.log('=== GO-KART ===');
  console.log(`mass ${f(c.m)} kg (vehicle ${f(c.m - 80)} kg + driver 80), CG x=${f(c.x)} mm ahead of rear axle, h=${f(c.z)} mm`);
  console.log(`weight split front/rear: ${f(100 - rearPct)}% / ${f(rearPct)}%`);
  console.log(`gearing 11T:32T (${f(ratio, 2)}:1) → top speed at ${motorRpm} rpm: ${f(kmh(vTop))} km/h`);
  console.log(`power at 60/90 km/h with body (CdA ${CdA}): ${f(Pat(60 / 3.6, CdA) / 1000, 1)} / ${f(Pat(90 / 3.6, CdA) / 1000, 1)} kW; open kart (CdA ${CdAopen}): ${f(Pat(90 / 3.6, CdAopen) / 1000, 1)} kW @90`);
  console.log(`launch: traction limit ${f(aTrac / g, 2)} g, torque limit ${f(Ftorque / c.m / g, 2)} g → 0-60 ${f(marks[60], 1)} s, 0-80 ${f(marks[80], 1)} s`);
  console.log(`battery ${f(Wh / 1000, 2)} kWh: racing (~8 kW avg) ${f((Wh / 8000) * 60)} min, leisure (~3 kW avg) ${f((Wh / 3000) * 60)} min`);
  console.log(`peak battery current at 2×12 kW: ${f(24000 / 72)} A (20S8P × 45 A cells = 360 A)`);
  const sp = { kpi: 10, caster: 12, ackermann: Math.atan(370 / 1050) * 180 / Math.PI };
  console.log(`steering: Ackermann arm angle ${f(sp.ackermann, 1)}° (aims at rear-axle centre), caster ${sp.caster}°, KPI ${sp.kpi}°`);
}

// ---------------- Wheelchair ----------------
{
  const items = [
    { n: 'frame', m: 11, x: 80, z: 300 },
    { n: '2 × wheel 29" + DD hub motor', m: 22, x: 0, z: 371 },
    { n: 'brakes', m: 1.5, x: -40, z: 330 },
    { n: 'casters + forks', m: 5, x: 760, z: 180 },
    { n: 'anti-tip', m: 1, x: -450, z: 100 },
    { n: 'battery 20S6P', m: 11, x: 170, z: 222 },
    { n: 'electronics', m: 2.5, x: -140, z: 208 },
    { n: 'seat module + cushions', m: 10, x: 40, z: 680 },
    { n: 'shock', m: 0.8, x: -150, z: 385 },
    { n: 'rider 85 kg', m: 85, x: 140, z: 760 },
  ];
  const c = cg(items);
  const T = 2 * (365 + 371 * Math.sin((2 * Math.PI) / 180)); // track at ground, mm
  const Tf = 740;
  const xFront = 800 - 55; // caster contact when rolling forward
  const xAnti = -450 - 15;
  const h = c.z;
  const lat = Math.atan((Math.min(T, Tf) / 2) / h) * 180 / Math.PI;
  const ssf = (Math.min(T, Tf) / 2) / h;
  const back = Math.atan(c.x / h) * 180 / Math.PI;
  const backAnti = Math.atan((c.x - xAnti) / h) * 180 / Math.PI;
  const fwd = Math.atan((xFront - c.x) / h) * 180 / Math.PI;
  const aWheelie = (g * c.x) / h;
  const mu = 0.8, Lm = xFront / 1000, hm = h / 1000;
  const rearStatic = (xFront - c.x) / xFront;
  const aBrake = (mu * g * rearStatic) / (1 + (mu * hm) / Lm);
  const vTop = 40 / 3.6;
  const CdA = 0.65, crr = 0.012, eta = 0.85;
  const P40 = (0.5 * rho * CdA * vTop ** 3 + crr * c.m * g * vTop) / eta;
  const Wh = 72 * 27;
  const ayLimit = 0.35;
  const rMin = (vTop ** 2) / (ayLimit * g);
  const rWheel = 0.371, Tpeak = 100;
  const aLimit = 0.85 * aWheelie;
  const marks = launch({
    m: c.m, CdA, crr, vEnd: vTop, Pmax: 2 * 4000 * eta,
    Fmax: () => Math.min((2 * Tpeak) / rWheel, aLimit * c.m),
  });
  const stop = vTop ** 2 / (2 * aBrake) + vTop * 0.5;
  console.log('\n=== FAST ELECTRIC WHEELCHAIR ===');
  console.log(`mass ${f(c.m)} kg (chair ${f(c.m - 85)} kg + rider 85), CG x=${f(c.x)} mm ahead of drive axle, h=${f(h)} mm`);
  console.log(`track at ground ${f(T)} mm (rear) / ${Tf} mm (casters); static lateral tip ${f(lat, 1)}°, SSF ${f(ssf, 2)} → rollover at ~${f(ssf, 2)} g`);
  console.log(`static pitch: backward ${f(back, 1)}° without anti-tip, ${f(backAnti, 1)}° on anti-tip wheels; forward ${f(fwd, 1)}°`);
  console.log(`wheelie (front lift) threshold: ${f(aWheelie / g, 2)} g → controller caps accel at ${f(aLimit / g, 2)} g`);
  console.log(`0-30 ${f(marks[30], 1)} s, 0-40 ${f(marks[40] ?? NaN, 1)} s (pitch-limited)`);
  console.log(`rear-disc braking (mu ${mu}): ${f(aBrake / g, 2)} g, stop from 40 km/h ≈ ${f(stop, 1)} m incl. 0.5 s reaction`);
  console.log(`power at 40 km/h: ${f(P40)} W → ${f(P40 / 40, 1)} Wh/km → range ≈ ${f(Wh / (P40 / 40))} km at a steady 40 km/h on flat road`);
  console.log(`yaw/lateral limit ${ayLimit} g → min turn radius at 40 km/h ${f(rMin, 1)} m (vs ${f(vTop ** 2 / (ssf * g), 1)} m at rollover)`);
  console.log(`wheel rpm at 40 km/h: ${f((vTop / (2 * Math.PI * rWheel)) * 60)} rpm`);
}

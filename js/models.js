// models.js — semua model 3D dibina secara prosedural
import * as THREE from 'three';
import { famOf } from './wanim.js';
import { WEAPONS } from './weapons.js';
const WBY_LITE = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { carRoughness } from './assets.js';
import { HULLS, HG } from './hulls.js';
import { HULLS3 } from './hulls3.js';
Object.assign(HULLS, HULLS3);   // reka bentuk semula 2026-10-17 mengatasi badan lama
import { BODY2, weaponModel2 } from './models2.js';
import { makeBody4 } from './models4.js';
// reka bentuk semula 2026-10-18 (12 kereta) - mengatasi badan lama sama nama
Object.assign(BODY2, makeBody4(BODY2));
import { weaponModel3, fistHand } from './wmodels3.js';
import { TAU, PI, rand, pick, clamp, lerp } from './core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x, y, z) => new THREE.Euler(x, y, z);

/* Pembina: kumpul geometri ikut bahan, cantum jadi satu mesh (kurang draw call) */
class Builder {
  constructor() { this.g = {}; }
  add(key, geo, pos, rot, scl) {
    // RoundedBoxGeometry tidak berindeks manakala BoxGeometry berindeks —
    // samakan dahulu supaya mergeGeometries tidak gagal
    const c = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = new THREE.Matrix4().compose(
      pos ? V(...pos) : V(0, 0, 0),
      new THREE.Quaternion().setFromEuler(rot ? E(...rot) : E(0, 0, 0)),
      scl ? V(...scl) : V(1, 1, 1));
    c.applyMatrix4(m);
    (this.g[key] || (this.g[key] = [])).push(c);
    return this;
  }
  build(mats, parent, shadow = true) {
    const out = {};
    for (const k in this.g) {
      const geo = this.g[k].length === 1 ? this.g[k][0] : mergeGeometries(this.g[k], false);
      const mesh = new THREE.Mesh(geo, mats[k]);
      mesh.castShadow = shadow; mesh.receiveShadow = shadow;
      parent.add(mesh); out[k] = mesh;
    }
    return out;
  }
}

/* ---------- geometri berkongsi ---------- */
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  rbox: new RoundedBoxGeometry(1, 1, 1, 2, 0.16),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  sph: new THREE.SphereGeometry(0.5, 14, 10),
  sphLo: new THREE.SphereGeometry(0.5, 8, 6),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  ico1: new THREE.IcosahedronGeometry(0.5, 1),
  torus: new THREE.TorusGeometry(0.5, 0.1, 8, 20),
  plane: new THREE.PlaneGeometry(1, 1),
};

/* ---------- bahan ---------- */
export function mat(o) { return new THREE.MeshStandardMaterial(o); }
export const MATS = {
  dark: mat({ color: 0x2b3037, metalness: 0.75, roughness: 0.55 }),
  darker: mat({ color: 0x15181c, metalness: 0.6, roughness: 0.7 }),
  steel: mat({ color: 0x9aa1aa, metalness: 0.95, roughness: 0.32 }),
  rust: mat({ color: 0x6b4630, metalness: 0.5, roughness: 0.9 }),
  rubber: mat({ color: 0x121417, metalness: 0.0, roughness: 0.95 }),
  glass: mat({ color: 0x0b1622, metalness: 0.9, roughness: 0.07 }),
  head: mat({ color: 0xfff6dd, emissive: 0xfff0c8, emissiveIntensity: 2.6, roughness: 0.3 }),
  tail: mat({ color: 0x300, emissive: 0xff1d1d, emissiveIntensity: 1.8, roughness: 0.4 }),
  hot: mat({ color: 0x220, emissive: 0xff8a2a, emissiveIntensity: 3, roughness: 0.5 }),
  neonC: mat({ color: 0x062a2a, emissive: 0x39f2d0, emissiveIntensity: 2.6, roughness: 0.4 }),
  neonM: mat({ color: 0x2a0630, emissive: 0xd44cff, emissiveIntensity: 2.4, roughness: 0.4 }),
  neonG: mat({ color: 0x0a2a10, emissive: 0x6dff5a, emissiveIntensity: 2.2, roughness: 0.4 }),
  concrete: mat({ color: 0x8d8b84, metalness: 0.0, roughness: 0.95 }),
  sand: mat({ color: 0x9c8a63, metalness: 0.0, roughness: 1.0 }),
  wood: mat({ color: 0x7a5a34, metalness: 0.0, roughness: 0.9 }),
  army: mat({ color: 0x4a5340, metalness: 0.35, roughness: 0.75 }),
  chitin: mat({ color: 0x3a2050, metalness: 0.4, roughness: 0.45 }),
};

/* ruas anggota antara dua sendi (kaki labah-labah) */
const _sq = new THREE.Quaternion(), _se = new THREE.Euler(), _sv = new THREE.Vector3();
function segL(b, key, geo, a, c, r) {
  _sv.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = _sv.length() || 1e-3;
  _sq.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _sv.normalize());
  _se.setFromQuaternion(_sq);
  b.add(key, geo, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], [_se.x, _se.y, _se.z], [r, len, r]);
}

/* ---------- TAYAR (dikongsi semua kereta beroda) ----------
   Dahulu: silinder hitam rata + plat kelabu "X" yang terkeluar dari sisi -
   Nabil kata buruk, tak nampak macam tayar. Sekarang: bunga tayar
   berselang-seli, dinding tayar membulat, rim cekung dengan gelang bibir,
   6 jejari, hab + nat, dan gelang brek ikut warna aksen kereta.
   Jejari 0.46 (unit), paksi putaran = X. */
const TYRE_G = {
  tread: new THREE.CylinderGeometry(0.46, 0.46, 0.3, 22),
  wall: new THREE.TorusGeometry(0.37, 0.09, 6, 22),
  lug: new THREE.BoxGeometry(0.13, 0.06, 0.11),
  barrel: new THREE.CylinderGeometry(0.29, 0.29, 0.34, 16),
  lip: new THREE.TorusGeometry(0.285, 0.028, 4, 18),
  disc: new THREE.CylinderGeometry(0.27, 0.27, 0.02, 16),
  hub: new THREE.CylinderGeometry(0.085, 0.1, 0.42, 12),
};
const TYRE_M = {};
export function tyreTemplate(crys) {
  const T = TYRE_G;
  if (!TYRE_M.rubber) {
    TYRE_M.rubber = mat({ color: 0x17191c, metalness: 0.0, roughness: 0.92 });
    TYRE_M.wall = mat({ color: 0x24272b, metalness: 0.05, roughness: 0.8 });
    TYRE_M.dark = mat({ color: 0x1d2126, metalness: 0.7, roughness: 0.45 });
    TYRE_M.steel = mat({ color: 0xb6bcc4, metalness: 0.95, roughness: 0.25 });
  }
  const b = new Builder();
  b.add('rubber', T.tread, [0, 0, 0], [0, 0, PI / 2]);
  for (const sd of [-1, 1]) b.add('wall', T.wall, [sd * 0.15, 0, 0], [0, PI / 2, 0]);
  for (let i = 0; i < 18; i++) {                                    // bunga tayar berselang (chevron)
    const a = i / 18 * TAU, sd = i % 2 ? 1 : -1;
    b.add('rubber', T.lug, [sd * 0.07, Math.cos(a) * 0.47, Math.sin(a) * 0.47], [a, sd * 0.35, 0]);
  }
  b.add('dark', T.barrel, [0, 0, 0], [0, 0, PI / 2]);                // rim cekung
  for (const sd of [-1, 1]) {
    b.add('steel', T.lip, [sd * 0.17, 0, 0], [0, PI / 2, 0]);         // bibir rim
    b.add('dark', T.disc, [sd * 0.1, 0, 0], [0, 0, PI / 2]);
    for (let i = 0; i < 6; i++) {                                    // jejari
      const a = i / 6 * TAU + 0.26;
      b.add('steel', G.box, [sd * 0.14, Math.cos(a) * 0.16, Math.sin(a) * 0.16], [a, 0, 0], [0.04, 0.24, 0.07]);
    }
    for (let i = 0; i < 5; i++) {                                    // nat roda
      const a = i / 5 * TAU;
      b.add('steel', G.cyl, [sd * 0.2, Math.cos(a) * 0.055, Math.sin(a) * 0.055], [0, 0, PI / 2], [0.03, 0.03, 0.03]);
    }
    b.add('crys', G.torus, [sd * 0.155, 0, 0], [0, PI / 2, 0], [0.42, 0.42, 0.25]);   // gelang brek bercahaya
  }
  b.add('steel', T.hub, [0, 0, 0], [0, 0, PI / 2]);
  const g = new THREE.Group();
  const ms = b.build(Object.assign({ crys }, TYRE_M), g);
  // prestasi: hanya getah tayar menuang bayang - jejari/nat/rim terlalu kecil untuk kelihatan
  for (const k in ms) if (k !== 'rubber') ms[k].castShadow = false;
  return g;
}

/* ---------- PERANTI TERAPUNG (dikongsi semua kereta hover) ----------
   Nabil 2026-10-17: "takde la bulat hitam macam tu" - dahulu setiap pod hanya
   silinder hitam + gelang. Sekarang satu pembina dengan GAYA berbeza setiap
   kereta (sama keluarga, tetapi ada kelainan): nasel bergaris warna badan,
   bahagian berputar, pemancar bercahaya di bawah dan kon cahaya tujahan.
   Pulangkan { g, spin:[{o, k|pulse|bob|rock}], wash:[mesh] } untuk dianimasikan.
     duct    - kipas bersalur 5 bilah (Vortex)
     royal   - kipas bersalur, bibir emas + sirip mahkota (Sovereign)
     mag     - gegelung magnet bertingkat mengelilingi orb (Seraph)
     ion     - perumah heksagon, 3 cakar pemancar + gelang terapung (Oracle)
     jet     - nasel jet, muncung loceng menghala ke bawah (Albatross)
     arc     - nasel jet + gegelung tesla berkilat (Stormwing)
     cyclone - sangkar bilah berpilin mengelilingi tiang angin (Typhoon)
     prism   - pod bersegi siluman dengan celah chevron (Spectre) */
const HOV_G = {};
function hovGeo() {
  if (HOV_G.shell) return HOV_G;
  const prof = [[0.3, -0.2], [0.56, -0.18], [0.62, -0.08], [0.6, 0.06], [0.5, 0.16], [0.28, 0.22], [0.001, 0.24]];
  HOV_G.shell = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 28);
  HOV_G.duct = new THREE.CylinderGeometry(0.5, 0.46, 0.3, 28, 1, true);
  HOV_G.blade = new THREE.BoxGeometry(0.44, 0.025, 0.12);
  HOV_G.bell = new THREE.CylinderGeometry(0.2, 0.4, 0.42, 22, 1, true);
  HOV_G.wash = new THREE.ConeGeometry(0.5, 1.0, 22, 1, true);
  HOV_G.hex = new THREE.CylinderGeometry(0.58, 0.5, 0.3, 6);
  HOV_G.oct = new THREE.OctahedronGeometry(0.5, 0);
  HOV_G.ring = new THREE.TorusGeometry(0.5, 0.045, 8, 32);
  HOV_G.disc = new THREE.CircleGeometry(0.5, 28);
  return HOV_G;
}
export function hoverPod(style, accent, M) {
  const H = hovGeo();
  const acc = new THREE.Color(accent || '#57d6ff');
  const g = new THREE.Group(), spin = [], wash = [];
  const glow = M.glow;
  const add = (geo, m, p, r, sc, par) => {
    const o = new THREE.Mesh(geo, m);
    if (p) o.position.set(p[0], p[1], p[2]);
    if (r) o.rotation.set(r[0], r[1], r[2]);
    if (sc) o.scale.set(sc[0], sc[1], sc[2]);
    o.castShadow = false; (par || g).add(o); return o;
  };
  const washM = new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const discM = new THREE.MeshBasicMaterial({ color: acc.clone().lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const addWash = (y, r, len, tint) => {
    const m = tint ? washM.clone() : washM;
    if (tint) m.color.lerp(new THREE.Color(tint), 0.5);
    const w = add(H.wash, m, [0, y - len / 2, 0], null, [r * 2, len, r * 2]);
    w.castShadow = false; w.userData.base = 0.1; w.userData.len = len; wash.push(w);
    const d = add(H.disc, discM, [0, y + 0.005, 0], [PI / 2, 0, 0], [r * 2, r * 2, 1]);
    d.castShadow = false;
  };
  if (style === 'duct' || style === 'royal') {
    const lip = style === 'royal' ? M.gold : M.body;
    add(H.shell, M.dark, [0, 0.02, 0], null, [1.02, 0.9, 1.02]);
    add(H.ring, lip, [0, 0.12, 0], [PI / 2, 0, 0], [1.22, 1.22, 2.2]);              // bibir atas warna badan
    add(H.duct, M.darker, [0, -0.06, 0]);
    add(H.ring, glow, [0, -0.2, 0], [PI / 2, 0, 0], [1.0, 1.0, 1.2]);
    for (let i = 0; i < 2; i++) add(G.box, M.steel, [0, -0.08, 0], [0, i * PI / 2 + PI / 4, 0], [0.98, 0.04, 0.05]);   // stator
    const fan = new THREE.Group(); fan.position.y = -0.1; g.add(fan);
    for (let i = 0; i < 5; i++) add(H.blade, M.steel, [Math.cos(i / 5 * TAU) * 0.22, 0, Math.sin(i / 5 * TAU) * 0.22], [0.45, -i / 5 * TAU, 0], null, fan);
    add(G.cone, M.steel, [0, -0.16, 0], [PI, 0, 0], [0.18, 0.2, 0.18]);
    spin.push({ o: fan, k: 14 });
    if (style === 'royal') for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      add(G.cone, M.gold, [Math.cos(a) * 0.6, 0.26, Math.sin(a) * 0.6], null, [0.1, 0.26, 0.1]);     // mahkota
    }
    addWash(-0.22, 0.46, 0.9, style === 'royal' ? '#ffd27a' : null);
  } else if (style === 'mag') {
    add(G.sph, M.body, [0, 0.12, 0], null, [1.0, 0.4, 1.0]);                         // kubah atas
    add(H.ring, M.steel, [0, 0.06, 0], [PI / 2, 0, 0], [1.08, 1.08, 2.0]);
    const coils = new THREE.Group(); g.add(coils);
    for (let i = 0; i < 3; i++) {
      const r = 0.95 - i * 0.2;
      add(H.ring, i % 2 ? M.steel : glow, [0, -0.06 - i * 0.1, 0], [PI / 2, 0, 0], [r, r, 1.6], coils);
    }
    for (let i = 0; i < 3; i++) add(G.box, M.dark, [Math.cos(i / 3 * TAU) * 0.42, -0.14, Math.sin(i / 3 * TAU) * 0.42], [0, -i / 3 * TAU, 0], [0.06, 0.34, 0.12], coils);
    const orb = add(G.sph, glow, [0, -0.32, 0], null, [0.3, 0.3, 0.3]);
    spin.push({ o: coils, k: 2.5 });
    spin.push({ o: orb, pulse: 0.3 });
    addWash(-0.36, 0.36, 0.8);
  } else if (style === 'ion') {
    add(H.hex, M.dark, [0, 0.04, 0]);
    add(H.hex, M.body, [0, 0.2, 0], null, [0.82, 0.25, 0.82]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + PI / 6; add(G.box, glow, [Math.cos(a) * 0.5, 0.04, Math.sin(a) * 0.5], [0, -a, 0], [0.03, 0.12, 0.2]); }
    for (let i = 0; i < 3; i++) {                                                      // cakar pemancar
      const a = i / 3 * TAU;
      const c = new THREE.Group(); c.position.set(Math.cos(a) * 0.38, -0.1, Math.sin(a) * 0.38); c.rotation.y = -a; g.add(c);
      add(G.box, M.steel, [-0.05, -0.12, 0], [0, 0, -0.5], [0.08, 0.3, 0.1], c);
      add(G.sph, glow, [-0.14, -0.26, 0], null, [0.1, 0.1, 0.1], c);
    }
    const halo = add(H.ring, glow, [0, -0.42, 0], [PI / 2, 0, 0], [0.62, 0.62, 1.2]);
    spin.push({ o: halo, bob: 0.05 });
    addWash(-0.42, 0.32, 0.7);
  } else if (style === 'jet' || style === 'arc') {
    add(G.sph, M.body, [0, 0.08, 0], null, [0.78, 0.5, 1.15]);                       // nasel
    add(G.cyl, M.dark, [0, 0.08, 0.5], [PI / 2, 0, 0], [0.5, 0.12, 0.5]);             // salur masuk
    add(H.ring, M.steel, [0, 0.08, 0.57], null, [0.52, 0.52, 1.4]);
    add(H.bell, M.dark, [0, -0.24, -0.05]);                                             // muncung loceng
    add(H.ring, M.steel, [0, -0.45, -0.05], [PI / 2, 0, 0], [0.82, 0.82, 1.4]);
    add(G.cyl, glow, [0, -0.22, -0.05], null, [0.34, 0.06, 0.34]);
    const vanes = new THREE.Group(); vanes.position.set(0, -0.3, -0.05); g.add(vanes);
    for (let i = 0; i < 4; i++) add(G.box, M.steel, [0, 0, 0], [0, i * PI / 4, 0], [0.6, 0.03, 0.05], vanes);
    spin.push({ o: vanes, rock: 0.25 });
    if (style === 'arc') {
      for (let i = 0; i < 3; i++) add(H.ring, glow, [0, 0.08, -0.3 + i * 0.22], null, [0.84 - i * 0.06, 0.6 - i * 0.04, 0.8]);   // gegelung tesla
      add(G.cyl, M.steel, [0, 0.5, -0.2], null, [0.05, 0.4, 0.05]);
      const spark = add(G.sph, glow, [0, 0.73, -0.2], null, [0.14, 0.14, 0.14]);
      spin.push({ o: spark, pulse: 0.6 });
    } else {
      for (const sd of [-1, 1]) add(G.box, M.body, [sd * 0.36, 0.22, -0.35], [0, 0, sd * 0.5], [0.04, 0.3, 0.42]);   // sirip
    }
    addWash(-0.46, 0.4, 1.2, style === 'jet' ? '#ffd28a' : null);
  } else if (style === 'cyclone') {
    add(G.cyl, M.dark, [0, 0.16, 0], null, [1.1, 0.12, 1.1]);
    add(H.ring, M.body, [0, 0.22, 0], [PI / 2, 0, 0], [1.12, 1.12, 2.2]);
    add(H.ring, M.steel, [0, -0.4, 0], [PI / 2, 0, 0], [1.0, 1.0, 1.6]);
    const cage = new THREE.Group(); g.add(cage);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU;
      for (let k = 0; k < 4; k++) {                                                     // bilah berpilin
        const t = k / 3, aa = a + t * 1.2;
        add(G.box, M.steel, [Math.cos(aa) * 0.46, 0.08 - t * 0.44, Math.sin(aa) * 0.46], [0, -aa, 0.35], [0.05, 0.16, 0.14], cage);
      }
    }
    const col = add(G.cyl, glow, [0, -0.12, 0], null, [0.14, 0.5, 0.14]);
    spin.push({ o: cage, k: 9 });
    spin.push({ o: col, pulse: 0.25 });
    addWash(-0.42, 0.5, 0.9);
  } else {                                                                                // prism
    add(H.oct, M.body, [0, 0.0, 0], null, [1.25, 0.42, 1.55]);
    add(H.oct, M.darker, [0, -0.06, 0], null, [1.12, 0.36, 1.4]);
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1])
      add(G.box, glow, [sd * 0.16, 0.08, 0.32 - i * 0.22], [0, sd * 0.6, 0], [0.32, 0.03, 0.04]);   // celah chevron
    const fin = add(G.box, glow, [0, -0.2, 0], null, [0.62, 0.04, 0.9]);
    spin.push({ o: fin, pulse: 0.15 });
    addWash(-0.22, 0.4, 0.9);
  }
  // prestasi: bahagian statik pod dicantum (satu mesh setiap bahan); bahagian berputar & kon kekal
  flatten(g, new Set([...spin.map(q => q.o), ...wash]), null, null);
  for (const m of g.children) if (m.isMesh && !wash.includes(m)) m.castShadow = false;
  return { g, spin, wash };
}

/* ---------- RANTAI KERETA KEBAL (satu sisi) ----------
   Dibina semula 2026-10-17 (Nabil: "bagi nampak macam tayar kereta kebal"):
   sproket bergigi di belakang, roda pemalas di depan, roda jalan berkembar,
   roda balik di atas, dan TALI RANTAI sebenar - mata rantai bergrouser
   (InstancedMesh) yang mengelilingi roda dan BERGERAK ikut kelajuan.
   P: { sd, x, y, z, k (skala), crys, ZF, ZB, TR, NL, roads } */
const _tm4 = new THREE.Matrix4(), _tq4 = new THREE.Quaternion(), _tp4 = new THREE.Vector3(), _ts4 = new THREE.Vector3(1, 1, 1), _tax = new THREE.Vector3(1, 0, 0);
let TRK_M = null;
function trackSide(parent, P) {
  if (!TRK_M) TRK_M = {
    link: mat({ color: 0x2a2d31, metalness: 0.8, roughness: 0.5 }),
    wheel: mat({ color: 0x33373d, metalness: 0.85, roughness: 0.38 }),
    rubber: MATS.rubber.clone(), steel: MATS.steel.clone(),
  };
  const tm = Object.assign({ crys: P.crys || MATS.neonC }, TRK_M);
  const sd = P.sd || 1, TR = P.TR || 0.5, ZF = P.ZF ?? 2.2, ZB = P.ZB ?? -2.15, YC = TR + 0.05, NL = P.NL || 44;
  const runL = ZF - ZB, perim = 2 * runL + 2 * PI * TR, pitch = perim / NL;
  const lb = new Builder();
  lb.add('link', G.box, [0, 0, 0], null, [0.74, 0.07, pitch * 0.86]);
  lb.add('link', G.box, [0, -0.055, 0], null, [0.74, 0.05, 0.07]);
  lb.add('link', G.box, [0, 0.07, 0], null, [0.12, 0.09, pitch * 0.5]);
  lb.add('link', G.cyl8, [0, 0, pitch * 0.45], [0, 0, PI / 2], [0.05, 0.8, 0.05]);
  const linkGeo = mergeGeometries(lb.g.link, false);
  /* laluan stadium: s=0 di hujung depan bawah, ke BELAKANG sepanjang larian
     bawah (tanah tetap = rantai ke belakang bila maju), naik di sproket, ke depan di atas */
  const pathAt = q => {
    q = ((q % perim) + perim) % perim;
    if (q < runL) return [YC - TR, ZF - q, 0];
    q -= runL;
    if (q < PI * TR) { const a = q / TR; return [YC - TR * Math.cos(a), ZB - TR * Math.sin(a), a]; }
    q -= PI * TR;
    if (q < runL) return [YC + TR, ZB + q, PI];
    q -= runL;
    const a = q / TR; return [YC + TR * Math.cos(a), ZF + TR * Math.sin(a), PI + a];
  };
  const grp = new THREE.Group();
  grp.position.set(P.x || 0, P.y || 0, P.z || 0);
  if (P.k) grp.scale.setScalar(P.k);
  parent.add(grp);
  const links = new THREE.InstancedMesh(linkGeo, tm.link, NL);
  links.castShadow = true; links.receiveShadow = true; links.frustumCulled = false;
  grp.add(links);
  const spinners = [];
  const wheelG = (z, y, R, kind) => {
    const g = new THREE.Group(); g.position.set(0, y, z); grp.add(g);
    const wb = new Builder();
    if (kind === 'sprocket') {
      wb.add('wheel', G.cyl, [0, 0, 0], [0, 0, PI / 2], [R * 1.9, 0.52, R * 1.9]);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; wb.add('wheel', G.box, [0, Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98], [a, 0, 0], [0.5, 0.16, 0.12]); }
      for (const x of [-0.27, 0.27]) {
        wb.add('steel', G.cyl, [x, 0, 0], [0, 0, PI / 2], [R * 1.2, 0.05, R * 1.2]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; wb.add('steel', G.cyl, [x * 1.08, Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42], [0, 0, PI / 2], [0.06, 0.04, 0.06]); }
      }
      wb.add('crys', G.cyl, [sd * 0.3, 0, 0], [0, 0, PI / 2], [0.22, 0.03, 0.22]);
    } else if (kind === 'return') {
      wb.add('wheel', G.cyl, [0, 0, 0], [0, 0, PI / 2], [R * 2, 0.4, R * 2]);
      wb.add('steel', G.cyl, [sd * 0.2, 0, 0], [0, 0, PI / 2], [R, 0.06, R]);
    } else {
      /* (2026-10-18, Nabil: "roda lain bulat-bulat jaa") butiran dahulu diletak DI
         DALAM silinder getah dan tertutup. Kini muka luar setiap separuh roda:
         rim logam dengan bibir, 6 lubang peringan, hab berbolt dan topi hab. */
      for (const x of [-0.2, 0.2]) {
        const o = Math.sign(x);
        wb.add('rubber', G.cyl, [x, 0, 0], [0, 0, PI / 2], [R * 2, 0.24, R * 2]);
        wb.add('wheel', G.cyl, [o * 0.33, 0, 0], [0, 0, PI / 2], [R * 1.62, 0.03, R * 1.62]);         // muka rim
        wb.add('steel', G.torus, [o * 0.335, 0, 0], [0, PI / 2, 0], [R * 1.6, R * 1.6, 0.35]);         // bibir rim
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU;
          wb.add('rubber', G.cyl, [o * 0.345, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55], [0, 0, PI / 2], [R * 0.34, 0.02, R * 0.34]);   // lubang peringan
        }
        wb.add('steel', G.cyl, [o * 0.35, 0, 0], [0, 0, PI / 2], [R * 0.62, 0.05, R * 0.62]);         // hab
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; wb.add('rubber', G.cyl, [o * 0.38, Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2], [0, 0, PI / 2], [0.05, 0.03, 0.05]); }   // bolt
      }
      wb.add('steel', G.cyl, [0, 0, 0], [0, 0, PI / 2], [R * 0.55, 0.62, R * 0.55]);
      wb.add('crys', G.cyl, [sd * 0.33, 0, 0], [0, 0, PI / 2], [R * 0.32, 0.03, R * 0.32]);
    }
    const ms = wb.build(tm, g);
    for (const k in ms) if (k !== 'rubber') ms[k].castShadow = false;
    spinners.push({ g, R });
  };
  wheelG(ZB, YC, TR * 0.98, 'sprocket');
  wheelG(ZF, YC, TR * 0.86, 'road');
  const nR = P.roads || 5, rR = TR * 0.72, span = runL - 2 * TR * 0.9;
  for (let i = 0; i < nR; i++) wheelG(ZB + TR * 0.9 + (nR === 1 ? span / 2 : i * span / (nR - 1)), rR + 0.07, rR, 'road');
  const nRet = Math.max(1, Math.round(runL / 1.45));
  for (let i = 0; i < nRet; i++) wheelG(ZB + (i + 0.6) * runL / (nRet + 0.2), YC + TR - 0.16, 0.11, 'return');
  const sb2 = new Builder();
  for (let i = 0; i < nR; i++) {
    const z = ZB + TR * 0.9 + (nR === 1 ? span / 2 : i * span / (nR - 1));
    segL(sb2, 'steel', G.cyl, [-sd * 0.36, YC + 0.23, z + 0.3], [-sd * 0.36, rR + 0.07, z], 0.09);
  }
  sb2.add('wheel', G.box, [-sd * 0.36, YC + 0.25, (ZF + ZB) / 2], null, [0.12, 0.14, runL - 0.2]);
  sb2.build(tm, grp);
  const S = { links, spinners, pathAt, NL, pitch, k: P.k || 1, grp };
  return S;
}
function makeTrack(sides) {
  if (!sides.length) return null;
  const T = {
    update(spin) {
      const dw = spin / 2.2;                       // jarak dilalui (wheelSpin += fwd*dt*2.2)
      for (const S of sides) {
        const d = dw / S.k;
        for (let i = 0; i < S.NL; i++) {
          const [y, z, a] = S.pathAt(i * S.pitch + d);
          _tp4.set(0, y, z); _tq4.setFromAxisAngle(_tax, a);
          S.links.setMatrixAt(i, _tm4.compose(_tp4, _tq4, _ts4));
        }
        S.links.instanceMatrix.needsUpdate = true;
        for (const w of S.spinners) w.g.rotation.x = d / w.R;
      }
    },
  };
  T.update(0);
  return T;
}

/* =======================================================================
   KERETA
   ======================================================================= */
export function buildCar(colorHex, spec) {
  const sp = Object.assign({
    w: 1, len: 1, armor: 'mid', extra: null, accent: '#57d6ff',
    nose: 'bar', cabin: 'closed', wheels: 4, bed: false, slots: 2,
    body: 'muscle', wheelR: 0.46,
    limbs: 'w4', wings: null, sig: null,
  }, spec || {});
  const root = new THREE.Group();
  const body = mat({ color: new THREE.Color(colorHex), metalness: 0.62, roughness: 0.44, roughnessMap: carRoughness() });
  const mats = {
    body, dark: MATS.dark.clone(), steel: MATS.steel.clone(), glass: MATS.glass.clone(),
    head: MATS.head.clone(), tail: MATS.tail.clone(), darker: MATS.darker.clone(), rust: MATS.rust.clone(),
    hot: MATS.hot.clone(), army: MATS.army.clone(),
    gold: mat({ color: 0xd9a441, metalness: 1, roughness: 0.25 }),
    // kristal / panel bercahaya ikut warna aksen kereta
    crys: mat({ color: new THREE.Color(sp.accent || '#57d6ff').multiplyScalar(0.35), emissive: new THREE.Color(sp.accent || '#57d6ff'),
      emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.88 }),
    // bayang hologram / imej fasa (Phantom, Mirage) - lutsinar, tiada bayang
    ghost: new THREE.MeshBasicMaterial({ color: new THREE.Color(sp.accent || '#57d6ff'), transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false }),
  };
  const b = new Builder();

  /* ---- casis mengikut gaya badan ---- */
  const BODY = sp.body;
  // badan khas (hulls.js) mengurus kabin, muncung, lampu & belakang sendiri
  const B2 = BODY2[BODY];
  const own = !!HULLS[BODY] || !!B2;
  if (B2) {
    B2.hull(b, G, HG, mats);
  } else if (own) {
    HULLS[BODY](b, G);
  } else if (BODY === 'apc') {
    // hull perisai bersudut, tiada bonet berasingan
    b.add('body', G.rbox, [0, 0.9, -0.2], null, [2.1, 0.9, 4.2]);
    b.add('body', G.box, [0, 1.14, 1.75], [-0.55, 0, 0], [2.0, 0.22, 1.5]);
    b.add('body', G.box, [0, 0.62, 2.0], [0.5, 0, 0], [2.0, 0.2, 0.9]);
    for (const sd of [-1, 1]) b.add('body', G.box, [sd * 1.02, 1.05, -0.2], [0, 0, sd * 0.3], [0.22, 0.7, 3.6]);
    b.add('darker', G.box, [0, 0.5, -0.2], null, [2.16, 0.3, 3.7]);
  } else if (BODY === 'truck') {
    b.add('darker', G.box, [0, 0.52, -0.1], null, [1.9, 0.34, 4.3]);
    b.add('body', G.rbox, [0, 1.26, 1.05], null, [1.85, 1.35, 1.8]);   // kabin tinggi di depan
    b.add('darker', G.box, [0, 0.82, -1.2], null, [1.95, 0.2, 2.4]);   // lantai bed
    for (const sd of [-1, 1]) b.add('body', G.rbox, [sd * 0.95, 1.12, -1.2], null, [0.14, 0.62, 2.4]);
    b.add('body', G.rbox, [0, 1.12, -2.3], null, [1.9, 0.62, 0.14]);
    b.add('steel', G.cyl, [-0.72, 1.9, 0.35], null, [0.15, 1.3, 0.15]);
    b.add('steel', G.cyl, [0.72, 1.9, 0.35], null, [0.15, 1.3, 0.15]);
  } else if (BODY === 'hauler') {
    b.add('darker', G.box, [0, 0.55, -0.1], null, [2.1, 0.4, 4.6]);
    b.add('body', G.rbox, [0, 1.2, 1.35], null, [1.95, 1.2, 1.5]);
    b.add('body', G.rbox, [0, 1.32, -1.0], null, [2.1, 1.5, 2.9]);     // kontena belakang
    for (let i = -1; i <= 1; i++) b.add('steel', G.box, [0, 1.32, -1.0 + i * 1.1], null, [2.16, 1.54, 0.1]);
    b.add('steel', G.box, [0, 2.12, -1.0], null, [1.9, 0.1, 2.7]);
  } else if (BODY === 'tanker') {
    b.add('darker', G.box, [0, 0.52, -0.1], null, [1.9, 0.36, 4.3]);
    b.add('body', G.cyl, [0, 1.2, -0.45], [PI / 2, 0, 0], [1.75, 3.2, 1.75]);  // tangki silinder
    b.add('steel', G.torus, [0, 1.2, 0.5], [PI / 2, 0, 0], [1.8, 1.8, 0.16]);
    b.add('steel', G.torus, [0, 1.2, -1.4], [PI / 2, 0, 0], [1.8, 1.8, 0.16]);
    b.add('body', G.rbox, [0, 1.05, 1.6], null, [1.7, 0.85, 1.3]);
    b.add('steel', G.cyl, [0, 2.1, -0.45], null, [0.36, 0.5, 0.36]);
  } else if (BODY === 'buggy') {
    b.add('darker', G.box, [0, 0.55, -0.1], null, [1.4, 0.26, 3.6]);
    b.add('body', G.rbox, [0, 0.8, 0.2], null, [1.25, 0.42, 2.6]);
    // rangka tiub terdedah
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 0.7, 1.0, 0.9], [0.5, 0, 0], [0.09, 1.5, 0.09]);
      b.add('steel', G.cyl, [sd * 0.7, 1.1, -1.3], [-0.4, 0, 0], [0.09, 1.6, 0.09]);
      b.add('steel', G.cyl, [sd * 0.7, 1.45, -0.3], [PI / 2, 0, 0], [0.09, 2.2, 0.09]);
    }
    b.add('steel', G.cyl, [0, 1.6, -0.3], [0, 0, PI / 2], [0.09, 1.45, 0.09]);
    b.add('dark', G.rbox, [0, 1.0, -1.85], null, [1.1, 0.7, 0.9]);     // enjin terdedah
    for (const x of [-0.25, 0.25]) b.add('steel', G.cyl, [x, 1.45, -1.85], null, [0.1, 0.6, 0.1]);
  } else if (BODY === 'racer') {
    b.add('body', G.rbox, [0, 0.58, -0.2], null, [1.7, 0.36, 4.6]);    // sangat rendah
    b.add('body', G.box, [0, 0.66, 2.1], [-0.3, 0, 0], [1.3, 0.16, 1.5]);
    b.add('body', G.rbox, [0, 0.85, 0.6], null, [1.5, 0.34, 1.6]);
    for (const sd of [-1, 1]) b.add('body', G.rbox, [sd * 0.92, 0.72, -1.3], null, [0.42, 0.42, 1.8]);
    b.add('steel', G.box, [0, 1.42, -2.25], null, [2.1, 0.09, 0.55]);  // sayap belakang besar
    for (const x of [-0.75, 0.75]) b.add('steel', G.box, [x, 1.15, -2.2], null, [0.09, 0.62, 0.42]);
  } else if (BODY === 'ring') {
    // pod tengah dikelilingi gelang besar
    b.add('body', G.rbox, [0, 0.95, -0.1], null, [1.5, 0.8, 3.0]);
    b.add('steel', G.torus, [0, 0.95, -0.1], [PI / 2, 0, 0], [4.6, 4.6, 0.34]);
    for (const sd of [-1, 1]) {
      b.add('steel', G.box, [sd * 1.1, 0.95, -0.1], null, [0.9, 0.16, 0.22]);
      b.add('body', G.rbox, [sd * 1.6, 0.95, -0.1], null, [0.3, 0.5, 1.4]);
    }
    b.add('darker', G.box, [0, 0.5, -0.1], null, [1.6, 0.3, 2.8]);
    b.add('body', G.sph, [0, 1.0, 1.55], null, [1.3, 1.0, 1.2]);
  } else if (BODY === 'jet') {
    // badan rendah bersayap sapu
    b.add('body', G.rbox, [0, 0.74, -0.1], null, [1.3, 0.5, 4.4]);
    b.add('body', G.box, [0, 0.72, 2.25], [-0.34, 0, 0], [0.9, 0.16, 1.4]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.35, 0.8, -0.7], [0, sd * 0.32, sd * 0.12], [2.1, 0.14, 1.5]);
      b.add('steel', G.box, [sd * 2.15, 0.95, -1.1], [0, 0, sd * 0.2], [0.1, 0.55, 0.8]);
      b.add('body', G.rbox, [sd * 0.78, 0.9, -1.5], null, [0.42, 0.42, 1.5]);
    }
    b.add('darker', G.box, [0, 0.5, -0.1], null, [1.36, 0.3, 3.8]);
    b.add('steel', G.cyl, [0, 0.95, -2.3], [PI / 2, 0, 0], [0.42, 0.5, 0.42]);
  } else if (BODY === 'fortress') {
    // hull besar dua tingkat
    b.add('darker', G.box, [0, 0.55, 0], null, [2.5, 0.45, 5.0]);
    b.add('body', G.rbox, [0, 1.15, -0.1], null, [2.4, 1.1, 4.6]);
    b.add('body', G.rbox, [0, 2.0, -0.6], null, [1.9, 0.72, 2.8]);
    for (const sd of [-1, 1]) {
      b.add('dark', G.box, [sd * 1.28, 0.95, 0], null, [0.24, 1.1, 4.7]);
      for (let i = -2; i <= 2; i++) b.add('steel', G.cyl, [sd * 1.36, 0.95, i * 1.0], [0, 0, PI / 2], [0.16, 0.12, 0.16]);
    }
    b.add('body', G.box, [0, 1.5, 2.35], [-0.5, 0, 0], [2.3, 0.24, 1.3]);
  } else if (BODY === 'spider') {
    // pelantar rata lebar, tapak roda terkangkang
    b.add('body', G.rbox, [0, 0.82, -0.1], null, [2.5, 0.42, 3.4]);
    b.add('darker', G.box, [0, 0.58, -0.1], null, [2.3, 0.26, 3.0]);
    b.add('body', G.rbox, [0, 1.14, -0.2], null, [1.4, 0.44, 1.8]);
    for (const sd of [-1, 1]) for (const z2 of [1.2, -1.2]) {
      b.add('steel', G.cyl, [sd * 1.2, 0.72, z2], [0, 0, sd * 1.15], [0.16, 1.0, 0.16]);
    }
    b.add('steel', G.box, [0, 1.0, 1.85], null, [2.0, 0.12, 0.5]);
  } else if (BODY === 'pod') {
    b.add('body', G.cyl, [0, 0.92, -0.1], [PI / 2, 0, 0], [1.9, 3.9, 1.5]);
    b.add('body', G.sph, [0, 0.92, 1.85], null, [1.85, 1.45, 1.3]);
    b.add('body', G.sph, [0, 0.92, -2.05], null, [1.85, 1.45, 1.1]);
    b.add('darker', G.box, [0, 0.48, -0.1], null, [1.98, 0.3, 3.4]);
    for (const sd of [-1, 1]) b.add('steel', G.box, [sd * 0.98, 0.92, -0.1], null, [0.08, 0.5, 3.2]);
  } else {
    // muscle (asal)
    b.add('body', G.rbox, [0, 0.72, -0.1], null, [1.95, 0.56, 4.0]);
    b.add('darker', G.box, [0, 0.46, -0.1], null, [2.02, 0.3, 3.5]);
    if (sp.nose === 'wedge') {
      b.add('body', G.box, [0, 0.95, 1.5], [-0.22, 0, 0], [1.78, 0.2, 1.9]);
      b.add('body', G.rbox, [0, 0.78, 2.05], null, [1.6, 0.36, 0.5]);
    } else {
      b.add('body', G.rbox, [0, 1.00, 1.15], null, [1.72, 0.26, 1.45]);
    }
  }

  /* ---- kabin (gaya tertentu ada kabin sendiri) ---- */
  const noCabin = BODY === 'apc' || BODY === 'truck' || BODY === 'hauler' || BODY === 'tanker';
  if (own) {
    // tiada kabin generik
  } else if (noCabin) {
    const cz = BODY === 'tanker' ? 1.6 : BODY === 'apc' ? -0.3 : 1.05;
    b.add('glass', G.box, [0, BODY === 'apc' ? 1.3 : 1.45, cz + 0.72], [-0.25, 0, 0], [1.25, 0.34, 0.06]);
    for (const sd of [-1, 1]) b.add('glass', G.box, [sd * 0.86, BODY === 'apc' ? 1.25 : 1.4, cz], [0, PI / 2, 0], [0.8, 0.26, 0.06]);
  } else if (sp.cabin === 'dome') {
    b.add('dark', G.rbox, [0, 1.16, -0.42], null, [1.5, 0.5, 1.7]);
    b.add('glass', G.sph, [0, 1.42, -0.3], null, [1.34, 1.0, 1.55]);
    b.add('steel', G.torus, [0, 1.42, -0.3], [0, 0, 0], [1.4, 1.4, 0.16]);
  } else if (sp.cabin === 'cage') {
    b.add('dark', G.rbox, [0, 1.02, -0.42], null, [1.5, 0.28, 1.7]);
    for (const x of [-0.72, 0.72]) {
      b.add('steel', G.cyl, [x, 1.36, 0.36], [0.25, 0, 0], [0.09, 1.0, 0.09]);
      b.add('steel', G.cyl, [x, 1.36, -1.16], [-0.25, 0, 0], [0.09, 1.0, 0.09]);
      b.add('steel', G.cyl, [x, 1.82, -0.4], [PI / 2, 0, 0], [0.09, 1.6, 0.09]);
    }
    b.add('steel', G.cyl, [0, 1.82, 0.32], [0, 0, PI / 2], [0.09, 1.5, 0.09]);
    b.add('steel', G.cyl, [0, 1.82, -1.12], [0, 0, PI / 2], [0.09, 1.5, 0.09]);
    b.add('glass', G.box, [0, 1.34, 0.44], [-0.4, 0, 0], [1.3, 0.5, 0.05]);
  } else {
    b.add('dark', G.rbox, [0, 1.24, -0.42], null, [1.56, 0.66, 1.62]);
    b.add('glass', G.box, [0, 1.30, 0.44], [-0.40, 0, 0], [1.40, 0.56, 0.05]);
    b.add('glass', G.box, [0, 1.30, -1.28], [0.42, 0, 0], [1.34, 0.5, 0.05]);
    b.add('glass', G.box, [0.79, 1.28, -0.42], [0, PI / 2, 0], [1.2, 0.44, 0.05]);
    b.add('glass', G.box, [-0.79, 1.28, -0.42], [0, PI / 2, 0], [1.2, 0.44, 0.05]);
    b.add('dark', G.rbox, [0, 1.60, -0.42], null, [1.5, 0.12, 1.55]);
    for (let i = -1; i <= 1; i++) b.add('steel', G.box, [i * 0.42, 1.30, 0.47], [-0.40, 0, 0], [0.05, 0.58, 0.05]);
  }

  /* ---- muncung hadapan ---- */
  if (own) {
    // badan khas: tiada muncung generik
  } else if (sp.nose === 'plow') {
    b.add('steel', G.box, [0, 0.95, 2.22], [-0.42, 0, 0], [2.3, 1.5, 0.16]);
    b.add('steel', G.box, [0, 0.42, 2.44], null, [2.3, 0.25, 0.5]);
    for (const x of [-0.8, 0, 0.8]) b.add('steel', G.box, [x, 1.0, 1.85], null, [0.14, 0.6, 0.9]);
  } else if (sp.nose === 'blade') {
    b.add('steel', G.cyl, [0, 0.8, 2.16], [0, 0, PI / 2], [0.14, 2.1, 0.14]);
    for (const x of [-0.85, -0.42, 0, 0.42, 0.85]) b.add('steel', G.cone, [x, 0.8, 2.44], [PI / 2, 0, 0], [0.17, 0.66, 0.17]);
    for (const x of [-0.7, 0.7]) b.add('steel', G.cyl, [x, 0.8, 1.6], [0.9, 0, 0], [0.1, 1.3, 0.1]);
  } else if (sp.nose === 'wedge') {
    b.add('steel', G.box, [0, 0.62, 2.28], [-0.3, 0, 0], [1.9, 0.5, 0.14]);
    for (const x of [-0.62, 0.62]) b.add('steel', G.cyl, [x, 0.72, 1.95], [0.4, 0, 0], [0.07, 0.9, 0.07]);
  } else {
    b.add('steel', G.cyl, [0, 0.78, 2.16], [0, 0, PI / 2], [0.15, 2.0, 0.15]);
    b.add('steel', G.cyl, [0, 1.12, 2.10], [0, 0, PI / 2], [0.11, 1.7, 0.11]);
    for (const x of [-0.78, -0.28, 0.28, 0.78]) b.add('steel', G.box, [x, 0.92, 2.13], null, [0.1, 0.86, 0.1]);
    for (const x of [-0.7, 0.7]) b.add('steel', G.cyl, [x, 0.8, 1.6], [0.9, 0, 0], [0.09, 1.3, 0.09]);
    for (const x of [-0.53, 0, 0.53]) b.add('steel', G.cone, [x, 0.78, 2.33], [PI / 2, 0, 0], [0.13, 0.42, 0.13]);
  }

  /* ---- perisai sisi ---- */
  if (!own) for (const sd of [-1, 1]) {
    b.add('dark', G.rbox, [sd * 1.0, 0.78, -0.1], null, [0.14, 0.46, 2.9]);
    for (let i = -1; i <= 1; i++) b.add('steel', G.cyl, [sd * 1.08, 0.78, i * 0.95], [0, 0, PI / 2], [0.07, 0.06, 0.07]);
    b.add('dark', G.rbox, [sd * 1.0, 0.96, 1.3], null, [0.4, 0.2, 1.1]);
    b.add('dark', G.rbox, [sd * 1.0, 0.96, -1.35], null, [0.4, 0.2, 1.1]);
  }
  if (own) {
    // -
  } else if (sp.armor === 'heavy') {
    for (const sd of [-1, 1]) {
      b.add('dark', G.rbox, [sd * 1.06, 1.12, 0.2], null, [0.2, 0.44, 2.2]);
      b.add('steel', G.box, [sd * 1.1, 0.5, 1.5], null, [0.16, 0.5, 1.0]);
    }
  } else if (sp.armor === 'light') {
    b.add('steel', G.box, [0, 1.42, 0.7], null, [1.2, 0.05, 1.0]);
  }

  /* ---- belakang: bed terbuka atau bumbung + spoiler ---- */
  if (own) {
    // -
  } else if (sp.bed) {
    b.add('darker', G.box, [0, 0.98, -1.5], null, [1.8, 0.1, 1.9]);
    for (const sd of [-1, 1]) b.add('body', G.rbox, [sd * 0.88, 1.2, -1.5], null, [0.12, 0.55, 1.9]);
    b.add('body', G.rbox, [0, 1.2, -2.4], null, [1.8, 0.55, 0.12]);
  } else {
    b.add('steel', G.box, [0, 1.36, -2.0], null, [1.7, 0.08, 0.36]);
    for (const x of [-0.6, 0.6]) b.add('steel', G.box, [x, 1.2, -1.98], null, [0.08, 0.34, 0.2]);
    b.add('rust', G.rbox, [0.55, 1.12, -1.75], null, [0.36, 0.5, 0.24]);
    b.add('rust', G.rbox, [-0.55, 1.12, -1.75], null, [0.36, 0.5, 0.24]);
  }

  /* ---- lampu, ekzos ---- */
  if (!own) for (const x of [-0.62, 0.62]) {
    b.add('steel', G.cyl, [x, 0.92, 2.0], [PI / 2, 0, 0], [0.26, 0.12, 0.26]);
    b.add('head', G.cyl, [x, 0.92, 2.06], [PI / 2, 0, 0], [0.21, 0.06, 0.21]);
  }
  if (!own) {
    b.add('tail', G.box, [0.62, 1.0, -2.08], null, [0.5, 0.13, 0.06]);
    b.add('tail', G.box, [-0.62, 1.0, -2.08], null, [0.5, 0.13, 0.06]);
    for (const x of [-0.42, 0.42]) b.add('steel', G.cyl, [x, 0.52, -2.18], [PI / 2, 0, 0], [0.11, 0.55, 0.11]);
  }

  /* ---- sayap ---- */
  if (sp.wings === 'delta') {
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.75, 0.92, -0.9], [0, sd * 0.38, sd * 0.1], [2.6, 0.12, 2.2]);
      b.add('steel', G.box, [sd * 2.75, 1.1, -1.5], [0, 0, sd * 0.18], [0.1, 0.6, 0.9]);
    }
  } else if (sp.wings === 'swept') {
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.6, 1.05, -0.4], [0, sd * 0.5, sd * 0.16], [2.2, 0.1, 0.9]);
      b.add('steel', G.cyl, [sd * 2.4, 1.05, -0.95], [PI / 2, 0, 0], [0.16, 1.0, 0.16]);
    }
  } else if (sp.wings === 'fins') {
    for (const sd of [-1, 1]) b.add('body', G.box, [sd * 0.8, 1.75, -1.9], [0, 0, sd * 0.24], [0.11, 1.5, 1.0]);
    b.add('steel', G.box, [0, 2.35, -1.9], null, [1.7, 0.1, 0.6]);
  } else if (sp.wings === 'boom') {
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 1.15, 1.15, -1.8], [PI / 2, 0, 0], [0.22, 2.6, 0.22]);
      b.add('body', G.box, [sd * 1.15, 1.75, -2.9], null, [0.14, 1.1, 0.7]);
    }
    b.add('body', G.box, [0, 2.25, -2.9], null, [2.5, 0.1, 0.6]);
  } else if (sp.wings === 'canard') {
    for (const sd of [-1, 1]) b.add('body', G.box, [sd * 1.3, 0.95, 1.5], [0, sd * -0.3, sd * 0.12], [1.4, 0.1, 0.7]);
    b.add('body', G.box, [0, 1.85, -2.0], null, [0.12, 1.2, 0.9]);
  }

  /* ---- ciri tandatangan ---- */
  const SIG = sp.sig;
  if (SIG === 'spikes') {
    for (const sd of [-1, 1]) for (let i = -2; i <= 2; i++)
      b.add('steel', G.cone, [sd * 1.12, 0.85, i * 0.85], [0, 0, sd * PI / 2], [0.16, 0.6, 0.16]);
  } else if (SIG === 'stacks') {
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 0.78, 1.9, -0.4], null, [0.22, 2.1, 0.22]);
      b.add('dark', G.cyl, [sd * 0.78, 2.95, -0.4], null, [0.3, 0.2, 0.3]);
    }
  } else if (SIG === 'antenna') {
    b.add('steel', G.cyl, [0.55, 2.1, -1.5], null, [0.06, 2.4, 0.06]);
    b.add('steel', G.cyl, [-0.4, 1.8, -1.5], null, [0.05, 1.8, 0.05]);
    for (let i = 0; i < 4; i++) b.add('steel', G.box, [0.55, 2.4 + i * 0.3, -1.5], null, [0.5 - i * 0.08, 0.04, 0.04]);
  } else if (SIG === 'rails') {
    for (const sd of [-1, 1]) {
      b.add('steel', G.box, [sd * 1.18, 1.25, -0.3], null, [0.1, 0.1, 2.4]);
      for (let i = -1; i <= 1; i++) b.add('army', G.cyl, [sd * 1.18, 1.05, i * 0.8], [PI / 2, 0, 0], [0.17, 0.7, 0.17]);
    }
  } else if (SIG === 'cargo') {
    b.add('rust', G.rbox, [0.5, 1.55, -1.2], null, [0.8, 0.7, 1.1]);
    b.add('rust', G.rbox, [-0.5, 1.5, -1.5], null, [0.7, 0.6, 0.9]);
    for (let i = -1; i <= 1; i++) b.add('steel', G.box, [0, 1.58, -1.2 + i * 0.5], null, [1.9, 0.06, 0.08]);
  } else if (SIG === 'drill') {
    b.add('steel', G.cone, [0, 0.85, 2.6], [PI / 2, 0, 0], [0.7, 1.5, 0.7]);
    b.add('dark', G.cyl, [0, 0.85, 1.9], [PI / 2, 0, 0], [0.5, 0.5, 0.5]);
  } else if (SIG === 'sail') {
    b.add('body', G.box, [0, 2.1, -0.9], [0.18, 0, 0], [0.12, 2.3, 1.9]);
    b.add('steel', G.cyl, [0, 1.9, -0.9], null, [0.09, 2.0, 0.09]);
  } else if (SIG === 'claw') {
    for (const sd of [-1, 1]) {
      b.add('steel', G.box, [sd * 0.62, 0.8, 2.3], [0, sd * 0.35, 0], [0.16, 0.3, 1.2]);
      b.add('steel', G.cone, [sd * 0.95, 0.8, 2.9], [PI / 2, 0, sd * 0.5], [0.18, 0.7, 0.18]);
    }
  } else if (SIG === 'orb') {
    b.add('steel', G.cyl, [0, 1.9, -0.6], null, [0.1, 1.6, 0.1]);
    b.add('steel', G.torus, [0, 2.7, -0.6], [0, 0, 0], [0.9, 0.9, 0.16]);
    b.add('steel', G.torus, [0, 2.7, -0.6], [PI / 2, 0, 0], [0.9, 0.9, 0.16]);
  } else if (SIG === 'blades') {
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++)
      b.add('steel', G.box, [sd * 1.25, 0.9, -1.0 + i * 1.0], [0, sd * 0.4, 0], [0.9, 0.5, 0.06]);
  } else if (SIG === 'hood') {
    b.add('steel', G.box, [0, 1.5, 1.2], [-0.5, 0, 0], [1.7, 0.1, 1.2]);
    for (const sd of [-1, 1]) b.add('steel', G.cyl, [sd * 0.8, 1.2, 1.3], [0.5, 0, 0], [0.07, 1.0, 0.07]);
  }

  const meshes = b.build(mats, root);
  for (const k in meshes) meshes[k].scale.set(sp.w, 1, sp.len);
  if (meshes.ghost) { meshes.ghost.castShadow = meshes.ghost.receiveShadow = false; meshes.ghost.renderOrder = 4; }

  /* ---- bahagian khas ---- */
  const acc = new THREE.Color(sp.accent || '#57d6ff');
  const eb = new Builder();
  const emats = {
    glow: mat({ color: 0x0a0a12, emissive: acc, emissiveIntensity: 2.8, roughness: 0.35 }),
    steel: MATS.steel.clone(), dark: MATS.dark.clone(),
  };
  const ex = sp.extra;
  if (ex === 'core') {
    eb.add('dark', G.cyl, [0, 1.72, -1.3 * sp.len], null, [0.66, 0.42, 0.66]);
    eb.add('glow', G.sph, [0, 1.92, -1.3 * sp.len], null, [0.44, 0.44, 0.44]);
    eb.add('steel', G.torus, [0, 1.92, -1.3 * sp.len], [PI / 2, 0, 0], [0.8, 0.8, 0.35]);
  }
  if ((ex === 'rotor' || ex === 'rotorcannon') && sp.limbs !== 'hover') {   // kereta hover: pod terapung sendiri ialah rotornya
    for (const sd of [-1, 1]) for (const z2 of [1.1, -1.1]) {
      eb.add('dark', G.cyl, [sd * 1.35 * sp.w, 0.95, z2 * sp.len], null, [0.66, 0.5, 0.66]);
      eb.add('glow', G.torus, [sd * 1.35 * sp.w, 0.78, z2 * sp.len], [PI / 2, 0, 0], [1.0, 1.0, 0.3]);
    }
  }
  if (ex === 'rotorcannon') {
    eb.add('dark', G.rbox, [0, 1.95, -0.2 * sp.len], null, [0.5, 0.36, 1.1]);
    eb.add('steel', G.cyl, [0, 1.95, 0.75 * sp.len], [PI / 2, 0, 0], [0.14, 1.4, 0.14]);
    eb.add('glow', G.box, [0, 2.14, -0.2 * sp.len], null, [0.22, 0.06, 0.7]);
  }
  if (ex === 'rack') {
    for (let i = 0; i < 3; i++) {
      eb.add('dark', G.cyl, [-0.45, 1.05, (-1.5 - i * 0.3) * sp.len], [PI / 2, 0, 0], [0.3, 0.34, 0.3]);
      eb.add('dark', G.cyl, [0.45, 1.05, (-1.5 - i * 0.3) * sp.len], [PI / 2, 0, 0], [0.3, 0.34, 0.3]);
    }
    eb.add('glow', G.box, [0, 1.3, -1.7 * sp.len], null, [1.1, 0.06, 0.3]);
  }
  if (ex === 'coil') {
    eb.add('steel', G.cyl, [0, 1.5, -1.5 * sp.len], null, [0.16, 1.0, 0.16]);
    for (let i = 0; i < 4; i++) eb.add('glow', G.torus, [0, 1.25 + i * 0.22, -1.5 * sp.len], [PI / 2, 0, 0], [0.5, 0.5, 0.3]);
    eb.add('glow', G.sph, [0, 2.05, -1.5 * sp.len], null, [0.26, 0.26, 0.26]);
  }
  if (ex === 'siphon') {
    for (const sd of [-1, 1]) {
      eb.add('steel', G.cyl, [sd * 0.95 * sp.w, 1.35, -0.9 * sp.len], [0.4, 0, sd * 0.3], [0.2, 1.3, 0.2]);
      eb.add('glow', G.sph, [sd * 1.15 * sp.w, 1.85, -1.2 * sp.len], null, [0.3, 0.3, 0.3]);
    }
    eb.add('glow', G.torus, [0, 0.35, 0], [PI / 2, 0, 0], [3.0, 3.0, 0.18]);
  }
  if (ex === 'dish') {
    eb.add('dark', G.cyl, [0, 1.72, -1.2 * sp.len], null, [0.5, 0.36, 0.5]);
    eb.add('steel', G.cyl, [0, 2.0, -1.2 * sp.len], [0.5, 0, 0], [0.12, 0.7, 0.12]);
    eb.add('glow', G.cyl, [0, 2.3, -1.05 * sp.len], [1.1, 0, 0], [1.5, 0.1, 1.5]);
    eb.add('steel', G.torus, [0, 2.3, -1.05 * sp.len], [1.1, 0, 0], [1.55, 1.55, 0.14]);
  }
  if (ex === 'horn') {
    for (const sd of [-1, 1]) {
      eb.add('steel', G.cone, [sd * 0.7 * sp.w, 1.35, 1.5 * sp.len], [-PI / 2, 0, 0], [0.62, 1.2, 0.62]);
      eb.add('glow', G.sph, [sd * 0.7 * sp.w, 1.35, 1.1 * sp.len], null, [0.22, 0.22, 0.22]);
    }
    eb.add('dark', G.rbox, [0, 1.35, 1.0 * sp.len], null, [1.5, 0.3, 0.5]);
  }
  if (ex) eb.build(emats, root);
  mats.accent = emats.glow;

  /* meriam automatik yang boleh berputar (kereta Sentinel) */
  let autoTurret = null, autoMuzzle = null;
  if (ex === 'autocannon') {
    autoTurret = new THREE.Group();
    autoTurret.position.set(0, 1.35, -1.35 * sp.len);
    const ab = new Builder();
    ab.add('dark', G.cyl, [0, 0, 0], null, [1.0, 0.35, 1.0]);
    ab.add('dark', G.rbox, [0, 0.36, 0.1], null, [0.7, 0.42, 0.9]);
    ab.add('steel', G.cyl, [-0.16, 0.36, 0.85], [PI / 2, 0, 0], [0.1, 1.3, 0.1]);
    ab.add('steel', G.cyl, [0.16, 0.36, 0.85], [PI / 2, 0, 0], [0.1, 1.3, 0.1]);
    ab.add('glow', G.box, [0, 0.62, -0.1], null, [0.34, 0.08, 0.5]);
    ab.build(emats, autoTurret);
    autoMuzzle = new THREE.Object3D();
    autoMuzzle.position.set(0, 0.36, 1.5);
    autoTurret.add(autoMuzzle);
    root.add(autoTurret);
  }

  /* ---- anggota gerak: roda, kaki, trek atau hover ---- */
  const LIMB = sp.limbs || 'w4';
  const wheels = [], legs = [], rollers = [], hovers = [], hoverParts = [];
  const wr = (sp.wheelR || 0.46) / 0.46;

  /* rantai kereta kebal: satu "sisi" lengkap dibina oleh trackSide() (aras
     modul) - juga dipakai oleh badan khas (kaki Hibachi) melalui ctx.trackSide. */
  const trackSides = [];
  let track = null;
  if (LIMB === 'tracks') {
    for (const sd of [-1, 1]) trackSides.push(trackSide(root, { sd, x: sd * 1.22 * sp.w, crys: mats.crys }));
  } else if (LIMB === 'hover') {
    const hm = { dark: MATS.darker.clone(), glow: mat({ color: 0x08121a, emissive: new THREE.Color(sp.accent || '#57d6ff'), emissiveIntensity: 2.6, roughness: 0.35 }) };
    const HSTYLE = { seraph: 'mag', ring: 'duct', jet: 'ion', glider: 'jet', dragonfly: 'arc', limo: 'royal', cyclone: 'cyclone' };
    const style = sp.hover || HSTYLE[BODY] || 'duct';
    const PM = { body: mats.body, dark: mats.dark, darker: mats.darker, steel: mats.steel, gold: mats.gold, glow: hm.glow };
    for (const [hx, hz] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) {
      const pod = hoverPod(style, sp.accent, PM);
      const grp = pod.g;
      grp.position.set(hx * 1.05 * sp.w, 0.5, hz * sp.len);
      if (style === 'jet' || style === 'arc') grp.rotation.z = hx * 0.12;          // nasel condong keluar sedikit
      root.add(grp);
      hovers.push(grp);
      hoverParts.push(pod);
    }
    const skirt = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 6, 40), hm.glow);
    skirt.rotation.x = PI / 2;
    skirt.position.y = 0.3;
    skirt.scale.set(sp.w, sp.len, 1);
    root.add(skirt);
    hovers.push(skirt);
  } else if (LIMB === 'gyro') {
    /* Hyna: TIADA roda. Bola cangkerang heksagon lutsinar yang bergolek
       (dimasukkan ke senarai `wheels` supaya berputar mengikut pergerakan),
       manakala gelang khatulistiwa & teras kekal rata di dalam badan. */
    const R = 1.45;
    const shellMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sp.accent || '#b46bff').multiplyScalar(0.25), emissive: new THREE.Color(sp.accent || '#b46bff'),
      emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.32, depthWrite: false,
    });
    const latMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(sp.accent || '#b46bff'), wireframe: true, transparent: true, opacity: 0.9 });
    const holder = new THREE.Group();
    holder.position.set(0, R, 0);
    const spin = new THREE.Group();
    spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), shellMat));
    spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.01, 1), latMat));
    // jalur tapak getah mengelilingi bola - nampak bergolek dengan jelas
    for (let i = 0; i < 3; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, 0.07, 6, 40), MATS.rubber);
      t.rotation.y = PI / 2; t.rotation.x = i * PI / 3;
      spin.add(t);
    }
    holder.add(spin);
    root.add(holder);
    wheels.push({ holder, spin, front: false });
  } else if (LIMB === 'orbs') {
    /* Gyhna: lima bola tenaga bergolek (warna aksen kereta - hijau pautan) -
       empat di penjuru + satu bola pemacu besar di tengah bawah perut. Setiap
       bola = cangkerang heksagon lutsinar + kekisi bercahaya + teras. */
    const col = new THREE.Color(sp.accent || '#5dffb0');
    const shellMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.25), emissive: col,
      emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.4, depthWrite: false });
    const latMat = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.95 });
    const coreMat = new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color('#ffffff'), 0.6) });
    /* (2026-10-18, Nabil) bola tengah dibuang - tinggal EMPAT bola penjuru, setiap
       satu dipegang GARPU: plat dalam & luar, gandar menembusi bola, jambatan di
       atas bola yang bersambung ke badan, dan omboh penyerap hentak. */
    const ORBS = [[-1.3, 0.85, 1.4, 0.85], [1.3, 0.85, 1.4, 0.85], [-1.3, 0.85, -1.4, 0.85], [1.3, 0.85, -1.4, 0.85]];
    const fk = new Builder();
    for (const [x0, y, z0, R] of ORBS) {
      const x = x0 * sp.w, z = z0 * sp.len, sd = Math.sign(x);
      const xi = x - sd * (R + 0.12), xo = x + sd * (R + 0.12);
      for (const px of [xi, xo]) fk.add('dark', G.rbox, [px, (y + 1.95) / 2, z], null, [0.14, 1.95 - y + 0.25, 0.5]);   // plat garpu
      fk.add('steel', G.cyl, [x, y, z], [0, 0, PI / 2], [0.22, Math.abs(xo - xi) + 0.12, 0.22]);                         // gandar
      for (const px of [xi, xo]) fk.add('crys', G.cyl, [px + sd * 0.08 * (px === xo ? 1 : -1), y, z], [0, 0, PI / 2], [0.32, 0.04, 0.32]);
      fk.add('dark', G.box, [x, 1.95, z], null, [Math.abs(xo - xi) + 0.14, 0.18, 0.55]);                                 // jambatan atas bola
      fk.add('steel', G.cyl, [x - sd * 0.05, 1.75, z + (z > 0 ? -0.42 : 0.42)], [z > 0 ? 0.5 : -0.5, 0, 0], [0.12, 0.6, 0.12]);   // omboh
    }
    fk.build({ dark: MATS.dark.clone(), steel: MATS.steel.clone(), crys: mats.crys }, root);
    for (const [x, y, z, R] of ORBS) {
      const holder = new THREE.Group();
      holder.position.set(x * sp.w, y, z * sp.len);
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), shellMat));
      spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.01, 1), latMat));
      spin.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.38, 12, 8), coreMat));
      const band = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 6, 32), MATS.rubber);
      band.rotation.y = PI / 2;
      spin.add(band);
      holder.add(spin);
      root.add(holder);
      wheels.push({ holder, spin, front: false });
    }
  } else if (LIMB === 'mech4') {
    /* Gyhna: kubu berjalan atas empat kaki mekanikal tebal (paha, lutut,
       betis, tapak kaki besar bercahaya). Animasi langkah dikongsi dengan
       kaki serangga (hip.rotation.x / knee.rotation.x dalam updatePlayer). */
    const lm = { dark: MATS.dark.clone(), steel: MATS.steel.clone(), army: mats.army, crys: mats.crys };
    let idx = 0;
    for (const zf of [1, -1]) {
      for (const sd of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(sd * 1.28 * sp.w, 2.05, zf * 1.35 * sp.len);
        hip.rotation.z = sd * 0.34;
        const tb3 = new Builder();
        tb3.add('steel', G.sph, [0, 0, 0], null, [0.62, 0.62, 0.62]);
        tb3.add('army', G.rbox, [0, -0.58, 0], null, [0.46, 1.12, 0.5]);
        tb3.add('crys', G.box, [sd * 0.24, -0.55, 0], null, [0.04, 0.7, 0.2]);
        tb3.build(lm, hip);
        const knee = new THREE.Group();
        knee.position.y = -1.12;
        knee.rotation.z = -sd * 0.5;
        const kb = new Builder();
        kb.add('steel', G.sph, [0, 0, 0], null, [0.44, 0.44, 0.44]);
        kb.add('dark', G.rbox, [0, -0.5, 0], null, [0.36, 1.0, 0.38]);
        kb.add('steel', G.cyl, [0, -1.0, 0.05], null, [0.86, 0.2, 0.96]);     // tapak kaki
        kb.add('crys', G.torus, [0, -0.95, 0.05], [PI / 2, 0, 0], [0.46, 0.46, 0.4]);
        kb.build(lm, knee);
        hip.add(knee);
        root.add(hip);
        legs.push({ hip, knee, phase: idx * PI / 2 + (zf > 0 ? 0 : PI), side: sd });
        idx++;
      }
    }
  } else if (LIMB === 'legs6' || LIMB === 'legs8' || LIMB === 'hybrid') {
    const nPer = LIMB === 'legs8' ? 4 : LIMB === 'hybrid' ? 2 : 3;
    const lm = { dark: MATS.dark.clone(), steel: MATS.steel.clone(), crys: mats.crys };
    let idx = 0;
    for (const sd of [-1, 1]) {
      for (let i = 0; i < nPer; i++) {
        const z = (nPer === 1 ? 0 : (i / (nPer - 1) - 0.5) * (LIMB === 'hybrid' ? 1.8 : 3.0)) * sp.len;
        /* Kaki labah-labah BERSAMBUNG (Nabil: "floating leg"): pinggul di sisi
           badan -> lutut tinggi ke luar -> hujung kaki tepat di tanah. Ruas
           dilukis antara sendi dengan segL, jadi tiada celah. */
        const hip = new THREE.Group();
        hip.position.set(sd * 1.08 * sp.w, 1.0, z);
        const K = [sd * 1.05, 0.72, 0], F = [sd * 0.75, -1.68, 0];
        const tb3 = new Builder();
        tb3.add('steel', G.sph, [0, 0, 0], null, [0.36, 0.36, 0.36]);
        segL(tb3, 'dark', G.cyl, [0, 0, 0], K, 0.2);
        tb3.add('dark', G.rbox, [K[0] * 0.5, K[1] * 0.5 + 0.1, 0], [0, 0, -sd * 0.6], [0.16, 0.5, 0.26]);   // pelindung paha
        tb3.build(lm, hip);
        const knee = new THREE.Group();
        knee.position.set(...K);
        const kb = new Builder();
        kb.add('steel', G.sph, [0, 0, 0], null, [0.3, 0.3, 0.3]);
        kb.add('crys', G.sph, [0, 0.12, 0], null, [0.14, 0.14, 0.14]);        // sendi bercahaya ikut aksen
        segL(kb, 'dark', G.cyl, [0, 0, 0], F, 0.15);
        kb.add('steel', G.cone, [F[0], F[1] + 0.12, F[2]], [PI, 0, 0], [0.2, 0.28, 0.2]);   // hujung kaki tajam
        kb.build(lm, knee);
        hip.add(knee);
        root.add(hip);
        legs.push({ hip, knee, phase: (idx % 2) * PI + (i / nPer) * PI, side: sd });
        idx++;
      }
    }
  }

  if (LIMB === 'w4' || LIMB === 'w6' || LIMB === 'w8' || LIMB === 'hybrid' || LIMB === 'wmid') {
    const wheelTpl = tyreTemplate(mats.crys);
    wheelTpl.scale.setScalar(wr);
    const wp = LIMB === 'w8'
      ? [[0.98, 1.85, 1], [-0.98, 1.85, 1], [0.98, 0.62, 0], [-0.98, 0.62, 0], [0.98, -0.62, 0], [-0.98, -0.62, 0], [0.98, -1.85, 0], [-0.98, -1.85, 0]]
      : LIMB === 'w6'
        ? [[0.95, 1.5, 1], [-0.95, 1.5, 1], [0.95, -0.55, 0], [-0.95, -0.55, 0], [0.95, -1.75, 0], [-0.95, -1.75, 0]]
        : LIMB === 'hybrid'
          ? [[0.95, 1.55, 1], [-0.95, 1.55, 1]]
          : LIMB === 'wmid'      // Hamvog: empat roda rapat di tengah casis panjang
            ? [[1.08, 0.62, 1], [-1.08, 0.62, 1], [1.08, -0.62, 0], [-1.08, -0.62, 0]]
            : [[0.95, 1.36, 1], [-0.95, 1.36, 1], [0.95, -1.42, 0], [-0.95, -1.42, 0]];
    for (const [x, z, front] of wp) {
      const holder = new THREE.Group();
      holder.position.set(x * sp.w, 0.46 * wr, z * sp.len);
      const spin = wheelTpl.clone(true);
      holder.add(spin);
      root.add(holder);
      wheels.push({ holder, spin, front: !!front });
    }
  }

  /* ---- titik pasang senjata: satu bagi setiap slot kereta ---- */
  const HARDPOINTS = {
    1: [[0, 1.80, -0.42]],
    2: [[-0.66, 1.78, -0.40], [0.66, 1.78, -0.40]],
    3: [[-0.74, 1.74, -0.62], [0.74, 1.74, -0.62], [0, 1.96, 0.30]],
    4: [[-0.72, 1.78, -0.80], [0.72, 1.78, -0.80], [-1.00, 1.18, 1.02], [1.00, 1.18, 1.02]],
    5: [[-0.72, 1.78, -0.70], [0.72, 1.78, -0.70], [-1.02, 1.18, 1.05], [1.02, 1.18, 1.05], [0, 2.02, -1.75]],
    6: [[-0.70, 1.80, -0.55], [0.70, 1.80, -0.55], [-1.02, 1.18, 1.15], [1.02, 1.18, 1.15],
        [-1.04, 1.22, -1.70], [1.04, 1.22, -1.70]],
  };
  const nSlot = clamp(sp.slots | 0, 1, 6);
  const mountScale = [1, 1.0, 0.86, 0.78, 0.7, 0.64, 0.6][nSlot];
  const turrets = [];
  const rb = new Builder();

  /* Hamvog: dua lengan senjata pada engsel sisi. deploy = 1 -> terbuka ke sisi
     (pengepungan), 0 -> terlipat ke belakang seperti palang. Sudut +PI/2 memutar
     lengan +X ke -Z (belakang), jadi tanda ikut sisi. Slot 0 di menara tengah,
     slot 1-4 pada lengan (dua setiap sisi). */
  let setDeploy = null;
  if (BODY === 'hamvog') {
    const arms = [];
    const hb = new Builder();
    hb.add('dark', G.cyl, [0, 1.62, 0.35], null, [0.9 * mountScale, 0.16, 0.9 * mountScale]);
    hb.add('steel', G.torus, [0, 1.68, 0.35], [PI / 2, 0, 0], [0.9 * mountScale, 0.9 * mountScale, 0.42]);
    hb.build({ dark: mats.dark, steel: mats.steel }, root);
    const t0 = new THREE.Group();
    t0.position.set(0, 1.72, 0.35);
    root.add(t0); turrets.push(t0);
    for (const sd of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sd * 0.95 * sp.w, 1.08, -0.2 * sp.len);
      const ab = new Builder();
      ab.add('body', G.rbox, [sd * 1.4, 0, 0], null, [2.8, 0.32, 0.64]);
      ab.add('dark', G.box, [sd * 1.4, -0.2, 0], null, [2.6, 0.12, 0.5]);
      ab.add('crys', G.box, [sd * 1.4, 0.04, 0.33], null, [2.3, 0.06, 0.04]);
      ab.add('crys', G.box, [sd * 1.4, 0.04, -0.33], null, [2.3, 0.06, 0.04]);
      // kaki penstabil di hujung lengan - mencecah tanah bila dibuka
      ab.add('dark', G.cyl, [sd * 2.62, -0.5, 0], null, [0.18, 0.9, 0.18]);
      ab.add('steel', G.cyl, [sd * 2.62, -0.98, 0], null, [0.62, 0.1, 0.62]);
      for (const k of [1.0, 2.05]) {
        ab.add('dark', G.cyl, [sd * k, 0.2, 0], null, [0.8 * mountScale, 0.12, 0.8 * mountScale]);
        ab.add('steel', G.torus, [sd * k, 0.25, 0], [PI / 2, 0, 0], [0.8 * mountScale, 0.8 * mountScale, 0.42]);
      }
      ab.build(mats, pivot);
      for (const k of [1.0, 2.05]) {
        const tg = new THREE.Group();
        tg.position.set(sd * k, 0.3, 0);
        pivot.add(tg); turrets.push(tg);
      }
      root.add(pivot);
      arms.push({ pivot, sd });
    }
    setDeploy = v => { for (const a of arms) a.pivot.rotation.y = a.sd * (PI / 2) * (1 - v); };
    setDeploy(0);
  }

  /* OUROBOROS: enam segmen badan + ekor. Kedudukan setiap segmen ditulis
     setiap bingkai daripada laluan kepala (Game.animSerpent), jadi badan
     meliuk mengikut jejak sebenar. Slot 0 di kepala, slot 1-3 atas segmen 1-3. */
  let segments = null, tentacles = null, custom = false;
  if (BODY === 'ouroboros') {
    segments = [];
    custom = true;
    const hp = new Builder();
    hp.add('dark', G.cyl, [0, 1.56, 0.15], null, [0.86 * mountScale, 0.14, 0.86 * mountScale]);
    hp.add('steel', G.torus, [0, 1.62, 0.15], [PI / 2, 0, 0], [0.86 * mountScale, 0.86 * mountScale, 0.42]);
    hp.build({ dark: mats.dark, steel: mats.steel }, root);
    const tH = new THREE.Group();
    tH.position.set(0, 1.66, 0.15);
    root.add(tH); turrets.push(tH);
    for (let i = 0; i < 6; i++) {
      const sc = 1 - i * 0.1;
      const g2 = new THREE.Group();
      g2.position.set(0, 0.95, -(i + 1) * 1.55);
      const sb = new Builder();
      if (i < 5) {
        sb.add('body', G.sph, [0, 0, 0], null, [1.35 * sc, 1.0 * sc, 1.6 * sc]);
        sb.add('darker', G.torus, [0, 0, 0], null, [1.32 * sc, 1.0 * sc, 0.55]);       // gelang sisik
        sb.add('crys', G.box, [0, 0.5 * sc, -0.2], null, [0.08, 0.32 * sc, 0.8 * sc]);  // sirip tulang belakang
        sb.add('crys', G.cyl, [0, -0.55 * sc, 0], null, [1.0 * sc, 0.05, 1.1 * sc]);   // cahaya anti-graviti
        for (const sd of [-1, 1]) sb.add('steel', G.cone, [sd * 0.66 * sc, 0.05, 0], [0, 0, -sd * PI / 2], [0.16, 0.42 * sc, 0.16]);
        if (i < 3) sb.add('dark', G.cyl, [0, 0.52 * sc, 0.25], null, [0.8 * mountScale, 0.12, 0.8 * mountScale]);
      } else {
        sb.add('body', G.cone, [0, 0, -0.5], [-PI / 2, 0, 0], [0.8 * sc, 2.0, 0.8 * sc]);  // ekor
        sb.add('crys', G.sph, [0, 0, -1.55], null, [0.32, 0.32, 0.32]);
        sb.add('crys', G.cone, [0, 0.3, -0.9], [-PI / 2 - 0.4, 0, 0], [0.12, 0.8, 0.12]);
      }
      sb.build(mats, g2);
      if (i < 3) {
        const tg = new THREE.Group();
        tg.position.set(0, 0.6 * sc, 0.25);
        g2.add(tg); turrets.push(tg);
      }
      root.add(g2);
      segments.push({ g: g2, i });
    }
  }

  /* MEDUSA: lapan sesungut, setiap satu rantai enam sendi bersarang supaya
     putaran kecil pada setiap sendi menghasilkan lengkung yang hidup
     (Game.animTentacles). Slot senjata di atas loceng. */
  if (BODY === 'medusa') {
    tentacles = [];
    custom = true;
    const tm = { body: mats.body, crys: mats.crys, dark: mats.dark };
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + PI / 8;
      let parent = new THREE.Group();
      parent.position.set(Math.sin(a) * 1.5, 1.9, Math.cos(a) * 1.5);
      root.add(parent);
      const joints = [parent];
      for (let j = 0; j < 6; j++) {
        const s = 1 - j * 0.12;
        const jb = new Builder();
        jb.add('body', G.cyl, [0, -0.16, 0], null, [0.22 * s, 0.34, 0.22 * s]);
        jb.add('crys', G.sph, [0, -0.32, 0], null, [0.17 * s, 0.17 * s, 0.17 * s]);
        jb.build(tm, parent);
        if (j < 5) {
          const nx = new THREE.Group();
          nx.position.y = -0.31;
          parent.add(nx); parent = nx; joints.push(nx);
        }
      }
      tentacles.push({ joints, a, ph: i * 0.8 });
    }
    const pb = new Builder();
    const MP = [[-0.75, 3.12, 0.55], [0.75, 3.12, 0.55], [-0.75, 3.12, -0.55], [0.75, 3.12, -0.55]];
    for (const [x, y, z] of MP) {
      pb.add('dark', G.cyl, [x, y - 0.08, z], null, [0.8 * mountScale, 0.14, 0.8 * mountScale]);
      const tg = new THREE.Group();
      tg.position.set(x, y, z);
      root.add(tg); turrets.push(tg);
    }
    pb.build({ dark: mats.dark }, root);
    // lengkung sesungut asal (pratonton garaj statik pun nampak hidup)
    for (const t of tentacles) t.joints.forEach((jt, j) => { jt.rotation.x = 0.1 + j * 0.03; jt.rotation.z = Math.sin(t.ph + j) * 0.1; });
  }
  /* kereta baharu 2026-10-17 (models2.js): cara gerak + titik senjata sendiri */
  let animate = null;
  if (B2) {
    custom = true;
    animate = B2.limb({ root, sp, mats, G, HG, Builder, wheels, legs, turrets, mountScale, autoTurret, tyre: () => tyreTemplate(mats.crys), hoverPod, hoverParts, trackSide: (par, P) => { const S2 = trackSide(par, Object.assign({ crys: mats.crys }, P)); trackSides.push(S2); return S2; } }) || null;
  }
  // letak setiap titik pasang tepat di atas permukaan badan (setiap badan tinggi berbeza)
  root.updateMatrixWorld(true);
  const hullMeshes = Object.entries(meshes).filter(([k]) => k !== 'ghost').map(([, m]) => m);
  const ray = new THREE.Raycaster();
  const down = V(0, -1, 0);
  /* `sp.mounts`: badan bukan-kotak (bola Hyna, kubu berjalan Gyhna) menetapkan
     titik senjata sendiri - tiada raycast, tiada tiang sokong. */
  for (const hp of ((setDeploy || custom) ? [] : (sp.mounts || HARDPOINTS[nSlot]))) {
    const px = hp[0] * sp.w, pz = hp[2] * sp.len;
    let py = hp[1];
    if (!sp.mounts) {
      ray.set(V(px, 6, pz), down);
      const hit = ray.intersectObjects(hullMeshes, false).find(h => h.point.y <= hp[1] + 0.75 && h.point.y > 0.7);
      if (hit) py = hit.point.y + 0.1;
      else rb.add('dark', G.cyl, [px, (py - 0.1 + 0.8) / 2, pz], null, [0.2, py - 0.9, 0.2]);   // tiang sokong
    }
    const g2 = new THREE.Group();
    g2.position.set(px, py, pz);
    root.add(g2);
    turrets.push(g2);
    rb.add('dark', G.cyl, [px, py - 0.1, pz], null, [0.86 * mountScale, 0.16, 0.86 * mountScale]);
    rb.add('steel', G.torus, [px, py - 0.04, pz], [PI / 2, 0, 0], [0.86 * mountScale, 0.86 * mountScale, 0.42]);
  }
  rb.build({ dark: mats.dark, steel: mats.steel }, root);
  const turret = turrets[0];

  const beamGeo = new THREE.ConeGeometry(1.5, 12, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe0a8, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  });
  const beams = [];
  for (const x of [-0.62, 0.62]) {
    const m = new THREE.Mesh(beamGeo, beamMat);
    m.position.set(x * sp.w, 0.78, 8.0 * sp.len);
    m.rotation.x = -PI / 2 + 0.03;
    m.renderOrder = 3;
    root.add(m); beams.push(m);
  }

  track = makeTrack(trackSides);
  /* animasi peranti terapung: bahagian berputar, denyut cahaya, kon tujahan */
  const hoverFx = hoverParts.length ? {
    update(t, dt, boost) {
      for (const P of hoverParts) {
        for (const q of P.spin) {
          const o = q.o, u = o.userData;
          if (q.k) o.rotation.y += dt * q.k * (1 + boost);
          if (q.pulse) { if (u.s0 === undefined) u.s0 = o.scale.clone(); o.scale.copy(u.s0).multiplyScalar(1 + Math.sin(t * 7) * q.pulse * 0.4); }
          if (q.bob) { if (u.y0 === undefined) u.y0 = o.position.y; o.position.y = u.y0 + Math.sin(t * 3) * q.bob; }
          if (q.rock) o.rotation.x = Math.sin(t * 2.2) * q.rock;
        }
        for (const w of P.wash) {
          w.material.opacity = w.userData.base * (0.75 + Math.sin(t * 11 + w.id) * 0.25) * (1 + boost * 0.8);
          w.scale.y = w.userData.len * (0.9 + boost * 0.5 + Math.sin(t * 9) * 0.06);
        }
      }
    },
  } : null;
  if (hoverFx) hoverFx.update(0, 0, 0);
  return {
    root, wheels, legs, rollers, hovers, turret, turrets, mountScale, track, hoverFx,
    meshes, mats, beams, beamMat, spec: sp, autoTurret, autoMuzzle, setDeploy, segments, tentacles, animate,
  };
}

/* ---------- model senjata di atas turret ---------- */
/* Bahagian boleh gerak ditambah SELEPAS badan senjata dibina, supaya
   siluet asal setiap senjata kekal sama - hanya magazin, bolt dan teras
   bercahaya yang dipisahkan menjadi kumpulan tersendiri untuk dianimasikan. */
function addMovingParts(root, mats, fam, muzzleZ, id) {
  const mag = new THREE.Group(), bolt = new THREE.Group();
  const mb = new Builder(), bb = new Builder();
  let glowMat = null;

  switch (fam) {
    case 'mag':
      mb.add('dark', G.rbox, [0, -0.16, -0.06], null, [0.3, 0.52, 0.24]);
      mb.add('army', G.box, [0, -0.42, -0.06], null, [0.26, 0.06, 0.2]);
      bb.add('steel', G.rbox, [0, 0.46, -0.3], null, [0.24, 0.16, 0.5]);
      break;
    case 'bolt':
      mb.add('dark', G.rbox, [0, -0.1, -0.1], null, [0.24, 0.42, 0.34]);
      bb.add('steel', G.cyl, [0.2, 0.46, -0.18], [0, 0, PI / 2], [0.12, 0.34, 0.12]);
      bb.add('steel', G.sph, [0.4, 0.46, -0.18], null, [0.13, 0.13, 0.13]);
      break;
    case 'break':
      // "bolt" di sini ialah kumpulan laras yang jatuh ke bawah
      bb.add('steel', G.box, [0, 0.03, 0.55], null, [0.34, 0.05, 1.1]);
      mb.add('hot', G.cyl, [0, 0.3, 0.1], [PI / 2, 0, 0], [0.13, 0.4, 0.13]);
      mb.add('hot', G.cyl, [0.16, 0.3, 0.1], [PI / 2, 0, 0], [0.13, 0.4, 0.13]);
      break;
    case 'rotary':
      mb.add('army', G.rbox, [-0.36, -0.08, -0.2], null, [0.34, 0.46, 0.6]);
      mb.add('dark', G.cyl, [-0.36, 0.16, -0.2], [PI / 2, 0, 0], [0.3, 0.2, 0.3]);
      bb.add('steel', G.box, [0.3, 0.42, -0.2], null, [0.14, 0.2, 0.44]);
      break;
    case 'drum':
      mb.add('dark', G.cyl, [0, 0.12, -0.18], [0, 0, PI / 2], [0.62, 0.26, 0.62]);
      mb.add('steel', G.torus, [0, 0.12, -0.05], [0, PI / 2, 0], [0.62, 0.62, 0.12]);
      bb.add('steel', G.box, [0, 0.42, -0.4], null, [0.2, 0.12, 0.34]);
      break;
    case 'tube':
      mb.add('hot', G.cyl, [0, 0.34, 0], [PI / 2, 0, 0], [0.24, 0.8, 0.24]);
      mb.add('dark', G.cone, [0, 0.34, 0.42], [PI / 2, 0, 0], [0.24, 0.3, 0.24]);
      bb.add('steel', G.cyl, [0, 0.34, -0.62], [PI / 2, 0, 0], [0.46, 0.12, 0.46]);
      bb.add('dark', G.box, [0, 0.58, -0.62], null, [0.4, 0.34, 0.06]);
      break;
    case 'energy': {
      const gm = mats.accent || mat({ color: 0x0a0f18, emissive: 0x7de3ff, emissiveIntensity: 1.4, roughness: 0.3 });
      mats.core = gm; glowMat = gm;
      // sel tenaga: rod nipis dalam sangkar keluli, bukan ketulan gemuk
      mb.add('dark', G.rbox, [0, 0.3, -0.26], null, [0.3, 0.3, 0.52]);
      mb.add('core', G.cyl, [0, 0.3, -0.26], [PI / 2, 0, 0], [0.11, 0.62, 0.11]);
      for (const sd of [-1, 1]) mb.add('steel', G.box, [sd * 0.15, 0.3, -0.26], null, [0.03, 0.34, 0.5]);
      // sirip penyejuk yang terbuka semasa membuang haba
      for (const sd of [-1, 1]) {
        bb.add('steel', G.box, [sd * 0.27, 0.42, -0.05], null, [0.04, 0.26, 0.62]);
        bb.add('steel', G.box, [sd * 0.27, 0.42, -0.05], [0, 0, sd * 0.2], [0.13, 0.03, 0.56]);
      }
      break;
    }
    case 'charge': {
      const gm = mats.accent || mat({ color: 0x0a0f18, emissive: 0xc58bff, emissiveIntensity: 1.2, roughness: 0.3 });
      mats.core = gm; glowMat = gm;
      mb.add('dark', G.rbox, [0, -0.12, -0.2], null, [0.32, 0.46, 0.4]);
      mb.add('core', G.box, [0, -0.12, -0.2], null, [0.12, 0.34, 0.3]);
      bb.add('core', G.torus, [0, 0.38, 0.1], [PI / 2, 0, 0], [0.34, 0.34, 0.1]);
      break;
    }
    case 'piston': {
      const gm = mats.accent || mat({ color: 0x1a0f08, emissive: 0xff8a3a, emissiveIntensity: 1.4, roughness: 0.35 });
      mats.core = gm; glowMat = gm;
      if (id === 'fist') fistHand(bb, G);           // tangan berjari (wmodels3.js)
      else {
        bb.add('steel', G.cyl, [0, 0.36, 1.0], [PI / 2, 0, 0], [0.3, 0.7, 0.3]);
        bb.add('dark', G.rbox, [0, 0.36, 1.34], null, [0.6, 0.54, 0.34]);
      }
      mb.add('core', G.box, [0, -0.1, -0.24], null, [0.28, 0.34, 0.3]);
      break;
    }
    case 'disc':
      mb.add('steel', G.cyl, [0, 0.34, 0.5], [PI / 2, 0, 0], [0.62, 0.12, 0.62]);
      mb.add('dark', G.cyl, [0, 0.34, 0.5], [PI / 2, 0, 0], [0.22, 0.16, 0.22]);
      bb.add('dark', G.box, [0, 0.62, -0.1], null, [0.42, 0.08, 0.5]);
      break;
    case 'coil':
      mb.add('army', G.torus, [0, 0.34, 0.5], [PI / 2, 0, 0], [0.5, 0.5, 0.12]);
      bb.add('steel', G.box, [0, 0.12, -0.3], null, [0.34, 0.1, 0.3]);
      break;
  }

  if (!mats.army) mats.army = MATS.army.clone();
  if (!mats.hot) mats.hot = MATS.hot.clone();
  mb.build(mats, mag);
  bb.build(mats, bolt);
  // letakkan magazin di bawah badan, bolt di atasnya
  root.add(mag); root.add(bolt);
  void muzzleZ;
  return { mag, bolt, glowMat };
}

/* Perincian yang dikongsi semua senjata. Tidak mengubah bentuk asas -
   hanya menambah benda kecil yang membezakan alat yang dimesin daripada
   sekumpulan kotak: bolt, bilah pelalu udara, kabel dan pengadang. */
function weaponGreebles(b, accent, len) {
  // bracket dudukan dengan bolt di kedua-dua belah
  for (const sd of [-1, 1]) {
    b.add('steel', G.rbox, [sd * 0.4, 0.1, -0.2], null, [0.07, 0.3, 0.72]);
    for (let i = -1; i <= 1; i++) b.add('steel', G.cyl, [sd * 0.44, 0.1, -0.2 + i * 0.26], [0, 0, PI / 2], [0.07, 0.04, 0.07]);
  }
  // bilah pelalu udara atas penerima
  for (let i = 0; i < 3; i++) b.add('dark', G.box, [0, 0.25, -0.44 + i * 0.12], null, [0.44, 0.07, 0.05]);
  // kabel tenaga menyusur ke bawah senjata
  b.add('darker', G.cyl, [0.3, 0.02, -0.1], [PI / 2, 0, 0.18], [0.06, 0.9, 0.06]);
  b.add('darker', G.sph, [0.3, 0.02, 0.34], null, [0.09, 0.09, 0.09]);
  // lampu status kecil dalam warna senjata itu sendiri
  if (accent) {
    b.add('accent', G.box, [-0.34, 0.24, -0.3], null, [0.07, 0.04, 0.2]);
    b.add('accent', G.cyl, [0, 0.1, Math.max(0.5, len * 0.45)], [PI / 2, 0, 0], [0.1, 0.07, 0.1]);
  }
}

export function buildWeaponModel(id) {
  const root = new THREE.Group();
  const b = new Builder();
  const W = WBY_LITE[id];
  const c = W && W.color ? W.color : null;
  const mats = {
    steel: MATS.steel.clone(), dark: MATS.dark.clone(), hot: MATS.hot.clone(),
    neonC: MATS.neonC.clone(), neonM: MATS.neonM.clone(), army: MATS.army.clone(),
    darker: MATS.darker.clone(),
  };
  /* Warna senjata itu sendiri dijadikan bahan aksen, jadi setiap senjata ada
     identiti dan bukannya semuanya kelabu gelap. */
  if (c) {
    /* Warna senjata boleh melebihi 1 (ia nilai HDR untuk bloom dalam
       permainan). Dinormalkan dahulu supaya RONA kekal, bukan bertukar
       putih tepu dalam pratonton garaj yang tiada bloom. */
    const mx = Math.max(c[0], c[1], c[2], 0.001);
    const hue = new THREE.Color(c[0] / mx, c[1] / mx, c[2] / mx);
    /* emissiveIntensity tinggi menjadikan SEMUA saluran melepasi 1 dan
       bertukar putih dalam pratonton garaj (tiada bloom di situ). Warna
       asas dijadikan warna sebenar dan pancaran dikekalkan rendah, jadi
       ia terbaca sebagai logam berwarna yang bersinar. */
    mats.accent = mat({
      color: hue.clone().multiplyScalar(0.55),
      emissive: hue.clone().multiplyScalar(0.8),
      emissiveIntensity: 0.5, roughness: 0.32, metalness: 0.35,
    });
  }
  let muzzleZ = 1.4, spinner = null;
  /* cat badan ikut warna senjata + bahan tambahan untuk reka bentuk 2026-10-17 */
  {
    const hue = mats.accent ? mats.accent.color.clone().multiplyScalar(1 / 0.55) : new THREE.Color(0.6, 0.62, 0.66);
    mats.paint = mat({ color: hue.clone().lerp(new THREE.Color(0x22262c), 0.74), metalness: 0.7, roughness: 0.4 });
    mats.glass = MATS.glass.clone();
    mats.glass.transparent = true; mats.glass.opacity = 0.55;
    mats.wood = MATS.wood.clone();
    mats.gold = mat({ color: 0xd9a441, metalness: 1, roughness: 0.25 });
    // putih mutiara bercahaya (Diamond) & besi hitam (Gale Hammer) - warna kereta pasangan
    mats.pearl = mat({ color: 0xeaf6ff, emissive: 0xcfeeff, emissiveIntensity: 0.55, metalness: 0.25, roughness: 0.22 });
    mats.blk = mat({ color: 0x1c1e22, metalness: 0.8, roughness: 0.45 });
    if (!mats.accent) mats.accent = mat({ color: 0x3a6a8a, emissive: 0x57d6ff, emissiveIntensity: 0.5 });
  }
  const v3 = weaponModel3(id, { b, G, HG, THREE, Builder, root, mats });
  if (v3) { muzzleZ = v3.muzzleZ; spinner = v3.spinner || null; }
  else {
  b.add('dark', G.rbox, [0, 0.06, -0.15], null, [0.78, 0.34, 0.9]);
  b.add('steel', G.box, [0, 0.3, -0.42], null, [0.5, 0.3, 0.1]);
  }

  if (!v3) switch (id) {
    case 'mg':
      b.add('dark', G.rbox, [0, 0.26, 0.3], null, [0.3, 0.26, 0.9]);
      b.add('steel', G.cyl, [0, 0.26, 1.0], [PI / 2, 0, 0], [0.1, 1.1, 0.1]);
      // sarung laser berlubang
      b.add('darker', G.cyl, [0, 0.26, 0.82], [PI / 2, 0, 0], [0.2, 0.7, 0.2]);
      for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) {
        b.add('dark', G.box, [sd * 0.1, 0.26, 0.56 + i * 0.13], null, [0.05, 0.13, 0.07]);
      }
      b.add('steel', G.cyl, [0, 0.26, 1.42], [PI / 2, 0, 0], [0.17, 0.2, 0.17]);   // brek muncung
      b.add('steel', G.box, [0, 0.46, 0.3], null, [0.1, 0.14, 0.7]);               // pemegang bawa
      b.add('army', G.rbox, [0.34, 0.24, 0.1], null, [0.3, 0.34, 0.5]);
      // tali peluru tergantung
      for (let i = 0; i < 5; i++) b.add('accent', G.box, [0.34 - i * 0.02, 0.02 - i * 0.05, 0.1 - i * 0.06], [0, 0, 0.3], [0.16, 0.06, 0.09]);
      muzzleZ = 1.62; break;
    case 'smg':
      for (const x of [-0.18, 0.18]) {
        b.add('dark', G.rbox, [x, 0.26, 0.3], null, [0.2, 0.22, 0.8]);
        b.add('steel', G.cyl, [x, 0.26, 0.86], [PI / 2, 0, 0], [0.07, 0.8, 0.07]);
        b.add('steel', G.cyl, [x, 0.26, 1.24], [PI / 2, 0, 0], [0.11, 0.14, 0.11]);
        b.add('accent', G.box, [x, 0.38, 0.5], null, [0.05, 0.04, 0.5]);
      }
      b.add('army', G.rbox, [0, 0.42, -0.1], null, [0.5, 0.2, 0.4]);
      // stok lipat ke tepi
      b.add('steel', G.box, [0.3, 0.3, -0.55], [0, 0.4, 0], [0.06, 0.1, 0.6]);
      b.add('steel', G.box, [0.46, 0.3, -0.8], null, [0.26, 0.12, 0.06]);
      muzzleZ = 1.38; break;
    case 'shotgun':
      for (const x of [-0.12, 0.12]) b.add('steel', G.cyl, [x, 0.28, 0.72], [PI / 2, 0, 0], [0.17, 1.5, 0.17]);
      b.add('dark', G.rbox, [0, 0.26, -0.1], null, [0.54, 0.32, 0.8]);
      b.add('wood', G.rbox, [0, 0.24, -0.5], null, [0.3, 0.26, 0.5]);
      mats.wood = MATS.wood.clone();
      muzzleZ = 1.5; break;
    case 'minigun': {
      b.add('dark', G.rbox, [0, 0.3, -0.05], null, [0.62, 0.5, 0.9]);
      const sp = new THREE.Group();
      const sb = new Builder();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        sb.add('steel', G.cyl, [Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.62], [PI / 2, 0, 0], [0.085, 1.5, 0.085]);
      }
      sb.add('dark', G.cyl, [0, 0, 0.0], [PI / 2, 0, 0], [0.42, 0.3, 0.42]);
      sb.build({ steel: mats.steel, dark: mats.dark }, sp);
      sp.position.set(0, 0.3, 0.2);
      root.add(sp); spinner = sp;
      b.add('army', G.rbox, [-0.42, 0.22, -0.25], null, [0.36, 0.44, 0.54]);
      muzzleZ = 1.65; break;
    }
    case 'rocket':
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 - 0.5) * 0.44, y = 0.2 + ((i / 2) | 0) * 0.4;
        b.add('army', G.cyl, [x, y, 0.4], [PI / 2, 0, 0], [0.19, 1.3, 0.19]);
        b.add('dark', G.cyl, [x, y, 1.02], [PI / 2, 0, 0], [0.21, 0.1, 0.21]);
      }
      b.add('dark', G.rbox, [0, 0.4, -0.25], null, [0.7, 0.72, 0.4]);
      muzzleZ = 1.1; break;
    case 'flame':
      b.add('army', G.cyl, [-0.3, 0.42, -0.35], [PI / 2, 0, 0], [0.34, 0.7, 0.34]);
      b.add('army', G.cyl, [0.3, 0.42, -0.35], [PI / 2, 0, 0], [0.34, 0.7, 0.34]);
      b.add('steel', G.cyl, [0, 0.28, 0.45], [PI / 2, 0, 0], [0.13, 1.2, 0.13]);
      b.add('steel', G.cone, [0, 0.28, 1.12], [PI / 2, 0, 0], [0.24, 0.34, 0.24]);
      b.add('hot', G.sphLo, [0, 0.28, 1.2], null, [0.1, 0.1, 0.1]);
      muzzleZ = 1.3; break;
    case 'laser':
      b.add('dark', G.rbox, [0, 0.32, 0.15], null, [0.52, 0.42, 1.0]);
      b.add('steel', G.cyl, [0, 0.32, 0.8], [PI / 2, 0, 0], [0.22, 0.5, 0.22]);
      b.add('accent', G.ico, [0, 0.32, 1.12], [0, 0.4, 0.3], [0.3, 0.3, 0.44]);
      for (const x of [-0.3, 0.3]) b.add('accent', G.box, [x, 0.32, 0.4], null, [0.05, 0.22, 0.7]);
      muzzleZ = 1.3; break;
    case 'tesla':
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.6, 0.44, 0.8]);
      b.add('steel', G.cyl, [0, 0.55, 0.3], [PI / 2, 0, 0], [0.16, 0.9, 0.16]);
      for (let i = 0; i < 4; i++) b.add('accent', G.torus, [0, 0.55, 0.08 + i * 0.24], [PI / 2, 0, 0], [0.46 - i * 0.03, 0.46 - i * 0.03, 0.1]);
      b.add('accent', G.sph, [0, 0.55, 0.92], null, [0.2, 0.2, 0.2]);
      muzzleZ = 1.1; break;
    case 'rail':
      b.add('dark', G.rbox, [0, 0.3, 0.1], null, [0.5, 0.4, 1.2]);
      for (const x of [-0.19, 0.19]) {
        b.add('steel', G.box, [x, 0.34, 0.9], null, [0.1, 0.16, 1.9]);
        b.add('accent', G.box, [x * 0.55, 0.34, 0.9], null, [0.05, 0.1, 1.85]);
      }
      b.add('steel', G.box, [0, 0.58, 0.3], null, [0.34, 0.1, 0.9]);
      b.add('accent', G.sph, [0, 0.34, -0.3], null, [0.2, 0.2, 0.2]);
      muzzleZ = 1.95; break;
    case 'nail':
      // magazin paku condong di sisi
      b.add('army', G.rbox, [0.3, 0.42, 0.1], [0, 0, -0.5], [0.5, 0.18, 0.62]);
      for (let i = 0; i < 6; i++) b.add('steel', G.box, [0.24 + i * 0.03, 0.46 + i * 0.015, 0.1], [0, 0, -0.5], [0.42, 0.02, 0.05]);
      // muncung berduri
      for (let i = 0; i < 6; i++) {
        const a2 = i / 6 * TAU;
        b.add('steel', G.box, [Math.cos(a2) * 0.13, 0.26 + Math.sin(a2) * 0.13, 1.0], [0, 0, -a2], [0.12, 0.03, 0.03]);
      }
      b.add('accent', G.cyl, [0, 0.26, 0.62], [PI / 2, 0, 0], [0.17, 0.06, 0.17]);
      b.add('dark', G.rbox, [0, 0.28, 0.2], null, [0.32, 0.3, 0.9]);
      b.add('steel', G.cyl, [0, 0.28, 0.95], [PI / 2, 0, 0], [0.08, 1.1, 0.08]);
      b.add('steel', G.rbox, [0, 0.55, -0.05], null, [0.26, 0.3, 0.5]);
      muzzleZ = 1.5; break;
    case 'autoshot':
      // dram peluru di bawah penerima
      b.add('dark', G.cyl, [0, 0.02, 0.15], [0, 0, PI / 2], [0.66, 0.24, 0.66]);
      b.add('steel', G.torus, [0, 0.02, 0.27], [0, PI / 2, 0], [0.66, 0.66, 0.06]);
      for (let i = 0; i < 6; i++) {
        const a2 = i / 6 * TAU;
        b.add('accent', G.cyl, [Math.cos(a2) * 0.2, 0.02 + Math.sin(a2) * 0.2, 0.28], [0, PI / 2, 0], [0.09, 0.06, 0.09]);
      }
      b.add('steel', G.cyl, [0, 0.3, 0.8], [PI / 2, 0, 0], [0.19, 1.5, 0.19]);
      b.add('dark', G.cyl, [0, 0.22, 0.05], [0, 0, PI / 2], [0.46, 0.34, 0.46]);
      b.add('dark', G.rbox, [0, 0.3, -0.35], null, [0.4, 0.3, 0.55]);
      muzzleZ = 1.55; break;
    case 'sniper':
      // teleskop panjang atas penerima
      b.add('darker', G.cyl, [0, 0.62, 0.35], [PI / 2, 0, 0], [0.19, 1.05, 0.19]);
      b.add('steel', G.cyl, [0, 0.62, 0.88], [PI / 2, 0, 0], [0.25, 0.16, 0.25]);
      b.add('accent', G.cyl, [0, 0.62, 0.95], [PI / 2, 0, 0], [0.19, 0.04, 0.19]);
      for (const z of [-0.05, 0.62]) b.add('steel', G.box, [0, 0.48, z], null, [0.12, 0.2, 0.09]);
      // kaki dua
      for (const sd of [-1, 1]) {
        b.add('steel', G.cyl, [sd * 0.22, -0.1, 0.62], [0.2, 0, sd * 0.55], [0.05, 0.6, 0.05]);
        b.add('dark', G.box, [sd * 0.4, -0.36, 0.68], null, [0.12, 0.05, 0.22]);
      }
      b.add('dark', G.rbox, [0, 0.28, 0.0], null, [0.28, 0.28, 1.2]);
      b.add('steel', G.cyl, [0, 0.28, 1.25], [PI / 2, 0, 0], [0.09, 1.9, 0.09]);
      b.add('steel', G.cyl, [0, 0.28, 2.2], [PI / 2, 0, 0], [0.14, 0.34, 0.14]);
      b.add('dark', G.cyl, [0, 0.52, 0.15], [PI / 2, 0, 0], [0.13, 0.8, 0.13]);
      b.add('accent', G.cyl, [0, 0.52, 0.56], [PI / 2, 0, 0], [0.1, 0.05, 0.1]);
      muzzleZ = 2.3; break;
    case 'plasma':
      b.add('dark', G.rbox, [0, 0.32, 0.1], null, [0.56, 0.46, 1.0]);
      b.add('steel', G.cyl, [0, 0.32, 0.85], [PI / 2, 0, 0], [0.3, 0.7, 0.3]);
      b.add('accent', G.sph, [0, 0.32, 1.2], null, [0.22, 0.22, 0.22]);
      for (const x of [-0.34, 0.34]) b.add('accent', G.cyl, [x, 0.32, 0.3], [PI / 2, 0, 0], [0.12, 0.7, 0.12]);
      muzzleZ = 1.45; break;
    case 'acid':
      b.add('army', G.cyl, [-0.3, 0.42, -0.35], [PI / 2, 0, 0], [0.34, 0.7, 0.34]);
      b.add('army', G.cyl, [0.3, 0.42, -0.35], [PI / 2, 0, 0], [0.34, 0.7, 0.34]);
      b.add('neonG', G.cyl, [-0.3, 0.42, -0.02], [PI / 2, 0, 0], [0.36, 0.08, 0.36]);
      b.add('neonG', G.cyl, [0.3, 0.42, -0.02], [PI / 2, 0, 0], [0.36, 0.08, 0.36]);
      b.add('steel', G.cyl, [0, 0.28, 0.45], [PI / 2, 0, 0], [0.13, 1.2, 0.13]);
      b.add('steel', G.cone, [0, 0.28, 1.12], [PI / 2, 0, 0], [0.26, 0.36, 0.26]);
      mats.neonG = MATS.neonG.clone();
      muzzleZ = 1.3; break;
    case 'swarm':
      for (let i = 0; i < 6; i++) {
        const x = (i % 3 - 1) * 0.3, y = 0.2 + ((i / 3) | 0) * 0.32;
        b.add('army', G.cyl, [x, y, 0.35], [PI / 2, 0, 0], [0.13, 1.0, 0.13]);
        b.add('accent', G.cyl, [x, y, 0.86], [PI / 2, 0, 0], [0.12, 0.06, 0.12]);
      }
      b.add('dark', G.rbox, [0, 0.36, -0.3], null, [1.0, 0.7, 0.4]);
      muzzleZ = 1.0; break;
    case 'arc':
      b.add('dark', G.rbox, [0, 0.3, 0.0], null, [0.5, 0.4, 0.8]);
      b.add('steel', G.cyl, [0, 0.5, 0.45], [PI / 2, 0, 0], [0.13, 0.8, 0.13]);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.5, 0.3 + i * 0.26], [PI / 2, 0, 0], [0.4, 0.4, 0.1]);
      for (const x of [-0.26, 0.26]) b.add('accent', G.sph, [x, 0.5, 0.95], null, [0.16, 0.16, 0.16]);
      muzzleZ = 1.15; break;
    case 'cryo':
      b.add('dark', G.rbox, [0, 0.32, 0.15], null, [0.5, 0.42, 1.0]);
      b.add('steel', G.cyl, [0, 0.32, 0.82], [PI / 2, 0, 0], [0.24, 0.6, 0.24]);
      b.add('accent', G.ico, [0, 0.32, 1.15], [0.4, 0, 0.2], [0.32, 0.32, 0.4]);
      b.add('steel', G.cyl, [-0.36, 0.45, -0.25], [PI / 2, 0, 0], [0.26, 0.8, 0.26]);
      b.add('accent', G.torus, [0, 0.32, 0.55], [PI / 2, 0, 0], [0.48, 0.48, 0.11]);
      muzzleZ = 1.35; break;
    case 'pulse':
      b.add('dark', G.rbox, [0, 0.28, 0.15], null, [0.42, 0.34, 0.9]);
      b.add('steel', G.cyl, [0, 0.28, 0.85], [PI / 2, 0, 0], [0.16, 0.8, 0.16]);
      b.add('accent', G.torus, [0, 0.28, 1.05], [PI / 2, 0, 0], [0.34, 0.34, 0.12]);
      b.add('accent', G.box, [0, 0.5, 0.1], null, [0.14, 0.06, 0.6]);
      muzzleZ = 1.3; break;
    case 'shard':
      // kelompok hablur pada penyuap
      for (let i = 0; i < 5; i++) {
        const a2 = i / 5 * TAU;
        b.add('accent', G.ico, [Math.cos(a2) * 0.2, 0.52 + Math.sin(a2) * 0.12, -0.05], [a2, 0.4, 0], [0.16, 0.3, 0.16]);
      }
      b.add('steel', G.rbox, [0, 0.5, -0.05], null, [0.3, 0.16, 0.5]);
      b.add('dark', G.rbox, [0, 0.28, 0.1], null, [0.34, 0.3, 1.0]);
      for (const x of [-0.14, 0, 0.14]) b.add('steel', G.cyl, [x, 0.28, 0.95], [PI / 2, 0, 0], [0.06, 1.1, 0.06]);
      b.add('accent', G.ico, [0, 0.52, 0.0], [0.3, 0.4, 0], [0.26, 0.26, 0.26]);
      muzzleZ = 1.55; break;
    case 'harpoon':
      // gelung tali di sisi
      b.add('darker', G.cyl, [-0.34, 0.42, -0.1], [0, 0, PI / 2], [0.46, 0.26, 0.46]);
      for (let i = 0; i < 3; i++) b.add('steel', G.torus, [-0.34, 0.42, -0.1], [0, PI / 2, 0], [0.4 - i * 0.06, 0.4 - i * 0.06, 0.04]);
      b.add('accent', G.cyl, [-0.34, 0.42, -0.1], [0, 0, PI / 2], [0.16, 0.3, 0.16]);
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.44, 0.4, 0.9]);
      b.add('steel', G.box, [0, 0.3, 0.7], null, [0.2, 0.2, 1.5]);
      b.add('steel', G.cone, [0, 0.3, 1.55], [PI / 2, 0, 0], [0.24, 0.6, 0.24]);
      for (const x of [-0.22, 0.22]) b.add('steel', G.cyl, [x, 0.3, 0.3], [PI / 2, 0, 0], [0.07, 0.9, 0.07]);
      muzzleZ = 1.8; break;
    case 'blaze':
      // sarung haba bersirip sepanjang laras
      for (let i = 0; i < 6; i++) b.add('darker', G.torus, [0, 0.32, 0.3 + i * 0.17], [PI / 2, 0, 0], [0.33, 0.33, 0.07]);
      b.add('accent', G.cyl, [0, 0.32, 0.3], [PI / 2, 0, 0], [0.13, 0.9, 0.13]);
      // api pandu kecil di tepi muncung
      b.add('steel', G.cyl, [0.22, 0.46, 1.0], [PI / 2, 0, 0], [0.07, 0.5, 0.07]);
      b.add('hot', G.cone, [0.22, 0.46, 1.3], [-PI / 2, 0, 0], [0.12, 0.2, 0.12]);
      b.add('army', G.cyl, [0, 0.46, -0.3], [PI / 2, 0, 0], [0.4, 0.6, 0.4]);
      b.add('steel', G.cyl, [0, 0.3, 0.7], [PI / 2, 0, 0], [0.22, 1.3, 0.22]);
      b.add('hot', G.cyl, [0, 0.3, 1.3], [PI / 2, 0, 0], [0.24, 0.12, 0.24]);
      muzzleZ = 1.5; break;
    case 'frost':
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.5, 0.42, 0.8]);
      b.add('steel', G.cyl, [0, 0.42, 0.7], [0.5, 0, 0], [0.26, 1.3, 0.26]);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.36 + i * 0.12, 0.45 + i * 0.22], [PI / 2 - 0.5, 0, 0], [0.4, 0.4, 0.1]);
      muzzleZ = 1.35; break;
    case 'venom':
      b.add('army', G.cyl, [-0.28, 0.46, -0.3], [PI / 2, 0, 0], [0.32, 0.6, 0.32]);
      b.add('army', G.cyl, [0.28, 0.46, -0.3], [PI / 2, 0, 0], [0.32, 0.6, 0.32]);
      b.add('neonG', G.sph, [0, 0.5, 0.1], null, [0.28, 0.28, 0.28]);
      b.add('steel', G.cyl, [0, 0.3, 0.8], [PI / 2, 0, 0], [0.24, 1.2, 0.24]);
      mats.neonG = MATS.neonG.clone();
      muzzleZ = 1.45; break;
    case 'mortar':
      b.add('dark', G.rbox, [0, 0.3, -0.35], null, [0.7, 0.5, 0.6]);
      b.add('steel', G.cyl, [0, 0.62, 0.45], [0.75, 0, 0], [0.4, 1.6, 0.4]);
      b.add('steel', G.torus, [0, 0.95, 0.75], [PI / 2 - 0.75, 0, 0], [0.5, 0.5, 0.3]);
      for (const x of [-0.4, 0.4]) b.add('steel', G.box, [x, 0.2, -0.2], null, [0.1, 0.4, 0.7]);
      muzzleZ = 1.1; break;
    case 'disruptor':
      b.add('dark', G.rbox, [0, 0.32, 0.0], null, [0.56, 0.44, 0.9]);
      b.add('accent', G.torus, [0, 0.5, 0.65], [PI / 2, 0, 0], [0.6, 0.6, 0.12]);
      b.add('accent', G.torus, [0, 0.5, 0.95], [PI / 2, 0, 0], [0.42, 0.42, 0.1]);
      b.add('steel', G.cyl, [0, 0.5, 0.5], [PI / 2, 0, 0], [0.12, 1.0, 0.12]);
      muzzleZ = 1.2; break;
    case 'gatling': {
      b.add('dark', G.rbox, [0, 0.32, -0.1], null, [0.66, 0.5, 0.9]);
      const sp2 = new THREE.Group();
      const sb2 = new Builder();
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        sb2.add('steel', G.cyl, [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.6], [PI / 2, 0, 0], [0.09, 1.3, 0.09]);
        sb2.add('accent', G.sph, [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 1.2], null, [0.09, 0.09, 0.09]);
      }
      sb2.add('dark', G.cyl, [0, 0, 0], [PI / 2, 0, 0], [0.44, 0.3, 0.44]);
      sb2.build({ steel: mats.steel, dark: mats.dark, neonC: mats.neonC }, sp2);
      sp2.position.set(0, 0.32, 0.2);
      root.add(sp2); spinner = sp2;
      muzzleZ = 1.5; break;
    }
    case 'annihilator':
      b.add('dark', G.rbox, [0, 0.34, -0.1], null, [0.7, 0.55, 1.2]);
      for (const x of [-0.26, 0.26]) {
        b.add('steel', G.box, [x, 0.4, 0.95], null, [0.12, 0.2, 2.0]);
        b.add('accent', G.box, [x * 0.5, 0.4, 0.95], null, [0.06, 0.12, 1.95]);
      }
      b.add('accent', G.sph, [0, 0.4, -0.45], null, [0.26, 0.26, 0.26]);
      b.add('steel', G.torus, [0, 0.4, 1.4], [PI / 2, 0, 0], [0.7, 0.7, 0.3]);
      muzzleZ = 2.1; break;
    case 'repulsor':
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.6, 0.44, 0.7]);
      b.add('steel', G.cyl, [0, 0.36, 0.55], [PI / 2, 0, 0], [0.9, 0.5, 0.9]);
      b.add('accent', G.torus, [0, 0.36, 0.82], [PI / 2, 0, 0], [0.82, 0.82, 0.22]);
      b.add('accent', G.torus, [0, 0.36, 0.62], [PI / 2, 0, 0], [0.6, 0.6, 0.18]);
      muzzleZ = 1.0; break;
    case 'buzzsaw':
      b.add('dark', G.rbox, [0, 0.3, -0.15], null, [0.5, 0.42, 0.8]);
      b.add('steel', G.cyl, [0, 0.42, 0.5], [0, 0, PI / 2], [0.86, 0.1, 0.86]);
      for (let i = 0; i < 8; i++) {
        const a2 = i / 8 * TAU;
        b.add('steel', G.box, [0, 0.42 + Math.cos(a2) * 0.46, 0.5 + Math.sin(a2) * 0.46], [-a2, 0, 0], [0.12, 0.2, 0.16]);
      }
      muzzleZ = 1.2; break;
    case 'hive':
      b.add('army', G.rbox, [0, 0.34, 0.05], null, [0.66, 0.54, 1.0]);
      for (const x of [-0.18, 0.18]) b.add('neonG', G.cyl, [x, 0.34, 0.6], [PI / 2, 0, 0], [0.22, 0.7, 0.22]);
      b.add('steel', G.box, [0, 0.64, 0.05], null, [0.6, 0.08, 0.9]);
      mats.neonG = MATS.neonG.clone();
      muzzleZ = 1.2; break;
    case 'singularity':
      b.add('dark', G.rbox, [0, 0.34, -0.1], null, [0.62, 0.5, 1.0]);
      b.add('steel', G.torus, [0, 0.4, 0.75], [PI / 2, 0, 0], [0.9, 0.9, 0.24]);
      b.add('steel', G.torus, [0, 0.4, 0.75], [0, 0, 0], [0.9, 0.9, 0.2]);
      b.add('accent', G.sph, [0, 0.4, 0.75], null, [0.24, 0.24, 0.24]);
      muzzleZ = 1.25; break;
    case 'tether':
      b.add('dark', G.rbox, [0, 0.32, 0.0], null, [0.5, 0.44, 0.95]);
      b.add('accent', G.cyl, [0, 0.32, 0.75], [PI / 2, 0, 0], [0.26, 0.7, 0.26]);
      for (const x of [-0.28, 0.28]) b.add('steel', G.cyl, [x, 0.48, 0.35], [0.35, 0, 0], [0.1, 0.9, 0.1]);
      b.add('accent', G.sph, [0, 0.32, 1.12], null, [0.24, 0.24, 0.24]);
      muzzleZ = 1.35; break;
    case 'volley':
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [1.1, 0.34, 0.6]);
      for (let i = -2; i <= 2; i++) b.add('steel', G.cyl, [i * 0.2, 0.3, 0.55], [PI / 2, 0, 0], [0.07, 0.8, 0.07]);
      b.add('accent', G.box, [0, 0.52, -0.1], null, [0.9, 0.06, 0.3]);
      muzzleZ = 1.05; break;
    case 'seeker':
      b.add('army', G.cyl, [0, 0.38, 0.35], [PI / 2, 0, 0], [0.42, 1.5, 0.42]);
      b.add('dark', G.cone, [0, 0.38, 1.15], [PI / 2, 0, 0], [0.44, 0.5, 0.44]);
      b.add('accent', G.sph, [0, 0.38, 1.35], null, [0.14, 0.14, 0.14]);
      b.add('dark', G.rbox, [0, 0.24, -0.4], null, [0.6, 0.4, 0.5]);
      muzzleZ = 1.5; break;
    case 'lance':
      b.add('dark', G.rbox, [0, 0.32, -0.2], null, [0.44, 0.44, 1.0]);
      b.add('steel', G.cyl, [0, 0.38, 1.0], [PI / 2, 0, 0], [0.13, 2.4, 0.13]);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.38, 0.4 + i * 0.6], [PI / 2, 0, 0], [0.34, 0.34, 0.22]);
      b.add('dark', G.cyl, [0, 0.66, -0.1], [PI / 2, 0, 0], [0.14, 0.9, 0.14]);
      muzzleZ = 2.3; break;
    case 'drain':
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.62, 0.46, 0.8]);
      b.add('accent', G.cone, [0, 0.34, 0.75], [-PI / 2, 0, 0], [0.62, 0.9, 0.62]);
      for (const x of [-0.3, 0.3]) b.add('steel', G.cyl, [x, 0.5, 0.2], [PI / 2, 0, 0], [0.09, 0.7, 0.09]);
      muzzleZ = 1.2; break;
    case 'shocklance':
      b.add('dark', G.rbox, [0, 0.3, -0.15], null, [0.44, 0.4, 0.8]);
      b.add('steel', G.cyl, [0, 0.4, 0.6], [PI / 2, 0, 0], [0.1, 1.4, 0.1]);
      for (let i = 0; i < 5; i++) b.add('accent', G.sph, [0, 0.4, 0.15 + i * 0.28], null, [0.13, 0.13, 0.13]);
      b.add('steel', G.torus, [0, 0.4, 1.28], [PI / 2, 0, 0], [0.3, 0.3, 0.18]);
      muzzleZ = 1.45; break;
    case 'phase':
      b.add('dark', G.rbox, [0, 0.3, 0.05], null, [0.42, 0.38, 1.0]);
      b.add('accent', G.box, [0, 0.3, 0.75], null, [0.1, 0.1, 0.9]);
      b.add('steel', G.box, [0, 0.52, 0.1], null, [0.3, 0.1, 0.8]);
      for (const x of [-0.22, 0.22]) b.add('steel', G.box, [x, 0.3, 0.3], null, [0.06, 0.26, 0.7]);
      muzzleZ = 1.3; break;
    case 'huntershell':
      b.add('dark', G.rbox, [0, 0.34, -0.3], null, [0.76, 0.6, 0.7]);
      b.add('steel', G.cyl, [0, 0.52, 0.55], [0.45, 0, 0], [0.42, 1.7, 0.42]);
      b.add('steel', G.torus, [0, 0.86, 0.95], [PI / 2 - 0.45, 0, 0], [0.5, 0.5, 0.28]);
      b.add('accent', G.sph, [0, 0.36, -0.55], null, [0.22, 0.22, 0.22]);
      muzzleZ = 1.2; break;
    case 'net':
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.66, 0.46, 0.7]);
      b.add('steel', G.torus, [0, 0.34, 0.6], [PI / 2, 0, 0], [0.78, 0.78, 0.16]);
      for (let i = 0; i < 4; i++) {
        const a2 = i / 4 * TAU + 0.4;
        b.add('steel', G.box, [Math.cos(a2) * 0.3, 0.34 + Math.sin(a2) * 0.3, 0.6], [0, 0, -a2], [0.5, 0.05, 0.05]);
      }
      muzzleZ = 1.05; break;
    case 'drill':
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.62, 0.52, 0.7]);
      b.add('steel', G.cyl, [0, 0.32, 0.35], [PI / 2, 0, 0], [0.34, 0.7, 0.34]);
      b.add('steel', G.cone, [0, 0.32, 1.0], [PI / 2, 0, 0], [0.42, 1.1, 0.42]);
      for (let i = 0; i < 3; i++) b.add('hot', G.torus, [0, 0.32, 0.7 + i * 0.22], [PI / 2, 0, 0], [0.3 - i * 0.07, 0.3 - i * 0.07, 0.12]);
      muzzleZ = 1.5; break;
    case 'flak':
      b.add('dark', G.rbox, [0, 0.32, -0.15], null, [0.6, 0.5, 0.8]);
      b.add('steel', G.cyl, [0, 0.4, 0.7], [PI / 2, 0, 0], [0.26, 1.5, 0.26]);
      b.add('steel', G.torus, [0, 0.4, 1.4], [PI / 2, 0, 0], [0.42, 0.42, 0.2]);
      for (const x of [-0.3, 0.3]) b.add('army', G.rbox, [x, 0.2, -0.3], null, [0.2, 0.36, 0.5]);
      muzzleZ = 1.6; break;
    case 'waterjet':
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.6, 0.5, 0.8]);
      b.add('steel', G.cyl, [0, 0.34, 0.5], [PI / 2, 0, 0], [0.3, 1.1, 0.3]);
      b.add('steel', G.cone, [0, 0.34, 1.12], [-PI / 2, 0, 0], [0.62, 0.55, 0.62]);   // muncung melebar
      for (const sd of [-1, 1]) b.add('dark', G.cyl, [sd * 0.34, 0.62, -0.1], [PI / 2, 0, 0], [0.26, 0.9, 0.26]);
      b.add('accent', G.torus, [0, 0.34, 0.95], [PI / 2, 0, 0], [0.4, 0.4, 0.1]);
      muzzleZ = 1.42; break;
    case 'windcharge':
      b.add('dark', G.rbox, [0, 0.3, -0.15], null, [0.5, 0.44, 0.8]);
      b.add('steel', G.cyl, [0, 0.36, 0.6], [PI / 2, 0, 0], [0.42, 1.3, 0.42]);
      for (let i = 0; i < 3; i++) b.add('steel', G.torus, [0, 0.36, 0.25 + i * 0.42], [PI / 2, 0, 0], [0.5, 0.5, 0.09]);
      for (let i = 0; i < 4; i++) {
        const a2 = i / 4 * TAU + 0.4;
        b.add('accent', G.box, [Math.cos(a2) * 0.34, 0.36 + Math.sin(a2) * 0.34, 1.2], [0, 0, -a2], [0.34, 0.04, 0.12]);
      }
      muzzleZ = 1.5; break;
    case 'amber':
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.58, 0.5, 0.8]);
      b.add('hot', G.cyl, [0, 0.58, -0.3], [PI / 2, 0, 0], [0.42, 0.7, 0.42]);        // tangki bara
      b.add('steel', G.cyl, [0, 0.32, 0.55], [PI / 2, 0, 0], [0.24, 1.2, 0.24]);
      b.add('dark', G.cone, [0, 0.32, 1.2], [-PI / 2, 0, 0], [0.5, 0.45, 0.5]);
      b.add('hot', G.sph, [0, 0.32, 1.28], null, [0.2, 0.2, 0.2]);
      for (const sd of [-1, 1]) b.add('steel', G.cyl, [sd * 0.3, 0.5, 0.2], [PI / 2, 0, 0], [0.1, 0.9, 0.1]);
      muzzleZ = 1.5; break;
    case 'lash':
      /* kepala ular di hujung laras yang dililit gegelung bercahaya:
         rahang terbuka dengan taring, mata zamrud, sisik di badan */
      b.add('dark', G.rbox, [0, 0.32, -0.35], null, [0.5, 0.44, 0.8]);
      for (let i = 0; i < 6; i++) {
        const a2 = i * 1.05;
        b.add('accent', G.torus, [Math.cos(a2) * 0.05, 0.36 + Math.sin(a2) * 0.05, 0.05 + i * 0.16], [0, 0, a2], [0.3, 0.3, 0.35]);
      }
      b.add('steel', G.cyl, [0, 0.36, 0.5], [PI / 2, 0, 0], [0.14, 1.0, 0.14]);
      b.add('darker', G.sph, [0, 0.4, 1.08], null, [0.42, 0.3, 0.55]);        // kepala ular
      b.add('darker', G.sph, [0, 0.28, 1.12], null, [0.36, 0.16, 0.5]);       // rahang bawah
      for (const sd of [-1, 1]) {
        b.add('accent', G.sph, [sd * 0.14, 0.5, 1.18], null, [0.08, 0.06, 0.1]);
        b.add('steel', G.cone, [sd * 0.08, 0.3, 1.32], [PI, 0, 0], [0.04, 0.16, 0.04]);
      }
      muzzleZ = 1.4; break;
    case 'nettle':
      /* sarang obor-obor: loceng lutsinar dengan enam "telur" obor-obor
         bercahaya mengelilingi teras, dan sesungut pendek berjuntai */
      b.add('dark', G.cyl, [0, 0.2, -0.1], null, [0.7, 0.3, 0.7]);
      b.add('accent', G.sph, [0, 0.55, 0.1], null, [0.75, 0.55, 0.75]);
      for (let i = 0; i < 6; i++) {
        const a2 = i / 6 * TAU;
        b.add('accent', G.sph, [Math.cos(a2) * 0.42, 0.45, 0.1 + Math.sin(a2) * 0.42], null, [0.2, 0.16, 0.2]);
        b.add('steel', G.cyl, [Math.cos(a2) * 0.42, 0.22, 0.1 + Math.sin(a2) * 0.42], null, [0.03, 0.3, 0.03]);
      }
      b.add('steel', G.torus, [0, 0.42, 0.1], [PI / 2, 0, 0], [0.8, 0.8, 0.3]);
      b.add('darker', G.cone, [0, 0.55, 0.75], [PI / 2, 0, 0], [0.32, 0.5, 0.32]);
      muzzleZ = 0.95; break;
    case 'juhag':
      /* raifal laser burst bullpup bersudut: dua rel tenaga biru selari,
         tiga gegelung pada laras, sel tenaga lutsinar dan garpu muncung */
      b.add('dark', G.box, [0, 0.32, -0.25], [0, 0, 0], [0.46, 0.4, 1.0]);
      b.add('darker', G.box, [0, 0.42, 0.45], [-0.12, 0, 0], [0.36, 0.22, 0.7]);   // bahu bersudut
      for (const x of [-0.1, 0.1]) {
        b.add('steel', G.box, [x, 0.36, 1.0], null, [0.07, 0.09, 1.3]);            // rel kembar
        b.add('accent', G.box, [x, 0.42, 1.0], null, [0.03, 0.03, 1.2]);
        b.add('steel', G.box, [x * 1.6, 0.36, 1.72], [0, x * 2.5, 0], [0.06, 0.14, 0.3]);  // garpu
      }
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.36, 0.7 + i * 0.3], null, [0.24, 0.24, 0.5]);
      b.add('accent', G.cyl, [0, 0.12, -0.35], null, [0.26, 0.34, 0.26]);           // sel tenaga bercahaya
      b.add('steel', G.torus, [0, 0.12, -0.35], [PI / 2, 0, 0], [0.16, 0.16, 0.3]);
      b.add('steel', G.box, [0, 0.62, -0.1], null, [0.1, 0.12, 0.55]);             // pembidik
      b.add('accent', G.sph, [0, 0.62, 0.2], null, [0.09, 0.09, 0.09]);
      muzzleZ = 1.8; break;
    case 'arbog':
      /* meriam sonik: corong utama dengan gelang resonans bertingkat, dua
         subwoofer bulat di sisi dan teras pulsa bercahaya di belakang */
      b.add('dark', G.rbox, [0, 0.34, -0.35], null, [0.8, 0.56, 0.7]);
      b.add('dark', G.cone, [0, 0.38, 0.55], [-PI / 2, 0, 0], [0.95, 1.1, 0.95]);
      b.add('accent', G.cone, [0, 0.38, 0.66], [-PI / 2, 0, 0], [0.74, 0.9, 0.74]);   // dalam corong bercahaya
      b.add('steel', G.torus, [0, 0.38, 1.1], null, [0.48, 0.48, 0.3]);             // bibir corong
      b.add('accent', G.cyl, [0, 0.38, 1.1], [PI / 2, 0, 0], [0.78, 0.04, 0.78]);
      for (let i = 0; i < 4; i++) b.add('accent', G.torus, [0, 0.38, 0.12 + i * 0.26], null, [0.26 + i * 0.1, 0.26 + i * 0.1, 0.18]);
      for (const sd of [-1, 1]) {
        b.add('dark', G.cyl, [sd * 0.5, 0.3, -0.3], [0, 0, PI / 2], [0.46, 0.16, 0.46]);   // subwoofer
        b.add('accent', G.cyl, [sd * 0.59, 0.3, -0.3], [0, 0, PI / 2], [0.24, 0.02, 0.24]);
        b.add('steel', G.torus, [sd * 0.59, 0.3, -0.3], [0, PI / 2, 0], [0.24, 0.24, 0.2]);
      }
      b.add('accent', G.sph, [0, 0.4, -0.75], null, [0.26, 0.26, 0.26]);           // teras pulsa
      muzzleZ = 1.15; break;
    case 'vulag':
      // kotak pelancar dengan tiga tiub condong ke langit + piring radar penguncian
      b.add('dark', G.rbox, [0, 0.3, -0.1], null, [0.82, 0.42, 1.0]);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.24;
        b.add('steel', G.cyl, [x, 0.66, 0.15], [0.7, 0, 0], [0.2, 0.9, 0.2]);
        b.add('accent', G.cyl, [x, 0.95, 0.48], [0.7, 0, 0], [0.16, 0.06, 0.16]);
      }
      b.add('darker', G.box, [0, 0.52, -0.2], [0.7, 0, 0], [0.82, 0.5, 0.12]);
      b.add('steel', G.cyl, [0.36, 0.62, -0.5], null, [0.05, 0.5, 0.05]);
      b.add('accent', G.sph, [0.36, 0.9, -0.5], null, [0.3, 0.12, 0.3]);
      muzzleZ = 0.6; break;
    case 'wily':
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.6, 0.5, 0.8]);
      // tangki cecair bulat di atas
      b.add('accent', G.sph, [0, 0.66, -0.15], null, [0.5, 0.44, 0.62]);
      b.add('steel', G.torus, [0, 0.66, -0.15], [PI / 2, 0, 0], [0.5, 0.5, 0.06]);
      // empat muncung, satu bagi setiap das dalam jujukan
      for (let i = 0; i < 4; i++) {
        const a2 = i / 4 * TAU + 0.78;
        b.add('steel', G.cyl, [Math.cos(a2) * 0.2, 0.32 + Math.sin(a2) * 0.2, 0.7],
          [PI / 2, 0, 0], [0.11, 1.0, 0.11]);
        b.add('accent', G.sph, [Math.cos(a2) * 0.2, 0.32 + Math.sin(a2) * 0.2, 1.2], null, [0.09, 0.09, 0.09]);
      }
      b.add('darker', G.cyl, [0, 0.32, 0.35], [PI / 2, 0, 0], [0.36, 0.6, 0.36]);
      muzzleZ = 1.35; break;
    case 'fist': {
      // omboh tumbuk: silinder hidraulik menolak kepala penumbuk berbuku jari
      b.add('dark', G.rbox, [0, 0.34, -0.22], null, [0.68, 0.56, 0.86]);
      b.add('darker', G.cyl, [0, 0.36, 0.42], [PI / 2, 0, 0], [0.52, 1.2, 0.52]);
      for (let i = 0; i < 3; i++) b.add('steel', G.torus, [0, 0.36, 0.0 + i * 0.36], [PI / 2, 0, 0], [0.56, 0.56, 0.13]);
      b.add('steel', G.cyl, [0, 0.36, 1.02], [PI / 2, 0, 0], [0.3, 0.6, 0.3]);      // rod omboh
      b.add('dark', G.rbox, [0, 0.36, 1.34], null, [0.62, 0.56, 0.36]);              // kepala penumbuk
      for (const x of [-0.17, 0.17]) for (const y of [0.24, 0.48]) {
        b.add('steel', G.cyl, [x, y, 1.5], [PI / 2, 0, 0], [0.16, 0.14, 0.16]);      // buku jari
      }
      for (const sd of [-1, 1]) b.add('dark', G.box, [sd * 0.38, 0.36, 0.35], null, [0.09, 0.4, 1.0]);
      b.add('hot', G.box, [0, 0.66, -0.05], null, [0.26, 0.05, 0.42]);               // lampu petunjuk kecil
      muzzleZ = 1.62; break;
    }
    default: {
      const mz = weaponModel2(id, b, G, HG);
      if (mz) muzzleZ = mz;
      else b.add('steel', G.cyl, [0, 0.26, 0.9], [PI / 2, 0, 0], [0.1, 1.0, 0.1]);
    }
  }
  if (!v3) weaponGreebles(b, !!mats.accent, muzzleZ);
  b.build(mats, root);
  /* bahagian hidup senjata 2026-10-18: kristal bahan api Diamond (mengecut ikut
     peluru) dan kipas Gale Hammer (berputar laju bila menembak) - main.js */
  let fuel = null, fan = null;
  if (id === 'diamond') {
    const c = W && W.color ? W.color : [1.4, 1.6, 2.4];
    const mx = Math.max(c[0], c[1], c[2]);
    const hue = new THREE.Color(c[0] / mx, c[1] / mx, c[2] / mx);
    fuel = new THREE.Group();
    fuel.position.set(0, 1.0, -0.3);
    const fm = new THREE.MeshStandardMaterial({ color: hue.clone().multiplyScalar(0.5), emissive: hue, emissiveIntensity: 0.9,
      roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, flatShading: true });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), fm);
    gem.scale.set(1, 1.9, 1); fuel.add(gem);
    const coreM = new THREE.MeshBasicMaterial({ color: hue.clone().lerp(new THREE.Color('#ffffff'), 0.6) });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), coreM);
    core.scale.set(1, 2.2, 1); fuel.add(core);
    fuel.userData.mat = fm;
    root.add(fuel);
  } else if (id === 'gale') {
    fan = new THREE.Group();
    fan.position.set(0, 0.4, 1.0);
    const bm = mats.blk;
    for (let i = 0; i < 6; i++) {
      const bl = new THREE.Mesh(G.box, bm);
      const a = i / 6 * TAU;
      bl.scale.set(0.09, 0.62, 0.05); bl.position.set(Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0); bl.rotation.set(0, 0.55, -a);
      fan.add(bl);
    }
    const hub = new THREE.Mesh(G.cyl, mats.accent); hub.scale.set(0.16, 0.2, 0.16); hub.rotation.x = PI / 2; fan.add(hub);
    root.add(fan);
  }

  const fam = famOf(id);
  const mv = addMovingParts(root, mats, fam, muzzleZ, id);
  /* badan v3 duduk atas buaian rendah - magazin generik dinaikkan supaya tidak
     terjuntai di bawah pelantar pusing */
  if (v3 && (fam === 'mag' || fam === 'bolt')) for (const m of mv.mag.children) m.position.y += 0.3;
  // pelancar v3 sudah menunjukkan peluru sendiri - roket generik keluarga 'tube' disorok
  if (v3 && fam === 'tube' && ['vulag', 'swarm', 'seeker', 'rocket', 'volley'].includes(id)) { mv.mag.clear(); mv.bolt.clear(); }

  root.traverse(o => { if (o.isMesh) o.castShadow = false; });     // prestasi: laluan bayang
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, id === 'tesla' || id === 'laser' ? 0.4 : 0.3, muzzleZ);
  root.add(muzzle);
  return { root, muzzle, spinner, mats, fam, mag: mv.mag, bolt: mv.bolt, glowMat: mv.glowMat, fuel, fan };
}

/* =======================================================================
   MUSUH — definisi "horde" (InstancedMesh, satu draw call per bahagian)
   ======================================================================= */
function im(geo, color, opts = {}) {
  return { geo, mat: mat(Object.assign({ color, roughness: 0.75, metalness: 0.08 }, opts)) };
}

const zTorso = new RoundedBoxGeometry(0.62, 0.78, 0.36, 2, 0.08);
const zHead = new THREE.SphereGeometry(0.2, 10, 8);
const zLimb = new RoundedBoxGeometry(0.17, 0.62, 0.17, 2, 0.06);
const zLeg = new RoundedBoxGeometry(0.2, 0.68, 0.2, 2, 0.07);

export const HORDES = {
  zombie: {
    max: 140,
    parts: [
      im(zTorso, 0xffffff),
      im(zHead, 0xffffff),
      im(zLimb, 0xffffff),
      im(zLimb, 0xffffff),
      im(zLeg, 0xffffff),
      im(zLeg, 0xffffff),
    ],
    skinParts: [1, 2, 3],
    pose(e, t, h) {
      const s = e.bulk, w = e.walk;
      const sw = Math.sin(w) * 0.55;
      const lean = 0.16 + Math.sin(w * 2) * 0.05;
      h.set(0, 0, 0.96 * s, 0, lean, 0, 0, s * e.wide, s, s);
      h.set(1, 0, 1.44 * s, 0.06 * s, 0.25 + lean, Math.sin(w * 0.5) * 0.3, 0, s, s, s);
      h.set(2, -0.42 * s * e.wide, 1.16 * s, 0.24 * s, -1.25 + sw * 0.35, 0, -0.2, s, s, s);
      h.set(3, 0.42 * s * e.wide, 1.16 * s, 0.24 * s, -1.25 - sw * 0.35, 0, 0.2, s, s, s);
      h.set(4, -0.17 * s, 0.4 * s, 0, sw, 0, 0, s, s, s);
      h.set(5, 0.17 * s, 0.4 * s, 0, -sw, 0, 0, s, s, s);
    },
  },
  swarmer: {
    max: 90,
    parts: [
      im(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), 0xffffff, { roughness: 0.4, metalness: 0.4 }),
      im(new THREE.ConeGeometry(0.16, 0.5, 6), 0xffffff, { roughness: 0.4, metalness: 0.4 }),
      im(new RoundedBoxGeometry(0.08, 0.5, 0.08, 1, 0.03), 0xffffff, { roughness: 0.5 }),
      im(new RoundedBoxGeometry(0.08, 0.5, 0.08, 1, 0.03), 0xffffff, { roughness: 0.5 }),
      im(new THREE.SphereGeometry(0.13, 8, 6), 0xffffff, { emissive: 0xff4bd8, emissiveIntensity: 3, roughness: 0.3 }),
    ],
    pose(e, t, h) {
      const s = e.bulk, w = e.walk;
      const hop = Math.abs(Math.sin(w)) * 0.18;
      h.set(0, 0, (0.5 + hop) * s, 0, PI / 2 - 0.3, 0, 0, s, s, s);
      h.set(1, 0, (0.55 + hop) * s, 0.42 * s, PI / 2, 0, 0, s, s, s);
      h.set(2, -0.2 * s, (0.3 + hop * 0.4) * s, 0.06 * s, Math.sin(w) * 0.9, 0, -0.5, s, s, s);
      h.set(3, 0.2 * s, (0.3 + hop * 0.4) * s, 0.06 * s, -Math.sin(w) * 0.9, 0, 0.5, s, s, s);
      h.set(4, 0, (0.62 + hop) * s, -0.3 * s, 0, 0, 0, s, s, s);
    },
  },
  drone: {
    max: 60,
    parts: [
      im(new THREE.IcosahedronGeometry(0.52, 0), 0xffffff, { roughness: 0.3, metalness: 0.7, flatShading: true }),
      im(new THREE.TorusGeometry(0.62, 0.08, 6, 18), 0xffffff, { emissive: 0x39f2d0, emissiveIntensity: 2.4, roughness: 0.3 }),
      im(new THREE.SphereGeometry(0.2, 10, 8), 0xffffff, { emissive: 0xff3860, emissiveIntensity: 3, roughness: 0.2 }),
      im(new THREE.ConeGeometry(0.3, 0.5, 8), 0xffffff, { roughness: 0.35, metalness: 0.6 }),
    ],
    pose(e, t, h) {
      const s = e.bulk, bob = Math.sin(t * 2.4 + e.seed) * 0.16;
      const tilt = clamp(e.spd * 0.02, -0.4, 0.4);
      h.set(0, 0, e.hover + bob, 0, tilt, 0, 0, s * 1.25, s * 0.62, s * 1.25);
      h.set(1, 0, e.hover + bob - 0.04, 0, PI / 2 + tilt, e.spin, 0, s, s, s);
      h.set(2, 0, e.hover + bob - 0.04, 0.42 * s, tilt, 0, 0, s, s, s);
      h.set(3, 0, e.hover + bob - 0.3, 0, PI + tilt, 0, 0, s * 0.9, s * 0.7, s * 0.9);
    },
  },
  soldier: {
    max: 90,
    parts: [
      im(new RoundedBoxGeometry(0.56, 0.72, 0.34, 2, 0.08), 0xffffff, { roughness: 0.8 }),
      im(new THREE.SphereGeometry(0.2, 10, 8), 0xffffff, { roughness: 0.6 }),
      im(new RoundedBoxGeometry(0.16, 0.58, 0.16, 1, 0.05), 0xffffff, { roughness: 0.8 }),
      im(new RoundedBoxGeometry(0.16, 0.58, 0.16, 1, 0.05), 0xffffff, { roughness: 0.8 }),
      im(new RoundedBoxGeometry(0.19, 0.66, 0.19, 1, 0.06), 0xffffff, { roughness: 0.85 }),
      im(new RoundedBoxGeometry(0.19, 0.66, 0.19, 1, 0.06), 0xffffff, { roughness: 0.85 }),
      im(new RoundedBoxGeometry(0.1, 0.14, 0.9, 1, 0.03), 0xffffff, { roughness: 0.5, metalness: 0.6 }),
    ],
    pose(e, t, h) {
      const s = e.bulk, w = e.walk, sw = Math.sin(w) * (e.moving ? 0.6 : 0.05);
      const aim = e.aimPitch || 0;
      h.set(0, 0, 0.98 * s, 0, 0.06, 0, 0, s, s, s);
      h.set(1, 0, 1.46 * s, 0, 0.05, 0, 0, s * 1.08, s, s * 1.08);
      h.set(2, -0.36 * s, 1.16 * s, 0.16 * s, -1.4 + aim, 0, -0.15, s, s, s);
      h.set(3, 0.36 * s, 1.14 * s, 0.2 * s, -1.5 + aim, 0, 0.1, s, s, s);
      h.set(4, -0.16 * s, 0.4 * s, 0, sw, 0, 0, s, s, s);
      h.set(5, 0.16 * s, 0.4 * s, 0, -sw, 0, 0, s, s, s);
      h.set(6, 0.12 * s, 1.16 * s, 0.5 * s, aim, 0, 0, s, s, s);
    },
  },
};

/* =======================================================================
   MUSUH BESAR (mesh biasa)
   ======================================================================= */
/* Templat musuh besar: geometri dibina SEKALI sahaja bagi setiap jenis,
   kemudian setiap musuh baharu hanya klon (berkongsi geometri) dengan
   bahan sendiri (untuk kelipan warna bila kena tembak). Dahulu setiap jeep
   / kereta kebal membina & mencantum geometri baharu semasa muncul — itu
   punca tersekat pada gelombang yang banyak kenderaan, dan geometri itu
   tidak pernah dibuang. */
const ENEMY_TPL = {};
export function enemyInstance(key, fn) {
  let t = ENEMY_TPL[key];
  if (!t) {
    t = fn();
    if (t.turret) t.turret.name = '__turret';
    if (t.muzzle) t.muzzle.name = '__muzzle';
    if (t.wheels) t.wheels.forEach((w, i) => { w.name = '__wheel' + i; });
    ENEMY_TPL[key] = t;
  }
  const root = t.root.clone(true);
  const mats = {}, map = new Map();
  for (const k in t.mats) { mats[k] = t.mats[k].clone(); map.set(t.mats[k], mats[k]); }
  root.traverse(o => { if (o.isMesh && map.has(o.material)) o.material = map.get(o.material); });
  const out = { root, mats };
  if (t.turret) out.turret = root.getObjectByName('__turret');
  if (t.muzzle) out.muzzle = root.getObjectByName('__muzzle');
  if (t.wheels) out.wheels = t.wheels.map((w, i) => root.getObjectByName('__wheel' + i));
  return out;
}

/* Kereta bot (mod pasukan): kereta pemain dengan senjata terpasang dan gelang
   warna pasukan di bawahnya. Dibina sekali bagi setiap gabungan, kemudian diklon. */
/* PENGOPTIMUMAN (2026-10-17): kereta bot dahulu ~50-100 mesh setiap satu
   (pod hover, roda rantai, bahagian senjata), jadi 9 bot = 400-600 draw call -
   berat di laptop & telefon. Bot tidak menganimasikan roda/pod, jadi SEMUA mesh
   statik dicantum menjadi SATU mesh setiap bahan. Hanya kumpulan turet dikekalkan
   (bot memusingkannya), dan isi setiap turet juga dicantum. Mesh tidak kelihatan
   (kon lampu bot opacity 0) dibuang terus. */
const _mm = new THREE.Matrix4(), _mi = new THREE.Matrix4();
function bakeInto(lists, mesh, toLocal) {
  const mt = mesh.material;
  if (!mesh.visible || !mt || Array.isArray(mt) || (mt.transparent && mt.opacity <= 0.01)) return;
  const src = mesh.geometry;
  const base = src.index ? src.toNonIndexed() : src.clone();
  for (const k of Object.keys(base.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') base.deleteAttribute(k);
  if (!base.attributes.normal) base.computeVertexNormals();
  if (!base.attributes.uv) base.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(base.attributes.position.count * 2), 2));
  base.clearGroups();
  mesh.updateWorldMatrix(true, false);
  const L = lists.get(mt) || (lists.set(mt, []), lists.get(mt));
  const n = mesh.isInstancedMesh ? mesh.count : 1;
  for (let i = 0; i < n; i++) {
    const g = n > 1 || mesh.isInstancedMesh ? base.clone() : base;
    _mm.copy(mesh.matrixWorld);
    if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, _mi); _mm.multiply(_mi); }
    g.applyMatrix4(_mm.premultiply(toLocal));
    L.push(g);
  }
}
/* bahan yang SAMA rupanya (klon steel/dark setiap senjata) dikongsi supaya
   lebih banyak geometri boleh dicantum ke dalam satu draw call */
function matSig(m) {
  const c = m.color ? m.color.getHexString() : '', e = m.emissive ? m.emissive.getHexString() : '';
  return [m.type, c, e, m.emissiveIntensity, m.metalness, m.roughness, m.transparent, m.opacity, m.blending, !!m.map, !!m.roughnessMap, m.side, m.wireframe].join('|');
}
function flatten(node, keep, canon, shadowMats) {
  node.updateWorldMatrix(true, true);
  const toLocal = new THREE.Matrix4().copy(node.matrixWorld).invert();
  const lists = new Map(), dead = [];
  node.traverse(o => {
    if (o === node) return;
    for (let q = o; q && q !== node; q = q.parent) if (keep.has(q)) return;   // isi turet diurus berasingan
    if (o.isMesh) {
      if (canon && o.material && !Array.isArray(o.material)) {
        const k = matSig(o.material);
        if (!canon.has(k)) canon.set(k, o.material);
        o.material = canon.get(k);
      }
      bakeInto(lists, o, toLocal); dead.push(o);
    }
  });
  for (const o of dead) o.parent.remove(o);
  for (const [mt, L] of lists) {
    if (!L.length) continue;
    const g = L.length === 1 ? L[0] : mergeGeometries(L, false);
    if (!g) continue;
    const m = new THREE.Mesh(g, mt);
    m.castShadow = !mt.transparent && (!shadowMats || shadowMats.has(mt)); m.receiveShadow = false;
    if (mt.transparent) m.renderOrder = 3;
    node.add(m);
  }
}
/* keepTurrets=false: turet juga dicantum (senjata bot kekal menghala ke hadapan
   kereta) - draw call bot turun ke ~8-12 setiap kereta. `prefer` = bahan kereta
   yang mesti kekal (bahan kilat kena tembak bot dipetakan kepadanya). */
export function flattenCar(root, turrets, keepTurrets, prefer) {
  const canon = new Map();
  for (const m of prefer || []) if (m) { const k = matSig(m); if (!canon.has(k)) canon.set(k, m); }
  const keep = new Set(keepTurrets ? turrets.filter(Boolean) : []);
  const sh = new Set((prefer || []).filter(Boolean));
  for (const t of keep) flatten(t, new Set(), canon, sh);
  flatten(root, keep, canon, sh);
}

export function botCarInstance(spec) {
  const key = 'bot_' + spec.key;
  let t = ENEMY_TPL[key];
  if (!t) {
    const car = buildCar(spec.color, Object.assign({}, spec.spec, { slots: spec.slots }));
    if (car.beamMat) car.beamMat.opacity = 0;
    if (car.setDeploy) car.setDeploy(1);        // bot Hamvog dipaparkan dengan lengan terbuka
    car.turrets.forEach((tu, i) => {
      tu.name = '__t' + i;
      const id = spec.weapons[i % spec.weapons.length];
      if (!id) return;
      const m = buildWeaponModel(id);
      m.root.scale.setScalar(car.mountScale || 1);
      tu.add(m.root);
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.75, 40),
      new THREE.MeshBasicMaterial({ color: spec.team === 'A' ? 0x3fa9ff : 0xff4a3a, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -PI / 2; ring.position.y = 0.08;
    flattenCar(car.root, car.turrets, false, ['body', 'dark', 'steel', 'darker'].map(k => car.mats[k]));
    car.root.add(ring);
    const mats = {};
    for (const k of ['body', 'dark', 'steel', 'darker']) if (car.mats[k]) mats[k] = car.mats[k];
    t = { root: car.root, mats, n: car.turrets.length };
    ENEMY_TPL[key] = t;
  }
  const root = t.root.clone(true);
  const mats = {}, map = new Map();
  for (const k in t.mats) { mats[k] = t.mats[k].clone(); map.set(t.mats[k], mats[k]); }
  root.traverse(o => { if (o.isMesh && map.has(o.material)) o.material = map.get(o.material); });
  const turrets = [];
  for (let i = 0; i < t.n; i++) turrets.push(root.getObjectByName('__t' + i));
  return { root, mats, turrets };
}

export function buildHulk() {
  const root = new THREE.Group();
  const b = new Builder();
  const mats = { sh: MATS.chitin.clone(), glow: MATS.neonM.clone(), steel: MATS.steel.clone() };
  b.add('sh', G.rbox, [0, 2.1, 0], null, [2.2, 2.0, 1.4]);
  b.add('sh', G.rbox, [0, 3.3, 0.1], null, [1.1, 0.8, 1.0]);
  b.add('glow', G.sph, [0, 2.3, 0.72], null, [0.7, 0.7, 0.3]);
  b.add('glow', G.sph, [-0.26, 3.35, 0.55], null, [0.2, 0.2, 0.2]);
  b.add('glow', G.sph, [0.26, 3.35, 0.55], null, [0.2, 0.2, 0.2]);
  for (const s of [-1, 1]) {
    b.add('sh', G.rbox, [s * 1.5, 2.6, 0], null, [0.9, 0.9, 0.9]);
    b.add('sh', G.rbox, [s * 1.6, 1.5, 0.2], null, [0.55, 1.6, 0.55]);
    b.add('glow', G.box, [s * 1.62, 1.5, 0.48], null, [0.12, 1.2, 0.06]);
    b.add('sh', G.rbox, [s * 0.6, 0.6, 0], null, [0.75, 1.3, 0.8]);
  }
  b.build(mats, root);
  return { root, mats };
}

export function buildJeep(colorHex = 0x4a5340) {
  const root = new THREE.Group();
  const mats = { body: mat({ color: colorHex, metalness: 0.5, roughness: 0.7 }), dark: MATS.darker.clone(), steel: MATS.steel.clone() };
  const b = new Builder();
  b.add('body', G.rbox, [0, 0.72, 0], null, [1.7, 0.5, 3.4]);
  b.add('body', G.rbox, [0, 1.0, 0.9], null, [1.5, 0.3, 1.2]);
  b.add('dark', G.rbox, [0, 1.1, -0.6], null, [1.4, 0.5, 1.2]);
  b.add('steel', G.cyl, [0, 1.5, -0.6], null, [0.3, 0.3, 0.3]);
  b.add('dark', G.rbox, [0, 1.72, -0.35], null, [0.24, 0.24, 1.1]);
  b.add('steel', G.cyl, [0, 1.72, 0.25], [PI / 2, 0, 0], [0.07, 0.8, 0.07]);
  for (const s of [-1, 1]) b.add('steel', G.box, [s * 0.75, 1.3, -0.1], null, [0.07, 0.9, 0.07]);
  b.add('steel', G.box, [0, 1.75, -0.1], null, [1.6, 0.07, 0.07]);
  b.build(mats, root);
  const wheels = [];
  const tg = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12);
  for (const [x, z] of [[0.8, 1.1], [-0.8, 1.1], [0.8, -1.15], [-0.8, -1.15]]) {
    const m = new THREE.Mesh(tg, MATS.rubber);
    m.rotation.z = PI / 2; m.position.set(x, 0.42, z);
    m.castShadow = true; root.add(m); wheels.push(m);
  }
  return { root, mats, wheels };
}

export function buildTank(colorHex = 0x55583f) {
  const root = new THREE.Group();
  const mats = { body: mat({ color: colorHex, metalness: 0.6, roughness: 0.65 }), dark: MATS.darker.clone(), steel: MATS.steel.clone() };
  const b = new Builder();
  b.add('body', G.rbox, [0, 0.95, 0], null, [2.6, 0.7, 4.4]);
  b.add('body', G.rbox, [0, 1.3, 1.5], [0.4, 0, 0], [2.4, 0.5, 1.2]);
  for (const s of [-1, 1]) {
    b.add('dark', G.rbox, [s * 1.5, 0.6, 0], null, [0.7, 1.0, 4.6]);
    for (let i = -2; i <= 2; i++) b.add('steel', G.cyl, [s * 1.5, 0.5, i * 0.95], [0, 0, PI / 2], [0.4, 0.74, 0.4]);
  }
  b.build(mats, root);

  const turret = new THREE.Group();
  turret.position.set(0, 1.4, -0.3);
  const tb = new Builder();
  tb.add('body', G.rbox, [0, 0.25, 0], null, [2.0, 0.6, 2.2]);
  tb.add('body', G.rbox, [0, 0.25, 1.0], null, [1.0, 0.45, 0.8]);
  tb.add('steel', G.cyl, [0, 0.28, 2.1], [PI / 2, 0, 0], [0.19, 2.6, 0.19]);
  tb.add('steel', G.cyl, [0, 0.28, 3.3], [PI / 2, 0, 0], [0.26, 0.5, 0.26]);
  tb.add('dark', G.rbox, [0.7, 0.62, -0.3], null, [0.5, 0.3, 0.6]);
  tb.build(mats, turret);
  root.add(turret);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 1.68, 3.5);
  root.add(muzzle);
  return { root, turret, muzzle, mats };
}

/* ---------- BOS ---------- */
export function buildBoss(kind) {
  const root = new THREE.Group();
  const mats = {
    sh: mat({ color: kind === 'alien' ? 0x2a1040 : kind === 'war' ? 0x3a3d2a : 0x4a3a2a, metalness: 0.55, roughness: 0.55 }),
    glow: mat({
      color: 0x110011,
      emissive: kind === 'alien' ? 0xff3bd0 : kind === 'war' ? 0xffa030 : 0x8bff4a,
      emissiveIntensity: 3, roughness: 0.3,
    }),
    steel: MATS.steel.clone(),
  };
  const b = new Builder();
  if (kind === 'alien') {
    // kapal induk kecil
    b.add('sh', G.ico1, [0, 4.2, 0], null, [5.2, 2.2, 5.2]);
    b.add('sh', G.cyl, [0, 3.2, 0], null, [3.0, 1.2, 3.0]);
    b.add('glow', G.torus, [0, 3.0, 0], [PI / 2, 0, 0], [7.0, 7.0, 1.6]);
    b.add('glow', G.sph, [0, 2.6, 0], null, [1.6, 1.0, 1.6]);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      b.add('glow', G.sph, [Math.cos(a) * 2.6, 3.1, Math.sin(a) * 2.6], null, [0.5, 0.4, 0.5]);
    }
  } else if (kind === 'war') {
    // kereta kebal berat
    b.add('sh', G.rbox, [0, 1.3, 0], null, [4.4, 1.2, 7.0]);
    b.add('sh', G.rbox, [0, 2.4, -0.5], null, [3.2, 1.0, 3.4]);
    b.add('steel', G.cyl, [-0.7, 2.5, 3.0], [PI / 2, 0, 0], [0.3, 4.4, 0.3]);
    b.add('steel', G.cyl, [0.7, 2.5, 3.0], [PI / 2, 0, 0], [0.3, 4.4, 0.3]);
    b.add('glow', G.box, [0, 3.0, -0.5], null, [1.6, 0.22, 1.6]);
    for (const s of [-1, 1]) {
      b.add('sh', G.rbox, [s * 2.4, 0.9, 0], null, [1.0, 1.5, 7.2]);
      for (let i = -3; i <= 3; i++) b.add('steel', G.cyl, [s * 2.4, 0.75, i * 1.0], [0, 0, PI / 2], [0.6, 1.06, 0.6]);
    }
  } else {
    // raksasa zombie
    b.add('sh', G.rbox, [0, 3.0, 0], null, [3.4, 3.0, 2.0]);
    b.add('sh', G.sph, [0, 4.9, 0.2], null, [1.5, 1.5, 1.5]);
    b.add('glow', G.sph, [-0.4, 5.0, 0.9], null, [0.28, 0.28, 0.28]);
    b.add('glow', G.sph, [0.4, 5.0, 0.9], null, [0.28, 0.28, 0.28]);
    b.add('glow', G.box, [0, 2.6, 1.02], null, [1.6, 1.2, 0.1]);
    for (const s of [-1, 1]) {
      b.add('sh', G.rbox, [s * 2.2, 3.6, 0], null, [1.2, 1.2, 1.2]);
      b.add('sh', G.rbox, [s * 2.4, 2.0, 0.2], null, [0.8, 2.6, 0.8]);
      b.add('sh', G.rbox, [s * 2.5, 0.6, 0.3], null, [1.0, 1.0, 1.4]);
      b.add('sh', G.rbox, [s * 0.9, 0.9, 0], null, [1.1, 1.9, 1.2]);
    }
  }
  b.build(mats, root);
  return { root, mats };
}

/* =======================================================================
   PROP ARENA
   ======================================================================= */
export function propDefs(theme) {
  const rock = new THREE.IcosahedronGeometry(1, 0);
  const defs = [];
  defs.push({
    name: 'rock', geo: rock, mat: mat({ color: theme === 'alien' ? 0x3a2b52 : 0x6b675e, roughness: 1, metalness: 0, flatShading: true }),
    radius: 1.5, make: (o) => { o.scale.set(rand(1.2, 2.6), rand(0.9, 2.0), rand(1.2, 2.6)); o.rotation.set(rand(TAU), rand(TAU), rand(TAU)); },
  });
  defs.push({
    name: 'crate', geo: new RoundedBoxGeometry(1.4, 1.4, 1.4, 2, 0.06), mat: MATS.wood.clone(),
    radius: 1.0, make: (o) => { o.rotation.y = rand(TAU); o.position.y = 0.7; },
  });
  defs.push({
    name: 'barrel', geo: new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12), mat: mat({ color: 0x8a3b2a, roughness: 0.6, metalness: 0.5 }),
    radius: 0.7, make: (o) => { o.rotation.y = rand(TAU); o.position.y = 0.75; }, explosive: true,
  });
  defs.push({
    name: 'wall', geo: new RoundedBoxGeometry(4.2, 1.5, 0.7, 2, 0.08), mat: MATS.concrete.clone(),
    radius: 2.2, make: (o) => { o.rotation.y = rand(TAU); o.position.y = 0.75; },
  });
  defs.push({
    name: 'wreck', geo: new RoundedBoxGeometry(1.9, 1.1, 4.0, 2, 0.2), mat: mat({ color: 0x4a4038, roughness: 0.9, metalness: 0.6 }),
    radius: 2.0, make: (o) => { o.rotation.set(rand(-0.1, 0.1), rand(TAU), rand(-0.12, 0.12)); o.position.y = 0.55; },
  });
  return defs;
}

/* ---------- barang kutipan ---------- */
export function buildPickup(kind) {
  const g = new THREE.Group();
  let m;
  if (kind === 'hp') {
    m = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.7, 0.7, 2, 0.08), mat({ color: 0xffffff, roughness: 0.4 }));
    const cross = new THREE.Mesh(G.box, mat({ color: 0xff2b3d, emissive: 0xff2b3d, emissiveIntensity: 1.6 }));
    cross.scale.set(0.5, 0.16, 0.74); g.add(cross);
    const cross2 = cross.clone(); cross2.scale.set(0.16, 0.5, 0.74); g.add(cross2);
  } else if (kind === 'ammo') {
    m = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.5, 0.55, 2, 0.06), MATS.army.clone());
    const b2 = new THREE.Mesh(G.box, mat({ color: 0xffcf5a, emissive: 0xffb020, emissiveIntensity: 1.2 }));
    b2.scale.set(0.5, 0.1, 0.3); b2.position.y = 0.3; g.add(b2);
  } else if (kind === 'scrap') {
    m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), mat({
      color: 0x9aa4b0, metalness: 0.9, roughness: 0.45, flatShading: true,
    }));
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 6), MATS.rust.clone());
    bolt.rotation.z = PI / 3;
    g.add(bolt);
  } else if (kind === 'coin' || kind === 'credit') {
    m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12), mat({ color: 0xffd257, emissive: 0xffa500, emissiveIntensity: 0.9, metalness: 1, roughness: 0.25 }));
    m.rotation.x = PI / 2;
  } else { // powerup
    m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat({ color: 0x1a2a3a, emissive: 0x4fd1ff, emissiveIntensity: 2.4, roughness: 0.3 }));
  }
  m.castShadow = true;
  g.add(m);
  return g;
}

export { G as GEO };


/* ---------- periuk api (kereta Trapper) ---------- */
export function buildMine() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.24, 10), MATS.darker.clone());
  body.castShadow = true;
  g.add(body);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat({
    color: 0x220000, emissive: 0xff3020, emissiveIntensity: 3, roughness: 0.3,
  }));
  led.position.y = 0.17;
  g.add(led);
  g.userData.led = led;
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(G.box, MATS.steel.clone());
    s.scale.set(0.07, 0.2, 0.07);
    const a = i / 3 * TAU;
    s.position.set(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3);
    g.add(s);
  }
  return g;
}

/* ---------- pemancar teleport (kereta Phantom) ---------- */
export function buildBeacon() {
  const g = new THREE.Group();
  const m = mat({ color: 0x1a0a2a, emissive: 0xc58bff, emissiveIntensity: 3, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.2, 8), MATS.darker.clone());
  base.castShadow = true;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.7, 6), m);
  pole.position.y = 0.95;
  g.add(pole);
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), m);
  orb.position.y = 1.95;
  g.add(orb);
  g.userData.orb = orb;
  return g;
}


/* ---------- decoy beacon that pulls enemy fire (Mirage) ---------- */
export function buildDecoy() {
  const g = new THREE.Group();
  const m = {
    dark: MATS.darker.clone(), steel: MATS.steel.clone(),
    glow: mat({ color: 0x0a1418, emissive: 0xff5a3c, emissiveIntensity: 3, roughness: 0.3 }),
  };
  const bb = new Builder();
  bb.add('dark', G.cyl, [0, 0.25, 0], null, [1.5, 0.5, 1.5]);
  bb.add('steel', G.cyl, [0, 1.1, 0], null, [0.22, 1.7, 0.22]);
  for (let i = 0; i < 3; i++) bb.add('glow', G.torus, [0, 0.8 + i * 0.45, 0], [PI / 2, 0, 0], [0.75, 0.75, 0.2]);
  bb.add('glow', G.sph, [0, 2.1, 0], null, [0.42, 0.42, 0.42]);
  bb.build(m, g);
  g.userData.mats = m;
  return g;
}

/* ---------- autonomous wingman drone (Sovereign) ---------- */
export function buildWingDrone() {
  const g = new THREE.Group();
  const m = {
    dark: MATS.dark.clone(), steel: MATS.steel.clone(),
    glow: mat({ color: 0x0a0f18, emissive: 0x7de3ff, emissiveIntensity: 2.8, roughness: 0.3 }),
  };
  const bb = new Builder();
  bb.add('dark', G.ico, [0, 0, 0], null, [1.1, 0.6, 1.3]);
  bb.add('glow', G.torus, [0, -0.05, 0], [PI / 2, 0, 0], [1.4, 1.4, 0.22]);
  bb.add('steel', G.cyl, [0, -0.1, 0.5], [PI / 2, 0, 0], [0.11, 0.9, 0.11]);
  bb.add('glow', G.sph, [0, 0.16, -0.2], null, [0.2, 0.2, 0.2]);
  bb.build(m, g);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.1, 1.0);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

/* ---------- dron serang Kefly: terbang terus ke musuh lalu meletup ---------- */
export function buildStrikeDrone() {
  const g = new THREE.Group();
  const m = {
    dark: MATS.dark.clone(), steel: MATS.steel.clone(),
    glow: mat({ color: 0x180a0a, emissive: 0xff6a3a, emissiveIntensity: 3.0, roughness: 0.3 }),
  };
  const bb = new Builder();
  bb.add('dark', G.cone, [0, 0, 0.55], [PI / 2, 0, 0], [0.62, 1.5, 0.62]);   // hulu peledak
  bb.add('steel', G.rbox, [0, 0, -0.3], null, [0.5, 0.36, 1.0]);
  for (const sd of [-1, 1]) {
    bb.add('steel', G.box, [sd * 0.62, 0.04, -0.15], null, [0.95, 0.05, 0.34]);
    bb.add('glow', G.cyl, [sd * 0.95, 0.1, -0.15], null, [0.42, 0.06, 0.42]);
  }
  bb.add('glow', G.sph, [0, 0.12, -0.75], null, [0.26, 0.26, 0.26]);
  bb.add('dark', G.box, [0, -0.2, -0.7], null, [0.06, 0.4, 0.5]);
  bb.build(m, g);
  return g;
}

/* ---------- turet yang dipasang di tanah (kereta Sentinel) ---------- */
export function buildTurret(accent = '#ffb23f') {
  const g = new THREE.Group();
  const m = {
    dark: MATS.darker.clone(), steel: MATS.steel.clone(),
    glow: mat({ color: 0x0a0a12, emissive: new THREE.Color(accent), emissiveIntensity: 2.8, roughness: 0.35 }),
  };
  const bb = new Builder();
  bb.add('dark', G.cyl, [0, 0.22, 0], null, [1.7, 0.45, 1.7]);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU;
    bb.add('steel', G.box, [Math.cos(a) * 0.85, 0.12, Math.sin(a) * 0.85], [0, -a, 0], [0.5, 0.2, 0.22]);
  }
  bb.build(m, g);

  const head = new THREE.Group();
  head.position.y = 0.55;
  const hb = new Builder();
  hb.add('dark', G.rbox, [0, 0.1, 0], null, [0.8, 0.5, 1.0]);
  hb.add('steel', G.cyl, [-0.18, 0.12, 0.8], [PI / 2, 0, 0], [0.1, 1.2, 0.1]);
  hb.add('steel', G.cyl, [0.18, 0.12, 0.8], [PI / 2, 0, 0], [0.1, 1.2, 0.1]);
  hb.add('glow', G.sph, [0, 0.4, -0.1], null, [0.24, 0.24, 0.24]);
  hb.build(m, head);
  g.add(head);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.12, 1.4);
  head.add(muzzle);
  g.userData.head = head;
  g.userData.muzzle = muzzle;
  return g;
}

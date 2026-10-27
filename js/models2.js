// models2.js — 10 kereta baharu (2026-10-17) + model senjata tandatangan mereka.
//
// Peraturan Nabil: kereta baharu mesti SILUET dan CARA GERAK yang belum ada,
// bukan hiasan atas casis kotak + roda. Setiap entri BODY2 ada:
//   hull(b, G, HG)   -> bahagian statik (dicantum, satu draw call setiap bahan)
//   limb(ctx)        -> bahagian bergerak + titik senjata; pulangkan animate(st)
// animate(st) dipanggil setiap bingkai oleh updatePlayer dan pratonton garaj.
//   st = { fwd, lat, steer, time, dt, dist, p (null di garaj), g }
import * as THREE from 'three';

const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function glowMat(hex, k = 2.4) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(0.25), emissive: new THREE.Color(hex), emissiveIntensity: k, roughness: 0.35 });
}
/* titik senjata: tapak bulat + gelang, sama gaya dengan kereta lain */
function mountAt(ctx, x, y, z, parent) {
  const { Builder, G, mats, mountScale } = ctx;
  const par = parent || ctx.root;
  const rb = new Builder();
  rb.add('dark', G.cyl, [x, y - 0.1, z], null, [0.86 * mountScale, 0.16, 0.86 * mountScale]);
  rb.add('steel', G.torus, [x, y - 0.04, z], [PI / 2, 0, 0], [0.86 * mountScale, 0.86 * mountScale, 0.42]);
  rb.build({ dark: mats.dark, steel: mats.steel }, par);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  par.add(g);
  ctx.turrets.push(g);
  return g;
}
function lamps(b, G, pts, r = 0.16) {
  for (const [x, y, z] of pts) {
    b.add('steel', G.cyl, [x, y, z - 0.03], [PI / 2, 0, 0], [r * 2.3, 0.1, r * 2.3]);
    b.add('head', G.cyl, [x, y, z], [PI / 2, 0, 0], [r * 2, 0.06, r * 2]);
  }
}
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
/* anggota antara dua titik: silinder/kotak yang hujungnya TEPAT pada sendi,
   jadi kaki dan tangan tidak nampak bercerai */
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _u = new THREE.Vector3(0, 1, 0), _w = new THREE.Vector3();
function seg(b, key, geo, a, c, r, rz) {
  _w.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = _w.length() || 1e-3;
  _q.setFromUnitVectors(_u, _w.normalize());
  _e.setFromQuaternion(_q);
  b.add(key, geo, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], [_e.x, _e.y, _e.z], [r, len, rz === undefined ? r : rz]);
}
/* lengkung (bezier kuadratik) yang dibina daripada beberapa seg mengecil */
function curve(b, key, geo, p0, p1, p2, n, r0, r1) {
  const P = t => [0, 1, 2].map(i => (1 - t) * (1 - t) * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]);
  for (let i = 0; i < n; i++) {
    const a = P(i / n), c = P((i + 1) / n), r = r0 + (r1 - r0) * (i / (n - 1 || 1));
    seg(b, key, geo, a, c, r);
    b.add(key, _sph(), c, null, [r, r, r]);
  }
}
let _sg = null;
function _sph() { return _sg || (_sg = new THREE.SphereGeometry(0.5, 10, 8)); }

export const BODY2 = {
  /* ================= SPECTRE (dikemas 2026-10-17) =================
     Nabil: "cantik tapi berselerak". Kini satu bentuk siluman bersegi yang
     kemas (anak panah rata), dan TIGA pod hover dalam susunan SEGI TIGA bila
     dilihat dari atas: satu di hidung, dua di hujung sayap belakang. */
  spectre: {
    hull(b, G, HG) {
      b.add('body', ARROW(0.32), [0, 0.88, 0], null, [1, 1, 1]);                         // badan anak panah rata
      b.add('darker', ARROW(0.16), [0, 0.74, 0], null, [0.92, 1, 0.92]);                  // perut
      b.add('body', ARROW(0.3), [0, 1.16, 0.1], null, [0.42, 1, 0.62]);                   // tulang tengah timbul
      b.add('glass', HG.oct, [0, 1.35, 0.55], null, [0.7, 0.42, 1.3]);                    // kanopi bersegi
      for (const sd of [-1, 1]) {
        // garis tepi bercahaya sepanjang sayap
        seg(b, 'crys', G.box, [0, 1.22, 2.6], [sd * 1.75, 1.22, -1.7], 0.05, 0.05);
        seg(b, 'crys', G.box, [sd * 1.75, 1.22, -1.7], [0, 1.22, -1.05], 0.05, 0.05);
        b.add('body', G.box, [sd * 0.75, 1.55, -1.45], [0.3, 0, sd * 0.45], [0.08, 0.75, 0.75]);   // sirip ekor condong
        b.add('crys', G.box, [sd * 0.45, 1.05, -1.75], null, [0.5, 0.06, 0.05]);         // celah enjin
        // tupang ke pod hover belakang
        seg(b, 'dark', G.cyl, [sd * 1.0, 0.95, -0.95], [sd * 1.35, 0.6, -1.3], 0.16);
      }
      seg(b, 'dark', G.cyl, [0, 0.95, 1.3], [0, 0.6, 1.75], 0.16);
    },
    limb(ctx) {
      const { root, sp } = ctx;
      // pod hover bersegi siluman (models.js hoverPod 'prism') - dahulu cakera hitam
      const gm = glowMat(sp.accent, 2.4);
      const pods = [];
      for (const [x, z] of [[0, 1.85], [-1.4, -1.35], [1.4, -1.35]]) {
        const P = ctx.hoverPod('prism', sp.accent, { body: ctx.mats.body, dark: ctx.mats.dark, darker: ctx.mats.darker, steel: ctx.mats.steel, gold: ctx.mats.gold, glow: gm });
        P.g.position.set(x, 0.5, z);
        if (x) P.g.rotation.y = Math.sign(x) * 0.5;
        root.add(P.g); ctx.hoverParts.push(P); pods.push(P.g);
      }
      mountAt(ctx, -0.55, 1.38, -0.55);
      mountAt(ctx, 0.55, 1.38, -0.55);
      return st => {
        const bob = Math.sin(st.time * 3.2) * 0.07;
        if (st.p) st.p._bob = 0.2 + bob; else root.position.y = 0.2 + bob;
        pods.forEach((g, i) => { g.rotation.z = Math.sin(st.time * 2 + i) * 0.05 - (st.lat || 0) * 0.004; });
      };
    },
  },

  /* ================= JUGGERNAUT (dibina semula 2026-10-17) =================
     Nabil: "boring, bagi rancak, dia tank". Kekal atas rantai kereta kebal
     tetapi kini KUBU BERGERAK: casemate bercerancang, glasis bersudut dengan
     jalur amaran, bilah dozer bergigi, skirt perisai berivet, kupola dan
     cerobong. Kuasa Fortify = EMPAT KAKI SAUH hidraulik yang turun
     mencengkam tanah bila diaktifkan. */
  juggernaut: {
    hull(b, G, HG) {
      b.add('darker', G.box, [0, 0.72, 0], null, [2.5, 0.5, 4.9]);
      b.add('body', G.rbox, [0, 1.3, -0.1], null, [2.3, 0.8, 4.2]);
      b.add('body', G.box, [0, 1.38, 2.15], [-0.55, 0, 0], [2.3, 0.2, 1.3]);           // glasis
      b.add('body', G.box, [0, 1.35, -2.3], [0.5, 0, 0], [2.2, 0.2, 0.9]);
      for (let i = 0; i < 6; i++) b.add(i % 2 ? 'darker' : 'crys', G.box, [-0.95 + i * 0.38, 1.62, 2.0], [-0.55, 0, 0.6], [0.2, 0.05, 0.7]);  // jalur amaran
      // casemate kubu + cerancang
      b.add('body', HG.frust, [0, 2.05, -0.55], null, [2.0, 0.75, 2.6]);
      b.add('darker', G.box, [0, 2.44, -0.55], null, [1.45, 0.06, 1.9]);
      for (const [x, z] of [[-0.68, 0.35], [0, 0.35], [0.68, 0.35], [-0.68, -1.45], [0.68, -1.45], [-0.68, -0.55], [0.68, -0.55]])
        b.add('body', G.box, [x, 2.58, z], null, [0.3, 0.26, 0.3]);
      for (const sd of [-1, 1]) {
        b.add('glass', G.box, [sd * 0.86, 2.05, -0.4], [0, 0, sd * 0.3], [0.04, 0.12, 1.2]);   // celah tembak
        // skirt perisai atas rantai
        b.add('body', G.box, [sd * 1.42, 1.05, 0], null, [0.16, 0.75, 4.7]);
        b.add('crys', G.box, [sd * 1.5, 1.25, 0], null, [0.02, 0.08, 4.5]);
        for (let i = 0; i < 7; i++) b.add('steel', G.sph, [sd * 1.51, 0.85, -2.0 + i * 0.66], null, [0.1, 0.1, 0.1]);
        // cerobong
        b.add('dark', G.cyl, [sd * 0.92, 2.3, -2.0], null, [0.3, 1.3, 0.3]);
        b.add('hot', G.cyl, [sd * 0.92, 2.96, -2.0], null, [0.24, 0.04, 0.24]);
      }
      // bilah dozer bergigi
      b.add('steel', G.box, [0, 0.75, 2.75], [-0.3, 0, 0], [2.85, 0.9, 0.18]);
      b.add('dark', G.box, [0, 0.75, 2.62], [-0.3, 0, 0], [2.6, 0.7, 0.1]);
      for (let i = 0; i < 7; i++) b.add('steel', G.cone, [-1.2 + i * 0.4, 0.28, 2.95], [PI / 2 + 0.3, 0, 0], [0.16, 0.38, 0.16]);
      for (const sd of [-1, 1]) b.add('dark', G.cyl, [sd * 0.8, 1.0, 2.25], [PI / 2 - 0.3, 0, 0], [0.18, 0.9, 0.18]);
      // kupola komander
      b.add('dark', G.cyl, [0.55, 2.62, 0.75], null, [0.65, 0.3, 0.65]);
      b.add('glass', G.cyl, [0.55, 2.65, 0.75], null, [0.68, 0.08, 0.68]);
      lamps(b, G, [[-0.8, 1.45, 2.45], [0.8, 1.45, 2.45]], 0.13);
    },
    limb(ctx) {
      const { root, Builder, G, mats, autoTurret } = ctx;
      if (autoTurret) autoTurret.position.set(0, 2.5, -1.45);      // meriam auto atas casemate
      const anchors = [];
      for (const sd of [-1, 1]) for (const z of [1.55, -1.55]) {
        const pv = grp(root, sd * 1.5, 1.45, z);
        const ab = new Builder();
        ab.add('steel', G.sph, [0, 0, 0], null, [0.34, 0.34, 0.34]);
        seg(ab, 'dark', G.rbox, [0, 0, 0], [sd * 0.95, -1.15, 0], 0.26, 0.3);
        seg(ab, 'steel', G.cyl, [sd * 0.15, 0.1, 0.18], [sd * 0.8, -0.9, 0.18], 0.1);
        ab.add('steel', G.box, [sd * 1.05, -1.3, 0], [0, 0, sd * 0.3], [0.7, 0.12, 0.6]);  // tapak sauh
        ab.add('crys', G.box, [sd * 0.55, -0.6, 0.17], [0, 0, sd * 0.7], [0.5, 0.05, 0.02]);
        ab.build({ steel: mats.steel, dark: mats.dark, crys: mats.crys }, pv);
        anchors.push({ pv, sd, front: z > 0 });
      }
      mountAt(ctx, -0.62, 2.72, -0.15);
      mountAt(ctx, 0.62, 2.72, -0.15);
      mountAt(ctx, -0.95, 1.9, 1.35);
      mountAt(ctx, 0.95, 1.9, 1.35);
      let dep = 0;
      return st => {
        dep = damp(dep, st.p && st.p.abAnchor ? 1 : 0, 6, st.dt);
        // terlipat ke atas di sisi bila bergerak; turun mencengkam tanah semasa Fortify
        for (const a of anchors) {
          a.pv.rotation.z = a.sd * 0.69 * (1 - dep);
          a.pv.rotation.y = a.sd * (a.front ? 1.45 : -1.45) * (1 - dep);
        }
      };
    },
  },

  /* ================= VALKYRIE (dibina semula 2026-10-17) =================
     Nabil: "vision dah okay, cuma nampak buruk". Kekal helikopter tempur
     beroda, tetapi kini bentuk helikopter serang sebenar: fiusej tirus,
     kokpit tandem bertingkat, meriam dagu, sayap pendek berpod roket &
     peluru berpandu, ekor + rotor ekor, dan rotor utama yang BERPUTAR. */
  valkyrie: {
    hull(b, G) {
      b.add('body', G.sph, [0, 1.35, 0.1], null, [1.55, 1.45, 4.4]);                 // fiusej
      b.add('darker', G.sph, [0, 1.05, 0.2], null, [1.45, 0.8, 3.8]);
      b.add('body', G.cone, [0, 1.6, -3.0], [-PI / 2 - 0.06, 0, 0], [0.75, 3.0, 0.75]);   // batang ekor
      b.add('body', G.box, [0, 2.45, -4.35], [0.3, 0, 0], [0.12, 1.4, 0.75]);       // sirip ekor
      b.add('body', G.box, [0, 1.75, -4.0], null, [1.7, 0.08, 0.5]);                // penstabil
      // kokpit tandem: depan rendah, belakang tinggi
      b.add('glass', G.sph, [0, 1.75, 1.35], [-0.2, 0, 0], [0.95, 0.75, 1.15]);
      b.add('glass', G.sph, [0, 2.05, 0.45], [-0.15, 0, 0], [0.95, 0.75, 1.05]);
      b.add('steel', G.box, [0, 1.95, 0.9], [0.4, 0, 0], [1.0, 0.06, 0.06]);
      // meriam dagu
      b.add('dark', G.sph, [0, 0.72, 1.85], null, [0.55, 0.45, 0.55]);
      for (const x of [-0.08, 0.08]) b.add('steel', G.cyl, [x, 0.7, 2.45], [PI / 2, 0, 0], [0.08, 1.1, 0.08]);
      // menara rotor + enjin
      b.add('dark', G.cyl, [0, 2.45, -0.3], null, [0.3, 0.6, 0.3]);
      for (const sd of [-1, 1]) {
        b.add('body', G.rbox, [sd * 0.55, 2.15, -0.75], null, [0.45, 0.45, 1.5]);   // enjin
        b.add('dark', G.cyl, [sd * 0.55, 2.15, -1.55], [PI / 2, 0, 0], [0.38, 0.2, 0.38]);
        b.add('hot', G.cyl, [sd * 0.55, 2.15, -1.67], [PI / 2, 0, 0], [0.28, 0.03, 0.28]);
        // sayap pendek + pod roket + peluru berpandu
        b.add('body', G.box, [sd * 1.35, 1.3, -0.25], [0, 0, sd * -0.08], [1.7, 0.12, 0.85]);
        b.add('army', G.cyl, [sd * 1.15, 0.95, -0.15], [PI / 2, 0, 0], [0.42, 1.1, 0.42]);
        b.add('hot', G.cyl, [sd * 1.15, 0.95, 0.42], [PI / 2, 0, 0], [0.3, 0.03, 0.3]);
        for (const k of [0, 1]) {
          b.add('steel', G.cyl, [sd * (1.75 + k * 0.28), 1.0, -0.2], [PI / 2, 0, 0], [0.16, 0.9, 0.16]);
          b.add('hot', G.cone, [sd * (1.75 + k * 0.28), 1.0, 0.33], [PI / 2, 0, 0], [0.16, 0.2, 0.16]);
        }
        b.add('crys', G.box, [sd * 0.74, 1.3, 0.4], null, [0.04, 0.12, 2.4]);       // jalur amber sisi
        b.add('dark', G.box, [sd * 0.5, 0.55, 0.2], null, [0.1, 0.3, 2.6]);         // rangka gear
      }
      b.add('crys', G.box, [0, 1.25, 2.38], [0.6, 0, 0], [0.9, 0.08, 0.06]);
      lamps(b, G, [[0, 0.55, 2.2]], 0.16);
      b.add('tail', G.box, [0, 2.95, -4.5], null, [0.1, 0.12, 0.12]);
    },
    limb(ctx) {
      const { root, Builder, G, mats } = ctx;
      const rotor = grp(root, 0, 2.82, -0.3);
      const rb = new Builder();
      rb.add('steel', G.cyl, [0, 0, 0], null, [0.42, 0.2, 0.42]);
      for (let i = 0; i < 4; i++) {
        const a = i * PI / 2;
        rb.add('dark', G.box, [Math.sin(a) * 1.55, 0, Math.cos(a) * 1.55], [0, a, 0.05], [0.26, 0.05, 3.0]);
        rb.add('crys', G.box, [Math.sin(a) * 2.95, 0.03, Math.cos(a) * 2.95], [0, a, 0], [0.27, 0.02, 0.22]);   // hujung bercahaya
      }
      rb.build({ steel: mats.steel, dark: mats.dark, crys: mats.crys }, rotor);
      const tr = grp(root, 0.12, 2.5, -4.45);
      const tb = new Builder();
      for (let i = 0; i < 3; i++) tb.add('dark', G.box, [0, 0, 0], [i * PI / 3, 0, 0], [0.04, 1.1, 0.12]);
      tb.build({ dark: mats.dark }, tr);
      mountAt(ctx, -1.85, 1.5, -0.25);
      mountAt(ctx, 1.85, 1.5, -0.25);
      mountAt(ctx, -0.95, 1.48, -0.25);
      mountAt(ctx, 0.95, 1.48, -0.25);
      let spd = 2;
      return st => {
        const want = st.p && st.p.fly ? 30 : 4 + Math.abs(st.fwd || 0) * 0.3;
        spd = damp(spd, want, 2, st.dt);
        rotor.rotation.y += st.dt * spd;
        tr.rotation.x += st.dt * spd * 1.6;
      };
    },
  },

  /* ================= HYDRA (dibina semula 2026-10-17) =================
     Nabil: "simple dan buruk, bagi nampak ganas". Kuasa = Weapon Bloom (6
     senjata). Kini RAKSASA BERKEPALA: cangkerang berduri atas kaki ketam,
     empat leher ular dengan kepala ganas, setiap senjata menunggang satu
     kepala. Semasa Weapon Bloom dua kepala TAMBAHAN bangkit dari belakang
     membawa slot 5 & 6. */
  hydra: {
    hull(b, G) {
      b.add('body', G.sph, [0, 1.55, -0.4], null, [3.0, 1.5, 3.6]);                  // cangkerang
      b.add('darker', G.sph, [0, 1.2, -0.4], null, [2.9, 0.8, 3.5]);
      for (let r = 0; r < 3; r++) for (let i = -2; i <= 2; i++) {                   // plat berduri
        const x = i * 0.5, z = -1.5 + r * 0.85, y = 2.2 - Math.abs(i) * 0.18 - Math.abs(z + 0.4) * 0.2;
        b.add('darker', G.box, [x, y, z], [0.3, 0, x * 0.4], [0.42, 0.08, 0.7]);
        b.add('steel', G.cone, [x, y + 0.28, z - 0.15], [-0.4, 0, x * 0.4], [0.14, 0.5, 0.14]);
      }
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++)
        b.add('crys', G.box, [sd * 1.4, 1.5, -1.2 + k * 0.6], [0, 0, sd * 0.5], [0.06, 0.32, 0.36]);   // rekahan bercahaya
      b.add('body', G.cone, [0, 1.4, -2.3], [-PI / 2 - 0.2, 0, 0], [0.9, 1.6, 0.7]);   // ekor
    },
    limb(ctx) {
      const { root, Builder, G, mats, sp } = ctx;
      const lm = { body: mats.body, darker: mats.darker, steel: mats.steel, crys: mats.crys, dark: mats.dark };
      const eye = glowMat(sp.accent, 3);
      const necks = [];
      const neck = (bx, by, bz, hx, hy, hz, extra) => {
        const g = grp(root, bx, by, bz);
        const nb = new Builder();
        const H = [hx - bx, hy - by, hz - bz];
        curve(nb, 'body', G.cyl, [0, 0, 0], [H[0] * 0.2, H[1] * 0.9, H[2] * 0.1], H, 7, 0.62, 0.4);
        for (let k = 1; k < 6; k++) {                                              // sisik duri belakang leher
          const u = k / 6;
          nb.add('steel', G.cone, [H[0] * u * u, H[1] * (1.8 * u - 0.8 * u * u) + 0.3, H[2] * u * u - 0.12], [-0.5, 0, 0], [0.1, 0.32, 0.1]);
        }
        // kepala ular: tengkorak, rahang ternganga, taring, mata, tanduk
        nb.add('body', G.sph, [H[0], H[1] + 0.05, H[2] + 0.25], null, [0.72, 0.5, 1.05]);
        nb.add('darker', G.sph, [H[0], H[1] - 0.28, H[2] + 0.35], [0.35, 0, 0], [0.6, 0.22, 0.9]);
        for (const sd of [-1, 1]) {
          nb.add('steel', G.cone, [H[0] + sd * 0.17, H[1] - 0.18, H[2] + 0.68], [PI, 0, 0], [0.07, 0.3, 0.07]);
          nb.add('steel', G.cone, [H[0] + sd * 0.25, H[1] + 0.3, H[2] - 0.05], [-1.1, 0, sd * 0.4], [0.1, 0.55, 0.1]);
        }
        nb.build(lm, g);
        for (const sd of [-1, 1]) {
          const e = new THREE.Mesh(_sph(), eye); e.scale.set(0.12, 0.08, 0.12);
          e.position.set(H[0] + sd * 0.26, H[1] + 0.12, H[2] + 0.55); g.add(e);
        }
        mountAt(ctx, H[0], H[1] + 0.32, H[2] + 0.05, g);
        necks.push({ g, extra, ph: necks.length * 1.3 });
      };
      neck(-0.95, 2.0, 0.6, -1.5, 3.05, 1.35);
      neck(0.95, 2.0, 0.6, 1.5, 3.05, 1.35);
      neck(-0.35, 2.15, 0.9, -0.55, 3.55, 1.85);
      neck(0.35, 2.15, 0.9, 0.55, 3.55, 1.85);
      neck(-1.25, 1.9, -0.9, -2.0, 2.95, -0.2, true);       // kepala Weapon Bloom (slot 5)
      neck(1.25, 1.9, -0.9, 2.0, 2.95, -0.2, true);         // (slot 6)
      let open = 0;
      return st => {
        open = damp(open, st.g && st.g.tempSlots > 0 ? 1 : 0, 4, st.dt);
        for (const n of necks) {
          const sway = Math.sin(st.time * 1.6 + n.ph) * 0.05;
          n.g.rotation.z = sway;
          n.g.rotation.x = Math.sin(st.time * 1.1 + n.ph) * 0.04;
          if (n.extra) {
            const k = Math.max(0.02, open);
            n.g.scale.setScalar(0.25 + 0.75 * k);
            n.g.rotation.x = -1.1 * (1 - k) + n.g.rotation.x;
            n.g.visible = k > 0.03;
          }
        }
      };
    },
  },

  /* ================= SERAPH (dibina semula 2026-10-17) =================
     Nabil: "nampak buruk". Kuasa = Repair Pulse, jadi ia jadi POD PERUBATAN
     NANO: badan licin putih, palang bercahaya, teras pembaikan giroskop yang
     berputar di bumbung, dua lengan pembaiki berhujung cahaya, dan pemancar
     denyut di belakang. Terapung atas pod hover sedia ada. */
  seraph: {
    hull(b, G) {
      b.add('body', G.sph, [0, 1.25, -0.1], null, [2.1, 1.25, 4.3]);                 // badan licin
      b.add('darker', G.sph, [0, 0.95, -0.1], null, [2.15, 0.6, 4.1]);              // perut
      b.add('glass', G.sph, [0, 1.45, 1.05], [-0.25, 0, 0], [1.35, 0.7, 1.4]);      // kanopi
      b.add('steel', G.torus, [0, 1.25, -0.1], [PI / 2, 0, 0], [2.1, 4.3, 0.35]);    // jalur pinggang
      // palang perubatan bercahaya: atas & dua sisi
      b.add('crys', G.box, [0, 1.86, -0.9], null, [0.9, 0.06, 0.28]);
      b.add('crys', G.box, [0, 1.86, -0.9], null, [0.28, 0.06, 0.9]);
      for (const sd of [-1, 1]) {
        b.add('crys', G.box, [sd * 1.04, 1.25, -0.6], null, [0.05, 0.62, 0.2]);
        b.add('crys', G.box, [sd * 1.04, 1.25, -0.6], null, [0.05, 0.2, 0.62]);
        // pemancar denyut belakang
        b.add('dark', G.cyl, [sd * 0.55, 1.15, -2.25], [PI / 2, 0, 0], [0.55, 0.3, 0.55]);
        b.add('crys', G.torus, [sd * 0.55, 1.15, -2.42], null, [0.42, 0.42, 0.5]);
      }
      // menara teras pembaikan
      b.add('dark', G.cyl, [0, 2.0, 0.0], null, [0.5, 0.35, 0.5]);
      b.add('steel', G.cyl, [0, 2.35, 0.0], null, [0.12, 0.6, 0.12]);
    },
    limb(ctx) {
      const { root, Builder, G, mats, sp } = ctx;
      const gm = glowMat(sp.accent, 2.4);
      // teras giroskop: sfera bercahaya dalam tiga gelang yang berputar berasingan
      const core = grp(root, 0, 2.95, 0);
      const orb = new THREE.Mesh(_sph(), gm); orb.scale.setScalar(0.5); core.add(orb);
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.14, 0.035, 6, 36), i === 1 ? mats.steel : gm);
        r.rotation.set(i * 1.05, i * 0.7, 0); core.add(r); rings.push(r);
      }
      // lengan pembaiki nano di kedua sisi
      const arms = [];
      for (const sd of [-1, 1]) {
        const sh = grp(root, sd * 0.95, 1.55, 0.55);
        const ab = new Builder();
        ab.add('steel', G.sph, [0, 0, 0], null, [0.3, 0.3, 0.3]);
        seg(ab, 'dark', G.cyl, [0, 0, 0], [sd * 0.55, 0.35, 0.55], 0.14);
        ab.add('steel', G.sph, [sd * 0.55, 0.35, 0.55], null, [0.2, 0.2, 0.2]);
        seg(ab, 'dark', G.cyl, [sd * 0.55, 0.35, 0.55], [sd * 0.75, -0.05, 1.15], 0.11);
        for (const t of [-1, 1]) seg(ab, 'steel', G.cyl, [sd * 0.75, -0.05, 1.15], [sd * (0.75 + t * 0.12), -0.2, 1.38], 0.05);
        ab.build({ steel: mats.steel, dark: mats.dark }, sh);
        const tip = new THREE.Mesh(_sph(), gm); tip.scale.setScalar(0.16); tip.position.set(sd * 0.75, -0.16, 1.3); sh.add(tip);
        arms.push({ sh, sd, tip });
      }
      mountAt(ctx, -0.62, 1.95, -1.3);
      mountAt(ctx, 0.62, 1.95, -1.3);
      return st => {
        rings[0].rotation.y += st.dt * 1.6; rings[1].rotation.x += st.dt * 1.1; rings[2].rotation.z += st.dt * 2.0;
        const heal = st.p && st.p.abOn ? 1 : 0;
        orb.scale.setScalar(0.5 + Math.sin(st.time * (3 + heal * 6)) * (0.04 + heal * 0.08));
        core.position.y = 2.95 + Math.sin(st.time * 1.8) * 0.08;
        for (const a of arms) {
          a.sh.rotation.y = a.sd * (0.15 + Math.sin(st.time * 1.3 + a.sd) * 0.08 + heal * 0.35);
          a.tip.scale.setScalar(0.16 + heal * (0.08 + Math.sin(st.time * 12) * 0.04));
        }
      };
    },
  },

  /* ================= BANSHEE (dibina semula 2026-10-17) =================
     Kuasa = Sonic Pulse (jeritan kon). Muncungnya MULUT MENJERIT: corong
     pembesar suara gergasi yang terbuka ke hadapan dengan gelang gelombang
     bunyi, "rambut" hantu bercahaya meleret ke belakang dan subwoofer di sisi. */
  banshee: {
    hull(b, G) {
      b.add('darker', G.rbox, [0, 0.55, -0.2], null, [1.8, 0.3, 4.2]);
      b.add('body', G.rbox, [0, 0.95, -0.6], null, [1.7, 0.7, 2.9]);                 // badan
      b.add('body', G.sph, [0, 1.35, -0.6], null, [1.5, 0.75, 2.6]);                 // bonggol tengkorak
      // MULUT: corong besar terbuka ke hadapan
      b.add('dark', G.cone, [0, 1.05, 1.5], [-PI / 2, 0, 0], [1.55, 1.25, 1.55]);
      b.add('crys', G.cone, [0, 1.05, 1.6], [-PI / 2, 0, 0], [1.25, 1.0, 1.25]);      // tekak bercahaya
      b.add('steel', G.torus, [0, 1.05, 2.1], null, [0.78, 0.78, 0.55]);              // bibir corong
      for (let i = 0; i < 2; i++) b.add('crys', G.torus, [0, 1.05, 2.4 + i * 0.32], null, [0.86 + i * 0.2, 0.86 + i * 0.2, 0.12]);   // riak bunyi
      b.add('dark', G.cyl, [0, 1.05, 1.0], [PI / 2, 0, 0], [0.5, 0.4, 0.5]);
      for (const sd of [-1, 1]) {
        // mata celah
        b.add('crys', G.box, [sd * 0.45, 1.75, 0.25], [0.2, sd * 0.4, 0], [0.42, 0.06, 0.12]);
        // subwoofer sisi
        b.add('dark', G.cyl, [sd * 0.92, 1.0, -0.5], [0, 0, PI / 2], [0.95, 0.2, 0.95]);
        b.add('crys', G.cyl, [sd * 1.02, 1.0, -0.5], [0, 0, PI / 2], [0.5, 0.04, 0.5]);
        b.add('steel', G.torus, [sd * 1.03, 1.0, -0.5], [0, PI / 2, 0], [0.5, 0.5, 0.4]);
      }
      // rambut hantu: helai bercahaya meleret ke belakang dari tengkorak
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.26, z0 = -0.4 - Math.abs(i - 2) * 0.1;
        curve(b, 'crys', G.cyl, [x, 1.98 - Math.abs(i - 2) * 0.08, z0], [x * 1.5, 2.35, z0 - 1.3], [x * 2.0, 1.25, z0 - 2.7], 6, 0.16, 0.05);
      }
      lamps(b, G, [[-0.65, 0.75, 1.6], [0.65, 0.75, 1.6]]);
    },
    limb(ctx) {
      mountAt(ctx, -0.55, 2.0, -0.9);
      mountAt(ctx, 0.55, 2.0, -0.9);
      mountAt(ctx, 0, 1.95, 0.2);
      return null;
    },
  },

  /* ================= HELIX - siput perang (TANK) =================
     Cangkerang lingkaran logaritma di belakang, kaki berotot yang beralun
     (tiada roda langsung), dua tangkai mata. Duri cangkerang keluar semasa
     Spiral Bastion. */
  helix: {
    hull(b, G) {
      // cangkerang: rantai sfera di sepanjang lingkaran dalam satah y-z
      for (let k = 0; k <= 52; k++) {
        const th = k * 0.24, r = 1.75 * Math.exp(-0.11 * th), s = 2.05 * Math.exp(-0.11 * th);
        const y = 2.45 - r * Math.cos(th), z = -0.55 - r * Math.sin(th);
        b.add(k % 6 === 0 ? 'darker' : 'body', G.sph, [0, y, z], null, [s * 1.18, s, s]);
        if (k % 2 === 0) b.add('crys', G.sph, [0, 2.45 - (r + s * 0.48) * Math.cos(th), -0.55 - (r + s * 0.48) * Math.sin(th)], null, [0.16, 0.16, 0.16]);
      }
      b.add('crys', G.sph, [0, 2.45, -0.55], null, [0.5, 0.5, 0.5]);            // pusat lingkaran bercahaya
      // mantel + leher + kepala
      b.add('body', G.rbox, [0, 1.05, 0.2], null, [2.3, 0.7, 4.4]);
      b.add('darker', G.rbox, [0, 0.82, 0.2], null, [2.4, 0.3, 4.5]);
      b.add('body', G.sph, [0, 1.55, 1.95], [0.5, 0, 0], [1.3, 1.5, 1.2]);
      b.add('body', G.sph, [0, 1.25, 2.55], null, [1.1, 0.8, 1.0]);
      b.add('dark', G.box, [0, 1.0, 3.02], null, [0.7, 0.08, 0.1]);               // mulut
      for (const sd of [-1, 1]) {
        seg(b, 'body', G.cyl, [sd * 0.3, 2.2, 2.2], [sd * 0.62, 3.25, 2.7], 0.17);      // tangkai mata
        b.add('crys', G.sph, [sd * 0.62, 3.32, 2.72], null, [0.4, 0.4, 0.4]);
        b.add('dark', G.sph, [sd * 0.64, 3.36, 2.9], null, [0.15, 0.15, 0.1]);
        b.add('body', G.cone, [sd * 0.45, 0.75, 2.9], [PI / 2 + 0.4, 0, sd * 0.3], [0.14, 0.6, 0.14]); // sesungut bawah
        b.add('steel', G.rbox, [sd * 1.18, 1.25, 1.0], null, [0.14, 0.5, 1.6]);   // pelat mantel
      }
    },
    limb(ctx) {
      const { root, sp, Builder, G } = ctx;
      const acc = new THREE.Color(sp.accent);
      const footMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3b2a20'), roughness: 0.5, metalness: 0.1 });
      const slime = new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
      const segs = [];
      for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(G.rbox, footMat);
        m.position.set(0, 0.36, 2.3 - i * 0.66);
        m.scale.set(2.5 - Math.abs(i - 3.5) * 0.12, 0.6, 0.72);
        m.castShadow = true; root.add(m); segs.push(m);
      }
      const sl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.4), slime);
      sl.rotation.x = -PI / 2; sl.position.y = 0.04; root.add(sl);
      // duri cangkerang (Spiral Bastion) - skala 0 bila tidak aktif
      const spikes = grp(root);
      const sb = new Builder();
      for (let k = 2; k <= 40; k += 3) {
        const th = k * 0.24, r = 1.75 * Math.exp(-0.11 * th), s = 2.05 * Math.exp(-0.11 * th);
        const R = r + s * 0.5;
        for (const sd of [-1, 1]) {
          const y = 2.45 - R * Math.cos(th), z = -0.55 - R * Math.sin(th);
          sb.add('steel', G.cone, [sd * s * 0.5, y, z], [-th + PI, 0, sd * 0.6], [0.22, 1.1, 0.22]);
        }
      }
      sb.build({ steel: ctx.mats.gold }, spikes);
      spikes.scale.setScalar(0.001);
      mountAt(ctx, -1.2, 1.55, 1.15);
      mountAt(ctx, 1.2, 1.55, 1.15);
      mountAt(ctx, 0, 4.42, -0.55);
      let sc = 0;
      return st => {
        const sp2 = clamp(Math.abs(st.fwd) / 18, 0, 1);
        for (let i = 0; i < segs.length; i++) {
          const w = Math.sin(st.dist * 2.2 - i * 0.9);
          segs[i].scale.y = 0.6 + (0.08 + sp2 * 0.18) * w;
          segs[i].position.y = 0.36 + (0.04 + sp2 * 0.06) * w;
        }
        sl.material.opacity = 0.3 + sp2 * 0.35;
        sc = damp(sc, st.p && st.p.thorns ? 1 : 0, 8, st.dt);
        spikes.scale.setScalar(Math.max(0.001, sc));
        if (st.p && st.g && sp2 > 0.1 && Math.random() < st.dt * 12) {
          st.g.fx.add.emit(st.p.x - Math.sin(st.p.ang) * 2.6, 0.12, st.p.z - Math.cos(st.p.ang) * 2.6, 0, 0.1, 0,
            { color: [acc.r * 1.4, acc.g * 1.4, acc.b * 1.4], color2: [acc.r * 0.3, acc.g * 0.3, acc.b * 0.2], size: 1.1, size2: 1.4, life: 1.6, drag: 3, alpha: 0.5 });
        }
      };
    },
  },

  /* ================= MAMMOTH - penggelek wap bergading (TANK) =================
     Tiada tayar: satu dram penggelek gergasi di hadapan dan dua dram di
     belakang. Belakang membonggol berbulu plat, gading melengkung, "belalai"
     paip ekzos, dan cangkuk rantai di ekor. */
  mammoth: {
    hull(b, G, HG, mats) {
      mats.ivory = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.45, metalness: 0.05 });
      b.add('body', G.sph, [0, 2.25, -0.35], null, [2.7, 2.0, 4.2]);              // bonggol belakang
      b.add('darker', G.rbox, [0, 1.25, -0.2], null, [2.5, 0.6, 4.0]);
      /* (2026-10-17 pusingan 2) plat "bulu" condong yang bersepah diganti JALUR
         PERISAI bertindih mengikut lengkung bonggol + rabung duri di tulang belakang */
      for (let r = 0; r < 5; r++) {
        const z = -2.05 + r * 0.72, k = 1 - Math.abs(z + 0.35) * 0.2;
        b.add(r % 2 ? 'dark' : 'darker', G.sph, [0, 2.28, z], [0.18, 0, 0], [2.78 * k, 2.06 * k, 0.55]);
        b.add('steel', G.torus, [0, 2.28, z + 0.25], [0.18, 0, 0], [1.38 * k, 1.03 * k, 0.12]);
      }
      for (let i = 0; i < 6; i++) b.add('steel', G.cone, [0, 3.28 - Math.abs(i - 2.5) * 0.08, -1.6 + i * 0.5], [-0.3, 0, 0], [0.14, 0.42, 0.22]);
      // kepala + topi perisai
      b.add('body', G.sph, [0, 2.55, 1.85], null, [1.9, 1.7, 1.6]);
      b.add('steel', HG.hemi, [0, 2.95, 1.9], [-0.35, 0, 0], [1.72, 0.75, 1.45]);
      b.add('dark', G.box, [0, 3.0, 2.55], [-0.35, 0, 0], [1.3, 0.12, 0.16]);           // kening
      for (const sd of [-1, 1]) {
        b.add('body', G.cyl, [sd * 1.08, 2.45, 1.55], [0.1, 0, PI / 2], [1.2, 0.1, 1.3]);   // telinga cakera
        b.add('crys', G.torus, [sd * 1.13, 2.45, 1.55], [0, PI / 2, 0], [0.55, 0.6, 0.25]);
      }
      for (const sd of [-1, 1]) {
        b.add('crys', G.sph, [sd * 0.55, 2.7, 2.55], null, [0.26, 0.2, 0.2]);       // mata
        // gading melengkung: turun dari rahang, ke hadapan, kemudian naik
        curve(b, 'ivory', G.cyl, [sd * 0.6, 2.0, 2.4], [sd * 0.95, 0.9, 3.9], [sd * 0.8, 2.3, 4.45], 7, 0.34, 0.12);
        b.add('steel', G.torus, [sd * 0.72, 1.55, 3.05], [0.6, 0, 0], [0.36, 0.36, 0.5]);   // gelang gading
        // yoke dram hadapan
        b.add('dark', G.box, [sd * 1.5, 1.4, 2.1], [0.3, 0, 0], [0.18, 0.8, 1.6]);
        b.add('dark', G.box, [sd * 1.0, 1.0, -1.75], null, [0.6, 0.4, 0.5]);
      }
      // belalai: paip ekzos bersegmen tergantung di muka
      for (let k = 0; k < 6; k++) b.add(k % 2 ? 'steel' : 'dark', G.cyl, [0, 2.15 - k * 0.3, 2.65 + Math.sin(k * 0.5) * 0.25], [0.3, 0, 0], [0.42 - k * 0.03, 0.32, 0.42 - k * 0.03]);
      b.add('hot', G.cyl, [0, 0.42, 2.85], null, [0.3, 0.08, 0.3]);
      b.add('dark', G.cyl, [0, 3.5, -1.2], null, [0.3, 1.0, 0.3]);                 // serombong
      b.add('hot', G.cyl, [0, 4.02, -1.2], null, [0.24, 0.05, 0.24]);
      b.add('steel', G.torus, [0, 1.2, -2.65], null, [0.6, 0.6, 0.8]);             // cangkuk rantai
      b.add('dark', G.box, [0, 0.95, 2.1], null, [2.9, 0.2, 0.3]);
    },
    limb(ctx) {
      const { root, Builder, G, wheels } = ctx;
      const dm = { steel: ctx.mats.steel, dark: ctx.mats.dark, crys: ctx.mats.crys };
      const drum = (x, z, R, W) => {
        const holder = grp(root, x, R, z), spin = grp(holder);
        const db = new Builder();
        db.add('steel', G.cyl, [0, 0, 0], [0, 0, PI / 2], [R * 2, W, R * 2]);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU;
          db.add('dark', G.box, [0, Math.cos(a) * R, Math.sin(a) * R], [-a, 0, 0], [W * 1.02, 0.1, 0.22]);   // sirip cengkam
        }
        for (const sd of [-1, 1]) db.add('crys', G.torus, [sd * W * 0.5, 0, 0], [0, PI / 2, 0], [R * 1.4, R * 1.4, 0.25]);
        db.build(dm, spin);
        wheels.push({ holder, spin, front: false });
      };
      drum(0, 2.15, 1.0, 2.6);
      drum(-1.05, -1.75, 0.78, 1.1);
      drum(1.05, -1.75, 0.78, 1.1);
      mountAt(ctx, -0.62, 3.2, -1.0);
      mountAt(ctx, 0.62, 3.2, -1.0);
      mountAt(ctx, -0.6, 3.05, 0.75);
      mountAt(ctx, 0.6, 3.05, 0.75);
      return null;
    },
  },

  /* ================= RAPTOR - pemburu dua kaki (FIGHTER) =================
     Berdiri tinggi atas dua kaki lutut-songsang, badan mendatar, ekor
     pengimbang dan rahang yang ternganga bila mangsa ditanda. */
  raptor: {
    hull(b, G) {
      b.add('body', G.sph, [0, 3.05, -0.1], [0.08, 0, 0], [1.6, 1.4, 3.0]);       // badan
      b.add('darker', G.sph, [0, 2.75, 0.2], null, [1.3, 0.9, 2.2]);
      b.add('body', G.cyl, [0, 3.35, 1.45], [0.9, 0, 0], [0.75, 1.3, 0.75]);     // leher
      // duri belakang - kini duduk TEPAT atas lengkung badan (dahulu terapung)
      const topAt = z => 3.05 + 0.7 * Math.sqrt(Math.max(0, 1 - ((z + 0.1) / 1.5) ** 2));
      for (let i = 0; i < 6; i++) { const z = 0.9 - i * 0.45; b.add('crys', G.box, [0, topAt(z) + 0.08, z], null, [0.08, 0.28, 0.3]); }
      for (const sd of [-1, 1]) b.add('steel', G.box, [sd * 0.9, 3.38, 0.1], null, [0.62, 0.08, 0.62]);   // pelana senjata atas perisai rusuk
      for (const sd of [-1, 1]) {
        b.add('steel', G.rbox, [sd * 0.78, 3.0, 0.1], null, [0.12, 0.7, 1.9]);     // perisai rusuk
        // lengan kecil - bahu DI DALAM dada, siku, tangan bercakar (dahulu batang terapung)
        b.add('body', G.sph, [sd * 0.38, 2.78, 1.0], null, [0.32, 0.32, 0.32]);
        seg(b, 'body', G.cyl, [sd * 0.38, 2.78, 1.0], [sd * 0.5, 2.45, 1.35], 0.16);
        b.add('steel', G.sph, [sd * 0.5, 2.45, 1.35], null, [0.18, 0.18, 0.18]);
        seg(b, 'body', G.cyl, [sd * 0.5, 2.45, 1.35], [sd * 0.48, 2.5, 1.75], 0.12);
        for (const dx of [-0.07, 0.07]) seg(b, 'steel', G.cone, [sd * 0.48 + dx, 2.48, 1.75], [sd * 0.48 + dx, 2.3, 1.98], 0.05);
      }
    },
    limb(ctx) {
      const { root, Builder, G, mats } = ctx;
      const lm = { body: mats.body, dark: mats.dark, steel: mats.steel, crys: mats.crys, darker: mats.darker };
      const legs = [];
      for (const sd of [-1, 1]) {
        /* sendi: pinggul -> lutut (ke hadapan) -> buku lali (ke belakang, lutut
           songsang) -> jari kaki rata di tanah. Setiap ruas ditarik tepat
           antara dua sendi, jadi tiada celah. */
        const hip = grp(root, sd * 0.82, 2.9, -0.15);
        const K = [0, -1.15, 0.55], A = [0, -1.0, -0.62], T = [0, -0.62, 0.15];
        const hb = new Builder();
        hb.add('steel', G.sph, [0, 0, 0], null, [0.62, 0.62, 0.62]);
        hb.add('body', G.sph, K.map(v => v * 0.45), null, [0.62, 1.1, 0.7]);              // otot paha
        seg(hb, 'body', G.cyl, [0, 0, 0], K, 0.42);
        hb.build(lm, hip);
        const knee = grp(hip, ...K);
        const kb = new Builder();
        kb.add('steel', G.sph, [0, 0, 0], null, [0.38, 0.38, 0.38]);
        seg(kb, 'dark', G.cyl, [0, 0, 0], A, 0.26);
        seg(kb, 'crys', G.box, [sd * 0.13, -0.05, -0.05], [A[0] + sd * 0.13, A[1] + 0.12, A[2] + 0.05], 0.04, 0.08);
        kb.build(lm, knee);
        /* Nabil 2026-10-17: hujung kaki ialah RODA yang DIPEGANG kaki itu.
           Roda diletak sedikit ke dalam; buku lali jadi tapak tangan di sisi
           luar hab, dan tiga cakar melengkung MEMELUK atas roda ke sisi dalam,
           satu taji di belakang - macam kaki burung menggenggam bola. */
        const ankle = grp(knee, ...A);
        const ab = new Builder();
        const io = -sd * 0.42;                                             // pusat roda (ke dalam)
        ab.add('steel', G.sph, [0, 0, 0], null, [0.34, 0.34, 0.34]);
        ab.add('dark', G.cyl, [0, 0, 0], [0, 0, PI / 2], [0.62, 0.16, 0.62]);   // tapak tangan
        ab.add('crys', G.torus, [sd * 0.09, 0, 0], [0, PI / 2, 0], [0.42, 0.42, 0.3]);
        ab.add('steel', G.cyl, [io * 0.5, 0, 0], [0, 0, PI / 2], [0.18, 0.5, 0.18]);       // gandar
        for (const ang of [-0.25, 0.45, 1.15]) {                                // cakar memeluk
          const cy = Math.cos(ang), cz = Math.sin(ang);
          const p0 = [0, cy * 0.3, cz * 0.3], p1 = [io * 0.5, cy * 1.12, cz * 1.12], p2 = [io * 1.9, cy * 0.86, cz * 0.86];
          curve(ab, 'dark', G.cyl, p0, p1, p2, 5, 0.11, 0.07);
          ab.add('steel', G.cone, [io * 1.95, cy * 0.78, cz * 0.78], [ang + PI, 0, 0], [0.08, 0.22, 0.08]);
        }
        curve(ab, 'dark', G.cyl, [0, 0.1, -0.25], [io * 0.4, 0.5, -1.0], [io * 0.9, 0.1, -1.0], 4, 0.1, 0.07);   // taji
        ab.build(lm, ankle);
        const wh = grp(ankle, io, 0, 0), spin = grp(wh);
        const ty = ctx.tyre(); ty.scale.setScalar(0.74 / 0.46); spin.add(ty);
        ctx.wheels.push({ holder: wh, spin, front: false });
        legs.push({ hip, knee, ankle, ph: sd > 0 ? 0 : PI });
      }
      // ekor bersegmen
      const tail = [];
      let par = grp(root, 0, 3.15, -1.45);
      for (let i = 0; i < 6; i++) {
        const s = 1 - i * 0.14;
        const tb = new Builder();
        tb.add('body', G.sph, [0, 0, -0.32], null, [0.62 * s, 0.55 * s, 0.75]);
        if (i % 2 === 0) tb.add('crys', G.box, [0, 0.3 * s, -0.32], null, [0.06, 0.2, 0.3]);
        tb.build(lm, par);
        const nx = grp(par, 0, 0, -0.62);
        tail.push(par); par = nx;
      }
      // kepala dengan rahang berengsel
      const head = grp(root, 0, 3.95, 2.0);
      const hb2 = new Builder();
      hb2.add('body', G.rbox, [0, 0.1, 0.4], null, [0.9, 0.6, 1.5]);
      hb2.add('darker', G.rbox, [0, 0.38, 0.25], null, [0.72, 0.18, 1.1]);
      for (const sd of [-1, 1]) {
        hb2.add('crys', G.sph, [sd * 0.36, 0.25, 0.55], null, [0.2, 0.14, 0.26]);
        for (let k = 0; k < 4; k++) hb2.add('steel', G.cone, [sd * 0.3, -0.24, 0.55 + k * 0.22], [PI, 0, 0], [0.06, 0.2, 0.06]);
      }
      hb2.build(lm, head);
      const jaw = grp(head, 0, -0.18, -0.15);
      const jb = new Builder();
      jb.add('body', G.rbox, [0, -0.08, 0.7], null, [0.76, 0.22, 1.35]);
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) jb.add('steel', G.cone, [sd * 0.26, 0.1, 0.55 + k * 0.25], null, [0.06, 0.18, 0.06]);
      jb.build(lm, jaw);
      mountAt(ctx, 0, 3.86, -0.4);        // atas punggung (dahulu 4.42 - terapung)
      mountAt(ctx, -0.9, 3.5, 0.1);       // atas pelana perisai rusuk
      mountAt(ctx, 0.9, 3.5, 0.1);
      return st => {
        const amt = clamp(Math.abs(st.fwd) / 14, 0, 1);
        const ph = st.dist * 1.15;
        // meluncur atas roda: kaki kekal sebagai suspensi, condong sedikit ikut pecutan & belokan
        for (const L of legs) {
          L.hip.rotation.x = -0.08 * amt;
          L.knee.rotation.x = 0.06 * amt;
          L.ankle.rotation.x = 0.02 * amt;
          L.hip.rotation.z = -(st.steer || 0) * 0.06 * amt;
        }
        const bob = Math.sin(st.time * 7) * 0.025 * amt;
        if (st.p) st.p._bob = bob; else root.position.y = bob;
        tail.forEach((t, i) => { t.rotation.y = Math.sin(st.time * 2.4 - i * 0.6) * (0.08 + 0.05 * (1 - amt)) - (st.steer || 0) * 0.12; });
        const hunt = st.p && st.p.prey ? 1 : 0;
        jaw.rotation.x = 0.06 + hunt * (0.35 + Math.sin(st.time * 9) * 0.08);
        head.rotation.x = -0.05 + Math.sin(st.time * 1.7) * 0.04 + hunt * 0.1;
      };
    },
  },

  /* ================= MANTIS - pembunuh atas ski (ASSASSIN) =================
     Dua bilah ski panjang bercahaya meluncur atas tanah (tiada roda), toraks
     kurus mendongak, mata majmuk, dan dua lengan sabit yang menghayun semasa
     Reaping Dash. */
  mantis: {
    hull(b, G) {
      b.add('body', G.sph, [0, 1.75, -0.2], [0.25, 0, 0], [1.2, 0.85, 2.6]);      // toraks
      b.add('body', G.sph, [0, 1.95, -2.1], [-0.25, 0, 0], [1.4, 0.95, 2.4]);     // abdomen
      for (let i = 0; i < 4; i++) b.add('darker', G.torus, [0, 1.95 + i * 0.07, -1.5 - i * 0.45], [0.1, 0, 0], [1.25 - i * 0.12, 0.85 - i * 0.08, 0.5]);
      b.add('body', G.cyl, [0, 2.4, 0.95], [0.55, 0, 0], [0.42, 1.1, 0.42]);     // leher
      b.add('body', HGcone(), [0, 2.85, 1.45], [PI / 2 + 0.3, 0, 0], [1.1, 0.9, 0.6]);  // kepala segi tiga
      for (const sd of [-1, 1]) {
        b.add('crys', G.sph, [sd * 0.5, 3.0, 1.35], null, [0.42, 0.5, 0.42]);    // mata majmuk
        b.add('steel', G.cyl, [sd * 0.18, 3.5, 1.2], [-0.6, 0, sd * 0.4], [0.04, 1.0, 0.04]);   // antena
        // sayap kaca terlipat
        b.add('glass', G.box, [sd * 0.45, 2.45, -1.7], [0.15, 0, sd * 0.25], [0.6, 0.04, 2.6]);
        b.add('crys', G.box, [sd * 0.55, 2.47, -1.7], [0.15, 0, sd * 0.25], [0.04, 0.05, 2.4]);
        // tupang ke ski
        b.add('dark', G.cyl, [sd * 0.72, 1.0, 0.8], [0, 0, sd * 0.5], [0.12, 1.3, 0.12]);
        b.add('dark', G.cyl, [sd * 0.72, 1.0, -1.4], [0, 0, sd * 0.5], [0.12, 1.3, 0.12]);
      }
    },
    limb(ctx) {
      const { root, Builder, G, mats, sp } = ctx;
      const lm = { body: mats.body, dark: mats.dark, steel: mats.steel, crys: mats.crys, glow: glowMat(sp.accent, 2.2) };
      const skis = grp(root);
      const sb = new Builder();
      for (const sd of [-1, 1]) {
        sb.add('steel', G.box, [sd * 1.15, 0.36, -0.2], null, [0.22, 0.14, 5.6]);
        sb.add('steel', G.box, [sd * 1.15, 0.5, 2.75], [-0.55, 0, 0], [0.22, 0.12, 0.8]);   // hujung melengkung
        sb.add('glow', G.box, [sd * 1.15, 0.27, -0.2], null, [0.32, 0.05, 5.4]);
        sb.add('dark', G.box, [sd * 1.15, 0.55, -0.2], null, [0.3, 0.18, 1.6]);
      }
      sb.build(lm, skis);
      const arms = [];
      for (const sd of [-1, 1]) {
        const sh = grp(root, sd * 0.5, 2.35, 0.9);
        const ab = new Builder();
        ab.add('body', G.rbox, [0, 0.45, 0.35], [-0.9, 0, 0], [0.26, 1.15, 0.3]);    // lengan atas
        ab.build(lm, sh);
        const fore = grp(sh, 0, 0.9, 0.8);
        const fb = new Builder();
        seg(fb, 'dark', G.cyl, [0, 0, 0], [0, -0.75, 0.35], 0.24);                     // lengan bawah
        fb.add('steel', G.sph, [0, -0.75, 0.35], null, [0.26, 0.26, 0.26]);
        // bilah sabit: lengkung torus nipis, mata tajam bercahaya di sisi dalam
        fb.add('steel', SCY(), [0, -0.75, 0.35], [0, PI / 2, PI * 0.15], [1.15, 1.15, 0.5]);
        fb.add('glow', SCY(), [0, -0.75, 0.35], [0, PI / 2, PI * 0.15], [1.02, 1.02, 0.25]);
        for (let k = 0; k < 5; k++) {                                                    // gerigi
          const a = PI * 0.15 + 0.25 + k * 0.32;
          fb.add('steel', G.cone, [0, -0.75 + Math.sin(a) * 0.62, 0.35 + Math.cos(a) * 0.62], [a - PI / 2, 0, 0], [0.06, 0.2, 0.06]);
        }
        fb.build(lm, fore);
        arms.push({ sh, fore, sd });
      }
      mountAt(ctx, -0.5, 2.42, -0.55);
      mountAt(ctx, 0.5, 2.42, -0.55);
      return st => {
        const bob = Math.sin(st.time * 3.1) * 0.08;
        if (!st.p) root.position.y = 0.15 + bob;
        else st.p._bob = 0.15 + bob;
        skis.rotation.z = clamp(-(st.lat || 0) * 0.01, -0.12, 0.12);
        const d = st.p && st.p.dash;
        const k = d && d.t < d.dur + 0.15 ? Math.sin(clamp(d.t / (d.dur + 0.15), 0, 1) * PI) : 0;
        for (const a of arms) {
          a.sh.rotation.x = -0.15 + Math.sin(st.time * 1.6 + a.sd) * 0.05 - k * 1.1;
          a.fore.rotation.x = 0.2 + k * 1.4;
          a.sh.rotation.z = a.sd * k * 0.35;
        }
      };
    },
  },

  /* ================= HIVRA - sarang lebah terbang empat rotor (CONTROLLER) ======
     Pod sarang heksagon bergantung pada empat lengan rotor. Terbang rendah
     sepanjang masa; condong ke hadapan bila memecut. */
  hivra: {
    hull(b, G, HG) {
      for (let i = 0; i < 5; i++) {
        const y = 1.35 + i * 0.38, s = 2.0 - Math.abs(i - 1.6) * 0.32;
        b.add(i % 2 ? 'gold' : 'body', HG.hex, [0, y, 0], [0, PI / 6, 0], [s, 0.4, s * 1.15]);   // jalur sarang
      }
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        b.add('crys', HG.hex, [Math.sin(a) * 0.98, 2.0, Math.cos(a) * 1.12], [PI / 2, a, 0], [0.42, 0.06, 0.42]);  // sel madu
      }
      b.add('darker', G.cone, [0, 0.75, 0], [PI, 0, 0], [0.7, 0.9, 0.7]);           // penyengat bawah
      b.add('crys', G.sph, [0, 2.0, 1.25], null, [0.5, 0.36, 0.2]);                // pintu masuk bercahaya
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const a = Math.atan2(sx, sz);
        b.add('dark', G.rbox, [sx * 1.15, 2.6, sz * 1.15], [0, a, 0], [0.24, 0.2, 1.7]);   // lengan rotor
        b.add('dark', G.cyl, [sx * 1.85, 2.55, sz * 1.85], null, [0.5, 0.45, 0.5]);       // nasel
      }
    },
    limb(ctx) {
      const { root, sp } = ctx;
      const gmRing = glowMat(sp.accent, 1.0);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.85 });
      const rotors = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const r = grp(root, sx * 1.85, 2.85, sz * 1.85);
        for (let k = 0; k < 2; k++) {
          const bl = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 0.26), bladeMat);
          bl.rotation.y = k * PI / 2; r.add(bl);
        }
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 6, 32), gmRing);
        ring.rotation.x = PI / 2; ring.position.set(sx * 1.85, 2.85, sz * 1.85); root.add(ring);
        rotors.push({ r, d: sx * sz });
      }
      mountAt(ctx, 0, 3.32, 0.45);
      mountAt(ctx, -0.72, 3.22, -0.5);
      mountAt(ctx, 0.72, 3.22, -0.5);
      return st => {
        for (const R of rotors) R.r.rotation.y += st.dt * 38 * R.d;
        const lift = 1.25 + Math.sin(st.time * 2.3) * 0.12;
        if (st.p) st.p._bob = lift; else root.position.y = lift;
        if (st.p) st.p._tilt = clamp((st.fwd || 0) * 0.006, -0.14, 0.16);
      };
    },
  },

  /* ================= AEROSTAT - kapal udara sokongan (SUPPORT) =================
     Sampul gas panjang terapung tinggi, gondola tergantung di bawah pada
     kabel, dua kipas pendorong dan sirip ekor salib. */
  aerostat: {
    hull(b, G) {
      b.add('body', G.sph, [0, 5.3, -0.3], null, [3.1, 2.6, 6.6]);                 // sampul gas
      for (const z of [-2.2, -0.6, 1.0, 2.4]) b.add('steel', G.torus, [0, 5.3, z - 0.3], null, [3.05 * Math.sqrt(1 - ((z) / 3.4) ** 2), 2.55 * Math.sqrt(1 - ((z) / 3.4) ** 2), 0.5]);
      b.add('crys', G.box, [0, 6.6, -0.3], null, [0.1, 0.06, 5.2]);                // jalur bercahaya atas
      for (let i = 0; i < 4; i++) {                                                 // sirip ekor salib
        const a = i * PI / 2;
        b.add('body', G.box, [Math.sin(a) * 1.0, 5.3 + Math.cos(a) * 1.0, -3.4], [0, 0, a], [0.1, 1.5, 1.4]);
      }
      // gondola
      b.add('body', G.rbox, [0, 2.15, 0.1], null, [2.3, 1.05, 3.4]);
      b.add('darker', G.rbox, [0, 1.62, 0.1], null, [2.0, 0.24, 3.0]);
      b.add('glass', G.box, [0, 2.3, 1.82], [-0.3, 0, 0], [1.8, 0.5, 0.06]);
      for (const sd of [-1, 1]) {
        for (let k = 0; k < 3; k++) b.add('glass', G.box, [sd * 1.16, 2.3, -0.8 + k * 0.85], null, [0.05, 0.36, 0.5]);
        for (const z of [-1.2, 1.3]) b.add('steel', G.cyl, [sd * 0.9, 3.45, z], [0, 0, sd * 0.25], [0.05, 2.3, 0.05]);   // kabel
        b.add('dark', G.cyl, [sd * 1.55, 2.2, -1.35], [PI / 2, 0, 0], [0.55, 0.7, 0.55]);   // nasel kipas
      }
      b.add('crys', G.box, [0, 1.48, 0.1], null, [1.4, 0.04, 2.4]);                 // lampu perut
      b.add('steel', G.torus, [0, 1.45, -1.9], null, [0.4, 0.4, 0.5]);              // cangkuk peti
    },
    limb(ctx) {
      const { root } = ctx;
      const bm = new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: 0.7, roughness: 0.4 });
      const props = [];
      for (const sd of [-1, 1]) {
        const pr = grp(root, sd * 1.55, 2.2, -1.75);
        for (let k = 0; k < 3; k++) {
          const bl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.05), bm);
          bl.rotation.z = k * TAU / 3; pr.add(bl);
        }
        props.push(pr);
      }
      mountAt(ctx, -0.62, 2.72, 0.55);
      mountAt(ctx, 0.62, 2.72, 0.55);
      mountAt(ctx, 0, 2.72, -0.9);
      return st => {
        for (const pr of props) pr.rotation.z += st.dt * (10 + Math.abs(st.fwd || 0) * 1.2);
        const bob = 0.35 + Math.sin(st.time * 1.3) * 0.18;
        if (st.p) { st.p._bob = bob; st.p._tilt = clamp((st.fwd || 0) * -0.003, -0.06, 0.06); } else root.position.y = bob;
      };
    },
  },

  /* ================= HALO - malaikat atas roda tunggal (SUPPORT) =================
     Satu roda besar di tengah, menara langsing berdiri tegak di atasnya
     (diimbang giroskop - condong bila memecut), sayap kecil dan halo
     terapung yang terbang pergi semasa Guardian Halo. */
  halo: {
    hull(b, G) {
      b.add('dark', G.box, [0, 1.35, 0], null, [1.7, 0.36, 0.5]);                  // gandar
      for (const sd of [-1, 1]) b.add('dark', G.rbox, [sd * 0.62, 1.95, 0], null, [0.22, 1.4, 0.5]);   // garpu
      b.add('body', G.sph, [0, 3.0, 0], null, [1.45, 2.3, 1.3]);                    // badan titis air
      b.add('body', G.cone, [0, 4.5, 0], null, [0.9, 1.1, 0.8]);
      b.add('steel', G.torus, [0, 2.4, 0], [PI / 2, 0, 0], [1.5, 1.35, 0.5]);
      b.add('glass', G.sph, [0, 3.45, 0.42], null, [0.82, 0.56, 0.5]);            // visor
      b.add('crys', G.sph, [0, 5.1, 0], null, [0.3, 0.3, 0.3]);
      for (const sd of [-1, 1]) {
        // sayap bulu: tiga bilah bertingkat

        b.add('dark', G.rbox, [sd * 1.0, 2.65, 0.1], null, [0.5, 0.42, 0.75]);    // pod bahu (senjata)
      }
    },
    limb(ctx) {
      const { root, G, Builder, wheels, sp } = ctx;
      const holder = grp(root, 0, 1.3, 0), spin = grp(holder);
      const wb = new Builder();
      wb.add('rubber', G.torus, [0, 0, 0], [0, PI / 2, 0], [2.4, 2.4, 2.4]);
      wb.add('steel', G.cyl, [0, 0, 0], [0, 0, PI / 2], [1.9, 0.36, 1.9]);
      for (let i = 0; i < 6; i++) wb.add('dark', G.box, [0, 0, 0], [i * PI / 6, 0, 0], [0.1, 2.2, 0.12]);
      wb.add('crys', G.torus, [0.2, 0, 0], [0, PI / 2, 0], [1.6, 1.6, 0.3]);
      wb.add('crys', G.torus, [-0.2, 0, 0], [0, PI / 2, 0], [1.6, 1.6, 0.3]);
      wb.build({ rubber: new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.95 }), steel: ctx.mats.steel, dark: ctx.mats.dark, crys: ctx.mats.crys }, spin);
      wheels.push({ holder, spin, front: false });
      /* SAYAP BESAR (Nabil: "bagi nampak wow"): tiga lapis bulu - bulu utama
         panjang, bulu sekunder, bulu penutup - setiap bulu bertepi cahaya,
         membentang ~3.6m setiap sisi, dan mengepak perlahan. */
      const wings = [];
      const fm = { gold: ctx.mats.gold, crys: ctx.mats.crys, body: ctx.mats.body };
      for (const sd of [-1, 1]) {
        const w = grp(root, sd * 0.6, 3.75, -0.45);
        const wb = new Builder();
        // kipas bulu: memancar dari bahu - panjang & mendongak di atas, pendek & menurun di bawah
        for (let k = 0; k <= 10; k++) {
          const t = k / 10, a = 1.05 - t * 2.25, L = 3.6 - t * 1.9;
          const o = [sd * 0.35, 0.15 - t * 0.25, -0.05 - t * 0.1];
          const e = [o[0] + sd * Math.cos(a) * L, o[1] + Math.sin(a) * L, o[2] - 0.45];
          seg(wb, k % 2 ? 'gold' : 'body', G.rbox, o, e, 0.42 - t * 0.12, 0.06);
          seg(wb, 'crys', G.box, [o[0], o[1], o[2] - 0.05], [e[0], e[1], e[2] - 0.05], 0.05, 0.06);
          wb.add('crys', G.sph, e, null, [0.12, 0.12, 0.12]);
          if (k % 2 === 0) {                                                         // lapis dalam
            const L2 = L * 0.55, e2 = [o[0] + sd * Math.cos(a + 0.1) * L2, o[1] + Math.sin(a + 0.1) * L2, o[2] + 0.12];
            seg(wb, 'gold', G.rbox, [o[0], o[1], o[2] + 0.12], e2, 0.36, 0.05);
          }
        }
        wb.add('body', G.sph, [sd * 0.35, 0.05, -0.1], null, [0.5, 0.5, 0.5]);       // bahu
        wb.build(fm, w);
        wings.push({ w, sd });
      }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 40), glowMat(sp.accent, 2.6));
      halo.rotation.x = PI / 2; halo.position.y = 6.0; root.add(halo);
      mountAt(ctx, -1.0, 2.95, 0.1);
      mountAt(ctx, 1.0, 2.95, 0.1);
      return st => {
        const away = st.g && st.g.halo && st.g.halo.on;
        halo.visible = !away;
        halo.rotation.z += st.dt * 1.4;
        halo.position.y = 6.0 + Math.sin(st.time * 2) * 0.12;
        const flap = Math.sin(st.time * 1.4) * 0.12 + (st.p && st.p.abOn ? Math.sin(st.time * 6) * 0.15 : 0);
        for (const W of wings) { W.w.rotation.z = W.sd * flap; W.w.rotation.y = W.sd * 0.3; }
        if (st.p) st.p._tilt = clamp((st.accel || 0) * 0.012, -0.22, 0.22);
      };
    },
  },

  /* ================= THAROS - tripod sinar haba (ARTILLERY) =================
     Kepala piring tergantung tinggi atas TIGA kaki panjang berjalan. Mata
     merah menembak Sweeping Ray. */
  tharos: {
    hull(b, G, HG) {
      b.add('body', HG.hemi, [0, 4.6, 0], null, [2.8, 1.4, 2.8]);                  // kubah atas
      b.add('darker', G.cyl, [0, 4.55, 0], null, [2.9, 0.22, 2.9]);
      b.add('body', HG.hemi, [0, 4.5, 0], [PI, 0, 0], [2.6, 1.1, 2.6]);            // perut
      b.add('steel', G.torus, [0, 4.55, 0], [PI / 2, 0, 0], [2.9, 2.9, 0.6]);
      b.add('dark', G.cyl, [0, 3.8, 0], null, [0.9, 0.5, 0.9]);                    // sendi pinggul
      b.add('hot', G.sph, [0, 4.5, 1.32], null, [0.62, 0.4, 0.4]);                // mata merah
      b.add('dark', G.torus, [0, 4.5, 1.38], null, [0.56, 0.4, 0.55]);
      /* MERIAM SINAR (pusingan 3 - Nabil: "bagi nampak futuristic"): rumah
         bersegi tirus (oktahedron) dengan alur bercahaya, DUA REL serampang
         pemancar selari, tiga gelang pemfokus terapung di antara rel dan kanta
         teras bercahaya - pendek, tajam, nampak senjata tenaga. */
      b.add('dark', HG.oct, [0, 4.0, 1.85], null, [0.95, 0.72, 1.6]);              // rumah bersegi
      b.add('body', HG.oct, [0, 4.14, 1.75], null, [0.7, 0.4, 1.2]);
      for (const sd of [-1, 1]) {
        b.add('crys', G.box, [sd * 0.3, 4.0, 1.9], [0, sd * 0.12, 0], [0.03, 0.05, 1.0]);   // alur bercahaya
        b.add('steel', G.box, [sd * 0.24, 3.98, 2.75], null, [0.1, 0.3, 1.05]);           // rel serampang
        b.add('crys', G.box, [sd * 0.18, 3.98, 2.78], null, [0.02, 0.2, 0.95]);
        b.add('steel', G.cone, [sd * 0.24, 3.98, 3.38], [PI / 2, 0, 0], [0.1, 0.22, 0.3]);
      }
      for (let k = 0; k < 3; k++) b.add('crys', G.torus, [0, 3.98, 2.45 + k * 0.32], null, [0.34 - k * 0.04, 0.34 - k * 0.04, 0.25]);   // gelang pemfokus
      b.add('hot', HG.oct, [0, 3.98, 2.25], null, [0.26, 0.26, 0.4]);                // kanta teras
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + 0.5;
        b.add('crys', G.box, [Math.sin(a) * 1.15, 5.0, Math.cos(a) * 1.15], [0, a, 0], [0.06, 0.08, 0.7]);
        seg(b, 'steel', G.cyl, [Math.sin(a) * 0.7, 4.1, Math.cos(a) * 0.7], [Math.sin(a) * 0.95, 2.6 + (i % 2) * 0.4, Math.cos(a) * 0.95], 0.05);   // sesungut kabel
      }
    },
    limb(ctx) {
      const { root, Builder, G, mats } = ctx;
      const lm = { dark: mats.dark, steel: mats.steel, crys: mats.crys, body: mats.body };
      const legs = [];
      const bc = new THREE.Color(ctx.sp.accent || '#ff4a3a');
      const ballShell = new THREE.MeshStandardMaterial({ color: bc.clone().multiplyScalar(0.25), emissive: bc, emissiveIntensity: 0.4,
        metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.45, depthWrite: false });
      const ballLat = new THREE.MeshBasicMaterial({ color: bc, wireframe: true, transparent: true, opacity: 0.9 });
      const ballCore = new THREE.MeshBasicMaterial({ color: bc.clone().lerp(new THREE.Color('#ffffff'), 0.5) });
      const ballBand = new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.95 });
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + PI / 3;          // tiada kaki tepat di hadapan - meriam nampak jelas
        const yaw = grp(root, Math.sin(a) * 0.75, 4.2, Math.cos(a) * 0.75);
        yaw.rotation.y = a;
        // pinggul -> lutut (naik keluar, lebih tinggi daripada kepala) -> kaki turun ke tanah
        // kaki berakhir pada paksi bola roda (r 0.65) - tripod MELUNCUR, tidak melangkah
        const K = [0, 1.0, 1.5], F = [0, -4.55, 0.9];
        const hip = grp(yaw);
        const hb = new Builder();
        hb.add('steel', G.sph, [0, 0, 0], null, [0.46, 0.46, 0.46]);
        seg(hb, 'dark', G.cyl, [0, 0, 0], K, 0.3);
        seg(hb, 'crys', G.cyl, [0, 0.05, 0.05], K, 0.1);
        hb.build(lm, hip);
        const knee = grp(hip, ...K);
        const kb = new Builder();
        kb.add('steel', G.sph, [0, 0, 0], null, [0.42, 0.42, 0.42]);
        kb.add('crys', G.sph, [0, 0.22, 0], null, [0.2, 0.2, 0.2]);
        seg(kb, 'dark', G.cyl, [0, 0, 0], F, 0.22);
        seg(kb, 'steel', G.cyl, [0, -1.6, 0.28], [0, -2.6, 0.45], 0.32);                    // sarung piston
        // garpu yang memegang bola: dua plat di sisi paksi
        for (const sx of [-1, 1]) kb.add('dark', G.rbox, [sx * 0.42, F[1] + 0.25, F[2]], null, [0.12, 0.9, 0.5]);
        kb.add('steel', G.cyl, [0, F[1], F[2]], [0, 0, PI / 2], [0.16, 0.95, 0.16]);       // gandar
        kb.build(lm, knee);
        legs.push({ hip, knee, ph: i / 3 * TAU });
        // bola roda bercahaya (gaya bola Hyna, warna aksen merah) - berputar ikut gerak
        const R = 0.65, rr = 0.75 + K[2] + F[2];
        const holder = grp(root, Math.sin(a) * rr, R, Math.cos(a) * rr);
        const spin = grp(holder);
        spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), ballShell));
        spin.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.01, 1), ballLat));
        spin.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.36, 10, 8), ballCore));
        const band = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 6, 28), ballBand);
        band.rotation.y = PI / 2; spin.add(band);
        ctx.wheels.push({ holder, spin, front: false });
      }
      mountAt(ctx, 0, 5.3, -0.4);
      mountAt(ctx, -0.82, 5.12, 0.42);
      mountAt(ctx, 0.82, 5.12, 0.42);
      /* tiada langkah lagi (Nabil: berjalan nampak tak elok) - bola roda bergolek
         melalui senarai `wheels`, kepala hanya terapung perlahan */
      return st => {
        const bob = Math.sin(st.time * 1.2) * 0.04;
        if (st.p) st.p._bob = bob; else root.position.y = bob;
      };
    },
  },

  /* ================= HOPPER - katak fros pelompat (FIGHTER) =================
     Badan leper lebar, mata membonjol, kaki belakang bergegelung spring.
     Bergerak dengan lompatan kecil berterusan; Spring Leap = lompatan besar. */
  hopper: {
    hull(b, G) {
      b.add('body', G.sph, [0, 1.45, -0.1], [-0.15, 0, 0], [2.7, 1.5, 3.4]);
      b.add('darker', G.sph, [0, 1.15, 0.2], null, [2.4, 0.9, 3.0]);
      b.add('body', G.sph, [0, 1.55, 1.35], null, [2.2, 1.1, 1.6]);               // kepala
      b.add('dark', G.torus, [0, 1.35, 1.6], [PI / 2, 0, 0], [1.75, 1.45, 0.25]);  // garis mulut
      b.add('crys', G.sph, [0, 1.0, 1.55], null, [1.1, 0.5, 0.8]);                 // kantung tekak bercahaya
      for (const sd of [-1, 1]) {
        b.add('body', G.sph, [sd * 0.75, 2.2, 1.45], null, [0.85, 0.85, 0.85]);
        b.add('hot', G.sph, [sd * 0.8, 2.35, 1.72], null, [0.55, 0.5, 0.4]);     // mata menyala marah
        b.add('dark', G.box, [sd * 0.82, 2.38, 1.92], null, [0.32, 0.12, 0.05]);
        seg(b, 'body', G.cyl, [sd * 0.85, 1.05, 1.35], [sd * 1.05, 0.12, 1.8], 0.3);     // kaki depan
        b.add('body', G.sph, [sd * 1.05, 0.12, 1.8], null, [0.32, 0.32, 0.32]);
        for (const t of [-0.35, 0, 0.35]) seg(b, 'crys', G.cyl, [sd * 1.05, 0.08, 1.8], [sd * 1.05 + Math.sin(t) * 0.55, 0.05, 1.8 + Math.cos(t) * 0.55], 0.12);   // jari berselaput
      }
      for (let i = 0; i < 5; i++) {                                                 // hablur ais di belakang
        const x = (i - 2) * 0.42;
        b.add('crys', G.ico, [x, 2.15 - Math.abs(x) * 0.3, -0.4 - Math.abs(x) * 0.3], [0.3, i, 0.2], [0.35, 0.7, 0.35]);
      }
      /* (2026-10-17) "nampak boring, bagi ganas": kening marah bersudut atas
         mata, tanduk ais, gigi bergerigi sepanjang mulut, duri tulang belakang,
         plat perisai dan cakar pada kaki depan */
      for (const sd of [-1, 1]) {
        b.add('dark', G.box, [sd * 0.78, 2.72, 1.62], [0.35, 0, -sd * 0.45], [0.75, 0.14, 0.42]);     // kening marah
        b.add('steel', G.cone, [sd * 0.62, 2.9, 1.1], [-0.6, 0, -sd * 0.5], [0.18, 0.7, 0.18]);      // tanduk
        b.add('crys', G.cone, [sd * 0.75, 3.18, 0.88], [-0.9, 0, -sd * 0.6], [0.1, 0.35, 0.1]);
        for (const t of [-0.35, 0, 0.35]) b.add('steel', G.cone, [sd * 1.05 + Math.sin(t) * 0.62, 0.08, 1.8 + Math.cos(t) * 0.62], [PI / 2, t * sd, 0], [0.08, 0.24, 0.08]);   // cakar
        b.add('dark', G.sph, [sd * 1.2, 1.55, -0.3], null, [0.5, 0.35, 1.2]);            // plat bahu
      }
      for (let i = 0; i < 11; i++) {                                                    // gigi
        const a = (i / 10 - 0.5) * 2.2;
        b.add('steel', G.cone, [Math.sin(a) * 0.86, 1.28, 1.6 + Math.cos(a) * 0.7], [PI, 0, 0], [0.09, 0.22, 0.09]);
      }
      for (let i = 0; i < 5; i++) b.add('dark', G.cone, [0, 2.25 - i * 0.04, 0.6 - i * 0.45], [-0.5, 0, 0], [0.16, 0.5 - i * 0.05, 0.16]);   // duri belakang
    },
    limb(ctx) {
      const { root, Builder, G, mats } = ctx;
      const lm = { body: mats.body, dark: mats.dark, steel: mats.steel, crys: mats.crys };
      const legs = [];
      for (const sd of [-1, 1]) {
        /* kaki belakang katak: paha tebal ke hadapan, betis bergegelung spring ke
           belakang, tapak panjang rata di tanah. Sendi bersambung tepat. */
        const K = [sd * 0.35, -0.55, 0.95], A = [0, -0.62, -1.05], T = [0, -0.16, 1.1];
        const hip = grp(root, sd * 1.2, 1.35, -1.05);
        const hb = new Builder();
        hb.add('body', G.sph, [K[0] * 0.5, K[1] * 0.5, K[2] * 0.5], null, [0.95, 0.85, 1.55]);   // paha tebal
        hb.build(lm, hip);
        const knee = grp(hip, ...K);
        const kb = new Builder();
        kb.add('body', G.sph, [0, 0, 0], null, [0.45, 0.45, 0.45]);
        seg(kb, 'dark', G.cyl, [0, 0, 0], A, 0.24);
        for (let k = 1; k < 7; k++) {                                                        // spring sepanjang betis
          const u = k / 7;
          kb.add('steel', G.torus, [A[0] * u, A[1] * u, A[2] * u], [Math.atan2(A[2], -A[1]) + PI / 2, 0, 0], [0.5, 0.5, 0.4]);
        }
        kb.build(lm, knee);
        const foot = grp(knee, ...A);
        const fb = new Builder();
        fb.add('steel', G.sph, [0, 0, 0], null, [0.3, 0.3, 0.3]);
        seg(fb, 'dark', G.rbox, [0, 0, 0], T, 0.42, 0.14);
        for (const t of [-0.3, 0, 0.3]) seg(fb, 'crys', G.cyl, T, [Math.sin(t) * 0.55, T[1] - 0.02, T[2] + Math.cos(t) * 0.5], 0.13);
        fb.build(lm, foot);
        legs.push({ hip, knee, foot });
      }
      mountAt(ctx, 0, 2.35, -0.55);
      mountAt(ctx, -0.95, 2.18, 0.15);
      mountAt(ctx, 0.95, 2.18, 0.15);
      return st => {
        const amt = clamp(Math.abs(st.fwd) / 12, 0, 1);
        let h = Math.abs(Math.sin(st.dist * 0.75)) * 0.55 * amt;       // lompatan kecil sambil bergerak
        let ext = h / 0.55;
        const hop = st.p && st.p.hop;
        if (hop) { const u = clamp(hop.t / hop.dur, 0, 1); h = Math.sin(u * PI) * 5.5; ext = u < 0.5 ? 1 : 1 - (u - 0.5) * 2; }
        for (const L of legs) {
          L.hip.rotation.x = ext * 0.55;
          L.knee.rotation.x = -ext * 0.6;
          L.foot.rotation.x = ext * 0.4;
        }
        if (st.p) st.p._bob = h; else root.position.y = Math.sin(st.time * 2.2) * 0.05;
      };
    },
  },

  /* ================= CORSAIR - kapal layar darat (TRICKSTER) =================
     Badan bot sempit, roda tunggal di haluan, palang cadik dengan dua roda di
     belakang, tiang tinggi dengan layar segi tiga yang berayun ikut angin. */
  /* ================= HIBACHI - penyerang tinggi berkaki empat =================
     Badan TIGA BERLIAN di atas (berlian induk + dua berlian bahu), duduk
     tinggi atas EMPAT kaki tebal berpiston. Hujung setiap kaki ialah POD
     RANTAI KERETA KEBAL (roda bergerak) - ia meluncur, tidak melangkah.
     Berlian hadapan membawa pemancar Jammer Beam. */
  hibachi: {
    hull(b, G, HG) {
      b.add('body', HG.oct, [0, 4.35, 0], null, [2.3, 2.1, 3.0]);                       // berlian induk
      b.add('darker', HG.oct, [0, 4.3, 0], null, [2.38, 0.5, 3.08]);                    // tali pinggang
      for (const sd of [-1, 1]) {
        b.add('body', HG.oct, [sd * 1.75, 4.0, -0.3], [0, 0, sd * 0.25], [1.15, 1.5, 1.8]);   // berlian bahu
        b.add('crys', HG.oct, [sd * 1.75, 4.0, -0.3], [0, 0, sd * 0.25], [1.2, 0.12, 1.85]);
        seg(b, 'dark', G.cyl, [sd * 0.9, 4.25, -0.2], [sd * 1.4, 4.05, -0.3], 0.28);
      }
      b.add('crys', HG.oct, [0, 4.35, 0], null, [2.34, 0.1, 3.04]);                     // jahitan bercahaya
      // pemancar jammer di hujung berlian induk
      b.add('dark', G.cyl, [0, 4.2, 1.55], [PI / 2, 0, 0], [0.62, 0.5, 0.62]);
      b.add('steel', G.torus, [0, 4.2, 1.82], null, [0.36, 0.36, 0.5]);
      b.add('crys', G.sph, [0, 4.2, 1.85], null, [0.42, 0.42, 0.2]);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + PI / 2;
        seg(b, 'steel', G.box, [Math.cos(a) * 0.32, 4.2 + Math.sin(a) * 0.32, 1.75], [Math.cos(a) * 0.48, 4.2 + Math.sin(a) * 0.48, 2.35], 0.08, 0.1);
      }
      // rangka pinggul di bawah badan
      b.add('dark', G.rbox, [0, 3.25, 0], null, [2.4, 0.4, 2.6]);
      b.add('steel', G.box, [0, 3.05, 0], null, [2.0, 0.08, 2.2]);
    },
    limb(ctx) {
      const { root, Builder, G, mats, wheels } = ctx;
      const lm = { body: mats.body, dark: mats.dark, steel: mats.steel, crys: mats.crys, darker: mats.darker };
      const rub = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.92 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const H = [sx * 1.15, 3.2, sz * 1.1], K = [sx * 2.05, 2.15, sz * 1.75], F = [sx * 2.05, 0.95, sz * 1.8];
        const lb = new Builder();
        lb.add('steel', G.sph, H, null, [0.62, 0.62, 0.62]);                          // sendi pinggul
        seg(lb, 'body', G.rbox, H, K, 0.62, 0.7);                                      // paha tebal
        lb.add('steel', G.sph, K, null, [0.66, 0.66, 0.66]);                          // lutut
        seg(lb, 'dark', G.cyl, K, F, 0.48);                                            // betis tebal
        seg(lb, 'steel', G.cyl, [H[0] * 0.8, H[1] - 0.3, H[2] * 0.85], [K[0] * 0.95, K[1] - 0.5, K[2]], 0.12);   // piston
        seg(lb, 'crys', G.box, [K[0] + sx * 0.26, K[1] - 0.1, K[2]], [F[0] + sx * 0.22, F[1] + 0.35, F[2]], 0.05, 0.08);
        // pengapit kaki di atas rantai
        lb.add('dark', G.rbox, [F[0], 1.05, F[2]], null, [0.95, 0.3, 1.1]);
        lb.add('steel', G.cyl, [F[0], 0.62, F[2]], [0, 0, PI / 2], [0.3, 1.0, 0.3]);
        lb.build(lm, root);
        /* RANTAI KERETA KEBAL SEBENAR (Nabil: "kaki tak macam tayar kereta kebal"):
           sisi rantai penuh yang sama dengan Bastion/Juggernaut - sproket, pemalas,
           roda jalan, roda balik dan mata rantai yang bergerak. */
        ctx.trackSide(root, { sd: sx, x: F[0], z: F[2], ZF: 1.05, ZB: -1.05, TR: 0.44, NL: 30, roads: 2 });
      }
      mountAt(ctx, 0, 5.2, -0.35);
      mountAt(ctx, -1.85, 4.62, -0.35);
      mountAt(ctx, 1.85, 4.62, -0.35);
      return st => {
        const amt = clamp(Math.abs(st.fwd) / 14, 0, 1);
        const bob = Math.sin(st.time * 6) * 0.03 * amt + Math.sin(st.time * 1.3) * 0.03;
        if (st.p) st.p._bob = bob; else root.position.y = bob;
      };
    },
  },

  corsair: {
    hull(b, G) {
      b.add('body', G.rbox, [0, 0.95, -0.2], null, [1.3, 0.7, 4.4]);                // lambung
      b.add('body', G.cone, [0, 0.95, 2.55], [PI / 2, 0, 0], [1.3, 1.6, 0.7]);      // haluan tajam
      b.add('darker', G.rbox, [0, 0.62, 0.1], null, [1.0, 0.24, 5.0]);              // lunas
      b.add('rust', G.box, [0, 1.32, -0.2], null, [1.36, 0.06, 4.3]);              // dek kayu
      b.add('glass', G.sph, [0, 1.42, 0.9], null, [0.9, 0.5, 1.1]);               // kokpit
      b.add('dark', G.box, [0, 0.85, -1.55], null, [5.0, 0.22, 0.42]);             // palang cadik
      b.add('steel', G.cyl, [0, 3.7, 0.25], null, [0.14, 5.7, 0.14]);             // tiang
      b.add('steel', G.cyl, [0, 6.6, 0.25], null, [0.3, 0.3, 0.3]);
      b.add('dark', G.cyl, [0, 6.4, 0.25], null, [0.5, 0.18, 0.5]);               // sarang gagak
      b.add('steel', G.cyl, [0, 1.4, 2.6], [PI / 2 - 0.3, 0, 0], [0.06, 2.0, 0.06]); // bowsprit
      for (const sd of [-1, 1]) {
        b.add('dark', G.box, [sd * 2.4, 0.75, -1.55], null, [0.3, 0.6, 0.7]);       // garpu roda belakang
        b.add('crys', G.box, [sd * 0.66, 1.0, -0.2], null, [0.04, 0.08, 3.6]);     // jalur sisi
      }
      b.add('dark', G.box, [0, 0.55, 2.35], null, [0.3, 0.6, 0.5]);                // garpu roda hadapan
      /* (2026-10-17) "biasa sangat": kebolehannya SWAP HOOK, jadi haluan kini
         memegang PELANCAR CANGKUK besar dengan cangkuk tiga mata dan gelendong
         rantai di dek; meriam lanun di sisi, cadik pelampung, papan nama. */
      b.add('dark', G.cyl, [0, 1.45, 2.0], [PI / 2 - 0.15, 0, 0], [0.4, 1.2, 0.4]);     // pelancar cangkuk
      b.add('steel', G.torus, [0, 1.52, 2.45], [-0.15, 0, 0], [0.42, 0.42, 0.5]);
      b.add('steel', G.cyl, [0, 1.56, 2.8], [PI / 2 - 0.15, 0, 0], [0.08, 0.6, 0.08]);
      for (let i = 0; i < 3; i++) {                                                   // cangkuk tiga mata
        const a = i / 3 * TAU;
        b.add('steel', SCY(), [Math.cos(a) * 0.12, 1.6 + Math.sin(a) * 0.12, 3.1], [0, PI / 2, a], [0.45, 0.45, 0.6]);
        b.add('crys', G.cone, [Math.cos(a) * 0.36, 1.6 + Math.sin(a) * 0.36, 2.95], [-PI / 2, 0, -a + PI / 2], [0.06, 0.18, 0.06]);
      }
      b.add('dark', G.cyl, [0, 1.55, 0.0], [0, 0, PI / 2], [0.55, 0.7, 0.55]);         // gelendong rantai
      for (let i = 0; i < 4; i++) b.add('steel', G.torus, [-0.24 + i * 0.16, 1.55, 0.0], [0, PI / 2, 0], [0.32, 0.32, 0.5]);
      for (let k = 0; k < 5; k++) b.add('steel', G.torus, [0, 1.58 + k * 0.03, 0.4 + k * 0.32], [k % 2 ? 0 : PI / 2, 0, 0], [0.14, 0.2, 0.5]);   // rantai ke pelancar
      for (const sd of [-1, 1]) {
        for (const z of [-0.8, 0.2]) {                                                 // meriam lanun
          b.add('dark', G.cyl, [sd * 0.75, 1.0, z], [0, 0, sd * -PI / 2], [0.22, 0.4, 0.22]);
          b.add('steel', G.torus, [sd * 0.94, 1.0, z], [0, PI / 2, 0], [0.24, 0.24, 0.4]);
        }
        b.add('body', G.cyl, [sd * 2.4, 1.15, -1.55], [PI / 2, 0, 0], [0.42, 1.8, 0.42]);   // pelampung cadik
        b.add('body', G.cone, [sd * 2.4, 1.15, -0.45], [PI / 2, 0, 0], [0.42, 0.45, 0.42]);
        b.add('crys', G.box, [sd * 2.4, 1.38, -1.55], null, [0.05, 0.03, 1.6]);
      }
    },
    limb(ctx) {
      const { root, Builder, G, wheels, sp } = ctx;
      const tm = { rubber: new THREE.MeshStandardMaterial({ color: 0x121417, roughness: 0.95 }), steel: ctx.mats.steel, crys: ctx.mats.crys };
      const wheel = (x, z, R, front) => {
        const holder = grp(root, x, R, z), spin = grp(holder);
        const t = ctx.tyre(); t.scale.setScalar(R / 0.46); spin.add(t);   // tayar dikongsi (models.js)
        wheels.push({ holder, spin, front });
      };
      wheel(0, 2.35, 0.48, true);
      wheel(-2.4, -1.55, 0.55, false);
      wheel(2.4, -1.55, 0.55, false);
      // layar: segi tiga pada boom berpusing
      const rig = grp(root, 0, 0, 0.25);
      const sh = new THREE.Shape();
      sh.moveTo(0, 2.5); sh.lineTo(0, 6.3); sh.lineTo(-2.9, 2.5); sh.closePath();   // dinaikkan (Nabil: layar kacau bahagian bawah)
      const sail = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: new THREE.Color('#e8e2d0'), roughness: 0.8, side: THREE.DoubleSide }));
      sail.rotation.y = PI / 2; rig.add(sail);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4.6), glowMat(sp.accent, 1.6));
      stripe.position.set(0.02, 4.05, -0.75); stripe.rotation.set(0, PI / 2, Math.atan2(2.9, 3.8)); stripe.scale.y = 0.8; rig.add(stripe);
      const boom = new THREE.Mesh(G.cyl, ctx.mats.steel);
      boom.scale.set(0.1, 3.0, 0.1); boom.rotation.x = PI / 2; boom.position.set(0, 2.5, -1.45); rig.add(boom);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshStandardMaterial({ color: 0x15171c, emissive: new THREE.Color(sp.accent), emissiveIntensity: 0.25, side: THREE.DoubleSide }));
      flag.position.set(0, 6.95, -0.2); root.add(flag);
      mountAt(ctx, -1.05, 1.28, -1.55);
      mountAt(ctx, 1.05, 1.28, -1.55);
      let sa = 0;
      return st => {
        sa = damp(sa, clamp((st.steer || 0) * 0.6 + Math.sin(st.time * 0.7) * 0.15, -0.8, 0.8), 3, st.dt);
        rig.rotation.y = sa;
        flag.rotation.y = PI / 2 + Math.sin(st.time * 6) * 0.25;
        flag.scale.x = 1 + Math.sin(st.time * 9) * 0.05;
      };
    },
  },

  /* ================= CRYSTAL - permata terapung (2026-10-18, idea Nabil) =================
     Dilihat dari atas: BERLIAN panjang dan NIPIS (Nabil: "badan nipis dan
     panjang sikit, biru neon dan putih bercahaya"). Kepingan permata putih
     mutiara dengan "paviliun" cetek yang menunjuk ke tanah, garis neon biru
     mengikut faset, bilah kristal di setiap hujung. Empat senjata di empat
     hujung berlian. Di atasnya TIGA kristal besar berdiri tegak, dipegang
     cakar perak - kristal itu yang menembak Prism Storm. Tiada tayar, tiada
     pod hover: ia terapung atas medan anti-graviti (gelang rombus neon). */
  crystalgem: {        // BUKAN "crystal" - nama itu milik badan Cascade (hulls.js)
    hull(b, G, HG) {
      const Y = CRY_Y, X = CRY_X, Z = CRY_Z;
      b.add('body', GEM(0.06, 0.14), [0, Y, 0], null, [1, 1, 1]);                       // kepingan permata nipis
      // paviliun cetek: piramid empat segi terbalik
      b.add('body', HGcone4(), [0, Y - 0.45, 0], [PI, 0, 0], [X * 2, 0.9, Z * 2]);
      b.add('darker', HGcone4(), [0, Y - 0.52, 0], [PI, 0, 0], [X * 1.7, 0.8, Z * 1.7]);
      const tips = [[0, Z], [X, 0], [0, -Z], [-X, 0]];
      for (let i = 0; i < 4; i++) {
        const a = tips[i], c = tips[(i + 1) % 4];
        seg(b, 'crys', G.box, [a[0], Y + 0.02, a[1]], [c[0], Y + 0.02, c[1]], 0.07, 0.1);       // tepi neon
        seg(b, 'steel', G.box, [a[0] * 0.97, Y - 0.12, a[1] * 0.97], [c[0] * 0.97, Y - 0.12, c[1] * 0.97], 0.05, 0.06);
        for (const k of [0.72, 0.5]) seg(b, 'crys', G.box, [a[0] * k, Y + 0.23, a[1] * k], [c[0] * k, Y + 0.23, c[1] * k], 0.03, 0.025);   // glif bersarang
        seg(b, 'crys', G.box, [a[0] * 0.95, Y + 0.18, a[1] * 0.95], [a[0] * 0.3, Y + 0.26, a[1] * 0.3], 0.03, 0.03);      // garis faset
      }
      // bilah kristal tajam menonjol dari setiap hujung
      for (const [x, z] of tips) {
        const L = z ? 1.9 : 0.8, ux = Math.sign(x), uz = Math.sign(z);
        b.add('crys', HG.oct, [x + ux * L * 0.42, Y + 0.02, z + uz * L * 0.42], null, z ? [0.36, 0.22, L * 1.6] : [L * 1.6, 0.2, 0.34]);
      }
      // rabung tulang belakang
      b.add('steel', HG.oct, [0, Y + 0.22, 0], null, [0.4, 0.22, Z * 1.85]);
      b.add('crys', HG.oct, [0, Y + 0.23, 0], null, [0.08, 0.26, Z * 1.9]);
      // sirip perak melengkung naik di bahu
      for (const sd of [-1, 1]) for (const z of [-3.2, 3.2]) {
        curve(b, 'steel', G.cyl, [sd * 0.55, Y + 0.15, z], [sd * 1.15, Y + 0.7, z * 0.93], [sd * 0.95, Y + 1.25, z * 0.84], 4, 0.06, 0.025);
      }
      // tapak senjata di hujung
      for (const [x, z] of tips) {
        b.add('steel', G.cyl, [x * 0.86, Y + 0.18, z * 0.86], null, [0.9, 0.1, 0.9]);
        b.add('crys', G.torus, [x * 0.86, Y + 0.2, z * 0.86], [PI / 2, 0, 0], [0.95, 0.95, 0.4]);
      }
      // TETAPAN CAKAR perak: setiap kristal dipegang 4 cakar melengkung
      for (const [z, h] of CRYS3) {
        b.add('steel', G.cyl, [0, Y + 0.3, z], null, [0.95, 0.1, 0.95]);
        b.add('crys', G.torus, [0, Y + 0.33, z], [PI / 2, 0, 0], [0.98, 0.98, 0.35]);
        for (let k = 0; k < 4; k++) {
          const a = k / 4 * TAU + PI / 4, cx = Math.cos(a), cz = Math.sin(a);
          curve(b, 'steel', G.cyl, [cx * 0.42, Y + 0.3, z + cz * 0.42], [cx * 0.78, Y + 0.8, z + cz * 0.78], [cx * 0.36, Y + 0.55 + h * 0.34, z + cz * 0.36], 4, 0.08, 0.04);
        }
      }
    },
    limb(ctx) {
      const { root, sp, mats } = ctx;
      const Y = CRY_Y;
      const neon = new THREE.Color(sp.accent || '#22d3ff');
      const white = new THREE.Color('#ffffff');
      // putih bercahaya: panel meja mahkota memancar putih kebiruan
      const pearl = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, emissive: 0xd8f2ff, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.25 });
      const table = new THREE.Mesh(GEM(0.03, 0.05), pearl);
      table.position.y = Y + 0.17; table.scale.set(0.42, 1, 0.42); root.add(table);
      // kristal: biru neon lutsinar, teras putih bercahaya
      const shell = new THREE.MeshStandardMaterial({ color: neon.clone().multiplyScalar(0.55), emissive: neon,
        emissiveIntensity: 0.9, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.78, flatShading: true });
      const core = new THREE.MeshBasicMaterial({ color: white.clone().lerp(neon, 0.15) });
      const edge = new THREE.MeshBasicMaterial({ color: neon.clone().lerp(white, 0.5), wireframe: true, transparent: true, opacity: 0.6 });
      const crystals = [];
      for (const [z, h] of CRYS3) {
        const g = grp(root, 0, Y + CRY_BASE + h * 0.5, z);
        const geo = crystalGeo(h);
        g.add(new THREE.Mesh(geo, shell));
        g.add(new THREE.Mesh(geo, edge));
        const c = new THREE.Mesh(crystalGeo(h * 0.8), core); c.scale.set(0.34, 1, 0.34); g.add(c);
        // gelang putih bercahaya terapung di pinggang kristal
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 6), pearl);
        ring.rotation.x = PI / 2; g.add(ring);
        crystals.push({ g, y0: g.position.y, h, ring, ph: z });
      }
      ctx.crystals = crystals;
      // MEDAN ANTI-GRAVITI: gelang rombus neon jatuh ke tanah + hujung paviliun bersinar putih
      const fieldM = new THREE.MeshBasicMaterial({ color: neon, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(RHOMB_RING(), fieldM.clone());
        r.rotation.x = -PI / 2; root.add(r); rings.push(r);
      }
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), core);
      tip.position.y = Y - 0.95; tip.scale.set(1, 1.3, 1); root.add(tip);
      const shardG = new THREE.OctahedronGeometry(0.15, 0);
      const shards = [];
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(shardG, shell); s.scale.set(1, 2, 1); root.add(s); shards.push(s); }
      // empat senjata di empat hujung berlian
      for (const [x, z] of [[0, CRY_Z], [CRY_X, 0], [0, -CRY_Z], [-CRY_X, 0]]) mountAt(ctx, x * 0.86, Y + 0.3, z * 0.86);
      let charge = 0, spin = 0;
      const anim = st => {
        const p = st.p, on = !!(p && p.prism);
        charge = damp(charge, on ? 1 : 0, on ? 6 : 2.5, st.dt || 0.016);
        const bob = Math.sin(st.time * 1.6) * 0.09;
        if (p) p._bob = 0.15 + bob; else root.position.y = 0.15 + bob;
        spin += (st.dt || 0.016) * (0.6 + charge * 9);
        for (const c of crystals) {
          c.g.position.y = c.y0 + Math.sin(st.time * 2 + c.ph) * 0.06 + charge * 0.75;
          c.g.rotation.y = spin * (c.ph > 0 ? 1 : c.ph < 0 ? -1 : 1.4);
          c.ring.rotation.z = -spin * 2;
          c.ring.scale.setScalar(1 + charge * 0.5);
        }
        shell.emissiveIntensity = 0.9 + charge * 1.6 + Math.sin(st.time * 3) * 0.1;
        pearl.emissiveIntensity = 0.8 + charge * 0.8 + Math.sin(st.time * 2.2) * 0.12;
        for (let i = 0; i < 3; i++) {
          const u = ((st.time * 0.55 + i / 3) % 1);
          const r = rings[i];
          r.position.y = Y - 0.35 - u * (Y - 0.4);
          r.scale.setScalar(0.5 + u * 0.55);
          r.material.opacity = (1 - u) * (0.45 + charge * 0.3);
        }
        tip.rotation.y = st.time * 2;
        for (let i = 0; i < 6; i++) {
          const a = st.time * 1.3 + i / 6 * TAU;
          shards[i].position.set(Math.cos(a) * 1.2, Y - 0.75 + Math.sin(st.time * 3 + i) * 0.1, Math.sin(a) * 3.0);
          shards[i].rotation.y = a * 2;
        }
      };
      anim({ time: 0, dt: 0.016, fwd: 0, p: null });      // pose awal (kad garaj tidak memanggil animate)
      return anim;
    },
  },

  /* ================= CONDOR - pemangsa roda-rotor (2026-10-18) =================
     Nabil: "nampak biasa jaa, bagi lebih menggerunkan". Kini kenderaan serang
     hitam besi: bajak rempuh BERGIGI di hadapan, kokpit berperisai bersudut
     dengan celah mata MERAH (tiada kaca gelembung), plat perisai bertindih
     dengan duri, dua cerobong ekzos membara, dan bonggol rumah rotor di
     belakang. EMPAT RODA BESAR berlengan ayun - setiap roda ialah roda berdut
     berbilah kipas dengan hab berduri. Bila Rotor Drop diaktifkan, lengan
     berayun naik dan roda berpusing 90 darjah jadi rotor: Condor terbang,
     kemudian mendarat atas tayarnya sendiri dengan hentakan. */
  condor: {
    hull(b, G, HG) {
      // perut berperisai rendah + badan baji
      b.add('darker', G.box, [0, 0.95, -0.1], null, [1.9, 0.5, 4.6]);
      b.add('body', G.box, [0, 1.35, -0.4], null, [2.05, 0.55, 3.3]);
      b.add('body', G.box, [0, 1.3, 1.45], [-0.32, 0, 0], [2.0, 0.35, 1.5]);          // glasis condong
      for (const sd of [-1, 1]) b.add('body', G.box, [sd * 1.0, 1.42, -0.4], [0, 0, sd * 0.45], [0.35, 0.5, 3.4]);   // bahu bersudut
      // BAJAK REMPUH bergigi
      b.add('steel', G.box, [0, 0.82, 2.55], [-0.5, 0, 0], [2.5, 0.85, 0.16]);
      b.add('dark', G.box, [0, 0.82, 2.45], [-0.5, 0, 0], [2.3, 0.7, 0.1]);
      for (let i = 0; i < 7; i++) b.add('steel', G.cone, [-1.08 + i * 0.36, 0.42, 2.92], [PI / 2 + 0.35, 0, 0], [0.17, 0.55, 0.17]);
      for (const sd of [-1, 1]) {
        seg(b, 'dark', G.cyl, [sd * 0.7, 1.05, 1.9], [sd * 0.8, 0.95, 2.45], 0.16);    // piston bajak
        b.add('steel', G.cone, [sd * 1.28, 0.95, 2.5], [PI / 2 - 0.2, 0, sd * -0.6], [0.18, 0.9, 0.18]);   // gading sudut
      }
      // KOKPIT berperisai bersudut + celah mata merah
      b.add('dark', HG.frust, [0, 1.95, 0.55], null, [1.35, 0.65, 1.5]);
      b.add('body', G.box, [0, 2.3, 0.45], null, [1.0, 0.1, 1.2]);
      b.add('crys', G.box, [0, 1.98, 1.27], [-0.25, 0, 0], [0.95, 0.08, 0.06]);          // celah visor merah
      for (const sd of [-1, 1]) {
        b.add('crys', G.box, [sd * 0.55, 1.18, 2.12], [-0.3, 0, sd * 0.25], [0.42, 0.08, 0.06]);  // mata lampu sipit merah
        b.add('dark', G.box, [sd * 0.75, 2.12, 0.6], [0, 0, sd * 0.6], [0.08, 0.5, 1.3]);         // bilah sisi kokpit
      }
      // plat perisai bertindih + duri di sisi
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          b.add('darker', G.box, [sd * 1.18, 1.25, 0.9 - i * 0.82], [0, 0, sd * 0.25], [0.12, 0.62, 0.8]);
          b.add('steel', G.cone, [sd * 1.32, 1.4, 0.9 - i * 0.82], [0, 0, sd * -PI / 2], [0.12, 0.42, 0.12]);
        }
        b.add('crys', G.box, [sd * 1.04, 1.62, -0.4], null, [0.03, 0.05, 2.9]);           // jalur merah
        // pangkal lengan ayun
        for (const z of [1.25, -1.6]) b.add('dark', G.rbox, [sd * 1.05, 1.1, z], null, [0.5, 0.6, 0.8]);
        // pangkal jet thruster belakang (nasel berpusing dalam limb)
        b.add('dark', G.rbox, [sd * 0.78, 1.55, -2.25], null, [0.5, 0.55, 0.7]);
        b.add('tail', G.box, [sd * 0.35, 1.0, -2.6], null, [0.3, 0.08, 0.05]);
      }
      // bonggol rumah rotor di belakang dengan gelang
      b.add('body', HG.frust, [0, 1.85, -1.25], null, [1.4, 0.55, 1.4]);
      b.add('steel', G.torus, [0, 2.15, -1.25], [PI / 2, 0, 0], [0.62, 0.62, 0.5]);
      b.add('crys', G.cyl, [0, 2.16, -1.25], null, [0.5, 0.04, 0.5]);
      b.add('darker', G.box, [0, 1.1, -2.45], null, [1.9, 0.5, 0.25]);                    // perisai belakang
    },
    limb(ctx) {
      const { root, G, mats, sp, Builder } = ctx;
      const rub = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.92 });
      const acc = new THREE.Color(sp.accent || '#ff2a1a');
      const hub = new THREE.MeshStandardMaterial({ color: acc.clone().multiplyScalar(0.3), emissive: acc, emissiveIntensity: 1.8, roughness: 0.3 });
      const bladeM = new THREE.MeshStandardMaterial({ color: 0x8e949c, metalness: 0.9, roughness: 0.3 });
      const armGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
      const ductM = mats.dark.clone(); ductM.side = THREE.DoubleSide;
      const R = 0.82;
      const wheels = [];
      for (const sd of [-1, 1]) for (const [zp, front] of [[1.25, true], [-1.6, false]]) {
        const pivot = new THREE.Vector3(sd * 1.15, 1.1, zp);
        const ground = new THREE.Vector3(sd * 2.0, R, zp + (front ? 0.25 : -0.2));
        const air = new THREE.Vector3(sd * 2.6, 1.8, zp + (front ? 0.7 : -0.6));
        const arm = new THREE.Mesh(armGeo, mats.dark); root.add(arm);
        const arm2 = new THREE.Mesh(armGeo, mats.steel); root.add(arm2);
        const holder = grp(root);
        const tilt = grp(holder);
        const spin = grp(tilt);
        /* prestasi: setiap bahagian roda dicantum ikut bahan (dahulu ~19 mesh/roda) */
        const wb = new Builder();
        wb.add('rub', TYRE_C(R), [0, 0, 0], [0, PI / 2, 0]);
        for (let i = 0; i < 10; i++) {             // bunga tayar kasar (cangkuk lumpur)
          const a = i / 10 * TAU;
          wb.add('rub', G.box, [0, Math.cos(a) * (R + 0.02), Math.sin(a) * (R + 0.02)], [-a + 0.3, 0, 0], [0.6, 0.16, 0.2]);
        }
        wb.add('duct', DUCT_C(R), [0, 0, 0], [0, 0, PI / 2]);
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU;
          wb.add('blade', G.box, [0, Math.cos(a) * 0.22, Math.sin(a) * 0.22], [-a, 0, 0.5], [0.05, 0.4, 0.17]);
        }
        wb.add('hub', G.cyl, [0, 0, 0], [0, 0, PI / 2], [0.26, 0.52, 0.26]);
        wb.add('steel', G.cone, [sd * 0.5, 0, 0], [0, 0, -sd * PI / 2], [0.2, 0.55, 0.2]);   // hab berduri
        wb.build({ rub, duct: ductM, blade: bladeM, hub, steel: mats.steel }, spin);
        const shroud = new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.07, 6, 28), mats.steel);
        shroud.rotation.y = PI / 2; tilt.add(shroud);
        wheels.push({ sd, pivot, ground, air, arm, arm2, holder, tilt, spin, front });
      }
      /* JET THRUSTER BELAKANG (idea Nabil): dua nasel jet di buritan. Twist:
         ia berpusing ke bawah (gaya VTOL) bila Condor terbang, membantu rotor
         mengangkat; di darat ia menghala ke belakang dan apinya membesar
         ikut kelajuan / nitro. */
      const flameM = new THREE.MeshBasicMaterial({ color: acc.clone().lerp(new THREE.Color('#ffb040'), 0.45), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
      const coreM = new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const jets = [];
      for (const sd of [-1, 1]) {
        const piv = grp(root, sd * 0.95, 1.6, -2.3);
        const jb = new ctx.Builder();
        jb.add('dark', G.cyl, [0, 0, -0.35], [PI / 2, 0, 0], [0.62, 1.2, 0.62]);              // nasel
        jb.add('body', G.cyl, [0, 0, -0.05], [PI / 2, 0, 0], [0.7, 0.5, 0.7]);
        jb.add('steel', G.torus, [0, 0, 0.22], null, [0.36, 0.36, 0.6]);                   // bibir salur masuk
        jb.add('darker', G.cyl, [0, 0, 0.22], [PI / 2, 0, 0], [0.5, 0.05, 0.5]);
        jb.add('steel', G.cone, [0, 0, -1.05], [-PI / 2, 0, 0], [0.62, 0.35, 0.62]);        // muncung nozel
        jb.add('crys', G.torus, [0, 0, -0.9], null, [0.3, 0.3, 0.6]);                       // gelang membara
        jb.add('dark', G.box, [sd * 0.38, 0.25, -0.5], [0, 0, sd * 0.5], [0.06, 0.5, 0.7]); // sirip
        jb.build({ dark: mats.dark, body: mats.body, steel: mats.steel, darker: mats.darker, crys: mats.crys }, piv);
        const fl = new THREE.Mesh(G.cone, flameM); fl.rotation.x = -PI / 2; piv.add(fl);
        const fc = new THREE.Mesh(G.cone, coreM); fc.rotation.x = -PI / 2; piv.add(fc);
        jets.push({ piv, fl, fc });
      }
      mountAt(ctx, 0, 2.42, -1.25);
      mountAt(ctx, -0.95, 1.95, -0.5);
      mountAt(ctx, 0.95, 1.95, -0.5);
      const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
      let k = 0, roll = 0, wasAir = false;
      const anim = st => {
        const p = st.p, dt = st.dt || 0.016;
        // keadaan terbang: 0 darat -> 1 rotor (dari ketinggian sebenar kereta)
        const want = p ? (p.fly ? 1 : clamp((p.y || 0) / 2.2, 0, 1)) : 0;
        k = damp(k, want, 5, dt);
        const sm = k * k * (3 - 2 * k);
        roll += dt * (st.fwd || 0) / R + dt * sm * 38;
        for (const w of wheels) {
          _p.copy(w.ground).lerp(w.air, sm);
          w.holder.position.copy(_p);
          w.tilt.rotation.z = -w.sd * sm * PI / 2;
          w.holder.rotation.y = w.front && sm < 0.5 ? -(st.steer || 0) * 0.4 * (1 - sm * 2) : 0;
          w.spin.rotation.x = roll;
          // lengan ayun: dari bahu ke hab roda
          _d.copy(_p).sub(w.pivot);
          const L = _d.length();
          for (const [a, th] of [[w.arm, 0.32], [w.arm2, 0.12]]) {
            a.position.copy(w.pivot);
            a.quaternion.setFromUnitVectors(_z, _d.clone().normalize());
            a.scale.set(th, a === w.arm ? 0.34 : 0.5, L);
          }
          w.arm2.position.y += 0.24;
        }
        // jet: menghala ke bawah bila terbang, api ikut kelajuan / nitro
        const thrust = !p ? 0.18 : clamp(0.35 + Math.abs(st.fwd || 0) / 30 + sm * 0.6 + (p && p.nitroOn ? 0.6 : 0), 0, 1.6);
        for (const J of jets) {
          J.piv.rotation.x = -sm * 1.15;
          const f = thrust * (0.85 + Math.sin(st.time * 40 + J.piv.position.x) * 0.15);
          J.fl.scale.set(0.42, 0.6 + f * 1.6, 0.42); J.fl.position.z = -1.25 - (0.3 + f * 0.8);
          J.fc.scale.set(0.2, 0.3 + f * 0.9, 0.2); J.fc.position.z = -1.2 - (0.15 + f * 0.45);
        }
        if (p) {
          p._tilt = -sm * 0.06;
          // mendarat: debu dari setiap roda
          const air = sm > 0.6;
          if (wasAir && !air && st.g) for (const w of wheels) {
            const c = Math.cos(p.ang), s = Math.sin(p.ang);
            const wx = p.x + w.ground.x * c + w.ground.z * s, wz = p.z - w.ground.x * s + w.ground.z * c;
            st.g.fx.smoke(wx, 0.3, wz, 3, { speed: 3, size: 1.2, life: 0.7, alpha: 0.4 });
          }
          wasAir = air;
        }
      };
      anim({ time: 0, dt: 0.016, fwd: 0, p: null });      // pose awal: roda di tanah
      return anim;
    },
  },
};

/* Crystal: aras kepingan, separuh lebar (X) & separuh panjang (Z) berlian */
const CRY_Y = 1.25, CRY_X = 1.7, CRY_Z = 5.0;
/* kristal berdiri dari aras ini di atas kepingan (systems2 Prism Storm guna nilai sama) */
const CRY_BASE = 0.4;
export const CRYS_Y = CRY_Y + CRY_BASE;
/* kedudukan 3 kristal Crystal di atas badan: [z, tinggi] - tengah paling tinggi */
export const CRYS3 = [[2.2, 2.1], [0, 2.9], [-2.2, 2.1]];
/* kristal tiang heksagon dengan hujung tajam atas & bawah (tinggi h) */
const _cg = {};
function crystalGeo(h) {
  if (_cg[h]) return _cg[h];
  const r = 0.42, pts = [];
  pts.push(new THREE.Vector2(0, -h / 2));
  pts.push(new THREE.Vector2(r, -h / 2 + h * 0.2));
  pts.push(new THREE.Vector2(r * 1.05, h * 0.12));
  pts.push(new THREE.Vector2(r * 0.92, h / 2 - h * 0.24));
  pts.push(new THREE.Vector2(0, h / 2));
  return (_cg[h] = new THREE.LatheGeometry(pts, 6));
}
/* badan permata: rombus (hujung +-CRY_Z, +-CRY_X) diekstrud dengan serong -> faset */
const _gem = {};
function GEM(t, bev) {
  const k = t + '_' + bev;
  if (_gem[k]) return _gem[k];
  const sh = new THREE.Shape();
  const X = CRY_X - bev, Z = CRY_Z - bev * 2;
  sh.moveTo(0, Z); sh.lineTo(X, 0); sh.lineTo(0, -Z); sh.lineTo(-X, 0); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 });
  g.rotateX(-PI / 2);                      // bentuk y -> -Z... dibetulkan di bawah
  g.scale(1, 1, -1);
  g.computeVertexNormals();
  return (_gem[k] = g);
}
let _rr = null;
/* gelang rombus rata (medan anti-graviti Crystal) */
function RHOMB_RING() {
  if (_rr) return _rr;
  const o = new THREE.Shape(), X = CRY_X + 0.05, Z = CRY_Z, w = 0.16;
  o.moveTo(0, Z); o.lineTo(X, 0); o.lineTo(0, -Z); o.lineTo(-X, 0); o.closePath();
  const h = new THREE.Path();
  h.moveTo(0, Z - w * 2.2); h.lineTo(-X + w, 0); h.lineTo(0, -Z + w * 2.2); h.lineTo(X - w, 0); h.closePath();
  o.holes.push(h);
  return (_rr = new THREE.ShapeGeometry(o));
}
let _c4 = null;
/* kon empat segi: bucu di +-X dan +-Z (bukan segi empat sama diputar) */
function HGcone4() { return _c4 || (_c4 = new THREE.ConeGeometry(0.5, 1, 4)); }

const _tyc = {}, _dc = {};
const TYRE_C = R => _tyc[R] || (_tyc[R] = new THREE.TorusGeometry(R - 0.22, 0.25, 10, 26));
const DUCT_C = R => _dc[R] || (_dc[R] = new THREE.CylinderGeometry(R - 0.4, R - 0.4, 0.46, 22, 1, true));
let _scy = null;
function SCY() { return _scy || (_scy = new THREE.TorusGeometry(0.62, 0.06, 5, 20, PI * 0.95)); }
let _tri3 = null;
/* prisma segi tiga rata: hujung di +Z, belakang lebar - asas badan siluman */
function TRI3() {
  if (_tri3) return _tri3;
  const g = new THREE.ConeGeometry(0.5, 1, 3, 1);
  g.rotateX(PI / 2);         // hujung kon ke +Z
  return (_tri3 = g);
}
const _arrows = {};
/* badan siluman: anak panah rata (hidung +Z, takuk di belakang), tebal t */
function ARROW(t) {
  if (_arrows[t]) return _arrows[t];
  const sh = new THREE.Shape();
  sh.moveTo(0, 2.6); sh.lineTo(-1.75, -1.7); sh.lineTo(0, -1.05); sh.lineTo(1.75, -1.7); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1 });
  g.rotateX(PI / 2);                    // bentuk y -> +Z, ketebalan ke bawah
  g.translate(0, t, 0);
  return (_arrows[t] = g);
}
function HGcone() { return _cone4 || (_cone4 = new THREE.ConeGeometry(0.5, 1, 3)); }
let _cone4 = null;

/* ======================= model senjata tandatangan ======================= */
let _arc = null;
export function weaponModel2(id, b, G, HG) {
  switch (id) {
    case 'spine':
      // mortar kulit kerang: lingkaran torus mengecil dengan duri
      b.add('dark', G.rbox, [0, 0.3, -0.3], null, [0.7, 0.5, 0.7]);
      for (let i = 0; i < 6; i++) {
        const s = 0.62 - i * 0.07;
        b.add(i % 2 ? 'accent' : 'steel', G.torus, [0, 0.5 + i * 0.12, 0.05 + i * 0.16], [PI / 2 - 0.6, 0, i * 0.5], [s, s, 0.55]);
        b.add('steel', G.cone, [Math.cos(i * 1.4) * s * 0.5, 0.5 + i * 0.12 + Math.sin(i * 1.4) * s * 0.5, 0.05 + i * 0.16], [Math.sin(i * 1.4), 0, -Math.cos(i * 1.4)], [0.08, 0.32, 0.08]);
      }
      b.add('accent', G.sph, [0, 1.25, 1.0], null, [0.22, 0.22, 0.22]);
      return 1.15;
    case 'maul':
      // tukul omboh: silinder hidraulik dengan kepala blok condong ke tanah
      b.add('dark', G.rbox, [0, 0.36, -0.3], null, [0.72, 0.6, 0.8]);
      b.add('darker', G.cyl, [0, 0.45, 0.4], [PI / 2 - 0.35, 0, 0], [0.42, 1.0, 0.42]);
      b.add('steel', G.cyl, [0, 0.25, 0.95], [PI / 2 - 0.35, 0, 0], [0.24, 0.6, 0.24]);
      b.add('dark', G.rbox, [0, 0.05, 1.3], [-0.35, 0, 0], [0.8, 0.6, 0.5]);       // kepala tukul
      for (const x of [-0.24, 0, 0.24]) b.add('accent', G.box, [x, 0.06, 1.56], [-0.35, 0, 0], [0.06, 0.5, 0.04]);   // retak magma
      for (const sd of [-1, 1]) b.add('steel', G.cyl, [sd * 0.3, 0.75, -0.4], null, [0.12, 0.6, 0.12]);   // ekzos
      return 1.45;
    case 'javelin':
      // rel pelancar dengan lembing termuat dan cengkam bercakar
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.5, 0.36, 1.0]);
      b.add('steel', G.box, [0, 0.42, 0.5], null, [0.16, 0.08, 1.9]);
      b.add('darker', G.cyl, [0, 0.58, 0.45], [PI / 2, 0, 0], [0.09, 2.3, 0.09]);   // batang lembing
      b.add('accent', G.cone, [0, 0.58, 1.75], [PI / 2, 0, 0], [0.2, 0.55, 0.2]);   // mata lembing
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.58, -0.3 + i * 0.25], [0, 0, 0], [0.16, 0.16, 0.6]);
      for (const sd of [-1, 1]) b.add('steel', G.cone, [sd * 0.18, 0.62, 0.9], [PI / 2, 0, sd * 0.5], [0.06, 0.3, 0.06]);
      return 1.9;
    case 'glaive': {
      // bilah sabit tergenggam dalam pengapit
      if (!_arc) _arc = new THREE.TorusGeometry(0.62, 0.07, 6, 18, PI * 1.25);
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.5, 0.4, 0.7]);
      b.add('steel', G.box, [0, 0.36, 0.25], null, [0.2, 0.2, 0.5]);
      b.add('accent', _arc, [0, 0.5, 0.55], [PI / 2, 0, PI * 0.4], [1, 1, 1]);
      b.add('steel', _arc, [0, 0.48, 0.55], [PI / 2, 0, PI * 0.4], [1.08, 1.08, 0.5]);
      b.add('accent', G.sph, [0, 0.5, 0.55], null, [0.14, 0.14, 0.14]);
      return 1.2;
    }
    case 'stinger':
      // sarang tiub heksagon dengan hujung penyengat kuning
      b.add('dark', G.rbox, [0, 0.3, -0.25], null, [0.7, 0.5, 0.7]);
      for (let i = 0; i < 7; i++) {
        const a = i / 6 * TAU, r = i === 6 ? 0 : 0.26;
        const x = Math.cos(a) * r, y = 0.45 + Math.sin(a) * r;
        b.add(i % 2 ? 'darker' : 'army', HG.hex, [x, y, 0.4], [PI / 2, 0, 0], [0.26, 0.9, 0.26]);
        b.add('accent', G.cone, [x, y, 0.95], [PI / 2, 0, 0], [0.1, 0.24, 0.1]);
      }
      return 1.05;
    case 'lantern':
      // tanglung bersangkar bercahaya atas rel pelancar condong
      b.add('dark', G.rbox, [0, 0.28, -0.2], null, [0.7, 0.4, 0.8]);
      for (const sd of [-1, 1]) b.add('steel', G.box, [sd * 0.24, 0.55, 0.25], [-0.5, 0, 0], [0.06, 0.08, 1.1]);
      b.add('accent', G.sph, [0, 0.78, 0.45], null, [0.42, 0.5, 0.42]);
      for (let i = 0; i < 4; i++) b.add('steel', G.box, [Math.cos(i * PI / 2) * 0.22, 0.78, 0.45 + Math.sin(i * PI / 2) * 0.22], null, [0.04, 0.6, 0.04]);
      b.add('steel', G.cone, [0, 1.12, 0.45], null, [0.4, 0.22, 0.4]);
      b.add('steel', G.cyl, [0, 0.46, 0.45], null, [0.36, 0.06, 0.36]);
      return 0.8;
    case 'chime':
      // loceng tiub bertiga panjang berbeza + mulut loceng emas
      b.add('dark', G.rbox, [0, 0.3, -0.25], null, [0.6, 0.4, 0.7]);
      b.add('steel', G.box, [0, 0.95, -0.05], null, [0.7, 0.06, 0.12]);
      for (let i = 0; i < 3; i++) b.add('accent', G.cyl, [(i - 1) * 0.22, 0.95 - (0.25 + i * 0.12), -0.05], null, [0.11, 0.5 + i * 0.24, 0.11]);
      b.add('accent', G.cone, [0, 0.36, 0.75], [-PI / 2, 0, 0], [0.62, 0.7, 0.62]);
      b.add('steel', G.torus, [0, 0.36, 1.08], null, [0.32, 0.32, 0.25]);
      return 1.15;
    case 'fork':
      // laras trisula merah - tiga cabang
      b.add('dark', G.rbox, [0, 0.3, -0.15], null, [0.5, 0.42, 0.9]);
      b.add('steel', G.cyl, [0, 0.34, 0.45], [PI / 2, 0, 0], [0.16, 0.6, 0.16]);
      for (const a of [-0.35, 0, 0.35]) {
        b.add('steel', G.cyl, [Math.sin(a) * 0.4, 0.34, 0.9], [PI / 2, 0, -a], [0.07, 0.75, 0.07]);
        b.add('accent', G.cone, [Math.sin(a) * 0.62, 0.34, 1.25], [PI / 2, 0, -a], [0.1, 0.24, 0.1]);
      }
      b.add('accent', G.torus, [0, 0.34, 0.62], [0, 0, 0], [0.3, 0.3, 0.4]);
      return 1.3;
    case 'rime':
      // tangki fros + muncung gugusan ais tajam
      b.add('dark', G.rbox, [0, 0.3, -0.2], null, [0.62, 0.48, 0.8]);
      b.add('steel', G.cyl, [-0.3, 0.58, -0.3], [PI / 2, 0, 0], [0.3, 0.7, 0.3]);
      b.add('steel', G.cyl, [0, 0.32, 0.45], [PI / 2, 0, 0], [0.3, 0.8, 0.3]);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        b.add('accent', G.cone, [Math.cos(a) * 0.17, 0.32 + Math.sin(a) * 0.17, 1.0], [PI / 2, 0, 0], [0.1, 0.5 + (i % 2) * 0.2, 0.1]);
      }
      b.add('accent', G.ico, [0, 0.32, 0.9], null, [0.24, 0.24, 0.3]);
      return 1.3;
    case 'hurago':
      /* pengimbas berlian: tiga berlian (seperti badan Hibachi) mengapit laras
         prisma, gelang imbasan dan kanta merah */
      b.add('dark', G.rbox, [0, 0.3, -0.3], null, [0.62, 0.4, 0.7]);
      b.add('accent', HG.oct, [0, 0.42, -0.3], null, [0.5, 0.42, 0.62]);
      for (const sd of [-1, 1]) {
        b.add('dark', HG.oct, [sd * 0.34, 0.36, 0.25], null, [0.26, 0.34, 0.5]);
        b.add('steel', G.box, [sd * 0.16, 0.36, 0.85], null, [0.05, 0.12, 1.1]);
      }
      b.add('steel', G.cyl, [0, 0.36, 0.7], [PI / 2, 0, 0], [0.14, 1.2, 0.14]);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.36, 0.55 + i * 0.3], null, [0.22 - i * 0.03, 0.22 - i * 0.03, 0.4]);
      b.add('accent', HG.oct, [0, 0.36, 1.42], null, [0.16, 0.16, 0.3]);
      return 1.5;
    case 'diamond':
      /* DIAMOND (tandatangan Crystal) - teknologi ASING, warna sama dengan
         Crystal: putih mutiara bercahaya + biru neon. Bukan laras senapang:
         dua BILAH garpu putih melengkung (seperti sepit) membentuk saluran,
         rel tenaga neon di antaranya, tiga gelang neon TERAPUNG di sepanjang
         saluran, dan tapak permata terbalik. Kristal bahan api terapung di
         atas (dibina dalam buildWeaponModel - mengecut ikut peluru). */
      b.add('pearl', HG.oct, [0, 0.22, -0.3], null, [0.7, 0.42, 1.1]);                    // tapak permata
      b.add('accent', HG.oct, [0, 0.23, -0.3], null, [0.74, 0.06, 1.14]);                 // jahitan neon
      b.add('darker', G.cyl, [0, 0.42, -0.3], null, [0.36, 0.12, 0.36]);
      for (const sd of [-1, 1]) {
        // bilah garpu: tiga segmen melengkung ke hadapan, hujung tajam menunjuk ke dalam
        b.add('pearl', G.box, [sd * 0.24, 0.36, 0.2], [0, sd * 0.08, 0], [0.09, 0.2, 0.8]);
        b.add('pearl', G.box, [sd * 0.27, 0.36, 0.85], [0, -sd * 0.05, 0], [0.08, 0.17, 0.6]);
        b.add('pearl', HG.oct, [sd * 0.17, 0.36, 1.32], [0, -sd * 0.35, 0], [0.08, 0.15, 0.55]);
        b.add('accent', G.box, [sd * 0.19, 0.36, 0.55], null, [0.02, 0.06, 1.3]);           // tepi dalam neon
      }
      b.add('accent', G.box, [0, 0.36, 0.7], null, [0.05, 0.05, 1.4]);                      // rel tenaga
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, 0.36, 0.35 + i * 0.4], null, [0.3 - i * 0.04, 0.3 - i * 0.04, 0.35]);   // gelang terapung
      b.add('pearl', HG.oct, [0, 0.36, 1.62], null, [0.12, 0.12, 0.22]);                    // titik fokus
      // cakar mutiara memegang kristal bahan api
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * TAU + PI / 2;
        b.add('pearl', G.box, [Math.cos(a) * 0.2, 0.62, -0.3 + Math.sin(a) * 0.2], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], [0.05, 0.4, 0.05]);
      }
      return 1.72;
    case 'gale':
      /* GALE HAMMER (tandatangan Condor) - besi hitam + merah membara, sama
         dengan Condor, dan sengaja MENGGERUNKAN: dut muncung ialah "rahang"
         bergigi tajam di sekeliling kipas yang berputar, pemampat berduri,
         celah bara merah, dan dua tangki tekanan berjaket. */
      b.add('blk', G.rbox, [0, 0.32, -0.4], null, [0.74, 0.52, 0.8]);
      b.add('blk', G.cyl, [0, 0.42, 0.12], [PI / 2, 0, 0], [0.46, 0.9, 0.46]);              // pemampat
      for (let i = 0; i < 4; i++) {
        b.add('steel', G.torus, [0, 0.42, -0.22 + i * 0.22], null, [0.25, 0.25, 0.5]);
        const a = i * 1.7;
        b.add('steel', G.cone, [Math.cos(a) * 0.27, 0.42 + Math.sin(a) * 0.27, -0.22 + i * 0.22], [0, 0, a - PI / 2], [0.07, 0.24, 0.07]);   // duri
      }
      b.add('accent', G.box, [0, 0.66, 0.1], null, [0.05, 0.05, 0.75]);                     // celah bara
      b.add('blk', G.cyl, [0, 0.42, 0.95], [PI / 2, 0, 0], [0.92, 0.5, 0.92]);              // dut rahang
      b.add('darker', G.cyl, [0, 0.42, 0.96], [PI / 2, 0, 0], [0.8, 0.52, 0.8]);
      b.add('accent', G.torus, [0, 0.42, 0.72], null, [0.44, 0.44, 0.5]);                   // gelang bara dalam
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU;
        b.add('steel', G.cone, [Math.cos(a) * 0.43, 0.42 + Math.sin(a) * 0.43, 1.22], [PI / 2, 0, 0], [0.08, 0.32, 0.08]);   // gigi rahang
        b.add('steel', G.cone, [Math.cos(a) * 0.38, 0.42 + Math.sin(a) * 0.38, 1.14], [PI / 2 - Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6], [0.05, 0.2, 0.05]);
      }
      for (const sd of [-1, 1]) {
        b.add('blk', G.cyl, [sd * 0.45, 0.26, -0.35], [PI / 2, 0, 0], [0.22, 0.72, 0.22]);  // tangki tekanan
        b.add('accent', G.box, [sd * 0.45, 0.38, -0.35], null, [0.04, 0.03, 0.55]);
        b.add('steel', G.cone, [sd * 0.5, 0.75, -0.55], [0, 0, -sd * 0.4], [0.07, 0.35, 0.07]);   // tanduk belakang
      }
      return 1.3;
    case 'fence':
      // rak tiang pagar tegak + piring pemancar
      b.add('dark', G.rbox, [0, 0.28, -0.15], null, [0.8, 0.4, 0.8]);
      for (let i = 0; i < 4; i++) {
        const x = -0.27 + i * 0.18;
        b.add('steel', G.cyl, [x, 0.75, -0.3], null, [0.08, 0.8, 0.08]);
        b.add('accent', G.sph, [x, 1.17, -0.3], null, [0.09, 0.09, 0.09]);
      }
      b.add('steel', G.cyl, [0, 0.36, 0.45], [PI / 2, 0, 0], [0.22, 0.7, 0.22]);
      b.add('accent', G.torus, [0, 0.36, 0.82], null, [0.36, 0.36, 0.3]);
      b.add('accent', G.box, [0, 0.36, 0.82], null, [0.05, 0.5, 0.04]);
      return 1.0;
  }
  return 0;
}

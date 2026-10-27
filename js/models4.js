// models4.js — reka bentuk semula 2026-10-18 (permintaan Nabil, 12 kereta).
// Setiap entri di sini dicampur ke dalam BODY2 (models.js) dan MENGATASI
// badan lama yang sama nama (HULLS / hulls3 / BODY2). Semua nama badan di
// sini sudah disahkan dipakai oleh SATU kereta sahaja - lihat pengajaran
// Cascade/Crystal: nama sama = kereta lain turut berubah.
//
// Bahagian yang Nabil SUKA dikekalkan dengan memanggil kod asal:
//   Revenant (seluruh badan jenazah), Inferno (bahagian belakang: tangki &
//   palang muncung), Tempest (menara gegelung + dua ponton), Hydra (kepala
//   ular), Halo (sayap + roda), Mammoth (dram penggelek).
import * as THREE from 'three';
import { HULLS, HG } from './hulls.js';   // HG pada aras modul: limb() tidak menerimanya sebagai parameter

const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const glowMat = (hex, k = 2.4) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(0.25), emissive: new THREE.Color(hex), emissiveIntensity: k, roughness: 0.35 });
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _u = new THREE.Vector3(0, 1, 0), _w = new THREE.Vector3();
function seg(b, key, geo, a, c, r, rz) {
  _w.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = _w.length() || 1e-3;
  _q.setFromUnitVectors(_u, _w.normalize());
  _e.setFromQuaternion(_q);
  b.add(key, geo, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], [_e.x, _e.y, _e.z], [r, len, rz === undefined ? r : rz]);
}
let _sg = null;
const SPH = () => _sg || (_sg = new THREE.SphereGeometry(0.5, 10, 8));
function curve(b, key, geo, p0, p1, p2, n, r0, r1) {
  const P = t => [0, 1, 2].map(i => (1 - t) * (1 - t) * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]);
  for (let i = 0; i < n; i++) {
    const a = P(i / n), c = P((i + 1) / n), r = r0 + (r1 - r0) * (i / (n - 1 || 1));
    seg(b, key, geo, a, c, r);
    b.add(key, SPH(), c, null, [r, r, r]);
  }
}
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
/* api beranimasi: kon luar + teras, menghala `dir` (+Z tempatan = belakang
   bila diputar). update(f) memanjangkan & mengelipkan. */
function flame(parent, G, x, y, z, rx, ry, col, size = 1) {
  const g = grp(parent, x, y, z);
  g.rotation.set(rx, ry, 0);
  const om = new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const im = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const o = new THREE.Mesh(G.cone, om), i = new THREE.Mesh(G.cone, im);
  o.rotation.x = PI; i.rotation.x = PI;            // hujung kon menghala -Y tempatan
  g.add(o); g.add(i);
  const ph = Math.random() * 10;
  return {
    g, update(t, f) {
      const k = Math.max(0.05, f) * (0.85 + Math.sin(t * 37 + ph) * 0.12 + Math.sin(t * 61 + ph) * 0.06);
      o.scale.set(0.34 * size, 0.9 * size * k, 0.34 * size); o.position.y = -0.45 * size * k;
      i.scale.set(0.16 * size, 0.5 * size * k, 0.16 * size); i.position.y = -0.25 * size * k;
    },
  };
}
let _bell2 = null;
/* loceng roket BERDINDING (luar + dalam bertutup di bibir) - loceng lama ialah
   permukaan nipis sebelah sahaja, jadi bila dilihat dari tepi ia lutsinar */
function BELL2() {
  if (_bell2) return _bell2;
  const out = [], inn = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; out.push(new THREE.Vector2(0.16 + 0.42 * t * t * 0.6 + 0.22 * t, -t * 0.6)); }
  for (let i = 8; i >= 0; i--) { const t = i / 8; inn.push(new THREE.Vector2(0.11 + 0.42 * t * t * 0.6 + 0.2 * t, -t * 0.6 + 0.02)); }
  return (_bell2 = new THREE.LatheGeometry(out.concat(inn, [out[0].clone()]), 24));
}
const _hx = {};
/* bilah pilin skru: tiub mengikut heliks sekeliling paksi Z (r jejari, L panjang, n pusingan, h arah pilin) */
function HELIX(r, L, n, h) {
  const k = r + '_' + L + '_' + n + '_' + h;
  if (_hx[k]) return _hx[k];
  class H extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * n * TAU * h; return o.set(Math.cos(a) * r, Math.sin(a) * r, (t - 0.5) * L); } }
  return (_hx[k] = new THREE.TubeGeometry(new H(), n * 28, 0.09, 6, false));
}
const _chx = {};
/* alur pilin gerudi kon: jejari mengecil dari r di pangkal ke 0 di hujung (+Z) */
function CONE_HELIX(r, L, n) {
  const k = r + '_' + L + '_' + n;
  if (_chx[k]) return _chx[k];
  class H extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * n * TAU; return o.set(Math.cos(a) * r * (1 - t) * 1.02, Math.sin(a) * r * (1 - t) * 1.02, t * L); } }
  return (_chx[k] = new THREE.TubeGeometry(new H(), n * 30, 0.06, 5, false));
}
let _ws = null;
/* PROFIL OMBAK BERGULUNG dilihat dari sisi (u = ke hadapan +Z, v = naik):
   belakang ombak landai naik, puncak, bibir menggulung ke hadapan dan ke
   bawah, muka hadapan curam. Nipis (0.18) dan berdiri pada sisi lambung. */
function WAVE_SIDE() {
  if (_ws) return _ws;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(0.9, 0.1, 1.4, 0.85);
  sh.quadraticCurveTo(1.75, 1.4, 2.25, 1.25);
  sh.quadraticCurveTo(2.6, 1.12, 2.38, 0.82);
  sh.quadraticCurveTo(2.22, 0.66, 2.06, 0.88);
  sh.quadraticCurveTo(1.88, 0.62, 2.05, 0.18);
  sh.lineTo(2.15, 0);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 12 });
  g.rotateY(-PI / 2);          // u -> +Z, ketebalan -> -X
  g.translate(0.09, 0, 0);     // berpusat pada ketebalan
  g.computeVertexNormals();
  return (_ws = g);
}
let _wx = null;
/* keratan rentas ombak pecah (x keluar, y naik), diekstrud 1 unit sepanjang +Z */
function WAVE_X() {
  if (_wx) return _wx;
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(0.55, 0.05, 0.62, 0.62);            // muka ombak naik
  sh.quadraticCurveTo(0.66, 1.2, 0.2, 1.15);              // gulungan di atas
  sh.quadraticCurveTo(-0.02, 1.08, 0.1, 0.9);             // bibir menggulung ke dalam
  sh.quadraticCurveTo(0.3, 0.98, 0.38, 0.78);
  sh.quadraticCurveTo(0.42, 0.3, 0, 0.32);                // belakang ombak kembali ke lambung
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 });
  g.computeVertexNormals();
  return (_wx = g);
}
let _wave = null;
const WAVE_ARC = () => _wave || (_wave = new THREE.TorusGeometry(1, 0.2, 8, 30, PI * 1.12));
let _scy = null;
const SCY = () => _scy || (_scy = new THREE.TorusGeometry(0.62, 0.06, 5, 20, PI * 0.95));

const _prof = {};
/* badan satu keping: profil sisi (u = ke hadapan +Z, v = naik) diekstrud selebar w, berpusat pada X */
function PROFILE(key, pts, w) {
  if (_prof[key]) return _prof[key];
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: w - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 1 });
  g.rotateY(-PI / 2);           // u -> +Z, ketebalan -> -X
  g.translate((w - 0.12) / 2, 0, 0);
  g.computeVertexNormals();
  return (_prof[key] = g);
}

export function makeBody4(OLD) {
  const old = { hydra: OLD.hydra, halo: OLD.halo, mammoth: OLD.mammoth, valkyrie: OLD.valkyrie, corsair: OLD.corsair };
  const R = {
    /* ================= E-G300 - kereta kebal tentera (TANK, 2026-10-18, idea Nabil) =================
       Pusingan 2 (Nabil): badan LEBIH PANJANG, meriam FUTURISTIK yang
       TERSIMPAN di dalam ruang tengah badan. Twin Cannon: kereta berhenti,
       pintu ruang terbuka, meriam naik PERLAHAN atas lif hidraulik, memusing ke
       sasaran, menembak automatik, kemudian turun dan disimpan semula.
       Meriam: dua laras rel bergegelung tenaga, perumah bersegi, kapasitor
       bercahaya di belakang. Rantai sendiri (lebih panjang) melalui ctx.trackSide. */
    eg300: {
      hull(b, G, HG, mats) {
        b.add('darker', G.box, [0, 0.95, 0], null, [1.9, 0.6, 5.8]);                      // badan bawah
        b.add('body', G.box, [0, 1.12, 2.95], [-0.6, 0, 0], [1.9, 0.12, 0.85]);              // glasis
        // dek atas DENGAN RUANG TENGAH berlubang (z -1.75 .. 1.45)
        b.add('body', G.box, [0, 1.38, 2.25], null, [2.95, 0.12, 1.6]);
        b.add('body', G.box, [0, 1.38, -2.45], null, [2.95, 0.12, 1.4]);
        for (const sd of [-1, 1]) b.add('body', G.box, [sd * 1.22, 1.38, -0.15], null, [0.5, 0.12, 3.2]);
        b.add('darker', G.box, [0, 1.0, -0.15], null, [1.9, 0.06, 3.2]);                   // lantai ruang
        for (const sd of [-1, 1]) b.add('crys', G.box, [sd * 0.97, 1.33, -0.15], null, [0.03, 0.04, 3.1]);   // jalur tepi ruang
        for (const sd of [-1, 1]) {
          b.add('body', G.box, [sd * 1.55, 1.05, 0], null, [0.1, 0.62, 5.5]);              // skirt sisi
          for (let i = 0; i < 8; i++) b.add('army', G.box, [sd * 1.62, 1.08, -2.45 + i * 0.7], null, [0.08, 0.42, 0.6]);   // blok perisai reaktif
          b.add('dark', G.box, [sd * 1.0, 1.52, -2.55], null, [0.55, 0.18, 0.7]);           // grill enjin
          for (let k = 0; k < 4; k++) b.add('darker', G.box, [sd * 1.0, 1.62, -2.85 + k * 0.18], null, [0.5, 0.03, 0.05]);
          b.add('army', G.rbox, [sd * 1.35, 1.6, -2.85], null, [0.28, 0.42, 0.22]);         // tin minyak
          b.add('head', G.box, [sd * 0.75, 1.32, 3.25], null, [0.28, 0.12, 0.05]);
          b.add('tail', G.box, [sd * 0.85, 1.25, -2.95], null, [0.2, 0.1, 0.05]);
          b.add('dark', G.box, [sd * 0.6, 1.52, 2.4], [0, 0, sd * 0.2], [0.5, 0.2, 0.9]);  // periskop pemandu
          b.add('glass', G.box, [sd * 0.6, 1.58, 2.86], null, [0.36, 0.08, 0.03]);
        }
        for (const [x, z, w, d] of [[-0.6, 2.0, 0.7, 0.5], [0.7, 2.5, 0.5, 0.4], [-0.3, -2.3, 0.9, 0.4], [0.7, -2.6, 0.4, 0.6]])
          b.add('army', G.box, [x, 1.45, z], [0, 0.4, 0], [w, 0.02, d]);                   // jalur kamuflaj
        b.add('crys', G.box, [0, 1.12, 3.12], [-0.6, 0, 0], [0.9, 0.03, 0.05]);
      },
      limb(ctx) {
        const { root, Builder, G, HG, mats } = ctx;
        const lm = { body: mats.body, dark: mats.dark, darker: mats.darker, steel: mats.steel, army: mats.army, crys: mats.crys };
        for (const sd of [-1, 1]) ctx.trackSide(root, { sd, x: sd * 1.32, ZF: 2.75, ZB: -2.7, TR: 0.5, NL: 54, roads: 6 });
        // pintu ruang (berengsel di tepi, terbuka ke atas-luar)
        const doors = [];
        for (const sd of [-1, 1]) {
          const h = grp(root, sd * 0.97, 1.42, -0.15);
          const db = new Builder();
          db.add('body', G.box, [-sd * 0.48, 0, 0], null, [0.96, 0.08, 3.15]);
          db.add('army', G.box, [-sd * 0.48, 0.05, 0.6], [0, 0.4, 0], [0.5, 0.02, 0.6]);
          db.add('crys', G.box, [-sd * 0.9, 0.05, 0], null, [0.03, 0.02, 3.0]);
          db.build(lm, h);
          doors.push({ h, sd });
        }
        // MERIAM FUTURISTIK atas lif
        const lift = grp(root, 0, 0.55, -0.4);           // tersimpan rendah di bawah pintu ruang
        const lb = new Builder();
        for (const sd of [-1, 1]) lb.add('steel', G.cyl, [sd * 0.45, -0.35, 0], null, [0.14, 0.9, 0.14]);   // omboh lif
        lb.build(lm, lift);
        const yawG = grp(lift, 0, 0.1, 0);
        const cb = new Builder();
        cb.add('dark', G.cyl, [0, 0, 0], null, [1.3, 0.16, 1.3]);                          // gelang pusing
        cb.add('body', HG.oct, [0, 0.38, 0], null, [1.4, 0.75, 1.9]);                       // perumah bersegi
        cb.add('darker', HG.oct, [0, 0.38, 0], null, [1.45, 0.12, 1.95]);
        cb.add('crys', G.cyl, [0, 0.38, -0.95], [PI / 2, 0, 0], [0.42, 0.5, 0.42]);         // kapasitor belakang
        for (let k = 0; k < 3; k++) cb.add('steel', G.torus, [0, 0.38, -0.8 - k * 0.15], null, [0.24, 0.24, 0.4]);
        cb.build(lm, yawG);
        const barrels = [];
        for (const sd of [-1, 1]) {
          const bg = grp(yawG, sd * 0.26, 0.4, 0.6);
          const bb = new Builder();
          for (const s2 of [-1, 1]) bb.add('dark', G.box, [s2 * 0.09, 0, 1.25], null, [0.06, 0.2, 2.5]);   // rel berkembar
          bb.add('crys', G.box, [0, 0, 1.25], null, [0.05, 0.06, 2.4]);                       // teras tenaga
          for (let k = 0; k < 5; k++) bb.add('steel', G.torus, [0, 0, 0.35 + k * 0.45], null, [0.17, 0.17, 0.5]);   // gegelung
          bb.add('steel', G.box, [0, 0, 2.55], null, [0.3, 0.26, 0.2]);                      // pemfokus muncung
          bb.add('crys', G.box, [0, 0, 2.66], null, [0.2, 0.06, 0.03]);
          bb.build(lm, bg);
          barrels.push({ g: bg, z0: 0.6 });
        }
        mountAt(ctx, -0.85, 1.55, -2.45);
        mountAt(ctx, 0.85, 1.55, -2.45);
        let dep = 0, yaw = 0;
        const anim = st => {
          const p = st.p, dt = st.dt || 0.016;
          const want = p && p.egDep !== undefined ? p.egDep : (window.__egDep !== undefined ? window.__egDep : 0);
          dep = window.__egDep !== undefined && !p ? want : damp(dep, want, 5, dt);
          const doorK = clamp(dep * 2.2, 0, 1), liftK = clamp(dep * 1.6 - 0.45, 0, 1);
          for (const D of doors) D.h.rotation.z = D.sd * doorK * 1.9;
          lift.position.y = 0.55 + liftK * 1.5;
          // laras: terbaring rata dalam ruang, terangkat ke paras bila naik
          const aimYaw = p && p.egc && p.egc.aim !== undefined ? Math.atan2(Math.sin(p.egc.aim - p.ang), Math.cos(p.egc.aim - p.ang)) : 0;
          let d = aimYaw * liftK - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
          yaw += d * Math.min(1, dt * 3);
          yawG.rotation.y = yaw;
          barrels.forEach((B, i) => { B.g.position.z = B.z0 - (p && p.egKick ? p.egKick[i] || 0 : 0) * 0.5; });
          if (p && p.egKick) for (let i = 0; i < 2; i++) p.egKick[i] = Math.max(0, (p.egKick[i] || 0) - dt * 3);
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= TREMOR - jentera penghentak gempa (CONTROLLER) =================
       Pusingan 2026-10-18 (Nabil: "hentaman kat atas kereta tak logik, kaki tak
       berfungsi - buang, bagi tinggi"). Kaki penstabil DIBUANG. Badan kini
       TINGGI atas 8 roda dengan LOMBONG TENGAH yang menembusi casis; menara
       gantri di atasnya memegang PENGHENTAK gergasi yang turun melalui lombong
       dan MENGHENTAM TANAH di bawah kereta - tiga kali semasa Seismic Slam,
       serentak dengan tiga gelombang kejutan. */
    excavator: {
      hull(b, G, HG, mats) {
        // casis tinggi: dua rasuk sisi + palang, ruang lombong di tengah (|z| < 0.75)
        for (const sd of [-1, 1]) {
          b.add('darker', G.box, [sd * 0.72, 1.1, 0], null, [0.4, 0.5, 5.0]);              // rasuk casis
          b.add('body', G.box, [sd * 1.0, 1.75, 0], null, [0.75, 0.85, 5.1]);              // badan sisi tinggi
          b.add('dark', G.box, [sd * 1.38, 1.75, 0], null, [0.04, 0.6, 4.6]);
          for (let i = 0; i < 6; i++) b.add('steel', G.sph, [sd * 1.4, 2.08, -2.1 + i * 0.84], null, [0.1, 0.1, 0.1]);
          b.add('crys', G.box, [sd * 1.39, 1.45, 0], null, [0.03, 0.06, 4.4]);
        }
        b.add('body', G.box, [0, 1.75, 1.75], null, [1.3, 0.85, 1.9]);                     // blok hadapan
        b.add('body', G.box, [0, 1.75, -1.75], null, [1.3, 0.85, 1.9]);                    // blok belakang (enjin)
        b.add('body', G.box, [0, 1.62, 2.95], [-0.45, 0, 0], [2.5, 0.35, 0.9]);            // hidung bersudut
        b.add('darker', G.box, [0, 1.0, 2.9], null, [2.3, 0.45, 0.5]);                     // bampar
        // kabin tinggi berperisai di hadapan
        b.add('body', HG.frust, [0, 2.55, 1.8], null, [1.6, 0.75, 1.3]);
        b.add('glass', G.box, [0, 2.6, 2.4], [-0.45, 0, 0], [1.2, 0.28, 0.04]);
        b.add('steel', G.box, [0, 2.95, 1.8], null, [1.2, 0.06, 0.9]);
        // enjin belakang + cerobong
        b.add('dark', G.box, [0, 2.3, -2.0], null, [1.4, 0.3, 1.2]);
        for (let k = 0; k < 5; k++) b.add('darker', G.box, [0, 2.46, -2.45 + k * 0.22], null, [1.2, 0.03, 0.06]);
        for (const sd of [-1, 1]) {
          b.add('dark', G.cyl, [sd * 0.55, 3.0, -2.35], null, [0.26, 1.2, 0.26]);
          b.add('hot', G.cyl, [sd * 0.55, 3.62, -2.35], null, [0.2, 0.05, 0.2]);
        }
        // bibir lombong bercahaya
        b.add('crys', G.torus, [0, 2.2, 0], [PI / 2, 0, 0], [1.25, 1.25, 0.3]);
        b.add('dark', G.cyl, [0, 2.18, 0], null, [1.55, 0.08, 1.55]);
        // MENARA GANTRI atas lombong
        for (const [x, z] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) {
          b.add('steel', G.box, [x, 3.35, z], null, [0.18, 2.3, 0.18]);
          b.add('dark', G.box, [x, 2.3, z], null, [0.3, 0.2, 0.3]);
        }
        b.add('dark', G.box, [0, 4.55, 0], null, [1.8, 0.22, 1.5]);                         // rasuk atas
        b.add('steel', G.cyl, [0, 4.72, 0], null, [0.6, 0.18, 0.6]);
        for (const sd of [-1, 1]) {
          seg(b, 'steel', G.box, [sd * 0.7, 2.4, -0.6], [sd * 0.7, 4.4, 0.6], 0.07, 0.07);  // palang silang
          seg(b, 'dark', G.cyl, [sd * 0.95, 2.3, 0], [sd * 0.55, 4.4, 0], 0.18);          // silinder hidraulik
        }
        lamps(b, G, [[-0.85, 1.6, 3.18], [0.85, 1.6, 3.18]], 0.13);
        b.add('head', G.box, [0, 3.02, 2.3], null, [1.0, 0.07, 0.07]);
        for (const x of [-0.95, 0.95]) b.add('tail', G.box, [x, 1.7, -2.56], null, [0.3, 0.12, 0.05]);
      },
      limb(ctx) {
        const { root, Builder, G, mats } = ctx;
        const ram = grp(root, 0, 0, 0);
        const rb = new Builder();
        rb.add('body', G.cyl8, [0, 2.6, 0], null, [0.7, 3.4, 0.7]);                        // batang penghentak
        for (const y of [1.6, 2.4, 3.2]) rb.add('crys', G.torus, [0, y, 0], [PI / 2, 0, 0], [0.38, 0.38, 0.4]);
        rb.add('dark', G.cyl8, [0, 0.62, 0], null, [1.25, 0.55, 1.25]);                    // kepala penghentak
        rb.add('steel', G.cyl8, [0, 0.3, 0], null, [1.45, 0.14, 1.45]);                    // tapak hentaman
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          rb.add('steel', G.cone, [Math.cos(a) * 0.62, 0.15, Math.sin(a) * 0.62], [PI, 0, 0], [0.12, 0.25, 0.12]);   // gigi tapak
        }
        rb.add('hot', G.cyl8, [0, 0.9, 0], null, [1.28, 0.05, 1.28]);
        rb.build({ body: mats.body, crys: mats.crys, dark: mats.dark, steel: mats.steel, hot: mats.hot }, ram);
        mountAt(ctx, -0.95, 2.3, 1.6);
        mountAt(ctx, 0.95, 2.3, 1.6);
        mountAt(ctx, -0.95, 2.3, -1.4);
        mountAt(ctx, 0.95, 2.3, -1.4);
        const REST = 0.85;                       // tapak tergantung di bawah casis, bebas dari tanah
        const anim = st => {
          const p = st.p;
          let y = REST;
          if (p && p.abOn && p.abWaveN !== undefined && p.abId === 'seismic') {
            const u = 1 - clamp((p.abWave || 0) / 0.55, 0, 1);         // 0 = baru menghentam .. 1 = hentaman seterusnya
            const h = u < 0.15 ? 0 : u < 0.8 ? (u - 0.15) / 0.65 : 1 - (u - 0.8) / 0.2;
            y = (p.abWaveN > 0 || u < 0.15) ? -0.12 + h * 1.6 : REST;
          }
          ram.position.y = damp(ram.position.y, y, 22, st.dt || 0.016);
        };
        ram.position.y = REST;
        return anim;
      },
    },

    /* ================= AUGER - jentera korek terowong (ASSASSIN, 2026-10-18, idea Claude) =================
       Cara gerak yang BELUM ADA dalam permainan: PEMACU SKRU - tiada roda,
       rantai, kaki atau hover. Dua silinder skru gergasi berbilah pilin di
       kiri & kanan berputar untuk "mengorek" ke hadapan (macam kenderaan paya
       sebenar). Hidung = GERUDI KON gergasi berpilin yang berputar. Burrow
       Strike: Auger menyelam ke bawah tanah (hanya busut tanah kelihatan),
       boleh lalu BAWAH dinding, kemudian meletus keluar melambung musuh. */
    auger: {
      hull(b, G, HG, mats) {
        b.add('darker', G.box, [0, 0.95, -0.2], null, [1.7, 0.5, 4.2]);                   // rasuk tengah antara skru
        b.add('body', G.box, [0, 1.5, -0.4], null, [2.2, 0.75, 3.6]);                      // badan utama
        b.add('body', G.box, [0, 1.5, 1.6], [-0.35, 0, 0], [2.0, 0.6, 0.9]);               // bahu hadapan condong
        for (const sd of [-1, 1]) {
          for (let i = 0; i < 7; i++) b.add(i % 2 ? 'darker' : 'crys', G.box, [sd * 1.11, 1.28, -1.9 + i * 0.5], [0, 0, sd * 0.1], [0.02, 0.18, 0.45]);   // jalur amaran
          // penyangga skru (lengan dari badan ke paksi skru)
          for (const z of [1.7, -0.4, -2.4]) seg(b, 'dark', G.box, [sd * 0.85, 1.15, z], [sd * 1.42, 0.78, z], 0.22, 0.3);
          b.add('dark', G.cyl, [sd * 0.6, 2.35, -1.7], null, [0.26, 1.1, 0.26]);        // cerobong
          b.add('hot', G.cyl, [sd * 0.6, 2.92, -1.7], null, [0.2, 0.05, 0.2]);
          b.add('tail', G.box, [sd * 0.75, 1.45, -2.22], null, [0.3, 0.1, 0.05]);
        }
        // kabin berperisai kecil + celah tingkap
        b.add('dark', HG.frust, [0, 2.15, 0.65], null, [1.25, 0.55, 1.1]);
        b.add('glass', G.box, [0, 2.2, 1.17], [-0.4, 0, 0], [0.9, 0.12, 0.04]);
        // tong tanah di belakang
        b.add('rust', HG.frust, [0, 2.1, -1.0], [PI, 0, 0], [1.3, 0.6, 1.3]);
        b.add('darker', G.box, [0, 2.38, -1.0], null, [1.05, 0.05, 1.05]);
        // rumah motor gerudi
        b.add('dark', G.cyl, [0, 1.25, 2.15], [PI / 2, 0, 0], [1.55, 0.55, 1.55]);
        b.add('steel', G.torus, [0, 1.25, 2.42], null, [0.8, 0.8, 0.5]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; b.add('hot', G.box, [Math.cos(a) * 0.72, 1.25 + Math.sin(a) * 0.72, 2.15], [0, 0, a], [0.04, 0.2, 0.4]); }   // salur haba
        for (const sd of [-1, 1]) seg(b, 'steel', G.cyl, [sd * 0.75, 1.75, 1.3], [sd * 0.55, 1.4, 2.1], 0.09);   // lengan hidraulik gerudi
        lamps(b, G, [[-0.85, 1.75, 1.95], [0.85, 1.75, 1.95]], 0.12);
      },
      limb(ctx) {
        const { root, Builder, G, mats } = ctx;
        // ---- dua SKRU gergasi ----
        const screws = [];
        for (const sd of [-1, 1]) {
          const g = grp(root, sd * 1.42, 0.78, -0.35);
          const sb = new Builder();
          sb.add('body', G.cyl, [0, 0, 0], [PI / 2, 0, 0], [0.9, 4.2, 0.9]);              // dram skru
          sb.add('steel', G.cone, [0, 0, 2.45], [PI / 2, 0, 0], [0.9, 0.7, 0.9]);         // hujung tirus depan
          sb.add('steel', G.cone, [0, 0, -2.4], [-PI / 2, 0, 0], [0.9, 0.6, 0.9]);
          sb.add('steel', HELIX(0.56, 4.2, 6, sd), [0, 0, 0], null, null);                 // bilah pilin
          sb.add('crys', G.torus, [0, 0, 0], null, [0.5, 0.5, 0.3]);
          sb.build({ body: mats.darker, steel: mats.steel, crys: mats.crys }, g);
          screws.push({ g, sd });
        }
        // ---- GERUDI KON gergasi ----
        const drill = grp(root, 0, 1.25, 2.4);
        const db = new Builder();
        db.add('steel', G.cone, [0, 0, 1.1], [PI / 2, 0, 0], [1.25, 2.2, 1.25]);
        db.add('dark', CONE_HELIX(0.62, 2.2, 4), [0, 0, 0], null, null);                  // alur pilin gerudi
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, t = (i % 4) / 4;
          db.add('hot', G.cone, [Math.cos(a) * 0.62 * (1 - t), Math.sin(a) * 0.62 * (1 - t), 0.2 + t * 2.0], [0, 0, a - PI / 2], [0.08, 0.28, 0.08]);   // gigi bara
        }
        db.build({ steel: mats.steel, dark: mats.dark, hot: mats.hot }, drill);
        // ---- busut tanah (hanya kelihatan semasa Burrow) ----
        const dirt = new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 1, flatShading: true });
        const mound = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), dirt);
        mound.scale.set(1.9, 0.7, 2.6); root.add(mound); mound.visible = false;
        mountAt(ctx, 0, 2.55, -1.0);
        mountAt(ctx, -0.8, 1.95, 0.0);
        mountAt(ctx, 0.8, 1.95, 0.0);
        let k = 0, roll = 0, dspin = 0;
        const anim = st => {
          const p = st.p, dt = st.dt || 0.016;
          const under = !!(p && p.burrow);
          k = damp(k, under ? 1 : 0, under ? 4 : 9, dt);
          roll += dt * (st.fwd || 0) * 0.9;
          for (const S of screws) S.g.rotation.z = roll * S.sd;                          // skru kiri & kanan berlawanan
          dspin += dt * (3 + Math.abs(st.fwd || 0) * 0.6 + k * 25);
          drill.rotation.z = dspin;
          if (p) p._bob = -2.9 * k;                                                      // tenggelam ke bawah tanah
          mound.visible = k > 0.05;
          mound.position.set(0, 2.9 * k - 0.35, 0.3);                                    // busut kekal di aras tanah
          mound.scale.set(1.9, 0.7 + Math.sin(st.time * 9) * 0.05, 2.6);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null });
        return anim;
      },
    },

    /* ================= FREEZO - enjin kepungan krio (CONTROLLER, pusingan 3, 2026-10-18) =================
       Nabil: "nampak macam another lori" - mahu MENYERAMKAN & rancak. Bukan lagi
       lori + tong meriam: badan bersudut rendah dengan HALUAN PEMECAH AIS tiga
       lapis berbentuk V (bergerigi, alur sejuk bercahaya, tanduk rempuh di tengah),
       skirt bergerigi, kokpit sipit bermata. Meriam = MERIAM REL KRIO berkembar:
       dua rel bersirip, 5 gegelung yang BERPUTAR & menyala semasa mengecas,
       saluran tengah bercahaya, cakar di muncung. Di belakang, 3 TIUB REAKTOR
       kaca memegang 3 peluru ais - tiub kosong ikut cas yang tinggal.
       Kabus sejuk sentiasa mengalir dari haluan & salur. */
    freezo: {
      hull(b, G, HG, mats) {
        mats.fzG = mats.fzG || glowMat('#4aa8ff', 2.6);
        mats.iceD = mats.iceD || new THREE.MeshStandardMaterial({ color: 0x1766b8, metalness: 0.75, roughness: 0.18 });   // biru glasier berkilat (kontras, ganti hitam)
        mats.crys2 = mats.crys2 || new THREE.MeshStandardMaterial({ color: 0x8fe4ff, emissive: 0x2ab8ff, emissiveIntensity: 0.85, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.8, flatShading: true });   // kristal ais bercahaya
        mats.frostL = mats.frostL || new THREE.MeshStandardMaterial({ color: 0xeaf7ff, emissive: 0x9fd8ff, emissiveIntensity: 0.25, metalness: 0.15, roughness: 0.35 });
        mats.fzW = mats.fzW || glowMat('#d6f3ff', 1.8);
        b.add('iceD', G.box, [0, 0.62, -0.1], null, [2.2, 0.4, 5.0]);                    // casis
        b.add('body', PROFILE('fz', [[-2.9, 0.6], [-2.95, 1.35], [-2.6, 1.72], [1.3, 1.72], [2.05, 1.4], [2.2, 0.7], [1.9, 0.5]], 2.45), [0, 0, 0], null, [1, 1, 1]);
        // ---- HALUAN PEMECAH AIS: 3 lapis plat V bergerigi ----
        for (let k = 0; k < 3; k++) {
          const y = 0.62 + k * 0.4, back = k * 0.32;
          for (const sd of [-1, 1]) {
            const a = [sd * 1.3, y, 1.85 - back], c = [0, y - 0.04, 3.35 - back];
            const mid = [(a[0] + c[0]) / 2, y, (a[2] + c[2]) / 2], len = Math.hypot(c[0] - a[0], c[2] - a[2]);
            b.add(k === 1 ? 'crys2' : 'iceD', G.box, mid, [0, Math.atan2(c[0] - a[0], c[2] - a[2]), 0], [0.14, 0.42, len]);
            seg(b, 'fzG', G.box, [a[0] * 0.98, y + 0.22, a[2] + 0.02], [c[0], y + 0.18, c[2] + 0.02], 0.07, 0.07);   // alur sejuk di bibir lapis
            const nx = sd * 1.4, nz = 1.3, nl = Math.hypot(nx, nz);
            for (let i = 1; i <= 4; i++) {                                                  // gigi bergerigi
              const t = i / 5, px = a[0] + (c[0] - a[0]) * t, pz = a[2] + (c[2] - a[2]) * t;
              seg(b, 'frostL', G.cone, [px, y - 0.12, pz], [px + nx / nl * 0.42, y - 0.18, pz + nz / nl * 0.42], 0.08);
            }
          }
        }
        seg(b, 'frostL', G.cone, [0, 1.05, 3.1], [0, 0.85, 4.15], 0.24);                   // tanduk rempuh tengah
        seg(b, 'fzG', G.cone, [0, 1.05, 3.12], [0, 0.9, 3.7], 0.1);
        // ---- skirt sisi bergerigi + salur bercahaya ----
        for (const sd of [-1, 1]) {
          b.add('iceD', G.box, [sd * 1.27, 1.2, -0.35], [0, 0, -sd * 0.12], [0.14, 0.75, 4.1]);
          b.add('fzG', G.box, [sd * 1.33, 1.55, -0.35], null, [0.04, 0.06, 4.0]);
          for (let i = 0; i < 7; i++) seg(b, 'frostL', G.cone, [sd * 1.3, 0.86, 1.4 - i * 0.6], [sd * 1.36, 0.5, 1.25 - i * 0.6], 0.07);
          for (let i = 0; i < 4; i++) b.add('crys2', G.box, [sd * 1.35, 1.25, 0.9 - i * 0.55], [0.5, 0, 0], [0.06, 0.4, 0.14]);
          b.add('iceD', G.box, [sd * 1.12, 1.85, -1.4], null, [0.62, 0.2, 0.7]);          // pelantar senjata
          b.add('tail', G.box, [sd * 0.85, 1.2, -2.93], null, [0.4, 0.06, 0.04]);
        }
        b.add('iceD', G.box, [1.12, 1.85, 0.9], null, [0.62, 0.2, 0.7]);
        // ---- KOKPIT sipit di kiri depan: dua mata dingin ----
        b.add('iceD', HG.frust, [-1.0, 1.95, 0.95], null, [0.7, 0.5, 1.0]);
        for (const x of [-1.18, -0.82]) b.add('fzW', G.box, [x, 2.0, 1.43], [0, 0, x < -1 ? 0.35 : -0.35], [0.22, 0.05, 0.04]);
        // ---- gelang turet ----
        b.add('iceD', G.cyl, [0, 1.85, -0.5], null, [1.9, 0.3, 1.9]);
        b.add('fzG', G.torus, [0, 1.98, -0.5], [PI / 2, 0, 0], [0.96, 0.96, 0.4]);
      },
      limb(ctx) {
        const { root, Builder, G, mats } = ctx;
        const can = grp(root, 0, 2.35, -0.4);           // diundur (Nabil) - systems2 fireIceShell muncung 3.8
        const cb = new Builder();
        cb.add('iceD', G.rbox, [0, 0, -0.35], null, [1.55, 1.15, 1.7]);
        cb.add('crys2', HG.oct, [0, 0.62, -0.35], [0, PI / 4, 0], [0.7, 0.55, 0.7]);   // mahkota kristal atas sungsang                  // blok sungsang
        cb.add('iceD', G.box, [0, 0.62, -0.35], null, [0.9, 0.12, 1.3]);
        for (const sd of [-1, 1]) {
          cb.add('iceD', G.box, [sd * 0.43, 0, 2.15], null, [0.28, 0.55, 4.0]);            // rel
          cb.add('fzG', G.box, [sd * 0.28, 0, 2.15], null, [0.06, 0.34, 3.8]);             // muka dalam rel bercahaya
          cb.add('frostL', G.box, [sd * 0.45, 0.36, 2.0], [0, 0, sd * 0.3], [0.06, 0.32, 3.4]);   // sirip atas rel
          cb.add('frostL', G.box, [sd * 0.6, -0.1, 1.6], null, [0.06, 0.3, 2.6]);
          for (const yy of [-0.18, 0.18]) seg(cb, 'frostL', G.cone, [sd * 0.43, yy, 4.1], [sd * 0.36, yy * 0.6, 4.7], 0.1);   // cakar muncung
        }
        cb.add('fzW', G.box, [0, 0.66, 0.2], null, [0.3, 0.06, 0.05]);                    // mata pembidik
        // TIUB REAKTOR di belakang (3)
        cb.add('iceD', G.box, [0, -0.45, -1.75], null, [1.7, 0.18, 0.75]);
        cb.add('iceD', G.box, [0, 0.72, -1.75], null, [1.7, 0.14, 0.75]);
        for (let i = 0; i < 3; i++) cb.add('fzG', G.torus, [-0.55 + i * 0.55, 0.62, -1.75], [PI / 2, 0, 0], [0.26, 0.26, 0.35]);
        cb.add('iceD', G.cyl, [0, 0.05, -2.3], [PI / 2, 0, 0], [1.1, 0.35, 1.1]);         // salur masuk belakang
        cb.add('frostL', G.torus, [0, 0.05, -2.48], null, [0.56, 0.56, 0.5]);
        cb.build({ body: mats.body, iceD: mats.iceD, frostL: mats.frostL, fzG: mats.fzG, fzW: mats.fzW, crys2: mats.crys2 }, can);
        const tubeM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.22, roughness: 0.02, metalness: 0.3, depthWrite: false });
        const shellM = glowMat('#bfe9ff', 2.0);
        const shells = [];
        for (let i = 0; i < 3; i++) {
          const t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.05, 14, 1, true), tubeM);
          t.position.set(-0.55 + i * 0.55, 0.13, -1.75); can.add(t);
          const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), shellM);
          s.scale.set(1, 2.2, 1); s.position.copy(t.position); can.add(s); shells.push(s);
        }
        // gegelung pemecut (berputar & menyala semasa cas)
        const coilM = glowMat('#4aa8ff', 1.4);
        const coils = [];
        for (let k = 0; k < 5; k++) {
          const g = grp(can, 0, 0, 1.0 + k * 0.62);
          const cbk = new Builder();
          cbk.add('frostL', G.torus, [0, 0, 0], null, [0.36, 0.36, 0.55]);
          for (let j = 0; j < 4; j++) { const a = j / 4 * TAU; cbk.add('iceD', G.box, [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], [0, 0, a], [0.16, 0.08, 0.14]); }
          cbk.build({ frostL: mats.frostL, iceD: mats.iceD }, g);
          const glow = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 5, 24), coilM); g.add(glow);
          coils.push(g);
        }
        const chanM = new THREE.MeshBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
        const chan = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.4, 10), chanM);
        chan.rotation.x = PI / 2; chan.position.z = 2.4; can.add(chan);
        const coreM = new THREE.MeshBasicMaterial({ color: 0xbff2ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), coreM);
        core.position.z = 0.5; can.add(core);
        mountAt(ctx, -1.12, 2.05, -1.4);
        mountAt(ctx, 1.12, 2.05, -1.4);
        mountAt(ctx, 1.12, 2.05, 0.9);
        const anim = st => {
          const p = st.p, dt = st.dt || 0.016;
          const n = p && p.iceN !== undefined ? p.iceN : 3;
          shells.forEach((s, i) => { s.visible = i < n; s.rotation.y += dt * 2; });
          const kick = p && p.iceKick ? p.iceKick : 0;
          can.position.z = -0.4 - kick * 0.5;
          can.rotation.x = -kick * 0.08;
          if (p && p.iceKick) p.iceKick = Math.max(0, p.iceKick - dt * 2.5);
          const ch = p && p.iceCharge ? p.iceCharge.k : 0;                                  // 0..1 semasa mengecas
          coils.forEach((c, i) => { c.rotation.z += dt * (0.6 + ch * 18) * (i % 2 ? -1 : 1); });
          coilM.emissiveIntensity = 1.2 + ch * 4 + Math.sin(st.time * 3) * 0.2;
          chanM.opacity = 0.25 + ch * 0.7 + kick * 0.6;
          coreM.opacity = ch * 0.85;
          core.scale.setScalar(0.6 + ch * 0.6);
          mats.fzG.emissiveIntensity = 2.2 + Math.sin(st.time * 2.5) * 0.5 + ch * 1.5;
          // kabus sejuk: dari bibir haluan & salur sisi
          if (Math.random() < 0.45) sparkAt(st, (Math.random() - 0.5) * 2.2, 0.8 + Math.random() * 0.8, 2.6 + Math.random() * 0.8, [0.55, 1.1, 1.6], 1, 1.2);
          if (Math.random() < 0.25) sparkAt(st, (Math.random() < 0.5 ? -1 : 1) * 1.4, 1.3, (Math.random() - 0.4) * 2.5, [0.5, 1.0, 1.5], 1, 1);
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= BREEZE - pemintas peluru berpandu futuristik (SNIPER, pusingan 3, 2026-10-18) =================
       Nabil: BUKAN lori askar, futuristik, gerun & bergaya (tapi BUKAN raksasa).
       Badan BAJI RENDAH satu keping (profil diekstrud) dari muncung tajam ke
       dek rata, kanopi kaca gelap condong, VISOR cahaya berbentuk V di muncung,
       bilah pemisah di dagu, skirt bersudut menutup separuh roda, jalur cahaya
       sepanjang badan. POD PELANCAR heksagon bersirip (bukan tong) atas 2 omboh
       bercahaya; mulutnya 4 kelopak yang terbuka mendedahkan 5 hujung peluru.
       Dua TURBIN JET sejuk di belakang; kaki penstabil = bilah yang berlipat turun.
       Engsel pod (0, 1.95, -2.75) & panjang 5.2 KEKAL - systems2 updateSalvo
       melancar dari titik itu. */
    breeze: {
      hull(b, G, HG, mats) {
        mats.bzG = mats.bzG || glowMat('#5ff0ff', 2.6);
        mats.iceD = mats.iceD || new THREE.MeshStandardMaterial({ color: 0x1766b8, metalness: 0.75, roughness: 0.18 });   // biru glasier berkilat (kontras, ganti hitam)
        mats.crys2 = mats.crys2 || new THREE.MeshStandardMaterial({ color: 0x8fe4ff, emissive: 0x2ab8ff, emissiveIntensity: 0.85, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.8, flatShading: true });   // kristal ais bercahaya
        mats.frostL = mats.frostL || new THREE.MeshStandardMaterial({ color: 0xeaf7ff, emissive: 0x9fd8ff, emissiveIntensity: 0.25, metalness: 0.15, roughness: 0.35 });
        b.add('iceD', G.box, [0, 0.72, 0.2], null, [1.7, 0.4, 7.0]);                    // casis bawah
        b.add('body', PROFILE('bz', [[-3.5, 0.62], [-3.55, 1.2], [-3.2, 1.5], [2.3, 1.5], [2.75, 2.2], [3.2, 2.3], [3.95, 1.55], [4.3, 1.0], [4.05, 0.62]], 2.2), [0, 0, 0], null, [1, 1, 1]);
        // kanopi kaca gelap condong + bingkai
        b.add('glass', G.box, [0, 1.95, 3.6], [0.85, 0, 0], [1.85, 0.04, 1.02]);
        b.add('iceD', G.box, [0, 2.32, 3.2], null, [1.9, 0.05, 0.5]);
        for (const sd of [-1, 1]) {
          b.add('glass', G.box, [sd * 1.11, 1.95, 3.0], [0, 0, 0], [0.04, 0.3, 0.75]);
          // VISOR V di muncung
          seg(b, 'bzG', G.box, [sd * 1.02, 1.4, 4.09], [0, 1.18, 4.22], 0.11, 0.08);
          b.add('head', G.box, [sd * 0.72, 0.9, 4.24], null, [0.42, 0.05, 0.04]);           // lampu sipit
          // bilah pemisah dagu
          seg(b, 'iceD', G.box, [sd * 0.85, 0.66, 3.7], [sd * 1.1, 0.5, 4.75], 0.1, 0.42);
          seg(b, 'bzG', G.box, [sd * 0.86, 0.73, 3.75], [sd * 1.1, 0.58, 4.7], 0.03, 0.03);
          // skirt bersudut atas roda + jalur cahaya
          for (const z of [2.2, 0.7, -0.75, -2.2]) b.add('iceD', G.box, [sd * 1.2, 1.28, z], [0, 0, -sd * 0.35], [0.22, 0.42, 1.3]);
          b.add('bzG', G.box, [sd * 1.13, 1.47, -0.1], null, [0.06, 0.08, 6.4]);
          b.add('crys2', G.box, [sd * 1.12, 1.95, 2.95], [0, 0, 0], [0.05, 0.42, 0.9]);   // panel kristal sisi kabin
          for (let k = 0; k < 3; k++) b.add('bzG', G.box, [sd * 1.11, 1.98 - k * 0.15, 2.55], [0, 0, 0], [0.03, 0.04, 0.42 - k * 0.1]);   // salur sisi kabin
          // pelantar senjata
          for (const z of [1.3, -1.0]) b.add('iceD', G.box, [sd * 1.0, 1.56, z], null, [0.55, 0.12, 0.65]);
          // turbin jet belakang
          b.add('iceD', G.cyl, [sd * 0.6, 1.05, -3.5], [PI / 2, 0, 0], [0.88, 0.7, 0.88]);
          b.add('frostL', G.torus, [sd * 0.6, 1.05, -3.86], null, [0.44, 0.44, 0.5]);
          b.add('bzG', G.cyl, [sd * 0.6, 1.05, -3.8], [PI / 2, 0, 0], [0.5, 0.04, 0.5]);
        }
        b.add('tail', G.box, [0, 1.4, -3.48], null, [1.5, 0.05, 0.04]);
        // buaian pod + engsel
        for (const z of [1.5, -0.2, -1.8]) b.add('iceD', G.box, [0, 1.62, z], null, [1.2, 0.22, 0.3]);
        b.add('frostL', G.cyl, [0, 1.75, -2.75], [0, 0, PI / 2], [0.35, 1.5, 0.35]);
        b.add('iceD', G.box, [0, 1.55, -2.75], null, [1.6, 0.3, 0.6]);
      },
      limb(ctx) {
        const { root, Builder, G, mats } = ctx;
        const HEX = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
        // POD heksagon: berengsel di belakang, baring (rehat) -> tegak (deploy)
        const piv = grp(root, 0, 1.95, -2.75);
        const kb = new Builder();
        kb.add('crys2', HEX, [0, 0, 2.6], [PI / 2, 0, 0], [1.32, 5.2, 1.32]);   // pod kristal ais bercahaya
        for (const z of [0.25, 2.6, 4.95]) kb.add('iceD', HEX, [0, 0, z], [PI / 2, 0, 0], [1.44, 0.22, 1.44]);
        for (const sd of [-1, 1]) {
          kb.add('iceD', G.box, [sd * 0.34, 0.62, 2.5], [0, 0, sd * 0.45], [0.06, 0.5, 4.3]);   // sirip punggung
          seg(kb, 'frostL', G.cone, [sd * 0.4, 0.66, 4.65], [sd * 0.46, 0.75, 5.6], 0.08);
          kb.add('bzG', G.box, [sd * 0.58, 0, 2.6], null, [0.03, 0.05, 4.4]);              // urat cahaya sisi
        }
        kb.add('bzG', G.box, [0, -0.58, 2.6], null, [0.05, 0.03, 4.4]);
        kb.add('iceD', HEX, [0, 0, 0.02], [PI / 2, 0, 0], [1.5, 0.12, 1.5]);
        for (const [x, y] of [[0, 0], [0.28, 0.2], [-0.28, 0.2], [0.28, -0.2], [-0.28, -0.2]]) kb.add('bzG', G.cone, [x, y, 5.0], [PI / 2, 0, 0], [0.13, 0.3, 0.13]);   // hujung peluru
        kb.build({ body: mats.body, iceD: mats.iceD, frostL: mats.frostL, bzG: mats.bzG, crys2: mats.crys2 }, piv);
        // 4 kelopak penutup mulut
        const petals = [];
        for (let k = 0; k < 4; k++) {
          const a = PI / 4 + k * PI / 2;
          const hz = grp(piv, Math.cos(a) * 0.62, Math.sin(a) * 0.62, 5.12); hz.rotation.z = a;
          const hy = grp(hz);
          const pb = new Builder();
          pb.add('iceD', G.box, [-0.33, 0, 0], null, [0.64, 0.64, 0.07]);
          pb.add('bzG', G.box, [-0.33, 0, 0.04], [0, 0, PI / 4], [0.5, 0.03, 0.01]);
          pb.build({ iceD: mats.iceD, bzG: mats.bzG }, hy);
          petals.push(hy);
        }
        // 2 omboh pengangkat bercahaya
        const ramM = mats.frostL, rams = [];
        for (const sd of [-1, 1]) {
          const r = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), ramM); root.add(r);
          const g = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mats.bzG); root.add(g);
          rams.push({ r, g, A: new THREE.Vector3(sd * 0.42, 1.55, -0.9), B0: new THREE.Vector3(sd * 0.42, -0.5, 2.1) });
        }
        // kaki penstabil bilah (berlipat ke belakang -> menegak ke tanah)
        const jacks = [];
        for (const sd of [-1, 1]) {
          const j = grp(root, sd * 1.22, 1.25, -2.85);
          const jb = new Builder();
          jb.add('iceD', G.box, [0, -0.62, 0], null, [0.14, 1.25, 0.32]);
          seg(jb, 'frostL', G.cone, [0, -1.15, 0], [0, -1.3, 0], 0.14);
          jb.add('bzG', G.box, [sd * 0.08, -0.6, 0], null, [0.02, 0.9, 0.05]);
          jb.build({ iceD: mats.iceD, frostL: mats.frostL, bzG: mats.bzG }, j);
          jacks.push({ j, sd });
        }
        // kipas turbin + api sejuk
        const fans = [-1, 1].map(sd => {
          const g = grp(root, sd * 0.6, 1.05, -3.7);
          const fb = new Builder();
          for (let i = 0; i < 6; i++) fb.add('frostL', G.box, [0, 0, 0], [0, 0, i / 6 * PI], [0.78, 0.07, 0.04]);
          fb.build({ frostL: mats.frostL }, g);
          return g;
        });
        const fl = [-1, 1].map(sd => flame(root, G, sd * 0.6, 1.05, -3.9, PI / 2, 0, '#5ff0ff', 0.8));
        mountAt(ctx, -1.0, 1.62, 1.3);
        mountAt(ctx, 1.0, 1.62, 1.3);
        mountAt(ctx, -1.0, 1.62, -1.0);
        mountAt(ctx, 1.0, 1.62, -1.0);
        const Bp = new THREE.Vector3(), d = new THREE.Vector3();
        let dep = 0;
        const anim = st => {
          const p = st.p, dt = st.dt || 0.016, sp = Math.abs(st.fwd || 0);
          const want = p && p.bzDep !== undefined ? p.bzDep : (window.__bzDep !== undefined ? window.__bzDep : 0);
          dep = !p && window.__bzDep !== undefined ? want : damp(dep, want, 6, dt);
          const e = dep * dep * (3 - 2 * dep);
          piv.rotation.x = -e * PI / 2;                                                       // baring -> tegak
          const op = clamp(dep * 3 - 2, 0, 1);
          for (const h of petals) h.rotation.y = op * 1.9;                                   // kelopak terbuka di hujung
          for (const J of jacks) { const k = clamp(dep * 2, 0, 1); J.j.rotation.x = 1.45 * (1 - k); J.j.rotation.z = J.sd * 0.22 * k; }
          piv.updateMatrix();
          for (const R of rams) {
            Bp.copy(R.B0).applyMatrix4(piv.matrix);
            d.subVectors(Bp, R.A); const L = d.length(); d.normalize();
            R.r.position.copy(R.A); R.r.quaternion.setFromUnitVectors(_u, d); R.r.scale.set(0.2, L, 0.2);
            R.g.position.copy(R.A); R.g.quaternion.copy(R.r.quaternion); R.g.scale.set(0.08, L * 0.55, 0.22);
          }
          for (const f of fans) f.rotation.z += dt * (4 + sp * 1.5);
          for (const F of fl) F.update(st.time, 0.35 + sp / 22);
          mats.bzG.emissiveIntensity = 2.3 + Math.sin(st.time * 2.2) * 0.4 + op * 1.5;
          if (Math.random() < 0.3) sparkAt(st, (Math.random() < 0.5 ? -1 : 1) * 1.15, 1.9, 2.5, [0.5, 1.4, 1.6], 1, 0.8);   // wap sejuk dari salur kabin
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= CONDUIT - orb atom alien (TANK, pusingan 3, 2026-10-18) =================
       Nabil: versi petir "hodoh" dan kuasanya BUKAN kilat - ia pautan tolak
       balik (repulse link) berwarna pink/ungu yang LURUS. Bentuk:
         - BOLA kaca gelap = roda tunggal. Di dalamnya sebuah ATOM: nukleus
           berdenyut + 3 elektron mengorbit pada satah condong.
         - PERISAI 4 kelopak berduri memeluk bola (celah di depan/belakang/sisi
           supaya bola & atom kelihatan), bertaring di bibir bawah, berurat pink.
         - MAHKOTA bermata 6 di puncak + tanduk ke belakang.
         - 3 senjata TERAPUNG atas cakar di hujung lengan tulang (ada sokongan,
           cakera graviti di bawah setiap senjata).
       Redirect Link: kelopak TERBUKA sikit, elektron keluar dan mengorbit LUAR
       bola, dan setiap elektron memancarkan sinar LURUS ke seorang musuh.
       window.__condK = paksa pose 0..1 (ujian / lembaran). */
    conduit: {
      hull(b, G, HG, mats) {
        const R = 1.45, Rs = R + 0.3, top = R + Rs;
        mats.cpink = mats.cpink || glowMat('#ff3fc8', 2.4);
        mats.cviol = mats.cviol || glowMat('#8a3cff', 2.2);
        mats.ceye = mats.ceye || glowMat('#ff2a6a', 3.2);
        // hab gandar sisi berduri (bola berputar di antaranya)
        for (const sd of [-1, 1]) {
          b.add('dark', G.cyl, [sd * (R + 0.14), R, 0], [0, 0, PI / 2], [1.0, 0.26, 1.0]);
          b.add('cpink', G.torus, [sd * (R + 0.29), R, 0], [0, PI / 2, 0], [0.42, 0.42, 0.5]);
          b.add('steel', G.cyl, [sd * (R + 0.3), R, 0], [0, 0, PI / 2], [0.36, 0.12, 0.36]);
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + 0.3, cy = Math.cos(a), sz = Math.sin(a);
            seg(b, 'steel', G.cone, [sd * (R + 0.2), R + cy * 0.48, sz * 0.48], [sd * (R + 0.34), R + cy * 0.95, sz * 0.95], 0.09);
          }
          // tulang dari hab naik ke mahkota, mengikut celah sisi perisai
          curve(b, 'dark', G.cyl, [sd * (R + 0.22), R + 0.4, 0], [sd * (Rs + 0.35), R + 1.4, 0], [sd * 0.62, top + 0.05, 0], 5, 0.13, 0.09);
        }
        // MAHKOTA: gelang berduri + 6 mata sipit menghadap keluar
        b.add('dark', G.cyl, [0, top + 0.08, 0], null, [1.25, 0.28, 1.25]);
        b.add('cviol', G.torus, [0, top + 0.1, 0], [PI / 2, 0, 0], [0.66, 0.66, 0.6]);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, x = Math.sin(a), z = Math.cos(a);
          seg(b, 'steel', G.cone, [x * 0.55, top + 0.2, z * 0.55], [x * 0.95, top + 0.75, z * 0.95], 0.08);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i - 2.5) * 0.36;
          b.add('ceye', G.box, [Math.sin(a) * 0.64, top + 0.08 + (i % 2) * 0.06, Math.cos(a) * 0.64], [0, a, 0], [0.07, 0.17, 0.04]);
        }
        // tanduk melengkung ke belakang
        for (const sd of [-1, 1]) {
          curve(b, 'dark', G.cyl, [sd * 0.4, top + 0.2, -0.4], [sd * 0.7, top + 0.75, -1.2], [sd * 0.55, top + 0.35, -2.1], 5, 0.14, 0.05);
          seg(b, 'steel', G.cone, [sd * 0.55, top + 0.35, -2.1], [sd * 0.5, top + 0.1, -2.5], 0.06);
        }
        // LENGAN TULANG ke 3 senjata terapung + cakar penyokong
        for (const [x, y, z] of [[-1.25, top + 0.85, -0.35], [1.25, top + 0.85, -0.35], [0, top + 1.0, 0.85]]) {
          const ox = Math.sign(x) * 0.45, oz = x ? -0.15 : 0.45;
          curve(b, 'dark', G.cyl, [ox, top + 0.15, oz], [x * 1.05, top + 0.25, z + (x ? -0.2 : 0.35)], [x, y, z], 5, 0.12, 0.08);
          b.add('cviol', G.torus, [x, y + 0.02, z], [PI / 2, 0, 0], [0.42, 0.42, 0.5]);
          for (let k = 0; k < 3; k++) {
            const a = k / 3 * TAU + 0.5, cx = Math.cos(a), cz = Math.sin(a);
            seg(b, 'steel', G.cone, [x + cx * 0.3, y, z + cz * 0.3], [x + cx * 0.58, y + 0.42, z + cz * 0.58], 0.07);
          }
        }
      },
      limb(ctx) {
        const { root, Builder, G, mats, wheels } = ctx;
        const R = 1.45, Rs = R + 0.3, top = R + Rs;
        const PINK = new THREE.Color('#ff4fd8'), VIOL = new THREE.Color('#9a4dff');
        const add = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
        // ---- BOLA (roda): kaca gelap berasap + jalur cengkam bertatah ----
        const holder = grp(root, 0, R, 0), spin = grp(holder);
        const glass = new THREE.MeshStandardMaterial({ color: 0x1a0a22, emissive: 0x2a0630, emissiveIntensity: 0.6, transparent: true, opacity: 0.34, roughness: 0.04, metalness: 0.6, depthWrite: false });
        spin.add(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 22), glass));
        const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3fc8').multiplyScalar(0.1), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
        holder.add(rim);
        const tread = new Builder();
        tread.add('dark', G.torus, [0, 0, 0], [0, PI / 2, 0], [R, R, 0.9]);
        for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; tread.add('dark', G.box, [0, Math.cos(a) * (R + 0.03), Math.sin(a) * (R + 0.03)], [a, 0, 0], [0.34, 0.05, 0.1]); }
        tread.build({ dark: mats.dark }, spin);
        for (const rx of [0, PI / 2]) {                                                      // urat ungu - menunjukkan bola bergolek
          const m = new THREE.Mesh(new THREE.TorusGeometry(R * 0.995, 0.022, 4, 56), add(VIOL, 0.6));
          m.rotation.x = rx; spin.add(m);
        }
        wheels.push({ holder, spin, front: false });
        // ---- ATOM: nukleus + 3 elektron (tidak ikut berguling) ----
        const atom = grp(holder);
        const nuc = grp(atom), nucBits = [];
        const nucM = add(new THREE.Color('#ffd0f4'), 1), nucM2 = add(PINK, 1);
        for (let i = 0; i < 7; i++) {
          const m = new THREE.Mesh(SPH(), i % 2 ? nucM : nucM2);
          m.scale.setScalar(0.32); nuc.add(m);
          nucBits.push({ m, u: Math.random() * TAU, v: Math.random() * TAU, r: i ? 0.2 : 0 });
        }
        const halo = new THREE.Mesh(SPH(), add(PINK, 0.32)); halo.scale.setScalar(1.25); nuc.add(halo);
        const elec = [];
        for (let i = 0; i < 3; i++) {
          const yaw = grp(atom); yaw.rotation.y = i * PI / 3;
          const pl = grp(yaw); pl.rotation.x = 1.2;
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.026, 4, 64), add(PINK, 0.75));
          pl.add(ring);
          const e = new THREE.Mesh(SPH(), add(new THREE.Color('#ffe6fb'), 1)); e.scale.setScalar(0.24); pl.add(e);
          const eg = new THREE.Mesh(SPH(), add(PINK, 0.45)); eg.scale.setScalar(0.5); e.add(eg);
          const trail = [];
          for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(SPH(), add(PINK, 0.5 - k * 0.08)); t.scale.setScalar(0.15 - k * 0.022); pl.add(t); trail.push(t); }
          elec.push({ pl, ring, e, trail, a: i * TAU / 3, k: 1.7 + i * 0.35 });
        }
        // ---- PERISAI 4 kelopak (berengsel di puncak, terbuka semasa kebolehan) ----
        const plateM = mats.body.clone(); plateM.side = THREE.DoubleSide;
        const W = PI * 0.27, t0 = PI * 0.07, t1 = PI * 0.6;
        const P = (ph, th, r) => [-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r];
        const pg = new THREE.SphereGeometry(Rs, 16, 10, PI / 2 - W / 2, W, t0, t1 - t0);
        const pIn = new THREE.SphereGeometry(Rs - 0.08, 16, 10, PI / 2 - W / 2, W, t0, t1 - t0);
        const hinges = [];
        for (let i = 0; i < 4; i++) {
          const yaw = grp(root, 0, R, 0); yaw.rotation.y = PI / 4 + i * PI / 2;
          const hinge = grp(yaw, 0, Rs, 0), content = grp(hinge, 0, -Rs, 0);
          const m = new THREE.Mesh(pg, plateM); m.castShadow = true; content.add(m);
          content.add(new THREE.Mesh(pIn, mats.dark));
          const pb = new Builder();
          for (const ed of [-1, 1]) {                                                       // urat pink di tepi kelopak
            const ph = PI / 2 + ed * W / 2;
            for (let k = 0; k < 6; k++) seg(pb, 'cpink', G.cyl, P(ph, t0 + (t1 - t0) * k / 6, Rs + 0.02), P(ph, t0 + (t1 - t0) * (k + 1) / 6, Rs + 0.02), 0.05);
          }
          for (let k = 0; k < 6; k++) seg(pb, 'dark', G.box, P(PI / 2, t0 + (t1 - t0) * k / 6, Rs + 0.06), P(PI / 2, t0 + (t1 - t0) * (k + 1) / 6, Rs + 0.06), 0.22, 0.14);   // tulang belakang kelopak
          for (const th of [0.2, 0.33, 0.46]) seg(pb, 'steel', G.cone, P(PI / 2, PI * th, Rs + 0.1), P(PI / 2, PI * th - 0.06, Rs + 0.8), 0.12);   // duri
          for (const ph of [-0.36, -0.12, 0.12, 0.36]) {                                       // taring di bibir bawah
            const a = PI / 2 + ph * W * 1.25;
            seg(pb, 'steel', G.cone, P(a, t1 - 0.02, Rs - 0.02), P(a, t1 + 0.2, Rs - 0.2), 0.08);
          }
          seg(pb, 'cviol', G.box, P(PI / 2 - W * 0.3, PI * 0.42, Rs + 0.03), P(PI / 2 + W * 0.3, PI * 0.42, Rs + 0.03), 0.04, 0.03);   // celah bercahaya
          pb.build({ dark: mats.dark, steel: mats.steel, cpink: mats.cpink, cviol: mats.cviol }, content);
          hinges.push(hinge);
        }
        // ---- 3 senjata terapung ----
        const floats = [];
        for (const [x, y, z] of [[-1.25, top + 0.85, -0.35], [1.25, top + 0.85, -0.35], [0, top + 1.0, 0.85]]) {
          const f = grp(root, x, y, z);
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 20), add(VIOL, 0.55)); disc.position.y = 0.06; f.add(disc);
          mountAt(ctx, 0, 0.4, 0, f);
          floats.push({ f, y, ph: floats.length * 2.1 });
        }
        // ---- SINAR PAUTAN LURUS (elektron -> musuh) ----
        const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
        const beams = [0, 1, 2].map(() => {
          const g = new THREE.Group(); g.visible = false; root.add(g);
          const core = new THREE.Mesh(cyl, add(new THREE.Color('#ffd6f6'), 1));
          const glow = new THREE.Mesh(cyl, add(PINK, 0.42));
          const outer = new THREE.Mesh(cyl, add(VIOL, 0.18));
          const end = new THREE.Mesh(SPH(), add(PINK, 0.7));
          const beads = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(SPH(), add(new THREE.Color('#ffe6fb'), 0.9)); g.add(m); return m; });
          for (const m of [core, glow, outer, end]) { m.frustumCulled = false; g.add(m); }
          return { g, core, glow, outer, end, beads };
        });
        const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
        const place = (m, a, d, len, w) => { m.position.copy(a).addScaledVector(d, len / 2); m.quaternion.setFromUnitVectors(_u, d); m.scale.set(w, len, w); };
        let open = 0, tm = 0;
        const anim = st => {
          const dt = st.dt || 0.016, p = st.p, C = p && p.conduit;
          const want = window.__condK !== undefined ? window.__condK : (C ? 1 : 0);
          open = window.__condK !== undefined ? want : damp(open, want, want ? 5 : 2.5, dt);
          tm += dt;
          // kelopak terbuka keluar
          hinges.forEach((h, i) => { h.rotation.x = -open * (0.26 + (i % 2) * 0.05); });
          // nukleus berdenyut
          const beat = 1 + Math.pow(Math.max(0, Math.sin(tm * (3 + open * 4))), 6) * 0.35;
          nuc.scale.setScalar((1 + open * 0.45) * beat);
          nuc.rotation.y += dt * (1.5 + open * 4);
          for (const n of nucBits) { n.u += dt * 2.3; n.v += dt * 1.7; n.m.position.set(Math.cos(n.u) * Math.sin(n.v) * n.r, Math.cos(n.v) * n.r, Math.sin(n.u) * Math.sin(n.v) * n.r); }
          halo.material.opacity = 0.28 + open * 0.2 + (beat - 1) * 0.5;
          // elektron: dalam bola (0.95) -> keluar mengorbit bola (2.55)
          const rad = 1.12 + open * 1.4;
          for (const E of elec) {
            E.a += dt * E.k * (1 + open * 1.6);
            E.ring.scale.setScalar(rad);
            E.e.position.set(Math.cos(E.a) * rad, Math.sin(E.a) * rad, 0);
            E.trail.forEach((t, k) => { const a = E.a - (k + 1) * 0.16; t.position.set(Math.cos(a) * rad, Math.sin(a) * rad, 0); });
          }
          // senjata terapung berayun perlahan
          for (const F of floats) F.f.position.y = F.y + Math.sin(tm * 1.8 + F.ph) * 0.07;
          // sinar lurus ke musuh terpaut
          const L = C ? C.links : null;
          if (L && L.length) { root.updateWorldMatrix(true, true); }
          beams.forEach((B, i) => {
            const e = L && L[i];
            B.g.visible = !!e && open > 0.3;
            if (!B.g.visible) return;
            elec[i].e.getWorldPosition(_a); root.worldToLocal(_a);
            _b.set(e.x, (e.y || 0) + (e.h || 1.6) * 0.6, e.z); root.worldToLocal(_b);
            _d.subVectors(_b, _a); const len = _d.length() || 0.01; _d.multiplyScalar(1 / len);
            const fl = 1 + Math.sin(tm * 30 + i * 2) * 0.15;
            place(B.core, _a, _d, len, 0.05 * fl);
            place(B.glow, _a, _d, len, 0.16 * fl);
            place(B.outer, _a, _d, len, 0.38 * fl);
            B.end.position.copy(_b); B.end.scale.setScalar(0.9 + Math.sin(tm * 18 + i) * 0.25);
            B.beads.forEach((m, k) => { const u = (tm * 1.6 + k / 4) % 1; m.position.copy(_a).addScaledVector(_d, len * u); m.scale.setScalar(0.22); });
          });
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= REVENANT - kereta jenazah panjang (TANK) =================
       Pusingan 3 (Nabil): penunggang maut dibuang. Kereta kini PANJANG dengan
       6 tayar (1 gandar depan, 2 gandar belakang - cars.js limbs 'w6', len 1.25).
       Second Wind: PINTU BUMBUNG tengah terbuka seperti sayap dan sebuah
       RELIKUARI naik dari dalam - sangkar gotik dengan ORB JIWA hijau berdenyut
       dan gelang roh berputar - kemudian turun dan pintu tertutup semula bila
       kebolehan tamat. */
    hearse: {
      hull(b, G, HG, mats) {
        mats.ivory = mats.ivory || new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.5, metalness: 0.05 });
        const L = 1.25;
        b.add('darker', G.box, [0, 0.46, -0.15], null, [1.92, 0.28, 5.9]);
        b.add('body', G.rbox, [0, 0.74, -0.15], null, [1.92, 0.5, 5.95]);
        b.add('body', G.rbox, [0, 0.98, 2.25], null, [1.75, 0.32, 1.45]);                   // hud
        // kabin panjang: depan & belakang pejal, TENGAH berlubang untuk relikuari
        b.add('body', G.rbox, [0, 1.38, 1.0], null, [1.82, 0.95, 1.1]);
        b.add('body', G.rbox, [0, 1.38, -2.25], null, [1.82, 0.95, 1.9]);
        for (const sd of [-1, 1]) b.add('body', G.box, [sd * 0.86, 1.38, -0.55], null, [0.1, 0.95, 2.3]);   // dinding sisi tengah
        b.add('darker', G.box, [0, 0.92, -0.55], null, [1.62, 0.06, 2.3]);                   // lantai ruang
        b.add('darker', G.rbox, [0, 1.88, 1.0], null, [1.7, 0.1, 1.0]);
        b.add('darker', G.rbox, [0, 1.88, -2.25], null, [1.7, 0.1, 1.8]);
        b.add('glass', G.box, [0, 1.34, 1.58], [-0.5, 0, 0], [1.58, 0.56, 0.05]);
        for (const sd of [-1, 1]) {
          b.add('glass', HG.hex, [sd * 0.92, 1.38, -2.2], [0, 0, PI / 2], [0.55, 0.04, 1.4]);   // tingkap keranda
          b.add('steel', G.torus, [sd * 0.93, 1.4, -3.0], [0, PI / 2, 0], [0.55, 0.55, 0.3]);    // palang landau
          b.add('steel', G.box, [sd * 0.97, 0.7, -0.15], null, [0.03, 0.04, 5.6]);
          // garis denyut jantung sepanjang sisi
          const P = [[2.3, 0], [1.2, 0], [1.05, 0.22], [0.92, -0.26], [0.78, 0.38], [0.64, -0.1], [0.5, 0], [-1.5, 0], [-1.62, 0.18], [-1.74, -0.14], [-1.86, 0], [-3.0, 0]];
          for (let i = 0; i < P.length - 1; i++) seg(b, 'crys', G.box, [sd * 0.975, 0.98 + P[i][1], P[i][0]], [sd * 0.975, 0.98 + P[i + 1][1], P[i + 1][0]], 0.035, 0.035);
          // tanglung roh
          b.add('dark', G.cyl, [sd * 0.98, 1.95, 1.2], null, [0.2, 0.08, 0.2]);
          b.add('crys', G.cyl, [sd * 0.98, 2.1, 1.2], null, [0.16, 0.26, 0.16]);
          b.add('dark', G.cone, [sd * 0.98, 2.32, 1.2], null, [0.22, 0.16, 0.22]);
          // engsel pintu bumbung
          b.add('steel', G.cyl, [sd * 0.86, 1.9, -0.55], [PI / 2, 0, 0], [0.08, 2.2, 0.08]);
        }
        for (const x of [-0.55, 0, 0.55]) {                                                   // menara bumbung
          b.add('steel', G.cone, [x, 2.06, -3.0], null, [0.12, 0.32, 0.12]);
          b.add('steel', G.cone, [x, 2.06, 1.2], null, [0.1, 0.24, 0.1]);
        }
        b.add('glass', G.box, [0, 1.4, -3.19], null, [1.1, 0.62, 0.04]);
        b.add('crys', G.box, [0, 1.12, -3.21], null, [0.9, 0.04, 0.02]);
        b.add('steel', G.box, [0, 0.84, 2.96], null, [1.0, 0.36, 0.04]);                    // gril tegak
        for (let i = -4; i <= 4; i++) b.add('darker', G.box, [i * 0.1, 0.84, 2.98], null, [0.03, 0.32, 0.03]);
        lamps(b, G, [[-0.68, 0.88, 2.94], [0.68, 0.88, 2.94]], 0.15);
        for (const x of [-0.8, 0.8]) b.add('tail', G.box, [x, 1.1, -3.13], null, [0.08, 0.7, 0.05]);
        b.add('ivory', G.sph, [0, 1.18, 2.85], null, [0.38, 0.34, 0.36]);                  // tengkorak di muncung
        b.add('ivory', G.box, [0, 1.04, 2.95], null, [0.26, 0.12, 0.18]);
        for (const sd of [-1, 1]) b.add('crys', G.sph, [sd * 0.09, 1.2, 3.01], null, [0.09, 0.08, 0.05]);
        void L;
      },
      limb(ctx) {
        const { root, Builder, G, mats, sp } = ctx;
        // dua PINTU BUMBUNG berengsel di sisi (terbuka ke atas-luar seperti sayap)
        const doors = [];
        for (const sd of [-1, 1]) {
          const h = grp(root, sd * 0.86, 1.9, -0.55);
          const db = new Builder();
          db.add('body', G.box, [-sd * 0.42, 0.02, 0], null, [0.84, 0.08, 2.25]);
          db.add('darker', G.box, [-sd * 0.42, 0.07, 0], null, [0.7, 0.03, 2.0]);
          // bulatan rune + garis denyut jantung pada pintu (Nabil: tiada salib)
          db.add('crys', G.torus, [-sd * 0.42, 0.09, 0], [PI / 2, 0, 0], [0.62, 0.62, 0.3]);
          db.add('crys', G.torus, [-sd * 0.42, 0.09, 0], [PI / 2, 0, 0], [0.36, 0.36, 0.25]);
          const E = [[0.9, 0], [0.3, 0], [0.18, 0.18], [0.05, -0.22], [-0.08, 0.3], [-0.2, 0], [-0.9, 0]];
          for (let i = 0; i < E.length - 1; i++) seg(db, 'crys', G.box, [-sd * 0.42 + E[i][1], 0.1, E[i][0]], [-sd * 0.42 + E[i + 1][1], 0.1, E[i + 1][0]], 0.03, 0.03);
          db.build({ body: mats.body, darker: mats.darker, crys: mats.crys }, h);
          doors.push({ h, sd });
        }
        // RELIKUARI: sangkar gotik + orb jiwa, di atas pelantar lif
        const soul = glowMat(sp.accent || '#9effd0', 3);
        const lift = grp(root, 0, 0.95, -0.55);
        const lb = new Builder();
        lb.add('dark', G.cyl, [0, 0.05, 0], null, [1.0, 0.1, 1.0]);
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU;
          seg(lb, 'gold', G.cyl, [Math.cos(a) * 0.42, 0.1, Math.sin(a) * 0.42], [Math.cos(a) * 0.42, 1.2, Math.sin(a) * 0.42], 0.045);
          seg(lb, 'gold', G.cyl, [Math.cos(a) * 0.42, 1.2, Math.sin(a) * 0.42], [0, 1.65, 0], 0.04);      // menara gotik
        }
        lb.add('gold', G.torus, [0, 0.6, 0], [PI / 2, 0, 0], [0.9, 0.9, 0.4]);
        lb.add('gold', G.cone, [0, 1.85, 0], null, [0.14, 0.45, 0.14]);
        lb.build({ dark: mats.dark, gold: mats.gold }, lift);
        const orb = new THREE.Mesh(SPH(), soul); orb.position.y = 0.65; lift.add(orb);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 32), soul);
        halo.position.y = 0.65; lift.add(halo);
        mountAt(ctx, -0.6, 1.95, 1.0);
        mountAt(ctx, 0.6, 1.95, -2.2);
        let open = 0;
        const anim = st => {
          const on = !!(st.p && st.p.abOn);
          open = damp(open, on ? 1 : 0, on ? 4 : 3, st.dt || 0.016);
          const doorK = clamp(open * 1.6, 0, 1), liftK = clamp(open * 1.6 - 0.6, 0, 1);
          for (const D of doors) D.h.rotation.z = D.sd * doorK * 2.0;
          lift.position.y = 0.95 + liftK * 1.4;
          lift.visible = open > 0.05;
          const pulse = 0.5 + Math.sin(st.time * 6) * 0.06;
          orb.scale.setScalar(pulse * (0.6 + liftK * 0.6));
          halo.rotation.x = st.time * 2; halo.rotation.y = st.time * 1.3;
          soul.emissiveIntensity = 2 + liftK * 3 + Math.sin(st.time * 6) * 0.6;
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= VALKYRIE - helikopter serang (pusingan 2) =================
       Badan & rotor asal dikekalkan. Nabil: "tayar terapung". Roda generik w6
       dibuang (cars.js limbs 'none'); kini GEAR PENDARATAN sebenar: roda hidung
       di bawah dagu, dua roda utama pada tupang omboh dari penyangga sayap, dan
       roda ekor di hujung batang ekor - semuanya bersambung pada badan dan
       MENARIK MASUK bila Valkyrie terbang (Gunship Mode). */
    valkyrie: {
      hull(b, G, HG, mats) { old.valkyrie.hull(b, G, HG, mats); },
      limb(ctx) {
        const headAnim = old.valkyrie.limb(ctx);
        const { root, Builder, G, mats, wheels } = ctx;
        const gears = [];
        const gear = (x, z, R, topY, front) => {
          const strut = grp(root, x, topY, z);            // engsel di badan
          const sb = new Builder();
          seg(sb, 'dark', G.cyl, [0, 0, 0], [0, -(topY - R) + 0.15, 0], 0.13);             // omboh luar
          seg(sb, 'steel', G.cyl, [0, -(topY - R) * 0.55, 0], [0, -(topY - R), 0], 0.08);   // omboh dalam
          for (const s2 of [-1, 1]) sb.add('dark', G.box, [s2 * 0.18, -(topY - R), 0], null, [0.05, 0.3, 0.28]);   // garpu
          sb.add('steel', G.cyl, [0, -(topY - R), 0], [0, 0, PI / 2], [0.07, 0.42, 0.07]);  // gandar
          sb.add('dark', G.sph, [0, 0, 0], null, [0.24, 0.24, 0.24]);
          sb.build({ dark: mats.dark, steel: mats.steel }, strut);
          const holder = grp(strut, 0, -(topY - R), 0), spin = grp(holder);
          const t = ctx.tyre(); t.scale.setScalar(R / 0.46); spin.add(t);
          wheels.push({ holder, spin, front });
          gears.push({ strut, x });
        };
        gear(0, 1.65, 0.34, 0.75, true);                   // roda hidung
        gear(-0.95, -0.3, 0.46, 1.24, false);              // roda utama di bawah penyangga sayap
        gear(0.95, -0.3, 0.46, 1.24, false);
        gear(0, -3.55, 0.26, 1.45, false);                 // roda ekor
        let k = 0;
        const anim = st => {
          if (headAnim) headAnim(st);
          const air = st.p ? (st.p.fly ? 1 : clamp(((st.p.y || 0) - 0.5) / 2, 0, 1)) : 0;
          k = damp(k, air, 4, st.dt || 0.016);
          for (const g of gears) { g.strut.rotation.x = -k * 1.35; g.strut.rotation.z = g.x ? Math.sign(g.x) * k * 0.2 : 0; }
        };
        anim({ time: 0, dt: 0.016, p: null, fwd: 0 });
        return anim;
      },
    },

    /* ================= INFERNO - relau napalm (ZONE) =================
       Belakang dikekalkan (tangki napalm berkembar + palang muncung). Depan,
       sisi dan atas dibina semula supaya GANAS: rahang relau bergigi dengan
       mulut membara, hud panjang bersudut dengan PENIUP (supercharger) yang
       menyemburkan api, spatbor perisai bergerigi atas roda depan dengan
       salur bara, paip ekzos sisi yang meludah api, dan bumbung berjeriji
       relau dengan sirip haba. */
    furnace: {
      hull(b, G, HG, mats) {
        mats.ember = mats.ember || glowMat('#ff5a1a', 2.6);
        b.add('darker', G.box, [0, 0.52, -0.1], null, [1.95, 0.35, 4.4]);
        // ---- belakang (asal, Nabil suka) ----
        b.add('body', G.rbox, [0, 1.15, -0.85], null, [1.95, 1.1, 1.5]);
        for (const sd of [-1, 1]) {
          b.add('rust', G.cyl, [sd * 0.5, 1.15, -1.85], [PI / 2, 0, 0], [0.75, 0.9, 0.75]);
          b.add('steel', G.torus, [sd * 0.5, 1.15, -1.55], null, [0.78, 0.78, 0.4]);
          b.add('steel', G.torus, [sd * 0.5, 1.15, -2.15], null, [0.78, 0.78, 0.4]);
          b.add('hot', G.box, [sd * 0.5, 1.53, -1.85], null, [0.1, 0.03, 0.5]);
        }
        b.add('dark', G.cyl, [0, 0.62, -2.35], [0, 0, PI / 2], [0.16, 1.8, 0.16]);
        for (let i = -2; i <= 2; i++) {
          b.add('steel', G.cone, [i * 0.38, 0.55, -2.45], [-PI / 2 - 0.4, 0, 0], [0.14, 0.24, 0.14]);
          b.add('hot', G.sph, [i * 0.38, 0.5, -2.55], null, [0.08, 0.08, 0.08]);
        }
        for (const x of [-0.85, 0.85]) b.add('tail', G.box, [x, 1.25, -1.57], null, [0.2, 0.1, 0.06]);
        // ---- kabin berperisai bersudut dengan celah cermin ----
        b.add('body', HG.frust, [0, 1.38, 0.3], null, [1.75, 0.75, 1.3]);
        b.add('darker', G.box, [0, 1.55, 0.92], [-0.55, 0, 0], [1.4, 0.06, 0.38]);
        b.add('glass', G.box, [0, 1.56, 0.94], [-0.55, 0, 0], [1.2, 0.03, 0.16]);
        // ---- bumbung relau: jeriji membara + sirip haba ----
        b.add('dark', G.box, [0, 1.78, 0.2], null, [1.1, 0.06, 0.9]);
        for (let i = -3; i <= 3; i++) b.add('ember', G.box, [i * 0.14, 1.8, 0.2], null, [0.05, 0.04, 0.8]);
        for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, 1.92 + i * 0.03, 0.55 - i * 0.28], [0.5, 0, 0], [0.08, 0.42 - i * 0.04, 0.3]);
        // ---- hud panjang bersudut + peniup ----
        b.add('body', G.box, [0, 1.12, 1.62], [-0.16, 0, 0], [1.85, 0.32, 1.7]);
        for (const sd of [-1, 1]) {
          b.add('body', G.box, [sd * 0.7, 1.2, 1.55], [-0.16, 0, sd * 0.28], [0.55, 0.12, 1.65]);   // bonjolan hud
          for (let k = 0; k < 3; k++) b.add('ember', G.box, [sd * 0.62, 1.33 - k * 0.04, 1.2 + k * 0.32], [-0.16, 0, sd * 0.28], [0.32, 0.03, 0.08]);   // salur bara
        }
        b.add('dark', G.rbox, [0, 1.48, 1.35], null, [0.7, 0.42, 0.75]);                   // peniup
        for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, 1.48, 1.08 + i * 0.18], null, [0.74, 0.46, 0.04]);
        b.add('steel', G.box, [0, 1.78, 1.2], [-0.2, 0, 0], [0.62, 0.18, 0.55]);            // sudu masuk
        b.add('ember', G.box, [0, 1.8, 1.47], [-0.2, 0, 0], [0.5, 0.12, 0.04]);
        // ---- RAHANG RELAU bergigi ----
        b.add('darker', G.box, [0, 0.8, 2.38], [0.12, 0, 0], [1.9, 0.62, 0.3]);
        b.add('ember', G.box, [0, 0.8, 2.45], null, [1.4, 0.32, 0.06]);                   // mulut membara
        for (let i = -4; i <= 4; i++) {
          b.add('steel', G.cone, [i * 0.17, 1.02, 2.52], [PI, 0, 0], [0.09, 0.26, 0.09]);   // taring atas
          b.add('steel', G.cone, [i * 0.17 + 0.08, 0.58, 2.52], null, [0.08, 0.22, 0.08]);  // taring bawah
        }
        for (const sd of [-1, 1]) {
          b.add('head', G.box, [sd * 0.6, 1.2, 2.38], [0, 0, -sd * 0.35], [0.42, 0.06, 0.06]);   // lampu sipit
          b.add('steel', G.cone, [sd * 0.98, 0.75, 2.45], [PI / 2, 0, -sd * 0.25], [0.18, 0.7, 0.18]);   // gading bampar
          // ---- spatbor perisai bergerigi atas roda depan ----
          const fx = sd * 0.99, fz = 1.5;
          b.add('body', G.box, [fx, 1.18, fz], [0, 0, sd * 0.12], [0.62, 0.12, 1.25]);
          b.add('body', G.box, [fx * 1.02, 1.0, fz + 0.62], [0.55, 0, sd * 0.12], [0.6, 0.1, 0.42]);
          b.add('body', G.box, [fx * 1.02, 1.0, fz - 0.62], [-0.55, 0, sd * 0.12], [0.6, 0.1, 0.42]);
          for (let k = 0; k < 3; k++) b.add('steel', G.cone, [fx * 1.2, 1.22, fz - 0.4 + k * 0.4], [0, 0, -sd * 1.2], [0.08, 0.32, 0.08]);
          b.add('ember', G.box, [sd * 0.98, 0.95, 0.6], null, [0.04, 0.24, 0.5]);            // salur sisi
          // paip ekzos sisi (api dalam limb)
          b.add('steel', G.cyl, [sd * 1.05, 0.5, 0.2], [PI / 2, 0, 0], [0.16, 1.5, 0.16]);
          b.add('dark', G.cyl, [sd * 1.05, 0.5, -0.58], [PI / 2, 0, 0], [0.2, 0.12, 0.2]);
        }
      },
      limb(ctx) {
        const { root, G } = ctx;
        const fl = [];
        fl.push(flame(root, G, 0, 1.88, 1.22, -0.9, 0, '#ff6a1a', 0.9));                // peniup -> api ke atas-belakang
        for (const sd of [-1, 1]) fl.push(flame(root, G, sd * 1.05, 0.5, -0.66, PI / 2, 0, '#ff5a1a', 0.7));   // ekzos sisi
        mountAt(ctx, -0.6, 1.78, -0.85);
        mountAt(ctx, 0.6, 1.78, -0.85);
        mountAt(ctx, 0, 1.95, -0.25);
        const anim = st => {
          const f = 0.45 + Math.abs(st.fwd || 0) / 30 + (st.p && st.p.abOn ? 0.6 : 0) + (st.p && st.p.nitroOn ? 0.5 : 0);
          for (const F of fl) F.update(st.time, f);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null });
        return anim;
      },
    },

    /* ================= TEMPEST - katamaran ribut (AURA) =================
       Menara gegelung + dua ponton DIKEKALKAN (Nabil suka). Yang dinaik
       taraf: anjungan ribut bersudut ganti kotak kabin, serampang petir di
       haluan setiap ponton, tiang penebat seramik, lilitan tembaga, jambatan
       melengkung (bukan palang rata), kabel dari menara ke ponton, dan PETIR
       HIDUP yang memercik antara menara dan serampang. */
    catamaran: {
      hull(b, G, HG, mats) {
        mats.copper = mats.copper || new THREE.MeshStandardMaterial({ color: 0xb8662e, metalness: 0.9, roughness: 0.3 });
        mats.ivory = mats.ivory || new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.4 });
        b.add('darker', G.box, [0, 0.62, -0.1], null, [1.2, 0.28, 3.9]);
        for (const sd of [-1, 1]) {
          // ponton (asal)
          b.add('body', G.cyl, [sd * 1.0, 1.08, -0.15], [PI / 2, 0, 0], [0.9, 3.6, 0.9]);
          b.add('body', G.cone, [sd * 1.0, 1.08, 2.15], [PI / 2, 0, 0], [0.9, 1.0, 0.9]);
          b.add('body', G.sph, [sd * 1.0, 1.08, -1.95], null, [0.9, 0.9, 0.7]);
          b.add('crys', G.box, [sd * 1.0, 1.36, 0.2], null, [0.06, 0.04, 3.0]);
          for (const z of [1.0, -0.2, -1.4]) b.add('steel', G.torus, [sd * 1.0, 1.08, z], null, [0.94, 0.94, 0.25]);
          b.add('tail', G.box, [sd * 1.0, 1.1, -2.3], null, [0.3, 0.1, 0.05]);
          // lilitan tembaga di belakang ponton
          for (let k = 0; k < 6; k++) b.add('copper', G.torus, [sd * 1.0, 1.08, -1.0 - k * 0.12], null, [0.93, 0.93, 0.12]);
          // serampang petir di haluan
          seg(b, 'steel', G.cyl, [sd * 1.0, 1.25, 2.3], [sd * 1.0, 1.45, 3.05], 0.07);
          for (const t of [-1, 0, 1]) {
            seg(b, 'steel', G.cyl, [sd * 1.0, 1.45, 3.0], [sd * 1.0 + t * 0.22, 1.55 + (t ? 0 : 0.1), 3.4], 0.05);
            b.add('crys', G.sph, [sd * 1.0 + t * 0.22, 1.55 + (t ? 0 : 0.1), 3.42], null, [0.09, 0.09, 0.09]);
          }
          // tiang penebat seramik
          b.add('dark', G.cyl, [sd * 1.0, 1.65, 1.35], null, [0.08, 0.5, 0.08]);
          for (let k = 0; k < 4; k++) b.add('ivory', G.cyl, [sd * 1.0, 1.5 + k * 0.12, 1.35], null, [0.3 - k * 0.03, 0.05, 0.3 - k * 0.03]);
          b.add('crys', G.sph, [sd * 1.0, 1.98, 1.35], null, [0.16, 0.16, 0.16]);
          // kabel dari menara ke ponton
          curve(b, 'dark', G.cyl, [0, 2.6, -1.0], [sd * 0.7, 2.6, -0.4], [sd * 1.0, 1.98, 1.35], 5, 0.035, 0.035);
          // jambatan melengkung
          for (const z of [-0.55, -1.55]) b.add('steel', G.torus, [0, 1.25, z], null, [1.85, 0.75, 0.3]);
        }
        b.add('darker', G.box, [0, 1.22, -0.3], null, [1.3, 0.16, 2.8]);
        // anjungan ribut bersudut
        b.add('body', HG.frust, [0, 1.62, 0.75], null, [1.05, 0.6, 1.1]);
        b.add('darker', G.box, [0, 1.75, 1.32], [-0.6, 0, 0], [0.9, 0.05, 0.3]);
        b.add('crys', G.box, [0, 1.76, 1.34], [-0.6, 0, 0], [0.75, 0.03, 0.1]);
        b.add('steel', G.cyl, [0, 2.05, 0.75], null, [0.36, 0.12, 0.36]);
        // menara ribut (asal)
        b.add('dark', G.cyl, [0, 1.6, -1.0], null, [0.7, 0.5, 0.7]);
        b.add('steel', G.cyl, [0, 2.35, -1.0], null, [0.14, 1.5, 0.14]);
        for (let k = 0; k < 4; k++) b.add(k % 2 ? 'steel' : 'crys', G.torus, [0, 1.95 + k * 0.28, -1.0], [PI / 2, 0, 0], [0.9 - k * 0.12, 0.9 - k * 0.12, 0.5]);
        b.add('crys', G.ico1, [0, 3.25, -1.0], null, [0.62, 0.62, 0.62]);
        lamps(b, G, [[-1.0, 1.1, 2.55], [1.0, 1.1, 2.55]], 0.14);
      },
      limb(ctx) {
        const { root, sp } = ctx;
        /* petir hidup: jalur zigzag dijana semula setiap beberapa bingkai */
        const boltM = new THREE.LineBasicMaterial({ color: new THREE.Color(sp.accent || '#7de3ff').lerp(new THREE.Color('#ffffff'), 0.4), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
        const ends = [[-1.0, 1.55, 3.42], [1.0, 1.55, 3.42], [-1.0, 1.98, 1.35], [1.0, 1.98, 1.35]];
        const bolts = ends.map(() => {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3), 3));
          const L = new THREE.Line(g, boltM); L.frustumCulled = false; root.add(L); return L;
        });
        const zig = (L, a, c) => {
          const P = L.geometry.attributes.position;
          for (let i = 0; i < 9; i++) {
            const t = i / 8, j = i && i < 8 ? 0.22 : 0;
            P.setXYZ(i, a[0] + (c[0] - a[0]) * t + (Math.random() - 0.5) * j, a[1] + (c[1] - a[1]) * t + (Math.random() - 0.5) * j, a[2] + (c[2] - a[2]) * t + (Math.random() - 0.5) * j);
          }
          P.needsUpdate = true;
        };
        mountAt(ctx, -1.0, 1.58, 0.35);
        mountAt(ctx, 1.0, 1.58, 0.35);
        mountAt(ctx, 0, 2.15, 0.75);
        let acc = 0;
        const anim = st => {
          acc -= st.dt || 0.016;
          if (acc > 0) return;
          acc = 0.06;
          const storm = !!(st.p && st.p.abOn);
          bolts.forEach((L, i) => {
            L.visible = storm || Math.random() < 0.35;
            if (L.visible) zig(L, [0, 3.25, -1.0], ends[i]);
          });
        };
        anim({ time: 0, dt: 1, p: null });
        return anim;
      },
    },

    /* ================= METEOR - meteor berenjin roket (DIVE) =================
       Nabil: "nampak macam hotdog, corong roket boleh nampak dalam". Badan
       kini oktagon berperisai hangus (bukan silinder licin bergelang), hidung
       = KERAK METEOR batu bergerigi dengan retakan lava menyala, sirip ekor
       besar, api masuk-atmosfera menjilat dari kerak ke belakang, dan loceng
       roket BERDINDING tebal (tidak lutsinar lagi) dengan api ekzos hidup. */
    capsule: {
      hull(b, G, HG, mats) {
        mats.rock = mats.rock || new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.95, metalness: 0.05, flatShading: true });
        mats.lava = mats.lava || glowMat('#ff5a14', 3.0);
        b.add('darker', G.box, [0, 0.55, -0.2], null, [1.5, 0.3, 3.6]);
        b.add('body', G.cyl8, [0, 1.08, -0.45], [PI / 2, PI / 8, 0], [1.6, 2.6, 1.6]);      // badan oktagon
        for (let i = 0; i < 8; i++) {                                                      // plat hangus + jahitan bara
          const a = i / 8 * TAU + PI / 8;
          b.add('darker', G.box, [Math.cos(a) * 0.74, 1.08 + Math.sin(a) * 0.74, -0.45], [0, 0, a + PI / 2], [0.5, 0.05, 2.4]);
          b.add('lava', G.box, [Math.cos(a + PI / 8) * 0.79, 1.08 + Math.sin(a + PI / 8) * 0.79, -0.2 + (i % 3) * 0.3], [0, 0, a], [0.03, 0.03, 0.9]);
        }
        // KERAK METEOR: gumpalan batu bergerigi menutup hidung, retakan lava di celah
        const ROCKS = [[0, 1.08, 1.25, 0.95], [0.45, 1.45, 1.0, 0.55], [-0.5, 1.4, 1.05, 0.6], [0.55, 0.75, 1.05, 0.55], [-0.5, 0.7, 1.0, 0.5],
          [0, 1.65, 0.75, 0.5], [0, 0.55, 0.85, 0.45], [0.3, 1.1, 1.6, 0.5], [-0.32, 1.0, 1.6, 0.45], [0.7, 1.15, 0.6, 0.4], [-0.7, 1.05, 0.65, 0.42], [0, 1.85, 0.2, 0.35]];
        ROCKS.forEach(([x, y, z, s], i) => b.add('rock', G.ico, [x, y, z], [i * 0.7, i * 1.3, i * 0.4], [s * 1.6, s * 1.4, s * 1.5]));
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU;
          b.add('lava', G.box, [Math.cos(a) * 0.55, 1.08 + Math.sin(a) * 0.55, 1.45 + (i % 2) * 0.2], [0, 0, a], [0.5, 0.04, 0.05]);
        }
        b.add('lava', G.ico, [0, 1.08, 1.98], null, [0.32, 0.32, 0.25]);
        // sirip ekor besar
        for (const a of [PI / 4, -PI / 4, PI * 3 / 4, -PI * 3 / 4]) {
          const cx = Math.sin(a), cy = Math.cos(a);
          b.add('body', G.box, [cx * 0.95, 1.08 + cy * 0.95, -1.45], [0, 0, -a], [0.06, 0.75, 0.9]);
          b.add('lava', G.box, [cx * 1.3, 1.08 + cy * 1.3, -1.55], [0, 0, -a], [0.07, 0.04, 0.6]);
        }
        // plat dorong + tiga enjin roket berdinding
        b.add('steel', G.cyl, [0, 1.08, -1.78], [PI / 2, 0, 0], [1.5, 0.1, 1.5]);
        for (const [x, y] of [[0, 1.4], [-0.4, 0.82], [0.4, 0.82]]) {
          b.add('dark', G.cyl, [x, y, -1.95], [PI / 2, 0, 0], [0.36, 0.3, 0.36]);
          b.add('steel', G.torus, [x, y, -2.06], null, [0.19, 0.19, 0.6]);
          b.add('steel', BELL2(), [x, y, -2.1], [PI / 2, 0, 0], [0.6, 0.75, 0.6]);
          b.add('hot', G.cyl, [x, y, -2.12], [PI / 2, 0, 0], [0.2, 0.03, 0.2]);        // teras dalam (pelapik gelap di belakang)
          b.add('darker', G.cyl, [x, y, -2.08], [PI / 2, 0, 0], [0.24, 0.02, 0.24]);
        }
        b.add('glass', G.box, [0, 1.75, -0.1], [-0.15, 0, 0], [0.7, 0.05, 0.5]);
      },
      limb(ctx) {
        const { root, G } = ctx;
        const ex = [], wisps = [];
        for (const [x, y] of [[0, 1.4], [-0.4, 0.82], [0.4, 0.82]]) ex.push(flame(root, G, x, y, -2.45, PI / 2, 0, '#ff7a2a', 0.85));
        // api masuk-atmosfera menjilat dari kerak ke belakang
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * TAU + 0.3;
          wisps.push(flame(root, G, Math.cos(a) * 0.82, 1.08 + Math.sin(a) * 0.82, 0.55, PI / 2 + 0.15, 0, '#ff5a14', 0.55));
        }
        mountAt(ctx, -0.48, 1.86, -0.75);
        mountAt(ctx, 0.48, 1.86, -0.75);
        mountAt(ctx, 0, 1.95, 0.2);
        const anim = st => {
          const sp = Math.abs(st.fwd || 0) / 30, dive = st.p && st.p.abOn ? 1 : 0;
          for (const F of ex) F.update(st.time, 0.5 + sp * 1.2 + dive);
          for (const F of wisps) F.update(st.time, 0.35 + sp * 0.9 + dive * 1.4);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null });
        return anim;
      },
    },

    /* ================= MIRAGE - jentera F1 ganas (DECOY) =================
       Nabil: "lut sinar oren nampak buruk, buat macam kereta F1 tapi ganas,
       2 thruster di belakang". Monokok sempit, hidung tirus, sayap hadapan
       berbilah, pod sisi bersalur, palang halo atas kokpit, sirip jerung,
       sayap belakang besar dan DUA PENDORONG JET dengan api hidup. Prisma
       pemancar bayang (Decoy) kini pejal, bukan hologram lutsinar. */
    hyper: {
      hull(b, G, HG, mats) {
        b.add('darker', G.box, [0, 0.4, -0.2], null, [0.95, 0.24, 4.2]);                 // lantai
        b.add('body', G.box, [0, 0.62, -0.1], null, [0.85, 0.42, 2.6]);                  // monokok
        b.add('body', G.cone, [0, 0.52, 1.95], [PI / 2, 0, 0], [0.7, 1.9, 0.45]);         // hidung tirus
        b.add('crys', G.box, [0, 0.76, 1.4], null, [0.05, 0.03, 1.5]);
        // sayap hadapan berbilah
        b.add('dark', G.box, [0, 0.24, 2.75], null, [2.3, 0.05, 0.5]);
        b.add('body', G.box, [0, 0.33, 2.62], [0.25, 0, 0], [2.1, 0.04, 0.3]);
        for (const sd of [-1, 1]) {
          b.add('dark', G.box, [sd * 1.15, 0.36, 2.72], null, [0.05, 0.36, 0.6]);       // plat hujung
          b.add('steel', G.cone, [sd * 1.15, 0.3, 3.1], [PI / 2, 0, 0], [0.08, 0.4, 0.08]);   // bilah tajam
          // pod sisi bersalur
          b.add('body', G.box, [sd * 0.66, 0.55, -0.35], [0, 0, sd * 0.08], [0.5, 0.42, 1.7]);
          b.add('darker', G.box, [sd * 0.66, 0.6, 0.52], null, [0.42, 0.28, 0.06]);       // mulut salur
          b.add('body', G.box, [sd * 0.66, 0.42, -1.3], [0.3, 0, 0], [0.48, 0.25, 0.6]);
          b.add('crys', HG.oct, [sd * 0.66, 0.92, -0.2], null, [0.16, 0.26, 0.16]);       // prisma pemancar bayang
          b.add('steel', G.box, [sd * 0.94, 0.48, -0.35], null, [0.03, 0.06, 1.5]);
          // ampaian (suspension) ke roda
          seg(b, 'dark', G.box, [sd * 0.45, 0.55, 1.35], [sd * 0.8, 0.45, 1.45], 0.05, 0.08);
          seg(b, 'dark', G.box, [sd * 0.45, 0.55, -1.45], [sd * 0.8, 0.45, -1.5], 0.05, 0.08);
          // sayap belakang: pylon
          seg(b, 'dark', G.box, [sd * 0.25, 0.75, -2.0], [sd * 0.3, 1.2, -2.25], 0.05, 0.12);
          b.add('dark', G.box, [sd * 0.98, 1.12, -2.3], null, [0.05, 0.5, 0.65]);
          b.add('crys', G.box, [sd * 1.0, 1.12, -2.3], null, [0.02, 0.4, 0.04]);
        }
        // kokpit + halo
        b.add('darker', G.box, [0, 0.86, 0.45], null, [0.55, 0.06, 0.85]);
        b.add('glass', G.sph, [0, 0.9, 0.35], null, [0.42, 0.34, 0.42]);                 // topi keledar
        b.add('steel', G.torus, [0, 0.95, 0.42], [PI / 2, 0, 0], [0.6, 0.85, 0.5]);
        seg(b, 'steel', G.cyl, [0, 1.25, 0.82], [0, 0.82, 1.05], 0.05);
        // penutup enjin + sirip jerung
        b.add('body', G.box, [0, 0.9, -0.95], [0.12, 0, 0], [0.62, 0.45, 1.4]);
        b.add('body', G.box, [0, 1.15, -1.55], null, [0.05, 0.55, 1.1]);
        b.add('crys', G.box, [0, 1.15, -1.55], null, [0.06, 0.04, 1.0]);
        // sayap belakang besar (DRS)
        b.add('body', G.box, [0, 1.2, -2.3], null, [1.95, 0.06, 0.5]);
        b.add('darker', G.box, [0, 1.38, -2.42], [0.35, 0, 0], [1.9, 0.04, 0.3]);
        // peresap belakang bersirip
        for (let i = -2; i <= 2; i++) b.add('dark', G.box, [i * 0.2, 0.32, -2.2], [0.35, 0, 0], [0.03, 0.18, 0.55]);
        // dua pendorong jet
        for (const sd of [-1, 1]) {
          b.add('dark', G.cyl, [sd * 0.34, 0.62, -2.25], [PI / 2, 0, 0], [0.42, 0.7, 0.42]);
          b.add('steel', G.torus, [sd * 0.34, 0.62, -2.6], null, [0.24, 0.24, 0.5]);
          b.add('hot', G.cyl, [sd * 0.34, 0.62, -2.58], [PI / 2, 0, 0], [0.3, 0.02, 0.3]);
          b.add('steel', G.cone, [sd * 0.34, 0.62, -1.75], [PI / 2, 0, 0], [0.44, 0.3, 0.44]);
        }
        b.add('head', G.box, [0, 0.42, 2.3], null, [0.5, 0.04, 0.06]);
        b.add('tail', G.box, [0, 0.95, -2.62], null, [0.5, 0.06, 0.04]);
      },
      limb(ctx) {
        const { root, G, sp } = ctx;
        const fl = [-1, 1].map(sd => flame(root, G, sd * 0.34, 0.62, -2.65, PI / 2, 0, sp.accent || '#ff5a3c', 0.8));
        mountAt(ctx, -0.66, 0.84, -0.6);
        mountAt(ctx, 0.66, 0.84, -0.6);
        mountAt(ctx, 0, 1.2, -0.75);
        const anim = st => {
          const f = 0.35 + Math.abs(st.fwd || 0) / 26 + (st.p && st.p.nitroOn ? 0.8 : 0);
          for (const F of fl) F.update(st.time, f);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null });
        return anim;
      },
    },

    /* ================= CRESCENT - bulan sabit terapung (ASSASSIN, 2026-10-19, idea Nabil) =================
       Pusingan 2 (Nabil: "nak MELINTANG macam Crystal"): bulan sabit RATA & NIPIS (0.3m)
       terapung mendatar - dilihat dari atas ia sabit, kedua-dua tanduk menghala ke HADAPAN
       seperti bilah. Tepi luar emas bercahaya, permata bulan di belakang, 2 senjata di atas
       lengkung. Gugusan bintang emas berkelip di belakang. Lunar Slash: muncung menunduk. */
    lunar: {
      hull(b, G, HG, mats) { },
      limb(ctx) {
        const { root, Builder, G, mats } = ctx;
        const gold = glowMat('#ffd27a', 2.4), white = glowMat('#fff4dc', 1.6);
        const S = 0.95, R = 2.6, r = 2.3, cy = 0.8, Y0 = 2.7, TH = 0.3;   // Y0 tinggi: separuh bawah sabit tegak mesti lepas tanah
        const outer = [], inner = [];
        const a0 = Math.atan2(1.319, 2.24), a1 = Math.PI - a0;
        for (let i = 0; i <= 40; i++) { const a = a0 - (TAU - (a1 - a0)) * i / 40; outer.push([Math.cos(a) * R, Math.sin(a) * R]); }
        const b0 = Math.atan2(0.519, -2.24), b1 = Math.atan2(0.519, 2.24) + TAU;
        for (let i = 0; i <= 40; i++) { const a = b0 + (b1 - b0) * i / 40; inner.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
        const sh = new THREE.Shape();
        sh.moveTo(outer[0][0] * S, outer[0][1] * S);
        for (const [x, y] of outer.slice(1)) sh.lineTo(x * S, y * S);
        for (const [x, y] of inner) sh.lineTo(x * S, y * S);
        sh.closePath();
        const geo = new THREE.ExtrudeGeometry(sh, { depth: TH, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2, curveSegments: 24 });
        geo.rotateX(PI / 2);                 // bentuk y -> +Z (tanduk ke hadapan), ketebalan ke bawah
        geo.translate(0, TH / 2, 0);
        geo.computeVertexNormals();
        const body = grp(root, 0, Y0, 0);
        // Nabil: 'terbalik' - perut lengkung di HADAPAN, tanduk ke BELAKANG
        const flip = grp(body); flip.rotation.y = PI;
        const moonM = new THREE.MeshStandardMaterial({ color: 0xf6f2e6, emissive: 0x6a5a38, emissiveIntensity: 0.35, metalness: 0.12, roughness: 0.32 });
        const moon = new THREE.Mesh(geo, moonM); moon.castShadow = true; flip.add(moon);
        const P3 = ([x, y], yy) => new THREE.Vector3(x * S, yy, y * S);
        flip.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer.map(q => P3(q, 0))), 90, 0.12, 6, false), gold));
        flip.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner.map(q => P3(q, 0))), 90, 0.05, 5, false), white));
        // jalur emas nipis di permukaan atas mengikut lengkung tengah
        const mid = outer.map(([x, y], i) => { const [ix, iy] = inner[40 - i]; return [(x + ix) / 2, (y + iy) / 2]; });
        flip.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mid.map(q => P3(q, TH / 2 + 0.07))), 80, 0.03, 4, false), gold));
        // hujung tanduk bercahaya
        for (const sx of [-1, 1]) {
          const tip = new THREE.Mesh(SPH(), white); tip.scale.setScalar(0.17);
          tip.position.set(sx * 2.24 * S, 0, 1.319 * S); flip.add(tip);
        }
        // CRESCENT KEDUA (Nabil, pusingan 3): SAMA SAIZ, TEGAK & BERSILANG di TENGAH badan -
        // menghadap ke hadapan sama seperti yang melintang (perut di hadapan, tanduk ke belakang).
        // Dari hadapan: melintang = garis mendatar, tegak = garis menegak -> bentuk '+'.
        // Peta bentuk: x -> Y (atas/bawah), y -> -Z (sama dgn melintang selepas flip), ketebalan pada X.
        const vgeo = new THREE.ExtrudeGeometry(sh, { depth: TH, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.08, bevelSegments: 2, curveSegments: 24 });
        vgeo.translate(0, 0, -TH / 2);
        vgeo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1));
        vgeo.computeVertexNormals();
        const fin = grp(body);
        const fm = new THREE.Mesh(vgeo, moonM); fm.castShadow = true; fin.add(fm);
        const PV = ([x, y]) => new THREE.Vector3(0, x * S, -y * S);
        fin.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer.map(PV)), 90, 0.11, 6, false), gold));
        fin.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner.map(PV)), 90, 0.05, 5, false), white));
        for (const sy of [-1, 1]) { const t2 = new THREE.Mesh(SPH(), white); t2.scale.setScalar(0.16); t2.position.copy(PV([sy * 2.24, 1.319])); fin.add(t2); }
        // permata di titik silang hadapan (perut kedua-dua sabit bertemu)
        const fgem = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), white); fgem.position.set(0, 0, R * S + 0.05); fgem.scale.set(0.8, 0.8, 0.5); fin.add(fgem);
        // 2 senjata di atas jalur sabit (dalam lingkungan badan)
        const pb = new Builder();
        for (const sx of [-1, 1]) pb.add('dark', G.cyl, [sx * 1.55 * S, TH / 2 + 0.04, -1.75 * S], null, [0.8, 0.08, 0.8]);
        pb.build({ dark: mats.dark }, flip);
        // lekap pada `body` (BUKAN flip yang dipusing 180 darjah) - kalau tidak senjata menghadap belakang
        for (const sx of [-1, 1]) mountAt(ctx, -sx * 1.55 * S, TH / 2 + 0.2, 1.75 * S, body);
        // cahaya terapung di bawah
        const glow = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.6, 32, 1, 0, PI * 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.rotation.x = -PI / 2; glow.position.set(0, 0.06, 0.4); root.add(glow);
        // GUGUSAN BINTANG di belakang
        const starShape = new THREE.Shape();
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + PI / 2, rr = i % 2 ? 0.42 : 1; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) starShape.lineTo(x, y); else starShape.moveTo(x, y); }
        starShape.closePath();
        const sg = new THREE.ExtrudeGeometry(starShape, { depth: 0.16, bevelEnabled: false }); sg.translate(0, 0, -0.08);
        /* Nabil (2026-10-19): bintang lebih BANYAK & MERATA di belakang - padat dekat sabit, makin jauh
           makin jarang & kecil (seperti ekor). Rawak bertitik benih supaya kad garaj sentiasa sama. */
        const starsG = grp(root, 0, Y0, -1.5);                // bermula betul-betul di belakang tanduk
        const stars = [];
        let seed = 7;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const SP = [];
        for (let i = 0; i < 26; i++) {
          const u = rnd(), d = 4.2 * Math.pow(u, 1.7);        // kuasa > 1 = lebih banyak dekat, jarang di hujung
          const spread = 1.5 + d * 0.35;
          SP.push([(rnd() * 2 - 1) * spread, (rnd() * 2 - 1) * spread * 0.75 + 0.2, -d, Math.max(0.07, 0.3 - d * 0.05 + rnd() * 0.06)]);
        }
        for (const [x, y, z, s2] of SP) {
          const m = new THREE.Mesh(sg, gold); m.position.set(x, y, z); m.scale.setScalar(s2);
          starsG.add(m); stars.push({ m, s: s2, ph: Math.random() * TAU, y });
        }
        /* EKZOS di 4 hujung tanduk (Nabil 2026-10-19): semua tanduk menghala ke BELAKANG, jadi api
           cahaya bulan keluar dari situ + jejak zarah yang tertinggal bila bergerak. */
        const HT = [[-2.24 * S, 0], [2.24 * S, 0], [0, -2.24 * S], [0, 2.24 * S]].map(([x, y]) => [x, y, -1.319 * S - 0.1]);
        const horns = HT.map(([x, y, z]) => flame(body, G, x, y, z, PI / 2, 0, '#ffd27a', 0.42));
        let trailT = 0;
        let lean = 0;
        const anim = st => {
          const dt = st.dt || 0.016, tm = st.time || 0, on = !!(st.p && st.p.lunar);
          const spd = Math.abs(st.fwd || 0);
          for (const F of horns) F.update(tm, 0.35 + spd / 26 + (st.p && st.p.nitroOn ? 0.7 : 0) + (on ? 0.9 : 0));
          trailT -= dt;
          if (st.p && st.g && st.g.fx && trailT <= 0 && (spd > 2 || on)) {
            trailT = 0.03;
            const P = st.p, c = Math.cos(P.ang), s2 = Math.sin(P.ang), by = (P.y || 0) + body.position.y;
            for (const [x, y, z] of HT) {
              const wx = P.x + x * c + (z - 0.4) * s2, wz = P.z - x * s2 + (z - 0.4) * c;
              st.g.fx.add.emit(wx, by + y, wz, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4,
                { color: [2.6, 2.1, 1.1], color2: [0.5, 0.4, 0.25], size: 0.32, size2: 0.03, life: 0.75, drag: 2.5 });
            }
          }
          lean = damp(lean, on ? 1 : 0, 6, dt);
          body.position.y = Y0 + Math.sin(tm * 1.6) * 0.1;                         // terapung
          body.rotation.x = Math.sin(tm * 1.1) * 0.03 + lean * 0.22;                  // muncung menunduk semasa slash
          body.rotation.z = -(st.steer || 0) * 0.18;                                 // condong ikut belok
          gold.emissiveIntensity = 2.2 + Math.sin(tm * 2.4) * 0.4 + lean * 2.5;
          starsG.rotation.z = Math.sin(tm * 0.5) * 0.08;          // ekor bintang beralun perlahan, tidak berpusing
          for (const S2 of stars) {
            S2.m.rotation.y = tm * 1.4 + S2.ph;
            S2.m.scale.setScalar(S2.s * (0.8 + 0.35 * Math.max(0, Math.sin(tm * 3 + S2.ph))));
            S2.m.position.y = S2.y + Math.sin(tm * 1.3 + S2.ph) * 0.12;
          }
          glow.material.opacity = 0.16 + Math.sin(tm * 1.6) * 0.05 + lean * 0.2;
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= CORE - pemegang matahari (SNIPER, 2026-10-19, idea Nabil) =================
       Badan PANJANG seperti laras sniper, terapung atas jet plasma. Di hadapan, tiga lengan
       cakar melengkung MEMEGANG matahari kecil: teras putih-kuning, korona berlapis yang
       berdenyut, jalur plasma berpusing dan gelung SOLAR FLARE yang muncul & surut sendiri.
       4 senjata sepanjang dek. Solar Guide: matahari membesar & menyala, cakar terbuka. */
    solarcore: {        // BUKAN "core" - nama itu dipakai untuk extra/bahan dalam models.js
      hull(b, G, HG, mats) { },
      limb(ctx) {
        const { root, G } = ctx;
        const Y0 = 1.55;
        const body = grp(root, 0, Y0, 0);
        const shell = new THREE.MeshStandardMaterial({ color: 0x2b2531, metalness: 0.55, roughness: 0.36 });
        const plate = new THREE.MeshStandardMaterial({ color: 0x55433a, metalness: 0.6, roughness: 0.3 });
        const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.85, roughness: 0.25, emissive: 0x3a2200, emissiveIntensity: 0.4 });
        const seam = glowMat('#ff9a2a', 2.2);
        const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, par = body) => {
          const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.castShadow = true; par.add(o); return o;
        };
        const BOX = new THREE.BoxGeometry(1, 1, 1);
        // badan: kapsul panjang dileperkan (laras sniper), dek atas, lunas bawah
        add(new THREE.CapsuleGeometry(0.62, 5.2, 6, 16), shell, 0, 0, -0.5, PI / 2, 0, 0, 1.3, 1, 0.66);
        add(BOX, plate, 0, 0.38, -0.6, 0, 0, 0, 1.05, 0.12, 4.7);
        for (const sx of [-1, 1]) add(BOX, seam, sx * 0.55, 0.4, -0.6, 0, 0, 0, 0.05, 0.05, 4.7);
        add(BOX, gold, 0, 0.47, -0.6, 0, 0, 0, 0.16, 0.08, 4.3);                       // tulang belakang emas
        add(BOX, shell, 0, -0.38, -0.5, 0, 0, 0, 0.5, 0.26, 5.0);                        // lunas
        for (const sx of [-1, 1]) add(BOX, seam, sx * 0.8, -0.05, -0.5, 0, 0, 0, 0.04, 0.05, 5.2);   // jalur sisi
        // belakang: sirip penstabil condong + ram pemancar haba + gelang pendorong
        for (const sx of [-1, 1]) add(BOX, plate, sx * 0.55, 0.62, -3.1, 0, 0, sx * -0.55, 0.08, 0.95, 1.2);
        for (let i = 0; i < 5; i++) add(BOX, i % 2 ? gold : plate, 0, -0.2 + i * 0.16, -3.85, 0, 0, 0, 1.15 - i * 0.12, 0.05, 0.4);
        add(new THREE.TorusGeometry(0.42, 0.07, 8, 20), gold, 0, 0, -3.62);
        add(new THREE.CircleGeometry(0.4, 20), seam, 0, 0, -3.66, 0, PI, 0);
        // leher hadapan
        add(new THREE.TorusGeometry(0.66, 0.1, 8, 24), gold, 0, 0.02, 2.55, 0, 0, 0, 1.25, 0.85, 1);
        add(new THREE.CylinderGeometry(0.5, 0.75, 0.5, 18), plate, 0, 0.02, 2.75, PI / 2, 0, 0, 1.2, 1, 0.8);

        // MATAHARI
        const SR = 0.92, sunPos = new THREE.Vector3(0, 0.5, 4.45);
        const sun = grp(body, sunPos.x, sunPos.y, sunPos.z);
        const coreM = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });
        sun.add(new THREE.Mesh(new THREE.SphereGeometry(SR, 28, 18), coreM));
        const add2 = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
        const corona = [[1.08, 0xffb030, 0.55], [1.3, 0xff7a10, 0.28], [1.7, 0xff5200, 0.12], [2.3, 0xff4000, 0.05]].map(([k, c, op]) => {
          const m = add2(c, op), o = new THREE.Mesh(new THREE.SphereGeometry(SR * k, 24, 14), m); sun.add(o); return { o, m, op, k };
        });
        // jalur plasma berpusing di permukaan
        const bands = [0.4, -0.7, 1.2].map((tilt, i) => {
          const o = new THREE.Mesh(new THREE.TorusGeometry(SR * 1.02, 0.035, 6, 48), add2(0xffd060, 0.7));
          const g2 = grp(sun); g2.rotation.set(tilt, i * 1.1, 0); g2.add(o); return g2;
        });
        // SOLAR FLARE: gelung plasma dari permukaan, muncul -> memuncak -> surut
        const flares = [];
        const dirs = [[0, 1, 0.2], [0.8, 0.5, 0.4], [-0.8, 0.45, 0.3], [0.3, -0.2, 1], [-0.4, 0.9, -0.3], [0.9, -0.3, -0.2], [-0.85, -0.35, 0.5]];
        dirs.forEach((dv, i) => {
          const H = 0.55 + (i % 3) * 0.28, w = 0.28 + (i % 2) * 0.14;
          const pts = [];
          for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(new THREE.Vector3(-w * Math.cos(PI * t), SR * 0.96 + H * Math.sin(PI * t), Math.sin(PI * t * 2) * 0.08)); }
          const m = add2(i % 2 ? 0xff9a20 : 0xffc040, 0.9);
          const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.055 + (i % 3) * 0.015, 6, false), m);
          const g2 = grp(sun);
          g2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dv).normalize());
          const spin = grp(g2); spin.rotation.y = i * 0.9; spin.add(mesh);
          flares.push({ g: spin, m, ph: i / dirs.length + Math.random() * 0.1, sp: 0.22 + (i % 3) * 0.07 });
        });
        // CAKAR: tiga lengan melengkung memegang matahari (kiri, kanan, atas)
        const arms = [];
        const armDef = [
          [-1, [[-0.62, 0.0, 2.35], [-1.45, 0.25, 3.05], [-1.62, 0.5, 4.2], [-1.2, 0.55, 5.15]]],
          [1, [[0.62, 0.0, 2.35], [1.45, 0.25, 3.05], [1.62, 0.5, 4.2], [1.2, 0.55, 5.15]]],
          [0, [[0, 0.42, 2.4], [0, 1.35, 3.1], [0, 1.68, 4.3], [0, 1.25, 5.1]]],
        ];
        for (const [side, P] of armDef) {
          const piv = grp(body, P[0][0], P[0][1], P[0][2]);
          const rel = P.map(([x, y, z]) => new THREE.Vector3(x - P[0][0], y - P[0][1], z - P[0][2]));
          const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rel), 30, 0.15, 8, false), gold); tube.castShadow = true; piv.add(tube);
          piv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rel.map(v => v.clone().add(new THREE.Vector3(0, side ? 0.13 : 0, side ? 0 : 0.0)))), 30, 0.04, 5, false), seam));
          // kuku di hujung menghala ke matahari
          const tip = rel[3], toSun = new THREE.Vector3(sunPos.x - P[3][0], sunPos.y - P[3][1], sunPos.z - P[3][2]).normalize();
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 8), plate);
          claw.position.copy(tip).addScaledVector(toSun, 0.2);
          claw.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toSun); piv.add(claw);
          const knuckle = new THREE.Mesh(SPH(), gold); knuckle.scale.setScalar(0.36); knuckle.position.copy(rel[1]); piv.add(knuckle);
          arms.push({ piv, side });
        }
        // 4 senjata sepanjang dek
        for (const z of [0.9, -1.5]) for (const sx of [-1, 1]) mountAt(ctx, sx * 0.55, 0.52, z, body);
        // jet plasma terapung di bawah + cahaya tanah memanjang
        const jets = [];
        for (const z of [1.7, -0.5, -2.7]) for (const sx of [-1, 1]) {
          add(new THREE.CylinderGeometry(0.22, 0.28, 0.2, 12), plate, sx * 0.55, -0.5, z);
          jets.push(flame(body, G, sx * 0.55, -0.6, z, 0, 0, '#ff8a2a', 0.7));
        }
        const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), add2(0xffa040, 0.22));
        glow.rotation.x = -PI / 2; glow.scale.set(1.6, 4.6, 1); glow.position.set(0, 0.06, 0.4); root.add(glow);
        let on = 0;
        const anim = st => {
          const dt = st.dt || 0.016, tm = st.time || 0, act = !!(st.p && st.p.coreBeam);
          on = damp(on, act ? 1 : 0, 5, dt);
          body.position.y = Y0 + Math.sin(tm * 1.3) * 0.07;
          body.rotation.z = -(st.steer || 0) * 0.08;
          body.rotation.x = Math.sin(tm * 0.9) * 0.015;
          sun.rotation.y = tm * 0.35;
          sun.scale.setScalar(1 + Math.sin(tm * 3.1) * 0.035 + on * 0.2);
          for (const C of corona) C.m.opacity = C.op * (1 + Math.sin(tm * 2.3 + C.k * 3) * 0.2 + on * 0.9);
          bands.forEach((g2, i) => { g2.rotation.z = tm * (0.6 + i * 0.25) * (i % 2 ? -1 : 1); });
          for (const F of flares) {
            const k = (tm * F.sp * (1 + on) + F.ph) % 1, s = Math.sin(PI * k);
            F.g.scale.set(0.6 + 0.4 * s, 0.25 + 0.95 * s * (1 + on * 0.4), 0.6 + 0.4 * s);
            F.m.opacity = 0.95 * Math.pow(s, 0.7);
          }
          for (const A of arms) {
            if (A.side) A.piv.rotation.y = -A.side * on * 0.16;
            else A.piv.rotation.x = -on * 0.16;
          }
          const f = 0.35 + Math.abs(st.fwd || 0) / 30 + (st.p && st.p.nitroOn ? 0.6 : 0);
          for (const J of jets) J.update(tm, f);
          glow.material.opacity = 0.18 + Math.sin(tm * 1.3) * 0.04 + on * 0.18;
        };
        anim({ time: 0.6, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= CORSAIR - tambahan (Nabil 2026-10-18) =================
       Badan asal models2 dikekalkan; BOOSTER ROKET di sisi luar setiap tayar
       belakang, dipegang pendakap ke garpu cadik. Muncung menghala ke BELAKANG. */
    corsair: {
      hull(b, G, HG, mats) {
        old.corsair.hull(b, G, HG, mats);
        for (const sd of [-1, 1]) {
          const x = sd * 3.05, y = 0.85;
          b.add('dark', G.box, [sd * 2.75, y, -1.55], null, [0.5, 0.16, 0.5]);                       // pendakap
          b.add('body', G.cyl, [x, y, -1.45], [PI / 2, 0, 0], [0.5, 1.6, 0.5]);
          b.add('steel', G.cone, [x, y, -0.4], [PI / 2, 0, 0], [0.5, 0.5, 0.5]);                    // kon hidung ke hadapan
          for (const z of [-0.95, -1.45, -1.95]) b.add('crys', G.torus, [x, y, z], null, [0.55, 0.55, 0.3]);
          b.add('dark', G.box, [x, y + 0.27, -1.5], null, [0.05, 0.12, 1.3]);                         // sirip
          b.add('dark', G.cyl, [x, y, -2.3], [PI / 2, 0, 0], [0.4, 0.12, 0.4]);
          b.add('steel', BELL2(), [x, y, -2.35], [PI / 2, 0, 0], [0.65, 0.65, 0.65]);               // loceng ke belakang
        }
      },
      limb(ctx) {
        const a = old.corsair.limb(ctx);
        const col = ctx.sp.accent || '#4ad8ff';
        const fl = [-1, 1].map(sd => flame(ctx.root, ctx.G, sd * 3.05, 0.85, -2.75, PI / 2, 0, col, 0.5));
        const anim = st => {
          if (a) a(st);
          const sp2 = Math.abs(st.fwd || 0), nit = st.p && st.p.nitroOn ? 1 : 0;
          for (const F of fl) F.update(st.time, st.p ? 0.3 + sp2 / 22 + nit * 0.8 : 0.05);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, steer: 0, p: null });
        return anim;
      },
    },

    /* ================= ATLANTIS - APC abyss (CONTROLLER) =================
       Pusingan 6 (Nabil, gambar rujukan APC PBB): bentuk APC SEBENAR - lambung
       bawah tegak, lambung atas bersegi condong ke dalam, hidung curam bersegi
       dengan DUA CERMIN besar berbingkai, sayap roda bersudut, pintu sisi,
       blok penglihatan, stesen senjata berperisai di bumbung. Kota Atlantis
       DIBUANG - hanya cirinya: jalur & duri emas, permata di bumbung.
       Seram: cermin jadi MATA bercelah aqua, taring di bawah cermin, rabung
       duri emas. Ombak sisi kini TIGA. Bateri 4 meriam ombak + trisula kekal. */
    leviathan: {
      hull(b, G, HG, mats) {
        mats.marble = mats.marble || new THREE.MeshStandardMaterial({ color: 0xeef2f5, roughness: 0.35, metalness: 0.05 });
        mats.wave = mats.wave || new THREE.MeshStandardMaterial({ color: 0x1a7fb8, emissive: 0x2ab8ff, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
        mats.aqua = mats.aqua || glowMat('#4ad8ff', 2.4);
        // ---- lambung APC ----
        b.add('darker', G.box, [0, 0.62, -0.2], null, [2.0, 0.3, 5.2]);
        b.add('body', PROFILE('atl_lo', [[-2.75, 0.75], [-2.75, 1.5], [1.6, 1.5], [2.55, 1.2], [2.75, 0.95], [2.5, 0.75]], 2.5), [0, 0, 0], null, [1, 1, 1]);   // lambung bawah tegak
        b.add('body', HG.frust, [0, 1.8, -0.75], null, [2.5, 0.62, 4.0]);              // lambung atas condong ke dalam
        b.add('body', G.box, [0, 2.13, -0.75], null, [1.95, 0.06, 3.85]);              // bumbung
        // hidung bersegi: panel cermin curam + bahu condong
        b.add('body', G.box, [0, 1.78, 1.62], [-0.95, 0, 0], [2.0, 0.12, 0.95]);
        for (const sd of [-1, 1]) b.add('body', G.box, [sd * 1.08, 1.72, 1.45], [-0.9, 0, -sd * 0.55], [0.5, 0.1, 0.9]);
        b.add('body', G.box, [0, 1.36, 2.15], [-0.5, 0, 0], [2.3, 0.1, 0.95]);          // glasis
        for (const sd of [-1, 1]) {
          // CERMIN = MATA: kaca gelap, bingkai, celah aqua sipit
          b.add('glass', G.box, [sd * 0.48, 1.8, 1.67], [-0.95, 0, 0], [0.78, 0.04, 0.6]);
          b.add('dark', G.box, [sd * 0.48, 1.81, 1.66], [-0.95, 0, 0], [0.86, 0.02, 0.68]);
          b.add('aqua', G.box, [sd * 0.5, 1.72, 1.76], [-0.95, 0, sd * 0.28], [0.6, 0.05, 0.06]);
          b.add('steel', G.box, [sd * 0.48, 2.1, 1.38], [0.2, 0, 0], [0.82, 0.05, 0.25]);   // pelindung cermin (kening)
          // sayap roda bersudut atas setiap roda
          for (const z of [1.55, 0.0, -1.55]) {
            b.add('dark', G.box, [sd * 1.28, 1.2, z], [0, 0, -sd * 0.35], [0.36, 0.1, 1.15]);
            b.add('dark', G.box, [sd * 1.36, 1.0, z + 0.55], [0.6, 0, 0], [0.24, 0.1, 0.35]);
            b.add('dark', G.box, [sd * 1.36, 1.0, z - 0.55], [-0.6, 0, 0], [0.24, 0.1, 0.35]);
          }
          // pintu sisi, blok penglihatan, jalur emas
          b.add('darker', G.box, [sd * 1.26, 1.25, -0.8], null, [0.03, 0.42, 0.9]);
          for (const z of [-1.9, -0.7, 0.5]) b.add('glass', G.box, [sd * 1.05, 1.95, z], [0, 0, -sd * 0.6], [0.04, 0.12, 0.32]);
          b.add('gold', G.box, [sd * 1.26, 1.47, -0.4], null, [0.03, 0.05, 4.4]);
          // TIGA ombak bergulung di sisi
          for (const [z0, k] of [[-2.95, 1.08], [-1.05, 0.8], [0.7, 0.56]]) {   // belakang besar -> depan kecil (Nabil)
            b.add('wave', WAVE_SIDE(), [sd * 1.4, 0.72, z0], null, [1, k, k]);
            for (const [u, v] of [[1.55, 1.13], [1.85, 1.24], [2.1, 1.22], [2.3, 1.08], [2.32, 0.9]])
              b.add('marble', G.sph, [sd * 1.36, 0.72 + v * k, z0 + u * k], null, [0.22 * k, 0.16 * k, 0.2 * k]);
          }
          // rabung duri emas di tepi bumbung (ciri kota)
          for (let i = 0; i < 6; i++) b.add('gold', G.cone, [sd * 0.98, 2.2, 0.9 - i * 0.68], [0, 0, -sd * 0.35], [0.1, 0.42, 0.1]);
          // pendorong jet air buritan
          b.add('dark', G.cyl, [sd * 0.65, 1.0, -2.75], [PI / 2, 0, 0], [0.62, 0.3, 0.62]);
          b.add('gold', G.torus, [sd * 0.65, 1.0, -2.92], null, [0.36, 0.36, 0.6]);
        }
        // taring di bawah cermin
        for (let i = -4; i <= 4; i++) b.add('marble', G.cone, [i * 0.22, 1.42, 2.05 + Math.abs(i) * -0.02], [PI - 0.5, 0, 0], [0.08, 0.3, 0.08]);
        b.add('darker', G.box, [0, 1.35, -2.77], null, [1.1, 0.8, 0.04]);                // pintu belakang
        // stesen senjata berperisai + permata (ciri kota) di bumbung
        b.add('dark', G.cyl, [0, 2.22, -0.3], null, [1.1, 0.14, 1.1]);
        b.add('gold', G.torus, [0, 2.24, -0.3], [PI / 2, 0, 0], [0.56, 0.56, 0.4]);
        b.add('crys', HG.oct, [0, 2.75, -1.55], null, [0.2, 0.55, 0.2]);
        b.add('gold', G.cyl, [0, 2.24, -1.55], null, [0.4, 0.1, 0.4]);
        // ---- BATERI MERIAM OMBAK di hadapan (kekal) ----
        b.add('dark', G.box, [0, 1.0, 2.75], null, [2.2, 0.42, 0.4]);
        for (const x of [-0.78, -0.26, 0.26, 0.78]) {
          b.add('steel', G.cyl, [x, 1.0, 3.15], [PI / 2, 0, 0], [0.26, 0.8, 0.26]);
          b.add('gold', G.cyl, [x, 1.0, 3.55], [PI / 2, 0, 0], [0.36, 0.14, 0.36]);
          b.add('gold', G.torus, [x, 1.0, 3.0], null, [0.18, 0.18, 0.4]);
          b.add('aqua', G.cyl, [x, 1.0, 3.63], [PI / 2, 0, 0], [0.24, 0.02, 0.24]);
        }
        seg(b, 'gold', G.cyl, [0, 0.62, 2.7], [0, 0.62, 3.95], 0.08);                   // trisula
        b.add('gold', G.box, [0, 0.62, 3.9], null, [0.65, 0.07, 0.09]);
        for (const x of [-0.3, 0, 0.3]) b.add('gold', G.cone, [x, 0.62, 4.15], [PI / 2, 0, 0], [0.1, x ? 0.4 : 0.52, 0.1]);
        lamps(b, G, [[-0.95, 1.2, 2.6], [0.95, 1.2, 2.6]], 0.11);
      },
      limb(ctx) {
        const { root, G, mats } = ctx;
        const imp = [];
        for (const sd of [-1, 1]) {
          const g = grp(root, sd * 0.65, 1.0, -2.95);
          for (let i = 0; i < 4; i++) {
            const bl = new THREE.Mesh(G.box, mats.steel);
            bl.scale.set(0.06, 0.5, 0.06); bl.rotation.z = i * PI / 4; g.add(bl);
          }
          imp.push(g);
        }
        const water = new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
        const jets = [-1, 1].map(sd => { const m = new THREE.Mesh(G.cone, water); m.rotation.x = -PI / 2; m.position.set(sd * 0.65, 1.0, -3.2); root.add(m); return m; });
        mountAt(ctx, -0.6, 2.22, 0.75);
        mountAt(ctx, 0.6, 2.22, 0.75);
        mountAt(ctx, 0, 2.32, -0.3);
        const anim = st => {
          const f = 0.4 + Math.abs(st.fwd || 0) / 25;
          for (const g of imp) g.rotation.z += (st.dt || 0.016) * (4 + f * 20);
          for (const m of jets) { const k = f * (0.9 + Math.sin(st.time * 30) * 0.1); m.scale.set(0.42, 0.6 + k, 0.42); m.position.z = -3.1 - k * 0.5; }
          if (mats.aqua) mats.aqua.emissiveIntensity = 2 + Math.sin(st.time * 4) * 0.8 + (st.p && st.p.abOn ? 2.5 : 0);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null });
        return anim;
      },
    },

    /* ================= REAPER - kala jengking penyedut (Siphon), pusingan 2 =================
       Nabil: bahagian kiri-kanan "macam booster roket" tapi tak nampak. Tangki
       kaca kecil di dalam badan diganti BOOSTER ROKET sebenar di luar sisi:
       silinder berbelang dengan gelang bercahaya, kon hidung, loceng muncung
       di belakang dan API yang membesar ikut laju. Selebihnya badan kekal. */
    scorpion: {
      hull(b, G, HG, mats) {
        b.add('darker', G.box, [0, 0.55, -0.1], null, [1.5, 0.28, 3.8]);
        const plates = [[1.15, 1.6, 0.5, 1.2], [0.05, 1.95, 0.62, 1.3], [-1.2, 1.65, 0.54, 1.1]];
        for (const [z, w, h, l] of plates) {
          b.add('body', G.rbox, [0, 0.88, z], null, [w, h, l]);
          b.add('dark', G.box, [0, 0.88 + h / 2 - 0.02, z - l / 2 + 0.06], [0.2, 0, 0], [w * 0.92, 0.06, 0.12]);
        }
        b.add('darker', G.rbox, [0, 0.78, 2.0], null, [1.1, 0.4, 0.6]);
        for (const sd of [-1, 1]) for (const k of [0, 1]) b.add('crys', G.sph, [sd * (0.18 + k * 0.2), 0.95 - k * 0.05, 2.3], null, [0.14, 0.14, 0.08]);
        for (const sd of [-1, 1]) {
          seg(b, 'body', G.rbox, [sd * 0.6, 0.8, 1.7], [sd * 1.15, 0.85, 2.4], 0.26, 0.3);
          b.add('body', G.sph, [sd * 1.2, 0.85, 2.55], null, [0.55, 0.42, 0.62]);
          b.add('steel', G.cone, [sd * 1.0, 0.86, 3.05], [PI / 2, 0, sd * 0.35], [0.18, 0.75, 0.16]);
          b.add('steel', G.cone, [sd * 1.38, 0.86, 3.0], [PI / 2, 0, -sd * 0.25], [0.16, 0.62, 0.14]);
          // BOOSTER ROKET sisi (atas roda, menghala ke belakang)
          const x = sd * 1.18, y = 1.42;
          b.add('dark', G.box, [sd * 0.92, 1.22, -0.45], [0, 0, sd * 0.5], [0.5, 0.12, 1.2]);   // pendakap ke badan
          b.add('body', G.cyl, [x, y, -0.5], [PI / 2, 0, 0], [0.62, 2.0, 0.62]);
          b.add('steel', G.cone, [x, y, 0.75], [PI / 2, 0, 0], [0.62, 0.55, 0.62]);              // kon hidung
          for (const z of [0.25, -0.35, -0.95]) b.add('crys', G.torus, [x, y, z], null, [0.66, 0.66, 0.3]);   // gelang bercahaya
          b.add('dark', G.box, [x, y + 0.32, -0.5], null, [0.06, 0.1, 1.8]);                     // sirip atas
          for (const a of [0.6, 2.5]) b.add('dark', G.box, [x + Math.cos(a) * sd * 0.36, y - Math.sin(a) * 0.1 - 0.12, -1.35], [0, 0, sd * a], [0.04, 0.4, 0.45]);   // sirip ekor
          b.add('dark', G.cyl, [x, y, -1.55], [PI / 2, 0, 0], [0.5, 0.15, 0.5]);                   // leher muncung
          b.add('steel', BELL2(), [x, y, -1.6], [PI / 2, 0, 0], [0.8, 0.8, 0.8]);            // loceng muncung menghala ke BELAKANG
        }
        const cy = 1.75, cz = -1.45, R = 1.05, N = 7;
        for (let i = 0; i <= N; i++) {
          const a = -0.75 + (i / N) * 3.0, s = 0.6 - i * 0.045;
          const p = [0, cy + Math.sin(a) * R, cz - Math.cos(a) * R];
          b.add('body', G.rbox, p, [-a, 0, 0], [s, s * 0.85, 0.44]);
          b.add('crys', G.box, [0, p[1] + Math.cos(a) * s * 0.42, p[2] + Math.sin(a) * s * 0.42], [-a, 0, 0], [0.06, 0.06, 0.3]);
        }
        const ea = 2.45;
        b.add('crys', G.sph, [0, cy + Math.sin(ea) * R, cz - Math.cos(ea) * R + 0.05], null, [0.3, 0.3, 0.3]);
        b.add('steel', G.cone, [0, cy + Math.sin(ea) * R - 0.18, cz - Math.cos(ea) * R + 0.3], [PI / 2 + 0.9, 0, 0], [0.2, 0.7, 0.2]);
        for (const x of [-0.5, 0.5]) b.add('tail', G.box, [x, 0.9, -1.8], null, [0.35, 0.1, 0.06]);
      },
      limb(ctx) {
        const { root, G, sp } = ctx;
        const col = sp.accent || '#ff5ad0';
        const fl = [-1, 1].map(sd => flame(root, G, sd * 1.18, 1.42, -2.05, PI / 2, 0, col, 0.6));
        const core = [-1, 1].map(sd => { const m = new THREE.Mesh(SPH(), new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(0.42, 0.42, 0.15); m.position.set(sd * 1.18, 1.42, -1.95); root.add(m); return m; });
        mountAt(ctx, 0, 1.24, 1.05);
        mountAt(ctx, -0.45, 1.3, -0.2);
        mountAt(ctx, 0.45, 1.3, -0.2);
        const anim = st => {
          const sp2 = Math.abs(st.fwd || 0), nit = st.p && st.p.nitroOn ? 1 : 0;
          const f = st.p ? 0.3 + sp2 / 22 + nit * 0.8 : 0.05;   // garaj: api padam
          for (const F of fl) F.update(st.time, f);
          for (const m of core) m.material.opacity = 0.55 + Math.sin(st.time * 20) * 0.15 + nit * 0.3;
          if (sp2 > 6 && Math.random() < 0.5) sparkAt(st, (Math.random() < 0.5 ? -1 : 1) * 1.18, 1.42, -2.3, [2.6, 0.7, 2.0], 1, 2);
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null });
        return anim;
      },
    },

    /* ================= FLY - jentera tebuan perang (GLASS CANNON) =================
       Pusingan 2 (Nabil: "makin nampak lalat, hodoh"). Tiada lagi bentuk bulat
       organik. Kini JENTERA TEBUAN bersudut: toraks berperisai bersegi dengan
       rabung bilah, kepala baji rendah dengan VISOR empat celah mata merah,
       dua sepit bilah sabit besar, laras jarum di dagu, perut heksagon
       bertingkat dengan salur toksik dan bilah sengat, sayap RANGKA LOGAM
       bertepi cahaya (dua pasang, menyapu ke belakang) yang berdengung. */
    housefly: {
      hull(b, G, HG, mats) {
        mats.eyeR = mats.eyeR || glowMat('#ff2a2a', 2.6);
        mats.wingD = mats.wingD || new THREE.MeshStandardMaterial({ color: 0x223040, transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0.5, side: THREE.DoubleSide, depthWrite: false });
        // toraks bersegi berperisai
        b.add('body', HG.oct, [0, 1.3, 0.15], null, [2.1, 1.5, 2.3]);
        b.add('darker', HG.frust, [0, 1.05, 0.15], null, [1.7, 0.5, 1.9]);
        for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, 1.98 - i * 0.04, 0.75 - i * 0.42], [-0.6, 0, 0], [0.06, 0.55 - i * 0.06, 0.4]);   // rabung bilah
        for (const sd of [-1, 1]) {
          b.add('dark', G.box, [sd * 0.78, 1.35, 0.15], [0, 0, sd * 0.55], [0.08, 0.9, 1.6]);       // plat sisi
          b.add('crys', G.box, [sd * 0.83, 1.35, 0.15], [0, 0, sd * 0.55], [0.02, 0.06, 1.3]);
        }
        // kepala baji rendah + visor celah mata
        b.add('darker', HG.oct, [0, 1.0, 1.7], null, [1.15, 0.75, 1.55]);
        b.add('dark', G.box, [0, 1.22, 1.55], [0.35, 0, 0], [1.2, 0.12, 0.9]);
        for (const sd of [-1, 1]) for (const k of [0, 1]) {
          b.add('eyeR', G.box, [sd * (0.2 + k * 0.28), 1.12 - k * 0.05, 1.98 - k * 0.12], [0, sd * 0.4, -sd * 0.25], [0.24, 0.05, 0.05]);   // mata celah merah
        }
        for (const sd of [-1, 1]) {
          // sepit bilah sabit
          b.add('steel', G.box, [sd * 0.42, 0.72, 2.3], [0, -sd * 0.5, 0], [0.08, 0.14, 0.9]);
          b.add('steel', G.box, [sd * 0.22, 0.72, 2.75], [0, sd * 0.6, 0], [0.07, 0.12, 0.55]);
          for (let k = 0; k < 3; k++) b.add('steel', G.cone, [sd * (0.38 - k * 0.07), 0.72, 2.2 + k * 0.2], [0, 0, sd * 1.5], [0.035, 0.16, 0.035]);
        }
        b.add('dark', G.cyl, [0, 0.82, 2.15], [PI / 2 - 0.25, 0, 0], [0.14, 1.0, 0.14]);     // laras jarum dagu
        b.add('crys', G.cone, [0, 0.7, 2.7], [PI / 2 - 0.25, 0, 0], [0.12, 0.3, 0.12]);
        // perut heksagon bertingkat + salur toksik
        for (let i = 0; i < 5; i++) {
          const z = -1.0 - i * 0.5, s = 1 - i * 0.12;
          b.add(i % 2 ? 'darker' : 'body', HG.hex, [0, 1.05 - i * 0.04, z], [PI / 2, 0, 0], [1.25 * s, 0.46, 1.0 * s]);
          b.add('crys', HG.hex, [0, 1.05 - i * 0.04, z - 0.24], [PI / 2, 0, 0], [1.3 * s, 0.04, 1.05 * s]);
          b.add('steel', G.cone, [0, 1.05 - i * 0.04 + 0.5 * s, z], [-0.5, 0, 0], [0.07, 0.3, 0.07]);
        }
        // bilah sengat
        b.add('steel', G.box, [0, 0.82, -3.55], [0.25, 0, 0], [0.08, 0.22, 1.2]);
        b.add('crys', G.box, [0, 0.84, -3.4], [0.25, 0, 0], [0.03, 0.08, 0.9]);
      },
      limb(ctx) {
        const { root, Builder, G, mats } = ctx;
        const wings = [];
        for (const sd of [-1, 1]) for (const [k, z, L, sw] of [[0, 0.45, 2.9, 0.35], [1, -0.25, 2.2, 0.6]]) {
          const w = grp(root, sd * 0.55, 2.0 - k * 0.08, z);
          const wb = new Builder();
          const tip = [sd * L, 0.15, -L * sw];
          seg(wb, 'steel', G.box, [0, 0, 0], tip, 0.06, 0.06);                                  // spar hadapan
          seg(wb, 'dark', G.box, [0, 0, -0.35], [tip[0] * 0.8, 0.1, tip[2] - 0.55], 0.04, 0.04); // spar belakang
          wb.add('wingD', G.box, [tip[0] * 0.48, 0.07, tip[2] * 0.5 - 0.3], [0, Math.atan2(-tip[2], Math.abs(tip[0])) * sd, 0], [L * 0.95, 0.02, 0.62]);
          seg(wb, 'crys', G.box, [0, 0.02, 0.02], tip, 0.025, 0.025);                           // tepi bercahaya
          wb.add('steel', G.cone, tip, [0, 0, -sd * PI / 2], [0.06, 0.3, 0.06]);
          wb.build({ wingD: mats.wingD, steel: mats.steel, dark: mats.dark, crys: mats.crys }, w);
          wings.push({ w, sd, k });
        }
        /* ENAM KAKI sendiri (Nabil: "kaki terapung tak bersambung") - pinggul
           tepat pada sisi toraks, femur naik keluar, tibia turun ke tanah,
           tarsus bercakar. Kaki generik legs6 dibuang (cars.js limbs 'none'). */
        const lm2 = { dark: mats.dark, steel: mats.steel, darker: mats.darker, crys: mats.crys };
        const flegs = [];
        let li = 0;
        for (const sd of [-1, 1]) for (const [hz, fz] of [[0.6, 1.4], [0.15, 0.25], [-0.3, -1.1]]) {
          const hip = grp(root, sd * 0.72, 1.05, hz);
          const K = [sd * 1.0, 0.7, (fz - hz) * 0.4], F = [sd * 1.75, -1.0, fz - hz];
          const lb = new Builder();
          lb.add('steel', G.sph, [0, 0, 0], null, [0.26, 0.26, 0.26]);
          seg(lb, 'darker', G.box, [0, 0, 0], K, 0.13, 0.18);                                    // femur
          lb.add('steel', G.sph, K, null, [0.2, 0.2, 0.2]);
          seg(lb, 'dark', G.box, K, F, 0.09, 0.12);                                              // tibia
          for (let k = 1; k < 3; k++) lb.add('steel', G.cone, [K[0] + (F[0] - K[0]) * k / 3, K[1] + (F[1] - K[1]) * k / 3 + 0.06, K[2] + (F[2] - K[2]) * k / 3], [0, 0, -sd * 0.6], [0.04, 0.16, 0.04]);   // duri tibia
          seg(lb, 'steel', G.cone, F, [F[0] + sd * 0.25, F[1] - 0.06, F[2] + 0.1], 0.06);          // cakar tarsus
          lb.build(lm2, hip);
          flegs.push({ hip, ph: li * 1.05 + (sd > 0 ? PI : 0) });
          li++;
        }
        mountAt(ctx, -0.55, 1.95, 0.6);
        mountAt(ctx, 0.55, 1.95, 0.6);
        mountAt(ctx, -0.6, 1.8, -0.35);
        mountAt(ctx, 0.6, 1.8, -0.35);
        mountAt(ctx, -0.42, 1.55, -1.35);
        mountAt(ctx, 0.42, 1.55, -1.35);
        const anim = st => {
          const air = st.p && (st.p.abOn || (st.p.y || 0) > 1);
          const amt = clamp(Math.abs(st.fwd || 0) / 12, 0, 1), d = (st.dist || 0) * 1.4;
          for (const L of flegs) { L.hip.rotation.y = Math.sin(d + L.ph) * 0.3 * amt; L.hip.rotation.z = Math.max(0, Math.sin(d + L.ph)) * 0.12 * amt * (L.hip.position.x > 0 ? 1 : -1); }
          for (const W of wings) {
            const buzz = air ? Math.sin(st.time * 60 + W.k * 1.5) * 0.5 : Math.sin(st.time * 16 + W.k) * 0.05;
            W.w.rotation.z = W.sd * (0.1 + buzz);
          }
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },

    /* ================= HALO - malaikat atas roda tunggal (SUPPORT) =================
       Sayap & roda DIKEKALKAN (Nabil: "sayap jangan kacau"). Badan tengah
       titis air dibuang - kini KESATRIA SERAPH: skirt plat emas bertingkat
       di atas garpu roda, dada bersegi dengan teras cahaya, pauldron emas,
       topi keledar dengan visor-T dan jambul. */
    halo: {
      hull(b, G, HG, mats) {
        b.add('dark', G.box, [0, 1.35, 0], null, [1.7, 0.36, 0.5]);                       // gandar
        for (const sd of [-1, 1]) b.add('dark', G.rbox, [sd * 0.62, 1.95, 0], null, [0.22, 1.4, 0.5]);   // garpu
        // (pusingan 2, Nabil: "badan besar sikit") skirt plat bertingkat
        b.add('body', G.cyl, [0, 2.5, 0], null, [1.6, 0.7, 1.35]);
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU;
          b.add(i % 2 ? 'gold' : 'body', G.box, [Math.sin(a) * 0.8, 2.3, Math.cos(a) * 0.68], [Math.cos(a) * 0.35, a, -Math.sin(a) * 0.35], [0.5, 0.85, 0.07]);
        }
        b.add('gold', G.torus, [0, 2.88, 0], [PI / 2, 0, 0], [1.65, 1.4, 0.45]);              // tali pinggang
        // dada bersegi + teras cahaya
        b.add('body', HG.oct, [0, 3.55, 0], null, [1.95, 2.0, 1.4]);
        b.add('gold', G.box, [0, 3.55, 0.56], [0.33, 0, 0], [0.1, 1.3, 0.12]);
        b.add('crys', HG.oct, [0, 3.6, 0.63], null, [0.4, 0.55, 0.22]);
        for (const sd of [-1, 1]) {
          b.add('gold', HG.hemi, [sd * 0.92, 4.0, 0], [0, 0, -sd * 0.5], [0.95, 0.65, 0.95]);   // pauldron
          b.add('steel', G.cone, [sd * 1.2, 4.25, 0], [0, 0, -sd * 0.8], [0.12, 0.45, 0.12]);
          b.add('body', G.box, [sd * 0.58, 3.25, 0.5], [0.3, 0, -sd * 0.3], [0.5, 0.62, 0.07]);
          b.add('dark', G.rbox, [sd * 1.05, 2.65, 0.1], null, [0.55, 0.45, 0.8]);           // pod bahu (senjata)
        }
        // topi keledar dengan visor-T + jambul
        b.add('steel', G.cyl, [0, 4.35, 0], null, [0.5, 0.28, 0.5]);
        b.add('body', G.sph, [0, 4.72, 0], null, [0.8, 0.9, 0.82]);
        b.add('crys', G.box, [0, 4.76, 0.4], null, [0.5, 0.07, 0.05]);
        b.add('crys', G.box, [0, 4.6, 0.4], null, [0.09, 0.3, 0.05]);
        b.add('gold', G.box, [0, 5.25, -0.12], [0.3, 0, 0], [0.08, 0.55, 0.9]);             // jambul
        for (const sd of [-1, 1]) b.add('gold', G.cone, [sd * 0.32, 5.2, 0.05], [0, 0, -sd * 0.4], [0.1, 0.42, 0.1]);
      },
      limb(ctx) { return old.halo.limb(ctx); },
    },

    /* ================= HYDRA - raksasa berkepala (FIREPOWER) =================
       Kepala ular dikekalkan. Nabil: "kaki depan terapung, bagi 4 kaki TEBAL".
       Kaki labah generik (legs8, dikongsi kereta lain) DIBUANG untuk Hydra
       sahaja (cars.js limbs: 'none'); kini empat kaki raksasa tebal berplat
       dengan lutut bersendi, kuku besar bercakar yang benar-benar mencecah
       tanah, dan langkah berat. */
    hydra: {
      hull(b, G, HG, mats) { old.hydra.hull(b, G, HG, mats); },
      limb(ctx) {
        const animHeads = old.hydra.limb(ctx);
        const { root, Builder, G, mats } = ctx;
        const lm = { body: mats.body, darker: mats.darker, steel: mats.steel, crys: mats.crys, dark: mats.dark };
        const legs = [];
        let i = 0;
        for (const sz of [1, -1]) for (const sd of [-1, 1]) {
          const hipP = [sd * 1.15, 1.3, sz > 0 ? 0.55 : -1.35];
          const hip = grp(root, ...hipP);
          const K = [sd * 0.95, 0.35, sz * 0.35], F = [sd * 1.25, -1.15, sz * 0.55];
          const lb = new Builder();
          lb.add('steel', G.sph, [0, 0, 0], null, [0.75, 0.75, 0.75]);                     // sendi pinggul
          seg(lb, 'body', G.rbox, [0, 0, 0], K, 0.62, 0.7);                                // paha tebal
          for (let k = 1; k < 3; k++) lb.add('darker', G.box, [K[0] * k / 3, K[1] * k / 3 + 0.3, K[2] * k / 3], [0, 0, -sd * 0.4], [0.5, 0.08, 0.6]);   // plat paha
          lb.add('steel', G.sph, K, null, [0.65, 0.65, 0.65]);                              // lutut
          lb.add('steel', G.cone, [K[0] + sd * 0.25, K[1] + 0.25, K[2]], [0, 0, -sd * 0.8], [0.14, 0.5, 0.14]);   // duri lutut
          seg(lb, 'darker', G.cyl, K, [K[0] + (F[0] - K[0]), F[1] + 0.25, F[2]], 0.5);      // betis tebal
          lb.add('body', G.cyl, [F[0], F[1] + 0.2, F[2]], null, [0.85, 0.32, 0.9]);         // kuku
          lb.add('dark', G.cyl, [F[0], F[1] + 0.02, F[2]], null, [0.95, 0.08, 1.0]);
          for (const t of [-0.5, 0, 0.5]) lb.add('steel', G.cone, [F[0] + Math.sin(t) * 0.42, F[1] + 0.06, F[2] + Math.cos(t) * 0.42 * sz], [PI / 2 * sz, t * sz, 0], [0.1, 0.32, 0.1]);   // cakar
          lb.add('crys', G.box, [K[0] + sd * 0.2, K[1] - 0.6, K[2]], null, [0.04, 0.5, 0.2]);
          lb.build(lm, hip);
          legs.push({ hip, ph: i * PI / 2 + (sz > 0 ? 0 : PI) });
          i++;
        }
        const anim = st => {
          if (animHeads) animHeads(st);
          const amt = clamp(Math.abs(st.fwd || 0) / 12, 0, 1), d = (st.dist || 0) * 0.9;
          for (const L of legs) { L.hip.rotation.x = Math.sin(d + L.ph) * 0.18 * amt; L.hip.position.y = 1.3 + Math.max(0, Math.sin(d + L.ph)) * 0.12 * amt; }
          if (st.p) st.p._bob = Math.abs(Math.sin(d)) * 0.06 * amt;
        };
        anim({ time: 0, dt: 0.016, fwd: 0, p: null, g: null });
        return anim;
      },
    },

    /* ================= MAMMOTH - binatang perang (TANK) =================
       Dram penggelek dikekalkan. Nabil: "nampak macam gajah baik, nak SATU
       BADAN nampak seram" (bukan kening berkerut). Kini binatang kepungan:
       belakang = perisai bersudut bertindih dengan rabung BILAH melengkung,
       kepala = topeng tengkorak besi dengan mata merah dalam soket gelap,
       gading BESI berperisai bergerigi + gading bawah, belalai = pelantak
       bersegmen berhujung kepala gada berduri, rantai tergantung, skirt
       perisai berduri, cerobong kembar membara. */
    mammoth: {
      hull(b, G, HG, mats) {
        mats.ivory = mats.ivory || new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.5, metalness: 0.1 });
        mats.eyeR = mats.eyeR || glowMat('#ff2a14', 3.2);
        b.add('darker', G.rbox, [0, 1.25, -0.2], null, [2.5, 0.6, 4.0]);
        // belakang: perisai bersudut bertindih
        for (let r = 0; r < 5; r++) {
          const z = 1.0 - r * 0.72, h = 2.75 - Math.abs(r - 1.6) * 0.12;
          b.add(r % 2 ? 'body' : 'dark', HG.frust, [0, h - 0.5, z], [0.12, 0, 0], [2.7 - Math.abs(r - 2) * 0.08, 1.15, 0.9]);
          b.add('steel', G.box, [0, h + 0.08, z - 0.38], [0.12, 0, 0], [1.9, 0.06, 0.06]);
        }
        // rabung bilah melengkung di tulang belakang
        for (let i = 0; i < 6; i++) b.add('steel', G.cone, [0, 3.2 - Math.abs(i - 2) * 0.06, 0.9 - i * 0.62], [-0.65, 0, 0], [0.12, 0.9 - Math.abs(i - 2) * 0.08, 0.4]);
        for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) b.add('steel', G.cone, [sd * 1.2, 2.55, 0.6 - i * 0.8], [0, 0, -sd * 1.0], [0.1, 0.55, 0.1]);   // duri sisi
        // skirt perisai berduri atas dram
        for (const sd of [-1, 1]) {
          b.add('dark', G.box, [sd * 1.42, 1.55, -0.3], [0, 0, sd * 0.2], [0.14, 0.8, 3.4]);
          for (let k = 0; k < 5; k++) b.add('steel', G.sph, [sd * 1.52, 1.75, -1.8 + k * 0.75], null, [0.12, 0.12, 0.12]);
          b.add('dark', G.box, [sd * 1.5, 1.4, 2.1], [0.3, 0, 0], [0.18, 0.8, 1.6]);       // yoke dram hadapan
          b.add('dark', G.box, [sd * 1.0, 1.0, -1.75], null, [0.6, 0.4, 0.5]);
        }
        /* KEPALA (pusingan 2, Nabil: "muka tak nampak ganas"): TENGKORAK SYAITAN
           besi - tengkorak bersudut, soket mata dalam dengan mata bara SIPIT
           condong (bentuk soket, bukan kening), rahang ternganga dengan barisan
           taring di bawah belalai, tulang pipi tajam, tanduk besar melengkung
           ke hadapan, jalur cat perang merah. */
        b.add('dark', HG.frust, [0, 2.55, 1.95], [0.25, 0, 0], [1.9, 1.4, 1.45]);
        b.add('steel', G.box, [0, 3.18, 2.2], [0.5, 0, 0], [1.6, 0.12, 1.0]);              // plat dahi
        b.add('eyeR', G.box, [0, 3.0, 2.55], [0.5, 0, 0], [0.12, 0.05, 0.5]);              // jalur cat perang
        b.add('darker', G.box, [0, 1.75, 2.45], [-0.35, 0, 0], [1.35, 0.3, 0.75]);         // rahang bawah ternganga
        b.add('eyeR', G.box, [0, 1.95, 2.55], [-0.2, 0, 0], [1.0, 0.18, 0.4]);             // tekak membara
        for (let i = -3; i <= 3; i++) {
          b.add('ivory', G.cone, [i * 0.17, 2.12, 2.82], [PI, 0, 0], [0.09, 0.32, 0.09]);   // taring atas
          b.add('ivory', G.cone, [i * 0.17 + 0.08, 1.82, 2.8], [-0.3, 0, 0], [0.08, 0.28, 0.08]);   // taring bawah
        }
        for (const sd of [-1, 1]) {
          // soket mata dalam & condong; mata bara sipit di dalamnya
          b.add('darker', G.box, [sd * 0.45, 2.62, 2.6], [0, sd * 0.15, sd * 0.35], [0.62, 0.3, 0.3]);
          b.add('eyeR', G.box, [sd * 0.45, 2.6, 2.74], [0, sd * 0.15, sd * 0.35], [0.42, 0.07, 0.05]);
          b.add('steel', G.cone, [sd * 0.92, 2.25, 2.35], [PI / 2, 0, -sd * 0.6], [0.16, 0.6, 0.16]);   // tulang pipi tajam
          // tanduk besar melengkung ke hadapan
          curve(b, 'steel', G.cyl, [sd * 0.6, 3.15, 1.85], [sd * 1.35, 3.85, 1.6], [sd * 1.25, 3.95, 2.55], 5, 0.18, 0.05);
          b.add('eyeR', G.box, [sd * 0.9, 2.95, 2.4], [0, 0, sd * 0.5], [0.05, 0.4, 0.04]);   // cat perang pipi
          // gading BESI berperisai          // gading BESI berperisai: panjang, melengkung, bergerigi
          curve(b, 'ivory', G.cyl, [sd * 0.6, 2.0, 2.45], [sd * 1.15, 0.8, 3.9], [sd * 1.0, 2.25, 4.7], 7, 0.36, 0.12);
          for (const u of [0.3, 0.6]) b.add('steel', G.torus, [sd * (0.6 + 0.5 * u), 2.0 - 1.0 * u, 2.45 + 1.4 * u], [0.6, 0, 0], [0.42 - u * 0.1, 0.42 - u * 0.1, 0.6]);
          for (let k = 0; k < 3; k++) b.add('steel', G.cone, [sd * (1.0 + k * 0.05), 1.0 + k * 0.38, 3.85 + k * 0.28], [0.3, 0, sd * 1.2], [0.07, 0.26, 0.07]);   // gerigi
          b.add('steel', G.cone, [sd * 1.0, 2.4, 4.75], [-0.2, 0, 0], [0.13, 0.35, 0.13]);  // hujung besi
          curve(b, 'ivory', G.cyl, [sd * 0.35, 1.75, 2.5], [sd * 0.5, 1.0, 3.2], [sd * 0.4, 1.2, 3.55], 4, 0.15, 0.06);   // gading bawah
          // rantai tergantung dari gading
          for (let k = 0; k < 4; k++) b.add('steel', G.torus, [sd * (0.8 - k * 0.18), 1.3 - Math.sin(k / 3 * PI) * 0.35, 3.3], [k % 2 ? PI / 2 : 0, 0, 0], [0.18, 0.24, 0.4]);
        }
        // BELALAI: pelantak bersegmen berhujung gada berduri
        for (let k = 0; k < 6; k++) b.add(k % 2 ? 'steel' : 'dark', G.cyl8, [0, 2.15 - k * 0.3, 2.75 + Math.sin(k * 0.5) * 0.3], [0.35, 0, 0], [0.46 - k * 0.03, 0.32, 0.46 - k * 0.03]);
        b.add('steel', G.sph, [0, 0.5, 3.05], null, [0.55, 0.5, 0.55]);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          b.add('steel', G.cone, [Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3, 3.05], [0, 0, a - PI / 2], [0.08, 0.3, 0.08]);
        }
        // cerobong kembar membara
        for (const sd of [-1, 1]) {
          b.add('dark', G.cyl, [sd * 0.55, 3.25, -1.85], [-0.25, 0, sd * 0.15], [0.3, 1.6, 0.3]);   // dipanjangkan ke bawah - dahulu terapung atas perisai
          b.add('steel', G.cyl, [sd * 0.5, 2.55, -1.7], null, [0.5, 0.12, 0.5]);
          b.add('hot', G.cyl, [sd * 0.6, 4.05, -2.05], [-0.25, 0, sd * 0.15], [0.24, 0.05, 0.24]);
        }
        b.add('steel', G.torus, [0, 1.2, -2.65], null, [0.6, 0.6, 0.8]);                  // cangkuk rantai
        b.add('dark', G.box, [0, 0.95, 2.1], null, [2.9, 0.2, 0.3]);
      },
      limb(ctx) {
        const n0 = ctx.turrets.length;
        const a = old.mammoth.limb(ctx);
        // tapak senjata asal terapung atas perisai bersudut - beri TIANG penyokong ke perisai
        const pb = new ctx.Builder();
        for (const t of ctx.turrets.slice(n0)) {
          const { x, y, z } = t.position;
          pb.add('dark', ctx.G.cyl, [x, (y + 2.45) / 2 - 0.1, z], null, [0.45, y - 2.45, 0.45]);
          pb.add('steel', ctx.G.cyl, [x, 2.5, z], null, [0.8, 0.14, 0.8]);
          pb.add('steel', ctx.G.cone, [x, (y + 2.45) / 2, z - 0.3], [-0.5, 0, 0], [0.08, 0.35, 0.08]);
        }
        pb.build({ dark: ctx.mats.dark, steel: ctx.mats.steel }, ctx.root);
        return a;
      },
    },

    /* ================= HOPPER - pemburu fros (FIGHTER) =================
       Nabil: "tukar pakai tayar; bila tekan ability tayar simpan, kaki
       deploy untuk lompat, baru seram". Kereta perisai rendah & lebar dengan
       kepala rahang ganas (gigi ais, mata celah), EMPAT RODA besar. Dua kaki
       belakang besar TERLIPAT rapat di sisi. Spring Leap: roda TERTARIK masuk
       ke badan, kaki MENGEMBANG ke tanah dan melontar kereta; selepas
       mendarat kaki terlipat semula dan roda turun. */
    hopper: {
      hull(b, G, HG, mats) {
        mats.ice = mats.ice || new THREE.MeshStandardMaterial({ color: 0x9fdcf0, emissive: 0x3aa8d8, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85, flatShading: true });
        b.add('darker', G.box, [0, 0.7, -0.1], null, [2.0, 0.35, 4.0]);
        b.add('body', G.rbox, [0, 1.12, -0.35], null, [2.35, 0.62, 3.1]);                 // badan rendah lebar
        b.add('body', G.box, [0, 1.42, -0.5], [0.08, 0, 0], [1.9, 0.18, 2.4]);
        // kepala rahang lebar & rata
        b.add('body', G.rbox, [0, 1.05, 1.55], [0.1, 0, 0], [2.3, 0.55, 1.3]);
        b.add('darker', G.box, [0, 0.72, 1.95], [-0.15, 0, 0], [2.2, 0.28, 0.9]);          // rahang bawah
        b.add('ice', G.box, [0, 0.86, 2.35], null, [1.9, 0.12, 0.08]);                      // tekak bercahaya
        for (let i = -6; i <= 6; i++) {
          b.add('ice', G.cone, [i * 0.15, 0.96, 2.38], [PI, 0, 0], [0.07, 0.24, 0.07]);      // gigi ais atas
          if (i % 2 === 0) b.add('ice', G.cone, [i * 0.15 + 0.07, 0.74, 2.36], null, [0.06, 0.2, 0.06]);
        }
        for (const sd of [-1, 1]) {
          // rabung mata bersudut + mata celah (bukan mata kartun)
          b.add('dark', G.box, [sd * 0.65, 1.45, 1.75], [0.25, sd * 0.3, -sd * 0.15], [0.7, 0.22, 0.5]);
          b.add('crys', G.box, [sd * 0.65, 1.42, 2.02], [0, sd * 0.3, -sd * 0.15], [0.45, 0.05, 0.04]);
          b.add('ice', G.cone, [sd * 0.95, 1.55, 1.3], [-0.5, 0, -sd * 0.7], [0.14, 0.55, 0.14]);   // tanduk ais
          // spatbor roda
          b.add('dark', G.box, [sd * 1.2, 1.32, 1.2], [0, 0, sd * 0.15], [0.5, 0.1, 1.3]);
          b.add('dark', G.box, [sd * 1.2, 1.32, -1.25], [0, 0, sd * 0.15], [0.5, 0.1, 1.3]);
          // ruang kaki terlipat di sisi belakang
          b.add('darker', G.box, [sd * 1.1, 1.0, -0.8], null, [0.15, 0.5, 1.6]);
        }
        // hablur ais tajam di belakang
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * 0.38;
          b.add('ice', HG.oct, [x, 1.7 - Math.abs(x) * 0.2, -0.9 - Math.abs(x) * 0.3], [0.3, i, 0.2], [0.3, 0.75 - Math.abs(x) * 0.2, 0.3]);
        }
      },
      limb(ctx) {
        const { root, Builder, G, mats, wheels } = ctx;
        const lm = { body: mats.body, dark: mats.dark, steel: mats.steel, crys: mats.crys, ice: mats.ice };
        const R = 0.55;
        const wh = [];
        for (const [z, front] of [[1.2, true], [-1.25, false]]) for (const sd of [-1, 1]) {
          const holder = grp(root, sd * 1.2, R, z), spin = grp(holder);
          const t = ctx.tyre(); t.scale.setScalar(R / 0.46); spin.add(t);
          wheels.push({ holder, spin, front });
          wh.push({ holder, sd });
        }
        /* EMPAT kaki (pusingan 3, Nabil: "lipat elok-elok ke badan"). Pose
           REHAT = terlipat: paha mendatar rapat pada sisi badan, betis terlipat
           balik di atas paha, tapak tersorok. DEPLOY (Spring Leap) = paha
           berayun turun dan betis membuka sehingga tapak mencecah tanah. Sudut
           deploy dikira supaya tapak berakhir tepat di aras tanah. */
        const legs = [];
        const mkLeg = (sd, hz, K, F, toe, dHip, dKnee, front) => {
          const hip = grp(root, sd * 1.32, 1.15, hz);
          const s = front ? 0.82 : 1;
          const hb = new Builder();
          hb.add('steel', G.sph, [0, 0, 0], null, [0.46 * s, 0.46 * s, 0.46 * s]);
          seg(hb, 'body', G.rbox, [0, 0, 0], K, 0.42 * s, 0.5 * s);                          // paha
          for (let k = 1; k < 5; k++) hb.add('steel', G.torus, [K[0] * k / 5, K[1] * k / 5, K[2] * k / 5], null, [0.36 * s, 0.36 * s, 0.4]);   // spring
          hb.build(lm, hip);
          const knee = grp(hip, ...K);
          const kb = new Builder();
          kb.add('steel', G.sph, [0, 0, 0], null, [0.36 * s, 0.36 * s, 0.36 * s]);
          seg(kb, 'dark', G.cyl, [0, 0, 0], F, 0.2 * s);                                    // betis
          seg(kb, 'dark', G.rbox, F, [F[0], F[1], F[2] + toe], 0.34 * s, 0.12);             // tapak
          for (const t of [-0.35, 0, 0.35]) kb.add('ice', G.cone, [F[0] + Math.sin(t) * 0.26, F[1], F[2] + toe + Math.sign(toe) * 0.1], [PI / 2 * Math.sign(toe), t, 0], [0.07, 0.26, 0.07]);   // cakar ais
          kb.build(lm, knee);
          legs.push({ hip, knee, dHip, dKnee, sd });
        };
        for (const sd of [-1, 1]) {
          // belakang: paha ke belakang, betis terlipat ke hadapan
          mkLeg(sd, -0.25, [0, 0.05, -1.2], [sd * 0.14, 0.12, 1.0], 0.55, -0.6, 1.2, false);
          // depan: paha ke hadapan, betis terlipat ke belakang
          mkLeg(sd, 1.0, [0, 0.05, 0.95], [sd * 0.12, 0.1, -0.8], -0.45, 0.65, -1.65, true);
        }
        mountAt(ctx, 0, 1.6, -0.6);
        mountAt(ctx, -0.8, 1.52, 0.3);
        mountAt(ctx, 0.8, 1.52, 0.3);
        let k = 0, stay = 0, bounce = 0;
        const anim = st => {
          const dt = st.dt || 0.016, hop = st.p && st.p.hop;
          if (hop) stay = 4; else stay = Math.max(0, stay - dt);
          const want = window.__hopK !== undefined ? window.__hopK : (hop || stay > 0 ? 1 : 0);
          k = window.__hopK !== undefined ? want : damp(k, want, want ? 14 : 5, dt);
          let h = 0;
          if (hop) { const u = clamp(hop.t / hop.dur, 0, 1); h = Math.sin(u * PI) * 5.5; }
          else if (k > 0.5) { bounce += dt * (3 + Math.abs(st.fwd || 0) * 0.35); h = Math.abs(Math.sin(bounce)) * 0.45 * k; }   // melantun atas kaki
          for (const W of wh) { W.holder.position.y = R + k * 0.55; W.holder.scale.setScalar(1 - k * 0.35); W.holder.position.x = W.sd * (1.2 - k * 0.35); }
          for (const L of legs) { L.hip.rotation.x = L.dHip * k; L.knee.rotation.x = L.dKnee * k; }
          if (st.p) st.p._bob = h + k * 0.25; else root.position.y = k * 0.25;
        };
        anim({ time: 0, dt: 0.016, p: null });
        return anim;
      },
    },
  };
  decorate(R);
  decorate2(R);
  return R;
}
void SCY;

/* HIASAN "GERUN" (2026-10-18, Nabil: "hias sikit kereta-kereta baru, bagi nampak gerun").
   Ditambah SELEPAS hull asal setiap kereta - bentuk asas tidak berubah. */
const DECOR = {
  // E-G300: Nabil - "tak perlu, dah cantik" (tiada hiasan tambahan)
  auger(b, G, HG, mats) {
    mats.redL = mats.redL || glowMat('#ff2a14', 3);
    // rahang penghancur batu di kiri & kanan gerudi
    for (const sd of [-1, 1]) {
      seg(b, 'steel', G.box, [sd * 0.95, 1.0, 2.0], [sd * 0.6, 0.75, 3.2], 0.12, 0.4);
      for (let k = 0; k < 4; k++) b.add('steel', G.cone, [sd * (0.88 - k * 0.09), 0.85 - k * 0.03, 2.2 + k * 0.28], [0, 0, sd * 1.4], [0.06, 0.25, 0.06]);
      b.add('redL', G.box, [sd * 0.55, 1.8, 1.95], [0, 0, -sd * 0.3], [0.3, 0.05, 0.03]);   // mata merah
      // skirt berduri di atas skru
      b.add('dark', G.box, [sd * 1.42, 1.48, -0.35], null, [0.7, 0.06, 4.0]);
      for (let i = 0; i < 7; i++) b.add('steel', G.cone, [sd * 1.78, 1.45, -2.0 + i * 0.6], [0, 0, -sd * PI / 2], [0.08, 0.3, 0.08]);
    }
    for (let i = 0; i < 5; i++) b.add('steel', G.cone, [0, 2.0 + Math.abs(i - 2) * -0.03, 0.9 - i * 0.55], [-0.5, 0, 0], [0.1, 0.45, 0.2]);   // rabung bilah atas badan
  },
};
function decorate(R) {
  for (const k in DECOR) {
    if (!R[k]) continue;
    const h = R[k].hull;
    R[k].hull = (b, G, HG, mats) => { h(b, G, HG, mats); DECOR[k](b, G, HG, mats); };
  }
}

/* ======================================================================
   NAIK TARAF "GANAS" (2026-10-18, Nabil: "design buruk, nampak baik jaa -
   bagi lagi ganas, wow, gila cool"). Masalahnya PENDEKATAN, bukan butiran:
   versi pertama ialah primitif kemas berwarna rata tanpa cahaya atau gerakan.
   Lapisan ini menambah bahagian BERCAHAYA, bahagian BERGERAK dan ZARAH hidup
   pada empat kereta, di atas badan asal (hull + limb dibungkus).
   ====================================================================== */
const sparkAt = (st, x, y, z, col, n = 1, sp = 4) => {
  if (!st.p || !st.g || !st.g.fx) return;
  const p = st.p, c = Math.cos(p.ang), s = Math.sin(p.ang);
  const wx = p.x + x * c + z * s, wz = p.z - x * s + z * c, wy = (p.y || 0) + (p._bob || 0) + y;
  for (let i = 0; i < n; i++) st.g.fx.add.emit(wx, wy, wz, (Math.random() - 0.5) * sp, Math.random() * sp * 0.6, (Math.random() - 0.5) * sp,
    { color: col, color2: [col[0] * 0.3, col[1] * 0.3, col[2] * 0.3], size: 0.3, size2: 0.04, life: 0.4, drag: 1.5 });
};
const EXTRA = {
  /* ---------- AUGER: jentera lombong lava ---------- */
  auger: {
    hull(b, G, HG, mats) {
      mats.lava = mats.lava || glowMat('#ff4a10', 3.2);
      // karapas berperisai bertindih atas badan, retakan magma di celah
      for (let i = 0; i < 4; i++) {
        const z = 1.0 - i * 0.85;
        b.add('dark', HG.frust, [0, 1.98 - i * 0.03, z], [0.12, 0, 0], [2.3 - i * 0.08, 0.32, 0.95]);
        b.add('lava', G.box, [0, 2.1 - i * 0.03, z - 0.47], [0.12, 0, 0], [1.7 - i * 0.08, 0.05, 0.05]);
        for (const sd of [-1, 1]) b.add('steel', G.cone, [sd * (1.0 - i * 0.04), 2.25, z], [0, 0, -sd * 0.7], [0.12, 0.5, 0.12]);
      }
      for (const sd of [-1, 1]) {
        for (let k = 0; k < 4; k++) b.add('lava', G.box, [sd * 1.12, 1.5, 0.9 - k * 0.7], [0, 0, sd * 0.1], [0.03, 0.35, 0.08]);   // salur magma sisi
        b.add('lava', G.box, [sd * 0.6, 1.25, 2.43], [0, 0, -sd * 0.35], [0.4, 0.07, 0.04]);   // mata membara
        // gelang gergaji di pangkal gerudi
      }
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; b.add('steel', G.cone, [Math.cos(a) * 0.9, 1.25 + Math.sin(a) * 0.9, 2.45], [PI / 2, 0, 0], [0.1, 0.3, 0.1]); }
    },
    limb(ctx) {
      const { root, Builder, G, mats } = ctx;
      // dua gerudi kecil berputar di sisi gerudi utama
      const minis = [];
      for (const sd of [-1, 1]) {
        const g = grp(root, sd * 1.05, 0.95, 2.3);
        const mb = new Builder();
        mb.add('steel', G.cone, [0, 0, 0.55], [PI / 2, 0, 0], [0.5, 1.1, 0.5]);
        mb.add('lava', G.torus, [0, 0, 0.05], null, [0.28, 0.28, 0.4]);
        mb.build({ steel: mats.steel, lava: mats.lava }, g);
        minis.push({ g, sd });
      }
      const tip = new THREE.Mesh(SPH(), mats.lava); tip.scale.setScalar(0.32); tip.position.set(0, 1.25, 4.5); root.add(tip);   // hujung gerudi merah membara
      const fl = [-1, 1].map(sd => flame(root, G, sd * 0.6, 2.98, -1.7, PI, 0, '#ff6a1a', 0.7));   // api cerobong ke atas
      return st => {
        const sp = Math.abs(st.fwd || 0);
        for (const m of minis) m.g.rotation.z += (st.dt || 0.016) * (6 + sp) * m.sd;
        mats.lava.emissiveIntensity = 2.6 + Math.sin(st.time * 5) * 0.6 + sp * 0.03;
        for (const F of fl) F.update(st.time, 0.5 + sp / 25);
        if (sp > 4 && Math.random() < 0.5) sparkAt(st, (Math.random() - 0.5) * 1.6, 0.9, 4.2, [2.6, 1.2, 0.3], 1, 7);   // percikan gerudi
      };
    },
  },
};
function decorate2(R) {
  for (const k in EXTRA) {
    if (!R[k]) continue;
    const h = R[k].hull, l = R[k].limb, X = EXTRA[k];
    R[k].hull = (b, G, HG, mats) => { h(b, G, HG, mats); X.hull(b, G, HG, mats); };
    R[k].limb = ctx => {
      const a = l(ctx), c = X.limb(ctx);
      const both = st => { if (a) a(st); if (c) c(st); };
      both({ time: 0, dt: 0.016, fwd: 0, p: null, g: null });
      return both;
    };
  }
}

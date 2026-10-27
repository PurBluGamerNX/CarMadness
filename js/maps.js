// maps.js — peta mod pasukan (Team Deathmatch & Beacon Rush), 2026-10-17.
// Nabil minta 3 peta baharu: satu PANJANG (pangkalan jauh), satu BESAR, satu
// ada JAMBATAN atas asid (masuk asid = kereta kena damage).
//
// Setiap peta: size (sisi arena segi empat, menetapkan HALF), theme, bases,
// spawns (TDM, 3 setiap pasukan), beacons (Beacon Rush, 5), lanes (lorong bot),
// waypoint(e, tx, tz) pilihan untuk navigasi bot, dan pembina visual + perlanggaran.
// Peta "valley" asal dibina dalam world.js (buildValley); yang lain di sini.
import * as THREE from 'three';
import { MATS } from './models.js';
import { rand, TAU, PI } from './core.js';

const mirrorSpawns = A => ({ A, B: A.map(s => ({ ...s, z: -s.z })) });

export const MAPS = {
  valley: {
    name: 'Dead Valley', size: 240, theme: 'warzone',
    desc: 'Three lanes split by rock ridges, a walled plaza in the middle.',
    bases: { A: { x: 0, z: -106 }, B: { x: 0, z: 106 } },
    spawns: mirrorSpawns([{ id: 'tA', name: 'A', x: 70, z: -100 }, { id: 'tB', name: 'B', x: 0, z: -106 }, { id: 'tC', name: 'C', x: -70, z: -100 }]),
    beacons: [
      { id: 'A', name: 'ALPHA', x: -72, z: -52 }, { id: 'B', name: 'BRAVO', x: 72, z: -52 },
      { id: 'C', name: 'CHARLIE', x: 0, z: 0 },
      { id: 'D', name: 'DELTA', x: -72, z: 52 }, { id: 'E', name: 'ECHO', x: 72, z: 52 },
    ],
    lanes: [-70, 0, 70, -70, 70],
    /* rabung batu di x=±38 (|z|<38) hanya ada celah di tengah */
    waypoint(e, tx, tz) {
      for (const s of [-1, 1]) {
        const rx = s * 38;
        const cross = (e.x - rx) * (tx - rx) < 0;
        if (cross && Math.abs(e.z) < 40 && Math.abs(tz) < 40 + 30) {
          const gaps = [-45, 0, 45];
          let gz = gaps[0], gd = 1e9;
          for (const z of gaps) { const d = Math.abs(z - e.z) + Math.abs(z - tz) * 0.5; if (d < gd) { gd = d; gz = z; } }
          if (Math.abs(e.x - rx) > 4) return { x: rx + Math.sign(e.x - rx) * 3, z: gz };
        }
      }
      return null;
    },
  },

  /* LONG CANYON - koridor sempit 92m x 400m antara dua tebing. Pangkalan di
     hujung-hujung yang SANGAT jauh; litupan bersusun sepanjang jalan supaya
     ada pertempuran berperingkat, bukan satu padang terbuka. */
  canyon: {
    name: 'Long Canyon', size: 400, theme: 'wasteland',
    desc: 'A long, narrow canyon. The enemy base is far away at the other end - fight your way down.',
    bases: { A: { x: 0, z: -182 }, B: { x: 0, z: 182 } },
    spawns: mirrorSpawns([{ id: 'tA', name: 'A', x: 26, z: -176 }, { id: 'tB', name: 'B', x: 0, z: -184 }, { id: 'tC', name: 'C', x: -26, z: -176 }]),
    beacons: [
      { id: 'A', name: 'ALPHA', x: 0, z: -112 }, { id: 'B', name: 'BRAVO', x: -26, z: -56 },
      { id: 'C', name: 'CHARLIE', x: 0, z: 0 },
      { id: 'D', name: 'DELTA', x: 26, z: 56 }, { id: 'E', name: 'ECHO', x: 0, z: 112 },
    ],
    lanes: [-24, 0, 24, -24, 24],
    walls: 46,       // separuh lebar koridor (tebing)
  },

  /* OPEN EXPANSE - arena BESAR 340m: lima mesa batu gergasi, kawah berdinding
     di tengah, dan kelompok litupan bertaburan. Banyak ruang untuk mengapit. */
  expanse: {
    name: 'Open Expanse', size: 340, theme: 'warzone',
    desc: 'A huge open battlefield with rock mesas and a walled crater in the middle. Room to flank.',
    bases: { A: { x: 0, z: -152 }, B: { x: 0, z: 152 } },
    spawns: mirrorSpawns([{ id: 'tA', name: 'A', x: 80, z: -142 }, { id: 'tB', name: 'B', x: 0, z: -152 }, { id: 'tC', name: 'C', x: -80, z: -142 }]),
    beacons: [
      { id: 'A', name: 'ALPHA', x: -100, z: -70 }, { id: 'B', name: 'BRAVO', x: 100, z: -70 },
      { id: 'C', name: 'CHARLIE', x: 0, z: 0 },
      { id: 'D', name: 'DELTA', x: -100, z: 70 }, { id: 'E', name: 'ECHO', x: 100, z: 70 },
    ],
    lanes: [-95, 0, 95, -95, 95],
  },

  /* ACID BRIDGES - sungai ASID merentasi tengah peta; hanya TIGA jambatan
     untuk menyeberang. Kereta dalam asid kena damage setiap saat (pemain DAN
     bot). Dua kolam asid di lorong tengah memaksa pilihan laluan. */
  acid: {
    name: 'Acid Bridges', size: 260, theme: 'alien',
    desc: 'A river of acid cuts the map in half. Cross on one of three bridges - driving into the acid burns your car.',
    bases: { A: { x: 0, z: -116 }, B: { x: 0, z: 116 } },
    spawns: mirrorSpawns([{ id: 'tA', name: 'A', x: 62, z: -110 }, { id: 'tB', name: 'B', x: 0, z: -118 }, { id: 'tC', name: 'C', x: -62, z: -110 }]),
    beacons: [
      { id: 'A', name: 'ALPHA', x: -78, z: -55 }, { id: 'B', name: 'BRAVO', x: 78, z: -55 },
      { id: 'C', name: 'CHARLIE', x: 0, z: 0 },               // tepat di atas jambatan tengah
      { id: 'D', name: 'DELTA', x: -78, z: 55 }, { id: 'E', name: 'ECHO', x: 78, z: 55 },
    ],
    lanes: [-76, 0, 76, -76, 76],
    river: 13,                                               // separuh lebar sungai (|z| < river)
    bridges: [-76, 0, 76], bridgeW: 6.5,                     // pusat x jambatan, separuh lebar
    pools: [{ x: 0, z: -58, r: 13 }, { x: 0, z: 58, r: 13 }],
    acidDps: 0.12,                                           // pecahan HP maksimum sesaat (~8s untuk musnah)
    inAcid(x, z) {
      if (Math.abs(z) < this.river) {
        for (const bx of this.bridges) if (Math.abs(x - bx) < this.bridgeW) return false;
        return true;
      }
      for (const p of this.pools) if (Math.hypot(x - p.x, z - p.z) < p.r) return true;
      return false;
    },
    waypoint(e, tx, tz) {
      const R = this.river, side = Math.sign(e.z) || -1;
      // menyeberang sungai -> ke jambatan terdekat
      if (Math.sign(tz) !== side && Math.abs(tz) > 1) {
        let bx = this.bridges[0], bd = 1e9;
        for (const x of this.bridges) { const d = Math.abs(x - e.x) + Math.abs(x - tx) * 0.6; if (d < bd) { bd = d; bx = x; } }
        if (Math.abs(e.x - bx) > this.bridgeW - 2.5) return { x: bx, z: side * (R + 7) };
        return { x: bx, z: -side * (R + 9) };
      }
      // elak kolam asid di lorong tengah
      for (const p of this.pools) {
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        const dt = Math.hypot(tx - p.x, tz - p.z);
        if (d < p.r + 16 && dt > p.r && Math.abs(tz - p.z) + Math.abs(e.z - p.z) > Math.abs(tz - e.z) - 1 && Math.abs(e.x - p.x) < p.r + 4) {
          const sx = Math.sign(e.x - p.x) || (Math.sign(tx - p.x) || 1);
          return { x: p.x + sx * (p.r + 8), z: p.z + Math.sign(tz - e.z) * 2 };
        }
      }
      return null;
    },
    /* peta mini: sungai, jambatan dan kolam */
    mini(sx, sy, k) {
      const H = this.size / 2;
      let s = `<rect x="0" y="${sy(this.river)}" width="${(2 * H * k).toFixed(1)}" height="${(2 * this.river * k).toFixed(1)}" class="mm-acid"/>`;
      for (const p of this.pools) s += `<circle cx="${sx(p.x)}" cy="${sy(p.z)}" r="${(p.r * k).toFixed(1)}" class="mm-acid"/>`;
      for (const bx of this.bridges) s += `<rect x="${sx(bx + this.bridgeW)}" y="${sy(this.river + 2)}" width="${(2 * this.bridgeW * k).toFixed(1)}" height="${(2 * (this.river + 2) * k).toFixed(1)}" class="mm-bridge"/>`;
      return s;
    },
  },

  /* CONVOY PASS (2026-10-18, mod Cargo Escort sahaja) - Nabil: jalan TIDAK
     lurus, peta menyenget ke kiri ~45 darjah, panjang, dan LUAS di beberapa
     bahagian. Satu laluan berliku dari sudut selatan-kanan ke utara-kiri
     (dilihat dari belakang kereta), dibina atas lengkung Catmull-Rom.
     Lebar koridor berubah: ~20m di leher sempit, ~44m di tiga dataran. */
  convoy: {
    name: 'Convoy Pass', size: 400, theme: 'wasteland', escortOnly: true,
    desc: 'A long winding pass that bends up and to the left, narrow necks between three wide plazas.',
    cp: [[-160, -170], [-128, -128], [-84, -104], [-50, -56], [-8, -30], [28, 10], [46, 58], [88, 94], [130, 120], [160, 166]],
    plazas: [0.27, 0.53, 0.79],
    bases: { A: { x: -160, z: -170 }, B: { x: 160, z: 166 } },
    spawns: { A: [], B: [] },
    beacons: [],
    lanes: [0, 0, 0, 0, 0],
    /* laluan disampel setiap ~2m: pts[i] = {x, z, dx, dz, s} */
    path() {
      if (this._path) return this._path;
      const curve = new THREE.CatmullRomCurve3(this.cp.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
      const L0 = curve.getLength(), N = Math.ceil(L0 / 2);
      const raw = curve.getSpacedPoints(N);
      const pts = [];
      let s = 0;
      for (let i = 0; i <= N; i++) {
        const a = raw[Math.max(0, i - 1)], b = raw[Math.min(N, i + 1)];
        const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        if (i > 0) s += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z);
        pts.push({ x: raw[i].x, z: raw[i].z, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l, s });
      }
      const L = s, me = this;
      this._path = {
        pts, L,
        /* separuh lebar koridor pada jarak s */
        half(s2) {
          let w = 21;
          for (const f of me.plazas) w += 23 * Math.exp(-(((s2 - f * L) / 30) ** 2));
          w += 9 * Math.exp(-((s2 / 26) ** 2)) + 9 * Math.exp(-(((s2 - L) / 26) ** 2));   // pangkalan hujung lebih luas
          return w;
        },
        at(s2) {
          s2 = Math.max(0, Math.min(L, s2));
          let lo = 0, hi = pts.length - 1;
          while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s2) lo = m; else hi = m; }
          const A = pts[lo], B = pts[hi], t = B.s > A.s ? (s2 - A.s) / (B.s - A.s) : 0;
          const dx = A.dx + (B.dx - A.dx) * t, dz = A.dz + (B.dz - A.dz) * t, l = Math.hypot(dx, dz) || 1;
          return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, dx: dx / l, dz: dz / l, s: s2 };
        },
        /* titik pada jarak s, dianjak ke sisi (lat +: kanan arah perjalanan) */
        pos(s2, lat) {
          const P = this.at(s2);
          return { x: P.x - P.dz * lat, z: P.z + P.dx * lat, dx: P.dx, dz: P.dz };
        },
        /* unjuran titik ke laluan: { s, lat, d } */
        project(x, z) {
          let bi = 0, bd = 1e18;
          for (let i = 0; i < pts.length; i += 2) { const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
          for (let i = Math.max(0, bi - 2); i <= Math.min(pts.length - 1, bi + 2); i++) { const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
          const P = pts[bi], rx = x - P.x, rz = z - P.z;
          const along = rx * P.dx + rz * P.dz;
          return { s: Math.max(0, Math.min(L, P.s + along)), lat: -rx * P.dz + rz * P.dx, d: Math.sqrt(bd) };
        },
      };
      return this._path;
    },
    /* navigasi bot: ikut lengkung laluan bila sasaran jauh di sepanjang jalan */
    waypoint(e, tx, tz) {
      const P = this.path();
      const a = P.project(e.x, e.z), b = P.project(tx, tz);
      const ds = b.s - a.s;
      if (Math.abs(ds) < 14) return null;
      const s2 = a.s + Math.sign(ds) * 16, lim = P.half(s2) - 7;
      return P.pos(s2, Math.max(-lim, Math.min(lim, a.lat * 0.7)));
    },
    hpSpot(sLead) {
      const P = this.path();
      return P.pos(Math.min(P.L - 10, sLead + 28), rand(-10, 10));
    },
    /* peta mini: jalan berliku */
    mini(sx, sy, k) {
      const P = this.path();
      let d = '';
      for (let i = 0; i < P.pts.length; i += 3) d += `${sx(P.pts[i].x)},${sy(P.pts[i].z)} `;
      return `<polyline points="${d}" fill="none" stroke="rgba(255,190,90,.35)" stroke-width="${Math.max(3, 18 * k).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    },
  },
};
// peta untuk pemilih & 'random' - Convoy Pass khas untuk Cargo Escort, tidak termasuk
export const MAP_ORDER = ['valley', 'canyon', 'expanse', 'acid'];

/* ======================= pembina visual & perlanggaran ======================= */
function kit(world) {
  const o = new THREE.Object3D();
  const col = (x, z, r, h, type = 'wall') => world.props.push({ x, z, r, mesh: null, idx: -1, explosive: false, hp: 999, type, alive: true, h });
  const add = m => { world.scene.add(m); world.objs.push(m); return m; };
  /* PRESTASI (diukur atas OPPO 2026-10-18): satu InstancedMesh untuk SELURUH peta
     dilukis sepenuhnya walaupun hanya secebis kelihatan. Kini dipecah kepada
     kelompok grid 60m, setiap satu dengan sfera sempadan sendiri - kelompok di
     luar pandangan kamera (dan kamera bayang) dipangkas. */
  const chunks = list => {
    const M = new Map();
    for (const it of list) { const k = Math.floor(it.x / 60) + ',' + Math.floor(it.z / 60); if (!M.has(k)) M.set(k, []); M.get(k).push(it); }
    return [...M.values()];
  };
  /* kotak berinstans: senarai {x,z,w,d,h,ry,y} */
  const boxes = (list, mat) => {
    if (!list.length) return;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (const part of chunks(list)) {
      const m = new THREE.InstancedMesh(geo, mat, part.length);
      m.castShadow = true; m.receiveShadow = true;
      part.forEach((b, i) => {
        o.position.set(b.x, (b.y || 0) + b.h / 2, b.z); o.rotation.set(0, b.ry || 0, 0); o.scale.set(b.w, b.h, b.d);
        o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      });
      m.computeBoundingSphere();
      add(m);
    }
  };
  /* batu: senarai {x,z,s,h} */
  const rocks = (list, color, shadow = true) => {
    if (!list.length) return;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mt = shadow ? new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
      : new THREE.MeshLambertMaterial({ color, flatShading: true });   // prestasi: batu sempadan murah
    for (const part of chunks(list)) {
      const m = new THREE.InstancedMesh(geo, mt, part.length);
      m.castShadow = shadow; m.receiveShadow = shadow;
      part.forEach((r, i) => {
        o.position.set(r.x, r.h * 0.42, r.z); o.rotation.set(r.z * 0.3, r.z + r.x, r.x * 0.1); o.scale.set(r.s, r.h * 0.62, r.s * (r.sz || 1.2));
        o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      });
      m.computeBoundingSphere();
      add(m);
    }
  };
  /* dinding pendek dengan bulatan perlanggaran sepanjangnya */
  const wall = (list, x, z, len, ry = 0, h = 2.6) => {
    list.push({ x, z, w: len, d: 1.3, h, ry });
    const n = Math.max(1, Math.round(len / 2.8));
    for (let i = 0; i < n; i++) {
      const t = (i / Math.max(1, n - 1) - 0.5) * (len - 1.6);
      col(x + Math.cos(ry) * t, z - Math.sin(ry) * t, 1.6, h);
    }
  };
  const cont = (list, x, z, ry = 0) => {
    list.push({ x, z, w: 6.5, d: 2.6, h: 2.8, ry });
    for (const t of [-2, 2]) col(x + Math.cos(ry) * t, z - Math.sin(ry) * t, 1.7, 2.8);
  };
  return { o, col, add, boxes, rocks, wall, cont };
}

export function buildMap(world, id) {
  const M = MAPS[id];
  if (id === 'canyon') buildCanyon(world, M);
  else if (id === 'expanse') buildExpanse(world, M);
  else if (id === 'acid') buildAcid(world, M);
  else if (id === 'convoy') buildConvoy(world, M);
}

/* CONVOY PASS: tebing dua lapis mengikut lengkung, jalan konvoi bercat,
   litupan di tepi jalan (BUKAN atas jalan - trak lalu di tengah) dan
   kelompok litupan di tiga dataran. */
function buildConvoy(world, M) {
  const K = kit(world), P = M.path(), L = P.L;
  const cliffs = [], outer = [], walls = [], conts = [], pillars = [];
  const clear = (x, z, pad) => {
    const q = P.project(x, z);
    return q.d >= P.half(q.s) + pad;
  };
  // tebing kiri & kanan mengikut lengkung
  /* prestasi telefon: perlanggaran kekal setiap 4.2m (tiada celah), tetapi batu
     VISUAL hanya setiap sampel kedua (lebih besar) dan lapisan luar setiap ketiga */
  let n = 0;
  for (let s = -4; s <= L + 4; s += 4.2, n++) {
    const h0 = P.half(Math.max(0, Math.min(L, s)));
    for (const sd of [-1, 1]) {
      const q = P.pos(s, sd * (h0 + 3.2));
      if (!clear(q.x, q.z, 2.4)) continue;
      const h = 10 + Math.abs(Math.sin(s * 0.09 + sd)) * 9;
      if (n % 2 === 0) cliffs.push({ x: q.x, z: q.z, s: 6.4, h });
      K.col(q.x, q.z, 4.3, h, 'rock');
      const q2 = P.pos(s + 2, sd * (h0 + 10.5));
      if (n % 3 === 0 && clear(q2.x, q2.z, 6)) outer.push({ x: q2.x, z: q2.z, s: 8.5, h: h + 7 });
    }
  }
  // penutup hujung: separuh bulatan batu di belakang pangkalan
  for (const [s0, back] of [[0, -1], [L, 1]]) {
    const C = P.at(s0), h0 = P.half(s0) + 3.2;
    const base = Math.atan2(C.dx * back, C.dz * back);
    for (let i = 0; i <= 16; i++) {
      const a = base - PI / 2 + i / 16 * PI;
      const x = C.x + Math.sin(a) * h0, z = C.z + Math.cos(a) * h0;
      if (i % 2 === 0) cliffs.push({ x, z, s: 6.2, h: 14 });
      K.col(x, z, 4.3, 14, 'rock');
    }
  }
  // gunung jauh di luar koridor (visual sahaja) supaya tanah kosong tidak kelihatan
  for (let i = 0; i < 40; i++) {                      // (prestasi telefon: 70 -> 40)
    const x = rand(-195, 195), z = rand(-195, 195);
    if (!clear(x, z, 26)) continue;
    outer.push({ x, z, s: rand(7, 13), h: rand(16, 30) });
  }
  // litupan sepanjang jalan, berselang kiri/kanan, dijauhkan dari jalan trak
  let side = 1;
  for (let s = 30; s < L - 25; s += 26) {
    side = -side;
    const hw = P.half(s), lat = side * Math.min(hw - 5, 10 + (s * 7) % 6);
    const q = P.pos(s, lat), ry = Math.atan2(-q.dz, q.dx);
    if ((s / 26 | 0) % 3 === 0) K.cont(conts, q.x, q.z, ry);
    else K.wall(walls, q.x, q.z, 7, ry);
  }
  // dataran: tiang batu + kelompok kontena + dinding di kedua-dua sisi jalan
  for (const f of M.plazas) {
    const s = f * L, hw = P.half(s);
    for (const sd of [-1, 1]) {
      const a = P.pos(s - 10, sd * (hw * 0.55)), b = P.pos(s + 12, sd * (hw * 0.62));
      pillars.push({ x: a.x, z: a.z, s: 3.2, h: 7 }); K.col(a.x, a.z, 3.0, 7, 'rock');
      K.cont(conts, b.x, b.z, Math.atan2(-b.dz, b.dx) + PI / 2);
      const c = P.pos(s + 2, sd * 13);
      K.wall(walls, c.x, c.z, 8, Math.atan2(-c.dz, c.dx));
    }
  }
  // JALAN KONVOI: reben gelap 10m mengikut laluan + garis tengah putus-putus
  const pos = [], idx = [], dash = [];
  P.pts.forEach((p0, i) => {
    for (const sd of [-1, 1]) pos.push(p0.x - p0.dz * 5 * sd, 0.035, p0.z + p0.dx * 5 * sd);
    if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    if (i % 4 === 0) dash.push({ x: p0.x, z: p0.z, w: 0.35, d: 3.2, h: 0.02, y: 0.045, ry: Math.atan2(p0.dx, p0.dz) });
  });
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setIndex(idx); rg.computeVertexNormals();
  const road = K.add(new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 0.95, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
  road.receiveShadow = true;
  // kotak berinstans memakai ry sebagai putaran Y; garis tengah
  K.boxes(dash, new THREE.MeshStandardMaterial({ color: 0xffb23f, emissive: 0x7a4a00, emissiveIntensity: 0.7, roughness: 0.6 }));
  /* prestasi (diukur atas OPPO: Escort 44 FPS / 92 sentakan per 20s, kesesakan GPU):
     tebing & gunung jauh tanpa bayang dan bahan Lambert yang lebih murah */
  K.rocks(cliffs, 0x7a5d42, false);
  K.rocks(outer, 0x6a5038, false);
  K.rocks(pillars, 0x5e4c3a);
  K.boxes(walls, MATS.concrete.clone());
  K.boxes(conts, new THREE.MeshStandardMaterial({ color: 0x7a3a22, roughness: 0.7, metalness: 0.4 }));
}


function buildCanyon(world, M) {
  const K = kit(world), H = M.size / 2, W = M.walls;
  const cliffs = [], walls = [], conts = [], pillars = [];
  // tebing kiri & kanan sepanjang koridor (tinggi, berlapis dua)
  for (const sx of [-1, 1]) {
    for (let z = -H + 2; z <= H - 2; z += 5) {
      const x = sx * (W + 3 + Math.sin(z * 0.07) * 2.5);
      const h = 9 + Math.abs(Math.sin(z * 0.13)) * 9;
      cliffs.push({ x, z, s: 4.6, h });
      cliffs.push({ x: x + sx * 6, z: z + 2.5, s: 6, h: h + 6 });
      K.col(x, z, 4.2, h, 'rock');
    }
  }
  // litupan berperingkat sepanjang koridor (dicerminkan supaya adil)
  for (const sz of [-1, 1]) {
    for (const [x, z, len, ry] of [[-18, 150, 10, 0], [20, 135, 8, 0], [0, 90, 12, 0], [-30, 78, 8, PI / 2], [30, 30, 8, PI / 2], [-12, 22, 9, 0.3]]) {
      K.wall(walls, x, sz * z, len, ry * sz);
    }
    for (const [x, z, ry] of [[32, 120, 0.4], [-34, 100, -0.3], [8, 64, 1.2], [-20, 40, 0.1]]) K.cont(conts, x, sz * z, ry);
    for (const [x, z] of [[-14, 120], [16, 82], [-24, 8]]) {
      pillars.push({ x, z: sz * z, s: 3.2, h: 7 });
      K.col(x, sz * z, 3.0, 7, 'rock');
    }
  }
  // gerbang tengah: dua penghadang membentuk lorong di CHARLIE
  for (const sx of [-1, 1]) K.wall(walls, sx * 14, 0, 8, PI / 2);
  K.rocks(cliffs, 0x6b5844);
  K.rocks(pillars, 0x5e4c3a);
  K.boxes(walls, MATS.concrete.clone());
  K.boxes(conts, new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7, metalness: 0.4 }));
}

function buildExpanse(world, M) {
  const K = kit(world);
  const mesas = [], walls = [], conts = [], rocks = [];
  // lima mesa gergasi
  for (const [x, z, s] of [[-55, -40, 9], [60, 35, 10], [-62, 55, 8], [52, -58, 8.5], [0, -95, 7], [0, 95, 7]]) {
    mesas.push({ x, z, s, h: 14, sz: 1 });
    K.col(x, z, s * 0.92, 14, 'rock');
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 0.5;
      rocks.push({ x: x + Math.cos(a) * s * 1.2, z: z + Math.sin(a) * s * 1.2, s: 2.2, h: 3 });
      K.col(x + Math.cos(a) * s * 1.2, z + Math.sin(a) * s * 1.2, 2.1, 3, 'rock');
    }
  }
  // kawah berdinding di tengah (empat lengkok dengan empat pintu masuk)
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + PI / 8;
    if (i % 2) continue;
    for (const da of [-0.22, 0, 0.22]) {
      const aa = a + da;
      K.wall(walls, Math.cos(aa) * 26, Math.sin(aa) * 26, 6, -aa + PI / 2);
    }
  }
  // kelompok litupan bertaburan, dicerminkan
  for (const sz of [-1, 1]) {
    for (const [x, z, ry] of [[-120, 30, 0.3], [125, 40, -0.4], [-95, 110, 1.2], [100, 115, 0.2], [-30, 125, 0.1], [35, 60, 1.4]]) K.cont(conts, x, sz * z, ry * sz);
    for (const [x, z, len, ry] of [[-130, 90, 10, 0], [130, 95, 10, 0], [-80, 140, 12, 0], [80, 140, 12, 0], [0, 128, 14, 0], [-100, 0, 10, PI / 2], [100, 0, 10, PI / 2]]) {
      if (sz < 0 && x === -100 && z === 0) continue;
      if (sz < 0 && x === 100 && z === 0) continue;
      K.wall(walls, x, sz * z, len, ry);
    }
  }
  K.rocks(mesas, 0x7a6248);
  K.rocks(rocks, 0x5f4e3c);
  K.boxes(walls, MATS.concrete.clone());
  K.boxes(conts, new THREE.MeshStandardMaterial({ color: 0x3f5a4a, roughness: 0.7, metalness: 0.4 }));
}

function buildAcid(world, M) {
  const K = kit(world), H = M.size / 2, R = M.river, BW = M.bridgeW;
  const walls = [], conts = [], banks = [], decks = [], rails = [], piers = [];
  // ---- sungai asid: satah bercahaya + tebing batu ----
  const acidMat = new THREE.MeshStandardMaterial({ color: 0x1a4a08, emissive: 0x5aff2a, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  world.acidMat = acidMat;
  const river = K.add(new THREE.Mesh(new THREE.PlaneGeometry(2 * H, 2 * R), acidMat));
  river.rotation.x = -PI / 2; river.position.y = 0.04;
  for (const p of M.pools) {
    const pool = K.add(new THREE.Mesh(new THREE.CircleGeometry(p.r, 40), acidMat));
    pool.rotation.x = -PI / 2; pool.position.set(p.x, 0.04, p.z);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU;
      banks.push({ x: p.x + Math.cos(a) * (p.r + 0.8), z: p.z + Math.sin(a) * (p.r + 0.8), s: 1.4, h: 1.0 });
    }
  }
  // gelembung asid (hiasan) & cahaya tebing
  const glow = new THREE.MeshBasicMaterial({ color: 0x9aff6a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), glow, 60);
  for (let i = 0; i < 60; i++) {
    K.o.position.set(rand(-H, H), 0.12, rand(-R + 1, R - 1)); K.o.scale.setScalar(rand(0.3, 1.1)); K.o.rotation.set(0, 0, 0);
    K.o.updateMatrix(); bub.setMatrixAt(i, K.o.matrix);
  }
  K.add(bub);
  for (const sz of [-1, 1]) {
    for (let x = -H; x <= H; x += 3.2) {
      let onBridge = false;
      for (const bx of M.bridges) if (Math.abs(x - bx) < BW + 1) onBridge = true;
      if (onBridge) continue;
      banks.push({ x, z: sz * (R + 0.6), s: 1.5, h: 1.1, sz: 0.8 });
    }
  }
  // ---- jambatan: dek, pagar, tiang & lampu ----
  for (const bx of M.bridges) {
    decks.push({ x: bx, z: 0, w: 2 * BW, d: 2 * R + 6, h: 0.35, y: 0.05 });
    for (const sd of [-1, 1]) {
      rails.push({ x: bx + sd * (BW - 0.2), z: 0, w: 0.35, d: 2 * R + 4, h: 1.0, y: 0.4 });
      for (let z = -R; z <= R; z += 4.5) piers.push({ x: bx + sd * (BW - 0.2), z, w: 0.6, d: 0.6, h: 1.8, y: 0 });
      // pagar menghalang kereta jatuh ke asid dari tepi jambatan
      for (let z = -R + 1; z <= R - 1; z += 2.6) K.col(bx + sd * (BW + 0.9), z, 1.1, 1.4, 'wall');
    }
    // tanjakan masuk
    for (const sz of [-1, 1]) decks.push({ x: bx, z: sz * (R + 4.2), w: 2 * BW, d: 3, h: 0.2, y: 0.02 });
  }
  // ---- litupan di tebing (dekat jambatan) & lorong ----
  for (const sz of [-1, 1]) {
    for (const bx of M.bridges) {
      K.wall(walls, bx - 14, sz * (R + 12), 7, 0);
      K.wall(walls, bx + 14, sz * (R + 12), 7, 0);
    }
    for (const [x, z, ry] of [[-110, 70, 0.3], [112, 72, -0.3], [-40, 95, 1.2], [42, 92, -1.2], [-118, 20, 1.5], [118, 24, 1.5]]) K.cont(conts, x, sz * z, ry * sz);
    for (const [x, z, len, ry] of [[-78, 80, 10, 0], [78, 80, 10, 0], [-34, 52, 8, PI / 2], [34, 52, 8, PI / 2], [0, 96, 12, 0]]) K.wall(walls, x, sz * z, len, ry);
  }
  K.rocks(banks, 0x2e2246);
  K.boxes(decks, new THREE.MeshStandardMaterial({ color: 0x55555e, roughness: 0.85, metalness: 0.3 }));
  K.boxes(rails, new THREE.MeshStandardMaterial({ color: 0xffb23f, emissive: 0x6a3a00, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.6 }));
  K.boxes(piers, new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.7, metalness: 0.5 }));
  K.boxes(walls, new THREE.MeshStandardMaterial({ color: 0x3a2d55, roughness: 0.7, metalness: 0.3 }));
  K.boxes(conts, new THREE.MeshStandardMaterial({ color: 0x24504a, roughness: 0.6, metalness: 0.5 }));
}

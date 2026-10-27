// elements.js — tiga sistem unsur: ombak air, puting beliung, dan api melekat.
//
// Ketiga-tiganya berkongsi satu peraturan: had yang KETAT pada bilangan musuh
// yang boleh ditangkap serentak, supaya kebolehan ini terasa kuat tanpa
// menyapu seluruh arena.
import * as THREE from 'three';
import { clamp, rand, TAU, PI } from './core.js';

/* ======================================================================
   OMBAK AIR — Atlantis
   Sekeping ombak yang meluncur ke hadapan. Musuh yang dilanggar hanyut
   mengikut arus sehingga ombak reput. Maksimum DUA kereta pada satu masa.
   ====================================================================== */
export const MAX_SURF = 2;

export function buildWave(color) {
  const g = new THREE.Group();
  const mk = (o) => new THREE.MeshBasicMaterial(Object.assign({
    color, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  }, o));

  /* Ombak yang MEMECAH, bukan gelang sepusat. Ia dibina daripada satu
     barisan bilah menegak yang tingginya membentuk lengkung - tinggi di
     tengah, rendah di hujung - dengan bibir yang menggulung ke hadapan.
     Itu yang memberi siluet ombak, bukan bulatan. */
  const N = 15;
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * 2 - 1;            // -1 .. 1 merentas muka ombak
    const h = 2.6 * Math.cos(t * 1.15) + 0.5;   // lengkung tinggi
    const x = t * 6.2;
    const z = -Math.abs(t) * 1.1;               // hujung tertinggal ke belakang
    // muka ombak
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.92, h, 0.42), mk({ opacity: 0.34 }));
    face.position.set(x, h * 0.5, z);
    face.rotation.x = -0.32;                    // condong ke hadapan
    g.add(face);
    // bibir buih yang menggulung di puncak
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.95, 9), mk({ opacity: 0.5 }));
    lip.rotation.z = PI / 2;
    lip.position.set(x, h + 0.12, z + 0.5);
    g.add(lip);
    // buih di kaki
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.5), mk({ opacity: 0.22 }));
    foam.position.set(x, 0.07, z - 0.8);
    g.add(foam);
  }
  return g;
}

export function updateWaves(G, dt) {
  const list = G.waves;
  if (!list || !list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const w = list[i];
    w.t -= dt;
    if (w.t <= 0) {
      for (const e of w.held) if (e) e.surf = null;
      G.scene.remove(w.obj);
      list.splice(i, 1);
      continue;
    }
    w.x += w.dx * w.speed * dt;
    w.z += w.dz * w.speed * dt;
    w.obj.position.set(w.x, 0, w.z);
    w.obj.rotation.y = Math.atan2(w.dx, w.dz);
    // denyut menegak sahaja - ombak naik turun, bukan mengembang
    w.obj.scale.set(1, 1 + Math.sin(G.time * 9) * 0.09, 1);

    // percikan air di sepanjang muka ombak
    if (Math.random() < 0.7) {
      const s = rand(-1, 1);
      G.fx.add.emit(w.x - w.dz * s * 5, rand(0.3, 1.8), w.z + w.dx * s * 5,
        w.dx * 6 + rand(-2, 2), rand(2, 6), w.dz * 6 + rand(-2, 2),
        { color: w.col, color2: [0.1, 0.3, 0.5], size: rand(0.3, 0.6), size2: 0.05, life: 0.5, drag: 1.6, grav: -7 });
    }

    // tangkap musuh baharu selagi belum penuh
    if (w.held.length < MAX_SURF) {
      G.neighbors(w.x, w.z, 6.2, null, (e, dx2, dz2, d) => {
        if (w.held.length >= MAX_SURF) return;
        if (e.surf || e.d.boss || w.hit.has(e.id)) return;
        if (d > 5.6) return;
        w.hit.add(e.id);
        w.held.push(e);
        e.surf = w;
        G.fx.spark(e.x, e.y + e.h * 0.5, e.z, 10, w.col, { speed: 7, size: 0.4, life: 0.4 });
      });
    }

    // hanyutkan yang tertangkap mengikut arus
    for (let j = w.held.length - 1; j >= 0; j--) {
      const e = w.held[j];
      if (!e || e.dead) { if (e) e.surf = null; w.held.splice(j, 1); continue; }
      // dibawa di hadapan muka ombak
      const tx = w.x + w.dx * 3.4, tz = w.z + w.dz * 3.4;
      e.x += (tx - e.x) * Math.min(1, dt * 6);
      e.z += (tz - e.z) * Math.min(1, dt * 6);
      e.vx = w.dx * w.speed; e.vz = w.dz * w.speed;
      e.lockT = Math.max(e.lockT || 0, 0.25);     // tidak boleh menembak semasa hanyut
      w.dmgAcc += dt;
      if (w.dmgAcc > 0.2) {
        e.lastHitBy = 'player';
        G.damageEnemy(e, w.dmg * 0.2, w.dx, 0, w.dz, 0, 'boom', w.flags);
      }
      if (Math.random() < 0.4) {
        G.fx.add.emit(e.x + rand(-1, 1), rand(0.4, 2), e.z + rand(-1, 1), 0, rand(1, 4), 0,
          { color: w.col, color2: [0.1, 0.3, 0.5], size: 0.34, size2: 0.04, life: 0.35, drag: 2 });
      }
    }
    if (w.dmgAcc > 0.2) w.dmgAcc = 0;
  }
}

export function spawnWave(G, dmg, life, speed, color) {
  if (!G.waves) G.waves = [];
  const p = G.player;
  const dx = Math.sin(p.ang), dz = Math.cos(p.ang);
  const col = color || [0.45, 1.5, 2.2];
  const obj = buildWave(new THREE.Color(col[0] * 0.5, col[1] * 0.5, col[2] * 0.6));
  obj.position.set(p.x + dx * 4, 0, p.z + dz * 4);
  G.scene.add(obj);
  G.waves.push({
    obj, x: p.x + dx * 4, z: p.z + dz * 4, dx, dz,
    speed: speed || 16, t: life || 4.2, dmg: dmg || 120,
    held: [], hit: new Set(), dmgAcc: 0, col, flags: G.curFlags || null,
  });
  G.fx.abilityRing(p.x, p.z, col, 2, 14, 0.45);
}

/* ======================================================================
   PUTING BELIUNG — kereta angin
   Ditanam pada satu titik. Hanya menangkap musuh yang BERDEKATAN dengannya,
   maksimum DUA, dan memutarkan mereka mengelilingi matanya.
   ====================================================================== */
export const MAX_TWIST = 2;

export function buildTornado(color) {
  const g = new THREE.Group();
  const mk = (o) => new THREE.MeshBasicMaterial(Object.assign({
    color, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  }, o));

  /* Corong sebenar: kon terbuka yang mengecil ke bawah. Gelang bertindan
     hanya kelihatan seperti bulatan - bentuk kon yang memberi siluet
     puting beliung. */
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 0.85, 9, 26, 6, true), mk({ opacity: 0.17 }));
  funnel.position.y = 4.5;
  g.add(funnel);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 0.5, 8.4, 20, 4, true), mk({ opacity: 0.2 }));
  inner.position.y = 4.3;
  g.add(inner);
  g.userData.inner = inner;

  /* Jalur berpilin di permukaan corong - inilah yang membuatkan mata
     nampak ia BERPUSING, bukan sekadar kon kabur. */
  const strands = new THREE.Group();
  for (let s2 = 0; s2 < 5; s2++) {
    const base = (s2 / 5) * TAU;
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const y = 0.5 + t * 8.2;
      const r = 0.85 + t * 3.3;
      const a = base + t * 5.6;                 // pilinan menaik
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 + t * 0.7, 0.1, 0.1), mk({ opacity: 0.4 - t * 0.2 }));
      seg.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      seg.rotation.y = -a;
      seg.rotation.z = 0.5;
      strands.add(seg);
    }
  }
  g.add(strands);
  g.userData.strands = strands;

  // serpihan bertaburan di kaki
  const foot = new THREE.Mesh(new THREE.RingGeometry(0.8, 2.6, 22), mk({ opacity: 0.22 }));
  foot.rotation.x = -PI / 2;
  foot.position.y = 0.08;
  g.add(foot);
  g.userData.foot = foot;
  return g;
}

export function updateTornados(G, dt) {
  const list = G.twisters;
  if (!list || !list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const w = list[i];
    w.t -= dt;
    w.spin += dt * 4.5;
    if (w.t <= 0) {
      for (const e of w.held) if (e) { e.twist = null; e.fly = 0; }
      G.scene.remove(w.obj);
      list.splice(i, 1);
      continue;
    }
    w.obj.position.set(w.x, 0, w.z);
    const U = w.obj.userData;
    if (U.strands) U.strands.rotation.y = w.spin * 2.2;
    if (U.inner) U.inner.rotation.y = -w.spin * 3.4;
    if (U.foot) U.foot.rotation.z = w.spin * 1.4;
    w.obj.rotation.y = w.spin * 0.5;

    // serpihan berpusar
    if (Math.random() < 0.85) {
      const a = Math.random() * TAU, r = 1 + Math.random() * 3.4;
      G.fx.add.emit(w.x + Math.cos(a) * r, rand(0.2, 6), w.z + Math.sin(a) * r,
        -Math.sin(a) * 9, rand(3, 9), Math.cos(a) * 9,
        { color: w.col, color2: [0.3, 0.35, 0.4], size: rand(0.25, 0.5), size2: 0.05, life: 0.55, drag: 0.9 });
    }

    // tangkap - HANYA yang berdekatan, maksimum dua
    if (w.held.length < MAX_TWIST) {
      G.neighbors(w.x, w.z, w.r, null, (e, dx2, dz2, d) => {
        if (w.held.length >= MAX_TWIST) return;
        if (e.twist || e.surf || e.d.boss || d > w.r) return;
        w.held.push(e);
        e.twist = w;
        e.twistA = Math.atan2(e.z - w.z, e.x - w.x);
        G.fx.spark(e.x, e.y + e.h * 0.5, e.z, 8, w.col, { speed: 6, size: 0.35, life: 0.4 });
      });
    }

    for (let j = w.held.length - 1; j >= 0; j--) {
      const e = w.held[j];
      if (!e || e.dead) { if (e) { e.twist = null; e.fly = 0; } w.held.splice(j, 1); continue; }
      e.twistA += dt * 5.5;
      const rr = 2.6;
      const tx = w.x + Math.cos(e.twistA) * rr, tz = w.z + Math.sin(e.twistA) * rr;
      e.x += (tx - e.x) * Math.min(1, dt * 8);
      e.z += (tz - e.z) * Math.min(1, dt * 8);
      e.vx = 0; e.vz = 0;
      // terangkat: guna medan `fly` sedia ada supaya perlanggaran mengikutinya
      e.y = Math.min(4.2, (e.y || 0) + dt * 7);
      e.lockT = Math.max(e.lockT || 0, 0.25);
      w.dmgAcc += dt;
      if (w.dmgAcc > 0.25) {
        e.lastHitBy = 'player';
        G.damageEnemy(e, w.dmg * 0.25, 0, 0, 0, 0, 'boom', w.flags);
      }
    }
    if (w.dmgAcc > 0.25) w.dmgAcc = 0;
  }
}

export function spawnTornado(G, x, z, opt) {
  if (!G.twisters) G.twisters = [];
  if (G.twisters.length >= 2) {
    const o = G.twisters.shift();
    for (const e of o.held) if (e) { e.twist = null; e.fly = 0; }
    G.scene.remove(o.obj);
  }
  const col = (opt && opt.color) || [0.8, 1.1, 1.5];
  const obj = buildTornado(new THREE.Color(col[0] * 0.55, col[1] * 0.6, col[2] * 0.7));
  obj.position.set(x, 0, z);
  G.scene.add(obj);
  G.twisters.push({
    obj, x, z, spin: 0, t: (opt && opt.life) || 5,
    r: (opt && opt.radius) || 7,                 // hanya yang BERDEKATAN
    dmg: (opt && opt.dmg) || 90, col,
    held: [], dmgAcc: 0, flags: G.curFlags || null,
  });
  G.fx.abilityRing(x, z, col, 1.5, 11, 0.45);
}

/* ======================================================================
   API MELEKAT — senjata Amber
   Melekat 5 saat, meninggalkan kesan di tanah, TIDAK boleh bertindan, dan
   selepas ia padam musuh kebal api selama 10 saat. Had ini yang menghalang
   senjata ini daripada menjadi terlalu kuat.
   ====================================================================== */
export const AMBER_BURN = 5;
export const AMBER_IMMUNE = 10;

export function amberIgnite(G, e, dps, flags) {
  if (e.amberT > 0) return false;          // sudah terbakar: TIDAK bertindan
  if (e.amberImm > 0) return false;        // masih kebal selepas kali terakhir
  e.amberT = AMBER_BURN;
  e.amberDps = dps;
  e.amberFlags = flags || null;
  e.amberAcc = 0;
  e.amberTrail = 0;
  G.fx.spark(e.x, e.y + e.h * 0.5, e.z, 10, [2.0, 1.0, 0.3], { speed: 6, size: 0.45, life: 0.45 });
  return true;
}

export function updateAmber(G, dt) {
  for (const e of G.enemies) {
    if (e.amberImm > 0) e.amberImm -= dt;
    if (!(e.amberT > 0)) continue;
    e.amberT -= dt;

    e.amberAcc = (e.amberAcc || 0) + dt;
    if (e.amberAcc >= 0.25) {
      e.amberAcc = 0;
      e.lastHitBy = 'player';
      G.damageEnemy(e, e.amberDps * 0.25, 0, 0, 0, 0, 'burn', e.amberFlags);
    }

    // api pada badan musuh
    G.fx.add.emit(e.x + rand(-0.5, 0.5), e.y + e.h * rand(0.3, 0.9), e.z + rand(-0.5, 0.5),
      rand(-0.5, 0.5), rand(1.5, 3.5), rand(-0.5, 0.5),
      { color: [2.0, 1.0, 0.25], color2: [0.5, 0.12, 0.05], size: rand(0.3, 0.6), size2: 0.05, life: 0.4, drag: 1.3, grav: 1.4 });

    // kesan bara di tanah sepanjang laluannya
    e.amberTrail = (e.amberTrail || 0) + dt;
    if (e.amberTrail >= 0.12) {
      e.amberTrail = 0;
      G.fx.add.emit(e.x + rand(-0.6, 0.6), 0.18, e.z + rand(-0.6, 0.6), 0, rand(0.3, 1.1), 0,
        { color: [1.8, 0.7, 0.18], color2: [0.35, 0.08, 0.03], size: rand(0.35, 0.7), size2: 0.08, life: 0.9, drag: 2.6, ground: true });
    }

    if (e.amberT <= 0) {
      e.amberT = 0;
      e.amberImm = AMBER_IMMUNE;           // tidak boleh dibakar semula serta-merta
      G.fx.smoke(e.x, e.y + e.h * 0.5, e.z, 4, { speed: 2, size: 1.1, life: 0.8, alpha: 0.35 });
    }
  }
}

export function clearElements(G) {
  if (G.waves) { for (const w of G.waves) G.scene.remove(w.obj); G.waves.length = 0; }
  if (G.twisters) { for (const w of G.twisters) G.scene.remove(w.obj); G.twisters.length = 0; }
}

void clamp;

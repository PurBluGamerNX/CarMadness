import * as THREE from 'three';
// weapons2.js — tembakan 10 senjata tandatangan kereta baharu (2026-10-17).
// Setiap senjata ada pasangan kereta (`sigCar` dalam weapons.js). Di sini hanya
// cara ia DILEPASKAN; apa yang berlaku selepas itu (bilah berpatah balik,
// penyengat berdetik, rod kilat, tanglung, pagar...) dijalankan oleh
// systems2.js setiap bingkai.
import { rand, clamp, Sfx } from './core.js';

/* titik sasaran atas tanah: musuh berkunci, kemudian reticle, dihadkan julat */
function groundPoint(g, ox, oz, dx, dz, range, min = 8) {
  let tx, tz;
  const t = g.lock && !g.lock.dead ? g.lock : null;
  if (t) { tx = t.x; tz = t.z; }
  else if (g.aim && g.player && Math.hypot(g.aim.x - ox, g.aim.z - oz) > 1) { tx = g.aim.x; tz = g.aim.z; }
  else { tx = ox + dx * range * 0.6; tz = oz + dz * range * 0.6; }
  let vx = tx - ox, vz = tz - oz;
  const d = Math.hypot(vx, vz) || 1;
  const k = clamp(d, min, range) / d;
  return { x: ox + vx * k, z: oz + vz * k, d: d * k };
}

export function fireCustom(g, slot, s, w, ox, oy, oz, dx, dy, dz) {
  const hl = Math.hypot(dx, dz) || 1, fx = dx / hl, fz = dz / hl;
  const C = w.color;
  const base = { owner: 'p', thru: s.thruWalls, k2: w.custom, knock: s.knock };
  switch (w.custom) {
    /* SPINE MORTAR: kelongsong melambung, pecah di udara di atas titik sasaran
       dan menabur duri cangkerang ke tanah (systems2 spawnSpines). */
    case 'spine': {
      const tp = groundPoint(g, ox, oz, fx, fz, s.range, 10);
      // lengkung tinggi seperti mortar lain: puncak >= 12m supaya melepasi dinding
      const grav = 30, T = Math.max(tp.d / (s.speed * 0.8), Math.sqrt(8 * 12 / grav)), vh = tp.d / T;
      // PEPIJAT: dahulu ditembak ikut arah laras (fx,fz) walaupun titik sasaran tp berbeza - kini terus ke tp
      const ux = (tp.x - ox) / (tp.d || 1), uz = (tp.z - oz) / (tp.d || 1);
      g.spawnBullet(Object.assign({}, base, {
        x: ox, y: oy, z: oz, vx: ux * vh, vz: uz * vh, vy: (2.2 - oy) / T + 0.5 * grav * T, grav,
        dmg: s.dmg * 0.6, life: T + 0.05, pierce: 0, color: C, size: 0.34, len: 1, kind: 'shell',
        spine: { n: Math.round(s.pellets), dmg: s.dmg, boom: !!s.spineBoom }, tx: tp.x, tz: tp.z,
      }));
      g.fx.muzzle(ox, oy, oz, fx, 0.6, fz, 1.6, C);
      g.fx.smoke(ox, oy, oz, 4, { speed: 2.4, size: 1, life: 0.8, alpha: 0.45 });
      Sfx.shoot('spine');
      g.shake(0.45, 0.1); g.recoil(-fx, -fz, 4);
      break;
    }
    /* RIFT MAUL: tiada peluru. Retakan menjalar sepanjang tanah ke hadapan. */
    case 'maul': {
      g.spawnRift(ox - fx * 0.2, oz - fz * 0.2, fx, fz, s);
      g.fx.abilityRing(ox + fx * 2, oz + fz * 2, C, 1, 6, 0.35);
      g.fx.smoke(ox + fx * 2, 0.3, oz + fz * 2, 6, { speed: 4, size: 1.3, life: 0.8, alpha: 0.5 });
      Sfx.shoot('maul');
      g.shake(0.9, 0.18); g.recoil(-fx, -fz, 3);
      break;
    }
    /* STORM JAVELIN: lembing berat, melekat pada apa yang dikena -> rod kilat */
    case 'javelin': {
      g.spawnBullet(Object.assign({}, base, {
        x: ox, y: oy, z: oz, vx: dx * s.speed, vy: dy * s.speed, vz: dz * s.speed,
        dmg: s.dmg, life: s.range / s.speed, pierce: 0, color: C, size: 0.14, len: 3.2, kind: 'javelin',
        jav: { t: s.rodT, r: s.rodR, jump: s.rodJump, zap: s.dmg * 0.18 },
      }));
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.3, C);
      Sfx.shoot('javelin');
      g.shake(0.35, 0.1); g.recoil(-fx, -fz, 4);
      break;
    }
    /* CRESCENT GLAIVE: bilah melengkung keluar ke satu sisi, berpatah balik ke
       kereta. Ditangkap = satu das dipulangkan ke magazin. */
    case 'glaive': {
      const n = Math.round(s.pellets);
      const side0 = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const side = n > 1 ? (i ? 1 : -1) : side0;
        const a = -side * 0.32;                       // condong ke luar, lengkung membawa balik
        const ca = Math.cos(a), sa = Math.sin(a);
        const vx = (fx * ca - fz * sa) * s.speed, vz = (fx * sa + fz * ca) * s.speed;
        g.spawnBullet(Object.assign({}, base, {
          x: ox, y: Math.max(1.3, oy), z: oz, vx, vy: 0, vz,
          dmg: s.dmg, life: 9, pierce: 99, color: C, size: 0.9, len: 0.5, kind: 'glaive',
          glaive: { side, out: s.range, gone: 0, back: false, slot, retMul: s.retMul || 1, sp: s.speed },
        }));
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.1, C);
      Sfx.shoot('glaive');
      g.shake(0.2, 0.06);
      break;
    }
    /* STINGER POD: penyengat berduri, melekat dan berdetik (systems2 stickSting) */
    case 'stinger': {
      g.spawnBullet(Object.assign({}, base, {
        x: ox, y: oy, z: oz, vx: dx * s.speed, vy: dy * s.speed, vz: dz * s.speed,
        dmg: s.dmg * 0.25, life: s.range / s.speed, pierce: 0, color: C, size: 0.2, len: 1.0, kind: 'stinger',
        sting: { dmg: s.dmg, fuse: s.fuse, r: s.splash },
      }));
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 0.8, C);
      Sfx.shoot('stinger');
      g.shake(0.12, 0.05); g.recoil(-fx, -fz, 1);
      break;
    }
    /* SUN LANTERN: terbang naik ke atas titik sasaran dan tergantung */
    case 'lantern': {
      const tp = groundPoint(g, ox, oz, fx, fz, s.range, 6);
      g.spawnLantern(ox, oy, oz, tp.x, tp.z, s, C);
      g.fx.muzzle(ox, oy, oz, fx, 0.8, fz, 1.5, C);
      Sfx.shoot('lantern');
      g.shake(0.3, 0.08);
      break;
    }
    /* ECHO CHIME: nota cahaya; nota ke-3 pada sasaran sama = letupan resonans */
    case 'chime': {
      const [ax, ay, az] = flatSpread(dx, dy, dz, s.spread);
      g.spawnBullet(Object.assign({}, base, {
        x: ox, y: oy, z: oz, vx: ax * s.speed, vy: ay * s.speed, vz: az * s.speed,
        dmg: s.dmg, life: s.range / s.speed, pierce: 0, color: C, size: 0.3, len: 0.5, kind: 'plasma',
        chime: { T: s.noteT, r: s.noteR, mul: s.noteMul },
      }));
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 0.7, C);
      Sfx.shoot('chime');
      break;
    }
    /* FORK BOLT: berpecah kepada 3 (4) bila mengena */
    case 'fork': {
      const [ax, ay, az] = flatSpread(dx, dy, dz, s.spread);
      g.spawnBullet(Object.assign({}, base, {
        x: ox, y: oy, z: oz, vx: ax * s.speed, vy: ay * s.speed, vz: az * s.speed,
        dmg: s.dmg, life: s.range / s.speed, pierce: 0, color: C, size: 0.13, len: 2.8,
        fork: { n: s.tines, gen: s.forkGen, hit: [] },
      }));
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 0.9, C);
      Sfx.shoot('fork');
      g.shake(0.15, 0.05); g.recoil(-fx, -fz, 1);
      break;
    }
    /* RIME SCATTER: serpihan ais, setiap satu menambah fros */
    case 'rime': {
      const n = Math.round(s.pellets);
      for (let i = 0; i < n; i++) {
        const [ax, ay, az] = flatSpread(dx, dy, dz, s.spread);
        const sp = s.speed * rand(0.9, 1.1);
        g.spawnBullet(Object.assign({}, base, {
          x: ox, y: oy, z: oz, vx: ax * sp, vy: ay * sp, vz: az * sp,
          dmg: s.dmg, life: s.range / s.speed, pierce: 0, color: C, size: 0.11, len: 1.2,
          rime: { need: s.frostNeed, r: s.shatterR },
        }));
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.4, C);
      for (let i = 0; i < 6; i++) g.fx.add.emit(ox, oy, oz, dx * rand(6, 14) + rand(-2, 2), rand(-1, 2), dz * rand(6, 14) + rand(-2, 2),
        { color: [0.8, 1.6, 2.4], color2: [0.2, 0.4, 0.7], size: 0.3, size2: 0.05, life: 0.3, drag: 3 });
      Sfx.shoot('rime');
      g.shake(0.4, 0.08); g.recoil(-fx, -fz, 4);
      break;
    }
    /* FLAIR: LASER solar flare yang MELIBAS (Nabil: "macam lazer, melibas sikit2, melencong
       obstacle, dekat sangat tak sakit"). Setiap das = satu libasan sinar melengkung ke
       sasaran; kalau dinding menghalang, sinar membengkok mengelilinginya (flairPath).
       Rentak 4 libasan -> jeda -> ulang (seq). Damage ikut JARAK sasaran: 0.4x rapat,
       `sweet` dalam zon sederhana-jauh, pudar ke 0.45x di hujung julat. */
    case 'flair': {
      const R = s.range;
      let t = g.lock && !g.lock.dead && Math.hypot(g.lock.x - ox, g.lock.z - oz) < R ? g.lock : null;
      if (!t) t = g.pickAimTarget(ox, oz, fx, fz, R, 0.9, false);
      const path = t ? flairPath(g, ox, oz, t) : null;
      slot.flairN = ((slot.flairN || 0) + 1) % 4;
      const whip = (slot.flairN % 2 ? 1 : -1) * (0.8 + Math.random() * 0.5);     // alun kiri-kanan bergilir
      let dmg = 0, endPt = null;
      if (path) {
        const d = Math.hypot(t.x - ox, t.z - oz), [z0, z1] = s.zone || [22, 75], sw = s.sweet || 1.2;
        const m = d < z0 ? 0.4 + 0.6 * d / z0 : d <= z1 ? sw : Math.max(0.45, sw - (d - z1) / Math.max(1, R - z1) * (sw - 0.45));
        dmg = s.dmg * m;
      } else {
        const L = g.wallDist ? Math.min(R * 0.5, g.wallDist(ox, oz, fx, fz, R * 0.5, 1.4)) : R * 0.5;
        endPt = [ox + fx * L, oy, oz + fz * L];
      }
      spawnFlairLash(g, ox, oy, oz, path ? t : null, Array.isArray(path) ? path : null, endPt, whip, C, dmg, s.knock);
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 0.9, C);
      Sfx.shoot('flair');
      break;
    }
    /* MINI STAR: bintang besar berpusing meluncur lembut ke sasaran (spawnStar). */
    case 'ministar': {
      let t = g.lock && !g.lock.dead && Math.hypot(g.lock.x - ox, g.lock.z - oz) < s.range ? g.lock : null;
      if (!t) t = g.pickAimTarget(ox, oz, fx, fz, s.range, 0.9, false);
      slot.starN = ((slot.starN || 0) + 1) % 2;
      spawnStar(g, ox, oy, oz, fx, fz, t, s, C, slot.starN ? 1 : -1);
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.0, C);
      Sfx.shoot('nail');
      break;
    }
    /* HURAGO: laser imbas segera. Kunci satu sasaran; setiap kena = salin
       scanPct (10%) damage senjata sasaran ke dalam slot.hBonus. Sasaran mati
       -> simpan keepPct (10%) sahaja dan kunci musuh seterusnya. */
    case 'hurago': {
      const R = s.range;
      let t = slot.hTgt;
      const valid = x => x && !x.dead && Math.hypot(x.x - ox, x.z - oz) < R + (x.r || 1) && (!g.losClear || g.losClear(ox, oz, x.x, x.z, x));
      if (t && t.dead) { slot.hBonus = (slot.hBonus || 0) * (s.keepPct || 0.1); slot.hScans = 0; t = null; }
      if (!valid(t)) t = (valid(g.lock) ? g.lock : null) || g.pickAimTarget(ox, oz, dx, dz, R, 0.4, true);
      slot.hTgt = t || null;
      let ex = ox + dx * R, ey = oy + dy * R, ez = oz + dz * R;
      const dmg = s.dmg + (slot.hBonus || 0);
      if (t) {
        ex = t.x; ey = (t.y || 0) + (t.h || 1.6) * 0.5; ez = t.z;
        // imbas: salin peratus damage senjata sasaran
        const pw = weaponPower(t);
        /* Nabil: damage asas LEMAH GILA; kekuatan datang daripada imbasan. Setiap
           imbasan = 10% damage senjata musuh (dalam satu kitaran 2s), jadi selepas
           3-4 imbasan barulah laser kuat. Bonus maks 1500. */
        // had: satu imbasan maks 18% HP maksimum sasaran - kalau tidak, bot tahap tinggi (senjata kuat) mati 1 das selepas imbasan pertama
        // 2026-10-19 pusingan 2: asas sudah kuat; imbasan min 25% dmg asas, curi % kecil, bonus maks 1x asas
        // (dahulu rata 1500 - tidak bermakna selepas skala v3.0). Penuh selepas ~4 imbasan.
        const gain = Math.max(s.dmg * 0.25, Math.min(pw * (s.scanPct || 0.06), (t.maxHp || 300) * 0.12));
        slot.hBonus = Math.min(s.dmg, (slot.hBonus || 0) + gain);
        slot.hScans = (slot.hScans || 0) + 1;
        g.damageEnemy(t, dmg, t.x - ox, 0, t.z - oz, s.knock, 'bullet', g.curFlags);
        g.fx.spark(ex, ey, ez, 14, C, { speed: 8, size: 0.4, life: 0.4 });
        g.fx.abilityRing(t.x, t.z, [2.4, 0.5, 0.9], (t.r || 1) + 0.5, (t.r || 1) + 3, 0.4);
        if (window.UI) window.UI.toast(`SCAN ${slot.hScans} · HURAGO ${Math.round(s.dmg + slot.hBonus)}`);
        if (t.dead) { slot.hBonus *= (s.keepPct || 0.1); slot.hScans = 0; slot.hTgt = null; if (window.UI) window.UI.toast(`TARGET DOWN · KEPT ${Math.round(s.dmg + slot.hBonus)}`); }
      }
      const pw2 = clamp(dmg / (s.dmg * 3), 0.35, 1.6);            // laser makin tebal bila makin kuat
      g.fx.beam(ox, oy, oz, ex, ey, ez, [C[0] * 1.2, C[1], C[2] * 1.2], 0.22 + 0.25 * pw2, 0.3);
      g.fx.beam(ox, oy, oz, ex, ey, ez, [2.4, 2.0, 2.2], 0.08 + 0.08 * pw2, 0.34);
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.6 + pw2, C);
      Sfx.shoot('lance');
      g.shake(0.3 + 0.3 * pw2, 0.1); g.recoil(-fx, -fz, 3);
      break;
    }
    /* DIAMOND: bolt blaster tebal yang terbang nampak. Resonans dikira di sini
       (bolt ini membawa damage berdasarkan berapa kali berturut-turut sasaran
       sama sudah kena - systems2 diamondHit mengira kiraannya). */
    case 'diamond': {
      slot.dShots = (slot.dShots || 0) + 1;
      const twin = s.twinEvery && slot.dShots % s.twinEvery === 0;
      const live = slot.resTgt && !slot.resTgt.dead && g.time - (slot.resAt || 0) < 1.6;
      if (!live) slot.resN = 0;
      const res = Math.min(s.resMax || 0.3, (slot.resN || 0) * 0.06);
      const n = twin ? 2 : 1, glow = 1 + res * 1.6;
      for (let k = 0; k < n; k++) {
        const off = n > 1 ? (k - 0.5) * 0.42 : 0;
        const [ax, ay, az] = flatSpread(dx, dy, dz, s.spread);
        g.spawnBullet(Object.assign({}, base, {
          x: ox - fz * off, y: oy, z: oz + fx * off, vx: ax * s.speed, vy: ay * s.speed, vz: az * s.speed,
          dmg: s.dmg * (1 + res), life: s.range / s.speed, pierce: 0, color: [C[0] * glow, C[1] * glow, C[2] * glow],
          size: 0.17, len: 2.8, kind: 'bullet', diamond: { slot, max: s.resMax || 0.3 },
        }));
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.1 + res, C);
      Sfx.shoot('diamond');
      g.shake(0.12, 0.05); g.recoil(-fx, -fz, 1.5);
      break;
    }
    /* GALE HAMMER: peluru udara mampat. Di darat terbang ke titik bidikan dan
       pecah jadi pusaran; semasa TERBANG ia jadi bom yang menjunam ke titik itu. */
    case 'gale': {
      const air = g.player && (g.player.y || 0) > 1.6;
      const tp = groundPoint(g, ox, oz, fx, fz, s.range, air ? 3 : 6);
      const G = { r: s.splash * (air ? 1.35 : 1), dmg: s.dmg * (air ? 1.4 : 1), knock: s.knock * (air ? 1.3 : 1), slow: !!s.galeSlow, air };
      if (air) {
        const T = 0.45 + tp.d / 110, grav = 22;
        g.spawnBullet(Object.assign({}, base, {
          x: ox, y: oy, z: oz, vx: (tp.x - ox) / T, vz: (tp.z - oz) / T, vy: (0.3 - oy) / T + 0.5 * grav * T, grav,
          dmg: s.dmg * 0.3, life: T + 0.3, pierce: 0, color: C, size: 0.42, kind: 'plasma', gale: G,
        }));
      } else {
        const sp = s.speed;
        g.spawnBullet(Object.assign({}, base, {
          x: ox, y: oy, z: oz, vx: dx * sp, vy: dy * sp, vz: dz * sp,
          dmg: s.dmg * 0.3, life: Math.max(0.15, tp.d / sp), pierce: 0, color: C, size: 0.36, kind: 'plasma', gale: G,
        }));
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.4, C);
      g.fx.smoke(ox, oy, oz, 3, { speed: 3, size: 0.8, life: 0.4, alpha: 0.3 });
      Sfx.shoot('gale');
      g.shake(0.3, 0.08); g.recoil(-fx, -fz, 3);
      break;
    }
    /* LASER FENCE: tiang ditembak ke tanah, bersambung dengan tiang sebelumnya */
    case 'fence': {
      const tp = groundPoint(g, ox, oz, fx, fz, s.range, 5);
      g.spawnPylon(ox, oy, oz, tp.x, tp.z, s, C, slot);
      g.fx.muzzle(ox, oy, oz, fx, 0.4, fz, 1.0, C);
      Sfx.shoot('fence');
      g.shake(0.2, 0.06);
      break;
    }
  }
}

/* "damage senjata" sasaran untuk imbasan Hurago: bot pasukan = jumlah damage
   setiap das senjata sebenarnya; musuh gelombang = damage serangan/tembakan */
/* FLAIR: laluan sinar ke sasaran. Terus kalau tiada dinding; kalau ada, cari SATU titik
   lencongan: calon di 3 kedudukan sepanjang garisan x anjakan sisi 4..20m (kecil dahulu),
   kedua-dua segmen mesti bebas dinding. Prop berkelompok pun boleh dilencong. null = tiada laluan. */
function flairPath(g, ox, oz, t) {
  const clear = (ax, az, bx, bz, e) => !g.losClear || g.losClear(ax, az, bx, bz, e);
  if (clear(ox, oz, t.x, t.z, t)) return 'direct';
  const dx = t.x - ox, dz = t.z - oz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  for (const off of [7, 10, 14, 19, 25]) for (const k of [0.5, 0.35, 0.65]) for (const sg of [1, -1]) {
    const wx = ox + dx * k - uz * sg * off, wz = oz + dz * k + ux * sg * off;
    if (Math.abs(wx) > 400 || Math.abs(wz) > 400) continue;
    if (clear(ox, oz, wx, wz, null) && clear(wx, wz, t.x, t.z, t)) return [wx, wz];
  }
  return null;
}
/* LIBASAN FLAIR (pusingan 5 - Nabil: "membelai", "macam tampar nyamuk: angkat tangan, hayun",
   "smooth lagi, nampak patah2, fps drop"). Sinar beranimasi:
     0 - UP    : ANGKAT - sinar naik dari matahari ke atas & sedikit ke sisi
     UP - HIT  : HAYUN - hujung menyapu melengkung ke sasaran (makin laju), badan sinar tertinggal
                 seperti cemeti; TAMPAR = damage pada saat HIT
     HIT - HOLD: melekap, riak lembut reda; lengkung mendap ke laluan lencongan dinding
     HOLD - DUR: pudar.
   PRESTASI: satu tiub TETAP per libasan (40 gelang x 8), hanya kedudukan bucu ditulis semula
   setiap bingkai - dahulu TubeGeometry baharu setiap bingkai = lag. LICIN: titik kawalan
   lengkung berterusan merentas fasa (dahulu melompat pada pertukaran fasa = "patah"). */
const LASH = { UP: 0.35, HIT: 0.75, HOLD: 1.0, DUR: 1.3 };   // pusingan 7: SATU laluan berterusan, keluar perlahan (Nabil: "macam sotong")
export const LN = 40, LR = 8;
export const qb = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
// Bezier kubik: laluan berterusan matahari -> naik -> melengkung -> sasaran (tiada henti di tengah)
export const cb = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
export const sstep = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const s5 = x => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };   // smootherstep
let _lashIdx = null;
export function lashTube(mat) {
  if (!_lashIdx) {
    const a = [];
    for (let i = 0; i < LN; i++) for (let j = 0; j < LR; j++) {
      const p0 = i * LR + j, p1 = i * LR + (j + 1) % LR, p2 = (i + 1) * LR + j, p3 = (i + 1) * LR + (j + 1) % LR;
      a.push(p0, p2, p1, p1, p2, p3);
    }
    _lashIdx = new THREE.BufferAttribute(new Uint16Array(a), 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((LN + 1) * LR * 3), 3));
  geo.setIndex(_lashIdx);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false;
  return m;
}
// tulis bucu tiub mengelilingi garis tengah C (Float32Array (LN+1)*3), jejari r(i)
export function fillTube(mesh, C, rad) {
  const P = mesh.geometry.attributes.position, a = P.array;
  let nx0 = 1, ny0 = 0, nz0 = 0;
  for (let i = 0; i <= LN; i++) {
    const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(LN, i + 1) * 3;
    let tx = C[i1] - C[i0], ty = C[i1 + 1] - C[i0 + 1], tz = C[i1 + 2] - C[i0 + 2];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // normal = T x atas (stabil untuk sinar yang kebanyakannya mendatar)
    let nx = -tz, ny = 0, nz = tx; const nl = Math.hypot(nx, nz);
    if (nl < 1e-3) { nx = nx0; ny = ny0; nz = nz0; } else { nx /= nl; nz /= nl; }
    nx0 = nx; ny0 = ny; nz0 = nz;
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    const r = rad(i / LN), cx = C[i * 3], cy = C[i * 3 + 1], cz = C[i * 3 + 2];
    for (let j = 0; j < LR; j++) {
      const ang = j / LR * Math.PI * 2, co = Math.cos(ang) * r, si = Math.sin(ang) * r, k = (i * LR + j) * 3;
      a[k] = cx + nx * co + bx * si; a[k + 1] = cy + ny * co + by * si; a[k + 2] = cz + nz * co + bz * si;
    }
  }
  P.needsUpdate = true;
}
function spawnFlairLash(g, ox, oy, oz, t, via, endPt, whip, C, dmg, knock) {
  const p = g.player, ca = Math.cos(p.ang), sa = Math.sin(p.ang);
  const lx = ox - p.x, lz = oz - p.z;
  const loc = [lx * ca - lz * sa, oy - (p.y || 0), lx * sa + lz * ca];     // offset muncung dalam ruang kereta
  const outer = new THREE.MeshBasicMaterial({ color: new THREE.Color(C[0] * 0.5, C[1] * 0.42, C[2] * 0.38), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const inner = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.85, 1.0), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const mo = lashTube(outer), mi = lashTube(inner);
  const grp = new THREE.Group(); grp.add(mo); grp.add(mi); g.scene.add(grp);
  const last = endPt ? endPt.slice() : [t.x, (t.y || 0) + (t.h || 1.6) * 0.5, t.z];
  const CL = new Float32Array((LN + 1) * 3);
  /* Nabil: "membelai beberapa arah, nampak random" - setiap libasan ada SUDUT angkat rawak sekeliling
     paksi sinar (0 = dari atas, +-90 darjah = sapuan mendatar dari sisi) & satah riak rawak. */
  const th = (Math.random() * 2 - 1) * 1.75, th2 = Math.random() * Math.PI;
  const sTh = Math.sin(th), cTh = Math.cos(th), sW = Math.sin(th2), cW = Math.cos(th2);
  const F = { t: 0, hit: false };
  F.step = (G, dt) => {
    F.t += dt;
    if (F.t >= LASH.DUR) return false;
    const T = F.t;
    const c2 = Math.cos(p.ang), s2 = Math.sin(p.ang);
    const sx = p.x + loc[0] * c2 + loc[2] * s2, sy = (p.y || 0) + loc[1], sz = p.z - loc[0] * s2 + loc[2] * c2;
    if (t && !t.dead) { last[0] = t.x; last[1] = (t.y || 0) + (t.h || 1.6) * 0.5; last[2] = t.z; }
    const [ex, ey, ez] = last;
    const dx = ex - sx, dz = ez - sz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const H = Math.min(9, 3 + L * 0.1);
    const qx = px * sTh, qy = cTh, qz = pz * sTh;                       // arah angkat rawak (vektor unit)
    const rx = sx + ux * L * 0.12 + qx * H, ry = sy + Math.max(1, qy * H), rz = sz + uz * L * 0.12 + qz * H;   // "tangan diangkat"
    // hujung sinar
    // hujung sinar: SATU lengkung kubik berterusan (matahari -> naik -> melengkung -> sasaran),
    // dipacu smootherstep sepanjang 0..HIT: keluar perlahan, meluncur tanpa henti, mendarat lembut
    const ax = (rx + ex) / 2 + qx * H * 0.45, ay = Math.max((ry + ey) / 2 + qy * H * 0.45, Math.min(ry, ey)), az = (rz + ez) / 2 + qz * H * 0.45;
    const kH = s5(T / LASH.HIT);
    const hx = cb(sx, rx, ax, ex, kH), hy = cb(sy, ry, ay, ey, kH), hz = cb(sz, rz, az, ez, kH);
    // titik kawalan badan sinar - BERTERUSAN
    const kSet = sstep((T - LASH.HIT) / 0.3);
    const bow = H * 0.4 * Math.sin(Math.PI * Math.min(1, T / LASH.HIT)) * (1 - kSet) + 0.9 * kSet;    // lengkung lembut, kemudian mendap
    let setX = 0, setZ = 0;                                                                     // anjakan sisi ke laluan lencongan
    const mx = (sx + hx) / 2, mz = (sz + hz) / 2;
    if (via) { setX = 2 * via[0] - (sx + ex) / 2 - mx; setZ = 2 * via[1] - (sz + ez) / 2 - mz; }
    else { setX = px * whip * Math.min(4, L * 0.08); setZ = pz * whip * Math.min(4, L * 0.08); }
    const back = 0.6 * (1 - kSet);
    // lengkung badan mengikut arah angkat semasa hayun, kemudian mendap ke atas sedikit
    const bdx = qx * (1 - kSet), bdy = qy * (1 - kSet) + kSet, bdz = qz * (1 - kSet);
    const bx2 = mx - ux * back + setX * kSet + bdx * bow, by2 = Math.max(Math.min(sy, hy), (sy + hy) / 2 + bdy * bow), bz2 = mz - uz * back + setZ * kSet + bdz * bow;
    // riak lembut selepas tampar
    const ripple = T > LASH.HIT ? Math.max(0, 1 - (T - LASH.HIT) / (LASH.DUR - LASH.HIT)) : 0;
    const amp = Math.min(0.9, 0.2 + L * 0.008) * ripple * sstep((T - LASH.HIT) / 0.08), ph = whip * 2 - T * 9;
    for (let i = 0; i <= LN; i++) {
      const u = i / LN, wave = Math.sin(u * 3 * Math.PI + ph) * amp * Math.sin(u * Math.PI);
      CL[i * 3] = qb(sx, bx2, hx, u) + px * cW * wave;
      CL[i * 3 + 1] = qb(sy, by2, hy, u) + sW * wave;
      CL[i * 3 + 2] = qb(sz, bz2, hz, u) + pz * cW * wave;
    }
    const fade = T < LASH.HOLD ? 1 : 1 - (T - LASH.HOLD) / (LASH.DUR - LASH.HOLD);
    const swell = T < LASH.HIT ? 0.8 : 0.8 + 0.2 * sstep((T - LASH.HIT) / 0.12) + 0.2 * Math.max(0, 1 - Math.abs(T - LASH.HIT - 0.12) / 0.12);   // kembang lembut selepas tampar (tiada lompatan)   // kembang sekejap masa tampar
    const born = s5(T / 0.18);                                   // tumbuh nipis dari matahari
    const ro = 0.36 * swell * (0.6 + 0.4 * fade) * (0.3 + 0.7 * born), ri = 0.11 * (0.5 + 0.5 * fade) * (0.3 + 0.7 * born);
    fillTube(mo, CL, u => ro * (1 - 0.45 * u));                 // menirus ke hujung
    fillTube(mi, CL, u => ri * (1 - 0.35 * u));
    outer.opacity = 0.5 * fade; inner.opacity = 0.9 * fade;
    if (T < LASH.HIT && Math.random() < 0.5) G.fx.add.emit(hx, hy, hz, 0, 0.5, 0,
      { color: [3.0, 1.6, 0.45], color2: [0.6, 0.15, 0.02], size: 0.8, size2: 0.15, life: 0.3, drag: 0, alpha: 0.6 });
    if (!F.hit && T >= LASH.HIT) {
      F.hit = true;
      /* BERBILANG MUSUH (Nabil): semua musuh yang disentuh badan sinar masa tampar kena. Seorang =
         damage penuh; ramai = damage DIBAHAGI, +15% jumlah bagi setiap musuh tambahan (maks 1.6x). */
      const base = dmg > 0 ? dmg : 0;
      if (base > 0) {
        const hitL = [];
        if (t && !t.dead) hitL.push(t);
        for (const e of G.enemies) {
          if (e.dead || e === t || e.cargoAlly) continue;
          const tol = (e.r || 1) + 1.3, ty2 = (e.y || 0) + (e.h || 1.6) * 0.5;
          for (let i = 2; i <= LN; i += 2) {
            const qx = CL[i * 3] - e.x, qz = CL[i * 3 + 2] - e.z;
            if (qx * qx + qz * qz < tol * tol && Math.abs(CL[i * 3 + 1] - ty2) < (e.h || 1.6) + 1.2) { hitL.push(e); break; }
          }
        }
        const n = hitL.length;
        if (n) {
          const per = base * Math.min(1.6, 1 + 0.15 * (n - 1)) / n;
          for (const e of hitL) {
            e.lastHitBy = 'player';
            G.damageEnemy(e, per, e.x - sx, 0, e.z - sz, knock, 'bullet', G.curFlags);
            G.fx.add.emit(e.x, (e.y || 0) + (e.h || 1.6) * 0.5, e.z, 0, 0.8, 0, { color: [3.0, 1.8, 0.6], color2: [0.7, 0.2, 0.03], size: 1.6, size2: 0.3, life: 0.35, drag: 0, alpha: 0.7 });
          }
          F.hitN = n;
        }
      }
    }
    return true;
  };
  F.dispose = () => { g.scene.remove(grp); mo.geometry.dispose(); mi.geometry.dispose(); outer.dispose(); inner.dispose(); };
  (g.flairFx || (g.flairFx = [])).push(F);
  F.step(g, 0);
}

/* MINI STAR (Nabil 2026-10-19): bintang BESAR berpusing, keluar condong ke sisi (bergilir) lalu
   MELUNCUR LEMBUT melengkung ke sasaran - kemudi halus (bukan peluru lurus), mengelak prop di
   hadapan. Kena -> damage; Mark II tembus satu musuh ke sasaran berikut, Mark IV melantun sekali.
   Diurus dalam g.flairFx (dikemas kini systems2 updateFlairFx, dibuang clearRun). */
let _starGeo = null;
function starGeo() {
  if (_starGeo) return _starGeo;
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  sh.closePath();
  _starGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1 });
  _starGeo.translate(0, 0, -0.11);
  return _starGeo;
}
function spawnStar(g, ox, oy, oz, fx, fz, t, s, C, side) {
  const core = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.86, 0.45) });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.62, 0.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const grp = new THREE.Group();
  const star = new THREE.Mesh(starGeo(), core); star.scale.setScalar(0.62); grp.add(star);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), glow); halo.scale.setScalar(0.95); grp.add(halo);
  grp.position.set(ox, oy, oz); g.scene.add(grp);
  // keluar condong ke sisi (kiri/kanan bergilir) + rawak kecil -> lengkung mengalir
  // pilih sisi keluar yang LAPANG (garisan 10m tidak terhalang); kalau dua-dua terhalang, terus ke hadapan
  const tryA = a => { const c = Math.cos(a), s2 = Math.sin(a); return !g.losClear || g.losClear(ox, oz, ox + (fx * c - fz * s2) * 10, oz + (fx * s2 + fz * c) * 10, null); };
  let a0 = side * (0.35 + Math.random() * 0.3);
  if (!tryA(a0)) a0 = tryA(-a0) ? -a0 : 0;
  const ca = Math.cos(a0), sa = Math.sin(a0);
  const S = {
    x: ox, y: oy, z: oz, vx: (fx * ca - fz * sa) * s.speed, vy: 3 + Math.random() * 2, vz: (fx * sa + fz * ca) * s.speed,
    t: 0, life: s.range / s.speed * 1.8, tgt: t, hits: [], pierce: Math.round(s.pierce || 0), bounce: !!(s.flags && s.flags.bounce),
    spin: (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 4), dead: false, fadeT: 0,
  };
  const step = (G, dt) => {
    if (S.dead) {
      S.fadeT += dt;
      grp.scale.setScalar(1 + S.fadeT * 6); glow.opacity = 0.35 * (1 - S.fadeT / 0.18); core.transparent = true; core.opacity = 1 - S.fadeT / 0.18;
      return S.fadeT < 0.18;
    }
    S.t += dt;
    if (S.t > S.life) { S.dead = true; return true; }
    const sp = Math.hypot(S.vx, S.vz) || 1, ux = S.vx / sp, uz = S.vz / sp;
    let tg = S.tgt;
    if (!tg || tg.dead || S.hits.includes(tg)) tg = S.tgt = G.nearestEnemy ? G.nearestEnemy(S.x, S.z, 70, S.hits) : null;
    let hx = ux, hz = uz;
    if (tg && S.t > 0.12) { const dx = tg.x - S.x, dz = tg.z - S.z, dl = Math.hypot(dx, dz) || 1; hx = dx / dl; hz = dz / dl; }
    // elak prop di hadapan: tolak ke sisi yang jauh dari pusatnya
    let ax = 0, az = 0;
    for (const o of G.world.props) {
      if (!o.alive || (o.h || 2.6) < 1.2 || S.y > (o.h || 2.6) + 0.5) continue;
      const qx = o.x - S.x, qz = o.z - S.z, look = 9 + o.r, al = qx * ux + qz * uz;
      if (al < -o.r || al > look) continue;
      const sd = -qx * uz + qz * ux;
      if (Math.abs(sd) > o.r + 2) continue;
      if (tg && Math.hypot(tg.x - S.x, tg.z - S.z) < al) continue;
      const push = (1 - Math.max(0, al) / look) * 3, sg = sd >= 0 ? -1 : 1;
      ax += -uz * sg * push; az += ux * sg * push;
      // terlanggar juga? hancur di dinding
      // 0.3s pertama: lindungan, hanya mengemudi keluar
      if (S.t > 0.3 && Math.hypot(qx, qz) < o.r * 0.8) { S.dead = true; G.fx.spark(S.x, S.y, S.z, 8, [2.6, 2.1, 1.0], { speed: 4, size: 0.25, life: 0.3 }); return true; }
    }
    const wx = hx + ax, wz = hz + az, wl = Math.hypot(wx, wz) || 1;
    // kemudi LEMBUT: putar halaju perlahan (bukan terus) -> lengkung mengalir
    const turn = Math.min(1, ((ax || az) ? 5 : 2.6 + S.t * 1.5) * dt);
    const nx = ux + (wx / wl - ux) * turn, nz = uz + (wz / wl - uz) * turn, nl = Math.hypot(nx, nz) || 1;
    const spd = Math.min(sp * (1 + dt * 0.6), s.speed * 1.6);          // memecut sedikit bila hampir
    S.vx = nx / nl * spd; S.vz = nz / nl * spd;
    const ty = tg ? Math.max(1.1, (tg.y || 0) + (tg.h || 1.6) * 0.5) : 1.6;
    S.vy += ((ty - S.y) * 2.2 - S.vy) * Math.min(1, dt * 3);
    S.x += S.vx * dt; S.y += S.vy * dt; S.z += S.vz * dt;
    grp.position.set(S.x, S.y, S.z);
    star.rotation.z += S.spin * dt; star.rotation.y = Math.atan2(S.vx, S.vz);
    halo.scale.setScalar(0.9 + Math.sin(S.t * 14) * 0.1);
    if (Math.random() < 0.8) G.fx.add.emit(S.x, S.y, S.z, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6,
      { color: [2.6, 2.1, 1.0], color2: [0.6, 0.45, 0.15], size: 0.38, size2: 0.04, life: 0.45, drag: 2 });
    // kena musuh
    for (const e of G.enemies) {
      if (e.dead || e.cargoAlly || S.hits.includes(e)) continue;
      const dx = e.x - S.x, dz = e.z - S.z, rr = (e.r || 1) + 0.9;
      if (dx * dx + dz * dz > rr * rr || Math.abs(S.y - ((e.y || 0) + (e.h || 1.6) * 0.5)) > (e.h || 1.6) * 0.7 + 1) continue;
      e.lastHitBy = 'player';
      G.damageEnemy(e, s.dmg, S.vx, 0, S.vz, s.knock, 'bullet', G.curFlags);
      G.fx.spark(S.x, S.y, S.z, 10, [2.6, 2.1, 1.0], { speed: 6, size: 0.3, life: 0.35 });
      S.hits.push(e);
      if (S.pierce > 0) { S.pierce--; S.tgt = null; }
      else if (S.bounce) { S.bounce = false; S.tgt = null; S.life = S.t + 1.6; }
      else { S.dead = true; }
      break;
    }
    return true;
  };
  (g.flairFx || (g.flairFx = [])).push({ step, dispose: () => { g.scene.remove(grp); halo.geometry.dispose(); core.dispose(); glow.dispose(); } });
}

function weaponPower(t) {
  // damage senjata SEBENAR (bukan dinormalkan) dalam satu kitaran Hurago (2s)
  if (t.guns) return t.guns.reduce((a, gn) => a + (gn.s.dmg || 0) * (gn.s.pellets || 1) * Math.min(gn.s.rof || 1, 3) * (gn.w.type === 'flame' ? 3 : 1), 0);
  const d = t.d || {}, m = t.dmgMul || 1;
  if (d.ranged) return d.ranged.dmg * (d.ranged.burst || 1) * (d.ranged.spread3 ? 3 : 1) * m;
  return (d.dmg || 0) * m;
}

function flatSpread(dx, dy, dz, amt) {
  if (!(amt > 0)) return [dx, dy, dz];
  const a = rand(-amt, amt), ca = Math.cos(a), sa = Math.sin(a);
  const nx = dx * ca - dz * sa, nz = dx * sa + dz * ca;
  const l = Math.hypot(nx, dy, nz) || 1;
  return [nx / l, dy / l, nz / l];
}

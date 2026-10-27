// enemies.js — jenis musuh, perenderan berkelompok (instanced), AI & jadual gelombang
import * as THREE from 'three';
import { HORDES, buildHulk, buildJeep, buildTank, buildBoss, enemyInstance, botCarInstance } from './models.js';
import { rand, randInt, pick, clamp, lerp, TAU, PI, angDiff, turnTo, Sfx } from './core.js';

/* ---------------- perenderan berkelompok ---------------- */
export class Horde {
  constructor(def, scene) {
    this.def = def;
    const max = def.max;
    this.meshes = def.parts.map(p => {
      const m = new THREE.InstancedMesh(p.geo, p.mat, max);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = true; m.receiveShadow = true;
      m.count = 0; m.frustumCulled = false;
      m.setColorAt(0, new THREE.Color(1, 1, 1));
      scene.add(m);
      return m;
    });
    this._root = new THREE.Object3D();
    this._part = new THREE.Object3D();
    this._m = new THREE.Matrix4();
    this._c = new THREE.Color();
    this._i = 0; this._n = 0;
    this.skin = def.skinParts || [];
  }
  begin() { this._n = 0; }
  push(e, t) {
    if (this._n >= this.def.max) return;
    const r = this._root;
    r.position.set(e.x, e.y, e.z);
    r.rotation.set(0, e.ang, 0);
    r.updateMatrix();
    this._i = this._n;
    this.def.pose(e, t, this);
    const f = e.flash, burn = e.burnT > 0 ? 1 : 0;
    for (let p = 0; p < this.meshes.length; p++) {
      const col = this.skin.includes(p) ? e.skin : e.tint;
      this._c.setRGB(
        clamp(col[0] + f * 2.5 + burn * 0.5, 0, 6),
        clamp(col[1] + f * 2.5 + burn * 0.15, 0, 6),
        clamp(col[2] + f * 2.5, 0, 6));
      this.meshes[p].setColorAt(this._i, this._c);
    }
    this._n++;
  }
  set(pi, px, py, pz, rx, ry, rz, sx, sy, sz) {
    const p = this._part;
    p.position.set(px, py, pz);
    p.rotation.set(rx, ry, rz);
    p.scale.set(sx, sy, sz);
    p.updateMatrix();
    this._m.multiplyMatrices(this._root.matrix, p.matrix);
    this.meshes[pi].setMatrixAt(this._i, this._m);
  }
  end() {
    for (const m of this.meshes) {
      m.count = this._n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}

/* ---------------- definisi musuh ---------------- */
const Z_SKIN = [[0.42, 0.55, 0.34], [0.5, 0.58, 0.38], [0.38, 0.5, 0.36]];
const Z_CLOTH = [[0.22, 0.26, 0.32], [0.3, 0.2, 0.18], [0.18, 0.3, 0.26], [0.34, 0.3, 0.2], [0.26, 0.24, 0.3]];

export const EDEF = {
  walker: {
    label: 'Zombie', horde: 'zombie', hp: 40, spd: 3.5, dmg: 10, r: 0.62, h: 1.8, bulk: 1, wide: 1,
    credit: 9, score: 10, atk: 1.0, ai: 'melee', gib: 'blood',
    skin: () => pick(Z_SKIN), tint: () => pick(Z_CLOTH),
  },
  runner: {
    label: 'Runner', horde: 'zombie', hp: 26, spd: 8.6, dmg: 8, r: 0.55, h: 1.7, bulk: 0.92, wide: 0.88,
    credit: 13, score: 16, atk: 0.65, ai: 'melee', gib: 'blood',
    skin: () => [0.62, 0.36, 0.3], tint: () => [0.34, 0.12, 0.12],
  },
  brute: {
    label: 'Brute', horde: 'zombie', hp: 300, spd: 3.1, dmg: 30, r: 1.25, h: 3.0, bulk: 1.85, wide: 1.35,
    credit: 60, score: 80, atk: 1.5, ai: 'charger', gib: 'blood', knockRes: 0.85,
    skin: () => [0.45, 0.42, 0.3], tint: () => [0.26, 0.2, 0.16],
  },
  swarm: {
    label: 'Crawler', horde: 'swarmer', hp: 30, spd: 10.0, dmg: 9, r: 0.5, h: 1.1, bulk: 1, wide: 1,
    credit: 12, score: 14, atk: 0.55, ai: 'melee', gib: 'goo',
    skin: () => [0.5, 0.2, 0.7], tint: () => [0.36, 0.12, 0.55],
  },
  drone: {
    label: 'Alien Drone', horde: 'drone', hp: 70, spd: 7.2, dmg: 0, r: 0.8, h: 2.4, bulk: 1, wide: 1,
    credit: 22, score: 30, ai: 'flyer', fly: 2.4, gib: 'goo',
    ranged: { cd: 2.1, speed: 34, dmg: 12, kind: 'plasma', range: 42, color: [0.4, 1.8, 1.5] },
    skin: () => [0.55, 0.6, 0.7], tint: () => [0.3, 0.34, 0.42],
  },
  soldier: {
    label: 'Soldier', horde: 'soldier', hp: 62, spd: 4.6, dmg: 0, r: 0.6, h: 1.85, bulk: 1, wide: 1,
    credit: 18, score: 22, ai: 'shooter', keep: 26, gib: 'blood',
    ranged: { cd: 2.6, burst: 3, gap: 0.14, speed: 52, dmg: 6, kind: 'bullet', range: 34, color: [1.5, 1.1, 0.5] },
    skin: () => [0.52, 0.42, 0.34], tint: () => [0.3, 0.34, 0.25],
  },
  hulk: {
    label: 'Alien Hulk', mesh: 'hulk', hp: 620, spd: 3.4, dmg: 34, r: 1.7, h: 4.0,
    credit: 90, score: 120, atk: 1.6, ai: 'melee', gib: 'goo', knockRes: 0.9,
    ranged: { cd: 3.2, speed: 32, dmg: 16, kind: 'plasma', range: 40, spread3: true, color: [1.6, 0.4, 1.8] },
  },
  jeep: {
    label: 'Attack Jeep', mesh: 'jeep', hp: 300, spd: 14, r: 1.4, h: 1.8,
    credit: 55, score: 70, ai: 'vehicle', keep: 20, gib: 'metal', knockRes: 0.7,
    ranged: { cd: 1.8, burst: 4, gap: 0.12, speed: 58, dmg: 5, kind: 'bullet', range: 40, color: [1.5, 1.2, 0.5] },
  },
  tank: {
    label: 'Battle Tank', mesh: 'tank', hp: 1100, spd: 5.2, r: 2.2, h: 2.6,
    credit: 140, score: 200, ai: 'vehicle', keep: 34, gib: 'metal', knockRes: 1,
    ranged: { cd: 4.4, speed: 40, dmg: 32, splash: 6, kind: 'shell', range: 70, color: [1.8, 1.0, 0.4] },
  },
  // kereta bot dalam mod pasukan (statistik sebenar ditetapkan oleh team.js)
  bot: {
    label: 'Enemy Car', mesh: 'car', hp: 300, spd: 15, r: 2.0, h: 1.9,
    credit: 0, score: 100, ai: 'bot', gib: 'metal', knockRes: 0.85,
  },
  bossZ: {
    label: 'FLESH TITAN', mesh: 'boss', bossKind: 'zombie', hp: 4200, spd: 3.6, dmg: 46, r: 3.2, h: 6.5,
    credit: 700, score: 1500, atk: 1.6, ai: 'boss', boss: true, gib: 'blood', knockRes: 1,
  },
  bossA: {
    label: 'MOTHERSHIP', mesh: 'boss', bossKind: 'alien', hp: 5200, spd: 5.5, r: 4.5, h: 7, fly: 4.5,
    credit: 800, score: 1800, ai: 'boss', boss: true, gib: 'goo', knockRes: 1,
    ranged: { cd: 1.5, speed: 46, dmg: 18, kind: 'plasma', range: 60, color: [1.8, 0.4, 1.6] },
  },
  bossW: {
    label: 'ROLLING FORTRESS', mesh: 'boss', bossKind: 'war', hp: 6000, spd: 4.2, r: 3.6, h: 4,
    credit: 900, score: 2000, ai: 'boss', boss: true, gib: 'metal', knockRes: 1,
    ranged: { cd: 3.0, speed: 44, dmg: 36, splash: 7, kind: 'shell', range: 80, color: [1.8, 1.0, 0.4] },
  },
};

/* ---------------- mod & gelombang ---------------- */
export const MODES = {
  zombie: {
    name: 'Zombie Outbreak', theme: 'wasteland', boss: 'bossZ',
    desc: 'Endless waves of the undead. Ram them, shoot them, never stop moving.',
    pool: [
      { k: 'walker', w: 12, cost: 1, min: 1 },
      { k: 'runner', w: 6, cost: 1.5, min: 2 },
      { k: 'brute', w: 2.2, cost: 6, min: 4 },
    ],
  },
  alien: {
    name: 'Alien Invasion', theme: 'alien', boss: 'bossA',
    desc: 'Fast crawlers and laser drones. Flying enemies cannot be rammed.',
    pool: [
      { k: 'swarm', w: 10, cost: 1.2, min: 1 },
      { k: 'drone', w: 5, cost: 2.6, min: 2 },
      { k: 'hulk', w: 1.8, cost: 8, min: 4 },
    ],
  },
  war: {
    name: 'War Mode', theme: 'warzone', boss: 'bossW',
    desc: 'Armoured troops that shoot back - use cover and speed.',
    pool: [
      { k: 'soldier', w: 10, cost: 1.6, min: 1 },
      { k: 'jeep', w: 3.4, cost: 5, min: 2 },
      { k: 'tank', w: 1.4, cost: 12, min: 4 },
    ],
  },
  chaos: {
    name: 'Doomsday', theme: 'city', boss: null, locked: 'Clear wave 10 in any mode',
    desc: 'Every enemy mixed together, no end. How long can you last?',
    pool: [
      { k: 'walker', w: 8, cost: 1, min: 1 },
      { k: 'runner', w: 5, cost: 1.5, min: 1 },
      { k: 'swarm', w: 5, cost: 1.2, min: 1 },
      { k: 'soldier', w: 5, cost: 1.6, min: 1 },
      { k: 'drone', w: 3.5, cost: 2.6, min: 2 },
      { k: 'brute', w: 1.6, cost: 6, min: 3 },
      { k: 'jeep', w: 2, cost: 5, min: 3 },
      { k: 'hulk', w: 1.4, cost: 8, min: 4 },
      { k: 'tank', w: 1, cost: 12, min: 5 },
    ],
  },
};

export function waveBudget(wave) { return 9 + wave * 5.2 + wave * wave * 0.32; }
export function waveScale(wave) {
  return { hp: 1 + (wave - 1) * 0.15 + Math.pow(wave, 1.6) * 0.008, spd: 1 + Math.min(0.42, (wave - 1) * 0.022), dmg: 1 + (wave - 1) * 0.04 };
}

export function rollWave(mode, wave) {
  const M = MODES[mode];
  let budget = waveBudget(wave);
  const list = [];
  const avail = M.pool.filter(p => wave >= p.min);
  let guard = 400;
  while (budget > 0.8 && guard-- > 0) {
    const tot = avail.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * tot, sel = avail[0];
    for (const p of avail) { r -= p.w; if (r <= 0) { sel = p; break; } }
    if (sel.cost > budget + 1.5) {
      const cheap = avail.filter(p => p.cost <= budget);
      if (!cheap.length) break;
      const c = pick(cheap);
      list.push(c.k); budget -= c.cost; continue;
    }
    list.push(sel.k); budget -= sel.cost;
  }
  return list;
}

/* ---------------- kilang musuh ---------------- */
let _id = 1;
export function makeEnemy(g, kind, x, z, wave) {
  const d = EDEF[kind];
  const sc = waveScale(wave);
  const e = {
    id: _id++, kind, d, x, y: 0, z,
    ang: 0, vx: 0, vz: 0, spd: 0,
    hp: d.hp * sc.hp, maxHp: d.hp * sc.hp,
    dmgMul: sc.dmg, spdMul: sc.spd,
    r: d.r, h: d.h, bulk: d.bulk || 1, wide: d.wide || 1,
    walk: rand(TAU), seed: rand(TAU), flash: 0, burnT: 0, burnDmg: 0, slowT: 0,
    atkCd: rand(0.3), shootCd: rand(0.6, 1.6), burst: 0, burstCd: 0,
    state: 0, stateT: 0, hover: d.fly || 0, spin: 0, aimPitch: 0, moving: true, lockT: 0,
    markT: 0, markAmt: 0, bonusScrap: 0, bonusCoin: 0,
    tint: d.tint ? d.tint() : [1, 1, 1], skin: d.skin ? d.skin() : [1, 1, 1],
    mesh: null, turret: null, wheels: null, phase: 0,
  };
  if (d.fly) e.y = 0;
  if (d.mesh) {
    let b;
    if (d.mesh === 'hulk') b = enemyInstance('hulk', buildHulk);
    else if (d.mesh === 'jeep') b = enemyInstance('jeep', () => buildJeep());
    else if (d.mesh === 'tank') b = enemyInstance('tank', () => buildTank());
    else if (d.mesh === 'car') b = botCarInstance(g._botSpec);
    else b = enemyInstance('boss_' + d.bossKind, () => buildBoss(d.bossKind));
    e.mesh = b.root; e.turret = b.turret || null; e.wheels = b.wheels || null; e.turrets = b.turrets || null;
    e.mats = b.mats; e.muzzleObj = b.muzzle || null;
    e.baseCol = {};
    for (const k in b.mats) e.baseCol[k] = b.mats[k].color.clone();
    e.mesh.position.set(x, d.fly || 0, z);
    g.scene.add(e.mesh);
  }
  return e;
}

// bina templat kenderaan/bos lebih awal supaya kemunculan pertama tidak tersekat
export function prewarmEnemies(mode) {
  if (!MODES[mode]) return;
  const kinds = new Set(MODES[mode].pool.map(p => p.k));
  kinds.add(MODES[mode].boss || 'bossZ');
  for (const k of kinds) {
    const d = EDEF[k];
    if (!d || !d.mesh) continue;
    const b = d.mesh === 'hulk' ? enemyInstance('hulk', buildHulk)
      : d.mesh === 'jeep' ? enemyInstance('jeep', () => buildJeep())
        : d.mesh === 'tank' ? enemyInstance('tank', () => buildTank())
          : enemyInstance('boss_' + d.bossKind, () => buildBoss(d.bossKind));
    for (const m in b.mats) b.mats[m].dispose();
  }
}

export function disposeEnemy(g, e) {
  if (e.mesh) {
    g.scene.remove(e.mesh);
    if (e.mats) for (const k in e.mats) e.mats[k].dispose();
  }
}

/* ---------------- AI ---------------- */
const TMP = { x: 0, z: 0 };

export function updateEnemy(g, e, dt) {
  /* Kebolehan Vanish menjadikan pemain benar-benar tidak boleh disasar -
     bukan sekadar lut sinar. Tanpa umpan, musuh kehilangan sasaran dan
     berkeliaran. */
  const p = (g.player && g.player.untarget && !g.decoy)
    ? { x: e.x + Math.cos(e.seed || 0) * 40, z: e.z + Math.sin(e.seed || 0) * 40, y: 0, h: 2, r: 1, dead: false, cloak: true }
    : (g.decoy || g.player);
  const d = e.d;
  let dx = p.x - e.x, dz = p.z - e.z;
  let dist = Math.hypot(dx, dz) || 0.001;
  const nx = dx / dist, nz = dz / dist;

  if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 4.5);
  if (e.slowT > 0) e.slowT -= dt;
  if (e.jamT > 0) e.jamT -= dt;               // Hibachi Jammer Beam
  if (e.markT > 0) e.markT -= dt;
  if (e.blindT > 0) e.blindT -= dt;     // awan lebah Hivra / tanglung: tidak boleh menembak
  if (e.lockT > 0) {
    // bot pasukan menyusutkannya sendiri di dalam updateBot
    if (d.ai !== 'bot') e.lockT -= dt;
    e.flash = Math.max(e.flash, 0.22 + Math.sin(g.time * 14) * 0.12);
  }
  if (e.burnT > 0) {
    e.burnT -= dt;
    e.burnAcc = (e.burnAcc || 0) + dt;
    if (e.burnAcc > 0.25) {
      e.burnAcc = 0;
      g.damageEnemy(e, e.burnDmg * 0.25, 0, 0, 0, 0, 'burn');
      g.fx.add.emit(e.x + rand(-0.4, 0.4), e.y + e.h * rand(0.3, 0.8), e.z + rand(-0.4, 0.4), rand(-0.4, 0.4), rand(1, 2.6), rand(-0.4, 0.4),
        { color: [1.7, 0.8, 0.2], color2: [0.5, 0.1, 0.05], size: rand(0.3, 0.6), size2: 0.05, life: rand(0.3, 0.6), drag: 1.4, grav: 1.5 });
    }
  }

  // Juhag: renjatan elektrik - damage setiap saat selama 3s, percikan biru
  if (e.shockT > 0) {
    e.shockT -= dt;
    e.shockAcc = (e.shockAcc || 0) + dt;
    if (e.shockAcc > 0.25) {
      e.shockAcc = 0;
      g.damageEnemy(e, e.shockDps * 0.25, 0, 0, 0, 0, 'tesla');
      g.fx.spark(e.x + rand(-0.6, 0.6), e.y + e.h * rand(0.3, 0.9), e.z + rand(-0.6, 0.6), 3,
        [0.6, 1.5, 2.6], { speed: 5, size: 0.22, life: 0.18 });
    }
  }

  if (d.ai === 'bot') { if (g.team) g.team.updateBot(e, dt); return; }

  const slow = e.slowT > 0 ? 0.45 : 1;
  const locked = e.lockT > 0;
  const speed = locked ? 0 : d.spd * e.spdMul * slow * (g.player.cloak && !g.decoy ? 0.4 : 1);

  // pemisahan supaya tak bertindih
  let sx = 0, sz = 0;
  g.neighbors(e.x, e.z, 2.4, e, (o, ddx, ddz, dd) => {
    const push = (e.r + o.r) - dd;
    if (push > 0) { sx -= ddx / (dd || 0.01) * push; sz -= ddz / (dd || 0.01) * push; }
  });

  let mx = 0, mz = 0, wantAng = e.ang;

  switch (d.ai) {
    case 'melee': {
      mx = nx; mz = nz;
      wantAng = Math.atan2(nx, nz);
      if (dist < e.r + p.r + 0.9) {
        mx *= 0.2; mz *= 0.2;
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = d.atk;
          g.hurtTarget(d.dmg * e.dmgMul, e.x, e.z);
          Sfx.flesh();
        }
      }
      break;
    }
    case 'charger': {
      e.stateT -= dt;
      if (e.state === 0) {
        mx = nx; mz = nz; wantAng = Math.atan2(nx, nz);
        if (dist < 16 && e.stateT <= 0) { e.state = 1; e.stateT = 0.7; e.flash = 0.5; }
        if (dist < e.r + p.r + 1.0) {
          e.atkCd -= dt;
          if (e.atkCd <= 0) { e.atkCd = d.atk; g.hurtTarget(d.dmg * e.dmgMul, e.x, e.z); Sfx.flesh(); }
        }
      } else if (e.state === 1) { // amaran
        mx = mz = 0; wantAng = Math.atan2(nx, nz);
        e.flash = 0.35 + Math.sin(g.time * 30) * 0.25;
        if (e.stateT <= 0) { e.state = 2; e.stateT = 1.5; e.cx = nx; e.cz = nz; Sfx.tone(120, 0.3, 'sawtooth', 0.2, 60); }
      } else { // serbu
        mx = e.cx * 3.1; mz = e.cz * 3.1;
        if (Math.random() < dt * 30) g.fx.smoke(e.x, 0.2, e.z, 1, { speed: 1, size: 0.8, life: 0.7, alpha: 0.35 });
        if (dist < e.r + p.r + 1.4) {
          g.hurtTarget(d.dmg * 1.5 * e.dmgMul, e.x, e.z);
          g.shake(1.2, 0.3);
          e.state = 0; e.stateT = 3.2; e.atkCd = d.atk;
        }
        if (e.stateT <= 0) { e.state = 0; e.stateT = 2.6; }
      }
      break;
    }
    case 'shooter': {
      const keep = d.keep;
      if (dist > keep * 1.12) { mx = nx; mz = nz; e.moving = true; }
      else if (dist < keep * 0.62) { mx = -nx; mz = -nz; e.moving = true; }
      else {
        const s = Math.sin(g.time * 0.7 + e.seed) * 1.0;
        mx = -nz * s; mz = nx * s; e.moving = Math.abs(s) > 0.3;
      }
      wantAng = Math.atan2(nx, nz);
      shoot(g, e, dt, dist, nx, nz);
      break;
    }
    case 'flyer': {
      const keep = 20 + Math.sin(e.seed * 3) * 7;
      const orbit = Math.sin(e.seed) > 0 ? 1 : -1;
      const radial = clamp((dist - keep) * 0.12, -1, 1);
      mx = nx * radial - nz * orbit * 0.8;
      mz = nz * radial + nx * orbit * 0.8;
      e.hover = lerp(e.hover, d.fly + Math.sin(g.time * 1.3 + e.seed) * 0.5, dt * 2);
      e.spin += dt * 2.4;
      wantAng = Math.atan2(nx, nz);
      shoot(g, e, dt, dist, nx, nz);
      break;
    }
    case 'vehicle': {
      const keep = d.keep;
      const radial = clamp((dist - keep) * 0.1, -1, 1);
      const orbit = (e.seed > PI ? 1 : -1) * 0.75;
      mx = nx * radial - nz * orbit;
      mz = nz * radial + nx * orbit;
      wantAng = Math.atan2(mx, mz);
      if (Math.hypot(mx, mz) < 0.1) wantAng = Math.atan2(nx, nz);
      if (e.turret) {
        const ta = Math.atan2(nx, nz) - e.ang;
        e.turretAng = turnTo(e.turretAng || 0, Math.atan2(Math.sin(ta), Math.cos(ta)), dt * 1.4);
        e.turret.rotation.y = e.turretAng;
      }
      shoot(g, e, dt, dist, nx, nz);
      break;
    }
    case 'boss': {
      bossAI(g, e, dt, dist, nx, nz);
      return;
    }
  }

  // gerakan
  const acc = speed * 6;
  const tvx = (mx + sx * 1.6) * speed, tvz = (mz + sz * 1.6) * speed;
  const slip = e.slipT > 0 ? 0.1 : 1;              // Breeze: peluru ais - licin, susah kawal
  e.vx = lerp(e.vx, tvx, clamp(acc * dt / Math.max(1, speed), 0, 1) * slip);
  e.vz = lerp(e.vz, tvz, clamp(acc * dt / Math.max(1, speed), 0, 1) * slip);
  e.x += e.vx * dt; e.z += e.vz * dt;
  e.spd = Math.hypot(e.vx, e.vz);
  e.walk += dt * (2.4 + e.spd * (d.horde === 'swarmer' ? 1.6 : 1.1));
  e.ang = turnTo(e.ang, wantAng, dt * (d.ai === 'vehicle' ? 2.2 : 7));
  // liftT / twist mengambil alih ketinggian; jangan tulis ganti
  if (!(e.liftT > 0) && !e.twist) { if (d.fly) e.y = e.hover; else e.y = 0; }

  g.clampToArena(e, e.r);
  g.avoidProps(e);

  if (e.mesh) {
    e.mesh.position.set(e.x, e.y, e.z);
    e.mesh.rotation.y = e.ang;
    if (e.wheels) for (const w of e.wheels) w.rotation.x += e.spd * dt * 2.2;
    if (e.flash > 0.01 || e._wasFlash) {
      for (const k in e.mats) {
        const c = e.baseCol[k];
        e.mats[k].color.setRGB(c.r + e.flash * 2, c.g + e.flash * 2, c.b + e.flash * 2);
      }
      e._wasFlash = e.flash > 0.01;
    }
  }
}

function shoot(g, e, dt, dist, nx, nz) {
  const R = e.d.ranged;
  if (!R) return;
  if (g.player.cloak && !g.decoy) return;   // pemain tidak kelihatan
  if (e.lockT > 0) return;                  // dikunci, tidak boleh menembak
  if (e.blindT > 0) return;                 // dibutakan
  if (e.burst > 0) {
    e.burstCd -= dt;
    if (e.burstCd <= 0) { e.burst--; e.burstCd = R.gap || 0.1; fireShot(g, e, R, nx, nz); }
    return;
  }
  e.shootCd -= dt * (e.jamT > 0 ? 0.5 : 1);
  if (e.shootCd <= 0 && dist < R.range) {
    e.shootCd = R.cd * rand(0.85, 1.25);
    if (R.burst) { e.burst = R.burst; e.burstCd = 0; }
    else fireShot(g, e, R, nx, nz);
  }
}

function fireShot(g, e, R, nx, nz) {
  const h = e.h * 0.7;
  const ox = e.x + nx * (e.r + 0.4), oz = e.z + nz * (e.r + 0.4), oy = e.y + h;
  // ramalan sedikit
  const p = g.decoy || g.player;
  const t = Math.hypot(p.x - ox, p.z - oz) / R.speed;
  let tx = p.x + p.vx * t * 0.45 - ox, tz = p.z + p.vz * t * 0.45 - oz;
  const ty = 0.9 - oy;
  const l = Math.hypot(tx, ty, tz) || 1;
  const dirs = R.spread3 ? [-0.16, 0, 0.16] : [0];
  for (const off of dirs) {
    const ca = Math.cos(off), sa = Math.sin(off);
    const rx = (tx / l) * ca - (tz / l) * sa, rz = (tx / l) * sa + (tz / l) * ca;
    g.spawnBullet({
      x: ox, y: oy, z: oz, vx: rx * R.speed, vy: (ty / l) * R.speed, vz: rz * R.speed,
      dmg: R.dmg * e.dmgMul, life: R.range / R.speed + 0.4, color: R.color,
      size: R.kind === 'shell' ? 0.22 : R.kind === 'plasma' ? 0.28 : 0.08,
      len: R.kind === 'bullet' ? 2.0 : 1.0, splash: R.splash || 0,
      owner: 'e', kind: R.kind,
    });
  }
  g.fx.muzzle(ox, oy, oz, nx, 0, nz, R.kind === 'shell' ? 2 : 0.8, R.color);
  if (R.kind === 'shell') { Sfx.boom(0.7); g.shake(0.3, 0.1); }
  else if (R.kind === 'plasma') Sfx.shoot('laser');
  else Sfx.shoot('smg');
}

/* ---------------- BOS ---------------- */
function bossAI(g, e, dt, dist, nx, nz) {
  const d = e.d;
  e.stateT -= dt;
  const hpFrac = e.hp / e.maxHp;
  e.phase = hpFrac < 0.35 ? 2 : hpFrac < 0.7 ? 1 : 0;
  const speed = d.spd * (1 + e.phase * 0.18);
  let mx = 0, mz = 0;

  if (d.bossKind === 'alien') {
    const keep = 26;
    const radial = clamp((dist - keep) * 0.08, -1, 1);
    mx = nx * radial - nz * 0.7; mz = nz * radial + nx * 0.7;
    e.hover = lerp(e.hover, d.fly + Math.sin(g.time * 0.8) * 0.8, dt);
    e.mesh.rotation.y += dt * 0.35;
    // serangan
    e.shootCd -= dt * (e.jamT > 0 ? 0.5 : 1);
    if (e.shootCd <= 0) {
      e.shootCd = d.ranged.cd / (1 + e.phase * 0.5);
      const n = 6 + e.phase * 3;
      const base = rand(TAU);
      for (let i = 0; i < n; i++) {
        const a = base + i / n * TAU;
        g.spawnBullet({
          x: e.x + Math.cos(a) * 3, y: e.y + 2.4, z: e.z + Math.sin(a) * 3,
          vx: Math.cos(a) * 24, vy: -3, vz: Math.sin(a) * 24,
          dmg: d.ranged.dmg * e.dmgMul, life: 3.2, color: d.ranged.color, size: 0.3, len: 1, owner: 'e', kind: 'plasma',
        });
      }
      Sfx.shoot('laser');
      // tembakan menjejak pemain
      const l = Math.hypot(nx, nz);
      g.spawnBullet({
        x: e.x, y: e.y + 1.5, z: e.z, vx: nx / l * 50, vy: -1.5, vz: nz / l * 50,
        dmg: d.ranged.dmg * 1.6 * e.dmgMul, life: 3, color: [2, 0.6, 2], size: 0.5, len: 1.2, owner: 'e', kind: 'plasma',
      });
    }
    // panggil dron
    if (e.stateT <= 0) { e.stateT = 12 - e.phase * 3; g.summon('drone', e.x, e.z, 2 + e.phase); }
  } else if (d.bossKind === 'war') {
    const keep = 30;
    const radial = clamp((dist - keep) * 0.1, -1, 1);
    mx = nx * radial - nz * 0.55; mz = nz * radial + nx * 0.55;
    if (e.turret) {
      const ta = Math.atan2(nx, nz) - e.ang;
      e.turretAng = turnTo(e.turretAng || 0, Math.atan2(Math.sin(ta), Math.cos(ta)), dt * 1.1);
    }
    e.shootCd -= dt * (e.jamT > 0 ? 0.5 : 1);
    if (e.shootCd <= 0 && dist < d.ranged.range) {
      e.shootCd = d.ranged.cd / (1 + e.phase * 0.4);
      fireShot(g, e, d.ranged, nx, nz);
      fireShot(g, e, Object.assign({}, d.ranged, { dmg: d.ranged.dmg * 0.6 }), nx, nz);
    }
    // serangan artileri
    if (e.stateT <= 0) {
      e.stateT = 9 - e.phase * 2.5;
      for (let i = 0; i < 3 + e.phase * 2; i++) {
        g.artillery(g.player.x + rand(-16, 16), g.player.z + rand(-16, 16), 1.6 + i * 0.22, 44 * e.dmgMul, 7);
      }
      Sfx.alarm();
    }
    if (e.stateT < 3 && e.phase >= 1 && !e.summoned) { e.summoned = true; }
    if (e.stateT > 6 && e.summoned) { e.summoned = false; g.summon('soldier', e.x, e.z, 3); }
  } else {
    // titan zombie: serbu + hentakan
    if (e.state === 0) {
      mx = nx; mz = nz;
      if (dist < e.r + g.player.r + 2.2) {
        e.atkCd -= dt;
        if (e.atkCd <= 0) {
          e.atkCd = d.atk;
          g.hurtTarget(d.dmg * e.dmgMul, e.x, e.z);
          g.shake(1.4, 0.3);
          g.fx.explode(e.x + nx * 3, 0.6, e.z + nz * 3, 3.2, [0.8, 1.4, 0.5], { dur: 0.4 });
        }
      }
      if (e.stateT <= 0) { e.state = 1; e.stateT = 1.1; e.flash = 0.5; }
    } else if (e.state === 1) {
      e.flash = 0.3 + Math.sin(g.time * 26) * 0.25;
      if (e.stateT <= 0) {
        e.state = 2; e.stateT = 2.4;
        // hentakan tanah
        g.shockwave(e.x, e.z, 22, 34 * e.dmgMul);
        g.fx.explode(e.x, 0.5, e.z, 9, [0.7, 1.3, 0.45], { dur: 0.8 });
        Sfx.boom(1.6);
        g.summon('runner', e.x, e.z, 3 + e.phase * 2);
      }
    } else {
      mx = nx * 2.2; mz = nz * 2.2;
      if (e.stateT <= 0) { e.state = 0; e.stateT = 6 - e.phase; }
    }
    e.walk += dt * (2 + e.spd * 0.6);
  }

  const tvx = mx * speed, tvz = mz * speed;
  const slip2 = e.slipT > 0 ? 0.1 : 1;
  e.vx = lerp(e.vx, tvx, clamp(dt * 3, 0, 1) * slip2);
  e.vz = lerp(e.vz, tvz, clamp(dt * 3, 0, 1) * slip2);
  e.x += e.vx * dt; e.z += e.vz * dt;
  e.spd = Math.hypot(e.vx, e.vz);
  e.ang = turnTo(e.ang, Math.atan2(nx, nz), dt * 1.6);
  if (!(e.liftT > 0) && !e.twist) e.y = d.fly ? e.hover : 0;
  g.clampToArena(e, e.r);

  if (e.mesh) {
    e.mesh.position.set(e.x, e.y + (d.bossKind === 'zombie' ? Math.abs(Math.sin(e.walk)) * 0.18 : 0), e.z);
    if (d.bossKind !== 'alien') e.mesh.rotation.y = e.ang;
    if (e.turret) e.turret.rotation.y = e.turretAng || 0;
    for (const k in e.mats) {
      const c = e.baseCol[k];
      const pulse = k === 'glow' ? 0.4 + Math.sin(g.time * 4) * 0.2 * (e.phase + 1) : 0;
      e.mats[k].color.setRGB(c.r + e.flash * 2 + pulse, c.g + e.flash * 2, c.b + e.flash * 2);
    }
  }
}

export { rand as _rand };

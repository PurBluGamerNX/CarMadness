// systems2.js — sistem berterusan untuk 10 kereta & 10 senjata baharu (2026-10-17).
// Dicampur ke dalam objek Game (main.js: Object.assign(Game, SYS2)), jadi
// `this` di sini ialah Game. Semua dipanggil dari SATU tempat: update2().
import * as THREE from 'three';
import { rand, clamp, lerp, TAU, PI, Sfx } from './core.js';
import { HALF } from './world.js';
import { CRYS3, CRYS_Y } from './models2.js';
import { lashTube, fillTube, qb, cb, sstep, s5, LN } from './weapons2.js';
// fasa sinar Solar Guide (saat) - perlahan & licin (Nabil 2026-10-19)
const CB = { GO: 1.15, MERGE: 0.7 };   // GO = satu luncuran berterusan matahari -> sasaran

const UIx = () => window.UI;
const segDist = (px, pz, ax, az, bx, bz) => {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1e-6;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / l2, 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
};
const addMat = (hex, op = 0.9) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
const glow = (hex, k = 2.4) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(0.25), emissive: new THREE.Color(hex), emissiveIntensity: k, roughness: 0.35 });

let GEO = null;
function geo() {
  if (GEO) return GEO;
  GEO = {
    arc: new THREE.TorusGeometry(0.95, 0.12, 6, 20, PI * 1.25),
    sph: new THREE.SphereGeometry(1, 10, 8),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
    spike: new THREE.ConeGeometry(0.22, 0.7, 4),
    ico: new THREE.IcosahedronGeometry(1, 0),
    ring: new THREE.RingGeometry(0.9, 1, 48),
    disc: new THREE.CircleGeometry(1, 40),
    box: new THREE.BoxGeometry(1, 1, 1),
    bee: new THREE.SphereGeometry(0.16, 6, 4),
    torus: new THREE.TorusGeometry(0.95, 0.13, 10, 40),
  };
  return GEO;
}

export const SYS2 = {
  /* ======================= kitaran ======================= */
  update2(dt) {
    const p = this.player;
    if (!p) return;
    p.inSanct = false; p.zoneRof = 1;
    this.updateSanctuary(dt);
    this.updateFlairFx(dt);
    this.updateRifts(dt);
    this.updateSpines(dt);
    this.updateStings(dt);
    this.updateRods(dt);
    this.updateLanterns(dt);
    this.updatePylons(dt);
    this.updateNotes(dt);
    this.updateFrozen(dt);
    this._abCtx = (this._abCtx || 0) + 1;
    this.updateDash(dt);
    this.updateHop(dt);
    this.updateHaloObj(dt);
    this._abCtx--;
    this.renderBees(dt);
    this.updatePreyMark(dt);
    this.renderFlail();
    this.renderGlaives(dt);
    this._abCtx = (this._abCtx || 0) + 1;
    this.updateCondor(dt);
    this.updateCubes(dt);
    this._abCtx--;
    this.updateSlip(dt);
    if (p.swapInv > 0) { p.swapInv -= dt; if (p.swapInv <= 0) p.invuln = false; }
  },

  clear2() {
    const rm = o => o && this.scene.remove(o);
    for (const k of ['rifts', 'stings', 'rods', 'lanterns', 'pylons', 'sancts']) {
      for (const o of this[k] || []) { rm(o.mesh); rm(o.mesh2); }
      this[k] = [];
    }
    this.spines = [];
    for (const k of ['spineMesh', 'beeMesh', 'preyMark', 'flailMesh', 'glaiveMesh', 'iceMesh', 'rayMesh', 'rayCore', 'cubeMesh']) { rm(this[k]); this[k] = null; }
    if (this.halo) { rm(this.halo.mesh); this.halo = null; }
    this.noted = new Set();
  },

  /* ======================= peluru: gerak / kena / mati ======================= */
  bulletTick2(b, dt) {
    if (b.glaive) {
      const G = b.glaive, p = this.player;
      if (!G.back) {
        // lengkung: putar halaju ke arah sisi bilah
        const w = G.side * 1.55 * dt, c = Math.cos(w), s = Math.sin(w);
        const vx = b.vx * c - b.vz * s, vz = b.vx * s + b.vz * c;
        b.vx = vx; b.vz = vz;
        G.gone += G.sp * dt;
        if (G.gone >= G.out) this.glaiveTurn(b);
      } else {
        const hx = p.x - b.x, hz = p.z - b.z, d = Math.hypot(hx, hz) || 1;
        const sp = G.sp * 1.25, k = Math.min(1, dt * 5);
        b.vx = lerp(b.vx, hx / d * sp, k); b.vz = lerp(b.vz, hz / d * sp, k);
        b.vy = (1.5 - b.y) * 4;
        if (d < 2.8 && !p.dead) {
          const sl = G.slot;
          if (sl && sl.reload <= 0 && sl.mag < sl.st.mag) { sl.mag++; Sfx.tone(1300, 0.08, 'triangle', 0.1, 1700); }
          this.fx.spark(b.x, b.y, b.z, 6, b.color, { speed: 3, size: 0.25, life: 0.25 });
          b.life = 0; b.caught = true;
        }
      }
      if (Math.random() < 0.6) this.fx.add.emit(b.x, b.y, b.z, 0, 0, 0, { color: b.color, color2: [0.1, 0.4, 0.3], size: 0.5, size2: 0.05, life: 0.18, drag: 0 });
    }
    if (b.sting && Math.random() < 0.5) this.fx.add.emit(b.x, b.y, b.z, 0, 0, 0, { color: [2.2, 1.7, 0.3], color2: [0.5, 0.3, 0], size: 0.2, size2: 0.02, life: 0.15, drag: 0 });
    if (b.jav && Math.random() < 0.6) this.fx.add.emit(b.x + rand(-0.3, 0.3), b.y, b.z + rand(-0.3, 0.3), rand(-2, 2), rand(-2, 2), rand(-2, 2),
      { color: [1.2, 2.4, 0.6], color2: [0.2, 0.6, 0.1], size: 0.18, size2: 0.02, life: 0.15, drag: 2 });
    if (b.rime && Math.random() < 0.35) this.fx.add.emit(b.x, b.y, b.z, 0, -0.5, 0, { color: [0.8, 1.7, 2.6], color2: [0.3, 0.5, 0.9], size: 0.2, size2: 0.05, life: 0.3, drag: 1 });
    if (b.chime && Math.random() < 0.5) this.fx.add.emit(b.x, b.y, b.z, 0, 0.6, 0, { color: [2.2, 2.0, 1.1], color2: [0.6, 0.5, 0.2], size: 0.36, size2: 0.04, life: 0.25, drag: 0 });
    // Breeze: peluru berpandu naik dahulu, kemudian menjunam ke sasaran
    if (b.bz) this.steerSalvo(b, dt);
    // Diamond: bolt blaster meninggalkan jejak cahaya pendek berkilau
    if (b.diamond && Math.random() < 0.8) this.fx.add.emit(b.x, b.y, b.z, rand(-0.4, 0.4), rand(-0.4, 0.4), rand(-0.4, 0.4),
      { color: [2.2, 2.6, 2.8], color2: [0.2, 0.6, 0.9], size: 0.3, size2: 0.03, life: 0.16, drag: 1 });
    // Gale Hammer: pusaran udara berpusing mengelilingi peluru
    if (b.gale) {
      const a = b.t * 22, hl = Math.hypot(b.vx, b.vz) || 1, nx = -b.vz / hl, nz = b.vx / hl, r = 0.55;
      for (const k of [0, PI]) {
        const c = Math.cos(a + k), sn = Math.sin(a + k);
        this.fx.add.emit(b.x + nx * c * r, b.y + sn * r, b.z + nz * c * r, nx * c * 2, sn * 2, nz * c * 2,
          { color: k ? [0.6, 0.6, 0.65] : [2.6, 0.55, 0.3], color2: [0.15, 0.1, 0.1], size: 0.28, size2: 0.05, life: 0.3, drag: 2, alpha: 0.7 });
      }
    }
    if (b.fork && Math.random() < 0.4) this.fx.add.emit(b.x, b.y, b.z, rand(-1, 1), rand(-1, 1), rand(-1, 1), { color: [2.4, 0.6, 0.4], color2: [0.6, 0.1, 0.05], size: 0.2, size2: 0.02, life: 0.12, drag: 2 });
  },
  glaiveTurn(b) {
    const G = b.glaive;
    if (G.back) return;
    G.back = true; b.hits = null; b.dmg *= G.retMul; b.life = Math.max(b.life, 3);
    Sfx.tone(700, 0.12, 'triangle', 0.08, 380);
  },

  bulletHit2(b, e) {
    b._hitE = e;
    if (b.diamond) { this.diamondHit(b, e); return; }
    if (b.iceShell) { this.iceBurst(b, e); b.iceShell = null; return; }
    if (b.bz) { b.dmg = 0; return; }             // peluru salvo hanya mencederakan sasarannya sendiri (bzImpact)
    if (b.jav) { this.spawnRod(b, e); b.jav = null; return; }
    if (b.sting) { this.stickSting(e, null, b); b.sting = null; return; }
    if (b.chime) { this.ringNote(e, b); return; }
    if (b.rime) { this.addFrost(e, b); return; }
    if (b.fork && b.fork.gen > 0) { this.splitFork(b, e); return; }
  },

  bulletDie2(b) {
    if (b.gale) { this.galeBurst(b); b.gale = null; }
    if (b.iceShell) { this.iceBurst(b, null); b.iceShell = null; }
    if (b.jav) this.spawnRod(b, null);
    if (b.sting) this.stickSting(null, { x: b.x, z: b.z }, b);
    if (b.spine) this.spawnSpines(b.x, b.z, b.spine, b.color);
  },

  /* ======================= senjata ======================= */
  /* Fork Bolt: pecah kepada beberapa bolt kecil ke musuh terdekat lain */
  splitFork(b, e) {
    const F = b.fork, hit = F.hit.concat([e]);
    const tg = this.enemies.filter(o => !o.dead && !hit.includes(o) && Math.hypot(o.x - e.x, o.z - e.z) < 17)
      .sort((a, c) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(c.x - e.x, c.z - e.z)).slice(0, F.n);
    const y = e.y + e.h * 0.6;
    this.fx.flash(e.x, y, e.z, b.color, 8, 0.1, 16);
    for (const t of tg) {
      const dx = t.x - e.x, dy = (t.y + t.h * 0.5) - y, dz = t.z - e.z, l = Math.hypot(dx, dy, dz) || 1;
      this.spawnBullet({
        x: e.x + dx / l * 1.2, y, z: e.z + dz / l * 1.2, vx: dx / l * 120, vy: dy / l * 120, vz: dz / l * 120,
        dmg: b.dmg * 0.55, life: 0.4, pierce: 0, knock: 2, color: b.color, size: 0.09, len: 1.8, owner: 'p',
        k2: 'fork', fork: { n: F.n, gen: F.gen - 1, hit }, flags: null,
      });
      this.fx.lightning(e.x, y, e.z, e.x + dx / l * 3, y + dy / l * 3, e.z + dz / l * 3, b.color, 2);
    }
    if (tg.length) Sfx.tone(rand(1400, 1700), 0.06, 'sawtooth', 0.06, 900);
  },

  /* Stinger Pod: penyengat melekat, semua pada sasaran sama meletup serentak */
  stickSting(e, at, b) {
    const S = b.sting;
    this.stings = this.stings || [];
    let st = e && this.stings.find(s => s.e === e);
    if (!st) {
      st = { e, x: e ? e.x : at.x, z: e ? e.z : at.z, y: e ? e.y + e.h : 0.4, n: 0, dmg: 0, r: S.r, t: S.fuse, blink: 0 };
      this.stings.push(st);
    }
    st.n++; st.dmg += S.dmg;
    this.fx.spark(st.x, st.y, st.z, 4, [2.3, 1.8, 0.3], { speed: 3, size: 0.2, life: 0.2 });
    Sfx.tone(1900, 0.04, 'square', 0.05);
  },
  updateStings(dt) {
    const L = this.stings || [];
    for (let i = L.length - 1; i >= 0; i--) {
      const s = L[i];
      if (s.e && !s.e.dead) { s.x = s.e.x; s.z = s.e.z; s.y = s.e.y + s.e.h * 0.8; }
      s.t -= dt; s.blink -= dt;
      if (s.blink <= 0) {
        s.blink = s.t > 0.8 ? 0.3 : 0.09;
        this.fx.add.emit(s.x, s.y + 0.3, s.z, 0, 0, 0, { color: [2.6, 0.5 + s.n * 0.2, 0.2], color2: [0.6, 0.1, 0], size: 0.5 + s.n * 0.15, size2: 0.1, life: 0.12, drag: 0 });
        if (s.t < 1.2) Sfx.tone(2200, 0.03, 'square', 0.04);
      }
      if (s.t <= 0) {
        // bonus tindanan dihadkan pada 5 penyengat, kalau tidak satu sasaran jadi bom nuklear
        const m = Math.min(s.n, 5) - 1, k = 1 + 0.12 * m;
        this.explodeAt(s.x, s.y - 0.4, s.z, s.r * (1 + 0.08 * m), s.dmg * k);
        if (s.n > 1) UIx() && s.n >= 3 && UIx().toast(`STINGER x${s.n}`);
        L.splice(i, 1);
      }
    }
  },

  /* Storm Javelin: rod kilat di tubuh musuh atau di tanah */
  spawnRod(b, e) {
    const J = b.jav, G = geo();
    const m = new THREE.Group();
    const shaft = new THREE.Mesh(G.cyl, new THREE.MeshStandardMaterial({ color: 0x2a2d30, metalness: 0.8, roughness: 0.3 }));
    shaft.scale.set(0.16, 3.0, 0.16); shaft.position.y = 1.2; m.add(shaft);
    const tip = new THREE.Mesh(G.sph, glow('#a8ff3a', 2.6));
    tip.scale.setScalar(0.28); tip.position.y = 2.75; m.add(tip);
    m.rotation.set(rand(-0.25, 0.25), 0, rand(-0.25, 0.25));
    this.scene.add(m);
    (this.rods = this.rods || []).push({ e: e && !e.dead ? e : null, x: e ? e.x : b.x, z: e ? e.z : b.z, t: J.t, acc: 0.25, r: J.r, zap: J.zap, jump: J.jump, mesh: m, tip });
    Sfx.tone(140, 0.2, 'square', 0.18, 60);
  },
  updateRods(dt) {
    const L = this.rods || [];
    for (let i = L.length - 1; i >= 0; i--) {
      const R = L[i];
      if (R.e && R.e.dead) R.e = null;
      if (R.e) { R.x = R.e.x; R.z = R.e.z; }
      const by = R.e ? R.e.y + R.e.h * 0.4 : 0;
      R.mesh.position.set(R.x, by, R.z);
      R.tip.scale.setScalar(0.28 + Math.sin(this.time * 20) * 0.05);
      R.t -= dt; R.acc -= dt;
      if (R.acc <= 0) {
        R.acc = 0.5;
        const ty = by + 2.8;
        const hit = [];
        if (R.e) hit.push(R.e);
        while (hit.length < 2) { const o = this.nearestEnemy(R.x, R.z, R.r, hit); if (!o) break; hit.push(o); }
        for (const o of hit) {
          this.fx.lightning(R.x, ty, R.z, o.x, o.y + o.h * 0.5, o.z, [1.2, 2.4, 0.6], 5);
          o.lastHitBy = 'player';
          this.damageEnemy(o, R.zap, o.x - R.x, 0, o.z - R.z, 2, 'tesla');
          if (R.jump) {
            const n = this.nearestEnemy(o.x, o.z, 7, hit);
            if (n) { this.fx.lightning(o.x, o.y + o.h * 0.5, o.z, n.x, n.y + n.h * 0.5, n.z, [1.2, 2.4, 0.6], 4); this.damageEnemy(n, R.zap * 0.7, 0, 0, 0, 1, 'tesla'); }
          }
        }
        if (hit.length) Sfx.shoot('tesla');
      }
      if (R.t <= 0) { this.scene.remove(R.mesh); this.fx.spark(R.x, by + 2, R.z, 8, [1.2, 2.4, 0.6], { speed: 4 }); L.splice(i, 1); }
    }
  },

  /* Echo Chime: nota pada musuh; nota ketiga = resonans */
  ringNote(e, b) {
    const C = b.chime;
    if (!(e.noteEnd > this.time)) e.notes = 0;
    e.notes = (e.notes || 0) + 1;
    e.noteEnd = this.time + C.T;
    (this.noted || (this.noted = new Set())).add(e);
    Sfx.tone(660 * Math.pow(1.26, e.notes - 1), 0.25, 'sine', 0.1, null);
    if (e.notes >= 3) {
      e.notes = 0; e.noteEnd = 0;
      const big = b.dmg * C.mul;
      const y = e.y + e.h * 0.6;
      this.fx.abilityRing(e.x, e.z, [2.2, 2.0, 1.1], 1, C.r * 1.2, 0.4);
      this.fx.flash(e.x, y, e.z, [2.2, 2.0, 1.1], 18, 0.2, 30);
      this.fx.spark(e.x, y, e.z, 16, [2.2, 2.0, 1.1], { speed: 9, size: 0.35, life: 0.4 });
      for (const f of [660, 830, 990]) Sfx.tone(f, 0.6, 'sine', 0.1, null);
      e.lastHitBy = 'player';
      this.damageEnemy(e, big, 0, 0, 0, 8, 'boom');
      this.neighbors(e.x, e.z, C.r + 2, e, (o, dx, dz, d) => {
        if (d > C.r + o.r) return;
        this.damageEnemy(o, big * 0.45, -dx, 0, -dz, 6, 'boom');
      });
    }
  },
  updateNotes() {
    if (!this.noted || !this.noted.size) return;
    this._noteT = (this._noteT || 0) + 1;
    if (this._noteT % 3) return;
    for (const e of this.noted) {
      if (e.dead || !(e.noteEnd > this.time) || !e.notes) { this.noted.delete(e); continue; }
      for (let k = 0; k < e.notes; k++) {
        const a = this.time * 4 + k * TAU / 3;
        this.fx.add.emit(e.x + Math.cos(a) * (e.r + 0.6), e.y + e.h + 0.5, e.z + Math.sin(a) * (e.r + 0.6), 0, 0, 0,
          { color: [2.2, 2.0, 1.1], color2: [0.5, 0.4, 0.1], size: 0.42, size2: 0.2, life: 0.12, drag: 0 });
      }
    }
  },

  /* Rime Scatter: fros -> beku -> pecah */
  addFrost(e, b) {
    const R = b.rime;
    if (e.frozenT > 0) { if (this.time - e.frozenAt > 0.25) this.shatter(e); return; }
    if (this.time - (e.frostAt || 0) > 3) e.frost = 0;
    e.frost = (e.frost || 0) + 1; e.frostAt = this.time;
    e.slowT = Math.max(e.slowT || 0, 0.8);
    if (e.frost >= R.need) {
      e.frost = 0;
      e.shatterDmg = b.dmg * 30; e.shatterR = R.r;
      if (e.d.boss) { e.slowT = Math.max(e.slowT, 2.5); return; }
      e.frozenT = 2.5; e.frozenAt = this.time;
      e.lockT = Math.max(e.lockT || 0, 2.5);
      this.fx.spark(e.x, e.y + e.h * 0.5, e.z, 12, [0.8, 1.8, 2.6], { speed: 5, size: 0.3, life: 0.4 });
      Sfx.tone(1800, 0.3, 'sine', 0.12, 2600); Sfx.noise(0.2, 0.2, 5000, 2, 0, 'highpass');
    }
  },
  shatter(e) {
    if (!(e.frozenT > 0)) return;
    e.frozenT = 0; e.lockT = Math.min(e.lockT || 0, 0.1);
    const dmg = e.shatterDmg || 200, R = e.shatterR || 4.4, y = e.y + e.h * 0.5;
    this.fx.explode(e.x, y, e.z, R * 0.6, [0.8, 1.7, 2.6], { dur: 0.4 });
    for (let i = 0; i < 18; i++) {
      const a = rand(TAU);
      this.fx.add.emit(e.x, y, e.z, Math.cos(a) * rand(6, 14), rand(2, 8), Math.sin(a) * rand(6, 14),
        { color: [0.9, 1.9, 2.8], color2: [0.3, 0.5, 0.9], size: 0.35, size2: 0.05, life: 0.5, drag: 1.5, grav: -14, ground: true });
    }
    Sfx.noise(0.4, 0.5, 6000, 1.5, 0, 'highpass'); Sfx.tone(2400, 0.3, 'triangle', 0.14, 600);
    e.lastHitBy = 'player';
    this.damageEnemy(e, dmg, 0, 0, 0, 6, 'boom');
    this.neighbors(e.x, e.z, R + 2, e, (o, dx, dz, d) => {
      if (d > R + o.r) return;
      this.damageEnemy(o, dmg * 0.5, -dx, 0, -dz, 6, 'boom');
      o.slowT = Math.max(o.slowT || 0, 2);
    });
  },
  updateFrozen(dt) {
    const G = geo();
    if (!this.iceMesh) {
      const m = new THREE.InstancedMesh(G.ico, new THREE.MeshStandardMaterial({ color: 0x9fe4ff, emissive: 0x2a6a9a, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2 }), 40);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
      this.scene.add(m); this.iceMesh = m; this._d2 = new THREE.Object3D();
    }
    let n = 0;
    const d = this._d2;
    for (const e of this.enemies) {
      if (!(e.frozenT > 0)) continue;
      e.frozenT -= dt;
      if (e.frozenT > 0) e.lockT = Math.max(e.lockT || 0, 0.12);
      if (n >= 40) continue;
      d.position.set(e.x, e.y + e.h * 0.5, e.z);
      d.rotation.set(0.3, e.x, 0.2);
      d.scale.set(e.r * 1.25 + 0.4, e.h * 0.75 + 0.3, e.r * 1.25 + 0.4);
      d.updateMatrix(); this.iceMesh.setMatrixAt(n++, d.matrix);
    }
    this.iceMesh.count = n;
    this.iceMesh.instanceMatrix.needsUpdate = true;
  },

  /* Rift Maul: retakan menjalar sepanjang tanah */
  spawnRift(x, z, dx, dz, s) {
    const max = Math.min(s.range, this.wallDist(x, z, dx, dz, s.range, 0.6) + 0.5);
    (this.rifts = this.rifts || []).push({ x, z, dx, dz, dist: 1.5, max, w: s.riftW, dmg: s.dmg, knock: s.knock, hit: new Set(), lava: s.lava, step: 0, lavaStep: 0, sp: 36 });
  },
  updateRifts(dt) {
    const L = this.rifts || [];
    for (let i = L.length - 1; i >= 0; i--) {
      const R = L[i];
      const d0 = R.dist;
      R.dist = Math.min(R.max, R.dist + R.sp * dt);
      const x = R.x + R.dx * R.dist, z = R.z + R.dz * R.dist;
      R.step += R.dist - d0; R.lavaStep += R.dist - d0;
      while (R.step > 1.2) {
        R.step -= 1.2;
        this.fx.decal('scorch', x + rand(-0.3, 0.3), z + rand(-0.3, 0.3), R.w * 0.9);
        for (let k = 0; k < 4; k++) this.fx.add.emit(x + rand(-R.w, R.w) * 0.4, 0.3, z + rand(-R.w, R.w) * 0.4, rand(-2, 2), rand(5, 11), rand(-2, 2),
          { color: [2.3, 1.0, 0.3], color2: [0.6, 0.15, 0.05], size: rand(0.3, 0.6), size2: 0.05, life: 0.5, drag: 1, grav: -16, ground: true });
        this.fx.smoke(x, 0.3, z, 1, { speed: 1.5, size: 1.1, life: 0.7, alpha: 0.45, color: [0.3, 0.24, 0.2] });
      }
      if (R.lava && R.lavaStep > 2.4) { R.lavaStep = 0; this.spawnHazard('fire', x, z, R.w * 0.8, 8 + this.wave * 1.2, 4); }
      this.neighbors(x, z, R.w + 3, null, (e, ddx, ddz, dd) => {
        if (R.hit.has(e) || dd > R.w + e.r) return;
        if (e.d.fly && e.y > 3) return;
        R.hit.add(e);
        e.lastHitBy = 'player';
        this.damageEnemy(e, R.dmg, R.dx, 0, R.dz, R.knock, 'boom', this.curFlags);
        if (!e.d.boss && !e.dead) this.liftEnemy(e, 0.7);
      });
      if (R.dist >= R.max) { this.fx.explode(x, 0.5, z, R.w * 0.8, [2.0, 0.8, 0.3], { dur: 0.35 }); L.splice(i, 1); }
    }
  },

  /* Spine Mortar: duri di tanah */
  spawnSpines(x, z, S, col) {
    const L = this.spines || (this.spines = []);
    for (let i = 0; i < S.n; i++) {
      const a = i / S.n * TAU + rand(-0.2, 0.2), r = rand(1.8, 5.2);
      const sx = clamp(x + Math.cos(a) * r, -HALF + 2, HALF - 2), sz = clamp(z + Math.sin(a) * r, -HALF + 2, HALF - 2);
      L.push({ x: sx, z: sz, t: 9, dmg: S.dmg, boom: S.boom, rot: rand(TAU) });
      this.fx.add.emit(sx, 0.4, sz, 0, 2, 0, { color: col, color2: [0.5, 0.3, 0.05], size: 0.4, size2: 0.05, life: 0.3, drag: 2 });
    }
    while (L.length > 140) L.shift();
    this.fx.explode(x, 2.2, z, 2.2, [2.1, 1.4, 0.5], { dur: 0.3 });
    Sfx.noise(0.25, 0.3, 3000, 1.4);
  },
  updateSpines(dt) {
    const L = this.spines || [];
    const G = geo();
    if (!this.spineMesh) {
      const m = new THREE.InstancedMesh(G.spike, new THREE.MeshStandardMaterial({ color: 0xc9a060, metalness: 0.7, roughness: 0.3, emissive: 0x5a3008, emissiveIntensity: 0.6 }), 140);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.castShadow = true;
      this.scene.add(m); this.spineMesh = m; this._d3 = new THREE.Object3D();
    }
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const s = L[i];
      s.t -= dt;
      let used = s.t <= 0;
      if (!used) this.neighbors(s.x, s.z, 3, null, (e, dx, dz, d) => {
        if (used || d > 0.9 + e.r * 0.6 || (e.d.fly && e.y > 1.5)) return;
        used = true;
        e.lastHitBy = 'player';
        this.damageEnemy(e, s.dmg, 0, 0, 0, 1, 'bullet');
        e.slowT = Math.max(e.slowT || 0, 2.2);
        this.fx.spark(s.x, 0.6, s.z, 5, [2.1, 1.4, 0.5], { speed: 4, size: 0.25, life: 0.25 });
        if (s.boom) this.splash(s.x, 0.5, s.z, 2.6, s.dmg * 0.8, [2.1, 1.2, 0.4]);
      });
      if (used) { L.splice(i, 1); continue; }
    }
    const d = this._d3;
    for (const s of L) {
      if (n >= 140) break;
      d.position.set(s.x, 0.3, s.z); d.rotation.set(0.25, s.rot, 0.15); d.scale.setScalar(s.t < 1 ? s.t : 1);
      d.updateMatrix(); this.spineMesh.setMatrixAt(n++, d.matrix);
    }
    this.spineMesh.count = n;
    this.spineMesh.instanceMatrix.needsUpdate = true;
  },

  /* Sun Lantern */
  spawnLantern(ox, oy, oz, tx, tz, s, col) {
    const G = geo();
    const m = new THREE.Group();
    const core = new THREE.Mesh(G.sph, addMat(0xffc860, 0.95)); core.scale.setScalar(0.65); m.add(core);
    const cage = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: 0x6a4a1a, wireframe: true })); cage.scale.setScalar(0.85); m.add(cage);
    const halo = new THREE.Mesh(G.sph, addMat(0xff9a30, 0.25)); halo.scale.setScalar(1.6); m.add(halo);
    m.position.set(ox, oy, oz);
    this.scene.add(m);
    (this.lanterns = this.lanterns || []).push({ x0: ox, y0: oy, z0: oz, x: tx, z: tz, t: 0, fly: 0.75, hang: s.hang, beams: Math.round(s.pellets), fired: 0, dmg: s.dmg, ignite: s.ignite, mesh: m, halo });
  },
  updateLanterns(dt) {
    const L = this.lanterns || [];
    for (let i = L.length - 1; i >= 0; i--) {
      const o = L[i];
      o.t += dt;
      const H = 10;
      if (o.t < o.fly) {
        const u = o.t / o.fly;
        o.mesh.position.set(lerp(o.x0, o.x, u), lerp(o.y0, H, Math.sqrt(u)) + Math.sin(u * PI) * 2, lerp(o.z0, o.z, u));
        continue;
      }
      const ht = o.t - o.fly;
      o.mesh.position.set(o.x + Math.sin(this.time * 2) * 0.3, H + Math.sin(this.time * 3) * 0.25, o.z);
      o.halo.scale.setScalar(1.6 + Math.sin(this.time * 10) * 0.2);
      const want = Math.min(o.beams, Math.floor(ht / (o.hang / o.beams)) + 1);
      while (o.fired < want) {
        o.fired++;
        const cand = this.enemies.filter(e => !e.dead && Math.hypot(e.x - o.x, e.z - o.z) < 11);
        const e = cand.length ? cand[(Math.random() * cand.length) | 0] : null;
        const ex = e ? e.x : o.x + rand(-8, 8), ez = e ? e.z : o.z + rand(-8, 8), ey = e ? e.y + e.h * 0.5 : 0.2;
        const lx = o.mesh.position.x, ly = o.mesh.position.y, lz = o.mesh.position.z;
        this.fx.beam(lx, ly, lz, ex, ey, ez, [2.4, 1.7, 0.6], 0.35, 0.18);
        this.fx.beam(lx, ly, lz, ex, ey, ez, [2.6, 2.4, 1.6], 0.1, 0.2);
        this.fx.spark(ex, ey, ez, 6, [2.4, 1.7, 0.6], { speed: 5, size: 0.3, life: 0.3 });
        if (!e) this.fx.decal('scorch', ex, ez, 1.4);
        if (e) {
          e.lastHitBy = 'player';
          this.damageEnemy(e, o.dmg, 0, -1, 0, 2, 'laser');
          if (o.ignite) { e.burnT = Math.max(e.burnT || 0, 3); e.burnDmg = Math.max(e.burnDmg || 0, o.dmg * 0.6); }
        }
        Sfx.tone(rand(900, 1200), 0.08, 'sine', 0.06, 400);
      }
      if (ht >= o.hang) {
        this.fx.explode(o.mesh.position.x, H, o.z, 4, [2.4, 1.7, 0.6], { dur: 0.4 });
        for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - o.x, e.z - o.z) < 11) e.blindT = Math.max(e.blindT || 0, 1.2);
        this.scene.remove(o.mesh); L.splice(i, 1);
      }
    }
  },

  /* Laser Fence: tiang + pagar */
  spawnPylon(ox, oy, oz, tx, tz, s, col, owner) {
    const G = geo();
    const m = new THREE.Group();
    const post = new THREE.Mesh(G.cyl, new THREE.MeshStandardMaterial({ color: 0x2a3036, metalness: 0.8, roughness: 0.35 }));
    post.scale.set(0.3, 2.6, 0.3); post.position.y = 1.3; m.add(post);
    const cap = new THREE.Mesh(G.sph, glow('#57e0ff', 2.8)); cap.scale.setScalar(0.32); cap.position.y = 2.7; m.add(cap);
    const mid = new THREE.Mesh(G.torus, glow('#57e0ff', 2.0)); mid.scale.setScalar(0.32); mid.rotation.x = PI / 2; mid.position.y = 1.0; m.add(mid);
    m.position.set(ox, oy, oz);
    this.scene.add(m);
    const L = this.pylons || (this.pylons = []);
    /* setiap senjata (slot) ada set tiangnya sendiri; tiang lebihan membuang yang paling lama */
    L.push({ x0: ox, y0: oy, z0: oz, x: tx, z: tz, t: 0, fly: 0.45, life: s.postT, landed: false, mesh: m, dmg: s.dmg, stun: s.fenceStun, link: null, owner });
    const mine = L.filter(q => q.owner === owner);
    while (mine.length > s.posts) this.removePylon(mine.shift());
  },
  removePylon(o) {
    const L = this.pylons || [];
    this.scene.remove(o.mesh); if (o.mesh2) this.scene.remove(o.mesh2);
    for (const q of L) if (q.link === o) { q.link = null; if (q.mesh2) { this.scene.remove(q.mesh2); q.mesh2 = null; } }
    const i = L.indexOf(o); if (i >= 0) L.splice(i, 1);
  },
  updatePylons(dt) {
    const L = this.pylons || [];
    const G = geo();
    for (let i = L.length - 1; i >= 0; i--) {
      const o = L[i];
      o.t += dt;
      if (!o.landed) {
        const u = Math.min(1, o.t / o.fly);
        o.mesh.position.set(lerp(o.x0, o.x, u), lerp(o.y0, 0, u) + Math.sin(u * PI) * 4, lerp(o.z0, o.z, u));
        if (u >= 1) {
          o.landed = true; o.mesh.position.set(o.x, 0, o.z);
          this.fx.spark(o.x, 0.4, o.z, 8, [0.5, 2.0, 2.4], { speed: 4, size: 0.3 });
          Sfx.tone(300, 0.12, 'square', 0.1, 140);
          // sambung ke tiang mendarat sebelumnya
          // sambung ke tiang sebelumnya dari senjata YANG SAMA - tiada had jarak
          const prev = L.slice(0, i).reverse().find(q => q.landed && q.owner === o.owner);
          if (prev && Math.hypot(prev.x - o.x, prev.z - o.z) > 0.5) {
            o.link = prev;
            const g2 = new THREE.Group();
            for (const y of [0.9, 1.9]) {
              const w = new THREE.Mesh(G.cyl, addMat(0x57e0ff, 0.85));
              const len = Math.hypot(prev.x - o.x, prev.z - o.z);
              w.scale.set(0.1, len, 0.1); w.rotation.z = PI / 2;
              w.position.set(0, y, 0); g2.add(w);
            }
            g2.position.set((prev.x + o.x) / 2, 0, (prev.z + o.z) / 2);
            g2.rotation.y = Math.atan2(prev.z - o.z, o.x - prev.x) * -1 + 0;
            g2.rotation.y = -Math.atan2(prev.z - o.z, prev.x - o.x);
            this.scene.add(g2); o.mesh2 = g2;
          }
        }
        continue;
      }
      o.life -= dt;
      if (o.mesh2) o.mesh2.children.forEach((w, k) => { w.material.opacity = 0.6 + Math.sin(this.time * 30 + k) * 0.25; });
      if (o.link && (!L.includes(o.link))) { o.link = null; if (o.mesh2) { this.scene.remove(o.mesh2); o.mesh2 = null; } }
      if (o.life <= 0) this.removePylon(o);
    }
    // kerosakan sentuhan pagar
    this._fenceT = (this._fenceT || 0) - dt;
    if (this._fenceT > 0) return;
    this._fenceT = 0.2;
    for (const o of L) {
      if (!o.link) continue;
      const a = o.link;
      for (const e of this.enemies) {
        if (e.dead || (e.d.fly && e.y > 2.6)) continue;
        if (segDist(e.x, e.z, o.x, o.z, a.x, a.z) > e.r + 0.5) continue;
        e.lastHitBy = 'player';
        this.damageEnemy(e, o.dmg * 0.2, 0, 0, 0, 0, 'laser');
        e.slowT = Math.max(e.slowT || 0, 0.6);
        if (o.stun && !(e.fenceStun > this.time) && !e.d.boss) { e.fenceStun = this.time + 2; e.lockT = Math.max(e.lockT || 0, 0.6); }
        this.fx.spark(e.x, 1.4, e.z, 3, [0.5, 2.0, 2.4], { speed: 4, size: 0.25, life: 0.2 });
      }
    }
  },

  /* bilah Crescent Glaive (sabit berputar) */
  renderGlaives(dt) {
    const G = geo();
    if (!this.glaiveMesh) {
      const m = new THREE.InstancedMesh(G.arc, addMat(0xffffff, 1), 16);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
      m.setColorAt(0, new THREE.Color(1, 1, 1));
      this.scene.add(m); this.glaiveMesh = m; this._d4 = new THREE.Object3D(); this._c4 = new THREE.Color();
    }
    let n = 0;
    const d = this._d4;
    for (const b of this.bullets) {
      if (!b.glaive || n >= 16) continue;
      b.spin = (b.spin || 0) + dt * 18;
      d.position.set(b.x, b.y, b.z); d.rotation.set(PI / 2, 0, b.spin); d.scale.setScalar(0.95);
      d.updateMatrix(); this.glaiveMesh.setMatrixAt(n, d.matrix);
      this._c4.setRGB(b.color[0], b.color[1], b.color[2]); this.glaiveMesh.setColorAt(n, this._c4);
      n++;
    }
    this.glaiveMesh.count = n;
    this.glaiveMesh.instanceMatrix.needsUpdate = true;
    if (this.glaiveMesh.instanceColor) this.glaiveMesh.instanceColor.needsUpdate = true;
  },

  /* ======================= kebolehan ======================= */
  /* HELIX: duri balas. Penyerang = musuh terdekat dengan punca kerosakan */
  thornBack(d, sx, sz) {
    const p = this.player;
    p.thornAcc = (p.thornAcc || 0) + d;
    if (this.time - (p.thornT || 0) < 0.14) return;
    p.thornT = this.time;
    let t = (sx !== undefined) ? this.nearestEnemy(sx, sz, 8) : null;
    if (!t) t = this.nearestEnemy(p.x, p.z, 60);
    if (!t) return;
    const dmg = 90 + this.wave * 8 + p.thornAcc * 2;
    p.thornAcc = 0;
    const ox = p.x, oy = 4.2, oz = p.z;
    const dx = t.x - ox, dy = (t.y + t.h * 0.5) - oy, dz = t.z - oz, l = Math.hypot(dx, dy, dz) || 1;
    this.spawnBullet({ x: ox, y: oy, z: oz, vx: dx / l * 95, vy: dy / l * 95, vz: dz / l * 95, dmg, life: 1.6, pierce: 0, knock: 8,
      color: [2.2, 1.4, 0.45], size: 0.16, len: 1.8, owner: 'p', homing: 6, tgt: t, flags: null });
    this.fx.spark(ox, oy, oz, 4, [2.2, 1.4, 0.45], { speed: 4, size: 0.25, life: 0.2 });
    Sfx.tone(1200, 0.06, 'square', 0.06, 500);
  },

  /* MAMMOTH: rantai bola pemusnah */
  updateFlail(p, dt) {
    const F = p.flail;
    if (!F) return;
    const bx = -Math.sin(p.ang), bz = -Math.cos(p.ang);
    const hx = p.x + bx * 2.8, hz = p.z + bz * 2.8;
    const L = 7;
    for (let k = 0; k < F.length; k++) {
      const f = F[k], e = f.t;
      if (!e || e.dead) continue;
      if (!f.len) f.len = Math.max(L, Math.hypot(e.x - hx, e.z - hz));
      f.len = Math.max(L, f.len - 45 * dt);
      // inersia + kekangan rantai (kekangan sahaja = berayun bila kereta membelok)
      const ivx = (e.x - f.px), ivz = (e.z - f.pz);
      f.px = e.x; f.pz = e.z;
      let nx = e.x + ivx * 0.93, nz = e.z + ivz * 0.93;
      // tarikan lembut ke belakang supaya tidak tergantung di sisi selama-lamanya
      const off = (k - (F.length - 1) / 2) * 0.55;
      const rx = -bz * off, rz = bx * off;
      nx += ((hx + (bx + rx) * L) - nx) * Math.min(1, dt * 0.9);
      nz += ((hz + (bz + rz) * L) - nz) * Math.min(1, dt * 0.9);
      const dd = Math.hypot(nx - hx, nz - hz) || 1;
      if (dd > f.len) { nx = hx + (nx - hx) / dd * f.len; nz = hz + (nz - hz) / dd * f.len; }
      nx = clamp(nx, -HALF + 2, HALF - 2); nz = clamp(nz, -HALF + 2, HALF - 2);
      f.vx = (nx - e.x) / Math.max(dt, 1e-3); f.vz = (nz - e.z) / Math.max(dt, 1e-3);
      e.x = nx; e.z = nz; e.vx = 0; e.vz = 0;
      e.lockT = Math.max(e.lockT || 0, 0.2);
      const sp = Math.hypot(f.vx, f.vz);
      f.acc = (f.acc || 0) + dt;
      if (f.acc > 0.25) { f.acc = 0; e.lastHitBy = 'player'; this.damageEnemy(e, (40 + this.wave * 4) * 0.25, 0, 0, 0, 0, 'bullet'); }
      if (sp > 9) {
        this.neighbors(e.x, e.z, 4, e, (o, ddx, ddz, d2) => {
          if (d2 > e.r + o.r + 0.6 || F.some(q => q.t === o) || (o._flailT > this.time)) return;
          o._flailT = this.time + 0.4;
          const dmg = (sp * 9 + this.wave * 6);
          o.lastHitBy = 'player'; e.lastHitBy = 'player';
          this.damageEnemy(o, dmg, f.vx, 0, f.vz, sp * 0.9, 'ram');
          this.damageEnemy(e, dmg * 0.5, 0, 0, 0, 0, 'ram');
          this.fx.spark((e.x + o.x) / 2, 1.2, (e.z + o.z) / 2, 10, [2.0, 1.2, 0.5], { speed: 7, size: 0.35 });
          this.shake(0.35, 0.1); Sfx.hit();
        });
      }
    }
  },
  renderFlail() {
    const p = this.player, F = p && p.flail;
    const G = geo();
    if (!this.flailMesh) {
      if (!F) return;
      const m = new THREE.InstancedMesh(G.torus, new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.9, roughness: 0.35 }), 48);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
      this.scene.add(m); this.flailMesh = m; this._d5 = new THREE.Object3D();
    }
    let n = 0;
    if (F) {
      const bx = -Math.sin(p.ang), bz = -Math.cos(p.ang);
      const hx = p.x + bx * 2.8, hz = p.z + bz * 2.8, hy = 1.2;
      const d = this._d5;
      for (const f of F) {
        const e = f.t;
        if (!e || e.dead) continue;
        const ex = e.x, ey = e.y + e.h * 0.5, ez = e.z;
        const ang = Math.atan2(ex - hx, ez - hz);
        for (let k = 1; k <= 14 && n < 48; k++) {
          const u = k / 15;
          d.position.set(lerp(hx, ex, u), lerp(hy, ey, u) - Math.sin(u * PI) * 0.6, lerp(hz, ez, u));
          d.rotation.set(k % 2 ? PI / 2 : 0, ang, 0);
          d.scale.setScalar(0.28);
          d.updateMatrix(); this.flailMesh.setMatrixAt(n++, d.matrix);
        }
      }
    }
    this.flailMesh.count = n;
    this.flailMesh.instanceMatrix.needsUpdate = true;
  },

  /* MANTIS: pecutan memotong + hukuman mati */
  reapDash(p) {
    let dx = this.aim ? this.aim.x - p.x : 0, dz = this.aim ? this.aim.z - p.z : 0;
    let l = Math.hypot(dx, dz);
    if (l < 2) { dx = Math.sin(p.ang); dz = Math.cos(p.ang); l = 1; }
    dx /= l; dz /= l;
    const D = Math.max(4, Math.min(24, this.wallDist(p.x, p.z, dx, dz, 24, 1.2) - 1.6));
    const x1 = clamp(p.x + dx * D, -HALF + 3, HALF - 3), z1 = clamp(p.z + dz * D, -HALF + 3, HALF - 3);
    p.dash = { x0: p.x, z0: p.z, x1, z1, t: 0, dur: 0.2, done: false };
    p.ang = Math.atan2(dx, dz);
    p.invuln = true;
    p.reapN = (p.reapN || 0) + 1;
    Sfx.noise(0.25, 0.5, 5000, 1.2, 0, 'highpass'); Sfx.tone(1800, 0.2, 'sawtooth', 0.12, 400);
  },
  updateDash(dt) {
    const p = this.player, D = p.dash;
    if (!D) return;
    D.t += dt;
    const u = clamp(D.t / D.dur, 0, 1);
    if (!D.done) {
      const px = p.x, pz = p.z;
      p.x = lerp(D.x0, D.x1, u); p.z = lerp(D.z0, D.z1, u);
      p.vx = (D.x1 - D.x0) / D.dur * 0.25; p.vz = (D.z1 - D.z0) / D.dur * 0.25;
      if (this.car) this.car.root.position.set(p.x, this.car.root.position.y, p.z);
      for (let k = 0; k < 3; k++) this.fx.add.emit(p.x + rand(-1, 1), rand(0.5, 2.5), p.z + rand(-1, 1), 0, 0, 0,
        { color: [0.6, 2.2, 1.7], color2: [0.1, 0.5, 0.4], size: 0.6, size2: 0.1, life: 0.3, drag: 0 });
      /* potong SEPANJANG laluan bingkai ini - rempuhan menolak musuh, jadi
         semakan sekali di hujung pecutan akan terlepas mereka */
      const hit = D.hit || (D.hit = new Set());
      const dmg = 380 + this.wave * 32;
      for (const e of this.enemies.slice()) {
        if (e.dead || hit.has(e) || segDist(e.x, e.z, px, pz, p.x, p.z) > e.r + 2.6) continue;
        hit.add(e);
        e.lastHitBy = 'player';
        this.damageEnemy(e, dmg, D.x1 - D.x0, 0, D.z1 - D.z0, 10, 'bullet');
        const y = e.y + e.h * 0.6;
        this.fx.beam(e.x - 1.6, y + 0.6, e.z - 1.6, e.x + 1.6, y - 0.6, e.z + 1.6, [0.6, 2.2, 1.7], 0.18, 0.2);
        if (!e.dead && !e.d.boss && e.hp < e.maxHp * 0.25) {
          this.fx.spark(e.x, y, e.z, 22, [0.6, 2.4, 1.8], { speed: 11, size: 0.4, life: 0.45 });
          this.damageEnemy(e, e.hp + 5, 0, 0, 0, 0, 'bullet');
        }
        if (e.dead) D.kills = (D.kills || 0) + 1;
      }
    }
    if (u >= 1 && !D.done) {
      D.done = true;
      if (!(p.swapInv > 0) && !p.hop) p.invuln = false;
      const kills = D.kills || 0;
      if (kills && p.reapN < 3 && p.abOn) {
        p.reapReady = true; p.abT = Math.max(p.abT, 1.8);
        UIx() && UIx().toast(kills > 1 ? `EXECUTE x${kills} · DASH AGAIN` : 'EXECUTE · DASH AGAIN');
        Sfx.tone(600, 0.25, 'sawtooth', 0.14, 1600);
      } else if (p.abOn) p.abT = Math.min(p.abT, 0.3);
      this.shake(0.5, 0.12);
    }
    if (D.t > D.dur + 0.4) p.dash = null;
  },

  /* ===== CRESCENT: Lunar Slash ===== */
  lunarStart(p) {
    const ax = this.aim ? this.aim.x - p.x : Math.sin(p.ang), az = this.aim ? this.aim.z - p.z : Math.cos(p.ang);
    const al = Math.hypot(ax, az) || 1;
    let t = this.lock && !this.lock.dead && Math.hypot(this.lock.x - p.x, this.lock.z - p.z) < 60 ? this.lock : null;
    if (!t) t = this.pickAimTarget(p.x, p.z, ax / al, az / al, 60, 0.7);
    if (!t) t = this.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 60)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!t) return false;
    const d = Math.hypot(t.x - p.x, t.z - p.z);
    const dur = clamp(d / 20, 0.8, 1.9);                 // perlahan - demi kesan dramatik
    t.lockT = Math.max(t.lockT || 0, dur + 0.6);         // sasaran terkunci di tempatnya
    p.lunar = { t: 0, dur, tgt: t, x0: p.x, z0: p.z, lx: p.x, lz: p.z, tr: 0, hit: false, done: false, after: 0 };
    p.invuln = true; p.weaponsOff = true;
    this.lunarTgt = t;
    this.fx.flash(t.x, (t.y || 0) + 2, t.z, [2.6, 2.1, 1.1], 18, 0.3, 30);
    Sfx.tone(880, 0.5, 'sine', 0.16, 330); Sfx.tone(220, 0.9, 'triangle', 0.12, 110);
    return true;
  },
  updateLunar(p, dt) {
    const L = p.lunar;
    if (!L) return;
    L.t += dt;
    const t = L.tgt;
    if (!L.done) {
      const dx = t.x - L.x0, dz = t.z - L.z0, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
      const ex = t.x + ux * 4, ez = t.z + uz * 4;         // tembus 4m ke belakang sasaran
      const u = clamp(L.t / L.dur, 0, 1);
      const k = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      p.x = lerp(L.x0, ex, k); p.z = lerp(L.z0, ez, k); p.ang = Math.atan2(ux, uz); p.vx = p.vz = 0;
      if (this.car) this.car.root.position.set(p.x, this.car.root.position.y, p.z);
      // JEJAK garisan cahaya terapung (3 garisan selari) - pudar sendiri
      L.tr -= dt;
      if (L.tr <= 0) {
        L.tr = 0.045;
        const sx = -uz, sz = ux;
        for (const [o, y, w, c] of [[0, 2.4, 0.3, [2.8, 2.2, 1.1]], [0.7, 1.6, 0.12, [2.4, 2.4, 2.6]], [-0.7, 1.6, 0.12, [2.4, 2.4, 2.6]]])
          this.fx.beam(L.lx + sx * o, y, L.lz + sz * o, p.x + sx * o, y, p.z + sz * o, c, w, 1.1);
        L.lx = p.x; L.lz = p.z;
      }
      if (Math.random() < 0.7) this.fx.add.emit(p.x + rand(-1, 1), rand(1, 3), p.z + rand(-1, 1), 0, rand(0.2, 0.8), 0,
        { color: [2.6, 2.1, 1.0], color2: [0.6, 0.5, 0.3], size: 0.35, size2: 0.05, life: 0.9, drag: 0.5 });
      if (!L.hit && !t.dead && Math.hypot(t.x - p.x, t.z - p.z) < (t.r || 2) + 1.8) { L.hit = true; this.lunarSlash(p, t, ux, uz); }
      if (u >= 1) { L.done = true; if (!L.hit && !t.dead) { L.hit = true; this.lunarSlash(p, t, ux, uz); } }
    } else {
      L.after += dt;
      if (L.after > 0.35) p.abT = Math.min(p.abT, 0.01);
    }
  },
  lunarSlash(p, t, ux, uz) {
    const dmg = (t.maxHp || 300) * (t.d && t.d.boss ? 0.12 : 0.35);
    t.lastHitBy = 'player';
    this.damageEnemy(t, dmg, ux, 0, uz, 16, 'pct');
    const y = (t.y || 0) + (t.h || 2) * 0.6;
    // tetakan X besar + kilat bulan
    this.fx.beam(t.x - uz * 3.4, y + 2.6, t.z + ux * 3.4, t.x + uz * 3.4, y - 1.6, t.z - ux * 3.4, [3.0, 2.5, 1.3], 0.5, 0.45);
    this.fx.beam(t.x + uz * 3.4, y + 2.6, t.z - ux * 3.4, t.x - uz * 3.4, y - 1.6, t.z + ux * 3.4, [2.6, 2.6, 3.0], 0.35, 0.45);
    this.fx.flash(t.x, y, t.z, [2.8, 2.3, 1.3], 34, 0.35, 45);
    this.fx.spark(t.x, y, t.z, 30, [2.8, 2.2, 1.1], { speed: 13, size: 0.42, life: 0.5 });
    this.shake(0.9, 0.25);
    Sfx.tone(1400, 0.18, 'sawtooth', 0.18, 300); Sfx.noise(0.35, 0.4, 2400, 0.4);
    if (window.UI) window.UI.toast('LUNAR SLASH');
  },
  lunarEnd(p) {
    if (!p.lunar) return;
    p.lunar = null; this.lunarTgt = null;
    if (!(p.swapInv > 0) && !p.hop) p.invuln = false;
    p.weaponsOff = false;
  },

  /* FLAIR: libasan beranimasi (weapons2 spawnFlairLash - F.step angkat/hayun/tampar/pudar) */
  updateFlairFx(dt) {
    const L = this.flairFx;
    if (!L || !L.length) return;
    for (let i = L.length - 1; i >= 0; i--) if (!L[i].step(this, dt)) { L[i].dispose(); L.splice(i, 1); }
  },

  /* ===== CORE: Solar Guide =====
     Fasa: ANGKAT sinar gergasi ke atas -> HAYUN menampar sasaran -> melekap & membakar sambil beralun.
     Tiada had jarak & tiada semakan dinding - memang tembus semua. */
  coreSun(p) {
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    return [p.x + fx * 4.45, (p.y || 0) + 2.05, p.z + fz * 4.45];
  },
  corePick(p, near) {
    const live = this.enemies.filter(e => !e.dead && !e.cargoAlly);
    if (!live.length) return null;
    if (near) return live.sort((a, b) => Math.hypot(a.x - near.x, a.z - near.z) - Math.hypot(b.x - near.x, b.z - near.z))[0];
    if (this.lock && !this.lock.dead) return this.lock;
    // musuh PALING HAMPIR dengan reticle (bukan ikut kon arah) - "enemy yang aku pilih"
    const rx = this.aim ? this.aim.x : p.x + Math.sin(p.ang) * 40, rz = this.aim ? this.aim.z : p.z + Math.cos(p.ang) * 40;
    return live.sort((a, b) => Math.hypot(a.x - rx, a.z - rz) - Math.hypot(b.x - rx, b.z - rz))[0];
  },
  coreStart(p, ab) {
    const t = this.corePick(p);
    if (!t) return false;
    p.coreBeam = { tgt: t, acc: 0, kills: 0, pct: ab.pct, bossPct: ab.bossPct, phase: 'go', pt: 0, time: 0, from: null, heads: [0, 1, 2].map(() => this.coreSun(p)) };
    p.coreBeam.vis = this.coreBeamVis();
    p.abSpeed = 0.55;
    this.lunarTgt = t;                              // penanda sasaran yang sama dengan Lunar Slash
    const s = this.coreSun(p);
    this.fx.flash(s[0], s[1], s[2], [3.0, 2.0, 0.7], 22, 0.3, 40);
    Sfx.tone(140, 0.9, 'sawtooth', 0.14, 520); Sfx.tone(1800, 0.25, 'sine', 0.08, 2400, 0.1);
    if (window.UI) window.UI.toast('SOLAR GUIDE LOCKED');
    return true;
  },
  /* Sinar Solar Guide gaya libasan Flair tetapi GERGASI (Nabil: "macam tu jugak tapi lagi besar",
     "keluar 3 laser pastu gabung jadi satu"). TIGA helai sinar diangkat ke tiga arah & menghayun
     ke sasaran, kemudian MENGUNCUP & BERCANTUM jadi satu sinar besar yang membakar. Tiub tetap
     didaftar dalam flairFx supaya clearRun membuangnya; pudar sendiri selepas coreEnd. */
  /* masa fasa (Nabil: "nampak macam sotong, laju sangat - nak smooth & perlahan") */
  coreBeamVis() {
    const mk = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    const grp = new THREE.Group(); this.scene.add(grp);
    const strand = (oc, ic) => {
      const outer = mk(oc, 0.55), inner = mk(ic, 0.95), mo = lashTube(outer), mi = lashTube(inner);
      grp.add(mo); grp.add(mi);
      return { mo, mi, outer, inner, CL: new Float32Array((LN + 1) * 3), op: [0.55, 0.95] };
    };
    const V = {
      main: strand(new THREE.Color(1.35, 0.55, 0.14), new THREE.Color(2.6, 2.1, 1.2)),
      st: [0, 1, 2].map(() => strand(new THREE.Color(1.3, 0.6, 0.16), new THREE.Color(2.5, 1.9, 1.0))),
      fade: -1, alpha: 1,
    };
    V.step = (G, dt) => {
      if (V.fade < 0) return true;
      V.fade += dt;
      V.alpha = Math.max(0, 1 - V.fade / 0.35);
      for (const S of [V.main, ...V.st]) { S.outer.opacity = S.op[0] * V.alpha * (S.k || 0); S.inner.opacity = S.op[1] * V.alpha * (S.k || 0); }
      return V.fade < 0.35;
    };
    V.dispose = () => {
      this.scene.remove(grp);
      for (const S of [V.main, ...V.st]) { S.mo.geometry.dispose(); S.mi.geometry.dispose(); S.outer.dispose(); S.inner.dispose(); }
    };
    (this.flairFx || (this.flairFx = [])).push(V);
    return V;
  },
  updateCore(p, dt) {
    const B = p.coreBeam;
    if (!B) return;
    let t = B.tgt;
    if (!t || t.dead) {
      if (t && t.dead) B.kills++;
      const nt = this.corePick(p, t || p);
      if (!nt) { p.abT = Math.min(p.abT, 0.01); return; }
      B.tgt = t = nt; this.lunarTgt = t;
      B.phase = 'go'; B.pt = 0; B.from = B.heads.map(h => h.slice());   // berpecah tiga & meluncur ke sasaran baru
      if (window.UI) window.UI.toast(B.kills ? 'TARGET BURNED · NEXT' : 'SOLAR GUIDE');
    }
    B.pt += dt; B.time += dt;
    const [sx, sy, sz] = this.coreSun(p);
    const ex = t.x, ey = (t.y || 0) + (t.h || 1.6) * 0.55, ez = t.z;
    const dx = ex - sx, dz = ez - sz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const H = Math.min(18, 6 + L * 0.12);
    // tiga arah angkat: kiri-atas, atas, kanan-atas
    const Q = [-0.95, 0, 0.95].map(th => [px * Math.sin(th), Math.cos(th), pz * Math.sin(th)]);
    let bow;
    const heads = B.heads;
    if (B.phase === 'go') {
      // SATU lengkung kubik berterusan setiap helai: titik mula -> naik ke arahnya -> melengkung -> sasaran
      const k = s5(B.pt / CB.GO);
      Q.forEach((q, n) => {
        const F0 = B.from ? B.from[n] : [sx, sy, sz];
        const r1 = [F0[0] + ux * 3 + q[0] * H, F0[1] + Math.max(1, q[1] * H), F0[2] + uz * 3 + q[2] * H];
        const r2 = [(F0[0] + ex) / 2 + q[0] * H * 0.6, Math.max(F0[1], ey) + Math.max(0.3, q[1]) * H * 0.6, (F0[2] + ez) / 2 + q[2] * H * 0.6];
        heads[n] = [cb(F0[0], r1[0], r2[0], ex, k), cb(F0[1], r1[1], r2[1], ey, k), cb(F0[2], r1[2], r2[2], ez, k)];
      });
      bow = 2 + H * 0.35 * Math.sin(Math.PI * k);
      if (B.pt >= CB.GO) {
        B.phase = 'on'; B.pt = 0;
        this.fx.flash(ex, ey, ez, [3.0, 1.9, 0.6], 26, 0.3, 36);
        this.shake(0.4, 0.15); Sfx.noise(0.3, 0.35, 900, 0.5);
      }
    } else { for (let n = 0; n < 3; n++) heads[n] = [ex, ey, ez]; bow = 2; }
    B.bow = bow;
    // m = 0 tiga helai berasingan .. 1 sudah bercantum jadi satu sinar
    const m = B.phase === 'on' ? s5(B.pt / CB.MERGE) : 0;
    const V = B.vis, amp = Math.min(1.1, 0.3 + L * 0.007) * m, ph = -B.time * 2.5;          // alunan perlahan & kecil
    const pulse = 1 + Math.sin(B.time * 4) * 0.06 + (B.phase === 'on' ? 0.15 * Math.max(0, 1 - Math.abs(B.pt - CB.MERGE) / 0.35) : 0);
    const cmx = (sx + ex) / 2, cmy = (sy + ey) / 2 + 2, cmz = (sz + ez) / 2;          // kawalan sinar bercantum
    const draw = (S, h, ctl, wv, ro, ri, k) => {
      const CL = S.CL;
      for (let i = 0; i <= LN; i++) {
        const u = i / LN, wave = Math.sin(u * 2.5 * Math.PI + ph) * wv * Math.sin(u * Math.PI);
        CL[i * 3] = qb(sx, ctl[0], h[0], u) + px * wave;
        CL[i * 3 + 1] = qb(sy, ctl[1], h[1], u) + wave * 0.35;
        CL[i * 3 + 2] = qb(sz, ctl[2], h[2], u) + pz * wave;
      }
      S.k = k;
      fillTube(S.mo, CL, u => Math.max(0.01, ro * (1 - 0.3 * u)));
      fillTube(S.mi, CL, u => Math.max(0.005, ri * (1 - 0.2 * u)));
      S.outer.opacity = S.op[0] * V.alpha * k; S.inner.opacity = S.op[1] * V.alpha * k;
    };
    Q.forEach((q, n) => {
      const h = heads[n];
      const own = [(sx + h[0]) / 2 + q[0] * bow, (sy + h[1]) / 2 + Math.max(0.2, q[1]) * bow, (sz + h[2]) / 2 + q[2] * bow];
      const ctl = [own[0] + (cmx - own[0]) * m, own[1] + (cmy - own[1]) * m, own[2] + (cmz - own[2]) * m];
      draw(V.st[n], h, ctl, amp, 0.55 * pulse * (1 - 0.6 * m), 0.18 * pulse * (1 - 0.6 * m), 1 - m);
    });
    draw(V.main, [ex, ey, ez], [cmx, cmy, cmz], amp, 1.05 * pulse * m, 0.36 * pulse * m, m);
    if (B.phase !== 'on') {
      for (const h of heads) if (Math.random() < 0.4) this.fx.add.emit(h[0], h[1], h[2], 0, 0.5, 0, { color: [3.0, 1.6, 0.45], color2: [0.6, 0.15, 0.02], size: 1.2, size2: 0.2, life: 0.3, drag: 0, alpha: 0.6 });
      return;
    }
    if (Math.random() < 0.5) this.fx.add.emit(ex + rand(-0.8, 0.8), ey + rand(-0.5, 0.8), ez + rand(-0.8, 0.8), rand(-2, 2), rand(1, 4), rand(-2, 2),
      { color: [3.0, 1.7, 0.5], color2: [0.8, 0.2, 0.05], size: 0.9, size2: 0.1, life: 0.45, drag: 1.2, alpha: 0.7 });
    B.acc += dt;
    if (B.acc >= 0.1) {
      const k = B.acc; B.acc = 0;
      const dmg = (t.maxHp || 300) * (t.d && t.d.boss ? B.bossPct : B.pct) * k;
      t.lastHitBy = 'player';
      this.damageEnemy(t, dmg, t.x - p.x, 0, t.z - p.z, 0, 'pct');
      if (Math.random() < 0.35) Sfx.noise(0.08, 0.12, 1800, 0.25);
    }
  },
  coreEnd(p) {
    if (!p.coreBeam) return;
    if (p.coreBeam.vis) p.coreBeam.vis.fade = 0;          // pudar sendiri dalam flairFx
    p.coreBeam = null; this.lunarTgt = null;
    p.abSpeed = 1;
  },

  /* HIVRA: awan lebah mengikut reticle */
  updateCloud(p, dt) {
    const C = p.cloud;
    if (!C) return;
    const tx = this.aim ? this.aim.x : p.x, tz = this.aim ? this.aim.z : p.z;
    const dx = tx - C.x, dz = tz - C.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, 22 * dt);
    if (d > 0.01) { C.x += dx / d * step; C.z += dz / d * step; }
    C.acc += dt;
    if (C.acc >= 0.25) {
      C.acc = 0;
      let n = 0;
      this.neighbors(C.x, C.z, C.r + 2, null, (e, ex, ez, dd) => {
        if (dd > C.r + e.r) return;
        n++;
        e.lastHitBy = 'player';
        this.damageEnemy(e, (70 + this.wave * 7) * 0.25, 0, 0, 0, 0, 'bullet');
        e.slowT = Math.max(e.slowT || 0, 0.6);
        e.blindT = Math.max(e.blindT || 0, 0.6);
      });
      if (n) Sfx.noise(0.2, 0.08, 500, 4, 0, 'bandpass');
    }
  },
  renderBees(dt) {
    const p = this.player, C = p && p.cloud;
    const G = geo();
    if (!this.beeMesh) {
      if (!C) return;
      const m = new THREE.InstancedMesh(G.bee, glow('#ffd23a', 2.2), 60);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
      this.scene.add(m); this.beeMesh = m; this._d6 = new THREE.Object3D();
    }
    if (!C) { this.beeMesh.count = 0; return; }
    const d = this._d6, t = this.time;
    for (let i = 0; i < 60; i++) {
      const fr = (i * 0.618) % 1, a = t * (2.2 + (i % 4) * 0.7) * (i % 2 ? 1 : -1) + i;
      const r = C.r * (0.25 + 0.75 * fr) + Math.sin(t * 5 + i) * 0.6;
      d.position.set(C.x + Math.cos(a) * r, 0.8 + (i % 6) * 0.45 + Math.sin(t * 7 + i * 1.3) * 0.4, C.z + Math.sin(a) * r);
      d.rotation.set(0, -a, 0);
      d.scale.set(1, 0.75, 1.5);
      d.updateMatrix(); this.beeMesh.setMatrixAt(i, d.matrix);
    }
    this.beeMesh.count = 60;
    this.beeMesh.instanceMatrix.needsUpdate = true;
    void dt;
  },

  /* AEROSTAT: zon suci */
  spawnSanctuary(x, z) {
    const G = geo();
    const m = new THREE.Group();
    const crate = new THREE.Mesh(G.box, new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.7 }));
    crate.scale.set(1.3, 1.0, 1.3); crate.position.y = 0.5; m.add(crate);
    const cross = new THREE.Mesh(G.box, glow('#7dffb0', 2.4)); cross.scale.set(1.35, 0.25, 0.3); cross.position.y = 1.02; m.add(cross);
    const cross2 = cross.clone(); cross2.scale.set(0.3, 0.25, 1.35); m.add(cross2);
    const chute = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 8, 0, TAU, 0, PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, side: THREE.DoubleSide, roughness: 0.8 }));
    chute.position.y = 3.6; m.add(chute);
    m.position.set(x, 2.2, z);
    this.scene.add(m);
    const ring = new THREE.Mesh(G.ring, addMat(0x7dffb0, 0.0));
    ring.rotation.x = -PI / 2; ring.scale.setScalar(11); ring.position.set(x, 0.12, z);
    const disc = new THREE.Mesh(G.disc, addMat(0x3aff8a, 0.0));
    disc.rotation.x = -PI / 2; disc.scale.setScalar(11); disc.position.set(x, 0.08, z);
    const g2 = new THREE.Group(); g2.add(ring); g2.add(disc); this.scene.add(g2);
    (this.sancts = this.sancts || []).push({ x, z, t: 0, T: 8.6, mesh: m, mesh2: g2, ring, disc, chute });
  },
  updateSanctuary(dt) {
    const L = this.sancts || [];
    const p = this.player;
    for (let i = L.length - 1; i >= 0; i--) {
      const S = L[i];
      S.t += dt;
      const drop = clamp(S.t / 0.6, 0, 1);
      S.mesh.position.y = 2.2 * (1 - drop);
      if (drop >= 1 && S.chute.visible) { S.chute.visible = false; this.fx.abilityRing(S.x, S.z, [0.5, 2.2, 1.1], 1, 11, 0.5); Sfx.tone(400, 0.4, 'sine', 0.14, 800); }
      const on = drop >= 1;
      const fade = S.t > S.T - 0.6 ? (S.T - S.t) / 0.6 : 1;
      S.ring.material.opacity = on ? (0.7 + Math.sin(this.time * 5) * 0.2) * fade : 0;
      S.disc.material.opacity = on ? 0.08 * fade : 0;
      S.mesh.rotation.y += dt * 0.5;
      if (on) {
        if (!p.dead && Math.hypot(p.x - S.x, p.z - S.z) < 11) {
          p.inSanct = true; p.zoneRof = 1.25;
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.05 * dt);
          for (const sl of this.slots || []) if (sl && sl.reload > 0) sl.reload -= dt * 2;
        }
        if (this.team) for (const a of this.team.allies) {
          if (!a.dead && Math.hypot(a.x - S.x, a.z - S.z) < 11) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.05 * dt);
        }
        if (Math.random() < dt * 14) {
          const a = rand(TAU), r = rand(0, 10.5);
          this.fx.add.emit(S.x + Math.cos(a) * r, 0.3, S.z + Math.sin(a) * r, 0, rand(1.5, 3), 0,
            { color: [0.5, 2.2, 1.1], color2: [0.1, 0.5, 0.25], size: 0.4, size2: 0.05, life: 0.8, drag: 0.8 });
        }
      }
      if (S.t >= S.T) { this.scene.remove(S.mesh); this.scene.remove(S.mesh2); L.splice(i, 1); }
    }
  },

  /* HALO: halo pengawal */
  sendHalo(p) {
    let best = p, bf = p.hp / p.maxHp;
    if (this.team) for (const a of this.team.allies) {
      if (a.dead || Math.hypot(a.x - p.x, a.z - p.z) > 60) continue;
      const f = a.hp / a.maxHp;
      if (f < bf - 0.02) { bf = f; best = a; }
    }
    const G = geo();
    if (this.halo && this.halo.mesh) this.scene.remove(this.halo.mesh);
    const m = new THREE.Mesh(G.torus, glow('#ffe27a', 2.8));
    m.rotation.x = PI / 2;
    m.position.set(p.x, 6, p.z);
    this.scene.add(m);
    this.halo = { on: true, t: best, isP: best === p, shield: best.maxHp * 0.35, saved: false, mesh: m, fly: 0 };
    UIx() && UIx().toast(best === p ? 'GUARDIAN HALO · YOU' : `GUARDIAN HALO · ${best.name || 'TEAMMATE'}`);
  },
  recallHalo() {
    const H = this.halo;
    if (!H) return;
    if (H.mesh) { this.fx.spark(H.mesh.position.x, H.mesh.position.y, H.mesh.position.z, 12, [2.2, 2.0, 1.1], { speed: 5 }); this.scene.remove(H.mesh); }
    this.halo = null;
  },
  updateHaloObj(dt) {
    const H = this.halo;
    if (!H || !H.on) return;
    const t = H.t;
    if (!t || t.dead) { this.recallHalo(); return; }
    H.fly = Math.min(1, H.fly + dt * 2.5);
    const tx = t.x, ty = (t.y || 0) + 4.2 + Math.sin(this.time * 2.5) * 0.15, tz = t.z;
    const m = H.mesh;
    m.position.x = lerp(m.position.x, tx, H.fly < 1 ? dt * 8 : 1);
    m.position.y = lerp(m.position.y, ty, H.fly < 1 ? dt * 8 : 1);
    m.position.z = lerp(m.position.z, tz, H.fly < 1 ? dt * 8 : 1);
    m.rotation.z += dt * 2;
    const sc = H.shield > 0 ? 1.2 : 0.9;
    m.scale.setScalar(sc + Math.sin(this.time * 6) * 0.05);
    if (Math.random() < dt * 10) this.fx.add.emit(tx + rand(-1, 1), ty - rand(0, 3), tz + rand(-1, 1), 0, -1, 0,
      { color: [2.2, 2.0, 1.1], color2: [0.5, 0.4, 0.1], size: 0.3, size2: 0.03, life: 0.6, drag: 1 });
  },
  /* pulangkan kerosakan yang masih tinggal selepas perisai halo */
  haloSoak(target, d) {
    const H = this.halo;
    if (!H || !H.on || H.t !== target || H.shield <= 0) return d;
    const eat = Math.min(H.shield, d);
    H.shield -= eat;
    if (H.mesh) this.fx.spark(H.mesh.position.x, H.mesh.position.y - 2, H.mesh.position.z, 3, [2.2, 2.0, 1.1], { speed: 4, size: 0.25, life: 0.2 });
    return d - eat;
  },
  haloSave(target) {
    const H = this.halo;
    if (!H || !H.on || H.t !== target || H.saved) return false;
    H.saved = true;
    target.hp = target.maxHp * 0.4;
    if (target === this.player) { target.iframe = 0.8; UIx() && UIx().toast('GUARDIAN HALO SAVED YOU'); }
    else UIx() && UIx().toast(`HALO SAVED ${target.name || 'TEAMMATE'}`);
    this.fx.abilityRing(target.x, target.z, [2.2, 2.0, 1.1], 1, 12, 0.6);
    this.fx.flash(target.x, 3, target.z, [2.2, 2.0, 1.1], 24, 0.3, 30);
    Sfx.tone(520, 0.6, 'sine', 0.2, 1560);
    this.recallHalo();
    return true;
  },

  /* kait kerosakan pemain (dipanggil dari hurtPlayer) */
  hurtHook2(p, d, sx, sz) {
    d = this.haloSoak(p, d);
    // CONDUIT Redirect Link: 80% damage dipindah ke musuh terpaut
    const C = p.conduit;
    if (C && d > 0 && C.links.length) {
      let t = C.links[0], bd = 1e9;
      for (const e of C.links) { const dd = sx !== undefined ? Math.hypot(e.x - sx, e.z - sz) : 0; if (dd < bd) { bd = dd; t = e; } }
      const move = d * 0.8;
      t.lastHitBy = 'player';
      this.damageEnemy(t, move, 0, 0, 0, 0, 'laser');
      this.fx.beam(p.x, (p.y || 0) + 1.45, p.z, t.x, (t.y || 0) + (t.h || 1.6) * 0.6, t.z, [2.8, 0.6, 2.4], 0.5, 0.16);   // denyut tolak balik lurus
      this.fx.spark(t.x, (t.y || 0) + (t.h || 1.6) * 0.6, t.z, 8, [2.8, 0.6, 2.4]);
      C.sent += move;
      d -= move;
    }
    if (d > 0 && p.thorns) this.thornBack(d, sx, sz);
    return d;
  },
  /* kait kerosakan musuh (dipanggil dari damageEnemy) */
  dmgHook2(e, d, src) {
    const p = this.player;
    if (p && p.prey === e && src !== 'ally') d *= 1.6;
    if (e.cubeT > 0 && src !== 'ally') d *= 1.25;           // Freezo: kiub ais rapuh
    if (e.frozenT > 0 && src !== 'burn' && src !== 'boom' && d >= 25 && this.time - (e.frozenAt || 0) > 0.25) {
      this.shatter(e);
    }
    return d;
  },

  /* ===== DIAMOND: resonans - bolt yang terus kena sasaran SAMA makin kuat ===== */
  diamondHit(b, e) {
    const sl = b.diamond.slot;
    if (!sl) return;
    if (sl.resTgt === e && this.time - (sl.resAt || 0) < 1.6) sl.resN = (sl.resN || 0) + 1;
    else { sl.resTgt = e; sl.resN = 1; }
    sl.resAt = this.time;
    const full = (sl.resN * 0.06) >= b.diamond.max - 1e-6;
    // serpihan kristal pecah pada sasaran
    for (let i = 0; i < (full ? 8 : 4); i++) this.fx.add.emit(b.x, b.y, b.z, rand(-5, 5), rand(1, 5), rand(-5, 5),
      { color: [1.2, 2.2, 2.8], color2: [0.3, 0.6, 0.9], size: 0.22, size2: 0.04, life: 0.35, drag: 1.5, grav: 9 });
    if (full && sl.resN % 3 === 0) this.fx.abilityRing(e.x, e.z, [1.2, 2.2, 2.8], (e.r || 1) + 0.3, (e.r || 1) + 2.4, 0.3);
  },

  /* ===== GALE HAMMER: pusaran - damage + tolak semua keluar dari titik pecah ===== */
  galeBurst(b) {
    const G = b.gale, R = G.r, x = b.x, z = b.z, y = Math.max(0.4, b.y);
    for (let i = 0; i < 3; i++) this.fx.abilityRing(x, z, i ? [0.6, 0.6, 0.65] : [2.6, 0.5, 0.3], 0.5 + i, R * (1.1 + i * 0.25), 0.3 + i * 0.12);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU, sp = rand(9, 15);
      // putaran: halaju keluar + sisi, jadi zarah berpusar
      this.fx.add.emit(x + Math.cos(a) * 0.8, y, z + Math.sin(a) * 0.8, (Math.cos(a) - Math.sin(a) * 0.8) * sp, rand(1, 4), (Math.sin(a) + Math.cos(a) * 0.8) * sp,
        { color: i % 3 ? [0.55, 0.55, 0.6] : [2.6, 0.6, 0.3], color2: [0.15, 0.12, 0.12], size: 0.55, size2: 0.1, life: 0.45, drag: 2.4, alpha: 0.7 });
    }
    this.fx.smoke(x, 0.3, z, 6, { speed: 6, size: 1.4, life: 0.7, alpha: 0.35 });
    this.shake(G.air ? 0.6 : 0.35, 0.12);
    Sfx.boom(G.air ? 0.9 : 0.6); Sfx.noise(0.35, 0.3, 1200, 0.8, 0, 'bandpass');
    for (const e of this.enemies.slice()) {
      if (e.dead) continue;
      const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
      if (d > R + (e.r || 1)) continue;
      if (this.losClear && !this.losClear(x, z, e.x, e.z, e)) continue;
      const f = 1 - 0.5 * clamp(d / R, 0, 1);
      e.lastHitBy = 'player';
      this.damageEnemy(e, G.dmg * f, dx || 0.01, 0, dz || 0.01, G.knock * f, 'boom', b.flags);
      if (e.dead) continue;
      if (G.slow) e.slowT = Math.max(e.slowT || 0, 2);
      if (G.air && !e.d.boss) this.liftEnemy(e, 0.5);
    }
  },

  /* ===== CRYSTAL: Prism Storm - tiga sinar berputar 360 darjah ===== */
  updatePrism(p, dt, R) {
    const P = p.prism;
    if (!P) return;
    const prev = P.ang;
    P.ang += P.sp * dt;
    const swept = P.sp * dt;
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    const tick = 120 + this.wave * 10;
    const ends = [];
    for (let k = 0; k < 3; k++) {
      const [lz, h] = CRYS3[k];
      const cx = p.x + fx * lz, cz = p.z + fz * lz;
      const cy = (p.y || 0) + (p._bob || 0) + CRYS_Y + h * 0.5 + 0.75;
      const a = P.ang + k * TAU / 3, dx = Math.sin(a), dz = Math.cos(a);
      const L = Math.min(R, this.wallDist(cx, cz, dx, dz, R, 1.2) + 0.6);
      const ex = cx + dx * L, ez = cz + dz * L;
      this.fx.beam(cx, cy, cz, ex, 0.5, ez, [1.5, 0.9, 2.8], 0.85, 0.05);
      this.fx.beam(cx, cy, cz, ex, 0.5, ez, [2.2, 2.4, 2.8], 0.25, 0.05);
      if (Math.random() < 0.6) this.fx.spark(ex, 0.5, ez, 2, [1.6, 1.2, 2.8], { speed: 5, size: 0.3, life: 0.3 });
      if (Math.random() < dt * 8) this.fx.add.emit(ex, 0.2, ez, rand(-1, 1), rand(2, 4), rand(-1, 1),
        { color: [1.2, 1.6, 2.6], color2: [0.3, 0.3, 0.7], size: 0.35, size2: 0.05, life: 0.6, drag: 1, grav: 4 });
      ends.push({ a0: prev + k * TAU / 3, L });
    }
    for (const e of this.enemies.slice()) {
      if (e.dead) continue;
      const ex = e.x - p.x, ez = e.z - p.z, d = Math.hypot(ex, ez);
      if (d > R + (e.r || 1)) continue;
      const ea = Math.atan2(ex, ez);
      for (const B of ends) {
        let da = (ea - B.a0) % TAU; if (da < 0) da += TAU;
        const tol = Math.min(0.5, (e.r || 1) / Math.max(d, 1));
        if (da > swept + tol && da < TAU - tol) continue;
        if (d > B.L + (e.r || 1) + 2) continue;           // sinar dihalang dinding sebelum sampai
        // satu kena setiap lalu: toleransi sudut tidak boleh mengira dua kali
        if (e._prismT && this.time - e._prismT < 0.22) continue;
        e._prismT = this.time;
        e.lastHitBy = 'player';
        this.damageEnemy(e, tick, ex, 0, ez, 4, 'laser');
        if (!e.dead) e.slowT = Math.max(e.slowT || 0, 1.2);
        for (let i = 0; i < 6; i++) this.fx.add.emit(e.x, (e.y || 0) + (e.h || 1.6) * 0.6, e.z, rand(-4, 4), rand(1, 5), rand(-4, 4),
          { color: [1.6, 1.3, 2.8], color2: [0.4, 0.3, 0.9], size: 0.3, size2: 0.05, life: 0.4, drag: 1.5, grav: 8 });
        break;
      }
    }
    this.shake(0.08, 0.05);
  },

  /* ===== CONDOR: angin rotor + hentakan mendarat ===== */
  updateRotorWash(p, dt) {
    const W = p.rotor;
    if (!W) return;
    // debu berpusar di tanah bawah rotor
    if ((p.y || 0) > 1.5 && Math.random() < dt * 30) {
      const a = rand(TAU), r = rand(2, 7);
      this.fx.add.emit(p.x + Math.cos(a) * r, 0.25, p.z + Math.sin(a) * r, Math.cos(a) * 6, rand(0.3, 1.2), Math.sin(a) * 6,
        { color: [0.9, 0.85, 0.75], color2: [0.4, 0.38, 0.33], size: 0.9, size2: 1.8, life: 0.6, drag: 1.4, alpha: 0.3 });
    }
    W.wash -= dt;
    if (W.wash > 0 || (p.y || 0) < 2) return;
    W.wash = 0.3;
    const R = 8.5;
    for (const e of this.enemies.slice()) {
      if (e.dead || (e.d && e.d.boss)) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d > R + (e.r || 1)) continue;
      e.lastHitBy = 'player';
      this.damageEnemy(e, 18 + this.wave * 2.5, dx || 0.01, 0, dz || 0.01, 9, 'boom');
      if (!e.dead) e.slowT = Math.max(e.slowT || 0, 0.7);
    }
  },
  updateCondor(dt) {
    const p = this.player, S = p && p.condorSlam;
    if (!S) return;
    if (p.dead) { p.condorSlam = null; return; }
    if (S.dive) p.y = Math.max(0, (p.y || 0) - 34 * dt);      // menjunam: jatuh laju, bukan perlahan
    if ((p.y || 0) > 0.9) return;
    p.condorSlam = null;
    const R = S.dive ? 11 : 8.5, dmg = (200 + this.wave * 18) * S.mul;
    this.fx.abilityRing(p.x, p.z, [2.4, 1.5, 0.5], 2, R * 1.35, 0.45);
    this.fx.abilityRing(p.x, p.z, [2.0, 2.0, 2.0], 1, R, 0.3);
    this.fx.explode(p.x, 0.4, p.z, S.dive ? 3.5 : 2.5, [1.8, 1.2, 0.5], { dur: 0.35 });
    this.fx.decal('scorch', p.x, p.z, R * 0.5);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      this.fx.add.emit(p.x + Math.cos(a) * 1.5, 0.3, p.z + Math.sin(a) * 1.5, Math.cos(a) * 14, rand(1, 4), Math.sin(a) * 14,
        { color: [1.0, 0.9, 0.7], color2: [0.4, 0.35, 0.3], size: 1.0, size2: 1.8, life: 0.7, drag: 2, alpha: 0.45 });
    }
    this.shake(S.dive ? 1.4 : 0.9, 0.25); Sfx.boom(S.dive ? 1.6 : 1.1);
    for (const e of this.enemies.slice()) {
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (e.dead || d > R + (e.r || 1)) continue;
      e.lastHitBy = 'player';
      this.damageEnemy(e, dmg * (1 - 0.4 * clamp(d / R, 0, 1)), dx || 0.01, 0, dz || 0.01, 18, 'boom');
      if (!e.dead && !e.d.boss) this.liftEnemy(e, S.dive ? 0.9 : 0.6);
    }
  },

  /* ===== CONDUIT: Redirect Link ===== */
  conduitPick(p, R, keep) {
    const out = keep.filter(e => e && !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < R * 1.25);
    const pool = this.enemies.filter(e => !e.dead && !out.includes(e) && Math.hypot(e.x - p.x, e.z - p.z) < R)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    while (out.length < 3 && pool.length) out.push(pool.shift());
    return out;
  },
  updateConduit(p, dt, R) {
    const C = p.conduit;
    if (!C) return;
    if (C.links.some(e => e.dead || Math.hypot(e.x - p.x, e.z - p.z) > R * 1.25)) C.links = this.conduitPick(p, R, C.links);
    // sinar pautan dilukis oleh badan Conduit (models4 limb) - lurus dari elektron ke musuh
  },

  /* ===== BREEZE: Missile Salvo ===== */
  bzTargets(p, R) {
    return this.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < R)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 5);
  },
  updateSalvo(p, dt, A) {
    const S = p.bz;
    if (!S) return;
    S.time += dt;
    if (S.fired < 5) p.bzDep = Math.min(1, S.time / A.deploy);
    if (S.fired < 5 && S.time >= A.deploy + S.fired * A.gap) {
      const T = this.bzTargets(p, A.range);
      if (!T.length) { S.fired = 5; }
      else {
        const t = T[S.fired % T.length];
        // mulut kanister (tegak): engsel (0, 1.95, -2.75) + 5.3 ke atas
        const ox = p.x - Math.sin(p.ang) * 2.75, oz = p.z - Math.cos(p.ang) * 2.75, oy = (p.y || 0) + 7.3;
        this.spawnBullet({
          x: ox, y: oy, z: oz, vx: (Math.random() - 0.5) * 6, vy: 34, vz: (Math.random() - 0.5) * 6,
          dmg: 0, life: 9, pierce: 99, knock: 0, color: [1.0, 2.2, 2.9], size: 0.32, rocket: true, kind: 'bullet',
          owner: 'p', thru: true, k2: 'bz', bz: { t, phase: 0, apex: oy + 30 + Math.random() * 8 }, flags: null,
        });
        this.fx.muzzle(ox, oy, oz, 0, 1, 0, 2.4, [0.9, 2.0, 2.8]);
        this.fx.smoke(ox, oy - 1, oz, 10, { speed: 4, size: 1.8, life: 1.2, alpha: 0.5 });
        this.shake(0.5, 0.12); Sfx.shoot('rocket'); Sfx.noise(0.5, 0.3, 900, 0.8);
        S.fired++;
      }
    }
    if (S.fired >= 5) {
      S.done += dt;
      p.bzDep = Math.max(0, 1 - Math.max(0, S.done - 0.8) / A.stow);
      if (p.bzDep <= 0 && S.done > 1) p.abT = Math.min(p.abT, 0.01);
    }
  },
  steerSalvo(b, dt) {
    const M = b.bz;
    let t = M.t;
    if (!t || t.dead) {                          // sasaran mati: cari yang terdekat
      let best = null, bd = 1e9;
      for (const e of this.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - b.x, e.z - b.z); if (d < bd) { bd = d; best = e; } }
      M.t = t = best;
    }
    if (Math.random() < 0.9) this.fx.add.emit(b.x, b.y, b.z, (Math.random() - 0.5), -1, (Math.random() - 0.5),
      { color: [0.8, 1.6, 2.4], color2: [0.6, 0.75, 0.85], size: 0.5, size2: 1.4, life: 0.8, drag: 0.5, alpha: 0.45 });   // jejak fros
    if (M.phase === 0) {                          // naik
      b.vy = Math.max(b.vy, 30);
      if (b.y >= M.apex) M.phase = 1;
      return;
    }
    if (!t) { b.life = Math.min(b.life, 0.5); return; }
    const ty = (t.y || 0) + (t.h || 1.6) * 0.5;
    const dx = t.x - b.x, dy = ty - b.y, dz = t.z - b.z, d = Math.hypot(dx, dy, dz) || 1;
    const sp = 58, k = Math.min(1, dt * 4);
    b.vx += (dx / d * sp - b.vx) * k; b.vy += (dy / d * sp - b.vy) * k; b.vz += (dz / d * sp - b.vz) * k;
    if (d < 2.2) this.bzImpact(b, t);
  },
  bzImpact(b, t) {
    b.life = 0; b.bz = null;
    const frac = clamp(0.5 - ((t.maxHp || 300) - 300) / 2400, 0.25, 0.5);   // lemah = separuh, tebal = suku
    const dmg = (t.maxHp || 300) * frac;
    // PELURU AIS: letupan fros, tanah jadi ais, sasaran (dan jiran 4m) LICIN 4.5s
    this.fx.explode(t.x, (t.y || 0) + 1, t.z, 4, [0.9, 1.9, 2.8], { dur: 0.4 });
    this.fx.abilityRing(t.x, t.z, [0.8, 1.8, 2.6], 1, 5, 0.4);
    for (let i = 0; i < 16; i++) {
      const a = rand(TAU);
      this.fx.add.emit(t.x, (t.y || 0) + 1, t.z, Math.cos(a) * rand(4, 9), rand(2, 6), Math.sin(a) * rand(4, 9),
        { color: [0.9, 1.9, 2.8], color2: [0.3, 0.5, 0.9], size: 0.35, size2: 0.05, life: 0.5, drag: 1.4, grav: 14 });
    }
    this.shake(0.5, 0.15); Sfx.boom(1.0); Sfx.noise(0.3, 0.3, 6000, 1.5, 0, 'highpass');
    t.lastHitBy = 'player';
    this.damageEnemy(t, dmg, 0, -1, 0, 8, 'boom');
    for (const e of this.enemies) if (!e.dead && (e === t || Math.hypot(e.x - t.x, e.z - t.z) < 4 + (e.r || 1))) {
      e.slipT = Math.max(e.slipT || 0, 4.5);
      e.vx = (e.vx || 0) + rand(-6, 6); e.vz = (e.vz || 0) + rand(-6, 6);    // tergelincir
    }
  },
  /* musuh LICIN: kiraan masa + jejak hablur ais di bawahnya + tergelincir rawak */
  updateSlip(dt) {
    for (const e of this.enemies) {
      if (!(e.slipT > 0)) continue;
      e.slipT -= dt;
      if (e.dead || (e.d && e.d.fly)) continue;
      if (Math.random() < dt * 3) { e.vx = (e.vx || 0) + rand(-3, 3); e.vz = (e.vz || 0) + rand(-3, 3); }
      if (Math.random() < dt * 14) this.fx.add.emit(e.x + rand(-1, 1), 0.15, e.z + rand(-1, 1), rand(-1, 1), rand(0.3, 1), rand(-1, 1),
        { color: [0.8, 1.7, 2.6], color2: [0.3, 0.5, 0.9], size: 0.3, size2: 0.05, life: 0.4, drag: 2 });
    }
  },

  /* ===== FREEZO: Cryo Cannon ===== */
  /* Freezo: pengumpul kuasa menyedut asap sejuk dari belakang (sentiasa sedikit,
     deras semasa mengecas), kemudian tembak bila cas penuh */
  updateIceCharge(p, dt) {
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    const ix = p.x - fx * 2.9, iz = p.z - fz * 2.9, iy = (p.y || 0) + 2.4;      // salur masuk belakang meriam
    const C = p.iceCharge;
    const rate = C ? 60 : 4;
    if (Math.random() < dt * rate) {
      const a = rand(-1, 1), d = rand(2.5, 4.5);
      const sx = ix - fx * d + Math.cos(p.ang) * a * 1.5, sz = iz - fz * d - Math.sin(p.ang) * a * 1.5, sy = iy + rand(-0.8, 0.8);
      this.fx.add.emit(sx, sy, sz, (ix - sx) * 2.2, (iy - sy) * 2.2, (iz - sz) * 2.2,
        { color: [0.8, 1.6, 2.2], color2: [0.6, 0.8, 0.95], size: 0.5, size2: 0.12, life: 0.45, drag: 0, alpha: 0.55 });
    }
    if (!C) return;
    C.t += dt; C.k = clamp(C.t / C.dur, 0, 1);
    if (C.t >= C.dur) { p.iceCharge = null; this.fireIceShell(p); }
  },
  fireIceShell(p) {
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    // muncung meriam rel: -0.4 + 4.2 di hadapan, 2.35 tinggi
    const ox = p.x + fx * 3.8, oz = p.z + fz * 3.8, oy = (p.y || 0) + 2.35;
    const t = (this.lock && !this.lock.dead ? this.lock : null) || this.pickAimTarget(ox, oz, fx, fz, 70, 0.6, true);
    let dx = fx, dy = -0.03, dz = fz;
    if (t) {
      const sp0 = 70, tt = Math.hypot(t.x - ox, t.z - oz) / sp0;
      const tx = t.x + (t.vx || 0) * tt, tz = t.z + (t.vz || 0) * tt, ty = (t.y || 0) + (t.h || 1.6) * 0.5;
      const l = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
      dx = (tx - ox) / l; dy = (ty - oy) / l; dz = (tz - oz) / l;
    }
    const sp = 70;
    this.spawnBullet({
      x: ox, y: oy, z: oz, vx: dx * sp, vy: dy * sp, vz: dz * sp,
      dmg: 180 + this.wave * 16, life: 75 / sp, pierce: 0, knock: 10, color: [1.1, 2.3, 2.9], size: 0.95,
      kind: 'plasma', owner: 'p', thru: false, k2: 'ice', iceShell: true, flags: null,
    });
    p.iceKick = 1;
    this.fx.muzzle(ox, oy, oz, dx, dy, dz, 3, [0.9, 2.0, 2.8]);
    this.fx.smoke(ox, oy, oz, 8, { speed: 3, size: 1.4, life: 0.8, alpha: 0.4 });
    this.shake(0.8, 0.18); this.recoil(-fx, -fz, 7);
    Sfx.boom(1.1); Sfx.noise(0.4, 0.3, 5000, 1.5, 0, 'highpass');
  },
  iceBurst(b, hit) {
    const x = b.x, z = b.z, R = 3.0;
    this.fx.explode(x, Math.max(0.5, b.y), z, 2.6, [0.9, 1.9, 2.8], { dur: 0.35 });
    for (let i = 0; i < 20; i++) {
      const a = rand(TAU);
      this.fx.add.emit(x, Math.max(0.5, b.y), z, Math.cos(a) * rand(4, 10), rand(2, 7), Math.sin(a) * rand(4, 10),
        { color: [0.9, 1.9, 2.8], color2: [0.3, 0.5, 0.9], size: 0.35, size2: 0.05, life: 0.5, drag: 1.5, grav: 14 });
    }
    Sfx.tone(1900, 0.35, 'sine', 0.14, 2800); Sfx.noise(0.3, 0.3, 6000, 1.5, 0, 'highpass');
    const list = this.enemies.filter(e => !e.dead && (e === hit || Math.hypot(e.x - x, e.z - z) < R + (e.r || 1)));
    for (const e of list) {
      if (e.d && e.d.boss) { e.slowT = Math.max(e.slowT || 0, 3); continue; }     // bos: perlahan sahaja
      e.cubeT = 4; e.cubeDmg = 140 + this.wave * 14;
      e.lockT = Math.max(e.lockT || 0, 4);
      e.vx = 0; e.vz = 0;
    }
  },
  updateCubes(dt) {
    const G = geo();
    if (!this.cubeMesh) {
      const m = new THREE.InstancedMesh(G.box, new THREE.MeshStandardMaterial({ color: 0xbfeaff, emissive: 0x2a7ab0, emissiveIntensity: 0.55, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.15 }), 30);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
      this.scene.add(m); this.cubeMesh = m; this._d3 = new THREE.Object3D();
    }
    let n = 0;
    const d = this._d3;
    for (const e of this.enemies) {
      if (!(e.cubeT > 0)) continue;
      e.cubeT -= dt;
      if (e.cubeT > 0) {
        e.lockT = Math.max(e.lockT || 0, 0.12);
        if (n < 30) {
          const s = Math.max((e.r || 1) * 2.4, (e.h || 1.6) * 1.15) + 0.4;
          d.position.set(e.x, (e.y || 0) + s * 0.5 - 0.05, e.z);
          d.rotation.set(0, e.ang || 0, 0); d.scale.set(s, s, s);
          d.updateMatrix(); this.cubeMesh.setMatrixAt(n++, d.matrix);
        }
      } else {
        // kiub pecah: serpihan ais mencederakan musuh berdekatan
        const y = (e.y || 0) + 1;
        this.fx.explode(e.x, y, e.z, 2.4, [0.9, 1.9, 2.8], { dur: 0.3 });
        for (let i = 0; i < 16; i++) {
          const a = rand(TAU);
          this.fx.add.emit(e.x, y, e.z, Math.cos(a) * rand(5, 12), rand(3, 8), Math.sin(a) * rand(5, 12),
            { color: [0.85, 1.9, 2.8], color2: [0.3, 0.5, 0.9], size: 0.4, size2: 0.06, life: 0.55, drag: 1.4, grav: 16, ground: true });
        }
        Sfx.noise(0.35, 0.4, 6000, 1.5, 0, 'highpass');
        e.lockT = Math.min(e.lockT || 0, 0.1);
        this.neighbors(e.x, e.z, 5, e, (o, dx, dz, dd) => { if (dd < 4 + o.r) { o.lastHitBy = 'player'; this.damageEnemy(o, e.cubeDmg * 0.5, -dx, 0, -dz, 6, 'boom'); } });
      }
    }
    this.cubeMesh.count = n;
    this.cubeMesh.instanceMatrix.needsUpdate = true;
  },

  /* ===== AUGER: Burrow Strike ===== */
  updateBurrow(p, dt) {
    const B = p.burrow;
    if (!B) return;
    B.t += dt; B.acc -= dt;
    // tanah terbongkar di belakang busut
    if (Math.random() < dt * 30) this.fx.add.emit(p.x + rand(-1.2, 1.2), 0.25, p.z + rand(-1.5, 1.5), rand(-2, 2), rand(2, 5), rand(-2, 2),
      { color: [0.45, 0.33, 0.22], color2: [0.2, 0.15, 0.1], size: 0.35, size2: 0.15, life: 0.6, drag: 1, grav: 12 });
    if (Math.random() < dt * 6) this.fx.decal('scorch', p.x, p.z, 1.6);
    if (B.acc > 0) return;
    B.acc = 0.25;
    for (const e of this.enemies) {
      if (e.dead || (e.d && e.d.fly)) continue;
      if (Math.hypot(e.x - p.x, e.z - p.z) < 3.2 + (e.r || 1)) e.slowT = Math.max(e.slowT || 0, 1.2);   // tersandung
    }
  },
  burrowErupt(p) {
    const R = 8.5, dmg = 260 + this.wave * 22;
    this.fx.abilityRing(p.x, p.z, [2.4, 1.2, 0.4], 2, R * 1.4, 0.5);
    this.fx.explode(p.x, 0.6, p.z, 3.5, [1.6, 1.0, 0.45], { dur: 0.4 });
    this.fx.decal('scorch', p.x, p.z, 4);
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * TAU, sp = rand(6, 14);
      this.fx.add.emit(p.x + Math.cos(a) * 1.5, 0.4, p.z + Math.sin(a) * 1.5, Math.cos(a) * sp, rand(6, 14), Math.sin(a) * sp,
        { color: [0.5, 0.36, 0.24], color2: [0.22, 0.16, 0.1], size: 0.5, size2: 0.25, life: 0.9, drag: 0.6, grav: 22 });
    }
    this.shake(1.3, 0.3); Sfx.boom(1.5); Sfx.noise(0.6, 0.5, 400, 0.9);
    for (const e of this.enemies.slice()) {
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (e.dead || d > R + (e.r || 1)) continue;
      e.lastHitBy = 'player';
      this.damageEnemy(e, dmg * (1 - 0.4 * clamp(d / R, 0, 1)), dx || 0.01, 0, dz || 0.01, 14, 'boom');
      if (!e.dead && !e.d.boss) this.liftEnemy(e, 1.1);
    }
  },

  /* ===== E-G300: Twin Cannon ===== */
  egPick(p, R) {
    let best = null, bd = R;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < bd && (!this.losClear || this.losClear(p.x, p.z, e.x, e.z, e))) { bd = d; best = e; }
    }
    return best;
  },
  updateTwinCannon(p, dt, A) {
    const C = p.egc;
    if (!C) return;
    C.time += dt;
    // fasa: naik (0..deploy) -> tembak -> simpan
    if (C.left > 0) p.egDep = Math.min(1, C.time / A.deploy);
    else { C.done += dt; p.egDep = Math.max(0, 1 - Math.max(0, C.done - 0.35) / A.stow); if (p.egDep <= 0 && C.done > 0.4) p.abT = Math.min(p.abT, 0.01); }
    if (!C.t || C.t.dead || (this.losClear && !this.losClear(p.x, p.z, C.t.x, C.t.z, C.t))) C.t = this.egPick(p, A.range) || null;
    if (C.t) C.aim = Math.atan2(C.t.x - p.x, C.t.z - p.z);
    if (C.left <= 0 || C.time < C.next) return;
    if (!C.t) { if (C.time > C.next + 1.2) C.left = 0; return; }      // tiada sasaran boleh ditembak: tunggu sekejap, kemudian simpan
    C.next = C.time + A.gap; C.left--;
    const k = C.k++ % 2, sd = k ? 1 : -1;
    const ca = Math.cos(C.aim), sa = Math.sin(C.aim);
    // muncung: pusat lif (0.4m di belakang tengah kereta) + 3.25m ke arah bidikan, dianjak ke sisi laras
    const bx = p.x - Math.sin(p.ang) * 0.4, bz = p.z - Math.cos(p.ang) * 0.4;
    const ox = bx + sa * 3.25 + ca * 0.26 * sd, oz = bz + ca * 3.25 - sa * 0.26 * sd, oy = (p.y || 0) + 2.55;
    const t = C.t;
    const ty = (t.y || 0) + (t.h || 1.6) * 0.5;
    const dx = t.x - ox, dy = ty - oy, dz = t.z - oz, l = Math.hypot(dx, dy, dz) || 1, sp = 120;
    this.spawnBullet({
      x: ox, y: oy, z: oz, vx: dx / l * sp, vy: dy / l * sp, vz: dz / l * sp,
      dmg: 450 + this.wave * 40, life: (A.range + 8) / sp, pierce: 0, knock: 30, splash: 4.5,
      color: [2.4, 1.6, 0.5], size: 0.36, kind: 'shell', owner: 'p', thru: false, flags: null,
    });
    if (p.egKick) p.egKick[k] = 1;
    this.fx.muzzle(ox, oy, oz, dx / l, 0, dz / l, 2.6, [2.4, 1.6, 0.5]);
    this.fx.smoke(ox, oy, oz, 8, { speed: 4, size: 1.6, life: 1.0, alpha: 0.45 });
    this.fx.flash(ox, oy, oz, [2.4, 1.6, 0.6], 18, 0.12, 30);
    this.shake(0.9, 0.18);
    Sfx.boom(1.3); Sfx.tone(60, 0.35, 'square', 0.22, 35);
  },

  /* THAROS: sinar haba menyapu */
  updateRay(p, dt) {
    const R = p.ray;
    if (!R) return;
    R.ang = Math.min(R.a1, R.ang + (R.a1 - R.a0) / 3 * dt);
    const ex0 = p.x + Math.sin(p.ang) * 1.6, ez0 = p.z + Math.cos(p.ang) * 1.6, ey0 = 4.55 + (p._bob || 0);
    const dx = Math.sin(R.ang), dz = Math.cos(R.ang);
    const L = Math.min(66, this.wallDist(ex0, ez0, dx, dz, 66, 1.2) + 0.6);
    const ex = ex0 + dx * L, ez = ez0 + dz * L, ey = 0.4;
    this.fx.beam(ex0, ey0, ez0, ex, ey, ez, [2.6, 0.5, 0.35], 1.0, 0.06);
    this.fx.beam(ex0, ey0, ez0, ex, ey, ez, [2.8, 2.2, 1.8], 0.3, 0.06);
    if (Math.random() < 0.7) this.fx.spark(ex, 0.5, ez, 3, [2.6, 0.8, 0.3], { speed: 6, size: 0.35, life: 0.3 });
    R.acc += dt; R.drop += dt;
    if (R.drop > 0.12) { R.drop = 0; this.fx.decal('scorch', ex, ez, 2.2); this.spawnHazard('fire', ex, ez, 2.4, 7 + this.wave * 1.2, 4.5); }
    if (R.acc >= 0.08) {
      const tick = (1300 + this.wave * 60) * R.acc;
      R.acc = 0;
      for (const e of this.enemies.slice()) {
        if (e.dead || segDist(e.x, e.z, ex0, ez0, ex, ez) > e.r + 1.4) continue;
        e.lastHitBy = 'player';
        this.damageEnemy(e, tick, dx, 0, dz, 1, 'laser');
        if (!e.dead) { e.burnT = Math.max(e.burnT || 0, 3); e.burnDmg = Math.max(e.burnDmg || 0, 40 + this.wave * 4); }
      }
    }
    this.shake(0.12, 0.05);
  },

  /* HOPPER: lompatan spring + hentakan fros */
  startHop(p) {
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    const x1 = clamp(p.x + fx * 16, -HALF + 3, HALF - 3), z1 = clamp(p.z + fz * 16, -HALF + 3, HALF - 3);
    p.hop = { x0: p.x, z0: p.z, x1, z1, t: 0, dur: 0.62 };
    p.invuln = true;
    this.fx.abilityRing(p.x, p.z, [0.8, 1.8, 2.4], 1, 6, 0.3);
    this.fx.smoke(p.x, 0.3, p.z, 5, { speed: 4, size: 1.2, life: 0.6, alpha: 0.4 });
    Sfx.tone(220, 0.3, 'sine', 0.2, 900);
  },
  updateHop(dt) {
    const p = this.player, H = p.hop;
    if (!H) return;
    H.t += dt;
    const u = clamp(H.t / H.dur, 0, 1);
    p.x = lerp(H.x0, H.x1, u); p.z = lerp(H.z0, H.z1, u);
    if (this.car) this.car.root.position.set(p.x, this.car.root.position.y, p.z);
    if (u >= 1) {
      p.hop = null;
      if (!(p.swapInv > 0) && !p.dash) p.invuln = false;
      const R = 7.5, dmg = 150 + this.wave * 14;
      this.fx.abilityRing(p.x, p.z, [0.8, 1.8, 2.6], 2, R * 1.4, 0.45);
      this.fx.explode(p.x, 0.5, p.z, 3, [0.8, 1.8, 2.6], { dur: 0.35 });
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * TAU;
        this.fx.add.emit(p.x, 0.4, p.z, Math.cos(a) * 12, rand(2, 5), Math.sin(a) * 12,
          { color: [0.9, 1.9, 2.8], color2: [0.3, 0.5, 0.9], size: 0.45, size2: 0.05, life: 0.45, drag: 2, ground: true });
      }
      this.shake(0.9, 0.2); Sfx.boom(1.0); Sfx.noise(0.3, 0.3, 5000, 1.5, 0, 'highpass');
      for (const e of this.enemies.slice()) {
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (e.dead || d > R + e.r) continue;
        e.lastHitBy = 'player';
        this.damageEnemy(e, dmg, e.x - p.x, 0, e.z - p.z, 14, 'boom');
        if (e.dead) continue;
        e.slowT = Math.max(e.slowT || 0, 2.5);
        if (!e.d.boss) this.liftEnemy(e, 0.8);
      }
    }
  },

  /* CORSAIR: tukar tempat */
  swapWith(p, t) {
    const ax = p.x, az = p.z;
    this.fx.lightning(p.x, 1.6, p.z, t.x, t.y + t.h * 0.5, t.z, [0.5, 2.0, 2.4], 7);
    this.fx.abilityRing(p.x, p.z, [0.5, 2.0, 2.4], 1, 7, 0.4);
    this.fx.abilityRing(t.x, t.z, [0.5, 2.0, 2.4], 1, 7, 0.4);
    p.x = t.x; p.z = t.z; p.vx = 0; p.vz = 0;
    t.x = ax; t.z = az; t.vx = 0; t.vz = 0;
    if (t.mesh) t.mesh.position.set(t.x, t.mesh.position.y, t.z);
    if (this.car) this.car.root.position.set(p.x, this.car.root.position.y, p.z);
    if (t.teamBot) { t.confT = 3.5; t.tgt = null; }
    else if (!t.d.boss) { t.lockT = Math.max(t.lockT || 0, 1.6); t.netT = 3.5; t.netVuln = 1.3; }
    t.dazeT = 3.5;
    p.invuln = true; p.swapInv = 1.2;
    for (const [x, z] of [[p.x, p.z], [t.x, t.z]]) for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      this.fx.add.emit(x + Math.cos(a) * 2, 1.2, z + Math.sin(a) * 2, -Math.sin(a) * 6, 2, Math.cos(a) * 6,
        { color: [0.5, 2.0, 2.4], color2: [0.1, 0.4, 0.6], size: 0.4, size2: 0.05, life: 0.4, drag: 2 });
    }
    Sfx.tone(1500, 0.25, 'sine', 0.18, 300); Sfx.tone(300, 0.25, 'sine', 0.14, 1500, 0.08);
    this.shake(0.5, 0.15);
  },

  /* RAPTOR: penanda mangsa */
  updatePreyMark() {
    const p = this.player, t = p && p.prey;
    if (!this.preyMark) {
      if (!t) return;
      const G = geo();
      const m = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xc8ff3a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      m.rotation.x = -PI / 2; m.renderOrder = 9;
      this.scene.add(m); this.preyMark = m;
    }
    const m = this.preyMark;
    m.visible = !!(t && !t.dead);
    if (!m.visible) return;
    m.position.set(t.x, (t.y || 0) + 0.15, t.z);
    m.scale.setScalar((t.r || 2) * (1.6 + Math.sin(this.time * 8) * 0.12));
    if (Math.random() < 0.3) this.fx.add.emit(t.x, t.y + t.h + 0.8, t.z, 0, 0.5, 0, { color: [1.4, 2.4, 0.4], color2: [0.3, 0.6, 0.1], size: 0.6, size2: 0.2, life: 0.15, drag: 0 });
  },
};

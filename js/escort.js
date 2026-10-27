// escort.js — mod CARGO ESCORT 5 lawan 5 (2026-10-18, idea Nabil).
// Pasukan biru (pemain + 4 bot) mengiring TIGA trak kargo besar sepanjang
// Convoy Pass (maps.js) yang berliku menyenget ke kiri. Bot merah cuba
// memusnahkan trak. Dicampur ke dalam kelas Team (team.js) - `this` ialah Team.
//
// Peraturan:
//  - Konvoi bergerak hanya bila ada kereta BIRU dekat trak dan TIADA kereta
//    merah dekat (berebut = berhenti). Lebih ramai biru = lebih laju sedikit.
//  - Menang: setiap trak yang masih hidup sampai ke hujung jalan.
//  - Kalah: ketiga-tiga trak musnah, atau masa tamat.
//  - Muncul semula AUTOMATIK (tiada pemilih): biru di belakang konvoi, merah
//    di hadapan konvoi - dekat dengan kargo, tetapi tidak terlalu dekat.
import * as THREE from 'three';
import { rand, clamp, TAU, PI, Sfx } from './core.js';
import { abScale } from './scale.js';
import { MATS, flattenCar } from './models.js';

export const ESC = {
  NEAR: 22,            // jarak "dekat trak" untuk gerak / berebut
  GAP: 14,             // jarak antara trak
  RED_AHEAD: 72,       // merah muncul sejauh ini di hadapan trak paling depan
  BLUE_BEHIND: 28,     // biru muncul sejauh ini di belakang trak paling belakang
};

/* ---------------- model trak kargo berperisai 6 roda ---------------- */
function buildHauler(idx) {
  const root = new THREE.Group();
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const paint = M({ color: 0x2c4a6e, metalness: 0.55, roughness: 0.5 });
  const cargo = M({ color: 0x3a3f46, metalness: 0.5, roughness: 0.6 });
  const glow = M({ color: 0x0a2440, emissive: 0x3fa9ff, emissiveIntensity: 1.6, roughness: 0.4 });
  const amber = M({ color: 0x2a1600, emissive: 0xffb23f, emissiveIntensity: 2.2 });
  const dark = MATS.dark, steel = MATS.steel, glass = MATS.glass;
  const rub = M({ color: 0x15171a, roughness: 0.92 });
  const mats = { paint, cargo, glow };
  const box = (m, x, y, z, w, h, d, rx = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; o.receiveShadow = true; root.add(o); return o;
  };
  // casis & kabin
  box(dark, 0, 1.05, -0.3, 2.5, 0.5, 10.2);
  box(paint, 0, 2.15, 3.55, 2.9, 1.9, 2.5);
  box(paint, 0, 1.55, 4.95, 2.8, 0.9, 0.6, 0.35);                   // hidung condong
  box(glass, 0, 2.55, 4.78, 2.5, 0.75, 0.12, -0.25);                // cermin depan
  box(steel, 0, 1.0, 5.25, 3.0, 0.45, 0.4);                         // bampar
  for (let i = 0; i < 6; i++) box(dark, -1.0 + i * 0.4, 1.6, 5.22, 0.12, 0.5, 0.1);   // gril
  box(amber, 0, 3.18, 3.6, 1.6, 0.14, 0.3);                         // bar lampu atas kabin
  for (const sd of [-1, 1]) {
    box(steel, sd * 1.55, 2.6, 3.2, 0.12, 0.9, 0.5);                // cermin sisi / ekzos
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 8), steel);
    ex.position.set(sd * 1.35, 3.0, 2.25); root.add(ex);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10), MATS.head);
    lamp.rotation.x = PI / 2; lamp.position.set(sd * 1.05, 1.55, 5.27); root.add(lamp);
  }
  // kontena kargo berperisai bergelang
  box(cargo, 0, 2.75, -1.45, 3.0, 2.9, 6.6);
  for (let i = 0; i < 5; i++) box(dark, 0, 2.75, -4.4 + i * 1.48, 3.1, 3.0, 0.16);
  for (const sd of [-1, 1]) {
    box(glow, sd * 1.52, 3.0, -1.45, 0.04, 0.16, 6.0);              // jalur biru pasukan
    box(amber, sd * 1.52, 1.75, -1.45, 0.04, 0.1, 6.2);
  }
  // nombor kargo: blok bercahaya di bumbung (1, 2 atau 3 bar)
  for (let i = 0; i <= idx; i++) box(glow, (i - idx / 2) * 0.55, 4.24, -3.6, 0.32, 0.06, 0.9);
  // turet pertahanan kecil atas kontena
  const tur = new THREE.Group(); tur.position.set(0, 4.25, -0.4); root.add(tur);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 12), dark); tb.position.y = 0.2; tur.add(tb);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.5), steel); gun.position.set(0, 0.42, 0.7); tur.add(gun);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glow); gl.position.set(0, 0.45, 0.1); tur.add(gl);
  // enam roda
  const wheels = [];
  const tg = new THREE.CylinderGeometry(0.78, 0.78, 0.6, 18);
  const hg = new THREE.CylinderGeometry(0.4, 0.4, 0.64, 10);
  for (const z of [3.6, -1.6, -3.4]) for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * 1.35, 0.78, z); root.add(w);
    const t = new THREE.Mesh(tg, rub); t.rotation.z = PI / 2; t.castShadow = true; w.add(t);
    const h = new THREE.Mesh(hg, steel); h.rotation.z = PI / 2; w.add(h);
    wheels.push(w);
  }
  /* prestasi (Nabil: "agak lag"): ~45 mesh setiap trak dicantum ikut bahan -
     roda dan turet kekal kumpulan berasingan supaya masih boleh berpusing */
  flattenCar(root, [tur], true);                // roda juga dicantum - trak perlahan, putaran roda tidak ketara
  return { root, wheels, tur, mats };
}

export const ESCORT = {
  setupEscort() {
    const g = this.g;
    this.path = this.map.path();
    const L = this.path.L;
    this.trucks = [];
    const hp = Math.round((3200 + 260 * this.L) * abScale(this.L));   // ikut skala damage bot baharu
    for (let i = 0; i < 3; i++) {
      const H = buildHauler(i);
      const t = {
        cargo: true, idx: i, name: 'CARGO ' + (i + 1), team: 'A',
        s: 50 - i * ESC.GAP, cap: L - 4 - i * ESC.GAP, hp, maxHp: hp, dead: false, delivered: false,
        x: 0, z: 0, y: 0, ang: 0, vx: 0, vz: 0, r: 3.0, h: 3.6, spin: 0, flash: 0, calm: 0, turCd: rand(0.3, 1),
        mesh: H.root, wheels: H.wheels, tur: H.tur, mats: H.mats,
      };
      const P = this.path.at(t.s);
      t.x = P.x; t.z = P.z; t.ang = Math.atan2(P.dx, P.dz);
      H.root.position.set(t.x, 0, t.z); H.root.rotation.y = t.ang;
      g.scene.add(H.root); this.objs.push(H.root);
      this.trucks.push(t);
    }
    this.cvState = 'waiting';
    this.score = { A: 0, B: 0 };            // A = kargo sampai, B = kargo musnah
    // gerbang destinasi di hujung jalan
    const E = this.path.at(L);
    const gate = new THREE.Group();
    const gm = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x3fa9ff, emissiveIntensity: 1.8 });
    for (const sd of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), MATS.dark);
      post.position.set(E.x - E.dz * 9 * sd, 4.5, E.z + E.dx * 9 * sd); gate.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(19, 0.6, 0.6), gm);
    beam.position.set(E.x, 9, E.z); beam.rotation.y = Math.atan2(E.dx, E.dz) + PI / 2; gate.add(beam);
    g.scene.add(gate); this.objs.push(gate);
  },

  aliveTrucks() { return this.trucks.filter(t => !t.dead); },
  /* s paling depan / paling belakang di antara trak hidup */
  convoySpan() {
    const a = this.aliveTrucks();
    if (!a.length) return { lead: 0, tail: 0 };
    return { lead: Math.max(...a.map(t => t.s)), tail: Math.min(...a.map(t => t.s)) };
  },

  /* muncul semula automatik */
  escortSpawn(team) {
    const P = this.path, { lead, tail } = this.convoySpan();
    if (team === 'A') {
      const s = Math.max(4, tail - ESC.BLUE_BEHIND);
      return P.pos(s, rand(-8, 8));
    }
    let s = lead + ESC.RED_AHEAD;
    if (s > P.L - 6) s = P.L - 6;
    const lim = P.half(s) - 7;
    return P.pos(s + rand(-6, 6), rand(-lim, lim));
  },

  /* bot merah: tiga "pemburu" utamakan kargo, dua lagi lawan kereta */
  escortTarget(e) {
    if (e.team !== 'B') return null;
    const hunter = e.sp.idx < 3;
    let best = null, bd = hunter ? 90 : 0;
    // kereta biru yang terlalu dekat tetap dilawan dahulu
    for (const h of this.hostilesOf('B')) {
      if (h.cargo) continue;
      const d = Math.hypot(h.x - e.x, h.z - e.z);
      if (d < 15) return h;
    }
    for (const t of this.trucks) {
      if (t.dead) continue;
      const d = Math.hypot(t.x - e.x, t.z - e.z);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  },

  /* objektif bot biru: kawal di sekeliling konvoi */
  escortGuard(e) {
    const a = this.aliveTrucks();
    if (!a.length) return null;
    const lead = a.reduce((m, t) => (t.s > m.s ? t : m), a[0]);
    const k = e.sp.idx;
    const ahead = k % 2 ? 10 : -6;
    const lim = this.path.half(lead.s + ahead) - 6;
    return this.path.pos(lead.s + ahead, clamp((k - 1.5) * 7, -lim, lim));
  },

  hurtCargo(t, dmg) {
    if (t.dead || dmg <= 0) return;
    t.hp -= dmg;
    t.flash = Math.min(1, t.flash + 0.35);
    t.calm = 0;
    if (!this._cargoWarn || this.g.time - this._cargoWarn > 6) {
      this._cargoWarn = this.g.time;
      this.UI.toast(`${t.name} UNDER ATTACK`);
    }
    if (t.hp > 0) return;
    t.hp = 0; t.dead = true;
    this.score.B++;
    const g = this.g;
    g.explodeAt(t.x, 2, t.z, 9, 0, false, true);
    g.fx.explode(t.x, 3, t.z, 7, [1.8, 1.0, 0.3]);
    g.shake(1.0, 0.4);
    // bangkai hangus kekal di jalan
    t.mats.paint.color.setHex(0x1a1714); t.mats.cargo.color.setHex(0x151311);
    t.mats.glow.emissive.setHex(0x000000);
    t.mesh.rotation.z = rand(-0.08, 0.08);
    this.UI.streak(`${t.name} DESTROYED`, '#ff4a3a', `${this.aliveTrucks().length} CARGO LEFT`);
    Sfx.tone(140, 0.6, 'sawtooth', 0.24, 50); Sfx.noise(0.6, 0.5, 600, 1);
    this.syncHud();
  },

  /* kereta tidak boleh menembusi trak: dua bulatan sepanjang badan */
  pushOffTrucks(o, r) {
    for (const t of this.trucks) {
      const fx = Math.sin(t.ang), fz = Math.cos(t.ang);
      for (const k of [2.6, -0.4, -3.0]) {
        const cx = t.x + fx * k, cz = t.z + fz * k;
        const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz), rr = 2.1 + r;
        if (d < rr && d > 0.001) { o.x = cx + dx / d * rr; o.z = cz + dz / d * rr; }
      }
    }
  },

  updateEscort(dt) {
    const g = this.g, p = g.player, P = this.path;
    const alive = this.aliveTrucks();
    // siapa dekat kargo?
    let blue = 0, red = 0;
    const near = (o) => alive.some(t => Math.hypot(o.x - t.x, o.z - t.z) < ESC.NEAR);
    if (!p.dead && near(p)) blue++;
    for (const a of this.allies) if (!a.dead && near(a)) blue++;
    for (const e of g.enemies) if (e.teamBot && !e.dead && near(e)) red++;
    const st = blue > 0 && red === 0 ? 'moving' : blue > 0 ? 'contested' : red > 0 ? 'attacked' : 'waiting';
    if (st !== this.cvState) {
      this.cvState = st;
      if (st === 'contested') this.UI.toast('CONVOY CONTESTED - CLEAR THE ENEMIES');
      else if (st === 'waiting' && alive.length) this.UI.toast('CONVOY STOPPED - STAY NEAR THE CARGO');
    }
    const spd = st === 'moving' ? 2.7 + 0.45 * Math.min(2, blue - 1) : 0;
    this.cvSpd = spd;

    for (const t of this.trucks) {
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 4);
      if (t.dead) { if (Math.random() < dt * 6) g.fx.smoke(t.x + rand(-1, 1), 3, t.z + rand(-2, 2), 1, { speed: 1.5, size: 2, life: 2, alpha: 0.4, rise: 2 }); continue; }
      // jangan rapat sangat dengan trak hidup di hadapan
      let room = 1e9;
      for (const o of alive) if (o !== t && o.s > t.s) room = Math.min(room, o.s - t.s - ESC.GAP);
      const v = room > 0 ? spd : 0;
      const before = t.s;
      t.s = Math.min(t.cap, t.s + v * dt);
      const moved = t.s - before;
      if (!t.delivered && t.s >= t.cap - 0.01) {
        t.delivered = true; this.score.A++;
        this.UI.streak(`${t.name} DELIVERED`, '#7dffb0');
        Sfx.buy(); this.syncHud();
      }
      const Q = P.at(t.s);
      t.vx = Q.dx * (moved / Math.max(dt, 1e-4)); t.vz = Q.dz * (moved / Math.max(dt, 1e-4));
      t.x = Q.x; t.z = Q.z;
      const want = Math.atan2(Q.dx, Q.dz);
      let da = want - t.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      t.ang += da * Math.min(1, dt * 3);
      t.spin += moved / 0.78;
      t.mesh.position.set(t.x, 0.03 + (moved > 0 ? Math.sin(g.time * 18) * 0.02 : 0), t.z);
      t.mesh.rotation.y = t.ang;
      for (const w of t.wheels) w.rotation.x = t.spin;
      t.mats.glow.emissiveIntensity = 1.6 + t.flash * 3;
      t.mats.paint.emissive && t.mats.paint.emissive.setRGB(t.flash * 0.6, t.flash * 0.15, t.flash * 0.1);
      if (moved > 0 && Math.random() < dt * 4) g.fx.smoke(t.x - Math.sin(t.ang) * 5, 0.4, t.z - Math.cos(t.ang) * 5, 1, { speed: 1, size: 1.2, life: 1, alpha: 0.25 });
      // pulih perlahan bila tiada serangan selama 5s
      t.calm += dt;
      if (t.calm > 5) t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.012 * dt);
      // turet pertahanan: tembakan kecil ke musuh merah terdekat
      t.turCd -= dt;
      let tgt = null, td = 34;
      for (const e of g.enemies) {
        if (!e.teamBot || e.dead) continue;
        const d = Math.hypot(e.x - t.x, e.z - t.z);
        if (d < td) { td = d; tgt = e; }
      }
      if (tgt) {
        const aim = Math.atan2(tgt.x - t.x, tgt.z - t.z) - t.ang;
        t.tur.rotation.y = aim;
        if (t.turCd <= 0) {
          t.turCd = 0.5;
          const ty = 4.7, ox = t.x - Math.sin(t.ang) * 0.4, oz = t.z - Math.cos(t.ang) * 0.4;
          g.fx.beam(ox, ty, oz, tgt.x, 1.2, tgt.z, [0.5, 1.4, 2.4], 0.12, 0.08);
          tgt.lastHitBy = null;
          g.damageEnemy(tgt, (8 + this.L * 1.2) * abScale(this.L), tgt.x - t.x, 0, tgt.z - t.z, 0, 'ally', null);
        }
      }
    }
    // kereta tidak menembusi trak
    if (!p.dead && !(p.y > 1.6)) this.pushOffTrucks(p, p.r || 2);
    for (const b of this.allBots()) if (!b.dead) this.pushOffTrucks(b, b.r || 2);
  },

  /* HUD: bar kemajuan konvoi + keadaan */
  escortHud() {
    const el = document.getElementById('thBea');
    if (!el) return;
    const L = this.path.L;
    const span = this.convoySpan();
    const pct = clamp(span.lead / L, 0, 1) * 100;
    const marks = this.trucks.map(t => `<b class="${t.dead ? 'x' : t.delivered ? 'ok' : ''}" style="left:${(t.s / L * 100).toFixed(1)}%"></b>`).join('');
    const S = { moving: 'CONVOY MOVING', contested: 'CONTESTED', attacked: 'UNDER ATTACK', waiting: 'STOPPED - ESCORT IT' }[this.cvState] || '';
    el.innerHTML = `<div class="esc-bar"><i style="width:${pct.toFixed(1)}%"></i>${marks}<em></em></div><div class="esc-st ${this.cvState}">${S}</div>`;
  },

  escortSpawnOpts() {
    const a = this.escortSpawn('A'), b = this.escortSpawn('B');
    return { mine: [{ id: 'base', name: '▶', label: 'BEHIND THE CONVOY', x: a.x, z: a.z }], foe: [{ x: b.x, z: b.z }] };
  },

  escortMini(sx, sy) {
    return this.trucks.map(t => `<rect x="${(+sx(t.x) - 4).toFixed(1)}" y="${(+sy(t.z) - 4).toFixed(1)}" width="8" height="8" rx="2" fill="${t.dead ? '#555' : '#7fc4ff'}" stroke="#fff" stroke-width="1"/>`).join('');
  },
};
void TAU;

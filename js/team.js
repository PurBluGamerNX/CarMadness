// team.js — mod pasukan 5 lawan 5 (pemain + 4 bot rakan lawan 5 bot musuh)
//   tdm    : Team Deathmatch — pasukan pertama capai 25 bunuh menang
//   beacon : Beacon Rush — tawan suar untuk mata & untuk muncul semula di situ
//   escort : Cargo Escort — iring 3 trak kargo sepanjang Convoy Pass (escort.js)
import * as THREE from 'three';
import { rand, randInt, pick, clamp, lerp, TAU, PI, turnTo, Save, Sfx } from './core.js';
import { CARS, CAR_BY, getLoadout, carBalance, slotMulOf, getCarUp } from './cars.js';
import { hpScale, abScale } from './scale.js';
import { WEAPONS, WBY, weaponStats } from './weapons.js';

/* hanya senjata yang BENAR-BENAR bahan letupan meletup bila ditembak bot; senjata lain
   (Pulse, Gale, Singularity, Lantern, Nettle, Wind Charge...) mempunyai kesan khas yang bot
   tidak tiru - dahulu semuanya jadi peluru meletup + tolak balik (aduan Nabil) */
const BOT_BOOM = new Set(['rocket', 'plasma', 'swarm', 'blaze', 'frost', 'venom', 'mortar', 'flak', 'seeker', 'huntershell', 'vulag', 'stinger']);
// jenis senjata yang bot tembak terus (tiada peluru terbang)
const HITSCAN = new Set(['beam', 'tether', 'chain', 'charge', 'wave', 'orbit', 'flame']);
/* Ketepatan bot untuk senjata segera (Nabil 2026-10-19: "bot kuat sangat"). Pemain mesti membidik
   beam/charge/chain sendiri; bot dahulu kena 100%. Kini 75% - setanding pemain yang membidik baik. */
const BOT_ACC = 0.65;
/* Bidikan peluru bot (Nabil 2026-10-19: "bagi bot lemah sikit, aiming tak terlalu tepat"):
   serakan minimum lebih besar, ramalan gerakan separuh sahaja + ralat bidik rawak setiap das. */
const BOT_SPREAD = 0.075, BOT_LEAD = 0.45, BOT_AIMERR = 1.6;
/* Nabil 2026-10-19: "bot kena nerf 50%, terlampau kuat" - damage SEMUA bot (musuh DAN sepasukan)
   separuh. Pemain tidak disentuh. */
const BOT_DMG = 0.5;

/* DPS berterusan sebenar: kira masa reload, had suhu pancaran dan masa cas.
   Dipakai untuk menormalkan damage bot supaya semua senjata seimbang. */
export function sustainedDps(w, s) {
  if (w.type === 'beam' || w.type === 'tether') {
    const heat = w.type === 'tether' ? 0.3 : 0.42, cool = (s.coolFast ? 0.62 : 0.34) * 1.4;
    const on = 0.85 / heat, off = 0.85 / cool;
    return s.dps * on / (on + off);
  }
  if (s.infinite) return s.dps * 0.8;
  let fire = s.mag / s.rof;
  if (w.type === 'charge') fire = s.mag * Math.max(1 / s.rof, 1 / (s.fastCharge ? 1.45 : 1));
  if (s.seq) fire += Math.floor(s.mag / s.seq) * (s.seqPause || 0.5);
  return s.dps * (s.mag / s.rof) / (fire + s.reload);
}
import { botCarInstance } from './models.js';
import { makeEnemy, disposeEnemy } from './enemies.js';
import { HALF } from './world.js';
import { MAPS } from './maps.js';
import { Econ } from './econ.js';
import { Missions } from './missions.js';
import { ESCORT } from './escort.js';

export const TEAM_MODES = {
  tdm: {
    name: 'Team Deathmatch', theme: 'warzone', layout: 'valley', target: 25, time: 420,
    desc: 'You and 4 bot teammates against 5 enemy bots. First team to 25 kills wins.',
  },
  beacon: {
    name: 'Beacon Rush', theme: 'warzone', layout: 'valley', target: 300, time: 480,
    desc: 'Capture the 5 beacons. Every beacon you hold scores points and becomes a respawn point. First to 300 wins.',
  },
  /* 2026-10-18 (Nabil): iring 3 trak kargo besar; peta sendiri Convoy Pass */
  escort: {
    name: 'Cargo Escort', theme: 'wasteland', layout: 'convoy', map: 'convoy', target: 3, time: 540,
    desc: 'Escort 3 big cargo trucks down a long winding pass. They only move while your team is next to them - the 5 enemy bots try to blow them up.',
  },
};

/* Titik muncul TDM, suar, pangkalan & lorong kini datang daripada peta (maps.js). */

const BOT_NAMES =['Hex', 'Rook', 'Viper', 'Blaze', 'Nova', 'Talon', 'Grit', 'Echo', 'Jinx', 'Moss', 'Ash', 'Kilo', 'Dune', 'Pike', 'Onyx', 'Rust'];
const CAP_R = 11;          // jejari tawan suar
const CAP_TIME = 6;        // saat untuk satu kereta menawan suar neutral

/* Rentetan bunuhan: setiap bunuhan berturut-turut dalam CHAIN_WINDOW saat
   menaikkan satu tangga. Bunuhan pertama perlawanan diumumkan FIRST BLOOD. */
const STREAK = [
  { t: 'KILL', c: '#cfe0f0' },
  { t: 'DOUBLE KILL', c: '#8fd8ff' },
  { t: 'TRIPLE KILL', c: '#7dffb0' },
  { t: 'QUADRA KILL', c: '#ffd257' },
  { t: 'GODLIKE', c: '#ffa03a' },
  { t: 'BEYOND GODLIKE', c: '#ff6a3a' },
  { t: 'LIVING LEGEND', c: '#ff4a7a' },
  { t: 'ULTRA BEAST', c: '#ff3bd0' },
];
const CHAIN_WINDOW = 4.5;

export class Team {
  constructor(g, mode, UI) {
    this.g = g; this.mode = mode; this.UI = UI;
    this.M = TEAM_MODES[mode];
    this.mapId = g.mapId && MAPS[g.mapId] ? g.mapId : 'valley';
    this.map = MAPS[this.mapId];
    this.acidT = 0;
    this.score = { A: 0, B: 0 };
    this.kills = { A: 0, B: 0 };
    this.time = this.M.time;
    this.over = false;
    this.allies = [];
    this.respawnT = 0;
    this.spawnPick = 'base';
    this.hpDrop = 12;
    this.tick = 0;
    this.myKills = 0; this.myDeaths = 0;
    this.startT = 5;              // kira detik sebelum perlawanan bermula
    this._cd = null;
    this.firstBlood = false;
    this.chain = 0; this.chainT = 0;

    // kuasa bot ikut purata level senjata pemain, supaya perlawanan sentiasa seimbang
    const lo = getLoadout(Save.d.car).filter(Boolean);
    const lvs = lo.map(id => Save.d.lv[id] || 1);
    this.L = lvs.length ? lvs.reduce((a, b) => a + b, 0) / lvs.length : 1;
    g.wave = Math.round(3 + this.L * 0.6);        // kebolehan kereta ikut skala ini

    this.buildBeacons();
    if (mode === 'escort') this.setupEscort();
    this.buildHud();

    // pemain di pangkalan biru (selatan), menghadap utara
    const p = g.player;
    p.x = this.map.bases.A.x; p.z = this.map.bases.A.z + 6; p.ang = 0;
    p.spawnShield = 6;
    /* TDM: pemain memilih satu daripada tiga titik muncul semasa kira detik.
       Beacon Rush: mula di pangkalan sahaja, pilihan hanya bila muncul semula. */
    if (this.mode === 'tdm') {
      this.spawnPick = 'tB';
      const s0 = this.map.spawns.A[1];
      p.x = s0.x; p.z = s0.z;
    }
    if (this.mode === 'escort') {
      const s0 = this.escortSpawn('A');
      p.x = s0.x; p.z = s0.z; p.ang = Math.atan2(s0.dx, s0.dz);
    }

    const used = new Set([Save.d.car]);
    const pickCar = () => {
      const pool = CARS.filter(c => !used.has(c.id));
      const c = pick(pool.length ? pool : CARS);
      used.add(c.id);
      return c;
    };
    const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < 4; i++) this.allies.push(this.makeAlly(pickCar(), names.pop(), i));
    this.enemySpecs = [];
    for (let i = 0; i < 5; i++) this.enemySpecs.push(this.makeSpec(pickCar(), 'B', names.pop(), i));
    for (const sp of this.enemySpecs) this.spawnEnemy(sp, this.botSpawnPick('B'));
    UI.banner(this.M.name.toUpperCase() + ' · ' + this.map.name.toUpperCase(), '#7fc4ff');
    UI.toast(mode === 'tdm' ? 'FIRST TEAM TO 25 KILLS WINS' : mode === 'escort' ? 'STAY NEXT TO THE CARGO TRUCKS TO MOVE THEM' : 'CAPTURE BEACONS · FIRST TO 300 POINTS');
    g.state = 'countdown';        // semua beku sehingga kira detik habis
    if (mode === 'tdm') this.showSpawnPicker('start');
  }

  /* ---------------- bot ---------------- */
  makeSpec(car, team, name, idx) {
    /* Bot boleh guna MANA-MANA senjata - satu untuk setiap slot kereta, dan
       senjata itu benar-benar menembak mengikut sifatnya sendiri (lihat botFire).
       Kuasa keseluruhan bot kekal sama apa pun kombinasinya. */
    const n = clamp(car.mountSlots || car.slots || 2, 1, 4);
    const pool = WEAPONS.slice().sort(() => Math.random() - 0.5);
    const weapons = pool.slice(0, n).map(w => w.id);
    // jarak bertempur ikut senjata paling pendek, supaya senjata jarak dekat masih kena
    const minR = Math.min(...weapons.map(id => WBY[id].base.range));
    return {
      key: car.id + '_' + team + '_' + weapons.join('_'), car, team, name, idx,
      color: car.color, spec: car.spec, slots: car.mountSlots || car.slots, weapons,
      lane: (this.map.lanes || [-70, 0, 70, -70, 70])[idx % 5],
      keep: clamp(minR * 0.55, 8, 30) + (idx % 3) * 2,
    };
  }

  /* Senapang bot: statistik sebenar senjata (kadar, magazin, reload, pelet,
     serakan, kelajuan, letupan) pada tahap bot, tetapi damage dinormalkan
     supaya setiap senjata menyumbang bahagian DPS yang SAMA. Jadi senjata
     berlainan terasa berlainan, namun tiada bot yang jauh lebih kuat. */
  makeGuns(sp) {
    const lv = clamp(Math.round(this.L), 1, 20);
    const mul = slotMulOf(sp.car.id);   // SATU SKALA: bot menembak dengan damage senjata sebenar
    return sp.weapons.map(id => {
      const w = WBY[id], s = weaponStats(id, lv);
      const hitscan = HITSCAN.has(w.type);
      return {
        id, w, s, hitscan,
        scale: mul,
        cd: rand(0.2, 1.2), mag: s.mag, reload: 0, heat: 0, over: false,
        on: 0, acc: 0, accT: 0, fireT: 0,
      };
    });
  }

  botStats(sp) {
    const L = this.L;
    return {
      // formula SAMA dengan pemain (weapons.js carStats: 150 + 35/armour + 1.5 x mods.hp), x skala tahap.
      // Armour bot = tahap Body Armour kereta pemain sekarang (cermin, adil).
      hp: (150 + 35 * ((getCarUp(Save.d.car) || {}).armor || 0) + (sp.car.mods.hp || 0) * 1.5) * hpScale(L),
      spd: 15.5 * (sp.car.mods.speed || 1),
      // kereta tebal/perlahan menembak sedikit kurang - sama seperti pemain
      dps: (17 + 2.2 * L) * carBalance(sp.car.id),
    };
  }

  initBot(e, sp) {
    const st = this.botStats(sp);
    Object.assign(e, {
      teamBot: true, team: sp.team, sp, name: sp.name,
      hp: st.hp, maxHp: st.hp, spdMax: st.spd, dps: st.dps,
      dmgTake: (this.g.player && this.g.player.stats && this.g.player.stats.dmgTake) || 1,
      tgt: null, retarget: 0, fireCd: rand(0.3, 1.2), burst: 0, burstCd: 0,
      // markah tinggal pada SPEC, bukan pada kereta - kalau tidak ia terpadam
      // setiap kali bot muncul semula dan papan pendahulu sentiasa sifar
      kills: sp.kills || 0, deaths: sp.deaths || 0, lastHitBy: null,
      orbit: Math.random() < 0.5 ? 1 : -1, stuckT: 0, unstick: 0, unstickDir: 1,
      ang: sp.team === 'A' ? 0 : PI, r: 2.0, h: 1.9, y: 0,
      guns: this.makeGuns(sp), sightOk: true, sightT: 0,
    });
  }

  /* kawasan pangkalan pasukan A: selagi pemain berada di sini perisai
     muncul semula tidak susut, jadi tiada lagi mati sebaik sahaja keluar */
  atOwnBase(x, z) {
    const b = this.map.bases.A;
    return Math.hypot(x - b.x, z - b.z) < 26;
  }

  spawnPoint(team, preferred) {
    if (this.mode === 'escort' && this.trucks) return this.escortSpawn(team);   // muncul automatik
    const base = this.map.bases[team];
    let pt = { x: base.x + rand(-14, 14), z: base.z + rand(-4, 4) * (team === 'A' ? 1 : -1) };
    const ts = this.mode === 'tdm' && preferred && this.map.spawns[team].find(s => s.id === preferred);
    if (ts) return { x: ts.x + rand(-6, 6), z: ts.z + rand(-3, 3) };
    if (preferred && preferred !== 'base') {
      const b = this.beacons.find(x => x.id === preferred && x.own === team);
      if (b) pt = { x: b.x + rand(-6, 6), z: b.z + (team === 'A' ? -7 : 7) };
    }
    return pt;
  }

  // titik muncul bot: suar sendiri paling hampir dengan pertempuran, jika ada
  botSpawnPick(team) {
    if (this.mode === 'tdm') return pick(this.map.spawns[team]).id;
    if (this.mode !== 'beacon') return 'base';
    const own = this.beacons.filter(b => b.own === team);
    if (!own.length || Math.random() < 0.3) return 'base';
    return pick(own).id;
  }

  makeAlly(car, name, idx) {
    const sp = this.makeSpec(car, 'A', name, idx);
    const b = botCarInstance(sp);
    const a = {
      x: 0, z: 0, vx: 0, vz: 0, spd: 0, mesh: b.root, mats: b.mats, turrets: b.turrets,
      flash: 0, slowT: 0, lockT: 0, dead: false, respawn: 0, d: { label: name },
    };
    a.baseCol = {};
    for (const k in b.mats) a.baseCol[k] = b.mats[k].color.clone();
    this.initBot(a, sp);
    const pt = this.spawnPoint('A', this.botSpawnPick('A'));
    a.x = pt.x; a.z = pt.z;
    this.g.scene.add(a.mesh);
    return a;
  }

  spawnEnemy(sp, where) {
    const g = this.g;
    if (!sp) return null;
    sp.pending = false;
    // penjaga keras: kalau spec ini masih hidup di arena, jangan buat kembar
    for (const o of g.enemies) if (o.teamBot && !o.dead && o.sp === sp) return o;
    const pt = this.spawnPoint('B', where);
    g._botSpec = sp;
    const e = makeEnemy(g, 'bot', pt.x, pt.z, g.wave);
    g._botSpec = null;
    this.initBot(e, sp);
    e.x = pt.x; e.z = pt.z;
    g.enemies.push(e);
    return e;
  }

  hostilesOf(team) {
    const g = this.g, out = [];
    if (team === 'B') {
      if (g.decoy) out.push(g.decoy);
      else if (!g.player.dead && !g.player.cloak) out.push(g.player);
      for (const a of this.allies) if (!a.dead) out.push(a);
      if (this.trucks) for (const t of this.trucks) if (!t.dead) out.push(t);
    } else {
      for (const e of g.enemies) if (!e.dead) out.push(e);
    }
    return out;
  }

  findTarget(e) {
    if (this.mode === 'escort') { const t = this.escortTarget(e); if (t) return t; }
    let best = null, bd = 70;
    for (const h of this.hostilesOf(e.team)) {
      const d = Math.hypot(h.x - e.x, h.z - e.z);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  nearestHostileAnywhere(e) {
    let best = null, bd = 1e9;
    for (const h of this.hostilesOf(e.team)) {
      const d = Math.hypot(h.x - e.x, h.z - e.z);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  pickBeacon(e) {
    // suar bukan milik pasukan sendiri, yang terdekat (dengan sedikit variasi setiap bot)
    let best = null, bd = 1e9;
    for (const b of this.beacons) {
      const mine = b.own === e.team && Math.abs(b.cap) >= 100;
      const contested = b.own === e.team && (e.team === 'A' ? b.enemyHere : b.allyHere);
      let d = Math.hypot(b.x - e.x, b.z - e.z) + ((b.x - e.sp.lane) ** 2) * 0.004;
      if (mine && !contested) d += 400;
      if (contested) d -= 40;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  /* laluan: setiap peta boleh beri titik laluan sendiri (rabung Valley,
     jambatan Acid Bridges); kalau tiada, terus ke sasaran */
  waypoint(e, tx, tz) {
    return (this.map.waypoint && this.map.waypoint(e, tx, tz)) || { x: tx, z: tz };
  }

  updateBot(e, dt) {
    if (e.dead) return;
    const g = this.g;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 4.5);
    if (e.slowT > 0) e.slowT -= dt;
    if (e.markT > 0) e.markT -= dt;
    if (e.jamT > 0 && e.team === 'A') e.jamT -= dt;   // bot merah: disusut dalam enemies.js (elak susut dua kali)
    const locked = e.lockT > 0;
    if (locked) e.lockT -= dt;
    if (e.blindT > 0) e.blindT -= dt;

    e.retarget -= dt;
    if (e.retarget <= 0 || !e.tgt || e.tgt.dead || (e.tgt === g.player && (g.player.cloak || g.player.dead))) {
      e.tgt = this.findTarget(e); e.retarget = 0.5;
    }
    /* Corsair Swap Hook: bot yang pening menyerang pasukannya sendiri */
    if (e.confT > 0) {
      e.confT -= dt;
      let m = null, md = 60;
      for (const o of (e.team === 'B' ? g.enemies : this.allies)) {
        if (o === e || o.dead || !o.teamBot) continue;
        const d = Math.hypot(o.x - e.x, o.z - e.z);
        if (d < md) { md = d; m = o; }
      }
      if (m) e.tgt = m;
      if (e.confT <= 0) e.tgt = null;
    }
    const t = e.tgt;

    // objektif
    let ox, oz;
    if (this.mode === 'beacon') {
      const b = this.pickBeacon(e);
      ox = b.x + Math.sin(e.sp.idx * 2.1) * 5; oz = b.z + Math.cos(e.sp.idx * 2.1) * 5;
    } else if (this.mode === 'escort' && e.team === 'A' && this.escortGuard(e)) {
      const q = this.escortGuard(e);
      ox = q.x; oz = q.z;
    } else {
      const h = t || this.nearestHostileAnywhere(e);
      if (h) { ox = h.x; oz = h.z; } else { ox = e.sp.lane; oz = 0; }
    }
    let dirX, dirZ;
    const td = t ? Math.hypot(t.x - e.x, t.z - e.z) : 1e9;
    const objD = Math.hypot(ox - e.x, oz - e.z);
    const escFight = this.mode === 'escort' && (e.team === 'B' ? !t || !t.cargo || td < 24 : objD < 40);
    if (t && td < 48 && (this.mode === 'tdm' || escFight || objD < 30)) {
      // bertempur: kekal pada jarak & mengelilingi sasaran
      const nx = (t.x - e.x) / td, nz = (t.z - e.z) / td;
      const radial = clamp((td - e.sp.keep) * 0.08, -1, 1);
      dirX = nx * radial - nz * e.orbit * 0.9;
      dirZ = nz * radial + nx * e.orbit * 0.9;
      if (Math.random() < dt * 0.2) e.orbit *= -1;
    } else {
      const w = this.waypoint(e, ox, oz);
      const d = Math.hypot(w.x - e.x, w.z - e.z) || 1;
      dirX = (w.x - e.x) / d; dirZ = (w.z - e.z) / d;
      if (objD < 5) { dirX *= 0.2; dirZ *= 0.2; }
    }
    // pisahkan daripada kereta lain
    for (const o of this.allBots()) {
      if (o === e || o.dead) continue;
      const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz);
      if (d < 6 && d > 0.01) { dirX += dx / d * (6 - d) * 0.25; dirZ += dz / d * (6 - d) * 0.25; }
    }
    // tersekat? pusing seketika
    if (e.unstick > 0) {
      e.unstick -= dt;
      const a = Math.atan2(dirX, dirZ) + e.unstickDir * 1.6;
      dirX = Math.sin(a); dirZ = Math.cos(a);
    }
    const want = Math.hypot(dirX, dirZ);
    const wantAng = want > 0.05 ? Math.atan2(dirX, dirZ) : e.ang;
    e.ang = turnTo(e.ang, wantAng, dt * 2.8);
    const facing = Math.cos(wantAng - e.ang);
    const thr = locked ? 0 : clamp(want, 0, 1) * (facing > 0 ? 1 : 0.35);
    // Gyhna Repair Link: +10 km/j (~2.8 m/s) untuk rakan yang dipaut
    const v = (e.spdMax + (e.linkedUntil > g.time ? 2.8 : 0)) * thr * (e.slowT > 0 ? 0.5 : 1);
    const k = clamp(dt * 3, 0, 1) * (e.slipT > 0 ? 0.1 : 1);     // Breeze: atas ais - susah kawal
    e.vx = lerp(e.vx, Math.sin(e.ang) * v, k);
    e.vz = lerp(e.vz, Math.cos(e.ang) * v, k);
    const px = e.x, pz = e.z;
    e.x += e.vx * dt; e.z += e.vz * dt;
    e.x = clamp(e.x, -HALF + 3, HALF - 3); e.z = clamp(e.z, -HALF + 3, HALF - 3);
    if (!e.d.fly) g.avoidProps(e);
    const moved = Math.hypot(e.x - px, e.z - pz) / Math.max(dt, 1e-4);
    e.spd = moved;
    if (thr > 0.5 && moved < 2.5) e.stuckT += dt; else e.stuckT = Math.max(0, e.stuckT - dt);
    if (e.stuckT > 1.2) { e.stuckT = 0; e.unstick = 1.1; e.unstickDir = Math.random() < 0.5 ? 1 : -1; }

    // tembak
    if (t && !locked && td < 52) {
      const aim = Math.atan2(t.x - e.x, t.z - e.z) - e.ang;
      for (const tu of e.turrets || []) if (tu) tu.rotation.y = turnTo(tu.rotation.y, Math.atan2(Math.sin(aim), Math.cos(aim)), dt * 6);
    }
    this.botFire(e, (t && !locked && td < 52) ? t : null, td, dt);

    // mesh
    if (e.mesh) {
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = e.ang;
      if (e.flash > 0.01 || e._wasFlash) {
        for (const kk in e.mats) {
          const c = e.baseCol[kk];
          e.mats[kk].color.setRGB(c.r + e.flash * 2, c.g + e.flash * 2, c.b + e.flash * 2);
        }
        e._wasFlash = e.flash > 0.01;
      }
    }
  }

  /* Acid Bridges: setiap kereta (pemain & bot) dalam asid kena damage
     ~12% HP maksimum sesaat, dikenakan setiap 0.25s, dan diperlahankan. */
  acidTick(dt) {
    const g = this.g, M = this.map;
    this.acidT -= dt;
    const p = g.player;
    const pIn = !p.dead && !(p.y > 1.6) && M.inAcid(p.x, p.z);
    if (pIn) {
      p.vx *= 1 - Math.min(1, dt * 1.6); p.vz *= 1 - Math.min(1, dt * 1.6);
      if (Math.random() < dt * 14) g.fx.add.emit(p.x + rand(-1.5, 1.5), 0.3, p.z + rand(-1.5, 1.5), 0, rand(1, 3), 0,
        { color: [0.6, 2.2, 0.4], color2: [0.1, 0.5, 0.05], size: rand(0.3, 0.7), size2: 0.05, life: 0.5, drag: 1.2 });
    }
    if (this.acidT > 0) return;
    this.acidT = 0.25;
    if (pIn) {
      g.hurtPlayer(p.maxHp * M.acidDps * 0.25, p.x, p.z, true);
      if (!this._acidWarn || g.time - this._acidWarn > 3) { this._acidWarn = g.time; this.UI.toast('ACID! GET OUT'); }
    }
    for (const b of this.allBots()) {
      if (b.dead || (b.d && b.d.fly) || !M.inAcid(b.x, b.z)) continue;
      const d = b.maxHp * M.acidDps * 0.25;
      b.slowT = Math.max(b.slowT || 0, 0.4);
      if (b.team === 'A') this.hurtAlly(b, d, null);
      else g.damageEnemy(b, d, 0, 0, 0, 0, 'acid', null);
    }
  }

  allBots() {
    if (this._bf !== this.g.time) {
      this._bf = this.g.time;
      this._bots = this.allies.concat(this.g.enemies);
    }
    return this._bots;
  }

  /* garis pandang antara dua titik - prop tinggi menghalang tembakan terus */
  clearLine(ax, az, bx, bz, br) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz) || 1;
    const ux = dx / d, uz = dz / d;
    for (const o of this.g.world.props) {
      if (!o.alive || o.explosive || (o.h || 2.6) < 1.2) continue;
      const ox = o.x - ax, oz = o.z - az;
      const t = ox * ux + oz * uz;
      if (t <= 0.5 || t >= d - (br + 0.5)) continue;
      const cx = ox - ux * t, cz = oz - uz * t;
      if (cx * cx + cz * cz < o.r * o.r * 0.7) return false;
    }
    return true;
  }

  /* kenakan damage terus pada sasaran bot (pemain, rakan, atau bot merah) */
  botHit(e, t, dmg, slow) {
    const g = this.g;
    if (dmg <= 0 || t.dead) return;
    // Hyna: tembakan bot merah ke sasaran dalam kubah diserap oleh kubah
    if (e.team === 'B' && g.dome && Math.hypot(t.x - g.dome.x, t.z - g.dome.z) < g.dome.r) {
      const d = g.dome, a = Math.atan2(e.x - d.x, e.z - d.z);
      g.domeAbsorb(dmg, d.x + Math.sin(a) * d.r, 1.6, d.z + Math.cos(a) * d.r);
      return;
    }
    if (t === g.player) g.hurtPlayer(dmg, e.x, e.z, true);
    else if (this.allies.includes(t)) this.hurtAlly(t, dmg, e);
    else if (t === g.decoy) { t.hp = (t.hp || 0) - dmg; }
    else if (t.cargo) this.hurtCargo(t, dmg);
    else {
      t.lastHitBy = e;
      g.damageEnemy(t, dmg, t.x - e.x, 0, t.z - e.z, 0, 'ally', null);
      if (slow) t.slowT = Math.max(t.slowT || 0, slow);
    }
  }

  botFire(e, t, td, dt) {
    const g = this.g, ally = e.team === 'A';
    e.sightT -= dt;
    if (t && e.sightT <= 0) { e.sightT = 0.2; e.sightOk = this.clearLine(e.x, e.z, t.x, t.z, t.r || 2); }
    const nearP = Math.hypot(e.x - g.player.x, e.z - g.player.z) < 45;
    const guns = e.guns || [];
    if (e.blindT > 0) return;             // dibutakan awan lebah
    for (let i = 0; i < guns.length; i++) {
      const gn = guns[i], s = gn.s, w = gn.w;
      // reload / suhu
      const jr = e.jamT > 0 ? 0.5 : 1;           // Hibachi Jammer Beam: tembak & reload separuh laju
      gn.cd -= dt * jr;
      if (gn.reload > 0) { gn.reload -= dt * jr; if (gn.reload <= 0) { gn.reload = 0; gn.mag = s.mag; } }
      const beam = w.type === 'beam' || w.type === 'tether';
      const range = Math.min(s.range, 52);
      const can = t && td < range && (gn.hitscan && !s.thruWalls ? e.sightOk : true);
      if (beam) {
        if (!can || gn.over) {
          gn.heat = clamp(gn.heat - (s.coolFast ? 0.62 : 0.34) * (gn.over ? 1.4 : 1) * dt, 0, 1);
          if (gn.over && gn.heat <= 0.15) gn.over = false;
          gn.acc = 0;
          continue;
        }
        gn.heat += dt * (w.type === 'tether' ? 0.3 : 0.42);
        if (gn.heat >= 1) gn.over = true;
      } else if (!can || gn.cd > 0 || gn.reload > 0) continue;

      // titik muncung: ikut turet kalau ada, kalau tidak hadapan kereta
      const ox = e.x + Math.sin(e.ang) * 1.5, oy = 1.9, oz = e.z + Math.cos(e.ang) * 1.5;
      const ty = (t.y || 0) + 1.0;
      const col = w.color;

      if (beam || w.type === 'flame') {
        // damage berterusan - dikumpul dan dihantar setiap 0.1s (pemain ada iframe 0.08s)
        if (w.type === 'flame') {
          if (gn.mag <= 0) { gn.reload = s.reload; continue; }
          gn.mag -= s.rof * dt;
          g.fx.add.emit(ox, oy, oz, (t.x - ox) * 2.2 + rand(-2, 2), rand(0, 2), (t.z - oz) * 2.2 + rand(-2, 2),
            { color: col, color2: [col[0] * 0.3, col[1] * 0.2, col[2] * 0.2], size: 0.6, size2: 1.8, life: 0.3, drag: 1.2, alpha: 0.8 });
        } else {
          g.fx.beam(ox, oy, oz, t.x, ty, t.z, col, 0.14, 0.05);
        }
        gn.acc += s.dps * gn.scale * dt * BOT_ACC * BOT_DMG;
        gn.accT += dt;
        if (gn.accT >= 0.1) {
          this.botHit(e, t, gn.acc, s.slowHit || 0);
          if (w.type === 'tether' || s.leech) e.hp = Math.min(e.maxHp, e.hp + gn.acc * (s.leech || 0.34));
          gn.acc = 0; gn.accT = 0;
        }
        if (nearP && g.time - gn.fireT > 0.25) { gn.fireT = g.time; Sfx.shoot(w.sfx || (w.type === 'flame' ? 'flame' : 'laser')); }
        continue;
      }

      // senjata bertembak: ikut kadar, magazin dan reload sebenar
      let gap = 1 / s.rof;
      if (w.type === 'charge') gap = Math.max(gap, s.fastCharge ? 0.7 : 1);
      if (s.seq && (s.mag - gn.mag + 1) % s.seq === 0) gap += s.seqPause || 0.5;
      gn.cd = gap;
      if (!s.infinite) { gn.mag--; if (gn.mag <= 0) gn.reload = s.reload; }
      const perShot = s.dps * gn.scale / s.rof * BOT_DMG;      // damage satu das (semua pelet)

      if (gn.hitscan) {
        // charge / chain / wave / orbit: kena terus, dengan kesan visual jenisnya
        if (w.type === 'chain') g.fx.lightning(ox, oy, oz, t.x, ty, t.z, col, 6);
        else if (w.type === 'charge') {
          g.fx.beam(ox, oy, oz, t.x, ty, t.z, [col[0] * 1.4, col[1] * 1.3, col[2] * 1.5], 0.3, 0.25);
          g.fx.flash(ox, oy, oz, col, 14, 0.18, 30);
        } else g.fx.spark(t.x, ty, t.z, 8, col, { speed: 7, size: 0.35, life: 0.3 });
        g.fx.muzzle(ox, oy, oz, Math.sin(e.ang), 0, Math.cos(e.ang), 1.2, col);
        if (Math.random() < BOT_ACC) this.botHit(e, t, perShot, s.slow ? 1.6 : (s.slowHit || 0));   // terlepas = kesan visual sahaja
        if (s.splash && w.type === 'charge') g.fx.explode(t.x, ty, t.z, Math.min(s.splash, 4), [1.4, 1.0, 0.6]);   // visual sahaja
        if (nearP) Sfx.shoot(w.sfx || (w.type === 'chain' ? 'tesla' : 'rail'));
        continue;
      }

      // proj / fan / rocket: peluru sebenar dengan pelet, serakan dan kelajuan senjata
      const n = Math.max(1, Math.round(w.type === 'rocket' && w.homing ? Math.min(s.pellets, 3) : s.pellets));
      const speed = clamp(s.speed || 120, 50, 220);
      const lt = td / speed * BOT_LEAD;
      const dx = (t.x + (t.vx || 0) * lt + rand(-BOT_AIMERR, BOT_AIMERR)) - ox, dz = (t.z + (t.vz || 0) * lt + rand(-BOT_AIMERR, BOT_AIMERR)) - oz;
      const l = Math.hypot(dx, dz) || 1;
      const base = Math.atan2(dx, dz);
      const spr = Math.max((s.spread || 0) * 1.5, BOT_SPREAD);
      const vy = (ty - oy) / l * speed;
      const boom = BOT_BOOM.has(w.id) && s.splash ? Math.min(s.splash, 4.5) : 0;
      // senjata mortar bot juga MELAMBUNG tinggi (puncak >= 12m) ke titik ramalan, melepasi dinding
      let lob = null;
      if (s.lob) {
        const tx = t.x + (t.vx || 0) * 0.9, tz = t.z + (t.vz || 0) * 0.9, dd = Math.hypot(tx - ox, tz - oz) || 1, grav = 32;
        const T = Math.max(dd / (speed * 0.75), Math.sqrt(8 * 12 / grav));
        lob = { grav, T, vx: (tx - ox) / T, vz: (tz - oz) / T, vy: (0.3 - oy) / T + 0.5 * grav * T };
      }
      for (let k = 0; k < n; k++) {
        const a = w.type === 'fan' && n > 1 ? base + ((k / (n - 1)) - 0.5) * 0.52 : base + rand(-spr, spr);
        const jx = lob && n > 1 ? rand(-2, 2) : 0, jz = lob && n > 1 ? rand(-2, 2) : 0;
        g.spawnBullet({
          x: ox, y: oy, z: oz,
          vx: lob ? lob.vx + jx / lob.T : Math.sin(a) * speed, vy: lob ? lob.vy : vy, vz: lob ? lob.vz + jz / lob.T : Math.cos(a) * speed,
          grav: lob ? lob.grav : 0,
          dmg: perShot / n, life: lob ? lob.T + 0.4 : (range + 6) / speed,
          pierce: 0, knock: 0, flags: null,
          splash: boom, rocket: w.type === 'rocket',
          burn: ally && s.burn ? 2 : 0, slow: ally ? (s.slowOnHit || 0) : 0,
          color: col, size: w.type === 'rocket' ? 0.18 : w.orb ? 0.3 : 0.09, len: w.type === 'rocket' ? 1.1 : 2.2,
          owner: ally ? 'p' : 'e', ally, kind: 'bullet', shooter: e, real: true,
        });
      }
      g.fx.muzzle(ox, oy, oz, Math.sin(base), 0, Math.cos(base), w.type === 'rocket' ? 1.6 : 0.8, col);
      if (nearP && Math.random() < (s.rof > 6 ? 0.25 : 1)) Sfx.shoot(w.sfx || (w.type === 'rocket' ? 'rocket' : 'smg'));
    }
  }

  /* peluru musuh terkena rakan pasukan */
  bulletVsAllies(b, px, py, pz, sgX, sgY, sgZ, nearT) {
    if (this.trucks) for (const c of this.trucks) {
      if (c.dead) continue;
      const t = nearT(c.x, c.z);
      const qx = px + sgX * t, qy = py + sgY * t, qz = pz + sgZ * t;
      if (Math.hypot(qx - c.x, qz - c.z) < c.r + 1.2 && qy < 4.4) {
        this.hurtCargo(c, b.dmg);
        this.g.fx.spark(qx, qy, qz, 5, b.color || [2, 1, 0.4], { speed: 5, size: 0.3, life: 0.3 });
        return true;
      }
    }
    for (const a of this.allies) {
      if (a.dead) continue;
      const t = nearT(a.x, a.z);
      const qx = px + sgX * t, qy = py + sgY * t, qz = pz + sgZ * t;
      if (Math.hypot(qx - a.x, qz - a.z) < a.r + 0.5 && qy < 2.8) {
        this.hurtAlly(a, b.dmg, b.shooter || null);
        this.g.fx.spark(qx, qy, qz, 5, b.color || [2, 1, 0.4], { speed: 5, size: 0.3, life: 0.3 });
        return true;
      }
    }
    return false;
  }

  hurtAlly(a, dmg, by) {
    if (a.dead) return;
    if (a.shield > 0) return;
    if (a.linkedUntil > this.g.time) dmg /= 1.5;     // Gyhna Repair Link: 50% kalis
    dmg = this.g.haloSoak(a, dmg);                    // Guardian Halo
    if (dmg <= 0) return;
    a.hp -= dmg;
    if (a.hp <= 0 && this.g.haloSave(a)) return;
    a.flash = Math.min(1, a.flash + 0.5);
    if (by) a.lastHitBy = by;
    if (a.hp <= 0) {
      a.dead = true;
      a.deaths = (a.deaths || 0) + 1;
      a.mesh.visible = false;
      a.respawn = 7;
      this.g.explodeAt(a.x, 1.2, a.z, 6, 0, false, true);
      this.addKill('B', a.lastHitBy);
    }
  }

  // dipanggil oleh killEnemy bagi bot musuh
  onEnemyKilled(e, src) {
    e.deaths = (e.deaths || 0) + 1;
    if (e.sp) e.sp.deaths = e.deaths;
    this.addKill('A', src === 'ally' ? (e.lastHitBy || null) : 'player');
    if (src !== 'ally') {
      const c = 25 + Math.round(this.L * 3);
      Econ.addCoins(c);
      this.g.earnedCoins = (this.g.earnedCoins || 0) + c;
      this.UI.toast(`${e.name} DESTROYED  +${c}`);
    }
    // satu spec hanya boleh ada satu entri dalam baris gilir muncul semula
    if (e.sp && !e.sp.pending) {
      e.sp.pending = true;
      (this.pend || (this.pend = [])).push({ sp: e.sp, t: 7 });
    }
    this.checkWipe();
  }

  addKill(team, by) {
    this.kills[team]++;
    if (this.mode === 'tdm') this.score[team]++;
    if (by === 'player') { this.myKills++; this.onPlayerKill(); }
    else if (by && typeof by === 'object') {
      by.kills = (by.kills || 0) + 1;
      if (by.sp) by.sp.kills = by.kills;          // kekal selepas muncul semula
    }
    this.syncHud();
  }

  onPlayerKill() {
    this.chain = Math.min(this.chain + 1, STREAK.length);
    this.chainT = CHAIN_WINDOW;
    if (!this.firstBlood) {
      this.firstBlood = true;
      this.UI.streak('FIRST BLOOD', '#ff4a7a');
      Sfx.tone(180, 0.5, 'sawtooth', 0.26, 70);
      Sfx.tone(360, 0.44, 'square', 0.18, 140, 0.06);
      Sfx.noise(0.4, 0.4, 900, 1.1, 0.02);
      return;
    }
    const s = STREAK[this.chain - 1];
    this.UI.streak(s.t, s.c, this.chain > 1 ? `${this.chain} KILLS IN A ROW` : '');
    // makin tinggi tangga, makin tinggi dan makin panjang nadanya
    const k = (this.chain - 1) / (STREAK.length - 1);
    Sfx.tone(300 + k * 520, 0.18 + k * 0.3, 'square', 0.14 + k * 0.12, 200 + k * 500);
    if (this.chain >= 3) Sfx.tone(150 - k * 60, 0.4, 'sawtooth', 0.2, 60, 0.04);
    if (this.chain >= 5) Sfx.noise(0.4, 0.45, 1400, 1.2, 0.06);
  }

  /* Satu spec = satu bot hidup. Membuang mana-mana kembar dan entri baris
     gilir berlebihan. Murah: hanya 5 spec untuk disemak. */
  reconcile() {
    const g = this.g;
    const seen = new Map();
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (!e.teamBot || e.dead || !e.sp) continue;
      const keep = seen.get(e.sp);
      if (!keep) { seen.set(e.sp, e); continue; }
      // kembar: buang yang ini tanpa mengira bunuhan atau memberi mata
      e.dead = true;
      g.enemies[i] = g.enemies[g.enemies.length - 1];
      g.enemies.pop();
      disposeEnemy(g, e);
    }
    if (!this.pend || !this.pend.length) return;
    const q = new Set();
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const sp = this.pend[i].sp;
      // entri pendua, atau spec yang sudah hidup di arena
      if (!sp || q.has(sp) || seen.has(sp)) { this.pend.splice(i, 1); continue; }
      q.add(sp);
    }
  }

  /* seluruh pasukan merah tumbang serentak */
  checkWipe() {
    const live = this.g.enemies.filter(e => e.teamBot && !e.dead);
    if (live.length) return;
    if (this._wipeT && this.g.time - this._wipeT < 6) return;
    this._wipeT = this.g.time;
    this.UI.streak('WIPE OUT', '#ff3bd0', 'ENEMY TEAM ELIMINATED');
    Sfx.tone(120, 0.7, 'sawtooth', 0.3, 46);
    Sfx.tone(700, 0.5, 'square', 0.2, 260, 0.08);
    Sfx.noise(0.6, 0.6, 700, 0.9, 0.04);
  }

  playerKilled(by) {
    this.myDeaths++;
    this.chain = 0; this.chainT = 0;      // mati = rentetan terputus
    this.addKill('B', by || null);
  }

  /* ---------------- papan pendahulu ---------------- */
  removeTags() {
    const h = document.getElementById('botTags');
    if (h) h.innerHTML = '';
    this.tagPool = [];
    const f = document.getElementById('fullBoard');
    if (f) f.classList.add('hidden');
  }

  board() {
    const rows = [{ name: 'YOU', team: 'A', kills: this.myKills, deaths: this.myDeaths, me: true }];
    for (const a of this.allies) rows.push({ name: a.name, team: 'A', kills: a.kills || 0, deaths: a.deaths || 0 });
    for (const e of this.g.enemies) {
      if (!e.teamBot) continue;
      rows.push({ name: e.name, team: 'B', kills: e.kills || 0, deaths: e.deaths || 0 });
    }
    rows.sort((x, y) => y.kills - x.kills || x.deaths - y.deaths);
    return rows;
  }

  boardHtml(full) {
    const rows = this.board();
    const list = full ? rows : rows.slice(0, 5);
    return `<table class="lb"><tr><th></th><th>NAME</th><th>K</th><th>D</th></tr>${list.map((r, i) => {
      const rank = rows.indexOf(r) + 1;
      return `<tr class="${r.team === 'A' ? 'a' : 'b'}${r.me ? ' me' : ''}${rank === 1 ? ' top' : ''}">
        <td class="rk">${rank === 1 ? '★' : rank}</td><td class="nm">${r.name}</td>
        <td>${r.kills}</td><td>${r.deaths}</td></tr>`;
    }).join('')}</table>`;
  }

  /* ---------------- suar ---------------- */
  buildBeacons() {
    const g = this.g;
    this.objs = [];
    this.beacons = [];
    const mk = (m) => { g.scene.add(m); this.objs.push(m); return m; };
    // pad pangkalan
    for (const t of ['A', 'B']) {
      const bs = this.map.bases[t];
      const col = t === 'A' ? 0x3fa9ff : 0xff4a3a;
      const ring = mk(new THREE.Mesh(new THREE.RingGeometry(15, 16, 48),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })));
      ring.rotation.x = -PI / 2; ring.position.set(bs.x, 0.06, bs.z);
      const flag = mk(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 14, 8),
        new THREE.MeshStandardMaterial({ color: 0x222, emissive: col, emissiveIntensity: 1.5 })));
      flag.position.set(bs.x + 18, 7, bs.z);
    }
    if (this.mode !== 'beacon') return;
    for (const src of this.map.beacons) {
      const b = { ...src, own: null, cap: 0, enemyHere: false };
      const padMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
      b.ring = mk(new THREE.Mesh(new THREE.RingGeometry(CAP_R - 0.6, CAP_R, 56), padMat));
      b.ring.rotation.x = -PI / 2; b.ring.position.set(b.x, 0.07, b.z);
      b.fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      b.fill = mk(new THREE.Mesh(new THREE.CircleGeometry(CAP_R - 0.6, 48), b.fillMat));
      b.fill.rotation.x = -PI / 2; b.fill.position.set(b.x, 0.065, b.z);
      b.pole = mk(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 8, 8), new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.7, roughness: 0.4 })));
      b.pole.position.set(b.x, 4, b.z);
      b.lampMat = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0xdddddd, emissiveIntensity: 2.4 });
      b.lamp = mk(new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), b.lampMat));
      b.lamp.position.set(b.x, 9, b.z);
      b.beam = mk(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })));
      b.beam.position.set(b.x, 38, b.z);
      g.world.props.push({ x: b.x, z: b.z, r: 0.9, mesh: null, idx: -1, explosive: false, hp: 999, type: 'pylon', alive: true, h: 8 });
      this.beacons.push(b);
    }
  }

  updateBeacons(dt) {
    const g = this.g;
    for (const b of this.beacons) {
      let a = 0, e = 0;
      const p = g.player;
      if (!p.dead && Math.hypot(p.x - b.x, p.z - b.z) < CAP_R) a++;
      for (const x of this.allies) if (!x.dead && Math.hypot(x.x - b.x, x.z - b.z) < CAP_R) a++;
      for (const x of g.enemies) if (!x.dead && Math.hypot(x.x - b.x, x.z - b.z) < CAP_R) e++;
      b.enemyHere = e > 0;
      b.allyHere = a > 0;
      const rate = 100 / CAP_TIME;
      const before = b.own;
      if (a > 0 && e === 0) b.cap = Math.min(100, b.cap + rate * Math.min(3, a) * dt);
      else if (e > 0 && a === 0) b.cap = Math.max(-100, b.cap - rate * Math.min(3, e) * dt);
      if (b.cap >= 100) b.own = 'A';
      else if (b.cap <= -100) b.own = 'B';
      else if ((b.own === 'A' && b.cap <= 0) || (b.own === 'B' && b.cap >= 0)) b.own = null;
      if (b.own !== before) {
        if (b.own === 'A') { this.UI.toast(`BEACON ${b.name} CAPTURED`); Sfx.buy(); }
        else if (b.own === 'B') { this.UI.toast(`BEACON ${b.name} LOST`); Sfx.deny(); }
        this.syncHud();
      }
      // warna
      const col = b.own === 'A' ? 0x3fa9ff : b.own === 'B' ? 0xff4a3a : 0xdddddd;
      b.lampMat.emissive.setHex(col);
      b.ring.material.color.setHex(col);
      b.beam.material.color.setHex(col);
      b.fillMat.color.setHex(b.cap >= 0 ? 0x3fa9ff : 0xff4a3a);
      const f = Math.abs(b.cap) / 100;
      b.fill.scale.setScalar(Math.max(0.001, f));
      b.lamp.rotation.y += dt * 1.5;
      b.lamp.position.y = 9 + Math.sin(g.time * 2 + b.x) * 0.3;
    }
    // mata: setiap saat, +1 bagi setiap suar dipegang
    this.tick += dt;
    if (this.tick >= 1) {
      this.tick -= 1;
      for (const b of this.beacons) if (b.own) this.score[b.own]++;
      this.syncHud();
    }
  }

  /* ---------------- gelung ---------------- */
  update(dt) {
    if (this.over) return;
    const g = this.g;

    /* Kira detik permulaan: jam perlawanan belum jalan, pemain tidak boleh
       bergerak (state 'countdown' melangkau updatePlayer) dan setiap bot
       dikunci dengan lockT - mekanisme sama yang digunakan Snare Net. */
    if (this.startT > 0) {
      this.startT -= dt;
      // kamera rapat dahulu, kemudian mengundur perlahan sebelum FIGHT
      g.camIntro = clamp(this.startT / 1.6, 0, 1);
      for (const b of this.allBots()) {
        b.lockT = Math.max(b.lockT || 0, 0.4);
        b.vx = 0; b.vz = 0;
        // updateBot dilangkau semasa kira detik: letak model di tempatnya
        if (b.mesh) { b.mesh.position.set(b.x, 0, b.z); b.mesh.rotation.y = b.ang || 0; }
      }
      const n = Math.max(0, Math.ceil(this.startT));
      if (n !== this._cd) {
        this._cd = n;
        this.syncRespawn(this.startT);
        if (n > 0) {
          this.UI.countdown(String(n));
          Sfx.tone(440 + (4 - Math.min(n, 4)) * 70, 0.16, 'square', 0.16, 300);
        }
      }
      if (this.startT <= 0) {
        g.camIntro = 0;
        this.showRespawn(false);          // tutup pemilih titik muncul permulaan
        this.UI.countdown('FIGHT!', true);
        Sfx.tone(880, 0.34, 'square', 0.22, 420);
        Sfx.tone(1320, 0.4, 'sine', 0.16, 620, 0.05);
        setTimeout(() => this.UI.countdown(null), 1000);
        if (g.state === 'countdown') g.state = 'play';
      }
      this.tickHud();
      return;
    }

    if (this.chainT > 0) {
      this.chainT -= dt;
      if (this.chainT <= 0) this.chain = 0;
    }

    this.time -= dt;
    if (this.map.inAcid) this.acidTick(dt);
    for (const a of this.allies) {
      if (a.dead) {
        a.respawn -= dt;
        if (a.respawn <= 0) {
          const pt = this.spawnPoint('A', this.botSpawnPick('A'));
          a.x = pt.x; a.z = pt.z; a.vx = a.vz = 0; a.hp = a.maxHp; a.dead = false; a.flash = 0;
          a.ang = 0; a.mesh.visible = true; a.tgt = null; a.shield = 3;
        }
        continue;
      }
      if (a.shield > 0) a.shield -= dt;
      this.updateBot(a, dt);
    }
    if (this.mode === 'beacon') this.updateBeacons(dt);
    if (this.mode === 'escort') this.updateEscort(dt);
    /* Penyelarasan keras: seorang bot untuk setiap spec, tidak lebih.
       Kalau apa-apa laluan berjaya menghasilkan kembar, ia dibuang di sini
       pada bingkai seterusnya - jadi ia tidak boleh berganda menjadi ramai. */
    this.reconcile();

    if (this.pend) for (let i = this.pend.length - 1; i >= 0; i--) {
      const q = this.pend[i];
      q.t -= dt;
      if (q.t <= 0) { this.pend.splice(i, 1); this.spawnEnemy(q.sp, this.botSpawnPick('B')); }
      else if (q.sp && !q.sp.pending) this.pend.splice(i, 1);   // dibatalkan di tempat lain
    }

    // pek baiki muncul di tengah peta setiap 20 saat
    this.hpDrop -= dt;
    if (this.hpDrop <= 0) {
      this.hpDrop = 20;
      if (this.mode === 'escort') {
        const q = this.map.hpSpot(this.convoySpan().lead);
        g.dropPickup('hp', q.x, q.z);
      } else {
        const spots = [[0, -30], [0, 30], [-100, 0], [100, 0]];
        const [x, z] = pick(spots);
        g.dropPickup('hp', x + rand(-3, 3), z + rand(-3, 3));
      }
    }

    // pemain mati: kira detik muncul semula
    if (g.state === 'respawn') {
      this.respawnT -= dt;
      this.syncRespawn();
      if (this.respawnT <= 0) this.respawnPlayer();
    }

    if (this.mode === 'escort') {
      const alive = this.aliveTrucks();
      if (!alive.length) this.finish(false);
      else if (alive.every(t => t.delivered)) this.finish(true);
      else if (this.time <= 0) this.finish(false);
      this.tickHud();
      return;
    }
    const T = this.M.target;
    if (this.score.A >= T || this.score.B >= T || this.time <= 0) {
      const win = this.score.A > this.score.B ? 'A' : this.score.B > this.score.A ? 'B' : (this.kills.A >= this.kills.B ? 'A' : 'B');
      this.finish(win === 'A');
    }
    this.tickHud();
  }

  /* ---------------- pemain mati & muncul semula ---------------- */
  playerDown() {
    const g = this.g;
    g.state = 'respawn';
    g.slowMo = 1;
    this.respawnT = 6;
    if (this.mode === 'beacon' && !this.beacons.some(b => b.id === this.spawnPick && b.own === 'A')) this.spawnPick = 'base';
    this.showRespawn(true);
  }

  respawnPlayer() {
    const g = this.g, p = g.player;
    const pt = this.spawnPoint('A', this.spawnPick);
    p.x = pt.x; p.z = pt.z; p.vx = p.vz = 0; p.ang = 0; p.y = 0; p.fly = 0;
    p.hp = p.maxHp; p.dead = false; p.overshield = 0; p.iframe = 2.0; p.nitro = 100;
    p.spawnShield = 6;                 // pecah sebaik sahaja pemain menembak
    for (const s of g.slots) if (s) { s.mag = s.st.mag; s.reload = 0; s.heat = 0; s.over = false; }
    g.car.root.visible = true;
    g.setCarOpacity && g.setCarOpacity(1);
    if (g.reticle) g.reticle.visible = true;
    if (g.dirArrow) g.dirArrow.visible = true;
    g.state = 'play';
    this.showRespawn(false);
    this.UI.hudOn(true);
  }

  finish(win) {
    if (this.over) return;
    this.over = true;
    const g = this.g;
    const del = this.mode === 'escort' ? this.score.A * 150 : 0;
    const coins = (win ? 900 + this.myKills * 60 : 350 + this.myKills * 40) + del;
    const scrap = win ? 500 + this.myKills * 25 : 200 + this.myKills * 15;
    Econ.addCoins(coins); Econ.addScrap(scrap);
    g.earnedCoins = (g.earnedCoins || 0) + coins;
    g.earnedScrap = (g.earnedScrap || 0) + scrap;
    Save.d.teamWins = Save.d.teamWins || {};
    if (win) Save.d.teamWins[this.mode] = (Save.d.teamWins[this.mode] || 0) + 1;
    if (win) Missions.track('teamwin', 1, this.mode);
    Missions.track('runs', 1, this.mode);
    Save.save();
    this.showRespawn(false);
    // 1) semua berhenti (skrin beku)  2) pudar ke hitam  3) skrin keputusan
    g.state = 'frozen';
    Sfx.engineSet(0, 0);
    this.UI.hudOn(false);
    let f = document.getElementById('matchFade');
    if (!f) { f = document.createElement('div'); f.id = 'matchFade'; document.body.appendChild(f); }
    f.className = '';
    f.innerHTML = `<b>MATCH OVER</b>`;
    requestAnimationFrame(() => f.classList.add('show'));
    this.fade = f;
    setTimeout(() => { if (this.g.team === this) f.classList.add('black'); }, 1300);
    setTimeout(() => {
      if (this.g.team !== this) return;
      g.state = 'over';
      this.UI.teamOver(g, this, win, coins, scrap);
      win ? Sfx.buy() : Sfx.deny();
    }, 2600);
  }

  /* ---------------- HUD ---------------- */
  buildHud() {
    let h = document.getElementById('teamHud');
    if (!h) {
      h = document.createElement('div');
      h.id = 'teamHud';
      document.getElementById('hud').appendChild(h);
    }
    h.innerHTML = `
      <div class="th-row">
        <div class="th-team a"><b id="thA">0</b><small>${this.mode === 'escort' ? 'DELIVERED' : 'BLUE'}</small></div>
        <div class="th-mid"><div id="thTime">0:00</div><small>${this.mode === 'tdm' ? `FIRST TO ${this.M.target} KILLS` : this.mode === 'escort' ? 'ESCORT THE CARGO' : `FIRST TO ${this.M.target} POINTS`}</small></div>
        <div class="th-team b"><b id="thB">0</b><small>${this.mode === 'escort' ? 'DESTROYED' : 'RED'}</small></div>
      </div>
      <div class="th-bea" id="thBea"></div>
      <div class="th-hint">TAB = SCOREBOARD</div>`;
    h.classList.remove('hidden');
    document.getElementById('hud').classList.add('teammode');
    let r = document.getElementById('respawnBox');
    if (!r) {
      r = document.createElement('div');
      r.id = 'respawnBox';
      document.getElementById('overlay').appendChild(r);
    }
    r.classList.add('hidden');
    this.hud = h; this.rbox = r;
    this.syncHud();
  }

  syncHud() {
    if (!this.hud) return;
    document.getElementById('thA').textContent = Math.floor(this.score.A);
    document.getElementById('thB').textContent = Math.floor(this.score.B);
    const bea = document.getElementById('thBea');
    if (this.mode === 'beacon') {
      bea.innerHTML = this.beacons.map(b =>
        `<span class="${b.own === 'A' ? 'a' : b.own === 'B' ? 'b' : ''}">${b.id}</span>`).join('');
    } else if (this.mode === 'escort' && this.trucks) this.escortHud();
    else bea.innerHTML = '';
  }

  /* nama + bar nyawa melayang atas setiap bot */
  tickTags() {
    let host = document.getElementById('botTags');
    if (!host) {
      host = document.createElement('div');
      host.id = 'botTags';
      document.getElementById('hud').appendChild(host);
      this.tagPool = [];
    }
    if (!this.tagPool) this.tagPool = [];
    const cam = this.g.camera;
    const w = innerWidth, h = innerHeight;
    const V = this.g.constructor === Object ? null : null;
    void V;
    const list = [];
    for (const a of this.allies) if (!a.dead) list.push(a);
    for (const e of this.g.enemies) if (e.teamBot && !e.dead) list.push(e);
    if (this.trucks) for (const t of this.trucks) if (!t.dead) list.push(t);
    let n = 0;
    for (const b of list) {
      const v = this._tv || (this._tv = new (this.g.camera.position.constructor)());
      v.set(b.x, (b.y || 0) + (b.h || 1.9) + 1.5, b.z);
      v.project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      let t2 = this.tagPool[n];
      if (!t2) {
        t2 = document.createElement('div');
        t2.className = 'botTag';
        t2.innerHTML = '<span class="bn"></span><div class="bb"><i></i></div>';
        host.appendChild(t2);
        this.tagPool[n] = t2;
      }
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      t2.style.transform = `translate(${x}px,${y}px)`;
      const ally = b.team === 'A';
      if (t2._nm !== b.name) { t2._nm = b.name; t2.querySelector('.bn').textContent = b.name; }
      if (t2._cl !== ally) { t2._cl = ally; t2.className = 'botTag ' + (ally ? 'a' : 'b'); }
      t2.querySelector('.bb i').style.width = Math.max(0, Math.min(1, b.hp / b.maxHp)) * 100 + '%';
      t2.style.display = 'block';
      n++;
    }
    for (let i = n; i < this.tagPool.length; i++) this.tagPool[i].style.display = 'none';
  }

  tickHud() {
    this.tickTags();
    if (this.mode === 'escort' && this.trucks) {
      this._eh = (this._eh || 0) + 1;
      if (this._eh % 8 === 0) this.escortHud();
    }
    const t = Math.max(0, Math.ceil(this.time));
    const s = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const el = document.getElementById('thTime');
    if (el && el.textContent !== s) el.textContent = s;
  }

  fullBoard(on) {
    let f = document.getElementById('fullBoard');
    if (!f) {
      f = document.createElement('div');
      f.id = 'fullBoard';
      document.getElementById('hud').appendChild(f);
    }
    f.classList.toggle('hidden', !on);
    if (on) f.innerHTML = `<div class="fb-box"><h3>SCOREBOARD</h3>${this.boardHtml(true)}</div>`;
  }

  /* pilihan titik muncul pemain + kawasan muncul musuh untuk peta mini */
  spawnOptions() {
    if (this.mode === 'escort') return this.escortSpawnOpts();
    if (this.mode === 'tdm') {
      return {
        mine: this.map.spawns.A.map(s => ({ id: s.id, name: s.name, label: 'SPAWN ' + s.name, x: s.x, z: s.z })),
        foe: this.map.spawns.B.map(s => ({ x: s.x, z: s.z })),
      };
    }
    const bA = this.map.bases.A, bB = this.map.bases.B;
    const mine = [{ id: 'base', name: 'H', label: 'HOME BASE', x: bA.x, z: bA.z }];
    const foe = [{ x: bB.x, z: bB.z }];
    for (const b of this.beacons) {
      if (b.own === 'A') mine.push({ id: b.id, name: b.id, label: 'BEACON ' + b.name, x: b.x, z: b.z });
      else if (b.own === 'B') foe.push({ x: b.x, z: b.z });
    }
    return { mine, foe };
  }

  /* Peta mini SVG Dead Valley. Dilukis daripada prop dunia SEBENAR, jadi
     dinding & batu yang kelihatan ialah yang ada di arena. Atas = utara
     (arah musuh), dan X diterbalikkan supaya kiri/kanan sama seperti skrin. */
  miniMap(opt) {
    const S = 220, k = S / (HALF * 2);
    const sx = x => ((HALF - x) * k).toFixed(1), sy = z => ((HALF - z) * k).toFixed(1);
    let props = '';
    for (const o of this.g.world ? this.g.world.props : []) {
      if (!o.alive || (o.h || 2.6) < 1.2) continue;
      props += `<circle cx="${sx(o.x)}" cy="${sy(o.z)}" r="${Math.max(1.2, o.r * k).toFixed(1)}" class="mm-prop"/>`;
    }
    let beacons = '';
    if (this.mode === 'beacon') for (const b of this.beacons) {
      const c = b.own === 'A' ? 'a' : b.own === 'B' ? 'b' : 'n';
      beacons += `<g class="mm-bc ${c}" transform="translate(${sx(b.x)} ${sy(b.z)})"><rect x="-6" y="-6" width="12" height="12" transform="rotate(45)"/><text y="3.5">${b.id}</text></g>`;
    }
    const foe = opt.foe.map(f => `<circle cx="${sx(f.x)}" cy="${sy(f.z)}" r="13" class="mm-foe"/><circle cx="${sx(f.x)}" cy="${sy(f.z)}" r="13" class="mm-foe-ring"/>`).join('');
    const mine = opt.mine.map(m => `<g class="mm-pt${m.id === this.spawnPick ? ' on' : ''}" data-s="${m.id}" transform="translate(${sx(m.x)} ${sy(m.z)})">
        <circle r="11" class="mm-hit"/><circle r="8"/><text y="3.6">${m.name}</text></g>`).join('');
    const allies = this.allies.filter(a => !a.dead).map(a => `<circle cx="${sx(a.x)}" cy="${sy(a.z)}" r="2.4" class="mm-ally"/>`).join('');
    return `<svg class="minimap" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
      <rect x="1" y="1" width="${S - 2}" height="${S - 2}" rx="10" class="mm-bg"/>
      ${this.mode === 'escort' ? '' : `<rect x="${(S / 2 - 34)}" y="${S - 22}" width="68" height="20" rx="5" class="mm-base a"/>
      <rect x="${(S / 2 - 34)}" y="2" width="68" height="20" rx="5" class="mm-base b"/>`}
      ${this.map.mini ? this.map.mini(sx, sy, k) : ''}${props}${foe}${beacons}${allies}${mine}${this.trucks ? this.escortMini(sx, sy) : ''}
    </svg>
    <div class="mm-leg"><span class="a">● YOUR SPAWN</span><span class="b">● ENEMY SPAWN</span></div>`;
  }

  // TDM: pemilih titik muncul semasa kira detik permulaan
  showSpawnPicker() { this.showRespawn(true, true); }

  showRespawn(on, start) {
    const r = this.rbox;
    if (!r) return;
    r.classList.toggle('hidden', !on);
    r.classList.toggle('side', !!start);
    this.picking = on ? (start ? 'start' : 'respawn') : null;
    if (!on) return;
    const opt = this.spawnOptions();
    if (!opt.mine.some(m => m.id === this.spawnPick)) this.spawnPick = opt.mine[0].id;
    const head = start
      ? `<h3 class="go">CHOOSE YOUR SPAWN</h3><div class="rs-t">MATCH STARTS IN <b id="rsT">${Math.max(0, Math.ceil(this.startT))}</b></div>`
      : `<h3>YOU WERE DESTROYED</h3><div class="rs-t">RESPAWN IN <b id="rsT">${Math.max(0, Math.ceil(this.respawnT))}</b></div>`;
    const canPick = opt.mine.length > 1;
    r.innerHTML = `<div class="rs-box">${head}
      <div class="rs-sub">${canPick ? 'TAP A POINT ON THE MAP' : this.mode === 'escort' ? 'AUTO RESPAWN BEHIND THE CONVOY' : 'NO BEACONS HELD - RESPAWNING AT BASE'}</div>
      ${this.miniMap(opt)}
      ${canPick ? `<div class="rs-opts">${opt.mine.map(o => `<button class="btn${o.id === this.spawnPick ? ' primary' : ''}" data-s="${o.id}">${o.label}</button>`).join('')}</div>` : ''}</div>`;
    r.querySelectorAll('[data-s]').forEach(b => b.onclick = () => this.choose(b.dataset.s));
  }

  choose(id) {
    if (this.spawnPick === id) return;
    this.spawnPick = id;
    Sfx.ui();
    // semasa kira detik pemain terus dipindahkan ke titik yang dipilih
    if (this.picking === 'start') {
      const p = this.g.player, pt = this.spawnPoint('A', id);
      p.x = pt.x; p.z = pt.z; p.ang = 0;
    }
    this.showRespawn(true, this.picking === 'start');
  }

  syncRespawn(t) {
    const e = document.getElementById('rsT');
    if (e) e.textContent = Math.max(0, Math.ceil(t !== undefined ? t : this.respawnT));
  }

  dispose() {
    const g = this.g;
    g.camIntro = 0;
    this.removeTags();
    const hostT = document.getElementById('botTags');
    if (hostT) hostT.remove();
    const fb = document.getElementById('fullBoard');
    if (fb) fb.remove();
    const th = document.getElementById('teamHud');
    if (th) th.remove();
    const cd = document.getElementById('cdBox');   if (cd) cd.remove();
    const st = document.getElementById('streak');  if (st) st.remove();
    const rb = document.getElementById('respawnBox');
    if (rb) rb.remove();
    for (const o of this.objs || []) { g.scene.remove(o); if (o.geometry) o.geometry.dispose(); }
    for (const a of this.allies) { g.scene.remove(a.mesh); for (const k in a.mats) a.mats[k].dispose(); }
    this.allies = [];
    if (this.hud) this.hud.classList.add('hidden');
    document.getElementById('hud').classList.remove('teammode');
    if (this.rbox) this.rbox.classList.add('hidden');
    if (this.fade) this.fade.remove();
  }
}
/* Cargo Escort (escort.js) dicampur ke dalam Team */
Object.assign(Team.prototype, ESCORT);

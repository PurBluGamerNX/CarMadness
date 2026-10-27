// abilities2.js — kebolehan 10 kereta baharu (2026-10-17).
// Digabungkan ke dalam ABILITY (cars.js). Setiap kebolehan meminjam idea
// lama tetapi dengan pusingan sendiri - lihat komen setiap satu.
// Sistem berterusan (rantai, awan lebah, zon, halo, sinar...) ada dalam systems2.js.
import { U } from './scale.js';
import * as THREE from 'three';
import { rand, clamp, lerp, TAU, Sfx } from './core.js';

/* kipas Jammer Beam Hibachi: baji 120 darjah berlapis (sektor) + dinding lengkung di hujung */
function jamFan(R, H) {
  const g = new THREE.Group();
  const mk = (op) => new THREE.MeshBasicMaterial({ color: 0xff3a5c, transparent: true, opacity: op, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.absarc(0, 0, R, Math.PI / 2 - H, Math.PI / 2 + H, false); sh.lineTo(0, 0);
  const sec = new THREE.ShapeGeometry(sh, 24); sec.rotateX(Math.PI / 2);
  const layers = [];
  for (const [y, op] of [[0.9, 0.16], [2.2, 0.12], [3.5, 0.09]]) { const m = new THREE.Mesh(sec, mk(op)); m.position.y = y - 4.2; g.add(m); layers.push(m); }
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 3.4, 24, 1, true, -H, 2 * H), mk(0.2));
  wall.position.y = 2.2 - 4.2; g.add(wall); layers.push(wall);
  g.userData.layers = layers;
  g.renderOrder = 5;
  return g;
}

const toast = m => window.UI && window.UI.toast(m);
const miss = p => { p.abT = 0.05; p.abMiss = true; };
const missEnd = p => { if (p.abMiss) { p.abMiss = false; p.abCd = 1; toast('NO ENEMY IN RANGE'); return true; } return false; };

export const ABILITY2 = {
  /* CRESCENT (ASSASSIN, 2026-10-19, idea Nabil) - LUNAR SLASH. Kunci musuh di bawah
     reticle (60m) & bekukan di tempatnya; Crescent meluncur kepadanya dalam gerak
     PERLAHAN dramatik (kebal), meninggalkan jejak garisan cahaya terapung, kemudian
     satu tetakan sabit menembusinya. Damage ikut % HP maks (src 'pct' - tidak didarab
     abScale, jadi adil di semua mod). Jejak pudar selepas mendarat. */
  lunarslash: {
    name: 'Lunar Slash', dur: 4, cd: 14, color: '#ffd27a',
    desc: 'Locks the enemy under your crosshair (up to 60m) and freezes it in place. Crescent glides at it in slow, untouchable motion, leaving a floating trail of moonlight, then cuts straight through it with one heavy crescent slash - 35% of its max HP (12% on bosses). The trail fades once you land.',
    start(g, p) { if (!g.lunarStart(p)) miss(p); },
    update(g, p, dt) { g.updateLunar(p, dt); },
    end(g, p) { g.lunarEnd(p); missEnd(p); },
  },

  /* CORE (SNIPER, 2026-10-19, idea Nabil) - SOLAR GUIDE. Matahari menyala & melepaskan
     laser panduan ke musuh di bawah reticle - DI MANA-MANA dalam peta, lurus menembusi
     SEMUA dinding. Membakar 20% HP maks sesaat (4% pada bos) -> mati ~5s, kemudian laser
     beralih ke musuh terdekat sasaran tadi. Damage src 'pct' (adil di semua mod).
     Kereta perlahan 45% semasa melaser (sniper menembak, bukan berlari). */
  solarguide: {
    name: 'Solar Guide', dur: 8, cd: 26, color: '#ffb340', pct: 0.2, bossPct: 0.04,
    desc: 'The sun flares and fires a guidance laser at the enemy under your crosshair - anywhere on the map. The beam goes straight through every wall and burns 20% of its max HP every second (4% on bosses), so it is dead in about 5 seconds, then the laser jumps to the next enemy. Lasts 8 seconds; Core moves at half speed while it fires.',
    start(g, p) { if (!g.coreStart(p, this)) miss(p); },
    update(g, p, dt) { g.updateCore(p, dt); },
    end(g, p) { g.coreEnd(p); missEnd(p); },
  },

  /* HIBACHI - JAMMER BEAM: sinar lurus ke hadapan (48m, lebar ~7m). Setiap
     musuh yang disentuh: senjatanya TERPAKSA reload serta-merta dan reload /
     kadar tembak jadi separuh laju selama ia kekal dijem (jamT). Hibachi kalis
     35% dan pulih 3%/s, ditambah 1.5%/s bagi setiap musuh dalam sinar. */
  jambeam: {
    /* Nabil: "active sekali jaa, jangan lama" - beam DILEPASKAN SEKALI (denyut
       0.7s), musuh dalam baji dijem 5 saat; Hibachi kekal kalis & pulih 5 saat. */
    name: 'Jammer Beam', dur: 5, cd: 16, color: '#ff3a5c', range: 40, half: Math.PI / 3, pulse: 0.7,
    desc: 'Fires one huge 120-degree jammer blast ahead (40m). Every enemy caught in it is forced to reload at once and fires and reloads at half speed for 5 seconds. For 5 seconds Hibachi takes 35% less damage and repairs 3% HP/s, plus 1.5%/s for every enemy it jammed.',
    start(g, p) {
      p.abRes = 0.65; Sfx.tone(180, 0.5, 'sawtooth', 0.2, 620); Sfx.tone(1200, 0.3, 'square', 0.08, 900, 0.05);
      const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
      const ox = p.x + fx * 1.9, oz = p.z + fz * 1.9, oy = (p.y || 0) + 4.2;
      const len = this.range, cosH = Math.cos(this.half);
      let n = 0;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const dx = e.x - ox, dz = e.z - oz, d = Math.hypot(dx, dz) || 0.01;
        if (d > len + (e.r || 1)) continue;
        if ((dx * fx + dz * fz) / d < cosH - (e.r || 1) / d) continue;
        if (g.losClear && !g.losClear(ox, oz, e.x, e.z, e)) continue;
        n++;
        if (e.guns) for (const gn of e.guns) { gn.mag = 0; gn.reload = Math.max(gn.reload || 0, gn.s.reload || 1.5); }   // reload paksa
        if (e.shootCd !== undefined) e.shootCd = Math.max(e.shootCd, 1.5);
        e.jamT = Math.max(e.jamT || 0, 5);
        g.fx.spark(e.x, 1.5, e.z, 12, [2.2, 0.5, 0.8], { speed: 6, size: 0.35, life: 0.5 });
      }
      p.jamN = n;
      if (window.UI) window.UI.toast(n ? `JAMMED ${n} ENEMY${n > 1 ? 'S' : ''}` : 'NO ENEMY IN THE BEAM');
      for (let k = 0; k < 40; k++) {
        const a = rand(-this.half, this.half), sp = rand(22, 40);
        g.fx.add.emit(ox, oy - 0.5, oz, Math.sin(p.ang + a) * sp, rand(-4, -1), Math.cos(p.ang + a) * sp,
          { color: [2.4, 0.5, 0.9], color2: [0.6, 0.05, 0.2], size: 0.4, size2: 1.6, life: 1.0, drag: 0.4, alpha: 0.6 });
      }
      g.shake(0.4, 0.15);
      // baji beam besar 120 darjah - hanya untuk denyut pertama
      if (g.car && g.car.root) { p.jamFan = jamFan(this.range, this.half); p.jamFan.position.set(0, 4.2, 1.9); p.jamFan.scale.setScalar(0.05); g.car.root.add(p.jamFan); }
      p.jamPulse = this.pulse;
    },
    update(g, p, dt) {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (0.03 + 0.015 * Math.min(p.jamN || 0, 5)) * dt);
      if (p.jamFan) {
        p.jamPulse -= dt;
        const F = p.jamFan, k = Math.min(1, F.scale.x + dt * 6);
        F.scale.set(k, 1, k);
        const fade = Math.max(0, p.jamPulse / this.pulse);
        F.userData.layers.forEach((m, i) => { m.material.opacity = (i === 3 ? 0.24 : 0.2 - i * 0.04) * fade; });
        if (p.jamPulse <= 0) this.dropFan(p);
      }
    },
    dropFan(p) {
      if (!p.jamFan) return;
      if (p.jamFan.parent) p.jamFan.parent.remove(p.jamFan);
      p.jamFan.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      p.jamFan = null;
    },
    end(g, p) { p.abRes = 1; this.dropFan(p); },
  },

  /* HELIX (TANK) - bukan Aegis biasa: cangkerang berduri. Kalis 55%, perlahan,
     dan SETIAP pukulan yang diterima menembak duri berpandu balik ke penyerang. */
  spiralbastion: {
    name: 'Spiral Bastion', dur: 7, cd: 19, color: '#ffb347',
    desc: 'Retracts into the spiral shell for 7 seconds: -55% damage taken and slower, but every hit you take fires a homing shell spike straight back at whoever shot you.',
    start(g, p) { p.abRes = 0.45; p.abSpeed = 0.6; p.thorns = true; p.thornAcc = 0; Sfx.tone(160, 0.6, 'square', 0.22, 70); Sfx.noise(0.4, 0.4, 900, 1.2); },
    update(g, p, dt) {
      if (Math.random() < dt * 30) {
        const a = rand(TAU);
        g.fx.add.emit(p.x + Math.cos(a) * 2.2, rand(0.6, 3), p.z + Math.sin(a) * 2.2, Math.cos(a) * 2, rand(0.5, 2), Math.sin(a) * 2,
          { color: [2.0, 1.3, 0.5], color2: [0.6, 0.3, 0.05], size: 0.3, size2: 0.04, life: 0.4, drag: 2 });
      }
    },
    end(g, p) { p.abRes = 1; p.abSpeed = 1; p.thorns = false; },
  },

  /* MAMMOTH (TANK) - meminjam idea "tangkap" Medusa tetapi TERBALIK: tiga
     musuh dicangkuk dengan rantai dan diheret di BELAKANG sebagai bola
     pemusnah. Mereka berayun bila kau membelok dan merempuh musuh lain. */
  wreckflail: {
    name: 'Wrecking Flail', dur: 7, cd: 20, color: '#ff9a3c',
    desc: 'Fires three chain hooks into the nearest enemies within 32m and drags them behind you for 7 seconds. They swing like wrecking balls when you turn, smashing into anything they hit. You take 30% less damage while towing.',
    start(g, p) {
      const ts = g.enemies.filter(e => !e.dead && !e.d.boss && Math.hypot(e.x - p.x, e.z - p.z) < 32)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 3);
      if (!ts.length) { p.flail = null; miss(p); return; }
      p.flail = ts.map((t, i) => ({ t, phi: (i - (ts.length - 1) / 2) * 0.7, w: 0, len: 0, px: t.x, pz: t.z }));
      p.abRes = 0.7;
      Sfx.tone(120, 0.4, 'square', 0.22, 300); Sfx.noise(0.3, 0.4, 2400, 1.4);
    },
    update(g, p, dt) { g.updateFlail(p, dt); },
    end(g, p) {
      if (p.flail) for (const f of p.flail) if (f.t && !f.t.dead) { f.t.vx = (f.vx || 0) * 0.8; f.t.vz = (f.vz || 0) * 0.8; }
      p.flail = null; p.abRes = 1;
      missEnd(p);
    },
  },

  /* RAPTOR (FIGHTER) - tanda satu mangsa. Bila mangsa mati semasa ditanda,
     Raptor menyimpan TROFI: +8% damage untuk baki nyawa ini (maks 5). */
  predator: {
    name: 'Predator Mark', dur: 10, cd: 18, color: '#c8ff3a',
    desc: 'Marks the enemy under your crosshair as prey for 10 seconds: it takes +60% damage from you and you run 25% faster. Kill it while marked to take a TROPHY - +8% damage for the rest of this life (up to 5), 20% repair and the ability back in 3 seconds.',
    start(g, p) {
      const t = (g.lock && !g.lock.dead ? g.lock : null) || g.nearestEnemy(g.aim ? g.aim.x : p.x, g.aim ? g.aim.z : p.z, 30) || g.nearestEnemy(p.x, p.z, 90);
      if (!t) { p.prey = null; miss(p); return; }
      p.prey = t; p.preyKill = false; p.abSpeed = 1.25;
      Sfx.tone(240, 0.3, 'sawtooth', 0.22, 90); Sfx.tone(900, 0.25, 'square', 0.1, 1400, 0.05);
    },
    update(g, p) {
      if (p.prey && p.prey.dead) {
        p.preyKill = true;
        p.trophy = Math.min(5, (p.trophy || 0) + 1);
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2);
        g.fx.abilityRing(p.x, p.z, [1.6, 2.2, 0.4], 2, 16, 0.5);
        toast(`TROPHY ${p.trophy}/5 · +${p.trophy * 8}% DAMAGE`);
        Sfx.tone(300, 0.35, 'sawtooth', 0.22, 900);
        p.prey = null; p.abT = 0;
      }
    },
    end(g, p) {
      p.prey = null; p.abSpeed = 1;
      if (missEnd(p)) return;
      if (p.preyKill) { p.abCd = 3; p.preyKill = false; }
    },
  },

  /* MANTIS (ASSASSIN) - pecutan memotong. Musuh yang tinggal bawah 25% HP
     DIHUKUM MATI serta-merta. Setiap bunuhan membuka satu pecutan lagi (maks 3). */
  reap: {
    name: 'Reaping Dash', dur: 1.8, cd: 15, color: '#7dffcf',
    desc: 'Dashes 24m toward your aim, untouchable, slicing every enemy in the path. Anything left under 25% HP is executed on the spot. Every dash that kills lets you dash again (up to 3 dashes).',
    start(g, p) { p.reapN = 0; p.reapReady = false; g.reapDash(p); },
    retrigger(g, p) {
      if (p.reapReady && p.reapN < 3 && !(p.dash && p.dash.t < p.dash.dur)) { p.reapReady = false; g.reapDash(p); }
      return false;
    },
    update() { },
    end(g, p) { p.reapReady = false; p.reapN = 0; },
  },

  /* HIVRA (CONTROLLER) - awan lebah yang MENGIKUT RETICLE. Musuh di dalamnya
     disengat, diperlahankan dan tidak dapat menembak (pandangan tertutup). */
  swarmcloud: {
    name: 'Swarm Cloud', dur: 7, cd: 19, color: '#ffd23a',
    desc: 'Releases a cloud of bees that follows your crosshair for 7 seconds. Everything inside it is stung, slowed and blinded - blinded enemies cannot shoot.',
    start(g, p) {
      p.cloud = { x: p.x, z: p.z, r: 7.5, acc: 0 };
      Sfx.noise(0.6, 0.4, 600, 3, 0, 'bandpass'); Sfx.tone(210, 0.6, 'sawtooth', 0.08, 240);
    },
    update(g, p, dt) { g.updateCloud(p, dt); },
    end(g, p) { p.cloud = null; },
  },

  /* AEROSTAT (SUPPORT) - peti bantuan berpayung terjun. Zon di tanah:
     membaiki pemain & rakan, isi semula 3x lebih laju, +25% kadar tembakan. */
  sanctuary: {
    name: 'Sanctuary Drop', dur: 0.1, cd: 22, color: '#7dffb0',
    desc: 'Drops a parachute supply crate under the airship. It opens into an 11m sanctuary for 8 seconds: you and every teammate inside repair 5% HP per second, reload three times faster and fire 25% faster.',
    start(g, p) { g.spawnSanctuary(p.x, p.z); Sfx.tone(520, 0.3, 'sine', 0.16, 900); },
    update() { }, end() { },
  },

  /* HALO (SUPPORT) - halo terbang ke rakan paling cedera (atau ke diri sendiri):
     perisai 35% HP, dan sekali sahaja MENGHALANG MAUT - selamat dengan 40% HP. */
  guardianhalo: {
    name: 'Guardian Halo', dur: 8, cd: 22, color: '#ffe27a',
    desc: 'The halo flies to the most injured teammate within 60m (or stays with you) for 8 seconds. It soaks damage equal to 35% of their max HP, and if they would die it saves them once, restoring 40% HP.',
    start(g, p) { g.sendHalo(p); Sfx.tone(700, 0.5, 'sine', 0.16, 1400); Sfx.tone(1050, 0.5, 'sine', 0.1, 2100, 0.08); },
    update() { },
    end(g) { g.recallHalo(); },
  },

  /* THAROS (ARTILLERY) - sinar haba menyapu 120 darjah di hadapan. Tripod
     berdiri tegak dan terkunci; tanah yang disapu terbakar. */
  heatray: {
    name: 'Sweeping Ray', dur: 3, cd: 20, color: '#ff4a3a',
    desc: 'Plants the tripod and sweeps a heat ray across a 120 degree arc in front for 3 seconds. Everything the ray passes over is burned and set on fire, and the ground it scorches keeps burning.',
    start(g, p) {
      const ax = g.aim ? g.aim.x - p.x : Math.sin(p.ang), az = g.aim ? g.aim.z - p.z : Math.cos(p.ang);
      const mid = Math.atan2(ax, az);
      p.ray = { a0: mid - 1.05, a1: mid + 1.05, ang: mid - 1.05, acc: 0, drop: 0 };
      p.siegeLock = true;
      Sfx.tone(90, 3, 'sawtooth', 0.16, 140); Sfx.noise(3, 0.18, 1800, 0.8);
    },
    update(g, p, dt) { g.updateRay(p, dt); },
    end(g, p) { p.ray = null; p.siegeLock = false; },
  },

  /* CRYSTAL (FIGHTER, 2026-10-18) - PRISM STORM. Idea Tharos (sinar laser),
     tetapi dengan pusingan Nabil: TIGA kristal di atas badan naik, berpusing
     dan setiap satu memancar sinar - tiga sinar 120 darjah berasingan yang
     BERPUTAR 360 darjah mengelilingi kereta. Crystal TIDAK perlu berhenti:
     ia boleh terus memandu dan menembak semasa ribut berputar. Musuh yang
     disapu dikristalkan (perlahan) sekejap. */
  prismstorm: {
    name: 'Prism Storm', dur: 5, cd: 22, color: '#b98cff', range: 28,
    desc: 'The three crystals rise, spin and each fires a laser beam. The three beams rotate a full 360 degrees around you for 5 seconds (28m reach) - and you keep driving and shooting the whole time. Every enemy a beam sweeps over is burned and crystallised (slowed) for a moment.',
    start(g, p) {
      p.prism = { ang: p.ang, sp: TAU / 1.5 };
      Sfx.tone(520, 0.6, 'sine', 0.18, 1560); Sfx.tone(780, 0.5, 'triangle', 0.1, 2340, 0.08); Sfx.noise(0.5, 0.2, 4200, 2, 0.05, 'highpass');
    },
    update(g, p, dt) { g.updatePrism(p, dt, this.range); },
    end(g, p) { p.prism = null; },
  },

  /* CONDOR (CONTROLLER, 2026-10-18) - ROTOR DROP. Roda berpusing jadi rotor
     dan Condor terbang 7 saat (atas dinding & musuh). Angin rotor di bawahnya
     menolak & melambatkan musuh. Bila tamat ia MENDARAT atas tayarnya dengan
     hentakan - tekan SPACE lagi semasa terbang untuk menjunam terus: mendarat
     serta-merta dengan hentakan yang lebih besar. */
  rotordrop: {
    name: 'Rotor Drop', dur: 7, cd: 18, color: '#ffb23f',
    desc: 'The four wheels swing up and turn into rotors: fly for 7 seconds over walls and enemies, with the rotor wash below pushing and slowing anything under you. When it ends you land on your wheels with a shockwave. Use the ability again in the air to DIVE - you slam down at once with a bigger shockwave.',
    start(g, p) {
      p.fly = 1; p.rotor = { wash: 0, dive: false };
      p.condorSlam = null;
      Sfx.tone(90, 0.9, 'sawtooth', 0.16, 260); Sfx.noise(1.0, 0.25, 600, 1.5, 0, 'bandpass');
    },
    retrigger(g, p) {
      if ((p.y || 0) < 2.5) return false;           // masih berlepas - belum boleh menjunam
      if (p.rotor) p.rotor.dive = true;
      return true;
    },
    update(g, p, dt) { g.updateRotorWash(p, dt); },
    end(g, p) {
      const dive = !!(p.rotor && p.rotor.dive);
      p.fly = 0; p.rotor = null;
      p.condorSlam = { mul: dive ? 1.6 : 1, dive };
      if (dive) { Sfx.tone(600, 0.35, 'sawtooth', 0.16, 120); toast('DIVE!'); }
    },
  },

  /* CONDUIT (TANK, 2026-10-18) - REDIRECT LINK. Pautkan rantai petir ke
     sehingga 3 musuh terdekat dalam 40m selama 6s. 80% setiap damage yang
     Conduit terima dipindah ke musuh terpaut (yang paling dekat dengan arah
     serangan); Conduit hanya menerima 20%. Musuh mati -> pautan pindah. */
  redirect: {
    name: 'Redirect Link', dur: 6, cd: 18, color: '#ff3fc8', range: 40,
    desc: 'The armour petals open, the electrons break out of the orb and lock straight pink beams onto up to three nearby enemies (40m) for 6 seconds. 80% of every hit you take is sent into the linked enemy closest to where it came from - you only take the remaining 20%. If a linked enemy dies the beam jumps to the next one.',
    start(g, p) {
      const L = g.conduitPick(p, this.range, []);
      if (!L.length) { miss(p); return; }
      p.conduit = { links: L, zap: 0, sent: 0 };
      Sfx.tone(200, 0.5, 'sawtooth', 0.16, 900); Sfx.shoot('tesla');
    },
    update(g, p, dt) { g.updateConduit(p, dt, this.range); },
    end(g, p) {
      if (p.conduit && p.conduit.sent > 0 && window.UI) window.UI.toast(`REDIRECTED ${Math.round(p.conduit.sent * U).toLocaleString()} DAMAGE`);
      p.conduit = null; missEnd(p);
    },
  },

  /* BREEZE (SNIPER, 2026-10-18) - MISSILE SALVO. Lori berhenti, senjata mati,
     kanister naik tegak 2s, 5 peluru berpandu (0.3s jarak) naik ~38m kemudian
     menjunam ke 5 musuh berbeza di mana-mana (melepasi dinding). Damage ikut
     HP sasaran: 50% nyawa untuk musuh lemah, turun ke 25% untuk musuh tebal.
     Kanister kemudian disimpan semula. */
  missilesalvo: {
    name: 'Missile Salvo', dur: 6.2, cd: 22, color: '#ff4a3a', range: 140, deploy: 2.0, gap: 0.3, stow: 1.6,
    desc: 'The truck stops, its weapons switch off and the launch canister rises upright (2 seconds). It then fires five guided missiles that climb high and dive onto five different enemies anywhere within 140m - over walls. Each ICE missile takes 25-50% of the target\'s health (half for weak enemies, a quarter for tough ones) and leaves it - and anything within 4m - sliding on ice, barely able to steer, for 4.5 seconds. Then the canister folds back down.',
    start(g, p) {
      const T = g.bzTargets(p, this.range);
      if (!T.length) { miss(p); return; }
      p.bz = { time: 0, fired: 0, done: 0 };
      p.bzDep = 0; p.siegeLock = true; p.weaponsOff = true;
      toast('MISSILE SALVO - RAISING CANISTER');
      Sfx.tone(55, 1.8, 'sawtooth', 0.14, 110); Sfx.noise(1.8, 0.1, 300, 0.5);
    },
    update(g, p, dt) { g.updateSalvo(p, dt, this); },
    end(g, p) { p.bz = null; p.bzDep = 0; p.siegeLock = false; p.weaponsOff = false; missEnd(p); },
  },

  /* FREEZO (CONTROLLER, 2026-10-18) - CRYO CANNON. Kebolehan CAS (macam
     Spring Leap): 3 peluru ais gergasi, satu pulih setiap 7s. Setiap tekan =
     satu peluru ais besar dari meriam ke musuh di hadapan; yang kena (dan
     jirannya dalam 3m) DIBEKUKAN dalam kiub ais 4s - tidak boleh bergerak atau
     menembak, +25% damage daripada kau. Kiub pecah bila tamat (serpihan ais). */
  cryocannon: {
    name: 'Cryo Cannon', dur: 0, cd: 0, color: '#8fe8ff', charges: 3, durTxt: 'instant shot', recharge: 7,
    desc: 'Three giant ice shells, one recharging every 7 seconds. Each use fires one from the freeze cannon at the enemy in front of you. Whatever it hits - and anything within 3m of it - is frozen solid inside a giant ice cube for 4 seconds: it cannot move or shoot and takes 25% more damage from you. When the cube breaks it bursts into ice shards that hurt nearby enemies.',
    chargeInfo(p) {
      const free = p.iceN === undefined ? 3 : p.iceN;
      return { free, max: 3, txt: `ICE SHELLS ${free}/3` + (free < 3 ? ` · ${Math.ceil(p.iceT || 0)}s` : '') };
    },
    press(g, p) {
      if (p.iceN === undefined) p.iceN = 3;
      if (p.iceN <= 0 || p.iceCharge) { Sfx.deny(); return false; }
      p.iceN--;
      if (!(p.iceT > 0)) p.iceT = this.recharge;
      // (pusingan 2) pengumpul kuasa mengecas 0.7s - asap sejuk disedut dari belakang - baru tembak
      p.iceCharge = { t: 0, dur: 0.7, k: 0 };
      Sfx.tone(300, 0.7, 'sine', 0.12, 1800); Sfx.noise(0.7, 0.2, 3000, 0.8, 0, 'bandpass');
      return true;
    },
    pressMsg(p) { return `CHARGING · ${p.iceN}/3 LEFT`; },
    passive(g, p, dt) {
      g.updateIceCharge(p, dt);
      if (p.iceN === undefined) p.iceN = 3;
      if (p.iceN < 3) {
        p.iceT = (p.iceT || this.recharge) - dt;
        if (p.iceT <= 0) { p.iceN++; p.iceT = p.iceN < 3 ? this.recharge : 0; Sfx.tone(1500, 0.15, 'sine', 0.08, 2100); }
      }
    },
    start() { }, update() { }, end() { },
  },

  /* AUGER (ASSASSIN, 2026-10-18) - BURROW STRIKE. Menyelam ke bawah tanah
     sehingga 5s: tidak kelihatan & tidak boleh disasar/dikena, senjata mati,
     +35% laju, BOLEH LALU BAWAH DINDING, musuh yang dilalui tersandung
     (perlahan). Tekan lagi (atau bila tamat) = MELETUS keluar: hentakan +
     musuh sekeliling dilambung ke udara. */
  burrow: {
    name: 'Burrow Strike', dur: 5, cd: 18, color: '#ff8a2a',
    desc: 'Dig underground for up to 5 seconds: only a dirt mound shows, nothing can see or hit you, you move 35% faster and you can pass UNDER walls (weapons are off while buried). Enemies you pass under stumble. Use the ability again to ERUPT - a blast that damages everything around you and throws it into the air.',
    start(g, p) {
      p.burrow = { t: 0, acc: 0 };
      p.cloak = true; p.untarget = true; p.weaponsOff = true; p.invuln = true; p.abSpeed = 1.35;
      g.fx.smoke(p.x, 0.3, p.z, 10, { speed: 5, size: 1.6, life: 0.9, alpha: 0.5 });
      g.shake(0.6, 0.2);
      Sfx.noise(0.8, 0.4, 500, 0.8); Sfx.tone(70, 0.6, 'sawtooth', 0.16, 40);
      toast('BURROWING - PRESS AGAIN TO ERUPT');
    },
    retrigger() { return true; },
    update(g, p, dt) { g.updateBurrow(p, dt); },
    end(g, p) {
      p.burrow = null;
      p.cloak = false; p.untarget = false; p.weaponsOff = false; p.abSpeed = 1;
      p.invuln = false; p.iframe = Math.max(p.iframe || 0, 0.6);
      g.burrowErupt(p);
    },
  },

  /* E-G300 (TANK, 2026-10-18) - TWIN CANNON. Pusingan 2 (Nabil): kereta
     BERHENTI, pintu ruang terbuka dan meriam naik PERLAHAN (1.6s sela
     pengaktifan), memusing ke musuh yang boleh ditembak, 3 das automatik,
     kemudian turun & disimpan. Peluru sebenar - dinding menghalangnya. */
  twincannon: {
    name: 'Twin Cannon', dur: 5.0, cd: 16, color: '#ffb23f', range: 55, deploy: 1.6, gap: 0.6, stow: 1.2,
    desc: 'The tank stops and the cannon bay opens: a futuristic twin rail cannon slowly rises out of the hull (1.6 second activation), swings onto any enemy it can hit within 55m and fires three heavy shells by itself, then folds back into the hull. Walls and cover block the shells.',
    start(g, p) {
      const t = g.egPick(p, this.range);
      if (!t) { miss(p); return; }
      p.egc = { t, aim: Math.atan2(t.x - p.x, t.z - p.z), time: 0, next: this.deploy, left: 3, k: 0, done: 0 };
      p.egKick = [0, 0]; p.egDep = 0; p.siegeLock = true;
      toast('CANNON DEPLOYING');
      Sfx.tone(60, 1.4, 'sawtooth', 0.14, 120); Sfx.noise(1.4, 0.12, 300, 0.5);
    },
    update(g, p, dt) { g.updateTwinCannon(p, dt, this); },
    end(g, p) { p.egc = null; p.egDep = 0; p.siegeLock = false; missEnd(p); },
  },

  /* HOPPER (FIGHTER) - tiga cas lompatan (sistem cas seperti Gyhna, tetapi
     pulih sendiri). Tidak boleh disentuh di udara; mendarat = hentakan yang
     melambung musuh. Satu cas pulih setiap 6s. */
  springleap: {
    name: 'Spring Leap', dur: 0, cd: 0, color: '#8fe8ff', charges: 3,
    desc: 'Three leap charges, one recharging every 6 seconds. Each use springs 16m forward - untouchable in the air - and lands with a frost stomp that damages, chills and throws nearby enemies into the air.',
    chargeInfo(p) {
      const free = p.leaps === undefined ? 3 : p.leaps;
      return { free, max: 3, txt: `LEAPS ${free}/3` + (free < 3 ? ` · ${Math.ceil(p.leapT || 0)}s` : '') };
    },
    press(g, p) {
      if (p.leaps === undefined) p.leaps = 3;
      if (p.leaps <= 0 || p.hop) { Sfx.deny(); return false; }
      p.leaps--;
      if (p.leapT === undefined || p.leapT <= 0) p.leapT = 6;
      g.startHop(p);
      return true;
    },
    pressMsg() { return null; },
    passive(g, p, dt) {
      if (p.leaps === undefined) p.leaps = 3;
      if (p.leaps < 3) {
        p.leapT = (p.leapT || 6) - dt;
        if (p.leapT <= 0) { p.leaps++; p.leapT = p.leaps < 3 ? 6 : 0; Sfx.tone(900, 0.1, 'sine', 0.08, 1300); }
      }
    },
    start() { }, update() { }, end() { },
  },

  /* CORSAIR (TRICKSTER) - Blink tetapi berpusing: tukar tempat dengan musuh di
     bawah reticle. Musuh itu pening (bot menembak rakan sendiri), kau kebal
     seketika dan menembak +50% selama 3s. */
  switcheroo: {
    name: 'Swap Hook', dur: 3, cd: 15, color: '#57e0ff',
    desc: 'Aim at an enemy (up to 70m) and use the ability: a hook grabs it and you SWAP PLACES instantly. Use it to drag an enemy into your Laser Fence, or to escape by swapping with one far away. After the swap you hit 50% harder for 3s and the enemy is dazed (bots shoot their own team).',
    start(g, p) {
      const t = (g.lock && !g.lock.dead && Math.hypot(g.lock.x - p.x, g.lock.z - p.z) < 70 ? g.lock : null)
        || g.nearestEnemy(g.aim ? g.aim.x : p.x, g.aim ? g.aim.z : p.z, 26);
      if (!t || Math.hypot(t.x - p.x, t.z - p.z) > 70) { miss(p); return; }
      g.swapWith(p, t);
      p.abDmg = 1.5;
    },
    update() { },
    end(g, p) { p.abDmg = 1; missEnd(p); },
  },
};
void clamp; void lerp;

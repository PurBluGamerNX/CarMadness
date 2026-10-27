// main.js — enjin permainan
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  clamp, lerp, damp, rand, randInt, pick, chance, TAU, PI, angDiff, turnTo,
  Input, Sfx, Save, fmt,
} from './core.js';
import { buildCar, buildWeaponModel, buildPickup, buildMine, buildBeacon, buildTurret, buildDecoy, buildWingDrone, buildStrikeDrone } from './models.js';
import { Econ } from './econ.js';
import { CARS, CAR_BY, ABILITY, getLoadout, getCarUp, slotsOf, slotMulOf } from './cars.js';
import { perkDamage, rollCrit } from './perks.js';
import { FX } from './fx.js';
import { Touch } from './touch.js';
import { Intro } from './intro.js';
import { animWeapon, EJECT_AT } from './wanim.js';
import { abCast, abAura } from './abfx.js';
import { updateWaves, updateTornados, updateAmber, amberIgnite, clearElements } from './elements.js';
import { World, ARENA, HALF, spawnPoint, setArena } from './world.js';
import { MAPS, MAP_ORDER } from './maps.js';
import {
  Horde, EDEF, MODES, makeEnemy, disposeEnemy, updateEnemy, rollWave, waveScale, prewarmEnemies,
} from './enemies.js';
import { HORDES } from './models.js';
import {
  WEAPONS, WBY, weaponStats, makeSlot, slotUpdate, fireWeapon, startReload,
  carStats, MAX_LV, markOf,
} from './weapons.js';
import { UI } from './ui.js';
import { Missions } from './missions.js';
import { Team, TEAM_MODES } from './team.js';
import { Training, defaultTest, testSlots } from './training.js';
import { SYS2 } from './systems2.js';
import { hpScale, playerL, abScale, U } from './scale.js';

const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
// warna hex kebolehan -> RGB terang untuk kesan additif
function hexRGB(h) {
  const n = parseInt((h || '#ffffff').slice(1), 16);
  return [((n >> 16) & 255) / 255 * 1.7, ((n >> 8) & 255) / 255 * 1.7, (n & 255) / 255 * 1.7];
}
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);

export const Game = {
  /* ---------------- pemulaan ---------------- */
  init() {
    Save.load();
    const canvas = document.getElementById('game');
    this.canvas = canvas;

    // guna kanvas buangan supaya atribut konteks kanvas permainan tidak terkunci
    let probe = null;
    try { probe = document.createElement('canvas').getContext('webgl2'); } catch (e) { probe = null; }
    if (!probe) {
      if (window.__fatal) {
        window.__fatal('WEBGL2 NOT AVAILABLE', [
          'This browser cannot open a WebGL2 context, so the 3D game',
          'cannot run.',
          '',
          'Try the latest Chrome or Edge, and make sure',
          'Settings > System > "Use hardware acceleration" is enabled.',
          '',
          navigator.userAgent,
        ]);
      }
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: Save.d.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer = renderer;
    this.applyQuality();
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 900);
    this.camera.position.set(0, 18, -20);

    this.setupComposer();

    this.time = 0;
    this.state = 'menu';
    this.shakeAmt = 0; this.shakeT = 0;
    this.camDist = Save.d.camDist || 40; this.camYaw = 0;
    this.enemies = []; this.bullets = []; this.pickups = []; this.arts = [];
    this.grid = new Map();
    this.hordes = {};
    this.raycaster = new THREE.Raycaster();
    this.aim = new THREE.Vector3(0, 0.9, 10);
    this.slowMo = 1;

    Input.init(canvas);
    addEventListener('resize', () => this.resize());
    this.resize();

    UI.init(this);
    /* Urutan pembukaan: skrin muat berlogo dengan kereta berpusing, kemudian
       kereta terakhir yang dipakai memandu masuk ke dalam garaj. Kalau apa-apa
       tersasar, kita jatuh balik terus ke skrin tajuk. */
    Intro.run(UI, async () => { prewarmEnemies('war'); })
      .catch(() => { const d = document.getElementById('intro'); if (d) d.remove(); UI.show('garage', true); });

    const unlock = () => { Sfx.init(); Sfx.setVol(Save.d.muted ? 0 : Save.d.vol); Sfx.resume(); };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });

    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  /* Kualiti grafik (2026-10-17, "berat sikit"): resolusi piksel & bayang ikut
     tetapan. Low = 1x piksel, bayang keras murah; Medium = 1.25x, PCF;
     High = sehingga 2x, bayang lembut. Dipanggil semasa init & setiap tukar tetapan. */
  applyQuality() {
    const r = this.renderer, q = Save.d.quality;
    if (!r) return;
    r.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'med' ? 1.25 : 1));
    r.shadowMap.enabled = true;
    r.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : q === 'med' ? THREE.PCFShadowMap : THREE.BasicShadowMap;
    r.shadowMap.needsUpdate = true;
    if (this.camera) this.resize();
  },

  setupComposer() {
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (Save.d.quality === 'low') return;
    const c = new EffectComposer(this.renderer);
    c.addPass(new RenderPass(this.scene, this.camera));
    const b = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight),
      Save.d.quality === 'high' ? 0.62 : 0.5, 0.75, 0.82);
    c.addPass(b);
    c.addPass(new OutputPass());
    this.composer = c; this.bloom = b;
    c.setSize(innerWidth, innerHeight);
  },

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  },

  /* ---------------- mula perlawanan ---------------- */
  startRun(mode) {
    this.clearRun();
    this.mode = mode;
    const TM = TEAM_MODES[mode];
    const TR = mode === 'training';                 // padang latihan (training.js)
    // pepijat (Nabil): tukar kereta di garaj tetapi Training masih guna kereta lama - Game.test tidak pernah dikemas kini
    if (TR && (!this.test || this.test.from !== Save.d.car)) this.test = defaultTest();
    const M = TM || MODES[mode] || { theme: 'warzone' };
    this.quality = Save.d.quality;

    /* peta pasukan dipilih pemain (Save.d.teamMap); mod gelombang kekal 240m */
    let pickMap = Save.d.teamMap;
    if (pickMap === 'random') pickMap = pick(MAP_ORDER);                 // Nabil: pilihan peta rawak
    // Cargo Escort ada peta sendiri (Convoy Pass) - pemilih peta tidak terpakai
    const mapId = TM ? (TM.map || (MAPS[pickMap] && !MAPS[pickMap].escortOnly ? pickMap : 'valley')) : null;
    this.mapId = mapId;
    setArena(mapId ? MAPS[mapId].size : 240);
    this.world = new World(this.scene, this.renderer, mapId ? MAPS[mapId].theme : M.theme, this.quality, mapId);
    this.fx = new FX(this.scene, this.quality);

    for (const k in HORDES) this.hordes[k] = new Horde(HORDES[k], this.scene);
    prewarmEnemies(mode);

    // kereta terpilih + kebolehannya
    const carDef = (TR && CAR_BY[this.test.car]) || CAR_BY[Save.d.car] || CAR_BY.ranger;
    this.carDef = carDef;
    const car = buildCar(carDef.color || Save.d.color,
      Object.assign({}, carDef.spec, { slots: carDef.mountSlots || carDef.slots || 2 }));
    this.scene.add(car.root);
    this.car = car;
    this._carOp = 1;
    // latihan: kereta yang belum dibeli guna statistik asas (tiada entri baharu ditulis ke Save)
    const cs = carStats(TR ? ((Save.d.carUp || {})[carDef.id] || {}) : getCarUp(carDef.id), carDef.mods);
    // pampasan slot: senjata sedikit tetapi setiap satu lebih berbisa
    this.slotMul = slotMulOf(carDef.id);
    const ab = ABILITY[carDef.ability];
    /* SATU SKALA (scale.js): HP pemain & bot = HP asas x hpScale(L). Damage musuh gelombang
       didarab hpK dalam hurtPlayer; damage ABILITY terhadap bot pasukan didarab abScale. */
    this.L = TR ? (this.test.lv || 1) : playerL(carDef.id);
    this.hpK = hpScale(this.L);
    this.abScale = TM ? abScale(this.L) : 1;
    this._abCtx = 0; this._curB = null;
    this.player = {
      x: 0, z: 0, y: 0, ang: 0, vx: 0, vz: 0, fwd: 0, lat: 0,
      r: 2.1, hp: cs.maxHp * this.hpK, maxHp: cs.maxHp * this.hpK, nitro: 100, stats: cs,
      turretAng: 0, wheelSpin: 0, steer: 0, iframe: 0, dead: false, spawnShield: 0,
      pow: { dmg: 0, shield: 0, rapid: 0, freeze: 0 },
      // keadaan kebolehan
      abId: carDef.ability, ab, abCd: 0, abT: 0, abOn: false,
      abDmg: 1, abRes: 1, abAbsorb: false, abHeal: 0, abNuke: 0, abNukeDone: false,
      abSpeed: 1, abRam: 1, abRof: 1, abAnchor: false, cloak: false, invuln: false,
      overshield: 0, prow: false, abHigh: false, abWave: 0, abWaveN: 0, abChain: 0,
      abAnim: 0, abDrop: 0, abZap: 0, abPing: 0, wellX: null, wellZ: null,
      fly: 0, flyY: 0,
    };
    this.mines = []; this.beacon = null; this.turrets = []; this.hazards = [];
    this.wings = []; this.decoy = null;
    this.autoCd = 0;
    this.rebuildWeapons();

    // reticle
    this.buildReticle();

    this.wave = 0; this.kills = 0; this.score = 0;
    this.earnedCoins = 0; this.earnedScrap = 0;
    this.queue = []; this.spawnCd = 0; this.intermission = 0;
    this.time = 0; this.slowMo = 1;
    this.state = 'play';
    this.bossAlive = false;

    Sfx.init(); Sfx.resume(); Sfx.startEngine();
    UI.show(null);
    UI.hudOn(true);
    UI.syncHud(this);
    this.team = null;
    if (TM) { this.team = new Team(this, mode, UI); UI.syncHud(this); }
    else if (TR) { this.training = new Training(this, UI); UI.syncHud(this); }
    else this.nextWave();
    this.canvas.classList.add('playing');
  },

  clearRun() {
    if (this.flairFx) { this.flairFx.forEach(F => F.dispose()); this.flairFx = []; }   // tiub libasan Flair
    this.autoTgt = null;
    this.runDamage = 0;
    this.liveSlots = undefined;
    if (this.team) { this.team.dispose(); this.team = null; }
    if (this.training) { this.training.dispose(); this.training = null; }
    for (const e of this.enemies) disposeEnemy(this, e);
    this.enemies.length = 0; this.bullets.length = 0;
    for (const p of this.pickups) this.scene.remove(p.obj);
    this.pickups.length = 0;
    for (const a of this.arts) this.scene.remove(a.mesh);
    this.arts.length = 0;
    for (const k in this.hordes) { for (const m of this.hordes[k].meshes) this.scene.remove(m); }
    this.hordes = {};
    if (this.car) this.scene.remove(this.car.root);
    if (this.reticle) this.scene.remove(this.reticle);
    if (this.lockMark) { this.scene.remove(this.lockMark); this.lockMark = null; }
    if (this.vulagMark) { this.scene.remove(this.vulagMark); this.vulagMark = null; }
    this.dome = null;
    this.lock = null;              // sasaran berkunci perlawanan lepas tidak boleh terbawa
    this.clear2();
    if (this.grabBeads) { for (const b of this.grabBeads) this.scene.remove(b); this.grabBeads = null; }
    if (this.enemyMarks) { this.scene.remove(this.enemyMarks); this.enemyMarks = null; }
    if (this.dirArrow) { this.scene.remove(this.dirArrow); this.dirArrow = null; }
    if (this.mines) { for (const m of this.mines) this.scene.remove(m.obj); this.mines.length = 0; }
    if (this.turrets) { for (const t of this.turrets) this.scene.remove(t.obj); this.turrets.length = 0; }
    if (this.hazards) { for (const h of this.hazards) this.scene.remove(h.obj); this.hazards.length = 0; }
    if (this.nets) { for (const n of this.nets) this.scene.remove(n.obj); this.nets.length = 0; }
    if (this.discs) { for (const d of this.discs) this.scene.remove(d.obj); this.discs.length = 0; }
    if (this.strikes) { for (const d of this.strikes) this.scene.remove(d.obj); this.strikes.length = 0; }
    clearElements(this);
    if (this.ssMesh) { this.scene.remove(this.ssMesh); this.ssMesh = null; }
    if (this.wings) { for (const w of this.wings) this.scene.remove(w.obj); this.wings.length = 0; }
    this.clearDecoy();
    this.clearBeacon();
    if (this.shieldMesh) { this.scene.remove(this.shieldMesh); this.shieldMesh = null; }
    if (this.world) { this.world.dispose(); this.world = null; }
    if (this.fx) {
      this.scene.remove(this.fx.add.points); this.scene.remove(this.fx.smk.points);
      for (const b of this.fx.booms) { this.scene.remove(b.ball); this.scene.remove(b.ring); }
      for (const b of this.fx.beams) this.scene.remove(b.m);
      for (const l of this.fx.lights) this.scene.remove(l.L);
      for (const k in this.fx.decals) this.scene.remove(this.fx.decals[k].mesh);
      this.fx = null;
    }
    Sfx.stopEngine();
  },

  rebuildWeapons() {
    // semasa perlawanan, guna kereta yang sedang dipandu; di menu guna pilihan semasa
    const carId = (this.world && this.carDef) ? this.carDef.id : (Save.d.car || 'ranger');
    if (this.world && this.mode === 'training' && this.test) {      // latihan: senjata pilihan, bukan Save
      this.slots = testSlots(this.test, makeSlot);
      if (!this.slots.some(Boolean)) this.slots[0] = makeSlot('mg', this.test.lv, []);
      this.mountWeapons();
      return;
    }
    const lo = getLoadout(carId);
    this.slots = lo.map(id => (id && WBY[id]) ? makeSlot(id, Save.d.lv[id] || 1, Save.d.perks[id] || []) : null);
    /* Kereta tanpa senjata: hanya DALAM perlawanan diberi Ripper Gun sementara.
       Dahulu 'mg' ditulis terus ke susunan tersimpan - dan fungsi ini juga
       dipanggil oleh garaj (afterChange) selepas beli kereta, jadi setiap kereta
       baharu "sudah ada senjata melekat" pada slot pertama. */
    if (!this.slots.some(Boolean) && this.world) {
      this.slots[0] = makeSlot('mg', Save.d.lv.mg || 1, Save.d.perks.mg || []);
    }
    this.mountWeapons();
  },

  mountWeapons() {
    if (!this.car) return;
    if (this.wModels) {
      for (let i = 0; i < this.wModels.length; i++) {
        if (this.wModels[i] && this.car.turrets[i]) this.car.turrets[i].remove(this.wModels[i].root);
      }
    }
    this.wModels = [];
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const mount = this.car.turrets[i];
      if (!slot || !mount) { this.wModels.push(null); continue; }
      const m = buildWeaponModel(slot.id);
      m.root.scale.setScalar(this.car.mountScale || 1);
      mount.add(m.root);
      this.wModels.push(m);
    }
    UI.syncHud(this);
  },

  buildReticle() {
    const g = new THREE.Group();
    const mk = (geo, col, op) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
      }));
      m.renderOrder = 20; g.add(m); return m;
    };
    const ring = mk(new THREE.RingGeometry(1.05, 1.22, 40), 0x6ff0ff, 0.85);
    ring.rotation.x = -PI / 2;
    const ring2 = mk(new THREE.RingGeometry(0.16, 0.26, 20), 0xff5a4a, 0.9);
    ring2.rotation.x = -PI / 2;
    for (let i = 0; i < 4; i++) {
      const b = mk(new THREE.PlaneGeometry(0.55, 0.09), 0x6ff0ff, 0.8);
      b.rotation.x = -PI / 2; b.rotation.z = i * PI / 2;
      b.position.set(Math.cos(i * PI / 2) * 1.7, 0, Math.sin(i * PI / 2) * 1.7);
    }
    g.renderOrder = 20;
    this.scene.add(g);
    this.reticle = g;
    this.reticleRing = ring;

    // penanda merah kecil di atas kepala setiap musuh
    const mkShape = new THREE.Shape();
    mkShape.moveTo(0, -0.55); mkShape.lineTo(-0.5, 0.42); mkShape.lineTo(0, 0.12); mkShape.lineTo(0.5, 0.42);
    mkShape.closePath();
    const mkMesh = new THREE.InstancedMesh(
      new THREE.ShapeGeometry(mkShape),
      new THREE.MeshBasicMaterial({
        color: 0xff4038, transparent: true, opacity: 0.92,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      }), 220);
    mkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mkMesh.count = 0;
    mkMesh.frustumCulled = false;
    mkMesh.renderOrder = 22;
    this.scene.add(mkMesh);
    this.enemyMarks = mkMesh;
    this._mkDummy = new THREE.Object3D();

    // penanda sasaran terkunci (diletak di bawah musuh yang dikunci)
    const lm = new THREE.Group();
    const lr = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.12, 32), new THREE.MeshBasicMaterial({
      color: 0xff6a4a, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    lr.rotation.x = -PI / 2;
    lm.add(lr);
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1), lr.material);
      t.rotation.x = -PI / 2; t.rotation.z = i * PI / 2 + PI / 4;
      t.position.set(Math.cos(i * PI / 2 + PI / 4) * 1.3, 0, Math.sin(i * PI / 2 + PI / 4) * 1.3);
      lm.add(t);
    }
    lm.renderOrder = 21;
    lm.visible = false;
    this.scene.add(lm);
    this.lockMark = lm;

    // penunjuk arah hadapan kereta (kamera tidak lagi mengikut hala kereta,
    // jadi pemain perlukan penanda ini)
    const arr = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, 1.25); sh.lineTo(-0.95, -0.55); sh.lineTo(0, -0.05); sh.lineTo(0.95, -0.55); sh.closePath();
    const am = new THREE.MeshBasicMaterial({
      color: 0x7ce7ff, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const head = new THREE.Mesh(new THREE.ShapeGeometry(sh), am);
    head.rotation.x = -PI / 2;
    head.rotation.z = PI;
    head.position.set(0, 0, 0);
    arr.add(head);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 2.2), am);
    tail.rotation.x = -PI / 2;
    tail.position.set(0, 0, -1.5);
    arr.add(tail);
    arr.scale.setScalar(1.35);
    arr.renderOrder = 19;
    this.scene.add(arr);
    this.dirArrow = arr;
    this.dirMat = am;
  },

  /* ---------------- gelombang ---------------- */
  nextWave() {
    this.wave++;
    const M = MODES[this.mode];
    // Kiamat tiada bos tetap — ambil bos rawak setiap 5 gelombang
    const isBoss = (M.boss || this.mode === 'chaos') && this.wave % 5 === 0;
    this.queue = rollWave(this.mode, this.wave);
    if (isBoss) {
      this.queue = this.queue.slice(0, Math.floor(this.queue.length * 0.45));
      this.queue.unshift('BOSS');
    }
    this.spawnCd = 0.7;
    this.intermission = 0;
    this.waveEnemies = this.queue.length;
    UI.banner(isBoss ? `WAVE ${this.wave} — BOSS!` : `WAVE ${this.wave}`,
      isBoss ? '#ff4d4d' : null);
    Sfx.wave();
    if (isBoss) setTimeout(() => Sfx.alarm(), 400);
    UI.syncHud(this);
  },

  spawnTick(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      UI.setNextIn(this.intermission);
      if (this.intermission <= 0) this.nextWave();
      return;
    }
    if (!this.queue.length) {
      if (!this.enemies.length) {
        // gelombang selesai
        const bonus = 60 + this.wave * 35;
        const sbonus = 40 + this.wave * 25;
        Econ.addCoins(bonus); Econ.addScrap(sbonus);
        // pembaikan antara gelombang: pulih 30% HP supaya larian panjang tidak mustahil
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
        Missions.track('wave', 1, this.mode, this.wave);
        this.missionToast();
        this.earnedCoins = (this.earnedCoins || 0) + bonus;
        this.earnedScrap = (this.earnedScrap || 0) + sbonus;
        Save.save();
        UI.syncHud(this);
        this.intermission = 9;
        UI.banner(`WAVE ${this.wave} CLEARED  +${bonus} COINS  +${sbonus} SCRAP`, '#7dffb0');
        UI.toast('Press B for the garage · ENTER to continue');
        Sfx.buy();
        Save.d.best[this.mode] = Math.max(Save.d.best[this.mode] || 0, this.wave);
        if (this.wave >= 10) Save.d.chaosUnlocked = true;
        Save.save();
      }
      return;
    }
    this.spawnCd -= dt;
    const cap = this.quality === 'low' ? 46 : 78;
    if (this.spawnCd <= 0 && this.enemies.length < cap) {
      this.spawnCd = rand(0.35, 0.7);
      const n = Math.min(this.queue.length, randInt(2, 4));
      for (let i = 0; i < n; i++) {
        const k = this.queue.shift();
        if (k === 'BOSS') { this.spawnBoss(); continue; }
        const p = spawnPoint(this.player.x, this.player.z);
        this.spawnEnemy(k, p.x, p.z);
      }
    }
  },

  spawnEnemy(kind, x, z) {
    const e = makeEnemy(this, kind, x, z, this.wave);
    this.enemies.push(e);
    // kesan muncul
    if (EDEF[kind].fly) this.fx.spark(x, EDEF[kind].fly, z, 6, [0.4, 1.6, 1.4], { speed: 4, life: 0.4 });
    else this.fx.smoke(x, 0.3, z, 3, { speed: 1.6, size: 1.0, life: 0.7, alpha: 0.4 });
    return e;
  },

  spawnBoss() {
    const M = MODES[this.mode];
    const kind = M.boss || pick(['bossZ', 'bossA', 'bossW']);
    const p = spawnPoint(this.player.x, this.player.z, 50, 62);
    const e = this.spawnEnemy(kind, p.x, p.z);
    this.boss = e; this.bossAlive = true;
    this.fx.explode(p.x, 2, p.z, 7, [1.4, 0.5, 0.4], { dur: 0.7 });
    this.shake(1.6, 0.6);
    UI.bossBar(e);
  },

  summon(kind, x, z, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), r = rand(5, 12);
      this.spawnEnemy(kind, clamp(x + Math.cos(a) * r, -HALF + 4, HALF - 4), clamp(z + Math.sin(a) * r, -HALF + 4, HALF - 4));
    }
  },

  /* ---------------- gelung utama ---------------- */
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    Sfx.frame();

    if (this.state === 'play') {
      this.slowMo = damp(this.slowMo, 1, 3, dt);
      this.update(dt * this.slowMo);
    } else if (this.state === 'dying') {
      this.slowMo = damp(this.slowMo, 0.22, 2.2, dt);
      this.update(dt * this.slowMo);
      this.dyingT -= dt;
      if (this.dyingT <= 0) this.gameOver();
    } else if (this.state === 'respawn' || this.state === 'countdown') {
      this.slowMo = 1;
      this.update(dt);
    } else if (this.state === 'pause' || this.state === 'garage') {
      this.updateCamera(dt, true);
    }

    this.render();
    Input.endFrame();
  },

  update(dt) {
    this.time += dt;
    const p = this.player;

    this.buildGrid();
    if (this.state === 'play') this.updatePlayer(dt);
    else if (this.state === 'countdown' && this.car) {
      // updatePlayer dilangkau, jadi segerakkan model kereta secara manual
      this.car.root.position.set(p.x, p.y, p.z);
      this.car.root.rotation.y = p.ang;
      if (this.dirArrow) { this.dirArrow.position.set(p.x, 0.06, p.z); this.dirArrow.rotation.z = -p.ang; }
    }
    this.updateWeapons(dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      updateEnemy(this, e, dt);
    }
    this.updateBullets(dt);
    this._curB = null;
    this.updateAbility(dt);
    this.update2(dt);
    if (this.grabBeads || (p.grabs && p.grabs.length)) this.updateGrabFx();
    this._abCtx++; this.updateMines(dt); this.updateStrikeDrones(dt); this.updateDome(dt); this._abCtx--;
    this.updateTurrets(dt);
    this._curB = null;
    this.updateHazards(dt);
    this._curB = null;
    this.updateNets(dt);
    this.updateDiscs(dt);
    this.updateLift(dt);
    this.updateGlue(dt);
    updateWaves(this, dt);
    updateTornados(this, dt);
    updateAmber(this, dt);
    this.updateSpawnShield(dt);
    this.updateWings(dt);
    this.updateDecoy(dt);
    this.updatePickups(dt);
    this.updateArtillery(dt);
    if (this.team) this.team.update(dt);
    else if (this.training) this.training.update(dt);
    else if (this.state === 'play') this.spawnTick(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.renderHordes();
    this.updateEnemyMarks();
    this.world.updateSun(p.x, p.z);

    // kuasa sementara
    for (const k in p.pow) if (p.pow[k] > 0) p.pow[k] = Math.max(0, p.pow[k] - dt);
    if (p.iframe > 0) p.iframe -= dt;
    if (p.stats.regen && p.hp < p.maxHp && this.state === 'play') {
      p.hp = Math.min(p.maxHp, p.hp + p.stats.regen * dt * (this.hpK || 1));
    }
    UI.tickHud(this, dt);
  },

  /* ---------------- pemain ---------------- */
  updatePlayer(dt) {
    const p = this.player, K = Input.keys, S = p.stats;
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    // vektor kanan MENGIKUT SKRIN (kamera berada di belakang kereta).
    // Dengan hadapan = (sin a, cos a), kanan-skrin ialah (-cos a, sin a).
    const rx = -Math.cos(p.ang), rz = Math.sin(p.ang);

    let thr = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0);
    let str = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    /* Kayu bedik sentuh: arahnya ialah arah yang hendak dituju, dan kereta
       berpusing ke arah itu sendiri. Jauh lebih senang dikawal dengan ibu
       jari daripada stereng kiri/kanan. */
    if (Input.axMag !== null && Input.axMag > 0.02) {
      /* `p.ang -= p.steer * turn`, jadi stereng POSITIF mengurangkan sudut.
         Untuk berpusing KE ARAH sasaran, tandanya mesti dinegatifkan -
         kalau tidak kereta berpusing menjauhinya dan berpusing tanpa henti. */
      const diff = angDiff(p.ang, Input.axHead);
      /* Sasaran di belakang? Undur, jangan pusing sambil memandu ke depan.
         Histeresis (2.35 masuk / 1.9 keluar) menghalang ia berkelip antara
         maju dan undur di sempadan - itu punca rasa "terbalik sekejap". */
      const lim = p.revMode ? 1.9 : 2.35;
      p.revMode = Math.abs(diff) > lim;
      if (p.revMode) {
        // undur: bawa EKOR ke arah yang dituju
        const rd = angDiff(p.ang, Input.axHead + PI);
        str = clamp(-rd * 1.9, -1, 1);
        thr = -Input.axMag;
      } else {
        str = clamp(-diff * 2.4, -1, 1);
        // pecutan penuh bila menghala betul, perlahan semasa memusing tajam
        thr = Input.axMag * clamp(1.12 - Math.abs(diff) * 0.46, 0.3, 1);
      }
    } else if (Input.axMag !== null) { thr = 0; str = 0; p.revMode = false; }
    const hand = !!(K.ControlLeft || K.ControlRight || K.KeyX);
    if (Input.hit('Space')) this.useAbility();
    const wantNitro = (K.ShiftLeft || K.ShiftRight) && p.nitro > 1 && thr > 0;
    p.nitroOn = wantNitro;

    // nitro
    if (wantNitro) {
      p.nitro = Math.max(0, p.nitro - 34 * dt);
      const ex = p.x - fx * 2.3, ez = p.z - fz * 2.3;
      this.fx.add.emit(ex + rand(-0.4, 0.4), 0.55, ez + rand(-0.4, 0.4), -fx * 8 + rand(-2, 2), rand(0, 2), -fz * 8 + rand(-2, 2),
        { color: [0.6, 1.4, 2.4], color2: [1.4, 0.5, 0.2], size: rand(0.4, 0.9), size2: 0.08, life: rand(0.15, 0.35), drag: 3 });
    } else {
      p.nitro = Math.min(100, p.nitro + 11 * S.nitro * dt);
    }

    const boost = (wantNitro ? 1.55 : 1) * (p.abSpeed || 1);
    const maxSpd = 30 * S.speed * boost;
    const accel = 26 * S.speed * boost;

    // halaju dalam ruang kereta
    let fwd = p.vx * fx + p.vz * fz;
    let lat = p.vx * rx + p.vz * rz;

    if (thr > 0) fwd += accel * dt * (1 - clamp(fwd / maxSpd, 0, 1) * 0.85);
    else if (thr < 0) fwd -= (fwd > 0 ? 42 : 16) * dt;
    else fwd -= fwd * 1.1 * dt;
    if (hand) fwd -= fwd * 2.6 * dt;
    fwd = clamp(fwd, -13, maxSpd);

    // cengkaman sisi (drift)
    const grip = (hand ? 1.6 : 7.0) * S.grip;
    lat -= lat * clamp(grip * dt, 0, 1);

    // stereng
    const spdF = clamp(Math.abs(fwd) / 9, 0, 1);
    const turn = 2.15 * S.grip * spdF * (fwd < 0 ? -1 : 1) * (hand ? 1.35 : 1);
    p.steer = damp(p.steer, str, 11, dt);
    // tekan D (steer +1) mesti pusing ke KANAN skrin, iaitu sudut berkurang
    p.ang -= p.steer * turn * dt;
    if (Math.abs(fwd) > 4 && Math.abs(p.steer) > 0.4) lat -= p.steer * fwd * 0.055 * (hand ? 2.2 : 1);

    if (p.abAnchor) { fwd *= Math.max(0, 1 - dt * 6); lat *= Math.max(0, 1 - dt * 6); }
    // Hamvog dibuka: terkunci sepenuhnya - tiada bergerak, tiada pusing
    if (p.siegeLock) { fwd = 0; lat = 0; p.steer = 0; }
    p.vx = fx * fwd + rx * lat;
    p.vz = fz * fwd + rz * lat;
    /* Razorback Rampage: kereta memusing sendiri ke sasaran dan meluru lurus.
       Hentaman ditangani dalam ABILITY.charge.update (cars.js). */
    if (p.ramDash) {
      const rd = p.ramDash, t = rd.tgt;
      rd.t -= dt;
      if (!t || t.dead || rd.t <= 0) p.ramDash = null;
      else {
        const want = Math.atan2(t.x - p.x, t.z - p.z);
        const da = Math.atan2(Math.sin(want - p.ang), Math.cos(want - p.ang));
        p.ang += da * Math.min(1, dt * 16);
        fwd = rd.spd; lat = 0; p.steer = 0;
        p.vx = Math.sin(p.ang) * fwd; p.vz = Math.cos(p.ang) * fwd;
      }
    }
    p.fwd = fwd; p.lat = lat;

    p.x += p.vx * dt; p.z += p.vz * dt;
    p.wheelSpin += fwd * dt * 2.2;
    p.y = damp(p.y, p.fly ? (p.abHigh ? 13 : 6.4) : 0, 3.2, dt);
    const airborne = p.y > 1.6;

    // sempadan & prop
    const before = { x: p.x, z: p.z };
    if (Math.abs(p.x) > HALF - 3) { p.x = clamp(p.x, -HALF + 3, HALF - 3); p.vx *= -0.25; }
    if (Math.abs(p.z) > HALF - 3) { p.z = clamp(p.z, -HALF + 3, HALF - 3); p.vz *= -0.25; }
    if (before.x !== p.x || before.z !== p.z) {
      if (Math.abs(fwd) > 16) { this.hurtPlayer(4, p.x, p.z); this.shake(0.6, 0.15); }
    }
    if (!airborne && !p.burrow) this.collideProps(p, dt);      // Auger di bawah tanah lalu bawah dinding

    // langgar musuh (tidak berlaku semasa terbang)
    const speed = Math.hypot(p.vx, p.vz);
    if (!airborne && !p.burrow) this.neighbors(p.x, p.z, 4.5, null, (e, dx, dz, d) => {
      if (e.d.fly && e.y > 2.6) return;
      const rr = e.r + p.r;
      if (d > rr) return;
      const push = (rr - d) / (d || 0.01);
      if (!e.d.boss) { e.x -= dx * push * 0.9; e.z -= dz * push * 0.9; }
      if (speed > 7) {
        const dmg = (speed - 5) * 2.6 * S.ram * (p.abRam || 1);
        this.damageEnemy(e, dmg, -dx, 0, -dz, speed * 0.8, 'ram');
        this.fx.spark(e.x, 0.8, e.z, 5, [1.6, 1.1, 0.5], { speed: 5, life: 0.3 });
        if (!e.d.boss) { e.vx = -dx / (d || 1) * speed * 1.4; e.vz = -dz / (d || 1) * speed * 1.4; }
        const back = clamp(e.maxHp / 260, 0.05, 0.6) * (e.d.knockRes || 0.3);
        p.vx *= 1 - back * 0.5; p.vz *= 1 - back * 0.5;
        this.shake(clamp(speed * 0.02, 0.1, 0.5), 0.08);
        this.hurtPlayer(e.d.boss ? 14 : (e.maxHp > 200 ? 6 : 1.2), e.x, e.z);
        Sfx.flesh();
      }
    });

    // gegaran kereta & roda
    const c = this.car;
    c.root.position.set(p.x, p.y, p.z);
    c.root.rotation.y = p.ang;
    const roll = clamp(lat * 0.012, -0.12, 0.12);
    const pitch = clamp((this._lastFwd !== undefined ? (fwd - this._lastFwd) / Math.max(dt, 0.001) : 0) * -0.0016, -0.09, 0.09);
    this._lastFwd = fwd;
    c.root.rotation.z = damp(c.root.rotation.z, roll, 8, dt);
    c.root.rotation.x = damp(c.root.rotation.x, pitch + (p._tilt || 0), 6, dt);
    for (const w of c.wheels) {
      w.spin.rotation.x = p.wheelSpin;
      if (w.front) w.holder.rotation.y = -p.steer * 0.42;
    }
    if (c.rollers) for (const r of c.rollers) r.rotation.x = p.wheelSpin;
    if (c.track) c.track.update(p.wheelSpin);
    // Hamvog: lengan senjata berayun keluar (dibuka) atau terlipat ke belakang
    if (c.setDeploy) { p.deploy = damp(p.deploy || 0, p.deployTo || 0, 5, dt); c.setDeploy(p.deploy); }
    if (c.segments) this.animSerpent(c, p, fwd, dt);
    if (c.tentacles) {
      this.animTentacles(c.tentacles, fwd, this.time);
      c.root.position.y = p.y + 0.15 + Math.sin(this.time * 2.1) * 0.14;   // loceng terapung
    }
    /* kereta baharu (models2.js): setiap badan ada animasi cara gerak sendiri */
    if (c.animate) {
      p.dist = (p.dist || 0) + Math.abs(fwd) * dt;
      const accel = (fwd - (p._pf || 0)) / Math.max(dt, 1e-3);
      p._pf = fwd;
      c.animate({ fwd, lat, steer: p.steer, time: this.time, dt, dist: p.dist, p, g: this, accel });
      c.root.position.y = p.y + (p._bob || 0);
    }
    if (c.legs && c.legs.length) {
      // kitaran langkah kaki, kelajuan ikut pergerakan kereta
      const amt = clamp(Math.abs(fwd) / 12, 0, 1);
      for (const L of c.legs) {
        const ph = p.wheelSpin * 1.6 + L.phase;
        L.hip.rotation.x = Math.sin(ph) * 0.42 * amt;
        L.knee.rotation.x = -Math.sin(ph + 0.9) * 0.34 * amt;
      }
    }
    if (c.hovers && c.hovers.length) {
      const bob = Math.sin(this.time * 4) * 0.06;
      for (const h of c.hovers) h.position.y = (h.userData.baseY !== undefined ? h.userData.baseY : (h.userData.baseY = h.position.y)) + bob;
    }
    if (c.hoverFx) c.hoverFx.update(this.time, dt, clamp(Math.abs(fwd) / 30, 0, 1));
    // asap tayar bila drift
    if (!airborne && Math.abs(lat) > 7 && Math.abs(fwd) > 5) {
      for (const w of c.wheels) {
        if (w.front) continue;
        v3.set(w.holder.position.x, 0.1, w.holder.position.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.ang);
        this.fx.smoke(p.x + v3.x, 0.15, p.z + v3.z, 1, { speed: 0.6, size: 0.7, life: 0.8, alpha: 0.28, rise: 0.25 });
      }
      /* kesan hangus HANYA untuk kereta yang memang bertayar/berantai - kereta
         hover, berkaki, ular dan bola dahulu meninggalkan tompok hitam besar */
      const tyres = (c.wheels.length && c.spec.limbs !== 'gyro' && c.spec.limbs !== 'orbs') || (c.rollers && c.rollers.length) || !!c.track;
      if (tyres && Math.random() < dt * 14) this.fx.decal('scorch', p.x, p.z, 1.5);
    }

    // meriam automatik terbina dalam (sentiasa hidup)
    const ac = this.carDef && this.carDef.autoCannon;
    if (ac && this.car.autoTurret) {
      const tgt = this.nearestEnemy(p.x, p.z, ac.range);
      const tr = this.car.autoTurret;
      if (tgt) {
        const want = Math.atan2(tgt.x - p.x, tgt.z - p.z) - p.ang;
        tr.rotation.y = turnTo(tr.rotation.y, Math.atan2(Math.sin(want), Math.cos(want)), dt * 5);
      } else {
        tr.rotation.y = turnTo(tr.rotation.y, 0, dt * 2);
      }
      this.autoCd -= dt;
      if (tgt && this.autoCd <= 0) {
        this.autoCd = ac.cd;
        this.car.autoMuzzle.getWorldPosition(v3b);
        let ax = tgt.x - v3b.x, ay = (tgt.y + tgt.h * 0.5) - v3b.y, az = tgt.z - v3b.z;
        const al = Math.hypot(ax, ay, az) || 1;
        ax /= al; ay /= al; az /= al;
        this.spawnBullet({
          x: v3b.x, y: v3b.y, z: v3b.z, vx: ax * ac.speed, vy: ay * ac.speed, vz: az * ac.speed,
          dmg: ac.dmg + this.wave * 1.6, life: ac.range / ac.speed, pierce: 0, knock: 3,
          color: [1.7, 1.2, 0.5], size: 0.09, len: 2.2, owner: 'p', flags: null,
        });
        this.fx.muzzle(v3b.x, v3b.y, v3b.z, ax, ay, az, 0.7, [1.7, 1.2, 0.5]);
        Sfx.shoot('smg');
      }
    }

    // animasi pengaktifan kebolehan: kereta melantun + mengembang sedikit
    if (p.abAnim > 0) {
      p.abAnim = Math.max(0, p.abAnim - dt);
      const t = 1 - p.abAnim / 0.6;
      const sq = Math.sin(t * PI);
      c.root.scale.set(1 - sq * 0.07, 1 + sq * 0.16, 1 - sq * 0.07);
      c.root.position.y = p.y + (p._bob || 0) + sq * 0.42;
    } else if (c.root.scale.y !== 1) {
      c.root.scale.set(1, 1, 1);
    }

    // penunjuk arah: di hadapan kereta, di atas tanah
    if (this.dirArrow) {
      const ax = p.x + fx * 4.4, az = p.z + fz * 4.4;
      this.dirArrow.position.set(ax, 0.09, az);
      this.dirArrow.rotation.y = p.ang;
      this.dirArrow.visible = !p.dead;
      // lebih terang bila undur supaya senang cari hala hadapan
      this.dirMat.opacity = fwd < -0.5 ? 0.95 : 0.55 + Math.min(0.3, Math.abs(fwd) * 0.01);
      this.dirMat.color.setHex(fwd < -0.5 ? 0xffb23f : 0x7ce7ff);
    }

    // bunyi enjin
    const rpm = clamp(Math.abs(fwd) / maxSpd, 0, 1);
    Sfx.engineSet(rpm * (wantNitro ? 1.3 : 1), (thr > 0 ? 0.6 : 0.2) + rpm * 0.4);

    // lampu belakang
    c.mats.tail.emissiveIntensity = thr < 0 || hand ? 4.5 : 1.4;
    c.beamMat.opacity = this.world.T.beam !== undefined ? this.world.T.beam : 0.06;

    // habuk di udara untuk kedalaman
    this.dustT = (this.dustT || 0) + dt;
    if (this.dustT > 0.06) {
      this.dustT = 0;
      const dcol = this.world.T.dust || [0.7, 0.65, 0.55];
      const a = rand(TAU), r = rand(6, 30);
      this.fx.smk.emit(p.x + Math.cos(a) * r, rand(0.4, 7), p.z + Math.sin(a) * r,
        rand(-0.5, 0.5), rand(-0.1, 0.35), rand(-0.5, 0.5),
        { color: dcol, color2: dcol, size: rand(0.12, 0.3), size2: rand(0.12, 0.3), life: rand(2.5, 5), alpha: 0.3, drag: 0.2, grav: 0 });
    }
  },

  collideProps(p, dt) {
    for (const o of this.world.props) {
      if (!o.alive || o.noCar) continue;
      const dx = p.x - o.x, dz = p.z - o.z;
      const d = Math.hypot(dx, dz), rr = o.r + p.r * 0.8;
      if (d > rr) continue;
      const speed = Math.hypot(p.vx, p.vz);
      if (o.explosive) {
        this.world.removeProp(o);
        this.explodeAt(o.x, 1, o.z, 9, 70);
        continue;
      }
      if (o.type === 'crate' && speed > 12) {
        this.world.removeProp(o);
        this.fx.spark(o.x, 1, o.z, 14, [1.2, 0.8, 0.4], { speed: 7, size: 0.4 });
        this.fx.smoke(o.x, 1, o.z, 4, { size: 1, life: 0.8, alpha: 0.4 });
        Sfx.hit(); this.shake(0.3, 0.1);
        p.vx *= 0.9; p.vz *= 0.9;
        continue;
      }
      const n = d || 0.01;
      p.x = o.x + dx / n * rr; p.z = o.z + dz / n * rr;
      const dot = (p.vx * dx + p.vz * dz) / n;
      if (dot < 0) {
        p.vx -= dx / n * dot * 1.5; p.vz -= dz / n * dot * 1.5;
        if (speed > 14) {
          this.hurtPlayer(speed * 0.35, o.x, o.z);
          this.fx.spark(p.x, 1, p.z, 10, [1.5, 1.1, 0.5], { speed: 6 });
          this.shake(0.7, 0.18); Sfx.hit();
        }
      }
    }
  },

  /* ---------------- senjata ---------------- */
  updateWeapons(dt) {
    const p = this.player;

    /* Sasaran: sinar tetikus ke lantai.
       Berhampiran ufuk sinar hampir selari dengan tanah, jadi titik potong
       melonjak ke infiniti — itu punca "sensitif gila". Kita hadkan sudut
       sinar dan jarak maksimum supaya reticle sentiasa terkawal. */
    this.raycaster.setFromCamera({ x: Input.ndcX, y: Input.ndcY }, this.camera);
    const ray = this.raycaster.ray;
    const MAXR = 62;
    let tx, tz;
    if (ray.direction.y < -0.06 && ray.intersectPlane(GROUND_PLANE, v3)) {
      tx = v3.x; tz = v3.z;
    } else {
      // sinar menuju ufuk/langit — guna arah mendatarnya sahaja
      const hl = Math.hypot(ray.direction.x, ray.direction.z) || 1;
      tx = p.x + ray.direction.x / hl * MAXR;
      tz = p.z + ray.direction.z / hl * MAXR;
    }
    let adx = tx - p.x, adz = tz - p.z;
    /* Telefon: bidikan mengikut arah kereta menghadap. Mengekori jari pada
       skrin kecil terlalu sukar, jadi hala tuju memandu IALAH hala tuju
       tembakan. Seret di separuh kanan skrin masih mengatasinya untuk
       bidikan bebas seketika. */
    if (Touch.on && Touch.aim === null) {
      const t = this.autoTgt;
      if (t && !t.dead) { adx = t.x - p.x; adz = t.z - p.z; }   // kunci automatik
      else { adx = Math.sin(p.ang) * 34; adz = Math.cos(p.ang) * 34; }
    }
    const ad = Math.hypot(adx, adz);
    if (ad > MAXR) { adx = adx / ad * MAXR; adz = adz / ad * MAXR; }
    const rawX = clamp(p.x + adx, -HALF, HALF);
    const rawZ = clamp(p.z + adz, -HALF, HALF);
    this.aim.x = damp(this.aim.x, rawX, 30, dt);
    this.aim.z = damp(this.aim.z, rawZ, 30, dt);
    this.aim.y = 0.9;

    /* Bantuan membidik dalam RUANG SKRIN: kunci musuh yang paling hampir
       dengan kursor di skrin. Reticle atas tanah tidak boleh menyasarkan
       musuh terbang, jadi pemilihan ikut skrin adalah satu-satunya cara
       yang munasabah untuk dron dan kapal induk. */
    let maxRange = MAXR;
    for (const sl of this.slots) if (sl) maxRange = Math.max(maxRange, Math.min(sl.st.range, MAXR + 40));
    /* Telefon: kunci automatik penuh - sistem memilih sasaran yang sah
       (dalam jarak DAN garis pandang) dan senjata membidiknya sendiri.
       Butang TGT menukar sasaran. Pada desktop, bantuan bidik ikut kursor
       seperti biasa. */
    const lock = this.state !== 'play' ? null
      : (Touch.on && Touch.aim === null) ? this.autoLock(maxRange)
        : this.pickTarget(maxRange);
    this.lock = lock;
    if (this.reticleRing) this.reticleRing.material.color.setHex(lock ? 0xff6a4a : 0x6ff0ff);
    if (this.lockMark) {
      this.lockMark.visible = !!lock;
      if (lock) {
        this.lockMark.position.set(lock.x, lock.y + 0.12, lock.z);
        const s = Math.max(1, lock.r * 1.25) * (1 + Math.sin(this.time * 9) * 0.06);
        this.lockMark.scale.setScalar(s);
      }
    }
    // reticle "melekat": ditarik ke musuh yang dikunci supaya pemain nampak sasarannya
    const stick = lock ? 1 - Math.exp(-dt * 22) : 1 - Math.exp(-dt * 30);
    this.retX = this.retX === undefined ? this.aim.x : this.retX + ((lock ? lock.x : this.aim.x) - this.retX) * stick;
    this.retZ = this.retZ === undefined ? this.aim.z : this.retZ + ((lock ? lock.z : this.aim.z) - this.retZ) * stick;
    this.reticle.position.set(this.retX, 0.1, this.retZ);
    const pulse = 1 + Math.sin(this.time * 6) * 0.04;
    this.reticle.scale.setScalar(pulse);

    // arah sasaran (dikongsi oleh semua dudukan senjata)
    const tgx = lock ? lock.x : this.aim.x, tgz = lock ? lock.z : this.aim.z;
    const want = Math.atan2(tgx - p.x, tgz - p.z) - p.ang;
    const wrapped = Math.atan2(Math.sin(want), Math.cos(want));
    p.turretAng = wrapped;
    const fx2 = lock ? lock.x : this.aim.x;
    const fy2 = lock ? lock.y + lock.h * 0.5 : 0.95;
    const fz2 = lock ? lock.z : this.aim.z;

    if (this.state !== 'play') return;

    // isi semula SEMUA senjata
    if (Input.hit('KeyR')) for (const sl of this.slots) if (sl) startReload(sl);

    // Hamvog terlipat: semua senjata luar talian
    const wantFire = Input.down && !UI.overMenu && this.state === 'play' && !(this.player && this.player.weaponsOff);
    if (wantFire && p.spawnShield > 0) p.spawnShield = 0;   // tembak = perisai gugur
    const nActive = this.slots.reduce((n, sl) => n + (sl ? 1 : 0), 0);
    this.activeSlots = Math.max(1, nActive);
    /* Kereta Fly bermula dengan dua dudukan sahaja; yang lain dihidupkan
       apabila kerosakan terkumpul LARIAN ini mencapai ambangnya. */
    const unlock = this.carDef && this.carDef.slotUnlock;
    if (unlock) {
      const dmgRun = this.runDamage || 0;
      let live = 0;
      for (let i = 0; i < unlock.length; i++) if (dmgRun >= unlock[i]) live++;
      if (live !== this.liveSlots) {
        if (this.liveSlots !== undefined && live > this.liveSlots) {
          UI.banner('+2 WEAPON MOUNTS ONLINE', '#9be8ff');
          Sfx.buy();
          this.fx.abilityRing(p.x, p.z, [0.6, 1.5, 2.0], 2, 14, 0.5);
        }
        this.liveSlots = live;
      }
    } else this.liveSlots = null;

    /* Setiap slot ialah senjata berasingan dengan magazin, suhu dan masa
       isi semula sendiri — tetapi SEMUANYA menembak serentak pada satu
       klik. Senjata yang sama boleh berada dalam beberapa slot. */
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const wm = this.wModels[i];
      const mount = this.car.turrets[i];
      if (!slot || !wm || !mount) continue;
      if (this.liveSlots !== null && this.liveSlots !== undefined && i >= this.liveSlots) {
        if (wm.root.visible) wm.root.visible = false;
        continue;                                   // dudukan masih tidak berkuasa
      }
      if (!wm.root.visible) wm.root.visible = true;

      // setiap dudukan berpusing sendiri ke arah sasaran
      mount.rotation.y = turnTo(mount.rotation.y, wrapped, dt * 9);

      slotUpdate(slot, dt, wantFire);

      const base = weaponStats(slot.id, slot.lv, slot.perks);
      const f = slot.flags || {};
      const dmgMul = (p.pow.dmg > 0 ? 2 : 1) * (p.abDmg || 1) * (this.slotMul || 1) * (p.stats.dmgBonus || 1);
      // senjata tandatangan: +15% (pasangan baharu) / +5% (kereta lama); trofi Raptor +8% setiap satu
      const sig = (slot.w.sigCar && this.carDef && slot.w.sigCar === this.carDef.id) ? 1 + (slot.w.sigBonus || 0.15) : 1;
      const dmgMul2 = dmgMul * sig * (1 + 0.08 * (p.trophy || 0));
      let rofMul = (p.pow.rapid > 0 ? 1.7 : 1) * (p.abRof || 1) * (p.zoneRof || 1);
      if (f.berserk && p.hp / p.maxHp < 0.4) rofMul *= 1 + f.berserk;
      if (dmgMul2 !== 1 || rofMul !== 1) {
        slot.st = Object.assign({}, base);
        slot.st.dmg = base.dmg * dmgMul2;
        slot.st.rof = base.rof * rofMul;
      } else slot.st = base;

      wm.root.updateWorldMatrix(true, false);
      wm.muzzle.getWorldPosition(v3b);
      let ax = fx2, az = fz2;
      // bantuan membidik: ramal kedudukan musuh bergerak untuk peluru yang perlahan
      if (lock && slot.st.speed > 0 && this.assistPx() > 0) {
        const t = Math.min(1.2, Math.hypot(ax - v3b.x, az - v3b.z) / slot.st.speed);
        ax += (lock.vx || 0) * t; az += (lock.vz || 0) * t;
      }
      let mx = ax - v3b.x, my = fy2 - v3b.y, mz = az - v3b.z;
      const ml = Math.hypot(mx, my, mz) || 1;
      mx /= ml; my /= ml; mz /= ml;

      if (wm.spinner) wm.spinner.rotation.z += slot.spin * dt * 26;
      // Diamond: kristal bahan api mengecut ikut peluru, tumbuh semula masa reload
      if (wm.fuel) {
        const full = slot.reload > 0 && slot.st.reload > 0 ? 1 - slot.reload / slot.st.reload : (slot.mag / Math.max(1, slot.st.mag));
        const k = 0.35 + 0.65 * clamp(full, 0, 1);
        wm.fuel.scale.setScalar(k);
        wm.fuel.rotation.y += dt * (1.2 + (wm.kick || 0) * 8);
        wm.fuel.userData.mat.emissiveIntensity = 0.6 + (wm.kick || 0) * 2.2 + (slot.reload > 0 ? Math.sin(this.time * 14) * 0.3 : 0);
      }
      if (wm.fan) wm.fan.rotation.z += dt * (5 + (wm.kick || 0) * 60);

      /* Animasi setiap senjata ditentukan oleh keluarganya (magazin, tiub,
         patah buka, tenaga, omboh...) — lihat js/wanim.js. */
      /* `slot.fireT` ditetapkan di DALAM fireWeapon, yang berjalan selepas blok
         ini — jadi membandingkannya dengan this.time tidak pernah padan.
         Bandingkan dengan nilai yang terakhir dilihat sebaliknya. */
      if (slot.fireT !== wm.seenFire) { wm.seenFire = slot.fireT; wm.kick = 1; }
      wm.kick = Math.max(0, (wm.kick || 0) - dt * (slot.st.rof > 6 ? 13 : 7));
      animWeapon(wm, slot, wm.kick || 0);

      if (slot.reload > 0 && slot.st.reload > 0) {
        const rt = clamp(1 - slot.reload / slot.st.reload, 0, 1);
        const at = EJECT_AT[wm.fam] || 0.3;
        if (!slot.ejected && rt > at) {
          slot.ejected = true;
          const spent = wm.fam === 'energy' || wm.fam === 'coil';
          for (let k = 0; k < (spent ? 4 : 6); k++) {
            this.fx.add.emit(v3b.x, v3b.y - 0.2, v3b.z, rand(-2, 2), rand(-1, 1.5), rand(-2, 2),
              spent
                ? { color: [0.5, 1.4, 1.8], color2: [0.1, 0.3, 0.5], size: 0.22, size2: 0.02, life: rand(0.25, 0.5), drag: 2.2 }
                : { color: [1.4, 1.1, 0.5], color2: [0.5, 0.3, 0.1], size: rand(0.1, 0.2), size2: 0.02, life: rand(0.3, 0.6), drag: 1.5, grav: -12, ground: true });
          }
          Sfx.tone(spent ? 620 : 160, 0.08, spent ? 'sine' : 'square', 0.08, spent ? 280 : 110);
        }
      } else slot.ejected = false;

      this.curFlags = f;
      this.perkCtx = {
        nitro: !!(Input.keys.ShiftLeft || Input.keys.ShiftRight) && p.nitro > 1,
        lastRound: slot.mag <= Math.max(1, slot.st.mag * 0.2),
      };
      fireWeapon(this, slot, wantFire, dt, v3b.x, v3b.y, v3b.z, mx, my, mz);
    }
    this.updateLockMark(dt);
  },

  /* OUROBOROS: setiap segmen diletak pada jarak lengkok tetap di sepanjang
     JEJAK kepala (bukan lurus di belakang), ditambah liuk sisi ikut laju.
     Semasa Constrict, lima segmen badan berpusing membelit sasaran. */
  animSerpent(c, p, fwd, dt) {
    const tr = p.trail || (p.trail = []);
    if (!tr.length || Math.hypot(p.x - tr[0].x, p.z - tr[0].z) > 0.3) {
      tr.unshift({ x: p.x, z: p.z });
      if (tr.length > 90) tr.pop();
    }
    const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    const wig = clamp(Math.abs(fwd) / 22, 0, 1) * 0.45;
    const cs = p.constrict;
    if (cs) cs.vis = damp(cs.vis || 0, cs.t && !cs.t.dead ? 1 : 0, 6, dt);
    let prevL = { x: 0, z: 0.4 };
    for (const sg of c.segments) {
      const want = (sg.i + 1) * 1.55 + 0.4;
      // jalan di sepanjang jejak sehingga jarak lengkok yang dikehendaki
      let ax = p.x, az = p.z, acc = 0, wx = null, wz = null;
      for (let k = 0; k < tr.length; k++) {
        const bx = tr[k].x, bz = tr[k].z, d = Math.hypot(bx - ax, bz - az);
        if (acc + d >= want && d > 1e-4) { const f = (want - acc) / d; wx = ax + (bx - ax) * f; wz = az + (bz - az) * f; break; }
        acc += d; ax = bx; az = bz;
      }
      if (wx === null) { const rem = want - acc; wx = ax - Math.sin(p.ang) * rem; wz = az - Math.cos(p.ang) * rem; }
      // liuk sisi
      const w = Math.sin(this.time * 7 - sg.i * 0.9) * wig;
      wx += Math.cos(p.ang) * w; wz -= Math.sin(p.ang) * w;
      let y = 0.95;
      if (cs && cs.t && sg.i < 5 && cs.vis > 0.01) {
        const t = cs.t, R = (t.r || 1.5) + 1.1, a = this.time * 3.2 + sg.i / 5 * TAU;
        const rx = t.x + Math.cos(a) * R, rz = t.z + Math.sin(a) * R;
        wx += (rx - wx) * cs.vis; wz += (rz - wz) * cs.vis;
        y += (0.2 + sg.i * 0.35) * cs.vis;
      }
      const dx = wx - p.x, dz = wz - p.z;
      const lx = dx * ca - dz * sa, lz = dx * sa + dz * ca;
      sg.g.position.set(lx, y, lz);
      sg.g.rotation.y = Math.atan2(prevL.x - lx, prevL.z - lz);
      prevL = { x: lx, z: lz };
    }
  },

  /* MEDUSA: setiap sendi sesungut beralun sendiri; bila bergerak ke hadapan,
     sesungut terseret ke belakang (putaran X positif = hujung ke -Z). */
  animTentacles(T, fwd, time) {
    const back = clamp(fwd / 30, -1, 1) * 0.24;
    for (const t of T) {
      for (let j = 0; j < t.joints.length; j++) {
        const jt = t.joints[j];
        jt.rotation.x = 0.08 + back + Math.sin(time * 2.4 + t.ph + j * 0.7) * 0.17;
        jt.rotation.z = Math.cos(time * 1.9 + t.ph + j * 0.55) * 0.13;
      }
    }
  },

  /* MEDUSA Abyssal Grasp: sesungut tenaga dari tepi loceng ke setiap mangsa,
     dilukis sebagai rantai sfera bercahaya pada lengkung yang menggeliat. */
  updateGrabFx() {
    const p = this.player, G2 = p && p.grabs;
    if (!this.grabBeads) {
      this.grabBeads = [];
      const geo = new THREE.SphereGeometry(0.22, 8, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff5ad8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; this.scene.add(m); this.grabBeads.push(m); }
    }
    let n = 0;
    if (G2) for (let gi = 0; gi < G2.length; gi++) {
      const t = G2[gi].t;
      if (!t || t.dead) continue;
      const a = Math.atan2(t.x - p.x, t.z - p.z);
      const sx = p.x + Math.sin(a) * 1.6, sy = 1.8, sz = p.z + Math.cos(a) * 1.6;
      const ex = t.x, ey = (t.y || 0) + (t.h || 2) * 0.5, ez = t.z;
      const mx = (sx + ex) / 2, mz = (sz + ez) / 2, my = Math.max(sy, ey) + 2.2;
      for (let k = 0; k < 12 && n < this.grabBeads.length; k++) {
        const u = (k + 1) / 12, iu = 1 - u;
        const wob = Math.sin(this.time * 11 + k * 0.9 + gi) * 0.35 * Math.sin(u * PI);
        const b = this.grabBeads[n++];
        b.visible = true;
        b.position.set(iu * iu * sx + 2 * iu * u * mx + u * u * ex + wob,
          iu * iu * sy + 2 * iu * u * my + u * u * ey,
          iu * iu * sz + 2 * iu * u * mz + u * u * ez - wob);
        b.scale.setScalar(1.3 - u * 0.6);
      }
    }
    for (let i = n; i < this.grabBeads.length; i++) this.grabBeads[i].visible = false;
  },

  /* Hyna: kubah penyerap. Musuh (gelombang & bot merah) ditolak keluar dari
     kubah setiap bingkai; rakan bebas. Peluru musuh diserap dalam updateBullets. */
  updateDome() {
    const d = this.dome;
    if (!d) return;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - d.x, dz = e.z - d.z, dist = Math.hypot(dx, dz) || 0.01;
      const min = d.r + (e.r || 1);
      if (dist < min && !(e.d && e.d.fly && e.y > d.r)) {
        e.x = d.x + dx / dist * min; e.z = d.z + dz / dist * min;
        if (Math.random() < 0.2) this.fx.spark(d.x + dx / dist * d.r, 1.2, d.z + dz / dist * d.r, 3, [1.6, 0.6, 2.6], { speed: 4, size: 0.3, life: 0.25 });
      }
    }
  },
  /* titik serapan: peluru musuh yang melintasi permukaan kubah dari luar */
  domeAbsorb(dmg, x, y, z) {
    const d = this.dome;
    d.absorbed += dmg;
    this.fx.spark(x, y, z, 6, [1.7, 0.7, 2.8], { speed: 5, size: 0.32, life: 0.3 });
    this.domeFlash = Math.min(0.35, (this.domeFlash || 0) + 0.12);
  },
  fireDomeCannon(p, absorbed) {
    // REBALANCE: dahulu 5000 + 3x serapan = bunuh pasti 2 musuh setiap 24s. Kini ikut HP sasaran
    const dmgOf = t => Math.round(Math.min((t.maxHp || 300) * 1.1, (t.maxHp || 300) * 0.5 + absorbed * 2));
    const tg = this.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 130)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 2);
    Sfx.tone(70, 0.9, 'sawtooth', 0.3, 30); Sfx.noise(0.6, 0.7, 500, 0.6);
    this.shake(1.4, 0.4);
    if (!tg.length) { UI.toast('DOME CANNON · NO TARGET IN RANGE'); return; }
    for (const t of tg) {
      const ty = (t.y || 0) + (t.h || 2) * 0.5;
      // tembus semua halangan: terus damageEnemy, tiada semakan dinding
      this.fx.beam(p.x, 2.6, p.z, t.x, ty, t.z, [2.4, 0.9, 3.2], 0.7, 0.45);
      this.fx.beam(p.x, 2.6, p.z, t.x, ty, t.z, [2.2, 2.0, 2.6], 0.2, 0.5);
      this.fx.flash(t.x, ty, t.z, [2, 0.8, 3], 30, 0.3, 40);
      this.fx.spark(t.x, ty, t.z, 26, [1.8, 0.8, 2.8], { speed: 12, size: 0.45, life: 0.5 });
      t.lastHitBy = 'player';
      this.damageEnemy(t, dmgOf(t), t.x - p.x, 0, t.z - p.z, 30, 'rail');
    }
    UI.toast(`DOME CANNON · ${fmt(dmgOf(tg[0]) * this.abScale * U)} DAMAGE x${tg.length}`);
  },

  /* Penanda LOCK ON (Vulag): gelang jingga mengecil semasa mengunci,
     bertukar merah dan berpusing apabila sasaran sudah dikunci. */
  updateLockMark(dt) {
    const slot = (this.slots || []).find(s => s && s.w.lockOn);
    const locked = slot && slot.lockTgt && !slot.lockTgt.dead && slot.lockHold > 0;
    const t = slot && (locked ? slot.lockTgt : slot.lockCand);
    if (!t || t.dead || this.state !== 'play') { if (this.vulagMark) this.vulagMark.visible = false; return; }
    if (!this.vulagMark) {
      const m = new THREE.Mesh(new THREE.RingGeometry(1, 1.22, 4, 1),
        new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
          depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 9;
      this.scene.add(m);
      this.vulagMark = m;
    }
    const m = this.vulagMark;
    m.visible = true;
    m.position.set(t.x, (t.y || 0) + 0.15, t.z);
    const prog = locked ? 1 : clamp((slot.lockProg || 0) / slot.st.lockT, 0, 1);
    const sc = (t.r || 2) * (locked ? 1.5 : 3.2 - prog * 1.7);
    m.scale.setScalar(sc);
    m.rotation.z += dt * (locked ? 3 : 1);
    m.material.color.setHex(locked ? 0xff3030 : 0xffa040);
    m.material.opacity = locked ? 0.95 : 0.45 + prog * 0.45;
  },

  /* ---------------- peluru ---------------- */
  spawnBullet(o) {
    if (this._abCtx > 0) o.abil = true;   // peluru dicipta oleh ability
    if (o.owner === 'p' && o.flags === undefined) o.flags = this.curFlags || null;
    o.life = o.life || 2;
    o.pierce = o.pierce || 0;
    o.hits = null;
    o.t = 0;
    this.bullets.push(o);
  },

  updateBullets(dt) {
    const p = this.player;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      this._curB = b;
      b.t += dt;
      b.life -= dt;
      const px = b.x, pz = b.z, py = b.y;
      if (b.grav) b.vy -= b.grav * dt;          // peluru melambung (Mortar)
      // Siege Mortar: halaju mendatar dibetulkan supaya titik jatuh ikut musuh terkunci
      if (b.lobTgt && b.grav) {
        const t = b.lobTgt;
        if (t.dead) b.lobTgt = null;
        else {
          const hgt = Math.max(0, b.y - 0.3);
          const tr = Math.max(0.12, (b.vy + Math.sqrt(b.vy * b.vy + 2 * b.grav * hgt)) / b.grav);
          const tx = t.x + (t.vx || 0) * tr * 0.8, tz = t.z + (t.vz || 0) * tr * 0.8;
          const k = Math.min(1, dt * 3.2);
          b.vx += ((tx - b.x) / tr - b.vx) * k;
          b.vz += ((tz - b.z) / tr - b.vz) * k;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.rocket) {
        this.fx.smoke(b.x, b.y, b.z, 1, { speed: 0.4, size: 0.5, life: 0.7, alpha: 0.5, rise: 0.3 });
        this.fx.add.emit(b.x, b.y, b.z, 0, 0, 0, { color: [1.8, 1.0, 0.3], color2: [0.8, 0.2, 0.05], size: 0.6, size2: 0.1, life: 0.12, drag: 2 });
      }
      // Flak Cannon: fius jarak - meletup sendiri berhampiran musuh terbang
      if (b.flak > 0 && b.t > 0.05) {
        let near = null;
        this.neighbors(b.x, b.z, b.flak + 2, null, (e, dx2, dz2, d2) => {
          if (near) return;
          if (!e.d.fly) return;
          if (Math.abs(b.y - (e.y + e.h * 0.5)) > b.flak + 2) return;
          if (d2 < b.flak + e.r) near = e;
        });
        if (near) {
          this.explodeAt(b.x, b.y, b.z, (b.splash || 4) * 1.4, b.dmg * 1.25);
          b.life = 0;
        }
      }
      // Serpent Lash: anjakan sisi sinus - rantai orb meliuk seperti ular
      if (b.wave) {
        const w = b.wave, o = w.amp * Math.sin(b.t * w.f + w.ph), d = o - w.last;
        w.last = o; b.x += w.lx * d; b.z += w.lz * d;
        if (Math.random() < 0.4) this.fx.add.emit(b.x, b.y, b.z, 0, 0, 0,
          { color: [0.5, 2.0, 0.7], color2: [0.05, 0.3, 0.1], size: 0.3, size2: 0.05, life: 0.3, drag: 0 });
      }
      // Nettle Swarm: obor-obor terapung naik turun dan meninggalkan spora berkilau
      if (b.jelly) {
        b.vy += (Math.sin(b.t * 5 + b.x) * 1.6 - b.vy) * Math.min(1, dt * 3);
        if (b.y < 1.0) b.vy = Math.abs(b.vy) + 0.5;
        if (Math.random() < 0.5) this.fx.add.emit(b.x, b.y - 0.2, b.z, rand(-0.3, 0.3), -rand(0.6, 1.4), rand(-0.3, 0.3),
          { color: [2.0, 0.6, 1.9], color2: [0.4, 0.05, 0.4], size: 0.2, size2: 0.02, life: 0.5, drag: 1 });
      }
      if (b.k2) this.bulletTick2(b, dt);
      // Arbog: riak gelombang bunyi mengembang di belakang setiap pulsa
      if (b.sonic && Math.random() < 0.7) {
        this.fx.add.emit(b.x, b.y, b.z, 0, 0, 0,
          { color: [0.9, 2.2, 1.3], color2: [0.1, 0.5, 0.25], size: 0.35, size2: 1.9, life: 0.28, drag: 0, alpha: 0.55 });
      }
      // Juhag: jejak percikan elektrik biru
      if (b.bolt && Math.random() < 0.5) {
        this.fx.add.emit(b.x, b.y, b.z, rand(-1.5, 1.5), rand(-1.5, 1.5), rand(-1.5, 1.5),
          { color: [0.6, 1.6, 3.0], color2: [0.1, 0.3, 0.8], size: 0.16, size2: 0.02, life: 0.16, drag: 2 });
      }
      /* Vulag: naik tegak hingga `apex` (jauh atas setiap halangan), kemudian
         menjunam ke sasaran berkunci. Cari ganti terhampir jika sasaran mati. */
      if (b.sky) {
        if (!b.dive) {
          b.vy = Math.max(b.vy, 34);
          if (b.y >= b.apex) b.dive = true;
        } else {
          let t = b.tgt;
          if (!t || t.dead) t = b.tgt = this.nearestEnemy(b.x, b.z, 400);
          if (t) {
            const hx = t.x - b.x, hy = (t.y + t.h * 0.5) - b.y, hz = t.z - b.z;
            const hl = Math.hypot(hx, hy, hz) || 1;
            const sp = 78, k = clamp(7 * dt, 0, 1);
            b.vx = lerp(b.vx, hx / hl * sp, k); b.vy = lerp(b.vy, hy / hl * sp, k); b.vz = lerp(b.vz, hz / hl * sp, k);
          } else b.vy -= 30 * dt;               // tiada sasaran: jatuh bebas
        }
      }
      if (b.homing && b.t > 0.1) {
        // kekal pada sasaran yang dikunci semasa dilepaskan; cari ganti bila ia mati
        let tgt = b.tgt;
        if (!tgt || tgt.dead || Math.hypot(tgt.x - b.x, tgt.z - b.z) > 90) tgt = b.tgt = this.nearestEnemy(b.x, b.z, 55);
        if (tgt) {
          const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
          let hx = tgt.x - b.x, hz = tgt.z - b.z;
          const flat = Math.hypot(hx, hz) || 1;
          /* hanya naik untuk sasaran yang memang terbang. Bagi sasaran darat
             roket kekal rendah, jadi ia meluncur lurus bukan melambung ke langit. */
          const aimY = tgt.d.fly ? (tgt.y + tgt.h * 0.5) : Math.min(b.y, tgt.y + tgt.h * 0.45);
          let hy = clamp(aimY - b.y, -flat * 1.2, flat * 0.45);
          const hl = Math.hypot(hx, hy, hz) || 1;
          const k = clamp(b.homing * dt, 0, 1);
          b.vx = lerp(b.vx / sp, hx / hl, k) * sp;
          b.vy = lerp(b.vy / sp, hy / hl, k) * sp;
          b.vz = lerp(b.vz / sp, hz / hl, k) * sp;
          const nl = Math.hypot(b.vx, b.vy, b.vz) || 1;
          b.vx = b.vx / nl * sp; b.vy = b.vy / nl * sp; b.vz = b.vz / nl * sp;
        }
      }
      if (b.flame) {
        const c = b.color || [2.0, 1.1, 0.3];
        this.fx.add.emit(b.x, b.y, b.z, rand(-1, 1), rand(0.5, 2), rand(-1, 1),
          { color: [c[0] * 1.1, c[1] * 1.1, c[2] * 1.1], color2: [c[0] * 0.35, c[1] * 0.18, c[2] * 0.15], size: 0.7 + b.t * 3.2, size2: 1.4 + b.t * 3, life: 0.16, drag: 1.5, alpha: 0.85 });
        if (Math.random() < 0.12) this.fx.smoke(b.x, b.y, b.z, 1, { speed: 1, size: 1.2, life: 0.8, alpha: 0.18 });
      }

      let dead = b.life <= 0 || b.y < 0.06 || Math.abs(b.x) > HALF + 6 || Math.abs(b.z) > HALF + 6;

      // segmen pergerakan bingkai ini (elak peluru laju "melompat" melepasi sasaran)
      const sgX = b.x - px, sgY = b.y - py, sgZ = b.z - pz;
      const sgL2 = sgX * sgX + sgZ * sgZ;
      const segLen = Math.hypot(sgX, sgY, sgZ);
      const midX = (px + b.x) * 0.5, midZ = (pz + b.z) * 0.5;
      // titik paling hampir pada segmen (unjuran mendatar) kepada satu sasaran
      const nearT = (tx, tz) => {
        if (sgL2 <= 1e-6) return 0;
        return clamp(((tx - px) * sgX + (tz - pz) * sgZ) / sgL2, 0, 1);
      };

      // prop menghalang
      /* Hanya Lance / Phase Rounds (`b.thru`) menembusi dinding. Api & cecair
         juga terhalang - kepulannya lebih tinggi, jadi diberi jidar tambahan. */
      if (!dead && !b.thru && !(b.glaive && b.glaive.back)) {
        for (const o of this.world.props) {
          if (!o.alive) continue;
          if (b.y > (o.h || 2.6) + (b.flame ? 1.2 : 0)) continue;
          if (o.enemyOnly && b.owner === 'p') continue;
          const t = nearT(o.x, o.z);
          const qx = px + sgX * t, qz = pz + sgZ * t;
          if (Math.hypot(qx - o.x, qz - o.z) < o.r * 0.85) {
            if (b.glaive) { this.glaiveTurn(b); break; }   // bilah berpatah balik dari dinding
            if (o.explosive) { this.world.removeProp(o); this.explodeAt(o.x, 1, o.z, 9, 70); }
            else if (b.flame) { /* api padam pada dinding, tiada percikan */ }
            else {
              this.fx.spark(b.x, b.y, b.z, 4, [1.4, 1.1, 0.6], { speed: 4, size: 0.25, life: 0.25 });
              if (b.splash) { this.explodeAt(b.x, b.y, b.z, b.splash, b.owner === 'e' ? 0 : b.dmg, b.owner === 'e', false, b.real); b.boomed = 1; }
            }
            dead = true; break;
          }
        }
      }

      if (!dead) {
        if (b.owner === 'p') {
          const rr = b.flame ? 1.9 : 0.9;
          let hitAny = false;
          this.neighbors(midX, midZ, segLen * 0.5 + 4, null, (e) => {
            if (hitAny && !b.pierce) return;
            if (b.hits && b.hits.includes(e.id)) return;
            const t = nearT(e.x, e.z);
            const qx = px + sgX * t, qy = py + sgY * t, qz = pz + sgZ * t;
            if (Math.hypot(qx - e.x, qz - e.z) > e.r + rr) return;
            const dy = qy - (e.y + e.h * 0.5);
            // musuh terbang diberi toleransi menegak tambahan: reticle berada
            // di atas tanah, jadi peluru sepatutnya tetap mengenai bayangnya
            const vTol = e.h * 0.62 + rr + (e.d.fly ? e.d.fly + 1.6 : 0);
            if (Math.abs(dy) > vTol) return;
            const mul = (b.burnBonus && e.burnT > 0) ? 1.4 : 1;
            e.lastHitBy = b.shooter || 'player';   // kredit bunuhan papan pendahulu
            // peluru meletup: damage HANYA melalui letupan (sekali) - dahulu hentaman 100% + letupan x2 = ~3x
            this.damageEnemy(e, b.dmg * mul * (b.flame ? dt * 12 : 1) * (b.splash && !b.flame && !(b.pierce > 0) && !(b.flags && b.flags.bounce && !b.bounced) ? 0 : 1), b.vx, b.vy, b.vz, b.knock || 0, b.ally ? 'ally' : b.flame ? 'flame' : 'bullet', b.flags);
            if (b.burn) { e.burnT = Math.max(e.burnT, b.burn); e.burnDmg = Math.max(e.burnDmg || 0, b.dmg * 0.55); }
            if (b.slow) e.slowT = Math.max(e.slowT, b.slow);
            // Juhag: renjatan elektrik 3s (diproses dalam updateEnemy)
            if (b.shock) { e.shockT = Math.max(e.shockT || 0, b.shock); e.shockDps = Math.max(e.shockDps || 0, b.shockDps); }
            // Water Jet: basah kuyup, pergerakan jadi berat
            if (b.soak) {
              e.slowT = Math.max(e.slowT, b.soak);
              if (b.soakVuln) { e.netT = 0.4; e.netVuln = b.soakVuln; }
              if (Math.random() < 0.25) {
                this.fx.add.emit(e.x + rand(-0.6, 0.6), e.y + e.h * 0.5, e.z + rand(-0.6, 0.6),
                  rand(-1, 1), rand(1, 3), rand(-1, 1),
                  { color: [0.5, 1.4, 2.0], color2: [0.1, 0.3, 0.5], size: 0.3, size2: 0.04, life: 0.35, drag: 2 });
              }
            }
            // Wind Charge: terangkat daripada tanah, tidak boleh memandu
            if (b.lift) this.liftEnemy(e, b.lift, b.liftArea);
            // Amber: api melekat, tidak bertindan, diikuti tempoh kebal
            if (b.amber) amberIgnite(this, e, b.amber, b.flags);
            // Wily: cecair melekat - musuh terpaku, jirannya melekat padanya
            if (b.glue) this.glueEnemy(e, b.glue, b.glueR);
            if (b.k2) this.bulletHit2(b, e);
            if (!b.flame) {
              this.fx.spark(b.x, b.y, b.z, 3, [1.6, 1.0, 0.5], { speed: 4, size: 0.22, life: 0.2 });
              hitAny = true;
              if (b.pierce > 0) { b.pierce--; (b.hits || (b.hits = [])).push(e.id); }
              else if (b.flags && b.flags.bounce && !b.bounced) {
                const o = this.nearestEnemy(b.x, b.z, 18, [e]);
                if (o) {
                  b.bounced = 1;
                  (b.hits || (b.hits = [])).push(e.id);
                  const bx = o.x - b.x, by = (o.y + o.h * 0.5) - b.y, bz = o.z - b.z;
                  const bl = Math.hypot(bx, by, bz) || 1;
                  const sp = Math.hypot(b.vx, b.vy, b.vz) || 100;
                  b.vx = bx / bl * sp; b.vy = by / bl * sp; b.vz = bz / bl * sp;
                  b.life = Math.max(b.life, 0.6);
                } else dead = true;
              }
              else dead = true;
            }
          });
          if (dead && b.splash && !b.boomed) { this.explodeAt(b.x, b.y, b.z, b.splash, b.dmg); b.boomed = 1; }
        } else if (this.dome && Math.hypot(b.x - this.dome.x, b.z - this.dome.z) < this.dome.r && b.y < this.dome.r) {
          // Hyna: musuh tidak boleh berada dalam kubah, jadi setiap peluru di sini datang dari luar - serap
          this.domeAbsorb(b.dmg, b.x, b.y, b.z);
          b.splash = 0;
          dead = true;
        } else {
          const tp = nearT(p.x, p.z);
          const qx = px + sgX * tp, qy = py + sgY * tp, qz = pz + sgZ * tp;
          if (Math.hypot(qx - p.x, qz - p.z) < p.r + 0.6 && qy < 2.6 && qy > p.y - 0.4 && !p.dead) {
            b.x = qx; b.y = qy; b.z = qz;
            this.hurtPlayer(b.dmg, b.x, b.z, b.real);
            // letupan visual sahaja - dahulu +50% damage kali kedua & tolakan, dan turut mencederakan bot sepasukan
            if (b.splash) { this.explodeAt(b.x, b.y, b.z, Math.min(b.splash, 4), 0, false); b.boomed = 1; }
            else this.fx.spark(b.x, b.y, b.z, 6, b.color, { speed: 5, size: 0.3, life: 0.3 });
            dead = true;
          }
          if (!dead && this.team && this.team.bulletVsAllies(b, px, py, pz, sgX, sgY, sgZ, nearT)) dead = true;
        }
      }
      if (!dead && b.y < 0.2 && b.splash) { this.explodeAt(b.x, 0.3, b.z, b.splash, b.owner === 'e' ? b.dmg * 0.6 : b.dmg, b.owner === 'e', false, b.real); b.boomed = 1; dead = true; }

      // gergaji melantun pada sempadan arena dan prop
      if (dead && b.saw > 0 && b.life > 0) {
        let bounced = false;
        if (Math.abs(b.x) > HALF - 1) { b.vx = -b.vx; b.x = clamp(b.x, -HALF + 1.2, HALF - 1.2); bounced = true; }
        if (Math.abs(b.z) > HALF - 1) { b.vz = -b.vz; b.z = clamp(b.z, -HALF + 1.2, HALF - 1.2); bounced = true; }
        if (!bounced) { b.vx = -b.vx; b.vz = -b.vz; b.x += b.vx * dt * 2; b.z += b.vz * dt * 2; bounced = true; }
        if (bounced) {
          b.saw--;
          b.hits = null;
          dead = false;
          this.fx.spark(b.x, b.y, b.z, 5, [1.6, 1.5, 1.2], { speed: 5, size: 0.25, life: 0.25 });
          Sfx.hit();
        }
      }
      if (dead && b.k2) this.bulletDie2(b);
      if (dead) {
        if (b.root > 0) {
          this.spawnNet(b.x, b.z, b.root, b.rootT || 4, b.rootVuln || 1.35);
          Sfx.shoot('net');
        }
        if (b.well) { this.spawnHazard('well', b.x, b.z, b.well, b.dmg, 2.2); }
        if (b.hive) { this.spawnTurret(b.x, b.z, b.hive); }
        if (b.rocket && !b.boomed) this.explodeAt(b.x, b.y, b.z, b.splash || 6, b.owner === 'e' ? b.dmg * 0.6 : b.dmg, b.owner === 'e', false, b.real);   // PEPIJAT: dahulu meletup KALI KEDUA selepas kena
        this.bullets[i] = this.bullets[this.bullets.length - 1];
        this.bullets.pop();
      }
    }
    this.renderBullets();
  },

  /* ---------------- kerosakan ---------------- */
  damageEnemy(e, dmg, dx, dy, dz, knock, src, flags) {
    if (e.dead) return;
    let d = dmg;
    if (flags) {
      d *= rollCrit(flags) * perkDamage(flags, e, this.perkCtx);
      this.applyPerkHit(e, d, flags, src);
    }
    if (e.netT > 0 && e.netVuln) d *= e.netVuln;   // terperangkap dalam jaring = lebih rapuh
    d = this.dmgHook2(e, d, src);
    if (e.teamBot && this.abScale !== 1 && src !== 'pct' && (this._abCtx > 0 || src === 'ram' || (this._curB && this._curB.abil))) d *= this.abScale;   // ability & rempuhan: nombor tetap skala lama
    if (e.teamBot && e.dmgTake) d *= e.dmgTake;   // bot memakai Composite Plating yang sama dengan pemain
    const dmgFinal = d;
    this.runDamage = (this.runDamage || 0) + dmgFinal;
    e.hp -= dmgFinal;
    dmg = dmgFinal;
    e.flash = Math.min(1, e.flash + (src === 'burn' ? 0.1 : 0.55));
    if (knock && !e.d.boss) {
      const kr = 1 - (e.d.knockRes || 0);
      const l = Math.hypot(dx, dz) || 1;
      e.vx += dx / l * knock * kr * 0.6;
      e.vz += dz / l * knock * kr * 0.6;
    }
    if (src === 'bullet' || src === 'ram') {
      if (e.d.gib === 'blood') this.fx.blood(e.x, e.y + e.h * 0.55, e.z, 3);
    }
    if (e.hp <= 0) this.killEnemy(e, src);
  },

  /* kesan sampingan perk apabila peluru mengenai musuh */
  applyPerkHit(e, d, f, src) {
    if (src === 'burn' || src === 'perkchain') return;
    if (f.burn) { e.burnT = Math.max(e.burnT, f.burn); e.burnDmg = Math.max(e.burnDmg || 0, d * 0.5); }
    if (f.slow) e.slowT = Math.max(e.slowT, f.slow);
    if (f.mark) { e.markT = 3; e.markAmt = f.mark; }
    if (f.vamp) {
      const p = this.player;
      if (!p.dead) this.healPlayer(d * f.vamp);
    }
    if (f.scrap) e.bonusScrap = Math.max(e.bonusScrap || 0, f.scrap);
    if (f.coin) e.bonusCoin = Math.max(e.bonusCoin || 0, f.coin);
    if (f.frag) {
      this.splash(e.x, e.y + 0.6, e.z, 2.6 * (f.fragR || 1), d * f.frag, [1.5, 0.9, 0.35]);
    }
    if (f.chain && Math.random() < f.chain) {
      const o = this.nearestEnemy(e.x, e.z, 12, [e]);
      if (o) {
        this.fx.lightning(e.x, e.y + e.h * 0.5, e.z, o.x, o.y + o.h * 0.5, o.z, [0.5, 1.6, 2.0], 5);
        this.damageEnemy(o, d * 0.6, o.x - e.x, 0, o.z - e.z, 2, 'perkchain', null);
      }
    }
  },

  killEnemy(e, src) {
    e.dead = true;
    const i = this.enemies.indexOf(e);
    if (i >= 0) { this.enemies[i] = this.enemies[this.enemies.length - 1]; this.enemies.pop(); }
    if (this.training) { this.training.onKill(e); return; }   // latihan: tiada bunuhan/syiling/misi direkod
    disposeEnemy(this, e);
    this.kills++;
    this.score += e.d.score;
    Save.d.totalKills = (Save.d.totalKills || 0) + 1;
    if (e.teamBot && this.team) {
      this.explodeAt(e.x, 1.2, e.z, 6, 0, false, true);
      this.fx.spark(e.x, 1.2, e.z, 20, [1.6, 1.2, 0.6], { speed: 10, size: 0.4 });
      if (src !== 'ally') { Missions.track('kill', 1, this.mode); this.missionToast(); }
      this.team.onEnemyKilled(e, src);
      return;
    }
    Missions.track('kill', 1, this.mode);
    if (e.d.boss) Missions.track('boss', 1, this.mode);
    this.missionToast();

    const gx = e.x, gy = e.y + e.h * 0.4, gz = e.z;
    if (e.d.gib === 'metal') {
      this.explodeAt(gx, gy, gz, e.d.boss ? 14 : 5.5, 0, false, true);
      this.fx.spark(gx, gy, gz, 20, [1.6, 1.2, 0.6], { speed: 10, size: 0.4 });
    } else if (e.d.gib === 'goo') {
      this.fx.blood(gx, gy, gz, e.d.boss ? 60 : 18, [0.5, 0.15, 0.8]);
      this.fx.spark(gx, gy, gz, 12, [0.7, 1.8, 1.5], { speed: 7, size: 0.35 });
      this.fx.decal('blood', gx, gz, e.r * 3);
    } else {
      this.fx.blood(gx, gy, gz, e.d.boss ? 70 : 16);
      this.fx.decal('blood', gx, gz, e.r * 3.2);
    }
    if (e.d.boss) {
      this.bossAlive = false;
      UI.bossBar(null);
      for (let i2 = 0; i2 < 6; i2++) {
        setTimeout(() => {
          if (!this.fx) return;
          this.fx.explode(gx + rand(-5, 5), rand(1, 5), gz + rand(-5, 5), rand(5, 10), [1.5, 0.7, 0.3]);
          Sfx.boom(1.3);
        }, i2 * 160);
      }
      this.shake(2.5, 1.2);
      this.slowMo = 0.35;
    } else {
      Sfx.flesh();
    }

    // jatuhan: syiling + skrap
    const n = Econ.dropCount(e.d);
    const coinBonus = 1 + (e.bonusCoin || 0);
    const scrapBonus = 1 + (e.bonusScrap || 0);
    for (let k = 0; k < n; k++) {
      this.dropPickup('coin', gx + rand(-1.5, 1.5), gz + rand(-1.5, 1.5),
        Math.max(1, Math.round(Econ.coinDrop(e.d) * coinBonus / n)));
    }
    if (Econ.dropsScrap(e.d)) {
      const ns = e.d.boss ? 6 : 1;
      for (let k = 0; k < ns; k++) {
        this.dropPickup('scrap', gx + rand(-1.8, 1.8), gz + rand(-1.8, 1.8),
          Math.max(5, Math.round(Econ.scrapDrop(e.d) * scrapBonus)));
      }
    }
    if (chance(e.d.boss ? 1 : 0.07)) this.dropPickup('hp', gx, gz);
    if (chance(e.d.boss ? 1 : 0.06)) this.dropPickup('ammo', gx, gz);
    if (chance(e.d.boss ? 1 : 0.022)) this.dropPickup('power', gx, gz);
    void src;
  },

  explodeAt(x, y, z, radius, dmg, hurtsPlayer = false, metal = false, real = false) {
    this.fx.explode(x, y, z, radius, metal ? [1.4, 1.0, 0.6] : [1.6, 0.8, 0.28]);
    Sfx.boom(clamp(radius / 7, 0.6, 2));
    this.shake(clamp(radius * 0.12, 0.2, 1.6), 0.2);
    if (dmg > 0) {
      this.neighbors(x, z, radius + 3, null, (e, dx, dz, d) => {
        if (d > radius + e.r) return;
        const f = 1 - clamp((d - e.r) / radius, 0, 1);
        this.damageEnemy(e, dmg * f, -dx, 0, -dz, 12 * f, 'boom');
      });
    }
    const p = this.player;
    const pd = Math.hypot(p.x - x, p.z - z);
    // (Nabil: "asyik kena hitback") letupan sendiri TIDAK lagi menolak pemain; letupan musuh tolak sedikit sahaja
    if (pd < radius + p.r && hurtsPlayer) {
      const f = 1 - clamp(pd / (radius + p.r), 0, 1);
      this.hurtPlayer(dmg * f, x, z, real);
      p.vx += (p.x - x) / (pd || 1) * f * 8;
      p.vz += (p.z - z) / (pd || 1) * f * 8;
    }
  },

  splash(x, y, z, radius, dmg, color) {
    this.fx.explode(x, y, z, radius, color || [1.4, 0.8, 0.3], { dur: 0.32 });
    this.neighbors(x, z, radius + 2, null, (e, dx, dz, d) => {
      if (d > radius + e.r) return;
      this.damageEnemy(e, dmg, -dx, 0, -dz, 6, 'boom');
    });
  },

  shockwave(x, z, radius, dmg) {
    this.fx.explode(x, 0.4, z, radius * 0.5, [1.2, 1.4, 0.6], { dur: 0.9 });
    const p = this.player;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < radius) {
      const f = 1 - d / radius;
      this.hurtPlayer(dmg * f, x, z);
      p.vx += (p.x - x) / (d || 1) * f * 46;
      p.vz += (p.z - z) / (d || 1) * f * 46;
      this.shake(1.6 * f, 0.4);
    }
  },

  artillery(x, z, delay, dmg, radius) {
    const geo = new THREE.RingGeometry(radius * 0.82, radius, 34);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xff3a2a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.rotation.x = -PI / 2;
    m.position.set(clamp(x, -HALF, HALF), 0.1, clamp(z, -HALF, HALF));
    this.scene.add(m);
    this.arts.push({ x: m.position.x, z: m.position.z, t: delay, dmg, r: radius, mesh: m });
  },

  updateArtillery(dt) {
    for (let i = this.arts.length - 1; i >= 0; i--) {
      const a = this.arts[i];
      a.t -= dt;
      a.mesh.material.opacity = 0.45 + Math.abs(Math.sin(a.t * 12)) * 0.55;
      a.mesh.scale.setScalar(1 + Math.sin(a.t * 12) * 0.03);
      if (a.t <= 0) {
        this.scene.remove(a.mesh);
        a.mesh.geometry.dispose(); a.mesh.material.dispose();
        this.arts.splice(i, 1);
        this.explodeAt(a.x, 0.6, a.z, a.r, a.dmg, true);
      }
    }
  },

  hurtPlayer(dmg, sx, sz, real) {
    if (!real) dmg *= (this.hpK || 1);   // musuh gelombang / rempuhan: skala lama -> skala HP baharu
    const p = this.player;
    if (this.training && this.training.T.god) return;
    if (p.dead || this.state !== 'play') return;
    if (p.pow.shield > 0) {
      this.fx.spark(p.x, 1.4, p.z, 5, [0.4, 1.4, 2.0], { speed: 5, size: 0.3, life: 0.25 });
      return;
    }
    if (p.invuln) return;
    if (p.abAbsorb) {                       // medan penyerap: 70% disekat, 40% jadi HP, 30% tetap kena (REBALANCE - dahulu kebal penuh)
      p.hp = Math.min(p.maxHp, p.hp + dmg * 0.4);
      this.fx.spark(p.x, 1.6, p.z, 6, [0.4, 1.4, 2.2], { speed: 6, size: 0.35, life: 0.3 });
      dmg *= 0.3;
    }
    if (p.spawnShield > 0) {
      this.fx.spark(p.x, 1.5, p.z, 4, [0.5, 1.5, 2.2], { speed: 5, size: 0.28, life: 0.22 });
      return;
    }
    if (p.iframe > 0) return;
    p.iframe = 0.08;
    let d = dmg * p.stats.dmgTake * (p.abRes || 1);
    d = this.hurtHook2(p, d, sx, sz);   // perisai halo + duri Helix
    if (d <= 0) return;
    if (p.overshield > 0) {                       // perisai lebihan menyerap dahulu
      const eat = Math.min(p.overshield, d);
      p.overshield -= eat;
      d -= eat;
      this.fx.spark(p.x, 1.6, p.z, 4, [2, 1.6, 0.5], { speed: 5, size: 0.3, life: 0.25 });
      if (d <= 0.01) return;
    }
    p.hp -= d;
    UI.hurt(clamp(d / 22, 0.15, 1));
    this.shake(clamp(d * 0.035, 0.12, 0.9), 0.15);
    if (d > 4) Sfx.hurt();
    if (p.hp <= 30 && Math.random() < 0.3) this.fx.smoke(p.x + rand(-1, 1), 1.2, p.z + rand(-1, 1), 1, { size: 1.1, life: 1.2, alpha: 0.4 });
    if (p.hp <= 0 && this.haloSave(p)) return;      // Guardian Halo menghalang maut sekali
    if (p.hp <= 0) this.die();
    void sx; void sz;
  },

  die() {
    const p = this.player;
    // kebolehan suis (Hamvog) dilipat semula supaya muncul semula dalam keadaan asal
    if (p.abOn && p.ab && p.ab.toggle) this.endAbility();
    p.hp = 0; p.dead = true;
    p.trophy = 0; p.dash = null; p.hop = null; p.flail = null; p.cloud = null; p.ray = null; p.prey = null; p._bob = 0;
    p.prism = null; p.rotor = null; p.condorSlam = null; p.fly = 0; p.egc = null; p.burrow = null; p.bz = null; p.iceCharge = null; p.conduit = null; p.lunar = null; p.coreBeam = null; p.abSpeed = 1;
    if (this.team) this.team.playerKilled();
    this.state = 'dying';
    this.dyingT = 2.4;
    this.explodeAt(p.x, 1.2, p.z, 12, 0);
    this.fx.explode(p.x, 2, p.z, 9, [1.8, 1.0, 0.3]);
    for (let i = 0; i < 4; i++) setTimeout(() => {
      if (this.fx) { this.fx.explode(p.x + rand(-3, 3), rand(0.5, 3), p.z + rand(-3, 3), rand(4, 8), [1.6, 0.8, 0.3]); Sfx.boom(1.2); }
    }, 220 * i);
    this.shake(2.2, 1.0);
    Sfx.stopEngine();
    this.car.root.visible = false;
    this.reticle.visible = false;
    if (this.dirArrow) this.dirArrow.visible = false;
    if (p.abOn) this.endAbility();
    this.showShield(false);
    this.clearBeacon();
    if (this.lockMark) this.lockMark.visible = false;
  },

  gameOver() {
    if (this.team && !this.team.over) { this.team.playerDown(); return; }
    if (this.training) { this.training.respawnPlayer(); return; }
    this.state = 'over';
    Missions.track('runs', 1, this.mode);
    Save.d.best[this.mode] = Math.max(Save.d.best[this.mode] || 0, this.wave - 1);
    Save.save();
    UI.hudOn(false);
    UI.gameOver(this);
  },

  /* ---------------- kebolehan kereta (SPACE) ---------------- */
  useAbility() {
    const p = this.player;
    if (!p || p.dead || this.state !== 'play' || !p.ab) return;
    // sesetengah kebolehan boleh ditekan semula semasa aktif (cth. teleport)
    if (p.abOn && p.ab.toggle) { this.endAbility(); return; }
    if (p.abOn && p.ab.retrigger) {
      if (p.ab.retrigger(this, p)) this.endAbility();
      return;
    }
    // kebolehan berasaskan cas (Gyhna): setiap tekan guna satu cas, tiada keadaan "aktif"
    if (p.ab.press) {
      const who = p.ab.press(this, p);
      if (who) {
        const msg = p.ab.pressMsg ? p.ab.pressMsg(p, who) : `LINK ${p.links.length}/${p.ab.charges} · ${who}`;
        if (msg) UI.toast(msg);
        UI.abFlash(); Missions.track('ability', 1, this.mode);
      }
      return;
    }
    if (p.abOn || p.abCd > 0) { Sfx.deny(); return; }
    p.abOn = true;
    p.abT = p.ab.dur;
    p.abAnim = 0.6;
    const col = hexRGB(p.ab.color);
    p.abCol = col;
    abCast(this, p, p.abId, col);        // bentuk pengaktifan khusus setiap kebolehan
    this.fx.flash(p.x, 2, p.z, col, 14, 0.25, 30);
    this.shake(0.45, 0.18);
    this._abCtx++; try { p.ab.start(this, p); } finally { this._abCtx--; }
    Missions.track('ability', 1, this.mode);
    UI.toast(p.ab.name.toUpperCase());
    UI.abFlash();
  },

  endAbility() {
    const p = this.player;
    if (!p.abOn) return;
    p.abOn = false;
    p.abT = 0;
    p.abCd = p.ab.cd;
    this._abCtx++; try { p.ab.end(this, p); } finally { this._abCtx--; }
  },

  updateAbility(dt) {
    const p = this.player;
    if (!p || !p.ab) return;
    if (p.abCd > 0) p.abCd = Math.max(0, p.abCd - dt);
    if (p.abOn) {
      p.abT -= dt;
      this._abCtx++; try { p.ab.update(this, p, dt); } finally { this._abCtx--; }
      abAura(this, p, p.abId, dt, p.abCol || [1, 1, 1]);
      if (p.abT <= 0) this.endAbility();
    } else if (p.ab.passive && !p.dead) {
      p.ab.passive(this, p, dt);
    }
    if (this.shieldMesh) {
      this.shieldMesh.position.set(p.x, p.y + 1.2, p.z);
      this.shieldMesh.rotation.y += dt * 0.7;
      // kubah berkelip setiap kali menyerap peluru (domeFlash)
      this.domeFlash = Math.max(0, (this.domeFlash || 0) - dt * 2.5);
      const base = this.shieldMesh.userData.big ? 0.12 : 0.22;
      this.shieldMesh.material.opacity = base + Math.sin(this.time * 5) * 0.05 + this.domeFlash;
    }
    if (this.beacon) {
      this.beacon.obj.rotation.y += dt * 2.2;
      this.beacon.obj.userData.orb.position.y = 1.95 + Math.sin(this.time * 3) * 0.12;
    }
  },

  showShield(on, color, radius) {
    if (!on) {
      if (this.shieldMesh) { this.scene.remove(this.shieldMesh); this.shieldMesh = null; }
      return;
    }
    if (this.shieldMesh) this.scene.remove(this.shieldMesh);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(radius || 3.6, 2), new THREE.MeshBasicMaterial({
      color: color || 0x57d6ff, transparent: true, opacity: 0.26,
      blending: THREE.AdditiveBlending, depthWrite: false, wireframe: false, side: THREE.DoubleSide,
    }));
    /* Kubah besar (Hyna): tambah kekisi heksagon bercahaya + gelang tanah,
       supaya ia nampak seperti struktur tenaga, bukan sekadar bola lutsinar. */
    if ((radius || 0) >= 8) {
      m.material.opacity = 0.14;
      const lat = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.005, 1), new THREE.MeshBasicMaterial({
        color: color || 0x57d6ff, transparent: true, opacity: 0.55, wireframe: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.add(lat);
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.97, radius * 1.03, 64), new THREE.MeshBasicMaterial({
        color: color || 0x57d6ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -1.12;
      m.add(ring);
      m.userData.big = true;
    }
    this.scene.add(m);
    this.shieldMesh = m;
  },

  // cap: had bilangan periuk api aktif — yang paling lama dibuang bila melebihi had
  spawnMine(x, z, cap = 0) {
    if (cap > 0) {
      while (this.mines.length >= cap) {
        const old = this.mines.shift();
        this.scene.remove(old.obj);
        this.fx.smoke(old.x, 0.3, old.z, 3, { speed: 1.2, size: 0.8, life: 0.5, alpha: 0.35 });
      }
    }
    const obj = buildMine();
    obj.position.set(clamp(x, -HALF + 2, HALF - 2), 0.14, clamp(z, -HALF + 2, HALF - 2));
    this.scene.add(obj);
    // periuk api kekal sehingga meletup atau diganti (tiada tamat tempoh)
    this.mines.push({ x: obj.position.x, z: obj.position.z, obj, arm: 0.6, life: Infinity });
  },

  updateMines(dt) {
    if (!this.mines || !this.mines.length) return;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.arm -= dt; m.life -= dt;
      const led = m.obj.userData.led;
      if (led) led.material.emissiveIntensity = m.arm > 0 ? 1 : 2 + Math.sin(this.time * 10) * 1.6;
      let boom = m.life <= 0;
      if (!boom && m.arm <= 0) {
        this.neighbors(m.x, m.z, 3.4, null, (e) => { if (!e.d.fly || e.y < 2.4) boom = true; });
      }
      if (boom) {
        this.scene.remove(m.obj);
        this.mines.splice(i, 1);
        if (m.life > 0) this.explodeAt(m.x, 0.5, m.z, 9.5, 190 + this.wave * 14);
      }
    }
  },

  healPlayer(amount, overflow) {
    const p = this.player;
    if (!p || p.dead) return;
    // pemulihan yang dikira daripada damage: gelombang -> skala HP pemain; pasukan -> skala ability (dalam konteks ability)
    amount *= this.team ? (this._abCtx > 0 ? this.abScale : 1) : (this.hpK || 1);
    const room = p.maxHp - p.hp;
    const heal = Math.min(room, amount);
    p.hp += heal;
    const rest = amount - heal;
    if (rest > 0 && overflow) p.overshield = Math.min(p.maxHp * 0.5, p.overshield + rest * 0.5);
  },

  // gelombang tolakan (Repulsor Wave)
  repulsorWave(ox, oy, oz, dx, dz, range, arc, dmg, knock, stun, color, thru) {
    const l = Math.hypot(dx, dz) || 1;
    const fx = dx / l, fz = dz / l;
    this.fx.abilityRing(ox, oz, color || [0.7, 1.5, 2.3], 2, range * 1.1, 0.35);
    for (const e of this.enemies.slice()) {
      const ex = e.x - ox, ez = e.z - oz;
      const d = Math.hypot(ex, ez);
      if (d > range || d < 0.01) continue;
      if ((ex / d) * fx + (ez / d) * fz < 1 - arc * 2) continue;
      if (!thru && !this.losClear(ox, oz, e.x, e.z, e)) continue;   // gelombang dihalang dinding
      const f = 1 - clamp(d / range, 0, 1) * 0.45;
      this.damageEnemy(e, dmg * f, ex, 0, ez, knock * f, 'boom');
      if (stun) e.slowT = Math.max(e.slowT, stun);
      this.fx.spark(e.x, e.y + e.h * 0.5, e.z, 4, color || [0.7, 1.5, 2.3], { speed: 6, size: 0.3, life: 0.28 });
    }
    void oy;
  },

  // sasaran yang musuh serang (umpan jika ada)
  aimTarget() { return this.decoy || this.player; },
  hurtTarget(dmg, sx, sz) {
    if (this.decoy) {
      this.decoy.hp -= dmg;
      this.fx.spark(this.decoy.x, 1.4, this.decoy.z, 4, [2, 0.8, 0.4], { speed: 5, size: 0.3, life: 0.25 });
      if (this.decoy.hp <= 0) this.clearDecoy();
      return;
    }
    this.hurtPlayer(dmg, sx, sz);
  },

  // hentaman meteor
  meteorImpact(x, z, radius, dmg) {
    this.fx.explode(x, 1.5, z, radius * 0.55, [2, 1, 0.3], { dur: 0.9 });
    this.fx.abilityRing(x, z, [2, 1.1, 0.35], 3, radius, 0.6);
    this.fx.decal('scorch', x, z, radius * 1.4);
    Sfx.boom(2);
    this.shake(2.4, 0.7);
    for (const e of this.enemies.slice()) {
      const dx = e.x - x, dz = e.z - z;
      const d = Math.hypot(dx, dz);
      if (d > radius) continue;
      const f = 1 - clamp(d / radius, 0, 1) * 0.6;
      this.damageEnemy(e, dmg * f, dx, 0, dz, 40 * f, 'boom');
    }
  },

  // dudukan senjata sementara (Hydra)
  addTempSlots(n) {
    const carId = (this.carDef && this.carDef.id) || Save.d.car;
    const lo = getLoadout(carId);
    const src = lo.filter(Boolean);
    if (!src.length) return;
    this.tempSlots = 0;
    for (let i = 0; i < n; i++) {
      const id = src[i % src.length];
      if (this.slots.length >= (this.car.turrets ? this.car.turrets.length : 4)) break;
      this.slots.push(makeSlot(id, Save.d.lv[id] || 1, Save.d.perks[id] || []));
      this.tempSlots++;
    }
    this.mountWeapons();
    UI.syncHud(this);
  },
  removeTempSlots() {
    if (!this.tempSlots) return;
    this.slots.length = Math.max(1, this.slots.length - this.tempSlots);
    this.tempSlots = 0;
    this.mountWeapons();
    UI.syncHud(this);
  },

  // umpan yang menarik semua serangan
  spawnDecoy(x, z, life) {
    this.clearDecoy();
    const obj = buildDecoy();
    obj.position.set(clamp(x, -HALF + 3, HALF - 3), 0, clamp(z, -HALF + 3, HALF - 3));
    this.scene.add(obj);
    this.decoy = {
      x: obj.position.x, z: obj.position.z, y: 0, r: 1.8, vx: 0, vz: 0,
      obj, life, hp: (260 + this.wave * 30) * (this.team ? this.abScale : 1),
    };
    this.fx.abilityRing(this.decoy.x, this.decoy.z, [2, 0.7, 0.4], 2, 14, 0.5);
  },
  clearDecoy() {
    if (this.decoy) { this.scene.remove(this.decoy.obj); this.decoy = null; }
  },
  updateDecoy(dt) {
    const d = this.decoy;
    if (!d) return;
    d.life -= dt;
    d.obj.rotation.y += dt * 3;
    const m = d.obj.userData.mats;
    if (m && m.glow) m.glow.emissiveIntensity = 2 + Math.sin(this.time * 12) * 1.2;
    if (Math.random() < dt * 20) {
      this.fx.add.emit(d.x + rand(-0.8, 0.8), rand(0.4, 2.4), d.z + rand(-0.8, 0.8), 0, rand(1, 3), 0,
        { color: [2, 0.8, 0.4], color2: [0.6, 0.15, 0.05], size: rand(0.15, 0.4), size2: 0.03, life: 0.4, drag: 1.4 });
    }
    if (d.life <= 0 || d.hp <= 0) {
      this.fx.explode(d.x, 1, d.z, 6, [2, 0.9, 0.4], { dur: 0.5 });
      this.clearDecoy();
    }
  },

  // dron pengiring
  /* Kefly: dron serang. Setiap satu memilih musuhnya sendiri, terbang
     terus ke arahnya dan meletup apabila bertembung. */
  spawnStrikeDrones(n) {
    if (!this.strikes) this.strikes = [];
    const p = this.player;
    const dmg = 175 + this.wave * 11;
    for (let i = 0; i < n; i++) {
      const obj = buildStrikeDrone();
      const a = (i / n) * TAU + rand(-0.3, 0.3);
      obj.position.set(p.x + Math.cos(a) * 1.6, 1.6, p.z + Math.sin(a) * 1.6);
      this.scene.add(obj);
      this.strikes.push({
        obj, x: obj.position.x, y: 1.6, z: obj.position.z,
        vy: rand(7, 10), a, launch: 0.35 + i * 0.09, life: 11,
        tgt: null, scan: 0, dmg, spl: 7.5,
      });
    }
    Sfx.tone(520, 0.2, 'square', 0.16, 900);
    Sfx.noise(0.3, 0.4, 1600, 1.2);
  },

  updateStrikeDrones(dt) {
    if (!this.strikes || !this.strikes.length) return;
    const p = this.player;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const d = this.strikes[i];
      d.life -= dt;
      if (d.life <= 0) { this.explodeAt(d.x, d.y, d.z, d.spl, d.dmg * 0.5); this.scene.remove(d.obj); this.strikes.splice(i, 1); continue; }

      if (d.launch > 0) {
        // melambung keluar dari dek dahulu supaya pelancaran jelas kelihatan
        d.launch -= dt;
        d.y += d.vy * dt;
        d.vy -= 9 * dt;
        d.a += dt * 3;
        d.x += Math.cos(d.a) * 5 * dt;
        d.z += Math.sin(d.a) * 5 * dt;
        d.obj.rotation.set(-1.1, d.a, 0);
        this.fx.smoke(d.x, d.y, d.z, 1, { speed: 1.5, size: 0.7, life: 0.5, alpha: 0.35 });
        d.obj.position.set(d.x, d.y, d.z);
        continue;
      }

      if (!d.tgt || d.tgt.dead) {
        d.scan -= dt;
        if (d.scan <= 0) { d.scan = 0.25; d.tgt = this.nearestEnemy(d.x, d.z, 130); }
      }

      if (d.tgt) {
        const t = d.tgt;
        const ty = t.y + t.h * 0.5;
        let vx = t.x - d.x, vy = ty - d.y, vz = t.z - d.z;
        const l = Math.hypot(vx, vy, vz) || 1;
        vx /= l; vy /= l; vz /= l;
        const sp = 44;
        d.x += vx * sp * dt; d.y += vy * sp * dt; d.z += vz * sp * dt;
        d.obj.rotation.y = Math.atan2(vx, vz);
        d.obj.rotation.x = -Math.asin(clamp(vy, -1, 1));
        if (Math.random() < 0.5) {
          this.fx.add.emit(d.x, d.y, d.z, rand(-1, 1), rand(-1, 1), rand(-1, 1),
            { color: [2.0, 0.9, 0.4], color2: [0.5, 0.15, 0.05], size: 0.4, size2: 0.05, life: 0.3, drag: 1.2 });
        }
        if (l < t.r + 1.4) {
          t.lastHitBy = 'player';
          this.explodeAt(d.x, d.y, d.z, d.spl, d.dmg);
          this.scene.remove(d.obj);
          this.strikes.splice(i, 1);
          continue;
        }
      } else {
        // tiada sasaran: berlegar atas kereta sambil menunggu
        d.a += dt * 1.4;
        const tx = p.x + Math.cos(d.a) * 5, tz = p.z + Math.sin(d.a) * 5;
        d.x = damp(d.x, tx, 3, dt); d.z = damp(d.z, tz, 3, dt); d.y = damp(d.y, 5.2, 3, dt);
        d.obj.rotation.y = d.a + PI / 2;
        d.obj.rotation.x = 0;
      }
      d.obj.position.set(d.x, d.y, d.z);
    }
  },

  spawnWingDrones(n, life) {
    for (let i = 0; i < n; i++) {
      const obj = buildWingDrone();
      this.scene.add(obj);
      this.wings.push({ obj, life, cd: rand(0.2, 0.6), a: i / n * TAU, x: this.player.x, z: this.player.z });
    }
  },
  updateWings(dt) {
    if (!this.wings || !this.wings.length) return;
    const p = this.player;
    for (let i = this.wings.length - 1; i >= 0; i--) {
      const w = this.wings[i];
      w.life -= dt;
      if (w.life <= 0) {
        this.fx.spark(w.x, 4, w.z, 8, [0.6, 1.8, 1.4], { speed: 5, life: 0.4 });
        this.scene.remove(w.obj);
        this.wings.splice(i, 1);
        continue;
      }
      w.a += dt * 1.1;
      const tx = p.x + Math.cos(w.a) * 7, tz = p.z + Math.sin(w.a) * 7;
      w.x = damp(w.x, tx, 4, dt);
      w.z = damp(w.z, tz, 4, dt);
      const y = 4.4 + Math.sin(this.time * 2 + w.a) * 0.4;
      w.obj.position.set(w.x, y, w.z);
      const e = this.nearestEnemy(w.x, w.z, 42);
      if (e) {
        w.obj.rotation.y = Math.atan2(e.x - w.x, e.z - w.z);
        w.cd -= dt;
        if (w.cd <= 0) {
          w.cd = 0.45;
          w.obj.userData.muzzle.getWorldPosition(v3b);
          let dx = e.x - v3b.x, dy = (e.y + e.h * 0.5) - v3b.y, dz = e.z - v3b.z;
          const l = Math.hypot(dx, dy, dz) || 1;
          dx /= l; dy /= l; dz /= l;
          this.spawnBullet({
            x: v3b.x, y: v3b.y, z: v3b.z, vx: dx * 150, vy: dy * 150, vz: dz * 150,
            dmg: 26 + this.wave * 2.6, life: 1.0, pierce: 0, knock: 3,
            color: [0.6, 1.8, 1.4], size: 0.1, len: 2.2, owner: 'p', flags: null,
          });
          this.fx.muzzle(v3b.x, v3b.y, v3b.z, dx, dy, dz, 0.7, [0.6, 1.8, 1.4]);
          Sfx.shoot('smg');
        }
      } else {
        w.obj.rotation.y += dt * 1.4;
      }
    }
  },

  setCarOpacity(a) {
    if (!this.car) return;
    this._carOp = a;
    for (const k in this.car.mats) {
      const m = this.car.mats[k];
      if (!m) continue;
      m.transparent = a < 1;
      m.opacity = a;
      m.depthWrite = a >= 1;
    }
    for (const w of this.car.wheels) {
      w.spin.traverse(o => {
        if (!o.material) return;
        o.material.transparent = a < 1;
        o.material.opacity = a;
        o.material.depthWrite = a >= 1;
      });
    }
  },

  // kon hentaman (Banshee)
  conePulse(x, z, fx, fz, range, cosHalf, dmg) {
    this.fx.abilityRing(x, z, [1.5, 0.8, 2.2], 2, range * 0.9, 0.5);
    for (const e of this.enemies.slice()) {
      const dx = e.x - x, dz = e.z - z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.01) continue;
      if ((dx / d) * fx + (dz / d) * fz < cosHalf) continue;
      const f = 1 - d / range * 0.5;
      this.damageEnemy(e, dmg * f, dx, 0, dz, 40 * f, 'boom');
      e.slowT = Math.max(e.slowT, 2.2);
      this.fx.spark(e.x, e.y + 1, e.z, 5, [1.5, 0.8, 2.2], { speed: 6, life: 0.3 });
    }
  },

  // bahaya sementara di atas tanah: api napalm / penghadang tenaga
  spawnHazard(type, x, z, r, dmg, life) {
    x = clamp(x, -HALF + 3, HALF - 3); z = clamp(z, -HALF + 3, HALF - 3);
    let obj, prop = null;
    if (type === 'fire') {
      obj = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshBasicMaterial({
        color: 0xff7a2f, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      obj.rotation.x = -PI / 2;
      obj.position.set(x, 0.09, z);
    } else if (type === 'well') {
      obj = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), new THREE.MeshBasicMaterial({
        color: 0x8a3cff, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      obj.position.set(x, 1.4, z);
    } else {
      obj = new THREE.Mesh(new THREE.BoxGeometry(r * 2.2, 3.2, 0.5), new THREE.MeshStandardMaterial({
        color: 0x221a06, emissive: 0xffd257, emissiveIntensity: 1.6,
        transparent: true, opacity: 0.55, roughness: 0.3,
      }));
      obj.position.set(x, 1.6, z);
      prop = { x, z, r, mesh: null, idx: -1, explosive: false, hp: 999, type: 'barrier', alive: true, h: 3.2, enemyOnly: true, noCar: true };
      this.world.props.push(prop);
    }
    this.scene.add(obj);
    this.hazards.push({ type, x, z, r, dmg, life, maxLife: life, obj, prop, cd: 0, abil: this._abCtx > 0 });
  },

  updateHazards(dt) {
    if (!this.hazards || !this.hazards.length) return;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      this._curB = h;
      h.life -= dt;
      const f = clamp(h.life / h.maxLife, 0, 1);
      if (h.life <= 0) {
        this.scene.remove(h.obj);
        if (h.obj.geometry) h.obj.geometry.dispose();
        if (h.obj.material) h.obj.material.dispose();
        if (h.prop) {
          h.prop.alive = false;
          const k = this.world.props.indexOf(h.prop);
          if (k >= 0) this.world.props.splice(k, 1);
        }
        this.hazards.splice(i, 1);
        continue;
      }
      if (h.type === 'well') {
        h.obj.scale.setScalar(0.6 + Math.sin(this.time * 18) * 0.12);
        h.obj.material.opacity = 0.5 + f * 0.4;
        for (const e of this.enemies) {
          if (e.d.boss) continue;
          const dx = h.x - e.x, dz = h.z - e.z;
          const d = Math.hypot(dx, dz);
          if (d > h.r || d < 0.3) continue;
          const pull = 30 * dt;
          e.x += dx / d * pull; e.z += dz / d * pull;
        }
        if (Math.random() < dt * 50) {
          const a = rand(TAU), rr = rand(2, h.r);
          this.fx.add.emit(h.x + Math.cos(a) * rr, rand(0.4, 3), h.z + Math.sin(a) * rr,
            -Math.cos(a) * 12, rand(-1, 1), -Math.sin(a) * 12,
            { color: [1.2, 0.5, 2.2], color2: [0.3, 0.1, 0.6], size: rand(0.2, 0.45), size2: 0.02, life: 0.4, drag: 0.5 });
        }
        if (h.life <= dt) this.explodeAt(h.x, 1.2, h.z, h.r * 0.75, h.dmg * 1.6);
      } else if (h.type === 'fire') {
        h.obj.material.opacity = 0.2 + f * 0.4;
        if (Math.random() < dt * 26) {
          const a = rand(TAU), r = rand(0, h.r);
          this.fx.add.emit(h.x + Math.cos(a) * r, 0.2, h.z + Math.sin(a) * r, 0, rand(1.5, 4), 0,
            { color: [2, 1, 0.25], color2: [0.6, 0.12, 0.04], size: rand(0.3, 0.7), size2: 0.06, life: rand(0.4, 0.8), drag: 1.2, grav: 1.5 });
        }
        h.cd -= dt;
        if (h.cd <= 0) {
          h.cd = 0.35;
          this.neighbors(h.x, h.z, h.r + 1.5, null, (e, dx, dz, d) => {
            if (d > h.r + e.r) return;
            this.damageEnemy(e, h.dmg, 0, 0, 0, 0, 'burn');
            e.burnT = Math.max(e.burnT, 1.6);
            e.burnDmg = Math.max(e.burnDmg || 0, h.dmg * 0.5);
          });
        }
      } else {
        h.obj.material.opacity = 0.3 + f * 0.35;
        h.obj.material.emissiveIntensity = 1.2 + Math.sin(this.time * 6) * 0.4;
      }
    }
  },

  spawnTurret(x, z, life) {
    const obj = buildTurret('#ffb23f');
    obj.position.set(clamp(x, -HALF + 3, HALF - 3), 0, clamp(z, -HALF + 3, HALF - 3));
    this.scene.add(obj);
    this.turrets.push({ x: obj.position.x, z: obj.position.z, obj, life: life || 18, cd: 0.3, ang: 0, abil: this._abCtx > 0 });
    this.fx.spark(obj.position.x, 0.6, obj.position.z, 10, [1.6, 1.2, 0.5], { speed: 5, life: 0.4 });
  },

  updateTurrets(dt) {
    if (!this.turrets || !this.turrets.length) return;
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      this._curB = t;
      t.life -= dt;
      if (t.life <= 0) {
        this.fx.smoke(t.x, 0.6, t.z, 4, { size: 1, life: 0.9, alpha: 0.5 });
        this.scene.remove(t.obj);
        this.turrets.splice(i, 1);
        continue;
      }
      const e = this.nearestEnemy(t.x, t.z, 46);
      const head = t.obj.userData.head;
      if (e) {
        t.ang = turnTo(t.ang, Math.atan2(e.x - t.x, e.z - t.z), dt * 4.5);
        head.rotation.y = t.ang;
        t.cd -= dt;
        if (t.cd <= 0) {
          t.cd = 0.28;
          t.obj.userData.muzzle.getWorldPosition(v3b);
          let ax = e.x - v3b.x, ay = (e.y + e.h * 0.5) - v3b.y, az = e.z - v3b.z;
          const al = Math.hypot(ax, ay, az) || 1;
          ax /= al; ay /= al; az /= al;
          this.spawnBullet({
            x: v3b.x, y: v3b.y, z: v3b.z, vx: ax * 150, vy: ay * 150, vz: az * 150,
            dmg: 22 + this.wave * 2.2, life: 0.9, pierce: 0, knock: 3,
            color: [1.7, 1.2, 0.5], size: 0.09, len: 2.2, owner: 'p', flags: null,
          });
          this.fx.muzzle(v3b.x, v3b.y, v3b.z, ax, ay, az, 0.7, [1.7, 1.2, 0.5]);
          Sfx.shoot('smg');
        }
      }
      if (t.life < 3) t.obj.visible = Math.sin(t.life * 14) > -0.4;
    }
  },

  // nadi sedut: tolak + rosakkan musuh, pulihkan HP pemain
  siphonPulse(x, z, radius, dmg) {
    const p = this.player;
    this.fx.explode(x, 1, z, radius * 0.45, [1.6, 0.4, 1.3], { dur: 0.7 });
    this.shake(1.2, 0.3);
    let healed = 0;
    for (const e of this.enemies.slice()) {
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > radius) continue;
      const f = 1 - clamp(d / radius, 0, 1) * 0.5;
      const before = e.hp;
      this.damageEnemy(e, dmg * f, e.x - x, 0, e.z - z, 34 * f, 'boom');
      healed += Math.min(before, dmg * f) * 0.12;
      this.fx.lightning(x, 1.2, z, e.x, e.y + e.h * 0.5, e.z, [1.8, 0.4, 1.4], 4);
    }
    if (healed > 0 && !p.dead) {
      this.healPlayer(healed);
      UI.toast('+' + fmt(healed * (this.team ? this.abScale : this.hpK) * U) + ' HP SIPHONED');
    }
  },

  spawnBeacon(x, z) {
    this.clearBeacon();
    const obj = buildBeacon();
    obj.position.set(clamp(x, -HALF + 3, HALF - 3), 0, clamp(z, -HALF + 3, HALF - 3));
    this.scene.add(obj);
    this.beacon = { x: obj.position.x, z: obj.position.z, obj };
    this.fx.explode(obj.position.x, 1, obj.position.z, 4, [0.8, 0.4, 1.6], { dur: 0.4 });
  },

  clearBeacon() {
    if (this.beacon) { this.scene.remove(this.beacon.obj); this.beacon = null; }
  },

  // letupan nuklear: musuh sahaja yang terkena
  nukeBlast(x, z, radius, dmg) {
    this.fx.explode(x, 2, z, radius * 0.55, [0.7, 2, 0.5], { dur: 1.1 });
    this.fx.explode(x, 4, z, radius * 0.35, [1.2, 2, 0.6], { dur: 0.9 });
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.fx) return;
        const a = rand(TAU), r = rand(radius * 0.3, radius * 0.9);
        this.fx.explode(x + Math.cos(a) * r, rand(1, 4), z + Math.sin(a) * r, rand(5, 9), [0.8, 1.8, 0.5]);
      }, i * 110);
    }
    Sfx.boom(2);
    this.shake(2.6, 1.0);
    for (const e of this.enemies.slice()) {
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > radius) continue;
      const f = 1 - clamp(d / radius, 0, 1) * 0.55;
      this.damageEnemy(e, dmg * f, e.x - x, 0, e.z - z, 26 * f, 'boom');
    }
  },

  /* ---------------- kutipan ---------------- */
  dropPickup(kind, x, z, value) {
    if (this.pickups.length > 140) {                 // elak terlalu banyak objek
      const old = this.pickups.shift();
      if (old) { if (old.kind === 'coin') Econ.addCoins(old.value); if (old.kind === 'scrap') Econ.addScrap(old.value); this.scene.remove(old.obj); }
    }
    const obj = buildPickup(kind === 'power' ? 'power' : kind);
    obj.position.set(x, 0.7, z);
    this.scene.add(obj);
    const pk = { kind, x, z, y: 0.7, obj, t: rand(TAU), value: value || 1, life: 26, vy: 3 };
    if (kind === 'power') pk.pType = pick(['dmg', 'shield', 'rapid', 'freeze']);
    this.pickups.push(pk);
  },

  updatePickups(dt) {
    const p = this.player;
    const mag = p.stats.magnet;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.t += dt; k.life -= dt;
      const dx = p.x - k.x, dz = p.z - k.z;
      const d = Math.hypot(dx, dz);
      const money = k.kind === 'coin' || k.kind === 'scrap';
      const range = money ? mag : 4.5;
      if (d < range) {
        const pull = money ? 52 : 14;
        k.x += dx / (d || 1) * pull * dt * (1 - d / range + 0.4);
        k.z += dz / (d || 1) * pull * dt * (1 - d / range + 0.4);
      }
      k.vy -= 12 * dt;
      k.y = Math.max(0.6, k.y + k.vy * dt);
      if (k.y <= 0.61) k.vy = 0;
      k.obj.position.set(k.x, k.y + Math.sin(k.t * 3) * 0.14, k.z);
      k.obj.rotation.y = k.t * 1.8;
      if (k.life < 4) k.obj.visible = Math.sin(k.life * 18) > -0.3;

      if (d < 2.6 || k.life <= 0) {
        if (k.life > 0) this.collect(k);
        this.scene.remove(k.obj);
        this.pickups.splice(i, 1);
      }
    }
  },

  collect(k) {
    const p = this.player;
    if (k.kind === 'coin') {
      Econ.addCoins(k.value);
      Missions.track('coins', k.value, this.mode);
      this.earnedCoins = (this.earnedCoins || 0) + k.value;
      UI.syncHud(this);
      Sfx.coin();
    } else if (k.kind === 'scrap') {
      Econ.addScrap(k.value);
      Missions.track('scrap', k.value, this.mode);
      this.earnedScrap = (this.earnedScrap || 0) + k.value;
      UI.syncHud(this);
      Sfx.tone(420, 0.06, 'square', 0.12, 640);
    } else if (k.kind === 'hp') {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
      UI.toast('+30% HP'); Sfx.pickup();
      this.fx.spark(k.x, 1, k.z, 10, [0.6, 1.8, 0.8], { speed: 5 });
    } else if (k.kind === 'ammo') {
      for (const s of this.slots) if (s) { s.mag = s.st.mag; s.reload = 0; s.heat = 0; s.over = false; }
      UI.toast('ALL MAGAZINES FULL'); Sfx.pickup();
    } else {
      const t = k.pType;
      p.pow[t] = t === 'shield' ? 9 : 13;
      const names = { dmg: 'DOUBLE DAMAGE', shield: 'SHIELD', rapid: 'RAPID FIRE', freeze: 'ENEMIES SLOWED' };
      UI.toast(names[t]); Sfx.buy();
      if (t === 'freeze') for (const e of this.enemies) e.slowT = 9;
      this.fx.spark(k.x, 1, k.z, 16, [0.5, 1.5, 2.2], { speed: 7 });
    }
  },


  /* ---------------- pertanyaan ruang ---------------- */
  buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      const cx = Math.floor(e.x / 6), cz = Math.floor(e.z / 6);
      const key = cx * 10007 + cz;
      let a = this.grid.get(key);
      if (!a) { a = []; this.grid.set(key, a); }
      a.push(e);
    }
  },

  /* Ke mana kebolehan yang "dilontar" patut mendarat. Keutamaan:
       1. sasaran yang sedang dikunci
       2. musuh dengan bilangan JIRAN terbanyak dalam jarak (kumpulan padat)
       3. kalau arena kosong, barulah tempat di hadapan kereta
     Tanpa ini pemain kerap membuang kebolehan ke padang kosong. */
  abilityPoint(range, clump) {
    const p = this.player;
    const R2 = range || 26;
    if (this.autoTgt && !this.autoTgt.dead) {
      const d = Math.hypot(this.autoTgt.x - p.x, this.autoTgt.z - p.z);
      if (d <= R2 * 1.6) return { x: this.autoTgt.x, z: this.autoTgt.z, hit: true };
    }
    if (this.lock && !this.lock.dead) {
      const d = Math.hypot(this.lock.x - p.x, this.lock.z - p.z);
      if (d <= R2 * 1.6) return { x: this.lock.x, z: this.lock.z, hit: true };
    }
    // cari kelompok terbaik dalam jarak
    let best = null, bestScore = -1;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > R2 * 1.6) continue;
      let n = 0;
      if (clump) for (const o of this.enemies) {
        if (o.dead || o === e) continue;
        if (Math.hypot(o.x - e.x, o.z - e.z) < (clump || 7)) n++;
      }
      const score = n * 10 - d * 0.1;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (best) return { x: best.x, z: best.z, hit: true };
    // arena kosong: jatuh balik ke hadapan kereta
    return { x: p.x + Math.sin(p.ang) * R2, z: p.z + Math.cos(p.ang) * R2, hit: false };
  },

  /* Sasaran di bawah reticle: musuh paling hampir dengan garis bidikan
     dalam kon `arc` radian. Digunakan oleh Drain Beam, Shock Lance dan
     semua peluru berpandu supaya mereka tidak tersasar. */
  pickAimTarget(ox, oz, dx, dz, range, arc, los) {
    if (los) {
      // hanya sasaran yang tidak terlindung di sebalik dinding
      const en = this.enemies;
      this.enemies = en.filter(e => !e.dead && this.losClear(ox, oz, e.x, e.z, e));
      try { return this.pickAimTarget(ox, oz, dx, dz, range, arc, false); } finally { this.enemies = en; }
    }
    const dl = Math.hypot(dx, dz) || 1;
    const ux = dx / dl, uz = dz / dl;
    const cosMax = Math.cos(arc == null ? 0.5 : arc);
    let best = null, bestScore = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const ex = e.x - ox, ez = e.z - oz;
      const d = Math.hypot(ex, ez);
      if (d > range + e.r) continue;
      if (d < 0.6) return e;
      const c = (ex * ux + ez * uz) / d;
      if (c < cosMax) continue;
      const score = d * (2.2 - c);         // utamakan yang hampir DAN yang betul-betul di depan
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  },

  /* Wind Charge: musuh terangkat daripada tanah sebentar dan tidak boleh
     memandu. Menggunakan medan `fly` sedia ada supaya perlanggaran dan
     bayang mengikutinya. */
  liftEnemy(e, t, area) {
    if (e.d.boss) return;
    e.liftT = Math.max(e.liftT || 0, t);
    e.lockT = Math.max(e.lockT || 0, t * 0.7);
    e.vx *= 0.3; e.vz *= 0.3;
    this.fx.spark(e.x, e.y + e.h * 0.4, e.z, 5, [0.85, 1.2, 1.6], { speed: 5, size: 0.3, life: 0.35 });
    if (area) {
      this.neighbors(e.x, e.z, area, e, (o, dx2, dz2, d2) => {
        if (d2 > area || o.d.boss || o.liftT > 0) return;
        o.liftT = Math.max(o.liftT || 0, t * 0.7);
        o.lockT = Math.max(o.lockT || 0, t * 0.5);
      });
    }
  },

  updateLift(dt) {
    for (const e of this.enemies) {
      if (!(e.liftT > 0)) continue;
      e.liftT -= dt;
      const up = e.d.fly ? (e.d.fly + 2.2) : 2.4;
      e.y = e.liftT > 0.2 ? Math.min(up, (e.y || 0) + dt * 9) : Math.max(e.d.fly || 0, (e.y || 0) - dt * 11);
      if (Math.random() < 0.3) {
        this.fx.add.emit(e.x + rand(-0.6, 0.6), (e.y || 0) + 0.2, e.z + rand(-0.6, 0.6),
          rand(-1.5, 1.5), rand(-2, -0.5), rand(-1.5, 1.5),
          { color: [0.85, 1.2, 1.6], color2: [0.3, 0.4, 0.5], size: 0.26, size2: 0.04, life: 0.3, drag: 1.6 });
      }
      if (e.liftT <= 0) e.y = e.d.fly || 0;
    }
  },

  /* Wily: musuh yang terkena gam terpaku di tempatnya. Ia masih boleh
     bergerak, tetapi seperti terlekat - amat perlahan. Musuh lain yang
     berdekatan melekat padanya dan turut terpaku. */
  glueEnemy(e, t, radius) {
    if (e.d.boss) t *= 0.4;
    e.glueT = Math.max(e.glueT || 0, t);
    e.glueX = e.x; e.glueZ = e.z;              // titik ia terlekat
    this.fx.spark(e.x, e.y + e.h * 0.5, e.z, 7, [1.4, 1.8, 0.6], { speed: 4, size: 0.34, life: 0.4 });
    const r = radius || 4.6;
    this.neighbors(e.x, e.z, r, e, (o, dx2, dz2, d2) => {
      if (d2 > r || o.glueT > 0) return;
      o.glueT = Math.max(o.glueT || 0, t * 0.7);
      o.glueX = o.x; o.glueZ = o.z;
      this.fx.spark(o.x, o.y + o.h * 0.4, o.z, 4, [1.4, 1.8, 0.6], { speed: 3, size: 0.26, life: 0.35 });
    });
  },

  updateGlue(dt) {
    for (const e of this.enemies) {
      if (!(e.glueT > 0)) continue;
      e.glueT -= dt;
      // ditarik balik ke titik lekat: boleh bergerak, tetapi hampir tidak beranjak
      const k = Math.min(1, dt * 5);
      e.x += (e.glueX - e.x) * k * 0.85;
      e.z += (e.glueZ - e.z) * k * 0.85;
      e.slowT = Math.max(e.slowT, 0.3);
      if (Math.random() < 0.18) {
        this.fx.add.emit(e.x + rand(-0.5, 0.5), 0.15, e.z + rand(-0.5, 0.5), 0, rand(0.2, 0.9), 0,
          { color: [1.4, 1.8, 0.6], color2: [0.4, 0.5, 0.15], size: 0.3, size2: 0.05, life: 0.6, drag: 2.8, ground: true });
      }
    }
  },

  /* ---------------- zon jaring (Snare Net) ---------------- */
  spawnNet(x, z, r, dur, vuln) {
    if (!this.nets) this.nets = [];
    if (this.nets.length >= 4) { const o = this.nets.shift(); this.scene.remove(o.obj); }
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.92, r, 34),
      new THREE.MeshBasicMaterial({ color: 0x9fe86a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(r, 30),
      new THREE.MeshBasicMaterial({ color: 0x6fbf3a, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    fill.rotation.x = -Math.PI / 2;
    g.add(fill);
    // benang jaring supaya jelas ini memang perangkap, bukan sekadar bulatan
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(r * 2, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xc8ff8a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
      bar.rotation.x = -Math.PI / 2;
      bar.rotation.z = (i / 6) * Math.PI;
      g.add(bar);
    }
    g.position.set(x, 0.09, z);
    this.scene.add(g);
    this.nets.push({ x, z, r, t: dur, obj: g, vuln: vuln || 1.35, ring });
    this.fx.abilityRing(x, z, [1.0, 1.7, 0.8], 1.2, r * 1.3, 0.4);
  },

  updateNets(dt) {
    if (!this.nets || !this.nets.length) return;
    for (const e of this.enemies) if (e.netT > 0) e.netT -= dt;
    for (let i = this.nets.length - 1; i >= 0; i--) {
      const n = this.nets[i];
      n.t -= dt;
      if (n.t <= 0) { this.scene.remove(n.obj); this.nets.splice(i, 1); continue; }
      n.obj.rotation.y += dt * 0.5;
      const fade = clamp(n.t / 0.8, 0, 1);
      n.ring.material.opacity = (0.45 + Math.sin(this.time * 7) * 0.12) * fade;
      this.neighbors(n.x, n.z, n.r, null, (e, dx2, dz2, d2) => {
        if (d2 > n.r) return;
        e.netT = 0.3;
        e.netVuln = n.vuln;
        if (!e.d.boss) e.lockT = Math.max(e.lockT || 0, 0.3);
        if (Math.random() < 0.05) {
          this.fx.spark(e.x, e.y + e.h * 0.45, e.z, 2, [1.0, 1.7, 0.8], { speed: 3, size: 0.2, life: 0.25 });
        }
      });
    }
  },

  /* ---------------- cakera mengorbit (Breach Drill) ---------------- */
  spawnDisc(s, w, flags) {
    if (!this.discs) this.discs = [];
    if (this.discs.length >= 5) { const o = this.discs.shift(); this.scene.remove(o.obj); }
    const col = new THREE.Color(w.color[0] * 0.62, w.color[1] * 0.55, w.color[2] * 0.4);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.13, 16),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.85, roughness: 0.3, emissive: col, emissiveIntensity: 0.35 }));
    g.add(body);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xe8e2d0, metalness: 0.9, roughness: 0.25 }));
      tooth.position.set(Math.cos(a) * 0.93, 0, Math.sin(a) * 0.93);
      tooth.rotation.y = -a;
      g.add(tooth);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    g.add(hub);
    const p = this.player;
    const ang = Math.random() * Math.PI * 2;
    const orbitR = s.orbitR || 6.5;
    g.position.set(p.x + Math.cos(ang) * orbitR, 1.15, p.z + Math.sin(ang) * orbitR);
    this.scene.add(g);
    this.discs.push({
      obj: g, x: g.position.x, y: 1.15, z: g.position.z,
      ang, orbitR, spin: 0, scan: 0, tgt: null, thru: !!s.thruWalls,
      dmg: s.dmg, knock: s.knock || 0, range: s.range || 26,
      life: s.discLife || 8, color: w.color, flags: flags || null,
    });
  },

  updateDiscs(dt) {
    if (!this.discs || !this.discs.length) return;
    const p = this.player;
    for (let i = this.discs.length - 1; i >= 0; i--) {
      const d = this.discs[i];
      d.life -= dt;
      d.spin += dt * 26;
      if (d.life <= 0) { this.scene.remove(d.obj); this.discs.splice(i, 1); continue; }

      // lepaskan sasaran yang sudah mati atau terlalu jauh dari kereta
      if (d.tgt && (d.tgt.dead || Math.hypot(d.tgt.x - p.x, d.tgt.z - p.z) > d.range * 1.9)) d.tgt = null;
      // cakera ialah objek fizikal: ia tidak terbang menembusi dinding (kecuali Phase Rounds)
      if (d.tgt && !d.thru && !this.losClear(d.x, d.z, d.tgt.x, d.tgt.z, d.tgt)) d.tgt = null;
      if (!d.tgt) {
        d.scan -= dt;
        if (d.scan <= 0) { d.scan = 0.12; d.tgt = this.nearestEnemy(p.x, p.z, d.range, null, !d.thru); }
      }

      if (d.tgt) {
        // MENYERANG: terbang ke musuh, kemudian mengisar sambil melekat
        const t = d.tgt;
        const ty = t.y + t.h * 0.5;
        const vx = t.x - d.x, vy = ty - d.y, vz = t.z - d.z;
        const l = Math.hypot(vx, vy, vz) || 1;
        const reach = t.r + 1.0;
        if (l > reach) {
          const sp = 36;
          d.x += vx / l * sp * dt; d.y += vy / l * sp * dt; d.z += vz / l * sp * dt;
        } else {
          d.x = t.x + Math.cos(d.spin * 0.7) * reach * 0.85;
          d.z = t.z + Math.sin(d.spin * 0.7) * reach * 0.85;
          d.y = lerp(d.y, ty, 1 - Math.pow(0.001, dt));
          t.lastHitBy = 'player';
          this.damageEnemy(t, d.dmg * dt, t.x - p.x, 0, t.z - p.z, d.knock * dt, 'bullet', d.flags);
          if (Math.random() < 0.55) {
            this.fx.spark(d.x, d.y, d.z, 2, d.color, { speed: 6, size: 0.24, life: 0.2 });
          }
        }
      } else {
        // MENUNGGU: berlegar mengelilingi kereta dan tetap memotong apa yang tersentuh
        d.ang += dt * 2.4;
        const tx = p.x + Math.cos(d.ang) * d.orbitR;
        const tz = p.z + Math.sin(d.ang) * d.orbitR;
        const k = 1 - Math.pow(0.0005, dt);
        d.x = lerp(d.x, tx, k); d.z = lerp(d.z, tz, k); d.y = lerp(d.y, 1.15, k);
        this.neighbors(d.x, d.z, 1.5, null, (e, dx2, dz2, dd) => {
          if (dd > e.r + 1.1) return;
          e.lastHitBy = 'player';
          this.damageEnemy(e, d.dmg * 0.7 * dt, -dx2, 0, -dz2, 0, 'bullet', d.flags);
        });
      }
      d.obj.position.set(d.x, d.y, d.z);
      d.obj.rotation.y = d.spin;
      d.obj.rotation.x = Math.sin(d.spin * 0.25) * 0.3;
    }
  },

  /* ---------------- perisai muncul semula ---------------- */
  updateSpawnShield(dt) {
    const p = this.player;
    if (!p) return;
    if (p.spawnShield > 0 && this.state !== 'countdown') {
      // masa hanya berjalan setelah pemain meninggalkan kawasan pangkalan
      const atBase = this.team && this.team.atOwnBase && this.team.atOwnBase(p.x, p.z);
      if (!atBase) p.spawnShield -= dt;
      if (!this.ssMesh) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 2), new THREE.MeshBasicMaterial({
          color: 0x6fd8ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.DoubleSide, wireframe: true,
        }));
        this.scene.add(m);
        this.ssMesh = m;
      }
      this.ssMesh.visible = true;
      this.ssMesh.position.set(p.x, p.y + 1.3, p.z);
      this.ssMesh.rotation.y += dt * 1.1;
      this.ssMesh.material.opacity = (p.spawnShield < 1.5 ? 0.14 + Math.abs(Math.sin(this.time * 14)) * 0.24 : 0.3);
    } else if (this.ssMesh) {
      this.ssMesh.visible = false;
    }
  },

  neighbors(x, z, r, self, cb) {
    const c0x = Math.floor((x - r) / 6), c1x = Math.floor((x + r) / 6);
    const c0z = Math.floor((z - r) / 6), c1z = Math.floor((z + r) / 6);
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const a = this.grid.get(cx * 10007 + cz);
        if (!a) continue;
        for (let i = 0; i < a.length; i++) {
          const e = a[i];
          if (e === self || e.dead) continue;
          const dx = x - e.x, dz = z - e.z;
          const d = Math.hypot(dx, dz);
          if (d <= r + e.r) cb(e, dx, dz, d);
        }
      }
    }
  },

  /* Pilih musuh yang kedudukan TANAHNYA paling hampir dengan reticle.
     Musuh terbang dikunci melalui bayang tanahnya, dan arah tembakan
     kemudian menuju pusat sebenar musuh (lihat updateWeapons) — itulah
     yang membolehkan dron ditembak dari reticle atas tanah. */
  // jejari bantuan membidik (piksel skrin, ikut saiz tetingkap)
  assistPx() {
    const k = { off: 0, low: 70, med: 120, high: 185 }[Save.d.aimAssist || 'med'];
    return k * (innerHeight / 900);
  },

  /* Bantuan membidik: kunci musuh yang paling hampir dengan KURSOR di skrin
     (bukan di tanah), jadi musuh terbang & musuh jauh sama mudah dikunci.
     Sasaran semasa "melekit" — ia kekal selagi kursor masih agak dekat,
     supaya bidikan tidak melompat-lompat antara musuh yang berhimpit. */
  /* Adakah ada dinding di antara kereta dan sasaran ini? Menggunakan prop
     yang sama yang menyekat peluru, jadi kunci tidak pernah memilih musuh
     yang memang tidak boleh ditembak. */
  hasSight(e) {
    const p = this.player;
    if (e.d.fly && e.y > 2.6) return true;          // benda terbang atas dinding
    const dx = e.x - p.x, dz = e.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const ux = dx / d, uz = dz / d;
    for (const o of this.world.props) {
      if (!o.alive || o.explosive) continue;
      if ((o.h || 2.6) < 1.2) continue;
      const ox = o.x - p.x, oz = o.z - p.z;
      const t = ox * ux + oz * uz;                  // unjuran pada garis bidikan
      if (t <= 0.5 || t >= d - (e.r + 0.5)) continue;
      const cx = ox - ux * t, cz = oz - uz * t;
      if (cx * cx + cz * cz < o.r * o.r * 0.7) return false;
    }
    return true;
  },

  /* Semua musuh yang sah untuk dikunci: dalam jarak senjata, hidup, dan
     dalam garis pandang. Disusun dari yang paling hampir. */
  lockables(maxDist) {
    const p = this.player, out = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > maxDist) continue;
      if (!this.hasSight(e)) continue;
      out.push({ e, d });
    }
    out.sort((a, b) => a.d - b.d);
    return out.map(o => o.e);
  },

  /* Kunci automatik: kekal pada sasaran semasa selagi ia sah, kalau tidak
     ambil yang paling hampir. Digunakan pada telefon di mana tiada tetikus. */
  autoLock(maxDist) {
    const list = this.lockables(maxDist);
    if (!list.length) { this.autoTgt = null; return null; }
    const cur = this.autoTgt;
    if (cur && list.includes(cur)) return cur;
    this.autoTgt = list[0];
    return this.autoTgt;
  },

  /* Butang TUKAR SASARAN: pusing ke sasaran sah yang seterusnya. */
  cycleLock() {
    let maxDist = 62;
    for (const sl of this.slots) if (sl) maxDist = Math.max(maxDist, Math.min(sl.st.range, 102));
    const list = this.lockables(maxDist);
    if (!list.length) { this.autoTgt = null; Sfx.deny(); return null; }
    const i = list.indexOf(this.autoTgt);
    this.autoTgt = list[(i + 1) % list.length];
    Sfx.tone(760, 0.09, 'square', 0.13, 1100);
    if (this.fx) this.fx.spark(this.autoTgt.x, this.autoTgt.y + this.autoTgt.h * 0.6, this.autoTgt.z,
      6, [1.6, 0.9, 0.4], { speed: 5, size: 0.3, life: 0.3 });
    return this.autoTgt;
  },

  pickTarget(maxDist) {
    const R = this.assistPx();
    if (R <= 0) return null;
    const p = this.player, md2 = maxDist * maxDist;
    const W = innerWidth, H = innerHeight;
    const cx = (Input.ndcX * 0.5 + 0.5) * W, cy = (-Input.ndcY * 0.5 + 0.5) * H;
    const scr = e => {
      v3.set(e.x, e.y + e.h * 0.5, e.z).project(this.camera);
      if (v3.z > 1) return Infinity;
      const sx = (v3.x * 0.5 + 0.5) * W, sy = (-v3.y * 0.5 + 0.5) * H;
      // musuh besar lebih mudah dikunci: tolak saiz badannya di skrin
      return Math.hypot(sx - cx, sy - cy) - (e.d.boss ? 60 : e.r * 10);
    };
    let best = null, bestD = R;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const px = e.x - p.x, pz = e.z - p.z;
      if (px * px + pz * pz > md2) continue;
      const d = scr(e);
      if (d < bestD) { bestD = d; best = e; }
    }
    const cur = this.lock;
    if (cur && !cur.dead && this.enemies.includes(cur) && cur !== best) {
      const dc = scr(cur);
      // kekal pada sasaran lama kecuali yang baru jelas lebih dekat dengan kursor
      if (dc < R * 1.5 && (!best || bestD > dc * 0.6 - 10)) return cur;
    }
    return best;
  },

  /* `los` = true: hanya sasaran dalam garis pandang (dinding menghalang) */
  nearestEnemy(x, z, range, exclude, los) {
    let best = null, bd = range;
    for (const e of this.enemies) {
      if (e.dead || (exclude && exclude.includes(e))) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd && (!los || this.losClear(x, z, e.x, e.z, e))) { bd = d; best = e; }
    }
    return best;
  },

  /* Jarak mendatar ke dinding/prop pertama di sepanjang sinar, atau maxD.
     Prop rendah (< y) dan prop "enemyOnly" (pemain boleh tembak melepasinya) dilangkau. */
  wallDist(ox, oz, dx, dz, maxD, y = 1.6) {
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l;
    let best = maxD;
    for (const o of this.world.props) {
      if (!o.alive || o.enemyOnly || (o.h || 2.6) < y) continue;
      const px = o.x - ox, pz = o.z - oz;
      const t = px * ux + pz * uz;
      if (t <= 0 || t - o.r > best) continue;
      const r = o.r * 0.85;
      const c2 = px * px + pz * pz - t * t;
      if (c2 > r * r) continue;
      const hit = t - Math.sqrt(r * r - c2);
      if (hit > 0 && hit < best) best = hit;
    }
    return best;
  },
  losClear(ax, az, bx, bz, e) {
    if (e && e.d && e.d.fly && e.y > 2.6) return true;     // benda terbang atas dinding
    const d = Math.hypot(bx - ax, bz - az);
    return this.wallDist(ax, az, bx - ax, bz - az, d, 1.2) >= d - ((e && e.r) || 1) - 0.5;
  },

  /* `thru` = senjata tembus dinding (Lance / Phase Rounds). Kalau tidak,
     sinar berhenti pada dinding pertama. */
  rayHit(ox, oy, oz, dx, dy, dz, maxD, pierce, thru) {
    if (!thru) {
      const hl = Math.hypot(dx, dz) || 1e-6;
      maxD = Math.min(maxD, this.wallDist(ox, oz, dx, dz, maxD * hl, oy) / hl);
    }
    const out = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const ex = e.x - ox, ey = (e.y + e.h * 0.5) - oy, ez = e.z - oz;
      const t = ex * dx + ey * dy + ez * dz;
      if (t < 0 || t > maxD) continue;
      const cx = ex - dx * t, cy = ey - dy * t, cz = ez - dz * t;
      const rr = Math.max(e.r, e.h * 0.35);
      if (cx * cx + cy * cy + cz * cz > rr * rr) continue;
      out.push({ e, d: t, p: { x: ox + dx * t, y: oy + dy * t, z: oz + dz * t } });
    }
    out.sort((a, b) => a.d - b.d);
    return out.slice(0, Math.max(1, pierce + 1));
  },

  clampToArena(e, r) {
    e.x = clamp(e.x, -HALF + r, HALF - r);
    e.z = clamp(e.z, -HALF + r, HALF - r);
  },

  avoidProps(e) {
    if (e.d.fly && e.y > 2.2) return;
    for (const o of this.world.props) {
      if (!o.alive) continue;
      const dx = e.x - o.x, dz = e.z - o.z;
      const rr = o.r + e.r * 0.8;
      const d = Math.hypot(dx, dz);
      if (d < rr && d > 0.001) { e.x = o.x + dx / d * rr; e.z = o.z + dz / d * rr; }
    }
  },

  /* ---------------- kamera & render ---------------- */
  shake(amt, dur) {
    this.shakeAmt = Math.max(this.shakeAmt, amt);
    this.shakeT = Math.max(this.shakeT, dur);
  },
  recoil(dx, dz, f) {
    const k = 0.1 / Math.max(1, this.activeSlots || 1);
    this.player.vx += dx * f * k;
    this.player.vz += dz * f * k;
  },

  updateCamera(dt, frozen) {
    const p = this.player;
    if (!p) return;
    // zum: roda tetikus (satu klik = 4m) atau PgUp/PgDn; jarak diingati antara sesi
    const zoomIn = Input.keys.PageUp, zoomOut = Input.keys.PageDown;
    const before = this.camDist;
    if (zoomIn) this.camDist -= 30 * dt;
    if (zoomOut) this.camDist += 30 * dt;
    if (!frozen && Input.wheel) this.camDist += Input.wheel * 4;
    this.camDist = clamp(this.camDist, 20, 78);
    if (this.camDist !== before) Save.d.camDist = Math.round(this.camDist);

    /* Senjata jarak jauh perlu melihat jauh. Kamera mengundur mengikut julat
       senjata TERPANJANG yang dipasang, jadi Longshot Rifle dan Gauss Rail
       dapat pandangan penembak tepat manakala senjata jarak dekat kekal
       seperti biasa. Pada telefon ini automatik sepenuhnya - tiada roda
       tetikus di situ - dengan pelaras dalam Settings. */
    if (Touch.on && this.slots) {
      let r = 0;
      for (const sl of this.slots) if (sl) r = Math.max(r, sl.st.range);
      /* Di bawah ~40m tiada perubahan - senjata jarak dekat kekal normal.
         Selepas itu kamera mengundur secara berkadar, jadi Longshot (200m)
         mendapat pandangan jauh sementara Breach Drill (26m) tidak. */
      const want = (34 + Math.max(0, r - 40) * 0.22) * (Save.d.zoomMul || 1);
      this.camDist = damp(this.camDist, clamp(want, 24, 92), 2.5, dt);
    }

/* Kamera TETAP: orientasinya tidak pernah berubah. Ia hanya mengekori
       kedudukan kereta (kiri/kanan/atas/bawah) dari sudut tinggi, jadi
       arah pandangan sentiasa sama dan tetikus bebas bergerak sendiri. */
    this.camYaw = 0;
    /* camIntro 0..1 merapatkan kamera semasa kira detik perlawanan pasukan
       supaya pemain nampak kereta sendiri. Ia TIDAK menyentuh camDist,
       kerana camDist disimpan ke Save setiap kali berubah. */
    const dist = this.camDist * (1 - (this.camIntro || 0) * 0.52);
    const h = dist * 0.95 + (p.y || 0) * 0.7;
    const back = dist * 0.5;
    const cx = p.x;
    const cz = p.z - back;

    v3.set(cx, h, cz);
    this.camera.position.lerp(v3, clamp(dt * (frozen ? 2 : 7.5), 0, 1));
    v3b.set(p.x, 0.9, p.z + 1.2);
    this.camera.lookAt(v3b);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmt * clamp(this.shakeT * 4, 0, 1);
      this.camera.position.x += rand(-a, a);
      this.camera.position.y += rand(-a, a) * 0.6;
      this.camera.position.z += rand(-a, a);
      this.camera.rotation.z += rand(-a, a) * 0.012;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
  },

  /* Penanda musuh: anak panah merah kecil di atas kepala musuh yang
     kelihatan, dan anak panah di tepi skrin untuk musuh di luar frame. */
  updateEnemyMarks() {
    const mk = this.enemyMarks;
    if (!mk) return;
    const cam = this.camera, d = this._mkDummy;
    const off = [];
    let n = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      v3.set(e.x, e.y + e.h + 1.1, e.z);
      v3b.copy(v3).project(cam);
      const inside = v3b.z < 1 && Math.abs(v3b.x) < 0.98 && Math.abs(v3b.y) < 0.96;
      if (inside) {
        if (n < 220) {
          d.position.copy(v3);
          d.quaternion.copy(cam.quaternion);          // sentiasa menghadap kamera
          const s = e.d.boss ? 2.6 : e.maxHp > 200 ? 1.7 : 1.15;
          d.scale.set(s, s, s);
          d.updateMatrix();
          mk.setMatrixAt(n++, d.matrix);
        }
      } else if (off.length < 16) {
        let nx = v3b.x, ny = v3b.y;
        if (v3b.z > 1) { nx = -nx; ny = -ny; }        // di belakang kamera
        off.push({ a: Math.atan2(ny, nx), d: Math.hypot(e.x - this.player.x, e.z - this.player.z), boss: !!e.d.boss });
      }
    }
    mk.count = n;
    mk.instanceMatrix.needsUpdate = true;
    off.sort((a, b) => a.d - b.d);
    UI.setEdgeArrows(off);
  },

  renderHordes() {
    for (const k in this.hordes) this.hordes[k].begin();
    for (const e of this.enemies) {
      const h = e.d.horde;
      if (h && this.hordes[h]) this.hordes[h].push(e, this.time);
    }
    for (const k in this.hordes) this.hordes[k].end();
  },

  renderBullets() {
    if (!this.tracer) {
      const tg = new THREE.BoxGeometry(1, 1, 1);
      const tm = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      this.tracer = new THREE.InstancedMesh(tg, tm, 700);
      this.tracer.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.tracer.frustumCulled = false;
      this.tracer.setColorAt(0, new THREE.Color(1, 1, 1));
      this.scene.add(this.tracer);
      const og = new THREE.SphereGeometry(1, 10, 8);
      this.orb = new THREE.InstancedMesh(og, tm.clone(), 260);
      this.orb.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.orb.frustumCulled = false;
      this.orb.setColorAt(0, new THREE.Color(1, 1, 1));
      this.scene.add(this.orb);
      // peluru BINTANG (Mini Star): bintang lima bucu nipis yang berputar
      const ss = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.42 : 1; if (i) ss.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ss.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const sgeo = new THREE.ExtrudeGeometry(ss, { depth: 0.25, bevelEnabled: false }); sgeo.translate(0, 0, -0.125);
      this.starB = new THREE.InstancedMesh(sgeo, tm.clone(), 300);
      this.starB.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.starB.frustumCulled = false;
      this.starB.setColorAt(0, new THREE.Color(1, 1, 1));
      this.scene.add(this.starB);
      this._d = new THREE.Object3D();
      this._c = new THREE.Color();
    }
    const d = this._d, c = this._c;
    let n = 0, m = 0, k = 0;
    for (const b of this.bullets) {
      if (b.flame || b.glaive) continue;
      if (b.star) {
        if (k >= 300) continue;
        d.position.set(b.x, b.y, b.z);
        d.lookAt(b.x + b.vx, b.y + b.vy, b.z + b.vz);
        d.rotateZ(this.time * 14 + b.t * 3);
        d.scale.setScalar(0.32);
        d.updateMatrix();
        this.starB.setMatrixAt(k, d.matrix);
        c.setRGB(b.color[0], b.color[1], b.color[2]);
        this.starB.setColorAt(k, c);
        k++;
        continue;
      }
      const orb = b.rocket || b.kind === 'plasma' || b.kind === 'shell';
      const mesh = orb ? this.orb : this.tracer;
      const idx = orb ? m : n;
      if (orb ? m >= 260 : n >= 700) continue;
      d.position.set(b.x, b.y, b.z);
      if (orb) {
        d.rotation.set(0, 0, 0);
        const s = b.size * (b.kind === 'plasma' ? 1 + Math.sin(this.time * 20 + b.t) * 0.12 : 1);
        d.scale.set(s, s, s * (b.rocket ? 2.2 : 1));
        if (b.rocket) d.lookAt(b.x + b.vx, b.y + b.vy, b.z + b.vz);
        m++;
      } else {
        d.lookAt(b.x + b.vx, b.y + b.vy, b.z + b.vz);
        d.rotation.copy(d.rotation);
        d.scale.set(b.size, b.size, b.len);
        n++;
      }
      d.updateMatrix();
      mesh.setMatrixAt(idx, d.matrix);
      c.setRGB(b.color[0], b.color[1], b.color[2]);
      mesh.setColorAt(idx, c);
    }
    this.tracer.count = n; this.orb.count = m; this.starB.count = k;
    this.starB.instanceMatrix.needsUpdate = true;
    if (this.starB.instanceColor) this.starB.instanceColor.needsUpdate = true;
    this.tracer.instanceMatrix.needsUpdate = true;
    this.orb.instanceMatrix.needsUpdate = true;
    if (this.tracer.instanceColor) this.tracer.instanceColor.needsUpdate = true;
    if (this.orb.instanceColor) this.orb.instanceColor.needsUpdate = true;
  },

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  },

  missionToast() {
    const n = Missions.takeDone();
    if (n) { UI.toast(n > 1 ? n + ' MISSIONS COMPLETE — CLAIM IN THE GARAGE' : 'MISSION COMPLETE — CLAIM IN THE GARAGE'); Sfx.buy(); }
  },

  /* ---------------- kawalan keadaan ---------------- */
  pause() {
    if (this.state !== 'play' && this.state !== 'countdown') return;
    this.prePause = this.state;
    this.state = 'pause';
    Sfx.engineSet(0, 0);
    UI.show('pause');
  },
  resume() {
    if (this.state !== 'pause' && this.state !== 'garage') return;
    this.state = this.prePause === 'countdown' ? 'countdown' : 'play';
    this.prePause = null;
    UI.show(null);
    UI.hudOn(true);
  },
  openGarage(fromMenu) {
    /* dari skrin Pause juga - kalau tidak keadaan kekal 'pause', butang Back
       garaj tidak berbuat apa-apa dan Play memulakan perlawanan BAHARU */
    if (this.state === 'play' || this.state === 'countdown' || this.state === 'pause') {
      if (this.state !== 'pause') this.prePause = this.state;
      this.state = 'garage'; Sfx.engineSet(0, 0);
    }
    UI.show('garage', fromMenu);
  },
  quitToMenu() {
    this.clearRun();
    this.state = 'menu';
    this.scene.background = null;
    this.scene.environment = null;
    this.scene.fog = null;
    if (this.tracer) { this.tracer.count = 0; this.orb.count = 0; }
    Save.save();
    UI.hudOn(false);
    UI.show('garage', true);        // tiada lagi menu tajuk: garaj ialah hab
    this.canvas.classList.remove('playing');
  },
};
// sistem 10 kereta & senjata baharu (systems2.js)
Object.assign(Game, SYS2);

/* Butang BACK telefon (dipanggil oleh MainActivity.kt). Pulangkan 'exit'
   hanya bila pemain berada di garaj utama di luar perlawanan - di tempat lain
   Back sentiasa kembali satu langkah, seperti butang Back dalam permainan. */
window.androidBack = () => {
  const on = id => document.getElementById(id) && document.getElementById(id).classList.contains('on');
  const click = id => { const b = document.getElementById(id); if (b) b.click(); return 'handled'; };
  const st = Game.state;
  if (st === 'play' || st === 'countdown') { Game.pause(); return 'handled'; }
  if (st === 'pause') { Game.resume(); return 'handled'; }
  if (st === 'respawn' || st === 'dying' || st === 'frozen') return 'handled';
  if (on('s-over')) return click('b-over-garage');
  if (on('s-help')) return click('b-help-back');
  if (on('s-settings')) return click('b-settings-back');
  if (on('s-modes')) return click('b-modes-back');
  if (document.getElementById('carview') && document.getElementById('carview').classList.contains('on')) {
    document.querySelector('#carview .cv-back').click(); return 'handled';
  }
  if (on('s-garage')) {
    if (UI.view && UI.view !== 'stage') { UI.go('stage'); return 'handled'; }
    if (UI.upOpen) { UI.upOpen = false; UI.renderStage(); return 'handled'; }
    if (st === 'garage' && Game.world) { Game.resume(); return 'handled'; }
  }
  return 'exit';
};

/* Bunyi dihentikan bila app/tab ke latar belakang - jimat bateri, tiada bunyi hantu */
document.addEventListener('visibilitychange', () => {
  try {
    const ctx = Sfx.ctx;
    if (!ctx) return;
    if (document.hidden) { if (Game.state === 'play' || Game.state === 'countdown') Game.pause(); ctx.suspend(); }
    else ctx.resume();
  } catch { /* tiada audio */ }
});

/* input global */
addEventListener('keydown', e => {
  if (e.code === 'Tab' && Game.team && Game.state === 'play') { e.preventDefault(); Game.team.fullBoard(true); return; }
  // butang rahsia mod pembangun: Ctrl + Alt + D
  // (Ctrl+Shift+D tidak boleh digunakan — itu pintasan Chrome)
  if (e.code === 'KeyD' && e.ctrlKey && e.altKey) {
    e.preventDefault();
    const on = Econ.toggleDev();
    UI.syncDev();
    UI.toast(on ? 'DEVELOPER MODE: ON — unlimited money' : 'DEVELOPER MODE: OFF');
    UI.syncHud(Game);
    if (UI.tab) UI.renderGarage();
    Sfx.buy();
    return;
  }
  if (e.code === 'Escape') {
    if (Game.state === 'play') Game.pause();
    else if (Game.state === 'pause') Game.resume();
    else if (Game.state === 'garage') { if (Game.world) Game.resume(); }
  }
  if (e.code === 'KeyB' && (Game.state === 'play' || Game.state === 'garage')) {
    if (Game.state === 'play') Game.openGarage(false); else Game.resume();
  }
  if (e.code === 'Enter' && Game.state === 'play' && Game.intermission > 0.4) {
    Game.intermission = 0.15;
  }
});

try {
  Game.init();
  window.Game = Game;
  window.UI = UI;
  window.Save = Save;
  Touch.init();                  // hidup sendiri pada peranti sentuh sahaja
  window.Input = Input;          // diperlukan oleh harness ujian tanpa kepala
  window.Touch = Touch;
  // jadual mentah, digunakan oleh penjana REFERENCE.txt dan harness ujian
  window.DB = { WEAPONS, CARS, ABILITY, weaponStats, slotMulOf };
} catch (err) {
  if (window.__fatal) window.__fatal('ERROR DURING STARTUP', [err && err.message, err && err.stack]);
  else throw err;
}

addEventListener('keyup', e => {
  if (e.code === 'Tab' && Game.team) Game.team.fullBoard(false);
});

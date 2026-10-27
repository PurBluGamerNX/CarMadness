// core.js — matematik, input, bunyi, simpanan
export const TAU = Math.PI * 2, PI = Math.PI;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function damp(a, b, l, dt) { return lerp(a, b, 1 - Math.exp(-l * dt)); }
export function rand(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
export function pick(a) { return a[(Math.random() * a.length) | 0]; }
export function chance(p) { return Math.random() < p; }
export function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; }
export function turnTo(a, b, s) { return a + clamp(angDiff(a, b), -s, s); }
export function fmt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
export function roman(n) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n - 1] || n; }

/* ---------------- Input ---------------- */
export const Input = {
  keys: Object.create(null),
  pressed: Object.create(null),
  mx: 0, my: 0, ndcX: 0, ndcY: 0,
  down: false, rdown: false, wheel: 0,
  /* Paksi analog daripada kayu bedik sentuh. null = tiada input sentuh,
     jadi papan kekunci mengambil alih seperti biasa. */
  axMag: null,        // 0..1 sejauh mana kayu bedik ditolak
  axHead: null,       // arah dunia yang dituju (radian)
  init(el) {
    addEventListener('keydown', e => {
      const k = e.code;
      // Kombinasi dengan Ctrl/Alt/Meta ialah pintasan — jangan kira kekunci itu
      // sebagai "ditekan", kalau tidak ia tersangkut (tiada keyup akan tiba).
      const modKey = /^(Control|Alt|Meta|Shift)/.test(k);
      if ((e.ctrlKey || e.altKey || e.metaKey) && !modKey) { this.keys[k] = false; return; }
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      if (['Space', 'Tab', 'KeyR', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = Object.create(null); this.down = false; });
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      this.mx = e.clientX - r.left; this.my = e.clientY - r.top;
      this.ndcX = (this.mx / r.width) * 2 - 1;
      this.ndcY = -(this.my / r.height) * 2 + 1;
    });
    el.addEventListener('mousedown', e => { if (e.button === 0) this.down = true; if (e.button === 2) this.rdown = true; });
    addEventListener('mouseup', e => { if (e.button === 0) this.down = false; if (e.button === 2) this.rdown = false; });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  },
  hit(code) { const v = !!this.pressed[code]; return v; },
  endFrame() { this.pressed = Object.create(null); this.wheel = 0; },
};

/* ---------------- Bunyi (WebAudio sintetik) ---------------- */
export const Sfx = {
  ctx: null, master: null, noiseBuf: null, budget: 0, vol: 0.7, muted: false,
  engine: null, engGain: null, engFilter: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 8;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    const n = this.ctx.sampleRate * 1.2, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; },
  frame() { this.budget = 16; },
  ok() { if (!this.ctx || this.muted) return false; if (this.budget-- <= 0) return false; return true; },
  tone(f, dur, type = 'square', vol = 0.3, slide = null, delay = 0) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, freq = 1400, q = 1, delay = 0, type = 'lowpass') {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = rand(0.8, 1.2);
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  /* Fist: setiap tumbukan berturut-turut berbunyi lebih berat supaya pemain
     dengar sendiri bila tumbukan penghabisan sudah bersedia. */
  fist(step, total) {
    const k = total > 1 ? step / (total - 1) : 0;
    this.tone(120 - k * 50, 0.18 + k * 0.2, 'square', 0.2 + k * 0.2, 34 - k * 12);
    this.noise(0.18 + k * 0.24, 0.3 + k * 0.25, 900 - k * 380, 0.9);
    if (k > 0.5) this.tone(58, 0.4, 'sine', 0.26, 24, 0.03);
    if (k >= 0.99) this.noise(0.4, 0.3, 300, 0.7, 0.05);
  },

  shoot(kind) {
    switch (kind) {
      case 'mg': this.noise(0.09, 0.32, 2600, 1.2); this.tone(rand(180, 230), 0.07, 'square', 0.16, 70); break;
      case 'smg': this.noise(0.05, 0.22, 3400, 1.1); this.tone(rand(260, 320), 0.04, 'square', 0.1, 120); break;
      case 'shotgun': this.noise(0.22, 0.5, 1500, 0.8); this.tone(90, 0.2, 'sawtooth', 0.2, 40); break;
      case 'minigun': this.noise(0.06, 0.28, 3000, 1.4); this.tone(rand(150, 190), 0.05, 'square', 0.12, 60); break;
      case 'rocket': this.noise(0.5, 0.35, 900, 0.7); this.tone(140, 0.4, 'sawtooth', 0.18, 50); break;
      case 'flame': this.noise(0.22, 0.14, 700, 0.6); break;
      case 'laser': this.tone(900, 0.1, 'sine', 0.1, 1500); break;
      case 'juhag': this.tone(rand(1500, 1650), 0.05, 'sawtooth', 0.08, 2400); this.noise(0.03, 0.12, 5200, 1.6); break;
      case 'arbog': this.tone(760, 0.08, 'square', 0.13, 760); break;     // "tut"
      case 'lash': this.noise(0.3, 0.22, 5200, 2.2); this.tone(420, 0.25, 'sawtooth', 0.1, 1300); break;   // desis ular
      case 'diamond': this.tone(rand(1250, 1400), 0.13, 'sawtooth', 0.09, 260); this.tone(rand(2600, 2800), 0.05, 'sine', 0.05, 900); break;   // "pew" blaster
      case 'gale': this.noise(0.35, 0.34, 700, 0.9, 0, 'bandpass'); this.tone(110, 0.25, 'sine', 0.2, 55); break;   // hembusan udara
      case 'spine': this.tone(90, 0.3, 'square', 0.22, 45); this.noise(0.3, 0.35, 900, 1); break;
      case 'maul': this.tone(55, 0.4, 'square', 0.32, 28); this.noise(0.5, 0.5, 500, 0.7); break;
      case 'javelin': this.noise(0.25, 0.3, 3000, 1.5); this.tone(260, 0.2, 'sawtooth', 0.12, 90); break;
      case 'glaive': this.noise(0.3, 0.22, 6000, 3, 0, 'bandpass'); this.tone(900, 0.25, 'triangle', 0.08, 500); break;
      case 'stinger': this.tone(rand(1100, 1300), 0.05, 'square', 0.08, 2000); this.noise(0.05, 0.12, 4000, 2); break;
      case 'lantern': this.tone(440, 0.4, 'sine', 0.14, 880); this.noise(0.3, 0.12, 2000, 1); break;
      case 'chime': this.tone(rand(880, 1320), 0.35, 'sine', 0.12, null); this.tone(1760, 0.2, 'sine', 0.05, null, 0.02); break;
      case 'fork': this.tone(rand(1300, 1500), 0.08, 'sawtooth', 0.1, 600); this.noise(0.06, 0.15, 5000, 3); break;
      case 'rime': this.noise(0.2, 0.4, 6000, 1.2, 0, 'highpass'); this.tone(1600, 0.15, 'triangle', 0.1, 2600); break;
      case 'fence': this.tone(300, 0.12, 'square', 0.12, 1200); this.noise(0.1, 0.15, 3000, 2); break;
      case 'nettle': for (let i = 0; i < 3; i++) this.tone(300 + i * 140, 0.12, 'sine', 0.1, 700 + i * 160, i * 0.05); break;  // gelembung
      case 'tesla': this.noise(0.18, 0.3, 4200, 6); this.tone(1200, 0.12, 'sawtooth', 0.12, 300); break;
      case 'rail': this.tone(1600, 0.45, 'sawtooth', 0.3, 120); this.noise(0.4, 0.35, 2200, 2); break;
      // --- bunyi tersendiri bagi setiap keluarga senjata ---
      case 'nail': this.noise(0.04, 0.2, 5200, 2.5); this.tone(rand(820, 960), 0.05, 'square', 0.1, 300); break;
      case 'autoshot': this.noise(0.16, 0.42, 1200, 0.9); this.tone(rand(120, 150), 0.14, 'sawtooth', 0.16, 55); break;
      case 'sniper': this.tone(rand(90, 110), 0.3, 'sawtooth', 0.3, 34); this.noise(0.3, 0.5, 1700, 1.1);
        this.noise(0.5, 0.12, 400, 0.6, 0.06); break;
      case 'plasma': this.tone(rand(500, 600), 0.16, 'sine', 0.2, 110); this.noise(0.1, 0.16, 2200, 3); break;
      case 'acid': this.noise(0.24, 0.16, 420, 3.5, 0, 'bandpass'); this.tone(rand(180, 240), 0.1, 'sine', 0.05, 90); break;
      case 'swarm': for (let i = 0; i < 3; i++) this.noise(0.3, 0.16, 1500, 0.8, i * 0.05);
        this.tone(320, 0.32, 'triangle', 0.1, 900); break;
      case 'arc': this.noise(0.1, 0.3, 5600, 9); this.tone(rand(1400, 1800), 0.07, 'square', 0.09, 700); break;
      case 'cryo': this.noise(0.22, 0.13, 3600, 1.4, 0, 'highpass'); this.tone(1500, 0.2, 'sine', 0.07, 2400); break;
      case 'pulse': this.tone(rand(700, 820), 0.07, 'triangle', 0.14, 260); this.noise(0.05, 0.1, 3000, 2); break;
      case 'shard': this.tone(rand(1500, 1900), 0.1, 'triangle', 0.12, 700); this.noise(0.06, 0.16, 6000, 4); break;
      case 'harpoon': this.tone(70, 0.26, 'square', 0.3, 34); this.noise(0.18, 0.4, 900, 1.4);
        this.tone(1800, 0.3, 'sine', 0.06, 900, 0.03); break;
      case 'blaze': this.noise(0.3, 0.42, 800, 0.8); this.tone(110, 0.28, 'sawtooth', 0.2, 44); break;
      case 'frost': this.noise(0.28, 0.3, 700, 1.1); this.tone(900, 0.3, 'sine', 0.08, 220); break;
      case 'venom': this.noise(0.26, 0.34, 520, 2.4, 0, 'bandpass'); this.tone(150, 0.2, 'sawtooth', 0.12, 60); break;
      case 'mortar': this.tone(58, 0.42, 'sine', 0.36, 26); this.noise(0.36, 0.34, 300, 0.7); break;
      case 'disruptor': this.tone(rand(600, 760), 0.16, 'square', 0.14, 1600); this.noise(0.14, 0.22, 3400, 5); break;
      case 'gatling': this.tone(rand(1000, 1200), 0.07, 'sawtooth', 0.11, 420); this.noise(0.06, 0.18, 4200, 2.6); break;
      case 'annihilator': this.tone(2200, 0.55, 'sawtooth', 0.34, 70); this.noise(0.5, 0.4, 1500, 1.6);
        this.tone(60, 0.6, 'sine', 0.3, 25, 0.05); break;
      case 'repulsor': this.tone(44, 0.4, 'sine', 0.38, 20); this.noise(0.3, 0.3, 240, 0.7);
        this.tone(200, 0.3, 'triangle', 0.12, 60); break;
      case 'buzzsaw': this.tone(rand(230, 280), 0.34, 'sawtooth', 0.2, 150); this.noise(0.3, 0.2, 2600, 6); break;
      case 'hive': this.tone(190, 0.2, 'square', 0.2, 90); this.noise(0.2, 0.24, 1100, 1);
        this.tone(1200, 0.22, 'triangle', 0.08, 1900, 0.08); break;
      case 'singularity': this.tone(700, 0.75, 'sine', 0.26, 48); this.noise(0.6, 0.18, 320, 1.2); break;
      case 'tether': this.tone(rand(320, 380), 0.12, 'sawtooth', 0.09, 150); this.noise(0.1, 0.1, 900, 3); break;
      case 'lance': this.tone(1800, 0.3, 'sine', 0.22, 620); this.noise(0.26, 0.3, 2600, 2.2); break;
      case 'volley': this.tone(rand(540, 620), 0.12, 'square', 0.16, 240);
        this.noise(0.12, 0.26, 2800, 1.6); break;
      case 'drain': this.tone(rand(150, 190), 0.14, 'sine', 0.12, 70); this.noise(0.12, 0.12, 600, 2.4); break;
      case 'shocklance': this.noise(0.12, 0.26, 4800, 7); this.tone(rand(240, 300), 0.1, 'square', 0.1, 180); break;
      case 'phase': this.tone(rand(880, 1020), 0.08, 'triangle', 0.13, 420); this.noise(0.05, 0.12, 5200, 3); break;
      case 'huntershell': this.tone(64, 0.4, 'sine', 0.34, 28); this.noise(0.34, 0.3, 360, 0.8);
        this.tone(1400, 0.3, 'triangle', 0.08, 2200, 0.06); break;
      case 'net': this.noise(0.22, 0.28, 1800, 1.3); this.tone(420, 0.2, 'square', 0.12, 130); break;
      case 'drill': this.tone(rand(120, 160), 0.16, 'sawtooth', 0.2, 90); this.noise(0.14, 0.24, 1400, 4); break;
      case 'flak': this.noise(0.14, 0.4, 1900, 1.2); this.tone(rand(200, 260), 0.12, 'square', 0.16, 80); break;
      case 'fist': this.tone(rand(90, 110), 0.2, 'square', 0.26, 40); this.noise(0.2, 0.36, 700, 0.9); break;
      case 'waterjet': this.noise(0.22, 0.2, 1500, 0.7, 0, 'bandpass'); this.tone(rand(180, 260), 0.1, 'sine', 0.06, 90); break;
      case 'windcharge': this.noise(0.3, 0.34, 2600, 0.5, 0, 'highpass'); this.tone(rand(300, 420), 0.2, 'sine', 0.1, 900); break;
      case 'amber': this.noise(0.26, 0.3, 700, 0.9); this.tone(rand(90, 130), 0.2, 'sawtooth', 0.12, 50); break;
      case 'flair': this.noise(0.12, 0.16, 1500, 0.7); this.tone(rand(380, 460), 0.14, 'triangle', 0.08, 900); break;   // Flair: desis + nada naik
      case 'wily': this.noise(0.2, 0.22, 900, 1.6, 0, 'bandpass'); this.tone(rand(150, 210), 0.14, 'triangle', 0.12, 70); break;
      default: this.noise(0.08, 0.25, 2400, 1);
    }
  },
  charge() { this.tone(160, 0.75, 'sawtooth', 0.14, 1300); },
  boom(scale = 1) {
    this.noise(0.55 * scale, 0.6, 420 / scale, 0.7);
    this.noise(0.9 * scale, 0.3, 150, 0.5, 0.03);
    this.tone(90 / scale, 0.5 * scale, 'sine', 0.35, 28);
  },
  hit() { this.noise(0.05, 0.16, 3000, 2); },
  flesh() { this.noise(0.12, 0.2, 500, 1.4); this.tone(rand(70, 110), 0.1, 'sawtooth', 0.12, 40); },
  hurt() { this.noise(0.25, 0.4, 320, 0.9); this.tone(150, 0.25, 'sawtooth', 0.22, 60); },
  pickup() { this.tone(660, 0.1, 'sine', 0.2); this.tone(990, 0.12, 'sine', 0.18, null, 0.07); },
  coin() { this.tone(1200, 0.06, 'triangle', 0.1); },
  ui(up = true) { this.tone(up ? 520 : 380, 0.07, 'triangle', 0.16); },
  buy() { this.tone(500, 0.08, 'triangle', 0.2); this.tone(760, 0.12, 'triangle', 0.18, null, 0.07); this.tone(1020, 0.16, 'triangle', 0.14, null, 0.15); },
  deny() { this.tone(180, 0.16, 'square', 0.16, 120); },
  wave() { this.tone(300, 0.5, 'sawtooth', 0.14, 450); this.tone(450, 0.6, 'sawtooth', 0.12, 620, 0.12); },
  alarm() { this.tone(420, 0.35, 'square', 0.16, 220); this.tone(420, 0.35, 'square', 0.16, 220, 0.4); },
  startEngine() {
    if (!this.ctx || this.engine) return;
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 55;
    o2.type = 'square'; o2.frequency.value = 27;
    f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 3;
    g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o.start(); o2.start();
    this.engine = o; this.engine2 = o2; this.engGain = g; this.engFilter = f;
  },
  stopEngine() {
    if (!this.engine) return;
    try { this.engine.stop(); this.engine2.stop(); } catch (e) { }
    this.engine = this.engine2 = null; this.engGain = null;
  },
  engineSet(rpm, load) {
    if (!this.engGain) return;
    const t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(42 + rpm * 90, t, 0.08);
    this.engine2.frequency.setTargetAtTime(21 + rpm * 45, t, 0.08);
    this.engFilter.frequency.setTargetAtTime(260 + rpm * 900, t, 0.1);
    this.engGain.gain.setTargetAtTime(this.muted ? 0 : (0.035 + load * 0.075), t, 0.12);
  },
};

/* ---------------- Simpanan ---------------- */
const KEY = 'kereta_tempur_v1';
export const Save = {
  d: null,
  def() {
    return {
      v: 4,
      coins: 0, scrap: 0,
      inv: { mg: 1 },          // bilangan unit setiap senjata yang dimiliki
      lv: { mg: 1 },
      loadout: { ranger: ['mg', null] },   // senjata setiap kereta
      perks: {},              // { idSenjata: [idPerk, ...] }
      pending: {},            // { idSenjata: {mark, opts:[3], rerolls, lockUntil} }
      cars: ['ranger'], car: 'ranger', carUp: { ranger: {} },   // naik taraf setiap kereta
      color: '#c8342c', best: {}, totalKills: 0,
      workshop: { t: Date.now(), stored: 0 },
      quality: 'med', vol: 0.7, muted: false, dev: false,
    };
  },
  load() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { raw = {}; }
    const migrated = raw.v !== 4;
    // migrasi versi 1 -> 2 (kredit jadi syiling, kereta jadi id)
    if (!raw.v || raw.v < 2) {
      if (raw.credits !== undefined && raw.coins === undefined) raw.coins = raw.credits;
      if (raw.car && typeof raw.car === 'object') { raw.carUp = raw.car; raw.car = 'ranger'; }
      delete raw.credits;
      raw.v = 2;
    }
    // migrasi versi 2 -> 3 (senjata & naik taraf jadi milik setiap kereta)
    if (raw.v < 3) {
      const cid = typeof raw.car === 'string' ? raw.car : 'ranger';
      raw.loadout = {};
      raw.loadout[cid] = Array.isArray(raw.equip) ? raw.equip.slice(0, 4) : ['mg', null];
      const up = raw.carUp;
      const flat = up && typeof up === 'object' && Object.values(up).some(v => typeof v === 'number');
      raw.carUp = {};
      raw.carUp[cid] = flat ? up : {};
      delete raw.equip;
      raw.v = 3;
    }
    // migrasi versi 3 -> 4 (senjata jadi unit fizikal yang boleh diulang)
    if (raw.v < 4) {
      const inv = {};
      const arr = Array.isArray(raw.owned) ? raw.owned : ['mg'];
      for (const id of arr) inv[id] = Math.max(1, inv[id] || 0);
      raw.inv = inv;
      delete raw.owned;
      raw.v = 4;
    }
    this.d = Object.assign(this.def(), raw);
    const d = this.d;
    if (!d.inv || typeof d.inv !== 'object') d.inv = {};
    if (!d.inv.mg) d.inv.mg = 1;
    if (!d.lv || typeof d.lv !== 'object') d.lv = {};
    if (!d.lv.mg) d.lv.mg = 1;
    if (!d.perks) d.perks = {};
    if (!d.pending) d.pending = {};
    if (!d.carUp || typeof d.carUp !== 'object') d.carUp = {};
    if (!d.loadout || typeof d.loadout !== 'object') d.loadout = {};
    // pastikan salinan senjata mencukupi untuk semua susunan tersimpan
    {
      const use = {};
      for (const cid in d.loadout) for (const id of d.loadout[cid] || []) if (id) use[id] = (use[id] || 0) + 1;
      for (const id in use) d.inv[id] = Math.max(d.inv[id] || 0, use[id]);
    }
    if (!Array.isArray(d.cars) || !d.cars.length) d.cars = ['ranger'];
    if (!d.car || typeof d.car !== 'string') d.car = 'ranger';
    if (!d.cars.includes(d.car)) d.cars.push(d.car);
    if (!d.workshop || typeof d.workshop !== 'object') d.workshop = { t: Date.now(), stored: 0 };
    if (typeof d.coins !== 'number' || !isFinite(d.coins)) d.coins = 0;
    if (typeof d.scrap !== 'number' || !isFinite(d.scrap)) d.scrap = 0;
    if (migrated) this.save();   // tulis semula supaya storan konsisten
    return d;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { } },
  reset() { this.d = this.def(); this.save(); },
};

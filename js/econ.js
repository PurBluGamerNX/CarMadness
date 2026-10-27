// econ.js — dua mata wang (Syiling & Skrap), bengkel harian, mod pembangun
import { Save, clamp, randInt, chance } from './core.js';
import { addXp } from './level.js';

export const DEV_COINS = 999999999;

/* ---------------- bengkel: 1500 skrap sehari, berhenti bila penuh ---------------- */
export const WORKSHOP_RATE = 1500;      // skrap / 24 jam
export const WORKSHOP_CAP = 1500;       // simpanan maksimum sebelum pengeluaran berhenti
const DAY = 24 * 60 * 60 * 1000;

export const Econ = {
  /* bacaan (mod pembangun memaparkan jumlah tak terhingga) */
  coins() { return Save.d.dev ? DEV_COINS : Save.d.coins; },
  scrap() { return Save.d.dev ? DEV_COINS : Save.d.scrap; },
  dev() { return !!Save.d.dev; },

  canPay(coin = 0, scrap = 0) {
    if (Save.d.dev) return true;
    return Save.d.coins >= coin && Save.d.scrap >= scrap;
  },
  pay(coin = 0, scrap = 0) {
    if (Save.d.dev) return true;
    if (!this.canPay(coin, scrap)) return false;
    Save.d.coins -= coin;
    Save.d.scrap -= scrap;
    Save.save();
    return true;
  },
  // noXp = true untuk wang jualan; selebihnya syiling yang DIPEROLEH turut menjadi XP (level.js)
  addCoins(n, noXp) { Save.d.coins = Math.max(0, Save.d.coins + n); if (!noXp) addXp(n); },
  addScrap(n) { Save.d.scrap = Math.max(0, Save.d.scrap + n); },

  /* ---------------- bengkel ---------------- */
  workshopTick() {
    const w = Save.d.workshop;
    const now = Date.now();
    if (!w.t || w.t > now) w.t = now;
    if (w.stored >= WORKSHOP_CAP) { w.t = now; return w; }   // penuh -> pengeluaran berhenti
    const made = (now - w.t) / DAY * WORKSHOP_RATE;
    if (made > 0.01) {
      w.stored = Math.min(WORKSHOP_CAP, w.stored + made);
      w.t = now;
    }
    return w;
  },
  workshopCollect() {
    const w = this.workshopTick();
    const n = Math.floor(w.stored);
    if (n <= 0) return 0;
    w.stored -= n;
    w.t = Date.now();
    this.addScrap(n);
    Save.save();
    return n;
  },
  // saat sehingga penuh (untuk paparan)
  workshopFullIn() {
    const w = this.workshopTick();
    if (w.stored >= WORKSHOP_CAP) return 0;
    return (WORKSHOP_CAP - w.stored) / WORKSHOP_RATE * DAY;
  },

  /* ---------------- jatuhan semasa bermain ---------------- */
  // Skrap: 10 / 20 / 30 rawak. Musuh besar jatuh lebih banyak ketulan.
  scrapDrop(def) {
    const tier = def.boss ? 3 : def.credit >= 55 ? 2 : def.credit >= 20 ? 1 : 0;
    const table = [[10, 10, 10, 20], [10, 20, 20, 30], [20, 30, 30, 30], [30, 30, 30, 30]];
    const t = table[tier];
    return t[randInt(0, t.length - 1)];
  },
  // Syiling: rawak di sekitar nilai asas musuh
  coinDrop(def) {
    const base = def.credit || 8;
    return Math.max(1, Math.round(base * (0.6 + Math.random() * 0.9)));
  },
  // berapa ketulan untuk dijatuhkan
  dropCount(def) {
    if (def.boss) return 12;
    if (def.credit >= 55) return 3;
    if (def.credit >= 20) return 2;
    return 1;
  },
  // peluang musuh kecil menjatuhkan skrap langsung (supaya tidak terlalu banyak objek)
  dropsScrap(def) {
    if (def.boss || def.credit >= 20) return true;
    return chance(0.55);
  },

  /* ---------------- mod pembangun ---------------- */
  toggleDev() {
    Save.d.dev = !Save.d.dev;
    Save.save();
    return Save.d.dev;
  },
};

/* ---------------- inventori senjata (unit fizikal) ---------------- */
export const Inv = {
  count(id) { return Save.d.inv[id] || 0; },
  // berapa unit sedang dipasang pada mana-mana kereta
  used(id) {
    let n = 0;
    for (const cid in Save.d.loadout) {
      for (const w of Save.d.loadout[cid] || []) if (w === id) n++;
    }
    return n;
  },
  free(id) { return this.count(id) - this.used(id); },
  add(id, n = 1) { Save.d.inv[id] = (Save.d.inv[id] || 0) + n; },
};

/* ---------------- jual balik ---------------- */
export const SELL_RATE = 0.5;        // 50% harga asal untuk senjata & kereta
export const SELL_UP_RATE = 0.4;     // 40% untuk naik taraf kereta yang hilang

export function sellPrice(price) {
  return Math.max(0, Math.round(price * SELL_RATE / 10) * 10);
}

export function fmtTime(ms) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

export { clamp };

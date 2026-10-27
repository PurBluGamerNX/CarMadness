// level.js — progres pemain LEVEL 1..10 (Nabil 2026-10-18).
// XP = syiling yang DIPEROLEH dalam permainan (perlawanan, gelombang, pungutan,
// misi). Jualan TIDAK memberi XP (Econ.addCoins(n, true)). Training tiada syiling,
// jadi tiada XP. Kereta dikunci ikut level: tidak boleh dibeli sebelum level
// pemain cukup. Kereta yang SUDAH dimiliki kekal boleh dipakai. Mod pembangun
// melangkau kunci.
import { Save } from './core.js';
import { CARS } from './cars.js';

export const MAX_LV = 10;
// XP_AT[L] = jumlah XP untuk SAMPAI ke level L
export const XP_AT = [0, 0, 1500, 4000, 8000, 13000, 19000, 26000, 35000, 46000, 60000];

export function xp() { return Math.max(0, Save.d.xp || 0); }
export function level(x = xp()) {
  let L = 1;
  while (L < MAX_LV && x >= XP_AT[L + 1]) L++;
  return L;
}
/* kemajuan ke level seterusnya: { lv, cur, need, k } */
export function progress() {
  const x = xp(), L = level(x);
  if (L >= MAX_LV) return { lv: L, cur: x - XP_AT[MAX_LV], need: 0, k: 1 };
  const a = XP_AT[L], b = XP_AT[L + 1];
  return { lv: L, cur: x - a, need: b - a, k: (x - a) / (b - a) };
}

/* level kereta: kereta berharga disusun ikut harga dan dibahagi rata ke 1..10 */
let REQ = null;
export function carLevel(id) {
  if (!REQ) {
    REQ = {};
    const priced = CARS.filter(c => c.price > 0).sort((a, b) => a.price - b.price);
    priced.forEach((c, i) => { REQ[c.id] = Math.min(MAX_LV, 1 + Math.floor(i * MAX_LV / priced.length)); });
    for (const c of CARS) if (!REQ[c.id]) REQ[c.id] = 1;
  }
  return REQ[id] || 1;
}
export function carLocked(c) {
  if (!c || Save.d.dev) return false;
  if ((Save.d.cars || []).includes(c.id)) return false;
  return carLevel(c.id) > level();
}

/* tambah XP; umum naik level sekali bagi setiap level baharu */
export function addXp(n) {
  if (!(n > 0)) return;
  const before = level();
  Save.d.xp = xp() + n;
  const after = level();
  if (after > before) {
    const fresh = CARS.filter(c => carLevel(c.id) === after).length;
    const msg = `LEVEL UP! You are now Level ${after}` + (fresh ? ` - ${fresh} new car${fresh > 1 ? 's' : ''} unlocked in the Car Store` : '');
    try { if (window.UI && window.UI.toast) window.UI.toast(msg); } catch (e) { }
  }
}

/* save lama tanpa XP: mula pada level kereta tertinggi yang sudah dimiliki,
   supaya progres sedia ada tidak hilang */
export function seedXp() {
  const d = Save.d;
  if (typeof d.xp === 'number' && isFinite(d.xp)) return;
  let top = 1;
  for (const id of d.cars || []) top = Math.max(top, carLevel(id));
  d.xp = XP_AT[top];
  Save.save();
}

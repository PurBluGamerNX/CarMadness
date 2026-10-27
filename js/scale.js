// scale.js — SATU skala nombor untuk pemain DAN bot (Nabil 2026-10-19, rujukan War Robots).
// HP kereta = HP asas kereta x hpScale(L), L = purata tahap senjata pemain. Bot memakai
// formula SAMA (kereta, tahap & armour sama) dan menembak dengan stat senjata sebenar.
// Paparan: semua HP & damage didarab U (unit paparan) supaya nombor besar seperti
// War Robots (tank ~100k pada tahap 10) - gameplay tidak berubah oleh U.
import { Save, fmt } from './core.js';

export const U = 5;           // unit paparan (tank paling tebal ~44k pada tahap 20)
const HPK = 5;                // HP asas -> HP perlawanan pada tahap 1 (~8s satu lawan satu)
// pertumbuhan DPS senjata ikut tahap (diukur: Ripper Gun sustainedDps lvL / lv1)
const GROW = [[1, 1], [3, 1.4], [5, 1.85], [8, 2.62], [10, 3.2], [15, 4.87], [20, 6.73]];
export function growth(L) {
  L = Math.max(1, Math.min(20, L || 1));
  for (let i = 1; i < GROW.length; i++) {
    const [a, ga] = GROW[i - 1], [b, gb] = GROW[i];
    if (L <= b) return ga + (gb - ga) * (L - a) / (b - a);
  }
  return GROW[GROW.length - 1][1];
}
export function hpScale(L) { return HPK * growth(L); }
/* purata tahap senjata yang dipasang pada kereta semasa (sama seperti bot team.js) */
export function playerL(carId) {
  const lo = (((Save.d.loadout || {})[carId || Save.d.car]) || []).filter(Boolean);
  const lvs = lo.map(id => (Save.d.lv || {})[id] || 1);
  return lvs.length ? lvs.reduce((a, b) => a + b, 0) / lvs.length : 1;
}
/* HP perlawanan sebenar (unit dalaman) untuk HP asas kereta pada tahap L */
export function matchHp(baseHp, L) { return baseHp * hpScale(L); }
/* nombor paparan */
export const dU = n => Math.round(n * U);
export const fU = n => fmt(Math.round(n * U));
/* pengganda damage ABILITY terhadap bot pasukan: HP bot naik dari skala lama (190+20L)
   ke skala baharu, jadi damage tetap ability mesti ikut supaya tidak jadi sia-sia */
export function abScale(L) { return hpScale(L) * 200 / (190 + 20 * Math.max(1, L)); }
/* HP paparan sebuah kereta: HP asas (tanpa/dengan naik taraf) x skala tahap senjata kereta itu
   (atau kereta semasa kalau kereta itu belum ada senjata) x U */
export function carHpShown(baseHp, carId) {
  const own = (((Save.d.loadout || {})[carId]) || []).some(Boolean);
  return fU(matchHp(baseHp, own ? playerL(carId) : playerL()));
}

// missions.js — misi harian & misi utama (ganjaran syiling + skrap)
import { Save } from './core.js';
import { Econ } from './econ.js';

/* Jenis yang dijejak:
   kill    : bunuh musuh (opsyen mode / kind)
   boss    : bunuh bos
   wave    : capai gelombang N dalam satu larian (nilai tertinggi, bukan kumulatif)
   ability : guna kebolehan kereta
   coins   : kutip syiling semasa bermain
   scrap   : kutip skrap semasa bermain
   upgrade : naikkan level senjata
   carup   : naik taraf kereta
   runs    : habiskan larian (menang / mati)                                  */

const MODE_NAME = { zombie: 'Zombie Outbreak', alien: 'Alien Invasion', war: 'War Mode', chaos: 'Doomsday', tdm: 'Team Deathmatch', beacon: 'Beacon Rush' };

// Misi utama: satu barisan tetap, ganjaran naik ikut kesukaran
export const MAIN = [
  { id: 'm1', type: 'kill', n: 50, name: 'First Blood', desc: 'Destroy 50 enemies', r: [400, 200] },
  { id: 'm2', type: 'wave', n: 3, name: 'Survivor', desc: 'Reach wave 3 in any mode', r: [500, 250] },
  { id: 'm3', type: 'upgrade', n: 3, name: 'Tinkerer', desc: 'Raise weapon levels 3 times', r: [400, 300] },
  { id: 'm4', type: 'kill', n: 150, mode: 'zombie', name: 'Undead Sweeper', desc: 'Destroy 150 enemies in Zombie Outbreak', r: [800, 400] },
  { id: 'm5', type: 'ability', n: 15, name: 'Hot Button', desc: 'Use your car ability 15 times', r: [600, 300] },
  { id: 'm6', type: 'wave', n: 5, name: 'Boss Hunter', desc: 'Reach wave 5 in any mode', r: [1000, 500] },
  { id: 'm7', type: 'boss', n: 1, name: 'Giant Slayer', desc: 'Destroy 1 boss', r: [1400, 700] },
  { id: 'm8', type: 'carup', n: 5, name: 'Mechanic', desc: 'Buy 5 car upgrades', r: [900, 400] },
  { id: 'm9', type: 'kill', n: 150, mode: 'alien', name: 'Bug Spray', desc: 'Destroy 150 enemies in Alien Invasion', r: [1100, 500] },
  { id: 'm10', type: 'kill', n: 150, mode: 'war', name: 'Frontline', desc: 'Destroy 150 enemies in War Mode', r: [1300, 600] },
  { id: 'm11', type: 'scrap', n: 3000, name: 'Scavenger', desc: 'Collect 3,000 scrap on the battlefield', r: [1200, 0] },
  { id: 'm12', type: 'wave', n: 8, name: 'Veteran', desc: 'Reach wave 8 in any mode', r: [2200, 1000] },
  { id: 'm13', type: 'coins', n: 10000, name: 'Payday', desc: 'Collect 10,000 coins on the battlefield', r: [2000, 800] },
  { id: 'm14', type: 'boss', n: 3, name: 'Titan Breaker', desc: 'Destroy 3 bosses', r: [3000, 1400] },
  { id: 'm15', type: 'upgrade', n: 25, name: 'Arms Dealer', desc: 'Raise weapon levels 25 times', r: [2500, 1200] },
  { id: 'm16', type: 'wave', n: 10, mode: 'war', name: 'War Hero', desc: 'Reach wave 10 in War Mode', r: [4000, 1800] },
  { id: 'm17', type: 'kill', n: 1500, name: 'Wrecking Crew', desc: 'Destroy 1,500 enemies', r: [4000, 2000] },
  { id: 'm18', type: 'wave', n: 12, name: 'Unbreakable', desc: 'Reach wave 12 in any mode', r: [5000, 2500] },
  { id: 'm19', type: 'boss', n: 8, name: 'Apex', desc: 'Destroy 8 bosses', r: [6000, 3000] },
  { id: 'm21', type: 'teamwin', n: 1, name: 'Squad Up', desc: 'Win a Team Battle (5v5)', r: [800, 400] },
  { id: 'm22', type: 'teamwin', n: 10, name: 'Commander', desc: 'Win 10 Team Battles', r: [5000, 2500] },
  { id: 'm20', type: 'wave', n: 15, mode: 'chaos', name: 'Doomsday Clock', desc: 'Reach wave 15 in Doomsday', r: [8000, 4000] },
];

// Templat misi harian: 3 dipilih setiap hari
const DAILY_POOL = [
  { type: 'kill', n: 120, name: 'Daily Cleanup', desc: 'Destroy 120 enemies', r: [450, 250] },
  { type: 'kill', n: 80, mode: 'zombie', name: 'Zombie Patrol', desc: 'Destroy 80 enemies in Zombie Outbreak', r: [400, 250] },
  { type: 'kill', n: 80, mode: 'alien', name: 'Alien Patrol', desc: 'Destroy 80 enemies in Alien Invasion', r: [450, 250] },
  { type: 'kill', n: 60, mode: 'war', name: 'War Patrol', desc: 'Destroy 60 enemies in War Mode', r: [500, 300] },
  { type: 'wave', n: 4, name: 'Hold the Line', desc: 'Reach wave 4 in one run', r: [400, 200] },
  { type: 'wave', n: 6, name: 'Long Haul', desc: 'Reach wave 6 in one run', r: [650, 350] },
  { type: 'ability', n: 8, name: 'Show Off', desc: 'Use your car ability 8 times', r: [350, 200] },
  { type: 'coins', n: 1500, name: 'Collector', desc: 'Collect 1,500 coins on the battlefield', r: [400, 200] },
  { type: 'scrap', n: 800, name: 'Junk Run', desc: 'Collect 800 scrap on the battlefield', r: [450, 0] },
  { type: 'runs', n: 3, name: 'Back for More', desc: 'Finish 3 runs', r: [350, 250] },
  { type: 'upgrade', n: 2, name: 'Keep Improving', desc: 'Raise weapon levels twice', r: [300, 250] },
  { type: 'boss', n: 1, name: 'Boss of the Day', desc: 'Destroy 1 boss', r: [800, 400] },
  { type: 'teamwin', n: 1, name: 'Team Player', desc: 'Win a Team Battle (5v5)', r: [600, 350] },
  { type: 'kill', n: 15, mode: 'beacon', name: 'Beacon Brawler', desc: 'Destroy 15 enemy cars in Beacon Rush', r: [500, 300] },
];

const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

function state() {
  const d = Save.d;
  if (!d.missions || typeof d.missions !== 'object') d.missions = {};
  const m = d.missions;
  m.prog ||= {}; m.claimed ||= {};
  if (!m.daily || m.daily.day !== dayKey()) {
    // pilih 3 templat berbeza secara rawak (berbiji ikut tarikh supaya tetap sepanjang hari)
    let seed = [...dayKey()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    const pool = DAILY_POOL.map((t, i) => i);
    const pick = [];
    while (pick.length < 3) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    m.daily = { day: dayKey(), list: pick.map((i, k) => ({ ...DAILY_POOL[i], id: 'd' + k, prog: 0, claimed: false })) };
  }
  return m;
}

function matches(ms, type, mode) {
  return ms.type === type && (!ms.mode || ms.mode === mode);
}

export const Missions = {
  MODE_NAME,
  // dipanggil oleh permainan / garaj setiap kali sesuatu berlaku
  track(type, n = 1, mode = null, value = null) {
    if (!Save.d) return;
    const m = state();
    const bump = (ms, get, set) => {
      if (!matches(ms, type, mode)) return;
      const cur = get();
      if (cur >= ms.n) return;
      const nv = type === 'wave' ? Math.max(cur, value || 0) : cur + n;
      set(Math.min(ms.n, nv));
      if (cur < ms.n && nv >= ms.n) this._done = (this._done || 0) + 1;
    };
    for (const ms of MAIN) {
      if (m.claimed[ms.id]) continue;
      bump(ms, () => m.prog[ms.id] || 0, v => { m.prog[ms.id] = v; });
    }
    for (const ms of m.daily.list) {
      if (ms.claimed) continue;
      bump(ms, () => ms.prog, v => { ms.prog = v; });
    }
  },
  // senarai untuk paparan
  daily() { return state().daily.list; },
  main() {
    const m = state();
    return MAIN.map(ms => ({ ...ms, prog: m.prog[ms.id] || 0, claimed: !!m.claimed[ms.id] }));
  },
  claim(id) {
    const m = state();
    const d = m.daily.list.find(x => x.id === id);
    if (d) {
      if (d.claimed || d.prog < d.n) return null;
      d.claimed = true;
      Econ.addCoins(d.r[0]); Econ.addScrap(d.r[1]); Save.save();
      return d.r;
    }
    const ms = MAIN.find(x => x.id === id);
    if (!ms || m.claimed[id] || (m.prog[id] || 0) < ms.n) return null;
    m.claimed[id] = true;
    Econ.addCoins(ms.r[0]); Econ.addScrap(ms.r[1]); Save.save();
    return ms.r;
  },
  // bilangan misi siap yang belum dituntut (untuk lencana pada tab)
  ready() {
    const m = state();
    let n = m.daily.list.filter(x => !x.claimed && x.prog >= x.n).length;
    for (const ms of MAIN) if (!m.claimed[ms.id] && (m.prog[ms.id] || 0) >= ms.n) n++;
    return n;
  },
  // ambil & kosongkan kiraan misi yang baru siap (untuk toast semasa bermain)
  takeDone() { const n = this._done || 0; this._done = 0; return n; },
  msUntilReset() {
    const now = new Date(), t = new Date(now); t.setHours(24, 0, 0, 0);
    return t - now;
  },
};

// perks.js — 30 kuasa senjata; dipilih 3 rawak setiap kali naik Mark
import { pick, clamp, rand } from './core.js';

/* Setiap perk boleh mengubah statistik (stat) dan/atau memasang bendera (flag)
   yang dibaca semasa permainan (kritikal, bakar, rantai, dsb). */
export const PERKS = [
  { id: 'hollow', name: 'Hollow Point', desc: '+18% damage', cat: 'dmg', stat: s => { s.dmg *= 1.18; } },
  { id: 'overcharge', name: 'Overcharge', desc: '+34% damage, -10% fire rate', cat: 'dmg', stat: s => { s.dmg *= 1.34; s.rof *= 0.9; } },
  { id: 'rapidfeed', name: 'Rapid Feed', desc: '+22% fire rate', cat: 'rof', stat: s => { s.rof *= 1.22; } },
  { id: 'drum', name: 'Drum Magazine', desc: '+45% magazine', cat: 'mag', stat: s => { s.mag *= 1.45; } },
  { id: 'quickhands', name: 'Quick Hands', desc: '-32% reload time', cat: 'mag', stat: s => { s.reload *= 0.68; } },
  { id: 'piercer', name: 'Piercer Core', desc: '+1 pierce', cat: 'util', stat: s => { s.pierce += 1; } },
  { id: 'longbarrel', name: 'Long Barrel', desc: '+30% range', cat: 'util', stat: s => { s.range *= 1.3; } },
  { id: 'focusing', name: 'Focus Lens', desc: '+25% damage, -20% range', cat: 'dmg', stat: s => { s.dmg *= 1.25; s.range *= 0.8; } },
  { id: 'incendiary', name: 'Incendiary', desc: 'Enemies burn for 2.5s', cat: 'elem', flag: f => { f.burn = Math.max(f.burn || 0, 2.5); } },
  { id: 'cryo', name: 'Cryo Shards', desc: 'Enemies slowed for 2s', cat: 'elem', flag: f => { f.slow = Math.max(f.slow || 0, 2); } },
  { id: 'arcflow', name: 'Arc Flow', desc: '14% chance lightning jumps to another enemy', cat: 'elem', flag: f => { f.chain = (f.chain || 0) + 0.14; } },
  { id: 'critical', name: 'Weak Spot', desc: '20% chance of 2.5x damage', cat: 'dmg', flag: f => { f.critC = (f.critC || 0) + 0.2; f.critM = Math.max(f.critM || 2.5, 2.5); } },
  { id: 'executioner', name: 'Executioner', desc: '+60% damage to enemies under 25% HP', cat: 'dmg', flag: f => { f.exec = (f.exec || 0) + 0.6; } },
  { id: 'tankbuster', name: 'Tank Buster', desc: '+45% damage to big enemies', cat: 'dmg', flag: f => { f.big = (f.big || 0) + 0.45; } },
  { id: 'swarmclear', name: 'Swarm Clearer', desc: '+35% damage to small enemies', cat: 'dmg', flag: f => { f.small = (f.small || 0) + 0.35; } },
  { id: 'fragbolt', name: 'Frag Bolt', desc: 'Small blast on every hit', cat: 'aoe', flag: f => { f.frag = (f.frag || 0) + 0.45; } },
  { id: 'bigboom', name: 'Big Warhead', desc: '+35% blast radius', cat: 'aoe', stat: s => { s.splash *= 1.35; }, flag: f => { f.fragR = (f.fragR || 1) * 1.35; } },
  { id: 'ricochet', name: 'Ricochet', desc: 'Bullets bounce once to a nearby enemy', cat: 'util', flag: f => { f.bounce = (f.bounce || 0) + 1; } },
  { id: 'leech', name: 'Nano Leech', desc: '2% of damage becomes HP', cat: 'util', flag: f => { f.vamp = (f.vamp || 0) + 0.02; } },
  { id: 'scavenger', name: 'Scavenger', desc: '+30% scrap from kills', cat: 'econ', flag: f => { f.scrap = (f.scrap || 0) + 0.3; } },
  { id: 'goldplate', name: 'Gold Plated', desc: '+30% coins from kills', cat: 'econ', flag: f => { f.coin = (f.coin || 0) + 0.3; } },
  { id: 'heavyhit', name: 'Heavy Impact', desc: '+150% knockback', cat: 'util', stat: s => { s.knock *= 2.5; } },
  { id: 'stabilizer', name: 'Stabiliser', desc: '-45% spread', cat: 'util', stat: s => { s.spread *= 0.55; } },
  { id: 'twinshot', name: 'Twin Shot', desc: '+1 projectile per shot', cat: 'dmg', stat: s => { s.pellets += 1; s.dmg *= 0.88; } },
  { id: 'highvelocity', name: 'High Velocity', desc: '+40% projectile speed', cat: 'util', stat: s => { s.speed *= 1.4; } },
  { id: 'coolant', name: 'Cryo Coolant', desc: '-40% heat, +8% fire rate', cat: 'rof', stat: s => { s.rof *= 1.08; }, flag: f => { f.cool = 0.6; } },
  { id: 'turbocharged', name: 'Turbo Linked', desc: '+30% damage while nitro is active', cat: 'dmg', flag: f => { f.nitro = (f.nitro || 0) + 0.3; } },
  { id: 'berserker', name: 'Berserk', desc: '+30% fire rate below 40% HP', cat: 'rof', flag: f => { f.berserk = (f.berserk || 0) + 0.3; } },
  { id: 'lastround', name: 'Last Round', desc: '+70% damage on the last 20% of the mag', cat: 'dmg', flag: f => { f.last = (f.last || 0) + 0.7; } },
  // SATU-SATUNYA cara (selain Lance Rifle) untuk menembak menembusi dinding
  { id: 'phasewall', name: 'Phase Rounds', desc: 'Shots pass through walls and cover', cat: 'util', flag: f => { f.wallPierce = true; } },
  { id: 'breaker', name: 'Armour Breaker', desc: 'Target takes +22% damage for 3s', cat: 'util', flag: f => { f.mark = Math.max(f.mark || 0, 0.22); } },
];
export const PERK_BY = Object.fromEntries(PERKS.map(p => [p.id, p]));

export const MARK_COLOR = ['#8fa4b8', '#b06bff', '#ffc542', '#ff7a2f'];
export const MARK_NAME = ['MARK I', 'MARK II', 'MARK III', 'MARK IV'];

/* Gunakan senarai perk pada objek stat; pulangkan bendera masa-larian */
export function applyPerks(stats, ids) {
  const f = {};
  if (ids && ids.length) {
    for (const id of ids) {
      const p = PERK_BY[id];
      if (!p) continue;
      if (p.stat) p.stat(stats);
      if (p.flag) p.flag(f);
    }
  }
  stats.mag = Math.max(1, Math.round(stats.mag));
  stats.pierce = Math.round(stats.pierce);
  return f;
}

/* 3 pilihan rawak yang belum dimiliki senjata itu */
export function rollOptions(ownedIds) {
  const pool = PERKS.filter(p => !ownedIds.includes(p.id));
  const out = [];
  const src = pool.length >= 3 ? pool.slice() : PERKS.slice();
  while (out.length < 3 && src.length) {
    const i = (Math.random() * src.length) | 0;
    out.push(src[i].id);
    src.splice(i, 1);
  }
  return out;
}

/* Pendarab kerosakan masa-larian daripada bendera perk */
export function perkDamage(f, e, ctx) {
  if (!f) return 1;
  let m = 1;
  if (f.exec && e.hp / e.maxHp < 0.25) m += f.exec;
  if (f.big && e.maxHp >= 300) m += f.big;
  if (f.small && e.maxHp <= 90) m += f.small;
  if (f.nitro && ctx && ctx.nitro) m += f.nitro;
  if (f.last && ctx && ctx.lastRound) m += f.last;
  if (e.markT > 0) m += e.markAmt || 0;
  return m;
}

export function rollCrit(f) {
  if (!f || !f.critC) return 1;
  return Math.random() < f.critC ? (f.critM || 2.5) : 1;
}

export { pick, clamp, rand };

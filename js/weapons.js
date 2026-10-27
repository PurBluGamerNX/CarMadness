// weapons.js — data senjata, peringkat (stage), naik taraf & logik tembakan
import { clamp, rand, randInt, TAU, Sfx, pick } from './core.js';
import { applyPerks } from './perks.js';
import { fireCustom } from './weapons2.js';

export const MAX_LV = 20;          // 4 Mark x 5 tahap
export const PER_MARK = 5;
const GROW_SCALE = 0.5;            // pertumbuhan sekali naik tahap (20 tahap, bukan 5)
/* pengganda damage rebalance (diukur 2026-10-19, lihat weaponStats). >1 = buff, <1 = nerf.
   Nilai asal DPS lv20 1-sasaran dalam komen. */
const BAL = {
  waterjet: 0.15,   // 8345 - jauh melebihi semua (api x12/s, pierce 99)
  huntershell: 0.52, fist: 0.5,                  // 3810, 3778
  rime: 0.45, singularity: 0.42,                 // 3419, 3343 (senjata kawalan)
  flame: 0.7,                                    // 2816 murah & kawasan
  sniper: 0.68, lash: 0.66, chime: 0.68,         // 2827, 2587, 2361
  shard: 0.8, rocket: 0.74, stinger: 0.8, wily: 0.73, annihilator: 0.88,
  volley: 2.1, frost: 1.65, acid: 1.8, spine: 1.3, drain: 1.28,   // 568, 660, 724, 838, 861
  fork: 1.35, lance: 1.5, maul: 1.15, nail: 1.2, windcharge: 1.8,
};

export function markOf(lv) { return clamp(Math.ceil(lv / PER_MARK), 1, 4); }
// tahap 5, 10, 15 ialah pintu Mark: naik seterusnya dibayar dengan SYILING
export function isMarkGate(lv) { return lv % PER_MARK === 0 && lv < MAX_LV; }

/* dmg = per peluru | rof = tembakan/saat | mag = magazin | reload = saat
   grow = peratus tambahan setiap peringkat */
export const WEAPONS = [
  {
    id: 'mg', name: 'Ripper Gun', tag: 'BASIC', price: 0, color: [1.6, 1.1, 0.45], sfx: 'mg', type: 'proj',
    role: 'ALL-ROUNDER', vs: 'anything in the early waves', weak: 'heavy armour later on', modes: ['zombie', 'alien', 'war'],
    tip: 'Safe first pick. Cheap to level, never useless.',
    desc: 'The standard car-mounted gun. Balanced, accurate, never lets you down.',
    base: { dmg: 15, rof: 8.5, spread: 0.035, speed: 150, pellets: 1, mag: 50, reload: 1.35, knock: 3, pierce: 0, splash: 0, range: 120 },
    grow: { dmg: 0.26, rof: 0.07, mag: 0.24, reload: -0.08, spread: -0.1 },
    perks: { 6: 'Steel core: +1 pierce', 16: 'Incendiary rounds: +40% damage to burning enemies' },
  },
  {
    id: 'smg', name: 'Hornet Burst', tag: 'RAPID', price: 950, color: [1.5, 1.2, 0.7], sfx: 'smg', type: 'proj',
    role: 'CROWD', vs: 'packed hordes at close range', weak: 'armour and long range', modes: ['zombie'],
    tip: 'Scales harder than anything else when fully upgraded - the best scrap investment in the game.',
    desc: 'Insane fire rate, low damage. Great for dense crowds.',
    base: { dmg: 9, rof: 15, spread: 0.075, speed: 140, pellets: 1, mag: 45, reload: 1.15, knock: 2, pierce: 0, splash: 0, range: 90 },
    grow: { dmg: 0.24, rof: 0.04, mag: 0.1, reload: -0.08, spread: -0.12 },
    perks: { 6: 'Extended mag: +50% magazine', 16: 'Double feed: 2 bullets per shot' },
  },
  {
    id: 'shotgun', name: 'Scatter Gun', tag: 'CLOSE', price: 1500, color: [1.7, 1.0, 0.4], sfx: 'shotgun', type: 'proj',
    role: 'BRAWLER', vs: 'zombies right in your face', weak: 'flyers and distance', modes: ['zombie'],
    tip: 'Knockback buys you room when you get surrounded.',
    desc: 'Eight pellets per pull. Heavy knockback that shoves enemies away.',
    base: { dmg: 11, rof: 1.7, spread: 0.17, speed: 120, pellets: 8, mag: 8, reload: 2.1, knock: 16, pierce: 0, splash: 0, range: 55 },
    grow: { dmg: 0.25, rof: 0.1, mag: 0.25, reload: -0.1, knock: 0.15 },
    perks: { 6: 'Tight choke: -35% spread', 16: 'Dragon pellets: shots set enemies on fire' },
  },
  {
    id: 'minigun', name: 'Tempest Minigun', tag: 'HEAVY', price: 4200, color: [1.6, 1.15, 0.5], sfx: 'minigun', type: 'proj',
    role: 'SUSTAIN', vs: 'endless waves', weak: 'quick burst damage', modes: ['zombie', 'war'],
    tip: 'Needs a second to spin up - start firing before they arrive.',
    desc: 'Six spinning barrels. Needs a moment to spin up, then it rains lead.',
    base: { dmg: 12, rof: 24, spread: 0.1, speed: 160, pellets: 1, mag: 250, reload: 4.2, knock: 2, pierce: 0, splash: 0, range: 110 },
    grow: { dmg: 0.22, rof: 0.05, mag: 0.25, reload: -0.1, spread: -0.1 },
    perks: { 6: 'Torque motor: spins up 2x faster', 16: 'Reinforced barrels: +1 pierce' },
  },
  {
    id: 'rocket', name: 'Rocket Pod', tag: 'BLAST', price: 3600, color: [1.8, 0.9, 0.35], sfx: 'rocket', type: 'rocket',
    role: 'BLAST', vs: 'clumps of enemies', weak: 'fast single targets', modes: ['zombie', 'war'],
    tip: 'Do not fire it point blank - the splash reaches you.',
    desc: 'Medium-speed rockets with splash damage. Careful at close range.',
    base: { dmg: 75, rof: 1.15, spread: 0.02, speed: 62, pellets: 1, mag: 4, reload: 2.5, knock: 22, pierce: 0, splash: 7.5, range: 150 },
    grow: { dmg: 0.28, rof: 0.09, mag: 0.3, reload: -0.09, splash: 0.12 },
    perks: { 6: 'Bigger warhead: +25% blast radius', 16: 'Twin rockets: 2 rockets per shot' },
  },
  {
    id: 'flame', name: 'Flame Jet', tag: 'AREA', price: 2600, color: [1.8, 0.8, 0.2], sfx: 'flame', type: 'flame',
    role: 'AREA', vs: 'melee hordes walking into you', weak: 'ranged and flying enemies', modes: ['zombie'],
    tip: 'Burn keeps ticking after they leave the cone.',
    desc: 'A continuous cone of fire. Enemies keep burning after they leave it.',
    base: { dmg: 13, rof: 22, spread: 0.2, speed: 34, pellets: 1, mag: 260, reload: 2.6, knock: 1, pierce: 0, splash: 0, range: 17 },
    grow: { dmg: 0.26, rof: 0.04, mag: 0.28, reload: -0.08, range: 0.1 },
    perks: { 6: 'Pressurised fuel: +30% range', 16: 'Blue flame: 2x burn effect' },
  },
  {
    id: 'tesla', name: 'Storm Coil', tag: 'CHAIN', price: 5000, color: [0.5, 1.6, 2.0], sfx: 'tesla', type: 'chain',
    role: 'CHAIN', vs: 'dense packs', weak: 'lone bosses', modes: ['zombie', 'alien'],
    tip: 'The tighter the crowd, the more it does.',
    desc: 'Lightning jumps between enemies. The denser the crowd, the deadlier.',
    base: { dmg: 34, rof: 3.4, spread: 0, speed: 0, pellets: 1, mag: 26, reload: 2.0, knock: 5, pierce: 3, splash: 0, range: 34 },
    grow: { dmg: 0.27, rof: 0.08, mag: 0.26, reload: -0.08, pierce: 0.34 },
    perks: { 6: 'Capacitor: +1 jump', 16: 'High current: struck enemies are slowed' },
  },
  {
    id: 'laser', name: 'Prism Beam', tag: 'SUSTAINED', price: 5600, color: [0.5, 2.0, 1.6], sfx: 'laser', type: 'beam',
    role: 'SUSTAIN', vs: 'lines of enemies', weak: 'overheating in long fights', modes: ['alien', 'war'],
    tip: 'Watch the heat bar - let it cool before it locks.',
    desc: 'A sustained beam that cuts through ranks of enemies. Watch the heat.',
    base: { dmg: 130, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.4, knock: 0, pierce: 4, splash: 0, range: 78 },
    grow: { dmg: 0.55, rof: 0, mag: 0.2, reload: -0.1, pierce: 0.3 },
    perks: { 6: 'Heat sink: cools 60% faster', 16: 'Focus lens: +35% damage on a single target' },
  },
  {
    id: 'rail', name: 'Gauss Rail', tag: 'SNIPER', price: 7800, color: [2.2, 1.55, 0.4], sfx: 'rail', type: 'charge', sigCar: 'eg300',   // 2026-10-18: tuan = E-G300, warna ikut kereta (amber tentera)
    role: 'PRECISION', vs: 'bosses and packed lines', weak: 'crowds around you', modes: ['war'],
    tip: 'Charge it, release through the whole line.',
    desc: 'Charge first, then one shot punches through everything in front of you.',
    base: { dmg: 300, rof: 0.85, spread: 0, speed: 0, pellets: 1, mag: 5, reload: 2.6, knock: 30, pierce: 99, splash: 2.5, range: 190 },
    grow: { dmg: 0.21, rof: 0.1, mag: 0.25, reload: -0.1 },
    perks: { 6: 'Fast charge: -30% charge time', 16: 'Shockwave: small blasts along the path' },
  },
  {
    /* 2026-10-19 pusingan 2 (Nabil): bintang BESAR berpusing yang meluncur LEMBUT melengkung
       ke musuh (membelai), mengelak halangan sendiri. Logik: weapons2 'ministar' (spawnStar). */
    id: 'nail', name: 'Mini Star', tag: 'SEEKING STAR', price: 3400, color: [2.6, 2.1, 1.0], sfx: 'nail', type: 'proj', sigCar: 'crescent',
    custom: 'ministar',
    role: 'SEEKER', vs: 'enemies that hide behind cover', weak: 'enemies too fast to catch', modes: ['war', 'alien', 'zombie'],
    tip: 'Every star finds its own way: it glides around walls in a soft curve and spins into the enemy. Keep the trigger down and let them flow.',
    desc: 'Crescent\'s signature. Fires big spinning golden stars that glide toward the enemy in a soft, flowing curve, slipping around walls on their own before they strike.',
    base: { dmg: 45, rof: 3.5, spread: 0.4, speed: 42, pellets: 1, mag: 14, reload: 1.6, knock: 3, pierce: 0, splash: 0, range: 100 },
    grow: { dmg: 0.24, rof: 0.07, mag: 0.28, reload: -0.08 },
    perks: { 6: 'Sharper stars: each star passes through one enemy to the next', 16: 'Stars ricochet to a nearby enemy' },
  },
  {
    id: 'autoshot', name: 'Drum Scatter', tag: 'CLOSE', price: 4800, color: [1.7, 1.0, 0.45], sfx: 'autoshot', type: 'proj',
    role: 'BRAWLER', vs: 'thick melee crowds', weak: 'anything past 50m', modes: ['zombie', 'alien'],
    tip: 'Shotgun damage without the pauses. Stay moving.',
    desc: 'Automatic drum-fed shotgun. An endless rain of pellets.',
    base: { dmg: 8, rof: 3.6, spread: 0.2, speed: 120, pellets: 7, mag: 18, reload: 2.6, knock: 9, pierce: 0, splash: 0, range: 48 },
    grow: { dmg: 0.24, rof: 0.07, mag: 0.28, reload: -0.09, knock: 0.1 },
    perks: { 6: 'Barrel choke: -30% spread', 16: 'Incendiary pellets' },
  },
  {
    id: 'sniper', name: 'Longshot Rifle', tag: 'PRECISE', price: 5400, color: [1.8, 1.3, 0.6], sfx: 'sniper', type: 'proj',
    role: 'PRECISION', vs: 'bosses and lined-up enemies', weak: 'close swarms', modes: ['war', 'alien'],
    tip: 'Longest reach in the game. Pick targets before they close in.',
    desc: 'One high-power shot that punches through a line of enemies.',
    base: { dmg: 170, rof: 1.1, spread: 0, speed: 280, pellets: 1, mag: 6, reload: 2.4, knock: 18, pierce: 2, splash: 0, range: 200 },
    grow: { dmg: 0.3, rof: 0.1, mag: 0.25, reload: -0.1, pierce: 0.2 },
    perks: { 6: 'Penetrator core: +1 pierce', 16: 'Fragmenting round: small blast on the target' },
  },
  {
    id: 'plasma', name: 'Plasma Cannon', tag: 'BLAST', price: 6200, color: [0.7, 1.5, 2.3], sfx: 'plasma', type: 'proj', orb: true,
    role: 'BLAST', vs: 'groups at medium range', weak: 'fast flyers', modes: ['alien', 'war'],
    tip: 'Slower orbs, so lead your shots.',
    desc: 'Slow plasma orbs that detonate and scorch the ground.',
    base: { dmg: 58, rof: 2.2, spread: 0.03, speed: 75, pellets: 1, mag: 12, reload: 2.2, knock: 10, pierce: 0, splash: 5, range: 110 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.26, reload: -0.08, splash: 0.1 },
    perks: { 6: 'Dense core: +25% blast radius', 16: 'Twin plasma: 2 orbs per shot' },
  },
  {
    id: 'acid', name: 'Acid Jet', tag: 'AREA', price: 5200, color: [0.7, 1.9, 0.35], sfx: 'acid', type: 'flame',
    role: 'AREA', vs: 'tanky melee enemies', weak: 'ranged enemies', modes: ['zombie', 'alien'],
    tip: 'Corrosion out-damages fire against anything that survives a while.',
    desc: 'Green acid mist. Enemies keep corroding long after they leave the cone.',
    base: { dmg: 11, rof: 20, spread: 0.22, speed: 32, pellets: 1, mag: 240, reload: 2.6, knock: 1, pierce: 0, splash: 0, range: 19 },
    grow: { dmg: 0.26, rof: 0.04, mag: 0.28, reload: -0.08, range: 0.1 },
    perks: { 6: 'High pressure: +30% range', 16: 'Concentrated acid: 2x corrosion' },
  },
  {
    id: 'swarm', name: 'Swarm Pod', tag: 'HOMING', price: 7200, color: [1.6, 0.9, 1.9], sfx: 'swarm', type: 'rocket', homing: 2.6,
    role: 'HOMING', vs: 'flying drones and fast movers', weak: 'static armour', modes: ['alien'],
    tip: 'The missiles chase on their own - the answer to alien drones.',
    desc: 'Four small missiles that chase enemies on their own.',
    base: { dmg: 34, rof: 1.3, spread: 0.2, speed: 58, pellets: 4, mag: 12, reload: 2.6, knock: 6, pierce: 0, splash: 3.6, range: 120 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.26, reload: -0.08, splash: 0.1 },
    perks: { 6: 'Sharper seeker: tighter missile turns', 16: 'Six missiles per volley' },
  },
  {
    id: 'arc', name: 'Arc Projector', tag: 'CHAIN', price: 6400, color: [0.6, 1.9, 1.7], sfx: 'arc', type: 'chain',
    role: 'CHAIN', vs: 'packed enemies up close', weak: 'range', modes: ['zombie'],
    tip: 'Fast chains, short reach. A brawler chain gun.',
    desc: 'Short, rapid arcs that leap between packed enemies.',
    base: { dmg: 22, rof: 6, spread: 0, speed: 0, pellets: 1, mag: 40, reload: 2.0, knock: 3, pierce: 2, splash: 0, range: 26 },
    grow: { dmg: 0.25, rof: 0.07, mag: 0.26, reload: -0.08, pierce: 0.3 },
    perks: { 6: 'Capacitor: +1 jump', 16: 'High current: struck enemies are slowed' },
  },
  {
    id: 'cryo', name: 'Glacier Beam', tag: 'SLOW', price: 6800, color: [0.8, 1.85, 2.8], sfx: 'cryo', type: 'beam', sigCar: 'freezo',   // 2026-10-18: tuan = Freezo, biru krio (sama dengan Freezo)
    role: 'CONTROL', vs: 'anything that must be kept away', weak: 'burst damage', modes: ['zombie', 'war'],
    tip: 'Pair it with a heavy hitter in another slot.',
    desc: 'A freezing sustained beam that slows enemies to a crawl.',
    base: { dmg: 112, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.4, knock: 0, pierce: 3, splash: 0, range: 60 },
    grow: { dmg: 0.55, rof: 0, mag: 0.2, reload: -0.1, pierce: 0.3 },
    perks: { 6: 'Extra cooling: heat drops faster', 16: 'Deep freeze: nearly double the slow' },
  },
  {
    id: 'pulse', name: 'Pulse Blaster', tag: 'RAPID', price: 4400, color: [2.6, 0.55, 2.2], sfx: 'pulse', type: 'proj', orb: true, sigCar: 'conduit',   // 2026-10-18: tuan = Conduit, pink atom (sama dengan kereta)
    role: 'ALL-ROUNDER', vs: 'mixed groups at medium range', weak: 'heavy armour', modes: ['alien', 'zombie'],
    tip: 'Small blast on every bolt, so near misses still hurt.',
    desc: 'Fast little plasma bolts, each one bursting on impact.',
    base: { dmg: 24, rof: 5.2, spread: 0.05, speed: 115, pellets: 1, mag: 30, reload: 1.8, knock: 5, pierce: 0, splash: 2.2, range: 90 },
    grow: { dmg: 0.24, rof: 0.035, mag: 0.1, reload: -0.08, splash: 0.08 },
    perks: { 6: 'Tuned coils: +20% projectile speed', 16: 'Split bolt: 2 bolts per shot' },
  },
  {
    id: 'shard', name: 'Splinter Rifle', tag: 'PRECISE', price: 5000, color: [1.3, 1.5, 1.8], sfx: 'shard', type: 'proj',
    role: 'PRECISION', vs: 'rows at medium-long range', weak: 'heavy armour', modes: ['alien', 'war'],
    tip: 'Three piercing shards per shot - reward for lining things up.',
    desc: 'Fires three crystal shards that punch through several bodies.',
    base: { dmg: 26, rof: 2.6, spread: 0.06, speed: 220, pellets: 3, mag: 21, reload: 2.0, knock: 4, pierce: 2, splash: 0, range: 150 },
    grow: { dmg: 0.25, rof: 0.08, mag: 0.26, reload: -0.08, pierce: 0.18 },
    perks: { 6: 'Sharpened edge: +1 pierce', 16: 'Shatter: shards split on impact' },
  },
  {
    id: 'harpoon', name: 'Harpoon Gun', tag: 'IMPACT', price: 5800, color: [1.6, 1.4, 1.0], sfx: 'harpoon', type: 'proj',
    role: 'PRECISION', vs: 'brutes and chargers', weak: 'crowds', modes: ['zombie', 'war'],
    tip: 'Heavy knockback keeps big enemies off your bumper.',
    desc: 'A heavy spear that skewers a whole line and throws them back.',
    base: { dmg: 130, rof: 1.0, spread: 0, speed: 170, pellets: 1, mag: 6, reload: 2.3, knock: 45, pierce: 3, splash: 0, range: 130 },
    grow: { dmg: 0.28, rof: 0.09, mag: 0.25, reload: -0.09, knock: 0.12 },
    perks: { 6: 'Barbed head: +1 pierce', 16: 'Anchor: impaled enemies are slowed' },
  },
  {
    id: 'blaze', name: 'Ember Cannon', tag: 'BURN', price: 6600, color: [1.9, 0.9, 0.25], sfx: 'blaze', type: 'proj', orb: true,
    role: 'BLAST', vs: 'groups you want left burning', weak: 'single elites', modes: ['zombie'],
    tip: 'Blast plus burn - good value per shot.',
    desc: 'Incendiary shells that leave everything they touch on fire.',
    base: { dmg: 68, rof: 1.9, spread: 0.03, speed: 95, pellets: 1, mag: 10, reload: 2.2, knock: 12, pierce: 0, splash: 3.5, range: 110 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.26, reload: -0.08, splash: 0.1 },
    perks: { 6: 'Hotter mix: +30% burn damage', 16: 'Firestorm: +60% blast radius' },
  },
  {
    id: 'frost', sigCar: 'breeze', name: 'Hail Mortar', tag: 'SLOW', price: 7000, color: [1.05, 2.6, 2.8], sfx: 'frost', type: 'rocket',   // 2026-10-18: tuan = Breeze, sian (sama dengan Breeze)
    role: 'CONTROL', vs: 'chargers and brutes', weak: 'low HP swarms', modes: ['zombie', 'war'],
    tip: 'Slowing a brute is often better than damaging it.',
    desc: 'Freezing shells that chill everything inside the blast.',
    base: { dmg: 80, rof: 1.2, spread: 0.05, speed: 60, pellets: 1, mag: 8, reload: 2.4, knock: 10, pierce: 0, splash: 7, range: 120 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.26, reload: -0.08, splash: 0.1 },
    perks: { 6: 'Deeper chill: longer slow', 16: 'Glacier: +50% blast radius' },
  },
  {
    id: 'venom', name: 'Venom Lobber', tag: 'AREA', price: 7400, color: [0.8, 1.9, 0.4], sfx: 'venom', type: 'rocket',
    role: 'SIEGE', vs: 'armoured enemies', weak: 'fast swarms', modes: ['war', 'alien'],
    tip: 'Corrosion eats through tanks that shrug off bullets.',
    desc: 'Corrosive pods that splash acid and keep eating through armour.',
    base: { dmg: 64, rof: 1.6, spread: 0.05, speed: 66, pellets: 1, mag: 9, reload: 2.4, knock: 8, pierce: 0, splash: 5.5, range: 120 },
    grow: { dmg: 0.27, rof: 0.08, mag: 0.26, reload: -0.08, splash: 0.1 },
    perks: { 6: 'Thicker acid: +35% corrosion', 16: 'Plague pods: 2 pods per shot' },
  },
  {
    id: 'mortar', name: 'Siege Mortar', tag: 'BLAST', price: 8600, color: [1.8, 1.1, 0.4], sfx: 'mortar', type: 'rocket',
    role: 'SIEGE', vs: 'tight clusters and static targets', weak: 'anything fast', modes: ['war'],
    tip: 'Put the reticle near an enemy - the shell locks on, leads the target and steers as it falls.',
    desc: 'Lobbed siege shells that lock onto the enemy under the reticle, lead its movement and guide themselves down onto it. Very little survives the blast.',
    base: { dmg: 138, rof: 0.85, spread: 0.04, speed: 52, pellets: 1, mag: 5, reload: 2.6, knock: 30, pierce: 0, splash: 10.5, range: 140 },
    grow: { dmg: 0.3, rof: 0.09, mag: 0.26, reload: -0.09, splash: 0.12 },
    perks: { 6: 'Heavier shell: +25% blast radius', 16: 'Cluster round: 2 shells per shot' },
  },
  {
    id: 'disruptor', name: 'Disruptor Array', tag: 'CHAIN', price: 8000, color: [1.4, 0.7, 2.2], sfx: 'disruptor', type: 'chain',
    role: 'SUPPORT', vs: 'softening a group before your big gun', weak: 'nothing on its own', modes: ['war', 'alien'],
    tip: 'Marks what it hits so your other slots hit much harder.',
    desc: 'Chained energy that leaves every struck enemy exposed.',
    base: { dmg: 38, rof: 3.0, spread: 0, speed: 0, pellets: 1, mag: 24, reload: 2.1, knock: 6, pierce: 3, splash: 0, range: 36 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.26, reload: -0.08, pierce: 0.32 },
    perks: { 6: 'Wider net: +1 jump', 16: 'System crash: struck enemies take +25% damage' },
  },
  {
    id: 'gatling', name: 'Beam Gatling', tag: 'SUSTAINED', price: 9200, color: [1.6, 1.2, 0.5], sfx: 'gatling', type: 'beam',
    role: 'SUSTAIN', vs: 'a constant stream of enemies', weak: 'burst windows', modes: ['zombie', 'war'],
    tip: 'Cuts through crowds, but it runs hot fast.',
    desc: 'A spinning laser array that saws through crowds. Runs hot.',
    base: { dmg: 165, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.6, knock: 0, pierce: 5, splash: 0, range: 70 },
    grow: { dmg: 0.5, rof: 0, mag: 0.2, reload: -0.1, pierce: 0.3 },
    perks: { 6: 'Heat exchanger: cools far faster', 16: 'Overdrive array: +30% damage' },
  },
  {
    id: 'annihilator', name: 'Annihilator Beam', tag: 'SIEGE', price: 12000, color: [1.7, 0.6, 2.4], sfx: 'annihilator', type: 'charge',
    role: 'PRECISION', vs: 'bosses, tanks, anything huge', weak: 'small fast swarms', modes: ['war'],
    tip: 'Highest single hit in the game. Slow, so pick your moment.',
    desc: 'Charge it up and erase an entire section of the battlefield.',
    base: { dmg: 520, rof: 0.6, spread: 0, speed: 0, pellets: 1, mag: 4, reload: 3.0, knock: 40, pierce: 99, splash: 10, range: 180 },
    grow: { dmg: 0.19, rof: 0.1, mag: 0.24, reload: -0.1, splash: 0.1 },
    perks: { 6: 'Rapid capacitors: -30% charge time', 16: 'Total wipe: blasts along the whole beam' },
  },
  {
    id: 'repulsor', name: 'Shock Repulsor', tag: 'WAVE', price: 9800, color: [0.7, 1.5, 2.3], sfx: 'repulsor', type: 'wave',
    role: 'DEFENSIVE', vs: 'getting swarmed', weak: 'long range fights', modes: ['zombie'],
    tip: 'No travel time at all - it fires the instant you click.',
    desc: 'No projectile at all - a pressure wave that bursts outward and throws bodies back.',
    base: { dmg: 95, rof: 1.4, spread: 0, speed: 0, pellets: 1, mag: 10, reload: 2.2, knock: 40, pierce: 0, splash: 0, range: 22 },
    grow: { dmg: 0.27, rof: 0.08, mag: 0.26, reload: -0.09, range: 0.06 },
    perks: { 6: 'Wider arc: the wave covers much more ground', 16: 'Concussive: enemies hit are stunned' },
  },
  {
    id: 'buzzsaw', name: 'Ripsaw Thrower', tag: 'BOUNCE', price: 11000, color: [1.5, 1.5, 1.8], sfx: 'buzzsaw', type: 'proj', orb: true,
    role: 'TRICK', vs: 'fights near walls and cover', weak: 'open ground', modes: ['zombie', 'war'],
    tip: 'The blade bounces off walls and keeps cutting - use tight spaces.',
    desc: 'Throws a spinning blade that ricochets off walls and keeps cutting on the way.',
    base: { dmg: 60, rof: 1.5, spread: 0.02, speed: 85, pellets: 1, mag: 8, reload: 2.2, knock: 14, pierce: 99, splash: 0, range: 240 },
    grow: { dmg: 0.27, rof: 0.08, mag: 0.26, reload: -0.08 },
    perks: { 6: 'Hardened edge: +3 ricochets', 16: 'Twin blades: 2 saws per throw' },
  },
  {
    id: 'hive', name: 'Hive Pod', tag: 'DEPLOY', price: 9500, color: [0.9, 1.7, 0.6], sfx: 'hive', type: 'rocket',
    role: 'SUPPORT', vs: 'holding a spot', weak: 'direct damage', modes: ['war', 'zombie'],
    tip: 'Judge it by the turrets it plants, not by its own DPS.',
    desc: 'Launches a pod that unfolds into a short-lived auto turret wherever it lands.',
    base: { dmg: 58, rof: 0.75, spread: 0.04, speed: 55, pellets: 1, mag: 4, reload: 3.2, knock: 6, pierce: 0, splash: 3.4, range: 100 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.3, reload: -0.09, splash: 0.08 },
    perks: { 6: 'Bigger pod: the turret lasts 60% longer', 16: 'Double drop: 2 pods per shot' },
  },
  {
    id: 'singularity', name: 'Void Cannon', tag: 'GRAVITY', price: 12000, color: [1.1, 0.5, 2.3], sfx: 'singularity', type: 'rocket', orb: true,
    role: 'CONTROL', vs: 'grouping a scattered horde', weak: 'single bosses', modes: ['zombie', 'alien'],
    tip: 'Pull them into one pile, then hit that pile with something big.',
    desc: 'Fires a collapsing core that drags everything into one point, then implodes.',
    base: { dmg: 120, rof: 0.7, spread: 0.02, speed: 48, pellets: 1, mag: 4, reload: 3.0, knock: 10, pierce: 0, splash: 8, range: 110 },
    grow: { dmg: 0.28, rof: 0.08, mag: 0.26, reload: -0.09, splash: 0.1 },
    perks: { 6: 'Wider event horizon: +35% pull radius', 16: 'Twin collapse: 2 cores per shot' },
  },
  {
    id: 'tether', name: 'Leech Tether', tag: 'DRAIN', price: 12500, color: [1.7, 0.5, 1.3], sfx: 'tether', type: 'tether',
    role: 'SUSTAIN', vs: 'staying alive in a long fight', weak: 'crowds', modes: ['war', 'alien'],
    tip: 'Drains one target straight into your HP - a lifeline on low armour cars.',
    desc: 'Latches onto one target and pipes its life straight back into your car.',
    base: { dmg: 142, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.4, knock: 0, pierce: 0, splash: 0, range: 46 },
    grow: { dmg: 0.5, rof: 0, mag: 0.2, reload: -0.1, range: 0.08 },
    perks: { 6: 'Stronger draw: +45% healing', 16: 'Overflow: healing past full becomes bonus armour' },
  },
  {
    id: 'volley', name: 'Volley Array', tag: 'LOCK', price: 10500, color: [1.4, 1.2, 2.0], sfx: 'volley', type: 'fan',
    role: 'LINE', vs: 'a wall of enemies walking at you', weak: 'anything far away', modes: ['zombie', 'alien'],
    tip: 'Locks on, then fires a flat fan - stand still and let the row come to you.',
    desc: 'Locks a target and fires a flat horizontal fan of bolts. Short reach, wide sweep.',
    base: { dmg: 17, rof: 1.35, spread: 0, speed: 130, pellets: 5, mag: 8, reload: 2.4, knock: 8, pierce: 1, splash: 0, range: 52 },
    grow: { dmg: 0.2, rof: 0.06, mag: 0.26, reload: -0.08, pierce: 0.2 },
    perks: { 6: 'Wider array: +2 bolts per fan', 16: 'Piercing bolts: +2 pierce' },
  },
  {
    id: 'seeker', name: 'Seeker Rocket', tag: 'HOMING', price: 11500, color: [1.8, 0.8, 0.5], sfx: 'rocket', type: 'rocket', homing: 3.4,
    role: 'BLAST', vs: 'anything that runs away from you', weak: 'packed crowds', modes: ['alien', 'war'],
    tip: 'Locks the target under your crosshair and stays low all the way in.',
    desc: 'A single heavy rocket that locks on at launch and chases its target flat along the ground.',
    base: { dmg: 150, rof: 0.8, spread: 0.02, speed: 56, pellets: 1, mag: 3, reload: 2.6, knock: 24, pierce: 0, splash: 7, range: 140 },
    grow: { dmg: 0.28, rof: 0.09, mag: 0.3, reload: -0.09, splash: 0.1 },
    perks: { 6: 'Tighter seeker: turns much harder', 16: 'Double seeker: 2 rockets per shot' },
  },
  {
    id: 'lance', name: 'Lance Rifle', tag: 'LOCK SNIPER', price: 16000, color: [0.8, 1.6, 2.4], sfx: 'lance', type: 'beam',
    role: 'PRECISION', vs: 'anything you can see on screen', weak: 'enemies right next to you', modes: ['war', 'alien'],
    tip: 'Ignores walls completely. Damage drops hard if the target is close, so keep your distance.',
    desc: 'Locks a target and burns a beam straight through cover. Weaker up close, brutal at range.',
    base: { dmg: 152, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.6, knock: 0, pierce: 6, splash: 0, range: 120 },
    grow: { dmg: 0.55, rof: 0, mag: 0.2, reload: -0.1, pierce: 0.25 },
    perks: { 6: 'Focusing coils: close-range penalty halved', 16: 'Overcharged lance: +30% damage' },
  },
  {
    id: 'drain', name: 'Drain Beam', tag: 'LIFESTEAL', price: 12500, color: [1.7, 0.6, 1.0], sfx: 'drain', type: 'beam',
    role: 'SUSTAIN', vs: 'staying alive in a brawl', weak: 'long range fights', modes: ['zombie', 'alien'],
    tip: 'Snaps onto the closest enemy in front of you - just point roughly and hold.',
    desc: 'A short drain beam that locks itself onto the nearest target. Part of the damage returns as health.',
    base: { dmg: 130, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.2, knock: 0, pierce: 3, splash: 0, range: 26 },
    grow: { dmg: 0.5, rof: 0, mag: 0.2, reload: -0.1, range: 0.06 },
    perks: { 6: 'Wider draw: +50% healing returned', 16: 'Overflow: healing past full becomes bonus armour' },
  },
  {
    id: 'shocklance', name: 'Shock Lance', tag: 'SUSTAIN', price: 9800, color: [0.6, 1.5, 2.4], sfx: 'shocklance', type: 'beam',
    role: 'SINGLE TARGET', vs: 'one big enemy at a time', weak: 'crowds', modes: ['war', 'alien'],
    tip: 'A crawling arc, not a beam. It latches on by itself and the longer you hold it on one enemy the harder it bites - up to 2.2x.',
    desc: 'A crawling arc that latches onto one target on its own. Damage climbs the longer you keep it on the same enemy, and resets the moment you let go.',
    base: { dmg: 112, rof: 1, spread: 0, speed: 0, pellets: 1, mag: 100, reload: 2.2, knock: 0, pierce: 0, splash: 0, range: 44 },
    grow: { dmg: 0.5, rof: 0, mag: 0.2, reload: -0.1 },
    perks: { 6: 'Cooling fins: runs far cooler', 16: 'Stunning current: the target is slowed while burning' },
  },
  {
    id: 'phase', name: 'Phase Repeater', tag: 'ENDLESS', price: 8800, color: [1.3, 1.4, 2.2], sfx: 'phase', type: 'proj',
    role: 'SUSTAIN', vs: 'long fights with no reload breaks', weak: 'accuracy when hot', modes: ['zombie', 'war'],
    tip: 'Never reloads and never jams. The first shots of every burst are dead straight - keep holding and the group opens up. Let go for a second and it tightens again.',
    desc: 'Unlimited energy ammo. The bar is not ammo and not overheat - it is your grouping. Fire and it climbs, release and it falls back to pinpoint.',
    base: { dmg: 22, rof: 9, spread: 0, speed: 165, pellets: 1, mag: 100, reload: 1.0, knock: 3, pierce: 0, splash: 0, range: 100 },
    grow: { dmg: 0.25, rof: 0.07, mag: 0.1, reload: -0.05 },
    perks: { 6: 'Heat sink: heat builds 40% slower', 16: 'Phase core: +25% damage' },
  },
  {
    id: 'huntershell', name: 'Hunter Shell', tag: 'HOMING SIEGE', price: 17000, color: [1.9, 1.1, 0.5], sfx: 'huntershell', type: 'rocket', homing: 2.2,
    role: 'PRECISION', vs: 'bosses and armour at any range', weak: 'sustained fire', modes: ['war'],
    tip: 'One shell per magazine. It always finds the target and hits just as hard up close.',
    desc: 'A single homing siege shell. One shot, long reload, and no damage falloff at any distance.',
    base: { dmg: 420, rof: 0.9, spread: 0, speed: 62, pellets: 1, mag: 1, reload: 3.2, knock: 34, pierce: 0, splash: 9, range: 190 },
    grow: { dmg: 0.3, rof: 0.1, mag: 0, reload: -0.11, splash: 0.1 },
    perks: { 6: 'Faster loader: -25% reload', 16: 'Twin rack: 2 shells before reloading' },
  },
  {
    id: 'net', name: 'Snare Net', tag: 'ROOT', price: 9000, color: [1.2, 1.7, 0.9], sfx: 'net', type: 'proj',
    role: 'CONTROL', vs: 'runners and chargers', weak: 'dealing damage', modes: ['zombie', 'alien'],
    tip: 'Drops a net ZONE on the ground. Anything standing in it is pinned in place, cannot shoot, and takes +35% damage from everything - net first, then unload.',
    desc: 'Drops a net zone where it lands. Everything inside is pinned, silenced, and takes +35% damage from every source for as long as the net holds.',
    base: { dmg: 26, rof: 1.1, spread: 0.03, speed: 90, pellets: 1, mag: 6, reload: 2.4, knock: 4, pierce: 0, splash: 0, range: 90 },
    grow: { dmg: 0.24, rof: 0.08, mag: 0.28, reload: -0.09 },
    perks: { 6: 'Stronger mesh: the net holds 2s longer', 16: 'Wide net: +60% net radius' },
  },
  {
    id: 'drill', name: 'Breach Drill', tag: 'ORBIT SAW', price: 10800, color: [2.4, 1.15, 0.35], sfx: 'drill', type: 'orbit', sigCar: 'auger',   // 2026-10-18: tuan = Auger, warna jingga gerudi
    role: 'BRAWLER', vs: 'anything that comes near you', weak: 'targets you cannot get close to', modes: ['zombie', 'war'],
    tip: 'Fire and forget. The disc circles your car until something walks into range, then it flies off and grinds it on its own.',
    desc: 'Launches a saw disc that orbits your car. The moment an enemy comes within range the disc peels off, latches on and grinds it down by itself.',
    base: { dmg: 86, rof: 0.9, spread: 0, speed: 0, pellets: 1, mag: 3, reload: 3.0, knock: 5, pierce: 0, splash: 0, range: 26 },
    grow: { dmg: 0.27, rof: 0.05, mag: 0.2, reload: -0.1, range: 0.04 },
    perks: { 6: 'Longer spin: discs last 50% longer', 16: 'Tungsten head: +30% damage' },
  },
  {
    id: 'flak', name: 'Flak Cannon', tag: 'ANTI-AIR', price: 9600, color: [1.7, 1.2, 0.5], sfx: 'flak', type: 'proj',
    role: 'ANTI-AIR', vs: 'drones and anything flying', weak: 'ground armour', modes: ['alien'],
    tip: 'The shells burst on their own near flyers - you do not have to hit them directly.',
    desc: 'Proximity shells that burst near anything flying. You never need a direct hit.',
    base: { dmg: 44, rof: 2.4, spread: 0.06, speed: 120, pellets: 1, mag: 14, reload: 2.2, knock: 8, pierce: 0, splash: 4.5, range: 95 },
    grow: { dmg: 0.26, rof: 0.08, mag: 0.26, reload: -0.08, splash: 0.08 },
    perks: { 6: 'Better fuse: +50% burst radius', 16: 'Airburst salvo: 2 shells per shot' },
  },
  {
    id: 'fist', name: 'Fist', tag: 'COMBO', price: 14500, color: [1.9, 0.9, 0.4], sfx: 'fist', type: 'proj',
    role: 'BURST', vs: 'one tough target you can keep the crosshair on', weak: 'wasting shots on trash',
    modes: ['war', 'alien', 'zombie'],
    tip: 'Three punches per magazine and every one hits harder: normal, then +100%, then +250%. Never waste the third punch on something already dying.',
    desc: 'A three-round kinetic puncher. Shot one lands normal, shot two hits for double, shot three for three and a half times - then it reloads.',
    base: { dmg: 118, rof: 1.5, spread: 0.008, speed: 160, pellets: 1, mag: 3, reload: 2.1, knock: 22, pierce: 0, splash: 0, range: 78 },
    grow: { dmg: 0.2, rof: 0.05, mag: 0, reload: -0.1, range: 0.04 },
    perks: { 6: 'Quick rack: -25% reload', 16: 'Fourth knuckle: a 4th punch at +400%' },
  },
  {
    id: 'waterjet', name: 'Water Jet', tag: 'PRESSURE', price: 11800, color: [0.5, 1.5, 2.2], sfx: 'waterjet', type: 'flame',
    role: 'CONTROL', vs: 'anything that has to walk to you', weak: 'range of any kind', modes: ['zombie', 'war'],
    tip: 'Very short reach, but the blast is wild rather than straight - it washes over a whole doorway and leaves everything crawling.',
    desc: 'A high pressure jet. It does not fire straight - the water bursts out wide and knocks the pace out of everything it soaks.',
    base: { dmg: 17, rof: 13, spread: 0.26, speed: 32, pellets: 1, mag: 150, reload: 2.0, knock: 4, pierce: 99, splash: 0, range: 15 },
    grow: { dmg: 0.2, rof: 0.04, mag: 0.2, reload: -0.08, range: 0.05 },
    perks: { 6: 'Higher pressure: the slow lasts 60% longer', 16: 'Riptide: soaked enemies also take +20% damage' },
  },
  {
    id: 'windcharge', name: 'Wind Charge', tag: 'LIFT', price: 12600, color: [0.85, 1.2, 1.6], sfx: 'windcharge', type: 'proj',
    role: 'CONTROL', vs: 'ground cars and heavy armour', weak: 'things already in the air', modes: ['war', 'alien'],
    tip: 'Hit something on the ground and it gets lifted off its wheels - it cannot steer or brake while it floats.',
    desc: 'Fires a compressed slug of air. Whatever it hits is knocked off the ground and left floating for a moment, unable to drive.',
    base: { dmg: 19, rof: 2.0, spread: 0.02, speed: 110, pellets: 1, mag: 10, reload: 2.4, knock: 26, pierce: 1, splash: 3, range: 80 },
    grow: { dmg: 0.16, rof: 0.06, mag: 0.24, reload: -0.09, splash: 0.08 },
    perks: { 6: 'Stronger gust: lift lasts 50% longer', 16: 'Updraft: the blast also lifts everything around the target' },
  },
  {
    /* FLAIR (2026-10-19, tandatangan Core - MENGGANTI Amber atas permintaan Nabil; id 'amber'
       dikekalkan supaya simpanan pemain yang sudah membelinya tidak rosak). Matahari kecil yang
       melepaskan LASER solar flare yang MELIBAS (3 libasan membelai, jeda 1s - rentak letusan solar flare, Nabil). Sinar MELENCONG
       mengelilingi dinding ke musuh. Damage ikut jarak sasaran: lemah dekat, PALING KUAT jarak
       sederhana-jauh, pudar di hujung julat. Logik: weapons2 'flair' (flairPath / spawnFlairLash). */
    id: 'amber', name: 'Flair', tag: 'SOLAR FLARE', price: 14200, color: [2.6, 1.25, 0.35], sfx: 'flair', type: 'proj',
    custom: 'flair', sigCar: 'core',
    role: 'MID RANGE', vs: 'enemies hiding behind cover at mid range', weak: 'enemies right on top of you', modes: ['war', 'alien', 'zombie'],
    tip: 'Fight at mid range (about 25-75m): the flare barely hurts up close and fades at the end of its reach. It bends around walls on its own, and every enemy the lash touches gets hit - several enemies share the damage.',
    desc: 'Core\'s signature. A tiny sun that lashes out soft, rolling solar-flare lasers in bursts of three. Each lash whips toward the enemy, bends around walls to reach it, and burns every enemy it sweeps through - one enemy takes the full hit, several share it. Hardest at mid range - weak point-blank, fading at the far end of its reach.',
    base: { dmg: 155, rof: 4, spread: 0.2, speed: 64, pellets: 1, mag: 12, reload: 2.0, knock: 2, pierce: 0, splash: 0, range: 110 },
    grow: { dmg: 0.26, rof: 0.04, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Hotter core: +15% damage in the sweet spot', 16: 'Long corona: the sweet spot reaches from 16m to 90m' },
  },
  {
    id: 'wily', name: 'Wily', tag: 'GLUE BURST', price: 16500, color: [1.5, 1.9, 0.6], sfx: 'wily', type: 'proj',
    role: 'CONTROL', vs: 'packed groups that keep walking at you', weak: 'lone targets in the open',
    modes: ['zombie', 'alien', 'war'],
    tip: 'Fires 1-2-3-4, twice, then reloads. Anything it glues is pinned where it stands - and whatever is standing next to it gets stuck to it too.',
    desc: 'Lobs sticky fluid in two runs of four. Glued enemies are pinned in place, and anything close by sticks to them as well.',
    base: { dmg: 62, rof: 7, spread: 0.035, speed: 96, pellets: 1, mag: 8, reload: 2.6, knock: 3, pierce: 0, splash: 0, range: 74 },
    grow: { dmg: 0.32, rof: 0.08, mag: 0, reload: -0.1, range: 0.04 },
    perks: { 6: 'Thicker mix: glue holds 60% longer', 16: 'Wide spatter: neighbours stick from 60% further away' },
  },
  /* Vulag: mesti LOCK ON dahulu (1.1s menghala pada musuh). Lepas tu tiga
     peluru dilancar tegak ke langit - tinggi melepasi segala halangan - dan
     menjunam ke sasaran dari mana-mana di peta. Kunci kekal 3s selepas
     reticle meninggalkan sasaran; dalam tempoh itu sasaran baharu dikunci
     serta-merta, selepas itu perlu kunci semula. */
  {
    id: 'vulag', name: 'Vulag', tag: 'LOCK-ON', price: 18500, color: [1.5, 1.0, 2.3], sfx: 'rocket', type: 'rocket',
    lockOn: true, sky: true,
    role: 'ARTILLERY', vs: 'targets hiding behind cover anywhere on the map', weak: 'fast movers up close', modes: ['war', 'alien', 'zombie'],
    tip: 'Hold the crosshair on an enemy until it locks, then fire. Once locked you can flick to a new target within 3 seconds without re-locking.',
    desc: 'Lock on, then launch three missiles straight into the sky. They climb above every obstacle and dive onto the locked target from anywhere on the map.',
    base: { dmg: 92, rof: 0.42, spread: 0, speed: 60, pellets: 3, mag: 2, reload: 3.2, knock: 14, pierce: 0, splash: 4.5, range: 400 },
    grow: { dmg: 0.3, rof: 0.07, mag: 0.2, reload: -0.08, splash: 0.08 },
    perks: { 6: 'Quick lock: locks on in 0.75s', 16: 'Full salvo: 5 missiles per launch' },
  },
  /* Juhag & Arbog: tembakan BURST tiga das (`seq` 3 + `seqPause`), seperti
     raifal M16 - pang-pang-pang, berhenti, pang-pang-pang. */
  {
    id: 'juhag', name: 'Juhag', tag: 'BURST LASER', price: 9800, color: [0.5, 1.6, 2.6], sfx: 'juhag', type: 'proj',
    role: 'SHOCK', vs: 'anything you can keep tagging', weak: 'packed crowds', modes: ['war', 'alien', 'zombie'],
    tip: 'Three-round bursts. Every hit electrocutes the target for 3 seconds, so spread your bursts across several enemies.',
    desc: 'A burst laser rifle: three bolts per trigger, 30 in the cell. Each hit leaves the target electrified, taking damage every second for 3 seconds.',
    base: { dmg: 20, rof: 13, spread: 0.022, speed: 175, pellets: 1, mag: 30, reload: 2.0, knock: 2, pierce: 0, splash: 0, range: 100 },
    grow: { dmg: 0.55, rof: 0.05, mag: 0, reload: -0.08, spread: -0.1 },
    perks: { 6: 'Hotter arc: the shock lasts 4.5 seconds', 16: 'Overload: shock damage doubled' },
  },
  {
    id: 'arbog', name: 'Arbog', tag: 'SONIC BURST', price: 10400, color: [1.2, 2.0, 1.4], sfx: 'arbog', type: 'proj', orb: true,
    role: 'CONTROL', vs: 'fast cars and anything charging at you', weak: 'targets far away', modes: ['war', 'zombie', 'alien'],
    tip: 'Tut-tut-tut, pause, tut-tut-tut. Every pulse that lands slows the target, so keep chasers in the beam.',
    desc: 'Fires sound waves in bursts of three. Every pulse that hits slows the target down.',
    base: { dmg: 26, rof: 10, spread: 0.03, speed: 90, pellets: 1, mag: 24, reload: 2.2, knock: 6, pierce: 0, splash: 0, range: 70 },
    grow: { dmg: 0.55, rof: 0.05, mag: 0, reload: -0.08, range: 0.04 },
    perks: { 6: 'Resonance: pulses pass through one extra body', 16: 'Deep bass: slow lasts twice as long' },
  },
  /* Serpent Lash: satu tembakan = rantai lima orb racun yang meliuk dalam
     gelombang sinus seperti ular (b.wave dalam updateBullets) dan menembusi badan. */
  {
    id: 'lash', name: 'Serpent Lash', tag: 'VENOM CHAIN', price: 13500, color: [0.6, 2.4, 0.8], sfx: 'lash', type: 'proj', orb: true,
    role: 'PIERCE', vs: 'lines of enemies and anything strafing sideways', weak: 'very long range', modes: ['war', 'zombie', 'alien'],
    tip: 'The chain swings side to side as it flies - it catches cars that dodge a straight shot.',
    desc: 'Fires a chain of five venom orbs that slither through the air like a striking snake, piercing through bodies.',
    base: { dmg: 15, rof: 1.6, spread: 0, speed: 70, pellets: 5, mag: 6, reload: 2.2, knock: 3, pierce: 2, splash: 0, range: 80 },
    grow: { dmg: 0.42, rof: 0.05, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Wider coil: the chain swings twice as wide', 16: 'Hydra strike: two chains per shot' },
  },
  /* Nettle Swarm: kipas enam obor-obor kecil yang terapung perlahan, mengejar
     sasaran, menyengat (renjatan) dan memperlahankan apa yang disentuh. */
  {
    id: 'nettle', name: 'Nettle Swarm', tag: 'JELLY SWARM', price: 13000, color: [2.2, 0.7, 2.0], sfx: 'nettle', type: 'proj', orb: true,
    role: 'SWARM', vs: 'enemies hiding around corners and slow tanks', weak: 'fast cars far away', modes: ['war', 'alien', 'zombie'],
    tip: 'The jellies are slow but they hunt. Fire them early and keep driving - they will find someone.',
    desc: 'Releases a fan of six tiny drifting jellyfish that hunt down enemies, sting them with an electric shock and slow them down.',
    base: { dmg: 30, rof: 0.9, spread: 0, speed: 22, pellets: 6, mag: 3, reload: 2.6, knock: 2, pierce: 0, splash: 2.5, range: 70 },
    grow: { dmg: 0.36, rof: 0.05, mag: 0.2, reload: -0.08, splash: 0.06 },
    perks: { 6: 'Long tentacles: stings slow for twice as long', 16: 'Bloom: 9 jellies per release' },
  },

  /* ===== SENJATA TANDATANGAN (2026-10-17) =====
     Setiap satu dipadankan dengan SATU kereta baharu (`sigCar`): tema, warna
     dan cara bermainnya ikut kereta itu, dan ia +15% damage bila dipasang pada
     kereta asalnya. Logik tembakan dalam weapons2.js (`custom`). */
  {
    id: 'spine', name: 'Spine Mortar', tag: 'SPIKE FIELD', price: 10200, color: [2.1, 1.4, 0.5], sfx: 'spine', type: 'rocket',
    custom: 'spine', sigCar: 'helix',
    role: 'CONTROL', vs: 'hordes and cars that have to drive through a choke', weak: 'flyers and anything already on top of you', modes: ['zombie', 'war'],
    tip: 'Lob it ahead of whatever is chasing you. The spines sit on the ground for 9 seconds - every one that gets driven over stabs and cripples.',
    desc: 'Helix\'s signature. Lobs a shell that bursts in the air and rains a ring of shell spines onto the ground. Anything that drives over a spine is stabbed and slowed.',
    base: { dmg: 34, rof: 0.8, spread: 0.03, speed: 52, pellets: 8, mag: 3, reload: 2.6, knock: 2, pierce: 0, splash: 0, range: 100 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Fuller shell: 12 spines per burst', 16: 'Volatile spines: each spine bursts in a small blast' },
  },
  {
    id: 'maul', name: 'Rift Maul', tag: 'GROUND RIFT', price: 13800, color: [2.3, 0.95, 0.3], sfx: 'maul', type: 'proj',
    custom: 'maul', sigCar: 'mammoth',
    role: 'CROWD', vs: 'lines of enemies walking straight at you', weak: 'flyers and anything off to the side', modes: ['zombie', 'war'],
    tip: 'The rift runs along the ground in a straight line and throws up everything it crosses. Point it down the lane they are coming from.',
    desc: 'Mammoth\'s signature. A piston hammer that slams the ground and tears a burning rift forward. Every enemy the rift passes under is hit and thrown into the air.',
    base: { dmg: 120, rof: 0.7, spread: 0, speed: 30, pellets: 1, mag: 3, reload: 2.6, knock: 10, pierce: 99, splash: 0, range: 32 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08, range: 0.03 },
    perks: { 6: 'Deep fault: the rift is 50% wider and 25% longer', 16: 'Magma vein: the rift leaves burning lava behind' },
  },
  {
    id: 'javelin', name: 'Storm Javelin', tag: 'LIGHTNING ROD', price: 13200, color: [1.2, 2.3, 0.5], sfx: 'javelin', type: 'proj',
    custom: 'javelin', sigCar: 'raptor',
    role: 'SINGLE TARGET', vs: 'the one enemy you are hunting, and whoever stands next to it', weak: 'spread out targets', modes: ['war', 'alien', 'zombie'],
    tip: 'Spear the target first. The javelin stays in it and keeps calling lightning onto it - and onto anyone who comes close.',
    desc: 'Raptor\'s signature. Throws a heavy javelin that stays stuck in whatever it hits and turns it into a lightning rod, zapping it and its neighbours for 4 seconds.',
    base: { dmg: 110, rof: 0.85, spread: 0.01, speed: 120, pellets: 1, mag: 3, reload: 2.4, knock: 14, pierce: 0, splash: 0, range: 110 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Taller rod: lasts 5.5s and reaches 12m', 16: 'Forked storm: every zap jumps on to one more enemy' },
  },
  {
    id: 'glaive', name: 'Crescent Glaive', tag: 'BOOMERANG', price: 12800, color: [0.9, 2.2, 1.7], sfx: 'glaive', type: 'proj',
    custom: 'glaive', sigCar: 'mantis',
    role: 'BRAWLER', vs: 'groups at medium range', weak: 'targets behind walls', modes: ['zombie', 'war', 'alien'],
    tip: 'The blade curves out and comes BACK, cutting on both trips. Drive so it flies back through the crowd - and catch it to get the round back.',
    desc: 'Mantis\'s signature. Throws a spinning crescent blade that arcs out, turns around and flies back to the car, cutting through everything both ways. Catching it returns the round.',
    base: { dmg: 70, rof: 1.0, spread: 0, speed: 55, pellets: 1, mag: 4, reload: 2.4, knock: 8, pierce: 99, splash: 0, range: 42 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Twin crescent: two blades per throw, one each side', 16: 'Hungry return: the returning blade hits 60% harder' },
  },
  {
    id: 'stinger', name: 'Stinger Pod', tag: 'STICKY TIMER', price: 11800, color: [2.3, 1.8, 0.3], sfx: 'stinger', type: 'proj',
    custom: 'stinger', sigCar: 'hivra',
    role: 'BURST', vs: 'big targets you can stick several times', weak: 'packs of tiny enemies', modes: ['war', 'alien', 'zombie'],
    tip: 'Stingers stick and tick. Every extra stinger on the same enemy makes the final burst bigger - pile them onto one target.',
    desc: 'Hivra\'s signature. Fires barbed stingers that stick to whatever they hit and burst 2.2 seconds after the first one lands. Every extra stinger on the same target adds to one bigger blast.',
    base: { dmg: 55, rof: 2.6, spread: 0.03, speed: 90, pellets: 1, mag: 6, reload: 2.3, knock: 2, pierce: 0, splash: 4.5, range: 80 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08, splash: 0.06 },
    perks: { 6: 'Short fuse: bursts after 1.5 seconds', 16: 'Royal venom: +40% blast radius' },
  },
  {
    id: 'lantern', name: 'Sun Lantern', tag: 'HANGING SUN', price: 14800, color: [2.4, 1.7, 0.6], sfx: 'lantern', type: 'rocket',
    custom: 'lantern', sigCar: 'aerostat',
    role: 'AREA', vs: 'groups holding one spot', weak: 'fast cars that drive out from under it', modes: ['war', 'zombie', 'alien'],
    tip: 'The lantern floats up and hangs over the aim point, firing sunbeams straight down. It does not care about walls - perfect for enemies camping behind cover.',
    desc: 'Aerostat\'s signature. Launches a glowing lantern that hangs in the sky above the aim point for 3 seconds, firing sunbeams down onto everything beneath it, then bursts and dazzles them.',
    base: { dmg: 34, rof: 0.45, spread: 0, speed: 48, pellets: 12, mag: 2, reload: 3.0, knock: 2, pierce: 0, splash: 2.4, range: 100 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Long wick: hangs 4 seconds and fires 16 beams', 16: 'Solar flare: sunbeams set targets on fire' },
  },
  {
    id: 'chime', name: 'Echo Chime', tag: 'RESONANCE', price: 12200, color: [2.2, 2.0, 1.1], sfx: 'chime', type: 'proj', orb: true,
    custom: 'chime', sigCar: 'halo',
    role: 'SUPPORT', vs: 'tough targets you can keep hitting', weak: 'switching targets every shot', modes: ['war', 'alien', 'zombie'],
    tip: 'Every hit rings a note on the target. The third note shatters into a resonance burst that hits it and everyone near it - keep three in a row on one enemy.',
    desc: 'Halo\'s signature. Fires ringing notes of light. Each hit leaves a note on the target; the third note resonates into a burst of three times the damage that also hits everything close by.',
    base: { dmg: 30, rof: 3.4, spread: 0.02, speed: 125, pellets: 1, mag: 15, reload: 2.0, knock: 3, pierce: 0, splash: 0, range: 90 },
    grow: { dmg: 0.27, rof: 0.05, mag: 0.15, reload: -0.08 },
    perks: { 6: 'Long echo: notes last 6s and the burst reaches 9m', 16: 'Grand chord: resonance hits 4.5x instead of 3x' },
  },
  {
    id: 'fork', name: 'Fork Bolt', tag: 'SPLITTER', price: 11200, color: [2.4, 0.55, 0.4], sfx: 'fork', type: 'proj',
    custom: 'fork', sigCar: 'tharos',
    role: 'CHAIN', vs: 'loose groups at long range', weak: 'a single boss', modes: ['alien', 'war'],
    tip: 'Every bolt that hits splits into three that fly on to the nearest other enemies - one good hit in a group spreads everywhere.',
    desc: 'Tharos\'s signature. Fires a red heat bolt that splits into three smaller bolts on impact, each one seeking a different nearby enemy.',
    base: { dmg: 40, rof: 2.2, spread: 0.02, speed: 150, pellets: 1, mag: 10, reload: 2.0, knock: 4, pierce: 0, splash: 0, range: 100 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Four tines: splits into four', 16: 'Second fork: the split bolts split once more' },
  },
  {
    id: 'rime', name: 'Rime Scatter', tag: 'FREEZE + SHATTER', price: 12600, color: [0.75, 1.7, 2.6], sfx: 'rime', type: 'proj',
    custom: 'rime', sigCar: 'hopper',
    role: 'CONTROL', vs: 'anything close that you want stopped dead', weak: 'long range', modes: ['zombie', 'war', 'alien'],
    tip: 'Ice shards stack frost. Enough frost freezes the target solid - then ANY heavy hit (or another blast of shards) shatters it for a big icy burst.',
    desc: 'Hopper\'s signature. A short ice shotgun. Every shard adds frost; enough frost freezes the enemy solid in a block of ice, and the next solid hit shatters it in a burst of ice.',
    base: { dmg: 9, rof: 2.0, spread: 0.12, speed: 115, pellets: 6, mag: 8, reload: 2.3, knock: 3, pierce: 0, splash: 0, range: 50 },
    grow: { dmg: 0.27, rof: 0.06, mag: 0.2, reload: -0.08, spread: -0.08 },
    perks: { 6: 'Bitter cold: freezes with 7 shards instead of 10', 16: 'Glass ice: the shatter burst is 60% wider' },
  },
  {
    id: 'fence', name: 'Laser Fence', tag: 'TRIPWIRE', price: 11600, color: [0.5, 2.0, 2.4], sfx: 'fence', type: 'proj',
    custom: 'fence', sigCar: 'corsair',
    role: 'TRICK', vs: 'enemies chasing you down a lane', weak: 'flyers', modes: ['zombie', 'war', 'alien'],
    tip: 'Four pylons per magazine. Plant them wherever you like - here, there, across the lane - and the fence links all four in the order you shot them, no matter how far apart.',
    desc: 'Corsair\'s signature. Every shot plants a pylon where you aim, and each weapon\'s pylons always link up 1-2-3-4 with a laser fence that burns and slows anything crossing it.',
    base: { dmg: 220, rof: 1.1, spread: 0, speed: 60, pellets: 1, mag: 4, reload: 2.8, knock: 0, pierce: 0, splash: 0, range: 60 },
    grow: { dmg: 0.27, rof: 0.05, mag: 0, reload: -0.08 },
    perks: { 6: 'More posts: 5 pylons that last 15 seconds', 16: 'Shock wire: crossing the fence stuns for a moment' },
  },
  /* HURAGO (2026-10-17, tandatangan Hibachi): laser imbas. Setiap tembakan
     (sekali tekan, jeda 2 saat) mengimbas sasaran dan MENYALIN 10% damage
     senjata musuh itu ke dalam laser - jadi laser makin kuat pada sasaran yang
     sama. Bila sasaran mati, hanya 10% bonus disimpan dan ia cari musuh lain. */
  {
    id: 'hurago', name: 'Hurago', tag: 'SCAN LASER', price: 15500, color: [2.4, 0.45, 0.8], sfx: 'lance', type: 'proj',
    custom: 'hurago', sigCar: 'hibachi',
    role: 'DUELIST', vs: 'one strong enemy at a time - bosses, heavy bots', weak: 'swarms of weak enemies', modes: ['war', 'alien', 'zombie'],
    tip: 'Stay on one target: the first shot already hits hard, and every shot copies 6% of its weapon firepower (at least 25% of the laser\'s own damage), up to 2x stronger. When it dies only 10% of that bonus is kept, so finish the big ones.',
    desc: 'Hibachi\'s signature. A slow scanning laser (one shot every 2 seconds). Each hit scans the enemy and copies 6% of its weapon firepower into the laser, so it keeps getting stronger. When the target dies the laser keeps 10% of the stolen bonus and locks onto the next enemy.',
    base: { dmg: 300, rof: 0.5, spread: 0, speed: 0, pellets: 1, mag: 8, reload: 2.2, knock: 6, pierce: 0, splash: 0, range: 80 },
    // 2026-10-19 (Nabil: "lemah gila"): dmg 15 tertinggal masa skala v3.0 (DPS lv20 = 15, median ~1300).
    // Pusingan 2 (Nabil: das pertama terlalu lemah, dia selalu tukar sasaran): asas 300 = setanding senjata lain
    // (lv20 ~800 DPS) TANPA imbasan; imbasan curi % KECIL (6%/9%), bonus maks 1x asas -> penuh ~1600 DPS.
    grow: { dmg: 0.3, rof: 0.04, mag: 0.2, reload: -0.08 },
    perks: { 6: 'Deep scan: copies 9% per scan', 16: 'Memory core: keeps 30% of the bonus when the target dies' },
  },
  /* DIAMOND (2026-10-18, tandatangan Crystal - nama daripada Nabil): blaster
     gaya "stormtrooper" - bolt tenaga pendek tebal yang terbang NAMPAK (tidak
     segera). Kristal besar di atasnya ialah bahan api: ia mengecut setiap das
     dan tumbuh semula masa reload. Pusingan sendiri: RESONANS - bolt yang
     terus mengena sasaran SAMA makin kuat (+6% setiap kena, maks +30%). */
  {
    id: 'diamond', name: 'Diamond', tag: 'BLASTER', price: 16000, color: [0.7, 1.9, 2.8], sfx: 'diamond', type: 'proj',
    custom: 'diamond', sigCar: 'crystal',
    role: 'DUELIST', vs: 'one enemy at a time at mid range', weak: 'enemies that keep breaking line of sight', modes: ['war', 'alien', 'zombie'],
    tip: 'Keep the bolts on ONE target: every hit in a row resonates the crystal for +6% damage, up to +30%. Switching targets resets it.',
    desc: 'Crystal\'s signature. A faceted blaster that fires heavy energy bolts you can see flying. The big crystal on top is its fuel - it shrinks with every shot and grows back while reloading. Bolts that keep hitting the same enemy resonate and hit harder.',
    base: { dmg: 30, rof: 4.2, spread: 0.03, speed: 88, pellets: 1, mag: 24, reload: 2.0, knock: 3, pierce: 0, splash: 0, range: 95 },
    grow: { dmg: 0.26, rof: 0.06, mag: 0.2, reload: -0.08, spread: -0.1 },
    perks: { 6: 'Twin facet: every 4th shot fires two bolts', 16: 'Deep resonance: up to +50% on the same target' },
  },
  /* GALE HAMMER (2026-10-18, tandatangan Condor): meriam kipas. Di darat ia
     menembak peluru udara mampat yang pecah jadi PUSARAN - menolak semua musuh
     keluar dari titik itu. Pusingan: bila Condor (atau mana-mana kereta)
     sedang TERBANG, peluru jadi bom udara yang menjunam ke titik bidikan,
     +40% damage dan pusaran lebih besar. */
  {
    id: 'gale', name: 'Gale Hammer', tag: 'AIR BLAST', price: 14500, color: [2.6, 0.45, 0.25], sfx: 'gale', type: 'proj',
    custom: 'gale', sigCar: 'condor',
    role: 'CONTROL', vs: 'groups closing in on you', weak: 'far away single targets', modes: ['zombie', 'war', 'alien'],
    tip: 'Shoot into a crowd to blow it apart. While flying, every shell becomes a dive bomb that lands where you aim.',
    desc: 'Condor\'s signature. A ducted-fan cannon that fires shells of compressed air. They burst into a vortex that damages and throws every enemy outward. Fired while airborne, the shells turn into dive bombs that drop onto your aim point with a bigger, stronger vortex.',
    base: { dmg: 70, rof: 1.3, spread: 0.02, speed: 60, pellets: 1, mag: 6, reload: 2.4, knock: 26, pierce: 0, splash: 5.5, range: 70 },
    grow: { dmg: 0.28, rof: 0.08, mag: 0.25, reload: -0.08, splash: 0.08 },
    perks: { 6: 'Wide vortex: +30% burst radius', 16: 'Downburst: the vortex also slows enemies for 2s' },
  },
];
/* Senjata tandatangan kereta LAMA (Nabil, 2026-10-17): setiap kereta ada satu
   senjata "milik dia" - +5% damage bila dipasang pada kereta itu. Pasangan
   kereta+senjata baharu v1.5 (sigCar di atas) kekal +15%. */
const SIG_OLD = {
  mg: 'ranger', minigun: 'bastion', drain: 'seraph', net: 'trapper', plasma: 'vortex',
  flak: 'skyhook', phase: 'phantom', rocket: 'valkyrie', acid: 'meltdown', gatling: 'sentinel',
  tether: 'reaper', harpoon: 'razorback', shard: 'revenant', flame: 'inferno', disruptor: 'oracle',
  repulsor: 'banshee', sniper: 'spectre', tesla: 'tempest', mortar: 'bulwark', singularity: 'magnetar',
  annihilator: 'juggernaut', huntershell: 'meteor', shocklance: 'warden', seeker: 'albatross',
  autoshot: 'rampart', arc: 'cascade', laser: 'stormwing', swarm: 'hydra', lance: 'mirage',
  hive: 'sovereign', fist: 'tremor', volley: 'kefly', waterjet: 'atlantis', windcharge: 'typhoon',
  blaze: 'blaze', smg: 'fly', vulag: 'hamvog', juhag: 'hyna', arbog: 'gyhna', lash: 'ouroboros',
  nettle: 'medusa',
};
for (const w of WEAPONS) {
  if (w.sigCar) w.sigBonus = 0.15;
  else if (SIG_OLD[w.id]) { w.sigCar = SIG_OLD[w.id]; w.sigBonus = 0.05; }
}
export const WBY =Object.fromEntries(WEAPONS.map(w => [w.id, w]));
/* kereta -> senjata tandatangan (dibaca oleh cars.js) */
export const SIG_OF_CAR = Object.fromEntries(WEAPONS.filter(w => w.sigCar).map(w => [w.sigCar, w.id]));

const statCache = {};
export function weaponStats(id, lv, perkIds) {
  const k = id + '|' + lv + '|' + (perkIds ? perkIds.join(',') : '');
  if (statCache[k]) return statCache[k];
  const w = WBY[id];
  const s = Object.assign({}, w.base);
  const n = lv - 1;
  for (const key in w.grow) s[key] = s[key] * (1 + w.grow[key] * GROW_SCALE * n);
  // had supaya 20 tahap tidak memecahkan imbangan
  s.reload = Math.max(w.base.reload * 0.45, s.reload);
  s.spread = Math.max(w.base.spread * 0.25, s.spread);

  // bonus terbina dalam senjata: Mark II dan Mark IV
  if (lv >= 6) {
    if (id === 'mg') s.pierce += 1;
    if (id === 'smg') s.mag *= 1.5;
    if (id === 'shotgun') s.spread *= 0.65;
    if (id === 'minigun') s.spinFast = true;
    if (id === 'rocket') s.splash *= 1.25;
    if (id === 'flame') s.range *= 1.3;
    if (id === 'tesla') s.pierce += 1;
    if (id === 'laser') s.coolFast = true;
    if (id === 'rail') s.fastCharge = true;
    if (id === 'nail') s.pierce += 1;
    if (id === 'autoshot') s.spread *= 0.7;
    if (id === 'sniper') s.pierce += 1;
    if (id === 'plasma') s.splash *= 1.25;
    if (id === 'acid') s.range *= 1.3;
    if (id === 'swarm') s.homingBoost = true;
    if (id === 'arc') s.pierce += 1;
    if (id === 'cryo') s.coolFast = true;
  }
  if (lv >= 16) {
    if (id === 'mg') s.burnBonus = true;
    if (id === 'smg') s.pellets = 2;
    if (id === 'shotgun') s.burn = true;
    if (id === 'minigun') s.pierce += 1;
    if (id === 'rocket') s.twin = true;
    if (id === 'flame') s.burn2 = true;
    if (id === 'tesla') s.slow = true;
    if (id === 'laser') s.focus = true;
    if (id === 'rail') s.shockTrail = true;
    if (id === 'nail') s.builtinBounce = true;
    if (id === 'autoshot') s.burn = true;
    if (id === 'sniper') s.splash = 3;
    if (id === 'plasma') s.twin = true;
    if (id === 'acid') s.burn2 = true;
    if (id === 'swarm') s.sixPack = true;
    if (id === 'arc') s.slow = true;
    if (id === 'cryo') s.deepFreeze = true;
  }
  if (id === 'cryo') s.slowHit = lv >= 16 ? 2.8 : 1.5;
  if (id === 'repulsor') { s.waveArc = lv >= 6 ? 0.34 : 0.2; if (lv >= 16) s.stun = 2.2; }
  if (id === 'buzzsaw') { s.saw = lv >= 6 ? 9 : 6; if (lv >= 16) s.twin = true; }
  if (id === 'hive') { s.hiveLife = lv >= 6 ? 13 : 8; if (lv >= 16) s.twin = true; }
  if (id === 'singularity') { s.well = lv >= 6 ? 12 : 9; if (lv >= 16) s.twin = true; }
  if (id === 'tether') { s.leech = lv >= 6 ? 0.5 : 0.34; if (lv >= 16) s.overflow = true; }
  if (id === 'volley') { if (lv >= 6) s.pellets += 2; if (lv >= 16) s.pierce += 2; }
  if (id === 'seeker') { s.homingBoost = lv >= 6; if (lv >= 16) s.twin = true; }
  if (id === 'lance') { s.nearFalloff = 34; s.nearMul = lv >= 6 ? 0.7 : 0.42; if (lv >= 16) s.dmg *= 1.3; }
  if (id === 'drain') { s.leech = lv >= 6 ? 0.3 : 0.2; s.snap = 0.85; if (lv >= 16) s.overflow = true; }
  if (id === 'shocklance') { s.single = true; s.arcLock = true; s.ramp = 2.2; s.rampT = 2.4; if (lv >= 6) s.coolFast = true; if (lv >= 16) s.slowHit = 1.4; }
  if (id === 'phase') { s.infinite = true; s.heatSpread = 0.2; s.flatSpread = true; s.heatPerShot = lv >= 6 ? 0.045 : 0.07; s.coolFast = true; if (lv >= 16) s.dmg *= 1.25; }
  if (id === 'huntershell') { s.noFalloff = true; if (lv >= 6) s.reload *= 0.75; if (lv >= 16) s.mag = 2; }
  if (id === 'net') { s.rootArea = lv >= 16 ? 9.5 : 6; s.rootTime = lv >= 6 ? 6 : 4; s.rootVuln = 1.35; }
  if (id === 'drill') { s.orbitR = 6.5; s.discLife = lv >= 6 ? 10 : 7; if (lv >= 16) s.dmg *= 1.3; }
  if (id === 'flak') { s.flak = lv >= 6 ? 7.5 : 5; if (lv >= 16) s.twin = true; }
  if (id === 'fist') { s.combo = lv >= 16 ? [1, 2, 3.5, 5] : [1, 2, 3.5]; s.mag = s.combo.length; if (lv >= 6) s.reload *= 0.75; }
  if (id === 'wily') { s.mag = 8; s.seq = 4; s.glue = lv >= 6 ? 4.2 : 2.6; s.glueR = lv >= 16 ? 7.5 : 4.6; }
  if (id === 'waterjet') { s.soak = lv >= 6 ? 2.4 : 1.5; s.gush = true; if (lv >= 16) s.soakVuln = 1.2; }
  if (id === 'windcharge') { s.lift = lv >= 6 ? 1.8 : 1.2; if (lv >= 16) s.liftArea = 7; }
  if (id === 'amber') { s.seq = 3; s.seqPause = 1.0; s.sweet = lv >= 6 ? 1.38 : 1.2; s.zone = lv >= 16 ? [16, 90] : [22, 75]; }   // Flair
  if (id === 'gatling') { s.spinFast = true; if (lv >= 6) s.coolFast = true; if (lv >= 16) s.dmg *= 1.3; }
  if (id === 'blaze') { s.burn = true; s.burnMul = lv >= 6 ? 1.3 : 1; if (lv >= 16) s.splash *= 1.6; }
  if (id === 'venom') { s.burn = true; s.burnMul = lv >= 6 ? 1.35 : 1; if (lv >= 16) s.twin = true; }
  if (id === 'frost') { s.slowOnHit = lv >= 6 ? 3.2 : 2.2; if (lv >= 16) s.splash *= 1.5; }
  if (id === 'harpoon') { if (lv >= 6) s.pierce += 1; if (lv >= 16) s.slowOnHit = 1.8; }
  if (id === 'shard') { if (lv >= 6) s.pierce += 1; if (lv >= 16) s.splash = 2.2; }
  if (id === 'pulse') { if (lv >= 6) s.speed *= 1.2; if (lv >= 16) s.pellets = 2; }
  if (id === 'mortar') { if (lv >= 6) s.splash *= 1.25; if (lv >= 16) s.dmg *= 1.2; }   // twin dibuang - mortar tunggal yang berat
  if (id === 'disruptor') { if (lv >= 6) s.pierce += 1; if (lv >= 16) s.markHit = 0.25; }
  if (id === 'annihilator') { if (lv >= 6) s.fastCharge = true; if (lv >= 16) s.shockTrail = true; }
  if (id === 'juhag') {
    s.seq = 3; s.seqPause = 0.3;
    s.shockT = lv >= 6 ? 4.5 : 3; s.shockMul = lv >= 16 ? 0.7 : 0.35;   // damage/s = dmg x shockMul x 3
  }
  if (id === 'arbog') {
    s.seq = 3; s.seqPause = 0.42;
    s.slowOnHit = lv >= 16 ? 3 : 1.5;
    if (lv >= 6) s.pierce += 1;
  }
  if (id === 'lash') { s.waveAmp = lv >= 6 ? 2.2 : 1.1; s.twinChain = lv >= 16; }
  if (id === 'nettle') { s.slowOnHit = lv >= 6 ? 2.4 : 1.2; if (lv >= 16) { s.pellets = 9; s.dmg *= 0.7; } }
  if (id === 'vulag') {
    s.lockT = lv >= 6 ? 0.75 : 1.1;   // masa menghala untuk mengunci
    s.lockHold = 3;                   // kunci kekal selepas reticle beralih
    if (lv >= 16) { s.pellets = 5; s.dmg *= 0.7; }
  }
  // senjata tandatangan (weapons2.js membaca nilai-nilai ini)
  if (id === 'spine') { if (lv >= 6) s.pellets = 12; s.spineBoom = lv >= 16; s.lob = true; }
  if (id === 'maul') { s.riftW = lv >= 6 ? 3.6 : 2.4; if (lv >= 6) s.range *= 1.25; s.lava = lv >= 16; }
  if (id === 'javelin') { s.rodT = lv >= 6 ? 5.5 : 4; s.rodR = lv >= 6 ? 12 : 9; s.rodJump = lv >= 16 ? 1 : 0; }
  if (id === 'glaive') { if (lv >= 6) { s.pellets = 2; s.dmg *= 0.72; } s.retMul = lv >= 16 ? 1.6 : 1; }
  if (id === 'stinger') { s.fuse = lv >= 6 ? 1.5 : 2.2; if (lv >= 16) s.splash *= 1.4; }
  if (id === 'lantern') { s.hang = lv >= 6 ? 4 : 3; if (lv >= 6) s.pellets = 16; s.ignite = lv >= 16; }
  if (id === 'chime') { s.noteT = lv >= 6 ? 6 : 4; s.noteR = lv >= 6 ? 9 : 6; s.noteMul = lv >= 16 ? 4.5 : 3; }
  if (id === 'fork') { s.tines = lv >= 6 ? 4 : 3; s.forkGen = lv >= 16 ? 2 : 1; }
  if (id === 'rime') { s.frostNeed = lv >= 6 ? 7 : 10; s.shatterR = lv >= 16 ? 7 : 4.4; }
  if (id === 'diamond') { s.twinEvery = lv >= 6 ? 4 : 0; s.resMax = lv >= 16 ? 0.5 : 0.3; }
  if (id === 'gale') { if (lv >= 6) s.splash *= 1.3; s.galeSlow = lv >= 16; }
  if (id === 'hurago') { s.scanPct = lv >= 6 ? 0.09 : 0.06; s.keepPct = lv >= 16 ? 0.3 : 0.1; }
  if (id === 'fence') { s.posts = lv >= 6 ? 5 : 4; s.mag = s.posts; s.postT = lv >= 6 ? 15 : 12; s.fenceStun = lv >= 16; }   // satu magazin = satu set pagar
  s.flags = applyPerks(s, perkIds);
  if (s.builtinBounce) s.flags.bounce = (s.flags.bounce || 0) + 1;
  /* Tembus dinding: HANYA Lance Rifle (sifat terbina) atau perk Phase Rounds.
     Semua senjata lain dihalang oleh dinding dan perlindungan. */
  s.thruWalls = id === 'lance' || !!s.flags.wallPierce;
  // Mortar melambung (graviti) - boleh melepasi dinding secara sah, bukan menembusinya
  if (id === 'mortar' || id === 'frost' || id === 'venom') s.lob = true;   // semua senjata jenis mortar melambung (Nabil)
  s.mag = Math.max(1, Math.round(s.mag));
  const perSec = w.type === 'beam' || w.type === 'tether' || w.type === 'orbit';
  // REBALANCE 2026-10-19: pengganda damage daripada DPS SEBENAR diukur dalam Training (dev/wbal.js,
  // lv20, 1 sasaran). Median ~1300; senjata kawasan & kawalan sengaja lebih rendah untuk 1 sasaran.
  if (BAL[id]) s.dmg *= BAL[id];
  // s.dps MESTI dikira SELEPAS BAL - bot menembak guna s.dps (team.js). Dahulu sebelum, jadi senjata yang
  // dinerf untuk pemain kekal penuh pada bot (Water Jet bot ~6.7x) - punca "bot kuat sangat".
  s.dps = Math.round(s.dmg * s.pellets * (perSec ? 1 : s.rof) * (s.combo ? avg(s.combo) : 1));
  // radius letupan dihadkan 1.35x asal - dahulu membesar sampai 20-28m pada lv20 (Rocket/Mortar)
  if (w.base.splash) s.splash = Math.min(s.splash, w.base.splash * 1.35);
  statCache[k] = s;
  return s;
}

/* Kos naik tahap dalam Mark yang sama — dibayar dengan SKRAP */
export function levelCostScrap(id, lv) {
  const w = WBY[id];
  return Math.round((45 + w.price * 0.03) * Math.pow(1.20, lv - 1) / 5) * 5;
}
/* Kos menembusi pintu Mark (tahap 5->6, 10->11, 15->16) — dibayar dengan SYILING */
export function markCostCoin(id, mark) {
  const w = WBY[id];
  const f = [0, 0, 2.2, 4.6, 8.4][mark] || 8.4;
  return Math.round((420 + w.price * 0.26) * f / 10) * 10;
}
/* Kos pusing semula pilihan kuasa — SYILING, maksimum 3 kali sebelum perlu tunggu */
export function rerollCost(mark) { return 150 * Math.max(1, mark - 1); }
export const REROLL_MAX = 3;
export const REROLL_LOCK_MS = 10 * 60 * 1000;


/* ---------------- naik taraf kereta ---------------- */
export const CAR_UPS = [
  { id: 'armor', name: 'Body Armour', desc: '+35 max HP', max: 8, base: 260, step: 1.42 },
  { id: 'plate', name: 'Composite Plating', desc: '-6% damage taken', max: 6, base: 420, step: 1.5 },
  { id: 'engine', name: 'Turbo Engine', desc: '+7% top speed, -2% damage taken', max: 8, base: 300, step: 1.4 },
  { id: 'grip', name: 'Grip Tyres', desc: '+9% handling, +2% weapon damage', max: 6, base: 280, step: 1.42 },
  { id: 'ram', name: 'Ram Bar', desc: '+35% ram damage', max: 6, base: 340, step: 1.45 },
  { id: 'nitro', name: 'Nitro Tank', desc: '+22% nitro & faster refill', max: 5, base: 380, step: 1.5 },
  { id: 'magnet', name: 'Pickup Magnet', desc: '+4m pull radius', max: 5, base: 240, step: 1.4 },
  { id: 'repair', name: 'Nano Repair', desc: '+1.2 HP/sec', max: 5, base: 520, step: 1.55 },
];
export const CUP_BY = Object.fromEntries(CAR_UPS.map(u => [u.id, u]));
export function carUpCost(id, lv) {
  const u = CUP_BY[id];
  return Math.round(u.base * Math.pow(u.step, lv) / 10) * 10;
}
export function carStats(ups, mods) {
  const L = id => ups[id] || 0;
  const m = mods || { hp: 0, speed: 1, grip: 1, ram: 1, nitro: 1 };
  return {
    maxHp: (150 + 35 * L('armor')) + (m.hp || 0) * 1.5,
    dmgTake: Math.pow(0.94, L('plate')) * Math.pow(0.98, L('engine')),
    dmgBonus: 1 + 0.02 * L('grip'),
    speed: (1 + 0.07 * L('engine')) * (m.speed || 1),
    grip: (1 + 0.09 * L('grip')) * (m.grip || 1),
    ram: (1 + 0.35 * L('ram')) * (m.ram || 1),
    nitro: (1 + 0.22 * L('nitro')) * (m.nitro || 1),
    magnet: 18 + 4 * L('magnet'),
    regen: 0.8 + 1.2 * L('repair'),
  };
}

/* =======================================================================
   LOGIK TEMBAKAN
   ======================================================================= */
export function makeSlot(id, lv, perkIds) {
  const st = weaponStats(id, lv, perkIds);
  return {
    id, lv, st, w: WBY[id], perks: perkIds || [], flags: st.flags || {},
    cd: 0, mag: st.mag, reload: 0, heat: 0, spin: 0, charge: 0,
    over: false, beamOn: false, fireT: 0,
  };
}

export function slotUpdate(slot, dt, wantFire) {
  const s = slot.st;
  if (slot.reload > 0) {
    slot.reload -= dt;
    if (slot.reload <= 0) { slot.mag = s.mag; slot.reload = 0; }
  }
  slot.cd -= dt;
  // putaran minigun
  const spinTarget = wantFire && slot.mag > 0 && slot.reload <= 0 ? 1 : 0;
  const rate = (s.spinFast ? 2.4 : 1.2) * (spinTarget ? 1 : 0.8);
  slot.spin = clamp(slot.spin + (spinTarget ? rate : -rate * 1.2) * dt, 0, 1);
  // suhu laser
  if (slot.w.type === 'beam' || slot.w.type === 'tether') {
    const cool = (s.coolFast ? 0.62 : 0.34) * (slot.over ? 1.4 : 1);
    if (!slot.beamOn) slot.heat = clamp(slot.heat - cool * dt, 0, 1);
    if (slot.over && slot.heat <= 0.15) slot.over = false;
  }
  if (slot.w.type === 'charge') {
    if (wantFire && slot.mag > 0 && slot.reload <= 0) {
      const cs = s.fastCharge ? 1.45 : 1.0;
      const before = slot.charge;
      slot.charge = clamp(slot.charge + dt * cs, 0, 1);
      if (before < 0.02 && slot.charge >= 0.02) Sfx.charge();
    }
  }
  if (!s.infinite && slot.mag <= 0 && slot.reload <= 0 && slot.w.type !== 'beam' && slot.w.type !== 'tether') startReload(slot);
}

export function startReload(slot) {
  if (slot.reload > 0 || slot.mag >= slot.st.mag) return false;
  slot.reload = slot.st.reload;
  slot.charge = 0;
  Sfx.tone(320, 0.1, 'square', 0.1, 200);
  Sfx.tone(260, 0.12, 'square', 0.1, 180, slot.st.reload * 0.65);
  return true;
}

/* g mesti sediakan: spawnBullet, rayHit, nearestEnemies, damageEnemy, fx, shake, recoil */
/* LOCK ON (Vulag). Dijalankan setiap bingkai, sama ada menembak atau tidak.
   - Tiada kunci: hala reticle pada musuh selama s.lockT saat untuk mengunci.
   - Berkunci: menghala pada mana-mana musuh menyegarkan kunci (dan menukar
     sasaran serta-merta). Bila reticle kosong, kunci kekal s.lockHold saat. */
export function updateLock(g, slot, dt, ox, oz, dx, dz) {
  const s = slot.st;
  const cand = g.pickAimTarget(ox, oz, dx, dz, s.range, 0.3);
  if (slot.lockHold > 0) slot.lockHold -= dt;
  const locked = slot.lockTgt && slot.lockHold > 0;
  if (cand) {
    if (locked) {
      slot.lockTgt = cand; slot.lockHold = s.lockHold; slot.lockProg = s.lockT;
    } else {
      if (slot.lockCand !== cand) { slot.lockCand = cand; slot.lockProg = 0; }
      slot.lockProg = (slot.lockProg || 0) + dt;
      if (slot.lockProg >= s.lockT) {
        slot.lockTgt = cand; slot.lockHold = s.lockHold;
        Sfx.tone(1250, 0.12, 'square', 0.14, 1600);
      } else if (Math.floor((slot.lockProg - dt) * 8) !== Math.floor(slot.lockProg * 8)) {
        Sfx.tone(620 + slot.lockProg * 500, 0.04, 'square', 0.06);   // bip semasa mengunci
      }
    }
  } else {
    slot.lockCand = null;
    if (!locked) slot.lockProg = 0;
  }
  if (!(slot.lockHold > 0)) slot.lockTgt = null;
}
export function lockReady(slot) {
  return !!(slot.lockTgt && !slot.lockTgt.dead && slot.lockHold > 0);
}

export function fireWeapon(g, slot, want, dt, ox, oy, oz, dx, dy, dz) {
  const s = slot.st, w = slot.w;
  slot.beamOn = false;
  if (w.lockOn) {
    updateLock(g, slot, dt, ox, oz, dx, dz);
    if (!lockReady(slot)) return;          // tiada kunci = tidak boleh menembak
  }

  if (w.type === 'beam') {
    if (want && !slot.over && slot.reload <= 0) {
      slot.beamOn = true;
      slot.heat = clamp(slot.heat + dt * 0.42, 0, 1);
      if (slot.heat >= 1) { slot.over = true; Sfx.deny(); }

      /* Shock Lance: arka yang melekat sendiri pada satu sasaran dan
         makin menggigit selagi dipegang pada musuh yang sama. */
      if (s.arcLock) {
        let t = slot.lockOn;
        if (!t || t.dead || Math.hypot(t.x - ox, t.z - oz) > s.range ||
          (!s.thruWalls && !g.losClear(ox, oz, t.x, t.z, t))) {
          t = g.pickAimTarget(ox, oz, dx, dz, s.range, 0.85, !s.thruWalls);
          if (t !== slot.lockOn) { slot.lockOn = t; slot.ramp = 0; }
        }
        if (t) {
          slot.ramp = clamp((slot.ramp || 0) + dt / (s.rampT || 2.4), 0, 1);
          const mul = 1 + slot.ramp * ((s.ramp || 2.2) - 1);
          const dealt = s.dmg * dt * mul;
          g.damageEnemy(t, dealt, t.x - ox, 0, t.z - oz, s.knock * dt, 'tesla', slot.flags);
          if (s.leech) g.healPlayer(dealt * s.leech, !!s.overflow);
          if (s.slowHit) t.slowT = Math.max(t.slowT, s.slowHit);
          const tx = t.x, ty = t.y + t.h * 0.55, tz = t.z;
          const gl = 0.7 + slot.ramp * 1.1;
          g.fx.lightning(ox, oy, oz, tx, ty, tz,
            [w.color[0] * gl, w.color[1] * gl, w.color[2] * gl], 5 + Math.round(slot.ramp * 5));
          if (Math.random() < 0.35 + slot.ramp * 0.4) {
            g.fx.spark(tx, ty, tz, 2 + Math.round(slot.ramp * 5), w.color, { speed: 5, size: 0.28, life: 0.24 });
          }
          if (g.time - slot.fireT > 0.1) { slot.fireT = g.time; Sfx.shoot('shocklance'); }
          g.shake(0.006 + slot.ramp * 0.01, 0);
        } else { slot.ramp = 0; }
        return;
      }

      // Drain Beam: jarak dekat, jadi pancaran membengkok ke musuh terhampir
      let ax = dx, ay = dy, az = dz;
      if (s.snap) {
        const t = g.pickAimTarget(ox, oz, dx, dz, s.range, s.snap, !s.thruWalls);
        if (t) {
          const nx = t.x - ox, ny = (t.y + t.h * 0.45) - oy, nz = t.z - oz;
          const nl = Math.hypot(nx, ny, nz) || 1;
          ax = nx / nl; ay = ny / nl; az = nz / nl;
        }
      }

      const hits = g.rayHit(ox, oy, oz, ax, ay, az, s.range, s.single ? 0 : Math.round(s.pierce), s.thruWalls);
      const focus = s.focus && hits.length === 1 ? 1.35 : 1;
      // pancaran berhenti pada dinding (kecuali Lance / Phase Rounds)
      let end = s.thruWalls ? s.range : Math.min(s.range, g.wallDist(ox, oz, ax, az, s.range, oy) + 0.4);
      for (const h of hits) {
        let mul = focus;
        // Lance Rifle: kurang kuasa bila sasaran terlalu dekat
        if (s.nearFalloff && h.d < s.nearFalloff) mul *= (s.nearMul || 0.45);
        const dealt = s.dmg * dt * mul;
        g.damageEnemy(h.e, dealt, ax, ay, az, s.knock * dt, 'laser', slot.flags);
        if (s.leech) g.healPlayer(dealt * s.leech, !!s.overflow);
        if (s.slowHit) h.e.slowT = Math.max(h.e.slowT, s.slowHit);
        if (h.d < end && hits.indexOf(h) === hits.length - 1) end = Math.min(end, h.d + 2);
      }
      const ex = ox + ax * end, ey = oy + ay * end, ez = oz + az * end;
      g.fx.beam(ox, oy, oz, ex, ey, ez, w.color, 0.16 + Math.sin(g.time * 40) * 0.03, 0.05);
      g.fx.beam(ox, oy, oz, ex, ey, ez, [w.color[0] * 0.4, w.color[1] * 0.4, w.color[2] * 0.5], 0.42, 0.05);
      if (Math.random() < 0.5) g.fx.spark(ex, ey, ez, 2, w.color, { speed: 5, size: 0.3, life: 0.2 });
      if (g.time - slot.fireT > 0.12) { slot.fireT = g.time; Sfx.shoot(w.sfx || 'laser'); }
      g.shake(0.35 * dt * 60 * 0.016, 0);
    } else { slot.ramp = 0; slot.lockOn = null; }
    return;
  }

  if (w.type === 'tether') {
    if (want && !slot.over && slot.reload <= 0) {
      slot.beamOn = true;
      slot.heat = clamp(slot.heat + dt * 0.3, 0, 1);
      if (slot.heat >= 1) { slot.over = true; Sfx.deny(); }
      let t = slot.target;
      if (!t || t.dead || Math.hypot(t.x - ox, t.z - oz) > s.range ||
        (!s.thruWalls && !g.losClear(ox, oz, t.x, t.z, t))) {
        t = slot.target = g.nearestEnemy(ox, oz, s.range, null, !s.thruWalls);
      }
      if (t) {
        const dmg = s.dmg * dt;
        g.damageEnemy(t, dmg, t.x - ox, 0, t.z - oz, 0, 'laser', slot.flags);
        g.healPlayer(dmg * (s.leech || 0.34), !!s.overflow);
        const tx = t.x, ty = t.y + t.h * 0.55, tz = t.z;
        g.fx.beam(ox, oy, oz, tx, ty, tz, w.color, 0.17 + Math.sin(g.time * 30) * 0.03, 0.06);
        g.fx.beam(ox, oy, oz, tx, ty, tz, [w.color[0] * 0.4, w.color[1] * 0.3, w.color[2] * 0.4], 0.44, 0.06);
        if (Math.random() < 0.6) {
          g.fx.add.emit(tx + rand(-0.4, 0.4), ty, tz + rand(-0.4, 0.4),
            (ox - tx) * 1.6, (oy - ty) * 1.6, (oz - tz) * 1.6,
            { color: w.color, color2: [0.4, 0.1, 0.3], size: 0.3, size2: 0.05, life: 0.35, drag: 0.4 });
        }
        if (g.time - slot.fireT > 0.15) { slot.fireT = g.time; Sfx.shoot('laser'); }
      }
    } else slot.target = null;
    return;
  }

  if (w.type === 'charge') {
    if (!want && slot.charge > 0) {
      if (slot.charge > 0.55 && slot.mag > 0) {
        slot.mag--;
        // menembusi SEMUA musuh dalam barisan, tetapi berhenti pada dinding
        const hits = g.rayHit(ox, oy, oz, dx, dy, dz, s.range, 99, s.thruWalls);
        const power = 0.45 + slot.charge * 0.75;
        for (const h of hits) {
          g.damageEnemy(h.e, s.dmg * power, dx, dy, dz, s.knock, 'rail', slot.flags);
          if (s.shockTrail) g.splash(h.p.x, h.p.y, h.p.z, 4.5, s.dmg * 0.18, w.color, false);
        }
        const hl = Math.hypot(dx, dz) || 1e-6;
        const len = s.thruWalls ? s.range : Math.min(s.range, g.wallDist(ox, oz, dx, dz, s.range * hl, oy) / hl + 0.4);
        const ex = ox + dx * len, ey = oy + dy * len, ez = oz + dz * len;
        if (len < s.range - 0.5) g.fx.spark(ex, ey, ez, 10, w.color, { speed: 7, size: 0.35, life: 0.35 });
        g.fx.beam(ox, oy, oz, ex, ey, ez, [w.color[0] * 1.4, w.color[1] * 1.3, w.color[2] * 1.5], 0.34 * power, 0.28);
        g.fx.beam(ox, oy, oz, ex, ey, ez, [1.8, 1.6, 2.2], 0.1 * power, 0.32);
        g.fx.muzzle(ox, oy, oz, dx, dy, dz, 2.6 * power, w.color);
        g.fx.flash(ox, oy, oz, w.color, 26 * power, 0.22, 46);
        Sfx.shoot('rail');
        g.shake(1.5 * power, 0.35);
        g.recoil(-dx, -dz, 16 * power);
        slot.cd = 1 / s.rof;
      }
      slot.charge = 0;
    }
    return;
  }

  // senjata tenaga tanpa had: tiada magazin, hanya suhu
  if (s.infinite) {
    const cool = (s.coolFast ? 0.95 : 0.6);
    if (!want) slot.heat = clamp(slot.heat - cool * dt, 0, 1);
    if (!want || slot.cd > 0) return;
    // satu tembakan = satu kenaikan, jadi bar bergerak selaras dengan apa yang dilihat
    slot.heat = clamp(slot.heat + (s.heatPerShot || 0.06), 0, 1);
  } else if (!want || slot.cd > 0 || slot.reload > 0 || slot.mag <= 0) return;
  if (w.type === 'proj' && slot.id === 'minigun' && slot.spin < 0.55) return;

  slot.cd = 1 / (s.rof * (slot.id === 'minigun' ? (0.45 + slot.spin * 0.55) : 1));
  /* Wily menembak empat das rapat, berhenti seketika, kemudian empat lagi.
     Jeda itu yang menjadikannya terasa seperti dua pusingan, bukan lapan
     das rata. */
  if (s.seq) {
    const fired = s.mag - slot.mag;            // 0..7
    if ((fired + 1) % s.seq === 0) slot.cd += s.seqPause || 0.5;
  }
  /* Fist: setiap tumbukan dalam magazin lebih kuat daripada sebelumnya.
     Magazin penuh = tumbukan pertama, magazin terakhir = tumbukan penghabisan. */
  let comboMul = 1;
  if (s.combo) {
    const n2 = clamp(s.mag - slot.mag, 0, s.combo.length - 1);
    comboMul = s.combo[n2];
    slot.comboStep = n2;
  }
  if (!s.infinite) slot.mag--;
  slot.fireT = g.time;

  // senjata tandatangan kereta baharu - lihat weapons2.js
  if (w.custom) { fireCustom(g, slot, s, w, ox, oy, oz, dx, dy, dz); return; }

  switch (w.type) {
    case 'proj': {
      if (slot.id === 'lash' || slot.id === 'nettle') { fireCreature(g, slot, s, w, ox, oy, oz, dx, dy, dz); break; }
      const n = s.pellets;
      /* Phase Repeater: tembakan pertama setiap rentetan LURUS betul, kemudian
         kumpulan makin terbuka mengikut bar haba. Serakan mendatar sahaja supaya
         peluru tidak melayang atas dinding. */
      const sp2 = s.heatSpread ? s.spread + slot.heat * s.heatSpread : s.spread;
      for (let i = 0; i < n; i++) {
        /* serakan SENTIASA mendatar: serakan menegak menghantar pelet melayang
           atas dinding dan nampak seperti menembusinya */
        const [ax, ay, az] = spread(dx, dy, dz, sp2, true);
        g.spawnBullet({
          x: ox, y: oy, z: oz, vx: ax * s.speed, vy: ay * s.speed, vz: az * s.speed,
          dmg: s.dmg * comboMul, life: s.range / s.speed, pierce: Math.round(s.pierce), knock: s.knock * comboMul,
          color: comboMul > 1 ? [w.color[0] * comboMul * 0.8, w.color[1], w.color[2]] : w.color,
          size: w.orb ? 0.34 : (slot.id === 'shotgun' || slot.id === 'autoshot') ? 0.09
            : s.combo ? 0.1 + comboMul * 0.05 : 0.075,
          len: slot.id === 'smg' ? 1.6 : slot.id === 'sniper' ? 4.2 : 2.4,
          splash: s.splash || 0, kind: w.orb ? 'plasma' : undefined,
          burn: s.burn ? 2.2 * (s.burnMul || 1) : 0, slow: s.slowOnHit || 0,
          saw: s.saw || 0, root: s.rootArea || 0, rootT: s.rootTime || 0, rootVuln: s.rootVuln || 0,
          flak: s.flak || 0, burnBonus: !!s.burnBonus, owner: 'p', thru: s.thruWalls,
          lift: s.lift || 0, liftArea: s.liftArea || 0,
          glue: s.glue || 0, glueR: s.glueR || 0,
          shock: s.shockT || 0, shockDps: s.shockT ? s.dmg * s.shockMul * 3 : 0,
          sonic: slot.id === 'arbog', bolt: slot.id === 'juhag', star: slot.id === 'nail',
        });
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, slot.id === 'shotgun' ? 1.6 : comboMul, w.color);
      if (s.combo) {
        // tumbukan makin besar makin bergema
        g.fx.flash(ox, oy, oz, w.color, 8 * comboMul, 0.12, 22);
        Sfx.fist(slot.comboStep || 0, s.combo.length);
      } else Sfx.shoot(w.sfx);
      g.shake((slot.id === 'shotgun' ? 0.5 : 0.14) * (s.combo ? comboMul : 1), 0.06);
      g.recoil(-dx, -dz, (slot.id === 'shotgun' ? 5.5 : 0.8) * (s.combo ? comboMul : 1));
      break;
    }
    case 'rocket': {
      if (w.sky) {
        // Vulag: lancar tegak ke langit, menjunam ke sasaran berkunci (lihat updateBullets)
        const n = Math.round(s.pellets);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          g.spawnBullet({
            sky: true, tgt: slot.lockTgt, apex: 30 + i * 3, dive: false,
            x: ox + Math.cos(a) * 0.4, y: oy + 0.3, z: oz + Math.sin(a) * 0.4,
            vx: Math.cos(a) * 3, vy: 42 + i * 2, vz: Math.sin(a) * 3,
            dmg: s.dmg, life: 9, pierce: 0, knock: s.knock, splash: s.splash,
            color: w.color, size: 0.16, len: 1.4, rocket: true, owner: 'p', thru: s.thruWalls,
          });
        }
        g.fx.muzzle(ox, oy, oz, 0, 1, 0, 2.2, w.color);
        g.fx.smoke(ox, oy, oz, 8, { speed: 4, size: 1.3, life: 1.1, alpha: 0.55 });
        Sfx.shoot('rocket');
        g.shake(0.6, 0.14);
        break;
      }
      const shots = w.homing ? (s.sixPack ? 6 : Math.round(s.pellets)) : (s.twin ? 2 : 1);
      void shots;
      // peluru berpandu mengunci apa yang berada di bawah reticle semasa dilepaskan
      const lock = w.homing ? g.pickAimTarget(ox, oz, dx, dz, s.range, 0.6) : null;
      let lobTgt = null;
      for (let i = 0; i < shots; i++) {
        const off = shots > 1 ? (i - 0.5) * 0.6 : 0;
        const [ax, ay, az] = spread(dx, dy, dz, s.spread, !!w.homing || !!s.lob);
        let vx0 = ax * s.speed, vy0 = w.homing ? 0 : ay * s.speed, vz0 = az * s.speed;
        let life = s.range / s.speed + (w.homing ? 1.2 : 0), grav = 0;
        if (s.lob) {
          /* Mortar: lengkung balistik ke titik di bawah reticle. Peluru naik
             tinggi dan jatuh, jadi ia melepasi dinding dari ATAS - bukan menembusinya. */
          const hd = Math.hypot(dx, dz) || 1e-6;
          let dist = clamp(dy < -0.01 ? oy / -dy * hd : s.range, 10, s.range);
          let ux = ax, uz = az;
          /* Siege Mortar: dulu peluru terlalu perlahan (39 m/s mendatar) dan
             mendarat di tempat musuh BERADA, bukan di tempat ia AKAN berada -
             hampir mustahil kena sasaran bergerak. Sekarang: kunci musuh di
             bawah reticle, ramal kedudukannya ikut masa terbang, dan peluru
             membetulkan arah semasa jatuh (b.lobTgt dalam updateBullets). */
          let ltgt = null;
          if (s.lob) {   // semua mortar mengunci & meramal (dahulu Siege Mortar sahaja)
            ltgt = g.pickAimTarget(ox, oz, dx, dz, s.range + 10, 0.42);
            if (ltgt) {
              let tx = ltgt.x, tz = ltgt.z;
              for (let k = 0; k < 2; k++) {
                const T2 = Math.max(0.3, Math.hypot(tx - ox, tz - oz) / (s.speed * 1.3));
                tx = ltgt.x + (ltgt.vx || 0) * T2 * 0.85; tz = ltgt.z + (ltgt.vz || 0) * T2 * 0.85;
              }
              dist = clamp(Math.hypot(tx - ox, tz - oz), 6, s.range + 10);
              ux = tx - ox; uz = tz - oz;
            }
          }
          const fast = slot.id === 'mortar';
          grav = fast ? 46 : 32;
          /* lengkung TINGGI: puncak sekurang-kurangnya 12m (atas dinding), jadi masa
             terbang minimum T = sqrt(8h/g) walaupun sasaran dekat */
          const T = Math.max(dist / (s.speed * (fast ? 1.3 : 0.75)), Math.sqrt(8 * 12 / grav)), vh = dist / T, ah = Math.hypot(ux, uz) || 1;
          vx0 = ux / ah * vh; vz0 = uz / ah * vh;
          vy0 = (0.3 - oy) / T + 0.5 * grav * T;
          life = T + 0.4;
          lobTgt = ltgt;
        }
        g.spawnBullet({
          tgt: lock, grav, lobTgt,
          x: ox - dz * off, y: oy, z: oz + dx * off, vx: vx0, vy: vy0, vz: vz0,
          dmg: s.dmg, life, pierce: 0, knock: s.knock, splash: s.splash,
          color: w.color, size: w.homing ? 0.14 : 0.2, len: 1.1, rocket: true, owner: 'p', thru: s.thruWalls,
          burn: s.burn ? 2.6 * (s.burnMul || 1) : 0, slow: s.slowOnHit || 0,
          well: s.well || 0, hive: s.hiveLife || 0,
          homing: w.homing ? w.homing * (s.homingBoost ? 1.6 : 1) : 0,
        });
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 2, w.color);
      g.fx.smoke(ox, oy, oz, 5, { speed: 3, size: 1.2, life: 1.0, alpha: 0.5 });
      Sfx.shoot('rocket');
      g.shake(0.7, 0.14); g.recoil(-dx, -dz, 6);
      break;
    }
    case 'flame': {
      // Water Jet menyembur deras dan bergolak, bukan pancutan lurus
      const n = s.gush ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const [ax, ay, az] = spread(dx, dy, dz, s.spread * (s.gush ? rand(0.4, 1.4) : 1));
        const sp = s.speed * (s.gush ? rand(0.65, 1.25) : 1);
        g.spawnBullet({
          x: ox, y: oy, z: oz,
          vx: ax * sp + g.player.vx * 0.5,
          vy: ay * sp + (s.gush ? rand(-0.4, 2.2) : 1.2),
          vz: az * sp + g.player.vz * 0.5,
          dmg: s.dmg, life: s.range / s.speed, pierce: 99, knock: s.knock,
          color: w.color, size: s.gush ? rand(0.4, 0.75) : 0.5, len: 0.6, flame: true,
          burn: s.amber ? 0 : (s.burn2 ? 4 : 2.2), owner: 'p', thru: s.thruWalls,
          soak: s.soak || 0, soakVuln: s.soakVuln || 0,
          amber: s.amber ? (s.amberDps || 40) : 0, amberImm: s.amberImm || 0,
        });
      }
      if (Math.random() < 0.5) Sfx.shoot(w.sfx || 'flame');
      g.fx.flash(ox, oy, oz, w.color, 5, 0.1, 16);
      break;
    }
    case 'fan': {
      const n = Math.max(1, Math.round(s.pellets));
      const spreadArc = 0.26;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2;
        const a = t * spreadArc;
        const ca = Math.cos(a), sa = Math.sin(a);
        const rx2 = dx * ca - dz * sa, rz2 = dx * sa + dz * ca;   // putar mendatar sahaja
        g.spawnBullet({
          x: ox, y: oy, z: oz, vx: rx2 * s.speed, vy: dy * s.speed * 0.3, vz: rz2 * s.speed,
          dmg: s.dmg, life: s.range / s.speed, pierce: Math.round(s.pierce), knock: s.knock,
          color: w.color, size: 0.1, len: 2.6, owner: 'p', thru: s.thruWalls,
        });
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.5, w.color);
      Sfx.shoot(w.sfx);
      g.shake(0.35, 0.08);
      g.recoil(-dx, -dz, 3);
      break;
    }

    case 'orbit': {
      g.spawnDisc(s, w, slot.flags);
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.3, w.color);
      Sfx.shoot('drill');
      g.shake(0.28, 0.07);
      g.recoil(-dx, -dz, 2);
      break;
    }

    case 'wave': {
      g.repulsorWave(ox, oy, oz, dx, dz, s.range, s.waveArc || 0.2, s.dmg, s.knock, s.stun || 0, w.color, s.thruWalls);
      Sfx.noise(0.35, 0.4, 700, 1.2);
      Sfx.tone(150, 0.35, 'sawtooth', 0.18, 60);
      g.shake(0.6, 0.16);
      g.recoil(-dx, -dz, 5);
      break;
    }

    case 'chain': {
      const chain = Math.round(s.pierce) + 1;
      let sx = ox, sy = oy, sz = oz;
      const hitList = [];
      for (let i = 0; i < chain; i++) {
        // kilat tidak melompat menembusi dinding (kecuali Phase Rounds)
        const e = g.nearestEnemy(sx, sz, s.range * (i === 0 ? 1 : 0.62), hitList, !s.thruWalls);
        if (!e) break;
        hitList.push(e);
        const tx = e.x, ty = e.y + e.h * 0.55, tz = e.z;
        g.fx.lightning(sx, sy, sz, tx, ty, tz, w.color, 6);
        g.damageEnemy(e, s.dmg * Math.pow(0.85, i), (tx - sx), 0, (tz - sz), s.knock, 'tesla', i === 0 ? slot.flags : null);
        if (s.slow) { e.slowT = 1.6; }
        if (s.markHit) { e.markT = 3; e.markAmt = Math.max(e.markAmt || 0, s.markHit); }
        g.fx.spark(tx, ty, tz, 6, w.color, { speed: 5, size: 0.35, life: 0.3 });
        sx = tx; sy = ty; sz = tz;
      }
      g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.2, w.color);
      Sfx.shoot('tesla');
      g.shake(0.3, 0.08);
      break;
    }
  }
}

/* Peluru "makhluk": Serpent Lash (rantai ular) & Nettle Swarm (obor-obor) */
function fireCreature(g, slot, s, w, ox, oy, oz, dx, dy, dz) {
  const hl = Math.hypot(dx, dz) || 1;
  const fxn = dx / hl, fzn = dz / hl;
  if (slot.id === 'lash') {
    const chains = s.twinChain ? 2 : 1, n = Math.round(s.pellets);
    for (let c = 0; c < chains; c++) {
      const side = chains > 1 ? (c ? 1 : -1) : 0;
      for (let i = 0; i < n; i++) {
        const ph = -i * 0.75 + (side > 0 ? Math.PI : 0);
        g.spawnBullet({
          x: ox - fxn * i * 1.1 + fzn * side * 0.6, y: oy, z: oz - fzn * i * 1.1 - fxn * side * 0.6,
          vx: fxn * s.speed, vy: dy * s.speed * 0.4, vz: fzn * s.speed,
          dmg: s.dmg, life: (s.range + i * 1.1) / s.speed, pierce: Math.round(s.pierce), knock: s.knock,
          color: w.color, size: 0.32 - i * 0.035, len: 0.5, kind: 'plasma',
          wave: { amp: s.waveAmp, f: 9, ph, lx: fzn, lz: -fxn, last: Math.sin(ph) * s.waveAmp },
          owner: 'p', thru: s.thruWalls,
        });
      }
    }
    g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.4, w.color);
    Sfx.shoot('lash');
    g.shake(0.25, 0.06);
    return;
  }
  // nettle: kipas obor-obor terapung yang mengejar
  const n = Math.round(s.pellets), arc = 0.9;
  for (let i = 0; i < n; i++) {
    const a = n > 1 ? (i / (n - 1) - 0.5) * arc : 0;
    const ca = Math.cos(a), sa = Math.sin(a);
    const vx = (fxn * ca - fzn * sa) * s.speed, vz = (fxn * sa + fzn * ca) * s.speed;
    g.spawnBullet({
      x: ox, y: oy + 0.2, z: oz, vx, vy: rand(1, 2.5), vz,
      dmg: s.dmg, life: s.range / s.speed + 0.5, pierce: 0, knock: s.knock, splash: s.splash,
      color: w.color, size: 0.36, len: 0.45, kind: 'plasma', homing: 1.5, jelly: true,
      slow: s.slowOnHit, shock: 1.5, shockDps: s.dmg * 0.6,
      owner: 'p', thru: s.thruWalls,
    });
  }
  g.fx.muzzle(ox, oy, oz, dx, dy, dz, 1.2, w.color);
  Sfx.shoot('nettle');
}

function avg(a) { let t = 0; for (const v of a) t += v; return t / a.length; }

function spread(dx, dy, dz, amt, flat) {
  if (amt <= 0) return [dx, dy, dz];
  if (flat) {
    // putaran mendatar sahaja: peluru kekal pada paras yang sama dan
    // masih dihalang oleh dinding, tidak melayang atasnya
    const a = rand(-amt, amt);
    const ca = Math.cos(a), sa = Math.sin(a);
    const nx = dx * ca - dz * sa, nz = dx * sa + dz * ca;
    const l2 = Math.hypot(nx, dy, nz) || 1;
    return [nx / l2, dy / l2, nz / l2];
  }
  const a = rand(TAU), r = Math.sqrt(Math.random()) * amt;
  // asas ortonormal kasar
  let ux = -dz, uy = 0, uz = dx;
  const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  const vx = uy * dz - uz * dy, vy = uz * dx - ux * dz, vz = ux * dy - uy * dx;
  const ox = dx + (ux * Math.cos(a) + vx * Math.sin(a)) * r;
  const oy = dy + (uy * Math.cos(a) + vy * Math.sin(a)) * r;
  const oz = dz + (uz * Math.cos(a) + vz * Math.sin(a)) * r;
  const l = Math.hypot(ox, oy, oz) || 1;
  return [ox / l, oy / l, oz / l];
}

export { pick, randInt };

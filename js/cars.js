// cars.js — kenderaan yang boleh dibeli + kebolehan khas (butang SPACE)
import { rand, randInt, clamp, lerp, TAU, PI, Sfx, Save } from './core.js';
import { spawnWave, spawnTornado } from './elements.js';
import { ABILITY2 } from './abilities2.js';
import { SIG_OF_CAR } from './weapons.js';

/* ---------------- definisi kereta ---------------- */
export const CARS = [
  {
    id: 'ranger', name: 'Ranger', price: 0, ability: 'overdrive', color: '#c8342c',
    role: 'FIGHTER', style: 'ALL-ROUNDER', good: 'learning the game', modes: ['zombie', 'alien', 'war'],
    tip: 'Nothing special, nothing bad. Keep it until you know what you like.',
    desc: 'The starter vehicle. Balanced in every situation.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, nose: 'bar', cabin: 'closed', wheels: 4 , wheelR: 0.46, body: 'ranger', limbs: 'w4', wings: null, sig: null, accent: '#ffb23f' },
    mods: { hp: 10, speed: 1, grip: 1, ram: 1, nitro: 1 },
    slots: 2, upMax: { armor: 8, plate: 6, engine: 8, grip: 6, ram: 6, nitro: 5, magnet: 5, repair: 5 },
  },
  {
    id: 'bastion', name: 'Bastion', price: 6500, ability: 'aegis', color: '#4a5f43',
    role: 'TANK', style: 'TANK', good: 'holding a line', modes: ['war', 'zombie'],
    tip: 'Drive into them and let the armour do the work.',
    desc: 'Thick armour and a heavy ram bar. Slow, but very hard to destroy.',
    spec: { w: 1.18, len: 1.1, armor: 'heavy', extra: null, nose: 'plow', cabin: 'closed', wheels: 6 , wheelR: 0.52, body: 'bastion', limbs: 'tracks', wings: null, sig: null, accent: '#9dff6a' },
    mods: { hp: 55, speed: 0.88, grip: 0.94, ram: 1.5, nitro: 0.9 },
    slots: 3, upMax: { armor: 12, plate: 9, engine: 5, grip: 5, ram: 10, nitro: 4, magnet: 4, repair: 5 },
  },
  {
    id: 'seraph', name: 'Seraph', price: 9000, ability: 'repair', color: '#d8dee6',
    role: 'SUPPORT', style: 'HEALER', good: 'long survival runs', modes: ['zombie', 'alien'],
    tip: 'Heal between waves instead of retreating.',
    desc: 'A support vehicle with a built-in nano-repair unit.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#4dffa8', nose: null, cabin: null, wheels: 4 , wheelR: 0.44, body: 'seraph', limbs: 'hover', wings: null, sig: null },
    mods: { hp: 30, speed: 0.98, grip: 1.05, ram: 0.9, nitro: 1.1 },
    slots: 2, upMax: { armor: 7, plate: 6, engine: 7, grip: 7, ram: 4, nitro: 6, magnet: 7, repair: 10 },
  },
  {
    id: 'trapper', name: 'Trapper', price: 11000, ability: 'mines', color: '#7a6a2e',
    role: 'CONTROLLER', style: 'TRAPPER', good: 'chokepoints and chasers', modes: ['zombie'],
    tip: 'Drop mines while running, let the horde follow you into them.',
    desc: 'Carries a mine rack at the back. Trap whatever is chasing you.',
    spec: { w: 1.04, len: 1.08, armor: 'mid', extra: 'rack', nose: 'bar', cabin: 'closed', wheels: 4, bed: true , wheelR: 0.52, body: 'truck', limbs: 'w6', wings: null, sig: 'rails' },
    mods: { hp: 15, speed: 1.0, grip: 1.0, ram: 1.1, nitro: 1 },
    slots: 3, upMax: { armor: 8, plate: 7, engine: 7, grip: 7, ram: 7, nitro: 5, magnet: 6, repair: 5 },
  },
  {
    id: 'vortex', name: 'Vortex', price: 14000, ability: 'absorb', color: '#2c4a7a',
    role: 'TANK', style: 'ABSORBER', good: 'standing in enemy fire', modes: ['war', 'alien'],
    tip: 'Turn it on when you are being shot, not before.',
    desc: 'Absorber field generator: incoming damage is converted into HP.',
    spec: { w: 1.02, len: 0.98, armor: 'mid', extra: null, accent: '#57d6ff', nose: 'wedge', cabin: 'dome', wheels: 4 , wheelR: 0.44, body: 'ring', limbs: 'hover', wings: null, sig: null },
    mods: { hp: 20, speed: 1.0, grip: 1.04, ram: 1, nitro: 1.1 },
    slots: 3, upMax: { armor: 9, plate: 10, engine: 6, grip: 7, ram: 5, nitro: 6, magnet: 6, repair: 7 },
  },
  {
    id: 'skyhook', name: 'Skyhook', price: 18000, ability: 'hover', color: '#2e6b5f',
    role: 'FIGHTER', style: 'MOBILITY', good: 'escaping and repositioning', modes: ['zombie', 'alien'],
    tip: 'Fly over the horde when you get boxed in.',
    desc: 'Thruster pods let the car fly over enemies and obstacles.',
    spec: { w: 0.95, len: 0.95, armor: 'light', extra: null, accent: '#57d6ff', nose: 'wedge', cabin: 'cage', wheels: 4 , wheelR: 0.5, body: 'buggy', limbs: 'w4', wings: null, sig: null },
    mods: { hp: 5, speed: 1.1, grip: 1.12, ram: 0.85, nitro: 1.2 },
    slots: 2, upMax: { armor: 5, plate: 4, engine: 12, grip: 10, ram: 4, nitro: 9, magnet: 6, repair: 4 },
  },
  {
    id: 'phantom', name: 'Phantom', price: 22000, ability: 'blink', color: '#3a2c55',
    role: 'ASSASSIN', style: 'ESCAPE', good: 'hit and run', modes: ['war', 'alien'],
    tip: 'Plant the beacon somewhere safe before you dive in.',
    desc: 'Fire a beacon, then teleport to it. Escape any encirclement.',
    spec: { w: 0.94, len: 1.02, armor: 'light', extra: null, accent: '#c58bff', nose: 'wedge', cabin: 'closed', wheels: 4 , wheelR: 0.4, body: 'racer', limbs: 'w4', wings: null, sig: null },
    mods: { hp: 10, speed: 1.08, grip: 1.15, ram: 0.9, nitro: 1.15 },
    slots: 3, upMax: { armor: 5, plate: 5, engine: 10, grip: 12, ram: 4, nitro: 8, magnet: 8, repair: 4 },
  },
  {
    id: 'valkyrie', name: 'Valkyrie', price: 26000, ability: 'gunship', color: '#3d4a36',
    role: 'FIGHTER', style: 'AIR SUPPORT', good: 'mixed fights', modes: ['alien', 'war'],
    tip: 'Four slots plus a free cannon while flying.',
    desc: 'Flies while the roof autocannon fires on its own.',
    spec: { w: 1.1, len: 1.08, armor: 'mid', extra: null, accent: '#ffb23f', nose: null, cabin: null, wheels: 6 , wheelR: 0.5, body: 'valkyrie', limbs: 'none', wings: null, sig: null },
    mods: { hp: 20, speed: 1.02, grip: 1.05, ram: 1, nitro: 1.05 },
    slots: 4, upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 6, nitro: 7, magnet: 5, repair: 6 },
  },
  {
    id: 'meltdown', name: 'Meltdown', price: 30000, ability: 'nuke', color: '#6b2f1f',
    role: 'ASSASSIN', style: 'BURST', good: 'clearing a whole wave at once', modes: ['zombie'],
    tip: 'Let them surround you, then detonate.',
    desc: 'An unstable nuclear core. Huge blast that never hurts you.',
    spec: { w: 1.14, len: 1.08, armor: 'heavy', extra: null, accent: '#7dff4a', nose: 'blade', cabin: 'closed', wheels: 6 , wheelR: 0.54, body: 'tanker', limbs: 'w6', wings: null, sig: null},
    mods: { hp: 35, speed: 0.95, grip: 0.98, ram: 1.25, nitro: 0.95 },
    slots: 4, upMax: { armor: 11, plate: 9, engine: 6, grip: 5, ram: 9, nitro: 5, magnet: 5, repair: 6 },
  },
  {
    id: 'sentinel', name: 'Sentinel', price: 20000, ability: 'deploy', color: '#556070',
    role: 'CONTROLLER', style: 'DEFENCE', good: 'defending one spot', modes: ['war', 'zombie'],
    tip: 'The roof cannon never stops, so it damages even while you drive.',
    desc: 'The roof cannon fires by itself at all times. Its ability deploys two fixed turrets.',
    spec: { w: 1.08, len: 1.1, armor: 'heavy', extra: 'autocannon', accent: '#ffb23f', nose: 'plow', cabin: 'closed', wheels: 6, bed: true , wheelR: 0.54, body: 'hauler', limbs: 'tracks', wings: null, sig: null},
    mods: { hp: 30, speed: 0.94, grip: 0.98, ram: 1.15, nitro: 0.95 },
    slots: 3, upMax: { armor: 10, plate: 8, engine: 6, grip: 6, ram: 7, nitro: 5, magnet: 6, repair: 6 },
    autoCannon: { cd: 0.5, dmg: 16, range: 52, speed: 150 },
  },
  {
    id: 'reaper', name: 'Reaper', price: 24000, ability: 'siphon', color: '#5a1230',
    role: 'FIGHTER', style: 'BRAWLER', good: 'staying in the middle of the fight', modes: ['zombie'],
    tip: 'Its pulse heals you, so dive in rather than hang back.',
    desc: 'A spiked hunter. Its siphon pulse shoves enemies, steals HP and boosts damage.',
    spec: { w: 1.0, len: 1.04, armor: 'mid', extra: null, accent: '#ff5ad0', nose: 'blade', cabin: 'cage', wheels: 4 , wheelR: 0.52, body: 'scorpion', limbs: 'w4', wings: null, sig: null},
    mods: { hp: 10, speed: 1.06, grip: 1.08, ram: 1.3, nitro: 1.1 },
    slots: 3, upMax: { armor: 7, plate: 6, engine: 9, grip: 9, ram: 10, nitro: 7, magnet: 6, repair: 5 },
  },
  {
    id: 'razorback', name: 'Razorback', price: 16000, ability: 'charge', color: '#7a3a12',
    role: 'FIGHTER', style: 'RAMMER', good: 'killing by driving', modes: ['zombie'],
    tip: 'Upgrade the ram bar and you barely need weapons.',
    desc: 'Built around its ram bar. The ability turns the whole car into a battering ram.',
    spec: { w: 1.08, len: 1.02, armor: 'heavy', extra: null, nose: 'blade', cabin: 'closed', wheels: 4, bed: true, wheelR: 0.52, body: 'boar', limbs: 'w6', wings: null, sig: null, accent: '#ff8a3d' },
    mods: { hp: 25, speed: 1.05, grip: 0.98, ram: 1.6, nitro: 1.15 },
    slots: 2, upMax: { armor: 9, plate: 7, engine: 10, grip: 6, ram: 12, nitro: 8, magnet: 5, repair: 5 },
  },
  {
    id: 'revenant', name: 'Revenant', price: 19000, ability: 'secondwind', color: '#2f3a44',
    role: 'TANK', style: 'SURVIVOR', good: 'surviving a mistake', modes: ['war', 'alien'],
    tip: 'Save the ability for when you are nearly dead, not at full HP.',
    desc: 'Refuses to die. Its ability makes the car untouchable while it repairs itself.',
    spec: { w: 0.98, len: 1.25, armor: 'mid', extra: null, accent: '#9effd0', nose: 'wedge', cabin: 'closed', wheels: 6 , wheelR: 0.46, body: 'hearse', limbs: 'w6', wings: null, sig: null },
    mods: { hp: 20, speed: 1.02, grip: 1.05, ram: 1, nitro: 1.05 },
    slots: 2, upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 5, nitro: 6, magnet: 6, repair: 12 },
  },
  {
    id: 'inferno', name: 'Inferno', price: 21000, ability: 'napalm', color: '#8a2b12',
    role: 'CONTROLLER', style: 'ZONE', good: 'blocking a path', modes: ['zombie'],
    tip: 'Lay the trail across the direction they are coming from.',
    desc: 'Leaves a wall of burning napalm behind it. Let the horde chase you into it.',
    spec: { w: 1.04, len: 1.06, armor: 'mid', extra: null, accent: '#ff7a2f', nose: 'bar', cabin: 'closed', wheels: 4, bed: true , wheelR: 0.5, body: 'furnace', limbs: 'w4', wings: null, sig: null },
    mods: { hp: 15, speed: 1.0, grip: 1.0, ram: 1.1, nitro: 1.05 },
    slots: 3, upMax: { armor: 8, plate: 7, engine: 8, grip: 7, ram: 7, nitro: 6, magnet: 6, repair: 5 },
  },
  {
    id: 'oracle', name: 'Oracle', price: 23000, ability: 'uplink', color: '#20506b',
    role: 'SUPPORT', style: 'SUPPORT', good: 'boss fights', modes: ['war', 'alien'],
    tip: 'Mark first, then unload - everything you fire hits much harder.',
    desc: 'A command vehicle. Its uplink paints every nearby enemy for extra damage.',
    spec: { w: 1.0, len: 1.04, armor: 'mid', extra: null, accent: '#57d6ff', nose: 'wedge', cabin: 'dome', wheels: 4 , wheelR: 0.46, body: 'jet', limbs: 'hover', wings: null, sig: null},
    mods: { hp: 10, speed: 1.0, grip: 1.08, ram: 0.9, nitro: 1.1 },
    slots: 3, upMax: { armor: 7, plate: 7, engine: 8, grip: 9, ram: 4, nitro: 7, magnet: 9, repair: 7 },
  },
  {
    id: 'banshee', name: 'Banshee', price: 25000, ability: 'sonic', color: '#4a2060',
    role: 'CONTROLLER', style: 'CONTROL', good: 'getting out of a pile', modes: ['zombie'],
    tip: 'The cone throws them off you and stuns - an escape button.',
    desc: 'Sonic horns that blow everything in front of it off its feet.',
    spec: { w: 1.0, len: 1.0, armor: 'light', extra: null, accent: '#d48bff', nose: null, cabin: null, wheels: 4 , wheelR: 0.42, body: 'banshee', limbs: 'w4', wings: null, sig: null },
    mods: { hp: 10, speed: 1.08, grip: 1.12, ram: 1, nitro: 1.15 },
    slots: 3, upMax: { armor: 6, plate: 6, engine: 9, grip: 10, ram: 5, nitro: 8, magnet: 7, repair: 5 },
  },
  {
    id: 'spectre', name: 'Spectre', price: 27000, ability: 'cloak', color: '#58627a',
    role: 'ASSASSIN', style: 'STEALTH', good: 'dodging ranged enemies', modes: ['war', 'alien'],
    tip: 'Cloak when soldiers and tanks zero in on you.',
    desc: 'Vanishes from every targeting system for eight seconds.',
    spec: { w: 1, len: 1, armor: 'light', extra: null, accent: '#8affe0', nose: null, cabin: null, wheels: 0, body: 'spectre', limbs: 'none', wings: null, sig: null },
    mods: { hp: 5, speed: 1.12, grip: 1.16, ram: 0.85, nitro: 1.2 },
    slots: 2, upMax: { armor: 5, plate: 5, engine: 12, grip: 12, ram: 4, nitro: 9, magnet: 8, repair: 4 },
  },
  {
    id: 'tempest', name: 'Tempest', price: 29000, ability: 'storm', color: '#1d4a5c',
    role: 'CONTROLLER', style: 'AURA', good: 'fighting in close quarters', modes: ['zombie', 'alien'],
    tip: 'Damage happens automatically - just stay near them.',
    desc: 'Generates a lightning storm that chews up anything standing too close.',
    spec: { w: 1.04, len: 1.0, armor: 'mid', extra: null, accent: '#7de3ff', nose: 'bar', cabin: 'closed', wheels: 4 , wheelR: 0.5, body: 'catamaran', limbs: 'w6', wings: null, sig: null},
    mods: { hp: 15, speed: 1.0, grip: 1.05, ram: 1, nitro: 1.05 },
    slots: 3, upMax: { armor: 8, plate: 8, engine: 7, grip: 7, ram: 6, nitro: 7, magnet: 6, repair: 6 },
  },
  {
    id: 'bulwark', name: 'Bulwark', price: 31000, ability: 'barrier', color: '#5a5f3a',
    role: 'TANK', style: 'COVER', good: 'ranged firefights', modes: ['war'],
    tip: 'Drop barriers, sit behind them, shoot over the top.',
    desc: 'Drops solid energy barriers that soak up enemy fire while you shoot back.',
    spec: { w: 1.14, len: 1.06, armor: 'heavy', extra: null, accent: '#ffd257', nose: 'plow', cabin: 'closed', wheels: 6 , wheelR: 0.54, body: 'bunker', limbs: 'tracks', wings: null, sig: null },
    mods: { hp: 45, speed: 0.92, grip: 0.96, ram: 1.3, nitro: 0.92 },
    slots: 3, upMax: { armor: 12, plate: 10, engine: 5, grip: 5, ram: 8, nitro: 4, magnet: 5, repair: 6 },
  },
  {
    id: 'magnetar', name: 'Magnetar', price: 34000, ability: 'gravity', color: '#3a2a6b',
    role: 'CONTROLLER', style: 'CONTROL', good: 'gathering a scattered horde', modes: ['zombie', 'alien'],
    tip: 'Pull them into one pile, then use a blast weapon.',
    desc: 'Opens a gravity well that drags the whole horde into one pile.',
    spec: { w: 1.02, len: 1.0, armor: 'mid', extra: null, accent: '#b06bff', nose: null, cabin: null, wheels: 4 , wheelR: 0.46, body: 'magnetar', limbs: 'legs6', wings: null, sig: null,
      mounts: [[-0.95, 1.42, 0.95], [0.95, 1.42, 0.95], [0, 1.42, 1.75]] },
    mods: { hp: 10, speed: 1.0, grip: 1.06, ram: 0.95, nitro: 1.1 },
    slots: 3, upMax: { armor: 7, plate: 8, engine: 7, grip: 8, ram: 5, nitro: 7, magnet: 10, repair: 6 },
  },
  {
    id: 'juggernaut', name: 'Juggernaut', price: 38000, ability: 'fortify', color: '#4a4a4a',
    role: 'TANK', style: 'FORTRESS', good: 'standing your ground', modes: ['war'],
    tip: 'Anchoring means you cannot dodge - only use it when cornered.',
    desc: 'Plants itself, locks down, and turns into an immovable weapons platform.',
    spec: { w: 1.22, len: 1.12, armor: 'heavy', extra: 'autocannon', accent: '#ffb23f', nose: null, cabin: null, wheels: 6, wheelR: 0.58, body: 'juggernaut', limbs: 'tracks', wings: null, sig: null },
    mods: { hp: 70, speed: 0.85, grip: 0.9, ram: 1.5, nitro: 0.85 },
    slots: 4, upMax: { armor: 14, plate: 12, engine: 5, grip: 5, ram: 9, nitro: 4, magnet: 5, repair: 7 },
    autoCannon: { cd: 0.7, dmg: 14, range: 46, speed: 150 },
  },
  {
    id: 'meteor', name: 'Meteor', price: 40000, ability: 'meteordrop', color: '#8a3a14',
    role: 'ASSASSIN', style: 'DIVE', good: 'jumping onto a group', modes: ['zombie', 'alien'],
    tip: 'Jump, aim where they are thickest, then slam.',
    desc: 'Launches itself into the sky, then comes down on a target like a falling rock.',
    spec: { w: 1.02, len: 1.04, armor: 'mid', extra: null, accent: '#ff7a2f', nose: 'wedge', cabin: 'closed', wheels: 4, wheelR: 0.44, body: 'capsule', limbs: 'w4', wings: null, sig: null },
    mods: { hp: 20, speed: 1.04, grip: 1.05, ram: 1.4, nitro: 1.1 },
    slots: 3, upMax: { armor: 8, plate: 7, engine: 9, grip: 8, ram: 10, nitro: 8, magnet: 6, repair: 5 },
  },
  {
    id: 'warden', name: 'Warden', price: 43000, ability: 'lockdown', color: '#2c3f52',
    role: 'CONTROLLER', style: 'LOCKDOWN', good: 'shutting down a whole wave', modes: ['war', 'alien'],
    tip: 'Freeze them, then take your time killing them.',
    desc: 'Projects a containment field that pins every enemy in place and grinds them down.',
    spec: { w: 1.16, len: 1.08, armor: 'heavy', extra: null, accent: '#57d6ff', nose: null, cabin: null, wheels: 6, wheelR: 0.54, body: 'turtle', limbs: 'legs8', wings: null, sig: null },
    mods: { hp: 50, speed: 0.9, grip: 0.95, ram: 1.25, nitro: 0.9 },
    slots: 4, upMax: { armor: 12, plate: 10, engine: 5, grip: 6, ram: 7, nitro: 5, magnet: 6, repair: 7 },
  },
  {
    id: 'albatross', name: 'Albatross', price: 46000, ability: 'endlessflight', color: '#3f5f72',
    role: 'SNIPER', style: 'GLASS CANNON', good: 'players who dodge well', modes: ['alien', 'war'],
    tip: 'More damage but far more fragile - never sit still.',
    desc: 'Stays airborne as long as you want. Hits far harder up there, but takes more too.',
    spec: { w: 1.0, len: 1.06, armor: 'light', extra: null, accent: '#9ae8ff', nose: 'wedge', cabin: 'dome', wheels: 4, wheelR: 0.42, body: 'glider', limbs: 'hover', wings: null, sig: null },
    mods: { hp: 0, speed: 1.1, grip: 1.14, ram: 0.8, nitro: 1.2 },
    slots: 3, upMax: { armor: 5, plate: 5, engine: 11, grip: 11, ram: 4, nitro: 9, magnet: 7, repair: 5 },
  },
  {
    id: 'rampart', name: 'Rampart', price: 49000, ability: 'prowshield', color: '#5c5330',
    role: 'TANK', style: 'SHIELD BRAWLER', good: 'driving through crowds', modes: ['zombie'],
    tip: 'Keep the nose pointed at them and the shield feeds you armour.',
    desc: 'Raises an absorber plate across its nose. Drive through the horde and feed on the hits.',
    spec: { w: 1.18, len: 1.04, armor: 'heavy', extra: null, accent: '#ffd257', nose: 'plow', cabin: 'closed', wheels: 6, wheelR: 0.52, body: 'shieldwall', limbs: 'tracks', wings: null, sig: null },
    mods: { hp: 55, speed: 0.92, grip: 0.96, ram: 1.45, nitro: 0.9 },
    slots: 3, upMax: { armor: 13, plate: 11, engine: 5, grip: 5, ram: 10, nitro: 4, magnet: 5, repair: 7 },
  },
  {
    id: 'cascade', name: 'Cascade', price: 52000, ability: 'chainreaction', color: '#1f4a63',
    role: 'FIGHTER', style: 'CHAIN BURST', good: 'packed waves', modes: ['zombie'],
    tip: 'Wait until they bunch up, then set off the chain.',
    desc: 'One discharge that leaps through up to twenty bodies before it dies out.',
    spec: { w: 1.02, len: 1.0, armor: 'mid', extra: null, accent: '#7de3ff', nose: 'wedge', cabin: 'dome', wheels: 4, wheelR: 0.46, body: 'crystal', limbs: 'legs6', wings: null, sig: null,
      mounts: [[-0.82, 1.42, 0.85], [0.82, 1.42, 0.85], [0, 1.42, 1.55]] },
    mods: { hp: 10, speed: 1.02, grip: 1.08, ram: 0.95, nitro: 1.1 },
    slots: 3, upMax: { armor: 7, plate: 7, engine: 8, grip: 9, ram: 5, nitro: 7, magnet: 7, repair: 6 },
  },
  {
    id: 'stormwing', name: 'Stormwing', price: 55000, ability: 'tetherstorm', color: '#243a6b',
    role: 'FIGHTER', style: 'AIR SUSTAIN', good: 'clearing while airborne', modes: ['alien', 'zombie'],
    tip: 'Flying plus constant tethers - safe damage over time.',
    desc: 'Flies while arcs of current hang off it, chewing through everything underneath.',
    spec: { w: 1.0, len: 1.04, armor: 'light', extra: null, accent: '#8ab6ff', nose: 'wedge', cabin: 'cage', wheels: 4, wheelR: 0.44, body: 'dragonfly', limbs: 'hover', wings: null, sig: null },
    mods: { hp: 10, speed: 1.06, grip: 1.12, ram: 0.85, nitro: 1.15 },
    slots: 3, upMax: { armor: 6, plate: 6, engine: 10, grip: 10, ram: 4, nitro: 9, magnet: 7, repair: 5 },
  },
  {
    id: 'hydra', name: 'Hydra', price: 58000, ability: 'weaponbloom', color: '#4a2a4a',
    role: 'FIGHTER', style: 'FIREPOWER', good: 'raw damage output', modes: ['war', 'alien'],
    tip: 'Six guns at once - best on a car build with expensive weapons.',
    desc: 'Unfolds two extra hardpoints on demand. Six guns firing, then it packs them away.',
    spec: { w: 1.12, len: 1.08, armor: 'mid', extra: null, accent: '#d48bff', nose: null, cabin: null, wheels: 6, wheelR: 0.5, body: 'hydra', limbs: 'none', wings: null, sig: null },
    mods: { hp: 25, speed: 0.55, grip: 1.0, ram: 1.1, nitro: 1.0 },     // Nabil: kaki 4 tebal - perlahan GILA
    slots: 4, mountSlots: 6, extraSlots: 2,
    upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 6, nitro: 6, magnet: 6, repair: 6 },
  },
  {
    id: 'mirage', name: 'Mirage', price: 61000, ability: 'decoyfield', color: '#2a2a33',
    role: 'ASSASSIN', style: 'DECOY', good: 'surviving heavy fire', modes: ['war'],
    tip: 'The decoy takes everything - use it to reposition, not to hide.',
    desc: 'Drops a screaming decoy and disappears. Let them shoot the hologram instead.',
    spec: { w: 0.96, len: 1.04, armor: 'light', extra: null, accent: '#ff5a3c', nose: 'wedge', cabin: 'closed', wheels: 4, wheelR: 0.42, body: 'hyper', limbs: 'w4', wings: null, sig: null },
    mods: { hp: 10, speed: 1.1, grip: 1.14, ram: 0.9, nitro: 1.18 },
    slots: 3, upMax: { armor: 6, plate: 6, engine: 10, grip: 11, ram: 4, nitro: 9, magnet: 8, repair: 5 },
  },
  {
    id: 'sovereign', name: 'Sovereign', price: 66000, ability: 'droneswarm', color: '#2f4a3a',
    role: 'SUPPORT', style: 'SUMMONER', good: 'extra damage without aiming', modes: ['alien', 'war'],
    tip: 'The drones fight on their own while you focus on driving.',
    desc: 'Launches three wingman drones that fly escort and pick targets on their own.',
    spec: { w: 1.04, len: 1.02, armor: 'mid', extra: null, accent: '#7dffb0', nose: 'wedge', cabin: 'dome', wheels: 4, wheelR: 0.46, body: 'limo', limbs: 'hover', wings: null, sig: null },
    mods: { hp: 20, speed: 1.0, grip: 1.06, ram: 1, nitro: 1.08 },
    slots: 4, upMax: { armor: 9, plate: 8, engine: 7, grip: 8, ram: 5, nitro: 7, magnet: 8, repair: 7 },
  },
  {
    id: 'tremor', name: 'Tremor', price: 70000, ability: 'seismic', color: '#5a3a1f',
    role: 'CONTROLLER', style: 'SLAM', good: 'crowds that get too close', modes: ['zombie', 'war'],
    tip: 'Three waves in a row - the last one reaches furthest.',
    desc: 'Slams the ground hard enough to send rolling shockwaves across the arena.',
    spec: { w: 1.2, len: 1.1, armor: 'heavy', extra: null, accent: '#ffb23f', nose: 'blade', cabin: 'closed', wheels: 8, wheelR: 0.66, body: 'excavator', limbs: 'w8', wings: null, sig: null },
    mods: { hp: 65, speed: 0.88, grip: 0.92, ram: 1.55, nitro: 0.88 },
    slots: 4, upMax: { armor: 14, plate: 12, engine: 5, grip: 5, ram: 12, nitro: 4, magnet: 5, repair: 7 },
  },
  {
    id: 'kefly', name: 'Kefly', price: 52000, ability: 'strikedrone', color: '#3a4a5f',
    role: 'SNIPER', style: 'STRIKE', good: 'deleting one dangerous target from across the map', modes: ['war', 'alien', 'zombie'],
    tip: 'The drones pick their own targets and fly straight in - hit the ability when something big is still far away.',
    desc: 'A rolling drone carrier. Its deck launches five strike drones that fly straight into whatever they find and detonate.',
    spec: { w: 1.1, len: 1.12, armor: 'mid', extra: null, accent: '#ff8a4a', nose: null, cabin: null, wheels: 6, wheelR: 0.5, body: 'carrier', limbs: 'w6', wings: null, sig: null},
    mods: { hp: 25, speed: 0.98, grip: 1.0, ram: 1.05, nitro: 1.05 },
    slots: 3, upMax: { armor: 9, plate: 9, engine: 7, grip: 7, ram: 6, nitro: 7, magnet: 8, repair: 7 },
  },
  {
    id: 'atlantis', name: 'Atlantis', price: 57000, ability: 'tidalsurge', color: '#1d4a66',
    role: 'CONTROLLER', style: 'SWEEPER', good: 'clearing a lane and dragging two cars out of position', modes: ['war', 'alien', 'zombie'],
    tip: 'The wave carries whoever it catches - aim it down a lane, not into open ground.',
    desc: 'A rolling water engine. Its ability sends a wave forward that sweeps up to two cars along the current and drowns them as they ride it.',
    spec: { w: 1.08, len: 1.1, armor: 'mid', extra: null, accent: '#4ad8ff', nose: null, cabin: null, wheels: 6, wheelR: 0.5, body: 'leviathan', limbs: 'w6', wings: null, sig: null },
    mods: { hp: 30, speed: 0.97, grip: 1.02, ram: 1.1, nitro: 1.02 },
    slots: 3, upMax: { armor: 10, plate: 9, engine: 6, grip: 7, ram: 7, nitro: 6, magnet: 7, repair: 7 },
  },
  {
    id: 'typhoon', name: 'Typhoon', price: 59000, ability: 'twister', color: '#2c3f56',
    role: 'CONTROLLER', style: 'LOCKDOWN', good: 'pinning two cars in one spot', modes: ['war', 'alien'],
    tip: 'The tornado only grabs what is already standing near it - drop it on a cluster, not on empty ground.',
    desc: 'Twin counter-rotating fans. Its ability tears open a tornado that grabs up to two nearby cars and spins them helpless in the air.',
    spec: { w: 1.02, len: 1.06, armor: 'light', extra: null, accent: '#b9d8ff', nose: null, cabin: null, wheels: 4, wheelR: 0.46, body: 'cyclone', limbs: 'hover', wings: null, sig: null },
    mods: { hp: 5, speed: 1.12, grip: 1.14, ram: 0.9, nitro: 1.16 },
    slots: 3, upMax: { armor: 7, plate: 7, engine: 9, grip: 10, ram: 5, nitro: 9, magnet: 8, repair: 6 },
  },
  {
    id: 'blaze', name: 'Blaze', price: 62000, ability: 'backdraft', color: '#5a1f16',
    role: 'FIGHTER', style: 'BURST', good: 'punishing a crowd that got too close', modes: ['zombie', 'war'],
    tip: 'Let it pull them in first. The blast scales with how many it dragged into the fire.',
    desc: 'A furnace on wheels. Backdraft starves the air and hauls nearby cars toward you, then ignites all of it at once.',
    spec: { w: 1.12, len: 1.08, armor: 'heavy', extra: null, accent: '#ff8a3a', nose: null, cabin: null, wheels: 6, wheelR: 0.54, body: 'forge', limbs: 'tracks', wings: null, sig: null},
    mods: { hp: 55, speed: 0.9, grip: 0.94, ram: 1.3, nitro: 0.92 },
    slots: 4, upMax: { armor: 12, plate: 11, engine: 6, grip: 6, ram: 9, nitro: 5, magnet: 6, repair: 7 },
  },
  {
    id: 'fly', name: 'Fly', price: 74000, ability: 'vanish', color: '#2b2f22',
    role: 'ASSASSIN', style: 'GLASS CANNON', good: 'stacking firepower the longer you survive', modes: ['war', 'alien', 'zombie'],
    tip: 'Six mounts, but only two are live at the start. Deal damage to wake the rest - and use Vanish the moment you are exposed.',
    desc: 'Six weapon mounts on a fly-bodied chassis. Only two are powered at the start: deal 2,500 damage to bring two more online, and 5,000 to wake the last pair.',
    spec: { w: 1.04, len: 1.08, armor: 'light', extra: null, accent: '#9be8ff', nose: null, cabin: null, wheels: 6, wheelR: 0.42, body: 'housefly', limbs: 'none', wings: null, sig: null },
    mods: { hp: -15, speed: 1.1, grip: 1.12, ram: 0.8, nitro: 1.14 },
    slots: 6,
    /* Slot 0-1 aktif serta-merta; dua lagi pada 5k kerosakan larian, dan
       dua terakhir pada 11k. Dibaca oleh updateWeapons. */
    slotUnlock: [0, 0, 2500, 2500, 5000, 5000],
    upMax: { armor: 6, plate: 6, engine: 9, grip: 10, ram: 4, nitro: 9, magnet: 8, repair: 6 },
  },
  {
    id: 'hamvog', name: 'Hamvog', price: 64000, ability: 'siege', color: '#3b4250',
    role: 'SNIPER', style: 'SIEGE SNIPER', good: 'picking targets from cover nobody can see', modes: ['war', 'alien'],
    tip: 'Drive cloaked to a good spot, deploy, fire all five guns, then pack up and vanish before they close in.',
    desc: 'A long, low siege platform. Packed, it is cloaked and cannot be targeted - but every gun is offline. Deploy to swing out both weapon arms: it locks in place, the cloak drops, and all five weapons open fire.',
    spec: { w: 1.0, len: 1.1, armor: 'mid', extra: null, accent: '#8fd4ff', nose: null, cabin: null, wheels: 4, wheelR: 0.48, body: 'hamvog', limbs: 'wmid', wings: null, sig: null },
    mods: { hp: 20, speed: 0.96, grip: 1.0, ram: 0.9, nitro: 1.0 },
    slots: 5,
    upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 4, nitro: 6, magnet: 6, repair: 6 },
  },
  {
    id: 'hyna', name: 'Hyna', price: 68000, ability: 'absorbdome', color: '#2f2240',
    role: 'TANK', style: 'DOME CANNON', good: 'soaking a heavy push, then deleting two of them', modes: ['war', 'alien'],
    tip: 'Raise the dome when they focus you. Every shot it soaks makes the cannon hit harder - so let them waste ammo on it.',
    desc: 'Raises a huge purple absorber dome. Teammates walk in and out freely, enemies cannot enter and their shots are soaked up. After 6 seconds a cannon fires through every obstacle at the two nearest enemies.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#b46bff', nose: null, cabin: null, wheels: 0, body: 'hyna', limbs: 'gyro', wings: null, sig: null,
      mounts: [[-1.25, 1.62, 1.49], [1.25, 1.62, 1.49], [-1.25, 1.62, -1.49], [1.25, 1.62, -1.49]] },
    mods: { hp: 25, speed: 1.0, grip: 1.02, ram: 1.0, nitro: 1.0 },
    slots: 4,
    upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 5, nitro: 6, magnet: 6, repair: 6 },
  },
  {
    id: 'gyhna', name: 'Gyhna', price: 66000, ability: 'repairlink', color: '#24382f',
    role: 'SUPPORT', style: 'LINK TANK', good: 'keeping the whole team alive while it soaks the hits', modes: ['war'],
    tip: 'Link your frontliners first. Every live link hardens Gyhna too - three links stack to 200% resistance.',
    desc: 'A slow, heavy repair tank rolling on five purple energy orbs, with three link charges. Each link tethers a teammate for 10 seconds: +10 km/h, repairs and 50% resistance for them, and more resistance plus repairs for Gyhna itself.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#5dffb0', nose: null, cabin: null, wheels: 0, body: 'gyhna', limbs: 'orbs', wings: null, sig: null,
      mounts: [[-0.75, 3.12, 0.95], [0.75, 3.12, 0.95], [-0.75, 3.12, -0.4], [0.75, 3.12, -0.4]] },
    mods: { hp: 75, speed: 0.7, grip: 0.86, ram: 1.4, nitro: 0.85 },
    slots: 4,
    upMax: { armor: 12, plate: 11, engine: 6, grip: 6, ram: 8, nitro: 5, magnet: 6, repair: 8 },
  },
  {
    id: 'ouroboros', name: 'Ouroboros', price: 72000, ability: 'constrict', color: '#237a50',
    role: 'CONTROLLER', style: 'SERPENT', good: 'locking down the one enemy that matters', modes: ['war', 'zombie', 'alien'],
    tip: 'Drive in close, Constrict the biggest threat, then use the 30% lighter head to circle it while your guns finish the job.',
    desc: 'A floating armoured serpent. Its segmented body slithers along the exact path the head took, with guns riding on the spine. Constrict tears the body loose to coil around an enemy and crush it.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#3dff8a', nose: null, cabin: null, wheels: 0, body: 'ouroboros', limbs: 'serpent', wings: null, sig: null },
    mods: { hp: 15, speed: 1.08, grip: 1.15, ram: 1.1, nitro: 1.1 },
    slots: 4,
    upMax: { armor: 9, plate: 8, engine: 9, grip: 9, ram: 6, nitro: 7, magnet: 6, repair: 6 },
  },
  {
    id: 'medusa', name: 'Medusa', price: 70000, ability: 'abyssgrasp', color: '#3a1440',
    role: 'CONTROLLER', style: 'ABYSS DRIFTER', good: 'dragging enemies out of cover and feeding on them', modes: ['war', 'alien', 'zombie'],
    tip: 'Grasp pulls them OUT of cover and pins them next to you - line up your guns before you use it.',
    desc: 'A glowing abyssal jellyfish that drifts above the ground on eight living tentacles. Abyssal Grasp lashes three tentacles out, drags enemies in and drains them to heal itself.',
    spec: { w: 1, len: 1, armor: 'light', extra: null, accent: '#ff5ad8', nose: null, cabin: null, wheels: 0, body: 'medusa', limbs: 'tentacle', wings: null, sig: null },
    mods: { hp: 30, speed: 0.95, grip: 1.05, ram: 0.85, nitro: 1.0 },
    slots: 4,
    upMax: { armor: 10, plate: 9, engine: 7, grip: 7, ram: 4, nitro: 6, magnet: 7, repair: 8 },
  },
  /* ===== 10 KERETA BAHARU (2026-10-17) =====
     Setiap satu siluet + cara gerak yang belum pernah ada (models2.js), kebolehan
     dengan pusingan sendiri (abilities2.js) dan senjata tandatangan (`sigWeapon`). */
  {
    id: 'helix', name: 'Helix', price: 69000, ability: 'spiralbastion', color: '#7a5a3a', sigWeapon: 'spine',
    role: 'TANK', style: 'TANK', good: 'standing in a crossfire and punishing everyone who shoots', modes: ['war', 'zombie'],
    tip: 'Pull into the shell when they focus you - every shot they land comes straight back at them as a spike.',
    desc: 'A war snail. No wheels at all: it glides on one huge muscular foot under a spiral armour shell, leaving a glowing slime trail. Slow, but the shell bristles with spikes that answer every hit.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#ffb347', nose: null, cabin: null, wheels: 0, body: 'helix', limbs: 'none', wings: null, sig: null },
    mods: { hp: 70, speed: 0.8, grip: 0.95, ram: 1.3, nitro: 0.85 },
    slots: 3, upMax: { armor: 13, plate: 11, engine: 5, grip: 6, ram: 8, nitro: 4, magnet: 6, repair: 8 },
  },
  {
    id: 'mammoth', name: 'Mammoth', price: 71000, ability: 'wreckflail', color: '#5a4636', sigWeapon: 'maul',
    role: 'TANK', style: 'TANK', good: 'dragging enemies around and smashing them into each other', modes: ['zombie', 'war'],
    tip: 'Hook three, then turn hard - the chained enemies swing out wide and flatten whatever they hit.',
    desc: 'A tusked steamroller. One giant crusher drum in front and two behind instead of tyres, a shaggy plated hump and a chain hitch on the tail for its Wrecking Flail.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#ff9a3c', nose: null, cabin: null, wheels: 0, body: 'mammoth', limbs: 'none', wings: null, sig: null },
    mods: { hp: 75, speed: 0.84, grip: 0.92, ram: 1.65, nitro: 0.85 },
    slots: 4, upMax: { armor: 13, plate: 11, engine: 5, grip: 5, ram: 12, nitro: 4, magnet: 5, repair: 7 },
  },
  {
    id: 'raptor', name: 'Raptor', price: 63000, ability: 'predator', color: '#3f5a2a', sigWeapon: 'javelin',
    role: 'ASSASSIN', style: 'FIGHTER', good: 'hunting one target at a time and snowballing', modes: ['war', 'alien', 'zombie'],
    tip: 'Mark the prey, kill it, mark the next. Every kill on marked prey is a trophy that stays for the whole life.',
    desc: 'A two-legged hunting machine that glides on a big wheel at the end of each reverse-knee leg, with a balancing tail and jaws that snap open when it locks onto prey.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#c8ff3a', nose: null, cabin: null, wheels: 0, body: 'raptor', limbs: 'none', wings: null, sig: null },
    mods: { hp: 15, speed: 1.12, grip: 1.12, ram: 1.15, nitro: 1.1 },
    slots: 3, upMax: { armor: 8, plate: 7, engine: 10, grip: 10, ram: 7, nitro: 8, magnet: 6, repair: 5 },
  },
  {
    id: 'mantis', name: 'Mantis', price: 66000, ability: 'reap', color: '#2e4a3a', sigWeapon: 'glaive',
    role: 'ASSASSIN', style: 'ASSASSIN', good: 'finishing off wounded enemies', modes: ['war', 'alien'],
    tip: 'Soften a group first, then dash through it. Every execution gives you another dash.',
    desc: 'An insect assassin gliding on two glowing blade-skis. Its scythe arms stay folded until Reaping Dash, then it cuts straight through the line.',
    spec: { w: 1, len: 1, armor: 'light', extra: null, accent: '#7dffcf', nose: null, cabin: null, wheels: 0, body: 'mantis', limbs: 'none', wings: null, sig: null },
    mods: { hp: 0, speed: 1.16, grip: 1.18, ram: 0.9, nitro: 1.18 },
    slots: 2, upMax: { armor: 6, plate: 6, engine: 11, grip: 12, ram: 4, nitro: 9, magnet: 8, repair: 5 },
  },
  {
    id: 'hivra', name: 'Hivra', price: 64000, ability: 'swarmcloud', color: '#6a5212', sigWeapon: 'stinger',
    role: 'CONTROLLER', style: 'CONTROLLER', good: 'shutting down a group of shooters', modes: ['war', 'alien', 'zombie'],
    tip: 'Drag the cloud over whoever is shooting you - blinded enemies cannot fire back.',
    desc: 'A flying beehive. A hexagonal hive pod hangs under four spinning rotors and floats above the ground the whole time, tilting into every turn.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#ffd23a', nose: null, cabin: null, wheels: 0, body: 'hivra', limbs: 'none', wings: null, sig: null },
    mods: { hp: 10, speed: 1.04, grip: 1.1, ram: 0.9, nitro: 1.1 },
    slots: 3, upMax: { armor: 8, plate: 7, engine: 8, grip: 9, ram: 4, nitro: 7, magnet: 8, repair: 6 },
  },
  {
    id: 'aerostat', name: 'Aerostat', price: 62000, ability: 'sanctuary', color: '#7a2f2f', sigWeapon: 'lantern',
    role: 'SUPPORT', style: 'SUPPORT', good: 'keeping a whole push alive', modes: ['war', 'zombie'],
    tip: 'Drop the sanctuary where your team is fighting, not where it is safe - it makes everyone inside reload and fire faster.',
    desc: 'A support airship. A long gas envelope floats high overhead with a gondola slung underneath on cables, pushed along by two propellers.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#7dffb0', nose: null, cabin: null, wheels: 0, body: 'aerostat', limbs: 'none', wings: null, sig: null },
    mods: { hp: 30, speed: 0.95, grip: 1.0, ram: 0.85, nitro: 1.0 },
    slots: 3, upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 4, nitro: 6, magnet: 8, repair: 9 },
  },
  {
    id: 'halo', name: 'Halo', price: 65000, ability: 'guardianhalo', color: '#d8d2c0', sigWeapon: 'chime',
    role: 'SUPPORT', style: 'SUPPORT', good: 'saving a teammate who is about to die', modes: ['war', 'alien'],
    tip: 'Hold the halo until someone is nearly dead - it saves them from one killing blow.',
    desc: 'A guardian on one wheel. A slim winged tower balances on a single big wheel, leaning into its speed, with a glowing halo floating above it.',
    spec: { w: 1, len: 1, armor: 'light', extra: null, accent: '#ffe27a', nose: null, cabin: null, wheels: 0, body: 'halo', limbs: 'none', wings: null, sig: null },
    mods: { hp: 15, speed: 1.06, grip: 1.12, ram: 0.85, nitro: 1.1 },
    slots: 2, upMax: { armor: 8, plate: 7, engine: 9, grip: 9, ram: 4, nitro: 8, magnet: 8, repair: 9 },
  },
  {
    id: 'tharos', name: 'Tharos', price: 70000, ability: 'heatray', color: '#3a3f4a', sigWeapon: 'fork',
    role: 'SNIPER', style: 'ARTILLERY', good: 'sweeping a whole front line from range', modes: ['war', 'alien'],
    tip: 'Face the line before you fire - the ray sweeps 60 degrees to each side of your aim.',
    desc: 'A war tripod. A saucer head with a single red eye hangs high above the battlefield on three long striding legs, firing over the top of everything.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#ff4a3a', nose: null, cabin: null, wheels: 0, body: 'tharos', limbs: 'none', wings: null, sig: null },
    mods: { hp: 20, speed: 0.9, grip: 0.98, ram: 0.9, nitro: 0.95 },
    slots: 3, upMax: { armor: 9, plate: 8, engine: 6, grip: 7, ram: 4, nitro: 6, magnet: 7, repair: 7 },
  },
  {
    id: 'hopper', name: 'Hopper', price: 60000, ability: 'springleap', color: '#2f6a7a', sigWeapon: 'rime',
    role: 'FIGHTER', style: 'FIGHTER', good: 'jumping in, freezing a group and jumping out', modes: ['zombie', 'war', 'alien'],
    tip: 'Leap INTO the pack - the landing chills and throws them up. Save one charge to leap back out.',
    desc: 'A frost frog. A wide armoured body on two huge spring-loaded hind legs - it bounds along instead of driving, and its leaps land with an icy stomp.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#8fe8ff', nose: null, cabin: null, wheels: 0, body: 'hopper', limbs: 'none', wings: null, sig: null },
    mods: { hp: 20, speed: 1.06, grip: 1.08, ram: 1.1, nitro: 1.05 },
    slots: 3, upMax: { armor: 9, plate: 8, engine: 8, grip: 8, ram: 7, nitro: 7, magnet: 6, repair: 6 },
  },
  {
    id: 'corsair', name: 'Corsair', price: 61000, ability: 'switcheroo', color: '#2a3f5a', sigWeapon: 'fence',
    role: 'ASSASSIN', style: 'TRICKSTER', good: 'pulling enemies out of position', modes: ['war', 'zombie', 'alien'],
    tip: 'Fence a lane, then swap with the enemy on the far side - they land in your trap, you land behind them.',
    desc: 'A pirate land yacht with a grappling-hook launcher on the bow. Swap Hook: aim at an enemy (up to 70m), use the ability, and you instantly TRADE PLACES with it - you land where it was, it lands where you were, dazed.',
    spec: { w: 1, len: 1, armor: 'light', extra: null, accent: '#57e0ff', nose: null, cabin: null, wheels: 0, body: 'corsair', limbs: 'none', wings: null, sig: null },
    mods: { hp: 5, speed: 1.15, grip: 1.14, ram: 0.9, nitro: 1.18 },
    slots: 2, upMax: { armor: 6, plate: 6, engine: 11, grip: 11, ram: 4, nitro: 9, magnet: 8, repair: 5 },
  },
  /* HIBACHI (2026-10-17, idea Nabil): penyerang tinggi atas EMPAT kaki tebal yang
     berakhir dengan pod RANTAI KERETA KEBAL; badan di atas = tiga berlian.
     Jammer Beam melambatkan senjata musuh; senjata tandatangan Hurago mengimbas
     damage musuh dan menjadi semakin kuat. */
  {
    id: 'hibachi', name: 'Hibachi', price: 72000, ability: 'jambeam', color: '#4a1820', sigWeapon: 'hurago',
    role: 'FIGHTER', style: 'FIGHTER', good: 'locking down enemy gunners while it out-trades them', modes: ['war', 'alien', 'zombie'],
    tip: 'Open with Jammer Beam on a group - their guns empty and reload slowly while you heal. Keep Hurago on one target to stack its scans.',
    desc: 'A tall attacker: a body of three diamonds riding high on four thick legs, each leg ending in a tank-track pod. The front diamond carries a jammer emitter.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#ff3a5c', nose: null, cabin: null, wheels: 0, body: 'hibachi', limbs: 'none', wings: null, sig: null },
    mods: { hp: 20, speed: 0.62, grip: 0.92, ram: 1.15, nitro: 0.8 },     // Nabil: perlahan (2 kali minta) - paling perlahan dalam garaj
    slots: 3, upMax: { armor: 8, plate: 7, engine: 9, grip: 9, ram: 7, nitro: 7, magnet: 6, repair: 6 },
  },
  /* CRYSTAL (2026-10-18, idea Nabil): permata asing dari masa depan. Badan
     berlian panjang terapung (tiada tayar), 4 senjata di 4 hujung berlian,
     3 kristal besar tegak di atas yang menjadi Prism Storm - sinar 360 darjah
     yang berputar sambil kereta terus bergerak (Tharos pula mesti berhenti). */
  {
    id: 'crystal', name: 'Crystal', price: 78000, ability: 'prismstorm', color: '#e4eefa', sigWeapon: 'diamond',
    role: 'FIGHTER', style: 'FIGHTER', good: 'driving straight through a crowd while three laser beams spin around it', modes: ['war', 'alien', 'zombie'],
    tip: 'Prism Storm keeps working while you drive - fire it, then cut straight through the middle of the enemy team so the spinning beams catch everyone.',
    desc: 'An alien gem from the future, glowing neon blue and white. Seen from above it is a long, thin diamond floating over the ground on an anti-gravity field, with a weapon on each of its four points. Three huge crystals stand upright on its back, held in golden claws - when the ability is active they rise, spin and fire three laser beams that sweep 360 degrees around it.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#22d3ff', nose: null, cabin: null, wheels: 0, body: 'crystalgem', limbs: 'none', wings: null, sig: null },
    mods: { hp: 20, speed: 0.95, grip: 1.04, ram: 0.85, nitro: 1.0 },
    slots: 4, upMax: { armor: 8, plate: 8, engine: 8, grip: 8, ram: 4, nitro: 7, magnet: 7, repair: 7 },
  },
  /* CONDOR (2026-10-18, idea Claude atas permintaan Nabil: BUKAN terapung).
     Rover darat atas empat roda besar berlengan ayun. Roda itu ialah roda
     berdut berbilah kipas - bila terbang, roda berpusing 90 darjah jadi rotor,
     dan bila tamat ia mendarat semula atas tayarnya sendiri. */
  {
    id: 'condor', name: 'Condor', price: 74000, ability: 'rotordrop', color: '#2a2d33', sigWeapon: 'gale',
    role: 'CONTROLLER', style: 'CONTROLLER', good: 'flying over a wall and dropping into the middle of a group', modes: ['war', 'zombie', 'alien'],
    tip: 'Fly over cover, hover above the group so the rotor wash shoves them around, then use the ability again to DIVE - the dive slam hits 60% harder.',
    desc: 'A black iron predator on four big spiked wheels mounted on swing arms, with a toothed ram plough and an armoured cockpit with red eye slits. Each wheel hides a ring of fan blades - when the ability fires, the arms swing up and the wheels turn sideways into rotors and it takes off. It always comes back down on its own tyres, with a shockwave.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#ff2a1a', nose: null, cabin: null, wheels: 0, body: 'condor', limbs: 'none', wings: null, sig: null },
    mods: { hp: 25, speed: 1.0, grip: 1.0, ram: 1.2, nitro: 1.0 },
    slots: 3, upMax: { armor: 9, plate: 8, engine: 8, grip: 8, ram: 7, nitro: 7, magnet: 6, repair: 6 },
  },
  /* CONDUIT (2026-10-18, idea Nabil): bola kaca berpetir = roda, perisai
     topi keledar memegang senjata. Redirect Link: perisai terangkat, rantai
     petir ke 3 musuh, 80% damage diterima dipindah ke mereka. Pasangan:
     Pulse Blaster (dahulu tiada tuan). */
  {
    id: 'conduit', name: 'Conduit', price: 73000, ability: 'redirect', color: '#1c1424', sigWeapon: 'pulse',
    role: 'TANK', style: 'ABSORBER', good: 'standing in the enemy fire and sending it straight back', modes: ['war', 'alien', 'zombie'],
    tip: 'Turn on Redirect Link when the enemy team focuses you - 80% of everything that hits you goes into the linked enemies instead, so the more they shoot the faster they die.',
    desc: 'An alien war-orb that rolls on one smoked-glass sphere with a living atom inside it - a pulsing nucleus and three orbiting electrons. Four fanged armour petals clamp around the sphere, a six-eyed crown sits on top and three weapons float above it on bone arms. Redirect Link opens the petals, the electrons break out and orbit the sphere, and each one locks a straight pink beam onto an enemy: 80% of all damage Conduit takes is pushed down those beams into them instead.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#ff3fc8', nose: null, cabin: null, wheels: 0, body: 'conduit', limbs: 'none', wings: null, sig: null },
    mods: { hp: 35, speed: 0.95, grip: 1.05, ram: 1.2, nitro: 1.0 },
    slots: 3, upMax: { armor: 10, plate: 9, engine: 7, grip: 7, ram: 7, nitro: 6, magnet: 6, repair: 6 },
  },
  {
    id: 'eg300', name: 'E-G300', price: 70000, ability: 'twincannon', color: '#4f5a36', sigWeapon: 'rail',
    role: 'TANK', style: 'FORTRESS', good: 'holding a line and shelling anything that comes into range', modes: ['war', 'zombie', 'alien'],
    tip: 'The tank cannot move while the cannon is out (about 5 seconds) and it takes 1.6 seconds to rise - deploy it from cover with a clear line to the enemy, not in the open.',
    desc: 'A long military battle tank on full tank tracks. Its futuristic twin rail cannon is stored inside the hull: on the ability the tank stops, the bay doors open, the cannon slowly rises, fires three heavy shells at whatever it can hit, and folds away again. Walls and cover stop the shells.',
    spec: { w: 1.1, len: 1.0, armor: 'heavy', extra: null, accent: '#ffb23f', nose: null, cabin: null, wheels: 0, body: 'eg300', limbs: 'none', wings: null, sig: null },
    mods: { hp: 60, speed: 0.82, grip: 0.95, ram: 1.4, nitro: 0.85 },
    slots: 2, upMax: { armor: 12, plate: 10, engine: 6, grip: 6, ram: 9, nitro: 5, magnet: 5, repair: 6 },
  },
  /* BREEZE (2026-10-18, idea Nabil): lori pelancar peluru berpandu gaya TEL
     Rusia, 8 roda, 4 slot. Missile Salvo: berhenti + senjata mati, kanister
     naik tegak 2s, 5 peluru berpandu naik ke langit & menjunam ke 5 musuh
     (25-50% nyawa ikut HP), kanister disimpan semula. Pasangan: Hail Mortar. */
  {
    id: 'breeze', name: 'Breeze', price: 76000, ability: 'missilesalvo', color: '#e8f6fd', sigWeapon: 'frost',
    role: 'SNIPER', style: 'SIEGE SNIPER', good: 'softening up five enemies at once from anywhere on the map', modes: ['war', 'zombie', 'alien'],
    tip: 'The salvo takes 2 seconds to raise and you cannot move or shoot meanwhile - start it from cover. Missiles fly over walls, so you do not need line of sight. Weak enemies lose half their health, tough ones a quarter.',
    desc: 'A low, razor-nosed interceptor on eight armoured wheels, with a V-shaped light visor, chin blades and twin cold-jet turbines at the back. A finned hexagonal launch pod lies along its spine. Missile Salvo stops it, folds down the stabiliser blades and raises the pod upright in 2 seconds; the four shutters open and five guided ICE missiles climb high and dive onto five different enemies - every enemy hit (and anything next to it) slides around on ice, hard to control, for 4.5 seconds - before the pod folds away again.',
    spec: { w: 1.05, len: 1.2, armor: 'mid', extra: null, accent: '#5ff0ff', nose: null, cabin: null, wheels: 8, wheelR: 0.5, body: 'breeze', limbs: 'w8', wings: null, sig: null },
    mods: { hp: 25, speed: 0.92, grip: 0.95, ram: 1.2, nitro: 0.95 },
    slots: 4, upMax: { armor: 9, plate: 8, engine: 7, grip: 7, ram: 7, nitro: 6, magnet: 6, repair: 6 },
  },
  /* FREEZO (2026-10-18, idea Nabil): ram di hadapan, meriam beku gergasi tinggi
     & lebar di atas ram, kokpit + enjin di belakang, 6 tayar, 3 slot.
     Cryo Cannon: 3 peluru ais gergasi (cas) - setiap satu membekukan musuh
     dalam KIUB AIS. Senjata pasangan: Glacier Beam (dahulu tiada tuan). */
  {
    id: 'freezo', name: 'Freezo', price: 71000, ability: 'cryocannon', color: '#dff1fb', sigWeapon: 'cryo',
    role: 'CONTROLLER', style: 'LOCKDOWN', good: 'freezing the most dangerous enemies solid one by one', modes: ['war', 'zombie', 'alien'],
    tip: 'Each ice shell freezes an enemy in a giant ice cube for 4 seconds - it cannot move or shoot and takes 25% more damage from you. Save shells for the big threats; one comes back every 7 seconds.',
    desc: 'A cryo siege engine. A three-layer serrated icebreaker prow with a ram horn leads a low armoured hull that never stops leaking freezing mist. On top sits a twin-rail cryo cannon whose coils spin up and blaze before every shot, fed by three glass reactor tubes at the back - one ice shell in each. Cryo Cannon fires those shells (up to 3) to lock enemies inside a solid ice cube.',
    spec: { w: 1.05, len: 1.1, armor: 'heavy', extra: null, accent: '#4aa8ff', nose: null, cabin: null, wheels: 6, wheelR: 0.52, body: 'freezo', limbs: 'w6', wings: null, sig: null },
    mods: { hp: 35, speed: 0.9, grip: 1.0, ram: 1.4, nitro: 0.95 },
    slots: 3, upMax: { armor: 10, plate: 9, engine: 7, grip: 7, ram: 9, nitro: 6, magnet: 6, repair: 6 },
  },
  /* AUGER (2026-10-18, idea Claude): jentera korek terowong atas PEMACU SKRU -
     cara gerak yang belum ada. Burrow Strike = selam bawah tanah, lalu bawah
     dinding, letus keluar melambung musuh. Senjata pasangan: Breach Drill
     (dahulu tiada tuan), diwarna semula ikut Auger. */
  {
    id: 'auger', name: 'Auger', price: 72000, ability: 'burrow', color: '#3d3833', sigWeapon: 'drill',
    role: 'ASSASSIN', style: 'DIVE', good: 'vanishing underground and erupting in the middle of the enemy', modes: ['war', 'zombie', 'alien'],
    tip: 'Burrow toward the group - you can pass under walls - and use the ability again right underneath them. Breach Drill discs keep grinding whatever you threw up into the air.',
    desc: 'A tunnelling machine that moves on two giant spinning screws instead of wheels, with a huge spiral drill for a nose. Burrow Strike sends it underground: only a moving dirt mound shows, nothing can see or hit it and it can pass under walls. Use the ability again to erupt out of the ground, throwing every enemy above into the air.',
    spec: { w: 1, len: 1, armor: 'heavy', extra: null, accent: '#ff8a2a', nose: null, cabin: null, wheels: 0, body: 'auger', limbs: 'none', wings: null, sig: null },
    mods: { hp: 30, speed: 0.95, grip: 1.05, ram: 1.3, nitro: 0.95 },
    slots: 3, upMax: { armor: 10, plate: 9, engine: 8, grip: 8, ram: 9, nitro: 6, magnet: 6, repair: 6 },
  },
  /* CRESCENT (ASSASSIN, 2026-10-19, idea Nabil): bulan sabit tegak yang nipis & terapung,
     bintang kecil berkelip di belakang. Lunar Slash (abilities2 'lunarslash'). Senjata
     pasangan: Mini Star (dahulu Spike Driver 'nail'), emas. */
  {
    id: 'crescent', name: 'Crescent', price: 75000, ability: 'lunarslash', color: '#e9edf6', sigWeapon: 'nail',
    role: 'ASSASSIN', style: 'ASSASSIN', good: 'picking one dangerous enemy and cutting it down before it can react', modes: ['war', 'alien', 'zombie'],
    tip: 'Aim at the enemy you want gone before you use Lunar Slash - it locks whatever is under your crosshair, freezes it, and you are untouchable for the whole glide.',
    desc: 'A thin silver crescent moon floating on soft golden light, its outer edge glowing, with a little cluster of stars twinkling behind it. Two Mini Star launchers sit inside the curve. Lunar Slash locks the enemy under your crosshair, freezes it, then Crescent glides at it in slow motion leaving a floating trail of moonlight and cuts straight through it.',
    spec: { w: 1, len: 1, armor: 'light', extra: null, accent: '#ffd27a', nose: null, cabin: null, wheels: 0, body: 'lunar', limbs: 'none', wings: null, sig: null },
    mods: { hp: 5, speed: 1.14, grip: 1.1, ram: 0.8, nitro: 1.1 },
    slots: 2, upMax: { armor: 9, plate: 8, engine: 8, grip: 8, ram: 4, nitro: 8, magnet: 7, repair: 6 },
  },
  /* CORE (SNIPER, 2026-10-19, idea Nabil): badan panjang terapung yang MEMEGANG matahari kecil
     (korona + solar flare). 4 slot. Solar Guide (abilities2 'solarguide'): laser panduan ke
     musuh di MANA-MANA dalam peta, tembus semua dinding, bunuh ~5s, kemudian tukar sasaran.
     Senjata pasangan: Flair (id lama 'amber' - Amber dibuang atas permintaan Nabil). */
  {
    id: 'core', name: 'Core', price: 82000, ability: 'solarguide', color: '#2b2531', sigWeapon: 'amber',
    role: 'SNIPER', style: 'SOLAR SNIPER', good: 'burning down one enemy anywhere on the map, straight through every wall', modes: ['war', 'alien', 'zombie'],
    tip: 'Put your crosshair on the enemy you want first before using Solar Guide - walls do not matter. Keep Flair at mid range: too close or too far and the flares lose their heat.',
    desc: 'A long, low sniper hull floating on plasma jets, holding a tiny living sun in three golden claws - burning corona, swirling plasma and solar flares looping off its surface. Solar Guide locks a guidance laser onto any enemy on the map that burns straight through every wall until it dies, then jumps to the next one.',
    spec: { w: 1, len: 1, armor: 'mid', extra: null, accent: '#ff9a2a', nose: null, cabin: null, wheels: 0, body: 'solarcore', limbs: 'none', wings: null, sig: null },
    mods: { hp: 12, speed: 0.92, grip: 1.0, ram: 0.8, nitro: 0.95 },
    slots: 4, upMax: { armor: 8, plate: 8, engine: 7, grip: 7, ram: 4, nitro: 7, magnet: 7, repair: 7 },
  },
  /* E-G300 (2026-10-18, idea Nabil): kereta kebal tentera atas rantai, 2 slot.
     Twin Cannon: menara berpusing ke musuh dalam jarak, sela pengaktifan, kemudian
     TIGA das meriam berat - peluru sebenar, DIHALANG dinding. Senjata pasangan:
     Gauss Rail (dahulu tiada tuan), diwarna semula ikut E-G300. */
];
// setiap kereta ada senjata tandatangan (weapons.js SIG_OLD / sigCar)
for (const c of CARS) if (!c.sigWeapon && SIG_OF_CAR[c.id]) c.sigWeapon = SIG_OF_CAR[c.id];
export const CAR_BY = Object.fromEntries(CARS.map(c => [c.id, c]));

/* ---------------- kebolehan ---------------- */
/* g = objek Game, p = pemain. dur = tempoh aktif, cd = masa pemulihan */
export const ABILITY = {
  overdrive: {
    name: 'Overdrive', dur: 10, cd: 15, color: '#ffb23f',
    desc: '+60% weapon damage for 10 seconds.',
    start(g, p) { p.abDmg = 1.6; Sfx.tone(300, 0.5, 'sawtooth', 0.2, 900); },
    update(g, p, dt) {
      if (Math.random() < dt * 22) {
        g.fx.add.emit(p.x + rand(-1.4, 1.4), rand(0.6, 2), p.z + rand(-1.4, 1.4), 0, rand(1, 3), 0,
          { color: [2, 1.2, 0.3], color2: [1, 0.3, 0.05], size: rand(0.2, 0.45), size2: 0.05, life: 0.4, drag: 1.5 });
      }
    },
    end(g, p) { p.abDmg = 1; },
  },

  aegis: {
    name: 'Aegis', dur: 10, cd: 19, color: '#7de3ff',
    desc: '-35% damage taken for 10 seconds.',
    start(g, p) { p.abRes = 0.65; g.showShield(true, 0x7de3ff, 3.4); Sfx.tone(180, 0.6, 'square', 0.18, 420); },
    update() { },
    end(g, p) { p.abRes = 1; g.showShield(false); },
  },

  repair: {
    name: 'Repair Pulse', dur: 4, cd: 17, color: '#4dffa8',
    desc: 'Restores 45% of max HP over 4 seconds and takes 30% less damage while repairing.',
    start(g, p) { p.abHeal = p.maxHp * 0.45 / 4; p.abRes = 0.7; Sfx.pickup(); },
    update(g, p, dt) {
      p.hp = Math.min(p.maxHp, p.hp + p.abHeal * dt);
      if (Math.random() < dt * 26) {
        g.fx.add.emit(p.x + rand(-1.6, 1.6), rand(0.3, 2.4), p.z + rand(-1.6, 1.6), 0, rand(1.5, 3.5), 0,
          { color: [0.3, 2, 1], color2: [0.1, 0.6, 0.35], size: rand(0.2, 0.5), size2: 0.04, life: 0.5, drag: 1.2 });
      }
    },
    end(g, p) { p.abHeal = 0; p.abRes = 1; },
  },

  absorb: {
    name: 'Absorber Field', dur: 7, cd: 21, color: '#57d6ff',
    desc: 'For 7 seconds the field blocks 70% of incoming damage and turns 40% of it into HP.',
    start(g, p) { p.abAbsorb = true; g.showShield(true, 0x57d6ff, 4.0); Sfx.tone(140, 0.7, 'sine', 0.2, 500); },
    update() { },
    end(g, p) { p.abAbsorb = false; g.showShield(false); },
  },

  hover: {
    name: 'Lift Thrusters', dur: 8, cd: 15, color: '#57d6ff',
    desc: 'Fly for 8 seconds over enemies and obstacles, with +35% weapon damage from above.',
    start(g, p) { p.fly = 1; p.abDmg = 1.35; Sfx.tone(120, 0.8, 'sawtooth', 0.2, 340); },
    update(g, p, dt) {
      if (Math.random() < dt * 40) {
        g.fx.add.emit(p.x + rand(-1.2, 1.2), p.y - 0.1, p.z + rand(-1.6, 1.6), rand(-1, 1), -rand(3, 7), rand(-1, 1),
          { color: [0.5, 1.6, 2.2], color2: [0.1, 0.3, 0.6], size: rand(0.2, 0.5), size2: 0.05, life: 0.3, drag: 2 });
      }
    },
    end(g, p) { p.fly = 0; p.abDmg = 1; },
  },

  gunship: {
    name: 'Gunship Mode', dur: 9, cd: 20, color: '#ffb23f',
    desc: 'Fly for 9 seconds while the roof cannon fires itself.',
    start(g, p) { p.fly = 1; p.abGun = 0; Sfx.tone(120, 0.8, 'sawtooth', 0.2, 340); },
    update(g, p, dt) {
      if (Math.random() < dt * 40) {
        g.fx.add.emit(p.x + rand(-1.2, 1.2), p.y - 0.1, p.z + rand(-1.6, 1.6), rand(-1, 1), -rand(3, 7), rand(-1, 1),
          { color: [1.6, 1.1, 0.4], color2: [0.6, 0.2, 0.05], size: rand(0.2, 0.5), size2: 0.05, life: 0.3, drag: 2 });
      }
      p.abGun -= dt;
      if (p.abGun <= 0) {
        p.abGun = 0.3;
        const e = g.nearestEnemy(p.x, p.z, 55);
        if (e) {
          const ox = p.x, oy = p.y + 2.2, oz = p.z;
          let dx = e.x - ox, dy = (e.y + e.h * 0.5) - oy, dz = e.z - oz;
          const l = Math.hypot(dx, dy, dz) || 1;
          g.spawnBullet({
            x: ox, y: oy, z: oz, vx: dx / l * 150, vy: dy / l * 150, vz: dz / l * 150,
            dmg: 26 + g.wave * 2.5, life: 1.2, pierce: 0, knock: 4, flags: null,
            color: [1.7, 1.2, 0.5], size: 0.1, len: 2.6, owner: 'p',
          });
          g.fx.muzzle(ox, oy, oz, dx / l, dy / l, dz / l, 0.9, [1.7, 1.2, 0.5]);
          Sfx.shoot('mg');
        }
      }
    },
    end(g, p) { p.fly = 0; },
  },

  /* Trapper: tekan SPACE = letak satu periuk api dan buka tetingkap 10 saat.
     Dalam 10 saat itu setiap tekanan SPACE letak satu lagi. Maksimum 10 periuk
     api di atas tanah — yang ke-11 menggantikan yang paling lama. */
  mines: {
    name: 'Mine Layer', dur: 10, cd: 7, color: '#ff8a3d',
    desc: 'When the ability is active you drop a landmine, and every time you use it again within 10 seconds you drop another. Up to 10 mines stay on the ground - the 11th replaces the oldest.',
    drop(g, p) {
      const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
      g.spawnMine(p.x - fx * 3.2, p.z - fz * 3.2, 10);
      Sfx.tone(220, 0.18, 'square', 0.16, 140);
    },
    start(g, p) { this.drop(g, p); },
    retrigger(g, p) { this.drop(g, p); return false; },   // kekal aktif sehingga 10 saat tamat
    update() { }, end() { },
  },

  nuke: {
    name: 'Nuclear Core', dur: 1.3, cd: 22, color: '#7dff4a',
    desc: 'A huge blast around the car. You take no damage.',
    start(g, p) { p.abNuke = 1.3; Sfx.charge(); },
    update(g, p, dt) {
      p.abNuke -= dt;
      const t = 1 - clamp(p.abNuke / 1.3, 0, 1);
      if (Math.random() < dt * 60) {
        const a = rand(TAU), r = lerp(2, 16, t);
        g.fx.add.emit(p.x + Math.cos(a) * r, rand(0.3, 2), p.z + Math.sin(a) * r, 0, rand(1, 4), 0,
          { color: [0.6, 2, 0.4], color2: [0.15, 0.6, 0.1], size: rand(0.25, 0.6), size2: 0.05, life: 0.4, drag: 1.5 });
      }
      if (p.abNuke <= 0 && !p.abNukeDone) {
        p.abNukeDone = true;
        g.nukeBlast(p.x, p.z, 30, 260 + g.wave * 26);
      }
    },
    end(g, p) { p.abNuke = 0; p.abNukeDone = false; },
  },

  deploy: {
    name: 'Deploy Turrets', dur: 0.1, cd: 20, color: '#ffb23f',
    desc: 'Deploy 2 automatic turrets that fire on their own for 18 seconds.',
    start(g, p) {
      const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
      g.spawnTurret(p.x - fz * 5, p.z + fx * 5);
      g.spawnTurret(p.x + fz * 5, p.z - fx * 5);
      Sfx.tone(240, 0.3, 'square', 0.2, 520);
      Sfx.tone(180, 0.35, 'square', 0.18, 420, 0.12);
    },
    update() { }, end() { },
  },

  siphon: {
    name: 'Siphon Pulse', dur: 10, cd: 20, color: '#ff5ad0',
    desc: 'Shove nearby enemies, steal their HP, and +50% damage for 10 seconds.',
    start(g, p) {
      p.abDmg = 1.5;
      g.siphonPulse(p.x, p.z, 28, 90 + g.wave * 12);
      Sfx.tone(90, 0.6, 'sawtooth', 0.25, 380);
    },
    update(g, p, dt) {
      if (Math.random() < dt * 24) {
        const a = rand(TAU), r = rand(2, 5);
        g.fx.add.emit(p.x + Math.cos(a) * r, rand(0.3, 2.2), p.z + Math.sin(a) * r,
          -Math.cos(a) * 3, rand(0.5, 2), -Math.sin(a) * 3,
          { color: [2, 0.4, 1.4], color2: [0.7, 0.1, 0.5], size: rand(0.2, 0.5), size2: 0.04, life: 0.45, drag: 1.4 });
      }
    },
    end(g, p) { p.abDmg = 1; },
  },

  /* Razorback: 10 saat "Rampage". Setiap tekan SPACE semasa aktif = kereta
     memusing sendiri ke musuh terdekat dalam 42m dan meluru merempuhnya
     (p.ramDash, dipandu dalam updatePlayer). Selepas hentaman boleh terus
     tekan lagi untuk musuh lain - tiada had bilangan rempuhan. */
  charge: {
    name: 'Rampage', dur: 10, cd: 20, color: '#ff8a3d', range: 42,
    desc: 'For 10 seconds: 3x ram damage and 40% less damage taken. Use the ability again while it is active to auto-ram the nearest enemy within 42m - the car locks on, turns and charges into it for a heavy impact. Ram as many as you can before the time runs out.',
    start(g, p) {
      p.abSpeed = 1.2; p.abRam = 3; p.abRes = 0.6; p.ramDash = null; p.ramLast = null;
      Sfx.tone(140, 0.6, 'sawtooth', 0.24, 520);
    },
    pick(g, p) {
      let best = null, bd = this.range, alt = null, ad = this.range;
      for (const e of g.enemies) {
        if (e.dead || (e.d.fly && e.y > 3.5) || e.untargetable) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z) - (e.r || 1);
        if (d > this.range) continue;
        if (g.losClear && !g.losClear(p.x, p.z, e.x, e.z, e)) continue;
        if (e === p.ramLast) { if (d < ad) { ad = d; alt = e; } continue; }   // utamakan musuh LAIN
        if (d < bd) { bd = d; best = e; }
      }
      return best || alt;
    },
    retrigger(g, p) {
      if (p.ramDash) return false;                       // masih meluru
      const t = this.pick(g, p);
      if (!t) { Sfx.deny(); window.UI && window.UI.toast('NO ENEMY IN RAM RANGE'); return false; }
      p.ramDash = { tgt: t, t: 1.3, spd: 64 };
      p.ramLast = t;
      p.iframe = Math.max(p.iframe || 0, 0.25);
      g.fx.flash(p.x, 1.2, p.z, [2, 1, 0.3], 10, 0.15, 20);
      g.shake(0.35, 0.12);
      Sfx.tone(110, 0.35, 'sawtooth', 0.26, 380);
      return false;                                      // kekal aktif sehingga 10 saat tamat
    },
    update(g, p, dt) {
      const rd = p.ramDash;
      if (rd && rd.tgt && !rd.tgt.dead) {
        const t = rd.tgt, d = Math.hypot(t.x - p.x, t.z - p.z);
        // jejak api di belakang semasa meluru
        g.fx.add.emit(p.x - Math.sin(p.ang) * 2.4, rand(0.4, 1.4), p.z - Math.cos(p.ang) * 2.4, 0, rand(0.5, 2), 0,
          { color: [2.2, 1.0, 0.3], color2: [0.8, 0.2, 0.05], size: rand(0.5, 0.9), size2: 0.1, life: 0.3, drag: 1.4 });
        if (d < (t.r || 1.2) + p.r + 1.0) {
          const S = p.stats;
          const dmg = (900 + g.wave * 40) * (S.ram || 1) * (S.dmgBonus || 1);
          g.damageEnemy(t, dmg, t.x - p.x, 0, t.z - p.z, 46, 'ram');
          if (!t.d.boss) {
            const k = 1 / (d || 1);
            t.vx = (t.x - p.x) * k * 48; t.vz = (t.z - p.z) * k * 48;
            t.lockT = Math.max(t.lockT || 0, 0.8);         // terhuyung sebentar
          }
          g.fx.explode(t.x, 1, t.z, 4, [2, 1, 0.3]);
          g.fx.spark(t.x, 1, t.z, 26, [2, 1.2, 0.4], { speed: 14, life: 0.5 });
          g.fx.abilityRing(t.x, t.z, [2, 0.9, 0.3], 1.5, 8, 0.35);
          g.shake(0.8, 0.2);
          Sfx.tone(70, 0.4, 'square', 0.3, 40);
          p.vx *= 0.2; p.vz *= 0.2;
          p.ramDash = null;
        }
      }
      if (Math.random() < dt * 30) {
        g.fx.add.emit(p.x + rand(-1.4, 1.4), rand(0.3, 1.6), p.z + rand(-1.4, 1.4), 0, rand(1, 3), 0,
          { color: [2, 1, 0.3], color2: [0.8, 0.2, 0.05], size: rand(0.25, 0.55), size2: 0.05, life: 0.35, drag: 1.6 });
      }
    },
    end(g, p) { p.abSpeed = 1; p.abRam = 1; p.abRes = 1; p.ramDash = null; p.ramLast = null; },
  },

  secondwind: {
    name: 'Second Wind', dur: 4, cd: 18, color: '#9effd0',
    desc: 'Untouchable for 4 seconds while repairing 40% of max HP.',
    start(g, p) { p.invuln = true; p.abHeal = p.maxHp * 0.4 / 4; g.showShield(true, 0x9effd0, 3.6); Sfx.pickup(); },
    update(g, p, dt) {
      p.hp = Math.min(p.maxHp, p.hp + p.abHeal * dt);
      if (Math.random() < dt * 20) {
        g.fx.add.emit(p.x + rand(-1.6, 1.6), rand(0.3, 2.4), p.z + rand(-1.6, 1.6), 0, rand(1.5, 3), 0,
          { color: [0.6, 2, 1.4], color2: [0.1, 0.6, 0.4], size: rand(0.2, 0.5), size2: 0.04, life: 0.5, drag: 1.2 });
      }
    },
    end(g, p) { p.invuln = false; p.abHeal = 0; g.showShield(false); },
  },

  napalm: {
    name: 'Napalm Trail', dur: 10, cd: 19, color: '#ff7a2f',
    desc: 'Leaves a trail of burning napalm behind the car for 10 seconds.',
    start(g, p) { p.abDrop = 0; Sfx.shoot('flame'); },
    update(g, p, dt) {
      p.abDrop -= dt;
      if (p.abDrop <= 0) {
        p.abDrop = 0.22;
        const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
        g.spawnHazard('fire', p.x - fx * 2.6, p.z - fz * 2.6, 3.4, 9 + g.wave * 1.6, 6);
      }
    },
    end() { },
  },

  uplink: {
    name: 'Target Uplink', dur: 12, cd: 20, color: '#57d6ff',
    desc: 'Marks every enemy nearby: they take +45% damage for 12 seconds.',
    start(g, p) {
      let n = 0;
      for (const e of g.enemies) {
        if (Math.hypot(e.x - p.x, e.z - p.z) > 60) continue;
        e.markT = 12; e.markAmt = Math.max(e.markAmt || 0, 0.45);
        n++;
      }
      g.fx.explode(p.x, 1.2, p.z, 9, [0.4, 1.3, 2.0], { dur: 0.8 });
      Sfx.tone(520, 0.4, 'sine', 0.2, 1200);
      void n;
    },
    update(g, p, dt) {
      p.abPing = (p.abPing || 0) - dt;
      if (p.abPing <= 0) {
        p.abPing = 2.4;
        for (const e of g.enemies) {
          if (Math.hypot(e.x - p.x, e.z - p.z) > 60) continue;
          e.markT = Math.max(e.markT, 3); e.markAmt = Math.max(e.markAmt || 0, 0.45);
        }
      }
    },
    end() { },
  },

  sonic: {
    name: 'Sonic Pulse', dur: 0.4, cd: 10, color: '#d48bff',
    desc: 'A cone blast that hurls enemies in front of you and stuns them.',
    start(g, p) {
      const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
      g.conePulse(p.x, p.z, fx, fz, 28, 0.66, 80 + g.wave * 10);
      Sfx.noise(0.5, 0.5, 900, 1.2);
      Sfx.tone(180, 0.5, 'sawtooth', 0.2, 60);
      g.shake(1.2, 0.3);
    },
    update() { }, end() { },
  },

  cloak: {
    name: 'Cloak', dur: 8, cd: 16, color: '#8affe0',
    desc: 'Enemies lose track of you for 8 seconds, and your shots hit 50% harder from the shadows.',
    start(g, p) {
      p.cloak = true; p.abDmg = 1.5;
      g.setCarOpacity(0.28);
      Sfx.tone(900, 0.4, 'sine', 0.16, 200);
    },
    update(g, p, dt) {
      if (Math.random() < dt * 14) {
        g.fx.add.emit(p.x + rand(-1.6, 1.6), rand(0.3, 2), p.z + rand(-1.6, 1.6), 0, rand(0.5, 1.6), 0,
          { color: [0.4, 1.8, 1.4], color2: [0.1, 0.4, 0.4], size: rand(0.15, 0.35), size2: 0.02, life: 0.5, drag: 1.5 });
      }
    },
    end(g, p) { p.cloak = false; p.abDmg = 1; g.setCarOpacity(1); },
  },

  storm: {
    name: 'Storm Field', dur: 8, cd: 18, color: '#7de3ff',
    desc: 'A lightning storm strikes enemies around the car for 8 seconds.',
    start(g, p) { p.abZap = 0; Sfx.shoot('tesla'); void p; },
    update(g, p, dt) {
      p.abZap -= dt;
      if (p.abZap <= 0) {
        p.abZap = 0.3;
        const e = g.nearestEnemy(p.x, p.z, 22, g._zapped || []);
        if (e) {
          g.fx.lightning(p.x, 2.2, p.z, e.x, e.y + e.h * 0.5, e.z, [0.5, 1.7, 2.2], 6);
          g.damageEnemy(e, 46 + g.wave * 5, e.x - p.x, 0, e.z - p.z, 6, 'tesla');
          Sfx.shoot('tesla');
        }
      }
    },
    end() { },
  },

  barrier: {
    name: 'Energy Barrier', dur: 12, cd: 20, color: '#ffd257',
    desc: 'Drops three solid barriers in front that block enemy fire.',
    start(g, p) {
      const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
      const rx = -Math.cos(p.ang), rz = Math.sin(p.ang);
      for (let i = -1; i <= 1; i++) {
        g.spawnHazard('barrier', p.x + fx * 8 + rx * i * 5.2, p.z + fz * 8 + rz * i * 5.2, 2.6, 0, 12);
      }
      Sfx.tone(200, 0.5, 'square', 0.2, 480);
    },
    update() { }, end() { },
  },

  gravity: {
    name: 'Gravity Well', dur: 5, cd: 20, color: '#b06bff',
    desc: 'Drags every enemy nearby into a single pile for 5 seconds.',
    start(g, p) {
      p.wellX = g.aim.x; p.wellZ = g.aim.z;
      g.fx.explode(p.wellX, 1, p.wellZ, 6, [0.8, 0.4, 1.8], { dur: 0.9 });
      Sfx.tone(70, 0.9, 'sine', 0.24, 260);
    },
    update(g, p, dt) {
      const wx = p.wellX, wz = p.wellZ;
      for (const e of g.enemies) {
        if (e.d.boss) continue;
        const dx = wx - e.x, dz = wz - e.z;
        const d = Math.hypot(dx, dz);
        if (d > 34 || d < 0.4) continue;
        const pull = 26 * dt;
        e.x += dx / d * pull; e.z += dz / d * pull;
      }
      if (Math.random() < dt * 40) {
        const a = rand(TAU), r = rand(6, 16);
        g.fx.add.emit(wx + Math.cos(a) * r, rand(0.4, 3), wz + Math.sin(a) * r,
          -Math.cos(a) * 9, rand(-1, 1), -Math.sin(a) * 9,
          { color: [1.4, 0.5, 2], color2: [0.4, 0.1, 0.7], size: rand(0.2, 0.5), size2: 0.03, life: 0.5, drag: 0.6 });
      }
    },
    end(g, p) { p.wellX = null; },
  },

  fortify: {
    name: 'Fortify', dur: 8, cd: 20, color: '#ffb23f',
    desc: 'Anchors the car: -60% damage taken and +40% fire rate for 8 seconds.',
    start(g, p) {
      p.abRes = 0.4; p.abRof = 1.4; p.abAnchor = true;
      g.showShield(true, 0xffb23f, 3.8);
      Sfx.tone(120, 0.6, 'square', 0.22, 300);
    },
    update(g, p, dt) {
      if (Math.random() < dt * 12) {
        const a = rand(TAU);
        g.fx.add.emit(p.x + Math.cos(a) * 3, 0.2, p.z + Math.sin(a) * 3, 0, rand(1, 2.5), 0,
          { color: [2, 1.3, 0.4], color2: [0.6, 0.3, 0.05], size: rand(0.2, 0.4), size2: 0.03, life: 0.45, drag: 1.4 });
      }
    },
    end(g, p) { p.abRes = 1; p.abRof = 1; p.abAnchor = false; g.showShield(false); },
  },

  meteordrop: {
    name: 'Meteor Drop', dur: 8, cd: 20, color: '#ff7a2f',
    desc: 'Leap into the sky, then use the ability again to crash down on your aim point.',
    start(g, p) {
      p.fly = 1; p.abHigh = true;
      Sfx.tone(160, 0.6, 'sawtooth', 0.22, 700);
    },
    update(g, p, dt) {
      if (Math.random() < dt * 30) {
        g.fx.add.emit(p.x + rand(-1.4, 1.4), p.y - 0.2, p.z + rand(-1.4, 1.4), rand(-1, 1), -rand(3, 7), rand(-1, 1),
          { color: [2, 1, 0.3], color2: [0.7, 0.2, 0.05], size: rand(0.25, 0.55), size2: 0.05, life: 0.3, drag: 2 });
      }
    },
    end(g, p) { p.fly = 0; p.abHigh = false; },
    retrigger(g, p) {
      // hempas ke titik bidikan
      const tx = g.aim.x, tz = g.aim.z;
      p.x = tx; p.z = tz;
      p.vx *= 0.2; p.vz *= 0.2;
      p.fly = 0; p.y = 0;
      g.meteorImpact(tx, tz, 22, 300 + g.wave * 30);
      return true;
    },
  },

  lockdown: {
    name: 'Lockdown', dur: 4, cd: 22, color: '#57d6ff',
    desc: 'Pins the 4 nearest enemies within 35m in place for 4 seconds and grinds them down.',
    start(g, p) {
      g.fx.abilityRing(p.x, p.z, [0.5, 1.5, 2.2], 3, 46, 0.8);
      // REBALANCE: dahulu SEMUA musuh 45m selama 6s
      g.enemies.filter(e => !e.dead && !e.d.boss && Math.hypot(e.x - p.x, e.z - p.z) <= 35)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
        .slice(0, 4).forEach(e => { e.lockT = 4; });
      Sfx.tone(240, 0.6, 'square', 0.22, 90);
      g.shake(0.8, 0.3);
    },
    update(g, p, dt) {
      p.abZap = (p.abZap || 0) - dt;
      if (p.abZap > 0) return;
      p.abZap = 0.4;
      for (const e of g.enemies.slice()) {
        if (e.lockT <= 0) continue;
        g.damageEnemy(e, 26 + g.wave * 3, 0, 0, 0, 0, 'boom');
        if (Math.random() < 0.35) {
          g.fx.spark(e.x, e.y + e.h * 0.5, e.z, 3, [0.5, 1.5, 2.2], { speed: 3, size: 0.25, life: 0.25 });
        }
      }
    },
    end() { },
  },

  endlessflight: {
    name: 'Endless Flight', dur: 1e9, cd: 8, color: '#9ae8ff', toggle: true,
    desc: 'Stay airborne until you use the ability again. +45% damage, but +30% damage taken.',
    start(g, p) { p.fly = 1; p.abDmg = 1.45; p.abRes = 1.3; Sfx.tone(130, 0.7, 'sawtooth', 0.2, 420); },
    update(g, p, dt) {
      if (Math.random() < dt * 34) {
        g.fx.add.emit(p.x + rand(-1.2, 1.2), p.y - 0.15, p.z + rand(-1.6, 1.6), rand(-1, 1), -rand(3, 6), rand(-1, 1),
          { color: [0.6, 1.6, 2.2], color2: [0.1, 0.3, 0.6], size: rand(0.2, 0.45), size2: 0.05, life: 0.3, drag: 2 });
      }
    },
    end(g, p) { p.fly = 0; p.abDmg = 1; p.abRes = 1; },
  },

  prowshield: {
    name: 'Prow Shield', dur: 12, cd: 18, color: '#ffd257',
    desc: 'The ram shield on the nose powers up: 45% less damage taken for 12 seconds, it burns and slows whatever it touches, and every hit it eats becomes bonus armour.',
    // Nabil 2026-10-17: perisai rempuh juga jadi perisai sebenar - kurangkan damage diterima
    start(g, p) { p.prow = true; p.abRes = 0.55; p.overshield = p.overshield || 0; Sfx.tone(190, 0.5, 'square', 0.2, 420); },
    update(g, p, dt) {
      const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
      const sx = p.x + fx * 3.4, sz = p.z + fz * 3.4;
      if (Math.random() < dt * 40) {
        const a = rand(-1, 1);
        g.fx.add.emit(sx + -fz * a * 2.4, rand(0.4, 2.2), sz + fx * a * 2.4, 0, rand(0.5, 2), 0,
          { color: [2, 1.5, 0.5], color2: [0.7, 0.4, 0.05], size: rand(0.2, 0.45), size2: 0.04, life: 0.3, drag: 2 });
      }
      p.abZap = (p.abZap || 0) - dt;
      if (p.abZap > 0) return;
      p.abZap = 0.22;
      for (const e of g.enemies.slice()) {
        const dx = e.x - p.x, dz = e.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > 5.4 || d < 0.01) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.4) continue;      // hadapan sahaja
        g.damageEnemy(e, 22 + g.wave * 2.4, dx, 0, dz, 10, 'boom');
        e.slowT = Math.max(e.slowT, 1.4);
        p.overshield = Math.min(p.maxHp * 0.6, p.overshield + 1.4);
      }
    },
    end(g, p) { p.prow = false; p.abRes = 1; },
  },

  chainreaction: {
    name: 'Chain Reaction', dur: 1.6, cd: 18, color: '#7de3ff',
    desc: 'One discharge that jumps through up to 20 enemies, growing as it goes.',
    start(g, p) { p.abChain = 20; p.abZap = 0; p.chainFrom = null; Sfx.shoot('tesla'); },
    update(g, p, dt) {
      p.abZap -= dt;
      if (p.abZap > 0 || p.abChain <= 0) return;
      p.abZap = 0.07;
      const from = p.chainFrom;
      const ox = from ? from.x : p.x, oy = from ? from.y + from.h * 0.5 : 1.6, oz = from ? from.z : p.z;
      const hit = p.chainHit || (p.chainHit = []);
      const e = g.nearestEnemy(ox, oz, from ? 20 : 34, hit);
      if (!e) { p.abChain = 0; return; }
      hit.push(e);
      p.chainFrom = e;
      p.abChain--;
      const n = 20 - p.abChain;
      g.fx.lightning(ox, oy, oz, e.x, e.y + e.h * 0.5, e.z, [0.5, 1.7, 2.3], 6);
      g.damageEnemy(e, (60 + g.wave * 7) * (1 + n * 0.06), e.x - ox, 0, e.z - oz, 8, 'tesla');
      g.fx.spark(e.x, e.y + e.h * 0.5, e.z, 6, [0.5, 1.7, 2.3], { speed: 5, size: 0.35, life: 0.3 });
      Sfx.shoot('tesla');
    },
    end(g, p) { p.abChain = 0; p.chainFrom = null; p.chainHit = null; },
  },

  tetherstorm: {
    name: 'Tether Storm', dur: 10, cd: 20, color: '#8ab6ff',
    desc: 'Fly while live tethers latch onto up to 10 enemies at once.',
    start(g, p) { p.fly = 1; p.abZap = 0; Sfx.shoot('tesla'); },
    update(g, p, dt) {
      if (Math.random() < dt * 28) {
        g.fx.add.emit(p.x + rand(-1.2, 1.2), p.y - 0.15, p.z + rand(-1.4, 1.4), 0, -rand(3, 6), 0,
          { color: [0.6, 1.4, 2.2], color2: [0.1, 0.3, 0.6], size: rand(0.2, 0.4), size2: 0.04, life: 0.3, drag: 2 });
      }
      p.abZap -= dt;
      if (p.abZap > 0) return;
      p.abZap = 0.25;
      const hit = [];
      for (let i = 0; i < 10; i++) {
        const e = g.nearestEnemy(p.x, p.z, 30, hit);
        if (!e) break;
        hit.push(e);
        g.fx.lightning(p.x, p.y + 1.2, p.z, e.x, e.y + e.h * 0.5, e.z, [0.6, 1.4, 2.3], 5);
        g.damageEnemy(e, 28 + g.wave * 3, e.x - p.x, 0, e.z - p.z, 3, 'tesla');
      }
    },
    end(g, p) { p.fly = 0; },
  },

  weaponbloom: {
    name: 'Weapon Bloom', dur: 10, cd: 22, color: '#d48bff',
    desc: 'Unfolds 2 extra hardpoints: 6 weapons firing at once for 10 seconds.',
    start(g, p) { g.addTempSlots(2); Sfx.buy(); void p; },
    update() { },
    end(g, p) { g.removeTempSlots(); void p; },
  },

  decoyfield: {
    name: 'Decoy Field', dur: 10, cd: 20, color: '#ff5a3c',
    desc: 'Plant a screaming decoy and vanish. Everything shoots the decoy instead of you.',
    start(g, p) {
      g.spawnDecoy(p.x, p.z, 10);
      p.cloak = true;
      g.setCarOpacity(0.3);
      Sfx.tone(700, 0.35, 'square', 0.18, 260);
    },
    update() { },
    end(g, p) { p.cloak = false; g.setCarOpacity(1); g.clearDecoy(); },
  },

  tidalsurge: {
    name: 'Tidal Surge', dur: 4.4, cd: 16, color: '#4ad8ff',
    desc: 'Rolls a wave forward that sweeps up to 2 cars along with it, drowning them as they go.',
    start(g, p) {
      spawnWave(g, 150 + g.wave * 8, 4.2, 17, [0.45, 1.5, 2.2]);
      Sfx.noise(0.5, 0.7, 380, 0.8);
      Sfx.tone(90, 0.7, 'sine', 0.24, 40);
      g.shake(0.7, 0.3);
      void p;
    },
    update() { },
    end() { },
  },

  twister: {
    name: 'Twister', dur: 5, cd: 17, color: '#b9d8ff',
    desc: 'Fires a wind charge that tears open a tornado. It grabs up to 2 cars standing near it and spins them helpless.',
    start(g, p) {
      // dihantar kepada MUSUH - keutamaan kepada kumpulan paling padat
      const pt = g.abilityPoint(20, 7);
      spawnTornado(g, pt.x, pt.z, { dmg: 100 + g.wave * 6, life: 5, radius: 7, color: [0.8, 1.1, 1.5] });
      void p;
      Sfx.noise(0.55, 0.9, 900, 0.6);
      Sfx.tone(210, 0.8, 'sawtooth', 0.16, 70);
      g.shake(0.5, 0.25);
    },
    update() { },
    end() { },
  },

  backdraft: {
    name: 'Backdraft', dur: 2.6, cd: 18, color: '#ff8a3a',
    /* Bukan penyembur api. Dua peringkat: sedut dahulu, kemudian nyalakan.
       Lagi ramai yang tersedut masuk, lagi kuat letupannya. */
    desc: 'Starves the air, dragging nearby cars in - then ignites it. The more it pulled in, the bigger the blast.',
    start(g, p) {
      p.bdPull = 1; p.bdCount = 0;
      Sfx.noise(0.5, 1.2, 260, 0.7);
      Sfx.tone(70, 1.2, 'sine', 0.2, 34);
      g.fx.abilityRing(p.x, p.z, [1.9, 0.8, 0.3], 16, 2, 0.8);
    },
    update(g, p, dt) {
      // peringkat sedut
      let n = 0;
      g.neighbors(p.x, p.z, 17, null, (e, dx, dz, d) => {
        if (d < 1 || e.d.boss) return;
        n++;
        const f = (1 - d / 17) * 26 * dt;
        e.x -= (dx / d) * f * -1;       // dx = p - e, jadi tarik ke arah pemain
        e.z -= (dz / d) * f * -1;
        e.slowT = Math.max(e.slowT, 0.3);
      });
      p.bdCount = Math.max(p.bdCount, n);
      // bara berpusar masuk
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * TAU, r = 10 + Math.random() * 6;
        g.fx.add.emit(p.x + Math.cos(a) * r, rand(0.4, 3), p.z + Math.sin(a) * r,
          -Math.cos(a) * 16, 1, -Math.sin(a) * 16,
          { color: [1.9, 0.8, 0.25], color2: [0.5, 0.1, 0.04], size: 0.3, size2: 0.6, life: 0.55, drag: 0.5 });
      }
      void dt;
    },
    end(g, p) {
      // peringkat nyala: kuasa mengikut berapa ramai yang tersedut
      const k = 1 + Math.min(4, p.bdCount || 0) * 0.42;
      const dmg = (190 + g.wave * 11) * k;
      g.explodeAt(p.x, 1.2, p.z, 13 * Math.min(1.5, k), dmg);
      g.fx.abilityRing(p.x, p.z, [2.0, 0.9, 0.3], 2, 22 * k, 0.6);
      g.fx.explode(p.x, 1.4, p.z, 9 * k, [1.9, 0.8, 0.25], { dur: 0.8 });
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * TAU;
        g.fx.add.emit(p.x, 1.0, p.z, Math.cos(a) * 18 * k, rand(3, 9), Math.sin(a) * 18 * k,
          { color: [2.0, 1.0, 0.3], color2: [0.5, 0.1, 0.04], size: 0.6, size2: 0.08, life: 0.7, drag: 1.5 });
      }
      Sfx.boom(1.6);
      g.shake(1.5 * k, 0.4);
      p.bdPull = 0; p.bdCount = 0;
    },
  },

  /* Hamvog: SUIS dua keadaan, bukan kebolehan bermasa.
     Terlipat (abOn = false) -> halimunan, tidak boleh disasar, senjata mati, boleh bergerak.
     Dibuka  (abOn = true)  -> lengan terbuka, kereta terkunci, kelihatan, 5 senjata hidup.
     `passive` dijalankan setiap bingkai semasa terlipat (lihat updateAbility). */
  siege: {
    name: 'Siege Deploy', dur: 1e9, cd: 4, color: '#8fd4ff', toggle: true,
    desc: 'Packed: cloaked and untargetable, but every weapon is offline. Use the ability to deploy - the arms swing out, the car locks in place, the cloak drops and all five weapons fire. Use it again to pack up.',
    passive(g, p) {
      p.cloak = true; p.untarget = true; p.weaponsOff = true; p.siegeLock = false;
      p.deployTo = 0;
      if (g._carOp !== 0.3) g.setCarOpacity(0.3);       // kelihatan samar kepada pemain sendiri
    },
    start(g, p) {
      p.cloak = false; p.untarget = false; p.siegeLock = true;
      p.deployTo = 1;
      p.siegeWarm = 0.75;                 // lengan perlu masa untuk terbuka sebelum menembak
      p.weaponsOff = true;
      g.setCarOpacity(1);
      Sfx.tone(140, 0.5, 'square', 0.2, 320);
      Sfx.noise(0.25, 0.3, 900, 0.8);
    },
    update(g, p, dt) {
      if (p.siegeWarm > 0) { p.siegeWarm -= dt; p.weaponsOff = p.siegeWarm > 0; }
    },
    end(g, p) {
      p.siegeLock = false; p.weaponsOff = true; p.deployTo = 0;
      p.cloak = true; p.untarget = true;
      g.setCarOpacity(0.3);
      Sfx.tone(420, 0.35, 'square', 0.16, 140);
    },
  },

  /* Hyna: kubah penyerap. Rakan bebas keluar masuk; musuh ditolak keluar dan
     peluru mereka diserap (lihat Game.updateDome / updateBullets). Bila 6s
     tamat, meriam menembak 2 musuh terdekat - menembusi semua halangan -
     dengan 5000 damage + 3x jumlah damage yang diserap. */
  absorbdome: {
    name: 'Absorber Dome', dur: 6, cd: 24, color: '#b46bff',
    desc: 'Raise a huge absorber dome for 6 seconds: teammates pass freely, enemies and their shots cannot get in, and you move slowly. Then a cannon fires through every obstacle at the 2 nearest enemies for half their max HP - plus double every bit of damage the dome soaked (up to 110% of their HP).',
    start(g, p) {
      g.dome = { x: p.x, z: p.z, r: 12, absorbed: 0 };
      g.showShield(true, 0xa35cff, 12);
      p.abSpeed = 0.45;
      Sfx.tone(110, 0.8, 'sine', 0.24, 260);
      Sfx.noise(0.4, 0.5, 600, 0.7);
    },
    update(g, p, dt) {
      if (!g.dome) return;
      g.dome.x = p.x; g.dome.z = p.z;
      // teras meriam mengecas: percikan ungu berkumpul ke kereta
      if (Math.random() < dt * 26) {
        const a = rand(TAU), r = rand(2, 5);
        g.fx.add.emit(p.x + Math.cos(a) * r, rand(0.6, 3), p.z + Math.sin(a) * r,
          -Math.cos(a) * r * 1.6, rand(0.4, 1.4), -Math.sin(a) * r * 1.6,
          { color: [1.6, 0.6, 2.6], color2: [0.4, 0.1, 0.6], size: 0.3, size2: 0.03, life: 0.45, drag: 1 });
      }
    },
    end(g, p) {
      const d = g.dome;
      g.dome = null;
      g.showShield(false);
      p.abSpeed = 1;
      if (d && !p.dead) g.fireDomeCannon(p, d.absorbed);
    },
  },

  /* Gyhna: tiga cas pautan, BUKAN kebolehan bermasa. Setiap tekan = satu
     pautan 10s ke rakan terdekat yang belum dipaut (atau ke Gyhna sendiri
     kalau tiada rakan). Kalis kerosakan Gyhna: 1 pautan +50%, 2 = +100%,
     3 = +200%. Kerosakan diterima = 1 / (1 + kalis). */
  repairlink: {
    name: 'Repair Link', dur: 0, cd: 0, color: '#5dffb0', charges: 3,
    desc: 'Three link charges, 10 seconds each. A linked teammate gets +10 km/h, repairs and 50% resistance. Every live link also repairs Gyhna and hardens it: +50%, +50%, then +100% resistance (200% total). A teammate can only hold one link at a time. When a link ends, that charge needs 10 seconds to recharge.',
    /* Nabil 2026-10-17: selepas pautan tamat, cas itu bertenang 10s (p.linkCd)
       sebelum boleh dipaut semula - dahulu cas pulih serta-merta. */
    press(g, p) {
      p.links = p.links || [];
      p.linkCd = p.linkCd || [];
      if (p.links.length + p.linkCd.length >= 3) { Sfx.deny(); return false; }
      const allies = g.team ? g.team.allies : [];
      let best = null, bd = 48;
      for (const a of allies) {
        if (a.dead || p.links.some(l => l.t === a)) continue;
        const d = Math.hypot(a.x - p.x, a.z - p.z);
        if (d < bd) { bd = d; best = a; }
      }
      p.links.push({ t: best, T: 10 });
      g.fx.abilityRing(p.x, p.z, [0.4, 2.0, 1.2], 2, 9, 0.35);
      Sfx.tone(520 + p.links.length * 160, 0.25, 'sine', 0.18, 900);
      return best ? best.name || 'TEAMMATE' : 'SELF';
    },
    passive(g, p, dt) {
      const L = p.links || (p.links = []);
      const C = p.linkCd || (p.linkCd = []);
      for (let i = C.length - 1; i >= 0; i--) if ((C[i] -= dt) <= 0) C.splice(i, 1);
      for (let i = L.length - 1; i >= 0; i--) {
        const l = L[i];
        l.T -= dt;
        if (l.T <= 0) { L.splice(i, 1); C.push(10); Sfx.tone(300, 0.15, 'sine', 0.1, 200); continue; }
        const a = l.t;
        if (a && !a.dead) {
          a.linkedUntil = g.time + 0.15;                    // dibaca oleh team.js (laju + kalis)
          a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.05 * dt);
          g.fx.beam(p.x, 1.7, p.z, a.x, 1.5, a.z, [0.4, 2.0, 1.1], 0.08 + Math.sin(g.time * 18 + i) * 0.02, 0.05);
        }
      }
      const RES = [0, 0.5, 1.0, 2.0];
      p.abRes = 1 / (1 + RES[Math.min(3, L.length)]);
      if (L.length && !p.dead) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.025 * L.length * dt);
    },
    start() { }, update() { }, end() { },
  },

  /* Ouroboros: badan ular membelit musuh terdekat (lihat Game.animSerpent).
     Sasaran dikunci (lockT) dan dihancurkan 900/s; jika mati, belitan
     berpindah ke musuh seterusnya dalam 40m. Tiada sasaran = cas dipulangkan. */
  constrict: {
    name: 'Constrict', dur: 4.5, cd: 18, color: '#3dff8a',
    desc: 'The serpent body tears loose and coils around the nearest enemy within 40m, pinning it and crushing it for 4.5 seconds - it moves on to the next enemy if the first one dies. The lighter head drives 30% faster meanwhile.',
    start(g, p) {
      const t = g.nearestEnemy(p.x, p.z, 40);
      if (!t) { p.constrict = null; p.abT = 0.05; p.abMiss = true; return; }
      p.constrict = { t, vis: 0, acc: 0 };
      p.abSpeed = 1.3;
      Sfx.noise(0.35, 0.5, 3000, 1.4);
      Sfx.tone(180, 0.5, 'sawtooth', 0.2, 60);
    },
    update(g, p, dt) {
      const c = p.constrict;
      if (!c) return;
      if (!c.t || c.t.dead) {
        const n = g.nearestEnemy(p.x, p.z, 40);
        if (!n) { p.abT = Math.min(p.abT, 0.3); return; }
        c.t = n; c.vis = 0.3;
      }
      const t = c.t;
      if (c.vis < 0.6) return;                      // badan masih dalam perjalanan ke sasaran
      t.lockT = Math.max(t.lockT || 0, 0.25);
      t.vx = 0; t.vz = 0;
      c.acc += dt;
      if (c.acc >= 0.15) {
        t.lastHitBy = 'player';
        g.damageEnemy(t, 900 * c.acc, 0, 0, 0, 0, 'bullet');
        g.fx.spark(t.x, (t.y || 0) + 1, t.z, 6, [0.5, 2.2, 0.9], { speed: 6, size: 0.3, life: 0.3 });
        c.acc = 0;
        if (Math.random() < 0.4) Sfx.noise(0.08, 0.2, 900, 1.2);
      }
    },
    end(g, p) {
      p.constrict = null; p.abSpeed = 1;
      if (p.abMiss) { p.abMiss = false; p.abCd = 1; window.UI && window.UI.toast('NO ENEMY IN RANGE'); }
    },
  },

  /* Medusa: tiga sesungut tenaga menangkap musuh terdekat dalam 34m,
     menyeret mereka hingga 6.5m, memegang (lockT) dan menyedut 320/s setiap
     satu - 30% menjadi HP Medusa. Visual: Game.updateGrabFx. */
  abyssgrasp: {
    name: 'Abyssal Grasp', dur: 3.5, cd: 20, color: '#ff5ad8',
    desc: 'Three tentacles lash out at the nearest enemies within 34m, drag them in close, hold them and drain them for 3.5 seconds. 30% of the damage heals Medusa.',
    start(g, p) {
      const ts = g.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 34)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 3);
      if (!ts.length) { p.grabs = null; p.abT = 0.05; p.abMiss = true; return; }
      p.grabs = ts.map(t => ({ t, acc: 0 }));
      Sfx.tone(90, 0.7, 'sine', 0.26, 300);
      Sfx.noise(0.4, 0.4, 700, 0.8);
    },
    update(g, p, dt) {
      for (const gr of p.grabs || []) {
        const t = gr.t;
        if (!t || t.dead) continue;
        const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz) || 1;
        if (d > 6.5) { const m = Math.min(d - 6.5, 16 * dt); t.x += dx / d * m; t.z += dz / d * m; }
        t.lockT = Math.max(t.lockT || 0, 0.25);
        t.vx = 0; t.vz = 0;
        gr.acc += dt;
        if (gr.acc >= 0.2) {
          const dmg = 320 * gr.acc;
          t.lastHitBy = 'player';
          g.damageEnemy(t, dmg, 0, 0, 0, 0, 'bullet');
          p.hp = Math.min(p.maxHp, p.hp + dmg * 0.3);
          gr.acc = 0;
        }
      }
    },
    end(g, p) {
      p.grabs = null;
      if (p.abMiss) { p.abMiss = false; p.abCd = 1; window.UI && window.UI.toast('NO ENEMY IN RANGE'); }
    },
  },

  vanish: {
    name: 'Vanish', dur: 7, cd: 19, color: '#9be8ff',
    desc: 'Lifts off and disappears. Nothing can see or target you for 7 seconds.',
    start(g, p) {
      p.fly = 1;
      p.cloak = true;
      p.untarget = true;            // AI musuh berhenti melihat pemain sama sekali
      g.setCarOpacity(0.18);
      g.fx.abilityRing(p.x, p.z, [0.6, 1.5, 2.0], 2, 13, 0.45);
      Sfx.tone(820, 0.4, 'sine', 0.16, 180);
      Sfx.noise(0.3, 0.45, 2600, 0.6);
    },
    update(g, p, dt) {
      if (Math.random() < dt * 22) {
        g.fx.add.emit(p.x + rand(-1.4, 1.4), (p.y || 0) + rand(0.4, 2), p.z + rand(-1.6, 1.6),
          rand(-0.6, 0.6), rand(0.6, 2), rand(-0.6, 0.6),
          { color: [0.6, 1.4, 1.9], color2: [0.1, 0.3, 0.45], size: 0.3, size2: 0.02, life: 0.5, drag: 2.4 });
      }
    },
    end(g, p) {
      p.fly = 0; p.cloak = false; p.untarget = false;
      g.setCarOpacity(1);
      g.fx.abilityRing(p.x, p.z, [0.6, 1.5, 2.0], 12, 2, 0.4);
      Sfx.tone(300, 0.3, 'square', 0.14, 700);
    },
  },

  strikedrone: {
    name: 'Strike Flight', dur: 0.2, cd: 15, color: '#ff8a4a',
    desc: 'Launches five strike drones. Each one picks an enemy, flies straight into it and detonates.',
    start(g, p) { g.spawnStrikeDrones(5); void p; },
    update() { },
    end() { },
  },

  droneswarm: {
    name: 'Drone Swarm', dur: 15, cd: 22, color: '#7dffb0',
    desc: 'Three wingman drones escort you and pick their own targets for 15 seconds.',
    start(g, p) { g.spawnWingDrones(3, 15); Sfx.buy(); void p; },
    update() { },
    end() { },
  },

  seismic: {
    name: 'Seismic Slam', dur: 2.2, cd: 20, color: '#ffb23f',
    desc: 'Three rolling shockwaves that knock enemies flat and stun them.',
    start(g, p) { p.abWave = 0; p.abWaveN = 3; g.shake(1.6, 0.4); Sfx.boom(1.6); },
    update(g, p, dt) {
      p.abWave -= dt;
      if (p.abWave > 0 || p.abWaveN <= 0) return;
      p.abWave = 0.55;
      p.abWaveN--;
      const r = 20 + (3 - p.abWaveN) * 9;
      g.fx.abilityRing(p.x, p.z, [2, 1.3, 0.4], 3, r, 0.5);
      g.shake(1.0, 0.25);
      Sfx.boom(1.1);
      for (const e of g.enemies.slice()) {
        const dx = e.x - p.x, dz = e.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > r || d < 0.01) continue;
        g.damageEnemy(e, 70 + g.wave * 8, dx, 0, dz, 36, 'boom');
        e.slowT = Math.max(e.slowT, 2.5);
      }
    },
    end(g, p) { p.abWaveN = 0; },
  },

  blink: {
    name: 'Teleport Beacon', dur: 12, cd: 15, color: '#c58bff',
    desc: 'Fire a beacon. Use the ability again to teleport to it - arriving blasts everything around you.',
    start(g, p) {
      const dx = g.aim.x - p.x, dz = g.aim.z - p.z;
      g.spawnBeacon(p.x + dx, p.z + dz);
      Sfx.tone(700, 0.3, 'sine', 0.18, 1400);
    },
    update() { },
    end(g, p) { g.clearBeacon(); void p; },
    // tekan semula semasa aktif = teleport
    retrigger(g, p) {
      if (!g.beacon) return false;
      const bx = g.beacon.x, bz = g.beacon.z;
      g.fx.explode(p.x, 1, p.z, 5, [0.8, 0.4, 1.6], { dur: 0.4 });
      p.x = bx; p.z = bz;
      p.vx *= 0.3; p.vz *= 0.3;
      g.fx.explode(bx, 1, bz, 5, [0.8, 0.4, 1.6], { dur: 0.4 });
      // tiba dengan letupan yang menolak musuh di sekeliling
      g.conePulse(bx, bz, 0, 1, 12, -1.01, 70 + g.wave * 8);
      g.clearBeacon();
      Sfx.tone(1400, 0.3, 'sine', 0.2, 500);
      g.shake(0.8, 0.2);
      return true;   // tamatkan kebolehan
    },
  },
};

Object.assign(ABILITY, ABILITY2);

export function carStatsFor(carId, ups) {
  const c = CAR_BY[carId] || CAR_BY.ranger;
  return c.mods;
}


/* ---------------- pembantu simpanan setiap kereta ---------------- */
export function slotsOf(carId) { return (CAR_BY[carId] || CAR_BY.ranger).slots || 2; }
export function upMaxOf(carId, upId) {
  const c = CAR_BY[carId] || CAR_BY.ranger;
  const m = (c.upMax && c.upMax[upId]) || 6;
  // setiap kereta boleh jadi cukup tahan lasak bila dinaik taraf penuh
  if (upId === 'armor') return Math.max(9, m);
  if (upId === 'plate') return Math.max(8, m);
  return m;
}
// pengganda kerosakan senjata ikut bilangan slot (2 slot = setiap senjata lebih kuat)
/* Lagi banyak dudukan, lagi lemah setiap satu - kalau tidak kereta enam
   slot akan memadamkan segalanya. Fly (6) paling lemah setiap senjata. */
export const SLOT_MUL = { 1: 2.0, 2: 1.6, 3: 1.22, 4: 1.0, 5: 0.86, 6: 0.74 };
/* IMBANGAN KERETA: setiap kereta mesti mampu melawan mana-mana kereta lain.
   Kuasa bertempur ~ HP berkesan x mobiliti x jumlah damage. Jumlah damage
   (slot x pengganda) disamakan untuk semua kereta, kemudian dilaraskan
   supaya kereta tebal/perlahan dan kereta nipis/laju setara.
   Fly memakai 5 sebagai asas slot: hanya 2 hidup pada mulanya, 6 bila penuh. */
const REF_FIRE = 3.6;
const ehpOf = c => 260 + 1.5 * ((c.mods && c.mods.hp) || 0);   // rujukan: kereta separa naik taraf
const mobOf = c => 1 + 0.9 * (((c.mods && c.mods.speed) || 1) - 1) + 0.4 * (((c.mods && c.mods.grip) || 1) - 1);
let _meanPow = 0;
export function carBalance(carId) {
  if (!_meanPow) _meanPow = CARS.reduce((a, c) => a + ehpOf(c) * mobOf(c), 0) / CARS.length;
  const c = CAR_BY[carId] || CAR_BY.ranger;
  return _meanPow / (ehpOf(c) * mobOf(c));
}
export function slotMulOf(carId) {
  const c = CAR_BY[carId] || CAR_BY.ranger;
  const n = c.id === 'fly' ? 5 : slotsOf(carId);
  return Math.round(REF_FIRE / n * carBalance(carId) * 100) / 100;
}
/* susunan senjata setiap kereta — panjang array mengikut bilangan slot */
export function getLoadout(carId) {
  if (!Save.d.loadout) Save.d.loadout = {};
  const n = slotsOf(carId);
  let a = Save.d.loadout[carId];
  if (!Array.isArray(a)) a = [];
  a = a.slice(0, n);
  while (a.length < n) a.push(null);
  Save.d.loadout[carId] = a;
  return a;
}
/* naik taraf setiap kereta — berasingan, tidak dikongsi */
export function getCarUp(carId) {
  if (!Save.d.carUp) Save.d.carUp = {};
  if (!Save.d.carUp[carId] || typeof Save.d.carUp[carId] !== 'object') Save.d.carUp[carId] = {};
  return Save.d.carUp[carId];
}

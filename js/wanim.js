// wanim.js — animasi senjata: sentakan menembak dan gerakan isi semula.
//
// Reka bentuk setiap senjata TIDAK diubah. Yang ditambah ialah bahagian yang
// boleh bergerak (magazin, bolt, injap) dan gerakan yang sesuai dengan cara
// senjata itu sepatutnya berfungsi — pistol menjatuhkan magazin, pelancar
// roket membuka tiubnya, laser membuka sirip penyejuk, dan seterusnya.
//
// Setiap keluarga ada dua fungsi:
//   fire(P, k)        k = 1 sebaik das dilepaskan, susut ke 0
//   reload(P, t)      t = 0..1 sepanjang tempoh isi semula
// P ialah bahagian model: { root, mag, bolt, spinner, glowMat }

const PI = Math.PI;
const ease = t => t * t * (3 - 2 * t);
const bump = t => Math.sin(PI * t);              // 0 -> 1 -> 0

/* Keluarga setiap senjata. Dipilih mengikut cara senjata itu menembak,
   bukan mengikut rupa, supaya gerakannya masuk akal. */
const FAM = {
  // magazin kotak: jatuh keluar, yang baharu ditolak masuk, bolt dilepaskan
  mg: 'mag', smg: 'mag', nail: 'mag', pulse: 'mag', phase: 'mag',
  sniper: 'bolt', shard: 'bolt', rail: 'bolt',
  // patah buka: laras jatuh ke bawah, peluru diisi
  shotgun: 'break', autoshot: 'break', flak: 'break',
  // dram berputar
  minigun: 'rotary', gatling: 'rotary', buzzsaw: 'drum', volley: 'drum',
  // tiub: penutup terbuka, roket digelongsorkan masuk
  rocket: 'tube', swarm: 'tube', seeker: 'tube', huntershell: 'tube', vulag: 'tube',
  juhag: 'energy', arbog: 'energy', lash: 'energy', nettle: 'energy',
  mortar: 'tube', frost: 'tube', venom: 'tube', hive: 'tube', harpoon: 'tube',
  // tenaga: sirip penyejuk terbuka, teras berdenyut
  laser: 'energy', cryo: 'energy', arc: 'energy', tesla: 'energy',
  disruptor: 'energy', drain: 'energy', shocklance: 'energy', lance: 'energy',
  tether: 'energy', plasma: 'energy', blaze: 'energy', acid: 'energy',
  flame: 'energy', singularity: 'energy', repulsor: 'energy',
  annihilator: 'charge',
  // khas
  fist: 'piston', drill: 'disc', net: 'coil',
  waterjet: 'energy', amber: 'energy', windcharge: 'charge', wily: 'drum',
  // senjata tandatangan 2026-10-17
  spine: 'tube', maul: 'piston', javelin: 'tube', glaive: 'bolt', stinger: 'mag',
  lantern: 'tube', chime: 'energy', fork: 'energy', rime: 'break', fence: 'mag', hurago: 'energy', diamond: 'energy', gale: 'charge',
};

export function famOf(id) { return FAM[id] || 'mag'; }

/* ---------------- gerakan setiap keluarga ---------------- */
const KIND = {
  mag: {
    fire(P, k) {
      P.root.position.z = -k * 0.26;
      P.root.rotation.x = -k * 0.13;
      if (P.bolt) P.bolt.position.z = -k * 0.3;
    },
    reload(P, t) {
      // 0.00-0.30 magazin jatuh  0.30-0.70 yang baharu naik  0.70-1.00 bolt
      if (P.mag) {
        const d = t < 0.3 ? ease(t / 0.3) : t < 0.7 ? 1 - ease((t - 0.3) / 0.4) : 0;
        P.mag.position.y = -d * 0.9;
        P.mag.rotation.x = d * 0.5;
        P.mag.visible = !(t > 0.28 && t < 0.34);
      }
      if (P.bolt && t > 0.72) P.bolt.position.z = -bump((t - 0.72) / 0.28) * 0.34;
      P.root.rotation.x = -0.3 * bump(t);
      P.root.rotation.z = 0.18 * bump(t);
    },
  },

  bolt: {                                     // senapang tepat: bolt ditarik setiap das
    fire(P, k) {
      P.root.position.z = -k * 0.42;
      P.root.rotation.x = -k * 0.2;
      if (P.bolt) { P.bolt.position.z = -k * 0.5; P.bolt.rotation.z = k * 0.9; }
    },
    reload(P, t) {
      if (P.mag) { const d = bump(t); P.mag.position.y = -d * 0.7; P.mag.rotation.x = d * 0.4; }
      if (P.bolt) { P.bolt.position.z = -bump(t) * 0.55; P.bolt.rotation.z = bump(t) * 1.4; }
      P.root.rotation.x = -0.24 * bump(t);
    },
  },

  break: {                                    // patah buka
    fire(P, k) {
      P.root.position.z = -k * 0.34;
      P.root.rotation.x = -k * 0.28;          // hentakan kuat
    },
    reload(P, t) {
      const open = t < 0.5 ? ease(t / 0.5) : 1 - ease((t - 0.5) / 0.5);
      if (P.bolt) P.bolt.rotation.x = open * 0.85;     // laras jatuh ke bawah
      if (P.mag) { P.mag.position.z = (1 - open) * 0.3; P.mag.visible = open > 0.35; }
      P.root.rotation.x = -0.18 * open;
    },
  },

  rotary: {                                   // dram berputar
    fire(P, k) { P.root.position.z = -k * 0.14; P.root.rotation.x = -k * 0.05; },
    reload(P, t) {
      if (P.mag) { P.mag.position.y = -bump(t) * 0.55; P.mag.rotation.z = bump(t) * 0.7; }
      P.root.rotation.z = 0.24 * bump(t);
    },
  },

  drum: {
    fire(P, k) { P.root.position.z = -k * 0.2; if (P.mag) P.mag.rotation.z -= k * 0.5; },
    reload(P, t) {
      if (P.mag) { P.mag.rotation.z = t * PI * 2; P.mag.position.x = bump(t) * 0.5; }
      P.root.rotation.x = -0.2 * bump(t);
    },
  },

  tube: {                                     // pelancar roket
    fire(P, k) {
      P.root.position.z = -k * 0.36;
      P.root.rotation.x = k * 0.16;           // hidung terangkat
    },
    reload(P, t) {
      const open = t < 0.35 ? ease(t / 0.35) : t > 0.75 ? 1 - ease((t - 0.75) / 0.25) : 1;
      if (P.bolt) P.bolt.rotation.x = -open * 1.15;    // penutup belakang terbuka
      if (P.mag) {
        // roket baharu digelongsorkan masuk dari belakang
        const s = t < 0.35 ? 0 : t < 0.75 ? ease((t - 0.35) / 0.4) : 1;
        P.mag.position.z = -1.0 + s * 1.0;
        P.mag.visible = t > 0.3 && t < 0.92;
      }
      P.root.rotation.z = 0.1 * bump(t);
    },
  },

  energy: {                                   // pancaran: tiada magazin, hanya haba
    fire(P, k) {
      P.root.position.z = -k * 0.1;
      if (P.glowMat) P.glowMat.emissiveIntensity = 1.4 + k * 2.6;
      if (P.bolt) P.bolt.position.z = -k * 0.12;
    },
    reload(P, t) {
      // "isi semula" pancaran = membuang haba: sirip terbuka
      const open = bump(t);
      if (P.bolt) { P.bolt.rotation.x = open * 0.5; P.bolt.position.y = open * 0.16; }
      if (P.mag) { P.mag.position.y = open * 0.2; P.mag.rotation.z = open * 0.6; }
      if (P.glowMat) P.glowMat.emissiveIntensity = 1.4 + (1 - open) * 1.2;
      P.root.rotation.x = -0.12 * open;
    },
  },

  charge: {                                   // railgun / annihilator
    fire(P, k) {
      P.root.position.z = -k * 0.55;
      P.root.rotation.x = -k * 0.26;
      if (P.glowMat) P.glowMat.emissiveIntensity = 1.2 + k * 4;
      if (P.bolt) P.bolt.position.z = -k * 0.45;
    },
    reload(P, t) {
      const d = bump(t);
      if (P.mag) { P.mag.position.y = -d * 0.75; P.mag.rotation.x = d * 0.6; }
      if (P.bolt) P.bolt.position.z = -d * 0.4;
      if (P.glowMat) P.glowMat.emissiveIntensity = 1.2 + (1 - Math.abs(t * 2 - 1)) * 2.2;
      P.root.rotation.x = -0.3 * d;
    },
  },

  piston: {                                   // Fist: omboh menghentak keluar
    fire(P, k) {
      const punch = k > 0.72 ? (1 - k) / 0.28 : k / 0.72;   // keluar laju, tarik perlahan
      if (P.bolt) P.bolt.position.z = punch * 0.62;
      P.root.position.z = -k * 0.46;
      P.root.rotation.x = -k * 0.2;
      if (P.glowMat) P.glowMat.emissiveIntensity = 1.2 + k * 3;
    },
    reload(P, t) {
      const d = bump(t);
      if (P.bolt) P.bolt.position.z = -d * 0.28;           // omboh ditarik semula
      if (P.mag) { P.mag.position.y = -d * 0.8; P.mag.rotation.x = d * 0.55; }
      P.root.rotation.x = -0.26 * d;
      P.root.rotation.z = -0.2 * d;
    },
  },

  disc: {                                     // Breach Drill: cakera dilepaskan
    fire(P, k) {
      P.root.position.z = -k * 0.2;
      if (P.spinner) P.spinner.rotation.z += k * 0.7;
      if (P.mag) { P.mag.visible = k < 0.5; P.mag.position.z = k * 0.8; }
    },
    reload(P, t) {
      if (P.mag) {
        P.mag.visible = t > 0.45;
        P.mag.position.z = -(1 - ease(Math.min(1, t / 0.9))) * 0.7;
        P.mag.rotation.z = t * PI * 3;
      }
      if (P.bolt) P.bolt.rotation.x = bump(t) * 0.7;
      P.root.rotation.z = 0.2 * bump(t);
    },
  },

  coil: {                                     // Snare Net: gelung dilontar
    fire(P, k) {
      P.root.position.z = -k * 0.24;
      if (P.mag) { P.mag.scale.setScalar(1 - k * 0.7); P.mag.rotation.z += k * 0.4; }
    },
    reload(P, t) {
      if (P.mag) { P.mag.scale.setScalar(0.3 + ease(t) * 0.7); P.mag.rotation.z = t * PI * 2; }
      if (P.bolt) P.bolt.position.y = -bump(t) * 0.3;
      P.root.rotation.x = -0.18 * bump(t);
    },
  },
};

/* Nilai rehat, supaya senjata kembali ke kedudukan asal. */
function rest(P) {
  P.root.position.set(0, 0, 0);
  P.root.rotation.set(0, 0, 0);
  if (P.mag) { P.mag.position.set(0, 0, 0); P.mag.rotation.set(0, 0, 0); P.mag.scale.setScalar(1); P.mag.visible = true; }
  if (P.bolt) { P.bolt.position.set(0, 0, 0); P.bolt.rotation.set(0, 0, 0); }
  if (P.glowMat) P.glowMat.emissiveIntensity = 1.4;
}

/**
 * Gerakkan satu senjata untuk bingkai ini.
 * @param wm   model senjata daripada buildWeaponModel
 * @param slot keadaan slot (mengandungi reload, st, fireT)
 * @param fireK 0..1 baki sentakan das terakhir
 */
export function animWeapon(wm, slot, fireK) {
  const K = KIND[wm.fam] || KIND.mag;
  rest(wm);
  const reloading = slot.reload > 0 && slot.st.reload > 0;
  if (reloading) K.reload(wm, 1 - slot.reload / slot.st.reload);
  else if (fireK > 0.001) K.fire(wm, fireK);
}

/* Bila zarah selongsong patut dikeluarkan, mengikut keluarga. */
export const EJECT_AT = {
  mag: 0.3, bolt: 0.45, break: 0.5, rotary: 0.4, drum: 0.35,
  tube: 0.3, energy: 0.35, charge: 0.4, piston: 0.4, disc: 0.45, coil: 0.4,
};

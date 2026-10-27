// abfx.js — animasi kebolehan kereta.
//
// Setiap kebolehan dahulunya berkongsi satu letupan gelang yang sama. Di sini
// setiap satu diberi bentuk pengaktifannya sendiri (`cast`) DAN aura yang
// berterusan selagi ia aktif (`aura`), supaya pemain boleh kenal kebolehan
// mana yang baru dilepaskan hanya dengan melihat.
//
// Warna diambil daripada ABILITY[].color, jadi jadual ini hanya menetapkan
// BENTUK gerakan — warna tidak diulang dua kali.

const TAU = Math.PI * 2;

/* kind = bentuk pengaktifan, aura = kesan berterusan, r = saiz gelang */
const AB = {
  overdrive:     { kind: 'surge',  aura: 'embers', r: 16 },
  aegis:         { kind: 'dome',   aura: 'shell',  r: 12 },
  repair:        { kind: 'bloom',  aura: 'motes',  r: 11 },
  absorb:        { kind: 'dome',   aura: 'orbit',  r: 13 },
  hover:         { kind: 'lift',   aura: 'thrust', r: 14 },
  gunship:       { kind: 'lift',   aura: 'thrust', r: 15 },
  mines:         { kind: 'drop',   aura: 'none',   r: 10 },
  nuke:          { kind: 'charge', aura: 'crackle', r: 18 },
  deploy:        { kind: 'slam',   aura: 'none',   r: 12 },
  siphon:        { kind: 'pull',   aura: 'strands', r: 20 },
  charge:        { kind: 'dash',   aura: 'trail',  r: 13 },
  secondwind:    { kind: 'bloom',  aura: 'shell',  r: 14 },
  napalm:        { kind: 'surge',  aura: 'embers', r: 12 },
  uplink:        { kind: 'beacon', aura: 'beam',   r: 15 },
  sonic:         { kind: 'wave',   aura: 'ripple', r: 22 },
  cloak:         { kind: 'fade',   aura: 'shimmer', r: 10 },
  storm:         { kind: 'bolt',   aura: 'crackle', r: 17 },
  barrier:       { kind: 'wall',   aura: 'none',   r: 12 },
  gravity:       { kind: 'pull',   aura: 'spiral', r: 24 },
  fortify:       { kind: 'slam',   aura: 'shell',  r: 13 },
  meteordrop:    { kind: 'sky',    aura: 'none',   r: 16 },
  lockdown:      { kind: 'wave',   aura: 'ripple', r: 20 },
  endlessflight: { kind: 'lift',   aura: 'thrust', r: 15 },
  prowshield:    { kind: 'wall',   aura: 'shell',  r: 11 },
  chainreaction: { kind: 'bolt',   aura: 'crackle', r: 16 },
  tetherstorm:   { kind: 'pull',   aura: 'strands', r: 19 },
  weaponbloom:   { kind: 'bloom',  aura: 'orbit',  r: 14 },
  decoyfield:    { kind: 'fade',   aura: 'shimmer', r: 13 },
  strikedrone:   { kind: 'launch', aura: 'none',   r: 15 },
  droneswarm:    { kind: 'launch', aura: 'orbit',  r: 14 },
  seismic:       { kind: 'slam',   aura: 'ripple', r: 18 },
  blink:         { kind: 'fade',   aura: 'shimmer', r: 12 },
};

const DEF = { kind: 'surge', aura: 'none', r: 14 };
export function abFxOf(id) { return AB[id] || DEF; }

/* ---------------- pengaktifan ---------------- */
export function abCast(g, p, id, col) {
  const A = abFxOf(id);
  const dim = [col[0] * 0.45, col[1] * 0.45, col[2] * 0.45];
  const E = g.fx;
  const emit = (x, y, z, vx, vy, vz, o) => E.add.emit(x, y, z, vx, vy, vz, o);
  const P = (n, f) => { for (let i = 0; i < n; i++) f(i / n, i); };

  switch (A.kind) {
    case 'surge':                       // tenaga melonjak keluar dari bonet
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.5);
      P(22, t => {
        const a = t * TAU;
        emit(p.x + Math.cos(a) * 1.4, 1.0, p.z + Math.sin(a) * 1.4,
          Math.cos(a) * 3, 9 + Math.random() * 5, Math.sin(a) * 3,
          { color: col, color2: dim, size: 0.5, size2: 0.05, life: 0.6, drag: 1.4, grav: -5 });
      });
      break;

    case 'dome':                        // perisai terbentuk dari bawah ke atas
      E.abilityRing(p.x, p.z, col, 1, A.r, 0.45);
      P(30, t => {
        const a = t * TAU * 2, h = t * 3.4;
        emit(p.x + Math.cos(a) * 3.2, 0.2, p.z + Math.sin(a) * 3.2,
          -Math.cos(a) * 1.2, 5 + h, -Math.sin(a) * 1.2,
          { color: col, color2: dim, size: 0.34, size2: 0.06, life: 0.5, drag: 2.4 });
      });
      E.flash(p.x, 1.6, p.z, col, 18, 0.2, 28);
      break;

    case 'bloom':                       // kelopak tenaga mekar
      P(3, t => E.abilityRing(p.x, p.z, col, 1 + t * 4, A.r * (0.5 + t * 0.5), 0.4 + t * 0.3));
      P(26, t => {
        const a = t * TAU;
        emit(p.x, 1.2, p.z, Math.cos(a) * 7, 4 + Math.random() * 3, Math.sin(a) * 7,
          { color: col, color2: dim, size: 0.42, size2: 0.04, life: 0.7, drag: 2.2, grav: -3 });
      });
      break;

    case 'lift':                        // pendorong menyala, kereta naik
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.5);
      P(26, t => {
        const a = t * TAU;
        emit(p.x + Math.cos(a) * 1.8, 0.5, p.z + Math.sin(a) * 1.8,
          Math.cos(a) * 2.5, -6 - Math.random() * 4, Math.sin(a) * 2.5,
          { color: col, color2: dim, size: 0.55, size2: 0.1, life: 0.45, drag: 1.1 });
      });
      E.smoke(p.x, 0.3, p.z, 8, { speed: 5, size: 1.6, life: 0.8, alpha: 0.4 });
      break;

    case 'drop':                        // sesuatu dilepaskan ke tanah
      E.abilityRing(p.x, p.z, col, 1, A.r, 0.4);
      P(14, t => {
        const a = t * TAU;
        emit(p.x, 0.8, p.z, Math.cos(a) * 5, 3, Math.sin(a) * 5,
          { color: col, color2: dim, size: 0.3, size2: 0.05, life: 0.5, drag: 2, grav: -12, ground: true });
      });
      break;

    case 'charge':                      // tenaga ditarik MASUK sebelum meletus
      P(30, t => {
        const a = t * TAU * 3, r = 7 - t * 4;
        emit(p.x + Math.cos(a) * r, 0.6 + t * 2.5, p.z + Math.sin(a) * r,
          -Math.cos(a) * 9, 1, -Math.sin(a) * 9,
          { color: col, color2: dim, size: 0.28, size2: 0.5, life: 0.5, drag: 0.4 });
      });
      E.flash(p.x, 1.6, p.z, col, 26, 0.3, 40);
      break;

    case 'slam':                        // hentakan ke tanah
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.4);
      E.abilityRing(p.x, p.z, dim, 1, A.r * 0.55, 0.28);
      E.decal && E.decal('scorch', p.x, p.z, 5, Math.random() * TAU);
      P(20, t => {
        const a = t * TAU;
        emit(p.x + Math.cos(a) * 2, 0.25, p.z + Math.sin(a) * 2,
          Math.cos(a) * 11, 2.5, Math.sin(a) * 11,
          { color: col, color2: dim, size: 0.45, size2: 0.08, life: 0.5, drag: 2.6, ground: true });
      });
      E.smoke(p.x, 0.3, p.z, 7, { speed: 7, size: 1.9, life: 0.9, alpha: 0.45 });
      break;

    case 'pull':                        // medan tarikan terbuka
      P(2, t => E.abilityRing(p.x, p.z, t ? dim : col, A.r * (1 - t * 0.5), 2, 0.6));
      P(28, t => {
        const a = t * TAU * 2, r = A.r * 0.45;
        emit(p.x + Math.cos(a) * r, 0.6 + Math.random() * 1.6, p.z + Math.sin(a) * r,
          -Math.cos(a) * 7, 0.5, -Math.sin(a) * 7,
          { color: col, color2: dim, size: 0.3, size2: 0.06, life: 0.55, drag: 1.1 });
      });
      break;

    case 'dash':                        // lonjakan ke hadapan
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.35);
      P(20, t => {
        const b = -p.ang + (t - 0.5) * 0.7;
        emit(p.x, 0.8, p.z, -Math.sin(b) * 13, 1.5 + Math.random() * 2, -Math.cos(b) * 13,
          { color: col, color2: dim, size: 0.5, size2: 0.06, life: 0.45, drag: 2 });
      });
      break;

    case 'beacon':                      // pancaran naik ke langit
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.5);
      E.beam(p.x, 0.4, p.z, p.x, 26, p.z, col, 0.5, 0.5);
      E.beam(p.x, 0.4, p.z, p.x, 26, p.z, dim, 1.3, 0.5);
      P(16, t => emit(p.x + (Math.random() - 0.5) * 2, 0.6, p.z + (Math.random() - 0.5) * 2,
        0, 14 + t * 10, 0, { color: col, color2: dim, size: 0.34, size2: 0.05, life: 0.8, drag: 0.6 }));
      break;

    case 'wave':                        // gelombang sepusat
      P(3, t => E.abilityRing(p.x, p.z, t % 2 ? dim : col, 2 + t * 5, A.r * (0.6 + t * 0.4), 0.45 + t * 0.25));
      break;

    case 'fade':                        // kereta larut / berpindah
      P(24, t => {
        const a = t * TAU;
        emit(p.x + Math.cos(a) * 2.2, 0.4 + Math.random() * 2, p.z + Math.sin(a) * 2.2,
          Math.cos(a) * 2, 3, Math.sin(a) * 2,
          { color: col, color2: dim, size: 0.5, size2: 0.02, life: 0.55, drag: 3 });
      });
      E.flash(p.x, 1.4, p.z, col, 14, 0.18, 24);
      break;

    case 'bolt':                        // percikan kilat keluar
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.4);
      P(7, t => {
        const a = t * TAU + Math.random() * 0.4, r = 5 + Math.random() * 7;
        E.lightning(p.x, 1.4, p.z, p.x + Math.cos(a) * r, 1.0 + Math.random(), p.z + Math.sin(a) * r, col, 6);
      });
      E.flash(p.x, 1.6, p.z, col, 22, 0.16, 34);
      break;

    case 'wall':                        // plat perisai terpasang
      E.abilityRing(p.x, p.z, col, 1, A.r, 0.4);
      P(18, t => {
        const a = -p.ang + (t - 0.5) * 1.6;
        emit(p.x - Math.sin(a) * 2.6, 0.5 + Math.random() * 1.8, p.z - Math.cos(a) * 2.6,
          -Math.sin(a) * 2, 2.5, -Math.cos(a) * 2,
          { color: col, color2: dim, size: 0.42, size2: 0.08, life: 0.5, drag: 2.6 });
      });
      break;

    case 'sky':                         // sesuatu dipanggil dari atas
      E.abilityRing(p.x, p.z, col, 3, A.r, 0.6);
      P(18, t => emit(p.x + (Math.random() - 0.5) * 8, 20 - t * 4, p.z + (Math.random() - 0.5) * 8,
        0, -18, 0, { color: col, color2: dim, size: 0.5, size2: 0.1, life: 0.8, drag: 0.3 }));
      break;

    case 'launch':                      // unit dilancarkan keluar
      E.abilityRing(p.x, p.z, col, 2, A.r, 0.45);
      P(16, t => {
        const a = t * TAU;
        emit(p.x, 1.4, p.z, Math.cos(a) * 6, 10 + Math.random() * 4, Math.sin(a) * 6,
          { color: col, color2: dim, size: 0.4, size2: 0.06, life: 0.6, drag: 1.2, grav: -6 });
      });
      E.smoke(p.x, 1.0, p.z, 6, { speed: 4, size: 1.3, life: 0.7, alpha: 0.4 });
      break;
  }
}

/* ---------------- aura selagi kebolehan aktif ---------------- */
export function abAura(g, p, id, dt, col) {
  const A = abFxOf(id);
  if (A.aura === 'none') return;
  const E = g.fx;
  const dim = [col[0] * 0.4, col[1] * 0.4, col[2] * 0.4];
  const t = g.time;
  // had kadar: aura tidak boleh menenggelamkan belanjawan zarah
  p._auraT = (p._auraT || 0) + dt;
  const step = 0.045;
  if (p._auraT < step) return;
  p._auraT = 0;

  switch (A.aura) {
    case 'embers':
      E.add.emit(p.x + (Math.random() - 0.5) * 2.6, 0.7, p.z + (Math.random() - 0.5) * 3.4,
        0, 3 + Math.random() * 3, 0,
        { color: col, color2: dim, size: 0.3, size2: 0.02, life: 0.5, drag: 1.2, grav: -2 });
      break;
    case 'shell': {
      const a = t * 3;
      for (const s of [0, TAU / 3, TAU * 2 / 3]) {
        E.add.emit(p.x + Math.cos(a + s) * 3.1, 1.2 + Math.sin(t * 2 + s) * 0.5, p.z + Math.sin(a + s) * 3.1,
          0, 0, 0, { color: col, color2: dim, size: 0.24, size2: 0.05, life: 0.3, drag: 3 });
      }
      break;
    }
    case 'orbit': {
      const a = t * 4.5;
      E.add.emit(p.x + Math.cos(a) * 3.4, 1.6, p.z + Math.sin(a) * 3.4,
        -Math.sin(a) * 4, 0, Math.cos(a) * 4,
        { color: col, color2: dim, size: 0.3, size2: 0.04, life: 0.35, drag: 1.5 });
      break;
    }
    case 'motes':
      E.add.emit(p.x + (Math.random() - 0.5) * 3, 0.5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 3,
        0, 2, 0, { color: col, color2: dim, size: 0.26, size2: 0.03, life: 0.7, drag: 2 });
      break;
    case 'thrust':
      for (const s of [-1, 1]) {
        E.add.emit(p.x + s * 1.1, 0.35, p.z - 1.4, s * 0.6, -5, -1.5,
          { color: col, color2: dim, size: 0.42, size2: 0.06, life: 0.28, drag: 1.4 });
      }
      break;
    case 'trail':
      E.add.emit(p.x, 0.32, p.z - 1.6, 0, 0.6, -2,
        { color: col, color2: dim, size: 0.5, size2: 0.08, life: 0.4, drag: 2.4, ground: true });
      break;
    case 'crackle':
      if (Math.random() < 0.45) {
        const a = Math.random() * TAU, r = 2.4 + Math.random() * 1.6;
        E.lightning(p.x, 1.3, p.z, p.x + Math.cos(a) * r, 0.7 + Math.random() * 1.4, p.z + Math.sin(a) * r, col, 4);
      }
      break;
    case 'strands': {
      const a = t * 2.2;
      E.add.emit(p.x + Math.cos(a) * 5, 1.0, p.z + Math.sin(a) * 5,
        -Math.cos(a) * 8, 0.5, -Math.sin(a) * 8,
        { color: col, color2: dim, size: 0.26, size2: 0.04, life: 0.45, drag: 1 });
      break;
    }
    case 'spiral': {
      const a = t * 5, r = 6 - (t * 6) % 5;
      E.add.emit(p.x + Math.cos(a) * r, 0.6, p.z + Math.sin(a) * r,
        -Math.cos(a) * 5, 1.2, -Math.sin(a) * 5,
        { color: col, color2: dim, size: 0.28, size2: 0.05, life: 0.5, drag: 1.2 });
      break;
    }
    case 'ripple':
      if (Math.random() < 0.28) E.abilityRing(p.x, p.z, dim, 2, 9, 0.35);
      break;
    case 'shimmer':
      E.add.emit(p.x + (Math.random() - 0.5) * 3.4, 0.4 + Math.random() * 1.8, p.z + (Math.random() - 0.5) * 4,
        0, 1.2, 0, { color: col, color2: dim, size: 0.34, size2: 0.02, life: 0.4, drag: 2.6 });
      break;
    case 'beam':
      if (Math.random() < 0.3) E.beam(p.x, 0.5, p.z, p.x, 22, p.z, dim, 0.7, 0.14);
      break;
  }
}

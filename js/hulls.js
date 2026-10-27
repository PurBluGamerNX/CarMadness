// hulls.js — badan kereta khas: setiap kereta ada siluet sendiri.
// Setiap fungsi menambah bahagian ke Builder `b`. Bahan yang ada:
// body, dark, darker, steel, glass, head, tail, rust, hot, army, gold
import * as THREE from 'three';

const PI = Math.PI;
export const HG = {
  pyr4: new THREE.ConeGeometry(0.5, 1, 4),
  frust: new THREE.CylinderGeometry(0.5, 0.707, 1, 4, 1).rotateY(PI / 4),
  hemi: new THREE.SphereGeometry(0.5, 20, 10, 0, PI * 2, 0, PI / 2),
  oct: new THREE.OctahedronGeometry(0.5, 0),
  hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
};

// lampu depan bulat kecil
function lamps(b, G, pts, r = 0.16) {
  for (const [x, y, z] of pts) {
    b.add('steel', G.cyl, [x, y, z - 0.03], [PI / 2, 0, 0], [r * 2.3, 0.1, r * 2.3]);
    b.add('head', G.cyl, [x, y, z], [PI / 2, 0, 0], [r * 2, 0.06, r * 2]);
  }
}
function tails(b, G, pts, w = 0.4) {
  for (const [x, y, z] of pts) b.add('tail', G.box, [x, y, z], null, [w, 0.12, 0.06]);
}

let _wave = null;
function WAVE_ARC() { return _wave || (_wave = new THREE.TorusGeometry(1, 0.2, 8, 30, PI * 1.12)); }

export const HULLS = {
  /* OUROBOROS - kepala ular berperisai yang terapung. Badan bersegmen dibina
     berasingan dalam buildCar (LIMB 'serpent') kerana ia meliuk mengikut laluan. */
  ouroboros(b, G) {
    b.add('body', G.sph, [0, 1.0, 0.35], null, [1.8, 1.1, 2.7]);               // tengkorak
    b.add('darker', G.sph, [0, 0.68, 1.05], null, [1.45, 0.5, 2.1]);           // rahang
    b.add('body', G.rbox, [0, 0.95, 1.8], null, [1.0, 0.48, 1.0]);             // muncung
    b.add('dark', G.box, [0, 0.72, 2.25], null, [0.8, 0.1, 0.3]);              // celah mulut
    for (const sd of [-1, 1]) {
      b.add('crys', G.sph, [sd * 0.55, 1.25, 1.3], null, [0.38, 0.24, 0.55]);  // mata zamrud
      b.add('hot', G.sph, [sd * 0.6, 1.27, 1.48], null, [0.12, 0.16, 0.12]);
      b.add('steel', G.cone, [sd * 0.62, 1.55, -0.45], [-1.15, 0, sd * 0.3], [0.24, 1.5, 0.24]);   // tanduk
      b.add('steel', G.cone, [sd * 0.3, 0.5, 2.1], [PI, 0, 0], [0.12, 0.5, 0.12]);                 // taring
      b.add('dark', G.rbox, [sd * 0.8, 0.95, 0.4], [0, sd * 0.15, 0], [0.14, 0.5, 1.6]);          // sisik pipi
    }
    for (let i = 0; i < 5; i++) b.add('crys', G.box, [0, 1.58 - i * 0.03, 0.9 - i * 0.38], null, [0.07, 0.34 - i * 0.03, 0.26]);  // jambul
    b.add('crys', G.cyl, [0, 0.36, 0.4], null, [1.5, 0.05, 1.9]);              // cakera anti-graviti
  },

  /* MEDUSA - loceng obor-obor abyss lutsinar bercahaya dengan organ di dalam,
     tepi beralun, lengan mulut di bawah. Lapan sesungut berangkai dibina dalam
     buildCar (LIMB 'tentacle') supaya setiap sendi boleh beralun. */
  medusa(b, G) {
    b.add('crys', HG.hemi, [0, 2.05, 0], null, [3.7, 2.7, 3.7]);              // loceng
    b.add('hot', G.sph, [0, 2.55, 0], null, [1.0, 0.8, 1.0]);                 // organ teras
    b.add('body', G.sph, [0, 3.3, 0], null, [1.0, 0.55, 1.0]);                // mahkota
    b.add('steel', G.torus, [0, 2.06, 0], [PI / 2, 0, 0], [3.75, 3.75, 1.3]); // gelang tepi
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * PI * 2;
      b.add('body', G.cone, [Math.sin(a) * 1.82, 1.9, Math.cos(a) * 1.82], [PI, 0, 0], [0.3, 0.45, 0.3]);  // tepi beralun
    }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * PI * 2;
      b.add('body', G.box, [Math.sin(a) * 1.25, 3.0, Math.cos(a) * 1.25], [0, a, 0.55 * (i % 2 ? 1 : -1) * 0], [0.08, 0.5, 0.9]);  // rusuk
    }
    b.add('darker', G.cyl, [0, 1.85, 0], null, [1.6, 0.22, 1.6]);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2 + PI / 4;
      b.add('crys', G.cone, [Math.sin(a) * 0.4, 1.05, Math.cos(a) * 0.4], [PI, 0, 0], [0.26, 1.6, 0.26]);   // lengan mulut
    }
    lamps(b, G, [[-0.6, 2.15, 1.72], [0.6, 2.15, 1.72]], 0.11);
  },

  /* Hyna - GYRO ORB. Tiada casis, tiada roda: bola cangkerang heksagon yang
     bergolek (LIMB 'gyro' dalam buildCar) dengan teras tenaga terapung di
     dalamnya. Gelang khatulistiwa yang kekal rata membawa empat senjata,
     meriam bergegelung di hadapan, dan tiang pemancar kubah ber-halo di belakang. */
  hyna(b, G) {
    const Y = 1.45;
    b.add('body', G.torus, [0, Y, 0], [PI / 2, 0, 0], [3.9, 3.9, 2.2]);          // gelang khatulistiwa
    b.add('crys', G.torus, [0, Y, 0], [PI / 2, 0, 0], [3.25, 3.25, 0.6]);        // gelang cahaya dalam
    b.add('crys', G.sph, [0, Y, 0], null, [0.9, 0.9, 0.9]);                      // teras tenaga
    b.add('steel', G.torus, [0, Y, 0], [0, PI / 2, 0], [1.25, 1.25, 0.3]);
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 1.55, Y, 0], [0, 0, PI / 2], [0.52, 0.4, 0.52]);   // galas paksi bola
      b.add('dark', G.box, [sd * 1.78, Y, 0], null, [0.4, 0.32, 0.34]);
      b.add('crys', HG.hex, [sd * 1.98, Y + 0.5, 0], [0, 0, PI / 2], [0.72, 0.05, 0.72]);   // sirip heks
      b.add('steel', G.cone, [sd * 0.55, Y - 0.15, 2.6], [PI / 2, 0, sd * 0.3], [0.22, 1.3, 0.22]);  // taring
    }
    // meriam hadapan pada gelang
    b.add('dark', G.rbox, [0, Y + 0.05, 2.05], null, [0.72, 0.52, 0.62]);
    b.add('steel', G.cyl, [0, Y + 0.05, 2.9], [PI / 2, 0, 0], [0.32, 1.6, 0.32]);
    for (let i = 0; i < 3; i++) b.add('crys', G.torus, [0, Y + 0.05, 2.5 + i * 0.35], null, [0.56, 0.56, 0.45]);
    b.add('crys', G.sph, [0, Y + 0.05, 3.75], null, [0.36, 0.36, 0.36]);
    // tiang pemancar kubah di belakang
    b.add('dark', G.box, [0, Y + 0.05, -1.95], null, [0.52, 0.4, 0.4]);
    b.add('dark', G.cyl, [0, 2.25, -2.0], null, [0.2, 1.4, 0.2]);
    b.add('crys', G.sph, [0, 3.1, -2.0], null, [0.62, 0.62, 0.62]);
    b.add('steel', G.torus, [0, 3.1, -2.0], [PI / 2, 0, 0], [0.86, 0.86, 0.16]);
    b.add('crys', G.torus, [0, 3.75, -2.0], [PI / 2, 0, 0], [1.0, 1.0, 0.12]);   // halo terapung
    lamps(b, G, [[-0.24, 1.5, 2.37], [0.24, 1.5, 2.37]], 0.1);
    tails(b, G, [[-0.5, Y, -2.0], [0.5, Y, -2.0]]);
  },

  /* Gyhna - WALKER FORTRESS. Kubu berperisai di atas EMPAT kaki mekanikal
     (LIMB 'mech4'), visor bercelah bercahaya, gading penolak, tiga tiang
     pautan tinggi (satu bagi setiap cas) dan ekzos kembar di belakang. */
  gyhna(b, G) {
    b.add('darker', G.box, [0, 1.95, 0], null, [2.1, 0.3, 3.2]);                // perut
    b.add('crys', G.box, [0, 1.79, 0], null, [1.4, 0.04, 2.4]);                  // cahaya bawah perut
    b.add('body', G.rbox, [0, 2.45, 0.05], null, [2.5, 0.85, 3.7]);              // badan kubu
    b.add('army', G.rbox, [0, 2.95, -0.15], null, [1.9, 0.3, 2.7]);              // dek atas
    b.add('body', G.rbox, [0, 2.4, 2.05], [0.35, 0, 0], [2.1, 0.7, 0.6]);        // kepala/visor
    b.add('crys', G.box, [0, 2.55, 2.36], [0.35, 0, 0], [1.4, 0.08, 0.05]);      // celah mata
    for (const sd of [-1, 1]) {
      b.add('steel', G.cone, [sd * 0.75, 1.95, 2.45], [PI / 2 + 0.5, 0, 0], [0.24, 1.0, 0.24]);   // gading
      b.add('dark', G.rbox, [sd * 1.32, 2.45, 0.05], null, [0.14, 0.7, 3.3]);  // perisai sisi
      for (let k = 0; k < 3; k++) b.add('crys', G.box, [sd * 1.4, 2.5, -0.9 + k * 0.9], null, [0.04, 0.34, 0.46]);
      b.add('dark', G.cyl, [sd * 1.0, 3.35, -1.7], null, [0.22, 0.8, 0.22]);   // ekzos
      b.add('hot', G.cyl, [sd * 1.0, 3.77, -1.7], null, [0.18, 0.05, 0.18]);
    }
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.62, z = -1.55;
      b.add('dark', G.cyl, [x, 3.55, z], null, [0.16, 0.9, 0.16]);
      for (let k = 0; k < 3; k++) b.add('steel', G.torus, [x, 3.25 + k * 0.25, z], [PI / 2, 0, 0], [0.3 - k * 0.05, 0.3 - k * 0.05, 0.26]);
      b.add('crys', G.sph, [x, 4.1, z], null, [0.36, 0.36, 0.36]);
      b.add('crys', G.torus, [x, 4.1, z], [PI / 2, 0, 0], [0.52, 0.52, 0.1]);
    }
    lamps(b, G, [[-0.7, 2.25, 2.3], [0.7, 2.25, 2.3]], 0.12);
    tails(b, G, [[-0.8, 2.4, -1.82], [0.8, 2.4, -1.82]]);
  },

  /* Hamvog - platform pengepung: casis panjang & rendah, roda di tengah,
     menara penembak tepat di atas dan "mata" sensor di muncung. Dua lengan
     senjata sisi dibina berasingan dalam buildCar kerana ia bergerak. */
  hamvog(b, G) {
    b.add('darker', G.box, [0, 0.6, 0], null, [1.9, 0.34, 5.6]);               // lantai casis
    b.add('body', G.rbox, [0, 0.98, 0.1], null, [1.8, 0.56, 4.9]);             // badan utama
    b.add('body', G.rbox, [0, 1.06, 2.55], [-0.32, 0, 0], [1.5, 0.42, 1.0]);   // muncung condong
    b.add('body', G.rbox, [0, 1.02, -2.45], [0.22, 0, 0], [1.6, 0.46, 0.9]);   // ekor
    b.add('dark', G.rbox, [0, 1.38, 0.35], null, [1.1, 0.34, 2.2]);           // tulang belakang
    b.add('glass', G.rbox, [0, 1.52, 1.25], [0.28, 0, 0], [0.82, 0.26, 0.7]);  // kokpit sempit
    // mata sensor (penglihatan penembak tepat)
    b.add('steel', G.cyl, [0, 1.12, 3.02], [PI / 2, 0, 0], [0.5, 0.16, 0.5]);
    b.add('crys', G.cyl, [0, 1.12, 3.1], [PI / 2, 0, 0], [0.34, 0.06, 0.34]);
    for (const sd of [-1, 1]) {
      // pelindung roda tengah + rusuk sisi
      b.add('dark', G.rbox, [sd * 0.98, 0.95, 0], null, [0.22, 0.5, 1.9]);
      b.add('crys', G.box, [sd * 0.91, 1.12, -1.6], null, [0.04, 0.06, 1.3]);
      b.add('crys', G.box, [sd * 0.91, 1.12, 1.6], null, [0.04, 0.06, 1.0]);
      // soket engsel lengan
      b.add('steel', G.cyl, [sd * 0.95, 1.05, -0.2], null, [0.56, 0.42, 0.56]);
    }
    lamps(b, G, [[-0.55, 0.95, 2.95], [0.55, 0.95, 2.95]], 0.12);
    tails(b, G, [[-0.6, 1.05, -2.9], [0.6, 1.05, -2.9]]);
  },

  /* Fly - berbadan lalat: torso bersegmen, mata majmuk besar, enam
     pemasangan senjata seperti kaki, dan sayap nipis. */
  housefly(b, G) {
    // torso tiga segmen
    b.add('darker', G.sph, [0, 0.95, 1.5], null, [1.7, 1.5, 1.5]);      // kepala
    b.add('body', G.sph, [0, 1.05, 0.15], null, [2.1, 1.7, 2.0]);       // dada
    b.add('body', G.sph, [0, 0.95, -1.8], null, [1.9, 1.5, 2.6]);       // perut
    for (let i = 0; i < 4; i++) {
      b.add('darker', G.torus, [0, 0.95, -1.0 - i * 0.6], [PI / 2, 0, 0], [0.95 - i * 0.06, 0.95 - i * 0.06, 0.1]);
    }
    // mata majmuk
    for (const sd of [-1, 1]) {
      b.add('glass', G.sph, [sd * 0.72, 1.18, 2.1], null, [1.0, 1.05, 0.95]);
      b.add('hot', G.sph, [sd * 0.72, 1.18, 2.3], null, [0.34, 0.34, 0.3]);
    }
    // sungut
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 0.3, 1.5, 2.5], [0.7, 0, sd * 0.3], [0.07, 0.8, 0.07]);
      b.add('hot', G.sph, [sd * 0.44, 1.82, 2.86], null, [0.11, 0.11, 0.11]);
    }
    // sayap nipis lut sinar
    for (const sd of [-1, 1]) {
      b.add('glass', G.box, [sd * 1.9, 1.85, -0.4], [0, sd * 0.34, sd * -0.22], [3.2, 0.04, 1.3]);
      b.add('steel', G.box, [sd * 1.9, 1.88, -0.9], [0, sd * 0.34, sd * -0.22], [3.2, 0.05, 0.05]);
    }
    // enam pemasangan seperti kaki
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = 0.9 - i * 1.0;
        b.add('dark', G.cyl, [sd * 1.1, 0.72, z], [0.3, 0, sd * 0.9], [0.16, 1.2, 0.16]);
        b.add('steel', G.sph, [sd * 1.5, 0.42, z], null, [0.22, 0.22, 0.22]);
      }
    }
    lamps(b, G, [[-0.5, 0.8, 2.6], [0.5, 0.8, 2.6]], 0.12);
    tails(b, G, [[-0.5, 0.9, -3.0], [0.5, 0.9, -3.0]]);
  },

  /* Atlantis - PENUNGGANG OMBAK (dibina semula 2026-10-17; Nabil: "boring",
     plat perak atas tayar tak elok). Badan bot berhaluan tajam, DUA OMBAK
     lut sinar bergulung di sisi dengan buih bercahaya di puncak - tanda kuasa
     Tidal Surge - sirip jerung, tingkap kapal dan pendorong jet air. */
  leviathan(b, G) {
    const arc = WAVE_ARC();
    b.add('darker', G.rbox, [0, 0.6, -0.1], null, [1.9, 0.36, 4.6]);                 // lunas
    b.add('body', G.rbox, [0, 0.98, -0.3], null, [2.0, 0.72, 4.0]);                  // lambung
    b.add('body', G.cone, [0, 0.95, 2.35], [PI / 2, 0, 0], [1.95, 1.6, 1.0]);        // haluan tajam
    b.add('steel', G.box, [0, 1.36, 2.1], [-0.5, 0, 0], [0.12, 0.08, 1.5]);         // rusuk haluan
    b.add('glass', G.sph, [0, 1.42, 0.85], null, [1.15, 0.62, 1.5]);                 // kokpit kubah
    b.add('steel', G.torus, [0, 1.36, 0.85], [PI / 2, 0, 0], [1.15, 1.5, 0.4]);
    b.add('body', G.cone, [0, 2.15, -1.55], [-0.35, 0, 0], [0.16, 1.5, 1.2]);        // sirip jerung
    for (const sd of [-1, 1]) {
      // ombak bergulung: naik dari belakang (atas paras tayar), puncak menggulung ke hadapan
      b.add('crys', arc, [sd * 1.12, 1.25, -0.85], [0, PI / 2, 0], [1.05, 0.95, 1.15]);
      b.add('crys', arc, [sd * 1.16, 1.22, -0.7], [0, PI / 2, 0], [0.68, 0.62, 0.85]);
      for (let k = 0; k < 5; k++) {                                                   // buih di puncak
        const a = PI * (0.9 + k * 0.06);
        b.add('head', G.sph, [sd * 1.12, 1.35 + Math.sin(a) * 0.95, -0.85 - Math.cos(a) * 1.05],
          null, [0.26 - k * 0.03, 0.2 - k * 0.02, 0.26 - k * 0.03]);
      }
      // percikan haluan
      b.add('crys', G.cone, [sd * 0.75, 0.62, 2.6], [PI / 2 + 0.5, 0, sd * -0.6], [0.32, 1.0, 0.18]);
      // tingkap kapal
      for (let k = 0; k < 3; k++) {
        b.add('steel', G.torus, [sd * 1.01, 1.0, -1.25 + k * 0.85], [0, PI / 2, 0], [0.42, 0.42, 0.5]);
        b.add('glass', G.cyl, [sd * 1.0, 1.0, -1.25 + k * 0.85], [0, 0, PI / 2], [0.36, 0.04, 0.36]);
      }
      // pendorong jet air di belakang
      b.add('dark', G.cyl, [sd * 0.6, 0.92, -2.4], [PI / 2, 0, 0], [0.72, 0.6, 0.72]);
      b.add('crys', G.torus, [sd * 0.6, 0.92, -2.72], null, [0.6, 0.6, 0.6]);
      b.add('crys', G.cone, [sd * 0.6, 0.92, -3.05], [-PI / 2, 0, 0], [0.42, 0.6, 0.42]);
    }
    lamps(b, G, [[-0.48, 1.05, 2.25], [0.48, 1.05, 2.25]], 0.12);
    tails(b, G, [[-0.6, 1.3, -2.32], [0.6, 1.3, -2.32]], 0.3);
  },

  /* Typhoon - jentera angin: dua kipas bertentangan pada gandar condong. */
  cyclone(b, G) {
    b.add('darker', G.box, [0, 0.6, 0], null, [2.0, 0.36, 4.7]);
    b.add('body', G.rbox, [0, 1.0, -0.2], null, [1.9, 0.8, 3.6]);
    b.add('body', G.rbox, [0, 1.5, 0.9], [0.18, 0, 0], [1.5, 0.66, 1.5]);
    b.add('glass', G.rbox, [0, 1.62, 1.6], [0.35, 0, 0], [1.24, 0.5, 0.12]);
    // dua gelang kipas, satu tiap sisi, condong ke dalam
    for (const sd of [-1, 1]) {
      b.add('steel', G.torus, [sd * 1.5, 1.7, -0.5], [0, 0, sd * 0.42], [2.5, 2.5, 0.2]);
      b.add('dark', G.cyl, [sd * 1.5, 1.7, -0.5], [PI / 2, 0, sd * 0.42], [0.5, 0.5, 0.5]);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * PI * 2;
        b.add('glass', G.box, [sd * 1.5 + Math.cos(a) * 0.62, 1.7 + Math.sin(a) * 0.62, -0.5],
          [0, 0, a + sd * 0.42], [1.1, 0.06, 0.4]);
      }
      b.add('steel', G.cyl, [sd * 0.9, 1.4, -0.5], [0, 0, PI / 2], [0.2, 1.3, 0.2]);
    }
    // ekor penstabil
    b.add('steel', G.box, [0, 1.9, -2.1], null, [0.1, 1.1, 0.8]);
    b.add('body', G.box, [0, 2.4, -2.1], null, [1.5, 0.1, 0.6]);
    lamps(b, G, [[-0.7, 0.92, 2.1], [0.7, 0.92, 2.1]], 0.14);
    tails(b, G, [[-0.7, 1.1, -2.5], [0.7, 1.1, -2.5]]);
  },

  /* Blaze - relau bergerak: dada terbuka menyala dengan rusuk penyerap. */
  forge(b, G) {
    b.add('darker', G.box, [0, 0.6, 0], null, [2.3, 0.42, 4.9]);
    b.add('body', G.rbox, [0, 1.16, -0.5], null, [2.26, 1.0, 3.2]);
    // mulut relau di hadapan
    b.add('dark', G.rbox, [0, 1.06, 1.7], [0.14, 0, 0], [2.0, 0.9, 1.5]);
    b.add('hot', G.box, [0, 1.06, 2.42], [0.14, 0, 0], [1.6, 0.62, 0.08]);
    for (let i = -2; i <= 2; i++) b.add('steel', G.box, [i * 0.34, 1.06, 2.46], [0.14, 0, 0], [0.07, 0.68, 0.06]);
    // rusuk penyerap haba
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        b.add('steel', G.box, [sd * 1.2, 1.5, 0.5 - i * 0.62], [0, 0, sd * 0.3], [0.5, 0.06, 0.4]);
      }
      b.add('dark', G.rbox, [sd * 1.16, 0.9, -0.5], null, [0.24, 0.6, 2.6]);
    }
    // corong asap
    for (const sd of [-1, 1]) {
      b.add('dark', G.cyl, [sd * 0.62, 2.0, -1.5], null, [0.42, 1.5, 0.42]);
      b.add('steel', G.torus, [sd * 0.62, 2.7, -1.5], [PI / 2, 0, 0], [0.3, 0.3, 0.1]);
      b.add('hot', G.cyl, [sd * 0.62, 2.76, -1.5], null, [0.3, 0.08, 0.3]);
    }
    b.add('glass', G.rbox, [0, 1.76, 0.4], null, [1.3, 0.44, 0.9]);
    b.add('hot', G.box, [0, 0.66, 0], null, [1.7, 0.08, 3.4]);          // bara bawah badan
    lamps(b, G, [[-0.84, 0.96, 2.5], [0.84, 0.96, 2.5]], 0.15);
    tails(b, G, [[-0.82, 1.3, -2.5], [0.82, 1.3, -2.5]]);
  },

  /* Kefly - dek pembawa dron: badan rendah, bumbung terbuka penuh petak
     pelancar dan menara kawalan kecil di belakang. */
  carrier(b, G) {
    // lunas rendah + badan utama yang tebal, bukan papan rata
    b.add('darker', G.box, [0, 0.58, 0], null, [2.32, 0.4, 5.0]);
    b.add('body', G.rbox, [0, 1.0, -0.25], null, [2.42, 0.78, 4.3]);
    b.add('body', G.rbox, [0, 0.96, 2.05], [0.26, 0, 0], [2.14, 0.66, 1.5]);   // hidung condong
    b.add('steel', G.box, [0, 1.24, 2.62], [0.26, 0, 0], [1.9, 0.3, 0.1]);

    // dinding tepi dek, jadi petak pelancar nampak tenggelam di dalamnya
    for (const sd of [-1, 1]) {
      b.add('body', G.rbox, [sd * 1.08, 1.62, -0.35], null, [0.3, 0.62, 3.9]);
      b.add('steel', G.box, [sd * 1.08, 1.95, -0.35], null, [0.36, 0.08, 3.9]);
      b.add('dark', G.rbox, [sd * 1.3, 0.92, 0.5], null, [0.22, 0.52, 2.8]);
    }

    // empat tiub pelancar condong ke belakang, benar-benar timbul dari dek
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const z = 0.55 - i * 1.5;
        b.add('dark', G.cyl, [sd * 0.52, 1.72, z], [-0.34, 0, 0], [0.56, 1.5, 0.56]);
        b.add('steel', G.torus, [sd * 0.52, 2.16, z + 0.26], [-0.34 + PI / 2, 0, 0], [0.62, 0.62, 0.14]);
        b.add('hot', G.cyl, [sd * 0.52, 2.12, z + 0.24], [-0.34, 0, 0], [0.4, 0.1, 0.4]);
      }
      b.add('steel', G.cyl, [sd * 0.52, 1.18, -1.65], [PI / 2, 0, 0], [0.14, 3.2, 0.14]);
    }

    // kokpit rendah di hadapan - pemandu, bukan menara bonjol di belakang
    b.add('body', G.rbox, [0, 1.62, 1.52], null, [1.9, 0.72, 1.3]);
    b.add('glass', G.rbox, [0, 1.7, 2.1], [0.34, 0, 0], [1.6, 0.52, 0.12]);
    for (const sd of [-1, 1]) b.add('glass', G.box, [sd * 0.94, 1.66, 1.5], null, [0.04, 0.42, 0.9]);
    b.add('steel', G.rbox, [0, 2.02, 1.5], null, [1.5, 0.12, 1.1]);

    // gerbang kawalan nipis di belakang dek
    b.add('steel', G.box, [0, 2.12, -2.2], null, [2.1, 0.12, 0.14]);
    for (const sd of [-1, 1]) b.add('steel', G.cyl, [sd * 0.95, 1.85, -2.2], null, [0.1, 0.62, 0.1]);
    b.add('dark', G.rbox, [0, 1.28, -2.42], null, [2.0, 0.66, 0.6]);
    b.add('hot', G.box, [0, 1.28, -2.74], null, [1.5, 0.16, 0.05]);

    lamps(b, G, [[-0.74, 0.92, 2.78], [0.74, 0.92, 2.78]], 0.15);
    tails(b, G, [[-0.78, 1.32, -2.75], [0.78, 1.32, -2.75]]);
  },

  /* Valkyrie — helikopter tempur beroda */
  gunship(b, G) {
    b.add('darker', G.box, [0, 0.62, -0.1], null, [1.4, 0.3, 3.3]);
    b.add('body', G.cyl, [0, 1.15, -0.2], [PI / 2, 0, 0], [1.65, 3.4, 1.5]);
    b.add('body', G.sph, [0, 1.12, 1.5], null, [1.65, 1.5, 1.9]);
    b.add('glass', G.sph, [0, 1.5, 1.75], null, [1.2, 0.85, 1.25]);
    b.add('steel', G.torus, [0, 1.5, 1.75], [0.35, 0, 0], [1.15, 1.25, 0.25]);
    b.add('body', G.sph, [0, 1.1, -1.85], null, [1.5, 1.35, 1.0]);
    b.add('body', G.cyl, [0, 1.5, -2.95], [PI / 2 + 0.14, 0, 0], [0.5, 2.3, 0.5]);
    b.add('body', G.box, [0, 2.15, -3.95], [0.35, 0, 0], [0.12, 1.3, 0.8]);
    b.add('body', G.box, [0, 1.6, -3.85], null, [1.5, 0.08, 0.45]);
    b.add('steel', G.torus, [0.22, 2.3, -3.95], [0, PI / 2, 0], [0.9, 0.9, 0.25]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.35, 1.05, -0.4], [0, 0, sd * -0.1], [1.4, 0.12, 0.8]);
      b.add('darker', G.cyl, [sd * 1.85, 0.86, -0.4], [PI / 2, 0, 0], [0.34, 1.2, 0.34]);
      b.add('hot', G.cyl, [sd * 1.85, 0.86, 0.21], [PI / 2, 0, 0], [0.24, 0.03, 0.24]);
      b.add('steel', G.cyl, [sd * 0.72, 0.55, -0.2], [PI / 2, 0, 0], [0.1, 3.6, 0.1]);
    }
    lamps(b, G, [[0, 0.72, 2.43]], 0.2);
    tails(b, G, [[0, 1.2, -2.38]], 0.6);
  },

  /* Reaper — kala jengking dengan ekor melengkung */
  scorpion(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.1], null, [1.5, 0.28, 3.8]);
    b.add('body', G.rbox, [0, 0.82, 1.2], null, [1.7, 0.55, 1.35]);
    b.add('body', G.rbox, [0, 0.92, -0.1], null, [1.95, 0.7, 1.45]);
    b.add('body', G.rbox, [0, 0.86, -1.35], null, [1.6, 0.58, 1.2]);
    for (const z of [0.55, -0.72]) b.add('dark', G.box, [0, 0.95, z], null, [1.8, 0.5, 0.12]);
    b.add('darker', G.rbox, [0, 0.72, 2.1], null, [1.15, 0.42, 0.6]);
    for (const sd of [-1, 1]) {
      b.add('head', G.sph, [sd * 0.3, 0.9, 2.37], null, [0.2, 0.2, 0.12]);
      b.add('head', G.sph, [sd * 0.14, 0.98, 2.36], null, [0.11, 0.11, 0.08]);
    }
    // ekor: segmen dalam lengkok, makin kecil ke hujung
    const cy = 1.75, cz = -1.45, R = 1.05, N = 7;
    for (let i = 0; i <= N; i++) {
      const a = -0.75 + (i / N) * 3.0;
      const s = 0.62 - i * 0.045;
      b.add('body', G.rbox, [0, cy + Math.sin(a) * R, cz - Math.cos(a) * R], [-a, 0, 0], [s, s * 0.9, 0.46]);
      if (i % 2 === 0) b.add('dark', G.torus, [0, cy + Math.sin(a) * R, cz - Math.cos(a) * R], [PI / 2 - a, 0, 0], [s * 0.95, s * 0.95, 0.5]);
    }
    const ea = 2.45;
    b.add('steel', G.cone, [0, cy + Math.sin(ea) * R - 0.12, cz - Math.cos(ea) * R + 0.22], [PI / 2 + 0.9, 0, 0], [0.22, 0.75, 0.22]);
    tails(b, G, [[-0.5, 0.9, -1.96], [0.5, 0.9, -1.96]], 0.35);
  },

  /* Razorback — babi hutan: baji rendah, sirip tulang belakang, gading */
  boar(b, G) {
    b.add('darker', G.box, [0, 0.48, -0.1], null, [2.0, 0.3, 3.9]);
    b.add('body', G.rbox, [0, 0.78, -0.35], null, [2.05, 0.62, 3.6]);
    b.add('body', G.box, [0, 0.95, 1.35], [-0.34, 0, 0], [1.95, 0.24, 1.8]);
    /* MUNCUNG REMPUH (Nabil: "kelebihan dia ram tapi depan tak macam ram").
       Plat baji berat selebar kereta, batang rempuh besi di tengah dengan
       kepala bertopi, piston hidraulik yang menolaknya, dan rivet. */
    b.add('steel', G.box, [0, 0.82, 2.55], [-0.45, 0, 0], [2.55, 1.05, 0.26]);      // plat baji
    b.add('darker', G.box, [0, 0.82, 2.42], [-0.45, 0, 0], [2.35, 0.85, 0.16]);
    b.add('steel', G.box, [0, 0.36, 2.78], null, [2.6, 0.22, 0.42]);                // bibir bawah
    for (const sd of [-1, 1]) {
      b.add('steel', G.box, [sd * 1.27, 0.85, 2.4], [-0.45, sd * 0.35, 0], [0.18, 1.05, 0.7]);   // sayap sisi
      for (const y of [0.55, 0.85, 1.12]) for (const x of [0.45, 0.95])
        b.add('dark', G.sph, [sd * x, y, 2.72 - (y - 0.55) * 0.48], null, [0.11, 0.11, 0.11]);    // rivet
      b.add('dark', G.cyl, [sd * 0.6, 0.95, 1.85], [PI / 2 - 0.1, 0, 0], [0.22, 1.1, 0.22]);       // piston hidraulik
      b.add('steel', G.cyl, [sd * 0.6, 0.92, 2.35], [PI / 2 - 0.1, 0, 0], [0.13, 0.6, 0.13]);
    }
    // batang rempuh: silinder besi tebal menembusi plat, kepala bertopi + gelang pengukuh
    b.add('dark', G.cyl, [0, 0.82, 2.6], [PI / 2, 0, 0], [0.62, 1.9, 0.62]);
    for (const z of [2.15, 2.75]) b.add('steel', G.torus, [0, 0.82, z], null, [0.4, 0.4, 0.9]);
    b.add('steel', G.cyl, [0, 0.82, 3.55], [PI / 2, 0, 0], [0.95, 0.32, 0.95]);       // topi rempuh
    b.add('steel', G.cone, [0, 0.82, 3.85], [PI / 2, 0, 0], [0.82, 0.32, 0.82]);
    b.add('rust', G.cyl, [0, 0.82, 3.72], [PI / 2, 0, 0], [0.98, 0.06, 0.98]);       // jalur besi lusuh hentakan
    for (let i = 0; i < 7; i++) {
      const z = 1.0 - i * 0.52, h = 0.55 + Math.sin((i / 6) * PI) * 0.55;
      b.add('steel', G.cone, [0, 1.08 + h / 2, z], [0, 0, 0], [0.1, h, 0.75]);
    }
    for (const sd of [-1, 1]) {
      // gading besar keluar dari sudut plat, melengkung ke atas
      b.add('steel', G.cone, [sd * 1.05, 0.62, 3.05], [PI / 2 - 0.55, 0, sd * -0.3], [0.34, 1.5, 0.34]);
      b.add('steel', G.cyl, [sd * 1.0, 0.5, 2.55], [PI / 2 - 0.3, 0, 0], [0.4, 0.5, 0.4]);
      b.add('dark', G.box, [sd * 1.05, 0.75, -0.3], null, [0.12, 0.5, 3.0]);
      for (let i = -1; i <= 1; i++) b.add('steel', G.cone, [sd * 1.12, 0.78, -0.3 + i * 0.95], [0, 0, sd * -PI / 2], [0.12, 0.38, 0.12]);
    }
    b.add('glass', G.box, [0, 1.2, 0.35], [-0.55, 0, 0], [1.2, 0.05, 0.75]);
    b.add('head', G.box, [-0.62, 1.32, 2.12], [-0.45, 0, 0], [0.42, 0.07, 0.05]);    // lampu atas plat
    b.add('head', G.box, [0.62, 1.32, 2.12], [-0.45, 0, 0], [0.42, 0.07, 0.05]);
    tails(b, G, [[-0.65, 0.85, -2.16], [0.65, 0.85, -2.16]], 0.45);
  },

  /* Revenant — kereta jenazah gotik */
  hearse(b, G) {
    b.add('darker', G.box, [0, 0.48, 0], null, [1.95, 0.3, 4.7]);
    b.add('body', G.rbox, [0, 0.74, 0], null, [1.92, 0.5, 4.7]);
    b.add('body', G.rbox, [0, 0.98, 1.65], null, [1.78, 0.34, 1.3]);
    b.add('body', G.rbox, [0, 1.38, -0.75], null, [1.82, 1.0, 3.05]);
    b.add('darker', G.box, [0, 1.9, -0.75], null, [1.88, 0.08, 3.15]);
    b.add('glass', G.box, [0, 1.36, 0.78], [-0.5, 0, 0], [1.6, 0.6, 0.05]);
    for (const sd of [-1, 1]) {
      b.add('glass', G.box, [sd * 0.92, 1.44, -0.1], null, [0.04, 0.5, 1.1]);
      b.add('steel', G.torus, [sd * 0.94, 1.45, -1.55], [0, PI / 2, 0], [0.62, 0.62, 0.3]);
      b.add('steel', G.box, [sd * 0.97, 0.72, 0], null, [0.03, 0.05, 4.4]);
      for (const z of [-0.35, 0.15]) b.add('steel', G.cone, [sd * 0.92, 1.78, z], null, [0.1, 0.22, 0.1]);
    }
    b.add('glass', G.box, [0, 1.4, -2.29], null, [1.1, 0.62, 0.04]);
    b.add('steel', G.box, [0, 1.4, -2.3], null, [0.06, 0.66, 0.06]);
    b.add('steel', G.box, [0, 1.52, -2.3], null, [0.7, 0.06, 0.06]);
    lamps(b, G, [[-0.62, 0.9, 2.34], [0.62, 0.9, 2.34]], 0.17);
    for (const x of [-0.8, 0.8]) b.add('tail', G.box, [x, 1.1, -2.34], null, [0.08, 0.7, 0.05]);
  },

  /* Inferno — relau beroda: gril membara & cerobong */
  furnace(b, G) {
    b.add('darker', G.box, [0, 0.52, -0.1], null, [1.95, 0.35, 4.4]);
    b.add('body', G.rbox, [0, 1.22, -0.45], null, [1.95, 1.25, 3.1]);
    b.add('body', G.rbox, [0, 1.02, 1.62], null, [1.8, 0.85, 1.15]);
    b.add('glass', G.box, [0, 1.3, 2.2], [-0.3, 0, 0], [1.4, 0.34, 0.05]);
    b.add('darker', G.box, [0, 0.82, 2.22], null, [1.55, 0.5, 0.08]);
    for (let i = -3; i <= 3; i++) b.add('hot', G.box, [i * 0.2, 0.82, 2.27], null, [0.08, 0.42, 0.05]);
    for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, 1.25, 0.9 - i * 0.7], null, [2.0, 0.08, 0.1]);
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 0.55, 2.35, -1.55], null, [0.34, 1.5, 0.34]);
      b.add('hot', G.cyl, [sd * 0.55, 3.12, -1.55], null, [0.3, 0.06, 0.3]);
      b.add('dark', G.torus, [sd * 0.55, 3.08, -1.55], [PI / 2, 0, 0], [0.42, 0.42, 0.4]);
      for (const z of [-0.5, -1.35]) b.add('rust', G.cyl, [sd * 1.08, 0.98, z], null, [0.55, 0.85, 0.55]);
    }
    lamps(b, G, [[-0.7, 1.12, 2.2], [0.7, 1.12, 2.2]], 0.14);
    tails(b, G, [[-0.7, 1.0, -2.02], [0.7, 1.0, -2.02]]);
  },

  /* Banshee — ikan pari: cakera lebar & rata */
  manta(b, G) {
    b.add('body', G.sph, [0, 0.82, -0.2], null, [4.3, 0.55, 3.7]);
    b.add('darker', G.box, [0, 0.58, -0.2], null, [1.6, 0.22, 3.0]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.85, 0.8, -0.8], [0, sd * 0.55, sd * 0.06], [1.5, 0.08, 0.9]);
      b.add('body', G.cone, [sd * 0.55, 0.82, 1.95], [PI / 2, 0, sd * 0.2], [0.35, 1.0, 0.16]);
      b.add('steel', G.box, [sd * 1.1, 0.98, -0.2], [0, sd * 0.2, 0], [0.9, 0.05, 0.06]);
    }
    b.add('body', G.cyl, [0, 0.82, -3.05], [PI / 2, 0, 0], [0.14, 2.3, 0.14]);
    b.add('steel', G.cone, [0, 0.82, -4.25], [-PI / 2, 0, 0], [0.18, 0.4, 0.18]);
    b.add('glass', G.sph, [0, 1.1, 0.55], null, [1.1, 0.55, 1.4]);
    b.add('head', G.box, [0, 0.8, 1.66], null, [1.1, 0.06, 0.05]);
    tails(b, G, [[-1.2, 0.85, -1.76], [1.2, 0.85, -1.76]], 0.5);
  },

  /* Spectre — pesawat siluman bersegi */
  stealth(b, G) {
    b.add('body', HG.pyr4, [0, 1.0, 0.1], [PI / 2, 0, 0], [2.7, 4.8, 0.9]);
    b.add('darker', HG.pyr4, [0, 0.82, 0.05], [PI / 2, 0, 0], [2.3, 4.3, 0.6]);
    for (const sd of [-1, 1]) b.add('crys', G.box, [sd * 0.62, 1.12, -0.2], [0, sd * 0.27, 0], [0.04, 0.03, 3.4]);
    b.add('body', G.box, [0, 1.0, -2.3], null, [2.4, 0.4, 0.2]);
    b.add('darker', G.box, [0, 0.82, -2.42], null, [1.5, 0.14, 0.06]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 0.62, 1.32, -1.8], [0.35, 0, sd * 0.55], [0.08, 0.95, 0.95]);
      b.add('body', G.box, [sd * 1.4, 0.8, -1.7], [0, sd * 0.9, 0], [0.9, 0.06, 0.5]);
    }
    b.add('glass', G.box, [0, 1.08, 0.95], [-0.22, 0, 0], [0.7, 0.14, 1.1]);
    b.add('head', G.box, [0, 0.8, 2.36], null, [0.5, 0.04, 0.04]);
    b.add('tail', G.box, [0, 0.82, -2.46], null, [1.2, 0.04, 0.03]);
  },

  /* Tempest — katamaran: dua ponton di atas roda */
  catamaran(b, G) {
    b.add('darker', G.box, [0, 0.6, -0.1], null, [1.2, 0.3, 3.9]);
    for (const sd of [-1, 1]) {
      b.add('body', G.cyl, [sd * 1.0, 1.08, -0.15], [PI / 2, 0, 0], [0.9, 3.6, 0.9]);
      b.add('body', G.sph, [sd * 1.0, 1.08, 1.65], null, [0.9, 0.9, 1.3]);
      b.add('body', G.sph, [sd * 1.0, 1.08, -1.95], null, [0.9, 0.9, 0.7]);
      b.add('steel', G.box, [sd * 1.0, 1.1, -0.15], null, [0.94, 0.08, 3.4]);
      b.add('tail', G.box, [sd * 1.0, 1.1, -2.28], null, [0.3, 0.1, 0.05]);
    }
    b.add('darker', G.box, [0, 1.22, -0.3], null, [1.3, 0.16, 2.8]);
    b.add('body', G.rbox, [0, 1.62, 0.45], null, [1.1, 0.7, 1.15]);
    b.add('glass', G.box, [0, 1.68, 1.03], [-0.2, 0, 0], [0.95, 0.38, 0.05]);
    for (const z of [-0.8, -1.6]) b.add('steel', G.box, [0, 1.35, z], null, [2.0, 0.08, 0.1]);
    lamps(b, G, [[-1.0, 1.1, 2.3], [1.0, 1.1, 2.3]], 0.16);
  },

  /* Bulwark — kubu konkrit bergerak */
  bunker(b, G) {
    b.add('darker', G.box, [0, 0.52, -0.1], null, [2.2, 0.35, 4.5]);
    b.add('body', HG.frust, [0, 1.12, -0.1], null, [2.15, 1.2, 4.3]);
    b.add('dark', HG.frust, [0, 1.78, -0.6], null, [1.1, 0.14, 1.4]);
    b.add('darker', G.box, [0, 1.3, 2.02], [-0.33, 0, 0], [1.2, 0.1, 0.06]);
    for (const sd of [-1, 1]) {
      for (const z of [0.9, -0.1, -1.1]) b.add('darker', G.box, [sd * 0.96, 1.28, z], [0, 0, sd * 0.3], [0.05, 0.09, 0.55]);
      for (let i = 0; i < 5; i++) b.add('rust', G.sphLo, [sd * 1.2, 0.55 + (i % 2) * 0.05, 1.6 - i * 0.8], null, [0.5, 0.32, 0.75]);
      for (let i = 0; i < 4; i++) b.add('rust', G.sphLo, [sd * 1.2, 0.84, 1.2 - i * 0.8], null, [0.45, 0.28, 0.7]);
    }
    b.add('steel', G.cyl, [0, 1.92, -0.6], null, [0.5, 0.12, 0.5]);
    lamps(b, G, [[-0.75, 0.86, 2.17], [0.75, 0.86, 2.17]], 0.14);
    tails(b, G, [[-0.7, 0.9, -2.34], [0.7, 0.9, -2.34]]);
  },

  /* Meteor — kapsul roket dengan perisai haba */
  capsule(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.2], null, [1.5, 0.3, 3.6]);
    b.add('body', G.cyl, [0, 1.08, -0.45], [PI / 2, 0, 0], [1.55, 3.0, 1.55]);
    b.add('rust', HG.hemi, [0, 1.08, 1.05], [PI / 2, 0, 0], [1.62, 1.3, 1.62]);
    b.add('hot', G.torus, [0, 1.08, 1.06], null, [1.62, 1.62, 0.35]);
    for (let i = 0; i < 4; i++) b.add('steel', G.torus, [0, 1.08, 0.5 - i * 0.62], null, [1.58, 1.58, 0.14]);
    for (const [x, y] of [[0, 1.4], [-0.4, 0.82], [0.4, 0.82]]) {
      b.add('steel', G.cone, [x, y, -2.25], [PI / 2, 0, 0], [0.5, 0.6, 0.5]);
      b.add('hot', G.cyl, [x, y, -2.55], [PI / 2, 0, 0], [0.4, 0.03, 0.4]);
    }
    for (const sd of [-1, 1]) b.add('body', G.box, [sd * 0.95, 1.4, -1.6], [0, 0, sd * -0.7], [0.08, 0.9, 0.9]);
    b.add('body', G.box, [0, 2.0, -1.6], null, [0.08, 0.7, 0.9]);
    b.add('glass', G.box, [0, 1.62, 0.25], [-0.2, 0, 0], [0.8, 0.05, 0.6]);
  },

  /* Warden — kura-kura: cangkerang kubah */
  turtle(b, G) {
    b.add('darker', G.box, [0, 0.62, -0.1], null, [2.4, 0.3, 4.0]);
    b.add('body', HG.hemi, [0, 0.98, -0.2], null, [3.1, 1.9, 4.5]);
    b.add('dark', G.torus, [0, 1.0, -0.2], [PI / 2, 0, 0], [3.1, 4.5, 0.6]);
    // plat heksagon pada kubah
    for (const [a, t] of [[0, 0], [0.9, 0.55], [2.2, 0.55], [3.14, 0.55], [4.1, 0.55], [5.3, 0.55], [0.4, 1.0], [1.6, 1.0], [2.8, 1.0], [3.7, 1.0], [5.0, 1.0], [5.9, 1.0]]) {
      const x = Math.sin(t) * Math.cos(a) * 1.5, z = Math.sin(t) * Math.sin(a) * 2.2 - 0.2, y = 0.98 + Math.cos(t) * 0.94;
      b.add('steel', HG.hex, [x, y + 0.02, z], [Math.sin(a) * t * 0.9, 0, -Math.cos(a) * t * 0.9], [0.55, 0.08, 0.55]);
    }
    /* (dikemas 2026-10-17) jahitan bercahaya, kepala kura-kura berperisai dan
       MAHKOTA PENJARA: tiga pemancar yang mengunjurkan gelang medan Lockdown */
    b.add('crys', G.torus, [0, 1.05, -0.2], [PI / 2, 0, 0], [3.05, 4.45, 0.25]);
    b.add('crys', G.torus, [0, 1.75, -0.2], [PI / 2, 0, 0], [2.35, 3.4, 0.2]);
    b.add('body', G.sph, [0, 1.0, 2.35], null, [1.15, 0.85, 1.3]);                   // kepala
    b.add('steel', G.box, [0, 1.3, 2.55], [-0.35, 0, 0], [1.05, 0.12, 0.9]);         // topi perisai
    b.add('crys', G.box, [0, 1.12, 2.95], null, [0.8, 0.07, 0.05]);                 // visor
    b.add('darker', G.box, [0, 0.72, 2.85], [0.25, 0, 0], [0.8, 0.1, 0.5]);          // rahang
    b.add('body', G.cone, [0, 0.9, -2.65], [-PI / 2 - 0.2, 0, 0], [0.5, 0.8, 0.4]);  // ekor
    for (const [x, z] of [[0, 0.75], [-0.85, -1.1], [0.85, -1.1]]) {
      const y = 0.98 + 0.95 * Math.sqrt(Math.max(0, 1 - (x / 1.55) ** 2 - ((z + 0.2) / 2.25) ** 2));
      b.add('dark', G.cyl, [x, y + 0.45, z], null, [0.2, 0.95, 0.2]);
      for (let k = 0; k < 3; k++) b.add('steel', G.torus, [x, y + 0.15 + k * 0.22, z], [PI / 2, 0, 0], [0.3, 0.3, 0.4]);
      b.add('crys', HG.oct, [x, y + 1.05, z], null, [0.34, 0.5, 0.34]);
    }
    b.add('crys', G.torus, [0, 3.05, -0.2], [PI / 2, 0, 0], [2.2, 2.2, 0.12]);      // gelang medan
    lamps(b, G, [[-0.35, 0.85, 2.95], [0.35, 0.85, 2.95]], 0.1);
    tails(b, G, [[-0.8, 0.95, -2.42], [0.8, 0.95, -2.42]]);
  },

  /* Albatross — peluncur bersayap panjang */
  glider(b, G) {
    b.add('darker', G.box, [0, 0.58, -0.2], null, [1.0, 0.25, 3.4]);
    b.add('body', G.cyl, [0, 1.0, -0.3], [PI / 2, 0, 0], [0.95, 3.6, 0.95]);
    b.add('body', G.sph, [0, 1.0, 1.5], null, [0.95, 0.95, 1.5]);
    b.add('body', G.cone, [0, 1.08, -2.95], [-PI / 2, 0, 0], [0.95, 1.8, 0.95]);
    b.add('glass', G.sph, [0, 1.38, 0.95], null, [0.72, 0.6, 1.5]);
    b.add('body', G.box, [0, 1.5, -0.1], null, [7.4, 0.1, 1.1]);
    b.add('body', G.box, [0, 1.5, 0.43], null, [7.2, 0.06, 0.1]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 3.7, 1.72, -0.2], [0, 0, sd * 0.25], [0.07, 0.5, 0.8]);
      b.add('steel', G.cyl, [sd * 1.2, 1.2, -0.1], [0, 0, sd * 0.8], [0.06, 0.9, 0.06]);
      b.add('tail', G.box, [sd * 3.7, 1.5, -0.62], null, [0.1, 0.05, 0.12]);
    }
    b.add('body', G.box, [0, 1.3, -3.45], null, [2.3, 0.07, 0.6]);
    b.add('body', G.box, [0, 1.85, -3.5], [0.2, 0, 0], [0.08, 1.1, 0.7]);
    lamps(b, G, [[0, 0.95, 2.26]], 0.16);
  },

  /* Rampart — perisai lengkung besar di hadapan */
  shieldwall(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.3], null, [2.2, 0.4, 4.0]);
    b.add('body', G.rbox, [0, 1.02, -0.55], null, [2.1, 0.95, 3.3]);
    b.add('dark', G.rbox, [0, 1.6, -0.9], null, [1.4, 0.35, 1.6]);
    for (let i = -4; i <= 4; i++) {
      const a = i * 0.21;
      const x = Math.sin(a) * 2.1, z = -0.1 + Math.cos(a) * 2.1;
      b.add('steel', G.box, [x, 1.22, z], [-0.14, a, 0], [0.5, 1.8, 0.14]);
      b.add('body', G.box, [x, 2.14, z - 0.1], [-0.14, a, 0], [0.5, 0.12, 0.3]);
      if (i % 2 === 0) b.add('dark', G.box, [x * 0.92, 1.0, z - 0.25], [0, a, 0], [0.12, 0.8, 0.5]);
    }
    b.add('darker', G.box, [0, 1.62, 2.0], [-0.14, 0, 0], [0.8, 0.07, 0.05]);
    tails(b, G, [[-0.75, 0.95, -2.22], [0.75, 0.95, -2.22]]);
  },

  /* Cascade — kristal terapung di atas dek */
  /* Cascade (dikemas 2026-10-17): badan geodesi bersegi, KRISTAL INDUK dengan
     teras kilat di dalamnya, gugusan kristal anak, dan empat NOD KONDUKTOR
     bergegelung tembaga di penjuru - rantai Chain Reaction bermula di sini. */
  crystal(b, G) {
    b.add('darker', HG.hex, [0, 0.95, -0.1], [0, PI / 6, 0], [2.3, 0.5, 3.2]);          // dek heksagon
    b.add('body', HG.hex, [0, 1.25, -0.1], [0, PI / 6, 0], [2.0, 0.22, 2.8]);
    b.add('body', G.rbox, [0, 1.12, 1.45], [-0.25, 0, 0], [1.6, 0.4, 1.0]);              // muncung
    b.add('glass', G.box, [0, 1.36, 1.85], [-0.55, 0, 0], [1.2, 0.3, 0.05]);
    // kristal induk + teras kilat
    b.add('crys', HG.oct, [0, 2.4, -0.75], [0, 0.4, 0], [1.25, 2.7, 1.25]);
    b.add('head', G.sph, [0, 2.3, -0.75], null, [0.36, 0.5, 0.36]);
    b.add('steel', G.torus, [0, 1.42, -0.75], [PI / 2, 0, 0], [1.5, 1.5, 0.4]);
    b.add('gold', G.torus, [0, 1.55, -0.75], [PI / 2, 0, 0], [1.25, 1.25, 0.3]);
    for (const [x, z, h, r] of [[-0.7, -1.4, 1.2, 0.3], [0.75, -1.35, 1.05, -0.4], [0.35, -1.9, 0.8, 0.2], [-0.45, -0.1, 0.75, 0.5], [0.55, -0.05, 0.6, -0.5]]) {
      b.add('crys', HG.oct, [x, 1.35 + h * 0.42, z], [r, 0, -r], [0.42, h, 0.42]);
    }
    // nod konduktor di empat penjuru
    for (const [x, z] of [[-0.95, 1.0], [0.95, 1.0], [-1.0, -1.55], [1.0, -1.55]]) {
      b.add('dark', G.cyl, [x, 1.6, z], null, [0.14, 0.75, 0.14]);
      for (let k = 0; k < 3; k++) b.add('gold', G.torus, [x, 1.4 + k * 0.17, z], [PI / 2, 0, 0], [0.32 - k * 0.04, 0.32 - k * 0.04, 0.5]);
      b.add('crys', G.sph, [x, 2.05, z], null, [0.26, 0.26, 0.26]);
    }
    lamps(b, G, [[-0.55, 1.05, 1.95], [0.55, 1.05, 1.95]], 0.12);
    tails(b, G, [[-0.6, 1.05, -1.9], [0.6, 1.05, -1.9]], 0.35);
  },

  /* Magnetar (dibina semula 2026-10-17): kuasa = Gravity Well. Reaktor
     bulat dengan SINGULARITI hitam di tengah dikelilingi cakera akresi
     bercahaya, gerbang magnet ladam di atasnya dan empat gegelung medan. */
  magnetar(b, G) {
    b.add('darker', G.cyl, [0, 0.95, -0.1], null, [2.7, 0.45, 3.4]);                    // pelantar bulat
    b.add('body', G.cyl, [0, 1.2, -0.1], null, [2.45, 0.2, 3.1]);
    b.add('steel', G.torus, [0, 1.2, -0.1], [PI / 2, 0, 0], [2.45, 3.1, 0.35]);
    b.add('body', G.rbox, [0, 1.15, 1.7], [-0.2, 0, 0], [1.5, 0.4, 0.8]);               // muncung
    b.add('glass', G.box, [0, 1.38, 2.05], [-0.5, 0, 0], [1.1, 0.26, 0.05]);
    // singulariti + cakera akresi
    b.add('dark', G.cyl, [0, 1.45, -0.4], null, [1.3, 0.3, 1.3]);
    b.add('glass', G.sph, [0, 2.25, -0.4], null, [1.05, 1.05, 1.05]);
    b.add('crys', G.torus, [0, 2.25, -0.4], [PI / 2 + 0.35, 0, 0.2], [1.55, 1.55, 0.9]);
    b.add('crys', G.torus, [0, 2.25, -0.4], [PI / 2 + 0.35, 0, 0.2], [2.0, 2.0, 0.35]);
    // gerbang magnet ladam
    b.add('steel', HG.arch || G.torus, [0, 1.45, -0.4], [0, PI / 2, 0], [1.9, 1.9, 1.4]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [0, 1.45 + 0.95 * 0, -0.4 + sd * 0.95], null, [0.32, 0.32, 0.32]);
      b.add('crys', G.box, [0, 1.62, -0.4 + sd * 0.95], null, [0.34, 0.06, 0.34]);
    }
    // gegelung medan
    for (const [x, z] of [[-1.05, -1.4], [1.05, -1.4], [-1.15, 0.3], [1.15, 0.3]]) {
      b.add('dark', G.cyl, [x, 1.55, z], null, [0.34, 0.7, 0.34]);
      for (let k = 0; k < 3; k++) b.add('gold', G.torus, [x, 1.35 + k * 0.2, z], [PI / 2, 0, 0], [0.4, 0.4, 0.55]);
      b.add('crys', G.sph, [x, 2.0, z], null, [0.2, 0.2, 0.2]);
    }
    lamps(b, G, [[-0.5, 1.05, 2.1], [0.5, 1.05, 2.1]], 0.12);
    tails(b, G, [[-0.7, 1.05, -1.8], [0.7, 1.05, -1.8]], 0.35);
  },

  /* Stormwing — pepatung: kepala besar, ekor panjang, 4 sayap */
  dragonfly(b, G) {
    b.add('body', G.sph, [0, 1.1, 0.05], null, [1.55, 1.05, 1.9]);
    b.add('body', G.sph, [0, 1.05, 1.45], null, [1.45, 1.1, 1.2]);
    for (const sd of [-1, 1]) b.add('glass', G.sph, [sd * 0.52, 1.22, 1.75], null, [0.75, 0.75, 0.75]);
    for (let i = 0; i < 7; i++) {
      const s = 0.72 - i * 0.07;
      b.add('body', G.sph, [0, 1.15 + i * 0.05, -1.05 - i * 0.48], null, [s, s, 0.62]);
      b.add('dark', G.torus, [0, 1.15 + i * 0.05, -1.3 - i * 0.48], null, [s * 0.95, s * 0.95, 0.3]);
    }
    for (const sd of [-1, 1]) {
      b.add('glass', G.box, [sd * 1.95, 1.62, 0.45], [0, sd * 0.22, sd * 0.1], [3.2, 0.03, 0.75]);
      b.add('glass', G.box, [sd * 1.85, 1.56, -0.45], [0, sd * -0.18, sd * 0.1], [3.0, 0.03, 0.7]);
      b.add('steel', G.box, [sd * 1.95, 1.64, 0.45], [0, sd * 0.22, sd * 0.1], [3.2, 0.05, 0.05]);
      b.add('steel', G.box, [sd * 1.85, 1.58, -0.45], [0, sd * -0.18, sd * 0.1], [3.0, 0.05, 0.05]);
    }
    b.add('tail', G.sph, [0, 1.47, -4.1], null, [0.24, 0.24, 0.24]);
  },

  /* Hydra — ketam: karapas lebar, mata bertangkai, sepit */
  crab(b, G) {
    b.add('darker', G.box, [0, 0.72, -0.1], null, [2.4, 0.3, 3.0]);
    b.add('body', G.sph, [0, 1.12, -0.1], null, [3.7, 1.15, 3.1]);
    b.add('dark', G.torus, [0, 1.05, -0.1], [PI / 2, 0, 0], [3.6, 3.0, 0.5]);
    for (let i = 0; i < 5; i++) b.add('steel', G.cone, [(i - 2) * 0.55, 1.1, 1.5 - Math.abs(i - 2) * 0.12], [PI / 2, 0, 0], [0.16, 0.4, 0.16]);
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 0.42, 1.95, 1.05], [0.25, 0, sd * -0.15], [0.09, 0.75, 0.09]);
      b.add('head', G.sph, [sd * 0.48, 2.35, 1.15], null, [0.24, 0.24, 0.24]);
      b.add('steel', G.cyl, [sd * 1.55, 0.95, 1.5], [PI / 2 - 0.3, 0, sd * 0.5], [0.22, 1.1, 0.22]);
      b.add('body', G.sph, [sd * 1.85, 0.95, 2.1], null, [0.8, 0.6, 0.9]);
      b.add('body', G.cone, [sd * 1.72, 1.02, 2.75], [PI / 2, 0, sd * 0.25], [0.42, 1.0, 0.3]);
      b.add('steel', G.cone, [sd * 2.05, 0.82, 2.65], [PI / 2 - 0.15, 0, sd * -0.35], [0.3, 0.8, 0.22]);
    }
    tails(b, G, [[-0.8, 1.0, -1.66], [0.8, 1.0, -1.66]]);
  },

  /* Mirage — kereta hiper titisan air */
  hyper(b, G) {
    b.add('body', G.sph, [0, 0.74, -0.1], null, [2.05, 0.66, 4.9]);
    b.add('darker', G.box, [0, 0.46, 2.2], null, [1.95, 0.06, 0.55]);
    b.add('darker', G.box, [0, 0.48, -2.1], [0.25, 0, 0], [1.7, 0.08, 0.7]);
    b.add('glass', G.sph, [0, 1.02, 0.15], null, [1.1, 0.5, 2.1]);
    for (const sd of [-1, 1]) {
      b.add('darker', G.box, [sd * 0.97, 0.76, -0.55], [0, sd * 0.15, 0], [0.1, 0.28, 0.9]);
      b.add('body', G.box, [sd * 0.65, 1.02, -1.95], [0.3, 0, 0], [0.06, 0.34, 0.6]);
      b.add('head', G.box, [sd * 0.62, 0.8, 2.2], [0, sd * -0.2, 0], [0.42, 0.05, 0.08]);
    }
    b.add('steel', G.box, [0, 1.16, -2.0], null, [1.5, 0.05, 0.4]);
    b.add('tail', G.box, [0, 0.84, -2.48], null, [1.6, 0.05, 0.04]);
  },

  /* Sovereign — limosin diraja */
  limo(b, G) {
    b.add('darker', G.box, [0, 0.52, 0], null, [1.95, 0.3, 5.5]);
    b.add('body', G.rbox, [0, 0.8, 0], null, [1.95, 0.6, 5.7]);
    b.add('body', G.rbox, [0, 1.34, -0.45], null, [1.75, 0.58, 3.7]);
    b.add('glass', G.box, [0, 1.34, 1.42], [-0.55, 0, 0], [1.5, 0.52, 0.05]);
    b.add('glass', G.box, [0, 1.34, -2.3], [0.5, 0, 0], [1.4, 0.45, 0.05]);
    for (const sd of [-1, 1]) {
      for (const z of [0.7, -0.4, -1.5]) b.add('glass', G.box, [sd * 0.88, 1.36, z], null, [0.04, 0.34, 0.9]);
      b.add('gold', G.box, [sd * 0.98, 0.84, 0], null, [0.03, 0.06, 5.5]);
      b.add('steel', G.cyl, [sd * 0.78, 1.25, 2.4], null, [0.04, 0.8, 0.04]);
      b.add('body', G.box, [sd * 0.94, 1.52, 2.4], null, [0.3, 0.22, 0.02]);
    }
    b.add('gold', G.box, [0, 0.82, 2.86], null, [1.1, 0.42, 0.05]);
    for (let i = -4; i <= 4; i++) b.add('darker', G.box, [i * 0.11, 0.82, 2.88], null, [0.03, 0.36, 0.03]);
    b.add('gold', G.sph, [0, 1.16, 2.62], null, [0.14, 0.2, 0.14]);
    // mahkota kecil di bumbung belakang
    b.add('gold', G.cyl, [0, 1.72, -1.7], null, [0.6, 0.18, 0.6]);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * PI * 2;
      b.add('gold', G.cone, [Math.cos(a) * 0.26, 1.92, -1.7 + Math.sin(a) * 0.26], null, [0.14, 0.25, 0.14]);
    }
    lamps(b, G, [[-0.72, 0.9, 2.85], [0.72, 0.9, 2.85]], 0.15);
    tails(b, G, [[-0.7, 0.95, -2.86], [0.7, 0.95, -2.86]]);
  },

  /* Tremor — jengkaut dengan tukul hidraulik */
  excavator(b, G) {
    b.add('darker', G.box, [0, 0.62, 0], null, [2.3, 0.35, 4.9]);
    b.add('body', G.rbox, [0, 1.15, -0.5], null, [2.3, 0.62, 3.2]);
    b.add('body', G.rbox, [-0.55, 1.9, 0.35], null, [1.05, 1.0, 1.15]);
    b.add('glass', G.box, [-0.55, 1.98, 0.94], null, [0.86, 0.68, 0.04]);
    b.add('glass', G.box, [-1.08, 1.98, 0.35], null, [0.04, 0.6, 0.9]);
    b.add('dark', G.rbox, [0, 1.3, -2.25], null, [2.2, 0.85, 0.8]);
    for (let i = -3; i <= 3; i++) b.add('rust', G.box, [i * 0.3, 1.3, -2.66], [0, 0, 0.6], [0.14, 0.95, 0.02]);
    // lengan & tukul
    b.add('body', G.box, [0.55, 2.35, 1.3], [-0.85, 0, 0], [0.36, 0.38, 2.3]);
    b.add('body', G.box, [0.55, 2.2, 2.55], [0.75, 0, 0], [0.32, 0.32, 1.5]);
    b.add('steel', G.cyl, [0.72, 2.0, 1.2], [-0.85, 0, 0], [0.12, 1.8, 0.12]);
    b.add('dark', G.rbox, [0.55, 1.45, 3.05], null, [0.6, 0.9, 0.6]);
    b.add('steel', G.cyl, [0.55, 0.85, 3.05], null, [0.26, 0.5, 0.26]);
    b.add('steel', G.cone, [0.55, 0.45, 3.05], [PI, 0, 0], [0.26, 0.35, 0.26]);
    b.add('steel', G.cyl, [0.55, 1.05, 0.75], [0, 0, PI / 2], [0.4, 0.5, 0.4]);
    lamps(b, G, [[-0.25, 2.3, 0.95], [-0.85, 2.3, 0.95]], 0.1);
    tails(b, G, [[-0.8, 1.2, -2.67], [0.8, 1.2, -2.67]]);
  },
};

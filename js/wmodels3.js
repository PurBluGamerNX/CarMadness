// wmodels3.js — reka bentuk semula 48 senjata lama (Ripper Gun .. Vulag), 2026-10-17.
// Nabil: "perkemaskan design weapon yang lama, bagi nampak characteristic".
// Dahulu setiap senjata = blok gelap yang SAMA + kurungan + satu dua silinder,
// semuanya kelabu. Sekarang:
//   - buaian (cradle) kecil yang kemas menggantikan blok + kurungan generik,
//   - badan setiap senjata dicat dengan warna senjata itu sendiri (`paint`),
//   - setiap satu ada SATU ciri pengenalan yang jelas dari jauh (cth. Fist =
//     penumbuk berjari, Hive = sarang lebah, Leech = mulut bergigi).
// Konvensyen: +Z ke hadapan, buaian di asalan, badan senjata sekitar y 0.36.
// Pulangkan { muzzleZ, spinner? } atau null jika id bukan senjata lama.

const PI = Math.PI, TAU = PI * 2;

function cradle(b, G, w = 0.62) {
  b.add('dark', G.cyl, [0, 0.03, -0.05], null, [w + 0.12, 0.08, w + 0.12]);          // pelantar pusing
  b.add('steel', G.torus, [0, 0.07, -0.05], [PI / 2, 0, 0], [w + 0.12, w + 0.12, 0.35]);
  for (const sd of [-1, 1]) {
    b.add('paint', G.rbox, [sd * w * 0.5, 0.2, -0.05], null, [0.08, 0.32, 0.46]);       // pipi kuk
    b.add('steel', G.cyl, [sd * (w * 0.5 + 0.05), 0.3, -0.05], [0, 0, PI / 2], [0.12, 0.05, 0.12]);
  }
}
const rod = (b, G, key, x, y, z0, len, r) => b.add(key, G.cyl, [x, y, z0 + len / 2], [PI / 2, 0, 0], [r, len, r]);
const ring = (b, G, key, x, y, z, r, t = 0.3) => b.add(key, G.torus, [x, y, z], null, [r, r, t]);

export function weaponModel3(id, ctx) {
  const { b, G, HG, THREE, Builder, root, mats } = ctx;
  const Y = 0.38;
  switch (id) {
    /* ---------- balistik ---------- */
    case 'mg': {          // mesingan berat: jaket laras berlubang, kotak peluru + tali, pemegang belakang
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.1], null, [0.36, 0.34, 0.95]);
      b.add('dark', G.box, [0, Y + 0.2, 0.0], null, [0.3, 0.06, 0.7]);                   // penutup atas
      rod(b, G, 'darker', 0, Y, 0.35, 0.85, 0.22);
      for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) b.add('dark', G.box, [sd * 0.11, Y, 0.48 + i * 0.15], null, [0.03, 0.12, 0.08]);
      rod(b, G, 'steel', 0, Y, 1.2, 0.35, 0.09);
      b.add('steel', G.cyl, [0, Y, 1.6], [PI / 2, 0, 0], [0.16, 0.14, 0.16]);           // penyorok kilat
      b.add('army', G.rbox, [0.36, Y - 0.08, -0.05], null, [0.26, 0.34, 0.46]);         // kotak peluru
      for (let i = 0; i < 4; i++) b.add('accent', G.box, [0.24, Y + 0.08 - i * 0.02, 0.05 + i * 0.1], [0, 0, 0.4], [0.14, 0.05, 0.06]);
      for (const sd of [-1, 1]) b.add('steel', G.cyl, [sd * 0.12, Y - 0.05, -0.65], [0.4, 0, 0], [0.05, 0.28, 0.05]);   // pemegang
      b.add('steel', G.box, [0, Y + 0.3, 0.25], null, [0.06, 0.08, 0.4]);
      return { muzzleZ: 1.66 };
    }
    case 'smg': {         // Hornet: badan baji berjalur tebuan, dua laras atas-bawah berhujung sengat
      cradle(b, G, 0.5);
      b.add('paint', G.rbox, [0, Y, 0.0], null, [0.32, 0.4, 0.8]);
      for (let i = 0; i < 3; i++) b.add('darker', G.box, [0, Y, -0.25 + i * 0.25], null, [0.34, 0.42, 0.08]);   // jalur tebuan
      for (const y of [Y + 0.1, Y - 0.1]) {
        rod(b, G, 'steel', 0, y, 0.4, 0.75, 0.08);
        b.add('accent', G.cone, [0, y, 1.25], [PI / 2, 0, 0], [0.1, 0.22, 0.1]);
      }
      for (const sd of [-1, 1]) b.add('paint', G.box, [sd * 0.2, Y + 0.12, -0.15], [0, 0, sd * 0.6], [0.3, 0.03, 0.4]);  // sayap
      b.add('dark', G.rbox, [0, Y - 0.28, 0.1], [0.3, 0, 0], [0.16, 0.34, 0.14]);
      return { muzzleZ: 1.36 };
    }
    case 'shotgun': {     // laras berkembar sisi-sisi, perisai berlubang, kayu, peluru di sisi
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.15], null, [0.5, 0.32, 0.65]);
      b.add('wood', G.rbox, [0, Y - 0.04, -0.55], null, [0.3, 0.26, 0.4]);
      for (const x of [-0.12, 0.12]) rod(b, G, 'steel', x, Y + 0.02, 0.15, 1.3, 0.17);
      b.add('dark', G.box, [0, Y + 0.14, 0.6], null, [0.44, 0.04, 1.0]);                 // rusuk atas
      for (let i = 0; i < 4; i++) b.add('darker', G.box, [0, Y + 0.17, 0.25 + i * 0.25], null, [0.3, 0.03, 0.08]);
      for (let i = 0; i < 5; i++) b.add('accent', G.cyl, [0.27, Y - 0.02, -0.35 + i * 0.09], null, [0.07, 0.18, 0.07]);   // peluru
      b.add('wood', G.rbox, [0, Y - 0.12, 0.55], null, [0.3, 0.12, 0.45]);
      return { muzzleZ: 1.48 };
    }
    case 'minigun': {     // 6 laras berputar + gelang pengapit, motor bersirip, dram peluru
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.54, 0.5, 0.65]);
      for (let i = 0; i < 4; i++) b.add('dark', G.box, [0, Y + 0.27, -0.45 + i * 0.13], null, [0.5, 0.05, 0.06]);
      const sp = new THREE.Group(), sb = new Builder();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        sb.add('steel', G.cyl, [Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.7], [PI / 2, 0, 0], [0.08, 1.4, 0.08]);
      }
      for (const z of [0.15, 0.85, 1.35]) sb.add('dark', G.cyl, [0, 0, z], [PI / 2, 0, 0], [0.46, 0.08, 0.46]);
      sb.add('accent', G.cyl, [0, 0, 0.05], [PI / 2, 0, 0], [0.3, 0.1, 0.3]);
      sb.build(mats, sp);
      sp.position.set(0, Y, 0.1); root.add(sp);
      b.add('army', G.cyl, [-0.45, Y - 0.05, -0.2], [0, 0, PI / 2], [0.55, 0.26, 0.55]);   // dram
      b.add('steel', G.torus, [-0.45, Y - 0.05, -0.2], [0, PI / 2, 0], [0.5, 0.5, 0.3]);
      b.add('dark', G.box, [-0.24, Y + 0.12, -0.1], [0, 0, 0.5], [0.24, 0.08, 0.2]);      // salur suapan
      return { muzzleZ: 1.6, spinner: sp };
    }
    case 'rocket': {      // kotak 2x2 bercat, kepala peledak kelihatan, gril ekzos belakang
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y + 0.12, 0.2], null, [0.74, 0.7, 1.0]);
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 - 0.5) * 0.36, y = Y + 0.12 + (((i / 2) | 0) - 0.5) * 0.36;
        b.add('darker', G.cyl, [x, y, 0.76], [PI / 2, 0, 0], [0.28, 0.02, 0.28]);
        b.add('accent', G.cone, [x, y, 0.7], [PI / 2, 0, 0], [0.18, 0.2, 0.18]);
        b.add('steel', G.torus, [x, y, 0.77], null, [0.3, 0.3, 0.3]);
      }
      for (let i = 0; i < 4; i++) b.add('darker', G.box, [0, Y - 0.1 + i * 0.15, -0.37], null, [0.62, 0.04, 0.04]);
      for (const sd of [-1, 1]) b.add('dark', G.box, [sd * 0.42, Y + 0.12, 0.2], null, [0.06, 0.5, 0.8]);
      return { muzzleZ: 1.1 };
    }
    case 'nail': {        // Mini Star (pasangan Crescent): cakera pelancar bulan + bintang di muncung
      cradle(b, G, 0.5);
      b.add('darker', G.rbox, [0, Y, -0.05], null, [0.3, 0.3, 0.8]);
      b.add('steel', G.torus, [0, Y, 0.45], null, [0.24, 0.24, 0.5]);
      b.add('accent', G.torus, [0, Y, 0.62], null, [0.18, 0.18, 0.5]);
      rod(b, G, 'darker', 0, Y, 0.3, 0.55, 0.16);
      // BINTANG lima bucu sebenar di muncung (bentuk diekstrud)
      const ss = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + PI / 2, rr = i % 2 ? 0.42 : 1; if (i) ss.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ss.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const sg = new THREE.ExtrudeGeometry(ss, { depth: 0.3, bevelEnabled: false }); sg.translate(0, 0, -0.15);
      b.add('accent', sg, [0, Y, 0.98], null, [0.24, 0.24, 0.24]);
      for (const sd of [-1, 1]) b.add('accent', G.box, [sd * 0.16, Y + 0.08, -0.1], null, [0.02, 0.05, 0.6]);
      b.add('accent', G.box, [0, Y + 0.16, -0.05], null, [0.12, 0.02, 0.5]);
      return { muzzleZ: 1.1 };
    }
    case 'autoshot': {    // dram besar hadapan bawah, laras gemuk berperisai, pegangan hadapan
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.2], null, [0.42, 0.34, 0.65]);
      b.add('dark', G.cyl, [0, Y - 0.25, 0.2], [0, 0, PI / 2], [0.62, 0.26, 0.62]);
      b.add('paint', G.torus, [0, Y - 0.25, 0.2], [0, PI / 2, 0], [0.62, 0.62, 0.25]);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        b.add('accent', G.cyl, [0.14, Y - 0.25 + Math.sin(a) * 0.2, 0.2 + Math.cos(a) * 0.2], [0, 0, PI / 2], [0.08, 0.04, 0.08]);
      }
      rod(b, G, 'steel', 0, Y + 0.04, 0.1, 1.35, 0.2);
      rod(b, G, 'darker', 0, Y + 0.08, 0.4, 0.7, 0.28);
      for (let i = 0; i < 4; i++) b.add('dark', G.box, [0, Y + 0.24, 0.48 + i * 0.16], null, [0.2, 0.03, 0.08]);
      return { muzzleZ: 1.5 };
    }
    case 'sniper': {      // laras berlurah sangat panjang, brek muncung besar, teleskop, dwikaki
      cradle(b, G, 0.5);
      b.add('paint', G.rbox, [0, Y, -0.1], null, [0.28, 0.3, 1.1]);
      b.add('paint', G.box, [0, Y - 0.05, -0.75], [0.15, 0, 0], [0.22, 0.26, 0.4]);       // stok
      rod(b, G, 'steel', 0, Y, 0.4, 1.8, 0.09);
      for (const sd of [-1, 1]) b.add('dark', G.box, [sd * 0.05, Y, 1.0], null, [0.02, 0.06, 1.0]);   // lurah
      b.add('steel', G.box, [0, Y, 2.28], null, [0.26, 0.12, 0.2]);                       // brek muncung
      for (const sd of [-1, 1]) b.add('dark', G.box, [sd * 0.13, Y, 2.28], null, [0.02, 0.08, 0.14]);
      rod(b, G, 'darker', 0, Y + 0.28, -0.2, 0.95, 0.15);                                // teleskop
      b.add('accent', G.cyl, [0, Y + 0.28, 0.76], [PI / 2, 0, 0], [0.17, 0.03, 0.17]);
      for (const z of [0.0, 0.5]) b.add('steel', G.box, [0, Y + 0.17, z], null, [0.08, 0.12, 0.08]);
      for (const sd of [-1, 1]) {
        b.add('steel', G.cyl, [sd * 0.16, Y - 0.25, 1.1], [0.2, 0, sd * 0.5], [0.04, 0.5, 0.04]);
        b.add('dark', G.box, [sd * 0.29, Y - 0.47, 1.15], null, [0.1, 0.04, 0.18]);
      }
      return { muzzleZ: 2.4 };
    }
    case 'harpoon': {     // tombak berduri kelihatan atas rel, gelendong tali, silinder angin
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.15], null, [0.44, 0.38, 0.85]);
      b.add('steel', G.box, [0, Y + 0.12, 0.6], null, [0.16, 0.06, 1.3]);                 // rel
      rod(b, G, 'steel', 0, Y + 0.22, -0.2, 1.7, 0.05);                                  // batang tombak
      b.add('steel', G.cone, [0, Y + 0.22, 1.62], [PI / 2, 0, 0], [0.16, 0.36, 0.16]);
      for (const sd of [-1, 1]) b.add('steel', G.cone, [sd * 0.09, Y + 0.22, 1.42], [-PI / 2 + sd * 0.0, 0, sd * 0.5], [0.05, 0.22, 0.05]);   // duri
      b.add('darker', G.cyl, [-0.34, Y, -0.1], [0, 0, PI / 2], [0.42, 0.22, 0.42]);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [-0.34, Y, -0.1], [0, PI / 2, 0], [0.36 - i * 0.06, 0.36 - i * 0.06, 0.2]);
      rod(b, G, 'army', 0.26, Y - 0.1, -0.5, 0.8, 0.2);                                  // tangki angin
      return { muzzleZ: 1.75 };
    }
    case 'flak': {        // laras berkembar + brek muncung besar, piring radar AA, klip peluru
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y + 0.02, -0.2], null, [0.6, 0.46, 0.75]);
      for (const x of [-0.14, 0.14]) {
        rod(b, G, 'steel', x, Y + 0.05, 0.15, 1.25, 0.13);
        b.add('dark', G.box, [x, Y + 0.05, 1.42], null, [0.2, 0.2, 0.22]);
        for (const sd of [-1, 1]) b.add('darker', G.box, [x + sd * 0.1, Y + 0.05, 1.42], null, [0.02, 0.14, 0.16]);
      }
      b.add('steel', G.cyl, [0.36, Y + 0.45, -0.35], [0.5, 0, 0.3], [0.32, 0.04, 0.32]);    // radar
      b.add('steel', G.cyl, [0.33, Y + 0.32, -0.35], null, [0.04, 0.2, 0.04]);
      for (let i = 0; i < 4; i++) b.add('accent', G.cyl, [-0.15 + i * 0.1, Y + 0.32, -0.15], null, [0.07, 0.18, 0.07]);   // klip
      return { muzzleZ: 1.55 };
    }

    /* ---------- pelancar ---------- */
    case 'swarm': {       // dua pod berkembar, setiap satu 3 tiub segi tiga + kepala peledak, sensor di tengah
      cradle(b, G);
      b.add('dark', G.rbox, [0, Y, -0.25], null, [0.5, 0.3, 0.5]);
      for (const sd of [-1, 1]) {
        const x = sd * 0.3;
        b.add('paint', G.cyl, [x, Y + 0.12, 0.15], [PI / 2, 0, 0], [0.5, 0.95, 0.5]);
        b.add('steel', G.torus, [x, Y + 0.12, 0.62], null, [0.26, 0.26, 0.4]);
        b.add('darker', G.cyl, [x, Y + 0.12, 0.63], [PI / 2, 0, 0], [0.44, 0.02, 0.44]);
        for (let i = 0; i < 3; i++) {
          const a = i / 3 * TAU + PI / 2;
          b.add('accent', G.cone, [x + Math.cos(a) * 0.11, Y + 0.12 + Math.sin(a) * 0.11, 0.66], [PI / 2, 0, 0], [0.09, 0.14, 0.09]);
        }
        b.add('accent', G.box, [x, Y + 0.38, 0.15], null, [0.05, 0.03, 0.7]);
        b.add('dark', G.cyl, [x, Y + 0.12, -0.36], [PI / 2, 0, 0], [0.42, 0.08, 0.42]);
      }
      b.add('steel', G.box, [0, Y + 0.12, 0.15], null, [0.16, 0.12, 0.8]);
      b.add('dark', G.sph, [0, Y + 0.32, 0.3], null, [0.2, 0.16, 0.2]);
      b.add('accent', G.sph, [0, Y + 0.32, 0.38], null, [0.09, 0.07, 0.06]);
      return { muzzleZ: 0.75 };
    }
    case 'seeker': {      // peluru berpandu besar kelihatan atas rel pelancar, kepala pencari
      cradle(b, G);
      b.add('paint', G.box, [0, Y - 0.05, 0.1], null, [0.4, 0.12, 1.4]);                 // rel
      rod(b, G, 'army', 0, Y + 0.2, -0.45, 1.5, 0.32);
      b.add('accent', G.sph, [0, Y + 0.2, 1.05], null, [0.32, 0.32, 0.36]);              // kepala pencari
      b.add('steel', G.torus, [0, Y + 0.2, 0.95], null, [0.33, 0.33, 0.3]);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + PI / 4;
        b.add('paint', G.box, [Math.cos(a) * 0.24, Y + 0.2 + Math.sin(a) * 0.24, -0.32], [0, 0, a], [0.3, 0.03, 0.3]);   // sirip
        b.add('paint', G.box, [Math.cos(a) * 0.2, Y + 0.2 + Math.sin(a) * 0.2, 0.55], [0, 0, a], [0.18, 0.02, 0.16]);
      }
      b.add('hot', G.cyl, [0, Y + 0.2, -0.48], [PI / 2, 0, 0], [0.22, 0.03, 0.22]);
      return { muzzleZ: 1.4 };
    }
    case 'volley': {      // rak melengkung: 5 tiub langsing MENGIPAS ke hadapan + radar sasaran di tengah
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.5, 0.36, 0.5]);
      b.add('dark', arcRack(THREE), [0, Y + 0.05, -0.1], [PI / 2, 0, 0], [1, 1, 1]);
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.24, x = Math.sin(a) * 0.62, z = -0.1 + Math.cos(a) * 0.62;
        b.add('paint', G.cyl, [x, Y + 0.12, z], [PI / 2, 0, -a], [0.17, 0.75, 0.17]);
        b.add('accent', G.cone, [x + Math.sin(a) * 0.4, Y + 0.12, z + Math.cos(a) * 0.4], [PI / 2, 0, -a], [0.1, 0.12, 0.1]);
        b.add('steel', G.torus, [x + Math.sin(a) * 0.3, Y + 0.12, z + Math.cos(a) * 0.3], [0, -a, 0], [0.1, 0.1, 0.4]);
      }
      b.add('steel', G.cyl, [0, Y + 0.32, -0.25], null, [0.05, 0.25, 0.05]);
      b.add('steel', G.cyl, [0, Y + 0.48, -0.22], [0.5, 0, 0], [0.4, 0.04, 0.4]);
      b.add('accent', G.sph, [0, Y + 0.5, -0.18], null, [0.07, 0.07, 0.07]);
      return { muzzleZ: 1.0 };
    }
    case 'vulag': {       // VLS berperisai: 3 hac terbuka, hidung peluru berpandu menjenguk keluar, radar kunci
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y + 0.08, -0.1], null, [0.78, 0.42, 0.8]);
      b.add('dark', G.box, [0, Y + 0.3, -0.1], null, [0.72, 0.04, 0.74]);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.23;
        b.add('darker', G.cyl, [x, Y + 0.31, -0.05], null, [0.17, 0.02, 0.17]);
        b.add('accent', G.cone, [x, Y + 0.42, -0.05], null, [0.13, 0.22, 0.13]);       // hidung peluru
        b.add('steel', G.box, [x, Y + 0.48, -0.28], [-1.1, 0, 0], [0.2, 0.03, 0.22]);  // hac terbuka
      }
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) b.add('dark', G.box, [sd * 0.4, Y + 0.0 + i * 0.1, -0.1], null, [0.03, 0.04, 0.6]);
      b.add('dark', G.sph, [0, Y + 0.08, 0.35], null, [0.28, 0.24, 0.2]);               // sensor kunci depan
      b.add('accent', G.sph, [0, Y + 0.08, 0.43], null, [0.13, 0.13, 0.06]);
      b.add('steel', G.cyl, [0.32, Y + 0.48, -0.45], null, [0.04, 0.35, 0.04]);
      b.add('steel', G.cyl, [0.32, Y + 0.66, -0.42], [0.6, 0, 0], [0.28, 0.03, 0.28]);
      return { muzzleZ: 0.5 };
    }
    case 'hive': {        // sarang lebah: gelang bertingkat menirus, pintu bercahaya, dron kecil
      cradle(b, G);
      for (let i = 0; i < 5; i++) {
        const r = 0.42 - Math.abs(i - 1.6) * 0.08;
        b.add('paint', G.sph, [0, Y + 0.1 + i * 0.12, 0.05], null, [r * 1.9, 0.17, r * 2.0]);
        b.add('darker', G.torus, [0, Y + 0.04 + i * 0.13, 0.05], [PI / 2, 0, 0], [r * 0.95, r, 0.25]);
      }
      b.add('accent', HG.hex, [0, Y + 0.18, 0.5], [PI / 2, 0, 0], [0.24, 0.08, 0.24]);    // pintu
      for (const [x, y] of [[-0.3, 0.75], [0.25, 0.88]]) {
        b.add('accent', G.sph, [x, Y + y, 0.35], null, [0.07, 0.06, 0.1]);
        b.add('steel', G.box, [x, Y + y + 0.03, 0.35], null, [0.18, 0.01, 0.06]);
      }
      return { muzzleZ: 0.75 };
    }

    /* ---------- lontar / mortar ---------- */
    case 'frost': {       // Hail Mortar (pasangan Breeze, pusingan 3): pelancar HEKSAGON bersirip, mini pod Breeze
      cradle(b, G);
      const HX = new THREE.CylinderGeometry(0.5, 0.5, 1, 6), tilt = 0.55;
      const cy = Y + 0.16, at = t => [0, cy + Math.sin(tilt) * t, Math.cos(tilt) * t];
      b.add('dark', G.rbox, [0, Y - 0.02, -0.2], null, [0.56, 0.34, 0.62]);
      b.add('paint', HX, at(0.42), [PI / 2 - tilt, 0, 0], [0.5, 1.15, 0.5]);
      for (const t of [0.0, 0.42, 0.95]) b.add('dark', HX, at(t), [PI / 2 - tilt, 0, 0], [0.58, 0.08, 0.58]);
      for (const sd of [-1, 1]) {
        b.add('dark', G.box, [sd * 0.2, cy + 0.32, 0.25], [-tilt, 0, sd * 0.5], [0.03, 0.18, 0.9]);   // sirip
        b.add('accent', G.box, [sd * 0.22, cy + 0.2, 0.32], [-tilt, 0, 0], [0.02, 0.03, 0.85]);       // urat cahaya
      }
      for (const [x, y] of [[0, 0], [0.09, 0.07], [-0.09, 0.07], [0.09, -0.07], [-0.09, -0.07]]) {
        const q = at(0.98); b.add('accent', G.cone, [x, q[1] + y, q[2]], [PI / 2 - tilt, 0, 0], [0.05, 0.12, 0.05]);
      }
      return { muzzleZ: 1.0 };
    }
    case 'mortar':        // mortar kepungan: tiub tebal berbelang, spring sentak, rak peluru
    case 'huntershell':   // howitzer pemburu: tiub panjang, peluru pencari di rak, teropong
    case 'venom': {       // pelontar racun: tiub + mentol racun kaca
      cradle(b, G);
      const T = { frost: [0.24, 0.95, 0.6], mortar: [0.3, 1.05, 0.65], huntershell: [0.27, 1.35, 0.42], venom: [0.24, 1.05, 0.4] }[id];
      const [r, len, tilt] = T;
      b.add('paint', G.rbox, [0, Y - 0.02, -0.2], null, [0.56, 0.36, 0.6]);
      const cy = Y + 0.12, cz = 0.0;
      const dirY = Math.sin(tilt), dirZ = Math.cos(tilt);
      const at = t => [0, cy + dirY * t, cz + dirZ * t];
      b.add('steel', G.cyl, at(len / 2), [PI / 2 - tilt, 0, 0], [r * 2, len, r * 2]);
      b.add('darker', G.cyl, at(len + 0.01), [PI / 2 - tilt, 0, 0], [r * 1.6, 0.02, r * 1.6]);
      for (const t of [0.15, len * 0.55, len - 0.08]) b.add(id === 'frost' ? 'accent' : 'paint', G.torus, at(t), [-tilt, 0, 0], [r * 1.12, r * 1.12, 0.55]);
      for (const sd of [-1, 1]) b.add('steel', G.cyl, [sd * (r + 0.08), cy + dirY * 0.25 - 0.05, cz + dirZ * 0.25 - 0.1], [PI / 2 - tilt, 0, 0], [0.06, 0.6, 0.06]);
      if (id === 'mortar' || id === 'huntershell') for (let i = 0; i < 3; i++) {           // rak peluru
        b.add('army', G.cyl, [0.36, Y - 0.05 + i * 0.13, -0.45], [PI / 2, 0, 0], [0.11, 0.3, 0.11]);
        b.add('accent', G.cone, [0.36, Y - 0.05 + i * 0.13, -0.27], [PI / 2, 0, 0], [0.11, 0.08, 0.11]);
      }
      if (id === 'huntershell') {
        rod(b, G, 'darker', -0.3, Y + 0.3, -0.35, 0.55, 0.1);
        b.add('accent', G.cyl, [-0.3, Y + 0.3, 0.21], [PI / 2, 0, 0], [0.11, 0.02, 0.11]);
      }
      if (id === 'frost') for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        b.add('accent', G.cone, [Math.cos(a) * r, cy + dirY * len + Math.sin(a) * r, cz + dirZ * len], [PI / 2 - tilt, 0, a], [0.06, 0.22, 0.06]);
      }
      if (id === 'venom') {
        b.add('glass', G.sph, [0, Y + 0.38, -0.4], null, [0.42, 0.42, 0.42]);
        b.add('accent', G.sph, [0, Y + 0.36, -0.4], null, [0.32, 0.3, 0.32]);
        b.add('steel', G.torus, [0, Y + 0.25, -0.4], [PI / 2, 0, 0], [0.22, 0.22, 0.4]);
      }
      return { muzzleZ: Math.max(0.8, dirZ * len) };
    }

    /* FLAIR (pasangan Core, id lama 'amber'): matahari kecil dalam cakar tiga jari di atas
       pemancar pendek, dengan gelang korona & gelung flare. Warna oren sama dengan Core. */
    case 'amber': {
      /* Pusingan 2: matahari SEBENAR (bahan bercahaya sendiri pada root, sama seperti matahari
         Core) - bahan aksen builder terlalu pucat dan nampak seperti loceng. */
      cradle(b, G, 0.5);
      b.add('blk', G.rbox, [0, Y - 0.04, -0.25], null, [0.46, 0.26, 0.7]);
      for (const sd of [-1, 1]) b.add('gold', G.box, [sd * 0.235, Y - 0.04, -0.25], null, [0.02, 0.08, 0.66]);
      // pemancar: laras pendek bergelang emas, muncung kembang bercahaya
      rod(b, G, 'blk', 0, Y, 0.1, 0.8, 0.2);
      for (let i = 0; i < 3; i++) b.add('gold', G.torus, [0, Y, 0.3 + i * 0.2], null, [0.15, 0.15, 0.45]);
      b.add('gold', G.cone, [0, Y, 1.0], [-PI / 2, 0, 0], [0.3, 0.28, 0.3]);
      b.add('hot', G.cyl, [0, Y, 1.14], [PI / 2, 0, 0], [0.24, 0.02, 0.24]);
      // tiang + cakar tiga jari emas memegang matahari
      const SY = Y + 0.5, SZ = -0.22, SR = 0.24;
      b.add('blk', G.cyl, [0, Y + 0.17, SZ], null, [0.1, 0.2, 0.1]);
      b.add('gold', G.torus, [0, Y + 0.27, SZ], [PI / 2, 0, 0], [0.2, 0.2, 0.4]);
      for (const a of [0, 2.094, 4.189]) {
        const cx = Math.sin(a), cz = Math.cos(a);
        b.add('gold', G.box, [cx * 0.21, SY - 0.13, SZ + cz * 0.21], [cz * 0.5, 0, -cx * 0.5], [0.045, 0.24, 0.045]);
        b.add('gold', G.cone, [cx * 0.27, SY + 0.04, SZ + cz * 0.27], [-cz * 0.5 + PI, 0, cx * 0.5], [0.05, 0.1, 0.05]);
      }
      // matahari: teras putih-kuning + korona berlapis aditif + gelung flare
      const add2 = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
      const sun = new THREE.Group(); sun.position.set(0, SY, SZ); root.add(sun);
      sun.add(new THREE.Mesh(new THREE.SphereGeometry(SR, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })));
      for (const [k, c, op] of [[1.12, 0xffb030, 0.55], [1.4, 0xff7a10, 0.28], [1.9, 0xff5200, 0.11]])
        sun.add(new THREE.Mesh(new THREE.SphereGeometry(SR * k, 18, 12), add2(c, op)));
      for (const [rx, rz, h] of [[0, 0.2, 0.14], [0.9, 1.3, 0.11], [-0.8, -1.1, 0.12], [2.2, 0.4, 0.1]]) {
        const pts = [];
        for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector3(-0.08 * Math.cos(PI * t), SR * 0.95 + h * Math.sin(PI * t), 0)); }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.018, 5, false), add2(0xffa830, 0.95));
        m.rotation.set(rx, 0, rz); sun.add(m);
      }
      return { muzzleZ: 1.15 };
    }
    /* ---------- api & cecair ---------- */
    case 'flame':         // dua tangki berjalur bahaya, hos melingkar, muncung kembang + api pandu
    case 'acid':          // satu tangki kaca berisi cecair asid, pam, muncung berhujung titisan
    case 'waterjet': {    // tangki air kaca, tolok tekanan, muncung hos bomba
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y - 0.04, -0.1], null, [0.44, 0.3, 0.7]);
      if (id === 'flame') {
        for (const sd of [-1, 1]) {
          rod(b, G, 'army', sd * 0.27, Y + 0.12, -0.75, 0.7, 0.3);
          b.add('accent', G.cyl, [sd * 0.27, Y + 0.12, -0.4], [PI / 2, 0, 0], [0.32, 0.08, 0.32]);
          b.add('steel', G.sph, [sd * 0.27, Y + 0.12, -0.03], null, [0.26, 0.26, 0.2]);
        }
        b.add('darker', G.torus, [0.22, Y - 0.05, 0.2], [0, PI / 2, 0], [0.3, 0.3, 0.4]);
      } else if (id === 'acid' || id === 'waterjet') {
        rod(b, G, 'glass', 0, Y + 0.2, -0.85, 0.75, 0.46);
        rod(b, G, 'accent', 0, Y + 0.17, -0.82, 0.69, 0.36);
        for (const z of [-0.85, -0.1]) b.add('steel', G.torus, [0, Y + 0.2, z], null, [0.24, 0.24, 0.4]);
        if (id === 'waterjet') {
          b.add('steel', G.cyl, [0.28, Y + 0.32, 0.0], [0, 0, PI / 2], [0.2, 0.06, 0.2]);   // tolok
          b.add('head', G.cyl, [0.31, Y + 0.32, 0.0], [0, 0, PI / 2], [0.15, 0.02, 0.15]);
        }
      } else {
        b.add('glass', G.sph, [0, Y + 0.3, -0.35], null, [0.62, 0.55, 0.7]);
        b.add('accent', G.sph, [0, Y + 0.27, -0.35], null, [0.5, 0.44, 0.58]);
        for (let i = 0; i < 3; i++) b.add('accent', G.cone, [-0.15 + i * 0.15, Y + 0.0, -0.1 - i * 0.12], [PI, 0, 0], [0.06, 0.16, 0.06]);   // titisan
      }
      const wide = id === 'waterjet' ? 0.55 : id === 'amber' ? 0.42 : 0.3;
      rod(b, G, 'steel', 0, Y, 0.2, 0.85, 0.15);
      for (let i = 0; i < 3; i++) b.add('darker', G.torus, [0, Y, 0.35 + i * 0.22], null, [0.13, 0.13, 0.5]);
      b.add('steel', G.cone, [0, Y, 1.2], [-PI / 2, 0, 0], [wide, 0.36, wide]);
      b.add(id === 'flame' || id === 'amber' ? 'hot' : 'accent', G.cyl, [0, Y, 1.37], [PI / 2, 0, 0], [wide * 0.8, 0.02, wide * 0.8]);
      if (id === 'flame') {
        rod(b, G, 'steel', 0.18, Y + 0.13, 0.7, 0.5, 0.05);
        b.add('hot', G.cone, [0.18, Y + 0.13, 1.25], [PI / 2, 0, 0], [0.07, 0.14, 0.07]);
      }
      if (id === 'acid') b.add('accent', G.sph, [0, Y - 0.12, 1.3], null, [0.06, 0.1, 0.06]);
      return { muzzleZ: 1.38 };
    }
    case 'blaze': {       // Ember Cannon: laras bersirip haba, ruang bara bergril, api pandu
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.48, 0.42, 0.65]);
      b.add('darker', G.box, [0, Y, 0.09], null, [0.4, 0.3, 0.04]);
      for (let i = -2; i <= 2; i++) b.add('hot', G.box, [i * 0.07, Y, 0.1], null, [0.03, 0.24, 0.03]);   // gril bara
      rod(b, G, 'steel', 0, Y, 0.1, 1.2, 0.2);
      for (let i = 0; i < 7; i++) b.add('darker', G.cyl, [0, Y, 0.25 + i * 0.13], [PI / 2, 0, 0], [0.36, 0.04, 0.36]);
      b.add('hot', G.cyl, [0, Y, 1.31], [PI / 2, 0, 0], [0.16, 0.02, 0.16]);
      rod(b, G, 'steel', 0.2, Y + 0.2, 0.6, 0.5, 0.05);
      b.add('hot', G.cone, [0.2, Y + 0.2, 1.15], [PI / 2, 0, 0], [0.08, 0.15, 0.08]);
      return { muzzleZ: 1.35 };
    }
    case 'wily': {        // pistol gam: gelembung gam atas, empat muncung jujukan
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.2], null, [0.5, 0.38, 0.7]);
      b.add('glass', G.sph, [0, Y + 0.36, -0.2], null, [0.5, 0.42, 0.6]);
      b.add('accent', G.sph, [0, Y + 0.32, -0.2], null, [0.42, 0.32, 0.5]);
      b.add('steel', G.torus, [0, Y + 0.24, -0.2], [PI / 2, 0, 0], [0.26, 0.3, 0.4]);
      b.add('darker', G.cyl, [0, Y, 0.3], [PI / 2, 0, 0], [0.42, 0.5, 0.42]);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + PI / 4;
        rod(b, G, 'steel', Math.cos(a) * 0.17, Y + Math.sin(a) * 0.17, 0.55, 0.65, 0.09);
        b.add('accent', G.sph, [Math.cos(a) * 0.17, Y + Math.sin(a) * 0.17, 1.22], null, [0.09, 0.09, 0.09]);
      }
      return { muzzleZ: 1.3 };
    }

    /* ---------- tenaga ---------- */
    case 'tesla': {       // gegelung tesla: penebat bertingkat, tiga tin kapasitor, garpu muncung
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.3], null, [0.56, 0.4, 0.6]);
      for (let i = 0; i < 3; i++) {
        b.add('dark', G.cyl, [-0.18 + i * 0.18, Y + 0.32, -0.35], null, [0.14, 0.28, 0.14]);
        b.add('accent', G.cyl, [-0.18 + i * 0.18, Y + 0.47, -0.35], null, [0.12, 0.03, 0.12]);
      }
      rod(b, G, 'steel', 0, Y + 0.05, -0.05, 1.0, 0.1);
      for (let i = 0; i < 6; i++) b.add(i % 2 ? 'steel' : 'accent', G.cyl, [0, Y + 0.05, 0.1 + i * 0.13], [PI / 2, 0, 0], [0.36 - i * 0.02, 0.05, 0.36 - i * 0.02]);
      for (const sd of [-1, 1]) {
        b.add('steel', G.cyl, [sd * 0.1, Y + 0.05, 1.05], [PI / 2, 0, sd * 0.25], [0.04, 0.3, 0.04]);
        b.add('accent', G.sph, [sd * 0.14, Y + 0.05, 1.2], null, [0.09, 0.09, 0.09]);
      }
      return { muzzleZ: 1.15 };
    }
    case 'arc': {         // projektor arka: dua elektrod garpu dengan sfera, arka zigzag di antaranya
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.2], null, [0.5, 0.38, 0.7]);
      for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, Y + 0.21, -0.45 + i * 0.13], null, [0.46, 0.04, 0.05]);
      for (const sd of [-1, 1]) {
        b.add('steel', G.box, [sd * 0.2, Y, 0.55], [0, sd * 0.08, 0], [0.06, 0.1, 0.9]);
        b.add('accent', G.sph, [sd * 0.24, Y, 1.0], null, [0.14, 0.14, 0.14]);
      }
      for (let i = 0; i < 4; i++) b.add('accent', G.box, [(i % 2 ? 0.05 : -0.05), Y, 0.35 + i * 0.17], [0, i % 2 ? 0.8 : -0.8, 0], [0.03, 0.03, 0.2]);
      return { muzzleZ: 1.05 };
    }
    case 'laser': {       // Prism Beam: pemancar langsing bersegi, prisma besar dipegang 3 cakar
      cradle(b, G, 0.5);
      b.add('paint', HG.oct, [0, Y, 0.0], [0, 0, PI / 4], [0.42, 0.42, 1.2]);
      rod(b, G, 'steel', 0, Y, 0.3, 0.55, 0.14);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + PI / 2;
        b.add('steel', G.box, [Math.cos(a) * 0.17, Y + Math.sin(a) * 0.17, 0.95], [0, 0, a], [0.04, 0.06, 0.35]);
      }
      b.add('accent', HG.oct, [0, Y, 1.12], [0, 0.6, 0], [0.32, 0.32, 0.5]);
      for (const sd of [-1, 1]) b.add('accent', G.box, [sd * 0.16, Y + 0.12, -0.1], [0, 0, sd * 0.8], [0.02, 0.06, 0.8]);
      return { muzzleZ: 1.35 };
    }
    case 'rail': {        // Gauss: rel kembar bercelah, segmen gegelung magnet, kapasitor belakang
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.48, 0.38, 0.7]);
      for (const x of [-0.13, 0.13]) b.add('steel', G.box, [x, Y + 0.02, 0.9], null, [0.08, 0.16, 1.9]);
      for (let i = 0; i < 6; i++) b.add('accent', G.box, [0, Y + 0.02, 0.2 + i * 0.3], null, [0.4, 0.22, 0.06]);
      rod(b, G, 'glass', 0, Y + 0.05, -0.75, 0.4, 0.3);
      rod(b, G, 'accent', 0, Y + 0.05, -0.72, 0.34, 0.16);
      rod(b, G, 'darker', 0, Y + 0.28, -0.2, 0.6, 0.1);
      return { muzzleZ: 1.9 };
    }
    case 'plasma': {      // ruang tahanan kaca dengan teras plasma, gelang magnet, piring pemancar
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.35], null, [0.5, 0.4, 0.5]);
      b.add('glass', G.sph, [0, Y + 0.05, 0.1], null, [0.55, 0.55, 0.6]);
      b.add('accent', G.sph, [0, Y + 0.05, 0.1], null, [0.3, 0.3, 0.3]);
      for (const a of [0, PI / 2]) b.add('steel', G.torus, [0, Y + 0.05, 0.1], [0, a, 0], [0.56, 0.56, 0.3]);
      rod(b, G, 'steel', 0, Y + 0.05, 0.38, 0.75, 0.2);
      for (let i = 0; i < 3; i++) b.add('paint', G.torus, [0, Y + 0.05, 0.6 + i * 0.2], null, [0.2, 0.2, 0.6]);
      b.add('accent', G.cyl, [0, Y + 0.05, 1.2], [PI / 2, 0, 0], [0.36, 0.04, 0.36]);
      return { muzzleZ: 1.3 };
    }
    case 'cryo': {        // Glacier Beam (pasangan Freezo, pusingan 3): MINI MERIAM REL KRIO - rel berkembar, gegelung, tiub reaktor
      cradle(b, G);
      b.add('dark', G.rbox, [0, Y, -0.35], null, [0.5, 0.42, 0.62]);
      for (const sd of [-1, 1]) {
        b.add('paint', G.box, [sd * 0.13, Y, 0.45], null, [0.1, 0.2, 1.3]);              // rel
        b.add('accent', G.box, [sd * 0.075, Y, 0.45], null, [0.015, 0.1, 1.2]);          // muka dalam bercahaya
        b.add('steel', G.cone, [sd * 0.13, Y, 1.17], [PI / 2, 0, 0], [0.06, 0.2, 0.06]);  // cakar muncung
      }
      for (let k = 0; k < 4; k++) b.add(k % 2 ? 'accent' : 'steel', G.torus, [0, Y, 0.1 + k * 0.28], null, [0.12, 0.12, 0.5]);   // gegelung
      rod(b, G, 'accent', 0, Y, 0.0, 1.15, 0.05);
      rod(b, G, 'glass', 0.32, Y + 0.05, -0.6, 0.5, 0.17);                               // tiub reaktor
      rod(b, G, 'accent', 0.32, Y + 0.05, -0.56, 0.42, 0.08);
      b.add('accent', G.box, [0, Y + 0.22, -0.2], null, [0.12, 0.03, 0.03]);            // mata pembidik
      return { muzzleZ: 1.3 };
    }
    case 'pulse': {       // pistol pulsa licin: tiga gelang pemancar membesar ke muncung
      cradle(b, G, 0.5);
      b.add('paint', G.sph, [0, Y, 0.0], null, [0.42, 0.38, 1.0]);
      b.add('dark', G.box, [0, Y + 0.2, -0.05], null, [0.12, 0.06, 0.6]);
      rod(b, G, 'steel', 0, Y, 0.4, 0.6, 0.12);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, Y, 0.6 + i * 0.2], null, [0.16 + i * 0.07, 0.16 + i * 0.07, 0.35]);
      b.add('accent', G.box, [0, Y, -0.35], null, [0.44, 0.08, 0.2]);
      return { muzzleZ: 1.2 };
    }
    case 'shard': {       // Splinter: gugusan hablur penyuap, tiga laras halus berhujung serpih
      cradle(b, G, 0.5);
      b.add('paint', G.rbox, [0, Y, 0.05], null, [0.34, 0.3, 1.0]);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        b.add('accent', HG.oct, [Math.cos(a) * 0.14, Y + 0.3 + Math.sin(a) * 0.05, -0.1 + Math.sin(a) * 0.12], [a, 0.4, 0.3], [0.1, 0.32, 0.1]);
      }
      b.add('accent', HG.oct, [0, Y + 0.36, -0.1], null, [0.16, 0.42, 0.16]);
      for (const x of [-0.11, 0, 0.11]) {
        rod(b, G, 'steel', x, Y, 0.5, 0.9, 0.05);
        b.add('accent', HG.oct, [x, Y, 1.46], [PI / 2, 0, 0], [0.06, 0.18, 0.06]);
      }
      return { muzzleZ: 1.55 };
    }
    case 'disruptor': {   // tiga antena pemancar segi tiga bergelang + piring
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.56, 0.4, 0.6]);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU + PI / 2;
        const x = Math.cos(a) * 0.2, y = Y + 0.05 + Math.sin(a) * 0.2;
        rod(b, G, 'steel', x, y, 0.0, 0.95, 0.05);
        for (let k = 0; k < 2; k++) b.add('accent', G.torus, [x, y, 0.4 + k * 0.35], null, [0.1, 0.1, 0.6]);
        b.add('accent', G.sph, [x, y, 1.0], null, [0.07, 0.07, 0.07]);
      }
      b.add('steel', G.cyl, [0, Y + 0.05, 0.08], [PI / 2, 0, 0], [0.62, 0.04, 0.62]);
      return { muzzleZ: 1.1 };
    }
    case 'gatling': {     // gatling sinar: 5 pemancar berputar bercahaya, rumah bertenaga berlubang
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.6, 0.48, 0.6]);
      for (let i = 0; i < 3; i++) b.add('accent', G.box, [0, Y, -0.45 + i * 0.16], null, [0.62, 0.04, 0.05]);
      const sp = new THREE.Group(), sb = new Builder();
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        sb.add('steel', G.cyl, [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.6], [PI / 2, 0, 0], [0.09, 1.2, 0.09]);
        sb.add('accent', G.cyl, [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 1.2], [PI / 2, 0, 0], [0.11, 0.06, 0.11]);
      }
      for (const z of [0.1, 0.8]) sb.add('dark', G.cyl, [0, 0, z], [PI / 2, 0, 0], [0.48, 0.08, 0.48]);
      sb.build(mats, sp);
      sp.position.set(0, Y, 0.1); root.add(sp);
      return { muzzleZ: 1.45, spinner: sp };
    }
    case 'annihilator': { // meriam rel berbelah besar: dua serampang muka bercahaya, orb cas belakang
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y + 0.05, -0.3], null, [0.72, 0.55, 0.8]);
      for (const sd of [-1, 1]) {
        b.add('paint', G.box, [sd * 0.22, Y + 0.08, 0.85], null, [0.16, 0.3, 1.9]);
        b.add('accent', G.box, [sd * 0.13, Y + 0.08, 0.9], null, [0.02, 0.2, 1.8]);
        for (let i = 0; i < 4; i++) b.add('steel', G.box, [sd * 0.31, Y + 0.08, 0.2 + i * 0.45], null, [0.04, 0.36, 0.1]);
      }
      b.add('glass', G.sph, [0, Y + 0.08, -0.72], null, [0.42, 0.42, 0.42]);
      b.add('accent', G.sph, [0, Y + 0.08, -0.72], null, [0.26, 0.26, 0.26]);
      for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, Y + 0.36, -0.55 + i * 0.12], null, [0.6, 0.03, 0.05]);
      return { muzzleZ: 2.0 };
    }
    case 'repulsor': {    // plat pemancar rata menghadap depan, gelang sepusat, omboh hidraulik
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.56, 0.42, 0.55]);
      for (const sd of [-1, 1]) rod(b, G, 'steel', sd * 0.18, Y, 0.0, 0.45, 0.07);
      b.add('paint', HG.hex, [0, Y + 0.05, 0.55], [PI / 2, 0, 0], [1.1, 0.12, 1.1]);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, Y + 0.05, 0.62], null, [0.18 + i * 0.14, 0.18 + i * 0.14, 0.3]);
      b.add('accent', G.sph, [0, Y + 0.05, 0.63], null, [0.1, 0.1, 0.04]);
      return { muzzleZ: 0.8 };
    }
    case 'singularity': { // meriam lompang: sfera hitam dalam giroskop, halo bercahaya
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.35], null, [0.5, 0.4, 0.5]);
      for (const sd of [-1, 1]) b.add('steel', G.box, [sd * 0.4, Y + 0.08, 0.3], null, [0.06, 0.12, 0.9]);
      b.add('darker', G.sph, [0, Y + 0.12, 0.45], null, [0.42, 0.42, 0.42]);
      b.add('accent', G.torus, [0, Y + 0.12, 0.45], [PI / 2 + 0.3, 0, 0], [0.62, 0.62, 0.4]);
      b.add('steel', G.torus, [0, Y + 0.12, 0.45], [0, 0.6, 0], [0.78, 0.78, 0.3]);
      b.add('steel', G.torus, [0, Y + 0.12, 0.45], [0, -0.6, 0], [0.78, 0.78, 0.3]);
      return { muzzleZ: 1.0 };
    }
    case 'tether': {      // Leech: hos berusuk, mulut lintah bulat bergigi, tangki darah
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.3], null, [0.5, 0.4, 0.55]);
      for (let i = 0; i < 6; i++) b.add(i % 2 ? 'darker' : 'paint', G.cyl, [0, Y, 0.0 + i * 0.14], [PI / 2, 0, 0], [0.34 - i * 0.015, 0.12, 0.34 - i * 0.015]);
      b.add('darker', G.cyl, [0, Y, 0.95], [PI / 2, 0, 0], [0.5, 0.2, 0.5]);
      b.add('accent', G.cyl, [0, Y, 1.06], [PI / 2, 0, 0], [0.3, 0.02, 0.3]);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU;
        b.add('steel', G.cone, [Math.cos(a) * 0.19, Y + Math.sin(a) * 0.19, 1.07], [PI / 2, 0, 0], [0.04, 0.12, 0.04]);
      }
      rod(b, G, 'glass', 0.3, Y + 0.2, -0.6, 0.5, 0.18);
      rod(b, G, 'accent', 0.3, Y + 0.2, -0.57, 0.44, 0.11);
      return { muzzleZ: 1.15 };
    }
    case 'drain': {       // corong vampirik terbuka ke depan, berusuk, tangki cecair
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.3], null, [0.5, 0.42, 0.55]);
      b.add('dark', G.cone, [0, Y + 0.05, 0.6], [-PI / 2, 0, 0], [0.75, 0.9, 0.75]);
      b.add('accent', G.cone, [0, Y + 0.05, 0.66], [-PI / 2, 0, 0], [0.55, 0.75, 0.55]);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        b.add('steel', G.box, [Math.cos(a) * 0.24, Y + 0.05 + Math.sin(a) * 0.24, 0.62], [0, 0, a], [0.04, 0.04, 0.75]);
      }
      rod(b, G, 'glass', -0.3, Y + 0.18, -0.6, 0.5, 0.2);
      rod(b, G, 'accent', -0.3, Y + 0.18, -0.57, 0.44, 0.13);
      return { muzzleZ: 1.1 };
    }
    case 'shocklance': {  // tongkat kejut: penebat manik, hujung bergarpu, kapasitor
      cradle(b, G, 0.5);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.4, 0.36, 0.7]);
      rod(b, G, 'steel', 0, Y + 0.05, 0.0, 1.3, 0.08);
      for (let i = 0; i < 5; i++) b.add(i % 2 ? 'steel' : 'accent', G.cyl, [0, Y + 0.05, 0.2 + i * 0.18], [PI / 2, 0, 0], [0.22, 0.07, 0.22]);
      for (const sd of [-1, 1]) {
        b.add('steel', G.box, [sd * 0.12, Y + 0.05, 1.3], [0, sd * 0.2, 0], [0.04, 0.05, 0.4]);
        b.add('accent', G.sph, [sd * 0.16, Y + 0.05, 1.5], null, [0.07, 0.07, 0.07]);
      }
      return { muzzleZ: 1.5 };
    }
    case 'lance': {       // Lance: laras lembing panjang anggun, tiga gelang, hujung tajam, teropong
      cradle(b, G, 0.5);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.38, 0.38, 0.9]);
      b.add('paint', G.box, [0, Y + 0.04, 0.4], [0, 0, PI / 4], [0.22, 0.22, 0.7]);
      rod(b, G, 'steel', 0, Y + 0.04, 0.4, 1.7, 0.1);
      for (let i = 0; i < 3; i++) b.add('accent', G.torus, [0, Y + 0.04, 0.85 + i * 0.4], null, [0.18 - i * 0.02, 0.18 - i * 0.02, 0.5]);
      b.add('steel', G.cone, [0, Y + 0.04, 2.2], [PI / 2, 0, 0], [0.1, 0.22, 0.1]);
      rod(b, G, 'darker', 0, Y + 0.3, -0.3, 0.7, 0.12);
      b.add('accent', G.cyl, [0, Y + 0.3, 0.41], [PI / 2, 0, 0], [0.13, 0.02, 0.13]);
      return { muzzleZ: 2.25 };
    }
    case 'phase': {       // Phase: laras bilah bersegi, plat "hantu" teranjak bercahaya
      cradle(b, G, 0.5);
      b.add('paint', G.rbox, [0, Y, -0.2], null, [0.36, 0.36, 0.8]);
      b.add('paint', HG.oct, [0, Y, 0.65], [0, 0, PI / 4], [0.28, 0.2, 1.1]);
      for (let i = 0; i < 3; i++) b.add('accent', G.box, [0, Y + 0.17 + i * 0.07, 0.3 + i * 0.12], null, [0.24 - i * 0.05, 0.02, 0.7]);   // plat hantu
      for (const sd of [-1, 1]) b.add('accent', G.box, [sd * 0.2, Y, 0.55], [0, sd * 0.06, 0], [0.02, 0.1, 0.8]);
      return { muzzleZ: 1.25 };
    }
    case 'net': {         // pelancar jaring: muncung segi empat, 4 pemberat di penjuru, jaring
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.25], null, [0.56, 0.42, 0.6]);
      b.add('paint', G.box, [0, Y + 0.05, 0.45], null, [0.56, 0.56, 0.7]);
      b.add('darker', G.box, [0, Y + 0.05, 0.81], null, [0.5, 0.5, 0.02]);
      for (let i = -2; i <= 2; i++) {
        b.add('accent', G.box, [i * 0.1, Y + 0.05, 0.82], null, [0.015, 0.48, 0.015]);
        b.add('accent', G.box, [0, Y + 0.05 + i * 0.1, 0.82], null, [0.48, 0.015, 0.015]);
      }
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add('steel', G.sph, [x * 0.3, Y + 0.05 + y * 0.3, 0.84], null, [0.12, 0.12, 0.12]);
      return { muzzleZ: 0.95 };
    }
    case 'drill': {       // gerudi: mata gerudi berlurah lingkar, rumah motor bersirip
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.3], null, [0.56, 0.48, 0.6]);
      for (let i = 0; i < 4; i++) b.add('dark', G.box, [0, Y + 0.25, -0.5 + i * 0.13], null, [0.5, 0.05, 0.05]);
      rod(b, G, 'steel', 0, Y, 0.0, 0.35, 0.3);
      b.add('steel', G.cone, [0, Y, 0.85], [PI / 2, 0, 0], [0.42, 1.0, 0.42]);
      for (let i = 0; i < 8; i++) {                                                        // lurah lingkar
        const a = i * 0.9, z = 0.45 + i * 0.1, rr = 0.2 - i * 0.022;
        b.add('accent', G.box, [Math.cos(a) * rr, Y + Math.sin(a) * rr, z], [0, 0, a], [0.05, 0.12, 0.06]);
      }
      return { muzzleZ: 1.4 };
    }
    case 'buzzsaw': {     // pelempar gergaji: dulang pelancar + bilah bergigi mendatar + pengadang
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y, -0.3], null, [0.56, 0.38, 0.6]);
      b.add('dark', G.box, [0, Y, 0.35], null, [0.9, 0.1, 0.8]);                         // dulang
      b.add('steel', G.cyl, [0, Y + 0.09, 0.4], null, [0.85, 0.04, 0.85]);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        b.add('steel', G.cone, [Math.cos(a) * 0.44, Y + 0.09, 0.4 + Math.sin(a) * 0.44], [0, 0, 0], [0.07, 0.04, 0.12]);
        b.add('steel', G.box, [Math.cos(a) * 0.45, Y + 0.09, 0.4 + Math.sin(a) * 0.45], [0, -a + 0.6, 0], [0.12, 0.03, 0.06]);
      }
      b.add('accent', G.cyl, [0, Y + 0.13, 0.4], null, [0.2, 0.04, 0.2]);
      b.add('paint', arcHalf(THREE), [0, Y + 0.12, 0.4], [PI / 2, 0, 0], [0.98, 0.98, 1.0]);   // pengadang separuh
      return { muzzleZ: 0.95 };
    }
    case 'fist': {        // penumbuk: badan omboh; tangan berjari dibina dalam bahagian bergerak (bolt)
      cradle(b, G);
      b.add('paint', G.rbox, [0, Y + 0.02, -0.25], null, [0.66, 0.52, 0.75]);
      rod(b, G, 'darker', 0, Y + 0.02, 0.1, 0.65, 0.48);
      for (let i = 0; i < 3; i++) b.add('steel', G.torus, [0, Y + 0.02, 0.15 + i * 0.25], null, [0.26, 0.26, 0.35]);
      for (const sd of [-1, 1]) rod(b, G, 'steel', sd * 0.3, Y + 0.02, -0.2, 0.9, 0.07);
      b.add('hot', G.box, [0, Y + 0.3, -0.25], null, [0.26, 0.04, 0.4]);
      return { muzzleZ: 1.62 };
    }
    case 'windcharge': {  // turbin angin: kipas masuk belakang, laras venturi, bilah pusar di muncung
      cradle(b, G);
      b.add('paint', G.cyl, [0, Y + 0.05, -0.35], [PI / 2, 0, 0], [0.7, 0.4, 0.7]);
      b.add('darker', G.cyl, [0, Y + 0.05, -0.56], [PI / 2, 0, 0], [0.6, 0.02, 0.6]);
      for (let i = 0; i < 6; i++) b.add('steel', G.box, [0, Y + 0.05, -0.55], [0, 0, i / 6 * PI], [0.56, 0.05, 0.02]);
      b.add('steel', G.cyl, [0, Y + 0.05, 0.25], [PI / 2, 0, 0], [0.32, 0.8, 0.5]);
      b.add('steel', G.cone, [0, Y + 0.05, 0.95], [-PI / 2, 0, 0], [0.55, 0.5, 0.55]);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        b.add('accent', G.box, [Math.cos(a) * 0.22, Y + 0.05 + Math.sin(a) * 0.22, 1.1], [0, 0.5, a], [0.24, 0.03, 0.14]);
      }
      return { muzzleZ: 1.25 };
    }
  }
  return null;
}

let _arcRack = null;
function arcRack(THREE) { return _arcRack || (_arcRack = new THREE.TorusGeometry(0.62, 0.06, 6, 20, 1.0).rotateZ(PI / 2 - 0.5)); }
let _arcHalf = null;
function arcHalf(THREE) { return _arcHalf || (_arcHalf = new THREE.TorusGeometry(0.5, 0.05, 6, 20, Math.PI)); }

/* tangan penumbuk untuk bahagian bergerak Fist (keluarga 'piston') */
export function fistHand(bb, G) {
  bb.add('steel', G.cyl, [0, 0.4, 0.95], [PI / 2, 0, 0], [0.28, 0.6, 0.28]);          // rod omboh
  bb.add('paint', G.rbox, [0, 0.4, 1.3], null, [0.6, 0.5, 0.32]);                      // tapak tangan
  for (let i = 0; i < 4; i++) {                                                          // empat jari terlipat
    const x = -0.22 + i * 0.147;
    bb.add('dark', G.rbox, [x, 0.52, 1.5], null, [0.13, 0.17, 0.2]);
    bb.add('steel', G.cyl, [x, 0.6, 1.58], [PI / 2, 0, 0], [0.14, 0.12, 0.14]);          // buku jari
    bb.add('dark', G.rbox, [x, 0.38, 1.56], null, [0.12, 0.2, 0.14]);
  }
  bb.add('dark', G.rbox, [0.33, 0.33, 1.38], [0, 0, -0.5], [0.14, 0.3, 0.16]);          // ibu jari
  bb.add('accent', G.box, [0, 0.45, 1.13], null, [0.5, 0.06, 0.03]);
}

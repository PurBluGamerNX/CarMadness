// hulls3.js — reka bentuk semula 2026-10-17 (Nabil: "cantik dah, cuma simple,
// berselerak, takde characteristic"). Siluet asal setiap kereta DIKEKALKAN;
// yang dibuang ialah longgokan bahagian generik (bar muncung, perisai sisi,
// spoiler + kotak karat, "extra" & "sig" yang bertindih). Setiap badan kini
// satu bentuk yang kemas + SATU ciri utama yang mencerminkan kebolehannya.
// Fungsi di sini MENGATASI kunci sama dalam hulls.js (Object.assign dalam
// models.js) atau kunci baharu untuk kereta yang dahulu guna casis generik.
import * as THREE from 'three';
import { HG } from './hulls.js';

const PI = Math.PI, TAU = PI * 2;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _u = new THREE.Vector3(0, 1, 0), _w = new THREE.Vector3();
/* rod / anggota antara dua titik */
function seg(b, key, geo, a, c, r, rz) {
  _w.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = _w.length() || 1e-3;
  _q.setFromUnitVectors(_u, _w.normalize());
  _e.setFromQuaternion(_q);
  b.add(key, geo, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], [_e.x, _e.y, _e.z], [r, len, rz === undefined ? r : rz]);
}
function lamps(b, G, pts, r = 0.16) {
  for (const [x, y, z] of pts) {
    b.add('steel', G.cyl, [x, y, z - 0.03], [PI / 2, 0, 0], [r * 2.3, 0.1, r * 2.3]);
    b.add('head', G.cyl, [x, y, z], [PI / 2, 0, 0], [r * 2, 0.06, r * 2]);
  }
}
function slimLamp(b, G, x, y, z, w = 0.5, ry = 0) { b.add('head', G.box, [x, y, z], [0, ry, 0], [w, 0.07, 0.06]); }
function tails(b, G, pts, w = 0.4) { for (const [x, y, z] of pts) b.add('tail', G.box, [x, y, z], null, [w, 0.1, 0.06]); }
/* sayap roda: lengkung separuh torus di atas roda */
function fender(b, G, key, x, y, z, r, w = 0.42) { b.add(key, G.torus, [x, y, z], [0, PI / 2, 0], [r * 2.1, r * 2.1, w * 4.4]); }
const ARC_G = {};
let _bell = null;
/* muncung loceng roket: profil melengkung, terbuka, menghala +Y (diputar dalam badan) */
function BELL() {
  if (_bell) return _bell;
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.14 + 0.36 * t * t * 0.6 + 0.2 * t, -t * 0.55)); }
  return (_bell = new THREE.LatheGeometry(pts, 24));
}
function arcGeo(frac) { return ARC_G[frac] || (ARC_G[frac] = new THREE.TorusGeometry(0.5, 0.1, 8, 24, PI * frac)); }

export const HULLS3 = {
  /* ================= RANGER - kereta otot permulaan =================
     Dahulu: bar muncung + spoiler + kotak karat + plat "hood" bertindih.
     Kini satu badan otot yang bersih: bonet panjang dengan penghembus
     supercaj (Overdrive) yang menyala, bebibir roda, palang golek dan
     ekzos sisi berhujung panas. */
  ranger(b, G) {
    b.add('darker', G.box, [0, 0.46, -0.1], null, [1.86, 0.28, 3.9]);
    b.add('body', G.rbox, [0, 0.76, -0.1], null, [1.96, 0.5, 4.1]);                    // badan
    b.add('body', G.rbox, [0, 0.98, 1.15], null, [1.7, 0.2, 1.6]);                     // bonet
    b.add('body', G.box, [0, 0.82, 2.08], [-0.25, 0, 0], [1.9, 0.3, 0.32]);            // hidung condong
    for (const sd of [-1, 1]) {
      fender(b, G, 'body', sd * 0.97, 0.52, 1.36, 0.5);
      fender(b, G, 'body', sd * 0.99, 0.52, -1.42, 0.52, 0.48);
      b.add('crys', G.box, [sd * 0.99, 0.82, -0.1], null, [0.03, 0.05, 2.0]);          // jalur sisi
      // ekzos sisi berhujung panas
      b.add('steel', G.cyl, [sd * 1.04, 0.42, -0.2], [PI / 2, 0, 0], [0.14, 1.6, 0.14]);
      b.add('hot', G.cyl, [sd * 1.04, 0.42, -1.01], [PI / 2, 0, 0], [0.1, 0.03, 0.1]);
      b.add('dark', G.box, [sd * 0.55, 1.1, 1.55], null, [0.08, 0.03, 0.9]);           // garis bonet
    }
    // supercaj: penghembus + skop bercahaya keluar dari bonet
    b.add('dark', G.rbox, [0, 1.17, 1.05], null, [0.8, 0.26, 0.7]);
    for (let i = 0; i < 4; i++) b.add('steel', G.box, [0, 1.2, 0.78 + i * 0.18], null, [0.82, 0.22, 0.03]);
    b.add('dark', G.rbox, [0, 1.42, 1.0], null, [0.62, 0.22, 0.45]);
    b.add('crys', G.box, [0, 1.42, 1.24], null, [0.5, 0.12, 0.03]);
    // kabin
    b.add('dark', G.rbox, [0, 1.24, -0.45], null, [1.5, 0.56, 1.5]);
    b.add('glass', G.box, [0, 1.27, 0.3], [-0.5, 0, 0], [1.36, 0.5, 0.04]);
    b.add('glass', G.box, [0, 1.27, -1.2], [0.5, 0, 0], [1.3, 0.42, 0.04]);
    for (const sd of [-1, 1]) b.add('glass', G.box, [sd * 0.76, 1.27, -0.45], null, [0.03, 0.36, 1.1]);
    // palang golek
    b.add('steel', G.torus, [0, 1.44, -0.85], null, [1.45, 1.1, 0.4]);
    // bampar depan & belakang ringkas
    b.add('steel', G.box, [0, 0.55, 2.2], null, [1.95, 0.14, 0.14]);
    b.add('steel', G.box, [0, 0.55, -2.2], null, [1.9, 0.14, 0.12]);
    b.add('body', G.box, [0, 1.05, -2.0], null, [1.7, 0.06, 0.32]);                   // bibir spoiler rendah
    slimLamp(b, G, -0.6, 0.86, 2.18, 0.45); slimLamp(b, G, 0.6, 0.86, 2.18, 0.45);
    tails(b, G, [[-0.62, 0.86, -2.17], [0.62, 0.86, -2.17]], 0.5);
  },

  /* ================= BASTION - APC perisai (Aegis) =================
     Glasis bersudut, skirt perisai di atas rantai, bilah perisai hadapan
     dengan LAMBANG AEGIS bercahaya, periskop dan palka. Duri dahulu
     bersepah di sisi - kini satu barisan kemas di bibir skirt. */
  bastion(b, G) {
    b.add('darker', G.box, [0, 0.72, -0.1], null, [1.95, 0.5, 4.5]);
    b.add('body', G.rbox, [0, 1.25, -0.35], null, [2.15, 0.8, 3.7]);
    b.add('body', G.box, [0, 1.3, 1.7], [-0.62, 0, 0], [2.1, 0.22, 1.35]);            // glasis
    b.add('body', G.box, [0, 1.3, -2.25], [0.5, 0, 0], [2.0, 0.2, 0.7]);
    b.add('dark', G.rbox, [0, 1.72, -0.65], null, [1.6, 0.18, 2.2]);                   // bumbung
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.25, 1.18, -0.1], null, [0.1, 0.3, 4.6]);             // skirt
      b.add('army', G.box, [sd * 1.25, 1.36, -0.1], null, [0.5, 0.06, 4.7]);
      for (let i = 0; i < 6; i++) b.add('steel', G.cone, [sd * 1.5, 1.33, -1.9 + i * 0.75], [0, 0, -sd * PI / 2], [0.1, 0.32, 0.1]);
      b.add('glass', G.box, [sd * 0.5, 1.83, 0.45], [-0.3, 0, 0], [0.32, 0.14, 0.12]);   // periskop
      b.add('dark', G.box, [sd * 0.5, 1.82, 0.38], null, [0.36, 0.18, 0.16]);
    }
    // palka bulat
    b.add('dark', G.cyl, [0.5, 1.84, -1.2], null, [0.7, 0.1, 0.7]);
    b.add('steel', G.torus, [0.5, 1.88, -1.2], [PI / 2, 0, 0], [0.7, 0.7, 0.5]);
    // bilah perisai hadapan + lambang aegis heksagon
    b.add('steel', G.box, [0, 0.82, 2.45], [-0.35, 0, 0], [2.5, 1.0, 0.16]);
    b.add('dark', G.box, [0, 0.36, 2.62], null, [2.5, 0.16, 0.34]);
    b.add('army', HG.hex, [0, 0.86, 2.56], [PI / 2 - 0.35, 0, 0], [0.62, 0.06, 0.62]);
    b.add('crys', HG.hex, [0, 0.86, 2.59], [PI / 2 - 0.35, 0, 0], [0.42, 0.05, 0.42]);
    for (const sd of [-1, 1]) seg(b, 'dark', G.cyl, [sd * 0.75, 1.0, 1.7], [sd * 0.75, 0.8, 2.4], 0.14);
    lamps(b, G, [[-0.8, 1.32, 2.18], [0.8, 1.32, 2.18]], 0.11);
    tails(b, G, [[-0.7, 1.15, -2.4], [0.7, 1.15, -2.4]]);
  },

  /* ================= VORTEX - piring penyerap =================
     Pod tengah + gelang besar. Kini gelang itu ialah SALUR PUSARAN: enam
     bilah melengkung condong di dalamnya (mengalirkan tenaga ke teras),
     teras penyerap bercahaya di belakang kokpit kubah, dan gelang dalaman. */
  ring(b, G) {
    b.add('darker', G.cyl, [0, 0.7, -0.1], null, [1.7, 0.3, 2.6]);
    b.add('body', G.rbox, [0, 1.0, -0.1], null, [1.5, 0.62, 2.9]);
    b.add('body', G.sph, [0, 1.0, 1.25], null, [1.4, 0.7, 1.3]);
    b.add('glass', G.sph, [0, 1.35, 0.75], null, [1.0, 0.6, 1.2]);
    b.add('steel', G.torus, [0, 0.98, -0.1], [PI / 2, 0, 0], [4.5, 4.5, 0.3]);         // gelang luar
    b.add('body', G.torus, [0, 0.98, -0.1], [PI / 2, 0, 0], [4.1, 4.1, 0.45]);
    b.add('crys', G.torus, [0, 1.05, -0.1], [PI / 2, 0, 0], [3.55, 3.55, 0.12]);       // gelang tenaga dalam
    for (let i = 0; i < 6; i++) {                                                      // bilah pusaran
      const a = i / 6 * TAU + 0.3;
      b.add('steel', G.box, [Math.cos(a) * 1.55, 0.98, -0.1 + Math.sin(a) * 1.55], [0.35, -a + 0.6, 0], [0.75, 0.06, 0.32]);
    }
    // teras penyerap
    b.add('dark', G.cyl, [0, 1.42, -0.85], null, [0.85, 0.3, 0.85]);
    b.add('crys', G.sph, [0, 1.72, -0.85], null, [0.62, 0.62, 0.62]);
    b.add('steel', G.torus, [0, 1.72, -0.85], null, [0.85, 0.85, 0.4]);
    b.add('steel', G.torus, [0, 1.72, -0.85], [PI / 2, 0, 0], [0.85, 0.85, 0.4]);
    slimLamp(b, G, 0, 0.9, 2.0, 0.8);
    tails(b, G, [[-0.45, 1.0, -1.58], [0.45, 1.0, -1.58]], 0.3);
  },

  /* ================= SKYHOOK - buggy bertujah =================
     Rangka tiub terbuka. Kuasa = terbang, jadi EMPAT KIPAS BERSALUR pada
     lengan cadik di atas setiap roda (dahulu silinder hitam). Sayap lebar
     dibuang - hanya sirip pendek yang memegang kipas. */
  buggy(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.1], null, [1.3, 0.24, 3.6]);
    b.add('body', G.rbox, [0, 0.82, 0.25], null, [1.25, 0.4, 2.6]);
    b.add('body', G.box, [0, 0.82, 1.65], [-0.35, 0, 0], [1.2, 0.2, 0.9]);
    b.add('dark', G.rbox, [0, 1.0, -1.7], null, [1.1, 0.62, 0.9]);                     // enjin terdedah
    for (const x of [-0.25, 0.25]) b.add('steel', G.cyl, [x, 1.5, -1.85], [-0.3, 0, 0], [0.1, 0.6, 0.1]);
    b.add('dark', G.rbox, [0, 1.0, -0.2], null, [0.9, 0.3, 0.9]);                      // tempat duduk
    // sangkar golek
    for (const sd of [-1, 1]) {
      seg(b, 'steel', G.cyl, [sd * 0.62, 0.95, 0.85], [sd * 0.55, 1.75, 0.1], 0.09);
      seg(b, 'steel', G.cyl, [sd * 0.55, 1.75, 0.1], [sd * 0.55, 1.75, -0.9], 0.09);
      seg(b, 'steel', G.cyl, [sd * 0.55, 1.75, -0.9], [sd * 0.62, 0.95, -1.35], 0.09);
    }
    seg(b, 'steel', G.cyl, [-0.55, 1.75, 0.1], [0.55, 1.75, 0.1], 0.09);
    seg(b, 'steel', G.cyl, [-0.55, 1.75, -0.9], [0.55, 1.75, -0.9], 0.09);
    // kipas bersalur atas setiap roda
    for (const sd of [-1, 1]) for (const z of [1.36, -1.42]) {
      seg(b, 'dark', G.box, [sd * 0.6, 1.05, z * 0.6], [sd * 1.0, 1.25, z], 0.12, 0.16);   // lengan cadik
      b.add('body', G.torus, [sd * 1.0, 1.32, z], [PI / 2, 0, 0], [1.25, 1.25, 1.6]);
      b.add('darker', G.cyl, [sd * 1.0, 1.32, z], null, [1.05, 0.16, 1.05]);
      for (let i = 0; i < 4; i++) b.add('steel', G.box, [sd * 1.0, 1.34, z], [0.35, i * PI / 4 * 2 + 0.4, 0], [0.95, 0.03, 0.14]);
      b.add('crys', G.torus, [sd * 1.0, 1.22, z], [PI / 2, 0, 0], [1.05, 1.05, 0.3]);
      b.add('steel', G.cone, [sd * 1.0, 1.42, z], null, [0.16, 0.16, 0.16]);
    }
    lamps(b, G, [[-0.38, 0.92, 2.0], [0.38, 0.92, 2.0]], 0.12);
    b.add('steel', G.box, [0, 1.8, 0.1], null, [0.9, 0.12, 0.1]);                     // lampu palang atas
    for (const x of [-0.3, 0, 0.3]) b.add('head', G.cyl, [x, 1.86, 0.17], [PI / 2, 0, 0], [0.12, 0.05, 0.12]);
    tails(b, G, [[-0.45, 0.8, -2.15], [0.45, 0.8, -2.15]], 0.3);
  },

  /* ================= PHANTOM - pelumba fasa (Blink) =================
     Pusingan 2 (Nabil: "okay tapi nampak biasa"). Kini hidung BERCABANG dua
     seperti garpu dengan celah RETAKAN bercahaya di tengah (tempat ia
     "mengoyak" ruang), bilah sisi mengembang, gelang fasa tegak di belakang,
     dan DUA IMEJ HANTU lutsinar mengekori badan - seolah-olah kereta itu baru
     sahaja teleport. */
  racer(b, G) {
    b.add('darker', G.box, [0, 0.42, -0.4], null, [1.6, 0.22, 3.8]);
    b.add('body', G.rbox, [0, 0.62, -0.55], null, [1.7, 0.36, 3.5]);
    b.add('body', G.rbox, [0, 0.82, -0.9], null, [1.2, 0.3, 1.9]);
    for (const sd of [-1, 1]) {
      // cabang hidung
      b.add('body', G.box, [sd * 0.52, 0.6, 1.75], [0, -sd * 0.07, 0], [0.56, 0.22, 1.9]);
      b.add('body', G.box, [sd * 0.55, 0.62, 2.75], [0.12, -sd * 0.07, 0], [0.4, 0.1, 0.6]);
      b.add('crys', G.box, [sd * 0.52, 0.72, 1.75], [0, -sd * 0.07, 0], [0.04, 0.03, 1.6]);
      slimLamp(b, G, sd * 0.62, 0.6, 2.72, 0.3, -sd * 0.07);
      // bilah sisi mengembang
      b.add('body', G.box, [sd * 1.0, 0.82, -0.6], [0.0, 0, sd * 0.55], [0.05, 0.42, 1.6]);
      b.add('crys', G.box, [sd * 1.1, 0.98, -0.6], [0.0, 0, sd * 0.55], [0.02, 0.05, 1.5]);
    }
    b.add('crys', G.box, [0, 0.58, 1.95], null, [0.1, 0.12, 2.0]);                    // celah retakan
    b.add('crys', HG.oct, [0, 0.6, 2.95], null, [0.2, 0.2, 0.42]);
    b.add('glass', G.sph, [0, 0.98, -0.1], null, [1.0, 0.5, 1.9]);                     // kanopi
    // gelang fasa tegak
    b.add('dark', G.torus, [0, 1.3, -1.75], null, [1.6, 1.6, 0.8]);
    b.add('crys', G.torus, [0, 1.3, -1.75], null, [1.42, 1.42, 0.3]);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + PI / 4;
      b.add('steel', G.sph, [Math.cos(a) * 0.8, 1.3 + Math.sin(a) * 0.8, -1.75], null, [0.16, 0.16, 0.16]);
    }
    seg(b, 'dark', G.box, [0, 0.8, -1.75], [0, 0.55, -1.75], 0.3, 0.12);
    // imej hantu mengekori
    for (let k = 1; k <= 2; k++) {
      b.add('ghost', G.rbox, [0, 0.64 + k * 0.04, -0.55 - k * 0.85], null, [1.7 - k * 0.12, 0.36, 3.5]);
      b.add('ghost', G.box, [0, 0.62 + k * 0.04, 1.75 - k * 0.85], null, [1.5 - k * 0.12, 0.2, 1.9]);
    }
    tails(b, G, [[0, 0.62, -2.32]], 1.3);
  },

  /* ================= MELTDOWN - tangki reaktor (Nuke) =================
     Trak tangki: kabin di depan, tangki silinder dengan JALUR AMARAN
     radiasi hijau, kubah reaktor dengan rod bahan api bercahaya dan sirip
     penyejuk. Bilah muncung bergigi dikemas jadi satu rempuh. */
  tanker(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.1], null, [1.9, 0.36, 4.4]);
    b.add('body', G.rbox, [0, 1.1, 1.6], null, [1.85, 1.0, 1.35]);                     // kabin
    b.add('glass', G.box, [0, 1.4, 2.28], [-0.25, 0, 0], [1.5, 0.4, 0.05]);
    b.add('body', G.cyl, [0, 1.25, -0.6], [PI / 2, 0, 0], [1.75, 2.9, 1.75]);          // tangki
    b.add('steel', HG.hemi, [0, 1.25, -2.05], [-PI / 2, 0, 0], [1.75, 0.6, 1.75]);
    for (const z of [0.55, -0.6, -1.75]) {
      b.add('crys', G.torus, [0, 1.25, z], null, [1.78, 1.78, 0.5]);                    // jalur radiasi
      b.add('dark', G.torus, [0, 1.25, z + 0.18], null, [1.8, 1.8, 0.2]);
    }
    // kubah reaktor + rod bahan api
    b.add('dark', G.cyl, [0, 2.15, -0.6], null, [1.0, 0.3, 1.0]);
    b.add('glass', HG.hemi, [0, 2.3, -0.6], null, [0.95, 0.75, 0.95]);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      b.add('crys', G.cyl, [Math.cos(a) * 0.22, 2.45, -0.6 + Math.sin(a) * 0.22], null, [0.1, 0.5, 0.1]);
    }
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 4; i++) b.add('steel', G.box, [sd * 0.95, 1.7, -1.2 + i * 0.3], [0, 0, sd * 0.7], [0.5, 0.04, 0.2]);   // sirip penyejuk
      b.add('dark', G.cyl, [sd * 0.75, 2.0, 1.25], null, [0.2, 0.9, 0.2]);              // ekzos kabin
      b.add('crys', G.cyl, [sd * 0.75, 2.46, 1.25], null, [0.16, 0.03, 0.16]);
    }
    // rempuh depan
    b.add('steel', G.box, [0, 0.65, 2.4], [-0.2, 0, 0], [2.1, 0.5, 0.18]);
    for (let i = 0; i < 5; i++) b.add('steel', G.cone, [-0.8 + i * 0.4, 0.62, 2.58], [PI / 2, 0, 0], [0.13, 0.32, 0.13]);
    lamps(b, G, [[-0.65, 1.05, 2.3], [0.65, 1.05, 2.3]], 0.14);
    tails(b, G, [[-0.6, 0.8, -2.3], [0.6, 0.8, -2.3]]);
  },

  /* ================= SENTINEL - pembawa turet (Deploy) =================
     Kabin depan, dek belakang membawa DUA POD TURET TERLIPAT (itulah yang
     dijatuhkan oleh kebolehannya), tiang radar dengan piring. Meriam auto
     bumbung kekal (autoTurret). */
  hauler(b, G) {
    b.add('darker', G.box, [0, 0.72, -0.1], null, [2.0, 0.45, 4.6]);
    b.add('body', G.rbox, [0, 1.35, 1.3], null, [2.0, 1.05, 1.7]);                     // kabin
    b.add('body', G.box, [0, 1.25, 2.2], [-0.5, 0, 0], [2.0, 0.2, 0.9]);
    b.add('glass', G.box, [0, 1.65, 2.13], [-0.35, 0, 0], [1.6, 0.36, 0.05]);
    for (const sd of [-1, 1]) b.add('glass', G.box, [sd * 1.0, 1.6, 1.35], null, [0.04, 0.3, 1.0]);
    b.add('body', G.rbox, [0, 1.05, -1.0], null, [2.05, 0.45, 2.8]);                   // dek
    // dua pod turet terlipat di dek
    for (const sd of [-1, 1]) {
      b.add('dark', G.rbox, [sd * 0.55, 1.5, -1.65], null, [0.8, 0.5, 1.1]);
      b.add('army', G.box, [sd * 0.55, 1.78, -1.65], null, [0.7, 0.08, 0.95]);
      b.add('steel', G.cyl, [sd * 0.55, 1.5, -0.95], [PI / 2, 0, 0], [0.12, 0.6, 0.12]);
      b.add('crys', G.box, [sd * 0.55, 1.62, -2.21], null, [0.5, 0.06, 0.03]);
      for (const z of [-1.2, -2.1]) b.add('steel', G.box, [sd * 0.55, 1.25, z], null, [0.9, 0.06, 0.08]);   // pengapit
    }
    // tiang radar
    b.add('steel', G.cyl, [-0.75, 2.35, 0.9], null, [0.08, 1.2, 0.08]);
    b.add('steel', G.cyl, [-0.75, 2.95, 0.85], [0.6, 0, 0], [0.55, 0.06, 0.55]);
    b.add('crys', G.sph, [-0.75, 3.0, 0.92], null, [0.1, 0.1, 0.1]);
    // bampar penolak
    b.add('steel', G.box, [0, 0.75, 2.5], [-0.3, 0, 0], [2.3, 0.7, 0.14]);
    for (const x of [-0.7, 0, 0.7]) b.add('crys', G.box, [x, 0.75, 2.6], [-0.3, 0, 0], [0.3, 0.06, 0.03]);
    lamps(b, G, [[-0.7, 1.15, 2.18], [0.7, 1.15, 2.18]], 0.13);
    tails(b, G, [[-0.7, 1.05, -2.42], [0.7, 1.05, -2.42]]);
  },

  /* ================= REAPER - kala jengking penyedut (Siphon) =================
     Kekal kala jengking. Dikemas: segmen badan bertindih seperti karapas,
     SEPIT besar berengsel (dahulu kon "claw" bersepah), ekor dengan
     urat sedutan bercahaya dan sengat bercahaya, tangki sedutan di sisi. */
  scorpion(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.1], null, [1.5, 0.28, 3.8]);
    const plates = [[1.15, 1.6, 0.5, 1.2], [0.05, 1.95, 0.62, 1.3], [-1.2, 1.65, 0.54, 1.1]];
    for (const [z, w, h, l] of plates) {
      b.add('body', G.rbox, [0, 0.88, z], null, [w, h, l]);
      b.add('dark', G.box, [0, 0.88 + h / 2 - 0.02, z - l / 2 + 0.06], [0.2, 0, 0], [w * 0.92, 0.06, 0.12]);   // tepi karapas
    }
    b.add('darker', G.rbox, [0, 0.78, 2.0], null, [1.1, 0.4, 0.6]);                     // kepala
    for (const sd of [-1, 1]) for (const k of [0, 1]) b.add('crys', G.sph, [sd * (0.18 + k * 0.2), 0.95 - k * 0.05, 2.3], null, [0.14, 0.14, 0.08]);
    // sepit
    for (const sd of [-1, 1]) {
      seg(b, 'body', G.rbox, [sd * 0.6, 0.8, 1.7], [sd * 1.15, 0.85, 2.4], 0.26, 0.3);
      b.add('body', G.sph, [sd * 1.2, 0.85, 2.55], null, [0.55, 0.42, 0.62]);
      b.add('steel', G.cone, [sd * 1.0, 0.86, 3.05], [PI / 2, 0, sd * 0.35], [0.18, 0.75, 0.16]);
      b.add('steel', G.cone, [sd * 1.38, 0.86, 3.0], [PI / 2, 0, -sd * 0.25], [0.16, 0.62, 0.14]);
      // tangki sedutan sisi
      b.add('glass', G.cyl, [sd * 1.0, 1.05, -0.4], [PI / 2, 0, 0], [0.32, 0.9, 0.32]);
      b.add('crys', G.cyl, [sd * 1.0, 1.05, -0.4], [PI / 2, 0, 0], [0.22, 0.8, 0.22]);
      b.add('steel', G.torus, [sd * 1.0, 1.05, 0.05], null, [0.36, 0.36, 0.4]);
    }
    // ekor dengan urat bercahaya
    const cy = 1.75, cz = -1.45, R = 1.05, N = 7;
    for (let i = 0; i <= N; i++) {
      const a = -0.75 + (i / N) * 3.0, s = 0.6 - i * 0.045;
      const p = [0, cy + Math.sin(a) * R, cz - Math.cos(a) * R];
      b.add('body', G.rbox, p, [-a, 0, 0], [s, s * 0.85, 0.44]);
      b.add('crys', G.box, [0, p[1] + Math.cos(a) * s * 0.42, p[2] + Math.sin(a) * s * 0.42], [-a, 0, 0], [0.06, 0.06, 0.3]);
    }
    const ea = 2.45;
    b.add('crys', G.sph, [0, cy + Math.sin(ea) * R, cz - Math.cos(ea) * R + 0.05], null, [0.3, 0.3, 0.3]);
    b.add('steel', G.cone, [0, cy + Math.sin(ea) * R - 0.18, cz - Math.cos(ea) * R + 0.3], [PI / 2 + 0.9, 0, 0], [0.2, 0.7, 0.2]);
    tails(b, G, [[-0.5, 0.9, -1.8], [0.5, 0.9, -1.8]], 0.35);
  },

  /* ================= RAZORBACK - babi hutan perempuh (Rampage) =================
     Dikemas daripada versi lepas: badan bertingkat seperti bahu babi,
     sayap lumpur di atas enam roda, kokpit bersangkar, bulu tengkuk logam
     (bilah condong ke belakang, bukan kon tegak), MATA bercahaya pada plat
     rempuh dan ekzos berkembar. Batang rempuh bertopi kekal. */
  boar(b, G) {
    b.add('darker', G.box, [0, 0.5, -0.1], null, [1.95, 0.3, 4.0]);
    b.add('body', G.rbox, [0, 0.82, -0.6], null, [2.0, 0.6, 3.0]);
    b.add('body', G.rbox, [0, 1.02, 0.85], null, [2.1, 0.8, 1.3]);                     // bahu
    b.add('body', G.box, [0, 1.12, 1.55], [-0.45, 0, 0], [2.0, 0.24, 1.1]);
    for (const sd of [-1, 1]) {
      for (const z of [1.36, -0.55, -1.75]) b.add('dark', G.box, [sd * 1.0, 0.98, z], null, [0.3, 0.08, 0.95]);   // sayap lumpur
      b.add('dark', G.box, [sd * 1.04, 0.72, -0.6], null, [0.1, 0.36, 3.0]);
      b.add('steel', G.cyl, [sd * 0.6, 0.62, -2.15], [PI / 2, 0, 0], [0.16, 0.4, 0.16]);   // ekzos
      b.add('hot', G.cyl, [sd * 0.6, 0.62, -2.36], [PI / 2, 0, 0], [0.12, 0.03, 0.12]);
    }
    // kokpit bersangkar
    b.add('dark', G.rbox, [0, 1.45, -0.35], null, [1.2, 0.45, 1.1]);
    b.add('glass', G.box, [0, 1.45, 0.22], [-0.4, 0, 0], [1.05, 0.35, 0.04]);
    for (const x of [-0.3, 0, 0.3]) b.add('steel', G.box, [x, 1.47, 0.25], [-0.4, 0, 0], [0.05, 0.42, 0.05]);
    // bulu tengkuk: bilah condong ke belakang
    // (di belakang kokpit - mengikut lengkung belakang badan)
    for (let i = 0; i < 6; i++) {
      const z = -0.95 - i * 0.3, h = 0.62 - i * 0.07, top = 1.12;
      b.add('steel', G.box, [0, top + h * 0.35, z], [-0.75, 0, 0], [0.07, h, 0.26]);
    }
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++)
      b.add('steel', G.box, [sd * 0.45, 1.36 - i * 0.03, 1.1 - i * 0.22], [-0.8, 0, sd * 0.3], [0.06, 0.42 - i * 0.05, 0.22]);   // bulu bahu
    // sangkar kokpit
    for (const sd of [-1, 1]) seg(b, 'steel', G.cyl, [sd * 0.62, 1.2, -0.85], [sd * 0.5, 1.82, -0.5], 0.06);
    seg(b, 'steel', G.cyl, [-0.5, 1.82, -0.5], [0.5, 1.82, -0.5], 0.06);
    // panel perisai sisi berivet
    for (const sd of [-1, 1]) {
      b.add('steel', G.box, [sd * 1.08, 0.82, 0.55], null, [0.06, 0.42, 0.85]);
      for (const z of [0.25, 0.85]) for (const y of [0.68, 0.96]) b.add('dark', G.sph, [sd * 1.12, y, z], null, [0.07, 0.07, 0.07]);
    }
    // plat rempuh + batang
    b.add('steel', G.box, [0, 0.82, 2.4], [-0.45, 0, 0], [2.5, 1.05, 0.24]);
    b.add('darker', G.box, [0, 0.82, 2.28], [-0.45, 0, 0], [2.3, 0.85, 0.14]);
    b.add('steel', G.box, [0, 0.36, 2.62], null, [2.55, 0.2, 0.4]);
    for (const sd of [-1, 1]) {
      b.add('steel', G.box, [sd * 1.24, 0.85, 2.28], [-0.45, sd * 0.35, 0], [0.16, 1.0, 0.65]);
      b.add('crys', G.box, [sd * 0.62, 1.1, 2.48], [-0.45, 0, sd * 0.25], [0.42, 0.1, 0.04]);   // mata marah
      seg(b, 'dark', G.cyl, [sd * 0.6, 0.95, 1.6], [sd * 0.6, 0.9, 2.3], 0.2);
      // gading melengkung
      b.add('steel', G.cone, [sd * 1.08, 0.55, 2.95], [PI / 2 - 0.55, 0, sd * -0.3], [0.3, 1.3, 0.3]);
      b.add('steel', G.cyl, [sd * 1.02, 0.45, 2.45], [PI / 2 - 0.3, 0, 0], [0.36, 0.45, 0.36]);
    }
    b.add('dark', G.cyl, [0, 0.82, 2.5], [PI / 2, 0, 0], [0.6, 1.6, 0.6]);
    b.add('steel', G.torus, [0, 0.82, 2.65], null, [0.38, 0.38, 0.9]);
    b.add('steel', G.cyl, [0, 0.82, 3.35], [PI / 2, 0, 0], [0.92, 0.3, 0.92]);
    b.add('steel', G.cone, [0, 0.82, 3.64], [PI / 2, 0, 0], [0.8, 0.3, 0.8]);
    b.add('rust', G.cyl, [0, 0.82, 3.52], [PI / 2, 0, 0], [0.95, 0.06, 0.95]);
    tails(b, G, [[-0.65, 0.88, -2.12], [0.65, 0.88, -2.12]], 0.45);
  },

  /* ================= REVENANT - kereta jenazah hantu (Second Wind) =================
     Kereta jenazah gotik: tingkap belakang berbentuk keranda, menara kecil
     di bumbung, palang landau krom, gril tegak, dan TANGLUNG ROH hijau-mint
     di kedua sisi (nyawa keduanya). */
  hearse(b, G) {
    b.add('darker', G.box, [0, 0.46, 0], null, [1.92, 0.28, 4.7]);
    b.add('body', G.rbox, [0, 0.72, 0], null, [1.92, 0.48, 4.75]);
    b.add('body', G.rbox, [0, 0.95, 1.65], null, [1.75, 0.3, 1.35]);
    b.add('body', G.rbox, [0, 1.36, -0.75], null, [1.82, 0.95, 3.05]);
    b.add('darker', G.rbox, [0, 1.86, -0.75], null, [1.7, 0.1, 2.9]);
    b.add('glass', G.box, [0, 1.34, 0.76], [-0.5, 0, 0], [1.58, 0.56, 0.05]);
    for (const sd of [-1, 1]) {
      // tingkap keranda (heksagon memanjang)
      b.add('glass', HG.hex, [sd * 0.92, 1.38, -0.9], [0, 0, PI / 2], [0.55, 0.04, 1.6]);
      b.add('steel', G.torus, [sd * 0.93, 1.4, -2.0], [0, PI / 2, 0], [0.55, 0.55, 0.3]);      // palang landau
      seg(b, 'steel', G.cyl, [sd * 0.94, 1.4, -1.73], [sd * 0.94, 1.15, -1.5], 0.04);
      b.add('steel', G.box, [sd * 0.97, 0.7, 0], null, [0.03, 0.04, 4.4]);
      // tanglung roh
      b.add('dark', G.cyl, [sd * 0.98, 1.95, 0.35], null, [0.2, 0.08, 0.2]);
      b.add('crys', G.cyl, [sd * 0.98, 2.1, 0.35], null, [0.16, 0.26, 0.16]);
      b.add('dark', G.cone, [sd * 0.98, 2.32, 0.35], null, [0.22, 0.16, 0.22]);
    }
    for (const x of [-0.55, 0, 0.55]) {                                                   // menara bumbung
      b.add('steel', G.cone, [x, 2.06, -2.0], null, [0.12, 0.32, 0.12]);
      b.add('steel', G.cone, [x, 2.06, 0.4], null, [0.1, 0.24, 0.1]);
    }
    b.add('glass', G.box, [0, 1.4, -2.29], null, [1.1, 0.62, 0.04]);
    b.add('crys', G.box, [0, 1.12, -2.31], null, [0.9, 0.04, 0.02]);                   // jalur roh
    // gril tegak
    b.add('steel', G.box, [0, 0.84, 2.36], null, [1.0, 0.36, 0.04]);
    for (let i = -4; i <= 4; i++) b.add('darker', G.box, [i * 0.1, 0.84, 2.38], null, [0.03, 0.32, 0.03]);
    lamps(b, G, [[-0.68, 0.88, 2.34], [0.68, 0.88, 2.34]], 0.15);
    for (const x of [-0.8, 0.8]) b.add('tail', G.box, [x, 1.1, -2.34], null, [0.08, 0.7, 0.05]);
  },

  /* ================= INFERNO - relau napalm =================
     Kotak rak periuk api dahulu bertindih di belakang - dibuang. Kini
     TANGKI NAPALM berkembar di belakang dengan palang muncung penyembur yang
     menyala (Napalm Trail keluar dari situ), gril relau, cerobong. */
  furnace(b, G) {
    b.add('darker', G.box, [0, 0.52, -0.1], null, [1.95, 0.35, 4.4]);
    b.add('body', G.rbox, [0, 1.15, -0.25], null, [1.95, 1.1, 2.6]);
    b.add('body', G.rbox, [0, 1.0, 1.62], null, [1.8, 0.8, 1.15]);
    b.add('glass', G.box, [0, 1.28, 2.2], [-0.3, 0, 0], [1.4, 0.32, 0.05]);
    // gril relau
    b.add('darker', G.box, [0, 0.8, 2.22], null, [1.55, 0.48, 0.08]);
    for (let i = -3; i <= 3; i++) b.add('hot', G.box, [i * 0.2, 0.8, 2.27], null, [0.08, 0.4, 0.05]);
    for (let i = 0; i < 3; i++) b.add('steel', G.box, [0, 1.71, 0.6 - i * 0.6], null, [1.6, 0.06, 0.1]);
    for (const sd of [-1, 1]) {
      b.add('steel', G.cyl, [sd * 0.55, 2.3, -0.9], null, [0.32, 1.3, 0.32]);
      b.add('hot', G.cyl, [sd * 0.55, 2.96, -0.9], null, [0.28, 0.05, 0.28]);
      b.add('dark', G.torus, [sd * 0.55, 2.92, -0.9], [PI / 2, 0, 0], [0.4, 0.4, 0.4]);
      // tangki napalm
      b.add('rust', G.cyl, [sd * 0.5, 1.15, -1.85], [PI / 2, 0, 0], [0.75, 0.9, 0.75]);
      b.add('steel', G.torus, [sd * 0.5, 1.15, -1.55], null, [0.78, 0.78, 0.4]);
      b.add('steel', G.torus, [sd * 0.5, 1.15, -2.15], null, [0.78, 0.78, 0.4]);
      b.add('hot', G.box, [sd * 0.5, 1.53, -1.85], null, [0.1, 0.03, 0.5]);
    }
    // palang muncung penyembur
    b.add('dark', G.cyl, [0, 0.62, -2.35], [0, 0, PI / 2], [0.16, 1.8, 0.16]);
    for (let i = -2; i <= 2; i++) {
      b.add('steel', G.cone, [i * 0.38, 0.55, -2.45], [-PI / 2 - 0.4, 0, 0], [0.14, 0.24, 0.14]);
      b.add('hot', G.sph, [i * 0.38, 0.5, -2.55], null, [0.08, 0.08, 0.08]);
    }
    lamps(b, G, [[-0.7, 1.1, 2.2], [0.7, 1.1, 2.2]], 0.13);
    tails(b, G, [[-0.85, 1.25, -1.57], [0.85, 1.25, -1.57]], 0.2);
  },

  /* ================= ORACLE - pesawat arahan (Uplink) =================
     Pusingan 2: fiusej licin (bukan kotak), hidung sensor kaca, kanard,
     sayap delta nipis dengan pod hujung, dan ROTODOM dipindah ke atas ekor
     pada satu tiang sapu - senjata kini duduk di atas badan, bukan di atasnya. */
  jet(b, G) {
    b.add('darker', G.box, [0, 0.62, -0.3], null, [1.0, 0.22, 3.4]);
    b.add('body', G.sph, [0, 0.95, -0.2], null, [1.45, 0.72, 4.9]);                   // fiusej
    b.add('body', G.sph, [0, 1.12, 0.6], null, [1.0, 0.55, 2.2]);
    b.add('glass', G.sph, [0, 1.32, 0.95], null, [0.72, 0.42, 1.25]);                 // kanopi
    b.add('glass', G.sph, [0, 0.9, 2.45], null, [0.42, 0.36, 0.42]);                  // hidung sensor
    b.add('crys', G.sph, [0, 0.9, 2.6], null, [0.18, 0.16, 0.12]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.35, 0.88, -0.55], [0, sd * 0.6, 0], [2.0, 0.07, 1.25]);   // delta
      b.add('body', G.cyl, [sd * 2.05, 0.9, -1.0], [PI / 2, 0, 0], [0.16, 0.9, 0.16]);    // pod hujung
      b.add('crys', G.sph, [sd * 2.05, 0.9, -0.55], null, [0.1, 0.1, 0.1]);
      b.add('body', G.box, [sd * 0.62, 1.0, 1.55], [0, -sd * 0.5, 0], [0.7, 0.05, 0.32]);    // kanard
      b.add('dark', G.cyl, [sd * 0.36, 0.88, -2.5], [PI / 2, 0, 0], [0.38, 0.4, 0.38]);    // enjin
      b.add('crys', G.cyl, [sd * 0.36, 0.88, -2.71], [PI / 2, 0, 0], [0.28, 0.02, 0.28]);
      b.add('body', G.box, [sd * 0.45, 1.35, -2.05], [0.35, 0, sd * 0.4], [0.05, 0.6, 0.65]);   // sirip ekor V
    }
    // rotodom atas ekor
    seg(b, 'dark', G.box, [0, 1.2, -1.2], [0, 2.0, -1.75], 0.16, 0.5);
    b.add('body', G.cyl, [0, 2.08, -1.85], null, [1.75, 0.16, 1.75]);
    b.add('darker', G.cyl, [0, 2.08, -1.85], null, [1.8, 0.05, 1.8]);
    b.add('crys', G.box, [0, 2.17, -1.85], null, [1.55, 0.03, 0.08]);
    b.add('crys', G.torus, [0, 2.16, -1.85], [PI / 2, 0, 0], [1.2, 1.2, 0.25]);
    tails(b, G, [[-0.36, 1.1, -2.5], [0.36, 1.1, -2.5]], 0.2);
  },

  /* ================= TEMPEST - katamaran ribut (Storm) =================
     Layar rata seperti papan dibuang. Kini TIANG RIBUT di tengah: menara
     gegelung tesla bertingkat dengan bola awan petir bercahaya di puncak,
     ponton dengan haluan berbelah dan jalur kilat. */
  catamaran(b, G) {
    b.add('darker', G.box, [0, 0.62, -0.1], null, [1.2, 0.28, 3.9]);
    for (const sd of [-1, 1]) {
      b.add('body', G.cyl, [sd * 1.0, 1.08, -0.15], [PI / 2, 0, 0], [0.9, 3.6, 0.9]);
      b.add('body', G.cone, [sd * 1.0, 1.08, 2.15], [PI / 2, 0, 0], [0.9, 1.0, 0.9]);
      b.add('body', G.sph, [sd * 1.0, 1.08, -1.95], null, [0.9, 0.9, 0.7]);
      b.add('crys', G.box, [sd * 1.0, 1.36, 0.2], null, [0.06, 0.04, 3.0]);              // jalur kilat
      for (const z of [1.0, -0.2, -1.4]) b.add('steel', G.torus, [sd * 1.0, 1.08, z], null, [0.94, 0.94, 0.25]);
      b.add('tail', G.box, [sd * 1.0, 1.1, -2.3], null, [0.3, 0.1, 0.05]);
    }
    b.add('darker', G.box, [0, 1.22, -0.3], null, [1.3, 0.16, 2.8]);
    b.add('body', G.rbox, [0, 1.6, 0.6], null, [1.1, 0.65, 1.1]);
    b.add('glass', G.box, [0, 1.66, 1.17], [-0.2, 0, 0], [0.95, 0.36, 0.05]);
    // tiang ribut
    b.add('dark', G.cyl, [0, 1.6, -1.0], null, [0.7, 0.5, 0.7]);
    b.add('steel', G.cyl, [0, 2.35, -1.0], null, [0.14, 1.5, 0.14]);
    for (let k = 0; k < 4; k++) b.add(k % 2 ? 'steel' : 'crys', G.torus, [0, 1.95 + k * 0.28, -1.0], [PI / 2, 0, 0], [0.9 - k * 0.12, 0.9 - k * 0.12, 0.5]);
    b.add('crys', G.ico1, [0, 3.25, -1.0], null, [0.62, 0.62, 0.62]);
    for (const z of [-0.6, -1.5]) b.add('steel', G.box, [0, 1.35, z], null, [2.0, 0.08, 0.1]);
    lamps(b, G, [[-1.0, 1.1, 2.55], [1.0, 1.1, 2.55]], 0.14);
  },

  /* ================= BULWARK - kubu penghalang (Barrier) =================
     Kubu konkrit. Teras bulat "core" atas bumbung dibuang. Kini dua PANEL
     PEMANCAR PENGHALANG berengsel emas di sisi (dari situ dinding tenaga
     dijatuhkan), celah tembak, guni pasir tersusun kemas di dek hadapan. */
  bunker(b, G) {
    b.add('darker', G.box, [0, 0.72, -0.1], null, [2.0, 0.5, 4.5]);
    b.add('body', HG.frust, [0, 1.3, -0.1], null, [2.15, 1.05, 4.2]);
    b.add('dark', HG.frust, [0, 1.9, -0.5], null, [1.1, 0.16, 1.5]);
    b.add('glass', G.box, [0, 1.42, 1.98], [-0.33, 0, 0], [1.2, 0.08, 0.05]);           // celah tembak
    b.add('darker', G.box, [0, 1.42, 1.96], [-0.33, 0, 0], [1.4, 0.2, 0.04]);
    for (const sd of [-1, 1]) {
      // panel pemancar penghalang
      b.add('dark', G.cyl, [sd * 1.12, 1.35, -0.4], [PI / 2, 0, 0], [0.22, 2.2, 0.22]);
      b.add('gold', G.box, [sd * 1.28, 1.25, -0.4], [0, 0, sd * 0.25], [0.08, 0.75, 2.1]);
      for (let i = 0; i < 4; i++) b.add('crys', G.box, [sd * 1.33, 1.25, -1.15 + i * 0.5], [0, 0, sd * 0.25], [0.03, 0.55, 0.06]);
      for (let i = 0; i < 6; i++) b.add('steel', G.sph, [sd * 1.27, 1.62, -1.5 + i * 0.44], null, [0.07, 0.07, 0.07]);
    }
    // guni pasir di dek hadapan
    for (let i = 0; i < 4; i++) b.add('rust', G.sphLo, [-0.6 + i * 0.4, 1.0, 2.3], null, [0.42, 0.24, 0.3]);
    for (let i = 0; i < 3; i++) b.add('rust', G.sphLo, [-0.4 + i * 0.4, 1.2, 2.25], null, [0.4, 0.22, 0.28]);
    b.add('steel', G.cyl, [0, 2.02, -0.5], null, [0.5, 0.12, 0.5]);
    b.add('crys', G.cyl, [0, 2.08, -0.5], null, [0.3, 0.04, 0.3]);
    lamps(b, G, [[-0.75, 1.05, 2.17], [0.75, 1.05, 2.17]], 0.12);
    tails(b, G, [[-0.7, 1.05, -2.3], [0.7, 1.05, -2.3]]);
  },

  /* ================= METEOR - kapsul jatuh (Meteor Drop) =================
     Pusingan 2: enjin kini ENJIN ROKET SEBENAR - kebuk pembakaran, paip
     bahan api, dan muncung LOCENG melebar yang bercahaya di dalam. */
  capsule(b, G) {
    b.add('darker', G.box, [0, 0.55, -0.2], null, [1.5, 0.3, 3.6]);
    b.add('body', G.cyl, [0, 1.08, -0.35], [PI / 2, 0, 0], [1.55, 2.8, 1.55]);
    b.add('rust', HG.hemi, [0, 1.08, 1.05], [PI / 2, 0, 0], [1.62, 1.3, 1.62]);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + 0.2;
      b.add('hot', G.box, [Math.cos(a) * 0.42, 1.08 + Math.sin(a) * 0.42, 1.52], [0, 0, a], [0.62, 0.035, 0.05]);
    }
    b.add('hot', G.torus, [0, 1.08, 1.06], null, [1.62, 1.62, 0.3]);
    b.add('hot', G.sph, [0, 1.08, 1.68], null, [0.3, 0.3, 0.1]);
    for (let i = 0; i < 3; i++) b.add('steel', G.torus, [0, 1.08, 0.45 - i * 0.7], null, [1.58, 1.58, 0.14]);
    b.add('darker', G.box, [0, 1.85, -0.35], null, [0.5, 0.04, 2.4]);
    // plat dorong + tiga enjin roket
    b.add('steel', G.cyl, [0, 1.08, -1.78], [PI / 2, 0, 0], [1.5, 0.1, 1.5]);
    for (const [x, y] of [[0, 1.4], [-0.4, 0.82], [0.4, 0.82]]) {
      b.add('dark', G.cyl, [x, y, -1.95], [PI / 2, 0, 0], [0.34, 0.28, 0.34]);          // kebuk pembakaran
      b.add('steel', G.torus, [x, y, -2.06], null, [0.18, 0.18, 0.6]);                  // leher
      b.add('steel', BELL(), [x, y, -2.1], [PI / 2, 0, 0], [0.6, 0.75, 0.6]);           // loceng
      b.add('hot', G.cyl, [x, y, -2.12], [PI / 2, 0, 0], [0.18, 0.02, 0.18]);
      b.add('hot', G.cyl, [x, y, -2.42], [PI / 2, 0, 0], [0.6, 0.01, 0.6]);
      seg(b, 'gold', G.cyl, [x + 0.15, y + 0.12, -1.8], [x + 0.2, y + 0.1, -2.12], 0.035);   // paip bahan api
    }
    for (const a of [PI / 4, -PI / 4, PI * 3 / 4, -PI * 3 / 4]) {
      b.add('steel', G.box, [Math.sin(a) * 0.95, 1.08 + Math.cos(a) * 0.95, -1.4], [0, 0, -a], [0.5, 0.06, 0.5]);
    }
    b.add('glass', G.box, [0, 1.62, 0.2], [-0.2, 0, 0], [0.8, 0.05, 0.55]);
  },

  /* ================= ALBATROSS (pusingan 2) =================
     Ekor-T dahulu terapung - kini sirip tegak tumbuh terus dari ekor badan. */
  glider(b, G) {
    b.add('darker', G.box, [0, 0.62, -0.2], null, [0.9, 0.24, 3.2]);
    b.add('body', G.cyl, [0, 1.0, -0.3], [PI / 2, 0, 0], [0.95, 3.6, 0.95]);
    b.add('body', G.sph, [0, 1.0, 1.5], null, [0.95, 0.95, 1.5]);
    b.add('body', G.cone, [0, 1.06, -2.95], [-PI / 2, 0, 0], [0.95, 1.8, 0.95]);
    b.add('glass', G.sph, [0, 1.35, 0.95], null, [0.7, 0.58, 1.45]);
    for (const sd of [-1, 1]) {
      b.add('body', G.box, [sd * 1.3, 1.45, -0.1], [0, sd * 0.06, sd * 0.04], [2.2, 0.1, 1.15]);
      b.add('body', G.box, [sd * 3.05, 1.55, -0.25], [0, sd * 0.12, sd * 0.06], [1.5, 0.08, 0.8]);
      b.add('crys', G.box, [sd * 2.2, 1.52, 0.42], [0, sd * 0.08, sd * 0.05], [3.4, 0.03, 0.05]);
      b.add('body', G.box, [sd * 3.82, 1.78, -0.35], [0, 0, sd * 0.35], [0.06, 0.5, 0.6]);
      b.add('head', G.sph, [sd * 3.82, 1.62, -0.02], null, [0.07, 0.07, 0.07]);
      b.add('dark', G.cyl, [sd * 1.75, 1.18, 0.0], [PI / 2, 0, 0], [0.42, 1.2, 0.42]);
      b.add('steel', G.torus, [sd * 1.75, 1.18, 0.6], null, [0.44, 0.44, 0.4]);
      b.add('crys', G.cyl, [sd * 1.75, 1.18, -0.62], [PI / 2, 0, 0], [0.3, 0.03, 0.3]);
      seg(b, 'dark', G.box, [sd * 1.75, 1.42, 0], [sd * 1.75, 1.3, 0], 0.1, 0.5);
    }
    b.add('body', G.box, [0, 1.15, -1.3], null, [0.5, 0.3, 1.2]);                     // tulang belakang ke ekor
    // sirip tegak: tapak lebar menyatu dengan ekor, hujung condong ke belakang
    seg(b, 'body', G.box, [0, 1.15, -2.55], [0, 2.35, -3.45], 0.09, 0.95);
    b.add('body', G.box, [0, 1.3, -2.7], null, [0.12, 0.35, 1.3]);                    // pangkal sirip
    b.add('body', G.box, [0, 2.38, -3.5], null, [2.0, 0.07, 0.55]);                    // penstabil atas
    b.add('crys', G.box, [0, 2.42, -3.28], null, [1.8, 0.02, 0.04]);
    slimLamp(b, G, 0, 0.92, 2.25, 0.4);
  },

  /* ================= RAMPART (pusingan 2) =================
     Perisai dahulu memotong rantai kereta kebal. Kini dipasang JAUH DI
     HADAPAN rantai pada dua lengan hidraulik, lebih rata, jadi logik: ia
     bajak di depan, rantai di belakangnya. */
  shieldwall(b, G) {
    b.add('darker', G.box, [0, 0.72, -0.4], null, [2.0, 0.5, 3.9]);
    b.add('body', G.rbox, [0, 1.2, -0.65], null, [2.1, 0.9, 3.1]);
    b.add('dark', G.rbox, [0, 1.75, -1.0], null, [1.4, 0.3, 1.5]);
    b.add('glass', G.box, [0, 1.8, -0.25], [-0.3, 0, 0], [1.1, 0.16, 0.04]);
    b.add('body', G.box, [0, 1.2, 1.0], [-0.5, 0, 0], [2.0, 0.2, 0.9]);               // glasis
    const CZ = 1.35, R = 2.15;
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.19, x = Math.sin(a) * R, z = CZ + Math.cos(a) * R;
      b.add('steel', G.box, [x, 1.25, z], [-0.12, a, 0], [0.42, 1.8, 0.16]);
      b.add('body', G.box, [x, 2.18, z - 0.08], [-0.12, a, 0], [0.43, 0.12, 0.3]);
      b.add('dark', G.box, [x, 0.38, z + 0.05], [-0.12, a, 0], [0.43, 0.16, 0.3]);      // bibir bawah
      if (i < 3) {
        const a2 = a + 0.095;
        b.add('crys', G.box, [Math.sin(a2) * (R + 0.08), 1.25, CZ + Math.cos(a2) * (R + 0.08)], [-0.12, a2, 0], [0.03, 1.6, 0.04]);
      }
    }
    b.add('gold', HG.hex, [0, 1.35, CZ + R + 0.08], [PI / 2 - 0.12, PI / 2, 0], [0.7, 0.08, 0.7]);
    b.add('crys', HG.hex, [0, 1.35, CZ + R + 0.12], [PI / 2 - 0.12, PI / 2, 0], [0.45, 0.06, 0.45]);
    for (const sd of [-1, 1]) {
      seg(b, 'dark', G.box, [sd * 0.55, 1.1, 0.7], [sd * 0.55, 1.2, CZ + R - 0.15], 0.24, 0.3);    // lengan
      seg(b, 'steel', G.cyl, [sd * 0.8, 1.5, 0.5], [sd * 0.75, 1.55, CZ + R - 0.3], 0.1);           // piston
      seg(b, 'dark', G.cyl, [sd * 0.8, 1.5, 0.5], [sd * 0.78, 1.53, 2.0], 0.17);
    }
    tails(b, G, [[-0.75, 1.05, -2.22], [0.75, 1.05, -2.22]]);
  },

  /* ================= STORMWING - pepatung kilat (Tether Storm) =================
     Pepatung dikemas: mata majmuk bercahaya, toraks berjalur, sayap lut
     sinar dengan URAT KILAT bercahaya, ekor bersegmen dengan gegelung di
     hujungnya (tempat arus tergantung). */
  dragonfly(b, G) {
    b.add('body', G.sph, [0, 1.1, 0.05], null, [1.5, 1.0, 1.9]);
    b.add('dark', G.torus, [0, 1.1, 0.05], [PI / 2, 0, 0], [1.45, 1.85, 0.25]);
    b.add('body', G.sph, [0, 1.05, 1.45], null, [1.3, 1.0, 1.1]);
    for (const sd of [-1, 1]) {
      b.add('glass', G.sph, [sd * 0.5, 1.22, 1.72], null, [0.72, 0.72, 0.72]);
      b.add('crys', G.sph, [sd * 0.55, 1.25, 1.95], null, [0.32, 0.32, 0.25]);
    }
    for (let i = 0; i < 7; i++) {
      const s = 0.62 - i * 0.06;
      b.add('body', G.sph, [0, 1.15 + i * 0.05, -1.05 - i * 0.46], null, [s, s, 0.6]);
      b.add('crys', G.torus, [0, 1.15 + i * 0.05, -1.3 - i * 0.46], null, [s * 0.9, s * 0.9, 0.25]);
    }
    for (let k = 0; k < 3; k++) b.add('steel', G.torus, [0, 1.5, -4.0 - k * 0.15], null, [0.4 - k * 0.08, 0.4 - k * 0.08, 0.5]);
    b.add('crys', G.sph, [0, 1.5, -4.4], null, [0.24, 0.24, 0.24]);
    for (const sd of [-1, 1]) for (const [z, ry, L] of [[0.45, 0.22, 3.2], [-0.45, -0.18, 3.0]]) {
      b.add('glass', G.box, [sd * 1.85, 1.62, z], [0, sd * ry, sd * 0.1], [L, 0.03, 0.72]);
      b.add('steel', G.box, [sd * 1.85, 1.64, z + 0.33], [0, sd * ry, sd * 0.1], [L, 0.05, 0.05]);
      b.add('crys', G.box, [sd * 1.85, 1.65, z], [0, sd * ry, sd * 0.1], [L * 0.85, 0.02, 0.04]);   // urat kilat
    }
  },

  /* ================= MIRAGE (pusingan 2) =================
     Hiperkar titisan air dengan KULIT HOLOGRAM lutsinar menyelubungi badan
     (umpan & ilusi), sayap belakang pada dua tiang prisma pemancar, kanard
     depan, salur sisi dan pemisah bilah. */
  hyper(b, G) {
    b.add('body', G.sph, [0, 0.74, -0.1], null, [2.05, 0.66, 4.9]);
    b.add('darker', G.box, [0, 0.46, 2.2], null, [1.95, 0.06, 0.55]);
    for (const x of [-0.6, 0, 0.6]) b.add('dark', G.box, [x, 0.44, 2.45], null, [0.04, 0.12, 0.4]);
    b.add('darker', G.box, [0, 0.48, -2.1], [0.25, 0, 0], [1.7, 0.08, 0.7]);
    for (let i = -2; i <= 2; i++) b.add('dark', G.box, [i * 0.3, 0.5, -2.2], [0.25, 0, 0], [0.04, 0.16, 0.6]);
    b.add('glass', G.sph, [0, 1.02, 0.15], null, [1.1, 0.5, 2.1]);
    for (let k = 0; k < 5; k++) b.add('ghost', G.torus, [0, 0.78, -1.6 + k * 0.8], null, [2.25 - Math.abs(k - 2) * 0.18, 0.85 - Math.abs(k - 2) * 0.06, 0.4]);   // gelang imbasan hologram
    b.add('crys', G.torus, [0, 0.74, -0.1], [PI / 2, 0, 0], [2.08, 4.95, 0.12]);        // garis pinggang
    for (const sd of [-1, 1]) {
      b.add('dark', G.box, [sd * 0.98, 0.72, 0.6], [0, sd * 0.12, 0], [0.12, 0.26, 0.8]);       // salur sisi
      b.add('steel', G.box, [sd * 0.99, 0.82, -0.6], [0, sd * 0.04, 0], [0.03, 0.05, 1.8]);
      b.add('body', G.box, [sd * 0.85, 0.62, 2.05], [0, sd * 0.4, sd * 0.15], [0.55, 0.05, 0.28]);  // kanard
      // tiang prisma + sayap
      b.add('dark', G.box, [sd * 0.62, 1.1, -1.85], [0.2, 0, 0], [0.08, 0.6, 0.4]);
      b.add('crys', HG.oct, [sd * 0.62, 1.48, -1.95], null, [0.2, 0.32, 0.2]);
      b.add('ghost', G.cone, [sd * 1.1, 1.0, -2.6], [PI / 2 + 0.6, 0, sd * 0.6], [0.5, 1.2, 0.5]);   // pancaran hologram
      b.add('head', G.box, [sd * 0.62, 0.8, 2.2], [0, sd * -0.2, 0], [0.42, 0.05, 0.08]);
    }
    b.add('body', G.box, [0, 1.42, -2.0], null, [1.9, 0.05, 0.42]);
    b.add('crys', G.box, [0, 1.45, -1.82], null, [1.7, 0.02, 0.03]);
    b.add('tail', G.box, [0, 0.84, -2.48], null, [1.6, 0.05, 0.04]);
  },

  /* ================= SOVEREIGN - limosin diraja (Drone Swarm) =================
     Kekal limosin. Bumbung belakang kini TELUK DRON: tiga dron pengiring
     berlabuh di landasan dengan lampu emas, menggantikan mahkota kecil. */
  limo(b, G) {
    b.add('darker', G.box, [0, 0.52, 0], null, [1.95, 0.3, 5.5]);
    b.add('body', G.rbox, [0, 0.8, 0], null, [1.95, 0.6, 5.7]);
    b.add('body', G.rbox, [0, 1.34, -0.25], null, [1.75, 0.58, 3.3]);
    b.add('glass', G.box, [0, 1.34, 1.42], [-0.55, 0, 0], [1.5, 0.52, 0.05]);
    for (const sd of [-1, 1]) {
      for (const z of [0.85, -0.2, -1.2]) b.add('glass', G.box, [sd * 0.88, 1.36, z], null, [0.04, 0.34, 0.85]);
      b.add('gold', G.box, [sd * 0.98, 0.84, 0], null, [0.03, 0.06, 5.5]);
      b.add('steel', G.cyl, [sd * 0.78, 1.25, 2.4], null, [0.04, 0.8, 0.04]);
      b.add('body', G.box, [sd * 0.94, 1.52, 2.4], null, [0.3, 0.22, 0.02]);
    }
    b.add('gold', G.box, [0, 0.82, 2.86], null, [1.1, 0.42, 0.05]);
    for (let i = -4; i <= 4; i++) b.add('darker', G.box, [i * 0.11, 0.82, 2.88], null, [0.03, 0.36, 0.03]);
    b.add('gold', G.sph, [0, 1.16, 2.62], null, [0.14, 0.2, 0.14]);
    // teluk dron di dek belakang
    b.add('dark', G.box, [0, 1.12, -2.25], null, [1.7, 0.1, 1.0]);
    for (const x of [-0.55, 0, 0.55]) {
      b.add('gold', G.box, [x, 1.2, -2.25], null, [0.42, 0.04, 0.9]);
      b.add('dark', G.rbox, [x, 1.36, -2.25], null, [0.38, 0.2, 0.55]);
      for (const sd of [-1, 1]) b.add('steel', G.torus, [x + sd * 0.2, 1.42, -2.25 + 0.2], [PI / 2, 0, 0], [0.22, 0.22, 0.3]);
      b.add('crys', G.sph, [x, 1.48, -2.05], null, [0.08, 0.08, 0.08]);
    }
    lamps(b, G, [[-0.72, 0.9, 2.85], [0.72, 0.9, 2.85]], 0.15);
    tails(b, G, [[-0.7, 0.95, -2.86], [0.7, 0.95, -2.86]]);
  },

  /* ================= TREMOR (pusingan 3) - PENGHENTAK SEISMIK =================
     Nabil: "faham apa kau cuba buat, tapi ubah sikit". Menara sangkar segi
     empat yang janggal diganti: SILINDER PANDU bulat (tiga rel) dengan DRAM
     GEMPA bulat bercahaya retak di dalamnya, dua piston hidraulik besar
     condong dari dek ke topi menara, kabin berperisai di tengah hadapan,
     casis berat bersudut, dan empat kaki penstabil terkangkang. */
  excavator(b, G) {
    b.add('darker', G.box, [0, 0.62, 0], null, [2.3, 0.35, 4.9]);
    b.add('body', G.rbox, [0, 1.05, -0.3], null, [2.35, 0.55, 4.1]);
    b.add('body', G.box, [0, 1.05, 1.95], [-0.45, 0, 0], [2.2, 0.3, 1.0]);            // hidung bersudut
    for (const sd of [-1, 1]) b.add('dark', G.box, [sd * 1.16, 1.05, -0.3], null, [0.08, 0.4, 3.8]);
    // kabin berperisai tengah hadapan
    b.add('body', HG.frust, [0, 1.62, 1.3], null, [1.3, 0.62, 1.0]);
    b.add('glass', G.box, [0, 1.68, 1.78], [-0.45, 0, 0], [0.95, 0.24, 0.04]);
    b.add('steel', G.box, [0, 1.98, 1.3], null, [0.95, 0.06, 0.7]);
    // menara pandu bulat
    const TZ = -0.75;
    b.add('dark', G.cyl, [0, 1.42, TZ], null, [1.9, 0.3, 1.9]);                         // gelang tapak
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + PI / 6;
      b.add('steel', G.box, [Math.cos(a) * 0.82, 2.45, TZ + Math.sin(a) * 0.82], [0, -a, 0], [0.14, 2.1, 0.2]);
    }
    b.add('dark', G.cyl, [0, 3.55, TZ], null, [1.9, 0.26, 1.9]);                         // topi
    b.add('steel', G.torus, [0, 3.55, TZ], [PI / 2, 0, 0], [0.98, 0.98, 0.35]);
    b.add('steel', G.cyl, [0, 3.3, TZ], null, [0.24, 0.5, 0.24]);                        // rod penghentak
    // dram gempa
    b.add('body', G.cyl, [0, 2.4, TZ], null, [1.35, 1.1, 1.35]);
    b.add('darker', G.cyl, [0, 2.97, TZ], null, [1.2, 0.06, 1.2]);
    for (const y of [2.05, 2.4, 2.75]) b.add('crys', G.torus, [0, y, TZ], [PI / 2, 0, 0], [0.69, 0.69, 0.18]);
    for (let i = 0; i < 6; i++) {                                                          // retakan menegak
      const a = i / 6 * TAU;
      b.add('crys', G.box, [Math.cos(a) * 0.68, 2.4, TZ + Math.sin(a) * 0.68], [0, -a, 0.25 * (i % 2 ? 1 : -1)], [0.02, 0.9, 0.05]);
    }
    b.add('crys', G.torus, [0, 0.4, TZ], [PI / 2, 0, 0], [2.0, 2.0, 0.3]);               // gelang gempa di tanah
    // piston hidraulik condong
    for (const sd of [-1, 1]) {
      seg(b, 'dark', G.cyl, [sd * 1.0, 1.35, 0.35], [sd * 0.8, 2.6, TZ + 0.15], 0.22);
      seg(b, 'steel', G.cyl, [sd * 0.85, 2.4, TZ + 0.2], [sd * 0.62, 3.5, TZ], 0.11);
    }
    // kaki penstabil terkangkang
    for (const sd of [-1, 1]) for (const z of [1.5, -2.1]) {
      const zf = z + (z > 0 ? 0.35 : -0.35);
      seg(b, 'body', G.box, [sd * 1.0, 1.0, z], [sd * 2.0, 0.5, zf], 0.26, 0.3);
      seg(b, 'steel', G.cyl, [sd * 1.1, 1.35, z], [sd * 1.8, 0.8, zf - (z > 0 ? 0.05 : -0.05)], 0.07);
      b.add('dark', G.cyl, [sd * 2.05, 0.15, zf + (z > 0 ? 0.03 : -0.03)], null, [0.7, 0.12, 0.7]);
      seg(b, 'dark', G.cyl, [sd * 2.0, 0.55, zf], [sd * 2.05, 0.18, zf], 0.12);
    }
    lamps(b, G, [[-0.7, 1.15, 2.42], [0.7, 1.15, 2.42]], 0.12);
    tails(b, G, [[-0.8, 1.1, -2.35], [0.8, 1.1, -2.35]]);
  },

  /* ================= TYPHOON - jentera angin (Twister) =================
     Pelat hitam rata di bawah dibuang. Kipas kini TURBIN sebenar: gelang
     salur tebal warna badan, 6 bilah berpusar, kon hab dan stator; badan
     berbentuk titisan dengan ekor penstabil V. */
  cyclone(b, G) {
    b.add('darker', G.rbox, [0, 0.7, -0.1], null, [1.4, 0.3, 4.0]);
    b.add('body', G.rbox, [0, 1.05, -0.3], null, [1.75, 0.78, 3.4]);
    b.add('body', G.sph, [0, 1.15, 1.35], null, [1.7, 1.1, 1.6]);
    b.add('glass', G.sph, [0, 1.48, 1.35], null, [1.2, 0.7, 1.25]);
    for (const sd of [-1, 1]) {
      const cx = sd * 1.55, cy = 1.75, cz = -0.5, tilt = sd * 0.42;
      b.add('body', G.torus, [cx, cy, cz], [0, 0, tilt], [2.55, 2.55, 0.9]);          // salur
      b.add('steel', G.torus, [cx, cy, cz], [0, 0, tilt], [2.75, 2.75, 0.25]);
      b.add('crys', G.torus, [cx, cy, cz], [0, 0, tilt], [2.35, 2.35, 0.2]);
      b.add('dark', G.cyl, [cx, cy, cz], [PI / 2, 0, tilt], [0.5, 0.5, 0.5]);
      b.add('steel', G.cone, [cx, cy, cz + 0.4], [PI / 2, 0, 0], [0.4, 0.35, 0.4]);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        b.add('glass', G.box, [cx + Math.cos(a + tilt) * 0.62, cy + Math.sin(a + tilt) * 0.62, cz], [0.5, 0, a + tilt], [0.95, 0.05, 0.32]);
      }
      seg(b, 'steel', G.cyl, [sd * 0.75, 1.3, cz], [cx - sd * 0.4, cy - 0.15, cz], 0.18);
      b.add('body', G.box, [sd * 0.45, 1.85, -2.1], [0, 0, sd * 0.6], [0.08, 0.9, 0.7]);   // ekor V
    }
    lamps(b, G, [[-0.55, 0.92, 2.1], [0.55, 0.92, 2.1]], 0.12);
    tails(b, G, [[-0.6, 1.1, -2.0], [0.6, 1.1, -2.0]]);
  },

  /* ================= BLAZE - relau penyedut (Backdraft) =================
     Mulut relau kini SALUR PENYEDUT bulat dengan bilah dalam (udara
     disedut masuk sebelum dinyalakan), belos kulit di sisi, cerobong
     berkembar kemas (tanda "stacks" dibuang supaya tiada empat cerobong). */
  forge(b, G) {
    b.add('darker', G.box, [0, 0.72, 0], null, [2.0, 0.5, 4.8]);
    b.add('body', G.rbox, [0, 1.3, -0.55], null, [2.2, 1.0, 3.1]);
    b.add('dark', G.rbox, [0, 1.25, 1.55], [0.1, 0, 0], [2.0, 0.95, 1.4]);
    b.add('steel', G.torus, [0, 1.25, 2.28], null, [1.55, 1.55, 0.7]);                 // salur penyedut
    b.add('hot', G.cyl, [0, 1.25, 2.24], [PI / 2, 0, 0], [1.28, 0.05, 1.28]);
    for (let i = 0; i < 6; i++) b.add('dark', G.box, [0, 1.25, 2.3], [0, 0, i / 6 * PI], [1.3, 0.05, 0.06]);
    b.add('steel', G.cone, [0, 1.25, 2.42], [PI / 2, 0, 0], [0.3, 0.25, 0.3]);
    for (const sd of [-1, 1]) {
      // belos
      for (let k = 0; k < 4; k++) b.add(k % 2 ? 'rust' : 'dark', G.box, [sd * 1.2, 1.25 + (k - 1.5) * 0.18, -0.5], [0, 0, sd * 0.15], [0.32 - Math.abs(k - 1.5) * 0.04, 0.12, 1.6]);
      b.add('steel', G.box, [sd * 1.18, 1.6, -0.5], [0, 0, sd * 0.15], [0.36, 0.05, 1.7]);
      // cerobong
      b.add('dark', G.cyl, [sd * 0.6, 2.2, -1.55], null, [0.42, 1.3, 0.42]);
      b.add('steel', G.torus, [sd * 0.6, 2.82, -1.55], [PI / 2, 0, 0], [0.32, 0.32, 0.12]);
      b.add('hot', G.cyl, [sd * 0.6, 2.86, -1.55], null, [0.3, 0.06, 0.3]);
    }
    b.add('glass', G.rbox, [0, 1.92, 0.25], null, [1.2, 0.36, 0.8]);
    b.add('hot', G.box, [0, 0.95, -1.9], null, [1.6, 0.06, 0.6]);                       // bara belakang
    lamps(b, G, [[-0.84, 1.75, 2.15], [0.84, 1.75, 2.15]], 0.11);
    tails(b, G, [[-0.82, 1.3, -2.12], [0.82, 1.3, -2.12]]);
  },

  /* ================= FLY - lalat (Vanish) =================
     Bola hitam bersepah dikemas: mata majmuk bersegi dengan kilauan aksen,
     toraks berbulu (duri halus), perut berjalur, sayap lut sinar dengan
     URAT dan rangka. Pemasangan kaki dibina oleh LIMB legs6. */
  housefly(b, G) {
    b.add('darker', G.sph, [0, 0.95, 1.55], null, [1.5, 1.3, 1.3]);                    // kepala
    b.add('body', G.sph, [0, 1.08, 0.15], null, [2.0, 1.6, 1.95]);                     // toraks
    b.add('body', G.sph, [0, 0.98, -1.75], null, [1.75, 1.35, 2.5]);                   // perut
    for (let i = 0; i < 4; i++) b.add('crys', G.torus, [0, 0.98, -1.05 - i * 0.55], [PI / 2, 0, 0], [0.86 - i * 0.07, 0.86 - i * 0.07, 0.08]);
    for (let i = 0; i < 10; i++) {                                                      // bulu toraks
      const a = (i / 9 - 0.5) * 2.2;
      b.add('dark', G.cone, [Math.sin(a) * 0.75, 1.78 + Math.cos(a) * 0.05, 0.15 + (i % 2) * 0.4 - 0.2], [-0.3, 0, -a * 0.5], [0.05, 0.3, 0.05]);
    }
    for (const sd of [-1, 1]) {
      b.add('darker', G.sph, [sd * 0.62, 1.15, 2.0], null, [0.9, 0.95, 0.85]);              // mata majmuk
      b.add('crys', G.ico1, [sd * 0.66, 1.16, 2.06], null, [0.92, 0.98, 0.88]);
      b.add('hot', G.sph, [sd * 0.78, 1.2, 2.42], null, [0.14, 0.14, 0.08]);
      b.add('steel', G.cyl, [sd * 0.25, 1.45, 2.45], [0.7, 0, sd * 0.3], [0.05, 0.6, 0.05]);   // sungut
      b.add('crys', G.sph, [sd * 0.35, 1.68, 2.72], null, [0.08, 0.08, 0.08]);
      // sayap dengan urat
      const wx = sd * 1.9, wy = 1.85, wz = -0.5, rot = [0, sd * 0.34, sd * -0.22];
      b.add('glass', G.box, [wx, wy, wz], rot, [3.2, 0.03, 1.3]);
      b.add('steel', G.box, [wx, wy + 0.02, wz - 0.6], rot, [3.2, 0.05, 0.05]);
      for (const k of [-0.25, 0.15]) b.add('crys', G.box, [wx, wy + 0.02, wz + k], rot, [2.9, 0.02, 0.03]);
    }
    b.add('steel', G.cone, [0, 0.98, -3.05], [-PI / 2, 0, 0], [0.3, 0.4, 0.3]);
  },

  /* ================= HAMVOG - pelantar kepungan (Siege) =================
     Dikemas: badan panjang bersegi dengan panel perisai bertingkat, MATA
     SENSOR penembak tepat yang besar di hidung, sirip penyejuk, dan jalur
     lampu bersih. Engsel lengan kekal di tempat sama (setDeploy). */
  hamvog(b, G) {
    b.add('darker', G.box, [0, 0.6, 0], null, [1.9, 0.34, 5.6]);
    b.add('body', G.rbox, [0, 0.98, 0.1], null, [1.8, 0.56, 4.9]);
    b.add('body', G.box, [0, 1.1, 2.55], [-0.3, 0, 0], [1.55, 0.3, 1.1]);
    b.add('body', G.rbox, [0, 1.02, -2.45], [0.22, 0, 0], [1.6, 0.46, 0.9]);
    b.add('dark', G.rbox, [0, 1.38, 0.35], null, [1.1, 0.34, 2.2]);
    for (let i = 0; i < 5; i++) b.add('steel', G.box, [0, 1.58, -0.4 + i * 0.32], null, [0.9, 0.05, 0.08]);   // sirip penyejuk
    b.add('glass', G.rbox, [0, 1.5, 1.35], [0.28, 0, 0], [0.82, 0.26, 0.7]);
    // mata sensor besar
    b.add('dark', G.cyl, [0, 1.15, 3.0], [PI / 2, 0, 0], [0.75, 0.3, 0.75]);
    b.add('steel', G.torus, [0, 1.15, 3.16], null, [0.72, 0.72, 0.5]);
    b.add('crys', G.cyl, [0, 1.15, 3.16], [PI / 2, 0, 0], [0.5, 0.05, 0.5]);
    b.add('head', G.sph, [0, 1.15, 3.2], null, [0.16, 0.16, 0.06]);
    for (const sd of [-1, 1]) {
      b.add('dark', G.rbox, [sd * 0.98, 0.95, 0], null, [0.22, 0.5, 1.9]);
      b.add('body', G.box, [sd * 0.85, 1.28, 1.5], [0, 0, sd * 0.3], [0.32, 0.06, 1.6]);   // panel bertingkat
      b.add('body', G.box, [sd * 0.85, 1.28, -1.55], [0, 0, sd * 0.3], [0.32, 0.06, 1.3]);
      b.add('crys', G.box, [sd * 0.91, 1.05, -1.6], null, [0.04, 0.05, 1.3]);
      b.add('crys', G.box, [sd * 0.91, 1.05, 1.6], null, [0.04, 0.05, 1.0]);
      b.add('steel', G.cyl, [sd * 0.95, 1.05, -0.2], null, [0.56, 0.42, 0.56]);
      slimLamp(b, G, sd * 0.55, 0.92, 3.0, 0.32);
    }
    tails(b, G, [[-0.6, 1.05, -2.9], [0.6, 1.05, -2.9]]);
  },

  /* ================= KEFLY - pembawa dron (Strike Drone) =================
     Dek kini memaparkan DRON SERANG berlabuh di atas landasan pelancar
     (bukan tiub kosong), menara kawalan kecil dengan radar, dan petak dek
     bertanda. */
  carrier(b, G) {
    b.add('darker', G.box, [0, 0.58, 0], null, [2.32, 0.4, 5.0]);
    b.add('body', G.rbox, [0, 1.0, -0.25], null, [2.42, 0.78, 4.3]);
    b.add('body', G.rbox, [0, 0.96, 2.05], [0.26, 0, 0], [2.14, 0.66, 1.5]);
    b.add('steel', G.box, [0, 1.24, 2.62], [0.26, 0, 0], [1.9, 0.3, 0.1]);
    b.add('dark', G.box, [0, 1.42, -0.6], null, [2.0, 0.06, 3.2]);                     // dek
    for (let i = 0; i < 6; i++) b.add('crys', G.box, [0, 1.46, 0.85 - i * 0.55], null, [0.08, 0.02, 0.25]);   // garis tengah dek
    for (const sd of [-1, 1]) {
      b.add('body', G.rbox, [sd * 1.15, 1.55, -0.6], null, [0.24, 0.4, 3.4]);
      b.add('steel', G.box, [sd * 1.15, 1.77, -0.6], null, [0.3, 0.05, 3.4]);
      // dron berlabuh atas landasan
      for (const z of [0.3, -1.3]) {
        b.add('steel', G.box, [sd * 0.5, 1.5, z], [-0.15, 0, 0], [0.5, 0.06, 1.2]);
        b.add('dark', G.rbox, [sd * 0.5, 1.72, z], [-0.15, 0, 0], [0.32, 0.22, 0.85]);
        b.add('dark', G.box, [sd * 0.5, 1.74, z - 0.1], [-0.15, 0, 0], [1.0, 0.04, 0.28]);
        b.add('crys', G.cone, [sd * 0.5, 1.78, z + 0.5], [PI / 2 - 0.15, 0, 0], [0.16, 0.3, 0.16]);
        b.add('hot', G.cyl, [sd * 0.5, 1.68, z - 0.45], [PI / 2 - 0.15, 0, 0], [0.12, 0.03, 0.12]);
      }
    }
    // menara kawalan
    b.add('body', G.rbox, [0.75, 1.95, 1.35], null, [0.7, 0.9, 0.9]);
    b.add('glass', G.box, [0.75, 2.15, 1.82], null, [0.58, 0.26, 0.04]);
    b.add('steel', HG.hemi, [0.75, 2.4, 1.35], null, [0.5, 0.4, 0.5]);                // kubah radar
    b.add('crys', G.torus, [0.75, 2.42, 1.35], [PI / 2, 0, 0], [0.5, 0.5, 0.3]);
    b.add('glass', G.rbox, [-0.35, 1.62, 1.9], [0.3, 0, 0], [1.0, 0.42, 0.5]);
    b.add('dark', G.rbox, [0, 1.28, -2.42], null, [2.0, 0.66, 0.6]);
    b.add('hot', G.box, [0, 1.28, -2.74], null, [1.5, 0.16, 0.05]);
    lamps(b, G, [[-0.74, 0.92, 2.78], [0.74, 0.92, 2.78]], 0.15);
    tails(b, G, [[-0.78, 1.32, -2.75], [0.78, 1.32, -2.75]]);
  },
};

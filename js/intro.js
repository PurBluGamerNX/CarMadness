// intro.js — urutan pembukaan permainan.
//
//   1. skrin muat: logo + kereta kecil berpusing (menunjukkan ia sedang muat)
//   2. bila semuanya siap: skrin menjadi gelap
//   3. kereta terakhir yang dipakai masuk dari tepi kanan ke tengah, berhenti
//   4. barulah antara muka garaj muncul
//
// Kereta yang sama digunakan sepanjang urutan - ia hanya berpindah daripada
// kanvas kecil pada skrin muat ke pentas garaj, jadi tiada kereta kedua dibina
// dan peralihan nampak berterusan.
import { Save } from './core.js';
import { Preview } from './preview.js';
import { getLoadout } from './cars.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const raf = () => new Promise(r => requestAnimationFrame(r));
const easeOut = t => 1 - Math.pow(1 - t, 3);

export const Intro = {
  el: null,

  build() {
    const d = document.createElement('div');
    d.id = 'intro';
    d.innerHTML = `
      <div class="in-logo"><img src="img/logo.webp" alt="Car Madness"></div>
      <div class="in-stage"></div>
      <div class="in-bar"><i></i></div>
      <div class="in-txt">LOADING</div>`;
    document.body.appendChild(d);
    this.el = d;
    this.slot = d.querySelector('.in-stage');
    this.bar = d.querySelector('.in-bar i');
    this.txt = d.querySelector('.in-txt');
    return d;
  },

  setProgress(p, label) {
    if (this.bar) this.bar.style.width = Math.round(p * 100) + '%';
    if (label && this.txt) this.txt.textContent = label;
  },

  /**
   * @param UI     modul UI
   * @param onLoad kerja berat yang perlu disiapkan semasa skrin muat dipapar
   */
  async run(UI, onLoad) {
    const d = this.build();
    await raf();
    d.classList.add('on');

    const carId = Save.d.car || 'ranger';
    const t0 = performance.now();

    // ---- fasa 1: muat, dengan kereta berpusing dalam kanvas kecil ----
    this.setProgress(0.12, 'STARTING ENGINE');
    await raf();
    Preview.init();
    if (Preview.canvas) {
      this.slot.appendChild(Preview.canvas);
      Preview.show(carId, getLoadout(carId), 'box');
      Preview.start();
    }
    this.setProgress(0.45, 'BUILDING GARAGE');
    await raf(); await raf();

    if (onLoad) { try { await onLoad(); } catch (e) { void e; } }
    this.setProgress(0.85, 'WARMING UP');

    // pastikan skrin muat sempat dilihat walaupun mesin sangat pantas
    const MIN = 1500;
    const left = MIN - (performance.now() - t0);
    if (left > 0) await wait(left);
    this.setProgress(1, 'READY');
    await wait(260);

    // ---- fasa 2: gelap ----
    d.classList.add('dark');
    await wait(420);

    // ---- fasa 3: kereta memandu masuk dari tepi kanan ----
    UI.show('garage', true);
    if (UI.g) UI.g.introMode = true;
    const cv = Preview.canvas;
    const host = document.getElementById('stageCv');
    if (cv && host && cv.parentNode !== host) host.appendChild(cv);
    Preview.show(carId, getLoadout(carId), 'stage');
    Preview.start();
    document.getElementById('garagePanel').classList.add('intro-hide');
    document.getElementById('s-garage').classList.add('introbg');
    d.classList.add('clear');            // buang logo, kekalkan latar gelap
    await raf();

    const DUR = 2200;                     // masuk dari kiri, berhenti di tengah
    const start = performance.now();
    Preview.driveIn = 1;
    await new Promise(done => {
      const step = now => {
        const t = Math.max(0, Math.min(1, (now - start) / DUR));
        // masuk dari luar skrin di kanan, perlahan sampai berhenti di tengah
        Preview.driveIn = 1 - easeOut(t);
        if (t < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    Preview.driveIn = 0;

    // ---- fasa 4: antara muka garaj masuk ----
    d.classList.remove('dark');
    document.getElementById('garagePanel').classList.remove('intro-hide');
    document.getElementById('s-garage').classList.remove('introbg');
    if (UI.g) UI.g.introMode = false;
    UI.renderGarage();
    await wait(420);
    d.remove();
    this.el = null;
  },
};

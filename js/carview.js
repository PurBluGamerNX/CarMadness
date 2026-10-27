// carview.js — paparan kereta skrin penuh dari garaj (Inventory & Car Store).
// Butang VIEW pada pratonton kecil membukanya. Kanvas Preview yang SAMA
// dipindahkan ke sini (bukan renderer kedua), info kereta terapung di sekeliling,
// anak panah kiri/kanan (atau kekunci) bertukar kereta dalam senarai yang sama,
// dan BACK memulangkan kanvas ke panel garaj.
import { Preview } from './preview.js';
import { CAR_BY, ABILITY, slotMulOf, getLoadout } from './cars.js';
import { WBY } from './weapons.js';
import { Save, Sfx, fmt } from './core.js';
import { carHpShown } from './scale.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const CarView = {
  el: null, list: [], i: 0, ui: null, store: false,

  open(ui, ids, id, store) {
    this.ui = ui; this.list = ids.slice(); this.store = !!store;
    this.i = Math.max(0, this.list.indexOf(id));
    if (!this.el) this.build();
    this.el.classList.add('on');
    document.body.classList.add('cv-open');
    Preview.init();
    if (Preview.canvas) this.el.querySelector('.cv-stage').appendChild(Preview.canvas);
    Preview.onFrame = null;
    this.show();
    Preview.start();
    Sfx.ui();
  },

  get isOpen() { return !!(this.el && this.el.classList.contains('on')); },

  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('on');
    document.body.classList.remove('cv-open');
    const ui = this.ui;
    ui.selCar = this.list[this.i];
    Sfx.ui();
    ui.renderGarage();           // kanvas dipulangkan ke kotak pratonton kecil
    const sel = document.querySelector('.card.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  },

  nav(d) {
    if (this.list.length < 2) return;
    this.i = (this.i + d + this.list.length) % this.list.length;
    Sfx.ui();
    this.show(d);
  },

  build() {
    const el = document.createElement('div');
    el.id = 'carview';
    el.innerHTML = `
      <div class="cv-stage"></div>
      <div class="cv-vignette"></div>
      <button class="cv-back" title="Back">&#8592; BACK</button>
      <div class="cv-count"></div>
      <div class="cv-head"><div class="cv-role"></div><h1 class="cv-name"></h1><div class="cv-price"></div></div>
      <div class="cv-float cv-ab"></div>
      <div class="cv-float cv-about"></div>
      <div class="cv-float cv-stats"></div>
      <div class="cv-float cv-sig"></div>
      <button class="cv-arrow l" title="Previous car">&#10094;</button>
      <button class="cv-arrow r" title="Next car">&#10095;</button>
      <div class="cv-hint">DRAG TO ROTATE · &#8592; &#8594; TO BROWSE</div>`;
    document.body.appendChild(el);
    this.el = el;
    el.querySelector('.cv-back').onclick = () => this.close();
    el.querySelector('.cv-arrow.l').onclick = () => this.nav(-1);
    el.querySelector('.cv-arrow.r').onclick = () => this.nav(1);
    addEventListener('keydown', e => {
      if (!this.isOpen) return;
      const k = e.code;
      if (k === 'ArrowLeft' || k === 'KeyA') { this.nav(-1); e.preventDefault(); e.stopPropagation(); }
      else if (k === 'ArrowRight' || k === 'KeyD') { this.nav(1); e.preventDefault(); e.stopPropagation(); }
      else if (k === 'Escape' || k === 'Backspace') { this.close(); e.preventDefault(); e.stopPropagation(); }
    }, true);
    // leret di telefon juga menukar kereta (leret pendek & laju sahaja - seret perlahan = putar)
    let sx = 0, st = 0;
    el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; st = performance.now(); }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if (performance.now() - st < 260 && Math.abs(dx) > 70) this.nav(dx < 0 ? 1 : -1);
    }, { passive: true });
  },

  show(dir) {
    const id = this.list[this.i], c = CAR_BY[id];
    if (!c) return;
    const ab = ABILITY[c.ability];
    const q = s => this.el.querySelector(s);
    const owned = Save.d.cars.includes(id);
    const acc = (c.spec && c.spec.accent) || '#57d6ff';
    this.el.style.setProperty('--cv', acc);

    Preview.show(id, owned && !this.store ? getLoadout(id) : [], 'view');
    Preview.spin = 0.55; Preview.userSpun = false;

    q('.cv-count').textContent = `${this.i + 1} / ${this.list.length}`;
    q('.cv-role').textContent = c.role || '';
    q('.cv-name').textContent = c.name;
    q('.cv-price').innerHTML = Save.d.car === id ? '<b class="in">IN USE</b>'
      : owned ? '<b class="own">OWNED</b>' : `<b>${fmt(c.price)}</b> coins`;

    const dur = ab.chargeInfo ? `${ab.charges} charges` : ab.charges ? '10s per link' : ab.dur > 1e5 ? 'toggle' : ab.dur >= 1 ? `${ab.dur}s` : 'instant';
    q('.cv-ab').innerHTML = `<div class="cv-h">ABILITY</div>
      <div class="cv-abn">${esc(ab.name)}</div>
      <div class="cv-t">${esc(ab.desc)}</div>
      <div class="cv-kv"><span>${ab.charges ? 'Charges' : 'Cooldown'}</span><b>${ab.charges ? ab.charges : ab.cd + 's'}</b></div>
      <div class="cv-kv"><span>Active</span><b>${dur}</b></div>`;

    q('.cv-about').innerHTML = `<div class="cv-h">ABOUT</div><div class="cv-t">${esc(c.desc)}</div>
      ${c.good ? `<div class="cv-t cv-good"><b>Best for</b> ${esc(c.good)}</div>` : ''}`;

    const m = c.mods || {};
    const hp = Math.round(150 + (m.hp || 0) * 1.5);
    const bars = [
      ['HP', carHpShown(hp, c.id), hp / 290],
      ['Speed', Math.round((m.speed || 1) * 100) + '%', ((m.speed || 1) - 0.6) / 0.65],
      ['Handling', Math.round((m.grip || 1) * 100) + '%', ((m.grip || 1) - 0.7) / 0.55],
      ['Ram', Math.round((m.ram || 1) * 100) + '%', ((m.ram || 1) - 0.7) / 1.0],
      ['Nitro', Math.round((m.nitro || 1) * 100) + '%', ((m.nitro || 1) - 0.7) / 0.55],
    ];
    q('.cv-stats').innerHTML = `<div class="cv-h">PERFORMANCE</div>` + bars.map(([k, v, f]) =>
      `<div class="cv-bar"><span>${k}</span><i><u style="width:${Math.round(Math.max(0.06, Math.min(1, f)) * 100)}%"></u></i><b>${v}</b></div>`).join('')
      + `<div class="cv-kv"><span>Weapon slots</span><b>${c.slots}</b></div>
         <div class="cv-kv"><span>Damage per weapon</span><b>×${slotMulOf(c.id).toFixed(2)}</b></div>`;

    const sw = c.sigWeapon && WBY[c.sigWeapon];
    const sig = q('.cv-sig');
    sig.style.display = sw ? '' : 'none';
    if (sw) sig.innerHTML = `<div class="cv-h">SIGNATURE WEAPON</div>
      <div class="cv-abn">${esc(sw.name)} <i>${esc(sw.tag)}</i></div>
      <div class="cv-t">+${Math.round((sw.sigBonus || 0.15) * 100)}% damage when mounted on ${esc(c.name)}.</div>`;

    // animasi masuk: kad info meluncur dari arah navigasi
    this.el.classList.remove('cv-in-l', 'cv-in-r', 'cv-in');
    void this.el.offsetWidth;
    this.el.classList.add(dir < 0 ? 'cv-in-l' : dir > 0 ? 'cv-in-r' : 'cv-in');
  },
};

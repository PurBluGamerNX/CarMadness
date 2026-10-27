// training.js — PADANG LATIHAN (2026-10-18, permintaan Nabil: "testing field,
// boleh test kereta dan weapon"). Arena lapang dengan sasaran dummy yang tidak
// mati (HP diisi semula), meter DPS, dan panel SETUP untuk mencuba MANA-MANA
// kereta & senjata pada mana-mana tahap - termasuk yang belum dibeli.
//
// Tiada apa yang disimpan: pilihan latihan tinggal dalam Game.test (bukan Save),
// tiada syiling / skrap / misi / bunuhan direkodkan.
import { makeEnemy, disposeEnemy } from './enemies.js';
import { CARS, CAR_BY } from './cars.js';
import { WEAPONS, WBY, MAX_LV } from './weapons.js';
import { Save, Sfx, clamp } from './core.js';
import { U } from './scale.js';

const DUMMY_HP = 30000;
const KINDS = [
  { k: 'brute', n: 'BRUTE' }, { k: 'soldier', n: 'SOLDIER' }, { k: 'tank', n: 'TANK' },
  { k: 'drone', n: 'DRONE (FLYING)' }, { k: 'hulk', n: 'HULK' },
];
const MODES = { still: 'STILL', moving: 'MOVING', fight: 'FIGHT BACK' };

/* pilihan lalai: kereta & senjata semasa pemain */
export function defaultTest() {
  const car = CAR_BY[Save.d.car] ? Save.d.car : 'ranger';
  const n = CAR_BY[car].slots || 2;
  const lo = ((Save.d.loadout || {})[car] || []).slice(0, n);
  while (lo.length < n) lo.push(null);
  if (!lo.some(Boolean)) lo[0] = 'mg';
  // from = kereta garaj semasa pilihan ini dibuat; bila garaj bertukar, pilihan latihan dijana semula
  return { car, from: Save.d.car, weapons: lo, lv: 10, god: true, ammo: true, fastAb: true, targets: 'still' };
}

export class Training {
  constructor(g, UI) {
    this.g = g; this.UI = UI;
    if (!g.test || g.test.from !== Save.d.car) g.test = defaultTest();
    this.T = g.test;
    this.dummies = [];
    this.pend = [];
    this.log = [];          // [masa, damage] untuk DPS
    this.total = 0; this.peak = 0; this.hudT = 0;
    const p = g.player;
    p.x = 0; p.z = -26; p.ang = 0;
    for (let i = 0; i < KINDS.length; i++) this.spawn(i);
    this.buildHud();
    document.getElementById('hud').classList.add('trainmode');
    UI.banner('TRAINING FIELD', '#7dffb0');
    UI.toast('Press T (or the SETUP button) to change car, weapons and targets');
  }

  home(i) { return { x: (i - 2) * 11, z: -2 + (i % 2) * 9 }; }

  spawn(i) {
    const g = this.g, h = this.home(i), K = KINDS[i];
    const e = makeEnemy(g, K.k, h.x, h.z, 6);
    e.hp = e.maxHp = DUMMY_HP; e.lastHp = DUMMY_HP;
    e.dummy = i; e.homeX = h.x; e.homeZ = h.z;
    g.enemies.push(e);
    this.dummies[i] = e;
    return e;
  }

  /* dipanggil dari killEnemy: kira baki HP sebagai damage, muncul semula 1s */
  onKill(e) {
    this.addDmg(Math.max(0, e.lastHp || 0));
    disposeEnemy(this.g, e);
    this.g.fx.explode(e.x, 1, e.z, 4, [1.4, 1.0, 0.5]);
    this.pend.push({ i: e.dummy, t: 1 });
  }

  addDmg(d) { if (d > 0) { this.total += d; this.log.push([this.g.time, d]); } }

  update(dt) {
    const g = this.g, T = this.T, p = g.player;
    for (const e of this.dummies) {
      if (!e || e.dead) continue;
      this.addDmg(Math.max(0, e.lastHp - e.hp));
      if (e.hp < e.maxHp * 0.25) e.hp = e.maxHp;                // tidak pernah mati
      e.lastHp = e.hp;
      if (T.targets === 'still') {
        e.x = e.homeX; e.z = e.homeZ; e.vx = 0; e.vz = 0;
        e.lockT = Math.max(e.lockT || 0, 0.25);                   // tidak bergerak, tidak menembak
        if (e.mesh) e.mesh.position.set(e.x, e.mesh.position.y, e.z);
      } else if (T.targets === 'moving') {
        e.shootCd = Math.max(e.shootCd || 0, 0.5); e.atkCd = Math.max(e.atkCd || 0, 0.5);   // bergerak tetapi tidak menyerang
      }
    }
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const q = this.pend[i];
      q.t -= dt;
      if (q.t <= 0) { this.pend.splice(i, 1); this.spawn(q.i); }
    }
    if (T.ammo) for (const s of g.slots || []) if (s) { s.mag = s.st.mag; s.reload = 0; s.heat = 0; s.over = false; }
    if (T.fastAb && p.abCd > 1) p.abCd = 1;
    if (T.fastAb && p.iceN !== undefined && p.iceN < 3 && p.iceT > 1) p.iceT = 1;   // cas Freezo pulih 1s
    if (T.god) { p.hp = p.maxHp; }
    // DPS: purata 3 saat terakhir
    while (this.log.length && g.time - this.log[0][0] > 3) this.log.shift();
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.2;
      const dps = this.log.reduce((a, x) => a + x[1], 0) / 3;
      this.peak = Math.max(this.peak, dps);
      const el = document.getElementById('trDps');
      if (el) el.innerHTML = `<b>${Math.round(dps * U).toLocaleString()}</b><small>DPS (3s)</small><i>PEAK ${Math.round(this.peak * U).toLocaleString()} · TOTAL ${Math.round(this.total * U).toLocaleString()}</i>`;
    }
  }

  respawnPlayer() {
    const g = this.g, p = g.player;
    p.x = 0; p.z = -26; p.ang = 0; p.vx = p.vz = 0; p.y = 0; p.fly = 0;
    p.hp = p.maxHp; p.dead = false; p.iframe = 1.5;
    g.car.root.visible = true;
    if (g.reticle) g.reticle.visible = true;
    g.state = 'play';
    this.UI.hudOn(true);
    Sfx.startEngine();
  }

  /* ---------------- HUD & panel SETUP ---------------- */
  buildHud() {
    if (!document.getElementById('trStyle')) {
      const st = document.createElement('style');
      st.id = 'trStyle';
      st.textContent = `
#trHud{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center;pointer-events:auto;z-index:6}
#trDps{background:rgba(10,14,20,.78);border:1px solid rgba(125,255,176,.45);border-radius:12px;padding:6px 16px;text-align:center;min-width:170px}
#trDps b{display:block;font-size:24px;color:#7dffb0;letter-spacing:.05em}#trDps small{font-size:10px;letter-spacing:.2em;color:#cfe0f0}
#trDps i{display:block;font-style:normal;font-size:10px;color:#8a97a8;letter-spacing:.1em}
#trBtns{display:flex;flex-direction:column;gap:6px}
#trBtns button{background:rgba(10,14,20,.8);color:#e6edf5;border:1px solid rgba(255,255,255,.2);border-radius:9px;padding:7px 14px;font:600 12px inherit;letter-spacing:.12em;cursor:pointer}
#trBtns button:hover{border-color:#7dffb0}
#trPanel{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(4,6,10,.62);z-index:70;pointer-events:auto}
#trPanel.hidden{display:none}
#trPanel .tp{background:#0f141b;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:18px 20px;width:min(560px,94vw);max-height:92vh;overflow-y:auto;color:#e6edf5}
#trPanel h3{margin:0 0 12px;letter-spacing:.24em;font-size:15px;color:#7dffb0}
#trPanel label{display:block;font-size:11px;letter-spacing:.16em;color:#8a97a8;margin:10px 0 4px}
#trPanel select,#trPanel input[type=range]{width:100%;background:#151b24;color:#e6edf5;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:7px}
#trPanel .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
#trPanel .tg{flex:1;min-width:120px;background:#151b24;border:1px solid rgba(255,255,255,.16);border-radius:9px;padding:8px;color:#cfe0f0;font-size:11px;letter-spacing:.1em;cursor:pointer}
#trPanel .tg.on{border-color:#7dffb0;color:#7dffb0;background:rgba(125,255,176,.08)}
#trPanel .acts{display:flex;gap:10px;margin-top:16px}
#trPanel .acts button{flex:1;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:#151b24;color:#e6edf5;font-weight:700;letter-spacing:.14em;cursor:pointer}
#trPanel .acts button.go{background:#1f6b46;border-color:#7dffb0}
#hud.trainmode .wave-box,#hud.trainmode #enemyLeft{visibility:hidden}`;
      document.head.appendChild(st);
    }
    let h = document.getElementById('trHud');
    if (!h) { h = document.createElement('div'); h.id = 'trHud'; document.getElementById('hud').appendChild(h); }
    h.innerHTML = `<div id="trDps"><b>0</b><small>DPS (3s)</small><i>PEAK 0 · TOTAL 0</i></div>
      <div id="trBtns"><button id="trSetup">SETUP (T)</button><button id="trReset">RESET DPS</button></div>`;
    h.querySelector('#trSetup').onclick = () => this.openPanel();
    h.querySelector('#trReset').onclick = () => { this.log = []; this.total = 0; this.peak = 0; Sfx.ui(); };
    this.keyFn = ev => { if (ev.code === 'KeyT' && !ev.repeat) { this.panelOpen ? this.closePanel() : this.openPanel(); } };
    addEventListener('keydown', this.keyFn);
  }

  openPanel() {
    const T = this.T, draft = JSON.parse(JSON.stringify(T));
    let p = document.getElementById('trPanel');
    if (!p) { p = document.createElement('div'); p.id = 'trPanel'; document.body.appendChild(p); }
    const carOpts = CARS.slice().sort((a, b) => a.name.localeCompare(b.name))
      .map(c => `<option value="${c.id}">${c.name} · ${c.role} · ${c.slots} slot</option>`).join('');
    const wOpts = '<option value="">— empty —</option>' + WEAPONS.slice().sort((a, b) => a.name.localeCompare(b.name))
      .map(w => `<option value="${w.id}">${w.name}${w.sigCar && CAR_BY[w.sigCar] ? ' (' + CAR_BY[w.sigCar].name + ')' : ''}</option>`).join('');
    const render = () => {
      const n = (CAR_BY[draft.car] || CARS[0]).slots || 2;
      while (draft.weapons.length < n) draft.weapons.push(null);
      draft.weapons.length = n;
      p.innerHTML = `<div class="tp"><h3>TRAINING SETUP</h3>
        <label>CAR (any car - owned or not)</label><select id="tpCar">${carOpts}</select>
        ${draft.weapons.map((w, i) => `<label>SLOT ${i + 1}</label><select data-slot="${i}">${wOpts}</select>`).join('')}
        <label>WEAPON LEVEL: <b id="tpLvT">${draft.lv}</b> (Mark ${Math.ceil(draft.lv / 5)})</label><input id="tpLv" type="range" min="1" max="${MAX_LV}" value="${draft.lv}">
        <label>TARGETS</label><div class="row">${Object.entries(MODES).map(([k, v]) => `<button class="tg${draft.targets === k ? ' on' : ''}" data-tg="${k}">${v}</button>`).join('')}</div>
        <label>OPTIONS</label><div class="row">
          <button class="tg${draft.god ? ' on' : ''}" data-op="god">NO DAMAGE TO YOU</button>
          <button class="tg${draft.ammo ? ' on' : ''}" data-op="ammo">INFINITE AMMO</button>
          <button class="tg${draft.fastAb ? ' on' : ''}" data-op="fastAb">1s ABILITY COOLDOWN</button></div>
        <div class="acts"><button id="tpClose">CLOSE</button><button class="go" id="tpGo">APPLY &amp; RESTART</button></div></div>`;
      p.querySelector('#tpCar').value = draft.car;
      p.querySelector('#tpCar').onchange = ev => { draft.car = ev.target.value; Sfx.ui(); render(); };
      p.querySelectorAll('[data-slot]').forEach(s => { s.value = draft.weapons[+s.dataset.slot] || ''; s.onchange = () => { draft.weapons[+s.dataset.slot] = s.value || null; }; });
      const lv = p.querySelector('#tpLv');
      lv.oninput = () => { draft.lv = +lv.value; p.querySelector('#tpLvT').textContent = draft.lv; };
      p.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { draft.targets = b.dataset.tg; Sfx.ui(); render(); });
      p.querySelectorAll('[data-op]').forEach(b => b.onclick = () => { draft[b.dataset.op] = !draft[b.dataset.op]; Sfx.ui(); render(); });
      p.querySelector('#tpClose').onclick = () => this.closePanel();
      p.querySelector('#tpGo').onclick = () => {
        // sasaran & pilihan boleh ditukar serta-merta; kereta/senjata perlukan mula semula
        const restart = draft.car !== T.car || draft.lv !== T.lv || draft.weapons.join() !== T.weapons.join();
        Object.assign(T, draft);
        this.closePanel();
        if (restart) this.g.startRun('training');
        else Sfx.buy();
      };
    };
    render();
    p.classList.remove('hidden');
    this.panelOpen = true;
    if (this.g.state === 'play') { this.g.state = 'trpause'; this._wasPlay = true; }   // beku tanpa skrin pause
  }

  closePanel() {
    const p = document.getElementById('trPanel');
    if (p) p.classList.add('hidden');
    this.panelOpen = false;
    if (this._wasPlay && this.g.state === 'trpause') this.g.state = 'play';
    this._wasPlay = false;
  }

  dispose() {
    removeEventListener('keydown', this.keyFn);
    const h = document.getElementById('trHud'); if (h) h.remove();
    const p = document.getElementById('trPanel'); if (p) p.remove();
    document.getElementById('hud').classList.remove('trainmode');
  }
}

/* senapang ujian: senarai slot daripada pilihan latihan (bukan Save) */
export function testSlots(T, makeSlot) {
  return T.weapons.map(id => (id && WBY[id]) ? makeSlot(id, clamp(T.lv, 1, MAX_LV), []) : null);
}

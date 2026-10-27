// ui.js — menu, garaj, HUD
import { Save, Sfx, fmt, clamp, roman } from './core.js';
import { Econ, Inv, WORKSHOP_CAP, WORKSHOP_RATE, fmtTime, sellPrice, SELL_UP_RATE } from './econ.js';
import {
  WEAPONS, WBY, weaponStats, CAR_UPS, carUpCost, carStats, MAX_LV, PER_MARK,
  markOf, isMarkGate, levelCostScrap, markCostCoin, rerollCost, REROLL_MAX, REROLL_LOCK_MS,
} from './weapons.js';
import { PERK_BY, MARK_COLOR, MARK_NAME, rollOptions } from './perks.js';
import { CarView } from './carview.js';
import { CARS, CAR_BY, ABILITY, slotsOf, upMaxOf, getLoadout, getCarUp, slotMulOf } from './cars.js';
import { Preview } from './preview.js';
import { level, progress, carLevel, carLocked, seedXp, MAX_LV as P_MAX } from './level.js';
import { U, fU, carHpShown, hpScale, playerL } from './scale.js';
import { Touch } from './touch.js';
import { MODES } from './enemies.js';
import { Missions } from './missions.js';
import { TEAM_MODES } from './team.js';
import { MAPS, MAP_ORDER } from './maps.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const money = n => (Econ.dev() ? '∞' : fmt(n));

const MODE_ART = {
  zombie: 'linear-gradient(160deg,#2a1c12,#6b3a1e 45%,#c2662a)',
  alien: 'linear-gradient(160deg,#16062c,#3d1160 45%,#a13bcf)',
  war: 'linear-gradient(160deg,#2a2a1e,#6b6242 45%,#c7b27a)',
  chaos: 'linear-gradient(160deg,#0d1018,#2a2f3d 45%,#8f3030)',
  tdm: 'linear-gradient(160deg,#0b1a33,#1f4c8a 45%,#b8323a)',
  beacon: 'linear-gradient(160deg,#0f1f2a,#236a7a 45%,#e0b24a)',
  escort: 'linear-gradient(135deg,#1c140c,#6a4320 40%,#2c4a6e 75%,#7fc4ff)',
  training: 'repeating-linear-gradient(90deg,#0f1a14 0 18px,#132519 18px 36px),linear-gradient(160deg,#0f1a14,#1f6b46)',
};
/* padang latihan (training.js) - kad mod sendiri */
const TRAINING_MODE = { training: { name: 'Training Field', desc: 'Try any car and any weapon at any level - even ones you have not bought - on target dummies with a live DPS meter. Nothing is saved.' } };
const MODE_ACCENT = { zombie: '#ff9a3f', alien: '#c58bff', war: '#e3cf92', chaos: '#ff6b6b', tdm: '#6fb6ff', beacon: '#ffd257', escort: '#ffb23f', training: '#7dffb0' };
function wIcon(w, col) {
  const c = col || '#9aa4b0';
  const g = (inner) => `<svg viewBox="0 0 90 44" width="104" height="50">${inner}</svg>`;
  const body = `<rect x="16" y="17" width="34" height="13" rx="3" fill="${c}" opacity=".85"/>`;
  const grip = `<rect x="22" y="29" width="9" height="10" rx="2" fill="${c}" opacity=".5"/>`;
  switch (w.type) {
    case 'beam':
      return g(`${body}${grip}<rect x="50" y="20" width="16" height="7" rx="2" fill="${c}"/>
        <polygon points="66,15 84,23.5 66,32" fill="${c}" opacity=".95"/>`);
    case 'chain':
      return g(`${body}${grip}<rect x="50" y="21" width="22" height="5" rx="2" fill="${c}"/>
        ${[0, 1, 2].map(i => `<circle cx="${56 + i * 8}" cy="23.5" r="6" fill="none" stroke="${c}" stroke-width="2"/>`).join('')}
        <circle cx="80" cy="23.5" r="4" fill="${c}"/>`);
    case 'rocket':
      return g(`<rect x="14" y="12" width="30" height="22" rx="4" fill="${c}" opacity=".7"/>${grip}
        ${[0, 1].map(i => `<rect x="44" y="${14 + i * 12}" width="32" height="7" rx="3" fill="${c}"/>`).join('')}`);
    case 'flame':
      return g(`<rect x="10" y="13" width="18" height="20" rx="6" fill="${c}" opacity=".6"/>${grip}
        <rect x="28" y="20" width="34" height="7" rx="3" fill="${c}"/>
        <polygon points="62,15 82,23.5 62,32" fill="${c}" opacity=".8"/>`);
    case 'orbit':
      return g(`${body}${grip}<circle cx="68" cy="23.5" r="12" fill="none" stroke="${c}" stroke-width="3"/>
        ${[0, 1, 2, 3, 4, 5].map(i => {
          const a = i / 6 * Math.PI * 2;
          return `<rect x="${(68 + Math.cos(a) * 12 - 2).toFixed(1)}" y="${(23.5 + Math.sin(a) * 12 - 2).toFixed(1)}" width="4" height="4" rx="1" fill="${c}"/>`;
        }).join('')}
        <circle cx="68" cy="23.5" r="3" fill="${c}"/>`);
    case 'charge':
      return g(`${body}${grip}<rect x="46" y="15" width="38" height="4" rx="2" fill="${c}"/>
        <rect x="46" y="27" width="38" height="4" rx="2" fill="${c}"/>
        <rect x="52" y="21" width="26" height="4" rx="2" fill="${c}" opacity=".6"/>`);
    default:
      return g(`${body}${grip}<rect x="50" y="21" width="${w.id === 'sniper' ? 36 : 26}" height="5" rx="2" fill="${c}"/>
        ${w.base.pellets > 1 ? `<rect x="50" y="15" width="18" height="4" rx="2" fill="${c}" opacity=".6"/>` : ''}`);
  }
}

const STAT_MAX = { dmg: 900, dps: 2600, rof: 40, mag: 700, range: 260, reload: 4.4 };

/* Peranan kereta -> peranan senjata yang paling masuk akal dipadankan.
   Digunakan untuk kotak "RECOMMENDED WEAPONS" pada setiap kereta. */
const CAR_WANT = {
  'ALL-ROUNDER': ['BURST', 'CROWD', 'PRECISION'],
  'TANK': ['BRAWLER', 'CROWD', 'AREA'],
  'HEALER': ['SUSTAIN', 'SUPPORT', 'CROWD'],
  'TRAPPER': ['CONTROL', 'AREA', 'BLAST'],
  'ABSORBER': ['BRAWLER', 'SUSTAIN', 'CROWD'],
  'MOBILITY': ['BURST', 'PRECISION', 'HOMING'],
  'ESCAPE': ['PRECISION', 'BURST', 'SIEGE'],
  'AIR SUPPORT': ['SIEGE', 'BLAST', 'HOMING'],
  'AIR SUSTAIN': ['SUSTAIN', 'HOMING', 'PRECISION'],
  'BURST': ['BURST', 'SIEGE', 'BLAST'],
  'DEFENCE': ['CONTROL', 'AREA', 'CROWD'],
  'BRAWLER': ['BRAWLER', 'SUSTAIN', 'CROWD'],
  'SHIELD BRAWLER': ['BRAWLER', 'CROWD', 'SUSTAIN'],
  'RAMMER': ['BRAWLER', 'CROWD', 'AREA'],
  'FIREPOWER': ['SIEGE', 'BLAST', 'PRECISION'],
  'CONTROL': ['CONTROL', 'AREA', 'CROWD'],
  'LOCKDOWN': ['CONTROL', 'SINGLE TARGET', 'CHAIN'],
  'FORTRESS': ['SIEGE', 'PRECISION', 'LINE'],
  'SUMMONER': ['HOMING', 'SUSTAIN', 'SUPPORT'],
  'SLAM': ['CROWD', 'AREA', 'BRAWLER'],
  'STEALTH': ['PRECISION', 'BURST', 'SIEGE'],
  'STRIKE': ['PRECISION', 'HOMING', 'SIEGE'],
  'SUPPORT': ['SUPPORT', 'SUSTAIN', 'CONTROL'],
  'SURVIVOR': ['SUSTAIN', 'BRAWLER', 'CROWD'],
  'ZONE': ['AREA', 'CONTROL', 'CROWD'],
  'AURA': ['CROWD', 'AREA', 'CHAIN'],
  'CHAIN BURST': ['CHAIN', 'BURST', 'CROWD'],
  'COVER': ['LINE', 'CONTROL', 'CROWD'],
  'DECOY': ['TRICK', 'CONTROL', 'BURST'],
  'DIVE': ['BRAWLER', 'BURST', 'CROWD'],
  'GLASS CANNON': ['SIEGE', 'PRECISION', 'BURST'],
  'FIGHTER': ['BURST', 'BRAWLER', 'SINGLE TARGET'],
  'ASSASSIN': ['BURST', 'PRECISION', 'BRAWLER'],
  'CONTROLLER': ['CONTROL', 'AREA', 'BURST'],
  'ARTILLERY': ['SIEGE', 'CHAIN', 'PRECISION'],
  'TRICKSTER': ['TRICK', 'CONTROL', 'BURST'],
};

function suggestWeapons(c, n = 3) {
  // role = kategori (6 sahaja, Nabil 2026-10-18); style = gaya terperinci lama untuk cadangan senjata
  const want = CAR_WANT[c.style] || CAR_WANT[c.role] || ['BURST', 'CROWD', 'PRECISION'];
  const modes = c.modes || [];
  const tier = Math.max(3000, (c.price || 12000) / 3.2);
  return WEAPONS.map(w => {
    let s = 0;
    const i = want.indexOf(w.role);
    if (i >= 0) s += 60 - i * 14;
    s += (w.modes || []).filter(m => modes.includes(m)).length * 13;
    s -= Math.abs(Math.log((w.price || 1500) / tier)) * 9;   // tahap kuasa setanding
    if ((Save.d.inv[w.id] || 0) > 0) s += 8;                 // sedikit keutamaan pada yang dimiliki
    if (w.sigCar === c.id) s += 1000;                         // senjata tandatangan sentiasa pertama
    return { w, s };
  }).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.w);
}

export const UI = {
  overMenu: true, tab: 'garage', view: 'stage', sub: 'inv', slot: 0, selW: null, selCar: null, g: null,

  init(game) {
    this.g = game;
    this.e = {
      hud: $('hud'), overlay: $('overlay'), loading: $('loading'),
      wave: $('waveNum'), coin: $('coinHud'), scrap: $('scrapHud'), score: $('scoreHud'),
      hpFill: $('hpFill'), hpText: $('hpText'), hpBar: $('hpBar'), nitro: $('nitroFill'),
      wpnList: $('wpnList'), powers: $('powers'),
      abBox: $('abilityBox'), abName: $('abName'), abFill: $('abFill'), abState: $('abState'),
      banner: $('banner'), toast: $('toastEl'), nextIn: $('nextIn'), enemyLeft: $('enemyLeft'),
      vig: $('vignette'), low: $('lowhp'), arrows: $('edgeArrows'), dev: $('devBadge'),
      bossWrap: $('bossWrap'), bossName: $('bossName'), bossFill: $('bossFill'),
      gCoin: $('garageCoin'), gScrap: $('garageScrap'),
      garageList: $('garageList'), garageSide: $('garageSide'),
    };
    this.vigT = 0;
    this.arrowPool = [];

    $('b-play').onclick = () => { Sfx.ui(); this.show('modes'); };
    $('b-garage').onclick = () => { Sfx.ui(); this.view = 'stage'; this.show('garage', true); };
    $('b-help').onclick = () => { Sfx.ui(); this.back = 'title'; this.show('help'); };
    $('b-settings').onclick = () => { Sfx.ui(); this.back = 'title'; this.show('settings'); };
    $('b-modes-back').onclick = () => { Sfx.ui(false); this.show('garage', true); };
    $('b-help-back').onclick = () => { Sfx.ui(false); this.show(this.back === 'settings' ? 'settings' : (this.back || 'garage'), true); };
    $('b-settings-back').onclick = () => { Sfx.ui(false); this.show(this.back || 'garage', true); };
    $('b-garage-back').onclick = () => {
      Sfx.ui(false);
      // dalam sub-paparan (inventori/kedai) butang ini kembali ke garaj 3D dahulu
      if (!['stage', 'workshop', 'missions'].includes(this.view)) return this.go('stage');
      if (game.world && game.state === 'garage') game.resume();
    };
    $('b-garage-go').onclick = () => {
      // dalam paparan kereta/senjata butang ini menjadi Buy / Equip / Use,
      // kerana butang di dalam panel yang menatal terlalu susah dicapai
      if (this.footAct) { this.footAct(); return; }
      Sfx.ui();
      if (game.world && game.state === 'garage') game.resume(); else this.show('modes');
    };
    $('b-resume').onclick = () => { Sfx.ui(); game.resume(); };
    $('b-pause-garage').onclick = () => { Sfx.ui(); game.openGarage(false); };
    $('b-pause-help').onclick = () => { Sfx.ui(); this.back = 'pause'; this.show('help'); };
    $('b-quit').onclick = () => { Sfx.ui(false); game.quitToMenu(); };
    $('b-retry').onclick = () => { Sfx.ui(); this.startMode(game.mode); };
    // tamatkan perlawanan dengan betul: buang dunia, bot dan lapisan hitam "MATCH OVER"
    $('b-over-garage').onclick = () => { Sfx.ui(); game.quitToMenu(); };
    $('b-over-menu').onclick = () => { Sfx.ui(false); game.quitToMenu(); };

    this.initGarage();

    $('qSeg').querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        Save.d.quality = b.dataset.q; Save.save(); this.syncSettings(); Sfx.ui();
        game.applyQuality && game.applyQuality();
        game.setupComposer();
        this.toastNow('Quality changed - restart the run for the full effect');
      };
    });
    $('aaSeg').querySelectorAll('button').forEach(b => {
      b.onclick = () => { Save.d.aimAssist = b.dataset.a; Save.save(); this.syncSettings(); Sfx.ui(); };
    });
    $('volRange').oninput = e => { Save.d.vol = e.target.value / 100; Sfx.setVol(Save.d.muted ? 0 : Save.d.vol); Save.save(); };
    $('muteBtn').onclick = () => { Save.d.muted = !Save.d.muted; Sfx.muted = Save.d.muted; Sfx.setVol(Save.d.muted ? 0 : Save.d.vol); Save.save(); this.syncSettings(); };
    $('resetBtn').onclick = () => {
      if (!confirm('Reset all coins, scrap, weapons, cars and records?')) return;
      Save.reset(); this.selCar = 'ranger'; this.view = 'stage';
      this.syncSettings(); this.renderGarage(); this.buildModes(); this.syncDev();
    };
    // butang rahsia kedua: klik logo 5 kali di skrin tajuk
    /* Butang rahsia: ketik tajuk "GARAGE" lima kali. Dahulu ia pada logo
       skrin tajuk, tetapi skrin itu sudah dibuang - dan ketikan berfungsi
       pada telefon, tidak seperti Ctrl+Alt+D. */
    const secret = $('gTitle');
    if (secret) {
      let n = 0, t0 = 0;
      secret.style.cursor = 'default';
      secret.style.webkitUserSelect = 'none';
      secret.style.userSelect = 'none';
      secret.onclick = () => {
        const now = Date.now();
        if (now - t0 > 1200) n = 0;
        t0 = now; n++;
        if (n >= 5) {
          n = 0;
          const on = Econ.toggleDev();
          this.syncDev();
          this.toastNow(on ? 'DEVELOPER MODE: ON - unlimited money' : 'DEVELOPER MODE: OFF');
          this.renderGarage();
          Sfx.buy();
        }
      };
    }
    this.syncSettings();
    this.syncDev();
    this.buildModes();
    this.selCar = Save.d.car || 'ranger';
  },

  syncSettings() {
    $('qSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.q === Save.d.quality));
    $('aaSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.a === (Save.d.aimAssist || 'med')));
    $('volRange').value = Math.round(Save.d.vol * 100);
    $('muteBtn').classList.toggle('on', !!Save.d.muted);
    $('muteBtn').textContent = Save.d.muted ? 'Mute: ON' : 'Mute';
    Sfx.muted = !!Save.d.muted;
  },

  syncDev() { this.e.dev.classList.toggle('hidden', !Econ.dev()); },

  /* ---------------- skrin ---------------- */
  show(name, fromMenu) {
    /* #tcAim menutup 58% skrin dengan pointer-events:auto. Kalau kawalan
       sentuh kekal hidup semasa menu terbuka, ia menelan setiap sentuhan di
       sebelah kanan - itulah sebab panel maklumat garaj tidak boleh ditatal. */
    Touch.show(!name);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    if (name) {
      const s = $('s-' + name);
      if (s) s.classList.add('on');
      this.overMenu = true;
      this.e.overlay.classList.remove('off');
      if (name === 'garage') { this.fromMenu = !!fromMenu; this.view = 'stage'; this.upOpen = false; this.renderGarage(); }
      else { Preview.stop(); Preview.onFrame = null; }
      if (name === 'modes') this.buildModes();
    } else {
      this.overMenu = false;
      this.e.overlay.classList.add('off');
      Preview.stop();
    }
  },

  hudOn(b) { this.e.hud.classList.toggle('hidden', !b); Touch.show(b); },

  buildModes() {
    const list = $('modeList');
    list.innerHTML = '';
    const wins = Save.d.teamWins || {};
    const cats = [
      { title: 'WAVE SURVIVAL', sub: 'Hold out against endless waves', keys: Object.keys(MODES), src: MODES },
      { title: 'TEAM BATTLE · 5 VS 5', sub: 'You + 4 bot teammates against 5 enemy bots · pick a map', keys: Object.keys(TEAM_MODES), src: TEAM_MODES },
      { title: 'TRAINING', sub: 'Test any car and weapon on dummy targets - nothing is saved', keys: ['training'], src: TRAINING_MODE },
    ];
    for (const cat of cats) {
      list.appendChild(el('div', 'mode-cat', `<b>${cat.title}</b><span>${cat.sub}</span>`));
      if (cat.src === TEAM_MODES) {
        /* pemilih peta (2026-10-17): Dead Valley + 3 peta baharu, disimpan dalam Save.d.teamMap */
        const cur = Save.d.teamMap === 'random' || MAPS[Save.d.teamMap] ? Save.d.teamMap : 'valley';
        const row = el('div', 'map-pick');
        const RND = { name: 'Random', size: '?', desc: 'A different map every match.' };
        for (const id of MAP_ORDER.concat('random')) {
          const M = MAPS[id] || RND;
          const b = el('button', id === cur ? 'on' : '', `<b>${M.name.toUpperCase()}</b>${MAPS[id] ? `<em>${M.size}m</em>` : ''}<i>${M.desc}</i>`);
          b.onclick = () => { Sfx.ui(); Save.d.teamMap = id; Save.save(); this.buildModes(); };
          row.appendChild(b);
        }
        list.appendChild(row);
      }
      for (const key of cat.keys) this.modeCard(list, key, cat.src[key], cat.src === TEAM_MODES, wins);
    }
  },

  modeCard(list, key, M, team, wins) {
    {
      const locked = key === 'chaos' && !Save.d.chaosUnlocked && !Econ.dev();
      const c = el('button', 'mode' + (locked ? ' locked' : ''));
      c.style.setProperty('--accent', MODE_ACCENT[key]);
      const best = Save.d.best[key] || 0;
      c.innerHTML = `
        <div class="art" style="background:${MODE_ART[key]}"></div>
        <h3>${M.name}</h3>
        <p>${M.desc}</p>
        <div class="foot"><span>${key === 'training' ? 'ANY CAR' : team ? (M.map ? '5 VS 5 · OWN MAP' : '5 VS 5') : key === 'chaos' ? 'ENDLESS' : 'WAVES'}</span><span>${key === 'training' ? 'DPS METER' : team ? 'WINS ' + (wins[key] || 0) : 'BEST ' + best}</span></div>
        ${locked ? `<div class="lock">LOCKED<br><span style="opacity:.7">${M.locked}</span></div>` : ''}`;
      const art = c.querySelector('.art');
      for (let i = 0; i < 9; i++) {
        const d = el('div');
        d.style.cssText = `position:absolute;border-radius:${i % 3 ? '50%' : '3px'};
          left:${Math.random() * 100}%;top:${Math.random() * 100}%;
          width:${6 + Math.random() * 26}px;height:${6 + Math.random() * 26}px;
          background:rgba(255,255,255,${0.05 + Math.random() * 0.12});
          transform:rotate(${Math.random() * 90}deg)`;
        art.appendChild(d);
      }
      if (!locked) c.onclick = () => this.startMode(key);
      list.appendChild(c);
    }
  },

  startMode(mode) {
    Sfx.ui();
    this.show(null);
    this.e.loading.classList.remove('hidden');
    requestAnimationFrame(() => setTimeout(() => {
      this.g.startRun(mode);
      this.e.loading.classList.add('hidden');
    }, 60));
  },

  /* ================ GARAJ ================
     Paparan:
       stage     — kereta 3D + label senjata, butang Inventory / Upgrade Car
       cars      — inventori kereta (sub: inv / store)
       weapons   — senjata untuk satu slot (sub: inv / store)
       workshop  — bengkel skrap
       missions  — misi harian & utama
     Nav atas (Garage / Workshop / Missions) hanya kelihatan pada paparan peringkat atas. */
  initGarage() {
    this.view = 'stage'; this.sub = 'inv'; this.slot = 0; this.upOpen = false;
    document.querySelectorAll('#gNav .tab').forEach(t => {
      t.onclick = () => { Sfx.ui(); this.go(t.dataset.view); };
    });
    document.querySelectorAll('#gSub .tab').forEach(t => {
      t.onclick = () => {
        if (this.sub === t.dataset.sub) return;
        Sfx.ui(); this.sub = t.dataset.sub; this.selW = null; this.selCar = null;
        this.renderGarage();
      };
    });
    $('gBack').onclick = () => { Sfx.ui(false); this.go('stage'); };
    $('gSet').onclick = () => { Sfx.ui(); this.back = 'garage'; this.show('settings'); };
    $('b-set-help').onclick = () => { Sfx.ui(); this.back = 'settings'; this.show('help'); };
    // pelaras zum kamera (telefon sahaja - desktop guna roda tetikus)
    const zr = $('zoomRange');
    if (zr) {
      zr.value = Math.round((Save.d.zoomMul || 1) * 100);
      $('zoomVal').textContent = zr.value + '%';
      zr.oninput = () => {
        Save.d.zoomMul = zr.value / 100;
        $('zoomVal').textContent = zr.value + '%';
        Save.save();
      };
    }
    $('bInv').onclick = () => {
      // kereta hanya boleh ditukar di luar perlawanan - keluar perlawanan dahulu
      if (this.g.world) { Sfx.deny(); this.toastNow('Leave the match to change cars'); return; }
      Sfx.ui(); this.upOpen = false; this.sub = 'inv'; this.selCar = Save.d.car; this.go('cars');
    };
    $('bUp').onclick = () => { Sfx.ui(); this.upOpen = !this.upOpen; this.renderStage(); };
  },

  go(view) {
    this.view = view;
    if (view !== 'stage') this.upOpen = false;
    this.closeTags();
    this.renderGarage();
  },

  renderGarage() {
    if (!$('s-garage').classList.contains('on')) return;
    Econ.workshopTick();
    this.e.gCoin.textContent = money(Save.d.coins);
    this.e.gScrap.textContent = money(Save.d.scrap);
    seedXp();
    { const P = progress(), lv = $('garageLv'), xb = $('garageXp');
      if (lv) lv.textContent = P.lv;
      if (xb) xb.textContent = P.lv >= P_MAX ? 'MAX LEVEL' : `LEVEL · ${fmt(P.cur)}/${fmt(P.need)} XP`;
      const bar = $('garageXpBar'); if (bar) bar.style.width = Math.round(P.k * 100) + '%'; }
    const top = this.view === 'stage' || this.view === 'workshop' || this.view === 'missions';
    const panel = $('garagePanel');
    panel.classList.toggle('v-stage', this.view === 'stage');
    // Inventory / Upgrade Car hanya bermakna pada pentas garaj
    const stage = this.view === 'stage';
    // tiada menu tajuk lagi - Back hanya berguna bila ada tempat untuk kembali
    $('b-garage-back').classList.toggle('hidden', stage && !(this.g.world && this.g.state === 'garage'));
    $('bInv').classList.toggle('hidden', !stage);
    $('bInv').classList.toggle('locked', !!this.g.world);
    $('bInv').title = this.g.world ? 'Leave the match to change cars' : '';
    $('bUp').classList.toggle('hidden', !stage);
    $('bUp').classList.toggle('on', stage && !!this.upOpen);
    $('gNav').classList.toggle('hidden', !top);
    $('gSub').classList.toggle('hidden', top);
    $('gBack').classList.toggle('hidden', top);
    document.querySelectorAll('#gNav .tab').forEach(t => t.classList.toggle('on', t.dataset.view === this.view));
    document.querySelectorAll('#gSub .tab').forEach(t => t.classList.toggle('on', t.dataset.sub === this.sub));
    const ready = Missions.ready();
    $('misBadge').textContent = ready;
    $('misBadge').classList.toggle('hidden', !ready);

    const inRun = this.g.world && this.g.state === 'garage';
    this.footAct = null;
    const go = $('b-garage-go');
    go.textContent = inRun ? 'Resume' : 'Play';
    go.disabled = false;
    go.className = 'btn primary';
    $('b-garage-back').textContent = top ? 'Back' : 'Back to Garage';

    const titles = {
      stage: 'GARAGE', workshop: 'WORKSHOP', missions: 'MISSIONS',
      cars: this.sub === 'store' ? 'CAR STORE' : 'MY CARS',
      weapons: (this.sub === 'store' ? 'WEAPON STORE' : 'MY WEAPONS') + ` · SLOT ${this.slot + 1}`,
    };
    $('gTitle').textContent = titles[this.view];

    const L = this.e.garageList, S = this.e.garageSide;
    L.innerHTML = ''; S.innerHTML = '';
    L.style.gridTemplateColumns = '';
    if (this.view === 'stage') return this.renderStage();
    if (this.view === 'cars') return this.renderCars(L, S);
    if (this.view === 'weapons') return this.renderWeapons(L, S);
    Preview.stop();
    if (this.view === 'missions') return this.renderMissions(L, S);
    return this.renderWorkshop(L, S);
  },

  /* Tetapkan tindakan utama pada bar bawah (tempat butang Play).
     label = teks, fn = null bermakna butang dimatikan (contoh: sudah dimiliki). */
  setFoot(label, fn, ghost) {
    const b = $('b-garage-go');
    b.textContent = label;
    b.disabled = !fn;
    b.className = 'btn ' + (ghost ? 'ghost' : 'primary');
    this.footAct = fn || null;
  },

  markPips(lv, mark) {
    const inMark = lv - (mark - 1) * PER_MARK;
    return `<div class="pips">${Array.from({ length: PER_MARK }, (_, i) =>
      `<div class="pip${i < inMark ? ' on' : ''}" ${i < inMark ? `style="background:${MARK_COLOR[mark - 1]};box-shadow:0 0 8px ${MARK_COLOR[mark - 1]}88"` : ''}></div>`).join('')}</div>`;
  },

  /* ---------------- pentas 3D utama ---------------- */
  renderStage() {
    const carId = Save.d.car || 'ranger';
    const c = CAR_BY[carId] || CAR_BY.ranger;
    const ab = ABILITY[c.ability];
    const lo = getLoadout(carId);
    const cs = carStats(getCarUp(carId), c.mods);

    Preview.init();
    if (Preview.canvas && Preview.canvas.parentNode !== $('stageCv')) $('stageCv').appendChild(Preview.canvas);
    Preview.show(carId, lo, 'stage');
    Preview.start();

    $('stageInfo').innerHTML = `
      <h3>${c.name.toUpperCase()}</h3>
      <div class="ab clamp" onclick="this.classList.toggle('clamp')" title="Tap to read all"><b style="color:${ab.color}">${ab.name.toUpperCase()}</b> · ${ab.desc}
        <span style="opacity:.6"> · ${ab.charges ? ab.charges + ' charges' : ab.cd + 's cooldown'}</span></div>
      <div class="st">
        <div>HP<em>${carHpShown(cs.maxHp, carId)}</em></div>
        <div>ARMOUR<em>${({ light: 'Light', mid: 'Medium', heavy: 'Heavy' })[(c.spec || {}).armor] || 'Medium'}${cs.dmgTake < 0.995 ? ` −${Math.round((1 - cs.dmgTake) * 100)}%` : ''}</em></div>
        <div>SPEED<em>${Math.round(cs.speed * 100)}%</em></div>
        <div>SLOTS<em>${c.slots}</em></div>
        <div>WEAPON DMG<em>×${slotMulOf(carId).toFixed(2)}</em></div>
      </div>
      ${lo.slice(0, c.slots).some(Boolean) ? '' : '<div class="nowpn">NO WEAPONS MOUNTED - tap a slot to add one</div>'}`;

    // label senjata untuk setiap slot
    const tags = $('stageTags');
    tags.innerHTML = '';
    this.tagEls = [];
    for (let i = 0; i < c.slots; i++) {
      const id = lo[i], w = id ? WBY[id] : null;
      const lv = id ? (Save.d.lv[id] || 1) : 0, mk = markOf(Math.max(1, lv));
      const t = el('div', 'wtag' + (w ? '' : ' empty'));
      if (w) t.style.borderLeftColor = MARK_COLOR[mk - 1];
      t.innerHTML = w
        ? `<div class="s">SLOT ${i + 1}</div><div class="n">${w.name}</div>
           <div class="l" style="color:${MARK_COLOR[mk - 1]}">${MARK_NAME[mk - 1]} · LV ${lv}</div>
           ${Save.d.pending[id] ? '<i class="dot" title="Power ready to pick"></i>' : ''}`
        : `<div class="s">SLOT ${i + 1}</div><div class="n">+ Empty slot</div><div class="l" style="color:var(--dim)">TAP TO MOUNT</div>`;
      t.onclick = () => this.openSlot(i);
      tags.appendChild(t);
      this.tagEls.push({ el: t, empty: !w, x: null, y: null });
    }
    Preview.onFrame = () => this.layoutTags();

    $('bUp').classList.toggle('on', this.upOpen);
    this.renderDrawer();
  },

  closeTags() { Preview.onFrame = null; $('stageTags').innerHTML = ''; $('stageLines').innerHTML = ''; this.tagEls = []; },

  // letak label di tepi kiri/kanan kereta dan lukis garisan ke titik pasang
  layoutTags() {
    if (!this.tagEls || !this.tagEls.length || this.view !== 'stage') return;
    const box = $('gStage');
    /* Laci naik taraf terbuka: label senjata tidak relevan dan, pada skrin
       sempit, menindih maklumat kereta - sorok sepenuhnya sehingga ditutup. */
    box.classList.toggle('tags-off', !!this.upOpen);
    if (this.upOpen) return;
    const W = box.clientWidth, H = box.clientHeight;
    const cx = W * 0.5;
    const pts = this.tagEls.map((t, i) => ({ t, i, p: Preview.project(i) })).filter(o => o.p);
    const sides = { L: [], R: [] };
    // bila laci naik taraf terbuka, semua label pindah ke kiri
    for (const o of pts) (this.upOpen || o.p.x < cx + 20 ? sides.L : sides.R).push(o);
    // pastikan kedua-dua belah seimbang bila semua jatuh sebelah
    if (!this.upOpen && !sides.R.length && sides.L.length > 1) sides.R.push(sides.L.sort((a, b) => b.p.x - a.p.x).shift());
    if (!sides.L.length && sides.R.length > 1) sides.L.push(sides.R.sort((a, b) => a.p.x - b.p.x).shift());
    const drawerW = this.upOpen ? (($('upDrawer') && $('upDrawer').offsetWidth) || 360) : 0;
    /* Ukur label SEBENAR (CSS telefon lebih kecil) - dahulu 178x74 dikodkan
       keras, jadi pada telefon label bertindan dan menutup kereta. */
    const tw = (pts[0] && pts[0].t.el.offsetWidth) || 178;
    const th = (pts[0] && pts[0].t.el.offsetHeight) || 60;
    const gap = th + 8;
    /* Label sentiasa di TEPI pentas, tidak sekali-kali ditolak ke atas kereta.
       Lajur kiri bermula di bawah blok maklumat kereta; kalau tidak muat,
       lebihannya pindah ke kanan, dan kanan boleh jadi dua lajur. */
    const info = $('stageInfo');
    const infoB = info ? info.offsetTop + info.offsetHeight + 10 : 0;
    const hint = box.querySelector('.stage-hint');
    const bottom = H - (hint ? hint.offsetHeight + 22 : 40);
    const topR = 64;
    const xL = 16, xR = W - drawerW - tw - 16;
    const capL = Math.max(0, Math.floor((bottom - infoB - th) / gap) + 1);
    const capR = Math.max(1, Math.floor((bottom - topR - th) / gap) + 1);
    sides.L.sort((a, b) => a.p.y - b.p.y); sides.R.sort((a, b) => a.p.y - b.p.y);
    while (sides.L.length > capL) sides.R.push(sides.L.pop());
    sides.R.sort((a, b) => a.p.y - b.p.y);
    const cols = [];
    if (sides.L.length) cols.push({ k: 'L', x: xL, arr: sides.L, top: infoB });
    if (sides.R.length <= capR) cols.push({ k: 'R', x: xR, arr: sides.R, top: topR });
    else {
      // dua lajur di kanan: luar dan dalam
      cols.push({ k: 'R', x: xR, arr: sides.R.slice(0, capR), top: topR });
      cols.push({ k: 'R', x: xR - tw - 12, arr: sides.R.slice(capR), top: topR });
    }
    let svg = '';
    for (const c of cols) {
      const arr = c.arr, total = (arr.length - 1) * gap;
      const mid = Math.max(c.top, Math.min(bottom - th - total, H * 0.45 - total / 2 - th / 2));
      arr.forEach((o, j) => {
        const k = c.k, tx = c.x, ty = mid + j * gap;
        const t = o.t;
        t.x = t.x == null ? tx : t.x + (tx - t.x) * 0.25;
        t.y = t.y == null ? ty : t.y + (ty - t.y) * 0.25;
        t.el.style.transform = `translate(${t.x}px,${t.y}px)`;
        const ax = k === 'L' ? t.x + tw : t.x, ay = t.y + th / 2;
        svg += `<g class="${t.empty ? 'emp' : ''}"><line x1="${ax}" y1="${ay}" x2="${o.p.x}" y2="${o.p.y}"/>
          <circle cx="${o.p.x}" cy="${o.p.y}" r="3.5"/><circle cx="${ax}" cy="${ay}" r="2.5"/></g>`;
      });
    }
    $('stageLines').innerHTML = svg;
  },

  openSlot(i) {
    Sfx.ui();
    this.slot = i;
    this.upOpen = false;
    const lo = getLoadout(Save.d.car);
    const owned = WEAPONS.some(w => Inv.count(w.id) > 0);
    this.sub = owned ? 'inv' : 'store';
    this.selW = lo[i] || null;
    this.go('weapons');
  },

  /* laci naik taraf kereta di sebelah kanan pentas */
  renderDrawer() {
    const D = $('upDrawer');
    D.classList.toggle('open', !!this.upOpen);
    // butang bawah ikut keadaan laci (dahulu kekal menyala selepas Close / Back)
    $('bUp').classList.toggle('on', !!this.upOpen);
    if (!this.upOpen) return;
    const carId = Save.d.car || 'ranger';
    const carDef = CAR_BY[carId] || CAR_BY.ranger;
    const ups = getCarUp(carId);
    D.innerHTML = '';
    const head = el('div', 'dhead', `<div><div class="side-title">Upgrade Car</div>
      <div class="side-sub">${carDef.name.toUpperCase()} ONLY</div></div>`);
    const x = el('button', 'gback', 'Close');
    x.onclick = () => { Sfx.ui(false); this.upOpen = false; this.renderStage(); };
    head.appendChild(x);
    D.appendChild(head);
    for (const u of CAR_UPS) {
      const lv = ups[u.id] || 0;
      const max = upMaxOf(carId, u.id);
      const maxed = lv >= max;
      const cost = carUpCost(u.id, lv);
      const poor = !maxed && !Econ.canPay(cost, 0);
      const c = el('div', 'upcard' + (maxed ? ' max' : '') + (poor ? ' poor' : ''));
      c.innerHTML = `<div class="t"><b>${u.name}</b><span class="c">${maxed ? 'MAX' : fmt(cost) + ' coins'}</span></div>
        <div class="d">${u.id === 'armor' ? '+' + fU(35 * hpScale(playerL(carId))) + ' max HP' : u.desc} · level ${lv}/${max}</div>
        <div class="pips">${Array.from({ length: max }, (_, i) => `<div class="pip${i < lv ? ' on' : ''}"></div>`).join('')}</div>`;
      c.onclick = () => {
        if (maxed) return Sfx.deny();
        if (!Econ.pay(cost, 0)) { Sfx.deny(); this.toastNow('Not enough coins'); return; }
        ups[u.id] = lv + 1; Save.save(); Sfx.buy();
        Missions.track('carup', 1);
        this.afterChange();
      };
      D.appendChild(c);
    }
    const cs = carStats(ups, carDef.mods);
    const rows = [
      ['Max HP', carHpShown(cs.maxHp, carId)], ['Damage taken', Math.round(cs.dmgTake * 100) + '%'],
      ['Speed', Math.round(cs.speed * 100) + '%'], ['Handling', Math.round(cs.grip * 100) + '%'],
      ['Ram damage', Math.round(cs.ram * 100) + '%'], ['Nitro', Math.round(cs.nitro * 100) + '%'],
      ['Pull radius', cs.magnet.toFixed(1) + ' m'], ['Repair', cs.regen.toFixed(2) + ' hp/s'],
    ];
    const box = el('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:9px;margin-top:6px;padding-top:12px;border-top:1px solid var(--line)';
    for (const [k, v] of rows) box.appendChild(el('div', 'stat-row', `<b style="width:auto;flex:1">${k}</b><em style="width:auto;color:var(--amber)">${v}</em>`));
    D.appendChild(box);
  },

  /* ---------------- senjata untuk satu slot: inventori / kedai ---------------- */
  renderWeapons(L, S) {
    Preview.stop();
    const store = this.sub === 'store';
    const carId = Save.d.car;
    const lo = getLoadout(carId);
    const here = lo[this.slot];
    const all = store ? WEAPONS : WEAPONS.filter(w => Inv.count(w.id) > 0);
    const fw = this.fWpn || 'ALL';
    const forCar = new Set(suggestWeapons(CAR_BY[carId] || CARS[0], 6).map(w => w.id));
    const list = all.filter(w => fw === 'ALL' || (fw === 'CAR' ? forCar.has(w.id) : fw === 'OWN' ? Inv.count(w.id) > 0 : Econ.canPay(w.price, 0) && Inv.count(w.id) === 0));
    this.chips(L, [['ALL', 'All'], ['CAR', 'For This Car']].concat(store ? [['OWN', 'Owned'], ['BUY', 'Can Buy']] : []), fw, v => { this.fWpn = v; this.selW = null; });
    if (!this.selW || !list.some(w => w.id === this.selW)) this.selW = (list.find(w => w.id === here) || list[0] || {}).id;
    if (!list.length) {
      L.appendChild(el('div', 'empty-note', 'You do not own any weapons yet.<br>Open the <b>Store</b> tab to buy one.'));
    }
    for (const w of list) {
      const have = Inv.count(w.id);
      const owned = have > 0;
      const lv = Save.d.lv[w.id] || 0;
      const mark = markOf(Math.max(1, lv));
      const col = MARK_COLOR[mark - 1];
      const isHere = here === w.id;
      /* susunan sama seperti kad kereta: gambar dahulu, nama sahaja di bawah */
      const c = el('div', 'card pic' + (this.selW === w.id ? ' sel' : '') + (isHere ? ' here' : (!store && Inv.used(w.id) ? ' equipped' : store && owned ? ' owned' : '')));
      const pend = Save.d.pending[w.id];
      c.innerHTML = `
        <div class="shot load" data-wpn="${w.id}">${wIcon(w, owned ? col : '#5d6775')}</div>
        <div class="cap">
          <h4>${w.name}</h4>
          ${owned && !store ? `<div class="tag" style="color:${col}">${MARK_NAME[mark - 1]} · LV ${lv}</div>` : ''}
          <div class="price${owned && !store ? ' free' : ''}${store && !owned && w.price > 0 && !Econ.canPay(w.price, 0) ? ' poor' : ''}">${store
            ? (w.price > 0 ? fmt(w.price) + ' coins' : 'Free')
            : pend ? '<span style="color:var(--green)">PICK A POWER</span>'
              : `${Math.max(0, Inv.free(w.id))} of ${have} free`}</div>
        </div>
        ${owned ? `<div class="qty">x${have}</div>` : ''}`;
      c.onclick = () => { this.selW = w.id; Sfx.ui(); this.renderGarage(); };
      L.appendChild(c);
    }
    this.fillShots(L);
    if (this.selW) this.weaponSide(S, WBY[this.selW], store);
  },

  weaponSide(S, w, store) {
    const carId = Save.d.car;
    const lo = getLoadout(carId);
    const slot = this.slot;
    const have = Inv.count(w.id);
    const owned = have > 0;
    const lv = Save.d.lv[w.id] || 1;
    const mark = markOf(lv);
    const col = MARK_COLOR[mark - 1];
    const myPerks = Save.d.perks[w.id] || [];
    const st = weaponStats(w.id, lv, myPerks);
    const nx = !store && owned && lv < MAX_LV ? weaponStats(w.id, lv + 1, myPerks) : null;
    const isHere = lo[slot] === w.id;
    const freeUnits = Inv.free(w.id);

    /* Susunan panel: 1 gambar - 2 nama - 3 penerangan -
       4 damage & statistik - 5 apa yang senjata ini buat. */
    const shot = el('img', 'wshot');
    shot.dataset.wpn = w.id;
    shot.alt = '';
    S.appendChild(shot);
    this.fillShots(S);

    S.appendChild(el('div', '', `<div class="side-title">${w.name}</div>
      <div class="side-sub">${w.tag}${owned ? ` · <span class="marktag" style="color:${col}">${MARK_NAME[mark - 1]}</span> LEVEL ${lv}/${MAX_LV}` : ''}</div>`));
    S.appendChild(el('div', 'slotnote', isHere ? `EQUIPPED IN SLOT ${slot + 1}` : `FOR SLOT ${slot + 1} ON ${(CAR_BY[carId] || CAR_BY.ranger).name.toUpperCase()}`));
    S.appendChild(el('div', 'desc', w.desc));

    const bar = (label, val, max, nxt, fmtFn) => {
      const pct = clamp(val / max * 100, 2, 100);
      const npct = nxt !== null && nxt !== undefined ? clamp(nxt / max * 100, 2, 100) : pct;
      const row = el('div', 'stat-row', `<b>${label}</b>
        <div class="meter${npct > pct ? ' up' : ''}"><i style="width:${npct}%"></i></div>
        <em>${fmtFn ? fmtFn(val) : Math.round(val)}</em>`);
      const meter = row.querySelector('.meter');
      const inner = row.querySelector('i');
      inner.style.width = pct + '%';
      if (npct > pct) {
        meter.style.position = 'relative';
        const ghost = el('i');
        ghost.style.cssText = `position:absolute;height:6px;width:${npct}%;background:rgba(113,255,178,.35);border-radius:3px;left:0;top:0`;
        meter.insertBefore(ghost, inner);
        inner.style.position = 'relative';
      }
      return row;
    };
    const wrap = el('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:9px';
    // paparan dalam unit yang SAMA dengan HP kereta (x U) - nisbah bar tidak berubah
    wrap.appendChild(bar('DAMAGE', st.dmg * st.pellets * U, STAT_MAX.dmg * U, nx ? nx.dmg * nx.pellets * U : null, v => fmt(Math.round(v))));
    wrap.appendChild(bar('DPS', st.dps * U, STAT_MAX.dps * U, nx ? nx.dps * U : null, v => fmt(Math.round(v))));
    if (w.type !== 'beam' && w.type !== 'charge' && w.type !== 'tether' && w.type !== 'orbit') wrap.appendChild(bar('FIRE RATE', st.rof, STAT_MAX.rof, nx ? nx.rof : null, v => v.toFixed(1)));
    wrap.appendChild(bar('MAGAZINE', st.mag, STAT_MAX.mag, nx ? nx.mag : null));
    wrap.appendChild(bar('RANGE', st.range, STAT_MAX.range, nx ? nx.range : null));
    wrap.appendChild(bar('RELOAD', STAT_MAX.reload - st.reload, STAT_MAX.reload, nx ? STAT_MAX.reload - nx.reload : null, () => st.reload.toFixed(2) + 's'));
    S.appendChild(wrap);

    // apa yang senjata ini buat - diletak selepas damage supaya pemain
    // nampak nombor dahulu, kemudian barulah kegunaannya
    if (w.role) {
      const box = el('div', 'usebox');
      const chips = (w.modes || []).map(k => {
        const M = MODES[k];
        return `<i class="mchip m-${k}">${M ? M.name : k}</i>`;
      }).join('');
      box.innerHTML = `
        <div class="usehead"><b>WHAT IT DOES</b><span class="rolechip big">${w.role}</span></div>
        ${w.tip ? `<div class="usetip" style="margin-top:2px">${w.tip}</div>` : ''}
        <div class="useline good"><b>Strong vs</b> ${w.vs || '-'}</div>
        <div class="useline bad"><b>Weak vs</b> ${w.weak || '-'}</div>
        ${chips ? `<div class="useline"><b>Shines in</b> <span class="mchips">${chips}</span></div>` : ''}
        ${w.sigCar && CAR_BY[w.sigCar] ? `<div class="useline good"><b>Signature</b> ${CAR_BY[w.sigCar].name}'s weapon - +${Math.round((w.sigBonus || 0.15) * 100)}% damage when mounted on ${CAR_BY[w.sigCar].name}</div>` : ''}`;
      S.appendChild(box);
    }

    for (const k of [6, 16]) {
      if (!w.perks[k]) continue;
      S.appendChild(el('div', 'perk' + (lv >= k && owned ? ' on' : ''), `<b>LEVEL ${k}</b> · ${w.perks[k]}`));
    }
    if (myPerks.length) {
      S.appendChild(el('div', 'side-sub', 'INSTALLED POWERS'));
      const box = el('div', 'ownperk');
      for (const id of myPerks) { const pk = PERK_BY[id]; if (pk) box.appendChild(el('i', '', pk.name)); }
      S.appendChild(box);
    }

    const acts = el('div');
    acts.style.cssText = 'display:flex;flex-direction:column;gap:9px;margin-top:auto;padding-top:8px';

    const buyEquip = () => {
      if (!Econ.pay(w.price, 0)) return Sfx.deny();
      Inv.add(w.id);
      if (!Save.d.lv[w.id]) Save.d.lv[w.id] = 1;
      lo[slot] = w.id;
      Save.save(); Sfx.buy();
      this.toastNow(`${w.name} equipped in slot ${slot + 1}`);
      this.view = 'stage';
      this.afterChange();
    };

    if (store) {
      // senjata boleh dibeli berkali-kali - setiap unit boleh dipasang di slot lain
      if (owned) acts.appendChild(el('div', 'perk', `You already own <b style="color:var(--text)">${have}</b> unit${have > 1 ? 's' : ''}
        (${freeUnits} free). Buying another lets you mount it in more slots.`));
      const label = w.price > 0
        ? `${owned ? 'Buy +1' : 'Buy'} & Equip · ${fmt(w.price)}`
        : `${owned ? 'Get +1' : 'Get'} & Equip · Free`;
      this.setFoot(label, Econ.canPay(w.price, 0) ? buyEquip : null);
      S.appendChild(acts);
      return;
    }

    // inventori: naik taraf + pasang
    const pending = Save.d.pending[w.id];
    if (pending) {
      this.renderPerkChoice(S, w, pending);
    } else if (lv >= MAX_LV) {
      acts.appendChild(el('div', 'perk on', 'This weapon is fully upgraded (Level 20 · Mark IV).'));
    } else if (isMarkGate(lv)) {
      const nm = mark + 1;
      const cost = markCostCoin(w.id, nm);
      const btn = el('button', 'btn primary', `Advance to ${MARK_NAME[nm - 1]} — ${fmt(cost)} coins`);
      btn.disabled = !Econ.canPay(cost, 0);
      btn.onclick = () => {
        if (!Econ.pay(cost, 0)) return Sfx.deny();
        Save.d.lv[w.id] = lv + 1;
        Save.d.pending[w.id] = { mark: nm, opts: rollOptions(Save.d.perks[w.id] || []), rerolls: 0, lockUntil: 0 };
        Missions.track('upgrade', 1);
        Save.save(); Sfx.buy(); this.afterChange();
      };
      acts.appendChild(btn);
    } else {
      const cost = levelCostScrap(w.id, lv);
      const btn = el('button', 'btn primary', `Upgrade to Level ${lv + 1} — ${fmt(cost)} scrap`);
      btn.disabled = !Econ.canPay(0, cost);
      btn.onclick = () => {
        if (!Econ.pay(0, cost)) return Sfx.deny();
        Save.d.lv[w.id] = lv + 1;
        Missions.track('upgrade', 1);
        Save.save(); Sfx.buy(); this.afterChange();
      };
      acts.appendChild(btn);
    }

    // jual satu unit (hanya unit yang tidak dipasang pada mana-mana kereta)
    if (w.price > 0 && have > 0) {
      const gain = sellPrice(w.price);
      const spare = Inv.free(w.id);
      const sb = el('button', 'btn ghost', `Sell 1 unit — +${fmt(gain)} coins`);
      sb.disabled = spare <= 0;
      sb.title = spare <= 0 ? 'Every unit you own is mounted on a car' : '';
      sb.onclick = () => {
        if (Inv.free(w.id) <= 0) { Sfx.deny(); this.toastNow('Unmount a unit first'); return; }
        const total = Object.keys(Save.d.inv).reduce((n, k) => n + (Save.d.inv[k] || 0), 0);
        if (total <= 1) { Sfx.deny(); this.toastNow('You cannot sell your last weapon'); return; }
        if (!confirm(`Sell one ${w.name} for ${fmt(gain)} coins?\nIts level and powers are kept if you buy it again.`)) return;
        Inv.add(w.id, -1);
        Econ.addCoins(gain, true);   // jualan: tiada XP
        Save.save(); Sfx.buy();
        this.toastNow(`Sold 1 ${w.name} · +${fmt(gain)} coins`);
        if (Inv.count(w.id) <= 0 && this.sub !== 'store') this.selW = null;
        this.afterChange();
      };
      acts.appendChild(sb);
    }

    if (isHere) {
      this.setFoot(`Unequip from Slot ${slot + 1}`, () => {
        if (lo.filter(Boolean).length <= 1) { Sfx.deny(); this.toastNow('At least one weapon must stay mounted'); return; }
        lo[slot] = null; Save.save(); Sfx.ui(false);
        this.view = 'stage'; this.afterChange();
      }, true);
    } else if (freeUnits > 0) {
      this.setFoot(`Equip to Slot ${slot + 1}`, () => {
        lo[slot] = w.id; Save.save(); Sfx.ui();
        this.toastNow(`${w.name} equipped in slot ${slot + 1}`);
        this.view = 'stage'; this.afterChange();
      });
    } else {
      acts.appendChild(el('div', 'perk', `Every ${w.name} you own is already mounted. Buy another unit to use it here too.`));
      this.setFoot(w.price > 0 ? `Buy +1 & Equip · ${fmt(w.price)}` : 'Get +1 & Equip',
        Econ.canPay(w.price, 0) ? buyEquip : null);
    }
    S.appendChild(acts);
  },

  /* pilihan kuasa selepas naik Mark */
  renderPerkChoice(S, w, pending) {
    const now = Date.now();
    if (pending.lockUntil && now >= pending.lockUntil) { pending.rerolls = 0; pending.lockUntil = 0; Save.save(); }
    const locked = pending.lockUntil && now < pending.lockUntil;

    const box = el('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-top:8px';
    box.appendChild(el('div', 'side-sub', `CHOOSE ONE POWER · ${MARK_NAME[pending.mark - 1]}`));
    const grid = el('div', 'perkpick');
    grid.style.gridTemplateColumns = '1fr';
    for (const id of pending.opts) {
      const p = PERK_BY[id];
      if (!p) continue;
      const c = el('div', 'perkcard', `<b>${p.name}</b><span>${p.desc}</span>`);
      c.onclick = () => {
        (Save.d.perks[w.id] || (Save.d.perks[w.id] = [])).push(id);
        delete Save.d.pending[w.id];
        Save.save(); Sfx.buy();
        this.toastNow('POWER INSTALLED: ' + p.name);
        this.afterChange();
      };
      grid.appendChild(c);
    }
    box.appendChild(grid);

    const cost = rerollCost(pending.mark);
    const left = Math.max(0, REROLL_MAX - pending.rerolls);
    const rb = el('button', 'btn', locked
      ? `New offers in ${fmtTime(pending.lockUntil - now)}`
      : `Reroll (${left} left) — ${fmt(cost)} coins`);
    rb.disabled = !!locked || !Econ.canPay(cost, 0);
    rb.onclick = () => {
      if (locked) return Sfx.deny();
      if (!Econ.pay(cost, 0)) return Sfx.deny();
      pending.rerolls++;
      pending.opts = rollOptions(Save.d.perks[w.id] || []);
      if (pending.rerolls >= REROLL_MAX) pending.lockUntil = Date.now() + REROLL_LOCK_MS;
      Save.save(); Sfx.ui();
      this.renderGarage();
    };
    box.appendChild(rb);
    box.appendChild(el('div', 'perk', locked
      ? 'All three rerolls are used. Wait for the timer to get a fresh set, or pick one of the offers above.'
      : 'Not happy with these? Reroll up to 3 times. After that you wait 10 minutes.'));
    S.appendChild(box);
  },

  /* ---------------- kereta: inventori / kedai ---------------- */
  renderCars(L, S) {
    const store = this.sub === 'store';
    // kedai memaparkan SEMUA kereta; yang sudah dimiliki ditanda OWNED
    const all = store ? CARS.slice() : CARS.filter(c => Save.d.cars.includes(c.id));
    // penapis kategori (59 kereta terlalu panjang untuk ditatal)
    const fc = this.fCar || 'ALL';
    const canBuy = c => !Save.d.cars.includes(c.id) && !carLocked(c) && Econ.canPay(c.price, 0);
    const list = all.filter(c => fc === 'ALL' || (fc === 'BUY' ? canBuy(c) : c.role === fc));
    this.chips(L, [['ALL', 'All'], ['TANK', 'Tank'], ['FIGHTER', 'Fighter'], ['ASSASSIN', 'Assassin'], ['SUPPORT', 'Support'], ['CONTROLLER', 'Controller'], ['SNIPER', 'Sniper']]
      .concat(store ? [['BUY', 'Can Buy']] : []), fc, v => { this.fCar = v; this.selCar = null; });
    if (!this.selCar || !list.some(c => c.id === this.selCar)) this.selCar = (list.find(c => c.id === Save.d.car) || list[0] || {}).id;
    if (!list.length) {
      L.appendChild(el('div', 'empty-note', fc === 'ALL' ? 'No cars yet.' : 'No cars in this category.'));
      Preview.stop();
      return;
    }
    for (const c of list) {
      const active = Save.d.car === c.id;
      const mine = Save.d.cars.includes(c.id);
      const ab = ABILITY[c.ability];
      /* kad hanya menunjukkan GAMBAR + NAMA - statistik hanya muncul
         selepas pemain memilih kereta itu di panel sebelah kanan */
      const locked = store && carLocked(c);
      const card = el('div', 'card pic' + (this.selCar === c.id ? ' sel' : '')
        + (active ? ' active' : (store && mine ? ' owned' : '')) + (locked ? ' locked' : ''));
      card.innerHTML = `
        <div class="shot load" data-car="${c.id}"></div>
        <div class="cap">
          <h4>${c.name}</h4>
          ${store ? `<div class="price${mine ? ' free' : ''}${locked ? ' lock' : ''}${!mine && !locked && !Econ.canPay(c.price, 0) ? ' poor' : ''}">${mine ? 'Owned' : locked ? `&#128274; Level ${carLevel(c.id)}` : fmt(c.price) + ' coins'}</div>` : ''}
        </div>`;
      card.onclick = () => { this.selCar = c.id; Sfx.ui(); this.renderGarage(); };
      L.appendChild(card);
      void ab;
    }

    this.fillShots(L);

    const c = CAR_BY[this.selCar];
    const ab = ABILITY[c.ability];
    const active = Save.d.car === c.id;

    Preview.init();
    if (Preview.canvas) {
      const box = el('div', 'prevbox');
      box.appendChild(Preview.canvas);
      box.appendChild(el('div', 'prevhint', 'DRAG TO ROTATE'));
      // VIEW: paparan skrin penuh kereta ini, anak panah untuk kereta lain dalam senarai yang sama
      const vb = el('button', 'prevview', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>VIEW');
      vb.onclick = e => { e.stopPropagation(); CarView.open(this, list.map(x => x.id), c.id, store); };
      box.appendChild(vb);
      S.appendChild(box);
      Preview.onFrame = null;
      Preview.show(c.id, store ? [] : getLoadout(c.id), 'box');
      Preview.start();
    }
    /* Susunan panel: 1 gambar - 2 nama - 3 apa kereta ini buat -
       4 kebolehan (kesan, cooldown, tempoh aktif) - 5 prestasi -
       6 senjata yang disyorkan. */
    S.appendChild(el('div', '', `<div class="side-title">${c.name}</div>
      <div class="side-sub">${c.slots} WEAPON SLOTS${c.role ? ` · ${c.role}` : ''}</div>`));

    S.appendChild(el('div', 'desc', `${c.desc} ${c.good ? `Best for ${c.good}.` : ''}${c.tip ? ` ${c.tip}` : ''}`));

    const abBox = el('div', 'infoblk');
    // suis (Hamvog/Albatross) dan cas (Gyhna) tiada tempoh tetap - jangan tunjuk "1000000000s"
    const dur = ab.durTxt ? ab.durTxt : ab.chargeInfo ? 'instant leap' : ab.charges ? '10s per link' : ab.dur > 1e5 ? 'until toggled off' : ab.dur >= 1 ? `${ab.dur}s` : 'instant';
    abBox.innerHTML = `<div class="h">ABILITY</div>
      <div style="font-size:14px;color:${ab.color};letter-spacing:.05em;margin-bottom:7px">${ab.name}</div>
      <div class="desc" style="margin-bottom:10px">${ab.desc}</div>
      <div class="kv"><b>${ab.charges ? 'Charges' : 'Cooldown'}</b><em>${ab.charges ? ab.charges : ab.cd + 's'}</em></div>
      <div class="kv"><b>Active for</b><em>${dur}</em></div>`;
    S.appendChild(abBox);

    const perf = el('div', 'infoblk');
    const rows = [
      ['Top speed', Math.round(c.mods.speed * 100) + '%'],
      ['Handling', Math.round(c.mods.grip * 100) + '%'],
      ['HP', carHpShown(150 + (c.mods.hp || 0) * 1.5, c.id)],
      ['Ram damage', Math.round(c.mods.ram * 100) + '%'],
      ['Nitro', Math.round(c.mods.nitro * 100) + '%'],
      ['Damage per weapon', '×' + slotMulOf(c.id).toFixed(2)],
    ];
    perf.innerHTML = `<div class="h">PERFORMANCE</div>` +
      rows.map(([k, v]) => `<div class="kv"><b>${k}</b><em>${v}</em></div>`).join('');
    S.appendChild(perf);

    const rec = el('div', 'infoblk');
    const modeChips = (c.modes || []).map(k => {
      const M = MODES[k];
      return `<i class="mchip m-${k}">${M ? M.name : k}</i>`;
    }).join('');
    rec.innerHTML = `<div class="h">RECOMMENDED WEAPONS</div>
      ${modeChips ? `<div class="useline" style="margin-bottom:4px"><b>Shines in</b> <span class="mchips">${modeChips}</span></div>` : ''}
      <div class="recw"></div>`;
    const recw = rec.querySelector('.recw');
    for (const w of suggestWeapons(c)) {
      const row = el('div', 'r');
      row.innerHTML = `<img data-wpn="${w.id}" alt=""><div class="t"><b>${w.name}</b><i>${w.role || w.tag}</i></div>`;
      row.onclick = () => { Sfx.ui(); this.selW = w.id; this.sub = Inv.count(w.id) > 0 ? 'inv' : 'store'; this.go('weapons'); };
      recw.appendChild(row);
    }
    S.appendChild(rec);
    this.fillShots(rec);

    const acts = el('div');
    acts.style.cssText = 'display:flex;flex-direction:column;gap:9px;margin-top:auto;padding-top:8px';
    const owned = Save.d.cars.includes(c.id);
    const buy = () => {
      if (carLocked(c)) return Sfx.deny();                  // penjaga kedua: kunci level
      if (!Econ.pay(c.price, 0)) return Sfx.deny();
      Save.d.cars.push(c.id); Save.d.car = c.id;
      getLoadout(c.id); getCarUp(c.id);
      Save.save(); Sfx.buy();
      this.toastNow(this.g.world ? `${c.name} bought - it will be used on your next run` : `${c.name} is yours`);
      this.view = 'stage'; this.afterChange();
    };
    const use = () => {
      Save.d.car = c.id; getLoadout(c.id); getCarUp(c.id); Save.save(); Sfx.ui();
      if (this.g.world) this.toastNow('Car changed - it will be used on your next run');
      this.view = 'stage'; this.afterChange();
    };
    if (this.g.world) {
      // penjaga kedua: walau bagaimana pun sampai ke sini, tiada tukar kereta dalam perlawanan
      this.setFoot('Leave match to change cars', null);
    } else if (store && !owned && carLocked(c)) {
      this.setFoot(`Unlocks at Level ${carLevel(c.id)}`, null);
      acts.appendChild(el('div', 'perk', `Unlocks at player Level ${carLevel(c.id)} (you are Level ${level()}). Earn XP by playing matches and waves - every coin you earn is 1 XP.`));
    } else if (store && !owned) {
      this.setFoot(`Buy — ${fmt(c.price)} coins`, Econ.canPay(c.price, 0) ? buy : null);
    } else if (active) {
      this.setFoot('In Use', null);
      acts.appendChild(el('div', 'perk on', 'This car is currently in use.'));
    } else {
      this.setFoot('Use This Car', use);
      if (store) acts.appendChild(el('div', 'perk on', 'You already own this car.'));
    }

    // jual kereta (bukan yang sedang digunakan, bukan yang terakhir)
    if (!store && Save.d.cars.includes(c.id) && c.price > 0) {
      const ups = getCarUp(c.id);
      let upSpent = 0;
      for (const u of CAR_UPS) {
        const lv2 = ups[u.id] || 0;
        for (let i = 0; i < lv2; i++) upSpent += carUpCost(u.id, i);
      }
      const gain = sellPrice(c.price) + Math.round(upSpent * SELL_UP_RATE / 10) * 10;
      const sb = el('button', 'btn ghost', `Sell car — +${fmt(gain)} coins`);
      const isLast = Save.d.cars.length <= 1;
      sb.disabled = active || isLast;
      sb.onclick = () => {
        if (active) { Sfx.deny(); this.toastNow('Switch to another car first'); return; }
        if (isLast) { Sfx.deny(); this.toastNow('You cannot sell your last car'); return; }
        if (!confirm(`Sell ${c.name} for ${fmt(gain)} coins?\nIts upgrades are refunded at ${Math.round(SELL_UP_RATE * 100)}% and its mounted weapons go back to your inventory.`)) return;
        const lo2 = getLoadout(c.id);
        for (let i = 0; i < lo2.length; i++) lo2[i] = null;     // senjata kembali ke inventori
        delete Save.d.loadout[c.id];
        delete Save.d.carUp[c.id];
        Save.d.cars = Save.d.cars.filter(x => x !== c.id);
        Econ.addCoins(gain, true);   // jualan: tiada XP
        Save.save(); Sfx.buy();
        this.toastNow(`Sold ${c.name} · +${fmt(gain)} coins`);
        this.selCar = null;
        this.afterChange();
      };
      acts.appendChild(sb);
    }
    S.appendChild(acts);
  },

  /* Merakam gambar kereta / senjata satu demi satu dalam bingkai berasingan
     supaya membuka senarai tidak pernah menyekat antara muka. */
  /* barisan butang penapis di atas grid kad */
  chips(L, opts, cur, set) {
    const row = el('div', 'chips');
    for (const [id, label] of opts) {
      const b = el('button', 'chip' + (cur === id ? ' on' : ''), label);
      b.onclick = () => { if (cur === id) return; Sfx.ui(); set(id); this.renderGarage(); };
      row.appendChild(b);
    }
    L.appendChild(row);
  },

  fillShots(root) {
    const pend = [...root.querySelectorAll('[data-car],[data-wpn]')].filter(n => !n.dataset.done);
    if (!pend.length) return;
    this._shotQ = (this._shotQ || []).filter(n => n.isConnected && !n.dataset.done).concat(pend);
    // merakam semula keutamaan apabila pemain menatal ke bawah
    if (!root.dataset.shotScroll) {
      root.dataset.shotScroll = '1';
      root.addEventListener('scroll', () => this.pumpShots(), { passive: true });
    }
    this.pumpShots();
  },

  /* Satu gambar setiap pusingan, yang kelihatan didahulukan.
     buildCar() memakan masa, jadi merakam semuanya sekali gus akan
     membekukan menu; dan IntersectionObserver tidak boleh dipercayai
     apabila tetingkap tidak dilukis, jadi keterlihatan dikira sendiri. */
  pumpShots() {
    // pengawal: gelung yang mati senyap (bendera _shotOn kekal true) dimulakan semula
    if (this._shotOn && performance.now() - (this._shotTick || 0) < 1000) return;
    this._shotOn = true;
    const go = () => {
      this._shotTick = performance.now();
      const list = this._shotQ = (this._shotQ || []).filter(n => n.isConnected && !n.dataset.done);
      if (!list.length) { this._shotOn = false; return; }
      // kad yang menunggu pratonton bersedia (n._wait) dilangkau seketika
      const now = performance.now(), ready = list.filter(n => !(n._wait > now));
      if (!ready.length) { setTimeout(go, 200); return; }
      let best = null, bestS = Infinity;
      for (const n of ready) {
        const r = n.getBoundingClientRect();
        const onScreen = r.bottom > -40 && r.top < innerHeight + 40;
        const s = (onScreen ? 0 : 1e6) + Math.abs(r.top);
        if (s < bestS) { bestS = s; best = n; }
      }
      try { this.shotNow(best); }
      catch (e) { if (best) best.dataset.done = '1'; }   // satu kad rosak tidak boleh menghentikan semua
      finally { setTimeout(go, 0); }
    };
    setTimeout(go, 0);
  },

  shotNow(n) {
    const isCar = !!n.dataset.car;
    const url = Preview.thumb(isCar ? 'car' : 'wpn', isCar ? n.dataset.car : n.dataset.wpn);
    /* PEPIJAT LAMA: kad ditanda 'done' walaupun pratonton belum sedia -> gambar
       kosong selama-lamanya. Kini cuba semula bila Preview belum bersedia. */
    if (!url && !Preview.ready) { n._wait = performance.now() + 300; return; }
    n.dataset.done = '1';
    if (!url) return;
    if (n.tagName === 'IMG') { n.src = url; return; }
    const img = document.createElement('img');
    img.className = 'shot';
    img.src = url;
    img.alt = '';
    n.replaceWith(img);
  },

  /* ---------------- misi ---------------- */
  renderMissions(L, S) {
    L.style.gridTemplateColumns = '1fr';
    const row = (ms) => {
      const done = ms.prog >= ms.n;
      const r = el('div', 'mis' + (ms.claimed ? ' claimed' : done ? ' done' : ''));
      const pct = clamp(ms.prog / ms.n, 0, 1) * 100;
      r.innerHTML = `<div class="body"><h4>${ms.name}</h4><p>${ms.desc}</p>
          <div class="pb"><i style="width:${pct}%"></i></div>
          <div class="pn">${fmt(Math.floor(ms.prog))} / ${fmt(ms.n)}</div></div>
        <div class="rw">${ms.r[0] ? `<span class="co">+${fmt(ms.r[0])} coins</span><br>` : ''}${ms.r[1] ? `<span class="scr">+${fmt(ms.r[1])} scrap</span>` : ''}</div>`;
      const b = el('button', 'btn' + (done && !ms.claimed ? ' primary' : ' ghost'), ms.claimed ? 'Claimed' : done ? 'Claim' : 'In progress');
      b.disabled = ms.claimed || !done;
      b.onclick = () => {
        const got = Missions.claim(ms.id);
        if (!got) return Sfx.deny();
        Sfx.buy();
        this.toastNow(`+${fmt(got[0])} COINS  +${fmt(got[1])} SCRAP`);
        this.afterChange();
      };
      r.appendChild(b);
      return r;
    };
    const ready = Missions.daily().concat(Missions.main()).filter(m => !m.claimed && m.prog >= m.n);
    if (ready.length) {
      const ca = el('button', 'btn primary', `Claim All (${ready.length})`);
      ca.style.cssText = 'grid-column:1/-1;justify-self:start;margin-bottom:4px';
      ca.onclick = () => { for (const m of ready) Missions.claim(m.id); Save.save(); Sfx.buy(); this.toastNow(`Claimed ${ready.length} rewards`); this.renderGarage(); };
      L.appendChild(ca);
    }
    L.appendChild(el('div', 'mis-sec', `<span>DAILY MISSIONS</span><span>NEW SET IN ${fmtTime(Missions.msUntilReset())}</span>`));
    for (const ms of Missions.daily()) L.appendChild(row(ms));
    const main = Missions.main();
    // misi utama: tunjuk yang belum dituntut dahulu, yang sudah dituntut di bawah
    L.appendChild(el('div', 'mis-sec', `<span>CAREER MISSIONS</span><span>${main.filter(m => m.claimed).length} / ${main.length} DONE</span>`));
    for (const ms of main.filter(m => !m.claimed && m.prog >= m.n)) L.appendChild(row(ms));   // siap - tuntut dahulu
    for (const ms of main.filter(m => !m.claimed && m.prog < m.n)) L.appendChild(row(ms));
    for (const ms of main.filter(m => m.claimed)) L.appendChild(row(ms));

    S.appendChild(el('div', '', `<div class="side-title">Missions</div><div class="side-sub">EARN COINS & SCRAP</div>`));
    S.appendChild(el('div', 'desc', `
      Missions track what you do in every mode and pay out coins and scrap.<br><br>
      • <b style="color:var(--text)">Daily missions</b> — three new ones every day at midnight.<br>
      • <b style="color:var(--text)">Career missions</b> — a fixed list that gets harder and pays more.<br><br>
      Progress is saved even between runs. Finished missions must be <b style="color:var(--green)">claimed</b> here —
      the red number on the Missions tab shows how many are waiting.`));
  },

  /* ---------------- bengkel ---------------- */
  renderWorkshop(L, S) {
    L.style.gridTemplateColumns = '1fr';
    const w = Econ.workshopTick();
    const pct = clamp(w.stored / WORKSHOP_CAP, 0, 1);
    const full = w.stored >= WORKSHOP_CAP;
    const box = el('div', 'wsbox');
    box.innerHTML = `
      <div class="side-title">Scrap Workshop</div>
      <div class="side-sub">PRODUCES ${WORKSHOP_RATE} SCRAP PER DAY</div>
      <div class="wsgauge"><i style="width:${pct * 100}%"></i></div>
      <div class="stat-row"><b style="width:auto;flex:1">Ready to collect</b>
        <em style="width:auto;color:var(--cyan);font-size:18px">${Math.floor(w.stored)} / ${WORKSHOP_CAP}</em></div>
      <div class="desc" style="margin-top:12px">
        ${full
        ? '<b style="color:var(--red)">Storage full - production has STOPPED.</b> Collect now to start it again.'
        : `Full in about <b>${fmtTime(Econ.workshopFullIn())}</b>. The workshop stops producing once it is full, so collect often.`}
      </div>`;
    const b = el('button', 'btn primary', `Collect ${Math.floor(w.stored)} Scrap`);
    b.style.marginTop = '18px';
    b.disabled = Math.floor(w.stored) <= 0;
    b.onclick = () => {
      const n = Econ.workshopCollect();
      if (!n) return Sfx.deny();
      Sfx.buy();
      this.toastNow('+' + fmt(n) + ' SCRAP');
      this.afterChange();
    };
    box.appendChild(b);
    L.appendChild(box);
    // kad level pemain - mengisi ruang kosong & menunjukkan apa yang akan dibuka
    {
      const P = progress(), nextLv = Math.min(P_MAX, P.lv + 1);
      const soon = CARS.filter(c => carLevel(c.id) === nextLv && !Save.d.cars.includes(c.id)).map(c => c.name);
      const lb = el('div', 'wsbox');
      lb.innerHTML = `<div class="side-title">Player Level ${P.lv}</div>
        <div class="side-sub">${P.lv >= P_MAX ? 'MAX LEVEL - EVERY CAR UNLOCKED' : `${fmt(P.cur)} / ${fmt(P.need)} XP TO LEVEL ${nextLv}`}</div>
        <div class="wsgauge" style="margin:12px 0"><i style="width:${Math.round(P.k * 100)}%;background:#ffd34a"></i></div>
        <div class="perk">Every coin you earn in matches, waves and missions is 1 XP. Selling gives no XP.${P.lv < P_MAX && soon.length ? `<br><b>Level ${nextLv} unlocks:</b> ${soon.join(', ')}` : ''}</div>`;
      L.appendChild(lb);
    }

    S.appendChild(el('div', '', `<div class="side-title">Scrap Sources</div><div class="side-sub">HOW TO COLLECT</div>`));
    S.appendChild(el('div', 'desc', `
      <b style="color:var(--cyan)">Scrap</b> raises weapon levels inside the same Mark.<br><br>
      • Enemies drop 10 / 20 / 30 scrap at random — bigger enemies drop more.<br>
      • Every wave you clear pays a scrap bonus.<br>
      • This workshop makes ${WORKSHOP_RATE} scrap a day even while you are not playing.<br><br>
      <b style="color:var(--amber)">Coins</b> buy weapons, cars, car upgrades, Mark advances
      and power rerolls.`));
  },

  afterChange() {
    this.renderGarage();
    if (this.g.car) this.g.rebuildWeapons();
    this.syncHud(this.g);
    this.syncDev();
  },

  /* ================ HUD ================ */
  syncHud(g) {
    if (!g.player) return;
    this.e.wave.textContent = g.wave;
    this.e.coin.textContent = money(Save.d.coins);
    this.e.scrap.textContent = money(Save.d.scrap);
    this.e.score.textContent = fmt(g.score);
    if (g.player.ab) this.e.abName.textContent = g.player.ab.name;

    const list = this.e.wpnList;
    list.innerHTML = '';
    this.wrows = [];
    for (let i = 0; i < g.slots.length; i++) {
      const sl = g.slots[i];
      const row = el('div', 'wrow');
      if (!sl) {
        row.innerHTML = `<span class="wi">${i + 1}</span><span class="wn" style="opacity:.35">Empty</span>`;
        list.appendChild(row);
        this.wrows.push(null);
        continue;
      }
      const mk = markOf(sl.lv);
      row.innerHTML = `<span class="wi" style="color:${MARK_COLOR[mk - 1]}">${i + 1}</span>
        <span class="wn">${sl.w.name}</span>
        <span class="wa">0</span>
        <div class="wb"><i></i></div>`;
      list.appendChild(row);
      this.wrows.push({ row, ammo: row.querySelector('.wa'), bar: row.querySelector('.wb i') });
    }
    this._hudKey = g.slots.map(s2 => s2 ? s2.id + s2.lv : '-').join('|');
  },

  tickHud(g, dt) {
    const p = g.player;
    if (!p) return;
    const hpF = clamp(p.hp / p.maxHp, 0, 1);
    this.e.hpFill.style.transform = `scaleX(${hpF})`;
    this.e.hpText.textContent = fU(Math.max(0, p.hp)) + (p.overshield > 0.5 ? ' +' + fU(p.overshield) : '');
    this.e.hpBar.classList.toggle('low', hpF < 0.28);
    this.e.low.classList.toggle('hidden', hpF > 0.25);
    this.e.nitro.style.transform = `scaleX(${clamp(p.nitro / 100, 0, 1)})`;

    if (p.ab) {
      const box = this.e.abBox;
      if (p.ab.chargeInfo) {
        // Hopper: cas lompatan yang pulih sendiri
        const ci = p.ab.chargeInfo(p);
        box.className = 'abilitybox' + (ci.free > 0 ? ' ready' : '') + (p.hop ? ' active' : '');
        this.e.abFill.style.width = (ci.free / ci.max) * 100 + '%';
        this.e.abState.textContent = ci.txt;
      } else if (p.ab.charges) {
        // Gyhna: cas pautan bebas + masa pautan paling hampir tamat
        const L = p.links || [], C = p.linkCd || [], free = Math.max(0, p.ab.charges - L.length - C.length);
        box.className = 'abilitybox' + (free > 0 ? ' ready' : '') + (L.length ? ' active' : '');
        this.e.abFill.style.width = (free / p.ab.charges) * 100 + '%';
        const next = L.length ? Math.ceil(Math.min(...L.map(l => l.T))) : 0;
        const rc = C.length ? Math.ceil(Math.min(...C)) : 0;     // cas paling hampir pulih
        this.e.abState.textContent = `LINKS ${free}/${p.ab.charges}` + (next ? ` · ${next}s` : '') + (rc ? ` · +1 in ${rc}s` : '');
      } else if (p.abOn) {
        box.className = 'abilitybox active';
        // kebolehan tanpa had masa (Hamvog, Albatross) - jangan papar 999999998s
        const endless = p.ab.dur > 1e5;
        this.e.abFill.style.width = endless ? '100%' : clamp(p.abT / p.ab.dur, 0, 1) * 100 + '%';
        this.e.abState.textContent = endless ? (p.abId === 'siege' ? 'DEPLOYED' : 'ON') : p.abT.toFixed(1) + 's';
      } else if (p.abCd > 0) {
        box.className = 'abilitybox';
        this.e.abFill.style.width = (1 - clamp(p.abCd / p.ab.cd, 0, 1)) * 100 + '%';
        this.e.abState.textContent = Math.ceil(p.abCd) + 's';
      } else {
        box.className = 'abilitybox ready';
        this.e.abFill.style.width = '100%';
        this.e.abState.textContent = 'READY';
      }
    }

    // setiap slot ada magazin / suhu sendiri
    const key = g.slots.map(s2 => s2 ? s2.id + s2.lv : '-').join('|');
    if (key !== this._hudKey) this.syncHud(g);
    for (let i = 0; i < g.slots.length; i++) {
      const sl = g.slots[i], r = this.wrows && this.wrows[i];
      if (!sl || !r) continue;
      let txt, pct, cls = 'wrow';
      if (sl.w.type === 'beam' || sl.w.type === 'tether') {
        cls += ' ht';
        if (sl.over) { txt = 'HOT'; cls += ' rl'; } else txt = Math.round((1 - sl.heat) * 100) + '%';
        pct = (1 - sl.heat) * 100;
      } else if (sl.st.infinite) {
        /* senjata tenaga tanpa had: bar ini BUKAN peluru dan bukan pemanasan
           lampau - ia ketepatan. Penuh = kumpulan tembakan rapat, susut =
           tembakan mula bersepah, lepaskan picu untuk memulihkannya. */
        cls += ' ht';
        const aim = 1 - sl.heat;
        txt = Math.round(aim * 100) + '%';
        if (sl.heat > 0.7) cls += ' rl';
        pct = aim * 100;
      } else if (sl.reload > 0) {
        txt = 'RELOAD'; cls += ' rl';
        pct = (1 - sl.reload / sl.st.reload) * 100;
      } else if (sl.w.type === 'charge' && sl.charge > 0.05) {
        txt = Math.round(sl.charge * 100) + '%';
        pct = sl.charge * 100;
      } else if (sl.w.lockOn && !(sl.lockTgt && !sl.lockTgt.dead && sl.lockHold > 0)) {
        // Vulag: tidak boleh menembak sebelum mengunci sasaran
        const pr = clamp((sl.lockProg || 0) / sl.st.lockT, 0, 1);
        txt = pr > 0 ? 'LOCKING ' + Math.round(pr * 100) + '%' : 'NO LOCK';
        cls += ' rl'; pct = pr * 100;
      } else if (sl.w.lockOn) {
        txt = 'LOCKED ' + sl.mag + '/' + sl.st.mag;
        pct = sl.mag / sl.st.mag * 100;
      } else {
        txt = sl.mag + '/' + sl.st.mag;
        pct = sl.mag / sl.st.mag * 100;
      }
      if (r.ammo.textContent !== txt) r.ammo.textContent = txt;
      r.bar.style.width = clamp(pct, 0, 100) + '%';
      if (r.row.className !== cls) r.row.className = cls;
    }

    // lencana "tidak boleh disasar" semasa Vanish
    const hb = this.e.hideBadge || (this.e.hideBadge = $('hideBadge'));
    if (hb) {
      hb.classList.toggle('hidden', !p.untarget);
      // Hamvog terlipat: beritahu kenapa senjata tidak menembak
      const key = document.body.classList.contains('touch') ? 'ABILITY' : 'SPACE';
      const lbl = p.untarget && p.weaponsOff ? `UNTARGETABLE · WEAPONS OFFLINE · ${key} TO DEPLOY` : 'UNTARGETABLE';
      const sp = hb.querySelector('span');
      if (sp && sp.textContent !== lbl) sp.textContent = lbl;
    }

    const pw = [];
    const names = { dmg: '2x DMG', shield: 'SHIELD', rapid: 'RAPID', freeze: 'FREEZE' };
    for (const k in p.pow) if (p.pow[k] > 0) pw.push(`${names[k]} ${p.pow[k].toFixed(0)}s`);
    if (this._pwStr !== pw.join()) {
      this._pwStr = pw.join();
      this.e.powers.innerHTML = pw.map(t => `<div class="pw">${t}</div>`).join('');
    }

    const left = g.enemies.length + g.queue.length;
    this.e.enemyLeft.textContent = g.team || g.intermission > 0 ? '' : `ENEMIES ${left}`;
    this.e.coin.textContent = money(Save.d.coins);
    this.e.scrap.textContent = money(Save.d.scrap);
    this.e.score.textContent = fmt(g.score);

    if (this.boss && !this.boss.dead && g.enemies.includes(this.boss)) {
      this.e.bossFill.style.width = clamp(this.boss.hp / this.boss.maxHp, 0, 1) * 100 + '%';
    }
    if (this.vigT > 0) { this.vigT -= dt * 2.2; this.e.vig.style.opacity = clamp(this.vigT, 0, 1) * 0.9; }
  },

  /* Anak panah merah di tepi skrin untuk musuh di luar pandangan */
  setEdgeArrows(list) {
    const host = this.e.arrows;
    if (!host) return;
    const w = innerWidth, h = innerHeight;
    const rx = w / 2 - 54, ry = h / 2 - 54;
    for (let i = 0; i < list.length; i++) {
      let el2 = this.arrowPool[i];
      if (!el2) {
        el2 = document.createElement('div');
        el2.className = 'earrow';
        host.appendChild(el2);
        this.arrowPool[i] = el2;
      }
      const o = list[i];
      const x = w / 2 + Math.cos(o.a) * rx;
      const y = h / 2 - Math.sin(o.a) * ry;
      el2.style.transform = `translate(${x}px,${y}px) rotate(${-o.a * 180 / Math.PI}deg)`;
      el2.style.opacity = clamp(1.1 - o.d / 150, 0.3, 1);
      el2.classList.toggle('boss', !!o.boss);
      el2.style.display = 'block';
    }
    for (let i = list.length; i < this.arrowPool.length; i++) this.arrowPool[i].style.display = 'none';
  },

  /* angka kira detik besar di tengah skrin */
  countdown(text, go) {
    let b = document.getElementById('cdBox');
    if (text === null) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.id = 'cdBox';
      b.innerHTML = '<div class="n"></div><div class="sub"></div>';
      document.getElementById('hud').appendChild(b);
    }
    const n = b.querySelector('.n');
    n.textContent = text;
    n.className = 'n' + (go ? ' go' : '');
    void n.offsetWidth;
    n.classList.add('pop');
    b.querySelector('.sub').textContent = go ? '' : 'GET READY';
  },

  /* pengumuman rentetan bunuhan (FIRST BLOOD, DOUBLE KILL, ...) */
  streak(text, color, note) {
    let b = document.getElementById('streak');
    if (!b) {
      b = document.createElement('div');
      b.id = 'streak';
      b.innerHTML = '<div class="s"></div><div class="c"></div>';
      document.getElementById('hud').appendChild(b);
    }
    const s = b.querySelector('.s'), c = b.querySelector('.c');
    s.textContent = text;
    s.style.color = color || '#ffdca8';
    c.textContent = note || '';
    s.classList.remove('show'); c.classList.remove('show');
    void s.offsetWidth;
    s.classList.add('show');
    if (note) c.classList.add('show');
  },

  banner(text, color) {
    const b = this.e.banner;
    b.textContent = text;
    b.style.color = color || '#ffdca8';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  },
  toast(text) { this.toastNow(text); },
  toastNow(text) {
    const t = this.e.toast;
    t.textContent = text;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  },
  setNextIn(t) {
    const e = this.e.nextIn;
    if (t <= 0) { e.classList.add('hidden'); return; }
    e.classList.remove('hidden');
    e.textContent = `NEXT WAVE IN ${Math.ceil(t)}s  ·  B = GARAGE  ·  ENTER = SKIP`;
  },
  bossBar(e) {
    this.boss = e;
    this.e.bossWrap.classList.toggle('hidden', !e);
    if (e) { this.e.bossName.textContent = e.d.label; this.e.bossFill.style.width = '100%'; }
  },
  hurt(a) { this.vigT = Math.max(this.vigT, a); },
  abFlash() {
    const b = this.e.abBox;
    if (!b) return;
    b.classList.remove('fire'); void b.offsetWidth; b.classList.add('fire');
  },

  teamOver(g, t, win, coins, scrap) {
    $('overStats').innerHTML = [
      ['RESULT', win ? 'VICTORY' : 'DEFEAT'],
      t.mode === 'escort' ? ['CARGO DELIVERED', `${t.score.A} / 3`] : ['SCORE', `${Math.floor(t.score.A)} - ${Math.floor(t.score.B)}`],
      ['YOUR KILLS', t.myKills],
      ['DEATHS', t.myDeaths],
      ['COINS EARNED', fmt(g.earnedCoins || 0)],
      ['SCRAP EARNED', fmt(g.earnedScrap || 0)],
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('overTitle').textContent = win ? 'VICTORY' : 'DEFEAT';
    $('overTitle').style.color = win ? 'var(--green)' : 'var(--red)';
    this.show('over');
    void coins; void scrap;
  },

  gameOver(g) {
    $('overTitle').style.color = '';
    const s = $('overStats');
    const best = Save.d.best[g.mode] || 0;
    s.innerHTML = [
      ['WAVE', g.wave - 1],
      ['BEST', best],
      ['KILLS', g.kills],
      ['SCORE', fmt(g.score)],
      ['COINS EARNED', fmt(g.earnedCoins || 0)],
      ['SCRAP EARNED', fmt(g.earnedScrap || 0)],
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('overTitle').textContent = 'CAR DESTROYED';
    this.show('over');
  },
};

export default UI;

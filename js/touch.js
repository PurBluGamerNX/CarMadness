// touch.js — kawalan sentuh untuk telefon & tablet.
//
// Permainan ini direka untuk papan kekunci + tetikus. Daripada menulis semula
// enjin, lapisan ini MENIRU input yang sama:
//   • kayu bedik kiri  -> Input.keys.KeyW / KeyS / KeyA / KeyD
//   • seret di sebelah kanan -> Input.ndcX / ndcY (kedudukan bidikan)
//   • lepas / tahan butang FIRE -> Input.down
//   • butang lain -> Input.pressed[...] seperti kekunci ditekan
//
// Kerana ia menulis ke objek Input yang sama, tiada satu pun kod permainan
// perlu tahu sama ada pemain guna sentuhan atau papan kekunci.
import { Input, clamp } from './core.js';

const HAS_TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export const Touch = {
  on: false,
  stick: null,          // { id, cx, cy, x, y }
  aim: null,            // { id, ndcX, ndcY }
  fireHeld: false,

  /* Dihidupkan sendiri pada peranti sentuh; boleh juga dipaksa untuk ujian. */
  init(force) {
    if (this.on) return;
    if (!HAS_TOUCH && !force) return;
    this.on = true;
    Input.axMag = 0;                 // beritahu enjin: paksi analog aktif
    Input.axHead = 0;
    document.body.classList.add('touch');
    this.build();
    this.bind();
  },

  /* ---------------- antara muka ---------------- */
  build() {
    const host = document.createElement('div');
    host.id = 'tc';
    host.innerHTML = `
      <div id="tcZone"></div>
      <div id="tcStick"><i></i></div>
      <div id="tcAim"></div>
      <div class="tcBtns">
        <button class="tcb fire" data-act="fire">FIRE</button>
        <button class="tcb ab" data-act="ability">SP</button>
        <button class="tcb sm" data-act="target">TGT</button>
        <button class="tcb sm" data-act="nitro">NOS</button>
        <button class="tcb sm" data-act="reload">R</button>
      </div>
      <button class="tcb top" data-act="pause">II</button>
      <button class="tcb top board" data-act="board">TAB</button>`;
    document.getElementById('hud').appendChild(host);
    this.host = host;
    this.zoneEl = host.querySelector('#tcZone');
    this.stickEl = host.querySelector('#tcStick');
    this.knob = this.stickEl.querySelector('i');
  },

  /* ---------------- pengendali ---------------- */
  bind() {
    const zone = this.zoneEl, ring = this.stickEl;
    const R = 66;                       // jejari maksimum kayu bedik (px)
    const DEAD = 0.13;

    /* Kamera ialah pandangan atas tetap tanpa yaw. Atas skrin = +Z dunia,
       tetapi KANAN skrin ialah -X dunia (kamera berada di belakang kereta
       memandang ke +Z, jadi paksi X terbalik di skrin - lihat komen `rx`
       dalam updatePlayer). Tanda dx MESTI dinegatifkan, kalau tidak tolak
       kiri menjadi belok kanan. */
    const setAxis = (dx, dy) => {
      const d = Math.hypot(dx, dy) / R;
      if (d < DEAD) { Input.axMag = 0; return; }
      Input.axMag = Math.min(1, (d - DEAD) / (1 - DEAD));
      Input.axHead = Math.atan2(-dx, -dy);
    };

    // kayu bedik TERAPUNG: pusatnya berpindah ke tempat ibu jari mendarat
    zone.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.stick = { id: e.pointerId, cx: e.clientX, cy: e.clientY };
      ring.style.left = e.clientX + 'px';
      ring.style.top = e.clientY + 'px';
      ring.classList.add('live');
      Input.axMag = 0;
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', e => {
      if (!this.stick || this.stick.id !== e.pointerId) return;
      e.preventDefault();
      let dx = e.clientX - this.stick.cx, dy = e.clientY - this.stick.cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      this.knob.style.transform = `translate(${dx}px,${dy}px)`;
      setAxis(dx, dy);
    });
    const endStick = e => {
      if (!this.stick || this.stick.id !== e.pointerId) return;
      this.stick = null;
      this.knob.style.transform = '';
      ring.classList.remove('live');
      Input.axMag = 0;
    };
    zone.addEventListener('pointerup', endStick);
    zone.addEventListener('pointercancel', endStick);

    /* Bidikan: seret di mana-mana pada separuh kanan skrin. Reticle mengikut
       jari terus, sama seperti kedudukan tetikus pada desktop. */
    const aim = this.host.querySelector('#tcAim');
    const setAim = e => {
      Input.ndcX = (e.clientX / innerWidth) * 2 - 1;
      Input.ndcY = -(e.clientY / innerHeight) * 2 + 1;
      Input.mx = e.clientX; Input.my = e.clientY;
    };
    aim.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.aim = e.pointerId;
      aim.setPointerCapture(e.pointerId);
      setAim(e);
    });
    aim.addEventListener('pointermove', e => {
      if (this.aim !== e.pointerId) return;
      e.preventDefault();
      setAim(e);
    });
    const endAim = e => { if (this.aim === e.pointerId) this.aim = null; };
    aim.addEventListener('pointerup', endAim);
    aim.addEventListener('pointercancel', endAim);

    // butang
    for (const b of this.host.querySelectorAll('.tcb')) {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        b.classList.add('hit');
        this.press(act, true);
        b.setPointerCapture(e.pointerId);
      });
      const up = e => { void e; b.classList.remove('hit'); this.press(act, false); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    }
  },

  press(act, down) {
    const K = Input.keys;
    switch (act) {
      case 'fire':
        Input.down = down;
        break;
      case 'ability':
        if (down) Input.pressed.Space = true;
        K.Space = down;
        break;
      case 'nitro':
        K.ShiftLeft = down;
        break;
      case 'reload':
        if (down) Input.pressed.KeyR = true;
        break;
      case 'target':
        // tukar kepada sasaran sah yang seterusnya
        if (down && window.Game && window.Game.cycleLock) window.Game.cycleLock();
        break;
      case 'board':
        dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'Tab' }));
        break;
      case 'pause':
        if (down) dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
        break;
    }
  },

  /* Sembunyikan kawalan apabila menu terbuka. */
  show(on) {
    if (!this.on || !this.host) return;
    this.host.classList.toggle('off', !on);
    if (!on) {
      Input.down = false;
      Input.axMag = 0;
      const K = Input.keys;
      K.KeyW = K.KeyS = K.KeyA = K.KeyD = K.ShiftLeft = false;
      this.knob.style.transform = '';
      this.stickEl.classList.remove('live');
      this.stick = null;
    }
  },
};

export { HAS_TOUCH };
export default Touch;
void clamp;

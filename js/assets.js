// assets.js — tekstur & persekitaran prosedural (tiada fail imej luar)
import * as THREE from 'three';
import { lerp, clamp, rand, TAU } from './core.js';

/* ---------- bunyi nilai (value noise) boleh-jubin ---------- */
function h2(x, y, s) {
  let n = (x * 374761393 + y * 668265263 + s * 1013904223) | 0;
  n = Math.imul(n ^ (n >> 13), 1274126177);
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function wrap(v, p) { return ((v % p) + p) % p; }
function vnoise(x, y, p, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(wrap(xi, p), wrap(yi, p), s), b = h2(wrap(xi + 1, p), wrap(yi, p), s);
  const c = h2(wrap(xi, p), wrap(yi + 1, p), s), d = h2(wrap(xi + 1, p), wrap(yi + 1, p), s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct, p, s) {
  let sum = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { sum += vnoise(x * f, y * f, p * f, s + i * 37) * amp; tot += amp; amp *= 0.5; f *= 2; }
  return sum / tot;
}

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(canvas, rep = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 8;
  return t;
}
function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

/* ---------- palet tema ---------- */
export const THEMES = {
  wasteland: {
    sky: ['#0d1420', '#2a3446', '#8a5a3c', '#e0a055'], sun: '#ffcf8a', sunPos: 0.30, sunH: 0.60,
    fog: '#7a6450', fogD: 0.0031, light: '#ffd0a0', lightI: 3.3,
    hemiSky: '#7a93bd', hemiGnd: '#4a3a2a', ambI: 0.5, amb: '#2f3c58',
    g1: '#4a4136', g2: '#6f6250', g3: '#241f18', crack: '#12100e', glow: null,
    grid: '#000000', dust: [0.68, 0.56, 0.4], beam: 0.0,
  },
  alien: {
    sky: ['#07040f', '#1a0b2e', '#4a1550', '#8f2f80'], sun: '#c79bff', sunPos: 0.72, sunH: 0.78,
    fog: '#2a1440', fogD: 0.0040, light: '#b892ff', lightI: 2.0,
    hemiSky: '#6a3ab0', hemiGnd: '#1d1030', ambI: 0.7, amb: '#4a2378',
    g1: '#2b2040', g2: '#42285c', g3: '#120c1e', crack: '#07040e', glow: '#39f2d0',
    grid: '#0b0714', dust: [0.45, 0.8, 0.9], beam: 0.12,
  },
  warzone: {
    sky: ['#3a3b38', '#6b6555', '#a89372', '#e6d2a8'], sun: '#fff0cf', sunPos: 0.45, sunH: 0.82,
    fog: '#9b917a', fogD: 0.0029, light: '#fff0d2', lightI: 3.4,
    hemiSky: '#a8b6c9', hemiGnd: '#6a5e44', ambI: 0.55, amb: '#6d7688',
    g1: '#7d7154', g2: '#a0906b', g3: '#494026', crack: '#26220f', glow: null,
    grid: '#000000', dust: [0.8, 0.72, 0.52], beam: 0.0,
  },
  city: {
    sky: ['#070a12', '#141c2c', '#3d2230', '#a8382c'], sun: '#ff8a5c', sunPos: 0.18, sunH: 0.55,
    fog: '#332c3a', fogD: 0.0038, light: '#ffb07a', lightI: 2.4,
    hemiSky: '#54689a', hemiGnd: '#1a1b20', ambI: 0.62, amb: '#38456a',
    g1: '#33363c', g2: '#4a4e56', g3: '#141518', crack: '#08090b', glow: null,
    grid: '#c9c2a8', dust: [0.5, 0.52, 0.6], beam: 0.13,
  },
};

/* ---------- tanah ---------- */
const groundCache = {};
export function groundMaps(themeName) {
  if (groundCache[themeName]) return groundCache[themeName];
  const T = THEMES[themeName];
  const S = 512, P = 8;
  const c = cv(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;
  const c1 = hexRgb(T.g1), c2 = hexRgb(T.g2), c3 = hexRgb(T.g3), cc = hexRgb(T.crack);
  const cg = T.glow ? hexRgb(T.glow) : null;

  const hc = cv(S, S), hg = hc.getContext('2d');
  const himg = hg.createImageData(S, S), hd = himg.data;
  const rc = cv(S, S), rg = rc.getContext('2d');
  const rimg = rg.createImageData(S, S), rd = rimg.data;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S * P, v = y / S * P;
      const n = fbm(u, v, 5, P, 11);
      const n2 = fbm(u * 2.7 + 5, v * 2.7 + 9, 4, P * 2.7 | 0 || 8, 71);
      // retak: ridged noise
      const rv = fbm(u * 1.6, v * 1.6, 3, P, 203);
      const ridge = 1 - Math.abs(rv - 0.5) * 2;
      const crackAmt = clamp((ridge - 0.80) * 6, 0, 1) * clamp(n2 * 1.6, 0, 1);
      // butiran pasir + batu kerikil
      const grain = h2(x, y, 5) * 0.3 + h2(x >> 1, y >> 1, 9) * 0.2;
      const pebble = h2(x >> 1, y >> 1, 23) > 0.972 ? 0.55 : 0;

      let r = lerp(c1[0], c2[0], n) * (0.7 + grain + pebble);
      let gg = lerp(c1[1], c2[1], n) * (0.7 + grain + pebble);
      let b = lerp(c1[2], c2[2], n) * (0.7 + grain + pebble);
      // tompok gelap
      const dark = clamp((n2 - 0.48) * 2.6, 0, 1);
      r = lerp(r, c3[0], dark); gg = lerp(gg, c3[1], dark); b = lerp(b, c3[2], dark);
      // retak
      r = lerp(r, cc[0], crackAmt); gg = lerp(gg, cc[1], crackAmt); b = lerp(b, cc[2], crackAmt);
      // urat bercahaya (alien)
      let glowAmt = 0;
      if (cg) {
        const gr = 1 - Math.abs(fbm(u * 1.1 + 31, v * 1.1 + 17, 3, P, 401) - 0.5) * 2;
        glowAmt = clamp((gr - 0.93) * 12, 0, 1);
        r = lerp(r, cg[0], glowAmt); gg = lerp(gg, cg[1], glowAmt); b = lerp(b, cg[2], glowAmt);
      }

      const i = (y * S + x) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;

      const hgt = clamp((n * 0.7 + n2 * 0.3) * 255 * (1 - crackAmt * 0.9) + grain * 130 + pebble * 90, 0, 255);
      hd[i] = hd[i + 1] = hd[i + 2] = hgt; hd[i + 3] = 255;

      const rough = clamp(210 - dark * 40 + grain * 120 - glowAmt * 120, 60, 255);
      rd[i] = rd[i + 1] = rd[i + 2] = rough; rd[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  hg.putImageData(himg, 0, 0);
  rg.putImageData(rimg, 0, 0);

  // garisan jalan untuk tema bandar
  if (themeName === 'city') {
    g.globalAlpha = 0.5; g.strokeStyle = T.grid; g.lineWidth = 6; g.setLineDash([46, 44]);
    g.beginPath(); g.moveTo(S * 0.5, 0); g.lineTo(S * 0.5, S); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
  }

  const rep = 78;
  const out = {
    map: tex(c, rep), bump: tex(hc, rep), rough: tex(rc, rep),
    macro: macroTex(themeName),
  };
  out.map.colorSpace = THREE.SRGBColorSpace;
  groundCache[themeName] = out;
  return out;
}

function macroTex(themeName) {
  const S = 256, c = cv(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / S * 3, y / S * 3, 4, 3, 909);
    const i = (y * S + x) * 4;
    const a = clamp((n - 0.40) * 340, 0, 165);
    d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = a;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, 5);
  return t;
}

/* ---------- langit / persekitaran ---------- */
const envCache = {};
export function skyEnv(renderer, themeName) {
  if (envCache[themeName]) return envCache[themeName];
  const T = THEMES[themeName];
  const W = 1024, H = 512, c = cv(W, H), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, T.sky[0]);
  grad.addColorStop(0.34, T.sky[1]);
  grad.addColorStop(0.47, T.sky[2]);
  grad.addColorStop(0.5, T.sky[3]);
  grad.addColorStop(0.52, T.sky[2]);
  grad.addColorStop(1, T.sky[0]);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);

  // awan
  g.globalAlpha = 0.5;
  for (let i = 0; i < 260; i++) {
    const x = rand(W), y = rand(H * 0.06, H * 0.47), s = rand(24, 130);
    const a = (1 - Math.abs(y / H - 0.25) * 2.4);
    const rg = g.createRadialGradient(x, y, 0, x, y, s);
    rg.addColorStop(0, `rgba(255,255,255,${clamp(a, 0, 1) * 0.14})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;

  // matahari / bulan
  const sx = T.sunPos * W, sy = (1 - T.sunH) * H * 0.9;
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 180);
  sg.addColorStop(0, T.sun); sg.addColorStop(0.08, T.sun);
  sg.addColorStop(0.3, 'rgba(255,200,140,0.22)');
  sg.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 180, 0, TAU); g.fill();

  if (themeName === 'alien') {
    g.globalAlpha = 0.35;
    for (let i = 0; i < 3; i++) {
      const y = H * (0.12 + i * 0.05);
      const ag = g.createLinearGradient(0, y - 40, 0, y + 40);
      ag.addColorStop(0, 'rgba(57,242,208,0)');
      ag.addColorStop(0.5, i % 2 ? 'rgba(57,242,208,0.5)' : 'rgba(200,90,255,0.45)');
      ag.addColorStop(1, 'rgba(57,242,208,0)');
      g.fillStyle = ag; g.fillRect(0, y - 40, W, 80);
    }
    g.globalAlpha = 1;
    // bintang
    for (let i = 0; i < 500; i++) {
      const x = rand(W), y = rand(H * 0.42);
      g.fillStyle = `rgba(255,255,255,${rand(0.15, 0.85)})`;
      g.fillRect(x, y, rand(1, 2.2), rand(1, 2.2));
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(t).texture;
  pmrem.dispose();
  const res = { sky: t, env };
  envCache[themeName] = res;
  return res;
}

/* ---------- sprite ---------- */
function spriteCache(fn) { let t = null; return () => (t || (t = fn())); }

export const Sprites = {
  glow: spriteCache(() => {
    const S = 128, c = cv(S, S), g = c.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.18, 'rgba(255,255,255,0.85)');
    rg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }),
  smoke: spriteCache(() => {
    const S = 128, c = cv(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2);
      const r = Math.sqrt(dx * dx + dy * dy);
      const n = fbm(x / S * 4, y / S * 4, 4, 4, 55);
      const a = clamp((1 - r) * 1.5, 0, 1) * clamp(n * 1.7, 0, 1);
      const i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = a * a * 255;
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }),
  spark: spriteCache(() => {
    const S = 64, c = cv(S, S), g = c.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, TAU); g.fill();
    return new THREE.CanvasTexture(c);
  }),
  ring: spriteCache(() => {
    const S = 256, c = cv(S, S), g = c.getContext('2d');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.68, 'rgba(255,255,255,0)');
    rg.addColorStop(0.82, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.94, 'rgba(255,255,255,0.25)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }),
  blood: spriteCache(() => {
    const S = 128, c = cv(S, S), g = c.getContext('2d');
    g.translate(S / 2, S / 2);
    for (let i = 0; i < 16; i++) {
      const a = rand(TAU), r = rand(6, 42), s = rand(5, 19);
      g.fillStyle = `rgba(${randInt2(90, 140)},${randInt2(6, 20)},${randInt2(8, 22)},${rand(0.5, 0.95)})`;
      g.beginPath(); g.ellipse(Math.cos(a) * r, Math.sin(a) * r, s, s * rand(0.6, 1.2), a, 0, TAU); g.fill();
    }
    for (let i = 0; i < 26; i++) {
      const a = rand(TAU), r = rand(30, 60);
      g.fillStyle = `rgba(110,14,16,${rand(0.3, 0.8)})`;
      g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, rand(1.5, 5), 0, TAU); g.fill();
    }
    return new THREE.CanvasTexture(c);
  }),
  scorch: spriteCache(() => {
    const S = 128, c = cv(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2);
      const r = Math.sqrt(dx * dx + dy * dy);
      const n = fbm(x / S * 5, y / S * 5, 4, 5, 77);
      const a = clamp((1 - r * (0.72 + n * 0.55)) * 2.2, 0, 1);
      const i = (y * S + x) * 4;
      const v = 14 + n * 22;
      d[i] = v; d[i + 1] = v * 0.85; d[i + 2] = v * 0.8; d[i + 3] = a * 235;
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }),
  flare: spriteCache(() => {
    const S = 128, c = cv(S, S), g = c.getContext('2d');
    g.translate(S / 2, S / 2);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.25, 'rgba(255,255,255,0.3)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, S / 2, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 4);
      const lg = g.createLinearGradient(-S / 2, 0, S / 2, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(-S / 2, -2.2, S, 4.4);
    }
    return new THREE.CanvasTexture(c);
  }),
};
function randInt2(a, b) { return Math.floor(rand(a, b + 1)); }

/* ---------- tekstur logam calar untuk kereta ---------- */
let carRough = null;
export function carRoughness() {
  if (carRough) return carRough;
  const S = 256, c = cv(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / S * 6, y / S * 6, 4, 6, 313);
    const scratch = h2(x, y >> 3, 17) > 0.985 ? 60 : 0;
    const i = (y * S + x) * 4;
    const v = clamp(70 + n * 90 + scratch, 0, 255);
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  carRough = tex(c, 2);
  return carRough;
}

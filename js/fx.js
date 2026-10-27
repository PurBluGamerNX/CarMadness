// fx.js — zarah, kesan letupan, pancaran, kesan darah/hangus
import * as THREE from 'three';
import { Sprites } from './assets.js';
import { rand, clamp, lerp, TAU, PI } from './core.js';

/* ---------------- sistem zarah (Points + shader ringkas) ---------------- */
const PVERT = `
attribute float aSize; attribute vec3 aColor; attribute float aAlpha;
varying vec3 vC; varying float vA;
void main(){
  vC = aColor; vA = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (420.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;
const PFRAG = `
uniform sampler2D uMap;
varying vec3 vC; varying float vA;
void main(){
  vec4 t = texture2D(uMap, gl_PointCoord);
  gl_FragColor = vec4(vC, 1.0) * t * vA;
  if (gl_FragColor.a < 0.004) discard;
}`;

class Particles {
  constructor(scene, texture, blending, max, depthTest = true) {
    this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max);
    this.alp = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alp, 1));
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const m = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: texture } },
      vertexShader: PVERT, fragmentShader: PFRAG,
      transparent: true, depthWrite: false, depthTest, blending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = blending === THREE.AdditiveBlending ? 6 : 5;
    scene.add(this.points);
    // data
    const f = n => new Float32Array(max * n);
    this.p = f(3); this.v = f(3); this.c0 = f(3); this.c1 = f(3);
    this.s0 = f(1); this.s1 = f(1); this.life = f(1); this.maxLife = f(1);
    this.a0 = f(1); this.drag = f(1); this.grav = f(1); this.flag = new Uint8Array(max);
  }
  emit(x, y, z, vx, vy, vz, o) {
    let i = this.n;
    if (i >= this.max) i = (Math.random() * this.max) | 0; else this.n++;
    const i3 = i * 3;
    this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z;
    this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    const c0 = o.color, c1 = o.color2 || o.color;
    this.c0[i3] = c0[0]; this.c0[i3 + 1] = c0[1]; this.c0[i3 + 2] = c0[2];
    this.c1[i3] = c1[0]; this.c1[i3 + 1] = c1[1]; this.c1[i3 + 2] = c1[2];
    this.s0[i] = o.size; this.s1[i] = o.size2 !== undefined ? o.size2 : o.size;
    this.life[i] = this.maxLife[i] = o.life;
    this.a0[i] = o.alpha !== undefined ? o.alpha : 1;
    this.drag[i] = o.drag !== undefined ? o.drag : 1.2;
    this.grav[i] = o.grav !== undefined ? o.grav : 0;
    this.flag[i] = o.ground ? 1 : 0;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        n--;
        if (i !== n) {
          const a = i * 3, b = n * 3;
          for (let k = 0; k < 3; k++) {
            this.p[a + k] = this.p[b + k]; this.v[a + k] = this.v[b + k];
            this.c0[a + k] = this.c0[b + k]; this.c1[a + k] = this.c1[b + k];
          }
          this.s0[i] = this.s0[n]; this.s1[i] = this.s1[n];
          this.life[i] = this.life[n]; this.maxLife[i] = this.maxLife[n];
          this.a0[i] = this.a0[n]; this.drag[i] = this.drag[n];
          this.grav[i] = this.grav[n]; this.flag[i] = this.flag[n];
        }
        i--; continue;
      }
      const i3 = i * 3;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i3] *= d; this.v[i3 + 1] *= d; this.v[i3 + 2] *= d;
      this.v[i3 + 1] += this.grav[i] * dt;
      this.p[i3] += this.v[i3] * dt;
      this.p[i3 + 1] += this.v[i3 + 1] * dt;
      this.p[i3 + 2] += this.v[i3 + 2] * dt;
      if (this.flag[i] && this.p[i3 + 1] < 0.08) { this.p[i3 + 1] = 0.08; this.v[i3 + 1] *= -0.32; this.v[i3] *= 0.7; this.v[i3 + 2] *= 0.7; }
      const t = 1 - this.life[i] / this.maxLife[i];
      this.pos[i3] = this.p[i3]; this.pos[i3 + 1] = this.p[i3 + 1]; this.pos[i3 + 2] = this.p[i3 + 2];
      this.col[i3] = lerp(this.c0[i3], this.c1[i3], t);
      this.col[i3 + 1] = lerp(this.c0[i3 + 1], this.c1[i3 + 1], t);
      this.col[i3 + 2] = lerp(this.c0[i3 + 2], this.c1[i3 + 2], t);
      this.siz[i] = lerp(this.s0[i], this.s1[i], t);
      this.alp[i] = this.a0[i] * Math.min(1, t * 9) * (1 - t) * (1 - t * 0.2);
    }
    this.n = n;
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    if (n > 0) {
      g.attributes.position.needsUpdate = true;
      g.attributes.aColor.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
    }
  }
}

/* ---------------- pengurus kesan ---------------- */
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

export class FX {
  constructor(scene, quality) {
    this.scene = scene;
    this.q = quality;
    const mul = quality === 'low' ? 0.45 : quality === 'high' ? 1.3 : 1;
    this.add = new Particles(scene, Sprites.spark(), THREE.AdditiveBlending, Math.floor(2600 * mul));
    this.smk = new Particles(scene, Sprites.smoke(), THREE.NormalBlending, Math.floor(900 * mul));

    // letupan: bebola + cincin
    this.booms = [];
    const fireMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 14; i++) {
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), fireMat());
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        map: Sprites.ring(), color: 0xffffff, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      ring.rotation.x = -PI / 2;
      ball.visible = ring.visible = false;
      ball.frustumCulled = false; ring.frustumCulled = false;
      scene.add(ball); scene.add(ring);
      this.booms.push({ ball, ring, t: 0, dur: 0, r: 1, on: false });
    }

    // cincin kebolehan (animasi bila SPACE ditekan)
    this.rings = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: Sprites.ring(), color: 0xffffff, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      m.rotation.x = -PI / 2;
      m.visible = false; m.frustumCulled = false;
      m.renderOrder = 7;
      scene.add(m);
      this.rings.push({ m, t: 0, dur: 0, r0: 1, r1: 10, on: false });
    }

    // pancaran (laser / kilat / rel)
    this.beams = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      m.visible = false; m.frustumCulled = false;
      scene.add(m);
      this.beams.push({ m, t: 0, dur: 0, on: false, w: 1 });
    }

    // lampu dinamik tetap (elak kompil semula shader)
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const L = new THREE.PointLight(0xffffff, 0, 46, 2);
      L.position.set(0, -999, 0);
      scene.add(L);
      this.lights.push({ L, t: 0, dur: 0, peak: 0 });
    }
    this.lightI = 0;

    // kesan atas tanah
    this.decals = {
      blood: this._decalPool(Sprites.blood(), 0x8a1414, quality === 'low' ? 48 : 130),
      scorch: this._decalPool(Sprites.scorch(), 0x2a2420, quality === 'low' ? 26 : 70),
    };
  }

  _decalPool(map, color, max) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map, color, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -6, opacity: 0.85,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2;
    mesh.receiveShadow = false;
    this.scene.add(mesh);
    return { mesh, i: 0, max, n: 0 };
  }

  decal(type, x, z, size, rot) {
    const p = this.decals[type];
    if (!p) return;
    _v.set(x, 0.035 + (p.i % 7) * 0.004, z);
    _q.setFromAxisAngle(_up, rot !== undefined ? rot : rand(TAU));
    _s.set(size, 1, size);
    _m.compose(_v, _q, _s);
    p.mesh.setMatrixAt(p.i, _m);
    p.mesh.instanceMatrix.needsUpdate = true;
    p.i = (p.i + 1) % p.max;
    p.n = Math.min(p.n + 1, p.max);
    p.mesh.count = p.n;
  }

  spark(x, y, z, n, color, opt = {}) {
    const sp = opt.speed || 7;
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), e = rand(-0.2, 1.1), s = rand(0.35, 1) * sp;
      this.add.emit(x, y, z,
        Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + (opt.up || 0), Math.sin(a) * Math.cos(e) * s, {
        color, color2: opt.color2 || [color[0] * 0.5, color[1] * 0.22, color[2] * 0.1],
        size: opt.size || rand(0.3, 0.7), size2: (opt.size || 0.5) * 0.15,
        life: opt.life || rand(0.25, 0.6), alpha: opt.alpha || 1,
        drag: opt.drag || 2.2, grav: opt.grav !== undefined ? opt.grav : -14, ground: opt.ground !== false,
      });
    }
  }

  smoke(x, y, z, n, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), s = rand(0.2, 1) * (opt.speed || 2);
      this.smk.emit(x, y, z,
        Math.cos(a) * s, rand(0.6, 2.4) * (opt.rise || 1), Math.sin(a) * s, {
        color: opt.color || [0.26, 0.25, 0.24], color2: opt.color2 || [0.1, 0.1, 0.11],
        size: opt.size || rand(1.4, 2.6), size2: (opt.size || 2) * rand(2.2, 3.4),
        life: opt.life || rand(0.9, 1.8), alpha: opt.alpha !== undefined ? opt.alpha : 0.5,
        drag: 1.0, grav: 0.4,
      });
    }
  }

  blood(x, y, z, n, color) {
    const c = color || [0.62, 0.05, 0.06];
    for (let i = 0; i < n; i++) {
      const a = rand(TAU), e = rand(-0.1, 1.0), s = rand(1.5, 7);
      this.smk.emit(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 1.5, Math.sin(a) * Math.cos(e) * s, {
        color: c, color2: [c[0] * 0.35, c[1] * 0.3, c[2] * 0.3],
        size: rand(0.25, 0.65), size2: rand(0.1, 0.3),
        life: rand(0.35, 0.8), alpha: 0.95, drag: 0.7, grav: -17,
      });
    }
  }

  flash(x, y, z, color, intensity, dur = 0.12, dist = 40) {
    const l = this.lights[this.lightI = (this.lightI + 1) % this.lights.length];
    l.L.position.set(x, y, z);
    l.L.color.setRGB(color[0], color[1], color[2]);
    l.L.distance = dist;
    l.peak = intensity; l.t = 0; l.dur = dur;
    l.L.intensity = intensity;
  }

  muzzle(x, y, z, dx, dy, dz, scale, color) {
    this.add.emit(x, y, z, dx * 3, dy * 3, dz * 3, {
      color: [color[0] * 1.6, color[1] * 1.5, color[2] * 1.2], color2: [color[0], color[1] * 0.5, 0],
      size: 2.4 * scale, size2: 0.4 * scale, life: 0.075, alpha: 1, drag: 6, grav: 0,
    });
    for (let i = 0; i < 4 * scale; i++) {
      const sp = rand(3, 11);
      this.add.emit(x, y, z,
        dx * sp + rand(-2, 2), dy * sp + rand(-1, 2), dz * sp + rand(-2, 2), {
        color: [1.6, 1.1, 0.45], color2: [0.8, 0.2, 0.05],
        size: rand(0.16, 0.36) * scale, size2: 0.02, life: rand(0.07, 0.2), drag: 3.5, grav: -6,
      });
    }
    this.flash(x, y, z, color, 9 * scale, 0.07, 24);
  }

  explode(x, y, z, radius, color, opt = {}) {
    const b = this.booms.find(b => !b.on) || this.booms[0];
    b.on = true; b.t = 0; b.dur = opt.dur || 0.55; b.r = radius;
    b.ball.material.color.setRGB(color[0], color[1], color[2]);
    b.ring.material.color.setRGB(color[0] * 0.9 + 0.3, color[1] * 0.8 + 0.2, color[2] * 0.7 + 0.15);
    b.ball.position.set(x, y, z);
    b.ring.position.set(x, 0.3, z);
    b.ball.visible = b.ring.visible = true;
    b.ball.scale.setScalar(radius * 0.25);
    b.ring.scale.setScalar(radius * 0.6);

    const nS = this.q === 'low' ? 10 : 26, nK = this.q === 'low' ? 6 : 14;
    this.spark(x, y, z, nS, [2.2, 1.3, 0.45], { speed: radius * 3.2, size: 0.55, life: rand(0.4, 0.9), grav: -16 });
    this.smoke(x, y + 0.4, z, nK, { speed: radius * 0.9, size: radius * 0.5, life: rand(1.2, 2.4), alpha: 0.6, rise: 1.4 });
    this.flash(x, y + 1, z, [color[0] + 0.4, color[1] * 0.8, color[2] * 0.4], radius * 7, 0.3, radius * 7);
    this.decal('scorch', x, z, radius * 1.7);
  }

  // cincin tenaga yang mengembang dari kereta
  abilityRing(x, z, color, r0 = 2, r1 = 16, dur = 0.55) {
    const r = this.rings.find(k => !k.on) || this.rings[0];
    r.on = true; r.t = 0; r.dur = dur; r.r0 = r0; r.r1 = r1;
    r.m.position.set(x, 0.35, z);
    r.m.material.color.setRGB(color[0], color[1], color[2]);
    r.m.material.opacity = 1;
    r.m.scale.setScalar(r0);
    r.m.visible = true;
  }

  beam(ax, ay, az, bx, by, bz, color, width, dur = 0.09) {
    const b = this.beams.find(b => !b.on) || this.beams[0];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
    b.m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    b.m.quaternion.setFromUnitVectors(_up, _v.set(dx / len, dy / len, dz / len));
    b.m.scale.set(width, len, width);
    b.m.material.color.setRGB(color[0], color[1], color[2]);
    b.m.material.opacity = 1;
    b.m.visible = true; b.on = true; b.t = 0; b.dur = dur; b.w = width;
    return b;
  }

  // kilat bercabang (tesla)
  lightning(ax, ay, az, bx, by, bz, color, segs = 5) {
    let px = ax, py = ay, pz = az;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const nx = lerp(ax, bx, t) + (i < segs ? rand(-1.1, 1.1) : 0);
      const ny = lerp(ay, by, t) + (i < segs ? rand(-0.7, 0.9) : 0);
      const nz = lerp(az, bz, t) + (i < segs ? rand(-1.1, 1.1) : 0);
      this.beam(px, py, pz, nx, ny, nz, color, 0.09, 0.11);
      px = nx; py = ny; pz = nz;
    }
  }

  update(dt) {
    this.add.update(dt);
    this.smk.update(dt);
    for (const b of this.booms) {
      if (!b.on) continue;
      b.t += dt;
      const t = b.t / b.dur;
      if (t >= 1) { b.on = false; b.ball.visible = b.ring.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 3);
      b.ball.scale.setScalar(b.r * (0.25 + e * 1.15));
      b.ball.material.opacity = Math.pow(1 - t, 1.6);
      b.ball.rotation.y += dt * 2;
      b.ring.scale.setScalar(b.r * (0.6 + e * 4.2));
      b.ring.material.opacity = Math.pow(1 - t, 2.2) * 0.85;
    }
    for (const r of this.rings) {
      if (!r.on) continue;
      r.t += dt;
      const t = r.t / r.dur;
      if (t >= 1) { r.on = false; r.m.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 3);
      r.m.scale.setScalar(lerp(r.r0, r.r1, e));
      r.m.material.opacity = Math.pow(1 - t, 1.8);
    }
    for (const b of this.beams) {
      if (!b.on) continue;
      b.t += dt;
      const t = b.t / b.dur;
      if (t >= 1) { b.on = false; b.m.visible = false; continue; }
      b.m.material.opacity = 1 - t;
      const w = b.w * (1 - t * 0.55);
      b.m.scale.x = w; b.m.scale.z = w;
    }
    for (const l of this.lights) {
      if (l.L.intensity <= 0) continue;
      l.t += dt;
      const t = l.t / l.dur;
      if (t >= 1) { l.L.intensity = 0; l.L.position.y = -999; continue; }
      l.L.intensity = l.peak * (1 - t) * (1 - t);
    }
  }
}

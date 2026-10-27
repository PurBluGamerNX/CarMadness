// world.js — arena, tanah, pencahayaan, prop
import * as THREE from 'three';
import { groundMaps, skyEnv, THEMES } from './assets.js';
import { propDefs, MATS } from './models.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rand, randInt, pick, clamp, TAU, PI } from './core.js';

import { MAPS, buildMap } from './maps.js';
/* Saiz arena kini ikut peta (peta pasukan baharu lebih besar/panjang).
   `export let` = pengikatan HIDUP: semua modul yang import HALF nampak nilai
   baharu selepas setArena(). Mesti dipanggil SEBELUM World dibina. */
export let ARENA = 240;            // saiz sisi arena (unit = ~meter)
export let HALF = ARENA / 2;
export function setArena(size) { ARENA = size || 240; HALF = ARENA / 2; }

export class World {
  constructor(scene, renderer, theme, quality, layout) {
    this.scene = scene;
    this.layout = layout || null;
    this.theme = theme;
    this.q = quality;
    this.T = THEMES[theme];
    this.props = [];
    this.objs = [];
    this.build(renderer);
  }

  build(renderer) {
    const T = this.T, scene = this.scene;

    // langit + persekitaran
    const { sky, env } = skyEnv(renderer, this.theme);
    scene.background = sky;
    scene.environment = env;
    scene.fog = new THREE.FogExp2(new THREE.Color(T.fog), T.fogD);

    // tanah
    const gm = groundMaps(this.theme);
    const groundMat = new THREE.MeshStandardMaterial({
      map: gm.map, bumpMap: gm.bump, bumpScale: 1.6, roughnessMap: gm.rough,
      roughness: 1, metalness: 0.02, color: 0xffffff,
    });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), groundMat);
    g.rotation.x = -PI / 2;
    g.receiveShadow = true;
    scene.add(g);
    this.ground = g;
    this.objs.push(g);

    // lapisan makro (pecahkan corak berulang)
    const macroMat = new THREE.MeshBasicMaterial({
      map: gm.macro, transparent: true, opacity: 0.42, depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const macro = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), macroMat);
    macro.rotation.x = -PI / 2;
    macro.position.y = 0.012;
    macro.renderOrder = 1;
    scene.add(macro);
    this.objs.push(macro);

    // cahaya
    const sun = new THREE.DirectionalLight(new THREE.Color(T.light), T.lightI);
    sun.position.set(60, 80, 40);
    sun.castShadow = true;
    const S = this.q === 'low' ? 1024 : this.q === 'high' ? 3072 : 2048;
    sun.shadow.mapSize.set(S, S);
    const d = 58;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 260;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.035;
    scene.add(sun); scene.add(sun.target);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(new THREE.Color(T.hemiSky || T.sky[2]), new THREE.Color(T.hemiGnd || T.g1), T.ambI * 1.2);
    scene.add(hemi);
    this.hemi = hemi;
    const amb = new THREE.AmbientLight(new THREE.Color(T.amb), T.ambI * 0.5);
    scene.add(amb);

    this.buildBarrier();
    if (this.layout === 'valley') this.buildValley();
    else if (this.layout && MAPS[this.layout]) buildMap(this, this.layout);
    else this.buildProps();
    this.buildDebris();
  }

  buildBarrier() {
    const geo = new THREE.BoxGeometry(6, 3.2, 1.4);
    const mat = this.theme === 'alien'
      ? new THREE.MeshStandardMaterial({ color: 0x2a1d3f, roughness: 0.7, metalness: 0.3 })
      : MATS.concrete.clone();
    const n = Math.ceil(ARENA / 6) * 4 + 8;
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const o = new THREE.Object3D();
    let i = 0;
    const place = (x, z, ry) => {
      if (i >= n) return;
      o.position.set(x, 1.6 + rand(-0.12, 0.12), z);
      o.rotation.set(rand(-0.03, 0.03), ry + rand(-0.04, 0.04), rand(-0.04, 0.04));
      o.scale.set(1, 1, 1);
      o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
    };
    for (let x = -HALF; x <= HALF; x += 6) { place(x, -HALF, 0); place(x, HALF, 0); }
    for (let z = -HALF + 6; z < HALF; z += 6) { place(-HALF, z, PI / 2); place(HALF, z, PI / 2); }
    mesh.count = i;
    this.scene.add(mesh);
    this.objs.push(mesh);

    // bukit batu hiasan di luar arena (memberi kedalaman pada ufuk)
    const tgeo = new THREE.IcosahedronGeometry(1, 0);
    const tmat = new THREE.MeshStandardMaterial({
      color: this.theme === 'alien' ? 0x241a38 : this.theme === 'city' ? 0x24262b : 0x4a4136,
      roughness: 1, metalness: 0, flatShading: true,
    });
    const N = 46;
    const tm = new THREE.InstancedMesh(tgeo, tmat, N);
    tm.castShadow = true; tm.receiveShadow = true;
    let j = 0;
    for (let k = 0; k < N; k++) {
      const a = rand(TAU), r = rand(HALF + 20, HALF + 190);
      const sy = rand(4, 16);
      o.position.set(Math.cos(a) * r, sy * 0.55, Math.sin(a) * r);
      o.rotation.set(rand(-0.2, 0.2), rand(TAU), rand(-0.2, 0.2));
      o.scale.set(rand(6, 20), sy, rand(6, 20));
      o.updateMatrix(); tm.setMatrixAt(j++, o.matrix);
    }
    tm.count = j;
    this.scene.add(tm);
    this.objs.push(tm);
  }

  // serpihan kecil bertaburan — memberi rujukan skala pada tanah
  buildDebris() {
    const n = this.q === 'low' ? 120 : 280;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const m = new THREE.MeshStandardMaterial({
      color: this.theme === 'alien' ? 0x2e2246 : this.theme === 'city' ? 0x2b2d32 : 0x554a3c,
      roughness: 1, metalness: 0, flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geo, m, n);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const s = rand(0.12, 0.55);
      o.position.set(rand(-HALF, HALF), s * 0.35, rand(-HALF, HALF));
      o.rotation.set(rand(TAU), rand(TAU), rand(TAU));
      o.scale.set(s * rand(1, 2.4), s * rand(0.4, 0.9), s * rand(1, 2.4));
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
    mesh.count = n;
    this.scene.add(mesh);
    this.objs.push(mesh);
  }

  /* Halangan diletak sebagai KELOMPOK LITUPAN, bukan bertaburan rawak.
     Lorong antara kelompok dibiarkan luas supaya kereta senang bergerak,
     dan dinding cukup tinggi untuk menahan peluru musuh. */
  buildProps() {
    const defs = propDefs(this.theme);
    const byName = {};
    for (const d of defs) byName[d.name] = d;
    const low = this.q === 'low';

    const spots = [];
    const free = (x, z, r, gap) => {
      if (Math.hypot(x, z) < 30) return false;                       // tengah arena kekal lapang
      if (Math.abs(x) > HALF - 12 || Math.abs(z) > HALF - 12) return false;
      for (const sp of spots) if (Math.hypot(sp.x - x, sp.z - z) < sp.r + r + gap) return false;
      return true;
    };

    // ---- kelompok dinding litupan ----
    const walls = [];
    const nCluster = low ? 7 : 10;
    for (let i = 0, guard = 0; i < nCluster && guard < 500; guard++) {
      const ang = rand(TAU), rad = rand(38, HALF - 30);
      const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
      if (!free(cx, cz, 9, 22)) continue;
      spots.push({ x: cx, z: cz, r: 9 });
      i++;
      let px = cx, pz = cz, a2 = rand(TAU);
      const cnt = randInt(2, 3);
      for (let k = 0; k < cnt; k++) {
        walls.push({ x: px, z: pz, a: a2 });
        px += Math.cos(a2) * 5.0;
        pz += Math.sin(a2) * 5.0;
        if (Math.random() < 0.65) a2 += (Math.random() < 0.5 ? 1 : -1) * PI / 2;
      }
    }

    const wallGeo = new RoundedBoxGeometry(5.0, 2.4, 0.8, 2, 0.1);
    const wallMesh = new THREE.InstancedMesh(wallGeo, byName.wall.mat, Math.max(1, walls.length));
    wallMesh.castShadow = true; wallMesh.receiveShadow = true;
    wallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const o = new THREE.Object3D();
    walls.forEach((w, i) => {
      o.position.set(w.x, 1.2, w.z);
      o.rotation.set(0, -w.a, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      wallMesh.setMatrixAt(i, o.matrix);
      // dua bulatan perlanggaran bagi setiap dinding supaya litupan penuh
      for (const t of [-1.35, 1.35]) {
        this.props.push({
          x: w.x + Math.cos(w.a) * t, z: w.z + Math.sin(w.a) * t, r: 1.7,
          mesh: wallMesh, idx: i, explosive: false, hp: 999, type: 'wall', alive: true, h: 2.4,
        });
      }
    });
    wallMesh.count = walls.length;
    this.scene.add(wallMesh);
    this.objs.push(wallMesh);

    // ---- halangan bertaburan (sedikit sahaja, berjauhan) ----
    const scatter = low
      ? { rock: 7, crate: 4, barrel: 6, wreck: 4 }
      : { rock: 11, crate: 6, barrel: 9, wreck: 6 };
    for (const name in scatter) {
      const def = byName[name];
      if (!def) continue;
      const n = scatter[name];
      const mesh = new THREE.InstancedMesh(def.geo, def.mat, n);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      let i = 0, guard = 0;
      while (i < n && guard++ < 500) {
        const x = rand(-HALF + 14, HALF - 14), z = rand(-HALF + 14, HALF - 14);
        if (!free(x, z, def.radius, 15)) continue;
        spots.push({ x, z, r: def.radius });
        o.position.set(x, 0, z);
        o.rotation.set(0, 0, 0);
        o.scale.set(1, 1, 1);
        def.make(o);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
        const scl = Math.max(o.scale.x, o.scale.z);
        this.props.push({
          x, z, r: def.radius * (name === 'rock' ? scl : 1),
          mesh, idx: i, explosive: !!def.explosive, hp: def.explosive ? 1 : 999,
          type: name, alive: true, h: 1.4,
        });
        i++;
      }
      mesh.count = i;
      this.scene.add(mesh);
      this.objs.push(mesh);
    }

    this.buildLandmark();
    this.buildScenery();
  }

  /* mercu tanda di tengah arena — membantu pemain tahu di mana mereka berada */
  buildLandmark() {
    const T = this.T;
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(21, 48),
      new THREE.MeshStandardMaterial({
        color: this.theme === 'alien' ? 0x241a3a : this.theme === 'warzone' ? 0x6d6247 : 0x3a3a3e,
        roughness: 0.95, metalness: 0.05,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      }));
    pad.rotation.x = -PI / 2;
    pad.position.y = 0.02;
    pad.receiveShadow = true;
    this.scene.add(pad);
    this.objs.push(pad);

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.theme === 'alien' ? 0x39f2d0 : this.theme === 'city' ? 0xffb23f : 0xffd9a0,
      transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (const r of [21, 12.5]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.35, r, 64), ringMat);
      ring.rotation.x = -PI / 2;
      ring.position.y = 0.05;
      ring.renderOrder = 2;
      this.scene.add(ring);
      this.objs.push(ring);
    }

    // tiang tinggi di sekeliling pad: penanda arah, mudah dielak
    const pyGeo = new THREE.CylinderGeometry(0.55, 0.8, 11, 6);
    const pyMat = new THREE.MeshStandardMaterial({
      color: this.theme === 'alien' ? 0x3a2b55 : 0x6b6560, roughness: 0.9, metalness: 0.2, flatShading: true,
    });
    const py = new THREE.InstancedMesh(pyGeo, pyMat, 6);
    py.castShadow = true; py.receiveShadow = true;
    const o = new THREE.Object3D();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4, r = 26;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      o.position.set(x, 5.5, z);
      o.rotation.set(0, rand(TAU), 0);
      o.scale.set(1, rand(0.75, 1.25), 1);
      o.updateMatrix();
      py.setMatrixAt(i, o.matrix);
      this.props.push({ x, z, r: 1.3, mesh: py, idx: i, explosive: false, hp: 999, type: 'pylon', alive: true, h: 11 });
    }
    py.count = 6;
    this.scene.add(py);
    this.objs.push(py);

    const glowGeo = new THREE.SphereGeometry(0.75, 10, 8);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x101018,
      emissive: this.theme === 'alien' ? 0x39f2d0 : this.theme === 'warzone' ? 0xff6a3a : 0xffb23f,
      emissiveIntensity: 2.6, roughness: 0.4,
    });
    const gl = new THREE.InstancedMesh(glowGeo, glowMat, 6);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + 0.4, r = 26;
      o.position.set(Math.cos(a) * r, 11.4, Math.sin(a) * r);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      gl.setMatrixAt(i, o.matrix);
    }
    gl.count = 6;
    this.scene.add(gl);
    this.objs.push(gl);
    void T;
  }

  /* hiasan tinggi tanpa perlanggaran — peta nampak hidup tanpa menyekat kereta */
  buildScenery() {
    const n = this.q === 'low' ? 26 : 54;
    let geo, mat;
    if (this.theme === 'alien') {
      geo = new THREE.ConeGeometry(0.55, 5.5, 5);
      mat = new THREE.MeshStandardMaterial({
        color: 0x2a1c44, emissive: 0x39f2d0, emissiveIntensity: 0.5,
        roughness: 0.35, metalness: 0.3, flatShading: true,
      });
    } else if (this.theme === 'city') {
      geo = new THREE.CylinderGeometry(0.16, 0.2, 6.5, 5);
      mat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.8, metalness: 0.5 });
    } else {
      geo = new THREE.ConeGeometry(0.4, 4.5, 5);
      mat = new THREE.MeshStandardMaterial({ color: 0x4a3f30, roughness: 1, metalness: 0, flatShading: true });
    }
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = true;
    const o = new THREE.Object3D();
    let i = 0, guard = 0;
    while (i < n && guard++ < 600) {
      const x = rand(-HALF + 6, HALF - 6), z = rand(-HALF + 6, HALF - 6);
      if (Math.hypot(x, z) < 30) continue;
      let ok = true;
      for (const pr of this.props) if (Math.hypot(pr.x - x, pr.z - z) < pr.r + 3) { ok = false; break; }
      if (!ok) continue;
      const sc = rand(0.6, 1.5);
      o.position.set(x, (this.theme === 'city' ? 3.2 : 2.2) * sc, z);
      o.rotation.set(rand(-0.12, 0.12), rand(TAU), rand(-0.12, 0.12));
      o.scale.set(sc, sc, sc);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      i++;
    }
    mesh.count = i;
    this.scene.add(mesh);
    this.objs.push(mesh);
  }

  /* ---------- peta pasukan "Dead Valley" (ilham peta War Robots) ----------
     Dua pangkalan di hujung utara/selatan, tiga lorong dipisahkan dua rabung
     batu, plaza tengah bertutup, dan kompaun runtuhan di setiap suar sisi.
     Setiap blok ada bulatan perlanggaran supaya kereta & peluru tertahan. */
  buildValley() {
    const o = new THREE.Object3D();
    const col = (x, z, r, h, type = 'wall') => this.props.push({ x, z, r, mesh: null, idx: -1, explosive: false, hp: 999, type, alive: true, h });
    const boxes = [];    // {x,z,w,d,h,ry,kind}
    const rocks = [];    // {x,z,s,h}

    // rabung batu memisahkan lorong (celah di tengah untuk menyeberang)
    for (const sx of [-1, 1]) {
      for (let z = -38; z <= 38; z += 5.5) {
        if (Math.abs(z) < 7) continue;
        const x = sx * 38 + Math.sin(z * 0.31) * 2.2;
        rocks.push({ x, z, s: 3.4 + Math.abs(Math.sin(z * 1.7)) * 0.9, h: 5 + Math.abs(Math.cos(z * 0.9)) * 3 });
        col(x, z, 3.1, 6, 'rock');
      }
    }
    // plaza tengah: 4 penghadang bentuk L di sekeliling suar Charlie
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      boxes.push({ x: sx * 15, z: sz * 11, w: 8, d: 1.3, h: 2.6, kind: 'wall' });
      boxes.push({ x: sx * 19, z: sz * 15, w: 1.3, d: 8, h: 2.6, kind: 'wall' });
      for (const t of [-2.8, 0, 2.8]) { col(sx * 15 + t, sz * 11, 1.6, 2.6); col(sx * 19, sz * 15 + t, 1.6, 2.6); }
    }
    // kompaun runtuhan di suar sisi
    for (const [bx, bz] of [[-72, -52], [72, -52], [-72, 52], [72, 52]]) {
      const sx = Math.sign(bx), sz = Math.sign(bz);
      boxes.push({ x: bx + sx * 15, z: bz - sz * 2, w: 7, d: 12, h: 6.5, kind: 'bld' });
      boxes.push({ x: bx - sx * 3, z: bz + sz * 15, w: 12, d: 7, h: 5, kind: 'bld' });
      boxes.push({ x: bx - sx * 12, z: bz - sz * 10, w: 6, d: 1.3, h: 2.6, kind: 'wall' });
      for (const t of [-4, 0, 4]) { col(bx + sx * 15, bz - sz * 2 + t, 3.6, 6.5); col(bx - sx * 3 + t, bz + sz * 15, 3.6, 5); }
      for (const t of [-2, 2]) col(bx - sx * 12 + t, bz - sz * 10, 1.6, 2.6);
    }
    // benteng depan pangkalan
    for (const sz of [-1, 1]) for (const x of [-34, 0, 34]) {
      boxes.push({ x, z: sz * 86, w: 9, d: 1.4, h: 2.8, kind: 'wall' });
      for (const t of [-3, 0, 3]) col(x + t, sz * 86, 1.7, 2.8);
    }
    // kontena di lorong luar
    for (const [x, z, ry] of [[-100, -18, 0.2], [100, 18, -0.2], [-104, 22, 1.4], [104, -22, 1.5], [-52, -88, 0.1], [52, 88, 0.1], [-28, 58, 0.9], [28, -58, 0.9]]) {
      boxes.push({ x, z, w: 6.5, d: 2.6, h: 2.8, ry, kind: 'cont' });
      for (const t of [-2, 2]) col(x + Math.cos(ry) * t, z - Math.sin(ry) * t, 1.7, 2.8);
    }

    // --- visual ---
    const mats = {
      wall: MATS.concrete.clone(),
      bld: new THREE.MeshStandardMaterial({ color: 0x5f5a52, roughness: 0.9, metalness: 0.05 }),
      cont: new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.7, metalness: 0.4 }),
    };
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (const kind of ['wall', 'bld', 'cont']) {
      const list = boxes.filter(b => b.kind === kind);
      const m = new THREE.InstancedMesh(geo, mats[kind], list.length);
      m.castShadow = true; m.receiveShadow = true;
      list.forEach((b, i) => {
        o.position.set(b.x, b.h / 2, b.z); o.rotation.set(0, b.ry || 0, 0); o.scale.set(b.w, b.h, b.d);
        o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      });
      this.scene.add(m); this.objs.push(m);
    }
    // tingkap gelap pada bangunan runtuh
    const bl = boxes.filter(b => b.kind === 'bld');
    const win = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.4, metalness: 0.6 }), bl.length * 2);
    bl.forEach((b, i) => {
      for (let k = 0; k < 2; k++) {
        o.position.set(b.x, b.h * (0.35 + k * 0.35), b.z); o.rotation.set(0, 0, 0);
        o.scale.set(b.w + 0.06, 0.6, b.d + 0.06); o.updateMatrix(); win.setMatrixAt(i * 2 + k, o.matrix);
      }
    });
    this.scene.add(win); this.objs.push(win);
    const rm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 1, flatShading: true }), rocks.length);
    rm.castShadow = true; rm.receiveShadow = true;
    rocks.forEach((r, i) => {
      o.position.set(r.x, r.h * 0.42, r.z); o.rotation.set(r.z * 0.3, r.z, r.x * 0.1); o.scale.set(r.s, r.h * 0.62, r.s * 1.2);
      o.updateMatrix(); rm.setMatrixAt(i, o.matrix);
    });
    this.scene.add(rm); this.objs.push(rm);
  }

  removeProp(p) {
    if (!p.mesh) { p.alive = false; return; }
    p.alive = false;
    const o = new THREE.Object3D();
    o.position.set(p.x, -50, p.z);
    o.scale.set(0.001, 0.001, 0.001);
    o.updateMatrix();
    p.mesh.setMatrixAt(p.idx, o.matrix);
    p.mesh.instanceMatrix.needsUpdate = true;
  }

  updateSun(px, pz) {
    this.sun.position.set(px + 60, 90, pz + 42);
    this.sun.target.position.set(px, 0, pz);
    this.sun.target.updateMatrixWorld();
  }

  dispose() {
    for (const o of this.objs) {
      this.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
    }
    this.scene.remove(this.sun); this.scene.remove(this.sun.target);
    this.scene.remove(this.hemi);
    this.objs.length = 0; this.props.length = 0;
  }
}

/* data peta pasukan - kini dalam maps.js (MAPS); VALLEY dikekalkan untuk keserasian */
export const VALLEY = MAPS.valley;

/* titik spawn: gelang di sekeliling pemain, di dalam arena */
export function spawnPoint(px, pz, minR = 42, maxR = 70) {
  for (let i = 0; i < 40; i++) {
    const a = rand(TAU), r = rand(minR, maxR);
    const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
    if (Math.abs(x) < HALF - 4 && Math.abs(z) < HALF - 4) return { x, z };
  }
  return { x: clamp(px + rand(-40, 40), -HALF + 5, HALF - 5), z: clamp(pz + rand(-40, 40), -HALF + 5, HALF - 5) };
}

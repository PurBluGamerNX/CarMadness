// preview.js — live 3D car preview shown in the hangar (its own tiny renderer)
import * as THREE from 'three';
import { buildCar, buildWeaponModel } from './models.js';
import { CAR_BY } from './cars.js';
import { TAU, PI, clamp } from './core.js';

function studioEnv(renderer) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6f7f96');
  grad.addColorStop(0.48, '#aab6c6');
  grad.addColorStop(0.52, '#2a3038');
  grad.addColorStop(1, '#0d1014');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
  // dua "softbox" supaya logam ada pantulan
  for (const [x, w, a] of [[120, 130, 0.95], [360, 90, 0.6]]) {
    const rg = g.createRadialGradient(x, 70, 0, x, 70, w);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(x - w, 70 - w, w * 2, w * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  return env;
}

export const Preview = {
  ready: false, running: false, carId: null, car: null,

  init() {
    if (this.ready) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'prevcanvas';
    this.canvas = canvas;
    let r;
    try {
      r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return; }
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    const sc = new THREE.Scene();
    sc.environment = studioEnv(r);
    this.scene = sc;

    this.camera = new THREE.PerspectiveCamera(30, 1.7, 0.1, 200);

    const key = new THREE.DirectionalLight(0xfff0dd, 2.6);
    key.position.set(6, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0012;
    sc.add(key);
    const rim = new THREE.DirectionalLight(0x8ab6ff, 1.6);
    rim.position.set(-7, 4, -6);
    sc.add(rim);
    sc.add(new THREE.HemisphereLight(0x9fb4d0, 0x1b1f26, 0.7));

    // pentas
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.8, 0.25, 48),
      new THREE.MeshStandardMaterial({ color: 0x191d24, roughness: 0.6, metalness: 0.4 }));
    pad.position.y = -0.14;
    pad.receiveShadow = true;
    sc.add(pad);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.3, 4.55, 64),
      new THREE.MeshBasicMaterial({ color: 0xffb23f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -PI / 2;
    ring.position.y = 0.0;
    sc.add(ring);
    this.pad = pad; this.ring = ring;

    this.holder = new THREE.Group();
    sc.add(this.holder);

    // seret untuk pusing
    let drag = false, lastX = 0;
    canvas.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      this.spin += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
      this.userSpun = true;
    });
    const stop = () => { drag = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointerleave', stop);

    this.spin = 0.7;
    this.ready = true;
  },

  // weapons: senarai id senjata ikut slot (null = kosong). mode 'stage' = sudut tetap, tiada auto-pusing
  show(carId, weapons, mode) {
    this.init();
    if (!this.ready) return;
    this.mode = mode || 'box';
    const wkey = (weapons || []).map(w => w || '-').join('|');
    if (this.carId === carId) { if (wkey !== this.wkey) this.mount(weapons); return; }
    this.carId = carId;
    if (this.car) {
      this.holder.remove(this.car.root);
      this.car.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      this.car = null;
    }
    const def = CAR_BY[carId] || CAR_BY.ranger;
    const car = buildCar(def.color, Object.assign({}, def.spec, { slots: def.slots || 2 }));
    car.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // sorok pancaran lampu depan dalam pratonton
    if (car.beamMat) car.beamMat.opacity = 0;
    if (car.setDeploy) car.setDeploy(1);      // Hamvog: tunjuk lengan senjata terbuka
    this.holder.add(car.root);
    this.car = car;
    /* ketinggian sebenar kereta: kereta tinggi (tripod, kapal udara, layar)
       memerlukan kamera berundur, kalau tidak bahagian atasnya terpotong */
    if (car.animate) car.animate({ fwd: 0, lat: 0, steer: 0, time: 0, dt: 0.016, dist: 0, p: null, g: null, accel: 0 });
    car.root.updateWorldMatrix(true, true);
    let top = 2.6;
    const bb = new THREE.Box3();
    car.root.traverse(o => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      if (o.material && o.material.transparent && o.material.opacity <= 0.02) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      top = Math.max(top, bb.max.y - this.holder.position.y);
    });
    this.carH = top;
    this.spin = this.mode === 'stage' ? -0.62 : 0.7;
    this.userSpun = false;
    this.wkey = null;
    this.mount(weapons);
  },

  // pasang model senjata pada titik pasang kereta
  mount(weapons) {
    if (!this.car) return;
    this.wkey = (weapons || []).map(w => w || '-').join('|');
    for (const m of this.wModels || []) if (m) m.root.parent && m.root.parent.remove(m.root);
    this.wModels = [];
    (weapons || []).forEach((id, i) => {
      const mount = this.car.turrets[i];
      if (!id || !mount) { this.wModels.push(null); return; }
      const m = buildWeaponModel(id);
      m.root.scale.setScalar(this.car.mountScale || 1);
      m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
      mount.add(m.root);
      this.wModels.push(m);
    });
  },

  // kedudukan skrin (piksel kanvas CSS) bagi titik pasang slot i
  project(i) {
    if (!this.car || !this.car.turrets[i]) return null;
    const v = new THREE.Vector3();
    this.car.turrets[i].getWorldPosition(v);
    v.y += 0.35;
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this._w, y: (-v.y * 0.5 + 0.5) * this._h, front: v.z < 1 };
  },

  resize() {
    if (!this.ready) return;
    const c = this.canvas;
    const w = c.clientWidth || 380, h = c.clientHeight || 200;
    if (this._w === w && this._h === h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  },

  start() {
    this.init();
    if (!this.ready || this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.canvas.isConnected || !this.canvas.clientWidth) return;
      this.resize();
      if (!this.userSpun && this.mode !== 'stage') this.spin += dt * 0.38;
      this.holder.rotation.y = this.spin;
      /* Urutan pembukaan: kereta memandu masuk dari KIRI ke tengah dan
         berhenti. driveIn 1 -> 0 ialah kemajuannya. Sudut hadapan mesti
         mengikut arah perjalanan, kalau tidak ia nampak mengundur masuk. */
      const di = this.driveIn || 0;
      if (di > 0) {
        const t = 1 - di;                       // 0 -> 1
        const RIGHT = PI / 2;                   // menghadap +X (ke kanan skrin)
        const ease = 1 - (1 - t) * (1 - t);     // masuk laju, berhenti perlahan
        this.holder.position.x = -30 + ease * 30;
        this.holder.position.z = 0;
        // pusing ke sudut pameran hanya pada penghujung, semasa ia berhenti
        const u = Math.max(0, (t - 0.7) / 0.3);
        this.holder.rotation.y = RIGHT + (this.spin - RIGHT) * (u * u * (3 - 2 * u));
        this.holder.rotation.z = 0;
      } else {
        this.holder.position.x = 0;
        this.holder.position.z = 0;
        this.holder.rotation.z = 0;
      }
      const H = this.carH || 3, k = Math.max(1, H / 3.7), ly = Math.max(0, H - 3.7) * 0.42;
      if (this.mode === 'stage') {
        // pentas besar: kamera lebih rendah & dekat, kereta sedikit ke kiri (ruang untuk label)
        this.camera.position.set(0.6, 1.1 + ly + 3.5 * k, 12.4 * k);
        this.camera.lookAt(0.6, 1.1 + ly, 0);
      } else if (this.mode === 'view') {
        // paparan skrin penuh: lebih dekat & lebih rendah, kereta di tengah
        this.camera.position.set(0, 2.0 + ly + 2.9 * k, 13.8 * k);
        this.camera.lookAt(0, 2.0 + ly, 0);
      } else {
        this.camera.position.set(0, 1.25 + ly + 3.75 * k, 13.2 * k);
        this.camera.lookAt(0, 1.25 + ly, 0);
      }
      // roda berputar perlahan supaya nampak hidup
      if (this.car) {
        // roda berpusing laju semasa kereta memandu masuk
        const ws = this.driveIn ? 0.6 + this.driveIn * 22 : 0.6;
        for (const w of this.car.wheels) w.spin.rotation.x -= dt * ws;
        if (this.car.rollers) for (const r of this.car.rollers) r.rotation.x -= dt * 0.6;
        if (this.car.hoverFx) { this.hovT = (this.hovT || 0) + dt; this.car.hoverFx.update(this.hovT, dt, this.driveIn ? 0.8 : 0); }
        if (this.car.track) { this.trackS = (this.trackS || 0) + dt * ws; this.car.track.update(this.trackS); }
        if (this.car.animate) {
          this.animT = (this.animT || 0) + dt;
          this.car.animate({ fwd: this.driveIn ? 14 : 3, lat: 0, steer: 0, time: this.animT, dt, dist: this.animT * 3, p: null, g: null, accel: 0 });
        }
        if (this.car.legs) {
          this.legT = (this.legT || 0) + dt * 2.2;
          for (const L of this.car.legs) {
            L.hip.rotation.x = Math.sin(this.legT + L.phase) * 0.3;
            L.knee.rotation.x = -Math.sin(this.legT + L.phase + 0.9) * 0.24;
          }
        }
      }
      this.renderer.render(this.scene, this.camera);
      if (this.onFrame) this.onFrame();
    };
    requestAnimationFrame(tick);
  },

  /* ---------------- gambar kecil (thumbnail) ----------------
     Dirakam sekali sahaja setiap kereta / senjata menggunakan pengemas
     yang sama, kemudian disimpan sebagai data URL. Kad garaj hanya
     memaparkan gambar dan nama, jadi pemain melihat kenderaan dahulu. */
  _thumbs: {},

  thumb(kind, id) {
    const key = kind + ':' + id;
    if (this._thumbs[key] !== undefined) return this._thumbs[key];
    this.init();
    if (!this.ready) return null;
    let url = null;
    try {
      url = this._render(kind, id);
    } catch (e) { url = null; }
    this._thumbs[key] = url;
    return url;
  },

  _render(kind, id) {
    const r = this.renderer;
    const holder2 = new THREE.Group();
    this.scene.add(holder2);
    const liveVis = this.holder.visible;
    this.holder.visible = false;

    /* Pentas bulat hanya untuk pratonton besar di panel sisi - kad hanya
       menunjukkan kenderaan / senjata itu sendiri.
       Bayang juga dimatikan: tiada apa untuk menadahnya setelah pentas
       disorok, dan peta bayang 1024x1024 ialah kos terbesar setiap rakaman. */
    this.pad.visible = false; this.ring.visible = false;
    const hadShadow = r.shadowMap.enabled;
    r.shadowMap.enabled = false;
    const hadClear = new THREE.Color();
    r.getClearColor(hadClear);
    const hadAlpha = r.getClearAlpha();
    r.setClearColor(0x0e1116, 1);            // sama dengan latar kad

    let cam, tilt = 0.34;
    const disposeList = [];
    if (kind === 'car') {
      const def = CAR_BY[id] || CAR_BY.ranger;
      const car = buildCar(def.color, Object.assign({}, def.spec, { slots: def.slots || 2 }));
      car.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      if (car.beamMat) car.beamMat.opacity = 0;
    if (car.setDeploy) car.setDeploy(1);      // Hamvog: tunjuk lengan senjata terbuka
      holder2.add(car.root);
      holder2.rotation.y = this._rot ?? 0.68;     // _rot: lembaran ujian dev
      disposeList.push(car.root);
      tilt = 0.34;
    } else {
      const m = buildWeaponModel(id);
      m.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      holder2.add(m.root);
      holder2.rotation.y = 0.85;
      disposeList.push(m.root);
      tilt = 0.4;
    }

    /* Bingkai dikira daripada kotak sempadan sebenar: setiap kereta dan
       senjata ada saiz berbeza, jadi kedudukan kamera tetap akan memotong
       sebahagiannya. Ini menjamin semuanya muat penuh dalam kad. */
    holder2.updateWorldMatrix(true, true);
    /* Kotak dikira sendiri: setFromObject turut mengira jisim yang tidak
       kelihatan seperti kon pancaran lampu depan, yang menjadikan kotak
       jauh lebih besar daripada kenderaan dan gambar nampak kecil. */
    const box = new THREE.Box3();
    const tmpB = new THREE.Box3();
    holder2.traverse(o => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      const mt = o.material;
      if (mt && mt.transparent && mt.opacity <= 0.02) return;
      o.updateWorldMatrix(true, false);
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tmpB.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      box.union(tmpB);
    });
    if (box.isEmpty()) box.setFromObject(holder2);
    const mid = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    holder2.position.sub(mid);                       // pusatkan pada asalan
    const fov = 30;
    const radius = Math.max(sz.x, sz.y, sz.z) * 0.5 || 1;
    // kenderaan TINGGI & pendek (Conduit) - pastikan ketinggian juga muat, bukan panjang sahaja
    const dist = Math.max(radius / Math.sin(fov * 0.5 * PI / 180) * 0.70, sz.y * 0.5 / Math.tan(fov * 0.5 * PI / 180) + Math.max(sz.x, sz.z) * 0.35);
    cam = new THREE.PerspectiveCamera(fov, (this._tw || 304) / (this._th || 169), 0.05, 500);   // _tw/_th: lembaran ujian dev
    cam.position.set(0, dist * tilt, dist * Math.sqrt(1 - tilt * tilt));
    cam.lookAt(0, 0, 0);

    r.setSize(this._tw || 304, this._th || 169, false);
    r.render(this.scene, cam);
    // JPEG, bukan PNG: pengekodan jauh lebih pantas dan latar kad memang gelap
    const url = r.domElement.toDataURL('image/jpeg', 0.86);

    this.scene.remove(holder2);
    for (const o of disposeList) o.traverse(q => { if (q.geometry) q.geometry.dispose(); });
    this.holder.visible = liveVis;
    this.pad.visible = true; this.ring.visible = true;
    r.shadowMap.enabled = hadShadow;
    r.setClearColor(hadClear, hadAlpha);
    this._w = -1;                 // paksa resize() mengira semula saiz sebenar
    return url;
  },

  stop() { this.running = false; },
};

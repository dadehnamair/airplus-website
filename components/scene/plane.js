import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/*
  هواپیما: مدل Airbus A320-200 (فایل public/models/a320.glb) با رنگ سازمانی.
  اگر فایل لود نشد، یک مدل ساده‌ی ساخته‌شده با کد جایگزین می‌شود تا سایت خراب نشود.
  جهت مدل: بینی به سمت +Z، بالا +Y، طول ≈ ۹ واحد، مبدأ روی محور بدنه و وسط طول.
*/

// نقاط مرجع روی مدل A320 (با همان مقیاس مدل)
const GLB_POS = {
  navL: [-4.28, 0.7, -1.1],
  navR: [4.2, 0.7, -1.1],
  strobe: [-0.05, 1.93, -4.3],
  beacon: [0, 0.53, 1.98],
  engines: [
    [-1.316, -0.478, 0.5],
    [1.316, -0.478, 0.5],
  ],
};
const S = 1.15; // مدل جایگزین کمی بزرگ‌تر ساخته شده بود
const PROC_POS = {
  navL: [-4.3 * S, 0.06 * S, -1.3 * S],
  navR: [4.3 * S, 0.06 * S, -1.3 * S],
  strobe: [0, 2.1 * S, -4.15 * S],
  beacon: [0, 0.58 * S, 0.4 * S],
  engines: [
    [-1.6 * S, -0.52 * S, -0.3],
    [1.6 * S, -0.52 * S, -0.3],
  ],
};

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ساخت پره/بال از روی چندضلعی: نقاط به‌صورت [x, z] در صفحه افقی
function flatSurface(points, thickness, side) {
  const pts = points.map(([x, z]) => [x * side, z]);
  if (side < 0) pts.reverse();
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}

/* مدل جایگزین (فقط اگر فایل GLB لود نشود) */
function buildProcedural(root) {
  const white = new THREE.MeshStandardMaterial({
    color: 0xf2f5fa,
    roughness: 0.3,
    metalness: 0.12,
    emissive: 0x0b0f18,
  });
  const wingM = new THREE.MeshStandardMaterial({
    color: 0xe4e9f2,
    roughness: 0.38,
    metalness: 0.15,
    emissive: 0x0b0f18,
  });
  const brand = new THREE.MeshStandardMaterial({
    color: 0x6f10d3,
    roughness: 0.4,
    metalness: 0.08,
    emissive: 0x1a0438,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xe4b817,
    roughness: 0.4,
    metalness: 0.08,
    emissive: 0x2a2100,
  });
  const grey = new THREE.MeshStandardMaterial({
    color: 0xa9b2c4,
    roughness: 0.34,
    metalness: 0.6,
    emissive: 0x080a10,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x141b32,
    roughness: 0.45,
    metalness: 0.2,
  });
  const prof = [
    [0.02, -4.3],
    [0.16, -4.1],
    [0.3, -3.6],
    [0.45, -2.8],
    [0.54, -1.8],
    [0.56, -1.0],
    [0.56, 2.5],
    [0.52, 3.05],
    [0.42, 3.6],
    [0.28, 4.0],
    [0.12, 4.25],
    [0.0, 4.32],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), white);
  fus.rotation.x = Math.PI / 2;
  root.add(fus);
  [Math.PI / 2 - 0.15, -Math.PI / 2 - 0.15].forEach((start) => {
    const g = new THREE.CylinderGeometry(
      0.566,
      0.566,
      3.4,
      16,
      1,
      true,
      start,
      0.3,
    );
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, gold);
    m.position.z = 0.75;
    root.add(m);
  });
  [-1, 1].forEach((s) => {
    const wing = new THREE.Mesh(
      flatSurface(
        [
          [0.45, 0.9],
          [4.3, -1.0],
          [4.3, -1.55],
          [0.45, -1.1],
        ],
        0.08,
        s,
      ),
      wingM,
    );
    wing.position.y = -0.24;
    wing.rotation.z = s * 0.7;
    root.add(wing);
    const nac = [
      [0.0, -0.75],
      [0.26, -0.7],
      [0.33, -0.3],
      [0.34, 0.3],
      [0.31, 0.62],
      [0.27, 0.7],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const eng = new THREE.Mesh(new THREE.LatheGeometry(nac, 20), grey);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(s * 1.6, -0.52, 0.55);
    root.add(eng);
    const tail = new THREE.Mesh(
      flatSurface(
        [
          [0.15, -3.35],
          [1.75, -4.0],
          [1.75, -4.3],
          [0.15, -4.05],
        ],
        0.05,
        s,
      ),
      wingM,
    );
    tail.position.y = 0.26;
    tail.rotation.z = s * 0.05;
    root.add(tail);
  });
  const finShape = new THREE.Shape();
  [
    [3.0, 0.25],
    [4.0, 2.05],
    [4.3, 2.05],
    [4.28, 0.05],
  ].forEach(([u, v], i) => (i ? finShape.lineTo(u, v) : finShape.moveTo(u, v)));
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.07,
    bevelEnabled: false,
  });
  finGeo.rotateY(Math.PI / 2);
  finGeo.translate(-0.035, 0, 0);
  root.add(new THREE.Mesh(finGeo, brand));
  const wind = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.34), dark);
  wind.position.set(0, 0.3, 3.35);
  wind.rotation.x = -0.42;
  root.add(wind);
  root.scale.setScalar(S);
}

export function createPlane(opts = {}) {
  const url = opts.url || "/models/a320.glb";
  const rig = new THREE.Group();
  const body = new THREE.Group();
  rig.add(body);

  const proc = new THREE.Group();
  buildProcedural(proc);
  body.add(proc);

  /* چراغ‌ها: هسته‌ی کوچک + هاله‌ی درخشان */
  const tex = glowTexture();
  const mkLight = (color, size) => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        opacity: 0.6,
      }),
    );
    glow.scale.set(size, size, 1);
    g.add(core, glow);
    g.userData = { core, glow, size };
    body.add(g);
    return g;
  };
  const navL = mkLight(0xff3344, 0.42),
    navR = mkLight(0x00a946, 0.42),
    strobe = mkLight(0xffffff, 0.8),
    beacon = mkLight(0xff2a2a, 0.5);
  const place = (P) => {
    navL.position.set(...P.navL);
    navR.position.set(...P.navR);
    strobe.position.set(...P.strobe);
    beacon.position.set(...P.beacon);
    engineLocal[0].set(...P.engines[0]);
    engineLocal[1].set(...P.engines[1]);
  };
  const engineLocal = [new THREE.Vector3(), new THREE.Vector3()];
  place(PROC_POS);

  const light = new THREE.PointLight(0xffd8a0, 0, 40);
  light.position.set(0, 2.5, -1);
  body.add(light);

  /* بارگذاری مدل واقعی */
  const ready = new Promise((resolve) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((o) => {
          if (!o.isMesh) return;
          const m = o.material;
          // در شب هم بدنه دیده شود؛ لنزهای قرمز کمی خودتاب
          m.emissive = m.color
            .clone()
            .multiplyScalar(m.name === "red" ? 0.6 : 0.09);
          m.needsUpdate = true;
        });
        body.remove(proc);
        proc.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
        body.add(model);
        place(GLB_POS);
        resolve(true);
      },
      undefined,
      (err) => {
        console.warn("A320 model failed to load; using fallback plane.", err);
        resolve(false);
      },
    );
  });

  return {
    rig,
    body,
    light,
    engineLocal,
    ready,
    blink(time, night) {
      const on =
        Math.sin(time * 9) > 0.86 || Math.sin(time * 9 + 0.5) > 0.93 ? 1 : 0.05;
      const bOn = Math.sin(time * 5) > 0 ? 1 : 0.15;
      const set = (l, k, base) => {
        l.userData.glow.material.opacity = Math.min(1, base * k);
        l.userData.glow.scale.setScalar(l.userData.size * (0.7 + 0.5 * k));
      };
      set(strobe, on, 0.95);
      set(beacon, bOn, 0.8);
      const nav = 0.5 + night * 0.5;
      set(navL, nav, 0.7);
      set(navR, nav, 0.7);
    },
  };
}

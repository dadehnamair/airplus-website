import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  نویز و اطلس پاف‌های ابر (کاملاً روی کانوا ساخته می‌شود)           */
/* ------------------------------------------------------------------ */
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = sm(xf), v = sm(yf);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
}

export function makePuffAtlas() {
  const T = 256, size = T * 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  for (let tile = 0; tile < 4; tile++) {
    const noise = makeNoise(11 + tile * 7);
    const warp = makeNoise(97 + tile * 13);
    const img = ctx.createImageData(T, T);
    for (let py = 0; py < T; py++) {
      for (let px = 0; px < T; px++) {
        const nx = (px / T) * 2 - 1, ny = (py / T) * 2 - 1;
        let r = Math.sqrt(nx * nx + ny * ny);
        r += (warp(nx * 1.6 + 5, ny * 1.6 + 5) - 0.5) * 0.42;
        const fall = 1 - Math.min(1, Math.max(0, (r - 0.32) / 0.68));
        const f = fall * fall * (3 - 2 * fall);
        let n = 0, amp = 0.55, fr = 2.4, sum = 0;
        for (let o = 0; o < 4; o++) { n += noise(nx * fr + tile * 3.1, ny * fr + tile * 1.7) * amp; sum += amp; amp *= 0.5; fr *= 2.1; }
        n /= sum;
        let dens = f * (0.5 + 1.0 * n) - 0.2;
        let a = Math.min(1, Math.max(0, dens * 1.9));
        a = a * a * (3 - 2 * a);
        const top = Math.min(1, Math.max(0, 0.5 - ny * 0.55 + (n - 0.5) * 0.6));
        const lum = (0.6 + 0.4 * top) * (0.78 + 0.22 * n);
        const i = (py * T + px) * 4;
        const v = Math.min(255, lum * 255);
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, (tile % 2) * T, Math.floor(tile / 2) * T);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  سیستم پاف‌ها: کوادهای instanced که همیشه رو به دوربین‌اند         */
/* ------------------------------------------------------------------ */
const VERT = `
attribute vec3 aOffset;
attribute vec4 aData;          // x: size, y: rot, z: tile, w: tone
uniform float uTime;
uniform float uNear0;
uniform float uNear1;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying float vTone;
varying float vAlpha;
varying float vFog;
void main(){
  float spin = aData.y + uTime * 0.015 * (aData.w - 0.7);
  float c = cos(spin), s = sin(spin);
  vec2 p = position.xy * aData.x;
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vec4 mv = viewMatrix * vec4(aOffset, 1.0);
  mv.xy += p;
  float dist = -mv.z;
  vAlpha = smoothstep(uNear0, uNear1, dist);
  vFog = smoothstep(uFogNear, uFogFar, dist);
  float tx = mod(aData.z, 2.0);
  float ty = floor(aData.z / 2.0);
  vUv = vec2((tx + uv.x) * 0.5, (ty + uv.y) * 0.5);
  vTone = aData.w;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform sampler2D map;
uniform vec3 tint;
uniform vec3 fogColor;
uniform float uOpacity;
uniform float uToneAlpha;
varying vec2 vUv;
varying float vTone;
varying float vAlpha;
varying float vFog;
void main(){
  vec4 t = texture2D(map, vUv);
  float a = t.a * vAlpha * uOpacity;
  if (uToneAlpha > 0.5) a *= vTone;
  if (a < 0.003) discard;
  float shade = uToneAlpha > 0.5 ? 1.0 : (0.55 + 0.45 * vTone);
  vec3 col = tint * shade * (0.55 + 0.45 * t.r);
  col = mix(col, fogColor, vFog * 0.8);
  gl_FragColor = vec4(col, a * (1.0 - vFog * 0.3));
}`;

export function createPuffSystem(atlas, capacity, opts = {}) {
  const base = new THREE.PlaneBufferGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('uv', base.attributes.uv);
  const offsets = new Float32Array(capacity * 3);
  const data = new Float32Array(capacity * 4);
  const aOffset = new THREE.InstancedBufferAttribute(offsets, 3);
  const aData = new THREE.InstancedBufferAttribute(data, 4);
  aOffset.setUsage(THREE.DynamicDrawUsage);
  aData.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aOffset', aOffset);
  geo.setAttribute('aData', aData);
  geo.instanceCount = 0;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: atlas },
      tint: { value: new THREE.Color(1, 1, 1) },
      fogColor: { value: new THREE.Color(1, 1, 1) },
      uTime: { value: 0 },
      uNear0: { value: opts.near0 ?? 6 },
      uNear1: { value: opts.near1 ?? 28 },
      uFogNear: { value: 60 },
      uFogFar: { value: 360 },
      uOpacity: { value: opts.opacity ?? 1 },
      uToneAlpha: { value: opts.toneAlpha ? 1 : 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = opts.renderOrder ?? 5;
  return { mesh, geo, material, offsets, data, aOffset, aData, capacity };
}

/* ------------------------------------------------------------------ */
/*  میدان ابر: دور مسیر، کنار مسیر، دریای ابر زیر و ابرهای بالا         */
/* ------------------------------------------------------------------ */
export function createCloudField({ atlas, curve, L, rand, banks = [], runwayT = 0.9 }) {
  const list = []; // {x,y,z,size,rot,tile,tone}
  const pathClusters = []; // برای محاسبه چگالی ابر اطراف دوربین
  const P = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const at = (t) => {
    const tt = Math.min(1, Math.max(0, t));
    curve.getPointAt(tt, P); curve.getTangentAt(tt, T); S.crossVectors(T, UP).normalize();
  };
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5; // تقریباً نرمال در بازه -1..1

  function cluster(cx, cy, cz, r, count, sizeMul = 1, flat = 0.7, toneBoost = 0) {
    for (let k = 0; k < count; k++) {
      const x = cx + gauss() * r * 1.0;
      const y = cy + gauss() * r * flat * 0.55;
      const z = cz + gauss() * r * 1.0;
      const size = r * (0.85 + rand() * 1.0) * sizeMul;
      const rel = (y - cy) / (r * flat * 0.6 + 0.001);
      const tone = Math.min(1, Math.max(0.35, 0.68 + rel * 0.28 + (rand() - 0.5) * 0.18 + toneBoost));
      list.push({ x, y, z, size, rot: rand() * 6.283, tile: Math.floor(rand() * 4), tone });
    }
  }

  // ابرهای روی مسیر: هواپیما مدام از میانشان می‌گذرد
  for (let d = 22; d < L - 40; d += 24) {
    const t = d / L; at(t);
    const lat = (rand() - 0.5) * 2 * 13;
    const r = 11 + rand() * 7;
    const cy = P.y + (rand() - 0.5) * 9;
    const cx = P.x + S.x * lat, cz = P.z + S.z * lat;
    cluster(cx, cy, cz, r, 8);
    pathClusters.push({ x: cx, y: cy, z: cz, r, w: 1 });
  }
  // بانک‌های ابر غلیظ برای مراحل (پرواز از میان ابر)
  banks.forEach((t) => {
    at(t);
    const r = 17;
    cluster(P.x, P.y, P.z, r, 26, 1.05, 0.9);
    pathClusters.push({ x: P.x, y: P.y, z: P.z, r: r * 1.15, w: 2.2 });
  });
  // ابرهای کناری
  for (let d = 10; d < L; d += 20) {
    at(d / L);
    const sign = rand() < 0.5 ? -1 : 1;
    const lat = sign * (26 + rand() * 95);
    const cy = P.y + (rand() * 44 - 22);
    cluster(P.x + S.x * lat, Math.max(6, cy), P.z + S.z * lat, 14 + rand() * 18, 6);
  }
  // دریای ابر زیر هواپیما
  for (let d = 0; d < L; d += 14) {
    const t = d / L;
    if (t > runwayT - 0.02) break;
    at(t);
    const lat = (rand() - 0.5) * 2 * 170;
    const r = 30 + rand() * 24;
    cluster(P.x + S.x * lat, 5 + rand() * 9, P.z + S.z * lat, r, 4, 1.15, 0.35);
  }
  // لایه‌های نازک بالا
  for (let d = 0; d < L; d += 60) {
    at(d / L);
    const lat = (rand() - 0.5) * 2 * 160;
    cluster(P.x + S.x * lat, 72 + rand() * 30, P.z + S.z * lat, 34 + rand() * 20, 3, 1.2, 0.3, 0.12);
  }

  const M = list.length;
  const sys = createPuffSystem(atlas, M, { near0: 7, near1: 30 });
  const dist = new Float32Array(M);
  const order = new Uint32Array(M);
  let stride = 1;
  let lastSortAt = -1, lastCam = new THREE.Vector3(1e9, 1e9, 1e9);

  function sortAndUpload(cam) {
    for (let i = 0; i < M; i++) {
      const p = list[i];
      const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
      dist[i] = dx * dx + dy * dy + dz * dz;
      order[i] = i;
    }
    order.sort((a, b) => dist[b] - dist[a]); // دورترین اول
    let k = 0;
    for (let j = 0; j < M; j++) {
      const i = order[j];
      if (stride > 1 && i % stride !== 0) continue;
      const p = list[i];
      sys.offsets[k * 3] = p.x; sys.offsets[k * 3 + 1] = p.y; sys.offsets[k * 3 + 2] = p.z;
      sys.data[k * 4] = p.size; sys.data[k * 4 + 1] = p.rot; sys.data[k * 4 + 2] = p.tile; sys.data[k * 4 + 3] = p.tone;
      k++;
    }
    sys.geo.instanceCount = k;
    sys.aOffset.needsUpdate = true;
    sys.aData.needsUpdate = true;
  }

  return {
    mesh: sys.mesh,
    material: sys.material,
    count: M,
    pathClusters,
    setStride(s) { if (s !== stride) { stride = s; lastSortAt = -1; } },
    update(cam, time, tint, fogColor, fogNear, fogFar) {
      const u = sys.material.uniforms;
      u.uTime.value = time;
      u.tint.value.copy(tint);
      u.fogColor.value.copy(fogColor);
      u.uFogNear.value = fogNear; u.uFogFar.value = fogFar;
      const moved = lastCam.distanceToSquared(cam);
      if (lastSortAt < 0 || moved > 4 || time - lastSortAt > 0.25) {
        sortAndUpload(cam); lastCam.copy(cam); lastSortAt = time;
      }
    },
    /** چگالی ابر اطراف یک نقطه (۰ تا ۱) */
    densityAt(pos) {
      let sum = 0;
      for (let i = 0; i < pathClusters.length; i++) {
        const c = pathClusters[i];
        const dx = pos.x - c.x, dy = pos.y - c.y, dz = pos.z - c.z;
        const q = (dx * dx + dy * dy + dz * dz) / (c.r * c.r * 1.2);
        if (q < 6) sum += Math.exp(-q) * c.w;
      }
      return 1 - Math.exp(-sum * 1.25);
    },
    dispose() { sys.geo.dispose(); sys.material.dispose(); },
  };
}

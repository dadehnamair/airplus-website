import * as THREE from 'three';
import { makePuffAtlas, createPuffSystem, createCloudField } from './scene/clouds';
import { createPlane } from './scene/plane';
import { createAirport } from './scene/airport';
import { createRunway } from './scene/runway';
import { createAudio } from './scene/audio';
import { sectionRange } from '@/lib/layout';

const STATUS = {
  'صادر شد': { bg: '#ece0fb', fg: '#5b0fb0' },
  'در انتظار پرداخت': { bg: '#fff0c9', fg: '#9a5b00' },
  'تسویه شد': { bg: '#d5f5e8', fg: '#12805c' },
};
const FA = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (s) => String(s).replace(/\d/g, (d) => FA[d]);
const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d));

/* مسیر پرواز: طول آن با تعداد بخش‌ها زیاد می‌شود و همیشه با یک فرود صاف تمام می‌شود */
function buildPath(N) {
  const n = Math.max(10, N * 3 + 5);
  const descent = [6, 6, 9, 15, 24];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const tail = n - 1 - i;
    const k = Math.min(1, tail / 5);
    const x = (Math.sin(i * 1.31) * 13 + Math.sin(i * 0.57 + 1) * 6) * k;
    const cruise = 32 + Math.sin(i * 0.9) * 3.5 + Math.cos(i * 0.43) * 3;
    const y = tail < 5 ? descent[tail] : cruise;
    pts.push(new THREE.Vector3(x, y, -110 * i));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 1500;
  return { curve, L: curve.getLength() };
}

export function startFlight(root, content, opts = {}) {
  const onState = opts.onState || (() => {});
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const loader = root.querySelector('.loader');
  const radarEl = root.querySelector('.radar');
  const bootAt = performance.now();
  const disposers = [];
  let disposed = false;
  let raf = 0;

  const on = (target, ev, fn, o) => {
    target.addEventListener(ev, fn, o);
    disposers.push(() => target.removeEventListener(ev, fn, o));
  };
  const finishLoader = () => {
    const wait = Math.max(0, 1900 - (performance.now() - bootAt));
    // رادار روی صفحه‌ی لودینگ (پایین وسط) محو می‌شود و هم‌زمان رادار واقعی HUD
    // با یک انیمیشن ورود به جای همیشگی‌اش (کنار جعبه‌ی ابزار پرواز) می‌نشیند
    const id = setTimeout(() => { loader && loader.classList.add('done'); radarEl && radarEl.classList.add('arrived'); }, wait);
    disposers.push(() => clearTimeout(id));
  };
  function fallback() {
    document.body.classList.add('nogl');
    if (loader) loader.classList.add('done');
  }
  disposers.push(() => document.body.classList.remove('nogl'));

  const api = { toggleSound: async () => false, toggleAuto: () => false, setQuality: () => {}, goto: () => {} };
  const finalize = () => () => { disposed = true; cancelAnimationFrame(raf); disposers.forEach((d) => { try { d(); } catch (e) { /* ignore */ } }); };

  /* ---------- renderer ---------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  root.prepend(canvas);
  disposers.push(() => canvas.remove());

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    fallback();
    return { dispose: finalize(), api };
  }

  let quality = opts.quality || 'auto';
  let degraded = false;
  const dprCap = () => (quality === 'low' || degraded ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setPixelRatio(dprCap());
  renderer.setSize(window.innerWidth, window.innerHeight);

  const FONT = getComputedStyle(root).fontFamily || 'Tahoma, sans-serif';
  const V = THREE.Vector3;
  const UP = new V(0, 1, 0);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

  let seed = 7;
  function rand() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 2600);
  scene.add(camera);
  scene.fog = new THREE.Fog(0xffffff, 45, 330);

  /* ---------- مسیر و بخش‌ها ---------- */
  const sections = content.sections;
  const N = sections.length;
  const { curve, L } = buildPath(N);
  const LEAD = 12 / L;        // فاصله هواپیما تا دوربین، به واحد پارامتر مسیر
  const AHEAD = 55 / L;       // فاصله اشیای صحنه از متن هر بخش
  const tc = (t) => clamp(t, 0, 1);
  const tmpP = new V(), tmpT = new V(), sideV = new V(), tmpQ = new V();
  function frame3(t) { const x = tc(t); curve.getPointAt(x, tmpP); curve.getTangentAt(x, tmpT); sideV.crossVectors(tmpT, UP).normalize(); }

  /* ---------- آسمان ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
      sunDir: { value: new V(0, 0, -1) }, sunColor: { value: new THREE.Color() }, sunAmt: { value: 0 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunAmt;',
      'varying vec3 vP;',
      'void main(){',
      '  vec3 d = normalize(vP);',
      '  float h = clamp(d.y, 0.0, 1.0);',
      '  vec3 col = mix(bottom, top, pow(h, 0.5));',
      '  col = mix(col, bottom, exp(-h * 7.0) * 0.55);',
      '  float s = max(dot(d, sunDir), 0.0);',
      '  float glow = pow(s, 5.0) * 0.28 + pow(s, 60.0) * 0.55;',
      '  float disk = smoothstep(0.9993, 0.9998, s);',
      '  col += sunColor * (glow + disk * 2.0) * sunAmt;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

  const KF = [
    { p: 0, top: new THREE.Color('#2b1670'), bot: new THREE.Color('#ff9f6e'), star: 0.25 },
    { p: 0.22, top: new THREE.Color('#3d7bd6'), bot: new THREE.Color('#bfdcff'), star: 0 },
    { p: 0.5, top: new THREE.Color('#2d67cf'), bot: new THREE.Color('#dcecff'), star: 0 },
    { p: 0.74, top: new THREE.Color('#5a2fa3'), bot: new THREE.Color('#ff9466'), star: 0 },
    { p: 1, top: new THREE.Color('#0d0526'), bot: new THREE.Color('#3a1a78'), star: 1 },
  ];
  const topC = new THREE.Color(), botC = new THREE.Color(), white = new THREE.Color(0xffffff);
  const cloudTint = new THREE.Color(), fogC = new THREE.Color();
  const sunHigh = new THREE.Color(0xfff1c4), sunLow = new THREE.Color(0xff8a4a);
  function sampleSky(p) {
    let i = 0; while (i < KF.length - 2 && p > KF[i + 1].p) i++;
    const a = KF[i], b = KF[i + 1];
    let k = clamp((p - a.p) / (b.p - a.p), 0, 1); k = k * k * (3 - 2 * k);
    topC.copy(a.top).lerp(b.top, k); botC.copy(a.bot).lerp(b.bot, k);
    return a.star + (b.star - a.star) * k;
  }

  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const u = rand() * Math.PI * 2, v = Math.acos(rand() * 0.95), r = 900;
    sp[i * 3] = r * Math.sin(v) * Math.cos(u); sp[i * 3 + 1] = r * Math.cos(v); sp[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe8eeff, fog: false }));
  scene.add(moon);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8899bb, 1);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(40, 70, 30);
  scene.add(hemi, dir);

  const groundMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), groundMat);
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  /* ---------- ابرها ---------- */
  const atlas = makePuffAtlas();
  const stepGroups = []; // برای هر بخش «مراحل»: بانک‌های ابر و آیتم‌های متن
  const banks = [];
  const panelEls = Array.from(root.querySelectorAll('.panel'));
  sections.forEach((s, i) => {
    if (s.type !== 'steps') return;
    const r = sectionRange(i, N);
    const a = Math.max(r.a, r.start + 0.015), b = Math.min(r.b, r.end - 0.01);
    const m = s.steps.length, ts = [];
    for (let k = 0; k < m; k++) { const t = tc(a + ((k + 0.5) / m) * (b - a)); ts.push(t); banks.push(t); }
    stepGroups.push({ idx: i, ts, lis: Array.from(panelEls[i].querySelectorAll('.steps li')), last: -2, a: r.a, b: r.b });
  });
  const runwayT = 1 - 380 / L;
  const clouds = createCloudField({ atlas, curve, L, rand, banks, runwayT });
  scene.add(clouds.mesh);

  /* ---------- هواپیما ---------- */
  const plane = createPlane();
  scene.add(plane.rig);

  // دنباله بخار پشت موتورها: پاف‌های نرم که با تاخیر دنبال هواپیما می‌آیند
  const TRAIL = 44;
  const trailSys = createPuffSystem(atlas, TRAIL * 2, { toneAlpha: true, near0: 3, near1: 12, renderOrder: 6, opacity: 0.85 });
  scene.add(trailSys.mesh);
  const trailRot = Array.from({ length: TRAIL * 2 }, () => ({ r: rand() * 6.28, t: Math.floor(rand() * 4) }));
  const chains = [0, 1].map(() => Array.from({ length: TRAIL }, () => new V()));
  const engW = new V(), off0 = new V();

  /* ---------- برند در آسمان ---------- */
  const heroIdx = sections.findIndex((s) => s.type === 'hero');
  let brandSprite = null;
  if (heroIdx >= 0) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 420;
    const x = cv.getContext('2d');
    x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(26,8,56,.55)'; x.shadowBlur = 28;
    x.fillStyle = '#ffffff'; x.font = '800 210px ' + FONT;
    x.fillText(content.brand.name, 512, 160);
    x.shadowBlur = 14; x.font = '500 50px ' + FONT; x.fillStyle = 'rgba(255,255,255,.92)';
    x.fillText(content.brand.tagline || '', 512, 330);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    brandSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    brandSprite.scale.set(96, 39, 1); brandSprite.renderOrder = 8;
    frame3(sectionRange(heroIdx, N).start + 135 / L);
    brandSprite.position.set(tmpP.x + sideV.x * -6, tmpP.y + 7, tmpP.z + sideV.z * -6);
    scene.add(brandSprite);
  }

  /* ---------- بافت‌های کانوا ---------- */
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  const aniso = renderer.capabilities.getMaxAnisotropy();
  function ticketTex(d) {
    const W = 600, H = 340, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    rr(x, 4, 4, W - 8, H - 8, 30); x.fillStyle = '#ffffff'; x.fill();
    x.save(); x.clip(); x.fillStyle = '#e4b817'; x.fillRect(0, 0, 150, H); x.restore();
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(150, 4, 15, 0, 6.3); x.arc(150, H - 4, 15, 0, 6.3); x.fill(); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = '#c4cde0'; x.setLineDash([6, 8]); x.lineWidth = 3; x.beginPath(); x.moveTo(150, 28); x.lineTo(150, H - 28); x.stroke(); x.setLineDash([]);
    x.save(); x.translate(75, H / 2); x.rotate(-Math.PI / 2); x.fillStyle = '#1a0838'; x.font = '800 42px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(content.brand.name, 0, 0); x.restore();
    x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#1a0838'; x.font = '800 46px ' + FONT; x.fillText(d.route, W - 38, 98);
    x.fillStyle = '#55627D'; x.font = '500 28px ' + FONT; x.fillText(d.airline, W - 38, 148);
    x.fillStyle = '#1a0838'; x.font = '800 42px ' + FONT; x.fillText(d.price + ' تومان', W - 38, 230);
    const st = STATUS[d.status] || STATUS['صادر شد']; x.font = '700 26px ' + FONT; const tw = x.measureText(d.status).width;
    rr(x, W - 38 - (tw + 58), 262, tw + 58, 46, 23); x.fillStyle = st.bg; x.fill();
    x.fillStyle = st.fg; x.beginPath(); x.arc(W - 38 - 24, 285, 7, 0, 6.3); x.fill();
    x.fillText(d.status, W - 38 - 46, 294);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = aniso; return tex;
  }

  /* ---------- اشیای صحنه هر بخش ---------- */
  const cards = [], bars = [];
  function addTickets(list, ta, tb) {
    const geo = new THREE.PlaneGeometry(6.2, 3.5);
    list.forEach((d, i) => {
      const t = ta + i * ((tb - ta) / Math.max(1, list.length - 1));
      frame3(t);
      const left = i % 3 !== 2;
      const lat = left ? -(13 + (i % 2) * 5) : 15 + (i % 2) * 3;
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ticketTex(d), transparent: true, side: THREE.DoubleSide }));
      m.position.set(tmpP.x + sideV.x * lat, tmpP.y + ((i % 3) - 1) * 3.4 + 1, tmpP.z + sideV.z * lat);
      m.rotation.y = Math.atan2(-tmpT.x, -tmpT.z) + (left ? 0.38 : -0.38);
      m.userData = { by: m.position.y, ph: i * 1.3 };
      scene.add(m); cards.push(m);
    });
  }
  const barGeo = new THREE.BoxGeometry(1, 1, 1); barGeo.translate(0, 0.5, 0);
  // بافت پنجره‌های ساختمان: یک شبکهٔ پنجرهٔ روشن/خاموش، به‌علاوه نسخهٔ emissive برای درخشش شب
  function buildingWindowTex() {
    const cols = 8, rows = 16, cw = 32, rh = 32, pad = 5;
    const W = cols * cw, H = rows * rh;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx2 = cv.getContext('2d');
    cx2.fillStyle = '#9aa1b3'; cx2.fillRect(0, 0, W, H);
    const ecv = document.createElement('canvas'); ecv.width = W; ecv.height = H;
    const ex = ecv.getContext('2d'); ex.fillStyle = '#000000'; ex.fillRect(0, 0, W, H);
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const lit = Math.random() < 0.3;
        cx2.fillStyle = lit ? '#3d4666' : '#20263a';
        cx2.fillRect(rx * cw + pad, ry * rh + pad, cw - pad * 2, rh - pad * 2);
        if (lit) { ex.fillStyle = '#ffdfa0'; ex.fillRect(rx * cw + pad, ry * rh + pad, cw - pad * 2, rh - pad * 2); }
      }
    }
    const map = new THREE.CanvasTexture(cv); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = aniso;
    const emissiveMap = new THREE.CanvasTexture(ecv); emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping; emissiveMap.anisotropy = aniso;
    return { map, emissiveMap };
  }
  const { map: winMap, emissiveMap: winEmissive } = buildingWindowTex();
  const buildingPalette = [0x2b3350, 0x39445e, 0x50597a, 0x2c4a52, 0x5b3f86, 0x8a8f9c];
  function addTowers(ta, tb) {
    const pairs = Math.max(10, Math.ceil(((tb - ta) * L) / 9));
    for (let k = 0; k < pairs; k++) {
      const t = ta + (k / pairs) * (tb - ta); frame3(t);
      for (let s = 0; s < 2; s++) {
        const sign = s ? 1 : -1, lat = sign * (13 + rand() * 32), w = 2.4 + rand() * 3.2, h = 8 + rand() * Math.max(10, tmpP.y - 10);
        const map = winMap.clone(), emissiveMap = winEmissive.clone();
        map.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(2, Math.round(h / 4)));
        emissiveMap.repeat.copy(map.repeat);
        const mat = new THREE.MeshStandardMaterial({
          map, emissiveMap, emissive: 0xffdfa0, emissiveIntensity: 0,
          color: buildingPalette[Math.floor(rand() * buildingPalette.length)],
          roughness: 0.75, metalness: 0.1,
        });
        const b = new THREE.Mesh(barGeo, mat);
        b.position.set(tmpP.x + sideV.x * lat, 0, tmpP.z + sideV.z * lat);
        b.scale.set(w, 0.01, w); b.userData = { t: tc(t), h, mat };
        scene.add(b); bars.push(b);
      }
    }
  }
  // نزدیک نگه داشتن مدل: هرچه دورتر باشد جزئیات (پنجره‌ها، حجم ساختمان‌ها) دیده نمی‌شود
  // و فقط یک سایه‌ی تخت به‌نظر می‌رسد. فاصله‌ی جانبی فقط باید از تاب‌خوردن هواپیما (~۲۰ واحد)
  // و باند فرود (پهنای ۱۴) عبور کند، نه بیشتر.
  const AIRPORT_SCALE = 0.85, AIRPORT_LAT = 45, AIRPORT_FORWARD = 65;
  let airportPlacement = null, airportLoadAt = -1;
  sections.forEach((s, i) => {
    if (s.type !== 'content') return;
    const r = sectionRange(i, N);
    const a = r.a < 0 ? r.start : r.a, b = r.b > 1 ? r.end : r.b;
    if (s.scene === 'tickets' && s.tickets && s.tickets.length) addTickets(s.tickets, tc(a + AHEAD), tc(b + AHEAD * 0.6));
    if (s.scene === 'towers') addTowers(tc(a + AHEAD * 0.6), tc(b + AHEAD));
    if (s.scene === 'airport') {
      // کمی جلوتر از وسط بخش تا وقتی متن کاملاً دیده می‌شود، مدل هم جلوی دوربین باشد نه کنار آن
      frame3(tc(r.mid + AIRPORT_FORWARD / L));
      airportPlacement = { x: tmpP.x + sideV.x * AIRPORT_LAT, z: tmpP.z + sideV.z * AIRPORT_LAT, rotY: Math.atan2(-tmpT.x, -tmpT.z) + Math.PI / 2 };
      airportLoadAt = Math.max(0, r.mid - 0.15);
    }
  });
  // اگر بخش فرود آن را خواسته، مدل کمی جلوتر از نقطه‌ی پایانی مسیر می‌نشیند (همان‌جا که دوربین در پایان پرواز به آن نگاه می‌کند)
  const ctaSection = sections.find((s) => s.type === 'cta');
  if (ctaSection && ctaSection.scene === 'airport') {
    frame3(1);
    airportPlacement = {
      x: tmpP.x + tmpT.x * AIRPORT_FORWARD + sideV.x * AIRPORT_LAT,
      z: tmpP.z + tmpT.z * AIRPORT_FORWARD + sideV.z * AIRPORT_LAT,
      rotY: Math.atan2(-tmpT.x, -tmpT.z) + Math.PI / 2,
    };
    airportLoadAt = Math.max(0, 1 - (AIRPORT_FORWARD + 130) / L);
  }

  // مدل فرودگاه: فایلی سنگین است، فقط وقتی یکی از بخش‌ها آن را انتخاب کرده لود می‌شود
  // و فقط وقتی هواپیما به آن نزدیک می‌شود (نه در بارگذاری اولیه صفحه)
  const airport = createAirport({ scale: AIRPORT_SCALE });
  scene.add(airport.group);
  let airportLoadStart = -1, airportLoadTriggered = false;
  if (airportPlacement) {
    airportLoadStart = airportLoadAt;
    airport.group.position.set(airportPlacement.x, 0, airportPlacement.z);
    airport.group.rotation.y = airportPlacement.rotY;
  }

  // باند فرود و اطراف آن (آسفالت واقعی، چمن، چراغ‌های ورودی/محیطی، هانگار، بادنما)
  frame3(runwayT); const zStart = tmpP.z, zEnd = zStart - 900;
  const runway = createRunway({ zStart, zEnd, aniso, rand });
  scene.add(runway.group);

  /* ---------- DOM ---------- */
  const panels = panelEls.map((el) => ({ el, card: el.querySelector('.card'), a: parseFloat(el.dataset.a), b: parseFloat(el.dataset.b), type: el.dataset.type }));
  const stopEls = Array.from(root.querySelectorAll('.hud .stop'));
  const pct = root.querySelector('.hud .pct');
  const hint = root.querySelector('.scrollhint');
  const mist = root.querySelector('.mist');
  const track = root.querySelector('.track');
  const bar = root.querySelector('.bar');
  const iAlt = root.querySelector('[data-k="alt"]'), iSpd = root.querySelector('[data-k="spd"]'), iHdg = root.querySelector('[data-k="hdg"]'), iCloud = root.querySelector('[data-k="cloud"]');
  const lsBox = root.querySelector('.landing-score');
  const lsGrade = root.querySelector('[data-k="ls-grade"]'), lsFill = root.querySelector('[data-k="ls-fill"]'), lsNum = root.querySelector('[data-k="ls-num"]'), lsBest = root.querySelector('[data-k="ls-best"]');
  // در دسکتاپ مثل قبل باز است؛ روی گوشی بسته شروع می‌شود تا کارت کمتر شلوغ باشد و با لمس باز شود
  if (!window.matchMedia('(max-width:760px)').matches) {
    root.querySelectorAll('ol.steps details').forEach((d) => { d.open = true; });
  }
  const qGroups = Array.from(root.querySelectorAll('.qs')).map((el) => ({ els: Array.from(el.querySelectorAll('figure')), i: 0 }));
  qGroups.forEach((g) => {
    g.els.forEach((q, i) => q.classList.toggle('on', i === 0));
    if (g.els.length > 1) {
      const iv = setInterval(() => { g.els[g.i].classList.remove('on'); g.i = (g.i + 1) % g.els.length; g.els[g.i].classList.add('on'); }, 5200);
      disposers.push(() => clearInterval(iv));
    }
  });

  // شمارنده آمارها
  const stats = Array.from(root.querySelectorAll('.stat-val[data-num]')).map((el) => {
    const num = parseFloat(el.dataset.num), pre = el.dataset.pre || '', suf = el.dataset.suf || '', group = el.dataset.group === '1';
    const panel = el.closest('.panel');
    const fmt = (v) => pre + Math.round(v).toLocaleString('fa-IR', { useGrouping: group }) + suf;
    if (!reduce) el.textContent = fmt(0);
    return { el, num, fmt, panel, started: -1 };
  });

  const maxScroll = () => Math.max(1, (track ? track.offsetHeight : document.documentElement.scrollHeight) - window.innerHeight);
  const scrollToP = (p) => window.scrollTo({ top: clamp(p, 0, 1) * maxScroll(), behavior: reduce ? 'auto' : 'smooth' });
  const mids = sections.map((_, i) => sectionRange(i, N).mid);
  const idxOfSection = (id) => sections.findIndex((s) => s.id === id);
  stopEls.forEach((b, i) => on(b, 'click', () => scrollToP(mids[i])));
  root.querySelectorAll('[data-jump]').forEach((b) => on(b, 'click', () => scrollToP(parseFloat(b.dataset.jump))));
  root.querySelectorAll('[data-goto]').forEach((b) => on(b, 'click', (e) => { e.preventDefault(); const i = idxOfSection(b.dataset.goto); if (i >= 0) scrollToP(mids[i]); }));

  /* ---------- صدا، پرواز خودکار، کیفیت ---------- */
  const audio = createAudio();
  disposers.push(() => audio.dispose());
  let auto = false, autoAcc = 0;
  const stopAuto = () => { if (auto) { auto = false; onState({ auto: false }); } };
  api.toggleSound = async () => {
    if (audio.enabled) { audio.disable(); wantsSound = false; return false; }
    wantsSound = true;
    return audio.enable();
  };

  // پخش خودکار صدا؛ اگر مرورگر بدون تعامل کاربر اجازه نداد، با اولین کلیک/لمس/اسکرول شروع می‌شود.
  // نکته: ctx.resume() وقتی مرورگر آن را مسدود کرده ممکن است تا مدت‌ها معلق (pending) بماند،
  // پس نباید منتظرش ماند تا شنونده‌های کلیک/اسکرول را وصل کرد؛ همان ابتدا و مستقل از نتیجه‌ی
  // تلاش اول وصل می‌شوند تا صدا هیچ‌وقت برای همیشه خاموش نماند.
  let wantsSound = !reduce;
  if (wantsSound) {
    const tryStart = () => { audio.enable().then((started) => { if (started) onState({ sound: true }); }); };
    const opts2 = { once: true, passive: true };
    on(window, 'pointerdown', tryStart, opts2);
    on(window, 'keydown', tryStart, opts2);
    on(window, 'touchstart', tryStart, opts2);
    on(window, 'wheel', tryStart, opts2);
    audio.enable().then((ok) => onState({ sound: ok }));
  }
  // وقتی از تب خارج می‌شوی صدا آرام قطع و وقتی برگردی دوباره وصل می‌شود (فقط اگر خودِ کاربر خاموشش نکرده باشد)
  on(document, 'visibilitychange', () => {
    if (!wantsSound) return;
    if (document.hidden) { if (audio.enabled) audio.disable(); }
    else if (!audio.enabled) { audio.enable().then((ok) => onState({ sound: ok })); }
  });
  api.toggleAuto = () => { auto = !auto; autoAcc = 0; return auto; };
  api.goto = scrollToP;
  api.setQuality = (q) => {
    quality = q; degraded = false;
    clouds.setStride(q === 'low' ? 2 : 1);
    renderer.setPixelRatio(dprCap()); onResize();
  };
  if (quality === 'low') clouds.setStride(2);

  /* ---------- ورودی‌ها ---------- */
  let target = 0, cur = 0, prevCur = 0, mx = 0, my = 0;
  const readScroll = () => {
    target = clamp(window.scrollY / maxScroll(), 0, 1);
    // نوار بالا فقط باید روی صحنه‌ی سه‌بعدی شناور بماند؛ وقتی فوتر (زیر track) دیده می‌شود باید کنار برود
    if (bar) bar.classList.toggle('bar-hidden', window.scrollY > maxScroll() + 24);
  };
  on(window, 'scroll', readScroll, { passive: true });
  on(window, 'pointermove', (e) => { if (e.pointerType === 'touch') return; mx = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1); my = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1); }, { passive: true });
  on(window, 'wheel', stopAuto, { passive: true });
  on(window, 'touchstart', stopAuto, { passive: true });
  on(window, 'keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    const p = target;
    let dest = null;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !/^(BUTTON|A)$/.test(tag))) {
      dest = mids.find((m) => m > p + 0.012); if (dest === undefined) dest = 1;
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      const prev = mids.filter((m) => m < p - 0.012); dest = prev.length ? prev[prev.length - 1] : 0;
    } else if (e.key === 'Home') dest = 0;
    else if (e.key === 'End') dest = 1;
    if (dest !== null) { e.preventDefault(); stopAuto(); scrollToP(dest); }
  });
  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  };
  on(window, 'resize', onResize); onResize();

  /* ---------- حلقه ---------- */
  const camPos = new V(), planePos0 = new V(), Tp = new V(), T2 = new V(), sd = new V(), fwd = new V(), lookT = new V(), tmpV = new V();
  let ox = 0, oy = 0, vx = 0, vy = 0, speedS = 0, cloudAmt = 0, lastFov = 0, frameNo = 0, roll = 0, pitch = 0;
  const sunCol = new THREE.Color();

  /* ---------- امتیاز فرود: بر اساس چپ/راست (تراز روی باند) و سرعت نشستن، مثل یک بازی کوچک ---------- */
  const LS_WINDOW = 0.085;
  let lsDone = false, lsSamples = 0, lsLatAcc = 0, lsSpeedAcc = 0;
  function showLandingScore(score) {
    if (!lsBox) return;
    let best = 0;
    try { best = parseInt(localStorage.getItem('ap-landing-best') || '0', 10) || 0; } catch (e) { /* ignore */ }
    if (score > best) { best = score; try { localStorage.setItem('ap-landing-best', String(best)); } catch (e) { /* ignore */ } }
    const grade = score >= 92 ? 'فرود بی‌نقص!' : score >= 78 ? 'فرود خیلی خوب' : score >= 58 ? 'فرود قابل قبول' : 'فرود ناهموار';
    if (lsGrade) lsGrade.textContent = grade;
    if (lsNum) lsNum.textContent = toFa(score);
    if (lsBest) lsBest.textContent = toFa(best);
    if (lsFill) lsFill.style.width = score + '%';
    lsBox.hidden = false;
    requestAnimationFrame(() => lsBox.classList.add('show'));
  }
  function updateLandingScore(p) {
    if (p > 1 - LS_WINDOW) {
      if (!lsDone) {
        const lat = clamp(Math.abs(ox) / 6.5, 0, 1);
        lsLatAcc += lat; lsSpeedAcc += speedS; lsSamples++;
        if (p >= 0.999) {
          lsDone = true;
          const avgLat = lsSamples ? lsLatAcc / lsSamples : 0;
          const avgSpeed = lsSamples ? lsSpeedAcc / lsSamples : 0;
          const score = Math.round(clamp((1 - avgLat) * 0.6 + (1 - avgSpeed) * 0.4, 0, 1) * 100);
          showLandingScore(score);
        }
      }
    } else if (p < 1 - LS_WINDOW - 0.03) {
      if (lsDone && lsBox) { lsBox.classList.remove('show'); lsBox.hidden = true; }
      lsDone = false; lsSamples = 0; lsLatAcc = 0; lsSpeedAcc = 0;
    }
  }

  function update(p, time, dt) {
    if (!airportLoadTriggered && airportLoadStart >= 0 && p > airportLoadStart) {
      airportLoadTriggered = true;
      airport.load();
    }
    /* موقعیت‌های پایه روی مسیر */
    const tp = Math.min(p + LEAD, 1);
    curve.getPointAt(tc(p), camPos);
    curve.getPointAt(tp, planePos0);
    curve.getTangentAt(tp, Tp);
    sd.crossVectors(Tp, UP).normalize();

    /* سرعت و چگالی ابر */
    const v = Math.abs(cur - prevCur) / Math.max(dt, 1e-3); prevCur = cur;
    speedS += (clamp(v * 6, 0, 1) - speedS) * (1 - Math.exp(-dt * 4));
    cloudAmt += (clouds.densityAt(camPos) - cloudAmt) * (1 - Math.exp(-dt * 2.5));

    /* آسمان و رنگ‌ها */
    const star = sampleSky(p);
    const sunY = 260 * Math.sin(Math.PI * clamp(p * 1.15, 0, 1)) - 50;
    skyMat.uniforms.top.value.copy(topC); skyMat.uniforms.bottom.value.copy(botC);
    skyMat.uniforms.sunDir.value.set(-190, sunY, -700).normalize();
    skyMat.uniforms.sunColor.value.copy(sunCol.copy(sunLow).lerp(sunHigh, clamp(sunY / 170, 0, 1)));
    skyMat.uniforms.sunAmt.value = clamp((sunY + 45) / 110, 0, 1) * (1 - star);

    cloudTint.copy(botC).lerp(white, 0.62).multiplyScalar(1 - 0.35 * star);
    fogC.copy(botC).lerp(cloudTint, cloudAmt * 0.65);
    const fogNear = 45 - 36 * cloudAmt * 0.9, fogFar = 330 - 210 * cloudAmt * 0.85;
    scene.fog.color.copy(fogC); scene.fog.near = fogNear; scene.fog.far = fogFar;
    groundMat.color.copy(botC).lerp(white, 0.3).multiplyScalar(1 - 0.6 * smooth(0.84, 1, p));
    hemi.color.copy(topC).lerp(white, 0.5); hemi.groundColor.copy(botC);
    hemi.intensity = 0.5 + 0.55 * (1 - star); dir.intensity = 0.95 * (1 - star * 0.75);
    starMat.opacity = star;

    /* دینامیک هواپیما: فنر و دمپر پیرو موس، به‌علاوه تلاطم */
    const amp = reduce ? 0 : 0.1 + cloudAmt * 0.5 + speedS * 0.12;
    const tx = coarse ? Math.sin(time * 0.35) * 2.2 : mx * 6;
    const ty = coarse ? Math.sin(time * 0.27 + 1) * 1.1 : -my * 3.4;
    const h = Math.min(dt, 0.05);
    vx += ((tx - ox) * 16 - vx * 6.5) * h; ox += vx * h;
    vy += ((ty - oy) * 16 - vy * 6.5) * h; oy += vy * h;
    const trbX = (Math.sin(time * 0.83) + Math.sin(time * 2.1 + 1.7) * 0.5 + Math.sin(time * 4.9 + 0.3) * 0.25) * amp * 0.6;
    const trbY = (Math.sin(time * 0.71 + 2) + Math.sin(time * 1.9 + 0.4) * 0.5 + Math.sin(time * 5.3 + 1.1) * 0.25) * amp * 0.5;
    const trbR = (Math.sin(time * 1.3) + Math.sin(time * 3.1 + 0.8) * 0.5) * amp * 0.1;

    plane.rig.position.set(
      planePos0.x + sd.x * (ox + trbX),
      planePos0.y + (reduce ? 0 : Math.sin(time * 1.3) * 0.15) + oy + trbY,
      planePos0.z + sd.z * (ox + trbX));
    fwd.copy(Tp).addScaledVector(sd, vx * 0.05).addScaledVector(UP, vy * 0.03).normalize();
    plane.rig.lookAt(tmpV.copy(plane.rig.position).addScaledVector(fwd, 10));
    curve.getTangentAt(Math.min(tp + 0.012, 1), T2);
    const turn = tmpV.crossVectors(Tp, T2).y;
    const rollT = clamp(-vx * 0.055 - ox * 0.03 - turn * 4, -0.65, 0.65) + trbR;
    const pitchT = -clamp(vy * 0.04, -0.35, 0.35);
    const kf = 1 - Math.exp(-h * 5);
    roll += (rollT - roll) * kf; pitch += (pitchT - pitch) * kf;
    plane.body.rotation.z = roll; plane.body.rotation.x = pitch;
    plane.light.intensity = star * 1.8;
    plane.blink(time, star);
    plane.rig.updateMatrixWorld(true);

    /* دوربین تعقیب: کمی عقب‌تر از هواپیما و با کمی تاخیر جانبی */
    const narrow = camera.aspect < 1;
    camera.position.set(
      camPos.x + sd.x * ox * 0.28,
      camPos.y + 3.6 + oy * 0.22,
      camPos.z + sd.z * ox * 0.28);
    if (!reduce && cloudAmt > 0.05) {
      const sh = cloudAmt * (0.6 + speedS);
      camera.position.y += Math.sin(time * 17.3) * 0.03 * sh;
      camera.position.x += Math.sin(time * 13.1 + 1) * 0.025 * sh;
    }
    lookT.copy(plane.rig.position).addScaledVector(Tp, 7).addScaledVector(sd, (narrow ? 0 : 3.6) + (coarse ? 0 : mx * 1.0));
    lookT.y += narrow ? 3.5 : 0.8;
    camera.lookAt(lookT);
    const fov = (narrow ? 74 : 62) + speedS * 6 + cloudAmt * 2;
    if (Math.abs(fov - lastFov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }

    /* دنباله بخار موتورها */
    const stepT = 1.05 / L;
    curve.getPointAt(tp, tmpQ);
    const rate = 1 - Math.exp(-h * 7);
    for (let e = 0; e < 2; e++) {
      engW.copy(plane.engineLocal[e]).applyMatrix4(plane.rig.matrixWorld);
      off0.copy(engW).sub(tmpQ);
      const ch = chains[e];
      ch[0].copy(off0);
      for (let k = 1; k < TRAIL; k++) ch[k].lerp(ch[k - 1], rate);
      for (let k = 0; k < TRAIL; k++) {
        const t = Math.max(0, tp - (k + 1.5) * stepT);
        curve.getPointAt(t, tmpP);
        const j = e * TRAIL + k;
        const f = k / (TRAIL - 1);
        trailSys.offsets[j * 3] = tmpP.x + ch[k].x; trailSys.offsets[j * 3 + 1] = tmpP.y + ch[k].y; trailSys.offsets[j * 3 + 2] = tmpP.z + ch[k].z;
        trailSys.data[j * 4] = 0.55 + f * 3.4; trailSys.data[j * 4 + 1] = trailRot[j].r; trailSys.data[j * 4 + 2] = trailRot[j].t;
        trailSys.data[j * 4 + 3] = 0.55 * Math.pow(1 - f, 1.25);
      }
    }
    trailSys.geo.instanceCount = TRAIL * 2;
    trailSys.aOffset.needsUpdate = true; trailSys.aData.needsUpdate = true;
    const tu = trailSys.material.uniforms;
    tu.uTime.value = time; tu.tint.value.setRGB(1, 1, 1).lerp(cloudTint, 0.25); tu.fogColor.value.copy(fogC); tu.uFogNear.value = fogNear; tu.uFogFar.value = fogFar;

    /* ابرها */
    clouds.update(camera.position, time, cloudTint, fogC, fogNear, fogFar);

    /* برند در آسمان */
    if (brandSprite) {
      const d = camera.position.distanceTo(brandSprite.position);
      brandSprite.material.opacity = smooth(10, 55, d) * (1 - smooth(260, 360, d)) * (1 - 0.6 * cloudAmt);
    }

    /* پس‌زمینه دنبال دوربین */
    sky.position.copy(camera.position); stars.position.copy(camera.position);
    ground.position.set(camera.position.x, 0, camera.position.z);
    moon.position.set(camera.position.x + 210, camera.position.y + (-160 + 380 * smooth(0.78, 1, p)), camera.position.z - 650);

    /* بلیت‌های شناور، ستون‌ها، چراغ باند */
    for (let i = 0; i < cards.length; i++) { const cm = cards[i]; cm.position.y = cm.userData.by + (reduce ? 0 : Math.sin(time * 0.8 + cm.userData.ph) * 0.4); cm.rotation.z = reduce ? 0 : Math.sin(time * 0.6 + cm.userData.ph) * 0.03; }
    for (let b = 0; b < bars.length; b++) { const u = bars[b].userData; bars[b].scale.y = Math.max(0.01, u.h * smooth(u.t - 150 / L, u.t - 40 / L, p)); u.mat.emissiveIntensity = star * 1.5; }
    runway.update(time, star);
    updateLandingScore(p);

    /* مراحل: فعال‌شدن هر مرحله وقتی هواپیما به ابر آن می‌رسد */
    for (let g = 0; g < stepGroups.length; g++) {
      const sg = stepGroups[g];
      let act = -1;
      if (p > sg.a - 0.02 && p < sg.b + 0.03) for (let k = 0; k < sg.ts.length; k++) if (tp >= sg.ts[k] - 20 / L) act = k;
      if (act !== sg.last) { sg.last = act; sg.lis.forEach((li, i) => li.classList.toggle('on', i === act)); }
    }

    /* پنل‌های متن */
    for (let n = 0; n < panels.length; n++) {
      const pn = panels[n], f = Math.min(0.03, 0.15 / N);
      const o = smooth(pn.a - f, pn.a, p) * (1 - smooth(pn.b, pn.b + f, p));
      const mid = (Math.max(pn.a, -0.1) + Math.min(pn.b, 1.1)) / 2;
      const off = (1 - o) * 30 * (p < mid ? 1 : -1);
      pn.el.style.opacity = o.toFixed(3);
      pn.el.style.visibility = o > 0.02 ? 'visible' : 'hidden';
      pn.card.style.transform = 'translateY(' + off.toFixed(1) + 'px)';
      pn.card.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
    }
    for (let s = 0; s < stats.length; s++) {
      const st = stats[s];
      if (reduce) continue;
      const shown = st.panel && parseFloat(st.panel.style.opacity) > 0.5;
      if (shown && st.started < 0) st.started = time;
      if (!shown && st.started >= 0 && parseFloat(st.panel.style.opacity) < 0.05) { st.started = -1; st.el.textContent = st.fmt(0); continue; }
      if (st.started >= 0) { const k = clamp((time - st.started) / 1.4, 0, 1); st.el.textContent = st.fmt(st.num * (1 - Math.pow(1 - k, 3))); }
    }

    /* HUD */
    const si = clamp(Math.floor(p * N), 0, N - 1);
    stopEls.forEach((el, i) => { if (i === si) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current'); });
    if (pct) pct.textContent = Math.round(p * 100).toLocaleString('fa-IR') + '٪ مسیر';
    if (hint) hint.style.opacity = p < 0.012 ? 1 : 0;
    if (mist) {
      const w = clamp(cloudAmt * 0.6, 0, 0.62);
      mist.style.opacity = w.toFixed(3);
      mist.style.backgroundColor = 'rgb(' + Math.round(cloudTint.r * 255) + ',' + Math.round(cloudTint.g * 255) + ',' + Math.round(cloudTint.b * 255) + ')';
    }
    if (frameNo % 6 === 0) {
      if (iAlt) iAlt.textContent = toFa(Math.round(plane.rig.position.y * 330).toLocaleString('en-US')).replace(/,/g, '٬');
      if (iSpd) iSpd.textContent = toFa(Math.round(760 + speedS * 140));
      if (iHdg) { const deg = ((Math.atan2(Tp.x, -Tp.z) * 180) / Math.PI + 360) % 360; iHdg.textContent = toFa(String(Math.round(deg)).padStart(3, '0')) + '°'; }
      if (iCloud) iCloud.textContent = cloudAmt > 0.35 ? 'در ابر' : 'دید آزاد';
    }
    audio.update(speedS, cloudAmt);
  }

  let lastTs = 0, avg = 16;
  function loop(ts) {
    if (disposed) return;
    const time = ts / 1000, dt = Math.min(0.05, Math.max(0.001, time - lastTs)); lastTs = time;
    frameNo++;

    if (auto) {
      autoAcc += (window.innerHeight * 0.11) * dt;
      if (autoAcc >= 1) { const px = Math.floor(autoAcc); window.scrollBy(0, px); autoAcc -= px; }
      if (target >= 0.995) { auto = false; onState({ auto: false }); }
    }
    cur += (target - cur) * (reduce ? 1 : 1 - Math.exp(-dt * 5.5));

    update(cur, time, dt);
    renderer.render(scene, camera);

    // کیفیت خودکار: اگر سیستم کند بود، تراکم ابر و دقت تصویر را کم می‌کنیم
    avg += (dt * 1000 - avg) * 0.05;
    if (quality === 'auto' && !degraded && frameNo > 120 && avg > 32) {
      degraded = true; clouds.setStride(2); renderer.setPixelRatio(dprCap()); onResize();
    }
    raf = requestAnimationFrame(loop);
  }

  /* ---------- شروع پس از آماده‌شدن فونت (برای بافت‌های کانوا) ---------- */
  let ready = false, timer = 0;
  function go() {
    if (ready || disposed) return; ready = true;
    try {
      readScroll(); cur = target; prevCur = cur;
      raf = requestAnimationFrame(loop);
      finishLoader();
    } catch (err) { console.error(err); fallback(); }
  }
  timer = setTimeout(go, 8000); // اگر دانلود مدل یا فونت گیر کرد، با مدل جایگزین شروع می‌کنیم
  disposers.push(() => clearTimeout(timer));
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('800 40px ' + FONT), document.fonts.load('500 28px ' + FONT)]).catch(() => {})
    : Promise.resolve();
  Promise.all([fontsReady, plane.ready.catch(() => false)]).then(() => { clearTimeout(timer); go(); });

  disposers.push(() => {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'specularIntensityMap'].forEach((k) => { if (m[k]) m[k].dispose(); });
        m.dispose();
      });
    });
    clouds.dispose(); atlas.dispose(); renderer.dispose();
  });

  return { dispose: finalize(), api };
}

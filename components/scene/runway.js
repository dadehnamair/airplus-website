import * as THREE from 'three';

/*
  باند فرود و اطراف آن: قبلاً یک صفحه‌ی تخت تیره با چند کره‌ی چراغ بود که در نقد کاربر
  «زشت» توصیف شد. این نسخه بافت واقعی آسفالت با خط‌کشی وسط و کناره، نوار چمن دو طرف،
  چراغ‌های ورودی (سبز) و پیرامونی (آبی) به‌علاوه چند سازه‌ی کوچک (هانگار، بادنما،
  خودروهای زمینی) برای شلوغ‌تر و زنده‌تر شدن اطراف باند اضافه می‌کند.
*/
export function createRunway({ zStart, zEnd, aniso = 1, rand = Math.random }) {
  const group = new THREE.Group();
  const width = 14;
  const length = Math.abs(zEnd - zStart);

  function runwayTex() {
    const W = 128, H = 512;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#282e42'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(255,255,255,' + (rand() * 0.04).toFixed(3) + ')'; x.fillRect(rand() * W, rand() * H, 2, 2); }
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.fillRect(W * 0.065, 0, W * 0.032, H);
    x.fillRect(W * 0.903, 0, W * 0.032, H);
    x.fillRect(W / 2 - W * 0.022, H * 0.06, W * 0.044, H * 0.36);
    x.fillRect(W / 2 - W * 0.022, H * 0.58, W * 0.044, H * 0.36);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = aniso;
    return tex;
  }
  const tileLen = 22;
  const tex = runwayTex();
  tex.repeat.set(1, length / tileLen);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshBasicMaterial({ map: tex }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.07, (zStart + zEnd) / 2);
  group.add(strip);

  // نوار سفید ورودی باند (piano keys) درست جایی که هواپیما به آن نزدیک می‌شود
  function thresholdTex() {
    const W = 128, H = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#282e42'; x.fillRect(0, 0, W, H);
    const bars = 6, bw = W * 0.09, gap = (W - bars * bw) / (bars + 1);
    x.fillStyle = '#fff';
    for (let i = 0; i < bars; i++) x.fillRect(gap + i * (bw + gap), H * 0.08, bw, H * 0.84);
    return new THREE.CanvasTexture(cv);
  }
  const thresholdLen = 22;
  const threshold = new THREE.Mesh(new THREE.PlaneGeometry(width, thresholdLen), new THREE.MeshBasicMaterial({ map: thresholdTex() }));
  threshold.rotation.x = -Math.PI / 2; threshold.position.set(0, 0.075, zStart - thresholdLen / 2 - 3);
  group.add(threshold);

  // نوار چمن دو طرف باند، به‌جای زمین سفید یک‌دست
  function grassTex() {
    const W = 64, H = 64, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#3c6b40'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 300; i++) {
      const g = 60 + Math.floor(rand() * 55);
      x.fillStyle = 'rgba(' + (20 + Math.floor(rand() * 30)) + ',' + g + ',' + (30 + Math.floor(rand() * 25)) + ',.55)';
      x.fillRect(rand() * W, rand() * H, 2, 2);
    }
    return new THREE.CanvasTexture(cv);
  }
  const gTex = grassTex(); gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping; gTex.anisotropy = aniso;
  gTex.repeat.set(3, Math.max(1, length / 20));
  const grassWidth = width * 4.4;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(grassWidth, length + 70), new THREE.MeshBasicMaterial({ map: gTex }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.025, (zStart + zEnd) / 2);
  group.add(grass);

  // چراغ‌های باند (زرد چشمک‌زن، سبز ورودی، آبی محیطی)؛ همه در یک گروه جدا تا بشود
  // با دکمه‌ی «چراغ‌های باند» در پنل پرواز یک‌جا روشن/خاموش شوند
  const lightsGroup = new THREE.Group();
  group.add(lightsGroup);

  const runwayLightMats = [];
  const lightGeo = new THREE.SphereGeometry(0.38, 8, 6);
  for (let ph = 0; ph < 3; ph++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe4b817 });
    const list = []; for (let z = zStart - ph * 8; z > zEnd; z -= 24) list.push(z);
    const inst = new THREE.InstancedMesh(lightGeo, mat, list.length * 2);
    const dummy = new THREE.Object3D();
    list.forEach((z, idx) => { [-6.4, 6.4].forEach((x2, side) => { dummy.position.set(x2, 0.4, z); dummy.updateMatrix(); inst.setMatrixAt(idx * 2 + side, dummy.matrix); }); });
    inst.frustumCulled = false; lightsGroup.add(inst); runwayLightMats.push({ mat, ph });
  }

  // چراغ‌های سبز ورودی باند
  const thMat = new THREE.MeshBasicMaterial({ color: 0x38f08a });
  const thPositions = []; for (let x2 = -6.4; x2 <= 6.4 + 0.01; x2 += 1.85) thPositions.push(x2);
  const thInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), thMat, thPositions.length);
  { const dummy = new THREE.Object3D(); thPositions.forEach((x2, i) => { dummy.position.set(x2, 0.4, zStart + 2); dummy.updateMatrix(); thInst.setMatrixAt(i, dummy.matrix); }); }
  thInst.frustumCulled = false; lightsGroup.add(thInst);

  // چراغ‌های آبی محیطی (شبیه چراغ‌های تاکسی‌وی) کمی دورتر از باند
  const peMat = new THREE.MeshBasicMaterial({ color: 0x4fa8ff });
  const peList = []; for (let z = zStart; z > zEnd + 40; z -= 42) peList.push(z);
  const peInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 6, 5), peMat, Math.max(1, peList.length * 2));
  { const dummy = new THREE.Object3D(); peList.forEach((z, idx) => { [-17, 17].forEach((x2, side) => { dummy.position.set(x2, 0.32, z); dummy.updateMatrix(); peInst.setMatrixAt(idx * 2 + side, dummy.matrix); }); }); }
  peInst.frustumCulled = false; lightsGroup.add(peInst);

  // بادنمای کوچک کنار باند
  const sock = new THREE.Group();
  sock.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0xd8dbe4 })).translateY(3));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8622f, side: THREE.DoubleSide }));
  cone.rotation.z = Math.PI / 2; cone.position.set(0.95, 5.7, 0);
  sock.add(cone);
  sock.position.set(-19, 0, zStart - 42);
  group.add(sock);

  // چند هانگار کوچک برای شلوغ‌تر شدن اطراف باند
  function hangar(x2, z2, w, h, d, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, emissive: 0x1c1608, emissiveIntensity: 0.5 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x2, h / 2, z2);
    group.add(m);
  }
  hangar(-25, zStart - 118, 15, 7, 21, 0x525a72);
  hangar(-25, zStart - 152, 11, 5.4, 15, 0x3f4760);
  hangar(25, zStart - 86, 10, 6, 13, 0x4a5068);

  // چند خودروی زمینی ساده
  function vehicle(x2, z2, color) {
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 3), new THREE.MeshBasicMaterial({ color })).translateX(x2).translateY(0.55).translateZ(z2));
  }
  vehicle(-11, zStart - 26, 0xffd25a);
  vehicle(10.5, zStart - 52, 0xe6e9f0);
  vehicle(-10, zStart - 66, 0xff5d5d);

  function update(time, star) {
    for (let r = 0; r < runwayLightMats.length; r++) {
      const on2 = Math.max(0, 1 - Math.abs(((time * 1.6 + runwayLightMats[r].ph) % 3) - 1.5) / 1.5);
      runwayLightMats[r].mat.color.setRGB(0.89 + 0.11 * on2, 0.72 + 0.28 * on2, 0.09 + 0.91 * on2);
    }
    thMat.color.setRGB(0.17 + star * 0.08, 0.86 + star * 0.06, 0.5 + star * 0.15);
    cone.rotation.y = Math.sin(time * 1.35) * 0.28;
  }

  return { group, update, lights: lightsGroup };
}

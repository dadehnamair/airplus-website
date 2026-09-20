import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/*
  مدل فرودگاه (public/models/airport/scene.gltf): یک دیوراما کامل شامل ترمینال،
  باند و چند شیء تزئینی سنگین که در صحنه‌ی ما لازم نیست. این گره‌ها حذف می‌شوند:
  - sky_759 / fog_758: یک بک‌گراند صاف (عکس آسمان/چمن) که با آسمان خودمان تداخل دارد.
  - B_777_2003dscleanergles_1: یک بوئینگ ۷۷۷ تزئینی با ~۲۲۰هزار مثلث (نیمی از کل مدل).
  - Plane004_665: زمین/تپه‌ی اطراف که با زمین صحنه‌ی خودمان همپوشانی می‌کند.
  بعد از حذف، حدود ۱۶۰هزار مثلث (ترمینال + باند + جزئیات) باقی می‌ماند.
*/
const EXCLUDE = new Set(['sky_759', 'fog_758', 'B_777_2003dscleanergles_1', 'Plane004_665']);

export function createAirport(opts = {}) {
  const url = opts.url || '/models/airport/scene.gltf';
  const scale = opts.scale || 1;
  const group = new THREE.Group();
  group.visible = false;
  let promise = null;

  function load() {
    if (promise) return promise;
    promise = new Promise((resolve) => {
      new GLTFLoader().load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.updateMatrixWorld(true); // برای محاسبه‌ی درست جعبه‌ی جهانی، پیش از هر Box3
          let root = model;
          while (root.children.length === 1 && root.children[0].children.length) {
            root = root.children[0];
            if (root.name === 'GLTF_SceneRootNode') break;
          }
          root.children.filter((c) => EXCLUDE.has(c.name)).forEach((c) => root.remove(c));

          const box = new THREE.Box3().setFromObject(root);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          // مرکز مدل (پیش از مقیاس‌دهی) روی محور افقی و کف روی y=۰
          root.position.set(-center.x, -box.min.y, -center.z);

          // بدون نور اختصاصی، شب‌ها یک حجم کاملاً تیره و بی‌جزئیات دیده می‌شد؛
          // چند چراغ گرم مثل نورافکن‌های واقعی فرودگاه، حجم و پنجره‌ها را نمایان می‌کند
          root.traverse((o) => {
            if (o.isMesh && o.material && o.material.emissiveMap) {
              o.material.emissiveIntensity = 2.2;
            }
          });

          const wrapper = new THREE.Group();
          wrapper.scale.setScalar(scale);
          wrapper.add(root);
          group.add(wrapper);

          // نور در ارتفاع نمای ساختمان (نه فقط بالای سر) تا نما و حجم دیده شود، نه فقط پشت‌بام
          const floodColor = 0xfff3d6;
          const reach = Math.max(size.x, size.y, size.z) * 2.2;
          const faceY = size.y * 0.65;
          const flood1 = new THREE.PointLight(floodColor, 9, reach, 1);
          flood1.position.set(size.x * 0.2, faceY, size.z * 0.55);
          const flood2 = new THREE.PointLight(floodColor, 7, reach, 1);
          flood2.position.set(-size.x * 0.35, faceY, -size.z * 0.35);
          const flood3 = new THREE.PointLight(0xdce8ff, 5, reach, 1);
          flood3.position.set(size.x * 0.1, size.y * 1.4, -size.z * 0.1);
          wrapper.add(flood1, flood2, flood3);

          group.visible = true;
          resolve(true);
        },
        undefined,
        (err) => { console.warn('Airport model failed to load.', err); resolve(false); },
      );
    });
    return promise;
  }

  return { group, load };
}

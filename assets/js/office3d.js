// Real 3D office for the price calculator. The room is built from the m² value,
// so it grows with every step of the slider. Drag to turn it.
import * as THREE from './vendor/three.module.min.js';

const C = {
  wall: 0x56658c, wallTop: 0x6f7fa8, floor: 0xd4d6da, wood: 0xc08a4e, woodFloor: 0xb98450,
  dark: 0x2b2f38, black: 0x121419, screen: 0x1b2433, pot: 0xe9e9ea, leaf: 0x3f8f4a, leaf2: 0x2f7440,
  glass: 0x9fc4e8, sofa: 0x8a5a3c, white: 0xf3f4f6, steel: 0x6c7078,
};
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...o });
const M = {};
for (const k in C) M[k] = mat(C[k]);
M.glass = new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide });
M.window = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e0, emissiveIntensity: 1.1 });
M.screenOn = new THREE.MeshStandardMaterial({ color: C.screen, emissive: 0x2a4a80, emissiveIntensity: 0.5, roughness: 0.3 });

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20);
const BALL = new THREE.IcosahedronGeometry(1, 1);

function box(g, m, w, h, d, x, y, z, shadow = true) {
  const b = new THREE.Mesh(BOX, m); b.scale.set(w, h, d); b.position.set(x, y + h / 2, z);
  b.castShadow = shadow; b.receiveShadow = true; g.add(b); return b;
}
function cyl(g, m, r, h, x, y, z) {
  const c = new THREE.Mesh(CYL, m); c.scale.set(r, h, r); c.position.set(x, y + h / 2, z);
  c.castShadow = true; c.receiveShadow = true; g.add(c); return c;
}
function plant(g, x, z, s = 1) {
  cyl(g, M.pot, 0.2 * s, 0.38 * s, x, 0, z);
  [[0, 0.75, 0, 0.34], [0.16, 0.6, 0.1, 0.24], [-0.15, 0.62, -0.08, 0.25], [0.02, 1.02, -0.04, 0.24], [-0.08, 0.86, 0.14, 0.2]].forEach(([dx, y, dz, r], i) => {
    const l = new THREE.Mesh(BALL, i % 2 ? M.leaf2 : M.leaf); l.scale.set(r * s, r * 1.25 * s, r * s);
    l.position.set(x + dx * s, y * s, z + dz * s); l.castShadow = true; g.add(l);
  });
}
function chair(g, x, z, rot) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
  cyl(c, M.black, 0.26, 0.04, 0, 0, 0); cyl(c, M.steel, 0.035, 0.4, 0, 0.04, 0);
  box(c, M.black, 0.48, 0.09, 0.48, 0, 0.42, 0); box(c, M.black, 0.46, 0.55, 0.07, 0, 0.55, 0.22);
}
// One workstation: desk 1.6 x 0.8, monitor, keyboard, chair on the +z side (before rotation)
function desk(g, x, z, rot) {
  const d = new THREE.Group(); d.position.set(x, 0, z); d.rotation.y = rot; g.add(d);
  box(d, M.wood, 1.6, 0.05, 0.8, 0, 0.72, 0);
  box(d, M.dark, 0.05, 0.72, 0.74, -0.75, 0, 0); box(d, M.dark, 0.05, 0.72, 0.74, 0.75, 0, 0);
  box(d, M.dark, 0.42, 0.55, 0.6, 0.5, 0.12, 0.02);
  box(d, M.black, 0.2, 0.02, 0.14, -0.15, 0.77, -0.2); box(d, M.black, 0.04, 0.16, 0.04, -0.15, 0.79, -0.2);
  box(d, M.screenOn, 0.62, 0.36, 0.03, -0.15, 0.9, -0.2);
  box(d, M.black, 0.42, 0.015, 0.14, -0.15, 0.77, 0.12); box(d, M.white, 0.2, 0.012, 0.28, 0.42, 0.77, 0.1);
  chair(d, -0.1, 0.72, 0);
}

function build(m2) {
  const g = new THREE.Group();
  const w = Math.sqrt(m2 * 1.5), d = m2 / w, H = 1.5, T = 0.16;
  const x0 = -w / 2, z0 = -d / 2;
  // floor, base, two walls (cutaway)
  box(g, M.wall, w + T * 2, 0.22, d + T * 2, 0, -0.24, 0);
  box(g, M.floor, w, 0.02, d, 0, -0.02, 0, false);
  box(g, M.wall, w + T * 2, H, T, 0, 0, z0 - T / 2);
  box(g, M.wall, T, H, d + T, x0 - T / 2, 0, T / 2 - T / 2);
  // windows on the left wall
  const nWin = Math.max(1, Math.floor((d - 0.6) / 1.5));
  for (let i = 0; i < nWin; i++) box(g, M.window, 0.03, 0.95, 1.2, x0 + 0.02, 0.4, z0 + 0.6 + (d - 1.2) * (nWin === 1 ? 0.5 : i / (nWin - 1)) + 0, false).position.z = z0 + 0.3 + (d - 0.6) * ((i + 0.5) / nWin);

  // right-hand strip for meeting room / lounge / kitchen in bigger offices
  const big = m2 >= 110, huge = m2 >= 220;
  const strip = big ? Math.min(5.2, w * 0.36) : 0;
  const deskW = w - strip;

  // workstations: clusters of two desks facing each other
  const want = Math.max(1, Math.floor(m2 / 12));
  const cellX = 2.35, cellZ = 3.3, mx = 0.9, mz = 0.55;
  const maxCols = Math.max(1, Math.floor((deskW - mx - 0.3) / cellX)), maxRows = Math.max(1, Math.floor((d - mz * 2) / cellZ));
  const single = d < 3.4, need = Math.min(maxCols * maxRows, single ? want : Math.ceil(want / 2));
  const rows = Math.min(maxRows, Math.max(1, Math.round(Math.sqrt(need * (d / deskW) * (cellX / cellZ))))), cols = Math.min(maxCols, Math.ceil(need / rows));
  const gapX = (deskW - mx - cols * cellX) / (cols + 1), gapZ = (d - rows * cellZ) / (rows + 1);
  let placed = 0;
  for (let c = 0; c < cols && placed < want; c++) for (let r = 0; r < rows && placed < want; r++) {
    const cx = x0 + mx + gapX * (c + 1) + cellX * (c + 0.5), cz = z0 + gapZ * (r + 1) + cellZ * (r + 0.5);
    if (want - placed === 1 || single) { desk(g, cx, cz - 0.2, 0); placed += 1; }
    else { desk(g, cx, cz - 0.4, Math.PI); desk(g, cx, cz + 0.4, 0); placed += 2; }
  }

  // shelf with folders on the back wall
  const shW = Math.min(2.4, deskW * 0.45), shX = x0 + deskW - shW / 2 - 0.4;
  box(g, M.dark, shW, 1.1, 0.36, shX, 0, z0 + 0.2);
  box(g, M.wood, shW + 0.06, 0.04, 0.4, shX, 1.1, z0 + 0.2);
  for (let i = 0; i < Math.floor(shW / 0.5); i++) box(g, i % 2 ? M.white : M.steel, 0.3, 0.26, 0.2, shX - shW / 2 + 0.3 + i * 0.5, 1.14, z0 + 0.2);
  plant(g, x0 + 0.5, z0 + 0.5, 1.15); plant(g, shX - shW / 2 - 0.45, z0 + 0.4, 0.9);
  if (m2 >= 45) plant(g, x0 + 0.5, -z0 - 0.5, 1);

  if (big) {
    const sx = x0 + deskW, mD = Math.min(4.2, d * 0.5); // meeting room at the back right
    box(g, M.woodFloor, strip, 0.025, d, sx + strip / 2, -0.015, 0, false);
    box(g, M.glass, 0.04, H * 0.92, mD, sx, 0, z0 + mD / 2, false);
    box(g, M.glass, strip - 1.1, H * 0.92, 0.04, sx + (strip - 1.1) / 2, 0, z0 + mD, false);
    box(g, M.dark, 0.06, H * 0.92, 0.06, sx, 0, z0 + mD, false); box(g, M.dark, strip, 0.05, 0.06, sx + strip / 2, H * 0.92, z0 + mD, false); box(g, M.dark, 0.06, 0.05, mD, sx, H * 0.92, z0 + mD / 2, false);
    const tx = sx + strip / 2, tz = z0 + mD / 2, tl = Math.min(2.6, mD - 1.5);
    box(g, M.dark, 1.1, 0.05, tl, tx, 0.72, tz); box(g, M.dark, 0.5, 0.72, tl * 0.5, tx, 0, tz);
    const n = Math.max(2, Math.floor(tl / 0.75));
    for (let i = 0; i < n; i++) { const z = tz - tl / 2 + (i + 0.5) * (tl / n); chair(g, tx - 0.95, z, -Math.PI / 2); chair(g, tx + 0.95, z, Math.PI / 2); }
    plant(g, sx + strip - 0.45, z0 + 0.45, 1.1);
    // kitchen / coffee corner at the front right
    const kz = -z0 - 0.35, kw = Math.min(2.6, strip - 0.8);
    box(g, M.dark, kw, 0.9, 0.6, sx + strip - kw / 2 - 0.2, 0, kz);
    box(g, M.wood, kw + 0.04, 0.04, 0.64, sx + strip - kw / 2 - 0.2, 0.9, kz);
    box(g, M.black, 0.28, 0.36, 0.3, sx + strip - 0.6, 0.94, kz); cyl(g, M.white, 0.05, 0.1, sx + strip - 1.1, 0.94, kz);
    if (huge) { // lounge between meeting room and kitchen
      const lz = (z0 + mD + kz) / 2;
      box(g, M.sofa, 1.9, 0.42, 0.8, tx, 0, lz + 0.9); box(g, M.sofa, 1.9, 0.45, 0.2, tx, 0.42, lz + 1.2);
      box(g, M.sofa, 0.8, 0.42, 0.8, tx - 1.6, 0, lz - 0.3); box(g, M.sofa, 0.2, 0.45, 0.8, tx - 1.9, 0.42, lz - 0.3);
      cyl(g, M.wood, 0.42, 0.34, tx, 0, lz - 0.25); plant(g, tx + 1.5, lz + 0.9, 1.1);
    }
  }
  return g;
}

export function mountOffice(el, m2) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, 16 / 9, 1, 200);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a3550, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.3); sun.position.set(-14, 22, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.far = 80; sun.shadow.bias = -0.0004;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.47; ground.receiveShadow = true; scene.add(ground);

  let office = null, dist = 30, distT = 30, angle = Math.PI / 4, target = 1, shown = 0.6, dragging = false, lastX = 0, idle = 0, visible = true;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function set(v) {
    if (office) scene.remove(office);
    office = build(v); office.scale.setScalar(shown); scene.add(office); target = 1; distT = 12 + 1.65 * Math.sqrt(v);
  }
  function size() {
    const w = el.clientWidth, h = el.clientHeight || w * 9 / 16;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (!dragging && !still && performance.now() - idle > 2500) angle += 0.0018;
    shown += (target - shown) * 0.12; if (office) office.scale.setScalar(shown);
    dist += (distT - dist) * 0.1; const R = dist, el2 = 0.56; // the camera backs off slower than the room grows, so a big office fills more of the frame
    cam.position.set(Math.sin(angle) * Math.cos(el2) * R, Math.sin(el2) * R, Math.cos(angle) * Math.cos(el2) * R);
    cam.lookAt(0, 0.3, 0);
    renderer.render(scene, cam);
  }
  const cv = renderer.domElement; cv.style.touchAction = 'pan-y'; cv.style.cursor = 'grab';
  cv.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!dragging) return; angle -= (e.clientX - lastX) * 0.008; lastX = e.clientX; });
  const up = () => { dragging = false; idle = performance.now(); cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  new ResizeObserver(size).observe(el);
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(el);
  size(); set(m2); frame();
  return { set, turn: (a) => { angle = a; } };
}

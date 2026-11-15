// Real 3D office for the price calculator. The room is built from the m² value,
// so it grows with every step of the slider. Drag to turn it.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { GTAOPass } from './vendor/postprocessing/GTAOPass.js';
import { OutputPass } from './vendor/postprocessing/OutputPass.js';
import { ShaderPass } from './vendor/postprocessing/ShaderPass.js';
import { FXAAShader } from './vendor/shaders/FXAAShader.js';

// ---------- random numbers that repeat (same office every time) ----------
function rng(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let R = rng(7);
const rnd = () => R(), rr = (a, b) => a + (b - a) * R(), pick = (a) => a[Math.floor(R() * a.length)];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------- painted textures ----------
function canvasTex(size, draw, repeat = true, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const woodTex = (base, planks) => canvasTex(1024, (x, s) => {
  x.fillStyle = base; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 700; i++) {
    const y = Math.random() * s, dark = Math.random() < 0.6;
    x.strokeStyle = dark ? `rgba(70,40,15,${0.02 + Math.random() * 0.08})` : `rgba(255,232,195,${0.02 + Math.random() * 0.07})`;
    x.lineWidth = 0.5 + Math.random() * 2.5; x.beginPath(); x.moveTo(0, y);
    x.bezierCurveTo(s * 0.3, y + (Math.random() - 0.5) * 14, s * 0.6, y + (Math.random() - 0.5) * 14, s, y + (Math.random() - 0.5) * 8); x.stroke();
  }
  if (planks) {
    const rows = 8, h = s / rows;
    for (let r = 0; r < rows; r++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '60,30,10' : '255,235,200'},${Math.random() * 0.12})`; x.fillRect(0, r * h, s, h);
      x.fillStyle = 'rgba(35,20,8,.6)'; x.fillRect(0, r * h, s, 2);
      const off = ((r * 0.37) % 1) * s; x.fillRect(off, r * h, 2, h);
    }
  }
});
const concreteTex = () => canvasTex(1024, (x, s) => {
  x.fillStyle = '#c9ccd1'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const cx = Math.random() * s, cy = Math.random() * s, r = 30 + Math.random() * 160, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = Math.random() < 0.5 ? '255,255,255' : '80,85,95';
    g.addColorStop(0, `rgba(${c},${0.025 + Math.random() * 0.05})`); g.addColorStop(1, `rgba(${c},0)`);
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const d = x.getImageData(0, 0, s, s);
  for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 16; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  x.putImageData(d, 0, 0);
  x.fillStyle = 'rgba(60,64,72,.55)'; x.fillRect(0, 0, s, 3); x.fillRect(0, 0, 3, s); // joints between the floor slabs
});
const noiseTex = (grain) => canvasTex(256, (x, s) => {
  const d = x.createImageData(s, s);
  for (let i = 0; i < d.data.length; i += 4) { const px = (i / 4) % s, py = Math.floor(i / 4 / s); const v = grain === 'weave' ? 110 + ((px % 4 < 2) !== (py % 4 < 2) ? 60 : 0) + Math.random() * 40 : 128 + (Math.random() - 0.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
}, true, false);
const screenTex = (k) => canvasTex(256, (x, s) => {
  if (k === 2) { // dark editor
    x.fillStyle = '#0b1220'; x.fillRect(0, 0, s, s); x.fillStyle = '#141d30'; x.fillRect(0, 0, 46, s); x.fillRect(0, 0, s, 18);
    for (let i = 0; i < 24; i++) { x.fillStyle = pick(['#7aa2f7', '#9ece6a', '#c0caf5', '#bb9af7', '#565f89']); x.fillRect(58 + (i % 5) * 8, 28 + i * 9, 30 + Math.random() * 130, 4); }
  } else if (k === 1) { // document
    x.fillStyle = '#dfe5ef'; x.fillRect(0, 0, s, s); x.fillStyle = '#2b579a'; x.fillRect(0, 0, s, 26); x.fillStyle = '#fff'; x.fillRect(48, 40, 160, 216);
    for (let i = 0; i < 17; i++) { x.fillStyle = i % 6 === 0 ? '#1f2a44' : '#9aa5b8'; x.fillRect(60, 54 + i * 11, i % 6 === 0 ? 80 : 100 + Math.random() * 36, i % 6 === 0 ? 6 : 4); }
  } else { // dashboard
    x.fillStyle = '#0d1626'; x.fillRect(0, 0, s, s); x.fillStyle = '#1b2a47'; x.fillRect(0, 0, s, 22); x.fillRect(0, 22, 52, s);
    x.fillStyle = '#e9eef7'; x.fillRect(64, 36, 180, 120);
    for (let i = 0; i < 6; i++) { x.fillStyle = i % 3 ? '#9fb2d4' : '#3b82f6'; x.fillRect(74, 48 + i * 16, 60 + Math.random() * 100, 6); }
    x.fillStyle = '#3b82f6'; for (let i = 0; i < 8; i++) { const h = 12 + Math.random() * 60; x.fillRect(70 + i * 21, 244 - h, 13, h); }
    for (let i = 0; i < 6; i++) { x.fillStyle = '#31456e'; x.fillRect(8, 34 + i * 20, 36, 8); }
  }
}, false);
const keysTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#17181c'; x.fillRect(0, 0, s, s);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { x.fillStyle = '#2c2e35'; x.fillRect(6 + c * 16.3, 10 + r * 48, 13.5, 40); }
  x.fillStyle = '#2c2e35'; x.fillRect(70, 202, 110, 40);
}, false);
const leafTex = (c1, c2, vein) => canvasTex(128, (x, s) => {
  const g = x.createLinearGradient(0, s, 0, 0); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, s, s);
  x.strokeStyle = vein; x.lineWidth = 3; x.beginPath(); x.moveTo(s / 2, s); x.lineTo(s / 2, 0); x.stroke(); x.lineWidth = 1.2;
  for (let i = 1; i < 10; i++) { const y = s - i * s / 10; x.beginPath(); x.moveTo(s / 2, y); x.quadraticCurveTo(s * 0.75, y - 6, s, y - 24); x.moveTo(s / 2, y); x.quadraticCurveTo(s * 0.25, y - 6, 0, y - 24); x.stroke(); }
}, false);
const binderTex = (bg, label, ink) => canvasTex(128, (x, s) => {
  x.fillStyle = bg; x.fillRect(0, 0, s, s); x.fillStyle = label; x.fillRect(22, 14, 84, 46);
  x.fillStyle = ink; x.fillRect(32, 24, 64, 5); x.fillRect(32, 36, 44, 4); x.beginPath(); x.arc(64, 100, 9, 0, 7); x.fill();
}, false);
const boardTex = () => canvasTex(512, (x, s) => {
  x.fillStyle = '#f7f8fa'; x.fillRect(0, 0, s, s); x.lineWidth = 4; x.lineCap = 'round';
  x.strokeStyle = '#2b4c9b'; x.beginPath(); x.moveTo(40, 300); for (let i = 1; i < 9; i++) x.lineTo(40 + i * 28, 300 - i * 14 - Math.random() * 40); x.stroke();
  x.strokeStyle = '#1e293b'; x.strokeRect(300, 150, 80, 50); x.strokeRect(410, 150, 70, 50); x.strokeRect(355, 250, 80, 50);
  x.beginPath(); x.moveTo(340, 200); x.lineTo(390, 250); x.moveTo(445, 200); x.lineTo(400, 250); x.stroke();
  x.fillStyle = '#1e293b'; for (let i = 0; i < 5; i++) x.fillRect(40, 150 + i * 16, 90 + Math.random() * 110, 4);
  x.fillStyle = '#d14343'; x.fillRect(40, 340, 120, 5); x.fillStyle = '#fde68a'; x.fillRect(420, 320, 56, 56); x.fillStyle = '#bbf7d0'; x.fillRect(350, 330, 56, 56);
}, false);
const artTex = (k) => canvasTex(256, (x, s) => {
  x.fillStyle = k ? '#e9e4da' : '#1c2947'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 6; i++) { x.fillStyle = pick(k ? ['#24345c', '#c08a52', '#8793b8', '#3d4a70'] : ['#c9a274', '#56648f', '#e9e4da', '#2f4374']); x.globalAlpha = 0.85; x.beginPath(); x.arc(Math.random() * s, Math.random() * s, 30 + Math.random() * 70, 0, 7); x.fill(); }
}, false);
const clockTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#f5f5f2'; x.fillRect(0, 0, s, s); x.strokeStyle = '#1b1d22'; x.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.lineWidth = i % 3 ? 3 : 7; x.beginPath(); x.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); x.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); x.stroke(); }
  x.lineWidth = 9; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 190); x.stroke(); x.lineWidth = 6; x.beginPath(); x.moveTo(128, 128); x.lineTo(128, 28); x.stroke(); // 18:00
}, false);
const rugTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#2a3a63'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(190,200,230,.35)'; x.lineWidth = 3; x.strokeRect(14, 14, s - 28, s - 28);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.06)`; x.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
}, false);
const skyTex = () => canvasTex(64, (x, s) => { const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8eefb'); x.fillStyle = g; x.fillRect(0, 0, s, s); }, false);

// ---------- materials ----------
const std = (color, rough = 0.7, metal = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.55, ...o });
let M = null;
function materials() {
  if (M) return M;
  const wood = woodTex('#cba577', false), plank = woodTex('#c49c6e', true), conc = concreteTex(), grain = noiseTex('grain'), weave = noiseTex('weave');
  const leaf = (a, b, v) => std(0xffffff, 0.5, 0, { map: leafTex(a, b, v), side: THREE.DoubleSide });
  const binder = (bg, l, ink) => std(0xffffff, 0.6, 0, { map: binderTex(bg, l, ink) });
  const scr = (k) => std(0x05070c, 0.2, 0, { emissive: 0xffffff, emissiveMap: screenTex(k), emissiveIntensity: 0.42 });
  M = {
    wall: std(0x4d5876, 0.92, 0, { bumpMap: grain, bumpScale: 0.06 }), cap: std(0x76819f, 0.85), base: std(0x414b68, 0.9), skirt: std(0x2e3650, 0.7),
    concrete: std(0xa3a6ad, 0.42, 0, { map: conc, bumpMap: conc, bumpScale: 0.08 }), plank: std(0xe6d3bd, 0.42, 0, { map: plank, bumpMap: plank, bumpScale: 0.3 }),
    wood: std(0xf0e0cc, 0.42, 0, { map: wood }), woodDark: std(0xa98a6a, 0.5, 0, { map: wood }),
    dark: std(0x2c3038, 0.6, 0.1), darker: std(0x1c1e24, 0.5, 0.15), frame: std(0x15171b, 0.4, 0.6),
    cab: std(0x4a4d55, 0.55, 0.05), cabFront: std(0x53565f, 0.5, 0.05), steel: std(0x9a9fa8, 0.3, 0.85), chrome: std(0xd8dbe0, 0.12, 1),
    black: std(0x121317, 0.42, 0.2), fabric: std(0x23252c, 0.95, 0, { bumpMap: weave, bumpScale: 0.6 }), mesh: std(0x191b20, 0.9, 0, { bumpMap: weave, bumpScale: 0.9, side: THREE.DoubleSide }),
    mat: std(0x30333b, 0.9), keys: std(0xffffff, 0.6, 0, { map: keysTex() }), screens: [scr(0), scr(1), scr(2)], tv: scr(0),
    white: std(0xf1f2f4, 0.55), paper: std(0xfafafa, 0.9), navy: std(0x24345c, 0.75), grey: std(0x9a9fa8, 0.7), yellow: std(0xf4d35e, 0.8), red: std(0xb5463c, 0.7),
    binders: [binder('#eef0f3', '#ffffff', '#1f2a44'), binder('#8d939e', '#f4f5f7', '#1f2a44'), binder('#24345c', '#eef0f3', '#24345c'), binder('#1c1e24', '#d9dce2', '#1c1e24')],
    pot: std(0xecebe7, 0.35), potDark: std(0x3a3d45, 0.55), potGrey: std(0x9b9fa6, 0.6), soil: std(0x2a2019, 1), stem: std(0x4d6b35, 0.8), trunk: std(0x6b5137, 0.9),
    leaves: [leaf('#1f5a2c', '#3c8a44', '#6fae63'), leaf('#2a6b34', '#4f9a4c', '#8cc27a'), leaf('#19482a', '#2f7039', '#5c9a58')], flower: std(0xfbfbf6, 0.6, 0, { side: THREE.DoubleSide }),
    leather: std(0x8a5636, 0.45, 0, { bumpMap: grain, bumpScale: 0.25 }), cushion: std(0x2c3c66, 0.95, 0, { bumpMap: weave, bumpScale: 0.6 }), rug: std(0xffffff, 1, 0, { map: rugTex() }),
    ceramic: std(0xffffff, 0.2), board: std(0xffffff, 0.25, 0, { map: boardTex() }), art: [std(0xffffff, 0.7, 0, { map: artTex(0) }), std(0xffffff, 0.7, 0, { map: artTex(1) })],
    clock: std(0xffffff, 0.4, 0, { map: clockTex() }), door: std(0x3b3f48, 0.55), lampShade: std(0xfff1d6, 0.8, 0, { emissive: 0xffd9a0, emissiveIntensity: 0.9 }), bulb: std(0xffffff, 0.5, 0, { emissive: 0xffe2b0, emissiveIntensity: 1.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfd9f2, transparent: true, opacity: 0.18, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.3, depthWrite: false, side: THREE.DoubleSide }),
    frost: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x9cc7f0, transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }),
    pane: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveMap: skyTex(), emissiveIntensity: 1.3, roughness: 0.4 }),
    blind: std(0xf4efe4, 0.9, 0, { emissive: 0xfff0d2, emissiveIntensity: 0.6 }),
    blob: new THREE.MeshBasicMaterial({ map: canvasTex(128, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(0.55, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }, false), transparent: true, depthWrite: false, opacity: 0.5 }),
  };
  for (const k of ['glass', 'frost', 'water', 'blob']) M[k].userData.noAO = true;
  return M;
}

// ---------- building blocks ----------
const GEO = new Map();
const geo = (k, f) => { let g = GEO.get(k); if (!g) { g = f(); GEO.set(k, g); } return g; };
const mm = (v) => Math.round(v * 1000);
function put(g, geometry, m, x, y, z, shadow = true) {
  const b = new THREE.Mesh(geometry, m); b.position.set(x, y, z); b.castShadow = shadow; b.receiveShadow = true; g.add(b); return b;
}
// box with rounded edges; y is the underside
const rbox = (g, m, w, h, d, x, y, z, r = 0.012, shadow = true, seg = 1) =>
  put(g, geo(`r${mm(w)}|${mm(h)}|${mm(d)}|${mm(r)}|${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.01, h / 2.01, d / 2.01))), m, x, y + h / 2, z, shadow);
const box = (g, m, w, h, d, x, y, z, shadow = true) =>
  put(g, geo(`b${mm(w)}|${mm(h)}|${mm(d)}`, () => new THREE.BoxGeometry(w, h, d)), m, x, y + h / 2, z, shadow);
const cyl = (g, m, rt, rb, h, x, y, z, seg = 16, shadow = true) =>
  put(g, geo(`c${mm(rt)}|${mm(rb)}|${mm(h)}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), m, x, y + h / 2, z, shadow);
const ball = (g, m, x, y, z, sx, sy = sx, sz = sx) => { const b = put(g, geo('ball', () => new THREE.SphereGeometry(1, 12, 8)), m, x, y, z); b.scale.set(sx, sy, sz); return b; };
const flat = (g, m, w, d, x, y, z, shadow = false) => { const b = put(g, geo('flat', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), m, x, y, z, shadow); b.scale.set(w, 1, d); return b; };
const upright = (g, m, w, h, x, y, z) => { const b = put(g, geo('upright', () => new THREE.PlaneGeometry(1, 1)), m, x, y, z, false); b.scale.set(w, h, 1); return b; };
const grp = (parent, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };
const UP = new THREE.Vector3(0, 1, 0);
function rod(g, m, a, b, r) { // thin bar between two points
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
  const c = put(g, geo('rod', () => new THREE.CylinderGeometry(1, 1, 1, 6)), m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  c.scale.set(r, len, r); c.quaternion.setFromUnitVectors(UP, d.normalize()); return c;
}
// soft dark patch on the floor under furniture
const blob = (g, w, d, x = 0, z = 0, y = 0.016) => { const b = flat(g, M.blob, w, d, x, y, z); b.receiveShadow = false; return b; };

// Fuse everything with the same material into one mesh: few draw calls, smooth on phones
function fuse(src) {
  src.updateMatrixWorld(true);
  const buckets = new Map();
  src.traverse((o) => {
    if (!o.isMesh) return;
    const k = o.material.uuid + (o.castShadow ? 's' : 'n');
    let b = buckets.get(k); if (!b) { b = { m: o.material, c: o.castShadow, g: [] }; buckets.set(k, b); }
    const ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); ge.applyMatrix4(o.matrixWorld); b.g.push(ge);
  });
  const out = new THREE.Group();
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(b.g), b.m); b.g.forEach((x) => x.dispose());
    mesh.castShadow = b.c; mesh.receiveShadow = !b.m.isMeshBasicMaterial; mesh.userData.own = true; mesh.userData.noAO = !!b.m.userData.noAO;
    if (b.m.transparent) mesh.renderOrder = b.m === M.blob || b.m.isMeshBasicMaterial ? 1 : 3;
    out.add(mesh);
  }
  return out;
}
// Furniture is built once, then copied wherever it is needed
const PRE = new Map();
function place(g, key, build, x = 0, z = 0, ry = 0, s = 1, y = 0) {
  let p = PRE.get(key);
  if (!p) { const keep = R; R = rng(hash(key)); const t = new THREE.Group(); build(t); p = fuse(t); p.children.forEach((c) => { c.userData.own = false; }); PRE.set(key, p); R = keep; }
  const c = p.clone(); c.position.set(x, y, z); c.rotation.y = ry; c.scale.setScalar(s); g.add(c); return c;
}

// ---------- plants with real leaf shapes ----------
function outline(hw, n = 26) { const s = new THREE.Shape(); s.moveTo(0, 0); for (let i = 1; i <= n; i++) s.lineTo(hw(i / n), i / n); for (let i = n - 1; i >= 0; i--) s.lineTo(-hw(i / n), i / n); return s; }
function bent(g, droop, cup) { // lay the flat leaf along z, let it hang and fold a little
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); uv.setXY(i, x + 0.5, Math.min(1, y)); p.setXYZ(i, x, cup * x * x - droop * y * y, y); }
  g.computeVertexNormals(); return g;
}
let LEAF = null;
function leafShapes() {
  if (LEAF) return LEAF;
  const sin = Math.sin, PI = Math.PI;
  const mon = outline((t) => { let n = 0; for (const c of [0.3, 0.44, 0.58, 0.71, 0.83]) n = Math.max(n, Math.exp(-(((t - c) / 0.016) ** 2))); return 0.44 * Math.pow(sin(PI * Math.pow(t, 0.62)), 0.7) * (1 - 0.62 * n); }, 90);
  for (const [cx, cy] of [[0.1, 0.36], [-0.1, 0.36], [0.12, 0.51], [-0.12, 0.51], [0.09, 0.65], [-0.09, 0.65]]) { const h = new THREE.Path(); h.absellipse(cx, cy, 0.03, 0.045, 0, Math.PI * 2); mon.holes.push(h); }
  // palm frond: a rib with thin leaflets on both sides
  const pos = [], uv = [];
  const tri = (a, b, c) => { pos.push(a[0], a[1], 0, b[0], b[1], 0, c[0], c[1], 0); uv.push(0.5, 0, 0.5, 0.2, 0.9, 1); };
  tri([-0.012, 0], [0.012, 0], [0, 1]);
  for (let i = 1; i <= 24; i++) { const t = i / 25, len = 0.3 * sin(PI * Math.pow(t, 0.75)) + 0.07; for (const s of [-1, 1]) { tri([0, t - 0.012], [0, t + 0.045], [s * len * 0.72, t + len * 0.62 + 0.03]); } }
  const frond = new THREE.BufferGeometry(); frond.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); frond.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); frond.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  LEAF = {
    point: bent(new THREE.ShapeGeometry(outline((t) => 0.2 * Math.pow(sin(PI * Math.pow(t, 0.8)), 0.9))), 0.35, 0.9),
    lily: bent(new THREE.ShapeGeometry(outline((t) => 0.17 * Math.pow(sin(PI * Math.pow(t, 0.7)), 0.8))), 0.6, 1.2),
    blade: bent(new THREE.ShapeGeometry(outline((t) => 0.075 * Math.pow(sin(PI * Math.pow(t, 0.5)), 0.6))), 0.04, 1.5),
    mon: bent(new THREE.ShapeGeometry(mon), 0.28, 0.3), frond: bent(frond, 0.5, -0.5),
  };
  return LEAF;
}
// kind: 0 monstera, 1 ficus tree, 2 palm, 3 snake plant, 4 peace lily
function buildPlant(p, kind) {
  leafShapes();
  const tall = kind === 1 || kind === 2, pr = tall ? 0.2 : kind === 3 ? 0.13 : 0.17, ph = tall ? 0.42 : kind === 3 ? 0.22 : 0.3, potM = pick([M.pot, M.pot, M.potDark, M.potGrey]);
  blob(p, pr * 4.4, pr * 4.4);
  cyl(p, potM, pr, pr * 0.74, ph, 0, 0, 0, 20); cyl(p, potM, pr * 1.06, pr * 1.06, 0.035, 0, ph - 0.035, 0, 20); cyl(p, M.soil, pr * 0.93, pr * 0.93, 0.012, 0, ph - 0.004, 0, 14);
  const leaf = (k, m, pos, az, pitch, len, roll = 0) => {
    const h = new THREE.Group(); h.position.set(...pos); h.rotation.order = 'YXZ'; h.rotation.y = az; h.rotation.x = -pitch; h.rotation.z = roll; p.add(h);
    const l = new THREE.Mesh(LEAF[k], m); l.scale.setScalar(len); l.castShadow = true; l.receiveShadow = true; h.add(l);
  };
  const L = M.leaves;
  if (kind === 0) for (let i = 0; i < 10; i++) {
    const az = i * 2.4 + rnd(), rad = rr(0.16, 0.42), e = [Math.sin(az) * rad, ph + rr(0.3, 0.8), Math.cos(az) * rad];
    rod(p, M.stem, [Math.sin(az) * 0.04, ph, Math.cos(az) * 0.04], e, 0.008); leaf('mon', pick(L), e, az, rr(-0.2, 0.45), rr(0.3, 0.46), rr(-0.3, 0.3));
  } else if (kind === 1) {
    const top = [rr(-0.06, 0.06), ph + 1.15, rr(-0.06, 0.06)]; rod(p, M.trunk, [0, ph, 0], top, 0.016);
    for (let i = 0; i < 28; i++) { const t = i / 27, az = i * 2.4 + rnd() * 0.5; leaf('point', pick(L), [top[0] * t, ph + 0.28 + t * 0.87, top[2] * t], az, rr(0.05, 0.85) + t * 0.3, rr(0.2, 0.3), rr(-0.4, 0.4)); }
  } else if (kind === 2) for (let i = 0; i < 11; i++) leaf('frond', pick(L), [0, ph - 0.02, 0], i * 2.4 + rnd() * 0.4, rr(0.7, 1.3), rr(0.75, 1.15), rr(-0.25, 0.25));
  else if (kind === 3) for (let i = 0; i < 10; i++) { const az = rnd() * 6.3; leaf('blade', pick(L), [Math.sin(az) * 0.04, ph - 0.02, Math.cos(az) * 0.04], az, rr(1.15, 1.5), rr(0.35, 0.62), rr(-0.5, 0.5)); }
  else {
    for (let i = 0; i < 16; i++) leaf('lily', pick(L), [0, ph - 0.02, 0], i * 2.4 + rnd() * 0.5, rr(0.45, 1.2), rr(0.3, 0.5), rr(-0.3, 0.3));
    for (let i = 0; i < 3; i++) { const az = rnd() * 6.3, e = [Math.sin(az) * 0.1, ph + rr(0.45, 0.62), Math.cos(az) * 0.1]; rod(p, M.stem, [0, ph, 0], e, 0.005); leaf('point', M.flower, e, az, 1.25, 0.13); }
  }
}
const plant = (g, x, z, s = 1, kind = 0, y = 0) => place(g, `plant${kind}_${Math.floor(rnd() * 3)}`, (t) => buildPlant(t, kind), x, z, rnd() * 6.3, s, y);

// ---------- furniture ----------
function buildChair(c, head) { // faces -z, backrest at +z
  blob(c, 0.95, 0.95);
  for (let i = 0; i < 5; i++) {
    const l = grp(c, 0, 0, 0, i * Math.PI * 0.4);
    const sp = box(l, M.black, 0.05, 0.03, 0.3, 0, 0.075, 0.16); sp.rotation.x = 0.1;
    put(l, geo('caster', () => new THREE.CylinderGeometry(0.028, 0.028, 0.05, 10).rotateZ(Math.PI / 2)), M.black, 0, 0.028, 0.3);
  }
  cyl(c, M.black, 0.05, 0.05, 0.06, 0, 0.07, 0, 12); cyl(c, M.chrome, 0.02, 0.02, 0.22, 0, 0.13, 0, 10); cyl(c, M.black, 0.034, 0.034, 0.12, 0, 0.12, 0, 10);
  box(c, M.black, 0.2, 0.05, 0.26, 0, 0.36, 0.02); rbox(c, M.fabric, 0.5, 0.085, 0.49, 0, 0.41, 0, 0.04, true, 2);
  const b = grp(c, 0, 0.56, -0.15); b.rotation.x = 0.1; // curved mesh backrest
  const arc = 0.6, rad = 0.4;
  put(b, geo('shell', () => new THREE.CylinderGeometry(rad, rad, 0.5, 10, 1, true, -arc, arc * 2)), M.mesh, 0, 0.27, 0);
  for (const y of [0.02, 0.52]) put(b, geo('rim', () => new THREE.TorusGeometry(rad, 0.014, 5, 10, arc * 2).rotateX(Math.PI / 2).rotateY(-(Math.PI / 2 - arc))), M.black, 0, y, 0);
  for (const s of [-1, 1]) box(b, M.black, 0.026, 0.5, 0.026, s * rad * Math.sin(arc), 0.02, rad * Math.cos(arc));
  box(b, M.black, 0.07, 0.42, 0.03, 0, -0.14, rad + 0.02); box(b, M.black, 0.07, 0.03, 0.18, 0, -0.16, rad - 0.07);
  if (head) { box(b, M.black, 0.03, 0.14, 0.02, 0, 0.5, rad + 0.01); rbox(b, M.fabric, 0.27, 0.13, 0.06, 0, 0.6, rad - 0.01, 0.03, true, 2); }
  for (const s of [-1, 1]) { box(c, M.black, 0.03, 0.2, 0.045, s * 0.275, 0.44, 0.04); rbox(c, M.black, 0.07, 0.03, 0.27, s * 0.275, 0.64, 0.0, 0.012); }
}
const chair = (g, x, z, rot, k = 0) => place(g, 'chair' + k, (t) => buildChair(t, k === 1), x, z, rot);

function monitor(g, x, z, ry) {
  const m = grp(g, x, 0.765, z, ry);
  cyl(m, M.black, 0.1, 0.1, 0.012, 0, 0, 0.0, 18); const n = box(m, M.black, 0.045, 0.24, 0.018, 0, 0.01, -0.01); n.rotation.x = -0.1;
  rbox(m, M.black, 0.62, 0.365, 0.02, 0, 0.13, 0.012, 0.008); box(m, M.darker, 0.12, 0.1, 0.02, 0, 0.26, -0.006);
  upright(m, pick(M.screens), 0.602, 0.345, 0, 0.3125, 0.0225);
}
function buildDesk(d, v) { // desk 1.6 x 0.8, chair on the +z side
  blob(d, 2.1, 1.25);
  rbox(d, M.wood, 1.6, 0.035, 0.8, 0, 0.73, 0, 0.008);
  for (const s of [-1, 1]) { // black steel frame
    for (const z of [-0.3, 0.3]) box(d, M.frame, 0.05, 0.7, 0.05, s * 0.74, 0.03, z);
    rbox(d, M.frame, 0.06, 0.03, 0.74, s * 0.74, 0, 0, 0.006); box(d, M.frame, 0.05, 0.03, 0.6, s * 0.74, 0.7, 0);
  }
  box(d, M.frame, 1.44, 0.05, 0.03, 0, 0.67, -0.33); box(d, M.dark, 1.44, 0.3, 0.015, 0, 0.34, -0.36); box(d, M.dark, 1.0, 0.05, 0.12, 0, 0.6, -0.25);
  const px = v % 2 ? -0.48 : 0.48; // drawer unit on wheels
  rbox(d, M.cab, 0.4, 0.5, 0.56, px, 0.06, 0.04, 0.01);
  for (const [cx, cz] of [[-0.15, -0.2], [0.15, -0.2], [-0.15, 0.26], [0.15, 0.26]]) ball(d, M.black, px + cx, 0.03, cz, 0.03);
  for (const y of [0.08, 0.245, 0.41]) { rbox(d, M.cabFront, 0.38, 0.15, 0.012, px, y, 0.324, 0.005, false); box(d, M.steel, 0.14, 0.012, 0.016, px, y + 0.11, 0.336, false); }
  rbox(d, M.mat, 0.78, 0.004, 0.34, -0.05, 0.765, 0.17, 0.002, false);
  if (v === 4) { // laptop desk
    rbox(d, M.grey, 0.33, 0.014, 0.23, -0.1, 0.769, 0.12, 0.006); const lid = grp(d, -0.1, 0.78, 0.005); lid.rotation.x = -0.3;
    rbox(lid, M.grey, 0.33, 0.21, 0.008, 0, 0, 0, 0.004); upright(lid, M.screens[1], 0.31, 0.19, 0, 0.105, 0.0045); monitor(d, 0.36, -0.2, -0.25);
  } else {
    monitor(d, -0.36, -0.2, 0.2); monitor(d, 0.27, -0.2, -0.2);
    rbox(d, M.darker, 0.43, 0.014, 0.13, -0.1, 0.769, 0.14, 0.005); flat(d, M.keys, 0.41, 0.115, -0.1, 0.7838, 0.14); ball(d, M.darker, 0.2, 0.78, 0.15, 0.03, 0.016, 0.05);
  }
  const ex = v % 2 ? 0.6 : -0.62; // things on the desk
  if (v % 3 === 0) { cyl(d, pick([M.ceramic, M.navy]), 0.04, 0.034, 0.09, ex, 0.765, 0.16, 14); put(d, geo('handle', () => new THREE.TorusGeometry(0.024, 0.007, 5, 10).rotateY(Math.PI / 2)), M.ceramic, ex + 0.045, 0.81, 0.16); }
  if (v % 3 === 1) { cyl(d, M.darker, 0.04, 0.04, 0.1, ex, 0.765, -0.05, 12); for (let i = 0; i < 4; i++) rod(d, pick([M.navy, M.red, M.yellow, M.white]), [ex + rr(-0.02, 0.02), 0.8, -0.05 + rr(-0.02, 0.02)], [ex + rr(-0.04, 0.04), 0.93, -0.05 + rr(-0.04, 0.04)], 0.004); }
  if (v % 3 === 2) plant(d, ex, -0.2, 0.42, pick([3, 4]), 0.765);
  const ng = grp(d, -ex * 0.92, 0.765, 0.12, rr(-0.4, 0.4)); rbox(ng, M.navy, 0.2, 0.014, 0.27, 0, 0, 0, 0.004, false); rbox(ng, M.paper, 0.2, 0.01, 0.28, 0.02, 0.014, 0.01, 0.002, false);
  if (v % 2) box(d, M.yellow, 0.076, 0.008, 0.076, -ex * 0.6, 0.765, -0.12, false); else rbox(d, M.black, 0.075, 0.008, 0.15, ex * 0.7, 0.765, 0.2, 0.004, false);
  if (v === 1 || v === 3) { // desk lamp
    const l = grp(d, -ex, 0.765, -0.27, ex > 0 ? -0.7 : 0.7); cyl(l, M.black, 0.075, 0.075, 0.015, 0, 0, 0, 16);
    rod(l, M.black, [0, 0.01, 0], [-0.06, 0.34, 0], 0.008); rod(l, M.black, [-0.06, 0.34, 0], [0.18, 0.5, 0], 0.008);
    cyl(l, M.black, 0.035, 0.075, 0.08, 0.2, 0.43, 0, 14); cyl(l, M.bulb, 0.06, 0.06, 0.004, 0.2, 0.428, 0, 12, false);
  }
  if (v === 2 || v === 5) cyl(d, M.dark, 0.13, 0.1, 0.3, -px * 1.2, 0, 0.1, 14); // paper bin
  chair(d, rr(-0.22, 0.02), rr(0.74, 0.9), rr(-0.4, 0.4), v % 3 === 0 ? 1 : 0);
}
const desk = (g, x, z, rot, i) => place(g, 'desk' + (i % 6), (t) => buildDesk(t, i % 6), x, z, rot);

function binders(g, x0, x1, y, z) {
  let x = x0 + 0.03;
  while (x < x1 - 0.09) {
    if (rnd() < 0.14) { x += rr(0.08, 0.2); continue; }
    const w = rr(0.05, 0.08), h = rr(0.28, 0.32); rbox(g, pick(M.binders), w, h, 0.25, x + w / 2, y, z, 0.003); x += w + 0.005;
  }
}
function shelf(g, x, z, W) { // open shelf with the back against the wall
  const s = grp(g, x, 0, z), n = Math.max(1, Math.round(W / 0.85)), cw = W / n; blob(s, W + 0.5, 0.9, 0, 0.1);
  for (let i = 0; i <= n; i++) box(s, M.frame, 0.025, 1.92, 0.34, -W / 2 + i * cw, 0, 0);
  [0.04, 0.5, 0.95, 1.4, 1.87].forEach((y, r) => {
    rbox(s, M.wood, W + 0.03, 0.03, 0.36, 0, y, 0, 0.005);
    for (let i = 0; i < n; i++) {
      const a = -W / 2 + i * cw + 0.025, b = a + cw - 0.025, mid = (a + b) / 2, k = rnd(), top = r === 4, yy = y + 0.03;
      if (top) { if (k < 0.35) plant(s, mid, 0, 0.5, pick([3, 4, 0]), yy); else if (k < 0.6) rbox(s, pick([M.grey, M.navy, M.white]), 0.36, 0.22, 0.27, mid, yy, 0, 0.008); }
      else if (k < 0.55) binders(s, a, b, yy, 0);
      else if (k < 0.7) { rbox(s, pick([M.grey, M.navy, M.white]), 0.34, 0.2, 0.26, mid - 0.12, yy, 0, 0.008); for (let j = 0; j < 4; j++) rbox(s, pick([M.navy, M.white, M.red, M.grey]), 0.2, 0.03, 0.26, mid + 0.2, yy + j * 0.03, 0, 0.003); }
      else if (k < 0.85) { cyl(s, pick([M.ceramic, M.navy, M.potGrey]), 0.05, 0.08, 0.22, mid - 0.15, yy, 0, 14); rbox(s, M.frame, 0.2, 0.26, 0.02, mid + 0.14, yy, -0.04, 0.004); upright(s, pick(M.art), 0.17, 0.23, mid + 0.14, yy + 0.13, -0.029); }
      else plant(s, mid, 0, 0.48, pick([3, 4]), yy);
    }
  });
}
function cabinet(g, x, z) { // tall cupboard 0.9 wide
  const c = grp(g, x, 0, z); blob(c, 1.3, 1.0, 0, 0.1); box(c, M.darker, 0.86, 0.08, 0.4, 0, 0, -0.01);
  rbox(c, M.cab, 0.9, 1.94, 0.45, 0, 0.08, 0, 0.01);
  for (const s of [-1, 1]) { rbox(c, M.cabFront, 0.44, 1.9, 0.012, s * 0.2235, 0.1, 0.228, 0.004, false); box(c, M.steel, 0.012, 0.24, 0.018, s * 0.04, 0.95, 0.24, false); }
}
function coffee(g, x, y, z, ry = 0) {
  const c = grp(g, x, y, z, ry); rbox(c, M.darker, 0.24, 0.34, 0.3, 0, 0, 0, 0.02); rbox(c, M.chrome, 0.24, 0.012, 0.3, 0, 0.34, 0, 0.004);
  box(c, M.chrome, 0.2, 0.012, 0.14, 0, 0.012, 0.2); box(c, M.black, 0.22, 0.012, 0.16, 0, 0, 0.2); cyl(c, M.chrome, 0.03, 0.025, 0.05, 0, 0.2, 0.17, 10);
  cyl(c, M.ceramic, 0.03, 0.025, 0.06, 0, 0.024, 0.2, 12); cyl(c, M.water, 0.05, 0.05, 0.26, 0.15, 0.03, -0.06, 12, false); cyl(c, M.bulb, 0.008, 0.008, 0.004, 0.07, 0.28, 0.151, 6, false);
}
function sideboard(g, x, z, W, ry = 0, kitchen = false) {
  const s = grp(g, x, 0, z, ry); blob(s, W + 0.45, 1.0, 0, 0.1); box(s, M.darker, W - 0.04, 0.08, 0.44, 0, 0, -0.01);
  rbox(s, M.cab, W, 0.8, 0.5, 0, 0.08, 0, 0.008); rbox(s, M.wood, W + 0.04, 0.035, 0.54, 0, 0.88, 0, 0.006);
  const n = Math.max(2, Math.round(W / 0.45)), dw = W / n;
  for (let i = 0; i < n; i++) { rbox(s, M.cabFront, dw - 0.012, 0.76, 0.012, -W / 2 + (i + 0.5) * dw, 0.1, 0.254, 0.004, false); box(s, M.steel, 0.1, 0.012, 0.016, -W / 2 + (i + 0.5) * dw, 0.8, 0.266, false); }
  coffee(s, -W / 2 + 0.26, 0.915, -0.04);
  for (let i = 0; i < 5; i++) cyl(s, pick([M.ceramic, M.navy]), 0.035, 0.03, 0.08, -W / 2 + 0.56 + (i % 3) * 0.09, 0.915, 0.1 - Math.floor(i / 3) * 0.1, 12);
  if (W > 1.2) plant(s, W / 2 - 0.22, 0, 0.5, 4, 0.915);
  if (kitchen && W > 2) { rbox(s, M.darker, 0.46, 0.27, 0.34, 0.25, 0.915, -0.04, 0.012); upright(s, M.glass, 0.3, 0.19, 0.2, 1.05, 0.131); box(s, M.steel, 0.012, 0.2, 0.012, 0.43, 0.95, 0.135, false); }
}
function wallShelves(g, x, z, W, ry = 0) { // two boards on the wall above the coffee corner
  const s = grp(g, x, 0, z, ry);
  for (const y of [1.36, 1.74]) {
    rbox(s, M.wood, W, 0.03, 0.22, 0, y, 0.11, 0.005); for (const e of [-1, 1]) box(s, M.frame, 0.02, 0.1, 0.18, e * (W / 2 - 0.12), y - 0.1, 0.09);
    let x1 = -W / 2 + 0.12;
    while (x1 < W / 2 - 0.1) { const k = rnd(); if (k < 0.3) plant(s, x1, 0.11, 0.4, pick([3, 4, 0]), y + 0.03); else if (k < 0.65) { cyl(s, M.glass, 0.04, 0.04, 0.13, x1, y + 0.03, 0.11, 10, false); cyl(s, M.wood, 0.042, 0.042, 0.015, x1, y + 0.16, 0.11, 10); } else cyl(s, pick([M.ceramic, M.navy, M.potGrey]), 0.035, 0.03, 0.08, x1, y + 0.03, 0.11, 10); x1 += rr(0.16, 0.26); }
  }
}
function printer(g, x, z) {
  const p = grp(g, x, 0, z); blob(p, 1.0, 0.95); rbox(p, M.white, 0.6, 0.72, 0.52, 0, 0, 0, 0.015);
  for (const y of [0.12, 0.3, 0.48]) { box(p, M.grey, 0.54, 0.004, 0.004, 0, y + 0.15, 0.262, false); rbox(p, M.dark, 0.16, 0.02, 0.012, 0, y + 0.07, 0.264, 0.004, false); }
  rbox(p, M.dark, 0.62, 0.1, 0.54, 0, 0.72, 0, 0.012); rbox(p, M.white, 0.6, 0.05, 0.5, 0, 0.82, -0.01, 0.012); rbox(p, M.darker, 0.2, 0.02, 0.1, 0.18, 0.82, 0.24, 0.006); flat(p, M.screens[0], 0.12, 0.06, 0.18, 0.842, 0.24);
  rbox(p, M.paper, 0.3, 0.012, 0.22, -0.34, 0.6, 0.05, 0.003); box(p, M.white, 0.1, 0.02, 0.3, -0.33, 0.58, 0.05);
}
function waterCooler(g, x, z) {
  const c = grp(g, x, 0, z); blob(c, 0.7, 0.7); rbox(c, M.white, 0.32, 0.98, 0.32, 0, 0, 0, 0.02); rbox(c, M.grey, 0.24, 0.16, 0.02, 0, 0.62, 0.16, 0.006, false);
  cyl(c, M.water, 0.13, 0.13, 0.34, 0, 1.0, 0, 16, false); cyl(c, M.water, 0.05, 0.11, 0.06, 0, 0.98, 0, 12, false); for (const s of [-1, 1]) box(c, s > 0 ? M.navy : M.red, 0.03, 0.03, 0.03, s * 0.05, 0.7, 0.18, false);
}
function coatRack(g, x, z) {
  const c = grp(g, x, 0, z); blob(c, 0.7, 0.7); cyl(c, M.frame, 0.2, 0.22, 0.02, 0, 0, 0, 20); cyl(c, M.frame, 0.016, 0.016, 1.72, 0, 0.02, 0, 8);
  for (let i = 0; i < 5; i++) { const a = i * 1.257; rod(c, M.frame, [0, 1.6, 0], [Math.sin(a) * 0.16, 1.72, Math.cos(a) * 0.16], 0.008); }
}
function sofa(g, x, z, ry, W = 1.9) {
  const s = grp(g, x, 0, z, ry); blob(s, W + 0.6, 1.4, 0, 0, 0.03);
  for (const e of [-1, 1]) for (const f of [-1, 1]) box(s, M.frame, 0.04, 0.12, 0.04, e * (W / 2 - 0.08), 0, f * 0.33);
  rbox(s, M.leather, W, 0.2, 0.86, 0, 0.12, 0, 0.04, true, 2); rbox(s, M.leather, W, 0.46, 0.2, 0, 0.3, -0.33, 0.06, true, 2);
  const n = W > 1.2 ? 2 : 1, cw = (W - 0.36) / n;
  for (let i = 0; i < n; i++) { const cx = -W / 2 + 0.18 + (i + 0.5) * cw; rbox(s, M.leather, cw - 0.02, 0.13, 0.62, cx, 0.32, 0.08, 0.05, true, 2); rbox(s, M.leather, cw - 0.03, 0.34, 0.14, cx, 0.45, -0.2, 0.06, true, 2).rotation.x = -0.15; }
  for (const e of [-1, 1]) rbox(s, M.leather, 0.18, 0.5, 0.86, e * (W / 2 - 0.09), 0.12, 0, 0.06, true, 2);
  if (n > 1) { const c = rbox(s, M.cushion, 0.36, 0.34, 0.12, W / 2 - 0.4, 0.46, -0.05, 0.05, true, 2); c.rotation.set(-0.3, -0.3, 0.1); }
}

// One wall, built along local x with the room side at +z
function wall(L, H, T, windows) {
  const g = new THREE.Group(), m = {}; for (const k of ['wall', 'cap', 'pane', 'blind', 'frame', 'blob', 'skirt', 'white']) m[k] = M[k].clone();
  box(g, m.cap, L, 0.02, T, 0, H, 0, false); box(g, m.skirt, L, 0.09, 0.018, 0, 0, T / 2 + 0.009, false);
  const ao = flat(g, m.blob, L + 1, 0.9, 0, 0.014, T / 2 + 0.1); ao.receiveShadow = false;
  if (!windows) box(g, m.wall, L, H, T, 0, 0, 0);
  else {
    const sill = 0.25, top = H - 0.2, wh = top - sill, end = 0.3, pier = 0.16, n = Math.max(1, Math.floor((L - end * 2 + pier) / 1.6)), ww = (L - end * 2 - (n - 1) * pier) / n;
    box(g, m.wall, L, sill, T, 0, 0, 0); box(g, m.wall, L, H - top, T, 0, top, 0);
    box(g, m.wall, end, wh, T, -L / 2 + end / 2, sill, 0); box(g, m.wall, end, wh, T, L / 2 - end / 2, sill, 0);
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + end + i * (ww + pier) + ww / 2, fz = -T * 0.12;
      if (i) box(g, m.wall, pier, wh, T, x - ww / 2 - pier / 2, sill, 0);
      box(g, m.pane, ww, wh, 0.02, x, sill, -T * 0.3, false);
      for (const s of [-1, 1]) box(g, m.frame, 0.05, wh, 0.07, x + s * (ww / 2 - 0.025), sill, fz, false);
      box(g, m.frame, ww, 0.05, 0.07, x, sill, fz, false); box(g, m.frame, ww, 0.05, 0.07, x, top - 0.05, fz, false);
      box(g, m.frame, 0.04, wh, 0.06, x, sill, fz, false); box(g, m.frame, ww, 0.035, 0.06, x, sill + wh * 0.72, fz, false);
      rbox(g, m.white, ww + 0.08, 0.03, T / 2 + 0.1, x, sill - 0.03, (T / 2 + 0.1) / 2, 0.006);
      const bh = rr(0.3, 0.8); box(g, m.white, ww - 0.02, 0.07, 0.07, x, top - 0.07, 0.03, false); box(g, m.blind, ww - 0.06, bh, 0.008, x, top - 0.07 - bh, 0.03, false);
      box(g, m.white, ww - 0.05, 0.025, 0.02, x, top - 0.09 - bh, 0.03, false); box(g, m.frame, 0.004, bh + 0.5, 0.004, x + ww / 2 - 0.07, top - 0.57 - bh, 0.05, false);
    }
  }
  const out = fuse(g); out.userData.mats = Object.values(m); return out;
}

function build(m2) {
  materials(); R = rng(11);
  const root = new THREE.Group(), g = new THREE.Group(), decoBack = new THREE.Group(), decoRight = new THREE.Group();
  const A = m2 * 0.6, w = Math.sqrt(A * 1.5), d = A / w, H = 2.7, T = 0.28, x0 = -w / 2, z0 = -d / 2;
  root.userData = { w, d };

  // floor and plinth
  const big = m2 >= 110, huge = m2 >= 220, strip = big ? Math.min(5.4, w * 0.36) : (m2 >= 60 ? 1.5 : 0), deskW = w - strip, sx = x0 + deskW;
  box(root, M.base, w + T * 2, 0.3, d + T * 2, 0, -0.3, 0);
  const floor = (m, fw, cx, tile) => { const f = put(root, new THREE.BoxGeometry(fw, 0.02, d), m, cx, 0, 0, false); f.userData.own = true; const uv = f.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fw / tile, uv.getY(i) * d / tile); };
  floor(M.concrete, deskW, x0 + deskW / 2, 2.4);
  if (strip) { floor(M.plank, strip, sx + strip / 2, 1.6); box(g, M.steel, 0.035, 0.006, d, sx, 0.008, 0, false); }

  // four walls; the ones between camera and room hide themselves while turning
  root.userData.walls = [
    [wall(w + T * 2, H, T, false), 0, z0 - T / 2, 0, 0, -1, decoBack], [wall(d, H, T, true), x0 - T / 2, 0, Math.PI / 2, -1, 0],
    [wall(d, H, T, false), -x0 + T / 2, 0, -Math.PI / 2, 1, 0, decoRight], [wall(w + T * 2, H, T, false), 0, -z0 + T / 2, Math.PI, 0, 1],
  ].map(([wl, x, z, ry, nx, nz, deco]) => { wl.position.set(x, 0, z); wl.rotation.y = ry; if (nx > 0 || nz > 0) wl.traverse((o) => { o.castShadow = false; }); root.add(wl); return { wl, nx, nz, deco }; });

  // workstations: clusters of two desks facing each other
  const want = Math.max(1, Math.floor(m2 / 12)), cellX = 1.85, cellZ = 3.0, mx = 0.75, zA = z0 + 0.8, zB = -z0 - 0.25, uz = zB - zA;
  const single = uz < cellZ, cz1 = single ? 1.9 : cellZ;
  const maxCols = Math.max(1, Math.floor((deskW - mx - 0.25) / cellX)), maxRows = Math.max(1, Math.floor(uz / cz1));
  const need = Math.min(maxCols * maxRows, single ? want : Math.ceil(want / 2));
  const rows = Math.min(maxRows, Math.max(1, Math.round(Math.sqrt(need * (uz / deskW) * (cellX / cz1))))), cols = Math.min(maxCols, Math.ceil(need / rows));
  const gapX = (deskW - mx - cols * cellX) / (cols + 1), gapZ = (uz - rows * cz1) / (rows + 1);
  let placed = 0;
  for (let c = 0; c < cols && placed < want; c++) for (let r = 0; r < rows && placed < want; r++) {
    const cx = x0 + mx + gapX * (c + 1) + cellX * (c + 0.5), cz = zA + gapZ * (r + 1) + cz1 * (r + 0.5);
    if (want - placed === 1 || single) { desk(g, cx, cz - 0.35, 0, placed); placed += 1; }
    else { desk(g, cx, cz - 0.41, Math.PI, placed); desk(g, cx, cz + 0.41, 0, placed + 1); placed += 2; }
    if (c < cols - 1 && gapX + cellX - 1.6 > 0.75 && rnd() < 0.7) plant(g, cx + cellX / 2 + gapX / 2, cz + rr(-0.3, 0.3), 0.8, pick([0, 4, 2]));
  }

  // along the back wall: coffee corner, cupboards, shelf, printer, things on the wall
  const bz = z0 + 0.2, left = x0 + 0.95; let bx = sx - 0.2;
  if (!big && strip) { const sw = Math.min(1.3, strip - 0.15), cx = sx + strip / 2; sideboard(g, cx, z0 + 0.29, sw); wallShelves(decoBack, cx, z0, sw); }
  if (bx - left > 3.6) { cabinet(g, bx - 0.45, z0 + 0.25); cabinet(g, bx - 1.37, z0 + 0.25); bx -= 1.95; } else if (bx - left > 2.7) { cabinet(g, bx - 0.45, z0 + 0.25); bx -= 1.03; }
  const sw = Math.min(big ? 3.4 : 2.55, bx - left - 0.15);
  if (sw > 0.8) { shelf(g, bx - sw / 2, bz, sw); bx -= sw + 0.2; }
  if (m2 >= 100 && bx - left > 1.0) { printer(g, bx - 0.4, z0 + 0.32); bx -= 0.95; }
  if (m2 >= 160 && bx - left > 0.6) { waterCooler(g, bx - 0.25, z0 + 0.22); bx -= 0.6; }
  const free = bx - left;
  if (free > 2.2) { const bw = Math.min(2.0, free - 0.9), cx = left + 0.2 + bw / 2; rbox(decoBack, M.steel, bw + 0.05, 1.0, 0.03, cx, 1.0, z0 + 0.015, 0.008, false); upright(decoBack, M.board, bw, 0.95, cx, 1.5, z0 + 0.032); rbox(decoBack, M.steel, bw * 0.6, 0.02, 0.07, cx, 0.98, z0 + 0.05, 0.004, false); bx = cx + bw / 2 + 0.35; }
  if (bx - left > 0.9 && free <= 2.2) for (let i = 0, n = Math.min(3, Math.floor((bx - left) / 0.75)); i < n; i++) { const cx = left + 0.35 + i * 0.75; rbox(decoBack, M.frame, 0.5, 0.66, 0.025, cx, 1.25, z0 + 0.013, 0.004, false); upright(decoBack, M.art[i % 2], 0.44, 0.6, cx, 1.58, z0 + 0.027); }
  { const cx = free > 2.2 ? Math.min(bx + 0.1, sx - 0.5) : x0 + 0.5; cyl(decoBack, M.frame, 0.17, 0.17, 0.03, cx, 2.1, z0 + 0.015, 28).rotation.x = Math.PI / 2; const f = put(decoBack, geo('clock', () => new THREE.CircleGeometry(0.155, 28)), M.clock, cx, 2.115, z0 + 0.032, false); f.receiveShadow = false; }
  plant(g, x0 + 0.5, z0 + 0.5, 1.1, 1);
  if (m2 >= 45) plant(g, x0 + 0.5, -z0 - 0.5, 1, 2);
  if (m2 >= 160) plant(g, x0 + 0.48, 0, 1.05, 0);
  if (m2 >= 60 && m2 < 110) coatRack(g, -x0 - 0.4, -z0 - 1.75);
  if (!big) { // door in the right wall
    const dz = -z0 - 0.85, dx = -x0; box(decoRight, M.frame, 0.03, 2.12, 0.06, dx - 0.015, 0, dz - 0.5, false); box(decoRight, M.frame, 0.03, 2.12, 0.06, dx - 0.015, 0, dz + 0.5, false); box(decoRight, M.frame, 0.03, 0.06, 1.06, dx - 0.015, 2.06, dz, false);
    rbox(decoRight, M.door, 0.04, 2.05, 0.94, dx - 0.02, 0.01, dz, 0.006, false); box(decoRight, M.steel, 0.05, 0.02, 0.13, dx - 0.065, 1.02, dz - 0.33, false);
  }

  if (big) {
    const mD = Math.min(4.4, d * 0.48), gh = 2.3, zc = z0 + mD, door = 1.0, gl = strip - door; // glass meeting room, back right
    box(g, M.glass, 0.016, gh, mD, sx, 0, z0 + mD / 2, false); box(g, M.glass, gl, gh, 0.016, sx + door + gl / 2, 0, zc, false);
    box(g, M.frost, 0.02, 0.45, mD - 0.1, sx, 0.85, z0 + mD / 2, false); box(g, M.frost, gl - 0.1, 0.45, 0.02, sx + door + gl / 2, 0.85, zc, false);
    for (const [fx, fz, fw, fd] of [[sx, z0 + mD / 2, 0.05, mD], [sx + strip / 2, zc, strip, 0.05]]) box(g, M.frame, fw, 0.05, fd, fx, gh, fz, false);
    for (const [fx, fz, fw, fd] of [[sx, z0 + mD / 2, 0.05, mD], [sx + door + gl / 2, zc, gl, 0.05]]) box(g, M.frame, fw, 0.04, fd, fx, 0, fz, false);
    for (let z = z0 + 1.2; z < zc - 0.3; z += 1.2) box(g, M.frame, 0.035, gh, 0.035, sx, 0, z, false);
    for (let x = sx + door + 1.2; x < sx + strip - 0.3; x += 1.2) box(g, M.frame, 0.035, gh, 0.035, x, 0, zc, false);
    for (const x of [sx, sx + door]) box(g, M.frame, 0.05, gh, 0.05, x, 0, zc, false);
    const dg = grp(g, sx + door, 0, zc, -0.9); box(dg, M.glass, door - 0.06, gh - 0.1, 0.016, -door / 2, 0.02, 0, false); box(dg, M.chrome, 0.025, 0.5, 0.025, -door + 0.14, 0.85, 0.03, false);
    const tx = sx + strip / 2 + 0.1, tz = z0 + mD / 2, tl = Math.min(2.8, mD - 1.7);
    blob(g, 2.9, tl + 1.0, tx, tz); rbox(g, M.wood, 1.15, 0.04, tl, tx, 0.715, tz, 0.01);
    for (const s of [-1, 1]) { const lz = tz + s * (tl / 2 - 0.35); box(g, M.frame, 0.7, 0.04, 0.05, tx, 0.675, lz); box(g, M.frame, 0.7, 0.03, 0.05, tx, 0, lz); for (const e of [-1, 1]) box(g, M.frame, 0.05, 0.68, 0.05, tx + e * 0.33, 0.02, lz); }
    const n = Math.max(2, Math.floor(tl / 0.72));
    for (let i = 0; i < n; i++) { const z = tz - tl / 2 + (i + 0.5) * (tl / n); chair(g, tx - 0.95, z, -Math.PI / 2 + rr(-0.2, 0.2)); chair(g, tx + 0.95, z, Math.PI / 2 + rr(-0.2, 0.2)); rbox(g, pick([M.navy, M.paper]), 0.2, 0.012, 0.28, tx - 0.32, 0.755, z + rr(-0.05, 0.05), 0.003, false); cyl(g, M.glass, 0.03, 0.026, 0.1, tx + 0.35, 0.755, z + 0.1, 10, false); }
    cyl(g, M.darker, 0.09, 0.11, 0.035, tx, 0.755, tz + 0.35, 16); plant(g, tx, tz - 0.2, 0.42, 4, 0.755);
    rbox(decoBack, M.black, 1.5, 0.86, 0.04, tx, 1.0, z0 + 0.03, 0.01, false); upright(decoBack, M.tv, 1.44, 0.8, tx, 1.43, z0 + 0.052);
    plant(g, sx + strip - 0.45, zc - 0.5, 1.05, 2);
    // coffee kitchen at the front right
    const kw = Math.min(2.6, strip - 1.4), kz = -z0 - 0.5 - kw / 2; sideboard(g, sx + strip - 0.3, kz, kw, -Math.PI / 2, true); wallShelves(decoRight, -x0, kz, Math.min(1.8, kw - 0.3), -Math.PI / 2);
    if (huge) { // lounge between meeting room and kitchen
      const lz = zc + (d - mD) * 0.36, lx = sx + strip / 2 - 0.2;
      rbox(g, M.rug, 3.2, 0.014, 2.5, lx, 0.01, lz, 0.005, false);
      sofa(g, lx - 1.15, lz, Math.PI / 2); sofa(g, lx + 0.95, lz - 0.62, -Math.PI / 2 + 0.3, 0.85); sofa(g, lx + 0.95, lz + 0.62, -Math.PI / 2 - 0.3, 0.85);
      cyl(g, M.wood, 0.42, 0.42, 0.03, lx - 0.1, 0.36, lz, 32); cyl(g, M.frame, 0.03, 0.03, 0.36, lx - 0.1, 0.02, lz, 10); cyl(g, M.frame, 0.22, 0.22, 0.015, lx - 0.1, 0.02, lz, 24);
      rbox(g, M.navy, 0.2, 0.012, 0.28, lx - 0.22, 0.39, lz + 0.1, 0.003, false).rotation.y = 0.5; plant(g, lx, lz - 0.12, 0.4, 3, 0.39);
      const fl = grp(g, lx - 1.2, 0, lz - 1.35); blob(fl, 0.7, 0.7); cyl(fl, M.frame, 0.16, 0.17, 0.02, 0, 0.02, 0, 20); cyl(fl, M.frame, 0.012, 0.012, 1.45, 0, 0.03, 0, 8); cyl(fl, M.lampShade, 0.14, 0.2, 0.26, 0, 1.4, 0, 20, false);
      plant(g, lx - 1.15, lz + 1.5, 1.05, 0);
    }
  }
  root.add(fuse(g));
  for (const wl of root.userData.walls) if (wl.deco) { wl.deco = fuse(wl.deco); root.add(wl.deco); }
  return root;
}

export function mountOffice(el, m2, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  let pr = Math.min(window.devicePixelRatio || 1, 2); renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = canvasTex(256, (x, s) => { const g = x.createRadialGradient(s / 2, s * 0.55, 0, s / 2, s * 0.55, s * 0.75); g.addColorStop(0, '#2a3454'); g.addColorStop(1, '#10162a'); x.fillStyle = g; x.fillRect(0, 0, s, s); }, false);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(20, 16 / 9, 2, 160);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x3a4360, 1.0));
  const fill = new THREE.DirectionalLight(0xe6ecff, 1.0); fill.position.set(10, 9, 12); scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffe9c8, 3.0); sun.castShadow = true;
  const smap = renderer.capabilities.maxTextureSize >= 8192 && window.innerWidth > 900 ? 4096 : 2048; sun.shadow.mapSize.set(smap, smap);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; scene.add(sun); scene.add(sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.42 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; ground.userData.noAO = true; scene.add(ground);

  // depth shading (ambient occlusion) on top of the picture; switched off by itself on slow devices
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, cam));
  const ao = new GTAOPass(scene, cam, 4, 4);
  ao.updateGtaoMaterial({ radius: 0.42, distanceExponent: 1.4, thickness: 1.3, scale: 1.25, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1.5, rings: 2, samples: 16 });
  ao.overrideVisibility = function () { const cache = this._visibilityCache; this.scene.traverse((o) => { cache.set(o, o.visible); if (o.isPoints || o.isLine || o.userData.noAO || o.userData.hide) o.visible = false; }); };
  ao.enabled = opts.quality !== 'low'; composer.addPass(ao); composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader); composer.addPass(fxaa); // smooth edges

  let office = null, dist = 34, distT = 34, angle = Math.PI / 4, elev = 0.55, target = 1, shown = 0.7, drag = false, lx = 0, ly = 0, idle = 0, visible = true;
  let zoom = 1, pending = m2, lastBuild = -1e9, slow = 0, frames = 0, last = performance.now();
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rebuild(v) {
    if (office) { scene.remove(office); office.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); office.userData.walls.forEach((x) => x.wl.userData.mats.forEach((m) => m.dispose())); }
    office = build(v); office.scale.setScalar(shown); scene.add(office); target = 1; distT = 9.4 + 1.8 * Math.sqrt(v);
    const { w, d } = office.userData, h = Math.hypot(w, d) / 2 + 3, c = sun.shadow.camera;
    sun.position.set(-30, 12.5, 5); sun.target.position.set(0, 0, 0);
    c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.near = 1; c.far = 90; c.updateProjectionMatrix();
  }
  function size() {
    const w = el.clientWidth, h = el.clientHeight || w * 9 / 16; if (!w) return;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h); fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    if (pending != null && now - lastBuild > 110) { rebuild(pending); pending = null; lastBuild = performance.now(); last = lastBuild; frames = 0; return; }
    if (!office) return;
    const dt = now - last; last = now;
    if (opts.quality == null && ++frames > 12 && frames < 90) { // too slow? first drop the depth shading, then the resolution
      slow += dt > 45 ? 1 : -0.5; slow = Math.max(0, slow);
      if (slow > 14) { slow = 0; frames = 0; if (ao.enabled) ao.enabled = false; else if (pr > 1) { pr = 1; size(); } }
    }
    if (!drag && !still && now - idle > 2500) angle += 0.0016;
    shown += (target - shown) * 0.12; office.scale.setScalar(shown);
    dist += (distT - dist) * 0.1; // the camera backs off slower than the room grows, so a big office fills more of the frame
    const sx = Math.sin(angle), cz = Math.cos(angle), D = dist * zoom;
    cam.position.set(sx * Math.cos(elev) * D, Math.sin(elev) * D + 0.7, cz * Math.cos(elev) * D); cam.lookAt(0, 0.7, 0);
    for (const { wl, nx, nz, deco } of office.userData.walls) {
      const show = nx * sx + nz * cz < 0.12; wl.userData.mats.forEach((m) => { m.colorWrite = show; m.depthWrite = show && !m.transparent; });
      wl.children.forEach((o) => { o.userData.hide = !show; }); if (deco) deco.visible = show;
    }
    composer.render();
  }
  const cv = renderer.domElement; cv.style.touchAction = 'pan-y'; cv.style.cursor = 'grab';
  cv.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; angle -= (e.clientX - lx) * 0.008; if (e.pointerType === 'mouse') elev = Math.min(1.15, Math.max(0.28, elev + (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; });
  const up = () => { drag = false; idle = performance.now(); cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  new ResizeObserver(size).observe(el);
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(el);
  size(); requestAnimationFrame(frame);
  return { set: (v) => { pending = v; }, turn: (a, e, z) => { angle = a; if (e) elev = e; if (z) zoom = z; idle = performance.now() + 1e9; } };
}

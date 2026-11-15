// Real 3D office for the price calculator. The room is built from the m² value,
// so it grows with every step of the slider. Drag to turn it.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

// ---------- small helpers ----------
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const woodTex = (base, planks) => canvasTex(512, (x, s) => {
  x.fillStyle = base; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * s, dark = Math.random() < 0.6;
    x.strokeStyle = dark ? `rgba(70,40,15,${0.03 + Math.random() * 0.09})` : `rgba(255,225,180,${0.03 + Math.random() * 0.07})`;
    x.lineWidth = 0.5 + Math.random() * 2.2; x.beginPath(); x.moveTo(0, y);
    x.bezierCurveTo(s * 0.3, y + (Math.random() - 0.5) * 9, s * 0.6, y + (Math.random() - 0.5) * 9, s, y + (Math.random() - 0.5) * 5); x.stroke();
  }
  if (planks) {
    const rows = 6, h = s / rows;
    for (let r = 0; r < rows; r++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '60,30,10' : '255,230,190'},${Math.random() * 0.1})`; x.fillRect(0, r * h, s, h);
      x.fillStyle = 'rgba(40,22,8,.55)'; x.fillRect(0, r * h, s, 1.5);
      const off = (r % 2 ? 0.35 : 0.8) * s; x.fillRect(off, r * h, 1.5, h);
    }
  }
});
const concreteTex = () => canvasTex(512, (x, s) => {
  x.fillStyle = '#c9ccd1'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const cx = Math.random() * s, cy = Math.random() * s, r = 30 + Math.random() * 110, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = Math.random() < 0.5 ? '255,255,255' : '90,95,105';
    g.addColorStop(0, `rgba(${c},${0.03 + Math.random() * 0.05})`); g.addColorStop(1, `rgba(${c},0)`);
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const d = x.getImageData(0, 0, s, s);
  for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  x.putImageData(d, 0, 0);
});
const screenTex = () => canvasTex(256, (x, s) => {
  x.fillStyle = '#0d1626'; x.fillRect(0, 0, s, s);
  x.fillStyle = '#1b2a47'; x.fillRect(0, 0, s, 22); x.fillRect(0, 22, 52, s);
  x.fillStyle = '#e9eef7'; x.fillRect(64, 36, 180, 130);
  for (let i = 0; i < 7; i++) { x.fillStyle = i % 3 ? '#9fb2d4' : '#3b82f6'; x.fillRect(74, 48 + i * 16, 60 + Math.random() * 100, 6); }
  x.fillStyle = '#3b82f6'; for (let i = 0; i < 8; i++) { const h = 12 + Math.random() * 50; x.fillRect(70 + i * 21, 240 - h, 13, h); }
  for (let i = 0; i < 6; i++) { x.fillStyle = '#31456e'; x.fillRect(8, 34 + i * 20, 36, 8); }
}, false);

const std = (color, rough = 0.7, metal = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.55, ...o });
let M = null;
function materials() {
  if (M) return M;
  const wood = woodTex('#cba577', false), plank = woodTex('#c49c6e', true), conc = concreteTex();
  M = {
    wall: std(0x4d5876, 0.92), cap: std(0x76819f, 0.85), base: std(0x414b68, 0.9),
    concrete: std(0xa3a6ad, 0.5, 0, { map: conc }), plank: std(0xe6d3bd, 0.5, 0, { map: plank }),
    wood: std(0xf0e0cc, 0.45, 0, { map: wood }), dark: std(0x2c3038, 0.6, 0.1), darker: std(0x1c1e24, 0.55, 0.15),
    cab: std(0x4a4d55, 0.6, 0.05), steel: std(0x8d929b, 0.35, 0.8), black: std(0x121317, 0.45, 0.2), fabric: std(0x1d1f25, 0.95),
    screen: std(0x05070c, 0.2, 0, { emissive: 0xffffff, emissiveMap: screenTex(), emissiveIntensity: 0.4 }),
    white: std(0xf1f2f4, 0.6), paper: std(0xfafafa, 0.9), navy: std(0x24345c, 0.8), grey: std(0x9a9fa8, 0.7),
    pot: std(0xe8e6e1, 0.5), potDark: std(0x3a3d45, 0.6), soil: std(0x2a2019, 1),
    leafA: std(0x39783f, 0.55), leafB: std(0x27592f, 0.55), leafC: std(0x4d8f4a, 0.55), stem: std(0x4d6b35, 0.8),
    leather: std(0x8a5636, 0.5), rug: std(0x2a3a63, 1), ceramic: std(0xffffff, 0.25),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfd9f2, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide }),
    pane: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 1.35, roughness: 0.4 }),
    blob: new THREE.MeshBasicMaterial({ map: canvasTex(128, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(0.55, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }, false), transparent: true, depthWrite: false, opacity: 0.75 }),
    board: std(0xf6f7f9, 0.3),
    blind: std(0xf4efe4, 0.9, 0, { emissive: 0xfff0d2, emissiveIntensity: 0.55 }),
  };
  return M;
}

const GEO = new Map();
const geo = (k, f) => { let g = GEO.get(k); if (!g) { g = f(); GEO.set(k, g); } return g; };
const mm = (v) => Math.round(v * 1000);
function put(g, geometry, m, x, y, z, shadow = true) {
  const b = new THREE.Mesh(geometry, m); b.position.set(x, y, z); b.castShadow = shadow; b.receiveShadow = true; g.add(b); return b;
}
// box with slightly rounded edges; y is the underside
const rbox = (g, m, w, h, d, x, y, z, r = 0.012, shadow = true) =>
  put(g, geo(`r${mm(w)}|${mm(h)}|${mm(d)}|${mm(r)}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01))), m, x, y + h / 2, z, shadow);
const box = (g, m, w, h, d, x, y, z, shadow = true) =>
  put(g, geo(`b${mm(w)}|${mm(h)}|${mm(d)}`, () => new THREE.BoxGeometry(w, h, d)), m, x, y + h / 2, z, shadow);
const cyl = (g, m, rt, rb, h, x, y, z, seg = 20) =>
  put(g, geo(`c${mm(rt)}|${mm(rb)}|${mm(h)}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), m, x, y + h / 2, z);
// soft dark patch on the floor under furniture (contact shadow)
const blob = (g, w, d, x = 0, z = 0) => { const b = put(g, geo('blob', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), M.blob, x, 0.016, z, false); b.scale.set(w, 1, d); b.receiveShadow = false; return b; };
const grp = (parent, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };

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
    mesh.castShadow = b.c; mesh.receiveShadow = true; mesh.userData.own = true; out.add(mesh);
  }
  return out;
}

// ---------- furniture ----------
function plant(g, x, z, s = 1, kind = 0) {
  const p = grp(g, x, 0, z, rnd() * 6); if (s > 0.6) blob(p, 0.95 * s, 0.95 * s);
  const potM = kind === 2 ? M.potDark : M.pot, ph = (kind === 1 ? 0.5 : 0.36) * s;
  cyl(p, potM, 0.2 * s, 0.15 * s, ph, 0, 0, 0, 24); cyl(p, M.soil, 0.185 * s, 0.185 * s, 0.02, 0, ph - 0.015, 0, 24);
  const n = kind === 1 ? 26 : 22, leafG = geo('leaf', () => new THREE.IcosahedronGeometry(1, 2));
  const top = ph + (kind === 1 ? 1.15 : 0.8) * s;
  cyl(p, M.stem, 0.014 * s, 0.022 * s, top - ph - 0.1 * s, 0, ph, 0, 6);
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + rnd() * 0.4, t = i / (n - 1), tilt = 0.15 + (1 - t) * 0.75 + rnd() * 0.25;
    const len = (kind === 1 ? 0.24 : 0.3) * s * (0.75 + rnd() * 0.5), y = ph + (0.12 + t * (top - ph - 0.12)) * 1;
    const h = new THREE.Group(); h.position.set(0, y, 0); h.rotation.order = 'YXZ'; h.rotation.y = a; h.rotation.x = -tilt; p.add(h);
    const l = new THREE.Mesh(leafG, pick([M.leafA, M.leafB, M.leafC])); l.scale.set(len * (kind === 1 ? 0.28 : 0.38), 0.012, len);
    l.position.set(0, 0, len * 1.05); l.rotation.x = 0.35; l.castShadow = true; l.receiveShadow = true; h.add(l);
    put(h, geo('twig', () => new THREE.CylinderGeometry(0.006, 0.006, 1, 5).rotateX(Math.PI / 2)), M.stem, 0, 0, len * 0.3).scale.set(s, s, len * 0.6);
  }
}
function chair(g, x, z, rot) {
  const c = grp(g, x, 0, z, rot); blob(c, 0.95, 0.95);
  for (let i = 0; i < 5; i++) {
    const l = grp(c, 0, 0, 0, i * Math.PI * 0.4);
    box(l, M.black, 0.045, 0.03, 0.3, 0, 0.06, 0.15); put(l, geo('caster', () => new THREE.SphereGeometry(0.032, 10, 8)), M.black, 0, 0.032, 0.29);
  }
  cyl(c, M.steel, 0.028, 0.028, 0.34, 0, 0.08, 0, 12); cyl(c, M.black, 0.09, 0.07, 0.05, 0, 0.39, 0, 14);
  rbox(c, M.fabric, 0.5, 0.09, 0.48, 0, 0.44, 0, 0.04);
  const b = grp(c, 0, 0.56, 0.23); b.rotation.x = 0.13;
  rbox(b, M.fabric, 0.46, 0.58, 0.07, 0, 0.02, 0, 0.033); box(b, M.black, 0.08, 0.2, 0.03, 0, -0.1, 0.03);
  for (const s of [-1, 1]) { box(c, M.black, 0.03, 0.2, 0.04, s * 0.27, 0.48, 0.04); rbox(c, M.black, 0.06, 0.03, 0.26, s * 0.27, 0.68, 0.02, 0.012); }
}
function monitor(g, x, z, ry) {
  const m = grp(g, x, 0.76, z, ry);
  rbox(m, M.black, 0.22, 0.014, 0.16, 0, 0, 0.02, 0.006); box(m, M.black, 0.035, 0.2, 0.02, 0, 0.012, -0.01);
  rbox(m, M.black, 0.62, 0.37, 0.022, 0, 0.12, 0.01, 0.008);
  put(m, geo('scr', () => new THREE.PlaneGeometry(0.595, 0.345)), M.screen, 0, 0.305, 0.0225, false);
}
// One workstation: desk 1.6 x 0.8, two monitors, chair on the +z side (before rotation)
function desk(g, x, z, rot) {
  const d = grp(g, x, 0, z, rot); blob(d, 2.1, 1.25);
  rbox(d, M.wood, 1.6, 0.04, 0.8, 0, 0.72, 0, 0.012);
  for (const s of [-1, 1]) box(d, M.dark, 0.04, 0.72, 0.72, s * 0.76, 0, 0);
  box(d, M.dark, 1.48, 0.36, 0.02, 0, 0.32, -0.34);
  rbox(d, M.cab, 0.42, 0.58, 0.6, 0.5, 0.06, 0.03, 0.01);
  for (const y of [0.2, 0.37, 0.54]) { box(d, M.darker, 0.4, 0.004, 0.004, 0.5, y - 0.07, 0.332, false); box(d, M.steel, 0.14, 0.012, 0.014, 0.5, y, 0.336, false); }
  monitor(d, -0.47, -0.2, 0.2); monitor(d, 0.17, -0.2, -0.2);
  rbox(d, M.darker, 0.42, 0.016, 0.135, -0.15, 0.76, 0.14, 0.006); rbox(d, M.darker, 0.06, 0.025, 0.1, 0.17, 0.76, 0.15, 0.012);
  const pg = grp(d, 0.55, 0.76, 0.1, (rnd() - 0.5) * 0.6); box(pg, M.paper, 0.21, 0.01, 0.297, 0, 0, 0, false);
  const extra = rnd();
  if (extra < 0.3) { const s = grp(d, 0.62, 0.76, -0.24); cyl(s, M.pot, 0.06, 0.045, 0.09, 0, 0, 0, 12); for (let i = 0; i < 6; i++) { const l = put(s, geo('leaf', () => new THREE.IcosahedronGeometry(1, 2)), pick([M.leafA, M.leafC]), Math.cos(i) * 0.04, 0.14, Math.sin(i) * 0.04); l.scale.set(0.035, 0.07, 0.035); } }
  else if (extra < 0.6) { cyl(d, pick([M.ceramic, M.navy]), 0.04, 0.035, 0.09, -0.62, 0.76, 0.12, 14); }
  else if (extra < 0.8) { // desk lamp
    const l = grp(d, -0.68, 0.76, -0.26, 0.6); cyl(l, M.black, 0.07, 0.07, 0.015, 0, 0, 0, 16); box(l, M.black, 0.015, 0.36, 0.015, 0, 0.01, 0);
    const a = grp(l, 0, 0.37, 0); a.rotation.z = -1.1; box(a, M.black, 0.015, 0.28, 0.015, 0, 0, 0); cyl(l, M.black, 0.05, 0.075, 0.07, 0.25, 0.44, 0, 14);
  }
  chair(d, -0.12 + (rnd() - 0.5) * 0.2, 0.78 + rnd() * 0.12, (rnd() - 0.5) * 0.7);
}
function binders(g, x0, x1, y, z) {
  let x = x0 + 0.04;
  while (x < x1 - 0.1) {
    if (rnd() < 0.18) { x += 0.1 + rnd() * 0.15; continue; }
    const w = 0.055 + rnd() * 0.03, h = 0.27 + rnd() * 0.05;
    rbox(g, pick([M.white, M.white, M.grey, M.navy, M.darker, M.paper]), w, h, 0.24, x + w / 2, y, z, 0.004); x += w + 0.006;
  }
}
function shelf(g, x, z, W, ry = 0) { // open shelf, centred at x, back against the wall
  const s = grp(g, x, 0, z, ry), n = Math.max(1, Math.round(W / 0.85)), cw = W / n; blob(s, W + 0.5, 0.9, 0, 0.1);
  for (let i = 0; i <= n; i++) box(s, M.dark, 0.03, 1.9, 0.34, -W / 2 + i * cw, 0, 0);
  [0.04, 0.5, 0.95, 1.4, 1.87].forEach((y, r) => {
    rbox(s, M.wood, W + 0.03, 0.03, 0.36, 0, y, 0, 0.006);
    if (r < 4) for (let i = 0; i < n; i++) {
      const a = -W / 2 + i * cw + 0.03, b = a + cw - 0.03, k = rnd();
      if (k < 0.62) binders(s, a, b, y + 0.03, 0);
      else if (k < 0.8) { rbox(s, pick([M.grey, M.navy, M.white]), 0.34, 0.2, 0.26, (a + b) / 2, y + 0.03, 0, 0.01); }
      else { const p = grp(s, (a + b) / 2, y + 0.03, 0); p.scale.setScalar(0.38); plant(p, 0, 0, 1, 0); }
    }
  });
}
function cabinet(g, x, z, ry = 0) { // tall cupboard 0.9 wide
  const c = grp(g, x, 0, z, ry); blob(c, 1.3, 1.0, 0, 0.1); rbox(c, M.cab, 0.9, 2.0, 0.45, 0, 0, 0, 0.012);
  box(c, M.darker, 0.006, 1.94, 0.004, 0, 0.03, 0.226, false);
  for (const s of [-1, 1]) box(c, M.steel, 0.012, 0.22, 0.016, s * 0.05, 0.95, 0.232, false);
}
function coffee(g, x, y, z, ry = 0) {
  const c = grp(g, x, y, z, ry); rbox(c, M.darker, 0.26, 0.36, 0.32, 0, 0, 0, 0.02); box(c, M.steel, 0.2, 0.02, 0.14, 0, 0.1, 0.13); cyl(c, M.ceramic, 0.03, 0.025, 0.06, 0, 0.12, 0.13, 12);
}
function sideboard(g, x, z, W, ry = 0) {
  const s = grp(g, x, 0, z, ry); blob(s, W + 0.45, 1.0, 0, 0.1); rbox(s, M.cab, W, 0.86, 0.5, 0, 0, 0, 0.01); rbox(s, M.wood, W + 0.04, 0.035, 0.54, 0, 0.86, 0, 0.008);
  const n = Math.round(W / 0.5); for (let i = 1; i < n; i++) box(s, M.darker, 0.005, 0.8, 0.004, -W / 2 + i * (W / n), 0.03, 0.252, false);
  coffee(s, -W / 2 + 0.3, 0.895, 0);
  for (let i = 0; i < 4; i++) cyl(s, pick([M.ceramic, M.navy]), 0.035, 0.03, 0.08, -W / 2 + 0.62 + i * 0.1, 0.895, 0.08 - (i % 2) * 0.12, 12);
  if (W > 1.3) { const p = grp(s, W / 2 - 0.25, 0.895, 0); p.scale.setScalar(0.45); plant(p, 0, 0, 1, 0); }
}

// One wall, built along local x with the room side at +z
function wall(L, H, T, windows) {
  const g = new THREE.Group(), m = { wall: M.wall.clone(), cap: M.cap.clone(), pane: M.pane.clone(), blind: M.blind.clone(), frame: M.darker.clone(), blob: M.blob.clone() };
  box(g, m.cap, L, 0.02, T, 0, H, 0, false);
  const ao = put(g, geo('blob', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), m.blob, 0, 0.014, T / 2 + 0.1, false); ao.scale.set(L + 1, 1, 0.9); ao.receiveShadow = false;
  if (!windows) box(g, m.wall, L, H, T, 0, 0, 0);
  else {
    const sill = 0.25, top = H - 0.2, end = 0.3, pier = 0.16, n = Math.max(1, Math.floor((L - end * 2 + pier) / 1.6)), ww = (L - end * 2 - (n - 1) * pier) / n;
    box(g, m.wall, L, sill, T, 0, 0, 0); box(g, m.wall, L, H - top, T, 0, top, 0);
    box(g, m.wall, end, top - sill, T, -L / 2 + end / 2, sill, 0); box(g, m.wall, end, top - sill, T, L / 2 - end / 2, sill, 0);
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + end + i * (ww + pier) + ww / 2;
      if (i) box(g, m.wall, pier, top - sill, T, x - ww / 2 - pier / 2, sill, 0);
      box(g, m.pane, ww, top - sill, 0.02, x, sill, -T * 0.2, false);
      { const bh = 0.3 + rnd() * 0.45; box(g, m.blind, ww - 0.04, bh, 0.03, x, top - bh, 0, false); }
      box(g, m.frame, 0.035, top - sill, 0.05, x, sill, 0, false); box(g, m.frame, ww, 0.035, 0.05, x, sill, 0, false); box(g, m.frame, ww, 0.035, 0.05, x, top - 0.035, 0, false);
      rbox(g, m.wall, ww + 0.06, 0.03, T + 0.1, x, sill - 0.03, 0.05, 0.008);
    }
  }
  const out = fuse(g); out.userData.mats = Object.values(m); return out;
}

function build(m2) {
  materials(); seed = 7;
  const root = new THREE.Group(), g = new THREE.Group();
  const A = m2 * 0.6, w = Math.sqrt(A * 1.5), d = A / w, H = 2.7, T = 0.28, x0 = -w / 2, z0 = -d / 2;
  root.userData = { w, d };

  // floor and plinth
  const big = m2 >= 110, huge = m2 >= 220, strip = big ? Math.min(5.4, w * 0.36) : (m2 >= 60 ? 1.5 : 0), deskW = w - strip;
  M.concrete.map.repeat.set(w / 3.2, d / 3.2); M.plank.map.repeat.set(1, 1);
  box(root, M.base, w + T * 2, 0.3, d + T * 2, 0, -0.3, 0).userData.keep = true;
  box(root, M.concrete, deskW, 0.02, d, x0 + deskW / 2, -0.01, 0, false);
  if (strip) { const f = put(root, new THREE.BoxGeometry(strip, 0.02, d), M.plank, x0 + deskW + strip / 2, 0, 0, false); f.userData.own = true; const uv = f.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * strip / 1.4, uv.getY(i) * d / 1.4); }

  // four walls; the ones between camera and room are hidden while turning
  root.userData.walls = [
    [wall(w + T * 2, H, T, false), 0, z0 - T / 2, 0, 0, -1], [wall(d, H, T, true), x0 - T / 2, 0, Math.PI / 2, -1, 0],
    [wall(d, H, T, false), -x0 + T / 2, 0, -Math.PI / 2, 1, 0], [wall(w + T * 2, H, T, false), 0, -z0 + T / 2, Math.PI, 0, 1],
  ].map(([wl, x, z, ry, nx, nz]) => { wl.position.set(x, 0, z); wl.rotation.y = ry; if (nx > 0 || nz > 0) wl.traverse((o) => { o.castShadow = false; }); root.add(wl); return { wl, nx, nz }; });

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
    if (want - placed === 1 || single) { desk(g, cx, cz - 0.35, 0); placed += 1; }
    else { desk(g, cx, cz - 0.41, Math.PI); desk(g, cx, cz + 0.41, 0); placed += 2; }
    if (c < cols - 1 && gapX + cellX - 1.6 > 0.75 && rnd() < 0.7) plant(g, cx + cellX / 2 + gapX / 2, cz + (rnd() - 0.5) * 0.6, 0.75, pick([0, 2]));
  }

  // back wall: shelf, cupboards, coffee corner
  const bz = z0 + 0.2; let bx = x0 + deskW - 0.25; const left = x0 + 1.1;
  if (!big && strip) { sideboard(g, x0 + w - 0.8, z0 + 0.3, 1.3); cabinet(g, x0 + deskW - 0.2, z0 + 0.26); bx = x0 + deskW - 0.9; }
  if (bx - left > 4.2) { cabinet(g, bx - 0.45, z0 + 0.26); cabinet(g, bx - 1.37, z0 + 0.26); bx -= 2.0; }
  const sw = Math.min(big ? 3.4 : 2.55, bx - left - 0.2);
  if (sw > 0.8) { shelf(g, bx - sw / 2, bz, sw); bx -= sw + 0.2; }
  if (bx - left > 2.4) { const bw = Math.min(2.0, bx - left - 0.6), cx = (bx + left) / 2 + 0.3; rbox(g, M.steel, bw + 0.05, 1.0, 0.03, cx, 0.95, z0 + 0.015, 0.008, false); rbox(g, M.board, bw, 0.95, 0.03, cx, 0.975, z0 + 0.022, 0.006, false); }
  plant(g, x0 + 0.5, z0 + 0.5, 1.15, 1);
  if (bx - left > 1.2) plant(g, bx - 0.5, z0 + 0.45, 1, 0);
  if (m2 >= 45) plant(g, x0 + 0.5, -z0 - 0.5, 1, 0);
  if (m2 >= 160) plant(g, x0 + 0.5, 0, 1.1, 2);

  if (big) {
    const sx = x0 + deskW, mD = Math.min(4.4, d * 0.48), gh = 2.2, zc = z0 + mD; // glass meeting room, back right
    const door = 1.0, gl = strip - door;
    box(g, M.glass, 0.02, gh, mD, sx, 0, z0 + mD / 2, false); box(g, M.glass, gl, gh, 0.02, sx + door + gl / 2, 0, zc, false);
    for (const [fx, fz, fw, fd] of [[sx, z0 + mD / 2, 0.05, mD], [sx + strip / 2, zc, strip, 0.05]]) box(g, M.darker, fw, 0.05, fd, fx, gh, fz, false);
    for (const [fx, fz, fw, fd] of [[sx, z0 + mD / 2, 0.05, mD], [sx + door + gl / 2, zc, gl, 0.05]]) box(g, M.darker, fw, 0.04, fd, fx, 0, fz, false);
    for (let z = z0 + 1.2; z < zc - 0.3; z += 1.2) box(g, M.darker, 0.04, gh, 0.04, sx, 0, z, false);
    for (const x of [sx, sx + door, sx + door + gl / 2]) box(g, M.darker, 0.05, gh, 0.05, x, 0, zc, false);
    const tx = sx + strip / 2 + 0.1, tz = z0 + mD / 2, tl = Math.min(2.8, mD - 1.7);
    blob(g, 2.9, tl + 1.0, tx, tz); rbox(g, M.wood, 1.15, 0.045, tl, tx, 0.71, tz, 0.012); for (const s of [-1, 1]) box(g, M.darker, 0.6, 0.71, 0.06, tx, 0, tz + s * (tl / 2 - 0.35));
    const n = Math.max(2, Math.floor(tl / 0.72));
    for (let i = 0; i < n; i++) { const z = tz - tl / 2 + (i + 0.5) * (tl / n); chair(g, tx - 0.95, z, -Math.PI / 2 + (rnd() - 0.5) * 0.3); chair(g, tx + 0.95, z, Math.PI / 2 + (rnd() - 0.5) * 0.3); }
    rbox(g, M.black, 1.5, 0.85, 0.04, tx, 1.0, z0 + 0.04, 0.01); plant(g, sx + strip - 0.45, zc - 0.5, 1.05, 2);
    const p2 = grp(g, tx, 0.755, tz); p2.scale.setScalar(0.4); plant(p2, 0, 0, 1, 0);
    // coffee corner at the front right
    const kw = Math.min(2.6, strip - 1.4); sideboard(g, sx + strip - 0.32, -z0 - 0.5 - kw / 2, kw, -Math.PI / 2);
    if (huge) { // lounge between meeting room and kitchen
      const lz = zc + (d - mD) * 0.36, lx = sx + strip / 2 - 0.2;
      rbox(g, M.rug, 3.2, 0.015, 2.5, lx, 0.01, lz, 0.006, false);
      const so = grp(g, lx - 1.15, 0, lz, Math.PI / 2); blob(so, 2.5, 1.4).position.y = 0.03;
      rbox(so, M.leather, 1.9, 0.26, 0.85, 0, 0.14, 0, 0.05); rbox(so, M.leather, 1.9, 0.5, 0.22, 0, 0.3, -0.33, 0.07);
      for (const s of [-1, 1]) { rbox(so, M.leather, 0.2, 0.5, 0.85, s * 0.95, 0.14, 0, 0.06); rbox(so, M.leather, 0.72, 0.14, 0.6, s * 0.4, 0.38, 0.08, 0.05); box(so, M.darker, 0.04, 0.14, 0.04, s * 0.9, 0, 0.3); box(so, M.darker, 0.04, 0.14, 0.04, s * 0.9, 0, -0.3); }
      for (const s of [-1, 1]) { const ac = grp(g, lx + 0.9, 0, lz + s * 0.65, -Math.PI / 2 - s * 0.35); rbox(ac, M.leather, 0.75, 0.26, 0.75, 0, 0.14, 0, 0.05); rbox(ac, M.leather, 0.75, 0.45, 0.18, 0, 0.3, -0.3, 0.06); for (const t of [-1, 1]) rbox(ac, M.leather, 0.14, 0.4, 0.7, t * 0.37, 0.14, 0, 0.05); }
      cyl(g, M.wood, 0.42, 0.42, 0.035, lx - 0.1, 0.36, lz, 32); cyl(g, M.darker, 0.03, 0.03, 0.36, lx - 0.1, 0, lz, 10); cyl(g, M.darker, 0.22, 0.22, 0.015, lx - 0.1, 0, lz, 24);
      plant(g, lx - 1.15, lz + 1.5, 1.1, 1);
    }
  }
  const fused = fuse(g); root.add(fused);
  root.traverse((o) => { if (o.isMesh && o.material === M.glass) o.renderOrder = 3; if (o.isMesh && o.material.map && o.material.isMeshBasicMaterial) o.renderOrder = 1; });
  return root;
}

export function mountOffice(el, m2) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(20, 16 / 9, 1, 200);
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x3a4360, 0.85));
  const fill = new THREE.DirectionalLight(0xe6ecff, 1.0); fill.position.set(10, 9, 12); scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffe9c8, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5; scene.add(sun); scene.add(sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; scene.add(ground);

  let office = null, dist = 34, distT = 34, angle = Math.PI / 4, elev = 0.55, target = 1, shown = 0.7, drag = false, lx = 0, ly = 0, idle = 0, visible = true;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function set(v) {
    if (office) { scene.remove(office); office.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); office.userData.walls.forEach((x) => x.wl.userData.mats.forEach((m) => m.dispose())); }
    office = build(v); office.scale.setScalar(shown); scene.add(office); target = 1; distT = 9.4 + 1.8 * Math.sqrt(v);
    const { w, d } = office.userData, h = Math.hypot(w, d) / 2 + 3, c = sun.shadow.camera;
    sun.position.set(-30, 12.5, 5); sun.target.position.set(0, 0, 0);
    c.left = -h; c.right = h; c.top = h; c.bottom = -h; c.near = 1; c.far = 90; c.updateProjectionMatrix();
  }
  function size() {
    const w = el.clientWidth, h = el.clientHeight || w * 9 / 16;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !office) return;
    if (!drag && !still && performance.now() - idle > 2500) angle += 0.0016;
    shown += (target - shown) * 0.12; office.scale.setScalar(shown);
    dist += (distT - dist) * 0.1; // the camera backs off slower than the room grows, so a big office fills more of the frame
    const sx = Math.sin(angle), cz = Math.cos(angle);
    cam.position.set(sx * Math.cos(elev) * dist, Math.sin(elev) * dist + 0.7, cz * Math.cos(elev) * dist);
    cam.lookAt(0, 0.7, 0);
    for (const { wl, nx, nz } of office.userData.walls) { const show = nx * sx + nz * cz < 0.12; wl.userData.mats.forEach((m) => { m.colorWrite = show; m.depthWrite = show; }); }
    renderer.render(scene, cam);
  }
  const cv = renderer.domElement; cv.style.touchAction = 'pan-y'; cv.style.cursor = 'grab';
  cv.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; angle -= (e.clientX - lx) * 0.008; if (e.pointerType === 'mouse') elev = Math.min(1.15, Math.max(0.28, elev + (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; });
  const up = () => { drag = false; idle = performance.now(); cv.style.cursor = 'grab'; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  new ResizeObserver(size).observe(el);
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(el);
  size(); set(m2); frame();
  return { set, turn: (a) => { angle = a; idle = performance.now() + 1e9; } };
}

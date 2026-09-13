/* ============================================================
   CHESSFORK — procedural chess pieces
   Lathe profiles + extruded knight. Lacquered obsidian with
   gold inlay so the black pieces read as objects, not icons.
   ============================================================ */
import * as THREE from 'three';
import { ACCENT } from '../config.js';

const geoCache = new Map();

function lathe(pts, key, segments = 48) {
  const k = key + segments;
  if (!geoCache.has(k)) {
    const v2 = pts.map(p => new THREE.Vector2(p[0], p[1]));
    geoCache.set(k, new THREE.LatheGeometry(v2, segments));
  }
  return geoCache.get(k);
}

function pawnGeo() {
  // base -> collar -> spherical head
  const p = [
    [0.0, 0.0], [0.56, 0.0], [0.60, 0.05], [0.585, 0.12],
    [0.44, 0.17], [0.40, 0.22], [0.31, 0.52], [0.27, 0.80],
    [0.30, 0.90], [0.365, 0.95], [0.365, 1.02], [0.33, 1.07],
  ];
  const headR = 0.40, headY = 1.44;
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.96;
    p.push([Math.max(0.001, headR * Math.sin(a)), headY + headR * Math.cos(a)]);
  }
  return lathe(p, 'pawn');
}

function rookGeo() {
  const p = [
    [0.0, 0.0], [0.62, 0.0], [0.66, 0.06], [0.60, 0.14],
    [0.46, 0.20], [0.42, 0.30], [0.40, 1.05], [0.46, 1.15],
    [0.56, 1.18], [0.58, 1.26], [0.58, 1.52], [0.0, 1.52],
  ];
  return lathe(p, 'rook');
}

function bishopGeo() {
  const p = [
    [0.0, 0.0], [0.56, 0.0], [0.60, 0.05], [0.55, 0.13],
    [0.40, 0.18], [0.30, 0.46], [0.26, 0.90], [0.32, 1.06],
    [0.36, 1.12], [0.30, 1.18], [0.20, 1.34], [0.115, 1.52],
    [0.06, 1.62], [0.0, 1.70],
  ];
  return lathe(p, 'bishop');
}

function queenGeo() {
  const p = [
    [0.0, 0.0], [0.62, 0.0], [0.66, 0.06], [0.58, 0.16],
    [0.42, 0.22], [0.32, 0.55], [0.28, 1.05], [0.34, 1.28],
    [0.40, 1.34], [0.34, 1.42], [0.22, 1.55], [0.16, 1.68],
    [0.10, 1.74], [0.0, 1.78],
  ];
  return lathe(p, 'queen');
}

function kingGeo() {
  const p = [
    [0.0, 0.0], [0.64, 0.0], [0.68, 0.06], [0.60, 0.16],
    [0.44, 0.22], [0.33, 0.55], [0.29, 1.02], [0.36, 1.26],
    [0.42, 1.32], [0.36, 1.42], [0.24, 1.55], [0.18, 1.66],
    [0.16, 1.72], [0.0, 1.74],
  ];
  return lathe(p, 'king');
}

function knightGeo() {
  // side-profile silhouette, extruded
  if (!geoCache.has('knight')) {
    const s = new THREE.Shape();
    s.moveTo(-0.52, 0.0);
    s.lineTo(0.52, 0.0);
    s.lineTo(0.48, 0.22);
    s.bezierCurveTo(0.46, 0.55, 0.40, 0.85, 0.30, 1.10);
    s.bezierCurveTo(0.45, 1.22, 0.50, 1.38, 0.44, 1.55);   // muzzle out
    s.lineTo(0.18, 1.72);                                   // nose top
    s.bezierCurveTo(0.05, 1.86, -0.05, 1.90, -0.12, 1.98);  // forelock
    s.lineTo(-0.28, 1.84);                                  // ear front
    s.lineTo(-0.30, 1.62);
    s.bezierCurveTo(-0.42, 1.30, -0.52, 0.90, -0.50, 0.40); // mane sweep
    s.lineTo(-0.52, 0.0);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.42, bevelEnabled: true, bevelThickness: 0.09,
      bevelSize: 0.07, bevelSegments: 3, curveSegments: 14,
    });
    g.center();
    g.translate(0, 1.0, 0);
    geoCache.set('knight', g);
  }
  return geoCache.get('knight');
}

const GEO = { pawn: pawnGeo, rook: rookGeo, bishop: bishopGeo, queen: queenGeo, king: kingGeo, knight: knightGeo };

export function pieceGeometry(type) { return GEO[type](); }

/* ---------- materials ---------- */

export function obsidianMat() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c,
    roughness: 0.24,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.5,
    transparent: true,
  });
}

export function goldMat() {
  return new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.55,
    metalness: 1.0,
    roughness: 0.3,
    transparent: true,
  });
}

/* A full piece: body + gold inlay ring + bump decorations */
export function createPiece(type, { gold = false } = {}) {
  const group = new THREE.Group();
  group.name = 'piece-' + type;

  const body = new THREE.Mesh(GEO[type](), gold ? goldMat() : obsidianMat());
  body.name = 'body';
  group.add(body);

  if (type === 'rook') {                                   // battlements
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.2, 0.17),
        gold ? goldMat() : obsidianMat()
      );
      c.position.set(Math.cos(a) * 0.45, 1.6, Math.sin(a) * 0.45);
      group.add(c);
    }
  }
  if (type === 'king') {                                   // cross
    const m = gold ? goldMat() : obsidianMat();
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.055), m);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.055), m);
    v.position.y = 1.92; h.position.y = 1.95;
    group.add(v, h);
  }
  if (type === 'queen') {                                  // coronet
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12),
      gold ? goldMat() : obsidianMat());
    orb.position.y = 1.9;
    group.add(orb);
  }
  // gold inlay ring at the base — the ChessFork signature
  const inlay = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.018, 8, 48),
    goldMat()
  );
  inlay.rotation.x = Math.PI / 2;
  inlay.position.y = 0.09;
  group.add(inlay);

  group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return group;
}

/* Soft fake contact shadow — radial gradient disc */
let shadowTex = null;
export function contactShadow(radius = 1.6, opacity = 0.55) {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* helpers to fade whole groups of materials in/out */
export function collectMats(group) {
  const mats = [];
  group.traverse(o => { if (o.isMesh && o.material) mats.push(o.material); });
  return mats;
}

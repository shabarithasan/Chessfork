/* ============================================================
   CHESSFORK — atmosphere & moment FX
   dust field, impact burst, shockwave ring, glowing move-paths,
   arena rings, rising embers, lens flare sprite, pawn swarm.
   ============================================================ */
import * as THREE from 'three';
import { ACCENT, QUALITY } from '../config.js';

/* ---------------- floating dust (mouse-reactive) ---------------- */
export function createDust() {
  const n = QUALITY.dust;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 260;
    pos[i * 3 + 1] = Math.random() * 90 - 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 260;
    seed[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uExcite: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uExcite;
      uniform vec2 uMouse;
      varying float vA;
      void main() {
        vec3 p = position;
        float t = uTime * (0.16 + fract(aSeed) * 0.2) * (1.0 + uExcite * 2.0);
        p.x += sin(t + aSeed) * 6.0 + uMouse.x * (2.0 + fract(aSeed * 7.0) * 6.0);
        p.y += sin(t * 0.7 + aSeed * 2.0) * 3.0;
        p.z += cos(t * 0.85 + aSeed) * 6.0 + uMouse.y * 3.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        gl_PointSize = (1.0 + fract(aSeed * 13.7) * 2.2) * (140.0 / max(d, 1.0));
        vA = smoothstep(280.0, 60.0, d) * 0.5;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r) * vA;
        gl_FragColor = vec4(0.85, 0.82, 0.72, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, u: mat.uniforms };
}

/* ---------------- impact particle burst ---------------- */
export function createBurst(origin = new THREE.Vector3()) {
  const n = QUALITY.burst;
  const dir = new Float32Array(n * 3);
  const spd = new Float32Array(n);
  const size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // disc-shaped explosion with slight upward bias
    const a = Math.random() * Math.PI * 2;
    const up = Math.random() * 0.55;
    const r = Math.sqrt(1 - up * up);
    dir[i * 3] = Math.cos(a) * r;
    dir[i * 3 + 1] = up + 0.08;
    dir[i * 3 + 2] = Math.sin(a) * r;
    spd[i] = 14 + Math.random() * 55;
    size[i] = 0.5 + Math.random() * 2.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uP: { value: 1 },                     // 0..1 explosion progress (1 = rest)
      uOrigin: { value: origin },
      uColor: { value: new THREE.Color(ACCENT) },
    },
    vertexShader: /* glsl */`
      attribute vec3 aDir;
      attribute float aSpd, aSize;
      uniform float uP;
      uniform vec3 uOrigin;
      varying float vA;
      void main() {
        float t = uP;
        vec3 p = uOrigin + aDir * (aSpd * t) ;
        p.y -= 14.0 * t * t;                          // gravity sag
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        gl_PointSize = aSize * (1.0 - t * 0.7) * (180.0 / max(d, 1.0));
        vA = (1.0 - t) * (1.0 - t) * smoothstep(400.0, 40.0, d);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        gl_FragColor = vec4(mix(vec3(1.0, 0.98, 0.92), uColor, 0.6), smoothstep(0.5, 0.0, r) * vA);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    u: mat.uniforms,
    fire(at) { if (at) mat.uniforms.uOrigin.value.copy(at); mat.uniforms.uP.value = 0; },
  };
}

/* ---------------- shockwave ring across the board ---------------- */
export function createShockwave() {
  const geo = new THREE.RingGeometry(0.94, 1.0, 160);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff2d8, transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.25;
  ring.renderOrder = 4;
  ring.visible = false;
  return { ring, mat };
}

/* ---------------- glowing move-path lines ---------------- */
export function createMoveLines(count, seed = 7, golden = false) {
  const rng = mulberry(seed);
  const group = new THREE.Group();
  group.visible = false;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const from = new THREE.Vector3((rng() - 0.5) * 90, 2 + rng() * 26, (rng() - 0.5) * 90);
    const to = new THREE.Vector3((rng() - 0.5) * 90, 2 + rng() * 26, (rng() - 0.5) * 90);
    const mid1 = from.clone().lerp(to, 0.33).add(new THREE.Vector3(0, 6 + rng() * 10, 0));
    const mid2 = from.clone().lerp(to, 0.66).add(new THREE.Vector3(0, 6 + rng() * 10, 0));
    const curve = new THREE.CatmullRomCurve3([from, mid1, mid2, to]);
    const pts = curve.getPoints(40);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: golden && i === 0 ? ACCENT : 0x8f8f9a,
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    lines.push({ line, mat });
  }
  return { group, lines };
}

/* ---------------- arena: rotating holo rings + wayline arcs ---------------- */
export function createArena() {
  const group = new THREE.Group();
  group.visible = false;
  const rings = [];
  const mk = (r, y, tube, op) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, tube, 8, 160),
      new THREE.MeshBasicMaterial({
        color: ACCENT, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    group.add(m);
    rings.push({ m, target: op });
  };
  mk(24, 0.6, 0.05, 0.7);
  mk(38, 1.4, 0.04, 0.5);
  mk(56, 3.0, 0.05, 0.35);
  mk(80, 8.0, 0.06, 0.22);
  // vertical great-circle arcs (like longitude lines on a globe)
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(46, 0.035, 6, 120, Math.PI * 1.25),
      new THREE.MeshBasicMaterial({
        color: 0xb6b6c2, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    m.rotation.z = (i / 5) * Math.PI * 2;
    m.rotation.y = Math.PI / 2;
    group.add(m);
    rings.push({ m, target: 0.16 });
  }
  return { group, rings };
}

/* ---------------- rising embers (arena / finale) ---------------- */
export function createEmbers() {
  const n = QUALITY.embers;
  const pos = new Float32Array(n * 3);
  const sd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 70;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 60;
    pos[i * 3 + 2] = Math.sin(a) * r;
    sd[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (2.0 + fract(aSeed) * 3.0) + aSeed * 7.0, 60.0);
        p.x += sin(uTime * 0.6 + aSeed) * 2.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.4 + fract(aSeed * 3.3) * 2.0) * (120.0 / max(-mv.z, 1.0));
        vA = smoothstep(0.0, 12.0, p.y) * smoothstep(60.0, 30.0, p.y);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uOn;
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        gl_FragColor = vec4(0.92, 0.74, 0.42, smoothstep(0.5, 0.0, r) * vA * 0.8 * uOn);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  return { points, u: mat.uniforms };
}

/* ---------------- soft lens flare sprite ---------------- */
export function createFlare() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,244,220,1)');
  g.addColorStop(0.25, 'rgba(238,205,140,0.55)');
  g.addColorStop(0.6, 'rgba(200,160,90,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // anamorphic streak
  const g2 = ctx.createLinearGradient(0, 128, 256, 128);
  g2.addColorStop(0, 'rgba(0,0,0,0)');
  g2.addColorStop(0.5, 'rgba(255,240,210,0.5)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 120, 256, 16);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(30);
  sprite.renderOrder = 9;
  return { sprite, mat };
}

/* ---------------- mastery: the swarm of a thousand pawns ---------------- */
export function createPawnSwarm(pawnGeometry) {
  const n = 700;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0b0b0e, roughness: 0.4, metalness: 0.1,
    transparent: true, opacity: 0,
  });
  const inst = new THREE.InstancedMesh(pawnGeometry, mat, n);
  inst.visible = false;
  inst.frustumCulled = false;
  const M = new THREE.Matrix4();
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(2.6, 2.6, 2.6);
  const rng = mulberry(42);
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const r = 55 + rng() * 220;
    P.set(Math.cos(a) * r, -0.2, Math.sin(a) * r);
    Q.setFromEuler(new THREE.Euler(0, rng() * Math.PI * 2, 0));
    M.compose(P, Q, S);
    inst.setMatrixAt(i, M);
  }
  inst.instanceMatrix.needsUpdate = true;
  return { inst, mat };
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

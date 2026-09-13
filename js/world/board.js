/* ============================================================
   CHESSFORK — the board: an enormous shader plane that can
   reveal itself radially, ripple with footsteps, boost its
   grid for the finale, and FOLD INWARD for the collapse.
   Plus an InstancedMesh of 64 physical squares for CHAOS.
   ============================================================ */
import * as THREE from 'three';
import { ACCENT } from '../config.js';

const SQ = 10;             // world units per square
const EXTENT = 620;        // shader plane size (the "infinite" world)
const SEGS = 120;          // segments for the fold deformation

const vertex = /* glsl */`
  varying vec3 vW;
  uniform float uFold;
  uniform float uTime;
  void main() {
    vec3 p = position;
    float d = length(p.xz);
    // collapse: the world pinches to the center and peels upward
    float fd = smoothstep(0.0, ${(EXTENT / 2).toFixed(1)}, d);
    p.xz *= mix(1.0, 0.03, uFold * fd);
    p.y  += uFold * fd * fd * 190.0;
    vW = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
  }`;

const fragment = /* glsl */`
  precision highp float;
  varying vec3 vW;
  uniform float uReveal;      // 0..1 radial reveal of the 8x8 field
  uniform float uGrid;        // faint infinite grid intensity
  uniform float uFadeOut;     // board dissolves (arena / collapse)
  uniform float uRippleR;     // ripple ring radius
  uniform float uRippleA;     // ripple amplitude
  uniform vec2  uRippleC;     // ripple center in world xz
  uniform vec3  uAccent;

  float gridLine(vec2 uv) {
    vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
    return 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);
  }

  void main() {
    vec2 bp = vW.xz / ${SQ.toFixed(1)};
    vec2 bi = floor(bp + 4.0) - 4.0;          // board coords -4..3

    float inB = step(-4.0, bi.x) * step(bi.x, 3.99)
              * step(-4.0, bi.y) * step(bi.y, 3.99);

    float chk = mod(bi.x + bi.y, 2.0);
    vec3 square = mix(vec3(0.016, 0.016, 0.020), vec3(0.085, 0.082, 0.078), chk);

    // radial reveal from the pawn's impact point
    float d = length(vW.xz);
    float rev = 1.0 - smoothstep(uReveal * 130.0 - 34.0, uReveal * 130.0, d);
    rev = clamp(rev, 0.0, 1.0);

    // board boundary glow
    float edge = inB * (1.0 - step(abs(d - 56.6), 2.2));
    float border = (1.0 - smoothstep(0.0, 0.35, abs(max(abs(bi.x + 4.0) , abs(bi.y + 4.0)) * 0.0 + (max(abs(vW.x), abs(vW.z)) - 40.0))));
    border = clamp(border, 0.0, 1.0);

    vec3 col = vec3(0.004);
    col += square * inB * rev;

    // checker border lines within the board
    float gl = gridLine(bp);
    col += uAccent * gl * inB * rev * 0.12;

    // golden rim at the board edge
    float rim = 1.0 - smoothstep(0.0, 0.9, abs(max(abs(vW.x), abs(vW.z)) - 40.0));
    col += uAccent * rim * rev * 0.5;

    // infinite world grid beyond the board
    col += uAccent * gridLine(bp) * (1.0 - inB) * uGrid;

    // footstep ripple
    float rr = distance(vW.xz, uRippleC);
    float ring = exp(-pow((rr - uRippleR) * 0.5, 2.0));
    col += uAccent * ring * uRippleA * (0.35 + inB * 0.65);

    col *= (1.0 - uFadeOut);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createBoard() {
  const uniforms = {
    uReveal:  { value: 0 },
    uGrid:    { value: 0.05 },
    uFadeOut: { value: 0 },
    uRippleR: { value: 0 },
    uRippleA: { value: 0 },
    uRippleC: { value: new THREE.Vector2(0, 0) },
    uAccent:  { value: new THREE.Color(ACCENT) },
    uFold:    { value: 0 },
    uTime:    { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, fragmentShader: fragment,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT, EXTENT, SEGS, SEGS), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.frustumCulled = false;
  return { mesh, u: uniforms };
}

/* ------------------------------------------------------------
   CHAOS: 64 physical squares that detach and float.
   Driven by a single 0..1 value; the render loop computes
   matrices (cheap, no GC).
   ------------------------------------------------------------ */
export function createChaosSquares() {
  const count = 64;
  const geo = new THREE.BoxGeometry(SQ * 0.985, 0.7, SQ * 0.985);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x101014, roughness: 0.35, metalness: 0.2,
    envMapIntensity: 0.8, transparent: true,
  });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.frustumCulled = false;
  inst.visible = false;

  // per-instance random flight data
  const rnd = [];
  const rng = mulberry(1337);
  for (let i = 0; i < count; i++) {
    rnd.push({
      dx: (rng() - 0.5) * 90,
      dy: 14 + rng() * 65,
      dz: (rng() - 0.5) * 90,
      rx: (rng() - 0.5) * Math.PI * 2.2,
      rz: (rng() - 0.5) * Math.PI * 2.2,
      delay: rng() * 0.55,
      bob: 0.6 + rng() * 1.6,
      ph: rng() * Math.PI * 2,
    });
  }

  const homes = [];
  let k = 0;
  for (let fx = 0; fx < 8; fx++) for (let fz = 0; fz < 8; fz++) {
    homes[k++] = new THREE.Vector3((fx - 3.5) * SQ, 0.35, (fz - 3.5) * SQ);
  }

  const M = new THREE.Matrix4();
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(),
        E = new THREE.Euler(), SC = new THREE.Vector3(1, 1, 1);

  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);

  function update(p, time) {          // p: 0..1 chaos progress
    if (!inst.visible) return;
    for (let i = 0; i < count; i++) {
      const r = rnd[i];
      const t = ease((p - r.delay) / (1 - r.delay) || 0);
      P.copy(homes[i]);
      P.x += r.dx * t;
      P.y += r.dy * t + Math.sin(time * r.bob + r.ph) * 1.4 * t;
      P.z += r.dz * t + Math.cos(time * r.bob * 0.7 + r.ph) * 1.2 * t;
      E.set(r.rx * t, r.rx * 0.6 * t + r.ph * t * 0.2, r.rz * t);
      Q.setFromEuler(E);
      M.compose(P, Q, SC);
      inst.setMatrixAt(i, M);
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  return { inst, update, set p(v) {}, homes };
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

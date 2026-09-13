/* ============================================================
   CHESSFORK — cinematic post pipeline
   bloom + a final lens pass (grain / vignette / subtle CA /
   fork "split" distortion / fades / flash) in one shader.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { QUALITY } from '../config.js';

const LensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime:    { value: 0 },
    uGrain:   { value: 0.055 },   // film grain
    uVig:     { value: 0.62 },    // vignette strength
    uCA:      { value: 0.0016 },  // chromatic aberration (kept subtle)
    uSplit:   { value: 0 },       // FORK — screen tears into two directions
    uFade:    { value: 0 },       // fade to black
    uFlash:   { value: 0 },       // white flash
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVig, uCA, uSplit, uFade, uFlash;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;

      // FORK split: left half slides left, right half slides right,
      // with a torn chromatic seam in the middle
      float side = step(0.5, uv.x) * 2.0 - 1.0;
      float seam = smoothstep(0.0, 0.5, abs(c.x));
      uv.x -= side * uSplit * 0.075 * seam;
      uv.y += uSplit * 0.02 * sin(uv.x * 40.0);

      // chromatic aberration, radial + boosted by split
      float caAmt = uCA * (1.0 + uSplit * 6.0) * (0.6 + length(c));
      vec2 dir = normalize(c + 1e-6);
      float r = texture2D(tDiffuse, uv + dir * caAmt).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir * caAmt).b;
      vec3 col = vec3(r, g, b);

      // vignette
      float vig = 1.0 - uVig * dot(c, c) * 1.7;
      col *= clamp(vig, 0.0, 1.0);

      // animated film grain
      float gr = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 431.0) - 0.5;
      col += gr * uGrain * (1.0 - uFlash);

      // fades / flash
      col = mix(col, vec3(0.0), clamp(uFade, 0.0, 1.0));
      col = mix(col, vec3(1.0, 0.97, 0.9), clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostFX(engine) {
  const composer = new EffectComposer(engine.renderer);
  composer.setPixelRatio(QUALITY.pixelRatio);
  composer.setSize(innerWidth, innerHeight);

  composer.addPass(new RenderPass(engine.scene, engine.camera));

  let bloom = null;
  if (QUALITY.bloom) {
    bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.82
    );
    composer.addPass(bloom);
  }

  const lens = new ShaderPass(LensShader);
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  engine.onResize = (w, h) => {
    composer.setSize(w, h);
    bloom?.setSize(w / 2, h / 2);
  };
  engine.onDemote = () => { if (bloom) bloom.strength = Math.max(0.55, bloom.strength - 0.1); };

  return {
    composer,
    bloom,
    u: lens.uniforms,      // the director tweens these
    render(dt) {
      lens.uniforms.uTime.value += dt;
      composer.render();
    },
  };
}

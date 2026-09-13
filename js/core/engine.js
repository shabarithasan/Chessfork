/* ============================================================
   CHESSFORK — engine: renderer / scene / camera / frame loop
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { S, QUALITY } from '../config.js';

export class Engine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(QUALITY.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.011);

    this.camera = new THREE.PerspectiveCamera(S.cam.fov, innerWidth / innerHeight, 0.1, 1200);
    this.camera.position.set(S.cam.px, S.cam.py, S.cam.pz);

    // environment reflections (procedural studio) — gives the
    // pawn's lacquer those tiny crawling highlights
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
    pmrem.dispose();

    this._subs = [];
    this._clock = new THREE.Clock();
    this._running = false;

    // adaptive resolution: if frames run long, step the ratio down
    this._fpsAcc = 0; this._fpsN = 0; this._fpsT = 0;
    this._dynRatio = QUALITY.pixelRatio;

    addEventListener('resize', () => this._resize());

    // pointer — drives parallax, reflections, particles
    addEventListener('pointermove', (e) => {
      S.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      S.mouse.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  add(fn) { this._subs.push(fn); return this; }

  start() {
    if (this._running) return;
    this._running = true;
    this._clock.start();
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this._clock.getDelta(), 0.05);
      const freezeF = S.freeze > 0 ? 0.12 : 1;          // fork freeze-frame
      S.worldTime += dt * freezeF;
      // smooth the mouse once per frame — everything downstream gets silk
      S.mouse.sx += (S.mouse.x - S.mouse.sx) * 0.045;
      S.mouse.sy += (S.mouse.y - S.mouse.sy) * 0.045;
      for (let i = 0; i < this._subs.length; i++) this._subs[i](dt, S.worldTime);
      this._fps(dt);
    };
    loop();
  }

  _fps(dt) {
    this._fpsAcc += dt; this._fpsN++;
    if ((this._fpsT += dt) > 2.5) {
      const avg = this._fpsAcc / this._fpsN;
      this._fpsAcc = 0; this._fpsN = 0; this._fpsT = 0;
      if (avg > 1 / 42 && this._dynRatio > 0.85) {          // running slow
        this._dynRatio = Math.max(0.85, this._dynRatio - 0.25);
        this.renderer.setPixelRatio(this._dynRatio);
        this.onDemote?.(this._dynRatio);
      }
    }
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.onResize?.(innerWidth, innerHeight);
  }
}

/* Camera rig — called every frame after GSAP has moved S.cam.
   Adds mouse parallax + impact shake on top of the dolly. */
export function rigCamera(engine) {
  const c = S.cam;
  const t = S.worldTime;
  const sh = S.shake;
  const sx = sh * (Math.sin(t * 61.7) + Math.sin(t * 41.3) * 0.6) * 0.14;
  const sy = sh * (Math.sin(t * 55.1) + Math.sin(t * 37.9) * 0.6) * 0.12;

  engine.camera.position.set(
    c.px + S.mouse.sx * 1.1 + sx,
    c.py - S.mouse.sy * 0.8 + sy,
    c.pz
  );
  engine.camera.lookAt(
    c.lx + S.mouse.sx * 0.55,
    c.ly - S.mouse.sy * 0.4,
    c.lz
  );
  engine.camera.rotation.z = c.roll || 0;
  if (Math.abs(engine.camera.fov - c.fov) > 0.01) {
    engine.camera.fov += (c.fov - engine.camera.fov) * 0.2;
    engine.camera.updateProjectionMatrix();
  }
}

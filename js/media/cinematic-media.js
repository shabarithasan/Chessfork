/* ============================================================
   CHESSFORK — cinematic media system (placeholder-ready)

   Supports two kinds of cinematic assets registered in
   MEDIA_MANIFEST (js/config.js):

   1) kind: 'video'
      An MP4/WebM that is NEVER played with time elapse —
      currentTime is scrubbed from scroll progress, so footage
      plays exactly in sync with the camera.

   2) kind: 'sequence'
      A numbered image sequence (webp/jpg/png) decoded lazily
      and drawn to a canvas texture — the classic Awwwards
      "frame-perfect scrub" technique.

   Both mount as a fullscreen layer behind the WebGL stage
   (a <canvas>), mixed via CSS opacity that the director can
   tween per scroll range [from, to] of global progress 0..1.

   The experience works with ZERO assets — this system only
   activates when files actually exist.
   ============================================================ */

export class CinematicVideo {
  constructor(cfg) {
    this.cfg = cfg;
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.src = cfg.src;
    this.video.crossOrigin = 'anonymous';
    this.ready = false;
    this.layer = makeLayer(`media-${cfg.id}`);
    this.ctx = this.layer.getContext('2d');
    this.video.addEventListener('loadeddata', () => {
      this.ready = true;
      this.video.pause();
    });
    this.video.addEventListener('error', () => { this.dead = true; this.layer.remove(); });
  }
  /* p: 0..1 local progress within [cfg.from, cfg.to] */
  seek(p, opacity) {
    if (!this.ready || this.dead) return;
    const v = this.video;
    if (v.duration) {
      const t = p * v.duration;
      if (Math.abs(v.currentTime - t) > 0.04) v.currentTime = t;
    }
    const { ctx, layer } = this;
    if (layer.width !== innerWidth) { layer.width = innerWidth; layer.height = innerHeight; }
    ctx.drawImage(v, 0, 0, layer.width, layer.height);
    layer.style.opacity = opacity.toFixed(3);
  }
}

export class CinematicSequence {
  constructor(cfg) {
    this.cfg = cfg;
    this.frames = new Array(cfg.to - cfg.from + 1).fill(null);
    this.layer = makeLayer(`media-${cfg.id}`);
    this.ctx = this.layer.getContext('2d');
    this.prefetched = 0;
    // progressive lazy load — nearest frames first
    this._preload(Math.round(this.frames.length / 2));
  }
  _url(i) {
    return this.cfg.pattern.replace('#'.repeat(this.cfg.pad), String(this.cfg.from + i).padStart(this.cfg.pad, '0'));
  }
  _preload(i) {
    if (i < 0 || i >= this.frames.length || this.frames[i]) return;
    const img = new Image();
    img.src = this._url(i);
    img.onload = () => { this.frames[i] = img; };
    img.onerror = () => { this.frames[i] = 'dead'; };
  }
  seek(p, opacity) {
    const i = Math.round(p * (this.frames.length - 1));
    // opportunistically warm the neighborhood
    this._preload(i - 1); this._preload(i); this._preload(i + 1);
    const img = this.frames[i];
    if (!img || img === 'dead') return;
    const { ctx, layer } = this;
    if (layer.width !== innerWidth) { layer.width = innerWidth; layer.height = innerHeight; }
    ctx.drawImage(img, 0, 0, layer.width, layer.height);
    layer.style.opacity = opacity.toFixed(3);
  }
}

function makeLayer(id) {
  const c = document.createElement('canvas');
  c.id = id;
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    zIndex: 1, pointerEvents: 'none', opacity: 0,
  });
  document.body.appendChild(c);
  return c;
}

/* Registry driven by the director every frame with global progress */
export function initMedia(manifest) {
  const layers = manifest.map(cfg =>
    cfg.kind === 'video' ? new CinematicVideo(cfg)
  : cfg.kind === 'sequence' ? new CinematicSequence(cfg)
  : null).filter(Boolean);

  return {
    layers,
    update(progress) {
      for (const l of layers) {
        const { from = 0, to = 1 } = l.cfg;
        const inRange = progress >= from && progress <= to;
        const local = inRange ? (progress - from) / Math.max(1e-6, to - from) : 0;
        // soft in/out edges
        const fade = inRange ? Math.min(1, Math.min(local, 1 - local) * 6 + 0.15) : 0;
        if (!inRange && l.layer.style.opacity !== '0') l.layer.style.opacity = 0;
        if (inRange) l.seek(local, fade);
      }
    },
  };
}

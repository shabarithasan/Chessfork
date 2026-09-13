/* ============================================================
   CHESSFORK — global config, shared state, quality tiers
   ============================================================ */

export const ACCENT = 0xd9b36a;        // chess-fork gold
export const ACCENT_CSS = '#d9b36a';

/* ------------------------------------------------------------
   CINEMATIC MEDIA PLACEHOLDERS
   Drop assets into /media and register them here to replace or
   augment procedural scenes with real footage.

   - video:    { id, kind:'video', src:'media/intro-loop.mp4', mount:'background' }
               -> scroll-scrubbed MP4/WebM playback (see js/media/cinematic-media.js)
   - sequence: { id, kind:'sequence', pattern:'media/seq/frame_####.webp',
                 from: 1, to: 240, pad: 4 }
               -> image-sequence canvas playback, scrubbed by scroll/rAF

   The experience below is 100% procedural, so this array may
   stay empty — every registered asset simply layers on top.
   ------------------------------------------------------------ */
export const MEDIA_MANIFEST = [
  // { id: 'opening-plate', kind: 'video', src: 'media/intro-plate.webm', mount: 'background', from: 0.0, to: 0.12 },
  // { id: 'arena-loop',    kind: 'sequence', pattern: 'media/arena/frame_####.webp', from: 1, to: 180, pad: 4, mount: 'background', scrollFrom: 0.62, scrollTo: 0.74 },
];

/* ------------------------------------------------------------
   SOUND-READY EVENT BUS
   The director fires cue events at exact animation beats, so a
   future sound layer can sync without touching the visuals:

   soundBus.addEventListener('cue', e => console.log(e.detail));

   Cues: intro-flash, pawn-impact, pawn-step, board-reveal,
   mind-enter, fork-flight, fork-land, fork-word, chaos-break,
   chaos-stop, arena-enter, mastery-rise, mastery-flash,
   collapse, void, reveal, finale.
   ------------------------------------------------------------ */
export const soundBus = new EventTarget();
export function cue(name) {
  soundBus.dispatchEvent(new CustomEvent('cue', { detail: name }));
}

/* ------------------------------------------------------------
   QUALITY TIERS — desktop high / mobile low / reduced motion
   ------------------------------------------------------------ */
const coarse = matchMedia('(pointer: coarse)').matches;
const narrow = Math.min(innerWidth, innerHeight) < 830;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = coarse || narrow;

export const QUALITY = isMobile ? {
  pixelRatio: Math.min(devicePixelRatio, 1.5),
  dust: 420, embers: 260, burst: 900,
  bloom: false,            // bloom off on small GPUs, vignette keeps the mood
  chaosShadow: false,
  scrub: 0.6,
  runwayVh: 3400,
} : {
  pixelRatio: Math.min(devicePixelRatio, 2),
  dust: 1600, embers: 700, burst: 2400,
  bloom: true,
  chaosShadow: false,
  scrub: 1.1,
  runwayVh: 4300,
};

if (reduced) {
  QUALITY.dust = 250;
  QUALITY.embers = 120;
  QUALITY.burst = 300;
  QUALITY.scrub = true;    // instant scrub — no lag, no motion trail
  QUALITY.runwayVh = 2600;
}

/* ------------------------------------------------------------
   SHARED MUTABLE STATE — the single source of truth that the
   director (GSAP) writes and the render loop reads every frame.
   ------------------------------------------------------------ */
export const S = {
  progress: 0,                 // 0..1 across the whole film
  chapter: '00',
  chapterName: 'PROLOGUE',

  // camera rig — tweened by GSAP, consumed by the render loop
  cam: { px: 3.4, py: 3.0, pz: 5.2, lx: 0, ly: 3.4, lz: 0, fov: 34 },

  mouse: { x: 0, y: 0, sx: 0, sy: 0 },   // raw + smoothed NDC

  shake: 0,                    // camera shake amplitude
  finale: false,               // finale section active
  ctaHover: 0,                 // 0..1 — finale button hover energy
  boardGlow: 0,                // finale: board re-emerges on hover
  freeze: 0,                   // >0 slows world drift (fork freeze-frame)

  worldTime: 0,                // master clock (advanceable, pausable)
  started: false,              // intro finished, scroll unlocked
};

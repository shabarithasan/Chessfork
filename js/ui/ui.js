/* ============================================================
   CHESSFORK — UI: mask-reveal typography, HUD, menu, finale
   ============================================================ */
import { S } from '../config.js';

const gsap = window.gsap;

/* ---------- typography primitives (used by the director) ---------- */

/* reveal a beat's masked lines; returns tween position helpers */
export function beatIn(tl, sel, at, { dur = 0.9, stagger = 0.14, holdNote = true } = {}) {
  const el = document.querySelector(sel);
  if (!el) return;
  tl.set(el, { visibility: 'visible' }, at);
  tl.fromTo(el.querySelectorAll('.ln > span'),
    { yPercent: 115, rotate: 2.5 },
    { yPercent: 0, rotate: 0, duration: dur, stagger, ease: 'expo.out' },
    at + 0.02);
  const chap = el.querySelector('.chap');
  if (chap && holdNote) {
    tl.fromTo(chap, { opacity: 0, letterSpacing: '0.9em' },
      { opacity: 1, letterSpacing: '0.5em', duration: dur * 0.9, ease: 'power2.out' }, at + 0.05);
  }
}

export function beatOut(tl, sel, at, { dur = 0.55, up = true } = {}) {
  const el = document.querySelector(sel);
  if (!el) return;
  tl.to(el.querySelectorAll('.ln > span'),
    { yPercent: up ? -120 : 120, duration: dur, stagger: 0.06, ease: 'power3.in' }, at);
  const chap = el.querySelector('.chap');
  if (chap) tl.to(chap, { opacity: 0, duration: dur * 0.7 }, at);
  tl.set(el, { visibility: 'hidden' }, at + dur + 0.1);
}

/* horizontal displacement + tracking pulse for "wow" accents */
export function beatDisplace(tl, sel, at, amount = 60) {
  const spans = document.querySelectorAll(`${sel} .ln > span`);
  if (!spans.length) return;
  tl.fromTo(spans, { x: -amount, letterSpacing: '0.09em' },
    { x: 0, letterSpacing: '0.005em', duration: 0.7, ease: 'expo.out' }, at);
}

/* ---------- HUD ---------- */

const CHAPTERS = [
  ['00', 'PROLOGUE'],
  ['01', 'GENESIS'],
  ['02', 'THE MIND'],
  ['03', 'THE FORK'],
  ['04', 'CHAOS'],
  ['05', 'THE ARENA'],
  ['06', 'MASTERY'],
  ['', 'CHESSFORK'],
  ['', 'YOUR MOVE'],
];

let hudEls = null;

export function initHUD() {
  hudEls = {
    hud: document.getElementById('hud'),
    num: document.getElementById('ch-num'),
    name: document.getElementById('ch-name'),
    bar: document.getElementById('progress-bar'),
    hint: document.getElementById('scroll-hint'),
  };
  // wire menu
  const menu = document.getElementById('menu');
  const openBtn = document.getElementById('menu-btn');
  const closeBtn = document.getElementById('menu-close');
  openBtn.addEventListener('click', () => openMenu(menu));
  closeBtn.addEventListener('click', () => closeMenu(menu));
  menu.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      closeMenu(menu);
      const label = li.dataset.goto;
      const y = S.labels?.[label];
      if (y != null) {
        window.scrollTo({ top: y * (document.body.scrollHeight - innerHeight), behavior: 'smooth' });
      }
    });
  });
  return hudEls;
}

/* called every frame by the director */
export function updateHUD(progress, chapterIdx) {
  if (!hudEls) return;
  hudEls.bar.style.width = (progress * 100).toFixed(2) + '%';
  const [num, name] = CHAPTERS[Math.min(chapterIdx, CHAPTERS.length - 1)];
  if (num !== S.chapter) {
    S.chapter = num; S.chapterName = name;
    hudEls.num.textContent = num || '··';
    hudEls.name.textContent = name;
    gsap.fromTo(hudEls.num, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
  }
}

export function showHUD() {
  gsap.to('#hud', { opacity: 1, duration: 1.2, ease: 'power2.out' });
  gsap.fromTo('#scroll-hint', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.6 });
}
export function hideHint() {
  gsap.to('#scroll-hint', { opacity: 0, duration: 0.5 });
}

/* ---------- menu ---------- */
function openMenu(menu) {
  menu.classList.add('open');
  gsap.to(menu, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  gsap.to('#menu li', { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out', delay: 0.08 });
}
function closeMenu(menu) {
  gsap.to('#menu li', { y: 40, opacity: 0, duration: 0.3, stagger: 0.02, ease: 'power2.in' });
  gsap.to(menu, {
    opacity: 0, duration: 0.35, delay: 0.1,
    onComplete: () => menu.classList.remove('open'),
  });
}

/* ---------- finale / arena interactivity ---------- */
export function initCTA(state, hooks = {}) {
  document.querySelectorAll('[data-noop]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      // click = a small pulse, as if the world answered
      hooks.onPulse?.(a);
    });
  });

  const play = document.getElementById('play-cta');
  const arenaCta = document.getElementById('arena-cta');
  const bindHover = el => {
    if (!el) return;
    el.addEventListener('pointerenter', () => {
      state.ctaHover = 1;
      gsap.to(el, { scale: 1.07, duration: 0.5, ease: 'expo.out' });
      gsap.to(state, { boardGlow: 1, duration: 1.4, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => {
      state.ctaHover = 0;
      gsap.to(el, { scale: 1, duration: 0.6, ease: 'expo.out' });
      gsap.to(state, { boardGlow: 0, duration: 1.6, ease: 'power2.out' });
    });
  };
  bindHover(play);
  bindHover(arenaCta);
}

/* finale + arena buttons only clickable while their beat is live */
export function setLiveBeat(sel, on) {
  const el = document.querySelector(sel);
  if (el) el.classList.toggle('live', on);
}

/* rank ticker (mastery) */
export function setRank(i) {
  document.querySelectorAll('#ranks span').forEach((el, k) => {
    el.classList.toggle('on', k === i);
  });
}

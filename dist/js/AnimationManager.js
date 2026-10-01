import {clamp, easeOutQuint} from './utils/easing.js';
import {splitText} from './utils/splitText.js';

export class AnimationManager {
  constructor(root = document) {
    this.root = root;
    this.abort = new AbortController();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.counters = new Map();
    this.completed = new WeakSet();
    this.observed = new Set();
    this.frame = 0;
    this.hintFrames = new Set();
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        this.reveal(entry.target);
        this.observer.unobserve(entry.target);
        this.observed.delete(entry.target);
      }
    }, {threshold: .15});
    this.refresh(root);
    document.documentElement.classList.add('motion-ready');
    addEventListener('scroll', this.schedule, {passive:true, signal:this.abort.signal});
    addEventListener('resize', this.schedule, {signal:this.abort.signal});
    document.addEventListener('freespace:planchange', e => this.refresh(e.detail.panel), {signal:this.abort.signal});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.finishCounters();
      else this.schedule();
    }, {signal:this.abort.signal});
    this.reduced.addEventListener('change', this.syncMotion, {signal:this.abort.signal});
    this.schedule();
  }

  refresh(root) {
    root.querySelectorAll('h1, main h2').forEach(el => { if (!el.closest('dialog')) splitText(el); });
    const cards = root.querySelectorAll('.zone-tile, .steps li, .tour-fact');
    this.stagger(cards);
    this.observeReveal(root.querySelectorAll('[data-reveal], .intro, .hero-actions, .hero-stats, .contact-copy, .contact-data, blockquote, .quote-author, .split-text, .zone-tile, .steps li, .tour-fact, .section-divider, [data-counter]'));
  }

  observeReveal(elements) {
    for (const element of elements) {
      if (this.completed.has(element) || this.observed.has(element)) continue;
      if (!element.matches('[data-counter], .split-text, .section-divider')) element.classList.add('reveal');
      if (this.reduced.matches) this.reveal(element);
      else { this.observed.add(element); this.observer.observe(element); }
    }
  }

  stagger(elements, delay = 100) {
    [...elements].forEach((el, i) => el.style.setProperty('--delay', `${(i % 6) * delay}ms`));
  }

  reveal(element) {
    this.completed.add(element);
    element.classList.add('is-visible');
    if (element.matches('[data-counter]')) this.counter(element);
    if (this.reduced.matches) return;
    element.style.willChange = 'transform, opacity';
    element.addEventListener('transitionend', () => element.style.removeProperty('will-change'), {once:true, signal:this.abort.signal});
    // Ждём настоящие CSS transitions, не перекрывая их opacity дополнительной анимацией.
    const hintFrame = requestAnimationFrame(() => {
      this.hintFrames.delete(hintFrame);
      const transitions = element.getAnimations({subtree:true});
      Promise.allSettled(transitions.map(animation=>animation.finished)).then(()=>element.style.removeProperty('will-change'));
    });
    this.hintFrames.add(hintFrame);
  }

  counter(element, duration = 1000) {
    const target = Number(element.dataset.counter);
    if (!Number.isFinite(target)) return;
    const format = value => Math.round(value).toLocaleString('ru-RU');
    element.setAttribute('aria-label', format(target));
    if (this.reduced.matches || document.hidden) { element.textContent = format(target); return; }
    this.counters.set(element, {start:performance.now(), target, duration, format});
    element.textContent = '0';
    this.schedule();
  }

  splitText(element) { return splitText(element); }

  parallax() {
    const enabled = innerWidth > 1024 && !this.reduced.matches;
    document.querySelectorAll('[data-parallax]').forEach(layer => {
      const section = layer.parentElement.getBoundingClientRect();
      const offset = enabled ? clamp(-section.top * .2, -160, 160) : 0;
      layer.style.transform = `translate3d(0,${offset}px,0)`;
    });
  }

  schedule = () => {
    if (this.frame || document.hidden || this.abort.signal.aborted) return;
    this.frame = requestAnimationFrame(this.tick);
  };

  tick = time => {
    this.frame = 0;
    const range = document.documentElement.scrollHeight - innerHeight;
    const progress = range > 0 ? clamp(scrollY / range) : 0;
    document.querySelector('.scroll-progress')?.style.setProperty('transform', `scaleX(${progress})`);
    document.querySelector('.scroll-indicator')?.classList.toggle('dismissed', scrollY > 24);
    this.parallax();
    for (const [el, animation] of this.counters) {
      if (!el.isConnected) { this.counters.delete(el); continue; }
      const t = clamp((time - animation.start) / animation.duration);
      el.textContent = animation.format(animation.target * easeOutQuint(t));
      if (t === 1) this.counters.delete(el);
    }
    if (this.counters.size) this.schedule();
  };

  finishCounters() {
    for (const [element, animation] of this.counters) element.textContent = animation.format(animation.target);
    this.counters.clear();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  syncMotion = () => {
    if (this.reduced.matches) {
      this.finishCounters();
      for (const el of this.observed) { this.reveal(el); this.observer.unobserve(el); }
      this.observed.clear();
    }
    this.schedule();
  };

  destroy() {
    this.hintFrames.forEach(frame=>cancelAnimationFrame(frame));this.hintFrames.clear();
    this.finishCounters();
    this.abort.abort();
    this.observer.disconnect();
    this.observed.clear();
    document.documentElement.classList.remove('motion-ready');
    document.querySelectorAll('[data-parallax]').forEach(el => el.style.removeProperty('transform'));
    this.root.querySelectorAll('[style]').forEach(el => el.style.removeProperty('will-change'));
  }
}


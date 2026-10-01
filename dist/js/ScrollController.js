import {clamp, lerp} from './utils/easing.js';

export class ScrollController {
  constructor({sections, presets, onChange, onUpdate}) {
    this.sections = [...sections];
    this.presets = presets;
    this.onChange = onChange;
    this.onUpdate = onUpdate;
    this.abort = new AbortController();
    this.intersections = new Set();
    this.activeId = null;
    this.scene = null;
    this.frame = 0;
    const options = {passive: true, signal: this.abort.signal};
    // Только один rAF на кадр прокрутки, без setTimeout и постоянного polling.
    addEventListener('scroll', this.schedule, options);
    addEventListener('resize', this.refresh, options);
    document.addEventListener('visibilitychange', this.schedule, {signal: this.abort.signal});
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.intersections.add(entry.target);
        else this.intersections.delete(entry.target);
      }
      this.schedule();
    }, {rootMargin: '-15% 0px -20% 0px', threshold: [0, .15, .5]});
    this.sections.forEach(section => this.observer.observe(section));
    this.resizeObserver = new ResizeObserver(this.refresh);
    this.resizeObserver.observe(document.querySelector('main'));
    this.refresh();
    document.fonts?.ready.then(() => { if (!this.abort.signal.aborted) this.refresh(); });
  }

  connect(scene) { this.scene = scene; this.installKeyframes(); this.update(); }

  installKeyframes() {
    if (!this.scene) return;
    this.scene.cameraRig.keyframes.length = 0;
    this.sections.forEach((section, i) => {
      this.scene.cameraRig.addKeyframe(this.timeline[i], {...this.presets[section.dataset.scene], id: section.dataset.scene});
    });
  }

  refresh = () => {
    const durations = this.sections.map(section => Math.max(.1, Number(section.dataset.duration) || 1));
    const total = durations.slice(0, -1).reduce((a, b) => a + b, 0);
    let elapsed = 0;
    this.timeline = durations.map((duration, i) => {
      const progress = total ? elapsed / total : 0;
      if (i < durations.length - 1) elapsed += duration;
      return progress;
    });
    this.anchors = this.sections.map((section, i) => i === 0 ? 0 : Math.max(0, section.getBoundingClientRect().top + scrollY - innerHeight * .25));
    this.installKeyframes();
    this.schedule();
  };

  schedule = () => {
    if (this.frame || this.abort.signal.aborted || document.hidden) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.update(); });
  };

  update() {
    if (this.abort.signal.aborted) return;
    const y = scrollY;
    let segment = 0;
    while (segment < this.anchors.length - 2 && y > this.anchors[segment + 1]) segment++;
    const range = this.anchors[segment + 1] - this.anchors[segment];
    const mix = range > 0 ? clamp((y - this.anchors[segment]) / range) : 0;
    const duration = Math.max(.1, Number(this.sections[segment].dataset.duration) || 1);
    // Большая duration удерживает исходный ракурс дольше; обе границы всё равно совпадают.
    const timedMix = Math.pow(mix, duration);
    const globalProgress = lerp(this.timeline[segment], this.timeline[segment + 1], timedMix);
    // IO определяет видимые секции; ближайшая к верхней четверти экрана получает сцену.
    let activeIndex = mix < .5 ? segment : segment + 1;
    if (this.intersections.size) {
      let closest = Infinity;
      this.sections.forEach((section, i) => {
        if (!this.intersections.has(section)) return;
        const distance = Math.abs(this.anchors[i] - y);
        if (distance < closest) { closest = distance; activeIndex = i; }
      });
    }
    const active = this.sections[activeIndex], rect = active.getBoundingClientRect();
    const sectionProgress = clamp((innerHeight - rect.top) / (innerHeight + rect.height));
    const state = {globalProgress, sectionProgress, activeId: active.dataset.scene, activeIndex, segment, mix};
    if (this.activeId !== state.activeId) {
      this.activeId = state.activeId;
      this.onChange?.(state, active);
    }
    this.state = state;
    this.scene?.update(state);
    this.onUpdate?.(state);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    this.intersections.clear();
    this.scene = null;
  }
}


import {lerp} from './utils/easing.js';

export class MicroInteractions {
  constructor() {
    this.abort = new AbortController();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.finePointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1025px)');
    this.frame = 0;
    this.animations = new Map();
    this.bindHover();
    this.bindFocus();
    this.modal();
    this.customCursor();
    const options = {signal:this.abort.signal};
    document.addEventListener('freespace:planchange', this.moveSlider, options);
    addEventListener('resize', this.moveSlider, options);
    document.fonts?.ready.then(() => { if (!this.abort.signal.aborted) this.moveSlider(); });
    this.moveSlider();
  }

  bindHover() {
    document.addEventListener('pointerover', e => {
      this.cursor?.classList.toggle('over-control', !!e.target.closest('a, button, input, select, canvas'));
    }, {passive:true, signal:this.abort.signal});
  }

  bindFocus() {
    for (const input of document.querySelectorAll('input:not([type=checkbox]), select')) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (!label) continue;
      input.addEventListener('focus', () => label.classList.add('field-focused'), {signal:this.abort.signal});
      input.addEventListener('blur', () => label.classList.remove('field-focused'), {signal:this.abort.signal});
    }
  }

  // <dialog> сохраняет нативный focus trap. Закрытие по Escape проходит через анимацию.
  modal() {
    this.dialog = document.querySelector('#booking-dialog');
    if (!this.dialog) return;
    const observer = new MutationObserver(records => {
      if (!records.some(r => r.attributeName === 'open')) return;
      if (this.dialog.open) this.animateModal(true);
    });
    observer.observe(this.dialog, {attributes:true, attributeFilter:['open']});
    this.dialogObserver = observer;
    this.dialog.addEventListener('freespace:request-close', () => this.closeModal(), {signal:this.abort.signal});
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.closeModal(); }, {signal:this.abort.signal});
    this.dialog.dataset.animated = 'true';
  }

  animateModal(open) {
    if (this.reduced.matches) return null;
    this.animations.get(this.dialog)?.cancel();
    const frames = [{opacity:0, transform:'scale(.96)'}, {opacity:1, transform:'scale(1)'}];
    const animation = this.dialog.animate(open ? frames : [...frames].reverse(), {duration:180, easing:'cubic-bezier(.2,.7,.2,1)'});
    this.animations.set(this.dialog, animation);
    animation.finished.then(() => this.animations.delete(this.dialog)).catch(() => {});
    return animation;
  }

  closeModal() {
    if (!this.dialog.open || this.closing) return;
    this.closing = true;
    const finish = () => { if (this.dialog.open) this.dialog.close(); this.closing = false; };
    const animation = this.animateModal(false);
    if (animation) animation.finished.then(finish).catch(finish);
    else finish();
  }

  moveSlider = () => {
    const tabs = document.querySelector('.pricing-tabs'), active = tabs?.querySelector('[aria-selected=true]');
    if (!active) return;
    let slider = tabs.querySelector('.tab-slider');
    if (!slider) { slider = document.createElement('span'); slider.className = 'tab-slider'; slider.setAttribute('aria-hidden','true'); tabs.prepend(slider); }
    // Бегунок имеет единичную ширину: изменяем только transform, а не width/left.
    slider.style.transform = `translate3d(${active.offsetLeft}px,4px,0) scaleX(${active.offsetWidth})`;
  };

  customCursor() {
    this.cursor = document.createElement('span');
    this.cursor.className = 'cursor-dot';
    this.cursor.setAttribute('aria-hidden','true');
    document.body.append(this.cursor);
    this.position = {x:0,y:0}; this.target = {x:0,y:0};
    const sync = () => {
      this.cursorEnabled = this.finePointer.matches && !this.reduced.matches;
      this.cursor.hidden = true;
      cancelAnimationFrame(this.frame); this.frame = 0;
    };
    this.finePointer.addEventListener('change',sync,{signal:this.abort.signal});
    this.reduced.addEventListener('change',sync,{signal:this.abort.signal});
    sync();
    document.addEventListener('pointermove',e => {
      if (!this.cursorEnabled || e.pointerType !== 'mouse') return;
      if (this.cursor.hidden) { this.position.x=e.clientX; this.position.y=e.clientY; }
      this.cursor.hidden=false; this.target={x:e.clientX,y:e.clientY};
      if (!this.frame) this.frame=requestAnimationFrame(this.cursorTick);
    },{passive:true,signal:this.abort.signal});
    document.addEventListener('pointerleave',() => {this.cursor.hidden=true;cancelAnimationFrame(this.frame);this.frame=0;},{signal:this.abort.signal});
    document.addEventListener('visibilitychange',() => {if(document.hidden){this.cursor.hidden=true;cancelAnimationFrame(this.frame);this.frame=0;}},{signal:this.abort.signal});
  }

  cursorTick = () => {
    this.frame=0;
    if (!this.cursorEnabled || this.cursor.hidden) return;
    this.position.x=lerp(this.position.x,this.target.x,.22);this.position.y=lerp(this.position.y,this.target.y,.22);
    this.cursor.style.transform=`translate3d(${this.position.x}px,${this.position.y}px,0)`;
    // rAF останавливается, когда курсор догнал указатель.
    if(Math.hypot(this.position.x-this.target.x,this.position.y-this.target.y)>.15)this.frame=requestAnimationFrame(this.cursorTick);
  };

  destroy() {
    this.abort.abort();
    this.dialogObserver?.disconnect();
    if(this.dialog) delete this.dialog.dataset.animated;
    cancelAnimationFrame(this.frame);
    this.animations.forEach(animation=>animation.cancel());this.animations.clear();
    this.cursor?.remove();
  }
}

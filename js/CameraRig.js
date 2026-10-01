import {clamp, lerp, easeInOutCubic} from './utils/easing.js';

const vector = (value, fallback) => Array.isArray(value) ? [...value] : value ? [value.x, value.y, value.z] : [...fallback];

export class CameraRig {
  constructor(camera, controls = null) {
    this.camera = camera;
    this.controls = controls;
    this.keyframes = [];
    this.target = [0, 0, 0];
    this.progress = 0;
  }

  addKeyframe(progress, {position, target, zoom = 1, fov = 45, id = ''}) {
    if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError('Keyframe progress must be between 0 and 1.');
    const frame = {progress, position: vector(position, [10,10,10]), target: vector(target, [0,0,0]), zoom, fov, id};
    const existing = this.keyframes.findIndex(k => k.progress === progress);
    if (existing !== -1) this.keyframes[existing] = frame;
    else this.keyframes.push(frame);
    this.keyframes.sort((a, b) => a.progress - b.progress);
    return this;
  }

  sample(t) {
    if (!this.keyframes.length) return null;
    t = clamp(t);
    let i = 0;
    while (i < this.keyframes.length - 2 && t > this.keyframes[i + 1].progress) i++;
    const a = this.keyframes[i], b = this.keyframes[Math.min(i + 1, this.keyframes.length - 1)];
    const linear = a === b ? 0 : clamp((t - a.progress) / (b.progress - a.progress));
    // Один easing применяется ко всем параметрам: соседние keyframes совпадают точно.
    const mix = easeInOutCubic(linear);
    return {
      position: a.position.map((v, axis) => lerp(v, b.position[axis], mix)),
      target: a.target.map((v, axis) => lerp(v, b.target[axis], mix)),
      zoom: lerp(a.zoom, b.zoom, mix), fov: lerp(a.fov, b.fov, mix),
      from: a.id, to: b.id, segment: i, mix, linear,
    };
  }

  setProgress(t) {
    this.progress = clamp(t);
    const state = this.sample(this.progress);
    if (!state) return null;
    this.camera.position.set(...state.position);
    this.target = state.target;
    this.controls?.target.set(...state.target);
    this.camera.lookAt(...state.target);
    this.camera.zoom = state.zoom;
    if (this.camera.isPerspectiveCamera) this.camera.fov = state.fov;
    this.camera.updateProjectionMatrix();
    return state;
  }

  destroy() { this.keyframes.length = 0; this.controls = null; this.camera = null; }
}


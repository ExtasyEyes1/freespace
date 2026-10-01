import * as THREE from 'three';
import {clamp, lerp, easeOutQuint} from '../utils/easing.js';

export class BaseScene {
  constructor(stage, {id, group, focus = [], light = '#ffd59d', ambient = '#a4b8da', intensity = 3.2, fog = .014}) {
    this.stage = stage;
    this.id = id;
    this.group = stage.model.groups[group] || new THREE.Group();
    this.focus = focus;
    this.light = new THREE.Color(light);
    this.ambient = new THREE.Color(ambient);
    this.intensity = intensity;
    this.fog = fog;
    this.opacity = id === 'contact' ? 0 : 1;
    this.scale = id === 'hero' ? 1 : .001;
    this.materials = [];
    this.active = false;
    this.ownsGroup = false;
    this.build();
  }

  build() {
    this.group.traverse(object => {
      const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
      materials.forEach(material => {
        if (!this.materials.some(item => item.material === material)) this.materials.push({material, baseOpacity:material.opacity});
      });
    });
    return this.group;
  }

  profile() {
    const all = this.id === 'hero' || this.id === 'pricing';
    const result = {structure:all ? 1 : .28, floors:all ? 1 : .9, decor:all ? 1 : .08, phone:all ? 1 : .025, logo:0};
    for (const id of ['open','meeting','quiet','kitchen','lounge']) result[id] = all || this.focus.includes(id) ? 1 : .025;
    if (this.id === 'contact') Object.keys(result).forEach(key => result[key] = key === 'logo' ? 1 : .025);
    return result;
  }

  onEnter() { this.active = true; this.enteredAt = performance.now(); }
  onLeave() { this.active = false; }

  update(progress, {opacity = 1, dt = .016, reduced = false, intro = 1} = {}) {
    const smoothing = reduced ? 1 : 1 - Math.exp(-dt * 12);
    this.opacity = lerp(this.opacity, opacity, smoothing);
    const desiredScale = this.id === 'hero' || this.id === 'contact' ? 1 : lerp(.001, 1, easeOutQuint(clamp(opacity))) * intro;
    this.scale = reduced ? desiredScale : lerp(this.scale, desiredScale, smoothing);
    this.group.scale.y = Math.max(.001, this.scale);
    this.group.visible = this.opacity > .004;
    for (const {material, baseOpacity} of this.materials) {
      material.transparent = true;
      material.opacity = baseOpacity * this.opacity;
      material.depthWrite = this.opacity > .95 && baseOpacity > .95;
    }
    this.progress = progress;
  }

  destroy(resources = {geometries:new Set(),materials:new Set(),textures:new Set()}) {
    this.onLeave();
    // Общую геометрию освобождает Scene3D один раз. Для независимой сцены ownsGroup=true.
    if (this.ownsGroup) this.group.traverse(object => {
      if (object.geometry && !resources.geometries.has(object.geometry)) {resources.geometries.add(object.geometry);object.geometry.dispose();}
      for (const material of object.material ? (Array.isArray(object.material)?object.material:[object.material]) : []) {
        if (material.map && !resources.textures.has(material.map)) {resources.textures.add(material.map);material.map.dispose();}
        if (!resources.materials.has(material)) {resources.materials.add(material);material.dispose();}
      }
    });
    this.materials.length = 0;
    this.stage = null;
  }
}

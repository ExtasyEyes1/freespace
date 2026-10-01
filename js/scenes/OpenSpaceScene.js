import {BaseScene} from './BaseScene.js';
export class OpenSpaceScene extends BaseScene {
  constructor(stage) {super(stage,{id:'open',group:'open',focus:['open'],light:'#f5c77e',fog:.012});}
  update(progress, options) {
    // Мебель плавно вырастает вместе с opacity; матрицы InstancedMesh не пересоздаются.
    super.update(progress,options);
    this.group.position.y = options.reduced ? 0 : -.04 * (1 - this.scale);
  }
}

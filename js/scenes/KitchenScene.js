import {BaseScene} from './BaseScene.js';
export class KitchenScene extends BaseScene {
  constructor(stage) {super(stage,{id:'kitchen',group:'kitchen',focus:['kitchen','lounge'],light:'#f5b881',ambient:'#c1a395',intensity:3.4,fog:.012});}
}

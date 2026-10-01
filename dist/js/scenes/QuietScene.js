import {BaseScene} from './BaseScene.js';
export class QuietScene extends BaseScene {
  constructor(stage) {super(stage,{id:'quiet',group:'quiet',focus:['quiet'],light:'#a6c5ff',ambient:'#829ac9',intensity:2.4,fog:.021});}
}

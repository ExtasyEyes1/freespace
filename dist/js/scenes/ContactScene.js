import * as THREE from 'three';
import {BaseScene} from './BaseScene.js';
export class ContactScene extends BaseScene {
  constructor(stage) {super(stage,{id:'contact',group:'logo',light:'#f5c77e',intensity:.5,fog:.027});}
  build() {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const context=canvas.getContext('2d');
    context.font='500 130px Arial, sans-serif';context.textAlign='center';context.textBaseline='middle';
    context.shadowColor='#f5c77e';context.shadowBlur=18;context.fillStyle='#f5c77e';context.fillText('free space',512,125);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    this.logo=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#ffffff',transparent:true,depthTest:false}));
    this.logo.position.set(0,1.7,0);this.logo.scale.set(8,2,1);this.logo.renderOrder=4;this.group.add(this.logo);
    return super.build();
  }
  update(progress, options) {
    super.update(progress,options);
    const pulse=options.reduced ? 1 : 1 + Math.sin(performance.now()*.0018)*.018;
    this.logo.scale.set(8*pulse,2*pulse,1);
  }
}

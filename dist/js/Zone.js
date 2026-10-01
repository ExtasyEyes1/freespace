import {lerp} from './utils/easing.js';
export class Zone {
 constructor(data){Object.assign(this,data);this.active=false;this.allowed=true;this.mesh=null;}
 attach(mesh){this.mesh=mesh;mesh.userData.zoneId=this.id;this.update();this.tick(1,true);}
 highlight(active=true){this.active=active;this.update();}
 select(){this.highlight(true);return this;}
 filter(plan){this.allowed=this.plans.includes(plan)&&(plan!=='team'||['open','meeting'].includes(this.id));this.update();}
 update(){if(!this.mesh)return;this.targetIntensity=this.allowed?(this.active?.75:.2):.025;this.targetColor=this.mesh.material.color.clone().set(!this.free&&!this.shared?'#4d5663':this.color).multiplyScalar(this.allowed?.42:.18);}
 tick(dt,reduced=false,opacity=1,focus=1){if(!this.mesh)return;const smoothing=reduced?1:1-Math.exp(-dt*14),material=this.mesh.material;material.color.lerp(this.targetColor,smoothing);material.emissiveIntensity=lerp(material.emissiveIntensity,this.targetIntensity*(this.active?1:focus),smoothing);material.opacity=lerp(material.opacity,(this.allowed?1:.45)*opacity,smoothing);this.mesh.position.y=lerp(this.mesh.position.y,.085+(this.active?.085:0),smoothing);}
 renderCard(){return {id:this.id,name:this.name,description:this.description,free:this.free,total:this.total,shared:!!this.shared};}
}

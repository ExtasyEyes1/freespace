export class Zone {
 constructor(data){Object.assign(this,data);this.active=false;this.allowed=true;this.mesh=null}
 attach(mesh){this.mesh=mesh;mesh.userData.zoneId=this.id;this.update()}
 highlight(active=true){this.active=active;this.update()}
 select(){this.highlight(true);return this}
 filter(plan){this.allowed=this.plans.includes(plan)&&(plan!=='team'||['open','meeting'].includes(this.id));this.update()}
 update(){if(!this.mesh)return;const m=this.mesh.material;m.emissiveIntensity=this.allowed?(this.active?.65:.14):.025;m.opacity=this.allowed?1:.45;m.color.set(!this.free&&!this.shared?'#4d5663':this.color).multiplyScalar(this.allowed?.42:.18)}
 renderCard(){return {id:this.id,name:this.name,description:this.description,free:this.free,total:this.total,shared:!!this.shared}}
}

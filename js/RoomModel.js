import * as THREE from 'three';
// Модель строится один раз. Группы разделяют структуру и мебель каждой рабочей зоны.
export class RoomModel {
 constructor(scene,zones){
  this.scene=scene;this.zones=zones;this.groups={};this.windows=[];this.pickable=[];this.lights=[];
  for(const id of ['structure','floors','open','meeting','quiet','kitchen','lounge','phone','decor','logo']){
   const group=new THREE.Group();group.name=id;this.groups[id]=group;scene.add(group);
  }
  this.build();
 }
 classify(x,z){return this.zones.find(zone=>Math.abs(x-zone.x)<=zone.w/2+.15&&Math.abs(z-zone.z)<=zone.d/2+.15)?.id||'decor';}
 add(object,id){
  if(!id){const size=object.geometry?.parameters||{};id=(size.width>7||size.depth>7||object.material?.isShadowMaterial)?'structure':this.classify(object.position.x,object.position.z);}
  this.groups[id].add(object);return object;
 }
 material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,...extra})}
 box(w,h,d,x,y,z,color,extra={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.material(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.add(m);return m}

 build(){
  this.box(13,.5,10.5,0,-.35,0,'#3e4b63');this.box(12.5,.15,10,0,-.025,0,'#665e53');
  this.box(13,2.7,.18,0,1.1,-5.15,'#667184');this.box(.18,2.7,10.5,-6.45,1.1,0,'#4d5a72');
  this.box(13,.14,.14,0,2.48,-5.15,'#9aa4b5');this.box(.14,.14,10.5,-6.45,2.48,0,'#9aa4b5');
  // Светящиеся окна, без тяжёлых текстур и постобработки.
  this.windowMaterial=this.material('#c6aa7d',{emissive:'#f5c77e',emissiveIntensity:.9});
  for(let x=-5.4;x<6;x+=1.4){const w=new THREE.Mesh(new THREE.BoxGeometry(.95,1.7,.03),this.windowMaterial.clone());w.position.set(x,1.32,-5.03);this.add(w,"structure");this.windows.push(w);w.userData.phase=this.windows.length*1.7;this.box(.04,1.75,.07,x,1.32,-4.99,'#344359');this.box(1,.055,.12,x,1.15,-4.96,'#344359')}
  for(let z=-3.8;z<4.8;z+=1.8){const w=new THREE.Mesh(new THREE.BoxGeometry(.03,1.7,1.25),this.windowMaterial.clone());w.position.set(-6.34,1.32,z);this.add(w,"structure");this.windows.push(w);w.userData.phase=this.windows.length*1.7;this.box(.07,1.75,.04,-6.3,1.32,z,'#344359')}
  for(const zone of this.zones){const m=new THREE.Mesh(new THREE.BoxGeometry(zone.w,.055,zone.d),this.material(zone.color,{emissive:zone.color,emissiveIntensity:.15,transparent:true}));m.position.set(zone.x,.085,zone.z);m.receiveShadow=true;this.add(m,"floors");zone.attach(m);this.pickable.push(m);const light=new THREE.PointLight(zone.color,4.5,6,2);light.position.set(zone.x,2.3,zone.z);this.scene.add(light);light.userData.zoneId=zone.id;this.lights.push(light)}
  this.box(.13,1.65,3.85,-.75,.86,-3,'#526c7a',{transparent:true,opacity:.55});this.box(.13,1.65,3.85,3.22,.86,-3,'#587f7a',{transparent:true,opacity:.55});this.box(9.6,.7,.1,-1.5,.43,-1,'#586378');
  const desks=[];for(const z of [.3,2.5])for(const x of [-4.2,-1.9])desks.push([x,.83,z,1.85,.12,.9]);for(const x of [-4.6,-3,-1.4])desks.push([x,.83,-3.4,1.1,.1,.9]);desks.push([1.2,.83,-3.1,2.55,.12,1.5]);this.instances(desks,'#c5a484');
  const legs=[],chairs=[];for(let [x,y,z,w,,d] of desks){for(let dx of [-w*.38,w*.38])for(let dz of [-d*.32,d*.32])legs.push([x+dx,.42,z+dz,.07,.8,.07]);for(const dz of [-d/2-.32,d/2+.32]){chairs.push([x,.48,z+dz,.55,.12,.5]);chairs.push([x,.78,z+dz+(dz>0?.2:-.2),.55,.55,.1])}}this.instances(legs,'#343d4b');this.instances(chairs,'#5c6e85');
  const laptops=[];for(const [x,,z] of desks){laptops.push([x,.94,z,.5,.025,.35]);laptops.push([x,1.1,z-.14,.5,.3,.025])}this.instances(laptops,'#a3bec8');
  // Диван, кухня, кабины и маленькие детали делают план читаемым как реальное место.
  this.box(4,.6,1.1,3.2,.5,3.2,'#8b849c');this.box(4,.7,.18,3.2,.95,3.65,'#736d86');for(let x of [1.27,5.13])this.box(.18,.6,1.2,x,.77,3.2,'#736d86');this.box(2,.12,.8,3.2,.49,1.9,'#c9a783');this.box(.14,.46,.14,3.2,.23,1.9,'#4d535d');this.box(1.35,1.0,3,4.9,.53,-3.1,'#9b826e');this.box(1.47,.09,3.1,4.9,1.08,-3.1,'#d1c8b4');this.box(.45,.52,.42,4.9,1.38,-3.65,'#323c50');this.box(.32,.23,.25,4.9,1.25,-2.7,'#d5dad9');
  for(const x of [1.4,3.2,5]){this.box(1.35,1.8,.12,x,.95,-.95,'#355452');this.box(.1,1.8,1.7,x-.68,.95,-.15,'#58726f');this.box(.1,1.8,1.7,x+.68,.95,-.15,'#58726f');this.box(1.35,.1,1.7,x,1.88,-.15,'#6f8c88');this.box(.8,.09,.45,x,.95,-.6,'#cab792')}
  for(let [x,z] of [[-5.7,4.3],[-5.5,-.7],[5.7,4.2],[5.8,-4.5],[.2,-4.6]])this.plant(x,z);
  this.box(.6,1.7,2,-5.95,.95,2,'#8f765e');for(const y of [.45,.85,1.25,1.65]){this.box(.62,.065,2.04,-5.93,y,2,'#c0a282');for(let i=0;i<5;i++)this.box(.38,.25,.09,-5.86,y+.16,1.3+i*.28,['#839788','#a28c79','#667d9d'][i%3])}
  for(let [x,z,color] of [[-4.2,.9,'#d4ba94'],[-1.9,3.1,'#879fb5'],[-3,-2.6,'#b4aaa0'],[1.2,-2.1,'#80b4a6']]){const p=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.35,3,6),this.material(color));p.position.set(x,.93,z);p.castShadow=true;this.add(p)}
  // Повторяющиеся столы, стулья, ножки и лампы используют InstancedMesh.
  const lamps=[];for(let [x,,z] of desks){lamps.push([x+.6,1.03,z,.035,.36,.035]);lamps.push([x+.6,1.24,z,.35,.035,.15])}this.instances(lamps,'#efd09a');
  for(let i=0;i<3;i++)this.box(1.8,.15,.45,-.5,-.42-i*.15,5.35+i*.38,'#607085');
  const base=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.2}));base.rotation.x=-Math.PI/2;base.position.y=-1;base.receiveShadow=true;this.add(base);
 }
 instances(items,color){
  const batches=new Map();
  for(const item of items){const id=this.classify(item[0],item[2]);if(!batches.has(id))batches.set(id,[]);batches.get(id).push(item);}
  // Каждый повторяющийся предмет остаётся instanced, но принадлежит своей зоне.
  for(const [id,batch] of batches){
   const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.material(color),batch.length);
   const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion();
   batch.forEach(([x,y,z,w,h,d],i)=>{matrix.compose(new THREE.Vector3(x,y,z),quaternion,new THREE.Vector3(w,h,d));inst.setMatrixAt(i,matrix);});
   inst.castShadow=true;inst.receiveShadow=true;this.add(inst,id);
  }
 }
 plant(x,z){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.26,.21,.45,6),this.material('#be9a75'));pot.position.set(x,.3,z);pot.castShadow=true;this.add(pot);for(let i=0;i<3;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.32,.85,5),this.material(['#668b76','#759e80','#466b5b'][i]));leaf.position.set(x+(i-1)*.16,.83+i*.09,z);leaf.rotation.z=(i-1)*.25;leaf.castShadow=true;this.add(leaf)}}

}

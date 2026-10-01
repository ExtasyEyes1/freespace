import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';
import {Zone} from './Zone.js';

export class Scene3D {
 constructor(container,data,{onSelect,onHover,onFailure}){
  this.container=container;this.onSelect=onSelect;this.onHover=onHover;this.onFailure=onFailure;this.zones=data.map(d=>new Zone(d));this.disposed=false;this.visible=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.abort=new AbortController();this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.pickable=[];this.lights=[];
  // Ортографическая камера и простая геометрия сохраняют изометрию без перспективы.
  this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2('#0b1220',.014);this.camera=new THREE.OrthographicCamera(-10,10,6.4,-6.4,.1,100);this.camera.position.set(10,10,10);
  try{this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=innerWidth>1200;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;container.append(this.renderer.domElement);
   this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.4,0);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.enableRotate=innerWidth>1200;this.controls.enableZoom=innerWidth>767;this.controls.minZoom=.85;this.controls.maxZoom=2.3;this.lockAngle(Math.acos(1/Math.sqrt(3)));this.controls.update();
   this.ambient=new THREE.AmbientLight('#a4b8da',1.5);this.scene.add(this.ambient);this.sun=new THREE.DirectionalLight('#ffd59d',3.2);this.sun.position.set(-3,12,7);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9});this.sun.shadow.bias=-.0007;this.sun.shadow.normalBias=.05;this.scene.add(this.sun);this.scene.add(new THREE.HemisphereLight('#bed8f5','#25243a',1.4));this.build();this.bind();this.resize();this.animate();
  }catch(error){this.destroy();throw error}
 }
 material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,...extra})}
 box(w,h,d,x,y,z,color,extra={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.material(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m}
 lockAngle(a){this.controls.minPolarAngle=a;this.controls.maxPolarAngle=a}
 build(){
  this.box(13,.5,10.5,0,-.35,0,'#3e4b63');this.box(12.5,.15,10,0,-.025,0,'#665e53');
  this.box(13,2.7,.18,0,1.1,-5.15,'#667184');this.box(.18,2.7,10.5,-6.45,1.1,0,'#4d5a72');
  this.box(13,.14,.14,0,2.48,-5.15,'#9aa4b5');this.box(.14,.14,10.5,-6.45,2.48,0,'#9aa4b5');
  // Светящиеся окна, без тяжёлых текстур и постобработки.
  this.windowMaterial=new THREE.MeshBasicMaterial({color:'#f5c77e'});
  for(let x=-5.4;x<6;x+=1.4){const w=new THREE.Mesh(new THREE.BoxGeometry(.95,1.7,.03),this.windowMaterial);w.position.set(x,1.32,-5.03);this.scene.add(w);this.box(.04,1.75,.07,x,1.32,-4.99,'#344359');this.box(1,.055,.12,x,1.15,-4.96,'#344359')}
  for(let z=-3.8;z<4.8;z+=1.8){const w=new THREE.Mesh(new THREE.BoxGeometry(.03,1.7,1.25),this.windowMaterial);w.position.set(-6.34,1.32,z);this.scene.add(w);this.box(.07,1.75,.04,-6.3,1.32,z,'#344359')}
  for(const zone of this.zones){const m=new THREE.Mesh(new THREE.BoxGeometry(zone.w,.055,zone.d),this.material(zone.color,{emissive:zone.color,emissiveIntensity:.15,transparent:true}));m.position.set(zone.x,.085,zone.z);m.receiveShadow=true;this.scene.add(m);zone.attach(m);this.pickable.push(m);const light=new THREE.PointLight(zone.color,4.5,6,2);light.position.set(zone.x,2.3,zone.z);this.scene.add(light);this.lights.push(light)}
  this.box(.13,1.65,3.85,-.75,.86,-3,'#526c7a',{transparent:true,opacity:.55});this.box(.13,1.65,3.85,3.22,.86,-3,'#587f7a',{transparent:true,opacity:.55});this.box(9.6,.7,.1,-1.5,.43,-1,'#586378');
  const desks=[];for(const z of [.3,2.5])for(const x of [-4.2,-1.9])desks.push([x,.83,z,1.85,.12,.9]);for(const x of [-4.6,-3,-1.4])desks.push([x,.83,-3.4,1.1,.1,.9]);desks.push([1.2,.83,-3.1,2.55,.12,1.5]);this.instances(desks,'#c5a484');
  const legs=[],chairs=[];for(let [x,y,z,w,,d] of desks){for(let dx of [-w*.38,w*.38])for(let dz of [-d*.32,d*.32])legs.push([x+dx,.42,z+dz,.07,.8,.07]);for(const dz of [-d/2-.32,d/2+.32]){chairs.push([x,.48,z+dz,.55,.12,.5]);chairs.push([x,.78,z+dz+(dz>0?.2:-.2),.55,.55,.1])}}this.instances(legs,'#343d4b');this.instances(chairs,'#5c6e85');
  const laptops=[];for(const [x,,z] of desks){laptops.push([x,.94,z,.5,.025,.35]);laptops.push([x,1.1,z-.14,.5,.3,.025])}this.instances(laptops,'#a3bec8');
  // Диван, кухня, кабины и маленькие детали делают план читаемым как реальное место.
  this.box(4,.6,1.1,3.2,.5,3.2,'#8b849c');this.box(4,.7,.18,3.2,.95,3.65,'#736d86');for(let x of [1.27,5.13])this.box(.18,.6,1.2,x,.77,3.2,'#736d86');this.box(2,.12,.8,3.2,.49,1.9,'#c9a783');this.box(.14,.46,.14,3.2,.23,1.9,'#4d535d');this.box(1.35,1.0,3,4.9,.53,-3.1,'#9b826e');this.box(1.47,.09,3.1,4.9,1.08,-3.1,'#d1c8b4');this.box(.45,.52,.42,4.9,1.38,-3.65,'#323c50');this.box(.32,.23,.25,4.9,1.25,-2.7,'#d5dad9');
  for(const x of [1.4,3.2,5]){this.box(1.35,1.8,.12,x,.95,-.95,'#355452');this.box(.1,1.8,1.7,x-.68,.95,-.15,'#58726f');this.box(.1,1.8,1.7,x+.68,.95,-.15,'#58726f');this.box(1.35,.1,1.7,x,1.88,-.15,'#6f8c88');this.box(.8,.09,.45,x,.95,-.6,'#cab792')}
  for(let [x,z] of [[-5.7,4.3],[-5.5,-.7],[5.7,4.2],[5.8,-4.5],[.2,-4.6]])this.plant(x,z);
  this.box(.6,1.7,2,-5.95,.95,2,'#8f765e');for(const y of [.45,.85,1.25,1.65]){this.box(.62,.065,2.04,-5.93,y,2,'#c0a282');for(let i=0;i<5;i++)this.box(.38,.25,.09,-5.86,y+.16,1.3+i*.28,['#839788','#a28c79','#667d9d'][i%3])}
  for(let [x,z,color] of [[-4.2,.9,'#d4ba94'],[-1.9,3.1,'#879fb5'],[-3,-2.6,'#b4aaa0'],[1.2,-2.1,'#80b4a6']]){const p=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.35,3,6),this.material(color));p.position.set(x,.93,z);p.castShadow=true;this.scene.add(p)}
  // Повторяющиеся столы, стулья, ножки и лампы используют InstancedMesh.
  const lamps=[];for(let [x,,z] of desks){lamps.push([x+.6,1.03,z,.035,.36,.035]);lamps.push([x+.6,1.24,z,.35,.035,.15])}this.instances(lamps,'#efd09a');
  for(let i=0;i<3;i++)this.box(1.8,.15,.45,-.5,-.42-i*.15,5.35+i*.38,'#607085');
  const base=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.2}));base.rotation.x=-Math.PI/2;base.position.y=-1;base.receiveShadow=true;this.scene.add(base);
 }
 instances(items,color){const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.material(color),items.length);const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion();items.forEach(([x,y,z,w,h,d],i)=>{matrix.compose(new THREE.Vector3(x,y,z),quaternion,new THREE.Vector3(w,h,d));inst.setMatrixAt(i,matrix)});inst.castShadow=true;inst.receiveShadow=true;this.scene.add(inst);return inst}
 plant(x,z){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.26,.21,.45,6),this.material('#be9a75'));pot.position.set(x,.3,z);pot.castShadow=true;this.scene.add(pot);for(let i=0;i<3;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.32,.85,5),this.material(['#668b76','#759e80','#466b5b'][i]));leaf.position.set(x+(i-1)*.16,.83+i*.09,z);leaf.rotation.z=(i-1)*.25;leaf.castShadow=true;this.scene.add(leaf)}}
 hit(event){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.intersectObjects(this.pickable)[0]?.object.userData.zoneId}
 bind(){const options={signal:this.abort.signal};
  // Raycaster связывает указатель с плоскостями зон. Перетаскивание не считается кликом.
  this.renderer.domElement.addEventListener('pointermove',e=>{const id=this.hit(e);this.highlight(id);this.renderer.domElement.style.cursor=id?'pointer':'grab';this.onHover?.(id,e)},options);
  this.renderer.domElement.addEventListener('pointerleave',()=>{this.highlight(this.selected);this.onHover?.(null)},options);
  this.renderer.domElement.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];this.transition=null},options);
  this.renderer.domElement.addEventListener('pointerup',e=>{if(this.down&&Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])<5){const id=this.hit(e);if(id)this.onSelect(id)}this.down=null},options);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onFailure?.()},options);
  addEventListener('resize',()=>this.resize(),options);document.addEventListener('visibilitychange',()=>this.running(),options);this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.running()});this.observer.observe(this.container);this.sizeObserver=new ResizeObserver(()=>this.resize());this.sizeObserver.observe(this.container)
 }
 resize(){if(this.disposed)return;const {width,height}=this.container.getBoundingClientRect();const a=width/height;this.camera.left=-6.4*a;this.camera.right=6.4*a;this.camera.top=6.4;this.camera.bottom=-6.4;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);this.controls.enableRotate=innerWidth>1200;this.controls.enableZoom=innerWidth>767}
 highlight(id){this.zones.forEach(z=>z.highlight(z.id===id))}
 filter(plan){this.zones.forEach(z=>z.filter(plan))}
 select(id){const z=this.zones.find(z=>z.id===id);if(!z)return;this.selected=id;z.select();this.highlight(id);this.moveTo(new THREE.Vector3(z.x*.45,.4,z.z*.45),1.28)}
 // Интерполяция центра и зума; reduced-motion применяет конечный ракурс сразу.
 moveTo(target,zoom){if(this.reduced.matches){const delta=target.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(target);this.camera.zoom=zoom;this.camera.updateProjectionMatrix();this.controls.update();this.transition=null;return}this.transition={start:performance.now(),from:this.controls.target.clone(),to:target,zoomFrom:this.camera.zoom,zoomTo:zoom}}
 setView(view){this.transition=null;const target=this.controls.target.clone();const position=view==='top'?new THREE.Vector3(0,17,.01):view==='side'?new THREE.Vector3(12,7,12):new THREE.Vector3(10,10,10);this.lockAngle(Math.acos(position.y/position.length()));this.camera.position.copy(position.add(target));this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update()}
 reset(){this.selected=null;this.highlight(null);this.setView('iso');this.moveTo(new THREE.Vector3(0,.4,0),1)}
 setLight(mode){const day=mode==='day';this.ambient.intensity=day?2.8:1.5;this.sun.intensity=day?4:3.2;this.sun.color.set(day?'#ffffff':'#ffd59d');this.windowMaterial.color.set(day?'#c8d9df':'#f5c77e');this.lights.forEach(l=>l.intensity=day?1.8:4.5);this.renderer.toneMappingExposure=day?1.55:1.25}
 animate=()=>{if(this.disposed||!this.visible||document.hidden)return;this.frame=requestAnimationFrame(this.animate);if(this.transition){const tr=this.transition,t=Math.min((performance.now()-tr.start)/650,1),e=1-Math.pow(1-t,3);const old=this.controls.target.clone();this.controls.target.lerpVectors(tr.from,tr.to,e);this.camera.position.add(this.controls.target.clone().sub(old));this.camera.zoom=THREE.MathUtils.lerp(tr.zoomFrom,tr.zoomTo,e);this.camera.updateProjectionMatrix();if(t===1)this.transition=null}this.controls.update();this.renderer.render(this.scene,this.camera)};
 running(){cancelAnimationFrame(this.frame);if(this.visible&&!document.hidden&&!this.disposed)this.animate()}
 // destroy() освобождает GPU-ресурсы, наблюдателей и все обработчики событий.
 destroy(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.abort?.abort();this.observer?.disconnect();this.sizeObserver?.disconnect();this.controls?.dispose();const geometries=new Set(),materials=new Set();this.scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer?.dispose();this.renderer?.domElement.remove()}
}

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';
import {Zone} from './Zone.js';
import {RoomModel} from './RoomModel.js';
import {CameraRig} from './CameraRig.js';
import {createScenes} from './scenes/index.js';
import {clamp, lerp, easeOutQuint} from './utils/easing.js';

export class Scene3D {
  constructor(container,data,{onSelect,onHover,onFailure}={}) {
    this.container=container;this.onSelect=onSelect;this.onHover=onHover;this.onFailure=onFailure;
    this.zones=data.map(zone=>new Zone(zone));this.abort=new AbortController();
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    this.lowPower=!!navigator.hardwareConcurrency&&navigator.hardwareConcurrency<4;
    this.disposed=false;this.visible=true;this.manual=false;this.mode='night';this.time=0;
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2('#0b1220',.014);
    this.camera=new THREE.OrthographicCamera(-10,10,6.4,-6.4,.1,100);this.camera.position.set(10,10,10);
    try {
      this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:!this.lowPower,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.lowPower?1:2));
      this.renderer.shadowMap.enabled=!this.lowPower&&innerWidth>1200;
      this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
      this.renderer.domElement.setAttribute('aria-hidden','true');container.append(this.renderer.domElement);
      this.controls=new OrbitControls(this.camera,this.renderer.domElement);
      this.controls.target.set(0,.4,0);this.controls.enableDamping=true;this.controls.enablePan=false;
      this.controls.minZoom=.85;this.controls.maxZoom=innerWidth<768?1.6:2.3;
      this.lockAngle(Math.acos(1/Math.sqrt(3)));this.controls.update();
      this.cameraRig=new CameraRig(this.camera,this.controls);
      this.ambient=new THREE.AmbientLight('#a4b8da',1.5);this.scene.add(this.ambient);
      this.sun=new THREE.DirectionalLight('#ffd59d',3.2);this.sun.position.set(-3,12,7);
      this.sun.castShadow=!this.lowPower;this.sun.shadow.mapSize.set(1024,1024);
      Object.assign(this.sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9});this.sun.shadow.bias=-.0007;this.sun.shadow.normalBias=.05;this.scene.add(this.sun);
      this.scene.add(new THREE.HemisphereLight('#bed8f5','#25243a',1.4));
      this.model=new RoomModel(this.scene,this.zones);this.pickable=this.model.pickable;
      this.views=createScenes(this);this.people=[];
      this.scene.traverse(object=>{if(object.geometry?.type==='CapsuleGeometry'){object.userData.baseY=object.position.y;this.people.push(object);}});
      if(!this.lowPower)this.createDust();
      this.startedAt=performance.now();this.bind();this.resize();this.running();
    } catch(error) {this.destroy();throw error;}
  }

  createDust() {
    const positions=new Float32Array(96*3);
    for(let i=0;i<positions.length;i+=3){positions[i]=(Math.random()-.5)*12;positions[i+1]=.5+Math.random()*2.2;positions[i+2]=(Math.random()-.5)*9;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.dust=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#f5c77e',size:.022,transparent:true,opacity:.28,depthWrite:false,sizeAttenuation:true}));
    this.dust.name='light-dust';this.model.groups.decor.add(this.dust);
  }

  lockAngle(angle) {this.controls.minPolarAngle=angle;this.controls.maxPolarAngle=angle;}

  mount(container) {
    if(this.disposed||this.container===container)return;
    this.container=container;container.append(this.renderer.domElement);
    this.observer.disconnect();this.observer.observe(container);
    this.sizeObserver.disconnect();this.sizeObserver.observe(container);
    const rect=container.getBoundingClientRect();this.visible=rect.bottom>0&&rect.top<innerHeight;
    this.resize();this.running();
  }

  hit(event) {
    if(this.scrollState?.activeId==='contact')return null;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    return this.raycaster.intersectObjects(this.pickable).find(hit=>hit.object.material.opacity>.08)?.object.userData.zoneId;
  }

  bind() {
    const options={signal:this.abort.signal},canvas=this.renderer.domElement;
    // Raycaster работает в координатах текущего host: один canvas перемещается по странице.
    canvas.addEventListener('pointermove',e=>{const id=this.hit(e);this.highlight(id);canvas.style.cursor=id?'pointer':'grab';this.onHover?.(id,e);},options);
    canvas.addEventListener('pointerleave',()=>{this.highlight(this.selected);this.onHover?.(null);},options);
    canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];this.transition=null;this.enterManual();},options);
    canvas.addEventListener('pointerup',e=>{if(this.down&&Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])<5){const id=this.hit(e);if(id)this.onSelect?.(id);}this.down=null;},options);
    canvas.addEventListener('wheel',()=>this.enterManual(),{...options,passive:true});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onFailure?.();},options);
    addEventListener('resize',()=>this.resize(),options);
    document.addEventListener('visibilitychange',()=>this.running(),options);
    this.reduced.addEventListener('change',()=>{this.transition=null;this.currentProgress=this.targetProgress;this.running();},options);
    this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.running();});this.observer.observe(this.container);
    this.sizeObserver=new ResizeObserver(()=>this.resize());this.sizeObserver.observe(this.container);
  }

  resize() {
    if(this.disposed)return;
    const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;
    const aspect=width/height;this.camera.left=-6.4*aspect;this.camera.right=6.4*aspect;this.camera.top=6.4;this.camera.bottom=-6.4;
    this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);
    this.controls.enableRotate=innerWidth>1200;this.controls.maxZoom=innerWidth<768?1.6:2.3;
    this.renderer.shadowMap.enabled=!this.lowPower&&innerWidth>1200;
  }

  update(state) {
    const changed=this.scrollState?.activeId!==state.activeId;
    if(changed||Math.abs((this.targetProgress??0)-state.globalProgress)>.00001){this.manual=false;this.transition=null;this.controls.enabled=false;}
    if(changed){this.views[this.scrollState?.activeId]?.onLeave();this.views[state.activeId]?.onEnter();}
    this.scrollState=state;this.targetProgress=state.globalProgress;
    if(this.currentProgress===undefined||this.reduced.matches)this.currentProgress=state.globalProgress;
    if(!this.visible||document.hidden)this.applyScroll(0);
    if(!this.frame)this.running();
  }

  applyScroll(dt) {
    if(!this.scrollState)return;
    const reduced=this.reduced.matches;
    this.currentProgress=reduced?this.targetProgress:lerp(this.currentProgress,this.targetProgress,1-Math.exp(-dt*10));
    const sample=this.manual?this.cameraRig.sample(this.currentProgress):this.cameraRig.setProgress(this.currentProgress);
    if(!sample)return;
    const a=this.views[sample.from],b=this.views[sample.to];if(!a||!b)return;
    const ap=this.manual?this.views.hero.profile():a.profile(),bp=this.manual?ap:b.profile();
    const profile=Object.fromEntries(Object.keys(ap).map(id=>[id,lerp(ap[id],bp[id],sample.mix)]));
    const intro=reduced?1:easeOutQuint(clamp((performance.now()-this.startedAt)/850));
    for(const view of Object.values(this.views)) {
      const name=view.group.name;
      view.update(this.scrollState.sectionProgress,{opacity:profile[name],dt,reduced,intro});
    }
    for(const name of ['lounge','phone'])this.fadeGroup(this.model.groups[name],profile[name],dt,intro);
    this.model.groups.floors.visible=profile.floors>.015;
    this.zones.forEach(zone=>zone.tick(dt,reduced,profile.floors,Math.max(.25,profile[zone.id]??1)));
    const light=new THREE.Color().lerpColors(a.light,b.light,sample.mix);
    const ambient=new THREE.Color().lerpColors(a.ambient,b.ambient,sample.mix);
    if(this.mode==='day'){light.lerp(new THREE.Color('#ffffff'),.8);ambient.lerp(new THREE.Color('#c4d8e9'),.6);}
    this.sun.color.copy(light);this.ambient.color.copy(ambient);
    this.sun.intensity=lerp(a.intensity,b.intensity,sample.mix)*(this.mode==='day'?1.3:1);
    this.ambient.intensity=lerp(a.id==='contact'?.55:1.5,b.id==='contact'?.55:1.5,sample.mix)*(this.mode==='day'?1.7:1);
    this.scene.fog.density=lerp(a.fog,b.fog,sample.mix);
    this.model.lights.forEach(light=>{const focus=profile[light.userData.zoneId]??1;light.intensity=(this.mode==='day'?1.8:4.5)*focus;});
  }

  fadeGroup(group,opacity,dt,intro) {
    const state=group.userData,smoothing=this.reduced.matches?1:1-Math.exp(-dt*12);
    state.opacity=lerp(state.opacity??1,opacity,smoothing);state.scale=lerp(state.scale??.001,Math.max(.001,easeOutQuint(opacity)*intro),smoothing);
    group.visible=state.opacity>.004;group.scale.y=state.scale;
    group.traverse(object=>{if(!object.material)return;const m=object.material;if(m.userData.baseOpacity===undefined)m.userData.baseOpacity=m.opacity;m.transparent=true;m.opacity=m.userData.baseOpacity*state.opacity;m.depthWrite=state.opacity>.95;});
  }

  enterManual() {
    this.manual=true;this.controls.enabled=true;
    const offset=this.camera.position.clone().sub(this.controls.target);this.lockAngle(Math.acos(clamp(offset.y/offset.length(),-1,1)));
  }
  highlight(id) {this.zones.forEach(zone=>zone.highlight(zone.id===id));}
  filter(plan) {this.plan=plan;this.zones.forEach(zone=>zone.filter(plan));}
  select(id) {const zone=this.zones.find(zone=>zone.id===id);if(!zone)return;this.selected=id;this.highlight(id);this.enterManual();this.moveTo(new THREE.Vector3(zone.x,.5,zone.z),innerWidth<768?1.4:1.65);}

  moveTo(target,zoom) {
    if(this.reduced.matches){this.camera.position.add(target.clone().sub(this.controls.target));this.controls.target.copy(target);this.camera.zoom=zoom;this.camera.updateProjectionMatrix();this.controls.update();this.transition=null;return;}
    this.transition={start:performance.now(),from:this.controls.target.clone(),to:target,zoomFrom:this.camera.zoom,zoomTo:zoom};
  }

  setView(view) {
    this.enterManual();this.transition=null;
    const target=this.controls.target.clone();
    const offset=view==='top'?new THREE.Vector3(0,17,.01):view==='side'?new THREE.Vector3(12,7,12):new THREE.Vector3(10,10,10);
    this.lockAngle(Math.acos(offset.y/offset.length()));this.camera.position.copy(target.add(offset));this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();
  }
  reset() {this.selected=null;this.highlight(null);this.setView('iso');this.moveTo(new THREE.Vector3(0,.4,0),1);}
  setLight(mode) {this.mode=mode;this.renderer.toneMappingExposure=mode==='day'?1.5:1.25;}

  animate = time => {
    if(this.disposed||!this.visible||document.hidden)return;
    this.frame=requestAnimationFrame(this.animate);
    const dt=Math.min((time-(this.lastFrame??time))/1000,.05);this.lastFrame=time;this.time+=dt;
    this.applyScroll(dt);
    if(this.transition){const tr=this.transition,t=clamp((performance.now()-tr.start)/650),mix=easeOutQuint(t),old=this.controls.target.clone();this.controls.target.lerpVectors(tr.from,tr.to,mix);this.camera.position.add(this.controls.target.clone().sub(old));this.camera.zoom=lerp(tr.zoomFrom,tr.zoomTo,mix);this.camera.updateProjectionMatrix();if(t===1)this.transition=null;}
    if(this.manual)this.controls.update();
    this.people.forEach((person,i)=>person.position.y=person.userData.baseY+(this.reduced.matches?0:Math.sin(this.time*.8+i*1.8)*.025));
    this.model.windows.forEach(window=>{window.material.emissive.set(this.mode==='day'?'#c6d9e7':'#f5c77e');window.material.emissiveIntensity=this.reduced.matches?.9:.9+Math.sin(this.time*.7+window.userData.phase)*.07;});
    if(this.dust){this.dust.visible=!this.reduced.matches;this.dust.position.y=Math.sin(this.time*.14)*.15;this.dust.rotation.y=this.time*.012;}
    this.renderer.render(this.scene,this.camera);
  };

  running() {cancelAnimationFrame(this.frame);this.lastFrame=undefined;if(this.visible&&!document.hidden&&!this.disposed)this.frame=requestAnimationFrame(this.animate);}

  destroy() {
    if(this.disposed)return;this.disposed=true;
    // Один владелец ресурсов: общие материалы и geometries освобождаются ровно один раз.
    cancelAnimationFrame(this.frame);this.abort.abort();this.observer?.disconnect();this.sizeObserver?.disconnect();this.controls?.dispose();
    Object.values(this.views||{}).forEach(view=>view.destroy());this.cameraRig?.destroy();
    const geometries=new Set(),materials=new Set(),textures=new Set();
    this.scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>{materials.add(material);if(material.map)textures.add(material.map);});});
    geometries.forEach(geometry=>geometry.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());this.model?.windowMaterial.dispose();
    this.renderer?.dispose();this.renderer?.domElement.remove();
  }
}


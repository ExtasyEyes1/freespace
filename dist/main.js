import {zones, plans} from './js/data.js';
import {FallbackPlan} from './js/FallbackPlan.js';
import {BookingPanel, validateForm} from './js/BookingPanel.js';
import {AnimationManager} from './js/AnimationManager.js';
import {MicroInteractions} from './js/MicroInteractions.js';
import {ScrollController} from './js/ScrollController.js';
import {cameraPresets} from './js/cameraPresets.js';

let scene=null, selected=null, currentPlan='day', sceneStarted=false;
const lifecycle=new AbortController();
const options={signal:lifecycle.signal};
const staticPlans=[];
let scrollController,animations,micro;
const detail=document.querySelector('#zone-detail');
const tooltip=document.querySelector('#scene-tooltip');

for(const container of document.querySelectorAll('[data-static-plan]')) {
  const plan=new FallbackPlan(container,zones,selectZone);
  plan.filter(container.dataset.staticPlan==='meeting'?'month':'day');
  plan.setScene(container.dataset.staticPlan);
  staticPlans.push(plan);
}
for(const step of document.querySelectorAll('.tour-step')) {
  const controls=document.createElement('div');controls.className='scene-controls step-controls';
  controls.innerHTML='<button data-view="iso" aria-label="Изометрический ракурс">◇</button><button data-view="top" aria-label="Вид сверху">⊞</button><button data-view="side" aria-label="Вид сбоку">▱</button>';
  step.append(controls);
}
const shortcuts=document.querySelector('#zone-shortcuts');
shortcuts.innerHTML=zones.map(zone=>`<button style="--zone-color:${zone.color}" data-zone-id="${zone.id}" aria-pressed="false" aria-label="${zone.name}: ${zone.shared?'общая зона':zone.free+' свободно из '+zone.total}">${zone.name}</button>`).join('');
document.querySelector('#zone-list').innerHTML=zones.map((zone,i)=>`<article class="zone-tile" id="zone-${zone.id}" style="--zone-color:${zone.color}"><div class="zone-tile-top"><span class="zone-symbol" aria-hidden="true">${zone.symbol}</span><h3>${zone.name}</h3><span class="zone-number">0${i+1}</span></div><p>${zone.description}</p><div class="zone-tile-footer"><span>${zone.shared?'Для всех резидентов':zone.free?'Свободно: '+zone.free+' / '+zone.total:'Сейчас занято'}</span><button data-zone-id="${zone.id}" aria-label="Подробнее: ${zone.name}">Посмотреть</button></div></article>`).join('');

function selectZone(id) {
  selected=zones.find(zone=>zone.id===id);if(!selected)return;
  staticPlans.forEach(plan=>plan.highlight(id));scene?.select(id);
  document.querySelectorAll('[data-zone-id]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.zoneId===id)));
  document.querySelectorAll('.zone-tile').forEach(tile=>tile.classList.toggle('selected',tile.id==='zone-'+id));
  detail.innerHTML=`<button data-close-zone aria-label="Закрыть описание">×</button><h3>${selected.name}</h3><p>${selected.description}</p><small>${selected.shared?'Включено в каждый тариф':selected.free?'Свободно '+selected.free+' из '+selected.total:'Сейчас все места заняты'}</small><button class="button" data-book ${!selected.free&&!selected.shared?'disabled':''}>${selected.shared?'Выбрать тариф':selected.free?'Выбрать место':'Сейчас занято'}</button>`;
  detail.classList.toggle('is-docked',(scrollController?.activeId||'hero')!=='hero');
  detail.hidden=false;
}

function choosePlan(id) {
  if(!plans[id])return;
  if(selected&&!selected.plans.includes(id)) {
    selected=null;detail.hidden=true;document.querySelectorAll('[data-zone-id]').forEach(button=>button.setAttribute('aria-pressed','false'));
    document.querySelectorAll('.zone-tile').forEach(tile=>tile.classList.remove('selected'));
    staticPlans.forEach(plan=>plan.highlight(null));scene?.reset();
  }
  currentPlan=id;
  document.querySelectorAll('[data-plan]').forEach(button=>{const active=button.dataset.plan===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
  const plan=plans[id],panel=document.querySelector('#price-panel');panel.setAttribute('aria-labelledby','tab-'+id);
  panel.innerHTML=`<div class="price-intro"><span class="price-label">${plan.label}</span><div class="price-value"><span data-counter="${Number(plan.price.replaceAll(' ',''))}">${plan.price}</span><small>${plan.unit}</small></div><p data-reveal>${plan.description}</p><button class="button" data-book>Выбрать тариф «${plan.name}»</button></div><ul class="price-features">${plan.features.map(feature=>`<li>${feature}</li>`).join('')}</ul>`;
  staticPlans.filter(plan=>['hero','pricing'].includes(plan.container.dataset.staticPlan)).forEach(plan=>plan.filter(id));
  scene?.filter(id);
  document.dispatchEvent(new CustomEvent('freespace:planchange',{detail:{id,panel}}));
}
choosePlan('day');

const booking=new BookingPanel({getPlan:()=>currentPlan,getZone:()=>selected});

document.addEventListener('click',event=>{
  const target=event.target;
  const zone=target.closest('[data-zone-id]');if(zone){selectZone(zone.dataset.zoneId);return;}
  const plan=target.closest('[data-plan]');if(plan)choosePlan(plan.dataset.plan);
  const book=target.closest('[data-book]');if(book&&!book.disabled)booking.open({kind:book.dataset.kind,opener:book});
  if(target.closest('[data-close-zone]'))detail.hidden=true;
  const light=target.closest('[data-light]');
  if(light){document.querySelectorAll('[data-light]').forEach(button=>button.setAttribute('aria-pressed',String(button===light)));staticPlans.forEach(plan=>plan.setLight(light.dataset.light));scene?.setLight(light.dataset.light);}
  const view=target.closest('[data-view]');
  if(view){staticPlans.forEach(plan=>plan.setView(view.dataset.view));scene?.setView(view.dataset.view);}
  if(target.closest('[data-reset]')){staticPlans.forEach(plan=>plan.setView('iso'));scene?.reset();detail.hidden=true;}
},options);
document.addEventListener('focusin',event=>{const id=event.target.dataset.zoneId;if(id){staticPlans.forEach(plan=>plan.highlight(id));scene?.highlight(id);}},options);
document.querySelector('.menu-toggle').addEventListener('click',event=>{const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',String(open));document.querySelector('#navigation').classList.toggle('open',open);},options);
document.querySelectorAll('#navigation a').forEach(link=>link.addEventListener('click',()=>{document.querySelector('#navigation').classList.remove('open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');},options));
document.querySelector('.pricing-tabs').addEventListener('keydown',event=>{
  const buttons=[...document.querySelectorAll('[data-plan]')];let i=buttons.indexOf(document.activeElement);
  if(event.key==='ArrowRight')i=(i+1)%3;else if(event.key==='ArrowLeft')i=(i+2)%3;else if(event.key==='Home')i=0;else if(event.key==='End')i=2;else return;
  event.preventDefault();choosePlan(buttons[i].dataset.plan);buttons[i].focus();
},options);
document.querySelector('#tour-form').addEventListener('submit',event=>{
  event.preventDefault();if(!validateForm(event.currentTarget))return;
  const data=new FormData(event.currentTarget);booking.open({kind:'tour',name:data.get('name'),email:data.get('email'),opener:event.currentTarget.querySelector('button')});
},options);
const quotes=[
 {text:'«Самое ценное — возможность работать в своём темпе. Здесь легко сосредоточиться и так же легко найти собеседника за кофе».',name:'Анна К.',role:'Продуктовый дизайнер',initials:'АК'},
 {text:'«Команда собирается за одним столом, а для важных разговоров есть отдельная комната. Вся работа в одном месте».',name:'Марк Д.',role:'Основатель небольшой команды',initials:'МД'},
 {text:'«Дома всё время отвлекался. Теперь прихожу в тихую зону, закрываю задачи и ухожу домой с лёгкой головой».',name:'Денис С.',role:'Frontend-разработчик',initials:'ДС'},
];
let quoteIndex=0;
document.querySelectorAll('[data-quote]').forEach(button=>button.addEventListener('click',()=>{quoteIndex=(quoteIndex+(button.dataset.quote==='next'?1:quotes.length-1))%quotes.length;const quote=quotes[quoteIndex];document.querySelector('blockquote').textContent=quote.text;document.querySelector('.quote-author strong').textContent=quote.name;document.querySelector('.quote-author small').textContent=quote.role+' · пример отзыва';document.querySelector('.avatar').textContent=quote.initials;},options));
document.querySelector('#year').textContent=new Date().getFullYear();

animations=new AnimationManager();micro=new MicroInteractions();
const names={open:'Open space',meeting:'Переговорки',quiet:'Тихая зона',kitchen:'Кухня и лаунж'};

function hostFor(id) {
  if(['open','meeting','quiet','kitchen'].includes(id))return document.querySelector(`[data-scene-host="${innerWidth<=900?id:'tour'}"]`);
  return document.querySelector(`[data-scene-host="${id}"]`);
}

function mountScene(id) {
  const host=hostFor(id);if(!host)return;
  document.querySelectorAll('.scene-host').forEach(element=>{element.classList.toggle('is-active-host',element===host);element.querySelectorAll('.fallback,[data-static-logo]').forEach(fallback=>fallback.hidden=!!scene&&element===host);});
  if(scene){scene.mount(host);host.append(tooltip);tooltip.hidden=true;}
  const previous=host.dataset.activeScene;host.dataset.activeScene=id;
  if(previous!==id&&!matchMedia('(prefers-reduced-motion: reduce)').matches){host.classList.remove('scene-changing');requestAnimationFrame(()=>{if(!lifecycle.signal.aborted)host.classList.add('scene-changing');});}
  host.addEventListener('animationend',()=>host.classList.remove('scene-changing'),{once:true,signal:lifecycle.signal});
  detail.classList.toggle('is-docked',id!=='hero');
  if(names[id]){document.querySelector('#tour-scene-name').textContent=names[id];document.querySelector('#tour-scene-number').textContent=`0${Object.keys(names).indexOf(id)+1} / 04`;const tour=staticPlans.find(plan=>plan.container.parentElement.id==='tour-canvas');tour?.setScene(id);}
}

scrollController=new ScrollController({sections:document.querySelectorAll('section[data-scene]'),presets:cameraPresets,onChange:state=>mountScene(state.activeId)});
addEventListener('resize',()=>mountScene(scrollController.activeId||'hero'),options);

// Сцена загружается только при появлении любого host. Мобильные используют ограниченные ракурсы.
const sceneObserver=new IntersectionObserver(async entries=>{
  if(sceneStarted||!entries.some(entry=>entry.isIntersecting))return;
  sceneStarted=true;sceneObserver.disconnect();
  try {
    const {Scene3D}=await import('./js/Scene3D.js');if(lifecycle.signal.aborted)return;
    const activeId=scrollController.activeId||'hero';
    scene=new Scene3D(hostFor(activeId),zones,{onSelect:selectZone,onHover:(id,event)=>{
      tooltip.hidden=!id;if(!id)return;
      tooltip.textContent=zones.find(zone=>zone.id===id).name;
      const rect=scene.container.getBoundingClientRect();
      const x=Math.max(0,Math.min(event.clientX-rect.left+12,rect.width-150)),y=Math.max(0,event.clientY-rect.top-35);
      tooltip.style.transform=`translate3d(${x}px,${y}px,0)`;
    },onFailure:()=>{scrollController.scene=null;scene?.destroy();scene=null;mountScene(scrollController.activeId||'hero');tooltip.hidden=true;document.querySelector('#scene-hint').textContent='Выберите зону на интерактивной схеме';}});
    scene.filter(currentPlan);scene.setLight(document.querySelector('[data-light][aria-pressed=true]').dataset.light);
    scrollController.connect(scene);mountScene(activeId);
    if(selected)scene.select(selected.id);
  } catch {
    scene=null;mountScene(scrollController.activeId||'hero');
    document.querySelector('#scene-hint').textContent='Выберите зону на интерактивной схеме';
  }
},{rootMargin:'150px'});
document.querySelectorAll('.scene-host').forEach(host=>sceneObserver.observe(host));

// Прогрессивные WebMCP-действия используют те же функции, что кнопки интерфейса.
if(document.modelContext?.registerTool) {
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'get_freespace_zones',description:'Read demo workspace zones and availability.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>zones.map(({id,name,free,total,shared})=>({id,name,free,total,shared:!!shared}))});
  register({name:'start_freespace_booking',description:'Open a booking form. Does not submit or confirm a booking.',inputSchema:{type:'object',properties:{zoneId:{type:'string',enum:zones.map(zone=>zone.id)},plan:{type:'string',enum:Object.keys(plans)}},required:['zoneId','plan'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!plans[input.plan])throw new Error('Invalid plan');const zone=zones.find(zone=>zone.id===input.zoneId);if(!zone||(!zone.free&&!zone.shared)||!zone.plans.includes(input.plan))throw new Error('Zone unavailable for plan');choosePlan(input.plan);selectZone(zone.id);booking.open();return {formOpen:true,zoneId:zone.id,plan:input.plan};}});
}

// Вызывается при уходе со страницы; BFCache сохраняет рабочие observers и события.
export function destroy() {
  lifecycle.abort();sceneObserver.disconnect();scrollController.destroy();animations.destroy();micro.destroy();booking.destroy();
  scene?.destroy();scene=null;staticPlans.forEach(plan=>plan.destroy());
  document.querySelectorAll('.fallback,[data-static-logo]').forEach(element=>element.hidden=false);tooltip.hidden=true;
}
addEventListener('pagehide',event=>{if(!event.persisted)destroy();},options);

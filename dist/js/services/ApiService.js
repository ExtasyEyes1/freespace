export class ApiService {
 constructor(endpoint=null){this.endpoint=endpoint}
 async saveRequest(payload){
  if(this.endpoint){const response=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Не удалось отправить заявку. Попробуйте ещё раз.');return {mode:'remote',data:await response.json()}}
  // Без подключённого API сохраняется только локальный черновик, без подтверждения брони.
  const key='freespace.requests';let previous=[];try{previous=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(previous))previous=[]}catch{previous=[]}
  const data={...payload,id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'local-draft'};
  try{localStorage.setItem(key,JSON.stringify([...previous.slice(-19),data]))}catch{throw new Error('Браузер не разрешает сохранить заявку. Разрешите локальное хранилище и попробуйте снова.')}
  return {mode:'local',data}
 }
}

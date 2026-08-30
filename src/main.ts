import './style.css';
import { dailyDrop, emptyLog, fiberGrams, leverAdherence, localDateKey, MAX_DROPS, mondayOf, nutsAdherence, overallAdherence, plantProteinGrams, projectedLDL, rollingAverageDrop, STARTING_LDL, type DailyLog, type Lever, type Logs } from './scoring';

const STORAGE_KEY = 'ldl-tracker:v1';
const app = document.querySelector<HTMLDivElement>('#app')!;
let logs: Logs = load();
let selected = localDateKey();
let view: 'dashboard' | 'log' = 'dashboard';

function load(): Logs { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(logs)); }
function getLog(): DailyLog { return logs[selected] ?? emptyLog(); }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const label: Record<Lever, string> = { saturatedFat:'Sat fat', fiber:'Soluble fiber', nuts:'Nuts', plantProtein:'Plant protein', sterols:'Plant sterols', exercise:'Exercise' };

function checkbox(id: string, text: string, checked: boolean, sub = '') { return `<label class="check"><input type="checkbox" data-field="${id}" ${checked?'checked':''}><span><b>${text}</b>${sub?`<small>${sub}</small>`:''}</span></label>`; }
function stepper(id: string, title: string, value: number, unit: string, step = 1, min = 0) { return `<label class="step"><span>${title}<small>${unit}</small></span><span class="step-controls"><button type="button" data-step="${id}" data-delta="-${step}">−</button><input aria-label="${title}" type="number" data-number="${id}" value="${value}" min="${min}" step="${step}"><button type="button" data-step="${id}" data-delta="${step}">+</button></span></label>`; }

function trend(days: number) {
  const end = new Date(`${selected}T12:00:00`); const values: number[] = [];
  for (let i=days-1;i>=0;i--) { const d=new Date(end); d.setDate(end.getDate()-i); values.push(projectedLDL(rollingAverageDrop(localDateKey(d),logs,7))); }
  const min=120,max=170,w=360,h=90; const points=values.map((v,i)=>`${(i/(days-1))*w},${((v-min)/(max-min))*h}`).join(' ');
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" role="img" aria-label="${days}-day projected LDL trend"><line x1="0" y1="81" x2="360" y2="81"/><polyline points="${points}"/><circle cx="360" cy="${((values.at(-1)!-min)/(max-min))*h}" r="4"/></svg>`;
}

function renderDashboard() {
  const log = logs[selected]; const adh = log ? leverAdherence(selected,log,logs) : leverAdherence(selected,emptyLog(),{});
  if (!log) (Object.keys(adh) as Lever[]).forEach(k=>adh[k]=0);
  const avg7=rollingAverageDrop(selected,logs,7), projection=projectedLDL(avg7);
  const weekKeys=Object.keys(logs).filter(k=>mondayOf(k)===mondayOf(selected));
  const weekMean=weekKeys.length?weekKeys.reduce((s,k)=>s+overallAdherence(dailyDrop(leverAdherence(k,logs[k],logs))),0)/weekKeys.length:0;
  let streak=0,d=new Date(`${selected}T12:00:00`); while(true){const k=localDateKey(d),l=logs[k]; if(!l||overallAdherence(dailyDrop(leverAdherence(k,l,logs)))<.7)break; streak++;d.setDate(d.getDate()-1);}
  const gaps=(Object.keys(adh) as Lever[]).filter(k=>adh[k]<1).sort((a,b)=>(1-adh[b])*MAX_DROPS[b]-(1-adh[a])*MAX_DROPS[a]).slice(0,3);
  app.innerHTML=`${header()}<main><section class="hero"><p class="eyebrow">7-day projected LDL</p><div class="ldl">${Math.round(projection)}<span>mg/dL</span></div><p>from ${STARTING_LDL} · target band around 125</p><div class="status ${weekMean>=.7?'good':'behind'}">${weekMean>=.7?'On track':'Behind'} · ${pct(weekMean)} this week</div></section>
  <section class="card"><div class="section-title"><h2>Your levers</h2><span>${streak} day streak</span></div>${(Object.keys(adh) as Lever[]).map(k=>`<div class="bar-row"><div><span>${label[k]}</span><b>${pct(adh[k])}</b></div><div class="bar"><i style="width:${pct(adh[k])}"></i></div></div>`).join('')}</section>
  <section class="card"><div class="section-title"><h2>Trend</h2><span>projected</span></div><div class="tabs"><span>7 days</span></div>${trend(7)}<div class="tabs"><span>30 days</span></div>${trend(30)}</section>
  <section class="card"><h2>Close the gaps</h2>${gaps.length?`<ul class="gaps">${gaps.map(k=>`<li><b>${label[k]}</b><span>${gapCopy(k,adh[k])}</span></li>`).join('')}</ul>`:'<p>Log today to see what remains.</p>'}</section>
  <section class="card math"><h2>The math</h2><p>Starting 167. Max drops: sat fat 7%, fiber 6%, nuts 5%, plant protein 5%, sterols 8%, exercise 4%. Sum capped at 25%.</p><p><b>Projected = 167 × (1 − 7-day avg drop)</b></p><p>Full adherence → ~125 · Half overall → ~146 · None → 167</p></section></main>${nav()}`; bind();
}

function gapCopy(k: Lever,a:number){ if(k==='exercise')return `${pct(1-a)} left toward 150 min + 2 strength sessions`; if(k==='sterols')return a?`${(2*(1-a)).toFixed(1)}g toward today’s 2g target`:'No plant sterols logged today'; return `${pct(1-a)} of today’s target remaining`; }
function food(id:string,text:string,sub=''){const l=getLog();return checkbox(`foods.${id}`,text,!!l.foods[id],sub);}

function renderLog(){const l=getLog(); const weekday=new Date(`${selected}T12:00:00`).getDay(); const rotation:Record<number,string>={0:'Mutton optional',1:'Chicken 150g',2:'Paneer 80g',3:'Chicken 150g',4:'2 eggs',5:'Chicken 150g',6:'Mutton optional'}; app.innerHTML=`${header()}<main><section class="log-head"><p class="eyebrow">Fast daily log</p><h1>${new Date(`${selected}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</h1><input id="date" type="date" value="${selected}"></section>
  <section class="card"><h2>Saturated fat control</h2><p class="hint">Clean = 100%. Each slip lowers the score.</p>${stepper('satFatSlips','Bad snack / sat-fat slips',l.satFatSlips,'1 → 50% · 2 → 25% · 3+ → 0')}
  <details><summary>What counts as a slip?</summary><p>Namkeen, farsan, biscuits, rusk, chips, samosa, bakery; ghee, butter or vanaspati; fried food; full-cream dairy.</p><p><b>Allowed:</b> 2 eggs/day, toned milk, ~80g grilled paneer, skinless chicken, trimmed mutton 1–2 nights/week.</p></details></section>
  <section class="card"><h2>Soluble fiber <em>${fiberGrams(l)}g est.</em></h2>${checkbox('muesli45g','40–50g unsweetened muesli',l.muesli45g,'~8g soluble fiber')}${stepper('isabgolTsp','Isabgol',l.isabgolTsp,'tsp · ~4g each',.5)}${checkbox('fiberSabzi','Bhindi or baingan sabzi',l.fiberSabzi,'~4g')}${checkbox('fruit','Half sitaphal or apple/orange',l.fruit,'~4g')}<p class="estimate">Estimates; score caps at 20g.</p></section>
  <section class="card"><h2>Nuts <em>${pct(nutsAdherence(l.almondsG,l.cashewsG))}</em></h2>${stepper('almondsG','Almonds',l.almondsG,'grams')}${stepper('cashewsG','Cashews',l.cashewsG,'grams · max 12g counts')}<p class="estimate">42g target. Almonds preferred.</p></section>
  <section class="card"><h2>Plant protein <em>${plantProteinGrams(l)}g est.</em></h2>${stepper('dalKatori','Dal / rajma / chole',l.dalKatori,'katori · ~18g',.5)}${checkbox('soyaChunks','Soya chunks',l.soyaChunks,'~20g')}${checkbox('tofu','Tofu',l.tofu,'~15g')}${stepper('soyMilkGlasses','Soy milk',l.soyMilkGlasses,'glass · ~8g')}<p class="estimate">50g target. Eggs, chicken, paneer and mutton do not count.</p></section>
  <section class="card"><h2>Plant sterols</h2>${stepper('sterolsG','Sterols taken',l.sterolsG,'grams · 2g target',.1)}<p class="estimate">0 if none. Isabgol is fiber, not plant sterols.</p></section>
  <section class="card"><h2>Exercise <em>weekly</em></h2>${stepper('walkMinutes','Brisk walk today',l.walkMinutes,'minutes',5)}${checkbox('strength','Strength session',l.strength,'2 sessions/week')}<p class="estimate">Monday–Sunday: 150 min walking (70%) + 2 strength sessions (30%).</p></section>
  <section class="card plate"><h2>Today’s plate</h2><h3>Morning</h3>${food('coffee','Coffee + toned milk')}${food('dietCoke','Diet Coke','No LDL impact')}<h3>Breakfast</h3>${food('breakfast','Muesli + milk + ~8 almonds + fruit')}<h3>Snack 1</h3>${food('snack1','10–12 cashews + cucumber / roasted chana')}<h3>Lunch at home</h3>${food('lunchProtein',rotation[weekday],'Default weekday protein')}${food('lunchVeg','Big salad + bhindi / baingan')}${food('lunchCarb','1 small roti or fist of rice')}${food('lunchDal','Optional katori dal')}<h3>Snack 2</h3>${food('snack2','Isabgol, then makhana / chana / grilled paneer')}<h3>Dinner</h3>${food('dinner','2-egg veg omelette or 80g paneer + veg')}</section>
  <section class="card"><h2>Snack check</h2><p class="good-food">Good: roasted chana, makhana, almonds, cashews, cucumber chaat, grilled paneer chaat, boiled eggs, fruit.</p><p class="bad-food">Slip: namkeen, farsan, biscuits, rusk, chips, samosa, bakery.</p></section></main>${nav()}`; bind();}

function header(){return `<header><div class="brand"><span>LDL</span> DAILY</div><div class="saved">Saved locally</div></header>`;}
function nav(){return `<nav><button data-view="dashboard" class="${view==='dashboard'?'active':''}"><span>◫</span>Dashboard</button><button data-view="log" class="${view==='log'?'active':''}"><span>＋</span>Daily log</button></nav>`;}
function setPath(obj:any,path:string,value:any){const parts=path.split('.');let cur=obj;for(let i=0;i<parts.length-1;i++)cur=cur[parts[i]]??={};cur[parts.at(-1)!]=value;}
function update(field:string,value:any){if(!logs[selected])logs[selected]=emptyLog();setPath(logs[selected],field,value);save();render();}
function bind(){document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view as any;render();});document.querySelector<HTMLInputElement>('#date')?.addEventListener('change',e=>{selected=(e.target as HTMLInputElement).value;render();});document.querySelectorAll<HTMLInputElement>('[data-field]').forEach(i=>i.onchange=()=>update(i.dataset.field!,i.checked));document.querySelectorAll<HTMLInputElement>('[data-number]').forEach(i=>i.onchange=()=>update(i.dataset.number!,Number(i.value)||0));document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b=>b.onclick=()=>{const input=document.querySelector<HTMLInputElement>(`[data-number="${b.dataset.step}"]`)!;update(b.dataset.step!,Math.max(Number(input.min)||0,Number(input.value)+Number(b.dataset.delta)));});}
function render(){view==='dashboard'?renderDashboard():renderLog();}
render();

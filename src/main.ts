import './style.css';
import { applyPlateTick } from './plate';
import {
  dailyDrop, emptyLog, fiberGrams, leverAdherence, localDateKey, MAX_DROPS, mondayOf,
  nutsAdherence, overallAdherence, plantProteinGrams, projectedLDL, rollingAverageDrop,
  STARTING_LDL, type DailyLog, type Lever, type Logs,
} from './scoring';

const STORAGE_KEY = 'ldl-tracker:v1';
const app = document.querySelector<HTMLDivElement>('#app')!;
let logs: Logs = load();
let selected = localDateKey();
let view: 'dashboard' | 'log' = 'log';

function load(): Logs { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(logs)); }
function getLog(): DailyLog { return logs[selected] ?? emptyLog(); }
const pct = (n: number) => `${Math.round(n * 100)}%`;
const labels: Record<Lever, string> = { saturatedFat: 'Sat fat', fiber: 'Soluble fiber', nuts: 'Nuts', plantProtein: 'Plant protein', sterols: 'Plant sterols', exercise: 'Exercise' };

function checkbox(id: string, text: string, checked: boolean, sub = '') {
  return `<label class="check"><input type="checkbox" data-field="${id}" ${checked ? 'checked' : ''}><span><b>${text}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
}
function stepper(id: string, title: string, value: number, unit: string, step = 1, min = 0) {
  return `<label class="step"><span>${title}<small>${unit}</small></span><span class="step-controls"><button type="button" aria-label="Decrease ${title}" data-step="${id}" data-delta="-${step}">−</button><input aria-label="${title}" type="number" data-number="${id}" value="${value}" min="${min}" step="${step}"><button type="button" aria-label="Increase ${title}" data-step="${id}" data-delta="${step}">+</button></span></label>`;
}
function food(id: string, text: string, sub = '') { return checkbox(`foods.${id}`, text, !!getLog().foods[id], sub); }
function header() { return `<header><div class="brand"><span>LDL</span> DAILY</div><div class="saved">Saved locally</div></header>`; }
function nav() { return `<nav><button data-view="log" class="${view === 'log' ? 'active' : ''}"><span>＋</span>Daily log</button><button data-view="dashboard" class="${view === 'dashboard' ? 'active' : ''}"><span>◫</span>Dashboard</button></nav>`; }

function renderDashboard() {
  const log = logs[selected];
  const adherence = log ? leverAdherence(selected, log, logs) : leverAdherence(selected, emptyLog(), {});
  if (!log) (Object.keys(adherence) as Lever[]).forEach(key => adherence[key] = 0);
  const projection = projectedLDL(rollingAverageDrop(selected, logs, 7));
  const week = Object.keys(logs).filter(key => mondayOf(key) === mondayOf(selected));
  const weekMean = week.length ? week.reduce((sum, key) => sum + overallAdherence(dailyDrop(leverAdherence(key, logs[key], logs))), 0) / week.length : 0;
  app.innerHTML = `${header()}<main><section class="hero"><p class="eyebrow">7-day projected LDL</p><div class="ldl">${Math.round(projection)}<span>mg/dL</span></div><p>from ${STARTING_LDL} · target band around 125</p><div class="status">${weekMean >= .7 ? 'On track' : 'Building consistency'} · ${pct(weekMean)} this week</div></section>
    <section class="card"><h2>Your six levers</h2>${(Object.keys(adherence) as Lever[]).map(key => `<div class="bar-row"><div><span>${labels[key]}</span><b>${pct(adherence[key])}</b></div><div class="bar"><i style="width:${pct(adherence[key])}"></i></div></div>`).join('')}</section>
    <section class="card math"><h2>The math</h2><p>Starting 167. Max drops: sat fat 7%, fiber 6%, nuts 5%, plant protein 5%, sterols 8%, exercise 4%. Sum capped at 25%.</p><p><b>Projected = 167 × (1 − 7-day average drop)</b></p></section></main>${nav()}`;
  bind();
}

function leverRow(key: Lever, value: string, editors: string) {
  return `<details class="lever"><summary><span><b>${labels[key]}</b><small>${value}</small></span><strong>${pct(leverAdherence(selected, getLog(), logs)[key])}</strong></summary><div class="lever-editors">${editors}</div></details>`;
}

function renderLog() {
  const log = getLog();
  const weekday = new Date(`${selected}T12:00:00`).getDay();
  const rotation: Record<number, string> = { 0: 'Mutton optional', 1: 'Chicken 150g', 2: 'Paneer 80g', 3: 'Chicken 150g', 4: '2 eggs', 5: 'Chicken 150g', 6: 'Mutton optional' };
  const leverScores = [
    leverRow('saturatedFat', `${log.satFatSlips} slips`, `<p class="estimate">Use the slips control above. Clean = 100%; 1 = 50%; 2 = 25%; 3+ = 0%.</p>`),
    leverRow('fiber', `${fiberGrams(log)}g / 20g`, `${checkbox('muesli45g', '40–50g unsweetened muesli', log.muesli45g, '~8g soluble fiber')}${checkbox('fiberSabzi', 'Bhindi or baingan sabzi', log.fiberSabzi, '~4g')}${checkbox('fruit', 'Half sitaphal or apple/orange', log.fruit, '~4g')}<p class="estimate">Includes isabgol logged in Supplements. Estimates; score caps at 20g.</p>`),
    leverRow('nuts', `${log.almondsG + Math.min(log.cashewsG, 12)}g / 42g`, `${stepper('almondsG', 'Almonds', log.almondsG, 'grams')}${stepper('cashewsG', 'Cashews', log.cashewsG, 'grams · max 12g counts')}<p class="estimate">42g target. Almonds preferred.</p>`),
    leverRow('plantProtein', `${plantProteinGrams(log)}g / 50g`, `${stepper('dalKatori', 'Dal / rajma / chole', log.dalKatori, 'katori · ~18g', .5)}${checkbox('soyaChunks', 'Soya chunks', log.soyaChunks, '~20g')}${checkbox('tofu', 'Tofu', log.tofu, '~15g')}${stepper('soyMilkGlasses', 'Soy milk', log.soyMilkGlasses, 'glass · ~8g')}<p class="estimate">Eggs, chicken, paneer and mutton do not count.</p>`),
    leverRow('sterols', `${log.sterolsG.toFixed(1)}g / 2g`, `${stepper('sterolsG', 'Plant sterols', log.sterolsG, 'grams · 2g target', .1)}<p class="estimate">Isabgol is fiber, not plant sterols.</p>`),
    leverRow('exercise', `${log.walkMinutes} min · ${log.strength ? 'strength done' : 'no strength'}`, `<p class="estimate">Use today’s exercise controls above. Weekly target: 150 min walking + 2 strength sessions.</p>`),
  ].join('');

  app.innerHTML = `${header()}<main>
    <section class="log-head"><p class="eyebrow">Daily log</p><h1>${new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h1><input id="date" aria-label="Log date" type="date" value="${selected}"></section>
    <section class="card supplements"><p class="section-kicker">First up</p><h2>Supplements</h2>${stepper('isabgolTsp', 'Isabgol', log.isabgolTsp, 'tsp · ~4g fiber each', .5)}${stepper('sterolsG', 'Plant sterols', log.sterolsG, 'grams · 2g target', .1)}<p class="hint"><b>Isabgol is fiber, not sterols.</b> Log each separately.</p></section>
    <section class="card plate"><h2>Today’s plate</h2><h3>Morning</h3>${food('coffee', 'Coffee + toned milk')}${food('dietCoke', 'Diet Coke', 'No LDL impact')}<h3>Breakfast</h3>${food('breakfast', 'Muesli + milk + ~8 almonds + fruit')}<h3>Snack 1</h3>${food('snack1', '10–12 cashews + cucumber / roasted chana')}<h3>Lunch at home</h3>${food('lunchProtein', rotation[weekday], 'Default weekday protein')}${food('lunchVeg', 'Big salad + bhindi / baingan')}${food('lunchCarb', '1 small roti or fist of rice')}${food('lunchDal', 'Optional katori dal')}<h3>Snack 2</h3>${food('snack2', 'Isabgol, then makhana / chana / grilled paneer', 'Memory aid only — log isabgol above')}<h3>Dinner</h3>${food('dinner', '2-egg veg omelette or 80g paneer + veg')}</section>
    <section class="card slips"><h2>Saturated fat slips</h2><p class="hint">Clean = 100%. Each slip lowers the score.</p>${stepper('satFatSlips', 'Slips today', log.satFatSlips, '1 → 50% · 2 → 25% · 3+ → 0')}<button type="button" class="bad-snack" data-bad-snack>I had a bad snack</button><details><summary>What counts as a slip?</summary><p>Namkeen, farsan, biscuits, rusk, chips, samosa, bakery; ghee, butter or vanaspati; fried food; full-cream dairy.</p><p><b>Allowed:</b> 2 eggs/day, toned milk, ~80g grilled paneer, skinless chicken, trimmed mutton 1–2 nights/week.</p></details></section>
    <section class="card"><h2>Exercise</h2>${stepper('walkMinutes', 'Brisk walk today', log.walkMinutes, 'minutes', 5)}${checkbox('strength', 'Strength session', log.strength, '2 sessions/week')}<p class="estimate">Monday–Sunday: 150 min walking (70%) + 2 strength sessions (30%).</p></section>
    <section class="card scores"><div class="section-heading"><div><p class="section-kicker">Always visible</p><h2>Six lever scores</h2></div><span>Tap to edit</span></div>${leverScores}</section>
  </main>${nav()}`;
  bind();
}

function setPath(obj: any, path: string, value: any) { const parts = path.split('.'); let current = obj; for (let i = 0; i < parts.length - 1; i++) current = current[parts[i]] ??= {}; current[parts.at(-1)!] = value; }
function update(field: string, value: any) {
  const log = logs[selected] ?? emptyLog();
  if (field.startsWith('foods.')) logs[selected] = applyPlateTick(log, field.slice(6), value);
  else { logs[selected] = log; setPath(logs[selected], field, value); }
  save(); render();
}
function bind() {
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.onclick = () => { view = button.dataset.view as typeof view; render(); });
  document.querySelector<HTMLInputElement>('#date')?.addEventListener('change', event => { selected = (event.target as HTMLInputElement).value; render(); });
  document.querySelectorAll<HTMLInputElement>('[data-field]').forEach(input => input.onchange = () => update(input.dataset.field!, input.checked));
  document.querySelectorAll<HTMLInputElement>('[data-number]').forEach(input => input.onchange = () => update(input.dataset.number!, Number(input.value) || 0));
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => button.onclick = () => { const input = button.parentElement!.querySelector<HTMLInputElement>('[data-number]')!; update(button.dataset.step!, Math.max(Number(input.min) || 0, Number(input.value) + Number(button.dataset.delta))); });
  document.querySelector<HTMLButtonElement>('[data-bad-snack]')?.addEventListener('click', () => update('satFatSlips', getLog().satFatSlips + 1));
}
function render() { view === 'dashboard' ? renderDashboard() : renderLog(); }
render();

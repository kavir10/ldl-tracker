export const STARTING_LDL = 167;
export const DROP_CAP = 0.25;

export const MAX_DROPS = {
  saturatedFat: 0.07,
  fiber: 0.06,
  nuts: 0.05,
  plantProtein: 0.05,
  sterols: 0.08,
  exercise: 0.04,
} as const;

export type Lever = keyof typeof MAX_DROPS;

export interface DailyLog {
  satFatSlips: number;
  muesli45g: boolean;
  isabgolTsp: number;
  fiberSabzi: boolean;
  fruit: boolean;
  almondsG: number;
  cashewsG: number;
  dalKatori: number;
  soyaChunks: boolean;
  tofu: boolean;
  soyMilkGlasses: number;
  sterolsG: number;
  walkMinutes: number;
  strength: boolean;
  foods: Record<string, boolean>;
}

export type Logs = Record<string, DailyLog>;

// A fresh day must start EMPTY: previously this preselected fiber, nuts,
// and plant protein, so editing any single field persisted several
// unconfirmed habits as completed and inflated the LDL projection.
export const emptyLog = (): DailyLog => ({
  satFatSlips: 0, muesli45g: false, isabgolTsp: 0, fiberSabzi: false, fruit: false,
  almondsG: 0, cashewsG: 0, dalKatori: 0, soyaChunks: false, tofu: false,
  soyMilkGlasses: 0, sterolsG: 0, walkMinutes: 0, strength: false, foods: {},
});

const clamp = (value: number, max = 1) => Math.max(0, Math.min(value, max));

export function saturatedFatAdherence(slips: number): number {
  if (slips <= 0) return 1;
  if (slips === 1) return 0.5;
  if (slips === 2) return 0.25;
  return 0;
}

export function fiberGrams(log: DailyLog): number {
  return (log.muesli45g ? 8 : 0) + log.isabgolTsp * 4 + (log.fiberSabzi ? 4 : 0) + (log.fruit ? 4 : 0);
}

export const fiberAdherence = (log: DailyLog) => clamp(fiberGrams(log) / 20);
export const nutsAdherence = (almondsG: number, cashewsG: number) => clamp((Math.max(0, almondsG) + Math.min(Math.max(0, cashewsG), 12)) / 42);

export function plantProteinGrams(log: DailyLog): number {
  return log.dalKatori * 18 + (log.soyaChunks ? 20 : 0) + (log.tofu ? 15 : 0) + log.soyMilkGlasses * 8;
}

export const plantProteinAdherence = (log: DailyLog) => clamp(plantProteinGrams(log) / 50);
export const sterolAdherence = (grams: number) => clamp(Math.max(0, grams) / 2);

export function mondayOf(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateKey(date);
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function exerciseAdherence(dateKey: string, logs: Logs): number {
  const monday = mondayOf(dateKey);
  let walk = 0, strength = 0;
  for (const [key, log] of Object.entries(logs)) {
    if (mondayOf(key) === monday) {
      walk += Math.max(0, log.walkMinutes);
      strength += log.strength ? 1 : 0;
    }
  }
  return 0.7 * clamp(walk / 150) + 0.3 * clamp(strength / 2);
}

export function leverAdherence(dateKey: string, log: DailyLog, logs: Logs): Record<Lever, number> {
  return {
    saturatedFat: saturatedFatAdherence(log.satFatSlips),
    fiber: fiberAdherence(log),
    nuts: nutsAdherence(log.almondsG, log.cashewsG),
    plantProtein: plantProteinAdherence(log),
    sterols: sterolAdherence(log.sterolsG),
    exercise: exerciseAdherence(dateKey, logs),
  };
}

export function dailyDrop(adherence: Record<Lever, number>): number {
  const sum = (Object.keys(MAX_DROPS) as Lever[]).reduce((total, key) => total + adherence[key] * MAX_DROPS[key], 0);
  return Math.min(sum, DROP_CAP);
}

export const projectedLDL = (averageDrop: number) => STARTING_LDL * (1 - Math.min(Math.max(averageDrop, 0), DROP_CAP));
export const overallAdherence = (drop: number) => Math.min(drop, DROP_CAP) / DROP_CAP;

export function rollingAverageDrop(endDateKey: string, logs: Logs, days: number): number {
  const end = new Date(`${endDateKey}T12:00:00`);
  let total = 0;
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(end); date.setDate(end.getDate() - offset);
    const key = localDateKey(date); const log = logs[key];
    // Days with no log count as zero adherence - previously they were
    // dropped from the divisor, so one logged day could present as a
    // full week of adherence.
    if (log) total += dailyDrop(leverAdherence(key, log, logs));
  }
  return total / days;
}

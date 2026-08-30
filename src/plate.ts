import type { DailyLog } from './scoring';

export function applyPlateTick(log: DailyLog, foodId: string, checked: boolean): DailyLog {
  const next: DailyLog = { ...log, foods: { ...log.foods, [foodId]: checked } };

  if (foodId === 'breakfast') {
    next.muesli45g = checked;
    next.fruit = checked;
    next.almondsG = checked ? Math.max(next.almondsG, 8) : next.almondsG <= 8 ? 0 : next.almondsG;
  } else if (foodId === 'snack1') {
    next.cashewsG = checked ? Math.max(next.cashewsG, 12) : next.cashewsG <= 12 ? 0 : next.cashewsG;
  } else if (foodId === 'lunchVeg') {
    next.fiberSabzi = checked;
  } else if (foodId === 'lunchDal') {
    next.dalKatori = checked ? Math.max(next.dalKatori, 1) : next.dalKatori <= 1 ? 0 : next.dalKatori;
  }

  return next;
}

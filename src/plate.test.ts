import { describe, expect, it } from 'vitest';
import { applyPlateTick } from './plate';
import { emptyLog } from './scoring';

describe('plate ticks write scoring fields', () => {
  it('writes and clears the breakfast bundle', () => {
    const log = emptyLog();
    log.muesli45g = false; log.fruit = false; log.almondsG = 0;
    const checked = applyPlateTick(log, 'breakfast', true);
    expect(checked).toMatchObject({ muesli45g: true, fruit: true, almondsG: 8 });
    expect(applyPlateTick(checked, 'breakfast', false)).toMatchObject({ muesli45g: false, fruit: false, almondsG: 0 });
  });

  it('does not clobber a higher typed almond amount', () => {
    const log = emptyLog(); log.almondsG = 18;
    expect(applyPlateTick(log, 'breakfast', false).almondsG).toBe(18);
  });

  it('writes and conditionally clears snack 1 cashews', () => {
    const log = emptyLog(); log.cashewsG = 0;
    const checked = applyPlateTick(log, 'snack1', true);
    expect(checked.cashewsG).toBe(12);
    expect(applyPlateTick(checked, 'snack1', false).cashewsG).toBe(0);
    checked.cashewsG = 20;
    expect(applyPlateTick(checked, 'snack1', false).cashewsG).toBe(20);
  });

  it('writes lunch vegetables and dal without clobbering extra dal', () => {
    const log = emptyLog(); log.fiberSabzi = false; log.dalKatori = 0;
    expect(applyPlateTick(log, 'lunchVeg', true).fiberSabzi).toBe(true);
    expect(applyPlateTick(log, 'lunchVeg', false).fiberSabzi).toBe(false);
    expect(applyPlateTick(log, 'lunchDal', true).dalKatori).toBe(1);
    log.dalKatori = 1.5;
    expect(applyPlateTick(log, 'lunchDal', false).dalKatori).toBe(1.5);
  });

  it('keeps snack 2 and other memory aids out of scoring fields', () => {
    const log = emptyLog(); log.isabgolTsp = 0;
    for (const id of ['snack2', 'coffee', 'dietCoke', 'lunchProtein', 'lunchCarb', 'dinner']) {
      const next = applyPlateTick(log, id, true);
      expect(next.isabgolTsp).toBe(0);
      expect(next.foods[id]).toBe(true);
    }
  });

  it('returns a new log and leaves its input unchanged', () => {
    const log = emptyLog(); log.muesli45g = false; log.fruit = false; log.almondsG = 0;
    const next = applyPlateTick(log, 'breakfast', true);
    expect(next).not.toBe(log);
    expect(log).toMatchObject({ muesli45g: false, fruit: false, almondsG: 0, foods: {} });
  });
});

import { describe, expect, it } from 'vitest';
import { dailyDrop, emptyLog, exerciseAdherence, fiberGrams, MAX_DROPS, nutsAdherence, projectedLDL, saturatedFatAdherence, sterolAdherence, type Logs } from './scoring';

describe('LDL scoring', () => {
  it('caps the combined drop at 25%', () => expect(dailyDrop(Object.fromEntries(Object.keys(MAX_DROPS).map(k => [k, 1])) as any)).toBe(.25));
  it('projects full adherence at 125.25', () => expect(projectedLDL(.25)).toBeCloseTo(125.25));
  it('projects half overall at 146.125', () => expect(projectedLDL(.125)).toBeCloseTo(146.125));
  it('keeps zero at 167', () => expect(projectedLDL(0)).toBe(167));
  it('caps cashews at 12g', () => expect(nutsAdherence(0, 40)).toBeCloseTo(12 / 42));
  it('scores skipped sterols as zero', () => expect(sterolAdherence(0)).toBe(0));
  it('scores exercise from the whole Monday week', () => {
    const a = emptyLog(), b = emptyLog(); a.walkMinutes = 100; a.strength = true; b.walkMinutes = 50; b.strength = true;
    const logs: Logs = { '2026-08-24': a, '2026-08-26': b };
    expect(exerciseAdherence('2026-08-24', logs)).toBe(1);
    expect(exerciseAdherence('2026-08-26', logs)).toBe(1);
    expect(exerciseAdherence('2026-08-31', logs)).toBe(0);
  });
  it.each([[0,1],[1,.5],[2,.25],[3,0],[6,0]])('maps %i saturated-fat slips to %f', (slips, score) => expect(saturatedFatAdherence(slips)).toBe(score));
  it('uses the stated fiber estimates', () => expect(fiberGrams(emptyLog())).toBe(20));
});

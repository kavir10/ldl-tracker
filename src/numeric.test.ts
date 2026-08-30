import { describe, expect, it } from 'vitest';
import { clampedInputValue } from './numeric';

describe('clampedInputValue', () => {
  it('clamps manual values to the input minimum', () => {
    expect(clampedInputValue('-5', '0')).toBe(0);
  });

  it('uses the minimum for invalid values', () => {
    expect(clampedInputValue('not-a-number', '2')).toBe(2);
  });
});

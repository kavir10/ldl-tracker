export function clampedInputValue(value: string, minValue: string): number {
  const min = Number(minValue) || 0;
  const parsed = Number(value);
  return Math.max(min, Number.isFinite(parsed) ? parsed : min);
}

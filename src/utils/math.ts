/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Distance between two points */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate defense-reduced damage: damage * (100 / (100 + defense)) */
export function calculateDamageReduction(baseDamage: number, defense: number): number {
  return baseDamage * (100 / (100 + Math.max(0, defense)));
}

/** Calculate experience needed for next level */
export function expForLevel(currentLevel: number): number {
  return 100 + currentLevel * 50;
}

/** Format number for display (e.g. 1234 -> "1.2K") */
export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toString();
}

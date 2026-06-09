import { describe, it, expect } from 'vitest';
import { softCapDamage, DAMAGE_SOFT_CAP_MULT } from '../../src/config/balance';

/**
 * Single-hit damage soft cap (backlog issue #6). Verifies the pure compression
 * math: below the cap nothing changes; above it the excess is compressed by a
 * sqrt curve so degenerate ~19-26× spikes are trimmed without removing the reward
 * for build investment.
 */
describe('softCapDamage (issue #6 single-hit soft cap)', () => {
  const S = 100; // offensive stat
  const cap = S * DAMAGE_SOFT_CAP_MULT; // 1500

  it('leaves damage below the cap unchanged', () => {
    expect(softCapDamage(1000, S)).toBe(1000);
    expect(softCapDamage(cap - 1, S)).toBe(cap - 1);
  });

  it('leaves damage exactly at the cap unchanged', () => {
    expect(softCapDamage(cap, S)).toBe(cap);
  });

  it('compresses a degenerate 26x hit down toward ~18x', () => {
    // 26× offensive stat → compressed well below the input multiple but still a big spike.
    const out = softCapDamage(26 * S, S);
    expect(out).toBeLessThan(18 * S);
    expect(out).toBeGreaterThan(cap); // still above the cap — investment is rewarded
    expect(out).toBeCloseTo(1787.23, 1); // 1500 + sqrt(1100 * 1500 * 0.05)
  });

  it('is monotonic increasing — more raw damage always yields more output', () => {
    expect(softCapDamage(5000, S)).toBeGreaterThan(softCapDamage(2600, S));
    expect(softCapDamage(2600, S)).toBeGreaterThan(softCapDamage(1600, S));
  });

  it('compresses harder the more degenerate the stack (diminishing returns)', () => {
    // Doubling the raw input past the cap yields far less than double the output.
    const a = softCapDamage(2 * cap, S);   // raw = 2× cap
    const b = softCapDamage(4 * cap, S);   // raw = 4× cap
    expect(b / a).toBeLessThan(2);
  });

  it('disables the cap when the offensive stat is non-positive', () => {
    expect(softCapDamage(9999, 0)).toBe(9999);
    expect(softCapDamage(9999, -5)).toBe(9999);
  });
});

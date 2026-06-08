import { describe, it, expect } from 'vitest';
import { computeInterest, INTEREST_CAP, INTEREST_PER_10_GOLD } from '../../src/config/balance';

describe('computeInterest (per-battle bank interest)', () => {
  it('awards 0 interest at 0 gold', () => {
    expect(computeInterest(0)).toBe(0);
  });

  it('awards floor(gold/10) * INTEREST_PER_10_GOLD below the cap', () => {
    expect(computeInterest(10)).toBe(1 * INTEREST_PER_10_GOLD);
    expect(computeInterest(49)).toBe(4 * INTEREST_PER_10_GOLD);
    expect(computeInterest(95)).toBe(9 * INTEREST_PER_10_GOLD);
  });

  it('caps interest at INTEREST_CAP for large reserves', () => {
    expect(computeInterest(100)).toBe(INTEREST_CAP); // floor(100/10)=10 hits the cap
    expect(computeInterest(500)).toBe(INTEREST_CAP);
  });

  it('INTEREST_CAP raised to 10 (was 5) so hoarding gold is meaningful', () => {
    expect(INTEREST_CAP).toBe(10);
  });
});

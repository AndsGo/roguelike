import { describe, it, expect } from 'vitest';
import { GAUNTLET_REWARD_MULTIPLIER } from '../../src/config/balance';

describe('Gauntlet reward scaling', () => {
  it('multiplier is less than 1 (scaled per wave)', () => {
    expect(GAUNTLET_REWARD_MULTIPLIER).toBeLessThan(1);
    expect(GAUNTLET_REWARD_MULTIPLIER).toBeGreaterThan(0);
  });

  it('3-wave gauntlet gives ~2.4x single battle rewards', () => {
    const baseGold = 100;
    const totalRaw = baseGold * 3;
    const scaled = Math.round(totalRaw * GAUNTLET_REWARD_MULTIPLIER);
    expect(scaled).toBe(240);
  });

  it('2-wave gauntlet gives ~1.6x rewards', () => {
    const baseGold = 100;
    const totalRaw = baseGold * 2;
    const scaled = Math.round(totalRaw * GAUNTLET_REWARD_MULTIPLIER);
    expect(scaled).toBe(160);
  });
});

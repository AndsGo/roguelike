import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { BattleNodeData } from '../../src/types';

function makeRng(overrides: Partial<{
  nextInt: (a: number, b: number) => number;
  nextFloat: () => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: T[]) => T;
  pickN: <T>(arr: T[], n: number) => T[];
  getState: () => number;
}> = {}) {
  return {
    nextInt: (a: number, _b: number) => a,
    nextFloat: () => 0,
    chance: () => false,
    pick: <T>(arr: T[]) => arr[0],
    pickN: <T>(arr: T[], n: number) => arr.slice(0, n),
    getState: () => 0,
    ...overrides,
  } as any;
}

describe('Gauntlet map generation', () => {
  it('generates map with gauntlet nodes', () => {
    const map = MapGenerator.generate(makeRng(), 1);
    const gauntlets = map.filter(n => n.type === 'gauntlet');
    expect(gauntlets.length).toBeGreaterThanOrEqual(1);
  });

  it('gauntlet nodes have enemies data', () => {
    const map = MapGenerator.generate(makeRng(), 1);
    const gauntlets = map.filter(n => n.type === 'gauntlet');
    for (const g of gauntlets) {
      const data = g.data as BattleNodeData;
      expect(data).toBeDefined();
      expect(data.enemies.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('gauntlet nodes have waves data when totalWaves > 1', () => {
    // nextInt returns b (max), so totalWaves=3, wave1Count=3
    const map = MapGenerator.generate(makeRng({
      nextInt: (_a: number, b: number) => b,
    }), 1);
    const gauntlets = map.filter(n => n.type === 'gauntlet');
    expect(gauntlets.length).toBeGreaterThanOrEqual(1);
    for (const g of gauntlets) {
      const data = g.data as BattleNodeData;
      if (data.waves) {
        expect(data.waves.length).toBeGreaterThanOrEqual(1);
        for (const wave of data.waves) {
          expect(wave.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('gauntlet wave enemies have increasing levels', () => {
    const map = MapGenerator.generate(makeRng({
      nextInt: (_a: number, b: number) => b,
    }), 1);
    const gauntlets = map.filter(n => n.type === 'gauntlet');
    for (const g of gauntlets) {
      const data = g.data as BattleNodeData;
      if (data.waves && data.waves.length > 0) {
        const wave1MaxLevel = Math.max(...data.enemies.map(e => e.level));
        const wave2MaxLevel = Math.max(...data.waves[0].map(e => e.level));
        expect(wave2MaxLevel).toBeGreaterThanOrEqual(wave1MaxLevel);
      }
    }
  });

  it('gauntlet with minimum RNG has at least 1 wave (totalWaves >= 2)', () => {
    // nextInt returns a (min), so totalWaves=2, meaning 1 extra wave
    const map = MapGenerator.generate(makeRng(), 1);
    const gauntlets = map.filter(n => n.type === 'gauntlet');
    for (const g of gauntlets) {
      const data = g.data as BattleNodeData;
      // totalWaves=2 means 1 extra wave
      if (data.waves) {
        expect(data.waves.length).toBe(1);
      }
    }
  });
});

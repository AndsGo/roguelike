import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

import { MetaManager } from '../../src/managers/MetaManager';

describe('MetaManager enemy encounter tracking', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    // Reset singleton
    (MetaManager as any).instance = undefined;
  });

  it('records a new enemy encounter', () => {
    MetaManager.recordEnemyEncounter('slime');
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
  });

  it('does not duplicate encounters', () => {
    MetaManager.recordEnemyEncounter('goblin');
    MetaManager.recordEnemyEncounter('goblin');
    expect(MetaManager.getEncounteredEnemies()).toEqual(['goblin']);
  });

  it('tracks multiple different enemies', () => {
    MetaManager.recordEnemyEncounter('slime');
    MetaManager.recordEnemyEncounter('goblin');
    MetaManager.recordEnemyEncounter('skeleton');
    expect(MetaManager.getEncounteredEnemies()).toHaveLength(3);
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('goblin')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('skeleton')).toBe(true);
  });

  it('returns false for unencountered enemies', () => {
    expect(MetaManager.hasEncounteredEnemy('dragon_boss')).toBe(false);
  });

  it('persists encounters across getInstance() resets', () => {
    MetaManager.recordEnemyEncounter('slime');
    (MetaManager as any).instance = undefined;
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
  });

  it('handles legacy data missing encounteredEnemies field', () => {
    const oldMeta = {
      totalRuns: 5, totalVictories: 2, highestFloor: 15,
      unlockedHeroes: ['warrior'], unlockedRelics: [],
      permanentUpgrades: [], achievements: [], metaCurrency: 100,
    };
    const json = JSON.stringify(oldMeta);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const ch = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    store['roguelike_meta'] = JSON.stringify({ data: json, checksum: hash.toString(36) });
    (MetaManager as any).instance = undefined;
    expect(MetaManager.getEncounteredEnemies()).toEqual([]);
    MetaManager.recordEnemyEncounter('slime');
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
  });

  it('resetAll clears encountered enemies', () => {
    MetaManager.recordEnemyEncounter('slime');
    MetaManager.resetAll();
    expect(MetaManager.getEncounteredEnemies()).toEqual([]);
  });
});

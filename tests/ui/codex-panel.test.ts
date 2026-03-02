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
import heroesData from '../../src/data/heroes.json';
import enemiesData from '../../src/data/enemies.json';

describe('Codex data integration', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    (MetaManager as any).instance = undefined;
  });

  it('all heroes are accessible from heroes.json', () => {
    const heroes = heroesData as { id: string; name: string; role: string; skills: string[] }[];
    expect(heroes.length).toBeGreaterThan(0);
    for (const h of heroes) {
      expect(h.id).toBeTruthy();
      expect(h.name).toBeTruthy();
      expect(h.role).toBeTruthy();
    }
  });

  it('all enemies are accessible from enemies.json', () => {
    const enemies = enemiesData as { id: string; name: string; role: string }[];
    expect(enemies.length).toBeGreaterThan(0);
    for (const e of enemies) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
    }
  });

  it('hero unlock status is queryable for codex', () => {
    const defaultUnlocked = MetaManager.getUnlockedHeroes();
    expect(defaultUnlocked).toContain('warrior');
    expect(defaultUnlocked).toContain('archer');
    expect(defaultUnlocked).toContain('mage');
    expect(MetaManager.isHeroUnlocked('warrior')).toBe(true);
    expect(MetaManager.isHeroUnlocked('thunder_monk')).toBe(false);
  });

  it('enemy encounter tracking works end-to-end', () => {
    expect(MetaManager.getEncounteredEnemies()).toEqual([]);
    const battleEnemies = ['slime', 'goblin', 'slime'];
    for (const id of battleEnemies) {
      MetaManager.recordEnemyEncounter(id);
    }
    expect(MetaManager.hasEncounteredEnemy('slime')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('goblin')).toBe(true);
    expect(MetaManager.hasEncounteredEnemy('skeleton')).toBe(false);
    expect(MetaManager.getEncounteredEnemies()).toHaveLength(2);
  });

  it('codex counts match data sources', () => {
    const heroes = heroesData as { id: string }[];
    const enemies = enemiesData as { id: string }[];
    expect(MetaManager.getUnlockedHeroes().length).toBe(3);
    expect(MetaManager.getEncounteredEnemies().length).toBe(0);
    for (const e of enemies) {
      MetaManager.recordEnemyEncounter(e.id);
    }
    expect(MetaManager.getEncounteredEnemies().length).toBe(enemies.length);
  });
});

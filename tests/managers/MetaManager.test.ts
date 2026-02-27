import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

// Set up mock localStorage
const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { MetaManager } from '../../src/managers/MetaManager';
import { EventBus } from '../../src/systems/EventBus';

// Reset singleton between tests
function resetMetaManager() {
  // Access private static instance to reset it
  (MetaManager as any).instance = undefined;
}

describe('MetaManager', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
    resetMetaManager();
  });

  describe('hero unlocks', () => {
    it('default heroes are unlocked', () => {
      const unlocked = MetaManager.getUnlockedHeroes();
      expect(unlocked).toContain('warrior');
      expect(unlocked).toContain('archer');
      expect(unlocked).toContain('mage');
    });

    it('unlockHero adds a new hero', () => {
      MetaManager.unlockHero('priest');
      expect(MetaManager.isHeroUnlocked('priest')).toBe(true);
    });

    it('unlockHero is idempotent', () => {
      MetaManager.unlockHero('priest');
      MetaManager.unlockHero('priest');
      const heroes = MetaManager.getUnlockedHeroes();
      const priestCount = heroes.filter(h => h === 'priest').length;
      expect(priestCount).toBe(1);
    });

    it('isHeroUnlocked returns false for locked hero', () => {
      expect(MetaManager.isHeroUnlocked('nonexistent')).toBe(false);
    });
  });

  describe('relic unlocks', () => {
    it('starts with no relics', () => {
      expect(MetaManager.getUnlockedRelics()).toEqual([]);
    });

    it('unlockRelic adds a relic', () => {
      MetaManager.unlockRelic('test_relic');
      expect(MetaManager.getUnlockedRelics()).toContain('test_relic');
    });
  });

  describe('permanent upgrades', () => {
    it('getUpgrade returns upgrade with level 0', () => {
      const upgrade = MetaManager.getUpgrade('starting_gold');
      expect(upgrade).toBeDefined();
      expect(upgrade!.level).toBe(0);
      expect(upgrade!.maxLevel).toBe(5);
    });

    it('getUpgradeEffect returns 0 at level 0', () => {
      expect(MetaManager.getUpgradeEffect('starting_gold')).toBe(0);
    });

    it('purchaseUpgrade succeeds with enough currency', () => {
      MetaManager.addMetaCurrency(500);
      const result = MetaManager.purchaseUpgrade('starting_gold');
      expect(result).toBe(true);
      const upgrade = MetaManager.getUpgrade('starting_gold');
      expect(upgrade!.level).toBe(1);
    });

    it('purchaseUpgrade fails without enough currency', () => {
      // Cost is 50 for level 0->1
      MetaManager.addMetaCurrency(10);
      const result = MetaManager.purchaseUpgrade('starting_gold');
      expect(result).toBe(false);
    });

    it('purchaseUpgrade fails when at max level', () => {
      MetaManager.addMetaCurrency(100000);
      // Purchase all 5 levels of starting_gold
      for (let i = 0; i < 5; i++) {
        MetaManager.purchaseUpgrade('starting_gold');
      }
      const result = MetaManager.purchaseUpgrade('starting_gold');
      expect(result).toBe(false);
    });

    it('getUpgradeEffect returns correct value at level 1', () => {
      MetaManager.addMetaCurrency(500);
      MetaManager.purchaseUpgrade('starting_gold');
      // starting_gold level 1 = 20
      expect(MetaManager.getUpgradeEffect('starting_gold')).toBe(20);
    });
  });

  describe('meta currency', () => {
    it('starts at 0', () => {
      expect(MetaManager.getMetaCurrency()).toBe(0);
    });

    it('addMetaCurrency increases amount', () => {
      MetaManager.addMetaCurrency(100);
      expect(MetaManager.getMetaCurrency()).toBe(100);
    });

    it('addMetaCurrency does not go below 0', () => {
      MetaManager.addMetaCurrency(-100);
      expect(MetaManager.getMetaCurrency()).toBe(0);
    });
  });

  describe('recordRunEnd', () => {
    it('increments totalRuns', () => {
      MetaManager.recordRunEnd(false, 5);
      const meta = MetaManager.getMetaData();
      expect(meta.totalRuns).toBe(1);
    });

    it('increments totalVictories on victory', () => {
      MetaManager.recordRunEnd(true, 15);
      const meta = MetaManager.getMetaData();
      expect(meta.totalVictories).toBe(1);
    });

    it('updates highestFloor', () => {
      MetaManager.recordRunEnd(false, 7);
      expect(MetaManager.getMetaData().highestFloor).toBe(7);
    });

    it('unlocks priest on first victory', () => {
      MetaManager.recordRunEnd(true, 15);
      expect(MetaManager.isHeroUnlocked('priest')).toBe(true);
    });

    it('unlocks rogue after 3 runs', () => {
      MetaManager.recordRunEnd(false, 5);
      MetaManager.recordRunEnd(false, 5);
      MetaManager.recordRunEnd(false, 5);
      expect(MetaManager.isHeroUnlocked('rogue')).toBe(true);
    });

    it('awards meta currency based on progress', () => {
      MetaManager.recordRunEnd(true, 15);
      // Victory awards 100 meta currency
      expect(MetaManager.getMetaCurrency()).toBeGreaterThanOrEqual(100);
    });
  });

  describe('achievements', () => {
    it('starts with no achievements', () => {
      expect(MetaManager.getAchievements()).toEqual([]);
    });

    it('addAchievement adds an achievement', () => {
      MetaManager.addAchievement('first_victory');
      expect(MetaManager.hasAchievement('first_victory')).toBe(true);
    });

    it('addAchievement is idempotent', () => {
      MetaManager.addAchievement('test');
      MetaManager.addAchievement('test');
      expect(MetaManager.getAchievements().length).toBe(1);
    });
  });
});

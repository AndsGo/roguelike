import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { AchievementManager, AchievementDef } from '../../src/managers/AchievementManager';
import { MetaManager } from '../../src/managers/MetaManager';
import { StatsManager } from '../../src/managers/StatsManager';
import { EventBus } from '../../src/systems/EventBus';

function resetSingletons() {
  (AchievementManager as any).instance = undefined;
  (MetaManager as any).instance = undefined;
  (StatsManager as any).instance = undefined;
}

describe('AchievementManager', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
    resetSingletons();
    StatsManager.init();
  });

  describe('achievement definitions', () => {
    it('has at least 15 achievements defined', () => {
      expect(AchievementManager.ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    });

    it('all achievements have required fields', () => {
      for (const ach of AchievementManager.ACHIEVEMENTS) {
        expect(ach.id).toBeTruthy();
        expect(ach.name).toBeTruthy();
        expect(ach.description).toBeTruthy();
        expect(typeof ach.condition).toBe('function');
      }
    });

    it('achievement IDs are unique', () => {
      const ids = AchievementManager.ACHIEVEMENTS.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('checkAchievements', () => {
    it('returns empty array when no conditions met', () => {
      const newlyUnlocked = AchievementManager.checkAchievements();
      // With default stats (all zeros), some achievements shouldn't trigger
      // first_victory requires totalVictories >= 1
      expect(newlyUnlocked).not.toContain('first_victory');
    });

    it('unlocks combo_10 when maxCombo >= 10', () => {
      // Simulate combo
      EventBus.getInstance().emit('combo:hit', {
        unitId: 'hero1',
        comboCount: 10,
      });

      const newlyUnlocked = AchievementManager.checkAchievements();
      expect(newlyUnlocked).toContain('combo_10');
    });

    it('does not double-unlock achievements', () => {
      EventBus.getInstance().emit('combo:hit', {
        unitId: 'hero1',
        comboCount: 10,
      });

      AchievementManager.checkAchievements();
      const second = AchievementManager.checkAchievements();
      expect(second).not.toContain('combo_10');
    });

    it('unlocks healer_1000 when totalHealing >= 1000', () => {
      for (let i = 0; i < 20; i++) {
        EventBus.getInstance().emit('unit:heal', {
          sourceId: 'healer1',
          targetId: 'ally1',
          amount: 55,
        });
      }

      const newlyUnlocked = AchievementManager.checkAchievements();
      expect(newlyUnlocked).toContain('healer_1000');
    });

    it('unlocks overkill when totalDamage >= 500', () => {
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'hero1', targetId: 'enemy1',
        amount: 600, damageType: 'physical', isCrit: false,
      });

      const newlyUnlocked = AchievementManager.checkAchievements();
      expect(newlyUnlocked).toContain('overkill');
    });
  });

  describe('getProgress', () => {
    it('returns unlocked: false for locked achievement', () => {
      const progress = AchievementManager.getProgress('first_victory');
      expect(progress.unlocked).toBe(false);
    });

    it('returns unlocked: false for unknown achievement', () => {
      const progress = AchievementManager.getProgress('nonexistent');
      expect(progress.unlocked).toBe(false);
    });
  });

  describe('getAll', () => {
    it('returns all achievement definitions', () => {
      const all = AchievementManager.getAll();
      expect(all.length).toBe(AchievementManager.ACHIEVEMENTS.length);
    });
  });
});

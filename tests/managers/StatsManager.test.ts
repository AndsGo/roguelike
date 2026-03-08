import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { StatsManager } from '../../src/managers/StatsManager';
import { EventBus } from '../../src/systems/EventBus';

function resetStatsManager() {
  (StatsManager as any).instance = undefined;
}

describe('StatsManager', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
    resetStatsManager();
    StatsManager.init();
  });

  describe('initial state', () => {
    it('starts with zero stats', () => {
      const stats = StatsManager.getRunStats();
      expect(stats.totalDamage).toBe(0);
      expect(stats.totalHealing).toBe(0);
      expect(stats.totalKills).toBe(0);
      expect(stats.maxCombo).toBe(0);
      expect(stats.skillsUsed).toBe(0);
      expect(stats.goldEarned).toBe(0);
      expect(stats.goldSpent).toBe(0);
      expect(stats.nodesCompleted).toBe(0);
    });
  });

  describe('EventBus-driven stats tracking', () => {
    it('tracks damage from unit:damage events', () => {
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'hero1',
        targetId: 'enemy1',
        amount: 100,
        damageType: 'physical',
        isCrit: false,
      });

      const stats = StatsManager.getRunStats();
      expect(stats.totalDamage).toBe(100);
      expect(stats.heroStats['hero1'].damage).toBe(100);
    });

    it('tracks healing from unit:heal events', () => {
      EventBus.getInstance().emit('unit:heal', {
        sourceId: 'healer1',
        targetId: 'ally1',
        amount: 50,
      });

      const stats = StatsManager.getRunStats();
      expect(stats.totalHealing).toBe(50);
    });

    it('tracks kills from unit:kill events', () => {
      EventBus.getInstance().emit('unit:kill', {
        killerId: 'hero1',
        targetId: 'enemy1',
      });

      const stats = StatsManager.getRunStats();
      expect(stats.totalKills).toBe(1);
      expect(stats.heroStats['hero1'].kills).toBe(1);
    });

    it('tracks hero deaths from unit:death events', () => {
      EventBus.getInstance().emit('unit:death', {
        unitId: 'hero1',
        isHero: true,
      });

      const stats = StatsManager.getRunStats();
      expect(stats.heroStats['hero1'].deaths).toBe(1);
    });

    it('tracks max combo from combo:hit events', () => {
      EventBus.getInstance().emit('combo:hit', {
        unitId: 'hero1',
        comboCount: 15,
      });

      expect(StatsManager.getRunStats().maxCombo).toBe(15);

      EventBus.getInstance().emit('combo:hit', {
        unitId: 'hero1',
        comboCount: 10,
      });

      // Should keep the max
      expect(StatsManager.getRunStats().maxCombo).toBe(15);
    });

    it('tracks skill usage from skill:use events', () => {
      EventBus.getInstance().emit('skill:use', {
        casterId: 'hero1',
        skillId: 'fireball',
        targets: ['enemy1'],
      });

      expect(StatsManager.getRunStats().skillsUsed).toBe(1);
    });

    it('tracks node completion', () => {
      EventBus.getInstance().emit('node:complete', {
        nodeIndex: 0,
        nodeType: 'battle',
      });

      expect(StatsManager.getRunStats().nodesCompleted).toBe(1);
    });

    it('tracks elite kills', () => {
      EventBus.getInstance().emit('node:complete', {
        nodeIndex: 0,
        nodeType: 'elite',
      });

      expect(StatsManager.getRunStats().eliteKills).toBe(1);
    });

    it('tracks boss kills', () => {
      EventBus.getInstance().emit('node:complete', {
        nodeIndex: 0,
        nodeType: 'boss',
      });

      expect(StatsManager.getRunStats().bossKills).toBe(1);
    });
  });

  describe('manual recording', () => {
    it('recordGoldEarned adds to goldEarned', () => {
      StatsManager.recordGoldEarned(50);
      expect(StatsManager.getRunStats().goldEarned).toBe(50);
    });

    it('recordGoldSpent adds to goldSpent', () => {
      StatsManager.recordGoldSpent(30);
      expect(StatsManager.getRunStats().goldSpent).toBe(30);
    });
  });

  describe('critical hits tracking', () => {
    it('increments criticalHits on crit damage events', () => {
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'hero1', targetId: 'enemy1',
        amount: 200, damageType: 'physical', isCrit: true,
      });
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'hero1', targetId: 'enemy1',
        amount: 100, damageType: 'physical', isCrit: false,
      });
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'hero1', targetId: 'enemy1',
        amount: 150, damageType: 'physical', isCrit: true,
      });

      expect(StatsManager.getRunStats().criticalHits).toBe(2);
    });
  });

  describe('element reaction tracking', () => {
    it('tracks element reactions by reactionType', () => {
      EventBus.getInstance().emit('element:reaction', {
        element1: 'fire', element2: 'ice', targetId: 'enemy1', reactionType: 'ignite', attackerId: 'hero1', damage: 50,
      });
      EventBus.getInstance().emit('element:reaction', {
        element1: 'ice', element2: 'lightning', targetId: 'enemy2', reactionType: 'freeze', attackerId: 'hero1', damage: 30,
      });
      EventBus.getInstance().emit('element:reaction', {
        element1: 'fire', element2: 'ice', targetId: 'enemy3', reactionType: 'ignite', attackerId: 'hero2', damage: 40,
      });

      const stats = StatsManager.getRunStats();
      expect(stats.elementReactions['ignite']).toBe(2);
      expect(stats.elementReactions['freeze']).toBe(1);
      expect(stats.elementReactions['shock']).toBeUndefined();
    });
  });

  describe('run duration tracking', () => {
    it('sets runDurationMs after finalizeRun', () => {
      // finalizeRun computes elapsed from runStartTime
      StatsManager.finalizeRun(false);

      const stats = StatsManager.getRunStats();
      expect(stats.runDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetRunStats', () => {
    it('resets all stats to zero', () => {
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'hero1', targetId: 'enemy1',
        amount: 100, damageType: 'physical', isCrit: false,
      });

      StatsManager.resetRunStats();

      const stats = StatsManager.getRunStats();
      expect(stats.totalDamage).toBe(0);
      expect(stats.totalKills).toBe(0);
    });
  });
});

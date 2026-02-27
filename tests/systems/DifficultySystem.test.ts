import { describe, it, expect } from 'vitest';
import { DifficultySystem } from '../../src/systems/DifficultySystem';
import { DIFFICULTY_LEVELS, getDifficultyConfig } from '../../src/config/difficulty';
import { UnitStats } from '../../src/types';

describe('DifficultySystem', () => {
  describe('getDifficultyConfig', () => {
    it('returns normal difficulty by id', () => {
      const config = getDifficultyConfig('normal');
      expect(config.id).toBe('normal');
      expect(config.enemyStatMultiplier).toBe(1.0);
      expect(config.goldMultiplier).toBe(1.0);
      expect(config.expMultiplier).toBe(1.0);
    });

    it('returns hard difficulty by id', () => {
      const config = getDifficultyConfig('hard');
      expect(config.id).toBe('hard');
      expect(config.enemyStatMultiplier).toBe(1.15);
      expect(config.goldMultiplier).toBe(1.2);
      expect(config.expMultiplier).toBe(1.2);
    });

    it('returns nightmare difficulty by id', () => {
      const config = getDifficultyConfig('nightmare');
      expect(config.id).toBe('nightmare');
      expect(config.enemyStatMultiplier).toBe(1.35);
    });

    it('returns hell difficulty by id', () => {
      const config = getDifficultyConfig('hell');
      expect(config.id).toBe('hell');
      expect(config.enemyStatMultiplier).toBe(1.6);
      expect(config.goldMultiplier).toBe(2.0);
      expect(config.expMultiplier).toBe(2.0);
    });

    it('defaults to normal for unknown difficulty id', () => {
      const config = getDifficultyConfig('nonexistent');
      expect(config.id).toBe('normal');
    });

    it('all 4 difficulty levels exist', () => {
      expect(DIFFICULTY_LEVELS.length).toBe(4);
    });
  });

  describe('scaleEnemyStats', () => {
    const baseStats: UnitStats = {
      maxHp: 100,
      hp: 100,
      attack: 50,
      defense: 30,
      magicPower: 20,
      magicResist: 15,
      speed: 80,
      attackSpeed: 1.0,
      attackRange: 100,
      critChance: 0.1,
      critDamage: 1.5,
    };

    it('normal difficulty preserves original stats', () => {
      const normal = getDifficultyConfig('normal');
      const scaled = DifficultySystem.scaleEnemyStats(baseStats, normal);
      expect(scaled.maxHp).toBe(100);
      expect(scaled.attack).toBe(50);
      expect(scaled.defense).toBe(30);
    });

    it('hard difficulty scales stats by 1.15x', () => {
      const hard = getDifficultyConfig('hard');
      const scaled = DifficultySystem.scaleEnemyStats(baseStats, hard);
      expect(scaled.maxHp).toBe(Math.round(100 * 1.15));
      expect(scaled.attack).toBe(Math.round(50 * 1.15));
      expect(scaled.defense).toBe(Math.round(30 * 1.15));
    });

    it('hell difficulty scales stats by 1.6x', () => {
      const hell = getDifficultyConfig('hell');
      const scaled = DifficultySystem.scaleEnemyStats(baseStats, hell);
      expect(scaled.maxHp).toBe(160);
      expect(scaled.attack).toBe(80);
      expect(scaled.defense).toBe(48);
    });

    it('speed is NOT scaled', () => {
      const hell = getDifficultyConfig('hell');
      const scaled = DifficultySystem.scaleEnemyStats(baseStats, hell);
      expect(scaled.speed).toBe(80); // unchanged
      expect(scaled.attackSpeed).toBe(1.0); // unchanged
      expect(scaled.attackRange).toBe(100); // unchanged
    });

    it('does not mutate the input stats', () => {
      const original = { ...baseStats };
      const hard = getDifficultyConfig('hard');
      DifficultySystem.scaleEnemyStats(baseStats, hard);
      expect(baseStats).toEqual(original);
    });
  });

  describe('scaleRewards', () => {
    it('normal difficulty does not change rewards', () => {
      const normal = getDifficultyConfig('normal');
      const { gold, exp } = DifficultySystem.scaleRewards(100, 50, normal);
      expect(gold).toBe(100);
      expect(exp).toBe(50);
    });

    it('hard difficulty scales rewards by 1.2x', () => {
      const hard = getDifficultyConfig('hard');
      const { gold, exp } = DifficultySystem.scaleRewards(100, 50, hard);
      expect(gold).toBe(120);
      expect(exp).toBe(60);
    });

    it('hell difficulty scales rewards by 2.0x', () => {
      const hell = getDifficultyConfig('hell');
      const { gold, exp } = DifficultySystem.scaleRewards(100, 50, hell);
      expect(gold).toBe(200);
      expect(exp).toBe(100);
    });
  });

  describe('getAdaptiveMultiplier', () => {
    it('returns 1.0 for 50% win rate (neutral)', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(0.5)).toBe(1.0);
    });

    it('returns 1.0 for 60% win rate (still neutral)', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(0.6)).toBe(1.0);
    });

    it('returns > 1.0 for high win rate (above 80%)', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(0.9)).toBeGreaterThan(1.0);
      expect(DifficultySystem.getAdaptiveMultiplier(0.9)).toBeCloseTo(1.1);
    });

    it('returns 1.2 for 100% win rate', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(1.0)).toBeCloseTo(1.2);
    });

    it('returns < 1.0 for low win rate (below 40%)', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(0.2)).toBeLessThan(1.0);
      expect(DifficultySystem.getAdaptiveMultiplier(0.2)).toBeCloseTo(0.9);
    });

    it('returns 0.8 for 0% win rate', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(0.0)).toBeCloseTo(0.8);
    });
  });

  describe('CHALLENGE_MODIFIERS', () => {
    it('solo_hero modifier exists with maxTeamSize 1', () => {
      const mod = DifficultySystem.CHALLENGE_MODIFIERS['solo_hero'];
      expect(mod).toBeDefined();
      expect(mod.maxTeamSize).toBe(1);
      expect(mod.rewardMultiplier).toBe(2.0);
    });

    it('no_shop modifier exists', () => {
      const mod = DifficultySystem.CHALLENGE_MODIFIERS['no_shop'];
      expect(mod).toBeDefined();
      expect(mod.shopDisabled).toBe(true);
    });

    it('glass_cannon has HP and damage multipliers', () => {
      const mod = DifficultySystem.CHALLENGE_MODIFIERS['glass_cannon'];
      expect(mod.hpMultiplier).toBe(0.5);
      expect(mod.damageMultiplier).toBe(2.0);
    });
  });
});

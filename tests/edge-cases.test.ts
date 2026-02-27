import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from './mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { DamageSystem } from '../src/systems/DamageSystem';
import { ElementSystem } from '../src/systems/ElementSystem';
import { ComboSystem } from '../src/systems/ComboSystem';
import { SynergySystem } from '../src/systems/SynergySystem';
import { TargetingSystem } from '../src/systems/TargetingSystem';
import { DifficultySystem } from '../src/systems/DifficultySystem';
import { EventBus } from '../src/systems/EventBus';
import { SeededRNG } from '../src/utils/rng';
import { RunManager } from '../src/managers/RunManager';
import { STARTING_GOLD } from '../src/constants';
import { createMockUnit } from './mocks/phaser';
import { getDifficultyConfig } from '../src/config/difficulty';
import { UnitStats } from '../src/types';

describe('Edge Cases', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
  });

  describe('negative HP protection', () => {
    it('mock unit HP does not go below 0', () => {
      const unit = createMockUnit({ currentHp: 10, maxHp: 100 });
      unit.takeDamage(9999);
      expect(unit.currentHp).toBe(0);
      expect(unit.isAlive).toBe(false);
    });

    it('DamageSystem ensures minimum 1 damage', () => {
      const rng = new SeededRNG(1);
      const ds = new DamageSystem(rng);

      const attacker = createMockUnit({
        stats: { attack: 1, critChance: 0, critDamage: 1.0 },
      });
      const target = createMockUnit({
        stats: { defense: 999999, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 1, 'physical',
      );
      expect(result.finalDamage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('empty array inputs', () => {
    it('TargetingSystem handles empty enemy list', () => {
      const unit = createMockUnit({ role: 'melee_dps' });
      const result = TargetingSystem.selectTarget(unit as any, [], []);
      expect(result).toBeNull();
    });

    it('SynergySystem handles empty hero list', () => {
      const synergy = new SynergySystem();
      const result = synergy.calculateActiveSynergies([], new Map());
      expect(result.activeSynergies).toEqual([]);
      expect(result.heroBonuses.size).toBe(0);
    });

    it('ComboSystem handles non-existent attacker', () => {
      const combo = new ComboSystem();
      expect(combo.getComboCount('nonexistent')).toBe(0);
      expect(combo.getComboMultiplier('nonexistent')).toBe(1.0);
    });
  });

  describe('extreme values', () => {
    it('very high defense does not produce negative damage', () => {
      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);

      const attacker = createMockUnit({
        stats: { attack: 100, critChance: 0, critDamage: 1.5 },
      });
      const target = createMockUnit({
        stats: { defense: Number.MAX_SAFE_INTEGER, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 100, 'physical',
      );
      expect(result.finalDamage).toBeGreaterThanOrEqual(1);
    });

    it('zero base damage results in minimum damage after rounding', () => {
      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);

      const attacker = createMockUnit({
        stats: { attack: 0, critChance: 0, critDamage: 1.0 },
      });
      const target = createMockUnit({
        stats: { defense: 0, maxHp: 1000, hp: 1000 },
      });

      const result = ds.calculateDamage(
        attacker as any, target as any, 0, 'physical',
      );
      expect(result.finalDamage).toBeGreaterThanOrEqual(0);
    });

    it('scaleEnemyStats with zero multiplier produces 0 stats', () => {
      const baseStats: UnitStats = {
        maxHp: 100, hp: 100, attack: 50, defense: 30,
        magicPower: 20, magicResist: 15, speed: 80,
        attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
      };
      const zeroDifficulty = {
        ...getDifficultyConfig('normal'),
        enemyStatMultiplier: 0,
      };
      const scaled = DifficultySystem.scaleEnemyStats(baseStats, zeroDifficulty);
      expect(scaled.maxHp).toBe(0);
      expect(scaled.attack).toBe(0);
    });

    it('adaptive multiplier handles edge win rates', () => {
      expect(DifficultySystem.getAdaptiveMultiplier(0)).toBeCloseTo(0.8);
      expect(DifficultySystem.getAdaptiveMultiplier(1)).toBeCloseTo(1.2);
      expect(DifficultySystem.getAdaptiveMultiplier(0.5)).toBe(1.0);
    });
  });

  describe('SeededRNG edge cases', () => {
    it('seed 0 still produces valid output', () => {
      const rng = new SeededRNG(0);
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('negative seed works', () => {
      const rng = new SeededRNG(-12345);
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('very large seed works', () => {
      const rng = new SeededRNG(Number.MAX_SAFE_INTEGER);
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  describe('RunManager edge cases', () => {
    it('spendGold with 0 amount always succeeds', () => {
      const rm = RunManager.getInstance();
      rm.newRun(1);
      expect(rm.spendGold(0)).toBe(true);
      expect(rm.getGold()).toBe(STARTING_GOLD);
    });

    it('addGold with 0 does nothing', () => {
      const rm = RunManager.getInstance();
      rm.newRun(1);
      rm.addGold(0);
      expect(rm.getGold()).toBe(STARTING_GOLD);
    });

    it('multiple newRun calls reset state', () => {
      const rm = RunManager.getInstance();
      rm.newRun(1);
      rm.addGold(999);
      rm.newRun(2);
      expect(rm.getGold()).toBe(STARTING_GOLD);
    });
  });

  describe('ElementSystem with unusual inputs', () => {
    it('both elements undefined returns 1.0', () => {
      expect(ElementSystem.getElementMultiplier(undefined, undefined)).toBe(1.0);
    });

    it('same element returns 1.0 for all types', () => {
      const elements = ['fire', 'ice', 'lightning', 'dark', 'holy'] as const;
      for (const e of elements) {
        expect(ElementSystem.getElementMultiplier(e, e)).toBe(1.0);
      }
    });
  });
});

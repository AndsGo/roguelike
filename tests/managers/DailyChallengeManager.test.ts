import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

// Set up mock localStorage before importing modules
const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import {
  DailyChallengeManager,
  DailyRule,
} from '../../src/managers/DailyChallengeManager';

describe('DailyChallengeManager', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('should generate deterministic seed from date string', () => {
    const seed1 = DailyChallengeManager.generateSeedFromDate('20260308');
    const seed2 = DailyChallengeManager.generateSeedFromDate('20260308');
    expect(seed1).toBe(seed2);
    expect(typeof seed1).toBe('number');
    expect(Number.isFinite(seed1)).toBe(true);
  });

  it('should generate different seeds for different dates', () => {
    const seed1 = DailyChallengeManager.generateSeedFromDate('20260308');
    const seed2 = DailyChallengeManager.generateSeedFromDate('20260309');
    expect(seed1).not.toBe(seed2);
  });

  it('should generate daily modifiers deterministically', () => {
    const seed = DailyChallengeManager.generateSeedFromDate('20260308');
    const mod1 = DailyChallengeManager.getDailyModifiers(seed);
    const mod2 = DailyChallengeManager.getDailyModifiers(seed);
    expect(mod1).toEqual(mod2);
  });

  it('should include title and rules in modifiers', () => {
    const seed = DailyChallengeManager.generateSeedFromDate('20260308');
    const modifiers = DailyChallengeManager.getDailyModifiers(seed);

    expect(modifiers.title).toBeTruthy();
    expect(typeof modifiers.title).toBe('string');
    expect(modifiers.rules.length).toBeGreaterThanOrEqual(1);
    expect(modifiers.rules.length).toBeLessThanOrEqual(2);
    expect(modifiers.seed).toBe(seed);
    expect(['hard', 'nightmare']).toContain(modifiers.difficulty);
    expect(typeof modifiers.description).toBe('string');
    expect(modifiers.description.length).toBeGreaterThan(0);

    for (const rule of modifiers.rules) {
      expect(rule.type).toBeTruthy();
      expect(rule.label).toBeTruthy();
      expect(rule.value).toBeDefined();
    }
  });

  it('should check daily completion status', () => {
    expect(DailyChallengeManager.isCompletedToday()).toBe(false);

    DailyChallengeManager.markCompleted();
    expect(DailyChallengeManager.isCompletedToday()).toBe(true);
  });

  it('gold_modifier rule should multiply gold', () => {
    const rules: DailyRule[] = [
      { type: 'gold_modifier', label: '金币+50%', value: 1.5 },
    ];
    expect(DailyChallengeManager.applyGoldModifier(100, rules)).toBe(150);
  });

  it('hp_modifier rule should multiply HP', () => {
    const rules: DailyRule[] = [
      { type: 'hp_modifier', label: '英雄HP-20%', value: 0.8 },
    ];
    expect(DailyChallengeManager.applyHPModifier(1000, rules)).toBe(800);
  });

  it('should return unmodified value when no matching rules', () => {
    const rules: DailyRule[] = [
      { type: 'enemy_element', label: '敌人强化: 火属性+20%', value: 'fire' },
    ];
    expect(DailyChallengeManager.applyGoldModifier(100, rules)).toBe(100);
    expect(DailyChallengeManager.applyHPModifier(1000, rules)).toBe(1000);
  });

  it('applyGoldModifier with 0.7 multiplier (reduction)', () => {
    const rules: DailyRule[] = [{ type: 'gold_modifier', label: '金币-30%', value: 0.7 }];
    expect(DailyChallengeManager.applyGoldModifier(100, rules)).toBe(70);
  });

  it('getEnemyElementBonus returns correct element among multiple rules', () => {
    const rules: DailyRule[] = [
      { type: 'enemy_element', label: '火强化', value: 'fire' },
      { type: 'gold_modifier', label: '金币-30%', value: 0.7 },
    ];
    expect(DailyChallengeManager.getEnemyElementBonus(rules)).toBe('fire');
  });

  it('should return enemy element bonus from rules', () => {
    const rulesWithElement: DailyRule[] = [
      { type: 'enemy_element', label: '敌人强化: 火属性+20%', value: 'fire' },
    ];
    expect(DailyChallengeManager.getEnemyElementBonus(rulesWithElement)).toBe('fire');

    const rulesWithout: DailyRule[] = [
      { type: 'gold_modifier', label: '金币+50%', value: 1.5 },
    ];
    expect(DailyChallengeManager.getEnemyElementBonus(rulesWithout)).toBeNull();
  });
});

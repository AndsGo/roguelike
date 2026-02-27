import { describe, it, expect, beforeEach } from 'vitest';
import { TargetingSystem } from '../../src/systems/TargetingSystem';
import { createMockUnit } from '../mocks/phaser';

describe('TargetingSystem', () => {
  beforeEach(() => {
    TargetingSystem.resetThreat();
  });

  describe('threat tracking', () => {
    it('registerThreat accumulates threat', () => {
      TargetingSystem.registerThreat('target1', 'attacker1', 50);
      TargetingSystem.registerThreat('target1', 'attacker1', 30);
      expect(TargetingSystem.getThreatLevel('target1')).toBe(80);
    });

    it('resetThreat clears all threat', () => {
      TargetingSystem.registerThreat('target1', 'attacker1', 100);
      TargetingSystem.resetThreat();
      expect(TargetingSystem.getThreatLevel('target1')).toBe(0);
    });

    it('no threat returns 0', () => {
      expect(TargetingSystem.getThreatLevel('nonexistent')).toBe(0);
    });
  });

  describe('selectTarget', () => {
    it('returns null when no living enemies', () => {
      const unit = createMockUnit({ role: 'melee_dps' });
      const result = TargetingSystem.selectTarget(unit as any, [], []);
      expect(result).toBeNull();
    });

    it('returns the only available enemy', () => {
      const unit = createMockUnit({ role: 'melee_dps', x: 100 });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false, x: 200 });

      const result = TargetingSystem.selectTarget(
        unit as any, [enemy as any], [unit as any],
      );
      expect(result).toBe(enemy);
    });

    it('filters out dead enemies', () => {
      const unit = createMockUnit({ role: 'melee_dps', x: 100 });
      const deadEnemy = createMockUnit({ unitId: 'e1', x: 200 });
      deadEnemy.isAlive = false;
      const aliveEnemy = createMockUnit({ unitId: 'e2', x: 300 });

      const result = TargetingSystem.selectTarget(
        unit as any, [deadEnemy as any, aliveEnemy as any], [unit as any],
      );
      expect(result).toBe(aliveEnemy);
    });

    it('healer targets ally with lowest HP percentage', () => {
      const healer = createMockUnit({ role: 'healer', unitId: 'healer1' });
      const ally1 = createMockUnit({
        unitId: 'ally1', currentHp: 400, maxHp: 500,
        stats: { maxHp: 500, hp: 400 },
      });
      ally1.currentHp = 400;
      const ally2 = createMockUnit({
        unitId: 'ally2', currentHp: 100, maxHp: 500,
        stats: { maxHp: 500, hp: 100 },
      });
      ally2.currentHp = 100;

      const result = TargetingSystem.selectTarget(
        healer as any, [], [healer as any, ally1 as any, ally2 as any],
      );
      expect(result).toBe(ally2);
    });

    it('healer returns null if all allies are above 90% HP', () => {
      const healer = createMockUnit({ role: 'healer', unitId: 'healer1' });
      const ally = createMockUnit({
        unitId: 'ally1', currentHp: 480, maxHp: 500,
        stats: { maxHp: 500, hp: 480 },
      });
      ally.currentHp = 480;

      const result = TargetingSystem.selectTarget(
        healer as any, [], [healer as any, ally as any],
      );
      expect(result).toBeNull();
    });

    it('taunt takes precedence over normal targeting', () => {
      const unit = createMockUnit({ role: 'melee_dps', x: 100 });
      const tauntEnemy = createMockUnit({ unitId: 'taunter', x: 500 });
      const closerEnemy = createMockUnit({ unitId: 'closer', x: 150 });

      unit.statusEffects = [{ id: 'taunt1', type: 'taunt', name: 'taunt', duration: 3, value: 0 }];
      unit.tauntTarget = tauntEnemy;

      const result = TargetingSystem.selectTarget(
        unit as any,
        [tauntEnemy as any, closerEnemy as any],
        [unit as any],
      );
      expect(result).toBe(tauntEnemy);
    });

    it('element_priority strategy targets element-advantaged enemy', () => {
      const unit = createMockUnit({
        role: 'ranged_dps', element: 'fire', x: 100,
      });
      const iceEnemy = createMockUnit({
        unitId: 'ice_enemy', element: 'ice', x: 500,
        stats: { maxHp: 500, hp: 500, attack: 50, attackSpeed: 1.0, magicPower: 0 },
      });
      const neutralEnemy = createMockUnit({
        unitId: 'neutral_enemy', x: 200,
        stats: { maxHp: 500, hp: 500, attack: 50, attackSpeed: 1.0, magicPower: 0 },
      });

      const result = TargetingSystem.selectTarget(
        unit as any,
        [neutralEnemy as any, iceEnemy as any],
        [unit as any],
        'element_priority',
      );
      expect(result).toBe(iceEnemy);
    });

    it('lowest_hp strategy targets enemy with least HP', () => {
      const unit = createMockUnit({ role: 'melee_dps', x: 100 });
      const highHp = createMockUnit({
        unitId: 'high', currentHp: 500, x: 200,
        stats: { maxHp: 500, hp: 500, attack: 50, attackSpeed: 1.0, magicPower: 0 },
      });
      highHp.currentHp = 500;
      const lowHp = createMockUnit({
        unitId: 'low', currentHp: 50, x: 300,
        stats: { maxHp: 500, hp: 50, attack: 50, attackSpeed: 1.0, magicPower: 0 },
      });
      lowHp.currentHp = 50;

      const result = TargetingSystem.selectTarget(
        unit as any,
        [highHp as any, lowHp as any],
        [unit as any],
        'lowest_hp',
      );
      expect(result).toBe(lowHp);
    });
  });
});

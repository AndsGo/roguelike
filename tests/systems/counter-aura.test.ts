import { describe, it, expect, beforeEach } from 'vitest';
import '../../tests/mocks/phaser-stub';
import Phaser from 'phaser';
import { Unit } from '../../src/entities/Unit';
import { StatusEffect, UnitStats } from '../../src/types';

function makeStats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 500, hp: 500, attack: 50, defense: 0,
    magicPower: 0, magicResist: 0, speed: 50,
    attackSpeed: 1, attackRange: 80, critChance: 0, critDamage: 1.5,
    ...overrides,
  };
}

describe('Counter Aura (P1-11)', () => {
  let scene: any;

  beforeEach(() => {
    scene = new Phaser.Scene();
  });

  describe('counter_aura reflection', () => {
    it('reflects 15% of damage back to lastAttacker', () => {
      const defender = new Unit(scene, 100, 200, 'test_defender', 'Defender', 'tank',
        makeStats({ maxHp: 500, hp: 500 }), true);
      const attacker = new Unit(scene, 300, 200, 'test_attacker', 'Attacker', 'melee_dps',
        makeStats({ maxHp: 300, hp: 300, attack: 50 }), false);

      const counterEffect: StatusEffect = {
        id: 'counter_aura_test',
        type: 'counter_aura',
        name: 'counter_aura',
        duration: 8,
        value: 0.15,
      };
      defender.statusEffects.push(counterEffect);
      defender.lastAttacker = attacker;

      const attackerHpBefore = attacker.currentHp;
      defender.takeDamage(100);

      expect(attackerHpBefore - attacker.currentHp).toBe(15);
    });

    it('does NOT cause infinite loop (re-entrant guard)', () => {
      const unit1 = new Unit(scene, 100, 200, 'unit1', 'Unit1', 'tank',
        makeStats({ maxHp: 500, hp: 500 }), true);
      const unit2 = new Unit(scene, 300, 200, 'unit2', 'Unit2', 'melee_dps',
        makeStats({ maxHp: 500, hp: 500 }), false);

      const counter: StatusEffect = {
        id: 'counter_test', type: 'counter_aura', name: 'counter_aura',
        duration: 8, value: 0.15,
      };
      unit1.statusEffects.push({ ...counter, id: 'c1' });
      unit2.statusEffects.push({ ...counter, id: 'c2' });
      unit1.lastAttacker = unit2;
      unit2.lastAttacker = unit1;

      unit1.takeDamage(100);
      expect(unit1.currentHp).toBe(400);
      expect(unit2.currentHp).toBe(485);
    });

    it('does not reflect when no counter_aura', () => {
      const defender = new Unit(scene, 100, 200, 'def', 'Def', 'tank',
        makeStats({ maxHp: 500, hp: 500 }), true);
      const attacker = new Unit(scene, 300, 200, 'atk', 'Atk', 'melee_dps',
        makeStats({ maxHp: 300, hp: 300 }), false);
      defender.lastAttacker = attacker;

      const atkHpBefore = attacker.currentHp;
      defender.takeDamage(100);
      expect(attacker.currentHp).toBe(atkHpBefore);
    });
  });

  describe('addShield', () => {
    it('adds temporary HP shield that absorbs damage', () => {
      const unit = new Unit(scene, 100, 200, 'shield_test', 'ShieldTest', 'tank',
        makeStats({ maxHp: 500, hp: 500 }), true);

      unit.addShield(50, 8);
      const actual = unit.takeDamage(30);
      expect(actual).toBe(0);
      expect(unit.currentHp).toBe(500);
    });

    it('partially absorbs damage when shield is less than damage', () => {
      const unit = new Unit(scene, 100, 200, 'shield_test2', 'ShieldTest2', 'tank',
        makeStats({ maxHp: 500, hp: 500 }), true);

      unit.addShield(30, 8);
      const actual = unit.takeDamage(50);
      expect(actual).toBe(20);
      expect(unit.currentHp).toBe(480);
    });

    it('decays shield after duration expires', () => {
      const unit = new Unit(scene, 100, 200, 'decay_test', 'DecayTest', 'tank',
        makeStats({ maxHp: 500, hp: 500 }), true);

      unit.addShield(50, 2); // 2 seconds = 2000ms
      unit.decayShield(2000); // fully expired

      // Shield should be gone, damage goes through
      const actual = unit.takeDamage(30);
      expect(actual).toBe(30);
      expect(unit.currentHp).toBe(470);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import '../../tests/mocks/phaser-stub';
import Phaser from 'phaser';
import { Unit } from '../../src/entities/Unit';
import { UnitStats } from '../../src/types';
import { ElementSystem } from '../../src/systems/ElementSystem';
import { RelicSystem } from '../../src/systems/RelicSystem';
import { EventBus } from '../../src/systems/EventBus';
import { ELEMENT_REACTIONS } from '../../src/config/elements';
import { SeededRNG } from '../../src/utils/rng';

function makeStats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 500, hp: 500, attack: 50, defense: 0,
    magicPower: 50, magicResist: 0, speed: 80,
    attackSpeed: 1, attackRange: 80, critChance: 0, critDamage: 1.5,
    ...overrides,
  };
}

function makeUnit(scene: any, overrides: any = {}): Unit {
  return new Unit(
    scene, 100, 200,
    overrides.id ?? 'test_unit',
    overrides.name ?? 'TestUnit',
    overrides.role ?? 'melee_dps',
    makeStats({ maxHp: overrides.maxHp ?? 500, hp: overrides.maxHp ?? 500 }),
    overrides.isHero ?? false,
    overrides.element,
  );
}

describe('Element relic secondary effects (P1-12)', () => {
  let scene: any;

  beforeEach(() => {
    scene = new Phaser.Scene();
    RelicSystem.deactivate();
  });

  describe('fire_emblem — burn DoT on melt reaction', () => {
    it('applies burn DoT after fire+ice reaction when relic held', () => {
      const target = makeUnit(scene, { id: 'target', element: 'ice' });
      const attacker = makeUnit(scene, { id: 'atk', element: 'fire', isHero: true });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'fire_emblem', level: 1, triggerCount: 0 }],
        [attacker], [target], rng,
      );

      const reaction = ELEMENT_REACTIONS['fire+ice'];
      ElementSystem.applyElementReaction(reaction, 'fire', 'ice', target, 100, attacker, rng);

      const burnEffect = target.statusEffects.find(e => e.name === 'burn' && e.type === 'dot');
      expect(burnEffect).toBeDefined();
      expect(burnEffect!.duration).toBe(3);
    });

    it('does not apply burn DoT without the relic', () => {
      const target = makeUnit(scene, { id: 'target', element: 'ice' });
      const attacker = makeUnit(scene, { id: 'atk', element: 'fire', isHero: true });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits([], [attacker], [target], rng);

      const reaction = ELEMENT_REACTIONS['fire+ice'];
      ElementSystem.applyElementReaction(reaction, 'fire', 'ice', target, 100, attacker, rng);

      const burnEffect = target.statusEffects.find(e => e.name === 'burn' && e.type === 'dot');
      expect(burnEffect).toBeUndefined();
    });
  });

  describe('ice_crystal_pendant — extended superconduct defense_down', () => {
    it('extends defense_down from 5s to 7s on superconduct', () => {
      const target = makeUnit(scene, { id: 'target', element: 'lightning' });
      const attacker = makeUnit(scene, { id: 'atk', element: 'ice', isHero: true });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'ice_crystal_pendant', level: 1, triggerCount: 0 }],
        [attacker], [target], rng,
      );

      const reaction = ELEMENT_REACTIONS['ice+lightning'];
      ElementSystem.applyElementReaction(reaction, 'ice', 'lightning', target, 100, attacker, rng);

      const defDown = target.statusEffects.find(e => e.name === 'defense_down');
      expect(defDown).toBeDefined();
      expect(defDown!.duration).toBe(7);
    });

    it('defense_down stays at 5s without the relic', () => {
      const target = makeUnit(scene, { id: 'target', element: 'lightning' });
      const attacker = makeUnit(scene, { id: 'atk', element: 'ice', isHero: true });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits([], [attacker], [target], rng);

      const reaction = ELEMENT_REACTIONS['ice+lightning'];
      ElementSystem.applyElementReaction(reaction, 'ice', 'lightning', target, 100, attacker, rng);

      const defDown = target.statusEffects.find(e => e.name === 'defense_down');
      expect(defDown).toBeDefined();
      expect(defDown!.duration).toBe(5);
    });
  });

  describe('lightning_rod — overload chain to extra target', () => {
    it('chains 50% reaction damage to 1 nearby enemy', () => {
      const target = makeUnit(scene, { id: 'target', element: 'fire' });
      const nearby = makeUnit(scene, { id: 'nearby' });
      const attacker = makeUnit(scene, { id: 'atk', element: 'lightning', isHero: true });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'lightning_rod', level: 1, triggerCount: 0 }],
        [attacker], [target, nearby], rng,
      );

      const nearbyHpBefore = nearby.currentHp;
      const reaction = ELEMENT_REACTIONS['fire+lightning'];
      ElementSystem.applyElementReaction(reaction, 'lightning', 'fire', target, 100, attacker, rng);

      expect(nearby.currentHp).toBeLessThan(nearbyHpBefore);
    });

    it('does not chain without the relic', () => {
      const target = makeUnit(scene, { id: 'target', element: 'fire' });
      const nearby = makeUnit(scene, { id: 'nearby' });
      const attacker = makeUnit(scene, { id: 'atk', element: 'lightning', isHero: true });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits([], [attacker], [target, nearby], rng);

      const nearbyHpBefore = nearby.currentHp;
      const reaction = ELEMENT_REACTIONS['fire+lightning'];
      ElementSystem.applyElementReaction(reaction, 'lightning', 'fire', target, 100, attacker, rng);

      expect(nearby.currentHp).toBe(nearbyHpBefore);
    });
  });

  describe('dark_grimoire — lifesteal on dark attacks', () => {
    it('heals dark attacker on damage when chance passes', () => {
      const attacker = makeUnit(scene, { id: 'dark_hero', element: 'dark', isHero: true, maxHp: 500 });
      attacker.currentHp = 400;
      const target = makeUnit(scene, { id: 'enemy1' });

      // Find a seed where rng.chance(0.15) returns true
      let healTriggered = false;
      for (let seed = 1; seed <= 200; seed++) {
        const testRng = new SeededRNG(seed);
        if (testRng.chance(0.15)) {
          // Reset attacker HP
          attacker.currentHp = 400;

          const rng2 = new SeededRNG(seed);
          RelicSystem.deactivate();
          RelicSystem.activateWithUnits(
            [{ id: 'dark_grimoire', level: 1, triggerCount: 0 }],
            [attacker], [target], rng2,
          );

          EventBus.getInstance().emit('unit:damage', {
            sourceId: 'dark_hero',
            targetId: 'enemy1',
            amount: 100,
            damageType: 'physical',
            isCrit: false,
          });

          if (attacker.currentHp > 400) {
            healTriggered = true;
            expect(attacker.currentHp).toBe(420); // 20% of 100 = 20
          }
          break;
        }
      }

      expect(healTriggered).toBe(true);
    });

    it('does not heal non-dark hero', () => {
      const attacker = makeUnit(scene, { id: 'fire_hero', element: 'fire', isHero: true, maxHp: 500 });
      attacker.currentHp = 400;
      const target = makeUnit(scene, { id: 'enemy1' });

      // Use a seed that passes chance
      for (let seed = 1; seed <= 200; seed++) {
        const testRng = new SeededRNG(seed);
        if (testRng.chance(0.15)) {
          attacker.currentHp = 400;
          const rng2 = new SeededRNG(seed);
          RelicSystem.deactivate();
          RelicSystem.activateWithUnits(
            [{ id: 'dark_grimoire', level: 1, triggerCount: 0 }],
            [attacker], [target], rng2,
          );

          EventBus.getInstance().emit('unit:damage', {
            sourceId: 'fire_hero',
            targetId: 'enemy1',
            amount: 100,
            damageType: 'physical',
            isCrit: false,
          });

          expect(attacker.currentHp).toBe(400);
          break;
        }
      }
    });
  });

  describe('holy_scripture — death prevention with shield', () => {
    it('prevents death for holy hero once per battle', () => {
      const hero = makeUnit(scene, { id: 'holy_hero', element: 'holy', isHero: true, maxHp: 100 });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'holy_scripture', level: 1, triggerCount: 0 }],
        [hero], [], rng,
      );

      hero.takeDamage(200);

      expect(hero.isAlive).toBe(true);
      expect(hero.currentHp).toBe(1);
    });

    it('only triggers once per battle', () => {
      const hero = makeUnit(scene, { id: 'holy_hero2', element: 'holy', isHero: true, maxHp: 100 });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'holy_scripture', level: 1, triggerCount: 0 }],
        [hero], [], rng,
      );

      hero.takeDamage(200);
      expect(hero.isAlive).toBe(true);

      hero.currentHp = 50;
      hero.takeDamage(200);
      expect(hero.isAlive).toBe(false);
    });

    it('does not trigger for non-holy heroes', () => {
      const hero = makeUnit(scene, { id: 'fire_hero', element: 'fire', isHero: true, maxHp: 100 });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'holy_scripture', level: 1, triggerCount: 0 }],
        [hero], [], rng,
      );

      hero.takeDamage(200);
      expect(hero.isAlive).toBe(false);
    });
  });
});

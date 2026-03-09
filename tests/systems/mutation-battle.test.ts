import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaManager } from '../../src/managers/MetaManager';
import { DamageSystem } from '../../src/systems/DamageSystem';
import { SkillSystem } from '../../src/systems/SkillSystem';
import { ElementSystem } from '../../src/systems/ElementSystem';
import { RelicSystem } from '../../src/systems/RelicSystem';
import { SeededRNG } from '../../src/utils/rng';
import { EventBus } from '../../src/systems/EventBus';
import { DamageAccumulator } from '../../src/systems/DamageAccumulator';
import { createMockUnit } from '../mocks/phaser';

// Mock DamageNumber to avoid scene rendering issues in tests
vi.mock('../../src/components/DamageNumber', () => ({
  DamageNumber: vi.fn(),
}));

// Helper: unlock mutation tier and purchase a specific mutation
function unlockAndPurchase(mutationId: string): void {
  MetaManager.addMetaCurrency(10000);
  for (let i = 0; i < 10; i++) {
    MetaManager.purchaseUpgrade('starting_gold');
    if (MetaManager.getUpgrade('starting_gold')!.level >= 5) {
      MetaManager.purchaseUpgrade('starting_hp');
    }
  }
  MetaManager.purchaseMutation(mutationId);
}

describe('Battle mutations', () => {
  beforeEach(() => {
    MetaManager.resetAll();
    EventBus.getInstance().reset();
    RelicSystem.reset();
  });

  describe('overkill_splash', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('overkill_splash');
      expect(MetaManager.hasMutation('overkill_splash')).toBe(true);
    });

    it('costs 150 meta currency', () => {
      const def = MetaManager.MUTATION_DEFS.find(d => d.id === 'overkill_splash');
      expect(def?.cost).toBe(150);
    });

    it('splashes 30% excess damage to another enemy on kill', () => {
      unlockAndPurchase('overkill_splash');

      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);

      const attacker = createMockUnit({
        unitId: 'hero1',
        isHero: true,
        stats: { attack: 200, critChance: 0, critDamage: 1.5, defense: 0 },
      });

      // Target with low HP — will die from the hit
      const target = createMockUnit({
        unitId: 'enemy1',
        isHero: false,
        currentHp: 10,
        maxHp: 500,
        stats: { defense: 0, maxHp: 500, hp: 10, magicResist: 0 },
      });

      // Splash target — alive enemy
      const splashTarget = createMockUnit({
        unitId: 'enemy2',
        isHero: false,
        currentHp: 500,
        maxHp: 500,
        stats: { defense: 0, maxHp: 500, hp: 500, magicResist: 0 },
      });

      // Set up RelicSystem with enemies so getSplashTargets works
      RelicSystem.activateWithUnits([], [attacker as any], [target as any, splashTarget as any], rng);

      const hpBefore = (splashTarget as any).currentHp;
      ds.applyDamage(attacker as any, target as any, 'physical', 200);

      // Target should be dead
      expect((target as any).isAlive).toBe(false);

      // Splash target should have taken damage (30% of excess)
      expect((splashTarget as any).currentHp).toBeLessThan(hpBefore);
    });

    it('does not splash when mutation is not purchased', () => {
      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);

      const attacker = createMockUnit({
        unitId: 'hero1',
        isHero: true,
        stats: { attack: 200, critChance: 0, critDamage: 1.5, defense: 0 },
      });

      const target = createMockUnit({
        unitId: 'enemy1',
        isHero: false,
        currentHp: 10,
        maxHp: 500,
        stats: { defense: 0, maxHp: 500, hp: 10, magicResist: 0 },
      });

      const splashTarget = createMockUnit({
        unitId: 'enemy2',
        isHero: false,
        currentHp: 500,
        maxHp: 500,
        stats: { defense: 0, maxHp: 500, hp: 500, magicResist: 0 },
      });

      RelicSystem.activateWithUnits([], [attacker as any], [target as any, splashTarget as any], rng);

      const hpBefore = (splashTarget as any).currentHp;
      ds.applyDamage(attacker as any, target as any, 'physical', 200);

      // No splash — hp unchanged
      expect((splashTarget as any).currentHp).toBe(hpBefore);
    });
  });

  describe('crit_cooldown', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('crit_cooldown');
      expect(MetaManager.hasMutation('crit_cooldown')).toBe(true);
    });

    it('reduces all skill cooldowns by 1s on crit', () => {
      unlockAndPurchase('crit_cooldown');

      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);
      const ss = new SkillSystem(rng, ds);

      const unit = createMockUnit({
        unitId: 'hero1',
        isHero: true,
        stats: { attack: 100, critChance: 1.0, critDamage: 2.0, defense: 0 },
      });

      const target = createMockUnit({
        unitId: 'enemy1',
        isHero: false,
        currentHp: 9999,
        maxHp: 9999,
        stats: { defense: 0, maxHp: 9999, hp: 9999, magicResist: 0 },
      });

      // Set up skill cooldowns
      (unit as any).skillCooldowns.set('skill_a', 5);
      (unit as any).skillCooldowns.set('skill_b', 3);
      (unit as any).target = target;

      const skill = {
        id: 'test_skill',
        name: 'Test',
        description: '',
        cooldown: 8,
        damageType: 'physical' as const,
        targetType: 'enemy' as const,
        baseDamage: 50,
        scalingStat: 'attack' as const,
        scalingRatio: 1.0,
        range: 200,
      };

      (unit as any).skills = [skill];

      ss.executeSkill(unit as any, skill as any, [unit as any], [target as any]);

      // With 100% crit chance, cooldowns should be reduced by 1s
      expect((unit as any).skillCooldowns.get('skill_a')).toBe(4);
      expect((unit as any).skillCooldowns.get('skill_b')).toBe(2);
    });

    it('does not reduce cooldowns without mutation', () => {
      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);
      const ss = new SkillSystem(rng, ds);

      const unit = createMockUnit({
        unitId: 'hero1',
        isHero: true,
        stats: { attack: 100, critChance: 1.0, critDamage: 2.0, defense: 0 },
      });

      const target = createMockUnit({
        unitId: 'enemy1',
        isHero: false,
        currentHp: 9999,
        maxHp: 9999,
        stats: { defense: 0, maxHp: 9999, hp: 9999, magicResist: 0 },
      });

      (unit as any).skillCooldowns.set('skill_a', 5);
      (unit as any).target = target;

      const skill = {
        id: 'test_skill',
        name: 'Test',
        description: '',
        cooldown: 8,
        damageType: 'physical' as const,
        targetType: 'enemy' as const,
        baseDamage: 50,
        scalingStat: 'attack' as const,
        scalingRatio: 1.0,
        range: 200,
      };

      (unit as any).skills = [skill];

      ss.executeSkill(unit as any, skill as any, [unit as any], [target as any]);

      // Without mutation, cooldowns stay the same
      expect((unit as any).skillCooldowns.get('skill_a')).toBe(5);
    });
  });

  describe('heal_shield', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('heal_shield');
      expect(MetaManager.hasMutation('heal_shield')).toBe(true);
    });

    it('converts overflow healing to shield at 50% efficiency', () => {
      unlockAndPurchase('heal_shield');

      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);

      const healer = createMockUnit({ unitId: 'healer1', isHero: true });
      const target = createMockUnit({
        unitId: 'hero2',
        isHero: true,
        currentHp: 490,
        maxHp: 500,
        stats: { maxHp: 500, hp: 490, defense: 0 },
      });

      // Heal for 100: 10 actual heal (to reach 500), 90 overflow → 45 shield
      ds.applyHeal(healer as any, target as any, 100);

      // currentHp should be maxHp (500) + shield (Math.round(90 * 0.5) = 45)
      expect((target as any).currentHp).toBe(500 + 45);
    });

    it('does not apply shield without mutation', () => {
      const rng = new SeededRNG(42);
      const ds = new DamageSystem(rng);

      const healer = createMockUnit({ unitId: 'healer1', isHero: true });
      const target = createMockUnit({
        unitId: 'hero2',
        isHero: true,
        currentHp: 490,
        maxHp: 500,
        stats: { maxHp: 500, hp: 490, defense: 0 },
      });

      ds.applyHeal(healer as any, target as any, 100);

      // Without mutation, hp caps at maxHp
      expect((target as any).currentHp).toBe(500);
    });
  });

  describe('reaction_chain', () => {
    it('mutation can be purchased and checked', () => {
      unlockAndPurchase('reaction_chain');
      expect(MetaManager.hasMutation('reaction_chain')).toBe(true);
    });

    it('costs 130 meta currency', () => {
      const def = MetaManager.MUTATION_DEFS.find(d => d.id === 'reaction_chain');
      expect(def?.cost).toBe(130);
    });
  });

  describe('mutation gate requirement', () => {
    it('cannot purchase mutations without enough total upgrade levels', () => {
      MetaManager.addMetaCurrency(10000);
      const result = MetaManager.purchaseMutation('overkill_splash');
      expect(result).toBe(false);
      expect(MetaManager.hasMutation('overkill_splash')).toBe(false);
    });
  });
});

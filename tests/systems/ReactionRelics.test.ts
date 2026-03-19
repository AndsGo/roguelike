import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RelicSystem } from '../../src/systems/RelicSystem';
import { SeededRNG } from '../../src/utils/rng';

function createMockUnit(overrides: Record<string, any> = {}) {
  return {
    unitId: overrides.unitId ?? 'u1',
    isHero: overrides.isHero ?? true,
    isAlive: overrides.isAlive ?? true,
    currentHp: overrides.currentHp ?? 400,
    currentStats: {
      maxHp: overrides.maxHp ?? 500,
      attack: 50,
      defense: 20,
      magicPower: 30,
      magicResist: 10,
      speed: 100,
      attackSpeed: 1.0,
      attackRange: 100,
      critChance: 0.1,
      critDamage: 1.5,
      ...(overrides.currentStats ?? {}),
    },
    statusEffects: overrides.statusEffects ?? [],
    heal: overrides.heal ?? vi.fn(),
    takeDamage: overrides.takeDamage ?? vi.fn(),
    scene: overrides.scene ?? {
      time: {
        delayedCall: vi.fn((delay: number, cb: () => void) => { cb(); }),
      },
    },
    skillCooldowns: new Map(),
    role: overrides.role ?? 'melee_dps',
    element: overrides.element ?? 'fire',
    classType: overrides.classType ?? 'warrior',
    invalidateStats: vi.fn(),
  } as any;
}

describe('Reaction Relics', () => {
  beforeEach(() => {
    RelicSystem.reset();
  });

  describe('melt_heart', () => {
    it('heals attacker for 20% of reaction damage on 融化', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });
      const rng = new SeededRNG(42);

      RelicSystem.activateWithUnits(
        [{ id: 'melt_heart', triggerCount: 0 }],
        [hero],
        [enemy],
        rng,
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      expect(handlers.length).toBe(1);

      handlers[0].handler({
        reactionType: '融化',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 100,
      });

      expect(hero.heal).toHaveBeenCalledWith(20); // 100 * 0.2
    });

    it('does not trigger on non-matching reaction type', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'melt_heart', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '超载',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 100,
      });

      expect(hero.heal).not.toHaveBeenCalled();
    });
  });

  describe('overload_engine', () => {
    it('stuns target on 超载 when RNG succeeds', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      // Use a SeededRNG that we know will succeed the chance check.
      // We'll create a mock RNG that always returns true for chance().
      const rng = new SeededRNG(42);
      rng.chance = () => true;

      RelicSystem.activateWithUnits(
        [{ id: 'overload_engine', triggerCount: 0 }],
        [hero],
        [enemy],
        rng,
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '超载',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 80,
      });

      expect(enemy.statusEffects.length).toBe(1);
      expect(enemy.statusEffects[0].type).toBe('stun');
      expect(enemy.statusEffects[0].duration).toBe(1);
    });

    it('does not stun when RNG fails', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      const rng = new SeededRNG(42);
      rng.chance = () => false;

      RelicSystem.activateWithUnits(
        [{ id: 'overload_engine', triggerCount: 0 }],
        [hero],
        [enemy],
        rng,
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '超载',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 80,
      });

      expect(enemy.statusEffects.length).toBe(0);
    });
  });

  describe('superconduct_shield', () => {
    it('increases attacker maxHp and currentHp by 10 on 超导', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true, currentHp: 400, maxHp: 500 });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'superconduct_shield', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '超导',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 50,
      });

      expect(hero.currentStats.maxHp).toBe(510);
      expect(hero.currentHp).toBe(410);
    });
  });

  describe('annihilation_echo', () => {
    it('calls delayedCall and target takes 40% echo damage on 湮灭', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'annihilation_echo', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '湮灭',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 200,
      });

      // delayedCall callback is invoked synchronously in mock
      expect(hero.scene.time.delayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
      expect(enemy.takeDamage).toHaveBeenCalledWith(80); // 200 * 0.4
    });
  });

  describe('elemental_resonance', () => {
    it('adds magicResist debuff to target on any reaction', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'elemental_resonance', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '融化',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 60,
      });

      expect(enemy.statusEffects.length).toBe(1);
      const debuff = enemy.statusEffects[0];
      expect(debuff.type).toBe('debuff');
      expect(debuff.stat).toBe('magicResist');
      expect(debuff.value).toBe(-15);
      expect(debuff.duration).toBe(5);
    });

    it('triggers on any reaction type (超载)', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'elemental_resonance', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '超载',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 60,
      });

      expect(enemy.statusEffects.length).toBe(1);
      expect(enemy.statusEffects[0].type).toBe('debuff');
    });
  });

  describe('non-matching reaction type is ignored', () => {
    it('melt_heart does not fire on 超载', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'melt_heart', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '超载',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 100,
      });

      expect(hero.heal).not.toHaveBeenCalled();
    });

    it('superconduct_shield does not fire on 融化', () => {
      const hero = createMockUnit({ unitId: 'h1', isHero: true, currentHp: 400, maxHp: 500 });
      const enemy = createMockUnit({ unitId: 'e1', isHero: false });

      RelicSystem.activateWithUnits(
        [{ id: 'superconduct_shield', triggerCount: 0 }],
        [hero],
        [enemy],
      );

      const handlers = RelicSystem.getReactiveHandlers('element:reaction');
      handlers[0].handler({
        reactionType: '融化',
        attackerId: 'h1',
        targetId: 'e1',
        damage: 50,
      });

      expect(hero.currentStats.maxHp).toBe(500); // unchanged
      expect(hero.currentHp).toBe(400); // unchanged
    });
  });
});

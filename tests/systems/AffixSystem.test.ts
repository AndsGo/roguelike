import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AffixSystem } from '../../src/systems/AffixSystem';
import { EventBus } from '../../src/systems/EventBus';
import { createMockUnit } from '../mocks/phaser';

describe('AffixSystem', () => {
  let affixSystem: AffixSystem;

  beforeEach(() => {
    affixSystem = AffixSystem.getInstance();
    affixSystem.deactivate();
    EventBus.getInstance().reset();
  });

  function makeEnemy(overrides: Record<string, unknown> = {}) {
    const u = createMockUnit({ isHero: false, ...overrides } as any);
    (u as any).shieldHp = 0;
    (u as any).shieldDuration = 0;
    (u as any).aiType = (overrides as any).aiType ?? 'default';
    if (!(u as any).setShield) {
      (u as any).setShield = (hp: number, dur: number) => {
        (u as any).shieldHp = hp;
        (u as any).shieldDuration = dur;
      };
    }
    return u;
  }

  function makeHero(overrides: Record<string, unknown> = {}) {
    return createMockUnit({ isHero: true, ...overrides } as any);
  }

  describe('lifecycle', () => {
    it('activate registers effects for given affix IDs', () => {
      const enemies = [makeEnemy({ unitId: 'e1' })];
      affixSystem.activate(['berserk'], enemies as any[], []);
      expect(affixSystem.hasAffix('berserk')).toBe(true);
      expect(affixSystem.hasAffix('swift')).toBe(false);
    });

    it('deactivate clears all listeners and state', () => {
      const enemies = [makeEnemy({ unitId: 'e1' })];
      affixSystem.activate(['reflective'], enemies as any[], []);
      affixSystem.deactivate();
      expect(affixSystem.hasAffix('reflective')).toBe(false);
    });

    it('tick updates timers correctly', () => {
      const enemies = [makeEnemy({ unitId: 'e1', currentHp: 500, maxHp: 500 })];
      affixSystem.activate(['regeneration'], enemies as any[], []);
      affixSystem.tick(1.1);
      expect(enemies[0].currentHp).toBeGreaterThanOrEqual(500);
    });
  });

  describe('buff affixes', () => {
    it('berserk injects +20% attack buff on all enemies', () => {
      const enemy = makeEnemy({ unitId: 'e1', stats: { attack: 100 } });
      affixSystem.activate(['berserk'], [enemy] as any[], []);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_berserk');
      expect(buff).toBeDefined();
      expect(buff!.value).toBe(20);
      expect(buff!.stat).toBe('attack');
    });

    it('swift injects +30% attackSpeed buff on all enemies', () => {
      const enemy = makeEnemy({ unitId: 'e1', stats: { attackSpeed: 1.0 } });
      affixSystem.activate(['swift'], [enemy] as any[], []);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_swift');
      expect(buff).toBeDefined();
      expect(buff!.stat).toBe('attackSpeed');
    });

    it('fortified injects +25% defense buff on all enemies', () => {
      const enemy = makeEnemy({ unitId: 'e1', stats: { defense: 40 } });
      affixSystem.activate(['fortified'], [enemy] as any[], []);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_fortified');
      expect(buff).toBeDefined();
      expect(buff!.stat).toBe('defense');
      expect(buff!.value).toBe(10);
    });

    it('shielded adds 20% maxHp as shield at battle start', () => {
      const enemy = makeEnemy({ unitId: 'e1', maxHp: 500 });
      affixSystem.activate(['shielded'], [enemy] as any[], []);
      expect((enemy as any).shieldHp).toBe(100);
    });
  });

  describe('reactive affixes', () => {
    it('splitting deals 40% splash to nearest hero of damaged hero', () => {
      const enemy = makeEnemy({ unitId: 'e1' });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500, x: 100 });
      const hero2 = makeHero({ unitId: 'h2', currentHp: 500, maxHp: 500, x: 150 });
      affixSystem.activate(['splitting'], [enemy] as any[], [hero1, hero2] as any[]);
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'e1', targetId: 'h1', amount: 100,
        damageType: 'physical', isCrit: false,
      });
      expect(hero2.currentHp).toBeLessThan(500);
    });

    it('reflective reflects 15% damage back to attacker', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 500, maxHp: 500 });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500 });
      affixSystem.activate(['reflective'], [enemy] as any[], [hero1] as any[]);
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'h1', targetId: 'e1', amount: 100,
        damageType: 'physical', isCrit: false,
      });
      expect(hero1.currentHp).toBeLessThan(500);
    });

    it('deathburst deals 8% maxHp damage to all heroes on enemy death', () => {
      const enemy = makeEnemy({ unitId: 'e1', maxHp: 1000 });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500 });
      const hero2 = makeHero({ unitId: 'h2', currentHp: 500, maxHp: 500 });
      affixSystem.activate(['deathburst'], [enemy] as any[], [hero1, hero2] as any[]);
      EventBus.getInstance().emit('unit:kill', { killerId: 'h1', targetId: 'e1' });
      expect(hero1.currentHp).toBeLessThan(500);
      expect(hero2.currentHp).toBeLessThan(500);
    });

    it('affix damage with isAffixDamage flag does not re-trigger affix listeners', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 500, maxHp: 500 });
      const hero1 = makeHero({ unitId: 'h1', currentHp: 500, maxHp: 500 });
      affixSystem.activate(['reflective'], [enemy] as any[], [hero1] as any[]);
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'h1', targetId: 'e1', amount: 100,
        damageType: 'physical', isCrit: false, isAffixDamage: true,
      });
      expect(hero1.currentHp).toBe(500);
    });
  });

  describe('periodic affixes', () => {
    it('regeneration heals 2% maxHp per second', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 400, maxHp: 500 });
      affixSystem.activate(['regeneration'], [enemy] as any[], []);
      affixSystem.tick(1.0);
      expect(enemy.currentHp).toBe(410);
    });

    it('vengeful activates +35% attack below 40% HP', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 150, maxHp: 500, stats: { attack: 100 } });
      affixSystem.activate(['vengeful'], [enemy] as any[], []);
      affixSystem.tick(0.1);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_vengeful');
      expect(buff).toBeDefined();
      expect(buff!.value).toBe(35);
    });

    it('vengeful does not activate above 40% HP', () => {
      const enemy = makeEnemy({ unitId: 'e1', currentHp: 400, maxHp: 500, stats: { attack: 100 } });
      affixSystem.activate(['vengeful'], [enemy] as any[], []);
      affixSystem.tick(0.1);
      const buff = enemy.statusEffects.find((e: any) => e.id === 'affix_vengeful');
      expect(buff).toBeUndefined();
    });
  });

  describe('formula queries', () => {
    it('getAffixElementBonus returns 0.25 when elemental affix active', () => {
      affixSystem.activate(['elemental'], [makeEnemy({ unitId: 'e1' })] as any[], []);
      expect(affixSystem.getAffixElementBonus()).toBe(0.25);
    });

    it('getAffixElementBonus returns 0 when no elemental affix', () => {
      affixSystem.activate(['berserk'], [makeEnemy({ unitId: 'e1' })] as any[], []);
      expect(affixSystem.getAffixElementBonus()).toBe(0);
    });
  });
});

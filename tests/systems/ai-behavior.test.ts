import { describe, it, expect, beforeEach } from 'vitest';
import { TargetingSystem } from '../../src/systems/TargetingSystem';
import { createMockUnit } from '../mocks/phaser';

describe('TargetingSystem AI behaviors', () => {
  beforeEach(() => {
    TargetingSystem.resetThreat();
    TargetingSystem.beginFrame(1000);
  });

  function makeUnit(overrides: Record<string, unknown>) {
    const u = createMockUnit(overrides as any);
    if (!('aiType' in u)) (u as any).aiType = 'default';
    if (!('formation' in u)) (u as any).formation = 'front';
    if (!u.distanceTo) {
      (u as any).distanceTo = (other: any) => Math.abs(u.x - other.x) + Math.abs(u.y - other.y);
    }
    if (!u.isInRange) {
      (u as any).isInRange = (other: any) => u.distanceTo(other) <= u.currentStats.attackRange;
    }
    if (!u.getTauntSource) {
      (u as any).getTauntSource = () => null;
    }
    return u;
  }

  it('default aiType uses existing role-based targeting', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'melee_dps', x: 600 });
    const lowHp = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 50, maxHp: 500, x: 100 });
    const fullHp = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 500, maxHp: 500, x: 200 });
    const target = TargetingSystem.selectTarget(attacker as any, [lowHp, fullHp] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('aggressive always targets lowest HP enemy', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', x: 600 });
    (attacker as any).aiType = 'aggressive';
    const lowHp = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 50, maxHp: 500, x: 400 });
    const fullHp = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const target = TargetingSystem.selectTarget(attacker as any, [lowHp, fullHp] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('disruptor prioritizes backRow roles', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'melee_dps', x: 600 });
    (attacker as any).aiType = 'disruptor';
    const tank = makeUnit({ unitId: 'hero1', isHero: true, role: 'tank', currentHp: 400, maxHp: 500, x: 100 });
    const healer = makeUnit({ unitId: 'hero2', isHero: true, role: 'healer', currentHp: 400, maxHp: 500, x: 200 });
    const target = TargetingSystem.selectTarget(attacker as any, [tank, healer] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero2');
  });

  it('defensive prioritizes attacker of lowest-HP ally', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', x: 600 });
    (attacker as any).aiType = 'defensive';
    const hero1 = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const hero2 = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 300, maxHp: 500, x: 200 });
    const ally = makeUnit({ unitId: 'enemy2', isHero: false, currentHp: 50, maxHp: 500, x: 500 });
    (ally as any).lastAttacker = hero2;
    const target = TargetingSystem.selectTarget(attacker as any, [hero1, hero2] as any[], [attacker, ally] as any[]);
    expect(target?.unitId).toBe('hero2');
  });

  it('berserker uses default above 50% HP', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', currentHp: 400, maxHp: 500, x: 600 });
    (attacker as any).aiType = 'berserker';
    const near = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 500 });
    const far = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 50, maxHp: 500, x: 100 });
    const target = TargetingSystem.selectTarget(attacker as any, [near, far] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('berserker switches to aggressive below 50% HP', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'tank', currentHp: 200, maxHp: 500, x: 600 });
    (attacker as any).aiType = 'berserker';
    const near = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 500 });
    const far = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 50, maxHp: 500, x: 100 });
    const target = TargetingSystem.selectTarget(attacker as any, [near, far] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero2');
  });

  it('taunt overrides all aiType strategies', () => {
    const tauntSource = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const lowHp = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 10, maxHp: 500, x: 200 });
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'melee_dps', x: 600 });
    (attacker as any).aiType = 'aggressive';
    (attacker as any).getTauntSource = () => tauntSource;
    const target = TargetingSystem.selectTarget(attacker as any, [tauntSource, lowHp] as any[], [attacker] as any[]);
    expect(target?.unitId).toBe('hero1');
  });

  it('aiType undefined defaults to role-based', () => {
    const attacker = makeUnit({ unitId: 'enemy1', isHero: false, role: 'ranged_dps', x: 600 });
    delete (attacker as any).aiType;
    const t1 = makeUnit({ unitId: 'hero1', isHero: true, currentHp: 500, maxHp: 500, x: 100 });
    const t2 = makeUnit({ unitId: 'hero2', isHero: true, currentHp: 500, maxHp: 500, x: 200 });
    const target = TargetingSystem.selectTarget(attacker as any, [t1, t2] as any[], [attacker] as any[]);
    expect(target).toBeDefined();
  });
});

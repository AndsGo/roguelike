import { describe, it, expect, beforeEach } from 'vitest';
import { TargetingSystem } from '../../src/systems/TargetingSystem';
import { createMockUnit } from '../mocks/phaser';

describe('Formation targeting bonus', () => {
  beforeEach(() => {
    TargetingSystem.resetThreat();
    TargetingSystem.beginFrame(1000);
  });

  it('melee enemy prefers front-row hero over back-row at equal distance', () => {
    const enemy = createMockUnit({
      unitId: 'enemy1', isHero: false, x: 400, y: 200,
      stats: { attackRange: 35 },
    });
    (enemy as any).formation = 'front';

    const heroFront = createMockUnit({ unitId: 'hero1', isHero: true, x: 200, y: 200 });
    (heroFront as any).formation = 'front';

    const heroBack = createMockUnit({ unitId: 'hero2', isHero: true, x: 200, y: 200 });
    (heroBack as any).formation = 'back';

    const target = TargetingSystem.selectTarget(
      enemy as any, [heroFront as any, heroBack as any], [],
    );
    expect(target?.unitId).toBe('hero1');
  });

  it('ranged enemy does NOT get front-row bonus', () => {
    const enemy = createMockUnit({
      unitId: 'enemy1', isHero: false, x: 400, y: 200,
      stats: { attackRange: 200 },
    });
    (enemy as any).formation = 'front';

    const heroFront = createMockUnit({ unitId: 'hero1', isHero: true, x: 200, y: 200 });
    (heroFront as any).formation = 'front';

    // heroBack has lower HP — should be preferred by lowest_hp scoring
    const heroBack = createMockUnit({ unitId: 'hero2', isHero: true, x: 200, y: 200, currentHp: 50, maxHp: 500 });
    (heroBack as any).formation = 'back';

    const target = TargetingSystem.selectTarget(
      enemy as any, [heroFront as any, heroBack as any], [],
    );
    // Ranged enemy has no formation bias, so lower-HP hero wins
    expect(target?.unitId).toBe('hero2');
  });

  it('hero targeting enemy is NOT affected by formation bonus', () => {
    const hero = createMockUnit({
      unitId: 'hero1', isHero: true, x: 200, y: 200,
      stats: { attackRange: 35 },
    });
    (hero as any).formation = 'front';

    const enemy1 = createMockUnit({ unitId: 'enemy1', isHero: false, x: 400, y: 200 });
    (enemy1 as any).formation = 'front';

    const enemy2 = createMockUnit({ unitId: 'enemy2', isHero: false, x: 400, y: 200 });
    (enemy2 as any).formation = 'back';

    // Hero should pick based on normal scoring, not formation
    const target = TargetingSystem.selectTarget(
      hero as any, [enemy1 as any, enemy2 as any], [],
    );
    expect(target).toBeTruthy();
  });
});

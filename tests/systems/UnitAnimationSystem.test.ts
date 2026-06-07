import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HERO_ANIM_PARAMS, MONSTER_ANIM_PARAMS } from '../../src/config/visual';
import { UnitAnimationSystem } from '../../src/systems/UnitAnimationSystem';
import { EventBus } from '../../src/systems/EventBus';
import { Unit } from '../../src/entities/Unit';

describe('Unit Animation Parameters', () => {
  it('defines params for all 5 hero roles', () => {
    for (const role of ['tank', 'melee_dps', 'ranged_dps', 'healer', 'support']) {
      expect(HERO_ANIM_PARAMS[role]).toBeDefined();
    }
  });

  it('defines params for all 6 monster types', () => {
    for (const type of ['beast', 'undead', 'construct', 'caster', 'humanoid', 'draconic']) {
      expect(MONSTER_ANIM_PARAMS[type]).toBeDefined();
    }
  });

  it('beast attack is faster than construct', () => {
    expect(MONSTER_ANIM_PARAMS.beast.attackDuration).toBeLessThan(MONSTER_ANIM_PARAMS.construct.attackDuration);
  });

  it('tank hero attack is slower than melee_dps', () => {
    expect(HERO_ANIM_PARAMS.tank.attackDuration).toBeGreaterThan(HERO_ANIM_PARAMS.melee_dps.attackDuration);
  });

  it('healer has longer idle than melee_dps', () => {
    expect(HERO_ANIM_PARAMS.healer.idleDuration).toBeGreaterThan(HERO_ANIM_PARAMS.melee_dps.idleDuration);
  });
});

describe('UnitAnimationSystem sprite-sheet integration', () => {
  function makeScene() {
    return {
      add: {
        graphics: vi.fn(() => ({
          setPosition: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeEllipse: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
      },
      tweens: {
        add: vi.fn((config) => {
          config.onComplete?.();
          return {
            stop: vi.fn(),
            updateTo: vi.fn(),
          };
        }),
      },
    } as any;
  }

  function makeUnit(overrides: Record<string, unknown> = {}) {
    return {
      unitId: 'u1',
      role: 'tank',
      isHero: true,
      x: 100,
      y: 200,
      sprite: { scaleX: 1, scaleY: 1 },
      playUnitSpriteAnimation: vi.fn(),
      hasAuthoredSprite: vi.fn(() => false),
      ...overrides,
    } as unknown as Unit;
  }

  it('starts authored units on their idle frame animation', () => {
    const scene = makeScene();
    const unit = makeUnit({ hasAuthoredSprite: vi.fn(() => true) }) as Unit & {
      playUnitSpriteAnimation: ReturnType<typeof vi.fn>;
    };

    new UnitAnimationSystem(scene, [unit]);

    expect(unit.playUnitSpriteAnimation).toHaveBeenCalledWith('idle');
  });

  it('adds a visible breathing tween to authored sprites', () => {
    const scene = makeScene();
    const sprite = { scaleX: 1, scaleY: 1 };
    const unit = makeUnit({
      sprite,
      hasAuthoredSprite: vi.fn(() => true),
    });

    new UnitAnimationSystem(scene, [unit]);

    expect(scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: sprite,
      scaleY: expect.objectContaining({ from: 1, to: expect.any(Number) }),
      yoyo: true,
      repeat: -1,
    }));
  });

  it('does not add container y-axis idle tween for authored sprites', () => {
    const scene = makeScene();
    const unit = makeUnit({ hasAuthoredSprite: vi.fn(() => true) });

    new UnitAnimationSystem(scene, [unit]);

    expect(scene.tweens.add).not.toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      y: expect.any(Number),
    }));
  });

  it('keeps container y-axis idle tween for generated chibi units', () => {
    const scene = makeScene();
    const unit = makeUnit({ hasAuthoredSprite: vi.fn(() => false) });

    new UnitAnimationSystem(scene, [unit]);

    expect(scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      y: expect.any(Number),
    }));
  });

  it('uses a reduced attack lunge for authored sprites', () => {
    const scene = makeScene();
    const unit = makeUnit({
      hasAuthoredSprite: vi.fn(() => true),
      role: 'melee_dps',
      x: 100,
    });
    const system = new UnitAnimationSystem(scene, [unit]);

    system.playAttack(unit, 300);

    expect(scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      x: 114,
    }));
  });

  it('keeps the full attack lunge for generated chibi units', () => {
    const scene = makeScene();
    const unit = makeUnit({
      hasAuthoredSprite: vi.fn(() => false),
      role: 'melee_dps',
      x: 100,
    });
    const system = new UnitAnimationSystem(scene, [unit]);

    system.playAttack(unit, 300);

    expect(scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      x: 135,
    }));
  });

  it('uses a cast ring effect instead of container scaling for authored sprites', () => {
    const scene = makeScene();
    const unit = makeUnit({
      hasAuthoredSprite: vi.fn(() => true),
      role: 'healer',
      x: 100,
      y: 200,
    });
    const system = new UnitAnimationSystem(scene, [unit]);

    system.playCast(unit);

    expect(scene.add.graphics).toHaveBeenCalled();
    expect(scene.tweens.add).not.toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      scaleX: expect.any(Number),
      scaleY: expect.any(Number),
    }));
  });
});

describe('UnitAnimationSystem stale-unit safety', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  function makeScene() {
    return {
      add: { graphics: vi.fn(() => ({})) },
      tweens: { add: vi.fn(() => ({ stop: vi.fn(), updateTo: vi.fn() })) },
    } as any;
  }

  it('does not animate a unit whose scene was destroyed when skill:use fires', () => {
    const scene = makeScene();
    const playAnim = vi.fn();
    const unit = {
      unitId: 'u1', role: 'tank', isHero: true, x: 0, y: 0,
      scene: {}, // attached at construction so playIdle runs
      sprite: { scaleX: 1, scaleY: 1 },
      playUnitSpriteAnimation: playAnim,
      hasAuthoredSprite: vi.fn(() => true),
    } as unknown as Unit;

    new UnitAnimationSystem(scene, [unit]);
    playAnim.mockClear();

    // Simulate the GameObject being destroyed (Phaser clears `.scene`).
    (unit as unknown as { scene: unknown }).scene = undefined;

    expect(() => EventBus.getInstance().emit('skill:use', {
      casterId: 'u1', skillId: 's1', targets: [],
    } as never)).not.toThrow();
    expect(playAnim).not.toHaveBeenCalled();
  });
});

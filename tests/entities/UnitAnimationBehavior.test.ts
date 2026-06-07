import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import { Unit } from '../../src/entities/Unit';
import { EventBus } from '../../src/systems/EventBus';
import { RelicSystem } from '../../src/systems/RelicSystem';

describe('Unit authored sprite animation behavior', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
    vi.spyOn(RelicSystem, 'shouldRevive').mockReturnValue(false);
    vi.spyOn(RelicSystem, 'shouldApplyHolyShield').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeDeathUnit(hasAuthoredSprite: boolean) {
    const scene = {
      time: {
        addEvent: vi.fn(() => ({ destroy: vi.fn() })),
        delayedCall: vi.fn((_delay: number, callback: () => void) => {
          callback();
          return { destroy: vi.fn() };
        }),
      },
      tweens: {
        add: vi.fn((config) => {
          config.onComplete?.();
          return { stop: vi.fn() };
        }),
      },
    };

    return {
      scene,
      isHero: true,
      isAlive: true,
      target: {},
      unitId: 'u1',
      stunTween: null,
      sprite: {
        clearTint: vi.fn(),
        setTintFill: vi.fn(),
      },
      playUnitSpriteAnimation: vi.fn(),
      hasAuthoredSprite: vi.fn(() => hasAuthoredSprite),
      setVisible: vi.fn(),
    } as unknown as Unit & { scene: typeof scene };
  }

  function makeHurtUnit(hasAuthoredSprite: boolean) {
    const sprite = {
      x: 0,
      setTintFill: vi.fn(),
      clearTint: vi.fn(),
    };
    const scene = {
      time: {
        delayedCall: vi.fn((_delay: number, callback: () => void) => {
          callback();
          return { destroy: vi.fn() };
        }),
      },
      tweens: {
        add: vi.fn(() => ({ stop: vi.fn() })),
      },
    };

    return {
      scene,
      sprite,
      isAlive: true,
      playUnitSpriteAnimation: vi.fn(),
      hasAuthoredSprite: vi.fn(() => hasAuthoredSprite),
    } as unknown as Unit & { scene: typeof scene; sprite: typeof sprite };
  }

  it('fades authored sprite deaths without flash-rotate-shrink tween', () => {
    const unit = makeDeathUnit(true);

    Unit.prototype.die.call(unit);

    expect(unit.playUnitSpriteAnimation).toHaveBeenCalledWith('death');
    expect(unit.scene.time.addEvent).not.toHaveBeenCalled();
    expect(unit.scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      alpha: 0,
      duration: expect.any(Number),
    }));
    expect(unit.scene.tweens.add).not.toHaveBeenCalledWith(expect.objectContaining({
      angle: expect.any(Number),
      scaleX: expect.any(Number),
      scaleY: expect.any(Number),
    }));
  });

  it('keeps flash-rotate-shrink death for generated chibi units', () => {
    const unit = makeDeathUnit(false);

    Unit.prototype.die.call(unit);

    expect(unit.scene.time.addEvent).toHaveBeenCalled();
    expect(unit.scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: unit,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      angle: -45,
    }));
  });

  it('uses short flash and sprite-local shake for authored sprite hurt', () => {
    const unit = makeHurtUnit(true);

    Unit.prototype.flashHurt.call(unit);

    expect(unit.playUnitSpriteAnimation).toHaveBeenCalledWith('hurt');
    expect(unit.scene.time.delayedCall).toHaveBeenCalledWith(70, expect.any(Function));
    expect(unit.scene.tweens.add).toHaveBeenCalledWith(expect.objectContaining({
      targets: unit.sprite,
      x: -3,
      duration: 45,
      yoyo: true,
      repeat: 1,
    }));
  });

  // Regression: a destroyed unit (scene === undefined) must never crash the
  // game loop. Stale UnitAnimationSystem listeners from a previous battle can
  // resolve a now-destroyed Hero (heroes reuse unitId across battles) and call
  // playUnitSpriteAnimation on it. Every sibling visual method guards `this.scene`;
  // this one must too. See Unit.ts playUnitSpriteAnimation.
  function makeAnimUnit(scene: unknown) {
    const sprite = { play: vi.fn(), once: vi.fn() };
    return {
      scene,
      isAlive: true,
      sprite,
      aiSpriteConfig: { textureKey: 'ai_unit_hero_test' },
    } as unknown as Unit & { sprite: typeof sprite };
  }

  it('no-ops without throwing when the unit has been destroyed (scene undefined)', () => {
    const unit = makeAnimUnit(undefined);

    expect(() => Unit.prototype.playUnitSpriteAnimation.call(unit, 'cast')).not.toThrow();
    expect(unit.sprite.play).not.toHaveBeenCalled();
  });

  it('plays the animation normally when the scene is still attached', () => {
    const scene = { anims: { exists: vi.fn(() => true) } };
    const unit = makeAnimUnit(scene);

    Unit.prototype.playUnitSpriteAnimation.call(unit, 'idle');

    expect(unit.sprite.play).toHaveBeenCalledWith('ai_unit_hero_test_idle');
  });
});

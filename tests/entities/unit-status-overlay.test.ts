import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { Hero } from '../../src/entities/Hero';
import { EventBus } from '../../src/systems/EventBus';
import { HeroState, HeroData } from '../../src/types';

function makeHeroState(id: string): HeroState {
  return { id, level: 1, exp: 0, currentHp: 500, equipment: { weapon: null, armor: null, accessory: null } };
}

function makeHeroData(id: string): HeroData {
  return {
    id, name: id, role: 'melee_dps',
    baseStats: {
      maxHp: 500, hp: 500, attack: 50, defense: 20,
      magicPower: 0, magicResist: 10, speed: 100,
      attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
    },
    scalingPerLevel: { maxHp: 30, attack: 5, defense: 2, magicPower: 0, magicResist: 1 },
    skills: [], spriteKey: 'test',
  };
}

/**
 * Regression guard for the "square mask" bug: status-effect tinting must follow the
 * unit's pixel silhouette (a tinted Image copy of the sprite), NOT a bounding-box
 * fillRect over the whole quad. See Unit.updateStatusVisuals().
 */
describe('Unit status overlay (square-mask fix)', () => {
  let hero: Hero;

  beforeEach(() => {
    EventBus.getInstance().reset();
    const scene = new Phaser.Scene();
    hero = new Hero(scene as any, 100, 200, makeHeroData('h1'), makeHeroState('h1'));
  });

  it('uses a silhouette Image overlay, not a box-fill Graphics', () => {
    const overlay = (hero as any).statusOverlay;
    // An Image-based overlay follows the texture alpha; a Graphics fillRect would not.
    expect(typeof overlay.setTintFill).toBe('function');
    expect((overlay as any).fillRect).toBeUndefined(); // not a Graphics doing a box fill
  });

  it('hides the overlay when the unit has no status effects', () => {
    hero.statusEffects = [];
    hero.updateStatusVisuals();
    expect((hero as any).statusOverlay.visible).toBe(false);
  });

  it('shows a silhouette tint in the status color when a status is active', () => {
    // Arrange: apply a freeze (stun) — overlay color is light blue 0x88ccff.
    hero.statusEffects = [{ id: 's', type: 'stun', name: 'freeze', duration: 5, value: 0 }];

    // Act
    hero.updateStatusVisuals();

    // Assert: overlay visible, tinted with the freeze color, washed at < full alpha.
    const overlay = (hero as any).statusOverlay;
    expect(overlay.visible).toBe(true);
    expect(overlay.tintFillColor).toBe(0x88ccff);
    expect(overlay.alpha).toBeLessThan(1);
    expect(overlay.alpha).toBeGreaterThan(0);
  });

  it('toggles the overlay off again when the status is removed', () => {
    hero.statusEffects = [{ id: 's', type: 'dot', name: 'burn', duration: 5, value: 0, element: 'fire' }];
    hero.updateStatusVisuals();
    expect((hero as any).statusOverlay.visible).toBe(true);

    hero.statusEffects = [];
    hero.updateStatusVisuals();
    expect((hero as any).statusOverlay.visible).toBe(false);
  });
});

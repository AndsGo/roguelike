import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { EventBus } from './EventBus';
import { HERO_ANIM_PARAMS, MONSTER_ANIM_PARAMS } from '../config/visual';

export type AnimState = 'idle' | 'attack' | 'cast' | 'none';

/**
 * Tween-based unit animation system.
 * - Idle: gentle float up/down (role/monsterType-dependent amplitude & period)
 * - Attack: rush forward toward target then bounce back
 * - Cast: scale pulse for generated units, ring effect for authored sprites
 */
export class UnitAnimationSystem {
  private scene: Phaser.Scene;
  private idleTweens: Map<string, { stop?: () => void }> = new Map();
  private onAttack: (data: { sourceId: string; targetId: string; damage: number }) => void;
  private onSkillUse: (data: { casterId: string; skillId: string; targets: string[] }) => void;

  constructor(scene: Phaser.Scene, units: Unit[]) {
    this.scene = scene;

    // Start idle animations for all units
    for (const unit of units) {
      this.playIdle(unit);
    }

    // Listen for combat events
    // `unit.scene` is undefined once a unit has been destroyed. Skip those so a
    // stale listener (e.g. from a previous battle that shared this unitId) can't
    // animate a dead GameObject and throw inside the battle update loop.
    this.onAttack = (data) => {
      const source = units.find(u => u.unitId === data.sourceId);
      const target = units.find(u => u.unitId === data.targetId);
      if (source?.scene && target?.scene) {
        source.playUnitSpriteAnimation('attack');
        this.playAttack(source, target.x);
      }
    };

    this.onSkillUse = (data) => {
      const caster = units.find(u => u.unitId === data.casterId);
      if (caster?.scene) {
        caster.playUnitSpriteAnimation('cast');
        this.playCast(caster);
      }
    };

    EventBus.getInstance().on('unit:attack', this.onAttack);
    EventBus.getInstance().on('skill:use', this.onSkillUse);
  }

  /** Look up animation parameters for a unit based on monsterType (enemies) or role (heroes) */
  private getAnimParams(unit: Unit) {
    if (!unit.isHero && unit.monsterType && MONSTER_ANIM_PARAMS[unit.monsterType]) {
      return MONSTER_ANIM_PARAMS[unit.monsterType];
    }
    return HERO_ANIM_PARAMS[unit.role] ?? HERO_ANIM_PARAMS.melee_dps;
  }

  /** Gentle floating idle animation */
  playIdle(unit: Unit): void {
    if (this.idleTweens.has(unit.unitId)) return;

    unit.playUnitSpriteAnimation('idle');

    const params = this.getAnimParams(unit);
    const randomDelay = Math.random() * 400;
    const activeTweens: Array<{ stop?: () => void }> = [];

    if (unit.hasAuthoredSprite()) {
      const baseScaleX = unit.sprite.scaleX;
      const baseScaleY = unit.sprite.scaleY;
      activeTweens.push(this.scene.tweens.add({
        targets: unit.sprite,
        scaleX: { from: baseScaleX, to: baseScaleX * 0.98 },
        scaleY: { from: baseScaleY, to: baseScaleY * 1.04 },
        duration: Math.max(450, params.idleDuration * 0.75),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: randomDelay,
      }));
    } else {
      let floatTween: { stop?: () => void; updateTo?: (key: string, value: number, reset?: boolean) => void };
      floatTween = this.scene.tweens.add({
        targets: unit,
        y: unit.y - params.idleDelta,
        duration: params.idleDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: randomDelay,
        onStart: () => {
          floatTween.updateTo?.('y', unit.y - params.idleDelta, true);
        },
      });
      activeTweens.push(floatTween);
    }

    this.idleTweens.set(unit.unitId, {
      stop: () => activeTweens.forEach(t => t.stop?.()),
    });
  }

  /** Attack rush: move toward target X then bounce back */
  playAttack(unit: Unit, targetX: number): void {
    const params = this.getAnimParams(unit);
    const originalX = unit.x;
    const direction = targetX > unit.x ? 1 : -1;
    const baseRushDistance = Math.min(params.attackDistance, Math.abs(targetX - unit.x) * 0.3);
    const rushDistance = unit.hasAuthoredSprite() ? Math.round(baseRushDistance * 0.4) : baseRushDistance;

    this.scene.tweens.add({
      targets: unit,
      x: originalX + direction * rushDistance,
      duration: params.attackDuration,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Cast: scale pulse */
  playCast(unit: Unit): void {
    const params = this.getAnimParams(unit);
    if (unit.hasAuthoredSprite()) {
      this.playCastRing(unit, params.castDuration);
      return;
    }

    this.scene.tweens.add({
      targets: unit,
      scaleX: params.castScale,
      scaleY: params.castScale,
      duration: params.castDuration,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  private playCastRing(unit: Unit, duration: number): void {
    const ring = this.scene.add.graphics();
    const color = unit.isHero ? 0x66ccff : 0xff6677;

    ring.setPosition(unit.x, unit.y + 4);
    ring.setDepth((unit.depth ?? 0) + 1);
    ring.lineStyle(2, color, 0.85);
    ring.strokeEllipse(0, 0, 58, 28);
    ring.alpha = 0.85;
    ring.scaleX = 0.65;
    ring.scaleY = 0.65;

    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: duration + 80,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Stop all animations for a specific unit */
  stopAll(unit: Unit): void {
    const tween = this.idleTweens.get(unit.unitId);
    if (tween?.stop) tween.stop();
    this.idleTweens.delete(unit.unitId);
  }

  /** Clean up everything */
  destroy(): void {
    for (const [, tween] of this.idleTweens) {
      if (tween?.stop) tween.stop();
    }
    this.idleTweens.clear();

    const eb = EventBus.getInstance();
    eb.off('unit:attack', this.onAttack);
    eb.off('skill:use', this.onSkillUse);
  }
}

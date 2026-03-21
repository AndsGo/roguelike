import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { EventBus } from './EventBus';
import { HERO_ANIM_PARAMS, MONSTER_ANIM_PARAMS } from '../config/visual';

export type AnimState = 'idle' | 'attack' | 'cast' | 'none';

/**
 * Tween-based unit animation system.
 * - Idle: gentle float up/down (role/monsterType-dependent amplitude & period)
 * - Attack: rush forward toward target then bounce back
 * - Cast: scale pulse
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
    this.onAttack = (data) => {
      const source = units.find(u => u.unitId === data.sourceId);
      const target = units.find(u => u.unitId === data.targetId);
      if (source && target) {
        this.playAttack(source, target.x);
      }
    };

    this.onSkillUse = (data) => {
      const caster = units.find(u => u.unitId === data.casterId);
      if (caster) {
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

    const params = this.getAnimParams(unit);
    const randomDelay = Math.random() * 400;
    const tween = this.scene.tweens.add({
      targets: unit,
      y: unit.y - params.idleDelta,
      duration: params.idleDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: randomDelay,
      onStart: () => {
        tween.updateTo('y', unit.y - params.idleDelta, true);
      },
    });
    this.idleTweens.set(unit.unitId, tween);
  }

  /** Attack rush: move toward target X then bounce back */
  playAttack(unit: Unit, targetX: number): void {
    const params = this.getAnimParams(unit);
    const originalX = unit.x;
    const direction = targetX > unit.x ? 1 : -1;
    const rushDistance = Math.min(params.attackDistance, Math.abs(targetX - unit.x) * 0.3);

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
    this.scene.tweens.add({
      targets: unit,
      scaleX: params.castScale,
      scaleY: params.castScale,
      duration: params.castDuration,
      yoyo: true,
      ease: 'Sine.easeOut',
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

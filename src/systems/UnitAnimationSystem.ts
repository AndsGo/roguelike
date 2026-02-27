import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { EventBus } from './EventBus';

export type AnimState = 'idle' | 'attack' | 'cast' | 'none';

/**
 * Tween-based unit animation system.
 * - Idle: gentle float up/down (3px, 800ms)
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

  /** Gentle floating idle animation */
  playIdle(unit: Unit): void {
    if (this.idleTweens.has(unit.unitId)) return;

    const baseY = unit.y;
    const tween = this.scene.tweens.add({
      targets: unit,
      y: baseY - 3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.idleTweens.set(unit.unitId, tween);
  }

  /** Attack rush: move toward target X then bounce back */
  playAttack(unit: Unit, targetX: number): void {
    const originalX = unit.x;
    const direction = targetX > unit.x ? 1 : -1;
    const rushDistance = Math.min(30, Math.abs(targetX - unit.x) * 0.3);

    this.scene.tweens.add({
      targets: unit,
      x: originalX + direction * rushDistance,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Cast: scale pulse */
  playCast(unit: Unit): void {
    this.scene.tweens.add({
      targets: unit,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
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

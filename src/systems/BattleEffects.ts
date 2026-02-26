import Phaser from 'phaser';
import { Unit } from '../entities/Unit';

/**
 * Visual effects for battle: screen shake, hit flash, crit slow-mo,
 * and skill targeting indicators.
 */
export class BattleEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Camera shake effect */
  screenShake(intensity: number = 0.005, duration: number = 100): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  /** Flash unit white on hit */
  hitFlash(unit: Unit): void {
    if (!unit.isAlive || !unit.sprite) return;
    unit.sprite.setFillStyle(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (unit.isAlive) {
        const color = unit.isHero ? 0x4488ff : 0xff4444;
        unit.sprite.setFillStyle(color);
      }
    });
  }

  /** Brief slow motion on crit */
  critSlowMotion(): void {
    this.scene.time.timeScale = 0.5;
    this.scene.time.delayedCall(150, () => {
      this.scene.time.timeScale = 1;
    });
  }

  /** Draw a targeting line from caster to target */
  showSkillIndicator(
    caster: Unit,
    target: Unit,
    color: number = 0xffff00,
    duration: number = 300,
  ): void {
    const g = this.scene.add.graphics();
    g.lineStyle(2, color, 0.6);
    g.lineBetween(caster.x, caster.y, target.x, target.y);

    // Small circle at target
    g.fillStyle(color, 0.4);
    g.fillCircle(target.x, target.y, 12);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  /** AOE indicator circle */
  showAoeIndicator(
    x: number,
    y: number,
    radius: number,
    color: number = 0xff4444,
    duration: number = 400,
  ): void {
    const g = this.scene.add.graphics();
    g.lineStyle(2, color, 0.5);
    g.strokeCircle(x, y, radius);
    g.fillStyle(color, 0.15);
    g.fillCircle(x, y, radius);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => g.destroy(),
    });
  }
}

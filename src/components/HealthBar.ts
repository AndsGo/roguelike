import Phaser from 'phaser';
import { Theme } from '../ui/Theme';
import { ElementType } from '../types';

export class HealthBar extends Phaser.GameObjects.Container {
  private bgBar: Phaser.GameObjects.Graphics;
  private delayBar: Phaser.GameObjects.Graphics;
  private fillBar: Phaser.GameObjects.Graphics;
  private shieldBar: Phaser.GameObjects.Graphics;
  private barWidth: number;
  private barHeight: number;
  private currentRatio: number = 1;
  private delayedRatio: number = 1;
  private shieldRatio: number = 0;
  private levelText: Phaser.GameObjects.Text | null = null;
  private elementIcon: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);
    this.barWidth = width;
    this.barHeight = height;

    // Background (dark gray)
    this.bgBar = scene.add.graphics();
    this.bgBar.fillStyle(0x333333, 1);
    this.bgBar.fillRoundedRect(-width / 2, -height / 2, width, height, 1);
    this.add(this.bgBar);

    // Delayed damage bar (red, shows after damage with delay)
    this.delayBar = scene.add.graphics();
    this.add(this.delayBar);

    // Current health fill
    this.fillBar = scene.add.graphics();
    this.add(this.fillBar);

    // Shield overlay
    this.shieldBar = scene.add.graphics();
    this.add(this.shieldBar);

    this.drawFill();
  }

  /** Set element icon next to health bar */
  setElement(element?: ElementType): void {
    if (this.elementIcon) {
      this.elementIcon.destroy();
      this.elementIcon = null;
    }
    if (element) {
      const color = Theme.colors.element[element] ?? 0xffffff;
      this.elementIcon = this.scene.add.graphics();
      this.elementIcon.fillStyle(color, 1);
      this.elementIcon.fillCircle(-this.barWidth / 2 - 6, 0, 3);
      this.add(this.elementIcon);
    }
  }

  /** Set level text displayed above bar */
  setLevel(level: number): void {
    if (this.levelText) {
      this.levelText.setText(`${level}`);
    } else {
      this.levelText = this.scene.add.text(
        this.barWidth / 2 + 6, 0, `${level}`,
        { fontSize: '7px', color: '#aaaaaa', fontFamily: 'monospace' },
      ).setOrigin(0, 0.5);
      this.add(this.levelText);
    }
  }

  updateHealth(current: number, max: number): void {
    const newRatio = Math.max(0, Math.min(1, current / max));
    const oldRatio = this.currentRatio;
    this.currentRatio = newRatio;

    // If damage taken, animate the delayed bar
    if (newRatio < oldRatio) {
      this.delayedRatio = oldRatio;
      // Delayed bar catches up after 400ms
      this.scene.time.delayedCall(400, () => {
        this.scene.tweens.addCounter({
          from: this.delayedRatio * 100,
          to: this.currentRatio * 100,
          duration: 300,
          ease: 'Sine.easeOut',
          onUpdate: (tween) => {
            const val = tween.getValue();
            if (val !== null) {
              this.delayedRatio = val / 100;
              this.drawDelayBar();
            }
          },
        });
      });
    } else {
      this.delayedRatio = newRatio;
    }

    this.drawFill();
    this.drawDelayBar();
  }

  updateShield(shield: number, maxHp: number): void {
    this.shieldRatio = Math.max(0, Math.min(1, shield / maxHp));
    this.drawShield();
  }

  private drawFill(): void {
    this.fillBar.clear();
    if (this.currentRatio <= 0) return;

    const color = this.getHealthColor(this.currentRatio);
    const w = this.barWidth * this.currentRatio;
    this.fillBar.fillStyle(color, 1);
    this.fillBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2, w, this.barHeight, 1);
  }

  private drawDelayBar(): void {
    this.delayBar.clear();
    if (this.delayedRatio <= this.currentRatio) return;

    const w = this.barWidth * this.delayedRatio;
    this.delayBar.fillStyle(0xcc3333, 0.8);
    this.delayBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2, w, this.barHeight, 1);
  }

  private drawShield(): void {
    this.shieldBar.clear();
    if (this.shieldRatio <= 0) return;

    const w = this.barWidth * Math.min(1, this.shieldRatio);
    this.shieldBar.fillStyle(0x4488ff, 0.6);
    this.shieldBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2 - 1, w, this.barHeight, 1);
  }

  private getHealthColor(ratio: number): number {
    if (ratio > 0.6) return 0x44ff44;
    if (ratio > 0.3) return 0xffaa00;
    return 0xff4444;
  }
}

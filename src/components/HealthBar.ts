import Phaser from 'phaser';
import { Theme, getElementColor } from '../ui/Theme';
import { ElementType } from '../types';
import { ANIM, OPACITY, SCALE, HEALTH_BAR_STYLES, HealthBarStyle } from '../config/visual';
import { TextFactory } from '../ui/TextFactory';

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
  private lastDrawnRatio: number = -1;
  private lastDrawnDelayed: number = -1;
  private lastDrawnShield: number = -1;
  private borderGfx: Phaser.GameObjects.Graphics | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  private elementIcon: Phaser.GameObjects.Graphics | null = null;
  private phaseNotches: number[] = [];
  private notchGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, style: HealthBarStyle = 'hero') {
    super(scene, x, y);
    const styleConfig = HEALTH_BAR_STYLES[style];
    this.barWidth = styleConfig.width;
    this.barHeight = styleConfig.height;

    // Background
    this.bgBar = scene.add.graphics();
    this.bgBar.fillStyle(styleConfig.bgColor, 1);
    this.bgBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2, this.barWidth, this.barHeight, 1);
    this.add(this.bgBar);

    // Border (style-specific)
    if (styleConfig.borderWidth > 0 && styleConfig.borderAlpha > 0) {
      this.borderGfx = scene.add.graphics();
      this.borderGfx.lineStyle(styleConfig.borderWidth, styleConfig.borderColor, styleConfig.borderAlpha);
      this.borderGfx.strokeRoundedRect(
        -this.barWidth / 2 - 1, -this.barHeight / 2 - 1,
        this.barWidth + 2, this.barHeight + 2, 2,
      );
      this.add(this.borderGfx);
    }

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
      const color = getElementColor(element);
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
      this.levelText = TextFactory.create(
        this.scene, this.barWidth / 2 + 6, 0, `${level}`, 'small',
        { color: '#aaaaaa' },
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
      this.scene.time.delayedCall(ANIM.HEALTH_DELAY, () => {
        this.scene.tweens.addCounter({
          from: this.delayedRatio * 100,
          to: this.currentRatio * 100,
          duration: ANIM.HEALTH_CATCH_UP,
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
    const prevShield = this.shieldRatio;
    this.shieldRatio = Math.max(0, Math.min(1, shield / maxHp));
    this.drawShield();

    // Pulse effect when shield first appears
    if (prevShield <= 0 && this.shieldRatio > 0) {
      this.scene.tweens.add({
        targets: this.shieldBar,
        scaleX: SCALE.SHIELD_PULSE,
        scaleY: SCALE.SHIELD_PULSE,
        duration: 100,
        ease: 'Sine.easeOut',
        yoyo: true,
      });
    }
  }

  private drawFill(): void {
    if (this.currentRatio === this.lastDrawnRatio) return;
    this.lastDrawnRatio = this.currentRatio;

    this.fillBar.clear();
    if (this.currentRatio <= 0) return;

    const color = this.getHealthColor(this.currentRatio);
    const w = this.barWidth * this.currentRatio;
    this.fillBar.fillStyle(color, 1);
    this.fillBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2, w, this.barHeight, 1);
  }

  private drawDelayBar(): void {
    if (this.delayedRatio === this.lastDrawnDelayed) return;
    this.lastDrawnDelayed = this.delayedRatio;

    this.delayBar.clear();
    if (this.delayedRatio <= this.currentRatio) return;

    const w = this.barWidth * this.delayedRatio;
    this.delayBar.fillStyle(Theme.colors.health.delay, OPACITY.HEALTH_DELAY);
    this.delayBar.fillRoundedRect(-this.barWidth / 2, -this.barHeight / 2, w, this.barHeight, 1);
  }

  private drawShield(): void {
    if (this.shieldRatio === this.lastDrawnShield) return;
    this.lastDrawnShield = this.shieldRatio;

    this.shieldBar.clear();
    if (this.shieldRatio <= 0) return;

    const w = this.barWidth * Math.min(1, this.shieldRatio);
    const halfW = this.barWidth / 2;
    const halfH = this.barHeight / 2;

    // Draw shield as a bright cyan overlay on top of the health bar
    this.shieldBar.fillStyle(0x00eeff, OPACITY.SHIELD_OVERLAY);
    this.shieldBar.fillRoundedRect(-halfW, -halfH, w, this.barHeight, 1);

    // Draw a bright outline around the entire bar to indicate shield is active
    this.shieldBar.lineStyle(1, 0x00eeff, 0.9);
    this.shieldBar.strokeRoundedRect(-halfW - 1, -halfH - 1, this.barWidth + 2, this.barHeight + 2, 2);
  }

  /** Set HP-ratio thresholds where phase notches should appear on the bar */
  setPhaseThresholds(thresholds: number[]): void {
    this.phaseNotches = thresholds.sort((a, b) => b - a);
    this.drawNotches();
  }

  private drawNotches(): void {
    if (this.notchGfx) {
      this.notchGfx.destroy();
      this.notchGfx = null;
    }
    if (this.phaseNotches.length === 0) return;

    this.notchGfx = this.scene.add.graphics();
    for (const threshold of this.phaseNotches) {
      const x = -this.barWidth / 2 + this.barWidth * threshold;
      // Vertical notch line through the bar
      this.notchGfx.lineStyle(1, 0xffd700, 0.8);
      this.notchGfx.lineBetween(x, -this.barHeight / 2 - 1, x, this.barHeight / 2 + 1);
      // Small triangle marker above the bar
      this.notchGfx.fillStyle(0xffd700, 0.6);
      this.notchGfx.fillTriangle(
        x - 2, -this.barHeight / 2 - 2,
        x + 2, -this.barHeight / 2 - 2,
        x, -this.barHeight / 2,
      );
    }
    this.add(this.notchGfx);
  }

  private getHealthColor(ratio: number): number {
    if (ratio > 0.6) return Theme.colors.health.high;
    if (ratio > 0.3) return Theme.colors.health.medium;
    return Theme.colors.health.low;
  }
}

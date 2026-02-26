import Phaser from 'phaser';

export class HealthBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private barWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y);
    this.barWidth = width;

    // Background (dark)
    this.bg = scene.add.rectangle(0, 0, width, height, 0x333333);
    this.bg.setOrigin(0.5, 0.5);
    this.add(this.bg);

    // Health fill (green)
    this.bar = scene.add.rectangle(-width / 2, 0, width, height, 0x44ff44);
    this.bar.setOrigin(0, 0.5);
    this.add(this.bar);
  }

  updateHealth(current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    this.bar.width = this.barWidth * ratio;

    // Color based on health %
    if (ratio > 0.6) {
      this.bar.setFillStyle(0x44ff44);
    } else if (ratio > 0.3) {
      this.bar.setFillStyle(0xffaa00);
    } else {
      this.bar.setFillStyle(0xff4444);
    }
  }
}

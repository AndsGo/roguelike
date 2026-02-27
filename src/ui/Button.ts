import Phaser from 'phaser';
import { Theme, lightenColor, darkenColor } from './Theme';

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private isEnabled: boolean = true;
  private btnWidth: number;
  private btnHeight: number;
  private baseColor: number;
  private borderColor: number;
  private callback?: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    width: number = 160,
    height: number = 40,
    callback?: () => void,
    color?: number,
  ) {
    super(scene, x, y);

    this.btnWidth = width;
    this.btnHeight = height;
    this.baseColor = color ?? Theme.colors.primary;
    this.borderColor = lightenColor(this.baseColor, 0.2);
    this.callback = callback;

    this.bg = scene.add.graphics();
    this.drawButton(this.baseColor, this.borderColor);
    this.add(this.bg);

    this.label = scene.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(this.label);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', this.onHover, this);
    this.on('pointerout', this.onOut, this);
    this.on('pointerdown', this.onDown, this);
    this.on('pointerup', this.onUp, this);

    scene.add.existing(this);
  }

  private drawButton(fill: number, border: number, alpha: number = 1): void {
    this.bg.clear();
    const w = this.btnWidth;
    const h = this.btnHeight;
    const r = 6;
    this.bg.fillStyle(fill, alpha);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    this.bg.lineStyle(2, border, alpha);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  private onHover(): void {
    if (!this.isEnabled) return;
    this.drawButton(lightenColor(this.baseColor, 0.15), lightenColor(this.borderColor, 0.15));
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 100,
      ease: 'Sine.easeOut',
    });
  }

  private onOut(): void {
    if (!this.isEnabled) return;
    this.drawButton(this.baseColor, this.borderColor);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Sine.easeOut',
    });
  }

  private onDown(): void {
    if (!this.isEnabled) return;
    this.drawButton(darkenColor(this.baseColor, 0.2), this.borderColor);
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 60,
      ease: 'Sine.easeOut',
    });
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled) return;
    this.drawButton(this.baseColor, this.borderColor);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 60,
      ease: 'Sine.easeOut',
    });

    // Fire callback only if pointer is still within button bounds
    const localX = pointer.x - this.x;
    const localY = pointer.y - this.y;
    const halfW = this.btnWidth / 2;
    const halfH = this.btnHeight / 2;
    if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
      if (this.callback) this.callback();
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.drawButton(this.baseColor, this.borderColor);
      this.label.setAlpha(1);
      this.setInteractive({ useHandCursor: true });
    } else {
      this.drawButton(0x555555, 0x666666, 0.6);
      this.label.setAlpha(0.5);
      this.disableInteractive();
    }
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}

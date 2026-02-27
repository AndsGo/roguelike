import Phaser from 'phaser';
import { Theme, lightenColor, darkenColor } from './Theme';

export class Button extends Phaser.GameObjects.Container {
  private static readonly HIT_PADDING = 8;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private isEnabled: boolean = true;
  private btnWidth: number;
  private btnHeight: number;
  private baseColor: number;
  private borderColor: number;
  private callback?: () => void;
  private pressX: number = 0;
  private pressY: number = 0;

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
    this.setInteractive(this.buildHitConfig());

    this.on('pointerover', this.onHover, this);
    this.on('pointerout', this.onOut, this);
    this.on('pointerdown', this.onDown, this);
    this.on('pointerup', this.onUp, this);

    scene.add.existing(this);
  }

  private buildHitConfig(): Phaser.Types.Input.InputConfiguration {
    const p = Button.HIT_PADDING;
    return {
      hitArea: new Phaser.Geom.Rectangle(
        -this.btnWidth / 2 - p, -this.btnHeight / 2 - p,
        this.btnWidth + p * 2, this.btnHeight + p * 2,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    };
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

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled) return;
    this.pressX = pointer.x;
    this.pressY = pointer.y;
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

    // Fire callback if pointer didn't drag far from press position
    const dx = pointer.x - this.pressX;
    const dy = pointer.y - this.pressY;
    if (dx * dx + dy * dy < 400) { // < 20px movement
      if (this.callback) this.callback();
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.drawButton(this.baseColor, this.borderColor);
      this.label.setAlpha(1);
      this.setInteractive(this.buildHitConfig());
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

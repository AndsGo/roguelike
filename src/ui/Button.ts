import Phaser from 'phaser';
import { Theme, lightenColor, darkenColor } from './Theme';
import { AudioManager } from '../systems/AudioManager';
import { TextFactory } from './TextFactory';
import { isTouchDevice, tapTolerance } from '../utils/device';

export class Button extends Phaser.GameObjects.Container {
  private static readonly HIT_PADDING = 8;
  /**
   * Minimum hit-area edge on touch devices, in game pixels.
   * 52 game px ≈ 44 CSS px at the ~0.85 FIT scale of a small phone —
   * the iOS/Android touch-target guideline. Visuals are unaffected.
   */
  private static readonly MIN_TOUCH_HIT = 52;
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

    this.label = TextFactory.create(scene, 0, 0, text, 'subtitle', {
      color: '#ffffff',
    }).setOrigin(0.5);
    this.fitLabel();
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
    // Per-axis padding: at least HIT_PADDING; on touch devices grow small
    // buttons up to MIN_TOUCH_HIT without changing their visuals.
    const minEdge = isTouchDevice() ? Button.MIN_TOUCH_HIT : 0;
    const px = Math.max(Button.HIT_PADDING, (minEdge - this.btnWidth) / 2);
    const py = Math.max(Button.HIT_PADDING, (minEdge - this.btnHeight) / 2);
    // Note: Phaser's setInteractive() on Containers sets origin to 0.5,
    // which adds displayOriginX/Y (=width/2, height/2) to hit test coords.
    // So hit area Rectangle(-px, -py, w+2px, h+2py) maps to world-space
    // [-w/2-px, +w/2+px] centered on the Container's position.
    return {
      hitArea: new Phaser.Geom.Rectangle(
        -px, -py,
        this.btnWidth + px * 2, this.btnHeight + py * 2,
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
    // (tolerance is wider for touch — fingers wobble more than mice)
    const tol = tapTolerance();
    const dx = pointer.x - this.pressX;
    const dy = pointer.y - this.pressY;
    if (dx * dx + dy * dy < tol * tol) {
      AudioManager.getInstance().playSfx('sfx_click');
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
    this.fitLabel();
  }

  /**
   * Shrink the label so it never spills outside the button — long Chinese
   * labels overflow fixed-width buttons once the accessibility textScale
   * (mobile default 1.25) kicks in.
   */
  private fitLabel(): void {
    const maxW = this.btnWidth - 10;
    this.label.setScale(1);
    if (this.label.width > maxW) {
      this.label.setScale(maxW / this.label.width);
    }
  }
}

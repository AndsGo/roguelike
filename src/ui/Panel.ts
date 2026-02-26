import Phaser from 'phaser';
import { Theme } from './Theme';

export interface PanelConfig {
  title?: string;
  bgColor?: number;
  borderColor?: number;
  bgAlpha?: number;
  animate?: boolean;
}

export class Panel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private panelWidth: number;
  private panelHeight: number;
  private contentContainer: Phaser.GameObjects.Container;
  private titleBar: Phaser.GameObjects.Text | null = null;
  private titleBarBg: Phaser.GameObjects.Graphics | null = null;
  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private config: PanelConfig;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    config: PanelConfig = {},
  ) {
    super(scene, x, y);

    this.panelWidth = width;
    this.panelHeight = height;
    this.config = config;

    const bgColor = config.bgColor ?? Theme.colors.panel;
    const borderColor = config.borderColor ?? Theme.colors.panelBorder;
    const bgAlpha = config.bgAlpha ?? 0.85;

    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(bgColor, bgAlpha);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.bg.lineStyle(2, borderColor, 1);
    this.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.add(this.bg);

    // Title bar
    const titleOffset = config.title ? 24 : 0;
    if (config.title) {
      this.titleBarBg = scene.add.graphics();
      this.titleBarBg.fillStyle(borderColor, 0.9);
      this.titleBarBg.fillRoundedRect(-width / 2, -height / 2, width, 24, { tl: 8, tr: 8, bl: 0, br: 0 });
      this.add(this.titleBarBg);

      this.titleBar = scene.add.text(0, -height / 2 + 12, config.title, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add(this.titleBar);
    }

    // Scrollable content area
    this.contentContainer = scene.add.container(0, titleOffset / 2);
    this.add(this.contentContainer);

    // Scroll mask
    this.maskShape = scene.add.graphics();
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(
      x - width / 2,
      y - height / 2 + titleOffset,
      width,
      height - titleOffset,
    );
    this.maskShape.setVisible(false);
    const mask = this.maskShape.createGeometryMask();
    this.contentContainer.setMask(mask);

    // Scroll input
    this.setSize(width, height);
    this.setInteractive();
    this.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      this.scroll(dz);
    });

    scene.add.existing(this);

    // Open animation
    if (config.animate !== false) {
      this.setScale(0.8);
      this.setAlpha(0);
      scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  addContent(child: Phaser.GameObjects.GameObject): this {
    this.contentContainer.add(child);
    return this;
  }

  private scroll(deltaY: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.panelHeight + 30);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll);
    this.contentContainer.y = -this.scrollY + (this.config.title ? 12 : 0);
  }

  setContentHeight(h: number): void {
    this.contentHeight = h;
  }

  /** Animate closing, then destroy */
  close(onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.8,
      scaleY: 0.8,
      alpha: 0,
      duration: 150,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (this.maskShape) this.maskShape.destroy();
        this.destroy();
        if (onComplete) onComplete();
      },
    });
  }

  updatePosition(x: number, y: number): void {
    this.setPosition(x, y);
    if (this.maskShape) {
      this.maskShape.clear();
      this.maskShape.fillStyle(0xffffff);
      const titleOffset = this.config.title ? 24 : 0;
      this.maskShape.fillRect(
        x - this.panelWidth / 2,
        y - this.panelHeight / 2 + titleOffset,
        this.panelWidth,
        this.panelHeight - titleOffset,
      );
    }
  }
}

import Phaser from 'phaser';
import { Theme } from './Theme';
import { TextFactory } from './TextFactory';
import { isTouchDevice } from '../utils/device';

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

  // Scrollbar visual
  private scrollbarGraphics: Phaser.GameObjects.Graphics | null = null;

  // Scene-level input handlers (for cleanup)
  private sceneWheelHandler: ((
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number,
    deltaZ: number,
  ) => void) | null = null;
  private sceneDragDown: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private sceneDragMove: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private sceneDragUp: (() => void) | null = null;

  // Drag scroll state
  private isDragScrolling = false;
  private dragStartY = 0;
  private dragScrollStart = 0;
  private dragActive = false;
  private dragVelocity = 0;
  private lastDragY = 0;
  private inertiaTween: Phaser.Tweens.Tween | null = null;

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

      this.titleBar = TextFactory.create(scene, 0, -height / 2 + 12, config.title, 'body', {
        color: '#ffffff',
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

    // Scrollbar indicator (inside panel, not in content container)
    this.scrollbarGraphics = scene.add.graphics();
    this.add(this.scrollbarGraphics);

    // Set centered hit area for scroll/drag detection.
    // Note: Phaser's setInteractive() on Containers sets origin to 0.5,
    // which adds displayOriginX/Y (=width/2, height/2) to hit test coords.
    // So hit area Rectangle(0, 0, w, h) maps to world-space [-w/2, +w/2]
    // centered on the Container's position — which is what we want.
    this.setSize(width, height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    // Scene-level wheel handler (bypasses topOnly issues with child objects)
    const panelRef = this;
    const wheelHandler = (
      pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _dx: number, _dy: number, dz: number,
    ) => {
      if (panelRef.isPointerInBounds(pointer)) {
        panelRef.doScroll(dz);
      }
    };
    scene.input.on('wheel', wheelHandler);
    this.sceneWheelHandler = wheelHandler;

    // Scene-level drag-to-scroll.
    // Threshold: 4px feels right with a mouse, but finger taps wobble —
    // 10px keeps child buttons tappable without hijacking the tap as a drag.
    const dragThreshold = isTouchDevice() ? 10 : 4;
    const downHandler = (pointer: Phaser.Input.Pointer) => {
      if (panelRef.isPointerInBounds(pointer)) {
        panelRef.stopInertia();
        panelRef.dragActive = true;
        panelRef.isDragScrolling = false;
        panelRef.dragStartY = pointer.y;
        panelRef.lastDragY = pointer.y;
        panelRef.dragVelocity = 0;
        panelRef.dragScrollStart = panelRef.scrollY;
      }
    };
    const moveHandler = (pointer: Phaser.Input.Pointer) => {
      if (!panelRef.dragActive || !pointer.isDown) {
        panelRef.dragActive = false;
        return;
      }
      const dy = pointer.y - panelRef.dragStartY;
      if (Math.abs(dy) > dragThreshold) panelRef.isDragScrolling = true;
      if (panelRef.isDragScrolling) {
        // Smoothed per-event velocity for the release inertia
        const step = pointer.y - panelRef.lastDragY;
        panelRef.dragVelocity = panelRef.dragVelocity * 0.3 + step * 0.7;
        panelRef.lastDragY = pointer.y;
        const maxScroll = panelRef.getMaxScroll();
        panelRef.scrollY = Phaser.Math.Clamp(panelRef.dragScrollStart - dy, 0, maxScroll);
        panelRef.contentContainer.y = -panelRef.scrollY + (panelRef.config.title ? 12 : 0);
        panelRef.updateScrollbar();
      }
    };
    const upHandler = () => {
      if (panelRef.isDragScrolling && Math.abs(panelRef.dragVelocity) > 3) {
        panelRef.startInertia(panelRef.dragVelocity);
      }
      panelRef.dragActive = false;
      panelRef.isDragScrolling = false;
    };
    scene.input.on('pointerdown', downHandler);
    scene.input.on('pointermove', moveHandler);
    scene.input.on('pointerup', upHandler);
    this.sceneDragDown = downHandler;
    this.sceneDragMove = moveHandler;
    this.sceneDragUp = upHandler;

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

  /** Check if pointer is within panel bounds */
  private isPointerInBounds(pointer: Phaser.Input.Pointer): boolean {
    const px = pointer.x;
    const py = pointer.y;
    return (
      px >= this.x - this.panelWidth / 2 &&
      px <= this.x + this.panelWidth / 2 &&
      py >= this.y - this.panelHeight / 2 &&
      py <= this.y + this.panelHeight / 2
    );
  }

  private getMaxScroll(): number {
    return Math.max(0, this.contentHeight - this.panelHeight + 30);
  }

  addContent(child: Phaser.GameObjects.GameObject): this {
    this.contentContainer.add(child);
    return this;
  }

  private doScroll(deltaY: number): void {
    const maxScroll = this.getMaxScroll();
    this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll);
    this.contentContainer.y = -this.scrollY + (this.config.title ? 12 : 0);
    this.updateScrollbar();
  }

  /** Flick inertia: keep scrolling after release, decaying to a stop. */
  private startInertia(releaseVelocity: number): void {
    this.stopInertia();
    this.inertiaTween = this.scene.tweens.addCounter({
      from: releaseVelocity,
      to: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const v = (tween as unknown as { getValue: () => number }).getValue();
        const maxScroll = this.getMaxScroll();
        this.scrollY = Phaser.Math.Clamp(this.scrollY - v, 0, maxScroll);
        this.contentContainer.y = -this.scrollY + (this.config.title ? 12 : 0);
        this.updateScrollbar();
        if (this.scrollY <= 0 || this.scrollY >= maxScroll) this.stopInertia();
      },
    }) as unknown as Phaser.Tweens.Tween;
  }

  private stopInertia(): void {
    this.inertiaTween?.remove();
    this.inertiaTween = null;
  }

  /** Draw scrollbar indicator on the right edge */
  private updateScrollbar(): void {
    if (!this.scrollbarGraphics) return;
    this.scrollbarGraphics.clear();

    const maxScroll = this.getMaxScroll();
    if (maxScroll <= 0) return;

    const titleOffset = this.config.title ? 24 : 0;
    const trackX = this.panelWidth / 2 - 8;
    const trackY = -this.panelHeight / 2 + titleOffset + 6;
    const trackHeight = this.panelHeight - titleOffset - 12;

    // Track
    this.scrollbarGraphics.fillStyle(0x333344, 0.4);
    this.scrollbarGraphics.fillRoundedRect(trackX, trackY, 4, trackHeight, 2);

    // Thumb
    const viewRatio = this.panelHeight / this.contentHeight;
    const thumbHeight = Math.max(16, trackHeight * viewRatio);
    const scrollRatio = this.scrollY / maxScroll;
    const thumbY = trackY + scrollRatio * (trackHeight - thumbHeight);

    this.scrollbarGraphics.fillStyle(0x8899cc, 0.6);
    this.scrollbarGraphics.fillRoundedRect(trackX, thumbY, 4, thumbHeight, 2);
  }

  /** Remove all content children (for tab switching / re-render) */
  clearContent(): void {
    this.contentContainer.removeAll(true);
    this.scrollY = 0;
    this.contentContainer.y = 0;
    this.updateScrollbar();
  }

  setContentHeight(h: number): void {
    this.contentHeight = h;
    this.updateScrollbar();
  }

  /** Remove scene-level input handlers */
  private removeInputHandlers(): void {
    if (this.sceneWheelHandler) {
      this.scene?.input?.off('wheel', this.sceneWheelHandler);
      this.sceneWheelHandler = null;
    }
    if (this.sceneDragDown && this.sceneDragMove && this.sceneDragUp) {
      this.scene?.input?.off('pointerdown', this.sceneDragDown);
      this.scene?.input?.off('pointermove', this.sceneDragMove);
      this.scene?.input?.off('pointerup', this.sceneDragUp);
      this.sceneDragDown = null;
      this.sceneDragMove = null;
      this.sceneDragUp = null;
    }
  }

  /** Animate closing, then destroy */
  close(onComplete?: () => void): void {
    this.stopInertia();
    this.removeInputHandlers();
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

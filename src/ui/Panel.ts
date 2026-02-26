import Phaser from 'phaser';

export class Panel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    bgColor: number = 0x222244,
    borderColor: number = 0x4455aa,
  ) {
    super(scene, x, y);

    this.bg = scene.add.rectangle(0, 0, width, height, bgColor, 0.9);
    this.bg.setStrokeStyle(2, borderColor);
    this.add(this.bg);

    scene.add.existing(this);
  }

  addContent(child: Phaser.GameObjects.GameObject): this {
    this.add(child);
    return this;
  }
}

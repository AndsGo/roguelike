import Phaser from 'phaser';

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private isEnabled: boolean = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    width: number = 160,
    height: number = 40,
    callback?: () => void,
  ) {
    super(scene, x, y);

    this.bg = scene.add.rectangle(0, 0, width, height, 0x445588);
    this.bg.setStrokeStyle(2, 0x8899cc);
    this.add(this.bg);

    this.label = scene.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(this.label);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      if (this.isEnabled) this.bg.setFillStyle(0x5566aa);
    });
    this.on('pointerout', () => {
      if (this.isEnabled) this.bg.setFillStyle(0x445588);
    });
    this.on('pointerdown', () => {
      if (this.isEnabled && callback) callback();
    });

    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.bg.setFillStyle(enabled ? 0x445588 : 0x333344);
    this.label.setAlpha(enabled ? 1 : 0.5);
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}

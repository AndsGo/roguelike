import Phaser from 'phaser';
import { DAMAGE_NUMBER_DURATION, DAMAGE_NUMBER_RISE } from '../constants';

export class DamageNumber extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, amount: number, isHeal: boolean = false, isCrit: boolean = false) {
    const text = isHeal ? `+${amount}` : `-${amount}`;
    const color = isHeal ? '#44ff44' : (isCrit ? '#ffaa00' : '#ffffff');
    const fontSize = isCrit ? '14px' : '11px';

    super(scene, x, y, text, {
      fontSize,
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.setOrigin(0.5);
    scene.add.existing(this);

    // Float up and fade out
    scene.tweens.add({
      targets: this,
      y: y - DAMAGE_NUMBER_RISE,
      alpha: 0,
      duration: DAMAGE_NUMBER_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }
}

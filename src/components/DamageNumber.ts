import Phaser from 'phaser';
import { DAMAGE_NUMBER_DURATION, DAMAGE_NUMBER_RISE } from '../constants';
import { Theme, colorToString } from '../ui/Theme';
import { ElementType } from '../types';

export interface DamageNumberConfig {
  isHeal?: boolean;
  isCrit?: boolean;
  element?: ElementType;
  comboCount?: number;
}

export class DamageNumber extends Phaser.GameObjects.Text {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number,
    isHeal: boolean = false,
    isCrit: boolean = false,
    element?: ElementType,
    comboCount?: number,
  ) {
    // Build display text
    let displayText: string;
    if (isHeal) {
      displayText = `+${amount}`;
    } else if (isCrit) {
      displayText = `CRIT! ${amount}`;
    } else {
      displayText = `${amount}`;
    }

    // Determine color
    let color: string;
    if (isHeal) {
      color = colorToString(Theme.colors.success);
    } else if (isCrit) {
      color = colorToString(Theme.colors.secondary);
    } else if (element && Theme.colors.element[element]) {
      color = colorToString(Theme.colors.element[element]);
    } else {
      color = '#ffffff';
    }

    // Font size: crit is 1.5x larger
    const baseFontSize = isCrit ? 20 : 13;
    const fontSize = `${baseFontSize}px`;

    super(scene, x, y, displayText, {
      fontSize,
      color,
      fontFamily: 'monospace',
      fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 3,
    });

    this.setOrigin(0.5);
    scene.add.existing(this);

    // Horizontal random offset for variety
    const offsetX = (Math.random() - 0.5) * 24;

    // Float up + fade out animation
    scene.tweens.add({
      targets: this,
      y: y - DAMAGE_NUMBER_RISE,
      x: x + offsetX,
      alpha: 0,
      duration: DAMAGE_NUMBER_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });

    // Crit: extra scale punch
    if (isCrit) {
      this.setScale(1.4);
      scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }

    // Combo display
    if (comboCount && comboCount >= 5) {
      const comboText = scene.add.text(x, y + 14, `x${comboCount} COMBO!`, {
        fontSize: '9px',
        color: colorToString(Theme.colors.secondary),
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);

      scene.tweens.add({
        targets: comboText,
        y: y + 14 - 15,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => comboText.destroy(),
      });
    }
  }
}

import Phaser from 'phaser';
import { DAMAGE_NUMBER_DURATION, DAMAGE_NUMBER_RISE } from '../constants';
import { Theme, colorToString, getElementColor } from '../ui/Theme';
import { ElementType } from '../types';
import { ANIM, SCALE, PARTICLE, DEPTH, UI_THRESHOLDS } from '../config/visual';

export interface DamageNumberConfig {
  isHeal?: boolean;
  isCrit?: boolean;
  element?: ElementType;
  comboCount?: number;
}

const POOL_MAX = 32;
const FONT_FAMILY = 'monospace';

/**
 * Pooled floating combat text (damage numbers, crit sparkles, combo tags).
 *
 * Battles emit several of these per second; allocating a fresh Text
 * GameObject each hit causes GC churn on mobile. Instead, finished texts
 * go back into a per-scene pool and are re-styled on the next spawn.
 * Pools are dropped on scene shutdown (Phaser destroys the Text objects).
 */
export class DamageNumber {
  private static pools = new WeakMap<Phaser.Scene, Phaser.GameObjects.Text[]>();

  static spawn(
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number,
    isHeal: boolean = false,
    isCrit: boolean = false,
    element?: ElementType,
    comboCount?: number,
  ): void {
    // Build display text with element symbol for accessibility
    const elemSym = element ? (Theme.colors.elementSymbol[element] ?? '') : '';
    let displayText: string;
    if (isHeal) {
      displayText = `+${amount}`;
    } else if (isCrit) {
      displayText = `CRIT! ${elemSym}${amount}`;
    } else {
      displayText = elemSym ? `${elemSym}${amount}` : `${amount}`;
    }

    // Determine color
    let color: string;
    if (isHeal) {
      color = colorToString(Theme.colors.success);
    } else if (isCrit) {
      color = colorToString(Theme.colors.secondary);
    } else if (element) {
      color = colorToString(getElementColor(element));
    } else {
      color = '#ffffff';
    }

    const text = DamageNumber.acquire(scene, x, y, displayText, {
      fontSize: `${isCrit ? 24 : 16}px`,
      color,
      fontFamily: FONT_FAMILY,
      fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setDepth(DEPTH.DAMAGE_NUMBER);

    // Horizontal random offset for variety
    const offsetX = (Math.random() - 0.5) * 24;

    // Float up + fade out animation
    scene.tweens.add({
      targets: text,
      y: y - DAMAGE_NUMBER_RISE,
      x: x + offsetX,
      alpha: 0,
      duration: DAMAGE_NUMBER_DURATION,
      ease: 'Power2',
      onComplete: () => DamageNumber.release(scene, text),
    });

    // Crit: extra scale punch + sparkle particles
    if (isCrit) {
      text.setScale(SCALE.CRIT_INITIAL);
      scene.tweens.add({
        targets: text,
        scaleX: 1,
        scaleY: 1,
        duration: ANIM.CRIT_SCALE,
        ease: 'Back.easeOut',
      });

      for (let s = 0; s < PARTICLE.SPARKLE_COUNT; s++) {
        const sparkle = DamageNumber.acquire(
          scene,
          x + (Math.random() - 0.5) * 30,
          y + (Math.random() - 0.5) * 20,
          '*',
          { fontSize: '13px', color: '#ffd700', fontFamily: FONT_FAMILY, fontStyle: 'normal', stroke: '#000000', strokeThickness: 1 },
        );
        sparkle.setDepth(DEPTH.DAMAGE_NUMBER);
        scene.tweens.add({
          targets: sparkle,
          x: sparkle.x + (Math.random() - 0.5) * 40,
          y: sparkle.y - 20 - Math.random() * 20,
          alpha: 0,
          scaleX: 0.3,
          scaleY: 0.3,
          duration: 400 + Math.random() * 200,
          ease: 'Sine.easeOut',
          onComplete: () => DamageNumber.release(scene, sparkle),
        });
      }
    }

    // Combo display
    if (comboCount && comboCount >= UI_THRESHOLDS.COMBO_DISPLAY_MIN) {
      const comboText = DamageNumber.acquire(scene, x, y + 14, `x${comboCount} COMBO!`, {
        fontSize: '11px',
        color: colorToString(Theme.colors.secondary),
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      });
      comboText.setDepth(DEPTH.DAMAGE_NUMBER);

      scene.tweens.add({
        targets: comboText,
        y: y + 14 - 15,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => DamageNumber.release(scene, comboText),
      });
    }
  }

  private static acquire(
    scene: Phaser.Scene,
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    let pool = DamageNumber.pools.get(scene);
    if (!pool) {
      pool = [];
      DamageNumber.pools.set(scene, pool);
      // Phaser destroys the pooled Texts with the scene; just forget them.
      scene.events.once('shutdown', () => DamageNumber.pools.delete(scene));
    }

    const recycled = pool.pop();
    if (recycled) {
      recycled.setStyle(style);
      recycled.setText(content);
      recycled.setPosition(x, y);
      recycled.setAlpha(1);
      recycled.setScale(1);
      recycled.setVisible(true);
      recycled.setActive(true);
      return recycled;
    }

    const text = scene.add.text(x, y, content, style);
    text.setOrigin(0.5);
    return text;
  }

  private static release(scene: Phaser.Scene, text: Phaser.GameObjects.Text): void {
    const pool = DamageNumber.pools.get(scene);
    if (!pool || pool.length >= POOL_MAX) {
      text.destroy();
      return;
    }
    text.setVisible(false);
    text.setActive(false);
    pool.push(text);
  }
}

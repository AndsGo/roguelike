import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/balance';
import { Unit } from '../entities/Unit';
import { Theme, getAccessibility } from '../ui/Theme';
import { TextFactory } from '../ui/TextFactory';
import { getVisualSpriteFrame, getVisualSpriteSheet } from './VisualSpriteAssets';

/**
 * Visual effects for battle: screen shake, hit flash, crit slow-mo,
 * knockback, screen flash, and skill targeting indicators.
 */
export class BattleEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private spawnSpriteEffect(
    sheetKey: 'skill_fx' | 'hud_fx',
    frameName: string,
    x: number,
    y: number,
    size: number,
    tint: number,
    depth: number,
    duration: number,
    tweenProps: Record<string, unknown> = {},
  ): boolean {
    const sheet = getVisualSpriteSheet(sheetKey);
    const frame = getVisualSpriteFrame(sheetKey, frameName);
    if (
      !sheet ||
      frame === undefined ||
      !this.scene.textures?.exists(sheet.textureKey) ||
      !this.scene.add.sprite
    ) {
      return false;
    }

    const sprite = this.scene.add.sprite(x, y, sheet.textureKey, frame);
    sprite.setDisplaySize(size, size);
    sprite.setTint(tint);
    sprite.setAlpha(0.9);
    sprite.setDepth(depth);
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => sprite.destroy(),
      ...tweenProps,
    });
    return true;
  }

  /** Camera shake effect */
  screenShake(intensity: number = 0.005, duration: number = 100): void {
    if (getAccessibility().reduceMotion) return;
    this.scene.cameras.main.shake(duration, intensity);
  }

  /** Flash unit white on hit */
  hitFlash(unit: Unit): void {
    if (!unit.isAlive || !unit.sprite) return;
    unit.flashColor(0xffffff, 50);
  }

  /** Screen edge flash on crit — brief golden vignette */
  critEdgeFlash(): void {
    if (getAccessibility().reduceMotion) return;
    const g = this.scene.add.graphics();
    g.setDepth(500);

    // Draw a frame-shaped vignette (top, bottom, left, right edges)
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const thickness = 30;
    g.fillStyle(0xffd700, 0.4);
    g.fillRect(0, 0, w, thickness);         // top
    g.fillRect(0, h - thickness, w, thickness); // bottom
    g.fillRect(0, 0, thickness, h);         // left
    g.fillRect(w - thickness, 0, thickness, h); // right

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 250,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** Brief slow motion on crit */
  critSlowMotion(): void {
    if (getAccessibility().reduceMotion) return;
    this.scene.time.timeScale = 0.5;
    this.scene.time.delayedCall(150, () => {
      this.scene.time.timeScale = 1;
    });
  }

  /** Draw a targeting line from caster to target */
  showSkillIndicator(
    caster: Unit,
    target: Unit,
    color: number = 0xffff00,
    duration: number = 300,
  ): void {
    const g = this.scene.add.graphics();
    g.lineStyle(2, color, 0.6);
    g.lineBetween(caster.x, caster.y, target.x, target.y);

    // Small circle at target
    g.fillStyle(color, 0.4);
    g.fillCircle(target.x, target.y, 12);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  /** Brief knockback on hit: push unit away from attacker, then snap back */
  hitKnockback(unit: Unit, fromX: number): void {
    if (!unit.isAlive) return;
    const direction = unit.x >= fromX ? 1 : -1;
    const originalX = unit.x;
    this.scene.tweens.add({
      targets: unit,
      x: originalX + direction * 12,
      duration: 100,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 0,
    });
  }

  /** Full-screen color flash (e.g., for element reactions) */
  screenFlash(color: number, duration: number = 150): void {
    if (getAccessibility().reduceMotion) return;
    const flash = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      color, 0.3,
    ).setDepth(500);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  /** Floating skill name text above caster */
  showSkillName(x: number, y: number, name: string, color: number = 0xffff88): void {
    const text = TextFactory.create(this.scene, x, y - 30, name, 'label', {
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 55,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /** Projectile line from caster to target with fade */
  showProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: number = 0xffff00,
    duration: number = 200,
  ): void {
    const fx = getVisualSpriteSheet('skill_fx');
    const projectileFrame = getVisualSpriteFrame('skill_fx', 'projectile');
    if (
      fx &&
      projectileFrame !== undefined &&
      this.scene.textures?.exists(fx.textureKey) &&
      this.scene.add.sprite
    ) {
      const bullet = this.scene.add.sprite(fromX, fromY, fx.textureKey, projectileFrame);
      bullet.setDisplaySize(18, 18);
      bullet.setTint(color);
      bullet.setDepth(150);
      this.scene.tweens.add({
        targets: bullet,
        x: toX,
        y: toY,
        duration,
        ease: 'Quad.easeIn',
        onComplete: () => {
          bullet.destroy();
        },
      });
      return;
    }

    const bullet = this.scene.add.graphics();
    bullet.fillStyle(color, 0.9);
    bullet.fillCircle(0, 0, 4);
    bullet.setPosition(fromX, fromY);
    bullet.setDepth(150);

    this.scene.tweens.add({
      targets: bullet,
      x: toX,
      y: toY,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bullet.destroy();
      },
    });
  }

  /** AOE blast circle expanding outward */
  showAoeBlast(
    x: number,
    y: number,
    radius: number,
    color: number = 0xff4444,
    duration: number = 400,
  ): void {
    const fx = getVisualSpriteSheet('skill_fx');
    const aoeFrame = getVisualSpriteFrame('skill_fx', 'aoe_blast');
    if (
      fx &&
      aoeFrame !== undefined &&
      this.scene.textures?.exists(fx.textureKey) &&
      this.scene.add.sprite
    ) {
      const blast = this.scene.add.sprite(x, y, fx.textureKey, aoeFrame);
      blast.setDisplaySize(radius * 0.6, radius * 0.6);
      blast.setTint(color);
      blast.setAlpha(0.85);
      blast.setDepth(150);
      this.scene.tweens.add({
        targets: blast,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => blast.destroy(),
      });
      return;
    }

    const g = this.scene.add.graphics();
    g.fillStyle(color, 0.3);
    g.fillCircle(x, y, radius * 0.3);
    g.setDepth(150);

    this.scene.tweens.add({
      targets: g,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** Combo break indicator text */
  showComboBreak(x: number, y: number): void {
    const text = TextFactory.create(this.scene, x, y - 20, '连击断!', 'subtitle', {
      color: '#ff6644',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    text.setScale(1.3);
    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: text,
      y: y - 45,
      alpha: 0,
      duration: 600,
      delay: 200,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /** Element advantage/disadvantage label on hit */
  showElementLabel(x: number, y: number, isAdvantage: boolean): void {
    const label = isAdvantage ? '克制!' : '抵抗!';
    const color = isAdvantage ? '#ff6644' : '#6688cc';

    const text = TextFactory.create(this.scene, x + 15, y - 10, label, 'small', {
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(200);

    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /** Skill interrupt text ("打断!") */
  showInterruptText(x: number, y: number): void {
    const text = TextFactory.create(this.scene, x, y - 15, '打断!', 'body', {
      color: '#ff4466',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    text.setScale(1.4);
    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 600,
      delay: 200,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  /** Threat indicator lines from enemies to their targets */
  drawThreatLines(
    graphics: Phaser.GameObjects.Graphics,
    enemies: { x: number; y: number; isAlive: boolean; target: { x: number; y: number } | null }[],
  ): void {
    graphics.clear();
    graphics.lineStyle(1, 0xff4444, 0.2);
    for (const enemy of enemies) {
      if (!enemy.isAlive || !enemy.target) continue;
      this.drawDashedLine(graphics, enemy.x, enemy.y, enemy.target.x, enemy.target.y, 6, 4);
    }
  }

  /** Healer priority lines from healers to lowest-HP ally */
  drawHealerLines(
    graphics: Phaser.GameObjects.Graphics,
    healers: { x: number; y: number; isAlive: boolean }[],
    targets: { x: number; y: number }[],
    alpha: number,
  ): void {
    graphics.clear();
    graphics.lineStyle(1, 0x44ff44, alpha);
    for (let i = 0; i < healers.length; i++) {
      const healer = healers[i];
      const target = targets[i];
      if (!healer.isAlive || !target) continue;
      this.drawDashedLine(graphics, healer.x, healer.y, target.x, target.y, 6, 4);
    }
  }

  /** Helper: draw a dashed line between two points */
  private drawDashedLine(
    graphics: Phaser.GameObjects.Graphics,
    x1: number, y1: number, x2: number, y2: number,
    dashLength: number, gapLength: number,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const nx = dx / dist;
    const ny = dy / dist;
    let drawn = 0;
    let drawing = true;
    while (drawn < dist) {
      const segLen = drawing ? dashLength : gapLength;
      const end = Math.min(drawn + segLen, dist);
      if (drawing) {
        graphics.lineBetween(
          x1 + nx * drawn, y1 + ny * drawn,
          x1 + nx * end, y1 + ny * end,
        );
      }
      drawn = end;
      drawing = !drawing;
    }
  }

  /** Ignite reaction: orange sparks drift upward (融化) */
  showIgniteEffect(x: number, y: number): void {
    const count = 6 + Math.floor(Math.random() * 3); // 6-8
    if (this.spawnSpriteEffect('skill_fx', 'ignite', x, y, 30, 0xff6600, 200, 420, {
      y: y - 18,
      scaleX: 1.35,
      scaleY: 1.35,
    })) return;

    if (getAccessibility().reduceMotion) {
      const g = this.scene.add.graphics();
      g.setDepth(200);
      g.fillStyle(0xff6600, 0.7);
      for (let i = 0; i < count; i++) {
        const ox = (i - count / 2) * 6;
        g.fillRect(x + ox, y - 12, 2, 2);
      }
      this.scene.time.delayedCall(200, () => g.destroy());
      return;
    }
    for (let i = 0; i < count; i++) {
      const g = this.scene.add.graphics();
      g.setDepth(200);
      const ox = (Math.random() - 0.5) * 24;
      const oy = (Math.random() - 0.5) * 10;
      g.fillStyle(0xff6600, 0.9);
      g.fillRect(x + ox, y + oy, 2, 2);
      this.scene.tweens.add({
        targets: g,
        y: g.y - 20 - Math.random() * 15,
        alpha: 0,
        duration: 500 + Math.random() * 100,
        ease: 'Sine.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  /** Freeze reaction: radial pale-blue lines burst (超导) */
  showFreezeEffect(x: number, y: number): void {
    if (this.spawnSpriteEffect('skill_fx', 'freeze', x, y, 30, 0x88ddff, 200, getAccessibility().reduceMotion ? 200 : 300, {
      scaleX: 1.45,
      scaleY: 1.45,
    })) return;

    const lineCount = 6;
    const g = this.scene.add.graphics();
    g.setDepth(200);
    g.lineStyle(1.5, 0x88ddff, 0.9);
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      g.lineBetween(x, y, x + Math.cos(angle) * 14, y + Math.sin(angle) * 14);
    }
    const duration = getAccessibility().reduceMotion ? 200 : 300;
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** Shock reaction: yellow zigzag lines flicker twice (超载) */
  showShockEffect(x: number, y: number): void {
    const duration = getAccessibility().reduceMotion ? 200 : 240;
    if (this.spawnSpriteEffect('skill_fx', 'shock', x, y, 30, 0xffee00, 200, duration, {
      scaleX: 1.25,
      scaleY: 1.25,
      repeat: getAccessibility().reduceMotion ? 0 : 1,
      yoyo: true,
      ease: 'Stepped',
    })) return;

    const repeatCount = getAccessibility().reduceMotion ? 0 : 1;
    for (let z = 0; z < 2; z++) {
      const g = this.scene.add.graphics();
      g.setDepth(200);
      g.lineStyle(1.5, 0xffee00, 0.9);
      const ox = (z - 0.5) * 12;
      // 3-segment zigzag
      g.beginPath();
      g.moveTo(x + ox, y - 12);
      g.lineTo(x + ox + 6, y);
      g.lineTo(x + ox - 4, y + 6);
      g.lineTo(x + ox + 4, y + 14);
      g.strokePath();
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        duration,
        ease: 'Stepped',
        repeat: repeatCount,
        yoyo: true,
        onComplete: () => g.destroy(),
      });
    }
  }

  /** Annihilate reaction: purple dots fall and fade (湮灭) */
  showAnnihilateEffect(x: number, y: number): void {
    const count = 8;
    if (this.spawnSpriteEffect('skill_fx', 'annihilate', x, y, 30, 0xaa44ff, 200, 420, {
      y: y + 16,
      scaleX: 1.4,
      scaleY: 1.4,
      ease: 'Quad.easeIn',
    })) return;

    if (getAccessibility().reduceMotion) {
      const g = this.scene.add.graphics();
      g.setDepth(200);
      g.fillStyle(0xaa44ff, 0.8);
      for (let i = 0; i < count; i++) {
        const ox = (i - count / 2) * 5;
        g.fillCircle(x + ox, y, 2);
      }
      this.scene.time.delayedCall(200, () => g.destroy());
      return;
    }
    for (let i = 0; i < count; i++) {
      const g = this.scene.add.graphics();
      g.setDepth(200);
      const ox = (Math.random() - 0.5) * 28;
      const oy = (Math.random() - 0.5) * 10;
      g.fillStyle(0xaa44ff, 0.85);
      g.fillCircle(x + ox, y + oy, 2);
      this.scene.tweens.add({
        targets: g,
        y: g.y + 18 + Math.random() * 10,
        alpha: 0,
        duration: 450 + Math.random() * 100,
        ease: 'Quad.easeIn',
        onComplete: () => g.destroy(),
      });
    }
  }

  /** AOE indicator circle */
  showAoeIndicator(
    x: number,
    y: number,
    radius: number,
    color: number = 0xff4444,
    duration: number = 400,
  ): void {
    if (this.spawnSpriteEffect('hud_fx', 'target_lock', x, y, radius * 2, color, 150, duration, {
      scaleX: 1.1,
      scaleY: 1.1,
      ease: 'Sine.easeIn',
    })) return;

    const g = this.scene.add.graphics();
    g.lineStyle(2, color, 0.5);
    g.strokeCircle(x, y, radius);
    g.fillStyle(color, 0.15);
    g.fillCircle(x, y, radius);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => g.destroy(),
    });
  }
}

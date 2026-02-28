import Phaser from 'phaser';
import { UnitStats, UnitRole, StatusEffect, SkillData, ElementType } from '../types';
import { HealthBar } from '../components/HealthBar';
import { HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, Y_MOVEMENT_DAMPING } from '../constants';
import { EventBus } from '../systems/EventBus';
import { Theme, darkenColor, getElementColor } from '../ui/Theme';

/** Default enemy color (no element) */
const ENEMY_BASE_COLOR = 0xff4444;

export class Unit extends Phaser.GameObjects.Container {
  // Identity
  unitId: string;
  unitName: string;
  role: UnitRole;
  isHero: boolean;
  element: ElementType | undefined;

  // Stats
  baseStats: UnitStats;
  currentStats: UnitStats;
  currentHp: number;

  // Stat modifiers from synergies/relics (added to getEffectiveStats pipeline)
  synergyBonuses: Partial<UnitStats> = {};

  // Combat state
  isAlive: boolean = true;
  attackCooldownTimer: number = 0;
  skillCooldowns: Map<string, number> = new Map();
  skills: SkillData[] = [];
  statusEffects: StatusEffect[] = [];
  target: Unit | null = null;
  tauntTarget: Unit | null = null;

  // Visual
  sprite: Phaser.GameObjects.Graphics;
  healthBar: HealthBar;
  protected fillColor: number;
  protected borderColor: number;
  protected spriteWidth: number;
  protected spriteHeight: number;
  private nameLabel: Phaser.GameObjects.Text;
  private statusIcons: Phaser.GameObjects.Text;
  private statusOverlay: Phaser.GameObjects.Graphics;
  private stunTween: Phaser.Tweens.Tween | null = null;
  isBoss: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    name: string,
    role: UnitRole,
    stats: UnitStats,
    isHero: boolean,
    element?: ElementType,
  ) {
    super(scene, x, y);
    this.unitId = id;
    this.unitName = name;
    this.role = role;
    this.isHero = isHero;
    this.element = element;
    this.baseStats = { ...stats };
    this.currentStats = { ...stats };
    this.currentHp = stats.hp;

    // Determine colors
    this.fillColor = this.computeFillColor();
    this.borderColor = this.computeBorderColor();

    // Determine size by role
    const sizeInfo = this.computeSize();
    this.spriteWidth = sizeInfo.w;
    this.spriteHeight = sizeInfo.h;

    // Draw the shape-based sprite
    this.sprite = scene.add.graphics();
    this.drawShape();
    this.add(this.sprite);

    // Name label
    const displayName = name.length > 8 ? name.substring(0, 8) : name;
    this.nameLabel = scene.add.text(0, -this.spriteHeight / 2 - 12, displayName, {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(this.nameLabel);

    // Health bar
    this.healthBar = new HealthBar(scene, 0, this.spriteHeight / 2 + 4, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    this.add(this.healthBar);

    // Element indicator below health bar
    if (this.element) {
      const elementSymbols: Record<string, string> = {
        fire: '火', ice: '冰', lightning: '雷', dark: '暗', holy: '光',
      };
      const shapeSym = Theme.colors.elementSymbol[this.element] ?? '';
      const sym = `${shapeSym}${elementSymbols[this.element] ?? this.element[0].toUpperCase()}`;
      const elColor = getElementColor(this.element);
      const colorStr = elColor !== undefined ? '#' + elColor.toString(16).padStart(6, '0') : '#ffffff';
      const elementLabel = scene.add.text(0, this.spriteHeight / 2 + 13, sym, {
        fontSize: '8px',
        color: colorStr,
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      this.add(elementLabel);
    }

    // Status effect visuals (pre-created to avoid per-frame allocation)
    this.statusOverlay = scene.add.graphics();
    this.add(this.statusOverlay);
    this.statusIcons = scene.add.text(0, -this.spriteHeight / 2 - 22, '', {
      fontSize: '9px',
      color: '#ffcc00',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);
    this.add(this.statusIcons);

    scene.add.existing(this);
  }

  private computeFillColor(): number {
    if (this.isHero) {
      return Theme.colors.role[this.role] ?? 0x4488ff;
    }
    // Enemy: use darkened element color, or base red
    if (this.element) {
      const elementColor = getElementColor(this.element);
      if (elementColor !== undefined) {
        return darkenColor(elementColor, 0.4);
      }
    }
    return ENEMY_BASE_COLOR;
  }

  private computeBorderColor(): number {
    if (this.element) {
      const elementColor = getElementColor(this.element);
      if (elementColor !== undefined) {
        return elementColor;
      }
    }
    // Default border: slightly brighter version of fill
    if (this.isHero) {
      return 0xffffff;
    }
    return 0xcc2222;
  }

  private computeSize(): { w: number; h: number } {
    if (this.isBoss) {
      return { w: 40, h: 44 };
    }
    switch (this.role) {
      case 'tank': return { w: 30, h: 36 };
      default: return { w: 24, h: 28 };
    }
  }

  /** Draw the unit shape onto the Graphics object */
  protected drawShape(overrideColor?: number): void {
    const g = this.sprite;
    g.clear();
    const fill = overrideColor ?? this.fillColor;
    const border = this.borderColor;
    const w = this.spriteWidth;
    const h = this.spriteHeight;

    if (this.isBoss) {
      // Boss: large square with double border
      g.fillStyle(fill, 1);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(3, border, 1);
      g.strokeRect(-w / 2, -h / 2, w, h);
      g.lineStyle(1, 0xffffff, 0.4);
      g.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      return;
    }

    switch (this.role) {
      case 'tank':
        g.fillStyle(fill, 1);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.lineStyle(2, border, 1);
        g.strokeRect(-w / 2, -h / 2, w, h);
        break;

      case 'melee_dps': {
        // Diamond shape
        const points = [
          { x: 0, y: -h / 2 },
          { x: w / 2, y: 0 },
          { x: 0, y: h / 2 },
          { x: -w / 2, y: 0 },
        ];
        g.fillStyle(fill, 1);
        g.fillPoints(points, true);
        g.lineStyle(2, border, 1);
        g.strokePoints(points, true);
        break;
      }

      case 'ranged_dps':
        g.fillStyle(fill, 1);
        g.fillCircle(0, 0, w / 2);
        g.lineStyle(2, border, 1);
        g.strokeCircle(0, 0, w / 2);
        break;

      case 'healer':
        g.fillStyle(fill, 1);
        g.fillCircle(0, 0, w / 2);
        g.lineStyle(2, border, 1);
        g.strokeCircle(0, 0, w / 2);
        // Inner cross
        g.lineStyle(2, 0xffffff, 0.6);
        g.lineBetween(-5, 0, 5, 0);
        g.lineBetween(0, -5, 0, 5);
        break;

      case 'support':
        // Rounded rectangle approximation (small rect with outline)
        g.fillStyle(fill, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
        g.lineStyle(2, border, 1);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
        break;

      default:
        g.fillStyle(fill, 1);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.lineStyle(2, border, 1);
        g.strokeRect(-w / 2, -h / 2, w, h);
        break;
    }
  }

  /** Configure for boss display */
  setBoss(): void {
    this.isBoss = true;
    const sizeInfo = this.computeSize();
    this.spriteWidth = sizeInfo.w;
    this.spriteHeight = sizeInfo.h;
    this.fillColor = this.isHero ? this.fillColor : (this.element ? getElementColor(this.element) ?? 0xff2222 : 0xff2222);
    this.borderColor = 0xffaa00;
    this.drawShape();

    // Boss name styling
    this.nameLabel.setStyle({
      fontSize: '9px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.nameLabel.setY(-this.spriteHeight / 2 - 20);

    // Reposition health bar
    this.healthBar.setY(this.spriteHeight / 2 + 4);
  }

  /**
   * Effective stats pipeline: base + equipment/level (currentStats) + buff/debuff + synergy
   */
  getEffectiveStats(): UnitStats {
    const stats = { ...this.currentStats };

    // Apply buff/debuff status effects
    for (const effect of this.statusEffects) {
      if ((effect.type === 'buff' || effect.type === 'debuff') && effect.stat) {
        const key = effect.stat;
        (stats[key] as number) += effect.value;
      }
    }

    // Apply synergy bonuses
    for (const [key, value] of Object.entries(this.synergyBonuses)) {
      if (key in stats && typeof value === 'number') {
        (stats[key as keyof UnitStats] as number) += value;
      }
    }

    return stats;
  }

  /** Dynamically add a skill at runtime (e.g. from synergy unlock) */
  addSkill(skill: SkillData): void {
    if (!this.skills.some(s => s.id === skill.id)) {
      this.skills.push(skill);
      this.skillCooldowns.set(skill.id, 0);
    }
  }

  /** Remove a dynamically added skill */
  removeSkill(skillId: string): void {
    this.skills = this.skills.filter(s => s.id !== skillId);
    this.skillCooldowns.delete(skillId);
  }

  takeDamage(amount: number): number {
    const actual = Math.max(0, Math.round(amount));
    if (actual === 0) return 0;
    this.currentHp = Math.max(0, this.currentHp - actual);
    this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);

    if (this.currentHp <= 0) {
      this.die();
    } else {
      this.flashHurt();
    }
    return actual;
  }

  heal(amount: number): number {
    if (!this.isAlive) return 0;
    const maxHp = this.currentStats.maxHp;
    const actual = Math.min(Math.round(amount), maxHp - this.currentHp);
    this.currentHp += actual;
    this.healthBar.updateHealth(this.currentHp, maxHp);

    if (actual > 0) {
      EventBus.getInstance().emit('unit:heal', {
        sourceId: this.unitId,
        targetId: this.unitId,
        amount: actual,
      });
    }

    return actual;
  }

  die(): void {
    this.isAlive = false;
    this.target = null;

    // Clean up stun tween
    if (this.stunTween) {
      this.stunTween.stop();
      this.stunTween = null;
    }

    EventBus.getInstance().emit('unit:death', {
      unitId: this.unitId,
      isHero: this.isHero,
    });

    // Staged death animation: hit-stop → flash white 3x → shrink+fade
    // Stage 1: Hit-stop (freeze briefly)
    const scene = this.scene;
    if (!scene) {
      this.setVisible(false);
      return;
    }

    // Stage 2: Flash white 3 times
    let flashCount = 0;
    const flashInterval = scene.time.addEvent({
      delay: 80,
      repeat: 5, // 6 calls = 3 flashes (on, off, on, off, on, off)
      callback: () => {
        if (!scene || !this.sprite) return;
        flashCount++;
        if (flashCount % 2 === 1) {
          this.drawShape(0xffffff);
        } else {
          this.drawShape();
        }
      },
    });

    // Stage 3: After flashing, shrink + rotate + fade
    scene.time.delayedCall(580, () => {
      if (!scene) return;
      flashInterval.destroy();
      this.drawShape();

      scene.tweens.add({
        targets: this,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        angle: this.isHero ? -45 : 45,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          this.setVisible(false);
        },
      });
    });
  }

  flashHurt(): void {
    if (!this.scene) return;
    this.drawShape(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.isAlive && this.scene) {
        this.drawShape();
      }
    });
  }

  /** Flash a specific color (used by external systems like BattleEffects, SkillSystem) */
  flashColor(color: number, duration: number = 100): void {
    if (!this.scene) return;
    this.drawShape(color);
    this.scene.time.delayedCall(duration, () => {
      if (this.isAlive && this.scene) {
        this.drawShape();
      }
    });
  }

  isStunned(): boolean {
    return this.statusEffects.some(e => e.type === 'stun');
  }

  getTauntSource(): Unit | null {
    const taunt = this.statusEffects.find(e => e.type === 'taunt');
    return taunt ? this.tauntTarget : null;
  }

  /** Update visual indicators for active status effects */
  updateStatusVisuals(): void {
    if (!this.scene) return;
    const hasBurn = this.statusEffects.some(e => e.type === 'dot' && e.element === 'fire');
    const hasFreeze = this.statusEffects.some(e => e.type === 'stun');
    const hasBuff = this.statusEffects.some(e => e.type === 'buff');
    const hasDebuff = this.statusEffects.some(e => e.type === 'debuff');
    const hasPoison = this.statusEffects.some(e => e.type === 'dot' && e.element === 'dark');
    const hasHot = this.statusEffects.some(e => e.type === 'hot');

    // Color overlay based on active effects (priority: freeze > burn > poison > debuff)
    this.statusOverlay.clear();

    let overlayColor: number | null = null;
    if (hasFreeze) {
      overlayColor = 0x88ccff;
    } else if (hasBurn) {
      overlayColor = 0xff8844;
    } else if (hasPoison) {
      overlayColor = 0xcc44ff;
    } else if (hasDebuff) {
      overlayColor = 0xaa6666;
    }

    if (overlayColor !== null) {
      const w = this.spriteWidth;
      const h = this.spriteHeight;
      this.statusOverlay.fillStyle(overlayColor, 0.3);
      this.statusOverlay.fillRect(-w / 2, -h / 2, w, h);
    }

    // Status icon text above unit — show type symbol + remaining duration
    const parts: string[] = [];
    for (const eff of this.statusEffects) {
      let sym = '';
      switch (eff.type) {
        case 'dot': sym = eff.element === 'fire' ? '🔥' : '☠'; break;
        case 'hot': sym = '♥'; break;
        case 'stun': sym = '✦'; break;
        case 'buff': sym = '▲'; break;
        case 'debuff': sym = '▼'; break;
        case 'taunt': sym = '⊕'; break;
        default: sym = '?'; break;
      }
      const dur = Math.ceil(eff.duration);
      parts.push(`${sym}${dur}`);
    }

    if (parts.length > 0) {
      // Show at most 3 effects to avoid clutter
      this.statusIcons.setText(parts.slice(0, 3).join(' '));
      this.statusIcons.setVisible(true);
      // Color: buffs green, debuffs red, mixed yellow
      const hasOnlyBuff = hasBuff && !hasDebuff && !hasBurn && !hasPoison && !hasFreeze;
      const hasOnlyDebuff = (hasDebuff || hasBurn || hasPoison || hasFreeze) && !hasBuff && !hasHot;
      this.statusIcons.setColor(hasOnlyBuff ? '#88ff88' : hasOnlyDebuff ? '#ff8888' : '#ffcc00');
    } else {
      this.statusIcons.setVisible(false);
    }

    // Stun shake animation
    if (hasFreeze && !this.stunTween) {
      this.stunTween = this.scene.tweens.add({
        targets: this,
        x: this.x - 2,
        duration: 80,
        yoyo: true,
        repeat: -1,
      });
    } else if (!hasFreeze && this.stunTween) {
      this.stunTween.stop();
      this.stunTween = null;
    }
  }

  moveToward(targetX: number, targetY: number, delta: number): void {
    const stats = this.getEffectiveStats();
    const speed = stats.speed * (delta / 1000);
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    const nx = dx / dist;
    const ny = dy / dist;
    this.x += nx * speed;
    this.y += ny * speed * Y_MOVEMENT_DAMPING;
  }

  distanceTo(other: Unit): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  isInRange(other: Unit): boolean {
    return this.distanceTo(other) <= this.getEffectiveStats().attackRange;
  }
}

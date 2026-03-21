import Phaser from 'phaser';
import { UnitStats, UnitRole, StatusEffect, SkillData, ElementType, RaceType, ClassType, MonsterType } from '../types';
import { HealthBar } from '../components/HealthBar';
import { Y_MOVEMENT_DAMPING } from '../constants';
import { HealthBarStyle } from '../config/visual';
import { EventBus } from '../systems/EventBus';
import { RelicSystem } from '../systems/RelicSystem';
import { Theme, darkenColor, getElementColor, getRoleColor } from '../ui/Theme';
import { getOrCreateTexture, getDisplaySize, ChibiConfig } from '../systems/UnitRenderer';
import { UI } from '../i18n';
import { TextFactory } from '../ui/TextFactory';

/** Default enemy color (no element) */
const ENEMY_BASE_COLOR = 0xff4444;

export class Unit extends Phaser.GameObjects.Container {
  // Identity
  unitId: string;
  unitName: string;
  role: UnitRole;
  race: RaceType;
  classType: ClassType;
  isHero: boolean;
  element: ElementType | undefined;
  monsterType?: MonsterType;
  formation: 'front' | 'back' = 'front';

  // Stats
  baseStats: UnitStats;
  currentStats: UnitStats;
  currentHp: number;

  // Stat modifiers from synergies/relics (added to getEffectiveStats pipeline)
  synergyBonuses: Partial<UnitStats> = {};

  // Effective stats cache (dirty-flag optimization)
  private _effectiveStatsCache: UnitStats | null = null;
  private _statsDirty: boolean = true;

  // Combat state
  isAlive: boolean = true;
  attackCooldownTimer: number = 0;
  skillCooldowns: Map<string, number> = new Map();
  skills: SkillData[] = [];
  statusEffects: StatusEffect[] = [];
  target: Unit | null = null;
  tauntTarget: Unit | null = null;
  lastAttacker?: Unit;
  private shieldHp: number = 0;
  private shieldDuration: number = 0;
  private static isCounterDamage = false;

  // Visual
  sprite: Phaser.GameObjects.Image;
  healthBar: HealthBar;
  protected fillColor: number;
  protected borderColor: number;
  protected spriteWidth: number;
  protected spriteHeight: number;
  private nameLabel: Phaser.GameObjects.Text;
  private statusIcons: Phaser.GameObjects.Text;
  private statusOverlay: Phaser.GameObjects.Graphics;
  private stunTween: Phaser.Tweens.Tween | null = null;
  private statusTooltip: Phaser.GameObjects.Container | null = null;
  isBoss: boolean = false;
  isElite: boolean = false;

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
    race: RaceType = 'human',
    classType: ClassType = 'warrior',
  ) {
    super(scene, x, y);
    this.unitId = id;
    this.unitName = name;
    this.role = role;
    this.race = race;
    this.classType = classType;
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

    // Create pixel-art texture and Image sprite
    const textureKey = getOrCreateTexture(scene, this.buildChibiConfig());
    this.sprite = scene.add.image(0, 0, textureKey);
    this.sprite.setOrigin(0.5);
    this.add(this.sprite);

    // Name label (hidden by default for heroes — HUD already shows hero info)
    const displayName = name.length > 8 ? name.substring(0, 8) : name;
    this.nameLabel = TextFactory.create(scene, 0, -this.spriteHeight / 2 - 14, displayName, 'small', {
      color: '#ffffff',
    }).setOrigin(0.5);
    if (isHero) {
      this.nameLabel.setVisible(false);
    }
    this.add(this.nameLabel);

    // Health bar
    this.healthBar = new HealthBar(scene, 0, this.spriteHeight / 2 + 4, this.getHealthBarStyle());
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
      const elementLabel = TextFactory.create(scene, 0, this.spriteHeight / 2 + 13, sym, 'tiny', {
        color: colorStr,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      this.add(elementLabel);
    }

    // Status effect visuals (pre-created to avoid per-frame allocation)
    this.statusOverlay = scene.add.graphics();
    this.add(this.statusOverlay);
    this.statusIcons = TextFactory.create(scene, 0, -this.spriteHeight / 2 - 24, '', 'small', {
      color: '#ffcc00',
    }).setOrigin(0.5).setVisible(false);
    this.add(this.statusIcons);
    this.statusIcons.setInteractive({ useHandCursor: true });
    this.statusIcons.on('pointerup', () => this.toggleStatusTooltip());

    scene.add.existing(this);
  }

  private computeFillColor(): number {
    if (this.isHero) {
      return getRoleColor(this.role);
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

  private getHealthBarStyle(): HealthBarStyle {
    if (this.isHero) return 'hero';
    if (this.isBoss) return 'boss';
    if (this.isElite) return 'elite';
    return 'normal';
  }

  private computeSize(): { w: number; h: number } {
    return getDisplaySize(this.role, this.isBoss);
  }

  /** Build the ChibiConfig for texture generation */
  protected buildChibiConfig(): ChibiConfig {
    return {
      role: this.role,
      race: this.race,
      classType: this.classType,
      fillColor: this.fillColor,
      borderColor: this.borderColor,
      isHero: this.isHero,
      isBoss: this.isBoss,
      monsterType: this.monsterType,
    };
  }

  /** Regenerate the pixel-art texture (e.g. after boss upgrade) */
  protected regenerateTexture(): void {
    const key = getOrCreateTexture(this.scene, this.buildChibiConfig());
    this.sprite.setTexture(key);
  }

  /** Configure for boss display */
  setBoss(): void {
    this.isBoss = true;
    const sizeInfo = this.computeSize();
    this.spriteWidth = sizeInfo.w;
    this.spriteHeight = sizeInfo.h;
    this.fillColor = this.isHero ? this.fillColor : (this.element ? getElementColor(this.element) ?? 0xff2222 : 0xff2222);
    this.borderColor = 0xffaa00;
    this.regenerateTexture();

    // Boss name styling
    this.nameLabel.setStyle({
      fontSize: '9px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.nameLabel.setY(-this.spriteHeight / 2 - 20);

    // Recreate health bar with boss style
    this.recreateHealthBar('boss');
  }

  /** Configure for elite display */
  setElite(): void {
    this.isElite = true;
    this.recreateHealthBar('elite');
  }

  /** Recreate the health bar with a new style (e.g. after boss/elite upgrade) */
  private recreateHealthBar(style: HealthBarStyle): void {
    const hbY = this.healthBar.y;
    const oldElement = this.element;
    this.healthBar.destroy();
    this.healthBar = new HealthBar(this.scene, 0, hbY, style);
    this.add(this.healthBar);
    this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
    if (oldElement) this.healthBar.setElement(oldElement);
  }

  /** Pass phase thresholds to the health bar for boss notch rendering */
  setPhaseThresholds(thresholds: number[]): void {
    this.healthBar.setPhaseThresholds(thresholds);
  }

  /** Mark effective stats cache as stale (call when statusEffects, synergyBonuses, or relics change) */
  invalidateStats(): void {
    this._statsDirty = true;
    this._effectiveStatsCache = null;
  }

  /**
   * Effective stats pipeline: base + equipment/level (currentStats) + buff/debuff + synergy
   */
  getEffectiveStats(): UnitStats {
    if (!this._statsDirty && this._effectiveStatsCache) {
      return this._effectiveStatsCache;
    }

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

    // Apply relic stat modifiers (only for heroes)
    if (this.isHero) {
      const relicMods = RelicSystem.getStatModifiers(stats);
      for (const [key, value] of Object.entries(relicMods)) {
        if (key in stats && typeof value === 'number') {
          (stats[key as keyof UnitStats] as number) += value;
        }
      }

      // Conditional relic bonuses (build-defining relics based on team composition)
      const conditionalMods = RelicSystem.getConditionalStatMods();
      for (const [key, value] of Object.entries(conditionalMods)) {
        if (key in stats && typeof value === 'number') {
          (stats[key as keyof UnitStats] as number) += value;
        }
      }
    }

    this._effectiveStatsCache = stats;
    this._statsDirty = false;
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

    // Shield absorption
    let remaining = actual;
    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, remaining);
      this.shieldHp -= absorbed;
      remaining -= absorbed;
      if (remaining === 0) {
        this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
        return 0;
      }
    }

    this.currentHp = Math.max(0, this.currentHp - remaining);
    this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);

    // Counter aura: reflect damage back to attacker (re-entrant guard)
    if (!Unit.isCounterDamage) {
      const counterEffect = this.statusEffects.find(e => e.name === 'counter_aura');
      if (counterEffect && this.lastAttacker && this.lastAttacker.isAlive) {
        Unit.isCounterDamage = true;
        this.lastAttacker.takeDamage(Math.round(remaining * counterEffect.value));
        Unit.isCounterDamage = false;
      }
    }

    if (this.currentHp <= 0) {
      this.die();
    } else {
      this.flashHurt();
    }
    return remaining;
  }

  heal(amount: number): number {
    if (!this.isAlive) return 0;
    const maxHp = this.currentStats.maxHp;
    const actual = Math.min(Math.round(amount), maxHp - this.currentHp);
    this.currentHp += actual;
    this.healthBar.updateHealth(this.currentHp, maxHp);

    if (actual > 0) {
      this.flashColor(0x44ff88, 120); // Green heal flash
      EventBus.getInstance().emit('unit:heal', {
        sourceId: this.unitId,
        targetId: this.unitId,
        amount: actual,
      });
    }

    return actual;
  }

  addShield(value: number, duration: number): void {
    this.shieldHp = Math.max(this.shieldHp, value);
    this.shieldDuration = duration * 1000;
    this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
  }

  decayShield(deltaMs: number): void {
    if (this.shieldDuration > 0) {
      this.shieldDuration -= deltaMs;
      if (this.shieldDuration <= 0) {
        this.shieldHp = 0;
        this.shieldDuration = 0;
      }
    }
  }

  die(): void {
    // Check phoenix ash revival
    if (RelicSystem.shouldRevive(this)) {
      // Cancel death — unit stays alive with 30% HP
      this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
      return;
    }

    // Check holy_scripture shield
    if (RelicSystem.shouldApplyHolyShield(this)) {
      this.healthBar.updateHealth(this.currentHp, this.currentStats.maxHp);
      return;
    }

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
          this.sprite.setTintFill(0xffffff);
        } else {
          this.sprite.clearTint();
        }
      },
    });

    // Stage 3: After flashing, shrink + rotate + fade
    scene.time.delayedCall(580, () => {
      if (!scene) return;
      flashInterval.destroy();
      this.sprite.clearTint();

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
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.isAlive && this.scene) {
        this.sprite.clearTint();
      }
    });
  }

  /** Flash a specific color (used by external systems like BattleEffects, SkillSystem) */
  flashColor(color: number, duration: number = 100): void {
    if (!this.scene) return;
    this.sprite.setTintFill(color);
    this.scene.time.delayedCall(duration, () => {
      if (this.isAlive && this.scene) {
        this.sprite.clearTint();
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
    if (this.statusEffects.length === 0) {
      this.hideStatusTooltip();
    }
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

  /** Show or hide the unit name label */
  setNameVisible(visible: boolean): void {
    this.nameLabel.setVisible(visible);
  }

  private toggleStatusTooltip(): void {
    if (this.statusTooltip) {
      this.hideStatusTooltip();
    } else {
      this.showStatusTooltip();
    }
  }

  private showStatusTooltip(): void {
    if (this.statusEffects.length === 0) return;
    this.hideStatusTooltip();

    const container = this.scene.add.container(this.x + 30, this.y - this.spriteHeight / 2 - 10);
    container.setDepth(500);

    const lineHeight = 16;
    const padding = 6;
    const width = 130;
    const height = this.statusEffects.length * lineHeight + padding * 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(0, 0, width, height, 4);
    bg.lineStyle(1, 0x334466, 0.8);
    bg.strokeRoundedRect(0, 0, width, height, 4);
    container.add(bg);

    const nameMap: Record<string, string> = {
      dot: UI.battle.statusDot,
      hot: UI.battle.statusHot,
      stun: UI.battle.statusStun,
      buff: UI.battle.statusBuff,
      debuff: UI.battle.statusDebuff,
      slow: UI.battle.statusSlow,
      taunt: UI.battle.statusTaunt,
    };

    const iconMap: Record<string, string> = {
      dot: '🔥', hot: '♥', stun: '✦', buff: '▲', debuff: '▼', slow: '❄', taunt: '⊕',
    };

    this.statusEffects.forEach((effect, i) => {
      const name = nameMap[effect.type] ?? effect.type;
      const icon = iconMap[effect.type] ?? '•';
      const remaining = Math.max(0, effect.duration / 1000);
      const valueStr = effect.value ? `${Math.abs(effect.value)}` : '';
      const line = `${icon} ${name}  ${valueStr}  ${remaining.toFixed(1)}s`;

      const text = TextFactory.create(this.scene, padding, padding + i * lineHeight, line, 'small', {
        color: effect.type === 'buff' || effect.type === 'hot' ? '#88ff88' : '#ff8888',
      });
      container.add(text);
    });

    this.statusTooltip = container;
  }

  private hideStatusTooltip(): void {
    if (this.statusTooltip) {
      this.statusTooltip.destroy();
      this.statusTooltip = null;
    }
  }

  destroy(fromScene?: boolean): void {
    this.hideStatusTooltip();
    super.destroy(fromScene);
  }
}

import Phaser from 'phaser';
import { UnitStats, UnitRole, StatusEffect, SkillData, ElementType } from '../types';
import { HealthBar } from '../components/HealthBar';
import { HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, Y_MOVEMENT_DAMPING } from '../constants';
import { EventBus } from '../systems/EventBus';

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
  sprite: Phaser.GameObjects.Rectangle; // placeholder
  healthBar: HealthBar;

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

    // Placeholder sprite (colored rectangle)
    const color = isHero ? 0x4488ff : 0xff4444;
    const w = role === 'tank' ? 28 : 22;
    const h = role === 'tank' ? 32 : 28;
    this.sprite = scene.add.rectangle(0, 0, w, h, color);
    this.add(this.sprite);

    // Role label
    const roleLabel = scene.add.text(0, -h / 2 - 12, this.getShortName(), {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(roleLabel);

    // Health bar
    this.healthBar = new HealthBar(scene, 0, h / 2 + 4, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    this.add(this.healthBar);

    scene.add.existing(this);
  }

  private getShortName(): string {
    // Show first 4 chars of name
    return this.unitName.substring(0, 4);
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

    EventBus.getInstance().emit('unit:death', {
      unitId: this.unitId,
      isHero: this.isHero,
    });

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.setVisible(false);
      },
    });
  }

  flashHurt(): void {
    this.sprite.setFillStyle(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.isAlive) {
        const color = this.isHero ? 0x4488ff : 0xff4444;
        this.sprite.setFillStyle(color);
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

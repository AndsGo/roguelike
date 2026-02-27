import { Unit } from '../entities/Unit';
import { DamageSystem } from './DamageSystem';

/**
 * Applies act-specific modifiers to battles:
 * - Act 0 (Forest): Every 15s, heal all heroes 5% max HP
 * - Act 1 (Volcano): Stationary units take fire ground damage
 * - Act 2 (Abyss): Periodic dark debuff reduces attack range
 */
export class ActModifierSystem {
  private actIndex: number;
  private healTimer: number = 0;
  private abyssTimer: number = 0;
  private volcanoCheckTimer: number = 0;
  private unitLastX: Map<string, number> = new Map();
  private damageSystem: DamageSystem | null = null;

  private static readonly HEAL_INTERVAL = 15000; // 15s
  private static readonly HEAL_PERCENT = 0.05;
  private static readonly VOLCANO_CHECK_INTERVAL = 2000; // check every 2s
  private static readonly VOLCANO_DAMAGE_PERCENT = 0.02; // 2% max HP
  private static readonly VOLCANO_MOVEMENT_THRESHOLD = 5; // px moved to be considered "moving"
  private static readonly ABYSS_INTERVAL = 10000; // 10s
  private static readonly ABYSS_RANGE_REDUCTION = 20; // px

  constructor(actIndex: number, damageSystem?: DamageSystem) {
    this.actIndex = actIndex;
    this.damageSystem = damageSystem ?? null;
  }

  /** Called at battle start to set initial positions */
  applyBattleStart(heroes: Unit[], enemies: Unit[]): void {
    const all = [...heroes, ...enemies];
    for (const unit of all) {
      this.unitLastX.set(unit.unitId, unit.x);
    }
  }

  /** Called every frame during combat */
  tick(delta: number, heroes: Unit[], enemies: Unit[]): void {
    switch (this.actIndex) {
      case 0:
        this.tickForest(delta, heroes);
        break;
      case 1:
        this.tickVolcano(delta, heroes, enemies);
        break;
      case 2:
        this.tickAbyss(delta, heroes, enemies);
        break;
    }
  }

  /** Forest: periodic heal */
  private tickForest(delta: number, heroes: Unit[]): void {
    this.healTimer += delta;
    if (this.healTimer >= ActModifierSystem.HEAL_INTERVAL) {
      this.healTimer -= ActModifierSystem.HEAL_INTERVAL;
      for (const hero of heroes) {
        if (!hero.isAlive) continue;
        const maxHp = hero.currentStats.maxHp;
        const healAmount = Math.floor(maxHp * ActModifierSystem.HEAL_PERCENT);
        hero.currentHp = Math.min(maxHp, hero.currentHp + healAmount);
      }
    }
  }

  /** Volcano: stationary units take damage */
  private tickVolcano(delta: number, heroes: Unit[], enemies: Unit[]): void {
    this.volcanoCheckTimer += delta;
    if (this.volcanoCheckTimer >= ActModifierSystem.VOLCANO_CHECK_INTERVAL) {
      this.volcanoCheckTimer -= ActModifierSystem.VOLCANO_CHECK_INTERVAL;
      const all = [...heroes, ...enemies];
      for (const unit of all) {
        if (!unit.isAlive) continue;
        const lastX = this.unitLastX.get(unit.unitId) ?? unit.x;
        const moved = Math.abs(unit.x - lastX);
        if (moved < ActModifierSystem.VOLCANO_MOVEMENT_THRESHOLD) {
          // Stationary — take fire ground damage
          const dmg = Math.floor(unit.currentStats.maxHp * ActModifierSystem.VOLCANO_DAMAGE_PERCENT);
          unit.takeDamage(dmg);
        }
        this.unitLastX.set(unit.unitId, unit.x);
      }
    }
  }

  /** Abyss: periodic range reduction debuff */
  private tickAbyss(delta: number, heroes: Unit[], enemies: Unit[]): void {
    this.abyssTimer += delta;
    if (this.abyssTimer >= ActModifierSystem.ABYSS_INTERVAL) {
      this.abyssTimer -= ActModifierSystem.ABYSS_INTERVAL;
      const all = [...heroes, ...enemies];
      for (const unit of all) {
        if (!unit.isAlive) continue;
        // Temporarily reduce attack range
        unit.currentStats.attackRange = Math.max(
          20,
          unit.currentStats.attackRange - ActModifierSystem.ABYSS_RANGE_REDUCTION,
        );
      }
    }
  }

  getActDescription(): string {
    switch (this.actIndex) {
      case 0: return '森林祝福: 每15秒全体治疗5%';
      case 1: return '火焰大地: 静止单位受灼烧伤害';
      case 2: return '深渊黑暗: 周期性降低攻击范围';
      default: return '';
    }
  }
}

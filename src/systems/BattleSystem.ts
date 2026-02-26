import { Unit } from '../entities/Unit';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { TargetingSystem } from './TargetingSystem';
import { MovementSystem } from './MovementSystem';
import { DamageSystem } from './DamageSystem';
import { SkillSystem } from './SkillSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { SeededRNG } from '../utils/rng';

export type BattleState = 'fighting' | 'victory' | 'defeat';

export class BattleSystem {
  heroes: Hero[] = [];
  enemies: Enemy[] = [];
  damageSystem: DamageSystem;
  skillSystem: SkillSystem;
  battleState: BattleState = 'fighting';
  speedMultiplier: number = 1;
  private rng: SeededRNG;

  constructor(rng: SeededRNG) {
    this.rng = rng;
    this.damageSystem = new DamageSystem(rng);
    this.skillSystem = new SkillSystem(rng, this.damageSystem);
  }

  setUnits(heroes: Hero[], enemies: Enemy[]): void {
    this.heroes = heroes;
    this.enemies = enemies;
    this.battleState = 'fighting';

    // Initialize skills
    for (const hero of heroes) {
      this.skillSystem.initializeSkills(hero, hero.heroData.skills);
    }
    for (const enemy of enemies) {
      this.skillSystem.initializeSkills(enemy, enemy.enemyData.skills);
    }
  }

  /**
   * Main battle update loop. Called every frame.
   */
  update(delta: number): void {
    if (this.battleState !== 'fighting') return;

    const adjustedDelta = delta * this.speedMultiplier;
    const allUnits: Unit[] = [...this.heroes, ...this.enemies];

    for (const unit of allUnits) {
      if (!unit.isAlive) continue;

      // 1. Tick status effects
      StatusEffectSystem.tick(unit, adjustedDelta);
      if (!unit.isAlive) continue;

      // 2. Tick skill cooldowns
      this.skillSystem.tickCooldowns(unit, adjustedDelta);

      // 3. Skip if stunned
      if (unit.isStunned()) continue;

      // 4. Select target
      const isHeroUnit = unit.isHero;
      const allies = isHeroUnit ? this.heroes as Unit[] : this.enemies as Unit[];
      const enemies = isHeroUnit ? this.enemies as Unit[] : this.heroes as Unit[];
      unit.target = TargetingSystem.selectTarget(unit, enemies, allies);

      if (!unit.target) continue;

      // 5. In range → attack or use skill
      if (unit.isInRange(unit.target)) {
        // Try skill first
        const readySkill = this.skillSystem.findReadySkill(
          unit, allies, enemies,
        );

        if (readySkill) {
          this.skillSystem.executeSkill(unit, readySkill, allies, enemies);
        } else {
          // Normal attack
          this.tickAttack(unit, adjustedDelta, enemies);
        }
      } else {
        // 6. Move toward target
        MovementSystem.moveTowardTarget(unit, adjustedDelta);
      }
    }

    // Separate overlapping units
    MovementSystem.separateUnits(allUnits);

    // Check win/lose
    this.checkBattleEnd();
  }

  private tickAttack(unit: Unit, delta: number, enemies: Unit[]): void {
    unit.attackCooldownTimer -= delta;
    if (unit.attackCooldownTimer <= 0) {
      unit.attackCooldownTimer = 1000 / unit.getEffectiveStats().attackSpeed;

      if (unit.target && unit.target.isAlive) {
        // Healer auto-attacks heal allies
        if (unit.role === 'healer' && unit.target.isHero === unit.isHero) {
          const stats = unit.getEffectiveStats();
          this.damageSystem.applyHeal(unit, unit.target, stats.magicPower * 0.3);
        } else {
          const damageType = unit.getEffectiveStats().magicPower > unit.getEffectiveStats().attack
            ? 'magical' as const
            : 'physical' as const;
          this.damageSystem.applyDamage(unit, unit.target, damageType);
        }
      }
    }
  }

  private checkBattleEnd(): void {
    const heroesAlive = this.heroes.some(h => h.isAlive);
    const enemiesAlive = this.enemies.some(e => e.isAlive);

    if (!enemiesAlive) {
      this.battleState = 'victory';
    } else if (!heroesAlive) {
      this.battleState = 'defeat';
    }
  }

  getTotalGoldReward(): number {
    return this.enemies.reduce((sum, e) => sum + e.goldReward, 0);
  }

  getTotalExpReward(): number {
    return this.enemies.reduce((sum, e) => sum + e.expReward, 0);
  }
}

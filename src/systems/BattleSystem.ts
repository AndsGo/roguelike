import { Unit } from '../entities/Unit';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { TargetingSystem } from './TargetingSystem';
import { MovementSystem } from './MovementSystem';
import { DamageSystem } from './DamageSystem';
import { SkillSystem } from './SkillSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { ComboSystem } from './ComboSystem';
import { SynergySystem } from './SynergySystem';
import { SkillQueueSystem } from './SkillQueueSystem';
import { ActModifierSystem } from './ActModifierSystem';
import { EventBus } from './EventBus';
import { SeededRNG } from '../utils/rng';
import { HeroData, HeroState, BattleResult } from '../types';

/**
 * Public battle state exposed to scenes (backward-compatible).
 */
export type BattleState = 'fighting' | 'victory' | 'defeat';

/**
 * Internal phases within the 'fighting' state.
 */
type InternalPhase = 'preparing' | 'combat' | 'settling';

const PREPARE_DURATION = 500; // ms
const SETTLE_DURATION = 500;  // ms

export class BattleSystem {
  heroes: Hero[] = [];
  enemies: Enemy[] = [];
  damageSystem: DamageSystem;
  skillSystem: SkillSystem;
  comboSystem: ComboSystem;
  synergySystem: SynergySystem;
  skillQueue: SkillQueueSystem;
  actModifier: ActModifierSystem | null = null;
  battleState: BattleState = 'fighting';
  speedMultiplier: number = 1;
  isPaused: boolean = false;
  private rng: SeededRNG;
  private internalPhase: InternalPhase = 'preparing';
  private phaseTimer: number = 0;
  private battleResult: BattleResult | null = null;

  constructor(rng: SeededRNG) {
    this.rng = rng;
    this.comboSystem = new ComboSystem();
    this.synergySystem = new SynergySystem();
    this.damageSystem = new DamageSystem(rng);
    this.damageSystem.comboSystem = this.comboSystem;
    this.skillSystem = new SkillSystem(rng, this.damageSystem);
    this.skillQueue = new SkillQueueSystem();
  }

  /**
   * Set up units for battle. Optionally pass hero data/state for synergy calculation.
   */
  setUnits(
    heroes: Hero[],
    enemies: Enemy[],
    heroStates?: HeroState[],
    heroDataMap?: Map<string, HeroData>,
  ): void {
    this.heroes = heroes;
    this.enemies = enemies;
    this.battleState = 'fighting';
    this.internalPhase = 'preparing';
    this.phaseTimer = PREPARE_DURATION;
    this.battleResult = null;

    // Reset threat tracking for new battle
    TargetingSystem.resetThreat();
    this.comboSystem.reset();

    // Initialize skills (with advancement for heroes based on level)
    for (const hero of heroes) {
      this.skillSystem.initializeSkills(hero, hero.heroData.skills, hero.level);
    }
    for (const enemy of enemies) {
      this.skillSystem.initializeSkills(enemy, enemy.enemyData.skills);
    }

    // Calculate and apply synergy bonuses
    if (heroStates && heroDataMap) {
      this.applySynergies(heroStates, heroDataMap);
    }

    // Apply act modifiers if set
    if (this.actModifier) {
      this.actModifier.applyBattleStart(heroes, enemies);
    }

    // Emit battle:start event
    EventBus.getInstance().emit('battle:start', {
      heroCount: heroes.length,
      enemyCount: enemies.length,
    });
  }

  /**
   * Calculate synergy bonuses and apply them to hero units.
   */
  private applySynergies(
    heroStates: HeroState[],
    heroDataMap: Map<string, HeroData>,
  ): void {
    const cache = this.synergySystem.calculateActiveSynergies(heroStates, heroDataMap);

    // Apply stat bonuses to each hero unit
    for (const hero of this.heroes) {
      const bonuses = cache.heroBonuses.get(hero.unitId);
      if (bonuses) {
        hero.synergyBonuses = bonuses;
      }
    }

    // Add unlocked skills to all heroes
    for (const skill of cache.unlockedSkills) {
      for (const hero of this.heroes) {
        hero.addSkill(skill);
      }
    }
  }

  /**
   * Main battle update loop. Called every frame.
   */
  update(delta: number): void {
    if (this.battleState !== 'fighting' || this.isPaused) return;

    const adjustedDelta = delta * this.speedMultiplier;

    switch (this.internalPhase) {
      case 'preparing':
        this.phaseTimer -= adjustedDelta;
        if (this.phaseTimer <= 0) {
          this.internalPhase = 'combat';
        }
        return;

      case 'combat':
        this.updateCombat(adjustedDelta);
        return;

      case 'settling':
        this.phaseTimer -= adjustedDelta;
        if (this.phaseTimer <= 0) {
          // Transition to final public state
          if (this.battleResult?.victory) {
            this.battleState = 'victory';
          } else {
            this.battleState = 'defeat';
          }
        }
        return;
    }
  }

  /**
   * Core combat update loop.
   */
  private updateCombat(adjustedDelta: number): void {
    // Reset per-frame distance cache
    TargetingSystem.beginFrame(adjustedDelta);

    // Update combo timers
    this.comboSystem.update(adjustedDelta);

    // Process auto-fired skills from queue
    const autoFired = this.skillQueue.update(adjustedDelta);
    for (const entry of autoFired) {
      this.executeQueuedSkill(entry.unitId, entry.skillId);
    }

    const allUnits: Unit[] = [...this.heroes, ...this.enemies];

    for (const unit of allUnits) {
      if (!unit.isAlive) continue;

      // 1. Tick status effects
      StatusEffectSystem.tick(unit, adjustedDelta);
      if (!unit.isAlive) continue;

      // 2. Tick skill cooldowns
      this.skillSystem.tickCooldowns(unit, adjustedDelta);

      // 3. Skip if stunned (emit interrupt if a skill was ready)
      if (unit.isStunned()) {
        for (const skill of unit.skills) {
          if ((unit.skillCooldowns.get(skill.id) ?? 0) <= 0) {
            EventBus.getInstance().emit('skill:interrupt', {
              unitId: unit.unitId,
              skillId: skill.id,
              reason: 'stun',
            });
            break;
          }
        }
        continue;
      }

      // 4. Select target
      const isHeroUnit = unit.isHero;
      const allies = isHeroUnit ? this.heroes as Unit[] : this.enemies as Unit[];
      const enemies = isHeroUnit ? this.enemies as Unit[] : this.heroes as Unit[];
      unit.target = TargetingSystem.selectTarget(unit, enemies, allies);

      if (!unit.target) continue;

      // 5. In range -> attack or use skill
      if (unit.isInRange(unit.target)) {
        // Try skill first
        const readySkill = this.skillSystem.findReadySkill(
          unit, allies, enemies,
        );

        if (readySkill) {
          // Hero skills go through queue (semi_auto/manual), enemies fire directly
          if (this.skillQueue.shouldQueueSkill(unit, readySkill)) {
            // Skill was queued — don't execute yet
          } else {
            this.skillSystem.executeSkill(unit, readySkill, allies, enemies);
          }
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

    // Tick act modifiers
    if (this.actModifier) {
      this.actModifier.tick(adjustedDelta, this.heroes, this.enemies);
    }

    // Check win/lose
    this.checkBattleEnd();
  }

  /**
   * Execute a skill from the queue by unitId + skillId lookup.
   * Optionally override target by temporarily swapping unit.target.
   */
  executeQueuedSkill(unitId: string, skillId: string, targetId?: string): void {
    const hero = this.heroes.find(h => h.unitId === unitId && h.isAlive);
    if (!hero) return;

    const skill = hero.skills.find(s => s.id === skillId);
    if (!skill) return;

    const allies = this.heroes as Unit[];
    const enemies = this.enemies as Unit[];

    // Override target if specified
    if (targetId) {
      const allUnits = [...allies, ...enemies];
      const overrideTarget = allUnits.find(u => u.unitId === targetId && u.isAlive);
      if (overrideTarget) {
        const savedTarget = hero.target;
        hero.target = overrideTarget;
        this.skillSystem.executeSkill(hero, skill, allies, enemies);
        hero.target = savedTarget;
        return;
      }
    }

    this.skillSystem.executeSkill(hero, skill, allies, enemies);
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
          const result = this.damageSystem.applyDamage(unit, unit.target, damageType);

          // Emit unit:attack for animation system
          EventBus.getInstance().emit('unit:attack', {
            sourceId: unit.unitId,
            targetId: unit.target.unitId,
            damage: result.finalDamage,
          });

          // Register threat from normal attacks
          TargetingSystem.registerThreat(
            unit.target.unitId,
            unit.unitId,
            unit.getEffectiveStats().attack,
          );
        }
      }
    }
  }

  private checkBattleEnd(): void {
    const heroesAlive = this.heroes.some(h => h.isAlive);
    const enemiesAlive = this.enemies.some(e => e.isAlive);

    if (!enemiesAlive || !heroesAlive) {
      const victory = !enemiesAlive;

      this.battleResult = {
        victory,
        goldEarned: victory ? this.getTotalGoldReward() : 0,
        expEarned: victory ? this.getTotalExpReward() : 0,
        survivors: this.heroes.filter(h => h.isAlive).map(h => h.unitId),
      };

      // Emit battle:end event
      EventBus.getInstance().emit('battle:end', {
        victory,
        result: this.battleResult,
      });

      // Transition to settling phase (still publicly 'fighting')
      this.internalPhase = 'settling';
      this.phaseTimer = SETTLE_DURATION;
    }
  }

  /**
   * Get the battle result (available after battle ends).
   */
  getBattleResult(): BattleResult | null {
    return this.battleResult;
  }

  getTotalGoldReward(): number {
    return this.enemies.reduce((sum, e) => sum + e.goldReward, 0);
  }

  getTotalExpReward(): number {
    return this.enemies.reduce((sum, e) => sum + e.expReward, 0);
  }
}

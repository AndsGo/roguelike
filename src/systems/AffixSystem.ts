import { AffixData, AffixId, StatusEffect, GameEventType } from '../types';
import { EventBus } from './EventBus';
import { nextEffectId } from '../utils/id-generator';
import affixesData from '../data/affixes.json';

/**
 * AffixSystem — singleton that manages combat affixes applied to enemy encounters.
 *
 * Affix categories:
 * - **Buff** (berserk, swift, fortified): Inject StatusEffect on all enemies at activate()
 * - **Shield** (shielded): Set enemy.shieldHp at activate()
 * - **Reactive** (splitting, reflective, deathburst): Register EventBus listeners
 * - **Periodic** (regeneration, vengeful): Timer/threshold checks in tick()
 * - **Formula query** (elemental): getAffixElementBonus() returns bonus value
 */
export class AffixSystem {
  private static instance: AffixSystem;

  private activeAffixes: Map<string, AffixData> = new Map();
  private enemies: any[] = [];
  private heroes: any[] = [];
  private listeners: Array<{ event: GameEventType; handler: (...args: any[]) => void }> = [];
  private regenTimer: number = 0;
  /** Track which enemies already got the vengeful buff (by unitId) */
  private vengefulApplied: Set<string> = new Set();
  /** Track which berserker-AI enemies already got the rage buff */
  private berserkerRageApplied: Set<string> = new Set();
  /** Throttle map: key → last trigger timestamp (ms) */
  private throttleMap: Map<string, number> = new Map();
  /** Monotonic elapsed time in ms for throttle tracking */
  private elapsedMs: number = 0;

  private constructor() {}

  static getInstance(): AffixSystem {
    if (!AffixSystem.instance) AffixSystem.instance = new AffixSystem();
    return AffixSystem.instance;
  }

  /**
   * Activate affixes for the current battle.
   * Applies buff/shield affixes immediately, registers reactive listeners.
   */
  activate(affixIds: AffixId[], enemies: any[], heroes: any[]): void {
    this.activeAffixes.clear();
    this.enemies = enemies;
    this.heroes = heroes;
    this.regenTimer = 0;
    this.vengefulApplied.clear();
    this.berserkerRageApplied.clear();
    this.throttleMap.clear();
    this.elapsedMs = 0;

    // Load affix definitions
    for (const id of affixIds) {
      const def = (affixesData as unknown as AffixData[]).find(a => a.id === id);
      if (def) {
        this.activeAffixes.set(id, def);
      }
    }

    // Apply immediate effects
    this.applyBuffAffixes();
    this.applyShieldAffix();

    // Register reactive listeners
    this.registerListeners();
  }

  /**
   * Called each frame from BattleSystem.update().
   * @param delta Time elapsed in seconds
   */
  tick(delta: number): void {
    this.elapsedMs += delta * 1000;

    // Regeneration: heal enemies 2% maxHp every interval
    if (this.activeAffixes.has('regeneration')) {
      const affix = this.activeAffixes.get('regeneration')!;
      const interval = affix.params.interval ?? 1.0;
      this.regenTimer += delta;
      while (this.regenTimer >= interval) {
        this.regenTimer -= interval;
        const healPercent = affix.params.healPercent ?? 0.02;
        for (const enemy of this.enemies) {
          if (!enemy.isAlive) continue;
          const healAmount = Math.round(enemy.currentStats.maxHp * healPercent);
          enemy.heal(healAmount);
        }
      }
    }

    // Vengeful: +35% attack when below 40% HP (one-time per enemy)
    if (this.activeAffixes.has('vengeful')) {
      const affix = this.activeAffixes.get('vengeful')!;
      const threshold = affix.params.hpThreshold ?? 0.4;
      const bonus = affix.params.attackBonus ?? 0.35;
      for (const enemy of this.enemies) {
        if (!enemy.isAlive) continue;
        if (this.vengefulApplied.has(enemy.unitId)) continue;
        const hpRatio = enemy.currentHp / enemy.currentStats.maxHp;
        if (hpRatio <= threshold) {
          this.vengefulApplied.add(enemy.unitId);
          const bonusValue = Math.round(enemy.currentStats.attack * bonus);
          enemy.statusEffects.push({
            id: 'affix_vengeful',
            type: 'buff',
            name: 'vengeful',
            duration: 9999,
            value: bonusValue,
            stat: 'attack',
          } as StatusEffect);
        }
      }
    }

    // Berserker AI: +50% attackSpeed when below 50% HP (one-time per enemy)
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      if (enemy.aiType !== 'berserker') continue;
      if (this.berserkerRageApplied.has(enemy.unitId)) continue;
      const hpRatio = enemy.currentHp / enemy.currentStats.maxHp;
      if (hpRatio <= 0.5) {
        this.berserkerRageApplied.add(enemy.unitId);
        const bonusValue = Math.round(enemy.currentStats.attackSpeed * 0.5 * 100) / 100;
        enemy.statusEffects.push({
          id: nextEffectId('affix_berserker_rage'),
          type: 'buff',
          name: 'berserker_rage',
          duration: 9999,
          value: bonusValue,
          stat: 'attackSpeed',
        } as StatusEffect);
      }
    }
  }

  /** Cleanup after battle — remove all listeners and state */
  deactivate(): void {
    this.unregisterListeners();
    this.activeAffixes.clear();
    this.enemies = [];
    this.heroes = [];
    this.regenTimer = 0;
    this.vengefulApplied.clear();
    this.berserkerRageApplied.clear();
    this.throttleMap.clear();
    this.elapsedMs = 0;
  }

  /** Check if a specific affix is currently active */
  hasAffix(id: string): boolean {
    return this.activeAffixes.has(id);
  }

  /** Get element damage bonus from the elemental affix */
  getAffixElementBonus(): number {
    const affix = this.activeAffixes.get('elemental');
    if (!affix) return 0;
    return affix.params.elementBonus ?? 0.25;
  }

  /** Get all currently active affix definitions */
  getActiveAffixes(): AffixData[] {
    return Array.from(this.activeAffixes.values());
  }

  // ========== Private: Buff application ==========

  /** Apply berserk/swift/fortified buffs to all enemies */
  private applyBuffAffixes(): void {
    if (this.activeAffixes.has('berserk')) {
      const affix = this.activeAffixes.get('berserk')!;
      const ratio = affix.params.attackBonus ?? 0.2;
      this.injectBuff('affix_berserk', 'attack', ratio);
    }

    if (this.activeAffixes.has('swift')) {
      const affix = this.activeAffixes.get('swift')!;
      const ratio = affix.params.speedBonus ?? 0.3;
      this.injectBuff('affix_swift', 'attackSpeed', ratio);
    }

    if (this.activeAffixes.has('fortified')) {
      const affix = this.activeAffixes.get('fortified')!;
      const ratio = affix.params.defenseBonus ?? 0.25;
      this.injectBuff('affix_fortified', 'defense', ratio);
    }
  }

  /** Inject a percentage-based buff StatusEffect on all enemies */
  private injectBuff(id: string, stat: string, ratio: number): void {
    for (const enemy of this.enemies) {
      const baseStat = enemy.currentStats[stat] ?? 0;
      const bonusValue = Math.round(baseStat * ratio);
      enemy.statusEffects.push({
        id,
        type: 'buff',
        name: id,
        duration: 9999,
        value: bonusValue,
        stat,
      } as StatusEffect);
    }
  }

  /** Apply shielded affix: set shieldHp to 20% of maxHp */
  private applyShieldAffix(): void {
    if (!this.activeAffixes.has('shielded')) return;
    const affix = this.activeAffixes.get('shielded')!;
    const pct = affix.params.shieldPercent ?? 0.2;
    for (const enemy of this.enemies) {
      const shieldVal = Math.round(enemy.currentStats.maxHp * pct);
      if (typeof enemy.addShield === 'function') {
        enemy.addShield(shieldVal, 9999);
      } else if (typeof enemy.setShield === 'function') {
        enemy.setShield(shieldVal, 9999);
      } else {
        // Direct property set as fallback
        enemy.shieldHp = shieldVal;
        enemy.shieldDuration = 9999;
      }
    }
  }

  // ========== Private: Reactive listeners ==========

  private registerListeners(): void {
    const eb = EventBus.getInstance();

    // Splitting: splash damage on hero hit by enemy
    if (this.activeAffixes.has('splitting')) {
      const affix = this.activeAffixes.get('splitting')!;
      const ratio = affix.params.splashRatio ?? 0.4;
      const handler = (data: any) => {
        if (data.isAffixDamage) return;
        if (!this.isEnemySource(data.sourceId)) return;
        if (!this.isHeroTarget(data.targetId)) return;
        if (!this.throttle(`splitting_${data.targetId}`)) return;

        const nearest = this.findNearestHero(data.targetId);
        if (nearest) {
          const splashDmg = Math.round(data.amount * ratio);
          nearest.takeDamage(splashDmg);
          // Emit affix damage event (flagged to prevent re-trigger)
          eb.emit('unit:damage', {
            sourceId: data.sourceId,
            targetId: nearest.unitId,
            amount: splashDmg,
            damageType: data.damageType ?? 'physical',
            isCrit: false,
            isAffixDamage: true,
          });
        }
      };
      eb.on('unit:damage', handler);
      this.listeners.push({ event: 'unit:damage', handler });
    }

    // Reflective: reflect 15% damage back to attacker when enemy is hit
    if (this.activeAffixes.has('reflective')) {
      const affix = this.activeAffixes.get('reflective')!;
      const ratio = affix.params.reflectRatio ?? 0.15;
      const handler = (data: any) => {
        if (data.isAffixDamage) return;
        if (!this.isEnemyTarget(data.targetId)) return;
        if (!this.isHeroSource(data.sourceId)) return;
        if (!this.throttle(`reflective_${data.sourceId}`)) return;

        const attacker = this.findHero(data.sourceId);
        if (attacker && attacker.isAlive) {
          const reflectDmg = Math.round(data.amount * ratio);
          attacker.takeDamage(reflectDmg);
          eb.emit('unit:damage', {
            sourceId: data.targetId,
            targetId: data.sourceId,
            amount: reflectDmg,
            damageType: 'physical',
            isCrit: false,
            isAffixDamage: true,
          });
        }
      };
      eb.on('unit:damage', handler);
      this.listeners.push({ event: 'unit:damage', handler });
    }

    // Deathburst: deal 8% maxHp damage to all heroes when enemy dies
    if (this.activeAffixes.has('deathburst')) {
      const affix = this.activeAffixes.get('deathburst')!;
      const pct = affix.params.damagePercent ?? 0.08;
      const handler = (data: any) => {
        const deadEnemy = this.findEnemy(data.targetId);
        if (!deadEnemy) return;

        const burstDmg = Math.round(deadEnemy.currentStats.maxHp * pct);
        for (const hero of this.heroes) {
          if (!hero.isAlive) continue;
          hero.takeDamage(burstDmg);
          eb.emit('unit:damage', {
            sourceId: data.targetId,
            targetId: hero.unitId,
            amount: burstDmg,
            damageType: 'physical',
            isCrit: false,
            isAffixDamage: true,
          });
        }
      };
      eb.on('unit:kill', handler);
      this.listeners.push({ event: 'unit:kill', handler });
    }
  }

  private unregisterListeners(): void {
    const eb = EventBus.getInstance();
    for (const { event, handler } of this.listeners) {
      eb.off(event, handler);
    }
    this.listeners = [];
  }

  // ========== Private: Unit lookup helpers ==========

  private isEnemySource(unitId: string): boolean {
    return this.enemies.some(e => e.unitId === unitId);
  }

  private isEnemyTarget(unitId: string): boolean {
    return this.enemies.some(e => e.unitId === unitId);
  }

  private isHeroSource(unitId: string): boolean {
    return this.heroes.some(h => h.unitId === unitId);
  }

  private isHeroTarget(unitId: string): boolean {
    return this.heroes.some(h => h.unitId === unitId);
  }

  private findEnemy(unitId: string): any | undefined {
    return this.enemies.find(e => e.unitId === unitId);
  }

  private findHero(unitId: string): any | undefined {
    return this.heroes.find(h => h.unitId === unitId);
  }

  /**
   * Find the nearest alive hero to the target hero (by Manhattan distance).
   * Excludes the given hero and dead heroes.
   */
  private findNearestHero(excludeHeroId: string): any | undefined {
    let nearest: any = undefined;
    let minDist = Infinity;
    const target = this.findHero(excludeHeroId);
    if (!target) return undefined;

    for (const hero of this.heroes) {
      if (hero.unitId === excludeHeroId) continue;
      if (!hero.isAlive) continue;
      const dx = Math.abs(hero.x - target.x);
      const dy = Math.abs(hero.y - target.y);
      const dist = dx + dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = hero;
      }
    }
    return nearest;
  }

  /**
   * Throttle check: returns true if the effect can fire, false if throttled.
   * 150ms cooldown per key.
   */
  private throttle(key: string): boolean {
    const last = this.throttleMap.get(key) ?? -Infinity;
    if (this.elapsedMs - last < 150) return false;
    this.throttleMap.set(key, this.elapsedMs);
    return true;
  }
}

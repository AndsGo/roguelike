import { Unit } from '../entities/Unit';
import { ElementType } from '../types';
import { hasElementAdvantage } from '../config/elements';

export type TargetStrategy = 'default' | 'element_priority' | 'lowest_hp' | 'nearest' | 'highest_threat';

/**
 * Threat tracking: units accumulate threat from being attacked.
 */
const threatTable: Map<string, Map<string, number>> = new Map();

// Target staleness cache: skip re-targeting if target is alive + in range
const targetCache: Map<string, { targetId: string; expiry: number }> = new Map();
const TARGET_STALE_MS = 500;

export class TargetingSystem {
  // Frame-level distance cache to avoid redundant sqrt calculations
  private static frameId: number = 0;
  private static distanceCache: Map<string, number> = new Map();
  private static frameTime: number = 0;

  /** Call at the start of each frame to reset the distance cache. */
  static beginFrame(delta?: number): void {
    TargetingSystem.frameId++;
    TargetingSystem.distanceCache.clear();
    if (delta !== undefined) {
      TargetingSystem.frameTime += delta;
    }
  }

  /** Cached distance between two units. Symmetric: dist(a,b) == dist(b,a). */
  static cachedDistance(a: Unit, b: Unit): number {
    // Sort IDs so a->b and b->a share the same cache key
    const id1 = a.unitId < b.unitId ? a.unitId : b.unitId;
    const id2 = a.unitId < b.unitId ? b.unitId : a.unitId;
    const key = `${id1}_${id2}`;
    let dist = TargetingSystem.distanceCache.get(key);
    if (dist === undefined) {
      dist = a.distanceTo(b);
      TargetingSystem.distanceCache.set(key, dist);
    }
    return dist;
  }

  /**
   * Register threat from an attacker to a target.
   * The target gains threat toward the attacker.
   */
  static registerThreat(targetId: string, attackerId: string, amount: number): void {
    if (!threatTable.has(targetId)) {
      threatTable.set(targetId, new Map());
    }
    const table = threatTable.get(targetId)!;
    table.set(attackerId, (table.get(attackerId) ?? 0) + amount);
  }

  /**
   * Get total threat a unit has accumulated from being attacked.
   */
  static getThreatLevel(unitId: string): number {
    const table = threatTable.get(unitId);
    if (!table) return 0;
    let total = 0;
    for (const val of table.values()) {
      total += val;
    }
    return total;
  }

  /**
   * Reset all threat tracking (e.g. at battle start/end).
   */
  static resetThreat(): void {
    threatTable.clear();
    targetCache.clear();
  }

  /**
   * Select a target for the given unit from the pool of potential targets.
   * AI logic varies by role. Supports optional strategy override.
   */
  static selectTarget(
    unit: Unit,
    enemies: Unit[],
    allies: Unit[],
    strategy?: TargetStrategy,
  ): Unit | null {
    // Check taunt first (always takes precedence)
    const tauntSource = unit.getTauntSource();
    if (tauntSource && tauntSource.isAlive) {
      return tauntSource;
    }

    // Target staleness: reuse cached target if alive and in range
    const cached = targetCache.get(unit.unitId);
    if (cached && TargetingSystem.frameTime < cached.expiry) {
      const cachedTarget = enemies.find(e => e.unitId === cached.targetId && e.isAlive);
      if (cachedTarget && unit.distanceTo(cachedTarget) <= unit.currentStats.attackRange * 1.5) {
        return cachedTarget;
      }
    }

    const livingEnemies = enemies.filter(e => e.isAlive);
    const livingAllies = allies.filter(a => a.isAlive);

    if (unit.role === 'healer') {
      return this.selectHealTarget(unit, livingAllies);
    }

    if (livingEnemies.length === 0) return null;

    // Use explicit strategy if provided
    if (strategy) {
      return this.selectByStrategy(unit, livingEnemies, strategy);
    }

    // Default role-based targeting with element priority scoring
    let result: Unit | null;
    switch (unit.role) {
      case 'tank':
      case 'support':
        result = this.selectWithElementWeight(unit, livingEnemies, 'nearest');
        break;
      case 'melee_dps':
        result = this.selectWithElementWeight(unit, livingEnemies, 'lowest_hp');
        break;
      case 'ranged_dps':
        result = this.selectWithElementWeight(unit, livingEnemies, 'highest_threat');
        break;
      default:
        result = this.selectWithElementWeight(unit, livingEnemies, 'nearest');
        break;
    }

    // Cache the selected target
    if (result) {
      targetCache.set(unit.unitId, {
        targetId: result.unitId,
        expiry: TargetingSystem.frameTime + TARGET_STALE_MS,
      });
    }
    return result;
  }

  /**
   * Select a target using a specific strategy.
   */
  private static selectByStrategy(
    unit: Unit,
    targets: Unit[],
    strategy: TargetStrategy,
  ): Unit | null {
    switch (strategy) {
      case 'element_priority':
        return this.selectElementAdvantage(unit, targets);
      case 'lowest_hp':
        return this.selectLowestHp(targets);
      case 'nearest':
        return this.selectNearest(unit, targets);
      case 'highest_threat':
        return this.selectHighestThreat(targets);
      default:
        return this.selectWithElementWeight(unit, targets, 'nearest');
    }
  }

  /**
   * Combined single-pass selection: computes base score + element + threat in one loop.
   * First pass collects raw values and maxima, second pass normalizes and selects best.
   */
  private static selectWithElementWeight(
    unit: Unit,
    targets: Unit[],
    baseStrategy: 'nearest' | 'lowest_hp' | 'highest_threat',
  ): Unit | null {
    if (targets.length === 0) return null;
    if (targets.length === 1) return targets[0];

    const n = targets.length;
    const rawBase = new Float64Array(n);
    const rawThreat = new Float64Array(n);
    const hasAdv = new Uint8Array(n);
    let maxBase = 0;
    let maxThreat = 0;

    const unitThreatTable = threatTable.get(unit.unitId);

    // Single pass: collect raw values for base strategy, element advantage, and threat
    for (let i = 0; i < n; i++) {
      const t = targets[i];

      // Base strategy raw value
      switch (baseStrategy) {
        case 'nearest':
          rawBase[i] = TargetingSystem.cachedDistance(unit, t);
          break;
        case 'lowest_hp':
          rawBase[i] = t.currentHp;
          break;
        case 'highest_threat':
          rawBase[i] = this.calculateThreat(t);
          break;
      }
      if (rawBase[i] > maxBase) maxBase = rawBase[i];

      // Element advantage
      if (unit.element && t.element && hasElementAdvantage(unit.element, t.element)) {
        hasAdv[i] = 1;
      }

      // Accumulated threat from being attacked by this target
      if (unitThreatTable) {
        rawThreat[i] = unitThreatTable.get(t.unitId) ?? 0;
        if (rawThreat[i] > maxThreat) maxThreat = rawThreat[i];
      }
    }

    // Second pass: normalize and score, track best
    const invMaxBase = maxBase > 0 ? 1 / maxBase : 0;
    const invMaxThreat = maxThreat > 0 ? 1 / maxThreat : 0;
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < n; i++) {
      // Normalized base score (for nearest/lowest_hp: invert so lower raw = higher score)
      let score: number;
      if (baseStrategy === 'highest_threat') {
        score = rawBase[i] * invMaxBase;
      } else {
        score = 1 - rawBase[i] * invMaxBase;
      }

      // Element advantage bonus
      if (hasAdv[i]) score += 0.3;

      // Aggro weight
      score += rawThreat[i] * invMaxThreat * 0.15;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return targets[bestIdx];
  }

  /**
   * Pure element advantage targeting: picks the first enemy the attacker has advantage over.
   * Falls back to nearest if none found.
   */
  private static selectElementAdvantage(unit: Unit, targets: Unit[]): Unit | null {
    if (!unit.element) return this.selectNearest(unit, targets);

    const advantaged = targets.filter(
      t => t.element && hasElementAdvantage(unit.element!, t.element),
    );
    if (advantaged.length > 0) {
      return this.selectLowestHp(advantaged);
    }
    return this.selectNearest(unit, targets);
  }

  private static selectNearest(unit: Unit, targets: Unit[]): Unit | null {
    if (targets.length === 0) return null;
    let nearest = targets[0];
    let minDist = TargetingSystem.cachedDistance(unit, targets[0]);
    for (let i = 1; i < targets.length; i++) {
      const dist = TargetingSystem.cachedDistance(unit, targets[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = targets[i];
      }
    }
    return nearest;
  }

  private static selectLowestHp(targets: Unit[]): Unit | null {
    if (targets.length === 0) return null;
    let lowest = targets[0];
    for (let i = 1; i < targets.length; i++) {
      if (targets[i].currentHp < lowest.currentHp) {
        lowest = targets[i];
      }
    }
    return lowest;
  }

  private static selectHighestThreat(targets: Unit[]): Unit | null {
    if (targets.length === 0) return null;
    let highest = targets[0];
    let maxThreat = this.calculateThreat(targets[0]);
    for (let i = 1; i < targets.length; i++) {
      const threat = this.calculateThreat(targets[i]);
      if (threat > maxThreat) {
        maxThreat = threat;
        highest = targets[i];
      }
    }
    return highest;
  }

  private static calculateThreat(unit: Unit): number {
    const stats = unit.getEffectiveStats();
    return stats.attack * stats.attackSpeed + stats.magicPower * 0.8;
  }

  private static selectHealTarget(healer: Unit, allies: Unit[]): Unit | null {
    if (allies.length === 0) return null;
    let target = allies[0];
    let lowestPercent = target.currentHp / target.currentStats.maxHp;
    for (let i = 1; i < allies.length; i++) {
      const percent = allies[i].currentHp / allies[i].currentStats.maxHp;
      if (percent < lowestPercent) {
        lowestPercent = percent;
        target = allies[i];
      }
    }
    // Only heal if someone is below 90% HP
    return lowestPercent < 0.9 ? target : null;
  }
}

import { Unit } from '../entities/Unit';
import { ElementType } from '../types';
import { hasElementAdvantage } from '../config/elements';

export type TargetStrategy = 'default' | 'element_priority' | 'lowest_hp' | 'nearest' | 'highest_threat';

/**
 * Threat tracking: units accumulate threat from being attacked.
 */
const threatTable: Map<string, Map<string, number>> = new Map();

export class TargetingSystem {
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
    switch (unit.role) {
      case 'tank':
      case 'support':
        return this.selectWithElementWeight(unit, livingEnemies, 'nearest');
      case 'melee_dps':
        return this.selectWithElementWeight(unit, livingEnemies, 'lowest_hp');
      case 'ranged_dps':
        return this.selectWithElementWeight(unit, livingEnemies, 'highest_threat');
      default:
        return this.selectWithElementWeight(unit, livingEnemies, 'nearest');
    }
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
   * Combined selection: uses base strategy scores + element advantage weight (+30%).
   * This blends role-based targeting with element advantage consideration.
   */
  private static selectWithElementWeight(
    unit: Unit,
    targets: Unit[],
    baseStrategy: 'nearest' | 'lowest_hp' | 'highest_threat',
  ): Unit | null {
    if (targets.length === 0) return null;
    if (targets.length === 1) return targets[0];

    const scores: number[] = targets.map(() => 0);

    // Base strategy scoring (normalized to 0-1 range)
    switch (baseStrategy) {
      case 'nearest': {
        const distances = targets.map(t => unit.distanceTo(t));
        const maxDist = Math.max(...distances, 1);
        for (let i = 0; i < targets.length; i++) {
          scores[i] = 1 - (distances[i] / maxDist); // closer = higher score
        }
        break;
      }
      case 'lowest_hp': {
        const hps = targets.map(t => t.currentHp);
        const maxHp = Math.max(...hps, 1);
        for (let i = 0; i < targets.length; i++) {
          scores[i] = 1 - (hps[i] / maxHp); // lower HP = higher score
        }
        break;
      }
      case 'highest_threat': {
        const threats = targets.map(t => this.calculateThreat(t));
        const maxThreat = Math.max(...threats, 1);
        for (let i = 0; i < targets.length; i++) {
          scores[i] = threats[i] / maxThreat; // higher threat = higher score
        }
        break;
      }
    }

    // Element advantage bonus: +30% weight if attacker has element advantage
    if (unit.element) {
      for (let i = 0; i < targets.length; i++) {
        if (targets[i].element && hasElementAdvantage(unit.element, targets[i].element!)) {
          scores[i] += 0.3;
        }
      }
    }

    // Threat level from being attacked: units that attack us more get slight priority
    const unitThreatTable = threatTable.get(unit.unitId);
    if (unitThreatTable) {
      const maxAccThreat = Math.max(...targets.map(t => unitThreatTable.get(t.unitId) ?? 0), 1);
      for (let i = 0; i < targets.length; i++) {
        const accThreat = unitThreatTable.get(targets[i].unitId) ?? 0;
        scores[i] += (accThreat / maxAccThreat) * 0.15; // slight aggro weight
      }
    }

    // Select highest scoring target
    let bestIdx = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIdx]) {
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
    let minDist = unit.distanceTo(targets[0]);
    for (let i = 1; i < targets.length; i++) {
      const dist = unit.distanceTo(targets[i]);
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

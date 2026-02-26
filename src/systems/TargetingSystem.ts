import { Unit } from '../entities/Unit';

export class TargetingSystem {
  /**
   * Select a target for the given unit from the pool of potential targets.
   * AI logic varies by role.
   */
  static selectTarget(unit: Unit, enemies: Unit[], allies: Unit[]): Unit | null {
    // Check taunt first
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

    switch (unit.role) {
      case 'tank':
      case 'support':
        return this.selectNearest(unit, livingEnemies);
      case 'melee_dps':
        return this.selectLowestHp(livingEnemies);
      case 'ranged_dps':
        return this.selectHighestThreat(livingEnemies);
      default:
        return this.selectNearest(unit, livingEnemies);
    }
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
    // Threat = attack * attackSpeed (DPS potential)
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
    // Find ally with lowest HP percentage
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

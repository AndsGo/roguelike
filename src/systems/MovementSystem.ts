import { Unit } from '../entities/Unit';
import { BATTLE_GROUND_Y, GAME_HEIGHT } from '../constants';

export class MovementSystem {
  /**
   * Move unit toward its target. Y-axis movement is dampened.
   */
  static moveTowardTarget(unit: Unit, delta: number): void {
    if (!unit.target || !unit.target.isAlive || unit.isStunned()) return;

    const stats = unit.getEffectiveStats();

    // If already in range, don't move
    if (unit.isInRange(unit.target)) return;

    const speed = stats.speed * (delta / 1000);
    const dx = unit.target.x - unit.x;
    const dy = unit.target.y - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) return;

    const nx = dx / dist;
    const ny = dy / dist;

    unit.x += nx * speed;
    unit.y += ny * speed * 0.3; // Y dampening for side-scrolling feel

    // Clamp Y position to battle area
    unit.y = Phaser.Math.Clamp(unit.y, BATTLE_GROUND_Y - 80, GAME_HEIGHT - 40);
  }

  /**
   * Separate overlapping units to prevent stacking.
   */
  static separateUnits(units: Unit[], minDistance: number = 20): void {
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        if (!units[i].isAlive || !units[j].isAlive) continue;
        const dx = units[j].x - units[i].x;
        const dy = units[j].y - units[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance && dist > 0) {
          const pushX = (dx / dist) * (minDistance - dist) * 0.5;
          const pushY = (dy / dist) * (minDistance - dist) * 0.5;
          units[i].x -= pushX;
          units[i].y -= pushY;
          units[j].x += pushX;
          units[j].y += pushY;
        }
      }
    }
  }
}

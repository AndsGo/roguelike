import { EventBus } from './EventBus';

interface ComboState {
  targetId: string;
  count: number;
  timer: number; // seconds remaining before combo breaks
}

const COMBO_WINDOW = 2.0; // seconds
const COMBO_BONUS_PER_5 = 0.10; // +10% damage per 5 hits
const COMBO_MILESTONE = 10; // trigger event at this count

/**
 * Tracks combo (consecutive hit) counts per attacker.
 * Hits on the same target within the combo window build the combo counter.
 * Switching targets or letting the timer expire breaks the combo.
 */
export class ComboSystem {
  private combos: Map<string, ComboState> = new Map();

  /**
   * Register a hit from an attacker on a target.
   * Builds combo if same target, resets if different target.
   */
  registerHit(attackerId: string, targetId: string): void {
    const existing = this.combos.get(attackerId);

    if (existing && existing.targetId === targetId) {
      // Continue combo on same target
      existing.count++;
      existing.timer = COMBO_WINDOW;
    } else {
      // Break old combo if switching targets
      if (existing && existing.count > 0) {
        EventBus.getInstance().emit('combo:break', { unitId: attackerId });
      }
      // Start new combo
      this.combos.set(attackerId, {
        targetId,
        count: 1,
        timer: COMBO_WINDOW,
      });
    }

    const state = this.combos.get(attackerId)!;

    // Milestone event at COMBO_MILESTONE hits
    if (state.count >= COMBO_MILESTONE && state.count % COMBO_MILESTONE === 0) {
      EventBus.getInstance().emit('combo:hit', {
        unitId: attackerId,
        comboCount: state.count,
      });
    }
  }

  /**
   * Get the current combo damage multiplier for an attacker.
   * Every 5 hits grants +10% bonus damage (additive).
   */
  getComboMultiplier(attackerId: string): number {
    const state = this.combos.get(attackerId);
    if (!state) return 1.0;

    const bonusTiers = Math.floor(state.count / 5);
    return 1.0 + bonusTiers * COMBO_BONUS_PER_5;
  }

  /**
   * Get the current combo count for an attacker.
   */
  getComboCount(attackerId: string): number {
    return this.combos.get(attackerId)?.count ?? 0;
  }

  /**
   * Update combo timers. Called every frame with deltaTime in ms.
   * Breaks combos whose timers have expired.
   */
  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const [attackerId, state] of this.combos) {
      state.timer -= dt;
      if (state.timer <= 0) {
        if (state.count > 0) {
          EventBus.getInstance().emit('combo:break', { unitId: attackerId });
        }
        this.combos.delete(attackerId);
      }
    }
  }

  /**
   * Reset all combo tracking (e.g. at battle end).
   */
  reset(): void {
    this.combos.clear();
  }
}

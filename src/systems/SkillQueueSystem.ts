import { SkillData, SkillMode, SkillQueueEntry } from '../types';
import { EventBus } from './EventBus';
import { Unit } from '../entities/Unit';

const AUTO_FIRE_DELAY = 1000; // ms before auto-fire (1s window for manual override)

/**
 * Manages hero skill queuing for semi-automatic combat.
 * Heroes auto-attack and move, but skills queue up for player activation
 * or auto-fire after a delay.
 */
export class SkillQueueSystem {
  private queue: SkillQueueEntry[] = [];
  private mode: SkillMode = 'semi_auto';
  private targetingActive: boolean = false;

  /** Add a ready skill to the queue */
  enqueueSkill(unitId: string, skill: SkillData): void {
    // Don't double-queue
    if (this.queue.some(e => e.unitId === unitId && e.skillId === skill.id)) return;

    const entry: SkillQueueEntry = {
      unitId,
      skillId: skill.id,
      readyTime: Date.now(),
      autoFireDelay: AUTO_FIRE_DELAY,
    };
    this.queue.push(entry);

    EventBus.getInstance().emit('skill:ready', {
      unitId,
      skillId: skill.id,
    });
  }

  /** Manually fire a skill, optionally at a specific target. Returns true if successful. */
  fireSkill(unitId: string, skillId: string, targetId?: string): boolean {
    const idx = this.queue.findIndex(e => e.unitId === unitId && e.skillId === skillId);
    if (idx === -1) return false;
    const entry = this.queue.splice(idx, 1)[0];

    // Emit with optional target override
    EventBus.getInstance().emit('skill:manualFire', {
      unitId: entry.unitId,
      skillId: entry.skillId,
      targetId,
    });
    return true;
  }

  /** Get all currently queued (ready) skills */
  getReadySkills(): SkillQueueEntry[] {
    return [...this.queue];
  }

  /** Remove a specific unit's entries from the queue */
  removeUnit(unitId: string): void {
    this.queue = this.queue.filter(e => e.unitId !== unitId);
  }

  /** Whether targeting overlay is active */
  isTargetingActive(): boolean {
    return this.targetingActive;
  }

  setTargetingActive(active: boolean): void {
    this.targetingActive = active;
  }

  setMode(mode: SkillMode): void {
    this.mode = mode;
  }

  getMode(): SkillMode {
    return this.mode;
  }

  /**
   * Update queue timers. In semi_auto mode, auto-fire skills after delay.
   * Returns list of skill entries that should auto-fire this frame.
   */
  update(delta: number): SkillQueueEntry[] {
    if (this.mode === 'auto') {
      // In auto mode, immediately fire all queued skills
      const toFire = [...this.queue];
      this.queue = [];
      return toFire;
    }

    if (this.mode === 'manual') {
      // In manual mode, never auto-fire
      return [];
    }

    // semi_auto: decrement auto-fire delays, fire when expired
    const toFire: SkillQueueEntry[] = [];
    const remaining: SkillQueueEntry[] = [];

    for (const entry of this.queue) {
      entry.autoFireDelay -= delta;
      if (entry.autoFireDelay <= 0) {
        toFire.push(entry);
      } else {
        remaining.push(entry);
      }
    }

    this.queue = remaining;
    return toFire;
  }

  /** Clear all queued skills */
  reset(): void {
    this.queue = [];
    this.targetingActive = false;
  }

  /**
   * Check if a hero's skill should be queued (called by BattleSystem).
   * Returns true if skill was queued (caller should NOT execute it directly).
   * Returns false if caller should execute normally (auto mode or enemy).
   */
  shouldQueueSkill(unit: Unit, skill: SkillData): boolean {
    if (!unit.isHero) return false;
    if (this.mode === 'auto') return false;
    this.enqueueSkill(unit.unitId, skill);
    return true;
  }
}

import { EventBus } from './EventBus';
import { Unit } from '../entities/Unit';

export interface BossPhase {
  hpPercent: number;
  spawns: string[];
  bossEffect?: {
    type: 'shield' | 'enrage' | 'damage_reduction';
    value: number;
  };
}

export interface BossPhaseConfig {
  bossId: string;
  phases: BossPhase[];
}

/**
 * Monitors boss HP and emits 'boss:phase' events when HP crosses thresholds.
 * Not a singleton — one instance per boss battle.
 */
export class BossPhaseSystem {
  private bossUnit: Unit;
  private config: BossPhaseConfig;
  private firedPhases: Set<number> = new Set();
  private onDamageRef: (data: { targetId: string }) => void;

  constructor(bossUnit: Unit, config: BossPhaseConfig) {
    this.bossUnit = bossUnit;
    this.config = config;

    this.onDamageRef = (data) => {
      if (data.targetId !== this.bossUnit.unitId) return;
      this.checkPhases();
    };

    EventBus.getInstance().on('unit:damage', this.onDamageRef);
  }

  private checkPhases(): void {
    const maxHp = this.bossUnit.baseStats.maxHp;
    const currentHp = this.bossUnit.currentHp;
    const hpRatio = currentHp / maxHp;

    for (let i = 0; i < this.config.phases.length; i++) {
      if (this.firedPhases.has(i)) continue;
      const phase = this.config.phases[i];
      if (hpRatio <= phase.hpPercent) {
        this.firedPhases.add(i);
        this.triggerPhase(phase, i);
      }
    }
  }

  private triggerPhase(phase: BossPhase, index: number): void {
    EventBus.getInstance().emit('boss:phase', {
      bossId: this.config.bossId,
      phaseIndex: index,
      spawns: phase.spawns,
      effect: phase.bossEffect,
    });
  }

  deactivate(): void {
    EventBus.getInstance().off('unit:damage', this.onDamageRef);
  }
}

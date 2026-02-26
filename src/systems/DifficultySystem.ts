import { DifficultyConfig, UnitStats } from '../types';
import { RunManager } from '../managers/RunManager';
import { getDifficultyConfig } from '../config/difficulty';

/** Challenge mode modifier definition */
export interface ChallengeModifier {
  description: string;
  maxTeamSize?: number;
  shopDisabled?: boolean;
  timeLimit?: number;        // seconds
  hpMultiplier?: number;
  damageMultiplier?: number;
  rewardMultiplier: number;
}

/**
 * Difficulty scaling and challenge mode system.
 * Reads the current difficulty from RunManager and provides
 * multiplied stats for enemies and scaled rewards.
 */
export class DifficultySystem {
  /** Predefined challenge modifiers for advanced gameplay */
  static CHALLENGE_MODIFIERS: Record<string, ChallengeModifier> = {
    solo_hero: {
      description: 'Solo hero challenge',
      maxTeamSize: 1,
      rewardMultiplier: 2.0,
    },
    no_shop: {
      description: 'No shop challenge',
      shopDisabled: true,
      rewardMultiplier: 1.5,
    },
    speed_run: {
      description: 'Timed challenge',
      timeLimit: 600,  // 10 minutes
      rewardMultiplier: 1.8,
    },
    glass_cannon: {
      description: 'Glass cannon',
      hpMultiplier: 0.5,
      damageMultiplier: 2.0,
      rewardMultiplier: 1.5,
    },
  };

  /** Get the DifficultyConfig for the current run */
  static getCurrentDifficulty(): DifficultyConfig {
    const diffId = RunManager.getInstance().getDifficulty();
    return getDifficultyConfig(diffId);
  }

  /**
   * Scale base enemy stats by the current difficulty multiplier.
   * Returns a new UnitStats object (does not mutate the input).
   */
  static scaleEnemyStats(baseStats: UnitStats, difficulty: DifficultyConfig): UnitStats {
    const m = difficulty.enemyStatMultiplier;
    return {
      maxHp: Math.round(baseStats.maxHp * m),
      hp: Math.round(baseStats.hp * m),
      attack: Math.round(baseStats.attack * m),
      defense: Math.round(baseStats.defense * m),
      magicPower: Math.round(baseStats.magicPower * m),
      magicResist: Math.round(baseStats.magicResist * m),
      speed: baseStats.speed,              // speed unchanged
      attackSpeed: baseStats.attackSpeed,  // attack speed unchanged
      attackRange: baseStats.attackRange,  // range unchanged
      critChance: baseStats.critChance,
      critDamage: baseStats.critDamage,
    };
  }

  /**
   * Scale battle rewards (gold and exp) by difficulty multipliers.
   */
  static scaleRewards(
    baseGold: number,
    baseExp: number,
    difficulty: DifficultyConfig,
  ): { gold: number; exp: number } {
    return {
      gold: Math.round(baseGold * difficulty.goldMultiplier),
      exp: Math.round(baseExp * difficulty.expMultiplier),
    };
  }

  /**
   * Adaptive difficulty micro-adjustment based on recent performance.
   * Returns a multiplier (0.8 - 1.2) to apply on top of base difficulty.
   * - Win rate above 80% increases difficulty
   * - Win rate below 40% decreases difficulty
   * - Otherwise neutral (1.0)
   */
  static getAdaptiveMultiplier(recentWinRate: number): number {
    if (recentWinRate > 0.8) {
      // Scale up: lerp from 1.0 at 80% to 1.2 at 100%
      return 1.0 + (recentWinRate - 0.8) * 1.0;
    }
    if (recentWinRate < 0.4) {
      // Scale down: lerp from 1.0 at 40% to 0.8 at 0%
      return 1.0 - (0.4 - recentWinRate) * 0.5;
    }
    return 1.0;
  }
}

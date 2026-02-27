import { MetaProgressionData } from '../types';
import { EventBus } from '../systems/EventBus';
import { MetaManager } from './MetaManager';
import { RunStats, StatsManager } from './StatsManager';
import achievementsData from '../data/achievements.json';

/** JSON schema for achievement definitions */
interface AchievementJson {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward?: { type: 'meta_currency' | 'unlock_hero' | 'unlock_relic'; value: string | number };
  conditionType: string;
  conditionParams: { threshold?: number; [key: string]: unknown };
}

/** Runtime achievement definition with resolved condition function */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: RunStats, meta: MetaProgressionData) => boolean;
  reward?: { type: 'meta_currency' | 'unlock_hero' | 'unlock_relic'; value: string | number };
}

/**
 * Singleton achievement system.
 * Loads definitions from achievements.json, resolves conditions via a registry,
 * checks conditions against RunStats and MetaProgressionData,
 * awards rewards, and persists unlocks via MetaManager.
 */
export class AchievementManager {
  private static instance: AchievementManager;

  // All achievement definitions (built from JSON at init time)
  static ACHIEVEMENTS: AchievementDef[] = [];

  private constructor() {}

  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
      AchievementManager.loadFromJson();
    }
    return AchievementManager.instance;
  }

  /** Build ACHIEVEMENTS array from JSON data + condition registry */
  private static loadFromJson(): void {
    AchievementManager.ACHIEVEMENTS = (achievementsData as AchievementJson[]).map(json => ({
      id: json.id,
      name: json.name,
      description: json.description,
      icon: json.icon,
      reward: json.reward,
      condition: AchievementManager.resolveCondition(json.id, json.conditionType, json.conditionParams),
    }));
  }

  /** Map conditionType + params to a runtime condition function */
  private static resolveCondition(
    id: string,
    conditionType: string,
    params: { threshold?: number; [key: string]: unknown },
  ): (stats: RunStats, meta: MetaProgressionData) => boolean {
    const t = params.threshold ?? 0;

    switch (conditionType) {
      case 'meta_victories':
        return (_s, m) => m.totalVictories >= t;
      case 'meta_runs':
        return (_s, m) => m.totalRuns >= t;
      case 'meta_floor':
        return (_s, m) => m.highestFloor >= t;
      case 'stat_combo':
        return (s) => s.maxCombo >= t;
      case 'stat_damage':
        return (s) => s.totalDamage >= t;
      case 'stat_kills':
        return (s) => s.totalKills >= t;
      case 'stat_healing':
        return (s) => s.totalHealing >= t;
      case 'stat_gold_earned':
        return (s) => s.goldEarned >= t;
      case 'stat_gold_spent':
        return (s) => s.goldSpent >= t;
      case 'stat_skills':
        return (s) => s.skillsUsed >= t;
      case 'stat_elite_kills':
        return (s) => s.eliteKills >= t;
      case 'stat_boss_kills':
        return (s) => s.bossKills >= t;
      case 'heroes_count':
        return (_s, m) => m.unlockedHeroes.length >= t;
      case 'relics_count':
        return (_s, m) => m.unlockedRelics.length >= t;
      case 'upgrades_maxed':
        return (_s, m) => m.permanentUpgrades.some(u => u.level >= u.maxLevel);
      case 'custom':
        return AchievementManager.resolveCustomCondition(id);
      default:
        return () => false;
    }
  }

  /** Handle the 4 complex custom conditions by achievement ID */
  private static resolveCustomCondition(
    id: string,
  ): (stats: RunStats, meta: MetaProgressionData) => boolean {
    switch (id) {
      case 'speedrun':
        return (s, m) => m.totalVictories >= 1 && s.nodesCompleted <= 15 && s.nodesCompleted > 0;
      case 'no_death':
        return (s, m) => {
          if (m.totalVictories < 1) return false;
          const heroStats = s.heroStats;
          for (const key of Object.keys(heroStats)) {
            if (heroStats[key].deaths > 0) return false;
          }
          return s.nodesCompleted > 0;
        };
      case 'solo_victory':
        return (s) => {
          const heroIds = Object.keys(s.heroStats);
          return heroIds.length === 1 && s.nodesCompleted >= 15;
        };
      case 'hell_victory':
        // This checks meta victories but should ideally check difficulty;
        // preserved from original logic for backward compatibility
        return (_s, m) => m.totalVictories >= 1;
      default:
        return () => false;
    }
  }

  /** Register EventBus listeners for automatic checking */
  static init(): void {
    AchievementManager.getInstance();
    const bus = EventBus.getInstance();

    // Check achievements on key events
    bus.on('battle:end', () => { AchievementManager.checkAchievements(); });
    bus.on('node:complete', () => { AchievementManager.checkAchievements(); });
    bus.on('run:end', () => { AchievementManager.checkAchievements(); });
  }

  /**
   * Evaluate all achievement conditions against current stats and meta.
   * Returns list of newly unlocked achievement IDs.
   */
  static checkAchievements(): string[] {
    // Ensure achievements are loaded
    if (AchievementManager.ACHIEVEMENTS.length === 0) {
      AchievementManager.getInstance();
    }

    const stats = StatsManager.getRunStats();
    const meta = MetaManager.getMetaData();
    const newlyUnlocked: string[] = [];
    const bus = EventBus.getInstance();

    for (const achievement of AchievementManager.ACHIEVEMENTS) {
      // Skip already unlocked
      if (MetaManager.hasAchievement(achievement.id)) continue;

      try {
        if (achievement.condition(stats, meta)) {
          MetaManager.addAchievement(achievement.id);
          newlyUnlocked.push(achievement.id);

          // Apply reward
          if (achievement.reward) {
            switch (achievement.reward.type) {
              case 'meta_currency':
                MetaManager.addMetaCurrency(achievement.reward.value as number);
                break;
              case 'unlock_hero':
                MetaManager.unlockHero(achievement.reward.value as string);
                break;
              case 'unlock_relic':
                MetaManager.unlockRelic(achievement.reward.value as string);
                break;
            }
          }

          bus.emit('achievement:unlock', { achievementId: achievement.id });
        }
      } catch {
        // Condition evaluation failed; skip this achievement
      }
    }

    return newlyUnlocked;
  }

  // ---- Accessors ----

  static getUnlocked(): string[] {
    return MetaManager.getAchievements();
  }

  static getAll(): AchievementDef[] {
    // Ensure loaded
    if (AchievementManager.ACHIEVEMENTS.length === 0) {
      AchievementManager.getInstance();
    }
    return AchievementManager.ACHIEVEMENTS;
  }

  static getProgress(id: string): { unlocked: boolean; progress?: string } {
    const unlocked = MetaManager.hasAchievement(id);
    const def = AchievementManager.ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return { unlocked: false };

    return {
      unlocked,
      progress: unlocked ? '已完成' : '进行中',
    };
  }
}

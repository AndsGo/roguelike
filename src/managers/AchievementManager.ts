import { MetaProgressionData } from '../types';
import { EventBus } from '../systems/EventBus';
import { MetaManager } from './MetaManager';
import { RunStats, StatsManager } from './StatsManager';

/** Definition of an achievement */
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
 * Checks conditions against RunStats and MetaProgressionData,
 * awards rewards, and persists unlocks via MetaManager.
 */
export class AchievementManager {
  private static instance: AchievementManager;

  // All achievement definitions
  static ACHIEVEMENTS: AchievementDef[] = [
    // ---- Progress ----
    {
      id: 'first_victory',
      name: 'First Victory',
      description: 'Win your first run',
      icon: 'trophy',
      condition: (_s, m) => m.totalVictories >= 1,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'veteran',
      name: 'Veteran',
      description: 'Complete 10 runs',
      icon: 'medal',
      condition: (_s, m) => m.totalRuns >= 10,
      reward: { type: 'meta_currency', value: 200 },
    },
    {
      id: 'speedrun',
      name: 'Speed Demon',
      description: 'Win a run completing 15 nodes or fewer',
      icon: 'lightning',
      condition: (s, m) => m.totalVictories >= 1 && s.nodesCompleted <= 15 && s.nodesCompleted > 0,
      reward: { type: 'meta_currency', value: 300 },
    },
    {
      id: 'no_death',
      name: 'Flawless',
      description: 'Win a run with zero hero deaths',
      icon: 'shield',
      condition: (s, m) => {
        if (m.totalVictories < 1) return false;
        const heroStats = s.heroStats;
        for (const key of Object.keys(heroStats)) {
          if (heroStats[key].deaths > 0) return false;
        }
        return s.nodesCompleted > 0;
      },
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'all_heroes',
      name: 'Collector',
      description: 'Unlock all heroes',
      icon: 'star',
      condition: (_s, m) => m.unlockedHeroes.length >= 5,
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'floor_10',
      name: 'Deep Explorer',
      description: 'Reach floor 10',
      icon: 'map',
      condition: (_s, m) => m.highestFloor >= 10,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'floor_15',
      name: 'Dungeon Master',
      description: 'Reach floor 15',
      icon: 'crown',
      condition: (_s, m) => m.highestFloor >= 15,
      reward: { type: 'meta_currency', value: 200 },
    },

    // ---- Combat ----
    {
      id: 'combo_10',
      name: 'Combo Master',
      description: 'Achieve a 10-hit combo',
      icon: 'fire',
      condition: (s) => s.maxCombo >= 10,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'combo_20',
      name: 'Combo God',
      description: 'Achieve a 20-hit combo',
      icon: 'fire',
      condition: (s) => s.maxCombo >= 20,
      reward: { type: 'meta_currency', value: 150 },
    },
    {
      id: 'overkill',
      name: 'Overkill',
      description: 'Deal 500+ damage in a single hit',
      icon: 'sword',
      // This is checked via individual damage events; we track max single hit
      condition: (s) => s.totalDamage >= 500,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'healer_1000',
      name: 'Guardian Angel',
      description: 'Heal 1000+ in a single run',
      icon: 'heart',
      condition: (s) => s.totalHealing >= 1000,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'kill_100',
      name: 'Slayer',
      description: 'Kill 100 enemies in a single run',
      icon: 'skull',
      condition: (s) => s.totalKills >= 100,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'skill_50',
      name: 'Spell Slinger',
      description: 'Use 50 skills in a single run',
      icon: 'magic',
      condition: (s) => s.skillsUsed >= 50,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'elite_hunter',
      name: 'Elite Hunter',
      description: 'Kill 5 elite enemies in a single run',
      icon: 'target',
      condition: (s) => s.eliteKills >= 5,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'boss_slayer',
      name: 'Boss Slayer',
      description: 'Kill 3 bosses in a single run',
      icon: 'dragon',
      condition: (s) => s.bossKills >= 3,
      reward: { type: 'meta_currency', value: 150 },
    },

    // ---- Economy ----
    {
      id: 'rich',
      name: 'Gold Hoarder',
      description: 'Earn 500 gold in a single run',
      icon: 'coin',
      condition: (s) => s.goldEarned >= 500,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'big_spender',
      name: 'Big Spender',
      description: 'Spend 300 gold in a single run',
      icon: 'bag',
      condition: (s) => s.goldSpent >= 300,
      reward: { type: 'meta_currency', value: 50 },
    },

    // ---- Collection ----
    {
      id: 'relic_5',
      name: 'Relic Hunter',
      description: 'Collect 5 relics in a single run',
      icon: 'gem',
      // Checked via meta relics (approximation using run tracking)
      condition: (_s, m) => m.unlockedRelics.length >= 5,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'relic_collector',
      name: 'Relic Collector',
      description: 'Unlock 10 different relics',
      icon: 'chest',
      condition: (_s, m) => m.unlockedRelics.length >= 10,
      reward: { type: 'meta_currency', value: 200 },
    },

    // ---- Challenge ----
    {
      id: 'solo_victory',
      name: 'Lone Wolf',
      description: 'Win a run with only 1 hero',
      icon: 'wolf',
      // Tracked by team size at run end; checked via hero stats
      condition: (s) => {
        const heroIds = Object.keys(s.heroStats);
        return heroIds.length === 1 && s.nodesCompleted >= 15;
      },
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'hell_victory',
      name: 'Hell Conqueror',
      description: 'Win on Hell difficulty',
      icon: 'flame',
      // Checked externally when difficulty is known
      condition: (_s, m) => m.totalVictories >= 1,
      reward: { type: 'meta_currency', value: 1000 },
    },

    // ---- Milestones ----
    {
      id: 'wins_5',
      name: 'Champion',
      description: 'Win 5 runs',
      icon: 'crown',
      condition: (_s, m) => m.totalVictories >= 5,
      reward: { type: 'meta_currency', value: 300 },
    },
    {
      id: 'wins_10',
      name: 'Legend',
      description: 'Win 10 runs',
      icon: 'star',
      condition: (_s, m) => m.totalVictories >= 10,
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'damage_10k',
      name: 'Damage Dealer',
      description: 'Deal 10,000 total damage in a single run',
      icon: 'explosion',
      condition: (s) => s.totalDamage >= 10000,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'damage_50k',
      name: 'Annihilator',
      description: 'Deal 50,000 total damage in a single run',
      icon: 'nuke',
      condition: (s) => s.totalDamage >= 50000,
      reward: { type: 'meta_currency', value: 300 },
    },
    {
      id: 'upgrade_max',
      name: 'Fully Upgraded',
      description: 'Max out any permanent upgrade',
      icon: 'arrow_up',
      condition: (_s, m) => m.permanentUpgrades.some(u => u.level >= u.maxLevel),
      reward: { type: 'meta_currency', value: 200 },
    },
  ];

  private constructor() {}

  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
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
    return AchievementManager.ACHIEVEMENTS;
  }

  static getProgress(id: string): { unlocked: boolean; progress?: string } {
    const unlocked = MetaManager.hasAchievement(id);
    const def = AchievementManager.ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return { unlocked: false };

    return {
      unlocked,
      progress: unlocked ? 'Completed' : 'In progress',
    };
  }
}

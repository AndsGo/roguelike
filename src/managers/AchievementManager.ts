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
    // ---- 进度 ----
    {
      id: 'first_victory',
      name: '首次胜利',
      description: '赢得第一次冒险',
      icon: 'trophy',
      condition: (_s, m) => m.totalVictories >= 1,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'veteran',
      name: '老兵',
      description: '完成10次冒险',
      icon: 'medal',
      condition: (_s, m) => m.totalRuns >= 10,
      reward: { type: 'meta_currency', value: 200 },
    },
    {
      id: 'speedrun',
      name: '速通达人',
      description: '在15个节点内赢得一次冒险',
      icon: 'lightning',
      condition: (s, m) => m.totalVictories >= 1 && s.nodesCompleted <= 15 && s.nodesCompleted > 0,
      reward: { type: 'meta_currency', value: 300 },
    },
    {
      id: 'no_death',
      name: '完美无瑕',
      description: '在零英雄阵亡的情况下赢得冒险',
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
      name: '收藏家',
      description: '解锁所有英雄',
      icon: 'star',
      condition: (_s, m) => m.unlockedHeroes.length >= 5,
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'floor_10',
      name: '深入探索',
      description: '到达第10层',
      icon: 'map',
      condition: (_s, m) => m.highestFloor >= 10,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'floor_15',
      name: '地牢大师',
      description: '到达第15层',
      icon: 'crown',
      condition: (_s, m) => m.highestFloor >= 15,
      reward: { type: 'meta_currency', value: 200 },
    },

    // ---- 战斗 ----
    {
      id: 'combo_10',
      name: '连击大师',
      description: '达成10连击',
      icon: 'fire',
      condition: (s) => s.maxCombo >= 10,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'combo_20',
      name: '连击之神',
      description: '达成20连击',
      icon: 'fire',
      condition: (s) => s.maxCombo >= 20,
      reward: { type: 'meta_currency', value: 150 },
    },
    {
      id: 'overkill',
      name: '过度杀伤',
      description: '单次攻击造成500+伤害',
      icon: 'sword',
      condition: (s) => s.totalDamage >= 500,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'healer_1000',
      name: '守护天使',
      description: '单次冒险中治疗1000+',
      icon: 'heart',
      condition: (s) => s.totalHealing >= 1000,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'kill_100',
      name: '屠戮者',
      description: '单次冒险中击杀100个敌人',
      icon: 'skull',
      condition: (s) => s.totalKills >= 100,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'skill_50',
      name: '法术连发',
      description: '单次冒险中使用50个技能',
      icon: 'magic',
      condition: (s) => s.skillsUsed >= 50,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'elite_hunter',
      name: '精英猎手',
      description: '单次冒险中击杀5个精英敌人',
      icon: 'target',
      condition: (s) => s.eliteKills >= 5,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'boss_slayer',
      name: '首领杀手',
      description: '单次冒险中击杀3个首领',
      icon: 'dragon',
      condition: (s) => s.bossKills >= 3,
      reward: { type: 'meta_currency', value: 150 },
    },

    // ---- 经济 ----
    {
      id: 'rich',
      name: '黄金囤积者',
      description: '单次冒险中获得500金币',
      icon: 'coin',
      condition: (s) => s.goldEarned >= 500,
      reward: { type: 'meta_currency', value: 50 },
    },
    {
      id: 'big_spender',
      name: '挥金如土',
      description: '单次冒险中花费300金币',
      icon: 'bag',
      condition: (s) => s.goldSpent >= 300,
      reward: { type: 'meta_currency', value: 50 },
    },

    // ---- 收集 ----
    {
      id: 'relic_5',
      name: '遗物猎人',
      description: '单次冒险中收集5个遗物',
      icon: 'gem',
      condition: (_s, m) => m.unlockedRelics.length >= 5,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'relic_collector',
      name: '遗物收藏家',
      description: '解锁10种不同遗物',
      icon: 'chest',
      condition: (_s, m) => m.unlockedRelics.length >= 10,
      reward: { type: 'meta_currency', value: 200 },
    },

    // ---- 挑战 ----
    {
      id: 'solo_victory',
      name: '独狼',
      description: '只用1名英雄赢得冒险',
      icon: 'wolf',
      condition: (s) => {
        const heroIds = Object.keys(s.heroStats);
        return heroIds.length === 1 && s.nodesCompleted >= 15;
      },
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'hell_victory',
      name: '地狱征服者',
      description: '在地狱难度下获胜',
      icon: 'flame',
      condition: (_s, m) => m.totalVictories >= 1,
      reward: { type: 'meta_currency', value: 1000 },
    },

    // ---- 里程碑 ----
    {
      id: 'wins_5',
      name: '冠军',
      description: '赢得5次冒险',
      icon: 'crown',
      condition: (_s, m) => m.totalVictories >= 5,
      reward: { type: 'meta_currency', value: 300 },
    },
    {
      id: 'wins_10',
      name: '传奇',
      description: '赢得10次冒险',
      icon: 'star',
      condition: (_s, m) => m.totalVictories >= 10,
      reward: { type: 'meta_currency', value: 500 },
    },
    {
      id: 'damage_10k',
      name: '伤害输出',
      description: '单次冒险中造成10,000总伤害',
      icon: 'explosion',
      condition: (s) => s.totalDamage >= 10000,
      reward: { type: 'meta_currency', value: 100 },
    },
    {
      id: 'damage_50k',
      name: '毁灭者',
      description: '单次冒险中造成50,000总伤害',
      icon: 'nuke',
      condition: (s) => s.totalDamage >= 50000,
      reward: { type: 'meta_currency', value: 300 },
    },
    {
      id: 'upgrade_max',
      name: '满级强化',
      description: '将任意永久升级升到最高等级',
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
      progress: unlocked ? '已完成' : '进行中',
    };
  }
}

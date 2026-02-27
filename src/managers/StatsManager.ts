import { EventBus } from '../systems/EventBus';

/** Per-run statistics tracking */
export interface RunStats {
  totalDamage: number;
  totalHealing: number;
  totalKills: number;
  maxCombo: number;
  skillsUsed: number;
  goldEarned: number;
  goldSpent: number;
  nodesCompleted: number;
  eliteKills: number;
  bossKills: number;
  heroStats: Record<string, { damage: number; healing: number; kills: number; deaths: number }>;
}

/** Lifetime history stats persisted across runs */
export interface HistoryStats {
  totalRuns: number;
  totalVictories: number;
  fastestVictory: number;  // nodes completed
  highestFloor: number;
  totalPlayTime: number;   // ms
  favoriteHero: string;    // most used
}

const HISTORY_KEY = 'roguelike_history_stats';
const HERO_USAGE_KEY = 'roguelike_hero_usage';

/**
 * Singleton that tracks per-run combat statistics via EventBus
 * and maintains a lifetime history persisted in localStorage.
 */
export class StatsManager {
  private static instance: StatsManager;
  private currentRunStats!: RunStats;
  private historyStats!: HistoryStats;
  private heroUsage!: Record<string, number>;
  private runStartTime: number = 0;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): StatsManager {
    if (!StatsManager.instance) {
      StatsManager.instance = new StatsManager();
    }
    StatsManager.instance.ensureInitialized();
    return StatsManager.instance;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialized = true;
      this.loadHistory();
      StatsManager.resetRunStats();
      this.registerListeners();
    }
  }

  /** Initialize the stats manager and register EventBus listeners */
  static init(): void {
    const inst = StatsManager.getInstance();
    inst.ensureInitialized();
  }

  private loadHistory(): void {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        this.historyStats = JSON.parse(raw) as HistoryStats;
      } else {
        this.historyStats = StatsManager.defaultHistory();
      }
    } catch {
      this.historyStats = StatsManager.defaultHistory();
    }

    try {
      const raw = localStorage.getItem(HERO_USAGE_KEY);
      if (raw) {
        this.heroUsage = JSON.parse(raw) as Record<string, number>;
      } else {
        this.heroUsage = {};
      }
    } catch {
      this.heroUsage = {};
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.historyStats));
      localStorage.setItem(HERO_USAGE_KEY, JSON.stringify(this.heroUsage));
    } catch {
      console.error('StatsManager: failed to save history');
    }
  }

  private static defaultHistory(): HistoryStats {
    return {
      totalRuns: 0,
      totalVictories: 0,
      fastestVictory: Infinity,
      highestFloor: 0,
      totalPlayTime: 0,
      favoriteHero: '',
    };
  }

  private registerListeners(): void {
    const bus = EventBus.getInstance();

    bus.on('unit:damage', (data) => {
      this.currentRunStats.totalDamage += data.amount;
      this.ensureHeroStats(data.sourceId);
      this.currentRunStats.heroStats[data.sourceId].damage += data.amount;
    });

    bus.on('unit:heal', (data) => {
      this.currentRunStats.totalHealing += data.amount;
      this.ensureHeroStats(data.sourceId);
      this.currentRunStats.heroStats[data.sourceId].healing += data.amount;
    });

    bus.on('unit:kill', (data) => {
      this.currentRunStats.totalKills++;
      this.ensureHeroStats(data.killerId);
      this.currentRunStats.heroStats[data.killerId].kills++;
    });

    bus.on('unit:death', (data) => {
      if (data.isHero) {
        this.ensureHeroStats(data.unitId);
        this.currentRunStats.heroStats[data.unitId].deaths++;
      }
    });

    bus.on('combo:hit', (data) => {
      if (data.comboCount > this.currentRunStats.maxCombo) {
        this.currentRunStats.maxCombo = data.comboCount;
      }
    });

    bus.on('skill:use', () => {
      this.currentRunStats.skillsUsed++;
    });

    bus.on('node:complete', (data) => {
      this.currentRunStats.nodesCompleted++;
      if (data.nodeType === 'elite') {
        this.currentRunStats.eliteKills++;
      } else if (data.nodeType === 'boss') {
        this.currentRunStats.bossKills++;
      }
    });
  }

  private ensureHeroStats(unitId: string): void {
    if (!this.currentRunStats.heroStats[unitId]) {
      this.currentRunStats.heroStats[unitId] = {
        damage: 0,
        healing: 0,
        kills: 0,
        deaths: 0,
      };
    }
  }

  // ---- Manual Recording ----

  static recordGoldEarned(amount: number): void {
    StatsManager.getInstance().currentRunStats.goldEarned += amount;
  }

  static recordGoldSpent(amount: number): void {
    StatsManager.getInstance().currentRunStats.goldSpent += amount;
  }

  static recordHeroUsed(heroId: string): void {
    const inst = StatsManager.getInstance();
    inst.heroUsage[heroId] = (inst.heroUsage[heroId] ?? 0) + 1;
  }

  // ---- Accessors ----

  static getRunStats(): RunStats {
    return StatsManager.getInstance().currentRunStats;
  }

  static getHistoryStats(): HistoryStats {
    return StatsManager.getInstance().historyStats;
  }

  // ---- Run Lifecycle ----

  static finalizeRun(victory: boolean): void {
    const inst = StatsManager.getInstance();
    const elapsed = Date.now() - inst.runStartTime;

    inst.historyStats.totalRuns++;
    if (victory) {
      inst.historyStats.totalVictories++;
      if (inst.currentRunStats.nodesCompleted < inst.historyStats.fastestVictory) {
        inst.historyStats.fastestVictory = inst.currentRunStats.nodesCompleted;
      }
    }
    if (inst.currentRunStats.nodesCompleted > inst.historyStats.highestFloor) {
      inst.historyStats.highestFloor = inst.currentRunStats.nodesCompleted;
    }
    inst.historyStats.totalPlayTime += elapsed;

    // Determine favorite hero
    let maxUsage = 0;
    let favorite = '';
    for (const [heroId, count] of Object.entries(inst.heroUsage)) {
      if (count > maxUsage) {
        maxUsage = count;
        favorite = heroId;
      }
    }
    inst.historyStats.favoriteHero = favorite;

    inst.saveHistory();
  }

  static resetRunStats(): void {
    const inst = StatsManager.getInstance();
    inst.runStartTime = Date.now();
    inst.currentRunStats = {
      totalDamage: 0,
      totalHealing: 0,
      totalKills: 0,
      maxCombo: 0,
      skillsUsed: 0,
      goldEarned: 0,
      goldSpent: 0,
      nodesCompleted: 0,
      eliteKills: 0,
      bossKills: 0,
      heroStats: {},
    };
  }
}

import { EventBus } from '../systems/EventBus';
import { ErrorHandler } from '../systems/ErrorHandler';
import { SaveManager } from './SaveManager';
import { GameEventMap } from '../types';

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
  private currentRunStats: RunStats = StatsManager.createDefaultRunStats();
  private historyStats: HistoryStats = StatsManager.defaultHistory();
  private heroUsage: Record<string, number> = {};
  private runStartTime: number = 0;
  private initialized: boolean = false;
  private listenersRegistered: boolean = false;

  // Named callback references for cleanup (null until listeners registered)
  private onDamage: ((data: GameEventMap['unit:damage']) => void) | null = null;
  private onHeal: ((data: GameEventMap['unit:heal']) => void) | null = null;
  private onKill: ((data: GameEventMap['unit:kill']) => void) | null = null;
  private onDeath: ((data: GameEventMap['unit:death']) => void) | null = null;
  private onCombo: ((data: GameEventMap['combo:hit']) => void) | null = null;
  private onSkillUse: ((data: GameEventMap['skill:use']) => void) | null = null;
  private onNodeComplete: ((data: GameEventMap['node:complete']) => void) | null = null;

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

  /** Teardown: unregister listeners and reset initialization flag */
  static teardown(): void {
    if (!StatsManager.instance) return;
    StatsManager.instance.unregisterListeners();
    StatsManager.instance.initialized = false;
  }

  /** Reset run stats and re-register listeners (call after EventBus.reset()) */
  static reinitForNewRun(): void {
    const inst = StatsManager.getInstance();
    inst.unregisterListeners();
    StatsManager.resetRunStats();
    inst.registerListeners();
  }

  private loadHistory(): void {
    this.historyStats = SaveManager.loadData<HistoryStats>(HISTORY_KEY) ?? StatsManager.defaultHistory();
    this.heroUsage = SaveManager.loadData<Record<string, number>>(HERO_USAGE_KEY) ?? {};
  }

  private saveHistory(): void {
    SaveManager.saveData(HISTORY_KEY, this.historyStats);
    SaveManager.saveData(HERO_USAGE_KEY, this.heroUsage);
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
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    const bus = EventBus.getInstance();

    this.onDamage = (data) => {
      this.currentRunStats.totalDamage += data.amount;
      this.ensureHeroStats(data.sourceId);
      this.currentRunStats.heroStats[data.sourceId].damage += data.amount;
    };

    this.onHeal = (data) => {
      this.currentRunStats.totalHealing += data.amount;
      this.ensureHeroStats(data.sourceId);
      this.currentRunStats.heroStats[data.sourceId].healing += data.amount;
    };

    this.onKill = (data) => {
      this.currentRunStats.totalKills++;
      this.ensureHeroStats(data.killerId);
      this.currentRunStats.heroStats[data.killerId].kills++;
    };

    this.onDeath = (data) => {
      if (data.isHero) {
        this.ensureHeroStats(data.unitId);
        this.currentRunStats.heroStats[data.unitId].deaths++;
      }
    };

    this.onCombo = (data) => {
      if (data.comboCount > this.currentRunStats.maxCombo) {
        this.currentRunStats.maxCombo = data.comboCount;
      }
    };

    this.onSkillUse = () => {
      this.currentRunStats.skillsUsed++;
    };

    this.onNodeComplete = (data) => {
      this.currentRunStats.nodesCompleted++;
      if (data.nodeType === 'elite') {
        this.currentRunStats.eliteKills++;
      } else if (data.nodeType === 'boss') {
        this.currentRunStats.bossKills++;
      }
    };

    bus.on('unit:damage', this.onDamage);
    bus.on('unit:heal', this.onHeal);
    bus.on('unit:kill', this.onKill);
    bus.on('unit:death', this.onDeath);
    bus.on('combo:hit', this.onCombo);
    bus.on('skill:use', this.onSkillUse);
    bus.on('node:complete', this.onNodeComplete);
  }

  unregisterListeners(): void {
    if (!this.listenersRegistered) return;
    this.listenersRegistered = false;

    const bus = EventBus.getInstance();
    if (this.onDamage) bus.off('unit:damage', this.onDamage);
    if (this.onHeal) bus.off('unit:heal', this.onHeal);
    if (this.onKill) bus.off('unit:kill', this.onKill);
    if (this.onDeath) bus.off('unit:death', this.onDeath);
    if (this.onCombo) bus.off('combo:hit', this.onCombo);
    if (this.onSkillUse) bus.off('skill:use', this.onSkillUse);
    if (this.onNodeComplete) bus.off('node:complete', this.onNodeComplete);
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
    inst.currentRunStats = StatsManager.createDefaultRunStats();
  }

  private static createDefaultRunStats(): RunStats {
    return {
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

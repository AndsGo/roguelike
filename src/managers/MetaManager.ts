import { MetaProgressionData, PermanentUpgrade } from '../types';
import { SaveManager } from './SaveManager';
import { EventBus } from '../systems/EventBus';
import { ErrorHandler } from '../systems/ErrorHandler';

/**
 * Singleton managing cross-run permanent progression.
 * Handles hero unlocks, permanent upgrades, meta currency, and statistics.
 */
export class MetaManager {
  private static instance: MetaManager;
  private meta!: MetaProgressionData;

  /** Cost per level for each upgrade (meta currency) */
  private static UPGRADE_COSTS: Record<string, number[]> = {
    starting_gold: [50, 80, 150, 300, 600],
    starting_hp: [50, 80, 150, 300, 600],
    exp_bonus: [50, 80, 150, 300, 600],
    crit_bonus: [80, 200, 450],
    relic_chance: [80, 200, 450],
  };

  /** Effect values per level for each upgrade */
  private static UPGRADE_VALUES: Record<string, number[]> = {
    starting_gold: [20, 40, 60, 80, 100],     // +20 gold per level
    starting_hp: [0.05, 0.10, 0.15, 0.20, 0.25], // +5% HP per level
    exp_bonus: [0.05, 0.10, 0.15, 0.20, 0.25],   // +5% exp per level
    crit_bonus: [0.02, 0.04, 0.06],               // +2% crit per level
    relic_chance: [0.05, 0.10, 0.15],              // +5% relic chance per level
  };

  static PERMANENT_UPGRADES: PermanentUpgrade[] = [
    { id: 'starting_gold', level: 0, maxLevel: 5 },
    { id: 'starting_hp', level: 0, maxLevel: 5 },
    { id: 'exp_bonus', level: 0, maxLevel: 5 },
    { id: 'crit_bonus', level: 0, maxLevel: 3 },
    { id: 'relic_chance', level: 0, maxLevel: 3 },
  ];

  /** Unlock requirements: heroId -> { type, threshold, description } */
  private static HERO_UNLOCK_CONDITIONS: Record<string, { type: string; threshold?: number; description: string }> = {
    warrior: { type: 'default', description: 'Default hero' },
    archer: { type: 'default', description: 'Default hero' },
    mage: { type: 'default', description: 'Default hero' },
    priest: { type: 'victory', threshold: 1, description: 'Win 1 run' },
    rogue: { type: 'runs', threshold: 3, description: 'Complete 3 runs' },
    knight: { type: 'runs', threshold: 5, description: 'Complete 5 runs' },
    shadow_assassin: { type: 'victory', threshold: 2, description: 'Win 2 runs' },
    elementalist: { type: 'floor', threshold: 15, description: 'Reach floor 15' },
    druid: { type: 'runs', threshold: 8, description: 'Complete 8 runs' },
    necromancer: { type: 'victory', threshold: 3, description: 'Win 3 runs' },
    berserker: { type: 'floor', threshold: 25, description: 'Reach floor 25' },
    frost_ranger: { type: 'runs', threshold: 10, description: 'Complete 10 runs' },
    beast_warden: { type: 'victory', threshold: 5, description: 'Win 5 runs' },
    dragon_knight: { type: 'floor', threshold: 35, description: 'Reach floor 35' },
    shadow_weaver: { type: 'victory', threshold: 7, description: 'Win 7 runs' },
    storm_caller: { type: 'runs', threshold: 15, description: 'Complete 15 runs' },
    holy_sentinel: { type: 'victory', threshold: 10, description: 'Win 10 runs' },
    ice_mage: { type: 'floor', threshold: 40, description: 'Reach floor 40' },
    thunder_monk: { type: 'victory', threshold: 12, description: 'Win 12 runs' },
  };

  private constructor() {}

  static getInstance(): MetaManager {
    if (!MetaManager.instance) {
      MetaManager.instance = new MetaManager();
      MetaManager.instance.meta = SaveManager.loadMeta();
      // Ensure metaCurrency field exists (for old saves)
      if (MetaManager.instance.meta.metaCurrency == null) {
        MetaManager.instance.meta.metaCurrency = 0;
      }
      MetaManager.instance.ensureUpgradeState();
      MetaManager.instance.migrateLegacyCurrency();
    }
    return MetaManager.instance;
  }

  /** Ensure all permanent upgrades exist in meta data */
  private ensureUpgradeState(): void {
    for (const def of MetaManager.PERMANENT_UPGRADES) {
      const existing = this.meta.permanentUpgrades.find(u => u.id === def.id);
      if (!existing) {
        this.meta.permanentUpgrades.push({ id: def.id, level: 0, maxLevel: def.maxLevel });
      }
    }
  }

  /** Save current meta state to localStorage */
  private persist(): void {
    SaveManager.saveMeta(this.meta);
  }

  // ---- Raw data access ----

  static getMetaData(): MetaProgressionData {
    return MetaManager.getInstance().meta;
  }

  // ---- Hero Unlocks ----

  static getUnlockedHeroes(): string[] {
    return MetaManager.getInstance().meta.unlockedHeroes;
  }

  static unlockHero(heroId: string): void {
    const inst = MetaManager.getInstance();
    if (!inst.meta.unlockedHeroes.includes(heroId)) {
      inst.meta.unlockedHeroes.push(heroId);
      inst.persist();
    }
  }

  static isHeroUnlocked(heroId: string): boolean {
    return MetaManager.getInstance().meta.unlockedHeroes.includes(heroId);
  }

  // ---- Relic Unlocks ----

  static getUnlockedRelics(): string[] {
    return MetaManager.getInstance().meta.unlockedRelics;
  }

  static unlockRelic(relicId: string): void {
    const inst = MetaManager.getInstance();
    if (!inst.meta.unlockedRelics.includes(relicId)) {
      inst.meta.unlockedRelics.push(relicId);
      inst.persist();
    }
  }

  // ---- Permanent Upgrades ----

  static getUpgrade(id: string): PermanentUpgrade | undefined {
    return MetaManager.getInstance().meta.permanentUpgrades.find(u => u.id === id);
  }

  static purchaseUpgrade(id: string): boolean {
    const inst = MetaManager.getInstance();
    const upgrade = inst.meta.permanentUpgrades.find(u => u.id === id);
    if (!upgrade) return false;
    if (upgrade.level >= upgrade.maxLevel) return false;

    const costs = MetaManager.UPGRADE_COSTS[id];
    if (!costs) return false;
    const cost = costs[upgrade.level];
    if (cost === undefined) return false;

    // Check and deduct meta currency (stored as totalVictories * 100 + bonus... we use a dedicated field)
    // Meta currency is derived: we'll use a simple approach - store in achievements array with prefix
    // Actually, let's add meta currency to the meta data directly
    // Since MetaProgressionData doesn't have a currency field, we store it as a virtual computed value
    // We'll track it using a permanentUpgrade entry with special id
    const currentCurrency = MetaManager.getMetaCurrency();
    if (currentCurrency < cost) return false;

    MetaManager.addMetaCurrency(-cost);
    upgrade.level++;
    inst.persist();
    return true;
  }

  static getUpgradeEffect(id: string): number {
    const upgrade = MetaManager.getUpgrade(id);
    if (!upgrade || upgrade.level === 0) return 0;

    const values = MetaManager.UPGRADE_VALUES[id];
    if (!values) return 0;
    return values[upgrade.level - 1] ?? 0;
  }

  // ---- Meta Currency ----

  private static LEGACY_CURRENCY_KEY = 'roguelike_meta_currency';

  static getMetaCurrency(): number {
    return MetaManager.getInstance().meta.metaCurrency ?? 0;
  }

  static addMetaCurrency(amount: number): void {
    const inst = MetaManager.getInstance();
    inst.meta.metaCurrency = Math.max(0, (inst.meta.metaCurrency ?? 0) + amount);
    inst.persist();
  }

  /** Migrate legacy currency from separate localStorage key into meta object */
  private migrateLegacyCurrency(): void {
    try {
      const raw = localStorage.getItem(MetaManager.LEGACY_CURRENCY_KEY);
      if (raw) {
        const legacy = parseInt(raw, 10) || 0;
        this.meta.metaCurrency = (this.meta.metaCurrency ?? 0) + legacy;
        localStorage.removeItem(MetaManager.LEGACY_CURRENCY_KEY);
        this.persist();
      }
    } catch {
      ErrorHandler.report('warn', 'MetaManager', 'failed to migrate legacy currency');
    }
  }

  // ---- Run Statistics ----

  static recordRunEnd(victory: boolean, floor: number): number {
    const inst = MetaManager.getInstance();
    inst.meta.totalRuns++;
    if (victory) {
      inst.meta.totalVictories++;
    }
    if (floor > inst.meta.highestFloor) {
      inst.meta.highestFloor = floor;
    }

    // Award meta currency based on progress
    const baseReward = victory ? 100 : Math.floor(floor * 5);
    MetaManager.addMetaCurrency(baseReward);

    // Check all hero unlock conditions
    for (const [heroId, cond] of Object.entries(MetaManager.HERO_UNLOCK_CONDITIONS)) {
      if (inst.meta.unlockedHeroes.includes(heroId)) continue;
      if (cond.type === 'default') continue;
      const threshold = cond.threshold ?? 1;
      let met = false;
      switch (cond.type) {
        case 'victory': met = inst.meta.totalVictories >= threshold; break;
        case 'runs': met = inst.meta.totalRuns >= threshold; break;
        case 'floor': met = inst.meta.highestFloor >= threshold; break;
      }
      if (met) MetaManager.unlockHero(heroId);
    }

    // Emit run end for achievement checking
    EventBus.getInstance().emit('run:end', { victory, floor });

    inst.persist();
    return baseReward;
  }

  // ---- Achievements ----

  static getAchievements(): string[] {
    return MetaManager.getInstance().meta.achievements;
  }

  static addAchievement(achievementId: string): void {
    const inst = MetaManager.getInstance();
    if (!inst.meta.achievements.includes(achievementId)) {
      inst.meta.achievements.push(achievementId);
      inst.persist();
    }
  }

  static hasAchievement(achievementId: string): boolean {
    return MetaManager.getInstance().meta.achievements.includes(achievementId);
  }

  /** Reset all meta progression to defaults */
  static resetAll(): void {
    const inst = MetaManager.getInstance();
    inst.meta = SaveManager.loadMeta();
    // Override with defaults
    inst.meta.totalRuns = 0;
    inst.meta.totalVictories = 0;
    inst.meta.highestFloor = 0;
    inst.meta.unlockedHeroes = ['warrior', 'archer', 'mage'];
    inst.meta.unlockedRelics = [];
    inst.meta.permanentUpgrades = [];
    inst.meta.achievements = [];
    inst.meta.metaCurrency = 0;
    inst.ensureUpgradeState();
    inst.persist();
  }
}

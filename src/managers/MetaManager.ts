import { MetaProgressionData, PermanentUpgrade } from '../types';
import { SaveManager } from './SaveManager';
import { EventBus } from '../systems/EventBus';
import { ErrorHandler } from '../systems/ErrorHandler';

export interface RunEndContext {
  partyHeroIds: string[];
  partyElements: (string | undefined)[];
  partyRoles: string[];
  relicCount: number;
  difficulty: string;
}

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

  /** Mutation upgrade definitions (one-time unlocks that change game rules) */
  static MUTATION_DEFS: { id: string; cost: number }[] = [
    { id: 'extra_draft_pick', cost: 100 },
    { id: 'shop_extra_item', cost: 120 },
    { id: 'start_with_relic', cost: 150 },
    { id: 'first_event_safe', cost: 80 },
    { id: 'overkill_splash', cost: 150 },
    { id: 'crit_cooldown', cost: 120 },
    { id: 'heal_shield', cost: 100 },
    { id: 'reaction_chain', cost: 130 },
  ];

  /** Total upgrade levels required to unlock mutations */
  static MUTATION_GATE = 10;

  /** Unlock requirements: heroId -> { type, threshold, description, ... } */
  private static HERO_UNLOCK_CONDITIONS: Record<string, {
    type: string;
    threshold?: number;
    element?: string;
    heroId?: string;
    bossId?: string;
    difficulty?: string;
    description: string;
  }> = {
    warrior: { type: 'default', description: 'Default hero' },
    archer: { type: 'default', description: 'Default hero' },
    mage: { type: 'default', description: 'Default hero' },
    priest: { type: 'default', description: 'Default hero' },
    rogue: { type: 'default', description: 'Default hero' },
    knight: { type: 'runs', threshold: 5, description: 'Complete 5 runs' },
    shadow_assassin: { type: 'victory', threshold: 2, description: 'Win 2 runs' },
    elementalist: { type: 'element_wins', element: 'lightning', threshold: 2, description: 'Win with 2+ lightning heroes' },
    druid: { type: 'no_healer_win', description: 'Win without a healer' },
    necromancer: { type: 'boss_kill', bossId: 'thunder_titan', description: 'Defeat Thunder Titan' },
    berserker: { type: 'relic_count', threshold: 8, description: 'Finish with 8+ relics' },
    frost_ranger: { type: 'element_wins', element: 'ice', threshold: 2, description: 'Win with 2+ ice heroes' },
    beast_warden: { type: 'hero_used', heroId: 'knight', description: 'Win using knight' },
    dragon_knight: { type: 'full_element_team', element: 'fire', description: 'Win with mono-fire team' },
    shadow_weaver: { type: 'hero_used', heroId: 'shadow_assassin', description: 'Win using shadow_assassin' },
    storm_caller: { type: 'element_wins', element: 'lightning', threshold: 2, description: 'Win with 2+ lightning heroes' },
    holy_sentinel: { type: 'no_healer_win', difficulty: 'hard', description: 'Win without healer on hard+' },
    ice_mage: { type: 'boss_kill', bossId: 'shadow_lord', description: 'Defeat Shadow Lord' },
    thunder_monk: { type: 'full_element_team', element: 'lightning', description: 'Win with mono-lightning team' },
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

  static getHeroUnlockCondition(heroId: string): {
    type: string; threshold?: number; element?: string;
    heroId?: string; bossId?: string; difficulty?: string;
    description: string;
  } | undefined {
    return MetaManager.HERO_UNLOCK_CONDITIONS[heroId];
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

  // ---- Mutations ----

  /** Sum of all permanent upgrade levels */
  static getTotalUpgradeLevels(): number {
    const inst = MetaManager.getInstance();
    return inst.meta.permanentUpgrades.reduce((sum, u) => sum + u.level, 0);
  }

  /** Whether mutation tier is accessible */
  static isMutationTierUnlocked(): boolean {
    return MetaManager.getTotalUpgradeLevels() >= MetaManager.MUTATION_GATE;
  }

  /** Whether a specific mutation has been purchased */
  static hasMutation(id: string): boolean {
    return (MetaManager.getInstance().meta.mutations ?? []).includes(id);
  }

  /** Get all unlocked mutation IDs */
  static getMutations(): string[] {
    return MetaManager.getInstance().meta.mutations ?? [];
  }

  /** Purchase a mutation (one-time unlock). Returns true if successful. */
  static purchaseMutation(id: string): boolean {
    const inst = MetaManager.getInstance();
    if (!MetaManager.isMutationTierUnlocked()) return false;

    const def = MetaManager.MUTATION_DEFS.find(m => m.id === id);
    if (!def) return false;

    if (!inst.meta.mutations) inst.meta.mutations = [];
    if (inst.meta.mutations.includes(id)) return false;

    const currency = MetaManager.getMetaCurrency();
    if (currency < def.cost) return false;

    MetaManager.addMetaCurrency(-def.cost);
    inst.meta.mutations.push(id);
    inst.persist();
    return true;
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

  static recordRunEnd(victory: boolean, floor: number, context?: RunEndContext): number {
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

    const difficultyRank: Record<string, number> = { normal: 0, hard: 1, nightmare: 2, hell: 3 };

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
        case 'element_wins':
          if (victory && context && cond.element) {
            const count = context.partyElements.filter(e => e === cond.element).length;
            met = count >= threshold;
          }
          break;
        case 'boss_kill':
          if (cond.bossId) {
            met = MetaManager.hasDefeatedBoss(cond.bossId);
          }
          break;
        case 'no_healer_win':
          if (victory && context) {
            const hasHealer = context.partyRoles.includes('healer');
            met = !hasHealer;
            if (met && cond.difficulty) {
              const requiredRank = difficultyRank[cond.difficulty] ?? 0;
              const currentRank = difficultyRank[context.difficulty] ?? 0;
              met = currentRank >= requiredRank;
            }
          }
          break;
        case 'full_element_team':
          if (victory && context && cond.element) {
            met = context.partyElements.length > 0 &&
                  context.partyElements.every(e => e === cond.element);
          }
          break;
        case 'relic_count':
          if (victory && context) {
            met = context.relicCount >= threshold;
          }
          break;
        case 'hero_used':
          if (victory && context && cond.heroId) {
            met = context.partyHeroIds.includes(cond.heroId);
          }
          break;
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

  // ---- Enemy Encounters (Codex) ----

  static getEncounteredEnemies(): string[] {
    return MetaManager.getInstance().meta.encounteredEnemies ?? [];
  }

  static recordEnemyEncounter(enemyId: string): void {
    const inst = MetaManager.getInstance();
    if (!inst.meta.encounteredEnemies) {
      inst.meta.encounteredEnemies = [];
    }
    if (!inst.meta.encounteredEnemies.includes(enemyId)) {
      inst.meta.encounteredEnemies.push(enemyId);
      inst.persist();
    }
  }

  static hasEncounteredEnemy(enemyId: string): boolean {
    return (MetaManager.getInstance().meta.encounteredEnemies ?? []).includes(enemyId);
  }

  // ---- Boss Kill Tracking ----

  static getDefeatedBosses(): string[] {
    return MetaManager.getInstance().meta.defeatedBosses ?? [];
  }

  static recordBossKill(bossId: string): void {
    const inst = MetaManager.getInstance();
    if (!inst.meta.defeatedBosses) inst.meta.defeatedBosses = [];
    if (!inst.meta.defeatedBosses.includes(bossId)) {
      inst.meta.defeatedBosses.push(bossId);
      inst.persist();
    }
  }

  static hasDefeatedBoss(bossId: string): boolean {
    return (MetaManager.getInstance().meta.defeatedBosses ?? []).includes(bossId);
  }

  /** Reset all meta progression to defaults */
  static resetAll(): void {
    const inst = MetaManager.getInstance();
    inst.meta = SaveManager.loadMeta();
    // Override with defaults
    inst.meta.totalRuns = 0;
    inst.meta.totalVictories = 0;
    inst.meta.highestFloor = 0;
    inst.meta.unlockedHeroes = ['warrior', 'archer', 'mage', 'priest', 'rogue'];
    inst.meta.unlockedRelics = [];
    inst.meta.permanentUpgrades = [];
    inst.meta.achievements = [];
    inst.meta.metaCurrency = 0;
    inst.meta.encounteredEnemies = [];
    inst.meta.defeatedBosses = [];
    inst.meta.mutations = [];
    inst.ensureUpgradeState();
    inst.persist();
  }
}

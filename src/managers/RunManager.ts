import {
  RunState, HeroState, MapNode, ItemData, BattleResult, HeroData,
  RelicState, ActiveSynergy, ElementType, RaceType, ClassType,
  SynergyConfig, SynergyThreshold, ActConfig,
} from '../types';
import { SeededRNG } from '../utils/rng';
import { STARTING_GOLD, MAX_TEAM_SIZE } from '../constants';
import { expForLevel } from '../utils/math';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import { EventBus } from '../systems/EventBus';
import { AudioManager } from '../systems/AudioManager';
import { GameLifecycle } from '../systems/GameLifecycle';
import heroesData from '../data/heroes.json';
import actsData from '../data/acts.json';

/**
 * Singleton managing the state of the current run.
 * Persists across scene transitions within a single run.
 */
export class RunManager {
  private static instance: RunManager;
  private state!: RunState;
  private rng!: SeededRNG;

  private constructor() {}

  static getInstance(): RunManager {
    if (!RunManager.instance) {
      RunManager.instance = new RunManager();
    }
    return RunManager.instance;
  }

  /** Start a new run with optional seed, difficulty, and hero selection */
  newRun(seed?: number, difficulty: string = 'normal', heroIds?: string[]): void {
    const s = seed ?? Date.now();
    this.rng = new SeededRNG(s);

    // Unified teardown + re-init for new run
    GameLifecycle.teardownAll();
    GameLifecycle.prepareNewRun();

    // Use provided heroes or fall back to defaults
    const ids = heroIds && heroIds.length >= 2 ? heroIds : ['warrior', 'archer'];
    const startingHeroes: HeroState[] = ids.map(id => this.createHeroState(id));

    this.state = {
      seed: s,
      heroes: startingHeroes,
      gold: STARTING_GOLD,
      map: [],
      currentNode: -1,
      floor: 1,
      relics: [],
      difficulty,
      activeSynergies: [],
      currentAct: 0,
    };

    this.calculateSynergies();
  }

  private createHeroState(heroId: string): HeroState {
    const data = heroesData.find(h => h.id === heroId) as HeroData;
    if (!data) throw new Error(`Hero data not found: ${heroId}`);
    return {
      id: heroId,
      level: 1,
      exp: 0,
      currentHp: data.baseStats.maxHp,
      equipment: {
        weapon: null,
        armor: null,
        accessory: null,
      },
    };
  }

  // ---- Getters ----

  getState(): RunState { return this.state; }
  getRng(): SeededRNG { return this.rng; }
  getHeroes(): HeroState[] { return this.state.heroes; }
  getGold(): number { return this.state.gold; }
  getMap(): MapNode[] { return this.state.map; }
  getCurrentNode(): number { return this.state.currentNode; }
  getFloor(): number { return this.state.floor; }
  getRelics(): RelicState[] { return this.state.relics; }
  getDifficulty(): string { return this.state.difficulty; }
  getActiveSynergies(): ActiveSynergy[] { return this.state?.activeSynergies ?? []; }
  getCurrentAct(): number { return this.state.currentAct; }

  getHeroData(heroId: string): HeroData {
    const data = heroesData.find(h => h.id === heroId) as HeroData;
    if (!data) throw new Error(`Hero data not found: ${heroId}`);
    return data;
  }

  getHeroState(heroId: string): HeroState | undefined {
    return this.state.heroes.find(h => h.id === heroId);
  }

  // ---- Mutations ----

  setMap(map: MapNode[]): void {
    this.state.map = map;
  }

  advanceNode(): void {
    this.state.currentNode++;
  }

  setCurrentNode(index: number): void {
    this.state.currentNode = index;
  }

  addGold(amount: number): void {
    this.state.gold = Math.max(0, this.state.gold + amount);
  }

  spendGold(amount: number): boolean {
    if (this.state.gold >= amount) {
      this.state.gold -= amount;
      return true;
    }
    return false;
  }

  addHero(heroId: string): boolean {
    if (this.state.heroes.length >= MAX_TEAM_SIZE) return false;
    if (this.state.heroes.some(h => h.id === heroId)) return false;
    this.state.heroes.push(this.createHeroState(heroId));
    this.calculateSynergies();
    return true;
  }

  /** Remove a hero from the party (sacrifice). Returns true if removed. */
  removeHero(heroId: string): boolean {
    const idx = this.state.heroes.findIndex(h => h.id === heroId);
    if (idx === -1) return false;
    if (this.state.heroes.length <= 1) return false; // can't sacrifice last hero
    this.state.heroes.splice(idx, 1);
    this.calculateSynergies();
    return true;
  }

  /** Set a temporary element on a random hero */
  setTemporaryElement(element: ElementType): string | null {
    const eligible = this.state.heroes.filter(h => !h.temporaryElement);
    if (eligible.length === 0) return null;
    const hero = this.rng.pick(eligible);
    hero.temporaryElement = element;
    this.calculateSynergies();
    return hero.id;
  }

  /** Clear all temporary elements (called at end of act) */
  clearTemporaryElements(): void {
    for (const hero of this.state.heroes) {
      delete hero.temporaryElement;
    }
    this.calculateSynergies();
  }

  /** Apply battle results: sync HP, award gold/exp */
  applyBattleResult(result: BattleResult): void {
    this.addGold(result.goldEarned);

    for (const hero of this.state.heroes) {
      if (result.survivors.includes(hero.id)) {
        // survivors keep their battle HP (passed back)
      } else {
        // dead heroes revive with 1 HP
        hero.currentHp = 1;
      }
      // award exp
      this.addExp(hero, result.expEarned);
      // clamp HP
      const data = this.getHeroData(hero.id);
      const maxHp = this.getMaxHp(hero, data);
      hero.currentHp = Math.min(hero.currentHp, maxHp);
    }
  }

  updateHeroHp(heroId: string, hp: number): void {
    const hero = this.getHeroState(heroId);
    if (hero) {
      hero.currentHp = Math.max(0, hp);
    }
  }

  healAllHeroes(percent: number): void {
    for (const hero of this.state.heroes) {
      const data = this.getHeroData(hero.id);
      const maxHp = this.getMaxHp(hero, data);
      hero.currentHp = Math.min(maxHp, hero.currentHp + Math.floor(maxHp * percent));
    }
  }

  damageAllHeroes(percent: number): void {
    for (const hero of this.state.heroes) {
      const data = this.getHeroData(hero.id);
      const maxHp = this.getMaxHp(hero, data);
      hero.currentHp = Math.max(1, hero.currentHp - Math.floor(maxHp * percent));
    }
  }

  equipItem(heroId: string, item: ItemData): ItemData | null {
    const hero = this.getHeroState(heroId);
    if (!hero) return null;
    const old = hero.equipment[item.slot];
    hero.equipment[item.slot] = item;

    EventBus.getInstance().emit('item:equip', {
      heroId,
      itemId: item.id,
      slot: item.slot,
    });

    return old;
  }

  getMaxHp(hero: HeroState, data: HeroData): number {
    let maxHp = data.baseStats.maxHp + data.scalingPerLevel.maxHp * (hero.level - 1);
    // Add equipment bonuses
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const equip = hero.equipment[slot];
      if (equip?.stats.maxHp) {
        maxHp += equip.stats.maxHp;
      }
    }
    return maxHp;
  }

  /**
   * Apply a flat stat boost to a hero (from events).
   * Distributes value across attack, defense, and maxHp.
   */
  applyStatBoost(hero: HeroState, value: number): void {
    if (!hero.statBonuses) hero.statBonuses = {};
    // Distribute: attack gets value, defense gets floor(value*0.8), maxHp gets value*3
    hero.statBonuses.attack = (hero.statBonuses.attack ?? 0) + value;
    hero.statBonuses.defense = (hero.statBonuses.defense ?? 0) + Math.floor(value * 0.8);
    hero.statBonuses.maxHp = (hero.statBonuses.maxHp ?? 0) + value * 3;
    // Also bump currentHp by the maxHp gain so hero doesn't appear damaged
    hero.currentHp += value * 3;
  }

  addExp(hero: HeroState, amount: number): void {
    hero.exp += amount;
    const startLevel = hero.level;
    let needed = expForLevel(hero.level);
    while (hero.exp >= needed && hero.level < 20) {
      hero.exp -= needed;
      hero.level++;
      needed = expForLevel(hero.level);
      // Heal to full on level up
      const data = this.getHeroData(hero.id);
      hero.currentHp = this.getMaxHp(hero, data);
    }
    if (hero.level > startLevel) {
      AudioManager.getInstance().playSfx('sfx_levelup');
    }
  }

  markNodeCompleted(index: number): void {
    if (this.state.map[index]) {
      this.state.map[index].completed = true;
      EventBus.getInstance().emit('node:complete', {
        nodeIndex: index,
        nodeType: this.state.map[index].type,
      });
    }
  }

  /**
   * Get all nodes that the player can currently move to.
   * These are uncompleted nodes reachable from any completed node's connections,
   * or the first node (index 0) if no nodes are completed yet.
   */
  getAccessibleNodes(): number[] {
    const map = this.state.map;
    if (map.length === 0) return [];

    // If no node completed yet, the first node is accessible
    const hasCompleted = map.some(n => n.completed);
    if (!hasCompleted) {
      return [0];
    }

    const accessible = new Set<number>();
    for (const node of map) {
      if (node.completed) {
        for (const connIdx of node.connections) {
          if (connIdx < map.length && !map[connIdx].completed) {
            accessible.add(connIdx);
          }
        }
      }
    }
    return Array.from(accessible);
  }

  /** Determine which act a node belongs to, based on act nodeCount boundaries */
  getNodeAct(nodeIndex: number): number {
    const acts = actsData as ActConfig[];
    const map = this.state.map;

    // Build layer structure per act to count actual nodes (not template nodeCount)
    // Since MapGenerator generates with branching, actual node count per act varies.
    // We reconstruct act boundaries by traversing from node 0.
    let actStart = 0;
    for (let actIdx = 0; actIdx < acts.length; actIdx++) {
      // Find all nodes belonging to this act by BFS from actStart
      const actNodes = this.getActNodeIndices(actStart, map);
      if (actNodes.includes(nodeIndex)) {
        return actIdx;
      }
      // Next act starts after this act's nodes
      if (actNodes.length === 0) break;
      actStart = Math.max(...actNodes) + 1;
      if (actStart >= map.length) break;
    }
    return 0;
  }

  /** Get all node indices belonging to the act starting at startIndex */
  getActNodeIndices(startIndex: number, map: MapNode[]): number[] {
    if (startIndex >= map.length) return [];
    const visited = new Set<number>();
    const queue = [startIndex];
    visited.add(startIndex);

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const node = map[idx];
      for (const connIdx of node.connections) {
        if (connIdx < map.length && !visited.has(connIdx)) {
          // Check if this connection is a boss -> next act boundary
          // A boss node's connections to a higher-indexed node that starts a new act
          // We detect this: if current node is boss and connIdx > idx, it's cross-act
          if (node.type === 'boss' && connIdx > idx) {
            // This is cross-act connection, skip
            continue;
          }
          visited.add(connIdx);
          queue.push(connIdx);
        }
      }
    }
    return Array.from(visited).sort((a, b) => a - b);
  }

  /** Get the starting node index for a given act */
  getActStartIndex(actIndex: number): number {
    const map = this.state.map;
    let actStart = 0;
    for (let i = 0; i < actIndex; i++) {
      const actNodes = this.getActNodeIndices(actStart, map);
      if (actNodes.length === 0) break;
      actStart = Math.max(...actNodes) + 1;
    }
    return actStart;
  }

  setCurrentAct(act: number): void {
    this.state.currentAct = act;
  }

  /** Check if the last act's boss is completed (game won) */
  isRunComplete(): boolean {
    const acts = actsData as ActConfig[];
    const map = this.state.map;
    // Find the last boss node
    for (let i = map.length - 1; i >= 0; i--) {
      if (map[i].type === 'boss') {
        return map[i].completed;
      }
    }
    return false;
  }

  // ---- Relics ----

  addRelic(relicId: string): void {
    if (this.state.relics.some(r => r.id === relicId)) return;
    this.state.relics.push({ id: relicId, triggerCount: 0 });
    EventBus.getInstance().emit('relic:acquire', { relicId });
  }

  hasRelic(relicId: string): boolean {
    return this.state.relics.some(r => r.id === relicId);
  }

  incrementRelicTrigger(relicId: string): void {
    const relic = this.state.relics.find(r => r.id === relicId);
    if (relic) {
      relic.triggerCount++;
    }
  }

  // ---- Synergies ----

  calculateSynergies(): void {
    const raceCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();
    const elementCounts = new Map<string, number>();

    for (const heroState of this.state.heroes) {
      const data = this.getHeroData(heroState.id) as HeroData;
      if (data.race) {
        raceCounts.set(data.race, (raceCounts.get(data.race) ?? 0) + 1);
      }
      if (data.class) {
        classCounts.set(data.class, (classCounts.get(data.class) ?? 0) + 1);
      }
      if (data.element) {
        elementCounts.set(data.element, (elementCounts.get(data.element) ?? 0) + 1);
      }
    }

    this.state.activeSynergies = [];

    for (const synergy of SYNERGY_DEFINITIONS) {
      let count = 0;
      if (synergy.type === 'race') {
        count = raceCounts.get(synergy.key) ?? 0;
      } else if (synergy.type === 'class') {
        count = classCounts.get(synergy.key) ?? 0;
      } else if (synergy.type === 'element') {
        count = elementCounts.get(synergy.key) ?? 0;
      }

      // Find highest reached threshold
      let activeThreshold = 0;
      for (const threshold of synergy.thresholds) {
        if (count >= threshold.count) {
          activeThreshold = threshold.count;
        }
      }

      if (activeThreshold > 0) {
        this.state.activeSynergies.push({
          synergyId: synergy.id,
          count,
          activeThreshold,
        });
      }
    }
  }

  // ---- Serialization ----

  serialize(): string {
    return JSON.stringify({
      state: this.state,
      rngState: this.rng.getState(),
    });
  }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.state = data.state;
    // Restore RNG internal state if available, fallback to seed for old saves
    if (data.rngState != null) {
      this.rng = SeededRNG.fromState(data.rngState);
    } else {
      this.rng = new SeededRNG(data.state.seed);
    }
  }
}

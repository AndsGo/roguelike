import { RunState, HeroState, MapNode, ItemData, BattleResult, HeroData } from '../types';
import { SeededRNG } from '../utils/rng';
import { STARTING_GOLD, MAX_TEAM_SIZE } from '../constants';
import { expForLevel } from '../utils/math';
import heroesData from '../data/heroes.json';

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

  /** Start a new run with optional seed */
  newRun(seed?: number): void {
    const s = seed ?? Date.now();
    this.rng = new SeededRNG(s);

    // Start with warrior and archer
    const startingHeroes: HeroState[] = [
      this.createHeroState('warrior'),
      this.createHeroState('archer'),
    ];

    this.state = {
      seed: s,
      heroes: startingHeroes,
      gold: STARTING_GOLD,
      map: [],
      currentNode: -1,
      floor: 1,
    };
  }

  private createHeroState(heroId: string): HeroState {
    const data = heroesData.find(h => h.id === heroId) as HeroData;
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

  getHeroData(heroId: string): HeroData {
    return heroesData.find(h => h.id === heroId) as HeroData;
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
    return true;
  }

  /** Apply battle results: sync HP, award gold/exp */
  applyBattleResult(result: BattleResult): void {
    this.addGold(result.goldEarned);

    for (const hero of this.state.heroes) {
      const data = this.getHeroData(hero.id);
      if (result.survivors.includes(hero.id)) {
        // survivors keep their battle HP (passed back)
      } else {
        // dead heroes revive with 1 HP
        hero.currentHp = 1;
      }
      // award exp
      this.addExp(hero, result.expEarned);
      // clamp HP
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

  private addExp(hero: HeroState, amount: number): void {
    hero.exp += amount;
    let needed = expForLevel(hero.level);
    while (hero.exp >= needed && hero.level < 20) {
      hero.exp -= needed;
      hero.level++;
      needed = expForLevel(hero.level);
      // Heal to full on level up
      const data = this.getHeroData(hero.id);
      hero.currentHp = this.getMaxHp(hero, data);
    }
  }

  markNodeCompleted(index: number): void {
    if (this.state.map[index]) {
      this.state.map[index].completed = true;
    }
  }
}

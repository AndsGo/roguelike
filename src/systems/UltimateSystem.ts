import { EventBus } from './EventBus';
import { SkillData, GameEventMap } from '../types';

const PASSIVE_RATE = 2;      // energy per second
const ATTACK_ENERGY = 3;     // per basic attack
const SKILL_ENERGY = 5;      // per regular skill use
const DAMAGED_ENERGY = 2;    // per hit taken
const KILL_ENERGY = 10;      // per enemy killed
const MAX_ENERGY = 100;

interface HeroUltState {
  energy: number;
  ultimateSkillId: string | null;
  heroIndex: number;
}

export class UltimateSystem {
  private heroStates: Map<string, HeroUltState> = new Map();
  private heroIds: Set<string> = new Set();

  private onAttack!: (data: GameEventMap['unit:attack']) => void;
  private onSkillUse!: (data: GameEventMap['skill:use']) => void;
  private onDamage!: (data: GameEventMap['unit:damage']) => void;
  private onKill!: (data: GameEventMap['unit:kill']) => void;

  activate(heroes: { unitId: string; isHero: boolean; skills: SkillData[] }[]): void {
    this.heroStates.clear();
    this.heroIds.clear();

    heroes.forEach((hero, index) => {
      const ultSkill = hero.skills.find(s => s.isUltimate);
      this.heroStates.set(hero.unitId, {
        energy: 0,
        ultimateSkillId: ultSkill?.id ?? null,
        heroIndex: index,
      });
      this.heroIds.add(hero.unitId);
    });

    const eb = EventBus.getInstance();

    this.onAttack = (data) => {
      if (this.heroIds.has(data.sourceId)) {
        this.addEnergy(data.sourceId, ATTACK_ENERGY);
      }
    };

    this.onSkillUse = (data) => {
      if (!this.heroIds.has(data.casterId)) return;
      const state = this.heroStates.get(data.casterId);
      if (state && data.skillId === state.ultimateSkillId) return;
      this.addEnergy(data.casterId, SKILL_ENERGY);
    };

    this.onDamage = (data) => {
      if (this.heroIds.has(data.targetId)) {
        this.addEnergy(data.targetId, DAMAGED_ENERGY);
      }
    };

    this.onKill = (data) => {
      if (this.heroIds.has(data.killerId)) {
        this.addEnergy(data.killerId, KILL_ENERGY);
      }
    };

    eb.on('unit:attack', this.onAttack);
    eb.on('skill:use', this.onSkillUse);
    eb.on('unit:damage', this.onDamage);
    eb.on('unit:kill', this.onKill);
  }

  deactivate(): void {
    const eb = EventBus.getInstance();
    if (this.onAttack) eb.off('unit:attack', this.onAttack);
    if (this.onSkillUse) eb.off('skill:use', this.onSkillUse);
    if (this.onDamage) eb.off('unit:damage', this.onDamage);
    if (this.onKill) eb.off('unit:kill', this.onKill);
    this.heroStates.clear();
    this.heroIds.clear();
  }

  update(delta: number): void {
    const dt = delta / 1000;
    for (const [heroId, state] of this.heroStates) {
      if (state.energy < MAX_ENERGY) {
        this.addEnergy(heroId, PASSIVE_RATE * dt);
      }
    }
  }

  addEnergy(heroId: string, amount: number): void {
    const state = this.heroStates.get(heroId);
    if (!state) return;

    const wasBelowMax = state.energy < MAX_ENERGY;
    state.energy = Math.min(MAX_ENERGY, state.energy + amount);

    if (wasBelowMax && state.energy >= MAX_ENERGY) {
      EventBus.getInstance().emit('ultimate:ready', {
        unitId: heroId,
        heroIndex: state.heroIndex,
      });
    }
  }

  consumeEnergy(heroId: string): void {
    const state = this.heroStates.get(heroId);
    if (!state) return;

    state.energy = 0;
    if (state.ultimateSkillId) {
      EventBus.getInstance().emit('ultimate:used', {
        unitId: heroId,
        skillId: state.ultimateSkillId,
      });
    }
  }

  getEnergy(heroId: string): number {
    return this.heroStates.get(heroId)?.energy ?? 0;
  }

  isReady(heroId: string): boolean {
    return this.getEnergy(heroId) >= MAX_ENERGY;
  }

  getUltimateSkillId(heroId: string): string | null {
    return this.heroStates.get(heroId)?.ultimateSkillId ?? null;
  }

  getHeroIndex(heroId: string): number {
    return this.heroStates.get(heroId)?.heroIndex ?? -1;
  }
}

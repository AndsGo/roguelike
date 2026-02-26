import Phaser from 'phaser';
import { HeroData, HeroState, UnitStats } from '../types';
import { Unit } from './Unit';

export class Hero extends Unit {
  heroData: HeroData;
  heroState: HeroState;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heroData: HeroData,
    heroState: HeroState,
  ) {
    // Calculate level-scaled stats
    const stats = Hero.calculateStats(heroData, heroState);

    super(scene, x, y, heroData.id, heroData.name, heroData.role, stats, true, heroData.element);

    this.heroData = heroData;
    this.heroState = heroState;
    this.currentHp = heroState.currentHp;
    this.healthBar.updateHealth(this.currentHp, stats.maxHp);
  }

  static calculateStats(data: HeroData, state: HeroState): UnitStats {
    const level = state.level;
    const scaling = data.scalingPerLevel;
    const base = data.baseStats;

    const stats: UnitStats = {
      maxHp: base.maxHp + scaling.maxHp * (level - 1),
      hp: base.maxHp + scaling.maxHp * (level - 1),
      attack: base.attack + scaling.attack * (level - 1),
      defense: base.defense + scaling.defense * (level - 1),
      magicPower: base.magicPower + scaling.magicPower * (level - 1),
      magicResist: base.magicResist + scaling.magicResist * (level - 1),
      speed: base.speed,
      attackSpeed: base.attackSpeed,
      attackRange: base.attackRange,
      critChance: base.critChance,
      critDamage: base.critDamage,
    };

    // Apply equipment bonuses
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const item = state.equipment[slot];
      if (item) {
        for (const [key, value] of Object.entries(item.stats)) {
          if (key in stats) {
            (stats[key as keyof UnitStats] as number) += value as number;
          }
        }
      }
    }

    return stats;
  }
}

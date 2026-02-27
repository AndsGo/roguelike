import Phaser from 'phaser';
import { EnemyData, UnitStats } from '../types';
import { Unit } from './Unit';

export class Enemy extends Unit {
  enemyData: EnemyData;
  level: number;
  goldReward: number;
  expReward: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyData: EnemyData,
    level: number,
  ) {
    const stats = Enemy.calculateStats(enemyData, level);

    super(scene, x, y, enemyData.id, enemyData.name, enemyData.role, stats, false, enemyData.element);

    this.enemyData = enemyData;
    this.level = level;
    this.goldReward = enemyData.goldReward;
    this.expReward = enemyData.expReward;

    // Boss units get special visual treatment
    if (enemyData.isBoss) {
      this.setBoss();
    }
  }

  static calculateStats(data: EnemyData, level: number): UnitStats {
    const scaling = data.scalingPerLevel;
    const base = data.baseStats;

    return {
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
  }
}

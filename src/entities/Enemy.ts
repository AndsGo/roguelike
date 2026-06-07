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
    statMultiplier: number = 1,
  ) {
    const stats = Enemy.calculateStats(enemyData, level, statMultiplier);

    super(scene, x, y, enemyData.id, enemyData.name, enemyData.role, stats, false, enemyData.element,
      enemyData.race ?? 'human', enemyData.class ?? 'warrior', enemyData.spriteKey);

    this.enemyData = enemyData;
    this.monsterType = enemyData.monsterType;
    this.level = level;
    this.goldReward = enemyData.goldReward;
    this.expReward = enemyData.expReward;
    this.aiType = enemyData.aiType ?? 'default';

    // Boss units get special visual treatment
    if (enemyData.isBoss) {
      this.setBoss();
    }
  }

  static calculateStats(data: EnemyData, level: number, statMultiplier: number = 1): UnitStats {
    const scaling = data.scalingPerLevel;
    const base = data.baseStats;
    const m = statMultiplier;

    // statMultiplier (player-selected difficulty) scales offensive/defensive
    // power linearly. Speed/range/crit are left unscaled, matching
    // DifficultySystem.scaleEnemyStats so behaviour stays consistent.
    return {
      maxHp: Math.round((base.maxHp + scaling.maxHp * (level - 1)) * m),
      hp: Math.round((base.maxHp + scaling.maxHp * (level - 1)) * m),
      attack: Math.round((base.attack + scaling.attack * (level - 1)) * m),
      defense: Math.round((base.defense + scaling.defense * (level - 1)) * m),
      magicPower: Math.round((base.magicPower + scaling.magicPower * (level - 1)) * m),
      magicResist: Math.round((base.magicResist + scaling.magicResist * (level - 1)) * m),
      speed: base.speed,
      attackSpeed: base.attackSpeed,
      attackRange: base.attackRange,
      critChance: base.critChance,
      critDamage: base.critDamage,
    };
  }
}

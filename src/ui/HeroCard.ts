import Phaser from 'phaser';
import { HeroData, HeroState } from '../types';
import { RunManager } from '../managers/RunManager';

export class HeroCard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heroData: HeroData,
    heroState: HeroState,
  ) {
    super(scene, x, y);

    const width = 120;
    const height = 150;

    this.bg = scene.add.rectangle(0, 0, width, height, 0x333355, 0.9);
    this.bg.setStrokeStyle(1, 0x6677bb);
    this.add(this.bg);

    // Hero icon placeholder
    const iconColor = this.getRoleColor(heroData.role);
    const icon = scene.add.rectangle(0, -40, 30, 30, iconColor);
    this.add(icon);

    // Name
    const name = scene.add.text(0, -15, heroData.name, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(name);

    // Level
    const level = scene.add.text(0, 0, `Lv.${heroState.level}`, {
      fontSize: '9px',
      color: '#aaaaff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(level);

    // HP
    const rm = RunManager.getInstance();
    const maxHp = rm.getMaxHp(heroState, heroData);
    const hp = scene.add.text(0, 15, `HP: ${heroState.currentHp}/${maxHp}`, {
      fontSize: '9px',
      color: '#44ff44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(hp);

    // Stats summary
    const stats = `ATK:${heroData.baseStats.attack + heroData.scalingPerLevel.attack * (heroState.level - 1)} DEF:${heroData.baseStats.defense + heroData.scalingPerLevel.defense * (heroState.level - 1)}`;
    const statsText = scene.add.text(0, 30, stats, {
      fontSize: '8px',
      color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(statsText);

    // Equipment summary
    const equipNames: string[] = [];
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const item = heroState.equipment[slot];
      if (item) equipNames.push(item.name);
    }
    const equipText = scene.add.text(0, 50, equipNames.length > 0 ? equipNames.join('\n') : '无装备', {
      fontSize: '7px',
      color: '#999999',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
    this.add(equipText);

    scene.add.existing(this);
  }

  private getRoleColor(role: string): number {
    switch (role) {
      case 'tank': return 0x4488ff;
      case 'melee_dps': return 0xff8844;
      case 'ranged_dps': return 0xff4488;
      case 'healer': return 0x44ff88;
      case 'support': return 0xaaaa44;
      default: return 0x888888;
    }
  }
}

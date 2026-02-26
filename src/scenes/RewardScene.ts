import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { BattleResult } from '../types';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';

export class RewardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RewardScene' });
  }

  create(data: { result: BattleResult }): void {
    const result = data.result;
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    this.add.text(GAME_WIDTH / 2, 60, '战斗胜利！', {
      fontSize: '22px',
      color: '#44ff44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Rewards
    this.add.text(GAME_WIDTH / 2, 120, `获得金币: ${result.goldEarned}`, {
      fontSize: '14px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 150, `获得经验: ${result.expEarned}`, {
      fontSize: '14px',
      color: '#88aaff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 190, `存活英雄: ${result.survivors.length}`, {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Show current team status
    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const hd = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, hd);
      this.add.text(GAME_WIDTH / 2, 230 + i * 20, `${hd.name} Lv.${hero.level} HP:${hero.currentHp}/${maxHp}`, {
        fontSize: '10px',
        color: result.survivors.includes(hero.id) ? '#ffffff' : '#ff6666',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, `总金币: ${rm.getGold()}`, {
      fontSize: '12px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, '继续冒险', 160, 40, () => {
      this.scene.start('MapScene');
    });
  }
}

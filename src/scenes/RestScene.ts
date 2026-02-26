import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';

export class RestScene extends Phaser.Scene {
  private nodeIndex!: number;

  constructor() {
    super({ key: 'RestScene' });
  }

  init(data: { nodeIndex: number }): void {
    this.nodeIndex = data.nodeIndex;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111133);

    this.add.text(GAME_WIDTH / 2, 60, '休息点', {
      fontSize: '22px',
      color: '#4488cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 110, '你的队伍在篝火旁休息...', {
      fontSize: '12px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Show current HP before rest
    const heroes = rm.getHeroes();
    this.add.text(GAME_WIDTH / 2, 150, '队伍状态:', {
      fontSize: '11px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      this.add.text(GAME_WIDTH / 2, 175 + i * 20, `${data.name}: ${hero.currentHp}/${maxHp} HP`, {
        fontSize: '10px',
        color: '#cccccc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    new Button(this, GAME_WIDTH / 2, 300, `休息 (恢复${Math.round(REST_HEAL_PERCENT * 100)}% HP)`, 260, 40, () => {
      rm.healAllHeroes(REST_HEAL_PERCENT);
      rm.markNodeCompleted(this.nodeIndex);

      // Show healed status briefly
      this.children.removeAll();
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111133);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '队伍已恢复！', {
        fontSize: '18px',
        color: '#44ff88',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const healedHeroes = rm.getHeroes();
      healedHeroes.forEach((hero, i) => {
        const data = rm.getHeroData(hero.id);
        const maxHp = rm.getMaxHp(hero, data);
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + i * 20, `${data.name}: ${hero.currentHp}/${maxHp} HP`, {
          fontSize: '10px',
          color: '#44ff88',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
      });

      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '继续', 140, 40, () => {
        this.scene.start('MapScene');
      });
    });
  }
}

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    this.add.text(GAME_WIDTH / 2, 80, 'VICTORY!', {
      fontSize: '40px',
      color: '#ffdd44',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 140, '恭喜！你击败了最终Boss！', {
      fontSize: '14px',
      color: '#44ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Final team
    const heroes = rm.getHeroes();
    this.add.text(GAME_WIDTH / 2, 185, '最终阵容:', {
      fontSize: '12px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      this.add.text(GAME_WIDTH / 2, 210 + i * 22, `${data.name} Lv.${hero.level}`, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, 210 + heroes.length * 22 + 20, `最终金币: ${rm.getGold()}`, {
      fontSize: '12px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, '返回主菜单', 180, 45, () => {
      this.scene.start('MainMenuScene');
    });
  }
}

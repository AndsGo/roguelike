import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { BattleResult } from '../types';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';

export class RewardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RewardScene' });
  }

  create(data: { result: BattleResult }): void {
    const result = data.result;
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    const title = this.add.text(GAME_WIDTH / 2, 55, 'VICTORY!', {
      fontSize: '22px',
      color: colorToString(Theme.colors.success),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Rewards with staggered appearance
    const goldText = this.add.text(GAME_WIDTH / 2, 110, `Gold: +${result.goldEarned}`, {
      fontSize: '14px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const expText = this.add.text(GAME_WIDTH / 2, 138, `EXP: +${result.expEarned}`, {
      fontSize: '14px',
      color: '#88aaff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: goldText, alpha: 1, y: 105, delay: 200, duration: 300 });
    this.tweens.add({ targets: expText, alpha: 1, y: 133, delay: 400, duration: 300 });

    // Survivors
    this.add.text(GAME_WIDTH / 2, 170, `Survivors: ${result.survivors.length}`, {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Team status
    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const hd = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, hd);
      const alive = result.survivors.includes(hero.id);
      this.add.text(GAME_WIDTH / 2, 200 + i * 20, `${hd.name} Lv.${hero.level}  HP:${hero.currentHp}/${maxHp}`, {
        fontSize: '10px',
        color: alive ? '#ffffff' : '#ff6666',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, `Total Gold: ${rm.getGold()}`, {
      fontSize: '12px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, 'Continue', 160, 38, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
  }
}

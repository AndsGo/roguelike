import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { BattleResult } from '../types';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { StatsManager } from '../managers/StatsManager';
import { UI } from '../i18n';
import { TextFactory } from '../ui/TextFactory';

export class RewardScene extends Phaser.Scene {
  private result!: BattleResult;

  constructor() {
    super({ key: 'RewardScene' });
  }

  init(data: { result: BattleResult }): void {
    this.result = data.result;
  }

  create(): void {
    const result = this.result;
    const rm = RunManager.getInstance();

    // Guard against missing battle result data
    if (!result) {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);
      TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, UI.reward.title, 'title', {
        color: '#ffffff',
      }).setOrigin(0.5);
      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, UI.reward.continueBtn, 160, 38, () => {
        SceneTransition.fadeTransition(this, 'MapScene');
      });
      return;
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    const title = TextFactory.create(this, GAME_WIDTH / 2, 55, UI.reward.title, 'title', {
      color: colorToString(Theme.colors.success),
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Rewards with staggered appearance
    const goldText = TextFactory.create(this, GAME_WIDTH / 2, 110, UI.reward.gold(result.goldEarned), 'subtitle', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5).setAlpha(0);

    const expText = TextFactory.create(this, GAME_WIDTH / 2, 138, UI.reward.exp(result.expEarned), 'subtitle', {
      color: colorToString(Theme.colors.primary),
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: goldText, alpha: 1, y: 105, delay: 200, duration: 300 });
    this.tweens.add({ targets: expText, alpha: 1, y: 133, delay: 400, duration: 300 });

    // Survivors
    TextFactory.create(this, GAME_WIDTH / 2, 170, UI.reward.survivors(result.survivors.length), 'body', {
      color: colorToString(Theme.colors.textDim),
    }).setOrigin(0.5);

    // Team status
    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const hd = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, hd);
      const alive = result.survivors.includes(hero.id);
      TextFactory.create(this, GAME_WIDTH / 2, 200 + i * 20, `${hd.name} Lv.${hero.level}  HP:${hero.currentHp}/${maxHp}`, 'label', {
        color: alive ? colorToString(Theme.colors.text) : colorToString(Theme.colors.danger),
      }).setOrigin(0.5);
    });

    // Per-hero battle stats
    const runStats = StatsManager.getRunStats();
    const statsY = 200 + heroes.length * 20 + 15;
    TextFactory.create(this, GAME_WIDTH / 2, statsY, UI.reward.battleStatsHeader, 'small', {
      color: '#8899bb',
    }).setOrigin(0.5);

    // Column headers
    const colX = { name: GAME_WIDTH / 2 - 140, dmg: GAME_WIDTH / 2 - 10, heal: GAME_WIDTH / 2 + 60, kills: GAME_WIDTH / 2 + 130 };
    const headerY = statsY + 14;
    TextFactory.create(this, colX.dmg, headerY, UI.reward.dmg, 'tiny', { color: '#888888' }).setOrigin(0.5);
    TextFactory.create(this, colX.heal, headerY, UI.reward.heal, 'tiny', { color: '#888888' }).setOrigin(0.5);
    TextFactory.create(this, colX.kills, headerY, UI.reward.kills, 'tiny', { color: '#888888' }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const hd = rm.getHeroData(hero.id);
      const hs = runStats.heroStats[hero.id];
      const rowY = headerY + 14 + i * 14;
      const alive = result.survivors.includes(hero.id);
      const nameColor = alive ? '#aaaaaa' : '#664444';
      TextFactory.create(this, colX.name, rowY, hd.name, 'tiny', { color: nameColor });
      TextFactory.create(this, colX.dmg, rowY, `${hs?.damage ?? 0}`, 'tiny', { color: '#cc8888' }).setOrigin(0.5);
      TextFactory.create(this, colX.heal, rowY, `${hs?.healing ?? 0}`, 'tiny', { color: '#88cc88' }).setOrigin(0.5);
      TextFactory.create(this, colX.kills, rowY, `${hs?.kills ?? 0}`, 'tiny', { color: '#cccc88' }).setOrigin(0.5);
    });

    TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT - 80, UI.reward.totalGold(rm.getGold()), 'body', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 38, UI.reward.continueBtn, 160, 38, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

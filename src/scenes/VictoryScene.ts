import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from '../ui/Theme';
import { ParticleManager } from '../systems/ParticleManager';
import { RunEndPanel } from '../ui/RunEndPanel';
import { UI } from '../i18n';
import { BaseEndScene } from './BaseEndScene';

export class VictoryScene extends BaseEndScene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Celebration particles
    const particles = new ParticleManager(this);
    particles.createLevelUpEffect(GAME_WIDTH / 2 - 100, 60);
    particles.createLevelUpEffect(GAME_WIDTH / 2 + 100, 60);

    const title = this.createTitle(UI.victory.title, 55, Theme.colors.gold, '40px');

    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500,
    });

    this.createSubtitle(UI.victory.subtitle, 105, colorToString(Theme.colors.success));

    // Meta progression settlement
    const { metaReward, newAchievements } = this.settleRewards(true, rm.getFloor());

    // Final team
    this.add.text(GAME_WIDTH / 2, 135, UI.victory.finalTeam, {
      fontSize: '11px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      this.add.text(GAME_WIDTH / 2, 155 + i * 18, `${data.name} Lv.${hero.level}`, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    const rewardY = 155 + heroes.length * 18 + 15;

    this.add.text(GAME_WIDTH / 2, rewardY, UI.victory.finalGold(rm.getGold()), {
      fontSize: '12px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.createSoulsText(rewardY + 22, UI.victory.soulsEarned(metaReward));

    RunEndPanel.renderRewards(this, GAME_WIDTH / 2, rewardY + 45, newAchievements, UI.victory);

    this.createMainMenuButton(GAME_HEIGHT - 40, UI.victory.mainMenu, Theme.colors.secondary);
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

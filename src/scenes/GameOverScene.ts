import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from '../ui/Theme';
import { RunEndPanel } from '../ui/RunEndPanel';
import { UI } from '../i18n';
import { BaseEndScene } from './BaseEndScene';

export class GameOverScene extends BaseEndScene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a);

    this.createTitle(UI.gameOver.title, 70, Theme.colors.danger);

    this.createSubtitle(UI.gameOver.subtitle, 120, '#888888');

    // Run stats
    const node = rm.getCurrentNode() + 1;
    this.add.text(GAME_WIDTH / 2, 160, UI.gameOver.reached(node), {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 182, UI.gameOver.goldEarned(rm.getGold()), {
      fontSize: '12px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Meta progression settlement
    const { metaReward, newAchievements } = this.settleRewards(false, rm.getFloor());

    this.createSoulsText(215, UI.gameOver.soulsEarned(metaReward));

    RunEndPanel.renderRewards(this, GAME_WIDTH / 2, 240, newAchievements, UI.gameOver);

    this.createMainMenuButton(GAME_HEIGHT - 50, UI.gameOver.mainMenu, Theme.colors.danger);
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

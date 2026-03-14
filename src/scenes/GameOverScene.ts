import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { RunEndContext } from '../managers/MetaManager';
import { Theme, colorToString } from '../ui/Theme';
import { RunEndPanel } from '../ui/RunEndPanel';
import { UI } from '../i18n';
import { BaseEndScene } from './BaseEndScene';
import heroesData from '../data/heroes.json';

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

    // Build run-end context for hero unlock checks
    const heroStates = rm.getHeroes();
    const context: RunEndContext = {
      partyHeroIds: heroStates.map(h => h.id),
      partyElements: heroStates.map(h => {
        const data = (heroesData as { id: string; element: string | null }[]).find(d => d.id === h.id);
        return data?.element ?? undefined;
      }),
      partyRoles: heroStates.map(h => {
        const data = (heroesData as { id: string; role: string }[]).find(d => d.id === h.id);
        return data?.role ?? 'melee_dps';
      }),
      relicCount: rm.getRelics().length,
      difficulty: rm.getDifficulty(),
    };

    // Meta progression settlement
    const { metaReward, newAchievements } = this.settleRewards(false, rm.getFloor(), context);

    this.createSoulsText(215, UI.gameOver.soulsEarned(metaReward));

    RunEndPanel.renderRewards(this, GAME_WIDTH / 2, 240, newAchievements, UI.gameOver);

    // Daily challenge completion
    this.settleDailyChallenge(false, 270);

    // Build review + retry + main menu buttons
    this.createBuildReviewButton(GAME_HEIGHT - 130);
    this.createRetryButton(GAME_HEIGHT - 90);
    this.createMainMenuButton(GAME_HEIGHT - 50, UI.gameOver.mainMenu, Theme.colors.danger);
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

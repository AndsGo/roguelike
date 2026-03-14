import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition, TRANSITION } from '../systems/SceneTransition';
import { RunEndPanel, RunEndResult } from '../ui/RunEndPanel';
import { RunEndContext } from '../managers/MetaManager';
import { DailyChallengeManager } from '../managers/DailyChallengeManager';
import { RunManager } from '../managers/RunManager';
import { BuildReviewPanel } from '../ui/BuildReviewPanel';
import { UI } from '../i18n';
import { TextFactory } from '../ui/TextFactory';

/**
 * Base class for GameOverScene and VictoryScene.
 * Handles shared logic: re-entry guard, meta settlement, title animation, main menu button.
 */
export abstract class BaseEndScene extends Phaser.Scene {
  private rewardsApplied: boolean = false;

  init(): void {
    this.rewardsApplied = false;
  }

  /** Settle meta rewards (guarded against re-entry). */
  protected settleRewards(victory: boolean, floor: number, context?: RunEndContext): RunEndResult {
    if (this.rewardsApplied) {
      return { metaReward: 0, newAchievements: [] };
    }
    this.rewardsApplied = true;
    return RunEndPanel.settle(victory, floor, context);
  }

  /** Create a centered title with scale-in animation. Returns the text object. */
  protected createTitle(
    text: string,
    y: number,
    color: number,
    fontSize: string = '36px',
  ): Phaser.GameObjects.Text {
    const title = TextFactory.create(this, GAME_WIDTH / 2, y, text, 'title', {
      color: colorToString(color),
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    return title;
  }

  /** Create centered subtitle text. */
  protected createSubtitle(text: string, y: number, color: string): Phaser.GameObjects.Text {
    return TextFactory.create(this, GAME_WIDTH / 2, y, text, 'body', {
      color,
    }).setOrigin(0.5);
  }

  /** Create the "return to main menu" button. */
  protected createMainMenuButton(
    y: number,
    label: string,
    color: number,
  ): void {
    new Button(this, GAME_WIDTH / 2, y, label, 180, 45, () => {
      SceneTransition.fadeTransition(this, 'MainMenuScene', undefined, TRANSITION.NORMAL);
    }, color);
  }

  /** Render the souls earned text. */
  protected createSoulsText(
    y: number,
    text: string,
  ): Phaser.GameObjects.Text {
    return TextFactory.create(this, GAME_WIDTH / 2, y, text, 'body', {
      color: colorToString(Theme.colors.secondary),
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  /** Create a "retry" button that jumps directly to HeroDraftScene, preserving difficulty. */
  protected createRetryButton(y: number): void {
    const difficulty = RunManager.getInstance().getDifficulty();
    new Button(this, GAME_WIDTH / 2, y, UI.gameOver.retry, 180, 45, () => {
      SceneTransition.fadeTransition(this, 'HeroDraftScene', { difficulty }, TRANSITION.NORMAL);
    }, Theme.colors.primary);
  }

  /** Create a "build review" button that opens the BuildReviewPanel. */
  protected createBuildReviewButton(y: number): void {
    new Button(this, GAME_WIDTH / 2, y, UI.buildReview.title, 160, 36, () => {
      new BuildReviewPanel(this, () => {});
    }, Theme.colors.panelBorder);
  }

  /** Mark daily challenge complete and display score. Returns the daily score, or 0 if not a daily run. */
  protected settleDailyChallenge(victory: boolean, baseY: number): number {
    const rm = RunManager.getInstance();
    const state = rm.getState();
    if (!state.isDaily) return 0;

    DailyChallengeManager.markCompleted();

    // Calculate score: floor progress * 10 + gold + (victory ? 500 : 0)
    const floorScore = rm.getFloor() * 10;
    const goldScore = rm.getGold();
    const victoryBonus = victory ? 500 : 0;
    const totalScore = floorScore + goldScore + victoryBonus;
    DailyChallengeManager.updateBestScore(totalScore);

    // Display daily challenge completion banner
    TextFactory.create(this, GAME_WIDTH / 2, baseY, `[ ${UI.daily.challengeComplete} ]`, 'body', {
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    TextFactory.create(this, GAME_WIDTH / 2, baseY + 18, UI.daily.score(totalScore), 'body', {
      color: '#ffffff',
    }).setOrigin(0.5);

    // Simulated leaderboard
    const dailySeed = DailyChallengeManager.getTodaysSeed();
    const ghosts = DailyChallengeManager.generateGhostScores(dailySeed);
    const playerEntry = { name: '你', score: totalScore, isPlayer: true };
    const ghostEntries = ghosts.map(g => ({ ...g, isPlayer: false }));
    const leaderboard = [...ghostEntries, playerEntry].sort((a, b) => b.score - a.score);

    TextFactory.create(this, GAME_WIDTH / 2, baseY + 42, UI.daily.leaderboardTitle, 'label', {
      color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);

    leaderboard.forEach((entry, i) => {
      const color = entry.isPlayer ? '#ffdd44' : '#aaaacc';
      const prefix = entry.isPlayer ? '→ ' : '  ';
      const suffix = entry.isPlayer ? ' ←' : '';
      const line = `${prefix}${i + 1}. ${entry.name}  ${entry.score}${suffix}`;
      TextFactory.create(this, GAME_WIDTH / 2, baseY + 60 + i * 16, line, 'small', { color }).setOrigin(0.5);
    });

    const playerRank = leaderboard.findIndex(e => e.isPlayer) + 1;
    TextFactory.create(this, GAME_WIDTH / 2, baseY + 60 + leaderboard.length * 16 + 4, UI.daily.yourRank(playerRank, leaderboard.length), 'small', {
      color: '#888888',
    }).setOrigin(0.5);

    return totalScore;
  }
}

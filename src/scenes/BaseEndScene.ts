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
    const title = this.add.text(GAME_WIDTH / 2, y, text, {
      fontSize,
      color: colorToString(color),
      fontFamily: 'monospace',
      fontStyle: 'bold',
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
    return this.add.text(GAME_WIDTH / 2, y, text, {
      fontSize: '13px',
      color,
      fontFamily: 'monospace',
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
    return this.add.text(GAME_WIDTH / 2, y, text, {
      fontSize: '12px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
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
    this.add.text(GAME_WIDTH / 2, baseY, `[ ${UI.daily.challengeComplete} ]`, {
      fontSize: '13px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, baseY + 18, UI.daily.score(totalScore), {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    return totalScore;
  }
}

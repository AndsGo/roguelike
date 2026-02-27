import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition, TRANSITION } from '../systems/SceneTransition';
import { RunEndPanel, RunEndResult } from '../ui/RunEndPanel';

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
  protected settleRewards(victory: boolean, floor: number): RunEndResult {
    if (this.rewardsApplied) {
      return { metaReward: 0, newAchievements: [] };
    }
    this.rewardsApplied = true;
    return RunEndPanel.settle(victory, floor);
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
}

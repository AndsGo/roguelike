import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { MetaManager } from '../managers/MetaManager';
import { StatsManager } from '../managers/StatsManager';
import { AchievementManager } from '../managers/AchievementManager';
import { SaveManager } from '../managers/SaveManager';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';

export class GameOverScene extends Phaser.Scene {
  private rewardsApplied: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(): void {
    this.rewardsApplied = false;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0a);

    const title = this.add.text(GAME_WIDTH / 2, 70, 'GAME OVER', {
      fontSize: '36px',
      color: colorToString(Theme.colors.danger),
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

    this.add.text(GAME_WIDTH / 2, 120, 'Your team has been defeated...', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Run stats
    const node = rm.getCurrentNode() + 1;
    this.add.text(GAME_WIDTH / 2, 160, `Reached: Stage ${node}`, {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 182, `Gold earned: ${rm.getGold()}`, {
      fontSize: '12px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Meta progression settlement (guard against re-entry)
    let metaReward = 0;
    let newAchievements: string[] = [];
    if (!this.rewardsApplied) {
      this.rewardsApplied = true;
      metaReward = MetaManager.recordRunEnd(false, rm.getFloor());
      StatsManager.finalizeRun(false);
      newAchievements = AchievementManager.checkAchievements();
      SaveManager.deleteSave(0);
    }

    // Show meta reward
    this.add.text(GAME_WIDTH / 2, 215, `Souls earned: +${metaReward}`, {
      fontSize: '12px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    let infoY = 240;

    const maxDisplayedAchievements = 5;
    if (newAchievements.length > 0) {
      this.add.text(GAME_WIDTH / 2, infoY, `Achievements Unlocked: ${newAchievements.length}`, {
        fontSize: '11px',
        color: colorToString(Theme.colors.success),
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      infoY += 18;

      const displayed = newAchievements.slice(0, maxDisplayedAchievements);
      for (const achId of displayed) {
        const def = AchievementManager.getAll().find(a => a.id === achId);
        if (def) {
          this.add.text(GAME_WIDTH / 2, infoY, `- ${def.name}`, {
            fontSize: '9px',
            color: '#aaccff',
            fontFamily: 'monospace',
          }).setOrigin(0.5);
          infoY += 14;
        }
      }

      const remaining = newAchievements.length - maxDisplayedAchievements;
      if (remaining > 0) {
        this.add.text(GAME_WIDTH / 2, infoY, `...and ${remaining} more`, {
          fontSize: '9px',
          color: colorToString(Theme.colors.textDim),
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        infoY += 14;
      }
    }

    // Hero unlocks check
    const meta = MetaManager.getMetaData();
    if (meta.unlockedHeroes.length > 3) {
      // Show unlocked heroes beyond defaults
      const nonDefault = meta.unlockedHeroes.filter(h => !['warrior', 'archer', 'mage'].includes(h));
      if (nonDefault.length > 0) {
        this.add.text(GAME_WIDTH / 2, infoY + 5, `Unlocked heroes: ${nonDefault.join(', ')}`, {
          fontSize: '9px',
          color: '#88cc88',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
      }
    }

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Main Menu', 180, 45, () => {
      SceneTransition.fadeTransition(this, 'MainMenuScene');
    }, Theme.colors.danger);
  }
}

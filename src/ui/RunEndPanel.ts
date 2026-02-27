import Phaser from 'phaser';
import { GAME_WIDTH } from '../constants';
import { MetaManager } from '../managers/MetaManager';
import { StatsManager } from '../managers/StatsManager';
import { AchievementManager } from '../managers/AchievementManager';
import { SaveManager } from '../managers/SaveManager';
import { Theme, colorToString } from './Theme';
import { getHeroDisplayName } from '../i18n';

export interface RunEndResult {
  metaReward: number;
  newAchievements: string[];
}

/**
 * Shared logic for GameOverScene and VictoryScene meta settlement and reward display.
 */
export class RunEndPanel {
  /** Settle meta rewards. Returns metaReward and newAchievements. */
  static settle(victory: boolean, floor: number): RunEndResult {
    const metaReward = MetaManager.recordRunEnd(victory, floor);
    StatsManager.finalizeRun(victory);
    const newAchievements = AchievementManager.checkAchievements();
    SaveManager.deleteSave(0);
    return { metaReward, newAchievements };
  }

  /** Render achievement list + hero unlocks at given y. Returns final y position. */
  static renderRewards(
    scene: Phaser.Scene,
    x: number,
    startY: number,
    newAchievements: string[],
    ui: { achievementsUnlocked: (n: number) => string; andMore: (n: number) => string; unlockedHeroes: (names: string) => string },
  ): number {
    let infoY = startY;
    const maxDisplayedAchievements = 5;

    if (newAchievements.length > 0) {
      scene.add.text(x, infoY, ui.achievementsUnlocked(newAchievements.length), {
        fontSize: '11px',
        color: colorToString(Theme.colors.success),
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      infoY += 18;

      const displayed = newAchievements.slice(0, maxDisplayedAchievements);
      for (const achId of displayed) {
        const def = AchievementManager.getAll().find(a => a.id === achId);
        if (def) {
          scene.add.text(x, infoY, `- ${def.name}`, {
            fontSize: '9px',
            color: '#aaccff',
            fontFamily: 'monospace',
          }).setOrigin(0.5);
          infoY += 14;
        }
      }

      const remaining = newAchievements.length - maxDisplayedAchievements;
      if (remaining > 0) {
        scene.add.text(x, infoY, ui.andMore(remaining), {
          fontSize: '9px',
          color: colorToString(Theme.colors.textDim),
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        infoY += 14;
      }
    }

    // Hero unlocks
    const meta = MetaManager.getMetaData();
    const nonDefault = meta.unlockedHeroes.filter(h => !['warrior', 'archer', 'mage'].includes(h));
    if (nonDefault.length > 0) {
      scene.add.text(x, infoY + 5, ui.unlockedHeroes(nonDefault.map(getHeroDisplayName).join(', ')), {
        fontSize: '9px',
        color: '#88cc88',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      infoY += 19;
    }

    return infoY;
  }
}

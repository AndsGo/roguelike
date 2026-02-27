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
import { ParticleManager } from '../systems/ParticleManager';
import { UI, getHeroDisplayName } from '../i18n';

export class VictoryScene extends Phaser.Scene {
  private rewardsApplied: boolean = false;

  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(): void {
    this.rewardsApplied = false;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e);

    // Celebration particles
    const particles = new ParticleManager(this);
    particles.createLevelUpEffect(GAME_WIDTH / 2 - 100, 60);
    particles.createLevelUpEffect(GAME_WIDTH / 2 + 100, 60);

    const title = this.add.text(GAME_WIDTH / 2, 55, UI.victory.title, {
      fontSize: '40px',
      color: colorToString(Theme.colors.gold),
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

    this.add.text(GAME_WIDTH / 2, 105, UI.victory.subtitle, {
      fontSize: '13px',
      color: colorToString(Theme.colors.success),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Meta progression settlement (guard against re-entry)
    let metaReward = 0;
    let newAchievements: string[] = [];
    if (!this.rewardsApplied) {
      this.rewardsApplied = true;
      metaReward = MetaManager.recordRunEnd(true, rm.getFloor());
      StatsManager.finalizeRun(true);
      newAchievements = AchievementManager.checkAchievements();
      SaveManager.deleteSave(0);
    }

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

    this.add.text(GAME_WIDTH / 2, rewardY + 22, UI.victory.soulsEarned(metaReward), {
      fontSize: '13px',
      color: colorToString(Theme.colors.secondary),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    let infoY = rewardY + 45;

    const maxDisplayedAchievements = 5;
    if (newAchievements.length > 0) {
      this.add.text(GAME_WIDTH / 2, infoY, UI.victory.achievementsUnlocked(newAchievements.length), {
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
        this.add.text(GAME_WIDTH / 2, infoY, UI.victory.andMore(remaining), {
          fontSize: '9px',
          color: colorToString(Theme.colors.textDim),
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        infoY += 14;
      }
    }

    // Check hero unlocks
    const meta = MetaManager.getMetaData();
    const nonDefault = meta.unlockedHeroes.filter(h => !['warrior', 'archer', 'mage'].includes(h));
    if (nonDefault.length > 0) {
      this.add.text(GAME_WIDTH / 2, infoY + 5, UI.victory.unlockedHeroes(nonDefault.map(getHeroDisplayName).join(', ')), {
        fontSize: '10px',
        color: '#88ff88',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, UI.victory.mainMenu, 180, 45, () => {
      SceneTransition.fadeTransition(this, 'MainMenuScene');
    }, Theme.colors.secondary);
  }
}

import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { RunEndContext } from '../managers/MetaManager';
import { Theme, colorToString } from '../ui/Theme';
import { ParticleManager } from '../systems/ParticleManager';
import { RunEndPanel } from '../ui/RunEndPanel';
import { UI } from '../i18n';
import { BaseEndScene } from './BaseEndScene';
import heroesData from '../data/heroes.json';
import { TextFactory } from '../ui/TextFactory';

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
    const { metaReward, newAchievements } = this.settleRewards(true, rm.getFloor(), context);

    // Final team
    TextFactory.create(this, GAME_WIDTH / 2, 135, UI.victory.finalTeam, 'body', {
      color: '#8899cc',
    }).setOrigin(0.5);

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      TextFactory.create(this, GAME_WIDTH / 2, 155 + i * 18, `${data.name} Lv.${hero.level}`, 'label', {
        color: '#ffffff',
      }).setOrigin(0.5);
    });

    const rewardY = 155 + heroes.length * 18 + 15;

    TextFactory.create(this, GAME_WIDTH / 2, rewardY, UI.victory.finalGold(rm.getGold()), 'body', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5);

    this.createSoulsText(rewardY + 22, UI.victory.soulsEarned(metaReward));

    RunEndPanel.renderRewards(this, GAME_WIDTH / 2, rewardY + 45, newAchievements, UI.victory);

    // Daily challenge completion
    this.settleDailyChallenge(true, rewardY + 70);

    // Build review + main menu buttons
    this.createBuildReviewButton(GAME_HEIGHT - 80);
    this.createMainMenuButton(GAME_HEIGHT - 40, UI.victory.mainMenu, Theme.colors.secondary);
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

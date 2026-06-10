import { RunManager } from '../managers/RunManager';
import { StatsManager } from '../managers/StatsManager';
import { RunEndContext } from '../managers/MetaManager';
import { Theme, colorToString } from '../ui/Theme';
import { RunEndPanel } from '../ui/RunEndPanel';
import { UI } from '../i18n';
import { BaseEndScene } from './BaseEndScene';
import heroesData from '../data/heroes.json';
import { TextFactory } from '../ui/TextFactory';
import { fillBackground, view } from '../ui/Viewport';

export class GameOverScene extends BaseEndScene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const v = view(this);
    const rm = RunManager.getInstance();

    fillBackground(this, 0x0a0a0a);

    this.createTitle(UI.gameOver.title, 70, Theme.colors.danger);

    this.createSubtitle(UI.gameOver.subtitle, 120, '#888888');

    // Run stats
    const node = rm.getCurrentNode() + 1;
    TextFactory.create(this, v.cx, 160, UI.gameOver.reached(node), 'body', {
      color: '#aaaaaa',
    }).setOrigin(0.5);

    TextFactory.create(this, v.cx, 182, UI.gameOver.goldEarned(rm.getGold()), 'body', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5);

    // Build run-end context for hero unlock checks
    const heroStates = rm.getHeroes();
    const context: RunEndContext = {
      partyHeroIds: heroStates.map(h => h.id),
      partyElements: heroStates.map(h => {
        const data = (heroesData as { id: string; element: string | null }[]).find(d => d.id === h.id);
        // Event-granted temporaryElement counts toward unlock checks
        return h.temporaryElement ?? data?.element ?? undefined;
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

    RunEndPanel.renderRewards(this, v.cx, 240, newAchievements, UI.gameOver);

    // Daily challenge completion
    this.settleDailyChallenge(false, 270);

    // Run recap — skipped on daily runs (leaderboard occupies this space)
    if (!rm.getState().isDaily) {
      const s = StatsManager.getRunStats();
      let bestHero = '';
      let bestDmg = 0;
      for (const [id, hs] of Object.entries(s.heroStats)) {
        if (hs.damage > bestDmg) {
          bestDmg = hs.damage;
          const data = (heroesData as { id: string; name: string }[]).find(d => d.id === id);
          bestHero = data?.name ?? id;
        }
      }
      const reactionTotal = Object.values(s.elementReactions).reduce((a, b) => a + b, 0);

      TextFactory.create(this, v.cx, 262, UI.gameOver.recapTitle, 'label', {
        color: '#667788',
      }).setOrigin(0.5);
      const line1 = bestHero
        ? `${UI.gameOver.recapBestHero(bestHero, Math.round(bestDmg))} · ${UI.gameOver.recapNodes(s.nodesCompleted)}`
        : UI.gameOver.recapNodes(s.nodesCompleted);
      TextFactory.create(this, v.cx, 278, line1, 'label', {
        color: '#8899aa',
      }).setOrigin(0.5);
      const line2 = `${UI.gameOver.recapCombo(s.maxCombo)} · ${UI.gameOver.recapCrits(s.criticalHits)} · ${UI.gameOver.recapReactions(reactionTotal)}`;
      TextFactory.create(this, v.cx, 293, line2, 'label', {
        color: '#8899aa',
      }).setOrigin(0.5);
    }

    // Build review + retry + main menu buttons — anchor from bottom
    this.createBuildReviewButton(v.vh - 130);
    this.createRetryButton(v.vh - 90);
    this.createMainMenuButton(v.vh - 50, UI.gameOver.mainMenu, Theme.colors.danger);
  }

  shutdown(): void {
    this.tweens.killAll();
  }
}

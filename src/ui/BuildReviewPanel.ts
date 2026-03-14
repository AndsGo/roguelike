import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString, getElementColor, getRarityColor } from './Theme';
import { TextFactory } from './TextFactory';
import { RunManager } from '../managers/RunManager';
import { StatsManager, RunStats } from '../managers/StatsManager';
import { UI, getHeroDisplayName } from '../i18n';
import itemsData from '../data/items.json';
import relicsData from '../data/relics.json';

const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 380;

interface ItemDef {
  id: string;
  name: string;
  rarity: string;
}

interface RelicDef {
  id: string;
  name: string;
  rarity: string;
}

/**
 * Build review panel showing combat stats, hero performance, and equipment/relics
 * at the end of a run. Uses Panel base class for scrollable content.
 */
export class BuildReviewPanel {
  private panel: Panel;
  private scene: Phaser.Scene;
  private backdrop: Phaser.GameObjects.Rectangle;
  private closeText: Phaser.GameObjects.Text;
  private closeHit: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;

    // Semi-transparent backdrop
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.5,
    ).setInteractive({ useHandCursor: true }).setDepth(799);
    this.backdrop.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hw = PANEL_WIDTH / 2;
      const hh = PANEL_HEIGHT / 2;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        this.close();
      }
    });

    this.panel = new Panel(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, {
      title: UI.buildReview.title,
      animate: true,
    });
    this.panel.setDepth(800);

    const stats = StatsManager.getRunStats();
    const rm = RunManager.getInstance();

    let y = -160;

    // ---- Section A: Combat Stats ----
    y = this.renderSectionHeader(UI.buildReview.combatStats, y, Theme.colors.primary);
    y += 4;
    y = this.renderCombatStats(stats, y);
    y += 6;

    // ---- Section B: Hero Performance ----
    y = this.renderSectionHeader(UI.buildReview.heroPerformance, y, Theme.colors.secondary);
    y += 4;
    y = this.renderHeroPerformance(stats, rm, y);
    y += 6;

    // ---- Section C: Equipment & Relics ----
    y = this.renderSectionHeader(UI.buildReview.equipmentRelics, y, Theme.colors.ui.accent);
    y += 4;
    y = this.renderEquipmentAndRelics(rm, y);

    // Set content height for scrolling
    this.panel.setContentHeight(y + 170);

    // ---- Fixed close button ----
    this.closeText = TextFactory.create(
      scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_HEIGHT / 2 - 16,
      UI.buildReview.close, 'label', { color: '#888888' },
    ).setOrigin(0.5).setDepth(801);

    this.closeHit = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_HEIGHT / 2 - 16, 80, 24, 0x000000, 0,
    ).setInteractive({ useHandCursor: true }).setDepth(801);
    this.closeHit.on('pointerdown', () => this.close());
  }

  private renderCombatStats(stats: RunStats, y: number): number {
    const scene = this.scene;

    // Row 1: damage / healing / kills
    const row1 = `${UI.buildReview.totalDamage}: ${Math.round(stats.totalDamage)}  |  ${UI.buildReview.totalHealing}: ${Math.round(stats.totalHealing)}  |  ${UI.buildReview.kills}: ${stats.totalKills}`;
    const row1Text = TextFactory.create(scene, -240, y, row1, 'small', {
      color: '#aabbcc',
    });
    this.panel.addContent(row1Text);
    y += 14;

    // Row 2: crits / max combo / skills used
    const row2 = `${UI.buildReview.crits}: ${stats.criticalHits}  |  ${UI.buildReview.maxCombo}: ${stats.maxCombo}  |  ${UI.buildReview.skillsUsed}: ${stats.skillsUsed}`;
    const row2Text = TextFactory.create(scene, -240, y, row2, 'small', {
      color: '#aabbcc',
    });
    this.panel.addContent(row2Text);
    y += 14;

    // Row 3: element reactions
    const reactionEntries = Object.entries(stats.elementReactions);
    const totalReactions = reactionEntries.reduce((sum, [, count]) => sum + count, 0);
    let reactStr = `${UI.buildReview.reactions}: ${totalReactions}`;
    if (reactionEntries.length > 0) {
      const breakdown = reactionEntries.map(([type, count]) => `${type}:${count}`).join(' ');
      reactStr += `  (${breakdown})`;
    }
    const reactText = TextFactory.create(scene, -240, y, reactStr, 'small', {
      color: '#aabbcc',
    });
    this.panel.addContent(reactText);
    y += 14;

    // Row 4: duration / gold
    const durationStr = this.formatDuration(stats.runDurationMs);
    const row4 = `${UI.buildReview.duration}: ${durationStr}  |  ${UI.buildReview.goldEarned}: ${stats.goldEarned}  |  ${UI.buildReview.goldSpent}: ${stats.goldSpent}`;
    const row4Text = TextFactory.create(scene, -240, y, row4, 'small', {
      color: '#aabbcc',
    });
    this.panel.addContent(row4Text);
    y += 14;

    return y;
  }

  private renderHeroPerformance(stats: RunStats, rm: RunManager, y: number): number {
    const scene = this.scene;
    const heroes = rm.getHeroes();

    for (const heroState of heroes) {
      const heroData = rm.getHeroData(heroState.id);
      const heroStats = stats.heroStats[heroState.id];
      const damage = heroStats?.damage ?? 0;
      const healing = heroStats?.healing ?? 0;
      const kills = heroStats?.kills ?? 0;
      const deaths = heroStats?.deaths ?? 0;

      // Element color dot
      const dotColor = heroData.element ? getElementColor(heroData.element) : 0x888888;
      const dotG = scene.add.graphics();
      dotG.fillStyle(dotColor, 1);
      dotG.fillCircle(-240, y + 5, 4);
      this.panel.addContent(dotG);

      // Hero name + level
      const displayName = getHeroDisplayName(heroState.id);
      const nameStr = `${displayName}  Lv.${heroState.level}`;
      const nameText = TextFactory.create(scene, -230, y, nameStr, 'label', {
        color: '#ffffff',
      });
      this.panel.addContent(nameText);

      // Stats line
      const statsStr = `${UI.buildReview.totalDamage}:${Math.round(damage)}  ${UI.buildReview.totalHealing}:${Math.round(healing)}  ${UI.buildReview.kills}:${kills}  ${UI.buildReview.deaths}:${deaths}`;
      const statsText = TextFactory.create(scene, -80, y, statsStr, 'tiny', {
        color: '#8899aa',
      });
      this.panel.addContent(statsText);

      y += 16;
    }

    return y;
  }

  private renderEquipmentAndRelics(rm: RunManager, y: number): number {
    const scene = this.scene;
    const heroes = rm.getHeroes();

    // Per-hero equipment
    const equipLabel = TextFactory.create(scene, -240, y, `-- ${UI.buildReview.equipment} --`, 'small', {
      color: colorToString(Theme.colors.ui.accent),
    });
    this.panel.addContent(equipLabel);
    y += 14;

    for (const heroState of heroes) {
      const displayName = getHeroDisplayName(heroState.id);
      const nameText = TextFactory.create(scene, -240, y, `${displayName}:`, 'small', {
        color: '#ffffff',
      });
      this.panel.addContent(nameText);

      const equippedItems: string[] = [];
      const slots: Array<'weapon' | 'armor' | 'accessory'> = ['weapon', 'armor', 'accessory'];
      for (const slot of slots) {
        const item = heroState.equipment[slot];
        if (item) {
          // Look up display name from items data
          const itemDef = (itemsData as ItemDef[]).find(i => i.id === item.id);
          equippedItems.push(itemDef?.name ?? item.id);
        }
      }

      const itemStr = equippedItems.length > 0
        ? equippedItems.join(', ')
        : UI.buildReview.noEquipment;
      const itemColor = equippedItems.length > 0 ? '#8899aa' : '#555566';
      const itemText = TextFactory.create(scene, -120, y, itemStr, 'tiny', {
        color: itemColor,
      });
      this.panel.addContent(itemText);

      y += 14;
    }

    y += 6;

    // Relics section
    const relicLabel = TextFactory.create(scene, -240, y, `-- ${UI.buildReview.relics} --`, 'small', {
      color: colorToString(Theme.colors.gold),
    });
    this.panel.addContent(relicLabel);
    y += 14;

    const relics = rm.getRelics();
    if (relics.length === 0) {
      const noRelicText = TextFactory.create(scene, -240, y, UI.runOverview.noRelics, 'small', {
        color: '#666677',
      });
      this.panel.addContent(noRelicText);
      y += 14;
    } else {
      for (const relicState of relics) {
        const relicDef = (relicsData as RelicDef[]).find(r => r.id === relicState.id);
        const rarity = relicDef?.rarity ?? 'common';
        const rarityColor = getRarityColor(rarity);

        const relicName = relicDef?.name ?? relicState.id;
        const relicText = TextFactory.create(scene, -240, y, relicName, 'small', {
          color: colorToString(rarityColor),
          fontStyle: 'bold',
        });
        this.panel.addContent(relicText);
        y += 14;
      }
    }

    return y;
  }

  private renderSectionHeader(label: string, y: number, color: number): number {
    const scene = this.scene;

    const lineG = scene.add.graphics();
    lineG.lineStyle(1, color, 0.3);
    lineG.lineBetween(-245, y, 245, y);
    this.panel.addContent(lineG);
    y += 4;

    const headerText = TextFactory.create(scene, -240, y, `[ ${label} ]`, 'label', {
      color: colorToString(color),
      fontStyle: 'bold',
    });
    this.panel.addContent(headerText);
    y += 16;

    return y;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  close(onComplete?: () => void): void {
    this.backdrop.destroy();
    this.closeText.destroy();
    this.closeHit.destroy();
    this.panel.close(() => {
      this.onCloseCallback();
      if (onComplete) onComplete();
    });
  }
}

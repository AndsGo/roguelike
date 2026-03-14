import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString, getElementColor, getRarityColor, getRoleColor } from './Theme';
import { TextFactory } from './TextFactory';
import { RunManager } from '../managers/RunManager';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import { getDifficultyConfig } from '../config/difficulty';
import { UI, getHeroDisplayName, ROLE_NAMES, RACE_NAMES, CLASS_NAMES } from '../i18n';
import relicsData from '../data/relics.json';
import itemsData from '../data/items.json';

const PANEL_WIDTH = 540;
const PANEL_HEIGHT = 400;

interface RelicDef {
  id: string;
  name: string;
  description: string;
  rarity: string;
}

/**
 * Run overview panel showing team heroes, relics, synergies, and run stats.
 * Uses Panel base class for scrollable content with a fixed close button.
 */
export class RunOverviewPanel {
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
      // Only close when clicking outside the panel area
      const hw = PANEL_WIDTH / 2;
      const hh = PANEL_HEIGHT / 2;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        this.close();
      }
    });

    this.panel = new Panel(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, {
      title: UI.runOverview.title,
      animate: true,
    });
    this.panel.setDepth(800);

    const rm = RunManager.getInstance();

    let y = -160;

    // ---- Section A: Team Heroes ----
    y = this.renderSectionHeader(UI.runOverview.teamHeroes, y, Theme.colors.primary);
    y += 4;

    const heroes = rm.getHeroes();
    for (const heroState of heroes) {
      const heroData = rm.getHeroData(heroState.id);
      const maxHp = rm.getMaxHp(heroState, heroData);
      const hpRatio = heroState.currentHp / maxHp;

      // Element color dot
      const dotColor = heroData.element ? getElementColor(heroData.element) : 0x888888;
      const dotG = scene.add.graphics();
      dotG.fillStyle(dotColor, 1);
      dotG.fillCircle(-240, y + 5, 4);
      this.panel.addContent(dotG);

      // Hero name + level
      const nameStr = `${heroData.name}  Lv.${heroState.level}`;
      const nameText = TextFactory.create(scene, -230, y, nameStr, 'label', {
        color: '#ffffff',
      });
      this.panel.addContent(nameText);

      // HP text
      const hpColor = hpRatio > 0.5 ? colorToString(Theme.colors.health.high)
        : hpRatio > 0.25 ? colorToString(Theme.colors.health.medium)
        : colorToString(Theme.colors.health.low);
      const hpText = TextFactory.create(scene, -80, y, `${heroState.currentHp}/${maxHp}`, 'small', {
        color: hpColor,
      });
      this.panel.addContent(hpText);

      // Role tag
      const roleLabel = heroData.role ?? '';
      if (roleLabel) {
        const roleColor = getRoleColor(roleLabel);
        const roleText = TextFactory.create(scene, 10, y, ROLE_NAMES[roleLabel] ?? roleLabel, 'tiny', {
          color: colorToString(roleColor),
        });
        this.panel.addContent(roleText);
      }

      // Race / Class tags
      const raceName = heroData.race ? (RACE_NAMES[heroData.race] ?? heroData.race) : '';
      const className = heroData.class ? (CLASS_NAMES[heroData.class] ?? heroData.class) : '';
      const tags = [raceName, className].filter(Boolean).join('/');
      if (tags) {
        const tagText = TextFactory.create(scene, 90, y, tags, 'tiny', {
          color: '#8899aa',
        });
        this.panel.addContent(tagText);
      }

      y += 16;
    }

    y += 6;

    // ---- Section B: Relics ----
    y = this.renderSectionHeader(UI.runOverview.relics, y, Theme.colors.gold);
    y += 4;

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

        // Rarity dot
        const dotG = scene.add.graphics();
        dotG.fillStyle(rarityColor, 1);
        dotG.fillCircle(-240, y + 5, 3);
        this.panel.addContent(dotG);

        // Name
        const relicName = relicDef?.name ?? relicState.id;
        const nameText = TextFactory.create(scene, -232, y, relicName, 'small', {
          color: colorToString(rarityColor),
          fontStyle: 'bold',
        });
        this.panel.addContent(nameText);

        // Description (dim, right side)
        const desc = relicDef?.description ?? '';
        const shortDesc = desc.length > 28 ? desc.substring(0, 28) + '...' : desc;
        const descText = TextFactory.create(scene, -100, y, shortDesc, 'tiny', {
          color: '#667788',
        });
        this.panel.addContent(descText);

        y += 14;
      }
    }

    y += 6;

    // ---- Section C: Active Synergies ----
    y = this.renderSectionHeader(UI.runOverview.synergies, y, Theme.colors.secondary);
    y += 4;

    const activeSynergies = rm.getActiveSynergies();
    if (activeSynergies.length === 0) {
      const noSynText = TextFactory.create(scene, -240, y, UI.runOverview.noSynergies, 'small', {
        color: '#666677',
      });
      this.panel.addContent(noSynText);
      y += 14;
    } else {
      for (const as of activeSynergies) {
        const def = SYNERGY_DEFINITIONS.find(s => s.id === as.synergyId);
        if (!def) continue;

        // Synergy name + count
        const nameText = TextFactory.create(scene, -240, y, `${def.name} [${as.count}]`, 'small', {
          color: colorToString(Theme.colors.gold),
          fontStyle: 'bold',
        });
        this.panel.addContent(nameText);
        y += 14;

        // Show thresholds
        for (const threshold of def.thresholds) {
          const reached = as.count >= threshold.count;
          const marker = reached ? '✓' : '○';
          const color = reached ? colorToString(Theme.colors.success) : '#555566';
          const thresholdText = TextFactory.create(scene, -228, y, `${marker} (${threshold.count}) ${threshold.description}`, 'tiny', {
            color,
          });
          this.panel.addContent(thresholdText);
          y += 12;
        }
        y += 2;
      }
    }

    y += 6;

    // ---- Section D: Run Stats ----
    y = this.renderSectionHeader(UI.runOverview.runStats, y, Theme.colors.ui.accent);
    y += 4;

    const diffConfig = getDifficultyConfig(rm.getDifficulty());
    const map = rm.getMap();
    const completedNodes = map.filter(n => n.completed).length;

    const statsLine = [
      UI.runOverview.gold(rm.getGold()),
      UI.runOverview.floor(rm.getCurrentAct() + 1, rm.getFloor()),
      UI.runOverview.difficulty(diffConfig.name),
      `${completedNodes}/${map.length}`,
    ].join('  |  ');

    const statsText = TextFactory.create(scene, -240, y, statsLine, 'small', {
      color: '#aabbcc',
    });
    this.panel.addContent(statsText);
    y += 16;

    y += 6;

    // ---- Section E: Equipment ----
    y = this.renderSectionHeader(UI.runOverview.equipment, y, Theme.colors.ui.accent);
    y += 4;

    for (const heroState of heroes) {
      const heroData = rm.getHeroData(heroState.id);
      const nameText = TextFactory.create(scene, -240, y, heroData.name, 'small', {
        color: '#ffffff',
        fontStyle: 'bold',
      });
      this.panel.addContent(nameText);
      y += 14;

      const slots = ['weapon', 'armor', 'accessory'] as const;
      const slotLabels: Record<string, string> = { weapon: '武器', armor: '防具', accessory: '饰品' };
      for (const slot of slots) {
        const equip = heroState.equipment[slot];
        const slotLabel = slotLabels[slot];
        if (equip) {
          const itemDef = (itemsData as any[]).find((it: any) => it.id === equip.id);
          const itemName = itemDef?.name ?? equip.id;
          const rarityColor = getRarityColor(itemDef?.rarity ?? 'common');
          const itemText = TextFactory.create(scene, -228, y, `${slotLabel}: ${itemName}`, 'tiny', {
            color: colorToString(rarityColor),
          });
          this.panel.addContent(itemText);
        } else {
          const emptyText = TextFactory.create(scene, -228, y, `${slotLabel}: (空)`, 'tiny', {
            color: '#444455',
          });
          this.panel.addContent(emptyText);
        }
        y += 12;
      }
      y += 4;
    }

    // Set content height for scrolling
    this.panel.setContentHeight(y + 170);

    // ---- Fixed close button (outside scrollable content) ----
    this.closeText = TextFactory.create(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_HEIGHT / 2 - 16, UI.runOverview.close, 'label', {
      color: '#888888',
    }).setOrigin(0.5).setDepth(801);

    this.closeHit = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_HEIGHT / 2 - 16, 80, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(801);
    this.closeHit.on('pointerdown', () => this.close());
  }

  private renderSectionHeader(label: string, y: number, color: number): number {
    const scene = this.scene;

    // Section divider line
    const lineG = scene.add.graphics();
    lineG.lineStyle(1, color, 0.3);
    lineG.lineBetween(-245, y, 245, y);
    this.panel.addContent(lineG);
    y += 4;

    // Section title
    const headerText = TextFactory.create(scene, -240, y, `[ ${label} ]`, 'label', {
      color: colorToString(color),
      fontStyle: 'bold',
    });
    this.panel.addContent(headerText);
    y += 16;

    return y;
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

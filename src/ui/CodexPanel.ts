import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString, getRoleColor } from './Theme';
import { TextFactory } from './TextFactory';
import { MetaManager } from '../managers/MetaManager';
import { UI, RACE_NAMES, CLASS_NAMES, ROLE_NAMES, ELEMENT_NAMES } from '../i18n';
import { getOrCreateTexture, getDisplaySize, ChibiConfig } from '../systems/UnitRenderer';
import { CodexDetailPopup } from './CodexDetailPopup';
import heroesData from '../data/heroes.json';
import enemiesData from '../data/enemies.json';
import { HeroData, EnemyData, UnitRole, RaceType, ClassType } from '../types';

const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 400;
const CARD_WIDTH = 90;
const CARD_HEIGHT = 100;
const CARD_GAP = 8;
const COLUMNS = 5;

type TabType = 'hero' | 'monster';

/**
 * Full-screen codex panel showing hero/monster collections.
 * Follows the AchievementPanel pattern (not extending Container).
 */
export class CodexPanel {
  private panel: Panel;
  private scene: Phaser.Scene;
  private backdrop: Phaser.GameObjects.Rectangle;
  private closeText: Phaser.GameObjects.Text;
  private closeHit: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;
  private activeTab: TabType = 'hero';
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private tabBgs: Phaser.GameObjects.Graphics[] = [];
  private tabHits: Phaser.GameObjects.Rectangle[] = [];
  private detailPopup: CodexDetailPopup | null = null;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;

    // Semi-transparent backdrop (click to close)
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.95,
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
      title: UI.codex.title,
      animate: true,
    });
    this.panel.setDepth(800);

    // Create tab buttons (absolute screen position, depth 801)
    this.createTabs();

    // Render initial tab
    this.renderTab();

    // Fixed close button (outside scrollable content)
    this.closeText = TextFactory.create(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_HEIGHT / 2 - 16, UI.codex.close, 'label', {
      color: '#888888',
    }).setOrigin(0.5).setDepth(801);

    this.closeHit = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_HEIGHT / 2 - 16, 80, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(801);
    this.closeHit.on('pointerup', () => this.close());
  }

  private createTabs(): void {
    const tabLabels: { key: TabType; label: string }[] = [
      { key: 'hero', label: UI.codex.heroTab },
      { key: 'monster', label: UI.codex.monsterTab },
    ];

    const tabY = GAME_HEIGHT / 2 - PANEL_HEIGHT / 2 + 38;
    const tabWidth = 100;
    const tabStartX = GAME_WIDTH / 2 - tabWidth - 4;

    for (let i = 0; i < tabLabels.length; i++) {
      const tab = tabLabels[i];
      const tx = tabStartX + i * (tabWidth + 8);

      // Tab background
      const bg = this.scene.add.graphics().setDepth(801);
      this.tabBgs.push(bg);

      // Tab text
      const text = TextFactory.create(this.scene, tx + tabWidth / 2, tabY, tab.label, 'label', {
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(801);
      this.tabButtons.push(text);

      // Tab hit area
      const hit = this.scene.add.rectangle(tx + tabWidth / 2, tabY, tabWidth, 20, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(801);
      this.tabHits.push(hit);
      hit.on('pointerup', () => {
        if (this.activeTab !== tab.key) {
          this.activeTab = tab.key;
          this.renderTab();
        }
      });
    }

    this.updateTabHighlights();
  }

  private updateTabHighlights(): void {
    const tabWidth = 100;
    const tabY = GAME_HEIGHT / 2 - PANEL_HEIGHT / 2 + 38;
    const tabStartX = GAME_WIDTH / 2 - tabWidth - 4;

    for (let i = 0; i < this.tabBgs.length; i++) {
      const bg = this.tabBgs[i];
      const tx = tabStartX + i * (tabWidth + 8);
      const isActive = (i === 0 && this.activeTab === 'hero') || (i === 1 && this.activeTab === 'monster');

      bg.clear();
      bg.fillStyle(isActive ? Theme.colors.primary : 0x333355, isActive ? 0.8 : 0.4);
      bg.fillRoundedRect(tx, tabY - 10, tabWidth, 20, 4);

      this.tabButtons[i].setColor(isActive ? '#ffffff' : '#888899');
    }
  }

  private renderTab(): void {
    this.panel.clearContent();
    this.updateTabHighlights();

    if (this.activeTab === 'hero') {
      this.renderHeroTab();
    } else {
      this.renderMonsterTab();
    }
  }

  private renderHeroTab(): void {
    const heroes = heroesData as HeroData[];
    const unlockedSet = new Set(MetaManager.getUnlockedHeroes());
    const unlockedCount = heroes.filter(h => unlockedSet.has(h.id)).length;

    let y = -140;

    // Summary line
    const summaryText = TextFactory.create(this.scene, 0, y, UI.codex.heroCount(unlockedCount, heroes.length), 'body', {
      color: colorToString(Theme.colors.secondary),
    }).setOrigin(0.5);
    this.panel.addContent(summaryText);
    y += 22;

    // Card grid
    const gridWidth = COLUMNS * CARD_WIDTH + (COLUMNS - 1) * CARD_GAP;
    const startX = -gridWidth / 2;

    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const cardX = startX + col * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      const cardY = y + row * (CARD_HEIGHT + CARD_GAP) + CARD_HEIGHT / 2;
      const isRevealed = unlockedSet.has(hero.id);

      this.renderCard(cardX, cardY, hero, isRevealed, true);
    }

    const totalRows = Math.ceil(heroes.length / COLUMNS);
    this.panel.setContentHeight(totalRows * (CARD_HEIGHT + CARD_GAP) + 80);
  }

  private renderMonsterTab(): void {
    const enemies = enemiesData as EnemyData[];
    const encounteredSet = new Set(MetaManager.getEncounteredEnemies());
    const seenCount = enemies.filter(e => encounteredSet.has(e.id)).length;

    let y = -140;

    // Summary line
    const summaryText = TextFactory.create(this.scene, 0, y, UI.codex.monsterCount(seenCount, enemies.length), 'body', {
      color: colorToString(Theme.colors.secondary),
    }).setOrigin(0.5);
    this.panel.addContent(summaryText);
    y += 22;

    // Card grid
    const gridWidth = COLUMNS * CARD_WIDTH + (COLUMNS - 1) * CARD_GAP;
    const startX = -gridWidth / 2;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const cardX = startX + col * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      const cardY = y + row * (CARD_HEIGHT + CARD_GAP) + CARD_HEIGHT / 2;
      const isRevealed = encounteredSet.has(enemy.id);

      this.renderCard(cardX, cardY, enemy, isRevealed, false);
    }

    const totalRows = Math.ceil(enemies.length / COLUMNS);
    this.panel.setContentHeight(totalRows * (CARD_HEIGHT + CARD_GAP) + 80);
  }

  private renderCard(
    x: number, y: number,
    data: HeroData | EnemyData,
    isRevealed: boolean,
    isHero: boolean,
  ): void {
    const scene = this.scene;

    // Card background
    const cardBg = scene.add.graphics();
    cardBg.fillStyle(isRevealed ? 0x222244 : 0x1a1a2a, 0.6);
    cardBg.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 4);
    cardBg.lineStyle(1, isRevealed ? 0x445588 : 0x333344, 0.8);
    cardBg.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 4);
    this.panel.addContent(cardBg);

    if (isRevealed) {
      // Chibi sprite
      try {
        const isBoss = !isHero && !!(data as EnemyData).isBoss;
        const config: ChibiConfig = {
          role: data.role as UnitRole,
          race: (data.race ?? 'human') as RaceType,
          classType: ((data as HeroData).class ?? 'warrior') as ClassType,
          fillColor: getRoleColor(data.role),
          borderColor: 0x222222,
          isHero,
          isBoss,
        };
        const textureKey = getOrCreateTexture(scene, config);
        const displaySize = getDisplaySize(data.role as UnitRole, isBoss);
        const sprite = scene.add.image(x, y - 12, textureKey);
        // Scale chibi to fit card nicely
        const maxSpriteH = 52;
        const scale = Math.min(1, maxSpriteH / displaySize.h);
        sprite.setScale(scale);
        this.panel.addContent(sprite);
      } catch {
        // Fallback: show placeholder text if texture generation fails
        const placeholder = TextFactory.create(scene, x, y - 12, '?', 'title', {
          color: '#555555',
        }).setOrigin(0.5);
        this.panel.addContent(placeholder);
      }

      // Name
      const nameText = TextFactory.create(scene, x, y + 32, data.name, 'tiny', {
        color: '#ccccdd',
      }).setOrigin(0.5);
      this.panel.addContent(nameText);

      // Boss tag
      if (!isHero && (data as EnemyData).isBoss) {
        const bossTag = TextFactory.create(scene, x + CARD_WIDTH / 2 - 4, y - CARD_HEIGHT / 2 + 4, UI.codex.boss, 'tiny', {
          color: colorToString(Theme.colors.danger),
          fontStyle: 'bold',
        }).setOrigin(1, 0);
        this.panel.addContent(bossTag);
      }

      // Clickable hit area
      const hitArea = scene.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => {
        if (!this.detailPopup) {
          this.detailPopup = new CodexDetailPopup(scene, data, isHero, () => {
            this.detailPopup = null;
          });
        }
      });
      this.panel.addContent(hitArea);
    } else {
      // Unknown entry
      const unknownText = TextFactory.create(scene, x, y - 8, UI.codex.unknown, 'subtitle', {
        color: '#444455',
      }).setOrigin(0.5);
      this.panel.addContent(unknownText);

      const lockedLabel = TextFactory.create(scene, x, y + 32, isHero ? UI.codex.locked : UI.codex.encounterUnlock, 'tiny', {
        color: '#555566',
      }).setOrigin(0.5);
      this.panel.addContent(lockedLabel);
    }
  }

  close(onComplete?: () => void): void {
    // Clean up detail popup if open
    if (this.detailPopup) {
      this.detailPopup.destroy();
      this.detailPopup = null;
    }

    // Clean up tabs
    for (const bg of this.tabBgs) bg.destroy();
    for (const btn of this.tabButtons) btn.destroy();
    for (const hit of this.tabHits) hit.destroy();
    this.tabBgs = [];
    this.tabButtons = [];
    this.tabHits = [];

    this.backdrop.destroy();
    this.closeText.destroy();
    this.closeHit.destroy();
    this.panel.close(() => {
      this.onCloseCallback();
      if (onComplete) onComplete();
    });
  }
}

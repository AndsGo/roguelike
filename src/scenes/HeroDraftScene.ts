import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, colorToString, getRoleColor } from '../ui/Theme';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';
import { MetaManager } from '../managers/MetaManager';
import { SceneTransition } from '../systems/SceneTransition';
import { HeroDetailPopup } from '../ui/HeroDetailPopup';
import { UI, RACE_NAMES, CLASS_NAMES } from '../i18n';
import { HeroData } from '../types';
import heroesData from '../data/heroes.json';
import { AudioManager } from '../systems/AudioManager';
import { calculateSynergyTags, formatSynergyTags } from '../utils/synergy-helpers';
import { TextFactory } from '../ui/TextFactory';

const BASE_MAX_SELECTION = 3;
const MIN_SELECTION = 2;
const CARD_W = 74;
const CARD_H = 100;
const CARD_GAP = 4;
const COLS = 10;

const ELEMENT_LABELS: Record<string, string> = {
  fire: '火', ice: '冰', lightning: '雷', dark: '暗', holy: '圣',
};

const ROLE_SHORT: Record<string, string> = {
  tank: '坦', melee_dps: '战', ranged_dps: '射', healer: '治', support: '辅',
};

export class HeroDraftScene extends Phaser.Scene {
  private selectedIds: string[] = [];
  private cardContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private cardBorders: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private startBtn: Button | null = null;
  private selectionText: Phaser.GameObjects.Text | null = null;
  private synergyText!: Phaser.GameObjects.Text;
  private difficulty: string = 'normal';
  private heroPopup: HeroDetailPopup | null = null;

  constructor() {
    super({ key: 'HeroDraftScene' });
  }

  init(data?: { difficulty?: string }): void {
    this.difficulty = data?.difficulty ?? 'normal';
    this.selectedIds = [];
  }

  create(): void {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Title
    TextFactory.create(this, GAME_WIDTH / 2, 18, UI.heroDraft.title, 'subtitle', {
      color: colorToString(Theme.colors.secondary),
    }).setOrigin(0.5);

    // Subtitle
    const draftMax = BASE_MAX_SELECTION + (MetaManager.hasMutation('extra_draft_pick') ? 1 : 0);
    const subtitleText = draftMax > BASE_MAX_SELECTION ? `选择2-${draftMax}名英雄开始冒险` : UI.heroDraft.subtitle;
    TextFactory.create(this, GAME_WIDTH / 2, 38, subtitleText, 'label', {
      color: '#8899cc',
    }).setOrigin(0.5);

    // All heroes from data
    const allHeroes = heroesData as HeroData[];
    const unlockedHeroes = MetaManager.getUnlockedHeroes();

    // Dynamic multi-row grid layout
    const totalCards = allHeroes.length;
    const rowCount = Math.ceil(totalCards / COLS);
    const gridStartY = 52;

    for (let row = 0; row < rowCount; row++) {
      const rowStart = row * COLS;
      const rowEnd = Math.min(rowStart + COLS, totalCards);
      const colsInRow = rowEnd - rowStart;
      const rowWidth = colsInRow * (CARD_W + CARD_GAP) - CARD_GAP;
      const rowStartX = GAME_WIDTH / 2 - rowWidth / 2;

      for (let col = 0; col < colsInRow; col++) {
        const hero = allHeroes[rowStart + col];
        const x = rowStartX + col * (CARD_W + CARD_GAP) + CARD_W / 2;
        const y = gridStartY + row * (CARD_H + CARD_GAP) + CARD_H / 2;
        this.createHeroCard(hero, x, y, unlockedHeroes.includes(hero.id));
      }
    }

    // Bottom panel: selection info + buttons
    const bottomY = GAME_HEIGHT - 55;
    const bottomBg = this.add.graphics();
    bottomBg.fillStyle(Theme.colors.panel, 0.85);
    bottomBg.fillRoundedRect(0, bottomY - 15, GAME_WIDTH, 70, 0);

    // Selection text
    const maxSelection = BASE_MAX_SELECTION + (MetaManager.hasMutation('extra_draft_pick') ? 1 : 0);
    this.selectionText = TextFactory.create(this, GAME_WIDTH / 2, bottomY, UI.heroDraft.selected(0, maxSelection), 'body', {
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Start button (disabled initially)
    this.startBtn = new Button(
      this, GAME_WIDTH / 2 + 120, bottomY, UI.heroDraft.startBtn, 120, 32,
      () => this.startRun(),
      Theme.colors.primary,
    );
    this.startBtn.setAlpha(0.4);

    // Back button
    new Button(
      this, GAME_WIDTH / 2 - 120, bottomY, UI.heroDraft.backBtn, 80, 32,
      () => SceneTransition.fadeTransition(this, 'MainMenuScene'),
      0x555555,
    );

    this.synergyText = TextFactory.create(this, GAME_WIDTH / 2, bottomY - 28, UI.heroDraft.synergyPlaceholder, 'small', {
      color: '#666666',
    }).setOrigin(0.5);

    this.updateSelectionUI();
  }

  private createHeroCard(hero: HeroData, cx: number, cy: number, unlocked: boolean): void {
    const container = this.add.container(cx, cy);
    this.cardContainers.set(hero.id, container);

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(Theme.colors.panel, unlocked ? 0.9 : 0.4);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 4);
    container.add(bg);

    // Selection border (hidden initially)
    const border = this.add.graphics();
    this.cardBorders.set(hero.id, border);
    container.add(border);

    if (!unlocked) {
      // Locked overlay
      const lockOverlay = this.add.graphics();
      lockOverlay.fillStyle(0x000000, 0.5);
      lockOverlay.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 4);
      container.add(lockOverlay);

      const lockIcon = TextFactory.create(this, 0, -8, '\uD83D\uDD12', 'title', {
      }).setOrigin(0.5);
      container.add(lockIcon);

      const lockedText = TextFactory.create(this, 0, 24, UI.heroDraft.locked, 'tiny', {
        color: '#666666',
      }).setOrigin(0.5);
      container.add(lockedText);
      return;
    }

    // Role color bar at top
    const roleColor = getRoleColor(hero.role);
    const roleBar = this.add.graphics();
    roleBar.fillStyle(roleColor, 0.7);
    roleBar.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 3, 1);
    container.add(roleBar);

    // Hero name
    const nameText = TextFactory.create(this, 0, -CARD_H / 2 + 14, hero.name, 'small', {
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(nameText);

    // Role + Element
    const elemStr = hero.element ? ELEMENT_LABELS[hero.element] ?? '' : '';
    const roleStr = ROLE_SHORT[hero.role] ?? '';
    const tagLine = [roleStr, elemStr].filter(Boolean).join(' ');
    const tagText = TextFactory.create(this, 0, -CARD_H / 2 + 27, tagLine, 'tiny', {
      color: '#88aacc',
    }).setOrigin(0.5);
    container.add(tagText);

    // Race / Class
    const raceStr = hero.race ? (RACE_NAMES[hero.race] ?? hero.race) : '';
    const classStr = hero.class ? (CLASS_NAMES[hero.class] ?? hero.class) : '';
    const raceClass = [raceStr, classStr].filter(Boolean).join('/');
    const rcText = TextFactory.create(this, 0, -CARD_H / 2 + 39, raceClass, 'tiny', {
      color: '#667788',
    }).setOrigin(0.5);
    container.add(rcText);

    // Key stats (added to container so they move with the card)
    const stats = hero.baseStats;
    const atkStr = `攻:${stats.attack}`;
    const defStr = `防:${stats.defense}`;
    const hpStr = `HP:${stats.maxHp}`;

    const hpText = TextFactory.create(this, 0, 2, hpStr, 'tiny', {
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(hpText);
    const atkDefText = TextFactory.create(this, 0, 14, `${atkStr}  ${defStr}`, 'tiny', {
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(atkDefText);

    // Speed / AtkSpd
    const spdStr = `速:${stats.speed}  攻速:${stats.attackSpeed.toFixed(1)}`;
    const spdText = TextFactory.create(this, 0, 26, spdStr, 'tiny', {
      color: '#888888',
    }).setOrigin(0.5);
    container.add(spdText);

    // Hit zone for interaction
    const hitZone = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitZone);

    // Left click: toggle selection
    hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        this.toggleHeroSelection(hero.id);
      }
    });

    // Right click: show detail popup
    hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2) {
        this.showHeroDetail(hero);
      }
    });

    // Hover highlight
    hitZone.on('pointerover', () => {
      if (!this.selectedIds.includes(hero.id)) {
        bg.clear();
        bg.fillStyle(0x334455, 0.95);
        bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 4);
      }
    });
    hitZone.on('pointerout', () => {
      if (!this.selectedIds.includes(hero.id)) {
        bg.clear();
        bg.fillStyle(Theme.colors.panel, 0.9);
        bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 4);
      }
    });

    // Disable right-click context menu
    this.input.mouse?.disableContextMenu();
  }

  private toggleHeroSelection(heroId: string): void {
    const idx = this.selectedIds.indexOf(heroId);
    if (idx >= 0) {
      this.selectedIds.splice(idx, 1);
      AudioManager.getInstance().playSfx('sfx_select');
    } else {
      const maxSelection = BASE_MAX_SELECTION + (MetaManager.hasMutation('extra_draft_pick') ? 1 : 0);
      if (this.selectedIds.length >= maxSelection) return;
      this.selectedIds.push(heroId);
      AudioManager.getInstance().playSfx('sfx_select');
    }
    this.updateSelectionUI();
  }

  private updateSelectionUI(): void {
    // Update selection text
    if (this.selectionText) {
      const maxSelection = BASE_MAX_SELECTION + (MetaManager.hasMutation('extra_draft_pick') ? 1 : 0);
      this.selectionText.setText(UI.heroDraft.selected(this.selectedIds.length, maxSelection));
    }

    // Update start button
    const canStart = this.selectedIds.length >= MIN_SELECTION;
    if (this.startBtn) {
      this.startBtn.setAlpha(canStart ? 1 : 0.4);
    }

    // Update card borders
    for (const [heroId, border] of this.cardBorders) {
      border.clear();
      if (this.selectedIds.includes(heroId)) {
        border.lineStyle(2, 0xffdd44, 1);
        border.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 4);
      }
    }

    this.updateSynergyPreview();
  }

  private updateSynergyPreview(): void {
    if (!this.synergyText) return;
    if (this.selectedIds.length === 0) {
      this.synergyText.setText(UI.heroDraft.synergyPlaceholder);
      this.synergyText.setColor('#666666');
      return;
    }
    const tags = calculateSynergyTags(this.selectedIds);
    const text = formatSynergyTags(tags);
    this.synergyText.setText(text || UI.heroDraft.noSynergy);
    this.synergyText.setColor('#ccaa44');
  }

  private showHeroDetail(hero: HeroData): void {
    if (this.heroPopup) return;
    // Create a temporary HeroState for display
    const tempState = {
      id: hero.id,
      level: 1,
      exp: 0,
      currentHp: hero.baseStats.maxHp,
      equipment: { weapon: null, armor: null, accessory: null },
    };
    this.heroPopup = new HeroDetailPopup(this, hero, tempState);
    this.heroPopup.on('destroy', () => { this.heroPopup = null; });
  }

  private startRun(): void {
    if (this.selectedIds.length < MIN_SELECTION) return;
    const rm = RunManager.getInstance();
    rm.newRun(undefined, this.difficulty, this.selectedIds);
    SceneTransition.fadeTransition(this, 'MapScene');
  }

  shutdown(): void {
    this.tweens.killAll();
    if (this.heroPopup) {
      this.heroPopup.destroy();
      this.heroPopup = null;
    }
  }
}

import Phaser from 'phaser';
import { Theme, colorToString, getRoleColor } from '../ui/Theme';
import { Button } from '../ui/Button';
import { RunManager } from '../managers/RunManager';
import { MetaManager } from '../managers/MetaManager';
import { SceneTransition } from '../systems/SceneTransition';
import { HeroDetailPopup } from '../ui/HeroDetailPopup';
import { UI, RACE_NAMES, CLASS_NAMES, formatUnlockCondition } from '../i18n';
import { HeroData } from '../types';
import heroesData from '../data/heroes.json';
import { AudioManager } from '../systems/AudioManager';
import { calculateSynergyTags, formatSynergyTags } from '../utils/synergy-helpers';
import { TextFactory } from '../ui/TextFactory';
import { getOrCreateTexture, ChibiConfig } from '../systems/UnitRenderer';
import { drawRoleIcon, drawElementIcon } from '../ui/PixelIcons';
import { attachPressInteraction } from '../ui/PressInteraction';
import { applyUiCamera, fillBackground, onViewResize, pointerView, restartOnResize, view } from '../ui/Viewport';
import { getElementColor } from '../ui/Theme';

// Opening draft size. Set to 4 so players can reach a count=4 race/class
// synergy or two count=2 synergies on turn one — count=3/4 thresholds were
// previously unreachable with a 3-hero cap (recruit the 5th via events).
const BASE_MAX_SELECTION = 4;
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
  private gridContainer!: Phaser.GameObjects.Container;
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
    onViewResize(this, () => applyUiCamera(this));
    restartOnResize(this, { difficulty: this.difficulty });
    const v = view(this);

    // Background
    fillBackground(this, Theme.colors.background);

    // Title
    TextFactory.create(this, v.cx, 18, UI.heroDraft.title, 'subtitle', {
      color: colorToString(Theme.colors.secondary),
    }).setOrigin(0.5).setDepth(20);

    // Subtitle
    const draftMax = BASE_MAX_SELECTION + (MetaManager.hasMutation('extra_draft_pick') ? 1 : 0);
    const subtitleText = draftMax > BASE_MAX_SELECTION ? `选择2-${draftMax}名英雄开始冒险` : UI.heroDraft.subtitle;
    TextFactory.create(this, v.cx, 38, subtitleText, 'label', {
      color: '#8899cc',
    }).setOrigin(0.5).setDepth(20);

    // All heroes from data
    const allHeroes = heroesData as HeroData[];
    const unlockedHeroes = MetaManager.getUnlockedHeroes();

    // Responsive grid: column count derives from the viewport width
    const cols = Math.max(4, Math.min(COLS, Math.floor((v.vw - 24) / (CARD_W + CARD_GAP))));
    const totalCards = allHeroes.length;
    const rowCount = Math.ceil(totalCards / cols);
    const gridStartY = 52;

    // Cards live in a container so narrow/short viewports can drag-scroll
    this.gridContainer = this.add.container(0, 0);

    for (let row = 0; row < rowCount; row++) {
      const rowStart = row * cols;
      const rowEnd = Math.min(rowStart + cols, totalCards);
      const colsInRow = rowEnd - rowStart;
      const rowWidth = colsInRow * (CARD_W + CARD_GAP) - CARD_GAP;
      const rowStartX = v.cx - rowWidth / 2;

      for (let col = 0; col < colsInRow; col++) {
        const hero = allHeroes[rowStart + col];
        const x = rowStartX + col * (CARD_W + CARD_GAP) + CARD_W / 2;
        const y = gridStartY + row * (CARD_H + CARD_GAP) + CARD_H / 2;
        this.createHeroCard(hero, x, y, unlockedHeroes.includes(hero.id));
      }
    }

    // Bottom panel: selection info + buttons (above the scrolling grid)
    const bottomY = v.vh - 55;
    const bottomBg = this.add.graphics().setDepth(10);
    bottomBg.fillStyle(Theme.colors.panel, 0.95);
    bottomBg.fillRoundedRect(0, bottomY - 15, v.vw, 70, 0);

    // Selection text
    const maxSelection = BASE_MAX_SELECTION + (MetaManager.hasMutation('extra_draft_pick') ? 1 : 0);
    this.selectionText = TextFactory.create(this, v.cx, bottomY, UI.heroDraft.selected(0, maxSelection), 'body', {
      color: '#aaaacc',
    }).setOrigin(0.5).setDepth(11);

    // Start button (disabled initially)
    this.startBtn = new Button(
      this, v.cx + 120, bottomY, UI.heroDraft.startBtn, 120, 32,
      () => this.startRun(),
      Theme.colors.primary,
    );
    this.startBtn.setEnabled(false);
    this.startBtn.setDepth(11);

    // Back button
    const backBtn = new Button(
      this, v.cx - 120, bottomY, UI.heroDraft.backBtn, 80, 32,
      () => SceneTransition.fadeTransition(this, 'MainMenuScene'),
      0x555555,
    );
    backBtn.setDepth(11);

    this.synergyText = TextFactory.create(this, v.cx, bottomY - 28, UI.heroDraft.synergyPlaceholder, 'small', {
      color: '#666666',
    }).setOrigin(0.5).setDepth(11);

    // Vertical drag-scroll when the grid is taller than the visible area
    const gridHeight = rowCount * (CARD_H + CARD_GAP);
    const visibleH = bottomY - 15 - gridStartY;
    const maxScroll = Math.max(0, gridHeight - visibleH);
    if (maxScroll > 0) {
      let scrollY = 0;
      let dragStartY = 0;
      let scrollStart = 0;
      let dragging = false;
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const pv = pointerView(this, pointer);
        if (pv.y > gridStartY && pv.y < bottomY - 15) {
          dragging = true;
          dragStartY = pv.y;
          scrollStart = scrollY;
        }
      });
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!dragging || !pointer.isDown) { dragging = false; return; }
        const pv = pointerView(this, pointer);
        scrollY = Phaser.Math.Clamp(scrollStart - (pv.y - dragStartY), 0, maxScroll);
        this.gridContainer.y = -scrollY;
      });
      this.input.on('pointerup', () => { dragging = false; });
    }

    this.updateSelectionUI();
  }

  private createHeroCard(hero: HeroData, cx: number, cy: number, unlocked: boolean): void {
    const container = this.add.container(cx, cy);
    this.cardContainers.set(hero.id, container);
    this.gridContainer.add(container);

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

      const lockIcon = TextFactory.create(this, 0, -14, '\uD83D\uDD12', 'title', {
      }).setOrigin(0.5);
      container.add(lockIcon);

      const unlockCond = MetaManager.getHeroUnlockCondition(hero.id);
      const condStr = unlockCond ? formatUnlockCondition(unlockCond) : UI.heroDraft.locked;
      const condText = TextFactory.create(this, 0, 16, condStr, 'tiny', {
        color: '#aa8833',
        // useAdvancedWrap lets spaceless CJK break at character boundaries; without
        // it, Phaser's whitespace-only wrap leaves the unlock string on one line that
        // overflows the narrow (74px) card into neighbouring cells.
        wordWrap: { width: CARD_W - 8, useAdvancedWrap: true },
        align: 'center',
      }).setOrigin(0.5);
      container.add(condText);
      return;
    }

    // Role color border at top
    const roleColor = getRoleColor(hero.role);
    const roleBar = this.add.graphics();
    roleBar.fillStyle(roleColor, 0.9);
    roleBar.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 3, 1);
    container.add(roleBar);

    // Role pixel icon (top-left, 8×8 scale=1)
    const roleIconG = this.add.graphics();
    drawRoleIcon(roleIconG, -CARD_W / 2 + 3, -CARD_H / 2 + 5, hero.role, 1);
    container.add(roleIconG);

    // Element pixel icon (top-right, 8×8 scale=1)
    if (hero.element) {
      const elIconG = this.add.graphics();
      drawElementIcon(elIconG, CARD_W / 2 - 11, -CARD_H / 2 + 5, hero.element, 1);
      container.add(elIconG);
    }

    // Chibi sprite (centered, compact)
    const chibiConfig: ChibiConfig = {
      role: hero.role as ChibiConfig['role'],
      race: (hero.race ?? 'human') as ChibiConfig['race'],
      classType: (hero.class ?? 'warrior') as ChibiConfig['classType'],
      fillColor: roleColor,
      borderColor: 0x000000,
      isHero: true,
      isBoss: false,
    };
    const textureKey = getOrCreateTexture(this, chibiConfig);
    const sprite = this.add.image(0, -16, textureKey).setScale(1.2);
    container.add(sprite);

    // Hero name
    const nameText = TextFactory.create(this, 0, 12, hero.name, 'small', {
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(nameText);

    // Role tag (role-colored)
    const roleStr = ROLE_SHORT[hero.role] ?? '';
    const elemStr = hero.element ? ELEMENT_LABELS[hero.element] ?? '' : '';
    const tagLine = [roleStr, elemStr].filter(Boolean).join(' ');
    const tagText = TextFactory.create(this, 0, 24, tagLine, 'tiny', {
      color: colorToString(roleColor),
    }).setOrigin(0.5);
    container.add(tagText);

    // Key stats summary (compact)
    const stats = hero.baseStats;
    const atkDefText = TextFactory.create(this, 0, 36, `攻:${stats.attack}  防:${stats.defense}`, 'tiny', {
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(atkDefText);

    const spdText = TextFactory.create(this, 0, 46, `速:${stats.speed}  攻速:${stats.attackSpeed.toFixed(1)}`, 'tiny', {
      color: '#888888',
    }).setOrigin(0.5);
    container.add(spdText);

    // Hit zone for interaction
    const hitZone = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitZone);

    // Tap toggles selection; right-click (desktop) or long-press (touch)
    // shows the detail popup.
    attachPressInteraction(this, hitZone, {
      onTap: () => this.toggleHeroSelection(hero.id),
      onSecondary: () => this.showHeroDetail(hero),
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
      this.startBtn.setEnabled(canStart);
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

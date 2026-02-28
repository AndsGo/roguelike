import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Panel } from './Panel';
import { Theme, colorToString } from './Theme';
import { ELEMENT_ADVANTAGE, ELEMENT_REACTIONS, ELEMENT_ADVANTAGE_MULTIPLIER, ELEMENT_DISADVANTAGE_MULTIPLIER } from '../config/elements';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import { ElementType } from '../types';
import { MetaManager } from '../managers/MetaManager';
import { UI, RACE_NAMES, CLASS_NAMES } from '../i18n';
import heroesData from '../data/heroes.json';

const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火', ice: '冰', lightning: '雷', dark: '暗', holy: '光',
};

/**
 * Help/reference panel showing element chart, synergy table, and basic mechanics.
 */
export class HelpPanel {
  private panel: Panel;
  private scene: Phaser.Scene;
  private backdrop: Phaser.GameObjects.Rectangle;
  private closeText: Phaser.GameObjects.Text;
  private closeHit: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;

  private static readonly PANEL_WIDTH = 540;
  private static readonly PANEL_HEIGHT = 400;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;

    // Semi-transparent backdrop (click to close)
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.5,
    ).setInteractive({ useHandCursor: true }).setDepth(799);
    this.backdrop.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only close when clicking outside the panel area
      const hw = HelpPanel.PANEL_WIDTH / 2;
      const hh = HelpPanel.PANEL_HEIGHT / 2;
      if (pointer.x < GAME_WIDTH / 2 - hw || pointer.x > GAME_WIDTH / 2 + hw ||
          pointer.y < GAME_HEIGHT / 2 - hh || pointer.y > GAME_HEIGHT / 2 + hh) {
        this.close();
      }
    });

    this.panel = new Panel(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2, HelpPanel.PANEL_WIDTH, HelpPanel.PANEL_HEIGHT, {
      title: '帮助 / 参考',
      animate: true,
    });
    this.panel.setDepth(800);

    let y = -165;

    // === Element Advantages ===
    const sectionColor = colorToString(Theme.colors.secondary);
    const headerText = scene.add.text(0, y, '元素克制', {
      fontSize: '11px', color: sectionColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.addContent(headerText);
    y += 16;

    // Cycle: fire > ice > lightning > fire, dark <> holy
    const advantageLines = [
      `火 → 冰 → 雷 → 火  (克制 ×${ELEMENT_ADVANTAGE_MULTIPLIER}, 被克 ×${ELEMENT_DISADVANTAGE_MULTIPLIER})`,
      `暗 ↔ 光  (互相克制)`,
    ];
    for (const line of advantageLines) {
      const t = scene.add.text(0, y, line, {
        fontSize: '9px', color: '#aabbcc', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.panel.addContent(t);
      y += 13;
    }
    y += 6;

    // === Element Reactions ===
    const reactHeader = scene.add.text(0, y, '元素反应', {
      fontSize: '11px', color: sectionColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.addContent(reactHeader);
    y += 16;

    for (const [key, reaction] of Object.entries(ELEMENT_REACTIONS)) {
      const [e1, e2] = key.split('+') as ElementType[];
      const line = `${ELEMENT_NAMES[e1]}+${ELEMENT_NAMES[e2]}: ${reaction.name} (×${reaction.damageMultiplier}) — ${reaction.description}`;
      const t = scene.add.text(-240, y, line, {
        fontSize: '8px', color: '#99aabb', fontFamily: 'monospace',
        wordWrap: { width: 480 },
      });
      this.panel.addContent(t);
      y += 12;
    }
    y += 8;

    // === Synergies Summary ===
    const synergyHeader = scene.add.text(0, y, '羁绊效果', {
      fontSize: '11px', color: sectionColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.addContent(synergyHeader);
    y += 16;

    for (const syn of SYNERGY_DEFINITIONS) {
      const thresholdStr = syn.thresholds.map(t => `${t.count}人:${t.description}`).join(' | ');
      const line = `${syn.name}: ${thresholdStr}`;
      const t = scene.add.text(-240, y, line, {
        fontSize: '8px', color: '#99aabb', fontFamily: 'monospace',
        wordWrap: { width: 480 },
      });
      this.panel.addContent(t);
      y += 12;
    }
    y += 8;

    // === Game Mechanics ===
    const mechHeader = scene.add.text(0, y, '游戏机制', {
      fontSize: '11px', color: sectionColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.addContent(mechHeader);
    y += 16;

    const mechanics = [
      '· 英雄自动战斗, 技能就绪时可手动释放 (键盘1-8)',
      '· 暴击 = 攻击×2, 伤害波动±10%',
      '· 每关完成后获得金币和经验, 在商店购买装备',
      '· 遗物提供被动加成, 通过事件或精英战获得',
      '· 相同种族/职业的英雄激活羁绊, 提供团队加成',
    ];
    for (const m of mechanics) {
      const t = scene.add.text(-240, y, m, {
        fontSize: '8px', color: '#8899aa', fontFamily: 'monospace',
        wordWrap: { width: 480 },
      });
      this.panel.addContent(t);
      y += 12;
    }
    y += 10;

    // === Hero Unlock Conditions ===
    const heroHeader = scene.add.text(0, y, UI.heroUnlock.title, {
      fontSize: '11px', color: sectionColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.panel.addContent(heroHeader);
    y += 16;

    const unlockConditions: Record<string, string> = {
      warrior: UI.heroUnlock.default,
      archer: UI.heroUnlock.default,
      mage: UI.heroUnlock.default,
      priest: UI.heroUnlock.victory,
      rogue: UI.heroUnlock.runs3,
    };

    const unlockedHeroes = MetaManager.getUnlockedHeroes();

    for (const hero of heroesData as { id: string; name: string; element: string | null; race: string; class: string }[]) {
      const isUnlocked = unlockedHeroes.includes(hero.id);
      const statusStr = isUnlocked ? UI.heroUnlock.unlocked : UI.heroUnlock.locked;
      const statusColor = isUnlocked ? '#44aa44' : '#aa4444';
      const elementStr = hero.element
        ? ELEMENT_NAMES[hero.element as ElementType] ?? hero.element
        : UI.heroUnlock.noElement;
      const condition = unlockConditions[hero.id] ?? UI.heroUnlock.default;

      const raceCn = RACE_NAMES[hero.race] ?? hero.race;
      const classCn = CLASS_NAMES[hero.class] ?? hero.class;
      const line = `${hero.name}  ${elementStr}  ${raceCn}/${classCn}  [${condition}]`;
      const t = scene.add.text(-240, y, line, {
        fontSize: '8px',
        color: isUnlocked ? '#99aabb' : '#666677',
        fontFamily: 'monospace',
      });
      this.panel.addContent(t);

      const statusText = scene.add.text(230, y, statusStr, {
        fontSize: '8px', color: statusColor, fontFamily: 'monospace',
      });
      this.panel.addContent(statusText);

      y += 12;
    }
    y += 10;

    this.panel.setContentHeight(y + 40 + 165);

    // Fixed close button (outside scrollable content, always visible)
    this.closeText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + HelpPanel.PANEL_HEIGHT / 2 - 16, '[ 关闭 ]', {
      fontSize: '10px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(801);

    this.closeHit = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + HelpPanel.PANEL_HEIGHT / 2 - 16, 80, 24, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(801);
    this.closeHit.on('pointerdown', () => this.close());
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

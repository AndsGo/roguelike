import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { Theme, colorToString } from './Theme';
import { HeroData, EnemyData, UnitRole, RaceType, ClassType } from '../types';
import { MetaManager } from '../managers/MetaManager';
import { UI, STAT_LABELS, RACE_NAMES, CLASS_NAMES, ROLE_NAMES, ELEMENT_NAMES } from '../i18n';
import { getOrCreateTexture, getDisplaySize, ChibiConfig } from '../systems/UnitRenderer';
import skillsData from '../data/skills.json';

const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 340;

/**
 * Detail popup overlay for a single codex entry (hero or monster).
 * Follows the HeroDetailPopup pattern (extends Container).
 */
export class CodexDetailPopup extends Phaser.GameObjects.Container {
  private backdrop: Phaser.GameObjects.Rectangle;
  private onCloseCallback: () => void;

  constructor(
    scene: Phaser.Scene,
    data: HeroData | EnemyData,
    isHero: boolean,
    onClose: () => void,
  ) {
    super(scene, 0, 0);
    this.setDepth(802);
    this.onCloseCallback = onClose;

    // Semi-transparent backdrop
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.4,
    ).setInteractive({ useHandCursor: true });
    this.add(this.backdrop);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Panel background
    const panel = scene.add.graphics();
    panel.fillStyle(Theme.colors.panel, 0.95);
    panel.fillRoundedRect(cx - POPUP_WIDTH / 2, cy - POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 8);
    panel.lineStyle(2, Theme.colors.panelBorder, 1);
    panel.strokeRoundedRect(cx - POPUP_WIDTH / 2, cy - POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 8);
    this.add(panel);

    const leftX = cx - POPUP_WIDTH / 2 + 20;
    const topY = cy - POPUP_HEIGHT / 2 + 20;

    // ---- Left side: Chibi sprite ----
    const isBoss = !isHero && !!(data as EnemyData).isBoss;
    try {
      const config: ChibiConfig = {
        role: data.role as UnitRole,
        race: (data.race ?? 'human') as RaceType,
        classType: ((data as HeroData).class ?? 'warrior') as ClassType,
        fillColor: Theme.colors.role[data.role] ?? 0xaaaaaa,
        borderColor: 0x222222,
        isHero,
        isBoss,
      };
      const textureKey = getOrCreateTexture(scene, config);
      const displaySize = getDisplaySize(data.role as UnitRole, isBoss);
      const targetHeight = 80;
      const scale = Math.min(2, targetHeight / displaySize.h);
      const sprite = scene.add.image(leftX + 40, topY + 50, textureKey).setScale(scale);
      this.add(sprite);
    } catch {
      // Fallback placeholder
      const placeholder = scene.add.text(leftX + 40, topY + 50, '?', {
        fontSize: '32px',
        color: '#555555',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add(placeholder);
    }

    // ---- Right side: Info ----
    const infoX = leftX + 100;
    let infoY = topY;

    // Name (bold)
    const nameText = scene.add.text(infoX, infoY, data.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.add(nameText);
    infoY += 20;

    // Tags: race / class / element / role
    const tags: string[] = [];
    if (data.race) tags.push(RACE_NAMES[data.race] ?? data.race);
    if ((data as HeroData).class) tags.push(CLASS_NAMES[(data as HeroData).class!] ?? (data as HeroData).class!);
    if (data.element) tags.push(ELEMENT_NAMES[data.element] ?? data.element);
    tags.push(ROLE_NAMES[data.role] ?? data.role);

    const tagsText = scene.add.text(infoX, infoY, tags.join(' / '), {
      fontSize: '9px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });
    this.add(tagsText);
    infoY += 18;

    // Boss tag
    if (isBoss) {
      const bossTag = scene.add.text(infoX + tagsText.width + 8, infoY - 18, UI.codex.boss, {
        fontSize: '9px',
        color: colorToString(Theme.colors.danger),
        fontFamily: 'monospace',
        fontStyle: 'bold',
      });
      this.add(bossTag);
    }

    // ---- Base Stats (2 columns, 5 stats each) ----
    const statsHeaderText = scene.add.text(infoX, infoY, UI.codex.baseStats, {
      fontSize: '10px',
      color: '#ffdd88',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.add(statsHeaderText);
    infoY += 16;

    const stats = data.baseStats;
    const leftStats: { key: string; value: number; isPercent?: boolean; suffix?: string }[] = [
      { key: 'maxHp', value: stats.maxHp },
      { key: 'attack', value: stats.attack },
      { key: 'defense', value: stats.defense },
      { key: 'magicPower', value: stats.magicPower },
      { key: 'magicResist', value: stats.magicResist },
    ];
    const rightStats: { key: string; value: number; isPercent?: boolean; suffix?: string }[] = [
      { key: 'speed', value: stats.speed },
      { key: 'attackSpeed', value: stats.attackSpeed, suffix: 'x' },
      { key: 'attackRange', value: stats.attackRange },
      { key: 'critChance', value: stats.critChance, isPercent: true },
      { key: 'critDamage', value: stats.critDamage, suffix: 'x' },
    ];

    const statColX = infoX;
    const statCol2X = infoX + 140;

    for (let i = 0; i < leftStats.length; i++) {
      const s = leftStats[i];
      const label = STAT_LABELS[s.key] ?? s.key;
      const valueStr = this.formatStatValue(s.value, s.isPercent, s.suffix);
      const t = scene.add.text(statColX, infoY + i * 14, `${label}: ${valueStr}`, {
        fontSize: '9px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      });
      this.add(t);
    }

    for (let i = 0; i < rightStats.length; i++) {
      const s = rightStats[i];
      const label = STAT_LABELS[s.key] ?? s.key;
      const valueStr = this.formatStatValue(s.value, s.isPercent, s.suffix);
      const t = scene.add.text(statCol2X, infoY + i * 14, `${label}: ${valueStr}`, {
        fontSize: '9px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      });
      this.add(t);
    }

    infoY += leftStats.length * 14 + 8;

    // ---- Monster rewards ----
    if (!isHero) {
      const enemy = data as EnemyData;
      const rewardText = scene.add.text(infoX, infoY, UI.codex.rewards(enemy.goldReward, enemy.expReward), {
        fontSize: '9px',
        color: colorToString(Theme.colors.gold),
        fontFamily: 'monospace',
      });
      this.add(rewardText);
      infoY += 16;
    }

    // ---- Skills section ----
    const skillHeader = scene.add.text(infoX, infoY, UI.codex.skills, {
      fontSize: '10px',
      color: '#88aaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.add(skillHeader);
    infoY += 16;

    const allSkills = skillsData as { id: string; name: string; description: string }[];
    if (data.skills.length === 0) {
      const noSkillText = scene.add.text(infoX + 8, infoY, UI.codex.noSkills, {
        fontSize: '9px',
        color: '#555566',
        fontFamily: 'monospace',
      });
      this.add(noSkillText);
      infoY += 14;
    } else {
      for (const skillId of data.skills) {
        const skill = allSkills.find(s => s.id === skillId);
        const name = skill?.name ?? skillId;
        const desc = skill?.description ?? '';
        const shortDesc = desc.length > 35 ? desc.substring(0, 35) + '...' : desc;
        const t = scene.add.text(infoX + 8, infoY, `${name} - ${shortDesc}`, {
          fontSize: '9px',
          color: '#aabbdd',
          fontFamily: 'monospace',
          wordWrap: { width: POPUP_WIDTH - 140 },
        });
        this.add(t);
        infoY += 14;
      }
    }

    // ---- Hero unlock condition (if locked) ----
    if (isHero && !MetaManager.isHeroUnlocked(data.id)) {
      infoY += 4;
      const cond = MetaManager.getHeroUnlockCondition(data.id);
      if (cond) {
        const unlockText = scene.add.text(infoX, infoY, `${UI.codex.unlockCondition}: ${cond.description}`, {
          fontSize: '9px',
          color: '#ff8866',
          fontFamily: 'monospace',
        });
        this.add(unlockText);
      }
    }

    // ---- Close instruction ----
    const closeText = scene.add.text(cx, cy + POPUP_HEIGHT / 2 - 14, '[ 点击关闭 ]', {
      fontSize: '9px',
      color: '#666677',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add(closeText);

    // Click backdrop to close
    this.backdrop.on('pointerdown', () => this.close());

    // Animate in
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 150,
      ease: 'Sine.easeOut',
    });

    scene.add.existing(this);
  }

  private formatStatValue(value: number, isPercent?: boolean, suffix?: string): string {
    if (isPercent) {
      return `${Math.round(value * 100)}%`;
    }
    if (suffix === 'x') {
      return value.toFixed(1);
    }
    return `${Math.round(value)}`;
  }

  close(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.onCloseCallback();
        this.destroy();
      },
    });
  }
}

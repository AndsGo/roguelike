import Phaser from 'phaser';
import { HeroData, HeroState, EquipmentSlot, SkillAdvancement, UnitStats } from '../types';
import { RunManager } from '../managers/RunManager';
import { Theme, colorToString } from './Theme';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { STAT_LABELS, SLOT_LABELS, formatStat, ELEMENT_NAMES, RACE_NAMES, CLASS_NAMES } from '../i18n';
import { expForLevel } from '../utils/math';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import skillsData from '../data/skills.json';
import advancementsData from '../data/skill-advancements.json';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 430;

/**
 * Full-detail hero popup overlay. Shows all stats, equipment, and skills.
 * Click outside to dismiss.
 */
export class HeroDetailPopup extends Phaser.GameObjects.Container {
  private backdrop: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, heroData: HeroData, heroState: HeroState) {
    super(scene, 0, 0);
    this.setDepth(800);

    // Semi-transparent backdrop (full screen)
    this.backdrop = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.5,
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

    const rm = RunManager.getInstance();
    const maxHp = rm.getMaxHp(heroState, heroData);
    const scaling = heroData.scalingPerLevel;
    const lvl = heroState.level;

    // ---- Header: Name / Level / Element / Race / Class ----
    const topY = cy - POPUP_HEIGHT / 2 + 18;

    const elementLabel = heroData.element ? ` [${ELEMENT_NAMES[heroData.element] ?? heroData.element}]` : '';
    const raceLabel = heroData.race ? (RACE_NAMES[heroData.race] ?? heroData.race) : '';
    const classLabel = heroData.class ? (CLASS_NAMES[heroData.class] ?? heroData.class) : '';
    const subtags = [raceLabel, classLabel].filter(Boolean).join(' / ');

    scene.add.text(cx, topY, `${heroData.name}  Lv.${heroState.level}${elementLabel}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(801);
    this.add(this.list[this.list.length - 1]);

    if (subtags) {
      scene.add.text(cx, topY + 16, subtags, {
        fontSize: '9px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(801);
      this.add(this.list[this.list.length - 1]);
    }

    // ---- EXP Progress Bar ----
    const expBarY = topY + 30;
    const expNeeded = expForLevel(heroState.level);
    const expRatio = Math.min(1, heroState.exp / expNeeded);
    const expBarWidth = 200;
    const expBarHeight = 6;

    const expG = scene.add.graphics().setDepth(801);
    expG.fillStyle(0x333344, 1);
    expG.fillRoundedRect(cx - expBarWidth / 2, expBarY, expBarWidth, expBarHeight, 2);
    expG.fillStyle(Theme.colors.secondary, 1);
    expG.fillRoundedRect(cx - expBarWidth / 2, expBarY, expBarWidth * expRatio, expBarHeight, 2);
    this.add(expG);

    const expText = scene.add.text(cx + expBarWidth / 2 + 6, expBarY - 1, `${heroState.exp}/${expNeeded}`, {
      fontSize: '8px',
      color: '#8899aa',
      fontFamily: 'monospace',
    }).setDepth(801);
    this.add(expText);

    // ---- Effective Stats: base + equip + synergy = final ----
    const statsStartY = expBarY + 16;
    const leftX = cx - POPUP_WIDTH / 2 + 20;
    const rightX = cx + 10;

    // Compute equipment bonuses
    const equipBonus: Partial<UnitStats> = {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const equip = heroState.equipment[slot];
      if (equip) {
        for (const [k, v] of Object.entries(equip.stats)) {
          (equipBonus as Record<string, number>)[k] = ((equipBonus as Record<string, number>)[k] ?? 0) + (v as number);
        }
      }
    }

    // Compute synergy bonuses (stat_boost type only)
    const synergyBonus: Partial<UnitStats> = {};
    const activeSynergies = rm.getActiveSynergies();
    for (const as of activeSynergies) {
      const def = SYNERGY_DEFINITIONS.find(s => s.id === as.synergyId);
      if (!def) continue;
      for (const threshold of def.thresholds) {
        if (as.count >= threshold.count) {
          for (const eff of threshold.effects) {
            if (eff.type === 'stat_boost' && eff.stat) {
              (synergyBonus as Record<string, number>)[eff.stat] =
                ((synergyBonus as Record<string, number>)[eff.stat] ?? 0) + (eff.value ?? 0);
            }
          }
        }
      }
    }

    // Base stats (level-scaled)
    const baseAtk = heroData.baseStats.attack + scaling.attack * (lvl - 1);
    const baseDef = heroData.baseStats.defense + scaling.defense * (lvl - 1);
    const baseMp = heroData.baseStats.magicPower + scaling.magicPower * (lvl - 1);
    const baseMr = heroData.baseStats.magicResist + scaling.magicResist * (lvl - 1);
    const baseMaxHp = heroData.baseStats.maxHp + scaling.maxHp * (lvl - 1);

    const statKeys: { label: string; key: keyof UnitStats; base: number; isPercent?: boolean; suffix?: string }[] = [
      { label: STAT_LABELS.attack, key: 'attack', base: baseAtk },
      { label: STAT_LABELS.defense, key: 'defense', base: baseDef },
      { label: STAT_LABELS.maxHp, key: 'maxHp', base: baseMaxHp },
      { label: STAT_LABELS.magicPower, key: 'magicPower', base: baseMp },
      { label: STAT_LABELS.magicResist, key: 'magicResist', base: baseMr },
    ];

    const rightStatKeys: { label: string; key: keyof UnitStats; base: number; isPercent?: boolean; suffix?: string }[] = [
      { label: STAT_LABELS.speed, key: 'speed', base: heroData.baseStats.speed },
      { label: STAT_LABELS.attackSpeed, key: 'attackSpeed', base: heroData.baseStats.attackSpeed, suffix: 'x' },
      { label: STAT_LABELS.critChance, key: 'critChance', base: heroData.baseStats.critChance, isPercent: true },
      { label: STAT_LABELS.critDamage, key: 'critDamage', base: heroData.baseStats.critDamage, suffix: 'x' },
      { label: STAT_LABELS.attackRange, key: 'attackRange', base: heroData.baseStats.attackRange },
    ];

    const renderStatLine = (x: number, y: number, label: string, key: keyof UnitStats, base: number, isPercent?: boolean, suffix?: string): void => {
      const eqb = (equipBonus as Record<string, number>)[key] ?? 0;
      const syb = (synergyBonus as Record<string, number>)[key] ?? 0;
      const total = base + eqb + syb;

      let valueStr: string;
      if (isPercent) {
        valueStr = `${Math.round(total * 100)}%`;
      } else if (suffix === 'x') {
        valueStr = `${total.toFixed(1)}`;
      } else {
        valueStr = `${Math.round(total)}`;
      }

      // HP special: show current/max
      if (key === 'maxHp') {
        valueStr = `${heroState.currentHp}/${Math.round(total)}`;
      }

      const mainText = scene.add.text(x, y, `${label}: ${valueStr}`, {
        fontSize: '10px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      }).setDepth(801);
      this.add(mainText);

      // Show bonus breakdown inline
      const bonusParts: string[] = [];
      if (eqb !== 0) {
        const eqStr = isPercent ? `${Math.round(eqb * 100)}%` : suffix === 'x' ? eqb.toFixed(1) : `${Math.round(eqb)}`;
        bonusParts.push(`+${eqStr}`);
      }
      if (syb !== 0) {
        const syStr = isPercent ? `${Math.round(syb * 100)}%` : suffix === 'x' ? syb.toFixed(1) : `${Math.round(syb)}`;
        bonusParts.push(`+${syStr}`);
      }

      if (bonusParts.length > 0) {
        let offsetX = mainText.width + 4;
        if (eqb !== 0) {
          const eqStr = isPercent ? `${Math.round(eqb * 100)}%` : suffix === 'x' ? eqb.toFixed(1) : `${Math.round(eqb)}`;
          const eqText = scene.add.text(x + offsetX, y, `+${eqStr}`, {
            fontSize: '9px',
            color: colorToString(Theme.colors.success),
            fontFamily: 'monospace',
          }).setDepth(801);
          this.add(eqText);
          offsetX += eqText.width + 2;
        }
        if (syb !== 0) {
          const syStr = isPercent ? `${Math.round(syb * 100)}%` : suffix === 'x' ? syb.toFixed(1) : `${Math.round(syb)}`;
          const syText = scene.add.text(x + offsetX, y, `+${syStr}`, {
            fontSize: '9px',
            color: colorToString(Theme.colors.gold),
            fontFamily: 'monospace',
          }).setDepth(801);
          this.add(syText);
        }
      }
    };

    for (let i = 0; i < statKeys.length; i++) {
      const s = statKeys[i];
      renderStatLine(leftX, statsStartY + i * 16, s.label, s.key, s.base, s.isPercent, s.suffix);
    }

    for (let i = 0; i < rightStatKeys.length; i++) {
      const s = rightStatKeys[i];
      renderStatLine(rightX, statsStartY + i * 16, s.label, s.key, s.base, s.isPercent, s.suffix);
    }

    // ---- Equipment (3 slots) ----
    const equipY = statsStartY + statKeys.length * 16 + 10;
    const equipLabel = scene.add.text(leftX, equipY, '装备:', {
      fontSize: '10px',
      color: '#ffdd88',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(801);
    this.add(equipLabel);

    const slotNames: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
    for (let i = 0; i < slotNames.length; i++) {
      const slot = slotNames[i];
      const item = heroState.equipment[slot];
      const slotLabel = SLOT_LABELS[slot] ?? slot;
      let line: string;
      if (item) {
        const statParts = Object.entries(item.stats)
          .map(([k, v]) => `${STAT_LABELS[k] ?? k}+${v}`)
          .join(' ');
        line = `  ${slotLabel}: ${item.name} (${statParts})`;
      } else {
        line = `  ${slotLabel}: (空)`;
      }
      const t = scene.add.text(leftX, equipY + 16 + i * 14, line, {
        fontSize: '9px',
        color: item ? colorToString(Theme.colors.rarity[item.rarity] ?? 0xaaaaaa) : '#666666',
        fontFamily: 'monospace',
        wordWrap: { width: POPUP_WIDTH - 40 },
      }).setDepth(801);
      this.add(t);
    }

    // ---- Skills ----
    const skillY = equipY + 16 + slotNames.length * 14 + 10;
    const skillLabel = scene.add.text(leftX, skillY, '技能:', {
      fontSize: '10px',
      color: '#88aaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(801);
    this.add(skillLabel);

    const allSkills = skillsData as { id: string; name: string; description: string }[];
    const allAdvancements = advancementsData as SkillAdvancement[];
    let skillRowY = skillY + 16;
    heroData.skills.forEach((skillId) => {
      const skill = allSkills.find(s => s.id === skillId);
      const name = skill?.name ?? skillId;
      const desc = skill?.description ?? '';
      const shortDesc = desc.length > 30 ? desc.substring(0, 30) + '...' : desc;
      const t = scene.add.text(leftX, skillRowY, `  ${name} - ${shortDesc}`, {
        fontSize: '9px',
        color: '#aabbdd',
        fontFamily: 'monospace',
        wordWrap: { width: POPUP_WIDTH - 40 },
      }).setDepth(801);
      this.add(t);
      skillRowY += 14;

      // Show advancement progress with bonus details
      const advs = allAdvancements
        .filter(a => a.skillId === skillId)
        .sort((a, b) => a.level - b.level);
      for (const adv of advs) {
        const unlocked = heroState.level >= adv.requiredHeroLevel;
        const marker = unlocked ? '★' : '☆';
        // Build bonus summary
        const bonusParts: string[] = [];
        if (adv.bonuses) {
          if (adv.bonuses.baseDamage) bonusParts.push(`伤害+${adv.bonuses.baseDamage}`);
          if (adv.bonuses.scalingRatio) bonusParts.push(`倍率+${Math.round(adv.bonuses.scalingRatio * 100)}%`);
          if (adv.bonuses.cooldown) bonusParts.push(`冷却${adv.bonuses.cooldown}s`);
          if (adv.bonuses.range) bonusParts.push(`射程+${adv.bonuses.range}`);
          if (adv.bonuses.aoeRadius) bonusParts.push(`范围+${adv.bonuses.aoeRadius}`);
          if (adv.bonuses.effectDuration) bonusParts.push(`持续+${adv.bonuses.effectDuration}s`);
        }
        const bonusStr = bonusParts.length > 0 ? ` (${bonusParts.join(', ')})` : '';
        const advText = scene.add.text(leftX + 12, skillRowY, `${marker} Lv${adv.requiredHeroLevel}: ${adv.name}${bonusStr}`, {
          fontSize: '8px',
          color: unlocked ? '#88ff88' : '#555566',
          fontFamily: 'monospace',
          wordWrap: { width: POPUP_WIDTH - 60 },
        }).setDepth(801);
        this.add(advText);
        skillRowY += 12;
      }
    });

    // ---- Active Synergies ----
    if (activeSynergies.length > 0) {
      const synY = skillRowY + 6;
      const synLabel = scene.add.text(leftX, synY, '羁绊:', {
        fontSize: '10px',
        color: colorToString(Theme.colors.gold),
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setDepth(801);
      this.add(synLabel);

      let synRowY = synY + 16;
      for (const as of activeSynergies) {
        const def = SYNERGY_DEFINITIONS.find(s => s.id === as.synergyId);
        if (!def) continue;
        // Find next threshold
        const nextThreshold = def.thresholds.find(t => t.count > as.count);
        const nextStr = nextThreshold ? ` (下一级: ${as.count}/${nextThreshold.count})` : ' (已满)';
        const activeThresholdDef = def.thresholds.filter(t => as.count >= t.count).pop();
        const effectDesc = activeThresholdDef?.description ?? '';
        const synText = scene.add.text(leftX + 4, synRowY, `${def.name} [${as.count}]: ${effectDesc}${nextStr}`, {
          fontSize: '8px',
          color: '#ddcc88',
          fontFamily: 'monospace',
          wordWrap: { width: POPUP_WIDTH - 50 },
        }).setDepth(801);
        this.add(synText);
        synRowY += 12;
      }
    }

    // ---- Close instruction ----
    scene.add.text(cx, cy + POPUP_HEIGHT / 2 - 14, '[ 点击关闭 ]', {
      fontSize: '9px',
      color: '#666677',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(801);
    this.add(this.list[this.list.length - 1]);

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

  close(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}

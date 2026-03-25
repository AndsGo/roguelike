import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { SkillEvolution, SkillData } from '../types';
import { Theme, colorToString } from './Theme';
import { Button } from './Button';
import { UI } from '../i18n';
import { TextFactory } from './TextFactory';
import { AudioManager } from '../systems/AudioManager';

export class SkillEvolutionPanel {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private branches: SkillEvolution[];
  private baseSkill: SkillData;
  private onSelect: (evolutionId: string) => void;

  constructor(
    scene: Phaser.Scene,
    heroName: string,
    branches: SkillEvolution[],
    baseSkill: SkillData,
    onSelect: (evolutionId: string) => void,
  ) {
    this.scene = scene;
    this.branches = branches;
    this.baseSkill = baseSkill;
    this.onSelect = onSelect;
    this.build(heroName);
  }

  private build(heroName: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelW = 480;
    const panelH = 320;

    // Backdrop (no close-on-click — player must choose a branch)
    const backdrop = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive().setDepth(799);
    this.elements.push(backdrop);

    // Panel background
    const bg = this.scene.add.graphics().setDepth(800);
    bg.fillStyle(Theme.colors.panel, 0.97);
    bg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    bg.lineStyle(2, Theme.colors.gold, 0.8);
    bg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 8);
    this.elements.push(bg);

    // Title
    const title = TextFactory.create(this.scene, cx, cy - panelH / 2 + 25, UI.evolution.title(heroName), 'subtitle', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(0.5).setDepth(801);
    this.elements.push(title);

    // Two branch cards side by side
    const cardW = 200;
    const cardH = 240;
    const gap = 20;
    const leftX = cx - cardW - gap / 2;
    const rightX = cx + gap / 2;
    const cardY = cy - panelH / 2 + 55;

    this.buildBranchCard(leftX, cardY, cardW, cardH, this.branches[0], 'A');
    this.buildBranchCard(rightX, cardY, cardW, cardH, this.branches[1], 'B');
  }

  private buildBranchCard(
    x: number, y: number, w: number, h: number,
    evo: SkillEvolution, branch: 'A' | 'B',
  ): void {
    const cardBg = this.scene.add.graphics().setDepth(800);
    cardBg.fillStyle(Theme.colors.panel, 0.9);
    cardBg.fillRoundedRect(x, y, w, h, 6);
    cardBg.lineStyle(1, Theme.colors.panelBorder, 0.7);
    cardBg.strokeRoundedRect(x, y, w, h, 6);
    this.elements.push(cardBg);

    // Branch label (A路线 / B路线)
    const branchLabel = branch === 'A' ? UI.evolution.branchA : UI.evolution.branchB;
    const branchText = TextFactory.create(this.scene, x + w / 2, y + 15, branchLabel, 'small', {
      color: '#888888',
    }).setOrigin(0.5).setDepth(801);
    this.elements.push(branchText);

    // Evolution name
    const nameText = TextFactory.create(this.scene, x + w / 2, y + 35, evo.name, 'body', {
      color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(801);
    this.elements.push(nameText);

    // Description
    const descText = TextFactory.create(this.scene, x + 10, y + 55, evo.description, 'small', {
      color: '#aaaaaa',
      wordWrap: { width: w - 20 },
    }).setDepth(801);
    this.elements.push(descText);

    // Key stat changes vs base skill
    const base = this.baseSkill;
    let statY = y + 120;

    if (evo.overrides.baseDamage !== undefined) {
      const after = evo.overrides.baseDamage as number;
      const color = after > base.baseDamage
        ? colorToString(Theme.colors.success)
        : colorToString(Theme.colors.danger);
      const t = TextFactory.create(
        this.scene, x + 10, statY,
        UI.evolution.damageChange(base.baseDamage, after), 'small', { color },
      ).setDepth(801);
      this.elements.push(t);
      statY += 16;
    }

    if (evo.overrides.cooldown !== undefined) {
      const after = evo.overrides.cooldown as number;
      const t = TextFactory.create(
        this.scene, x + 10, statY,
        UI.evolution.cooldownChange(base.cooldown, after), 'small', { color: '#aaccff' },
      ).setDepth(801);
      this.elements.push(t);
      statY += 16;
    }

    if (evo.overrides.targetType) {
      const t = TextFactory.create(
        this.scene, x + 10, statY,
        UI.evolution.targetChange(base.targetType, evo.overrides.targetType as string), 'small',
        { color: '#ccaaff' },
      ).setDepth(801);
      this.elements.push(t);
    }

    // Choose button
    const btn = new Button(this.scene, x + w / 2, y + h - 25, UI.evolution.choose, 120, 30, () => {
      this.selectBranch(branch);
    }, Theme.colors.primary);
    btn.setDepth(801);
    this.elements.push(btn);
  }

  selectBranch(branch: 'A' | 'B'): void {
    const evo = this.branches.find(b => b.branch === branch);
    if (!evo) return;
    AudioManager.getInstance().playSfx('sfx_levelup');
    this.onSelect(evo.id);
    this.destroy();
  }

  destroy(): void {
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }
}

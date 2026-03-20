import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BATTLE_GROUND_Y, HERO_START_X, ENEMY_START_X, UNIT_SPACING_Y, FRONT_ROW_X, BACK_ROW_X, MAX_ENEMIES } from '../constants';
import { RunManager } from '../managers/RunManager';
import { BattleSystem } from '../systems/BattleSystem';
import { Hero } from '../entities/Hero';
import { Enemy } from '../entities/Enemy';
import { BattleNodeData, EnemyData, BattleResult, ElementType, HeroData } from '../types';
import { BattleHUD } from '../ui/BattleHUD';
import { BattleEffects } from '../systems/BattleEffects';
import { ParticleManager } from '../systems/ParticleManager';
import { SceneTransition } from '../systems/SceneTransition';
import { ActModifierSystem } from '../systems/ActModifierSystem';
import { UnitAnimationSystem } from '../systems/UnitAnimationSystem';
import { EventBus } from '../systems/EventBus';
import { AudioManager } from '../systems/AudioManager';
import { ErrorHandler } from '../systems/ErrorHandler';
import { RelicSystem } from '../systems/RelicSystem';
import { SaveManager } from '../managers/SaveManager';
import { MetaManager } from '../managers/MetaManager';
import { Unit } from '../entities/Unit';
import { Theme, colorToString, getElementColor } from '../ui/Theme';
import { hasElementAdvantage } from '../config/elements';
import enemiesData from '../data/enemies.json';
import skillsData from '../data/skills.json';
import skillVisualsData from '../data/skill-visuals.json';
import { Button } from '../ui/Button';
import { UI } from '../i18n';
import { KeybindingConfig } from '../config/keybindings';
import { BOSS_ENTRANCE, WAVE_TRANSITION } from '../config/visual';
import { RunOverviewPanel } from '../ui/RunOverviewPanel';
import { TutorialSystem } from '../systems/TutorialSystem';
import { DailyChallengeManager, DailyRule } from '../managers/DailyChallengeManager';
import { UltimateSystem } from '../systems/UltimateSystem';
import { UltimateBar } from '../ui/UltimateBar';
import { BossPhaseSystem } from '../systems/BossPhaseSystem';
import bossPhaseData from '../data/boss-phases.json';
import { TextFactory } from '../ui/TextFactory';

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private nodeIndex!: number;
  private battleEndHandled: boolean = false;
  private hud!: BattleHUD;
  private effects!: BattleEffects;
  private particles!: ParticleManager;
  private allUnits: (Hero | Enemy)[] = [];
  private unitAnimations!: UnitAnimationSystem;
  private pauseElements: Phaser.GameObjects.GameObject[] = [];
  private overviewPanel: RunOverviewPanel | null = null;
  private ultimateSystem!: UltimateSystem;
  private ultimateBar!: UltimateBar;

  // Wave management (gauntlet)
  private waveEnemyData: { id: string; level: number }[][] = [];
  private isGauntlet: boolean = false;
  private waveIndicator: Phaser.GameObjects.Text | null = null;

  // Target selection state
  private targetingMode: boolean = false;
  private targetingSkillInfo: { unitId: string; skillId: string; targetType: string } | null = null;
  private targetingOverlays: Phaser.GameObjects.GameObject[] = [];
  private onTargetRequest!: (data: { unitId: string; skillId: string; targetType: string }) => void;
  private onManualFire!: (data: { unitId: string; skillId: string; targetId?: string }) => void;

  // Threat/healer indicator state
  private threatGraphics!: Phaser.GameObjects.Graphics;
  private healerGraphics!: Phaser.GameObjects.Graphics;
  private threatLinesVisible: boolean = false;
  private healerPulseTime: number = 0;

  // EventBus listener references for cleanup
  private onDamage!: (data: { sourceId: string; targetId: string; amount: number; isCrit: boolean; element?: ElementType }) => void;
  private onHeal!: (data: { sourceId: string; targetId: string; amount: number }) => void;
  private onDeath!: (data: { unitId: string; isHero: boolean }) => void;
  private onReaction!: (data: { element1: ElementType; element2: ElementType; targetId: string; reactionType: string }) => void;
  private onSkillVisual!: (data: { casterId: string; skillId: string; targets: string[] }) => void;
  private onComboBreak!: (data: { unitId: string }) => void;
  private onSkillInterrupt!: (data: { unitId: string; skillId: string; reason: string }) => void;
  private onBossKill!: (data: { killerId: string; targetId: string }) => void;
  private onAttackShowName!: (data: { sourceId: string; targetId: string; damage: number }) => void;
  private lastShownEnemy: Unit | null = null;
  private bossPhaseSystem: BossPhaseSystem | null = null;
  private onBossPhase!: (data: { bossId: string; phaseIndex: number; spawns: string[]; effect?: { type: string; value: number } }) => void;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.battleEndHandled = false;
    this.allUnits = [];
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    // Initialize effects systems
    this.effects = new BattleEffects(this);
    this.particles = new ParticleManager(this);

    // Node info (with bounds check)
    const map = rm.getMap();
    const node = this.nodeIndex < map.length ? map[this.nodeIndex] : undefined;
    if (!node) {
      SceneTransition.fadeTransition(this, 'MapScene');
      return;
    }
    const actIndex = rm.getCurrentAct();

    // Act-themed background
    const actBgColors = [0x0a1a0e, 0x1a0a0a, 0x0a0a1a]; // forest, volcano, abyss
    const bgColor = actBgColors[actIndex] ?? Theme.colors.background;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, bgColor);

    // Background decorations per act
    const bgDecor = this.add.graphics();
    bgDecor.setDepth(-1);
    switch (actIndex) {
      case 0: // Forest
        bgDecor.fillStyle(0x1a3a1e, 0.5);
        bgDecor.fillRect(0, BATTLE_GROUND_Y + 40, GAME_WIDTH, GAME_HEIGHT - BATTLE_GROUND_Y - 40);
        for (let i = 0; i < 5; i++) {
          const tx = 80 + i * 160;
          bgDecor.fillStyle(0x0a2a0e, 0.3);
          bgDecor.fillTriangle(tx, 30, tx - 20, BATTLE_GROUND_Y - 30, tx + 20, BATTLE_GROUND_Y - 30);
        }
        break;
      case 1: // Volcano
        bgDecor.fillStyle(0x3a1a0a, 0.5);
        bgDecor.fillRect(0, BATTLE_GROUND_Y + 40, GAME_WIDTH, GAME_HEIGHT - BATTLE_GROUND_Y - 40);
        bgDecor.lineStyle(2, 0xff4400, 0.2);
        bgDecor.lineBetween(0, BATTLE_GROUND_Y + 42, GAME_WIDTH, BATTLE_GROUND_Y + 42);
        bgDecor.fillStyle(0xff6600, 0.15);
        for (let i = 0; i < 8; i++) {
          bgDecor.fillCircle(100 + i * 90, 60 + (i % 3) * 40, 2);
        }
        break;
      case 2: // Abyss
        for (let i = 0; i < 10; i++) {
          bgDecor.fillStyle(0x1a0a2a, 0.1);
          bgDecor.fillRect(0, GAME_HEIGHT - i * 20, GAME_WIDTH, 20);
        }
        break;
    }

    // Ground line
    const ground = this.add.graphics();
    ground.lineStyle(1, 0x333355, 0.5);
    ground.lineBetween(0, BATTLE_GROUND_Y + 50, GAME_WIDTH, BATTLE_GROUND_Y + 50);

    // Boss vignette
    if (node.type === 'boss') {
      const vignette = this.add.graphics();
      vignette.lineStyle(4, 0xff2222, 0.4);
      vignette.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
      vignette.lineStyle(8, 0xff0000, 0.15);
      vignette.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    const typeLabel = node.type === 'boss' ? UI.battle.boss : node.type === 'elite' ? UI.battle.elite : UI.battle.battle;
    const labelColor = node.type === 'boss' ? colorToString(Theme.colors.danger) : '#ffffff';
    TextFactory.create(this, GAME_WIDTH / 2, 12, typeLabel, 'body', {
      color: labelColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create battle system with act modifier
    this.battleSystem = new BattleSystem(rng);
    this.battleSystem.actModifier = new ActModifierSystem(actIndex, this.battleSystem.damageSystem);

    // Create heroes — split into front/back rows
    const heroStates = rm.getHeroes();
    const frontHeroes: { state: typeof heroStates[0]; data: ReturnType<typeof rm.getHeroData> }[] = [];
    const backHeroes: { state: typeof heroStates[0]; data: ReturnType<typeof rm.getHeroData> }[] = [];
    for (const state of heroStates) {
      const data = rm.getHeroData(state.id);
      const formation = rm.getHeroFormation(state.id);
      if (formation === 'front') {
        frontHeroes.push({ state, data });
      } else {
        backHeroes.push({ state, data });
      }
    }

    const positionRow = (row: typeof frontHeroes, xPos: number): Hero[] =>
      row.map((h, i) => {
        const y = BATTLE_GROUND_Y - ((row.length - 1) / 2 - i) * UNIT_SPACING_Y;
        return new Hero(this, xPos, y, h.data, h.state);
      });

    const heroes: Hero[] = [
      ...positionRow(frontHeroes, FRONT_ROW_X),
      ...positionRow(backHeroes, BACK_ROW_X),
    ];

    // Create enemies
    const battleData = node.data as BattleNodeData;
    const enemies: Enemy[] = battleData.enemies
      .map((e, i) => {
        const data = enemiesData.find(ed => ed.id === e.id) as EnemyData | undefined;
        if (!data) return null;
        const y = BATTLE_GROUND_Y - ((battleData.enemies.length - 1) / 2 - i) * UNIT_SPACING_Y;
        return new Enemy(this, ENEMY_START_X, y, data, e.level);
      })
      .filter((e): e is Enemy => e !== null);

    RelicSystem.activateWithUnits(rm.getRelics(), heroes, enemies, rng);
    this.ultimateSystem = new UltimateSystem();

    // Build heroDataMap for synergy injection
    const heroDataMap = new Map<string, HeroData>();
    for (const state of heroStates) {
      heroDataMap.set(state.id, rm.getHeroData(state.id));
    }
    this.battleSystem.setUnits(heroes, enemies, heroStates, heroDataMap);

    // Detect gauntlet waves
    this.isGauntlet = node.type === 'gauntlet' && !!(battleData as BattleNodeData).waves;
    if (this.isGauntlet) {
      this.waveEnemyData = (battleData as BattleNodeData).waves!;
      this.battleSystem.setWaveData(this.waveEnemyData, (waveIdx, totalWaves) => {
        this.handleWaveTransition(waveIdx, totalWaves);
      });
    }

    // Apply daily challenge rules
    const runState = rm.getState();
    if (runState.isDaily && runState.dailyModifiers?.rules) {
      const rules = runState.dailyModifiers.rules as DailyRule[];

      // HP modifier: reduce hero max HP and current HP
      for (const hero of heroes) {
        const newMaxHp = DailyChallengeManager.applyHPModifier(hero.currentStats.maxHp, rules);
        if (newMaxHp !== hero.currentStats.maxHp) {
          hero.currentStats.maxHp = newMaxHp;
          hero.currentHp = Math.min(hero.currentHp, newMaxHp);
        }
      }

      // Enemy element bonus: +20% attack for enemies matching the boosted element
      const bonusElement = DailyChallengeManager.getEnemyElementBonus(rules);
      if (bonusElement) {
        for (const enemy of enemies) {
          if (enemy.element === bonusElement) {
            enemy.currentStats.attack = Math.round(enemy.currentStats.attack * 1.2);
          }
        }
      }

      // Apply additional rule effects
      for (const rule of rules) {
        switch (rule.type) {
          case 'double_crit':
            for (const unit of [...heroes, ...enemies]) {
              unit.currentStats.critDamage *= 2;
            }
            break;
          case 'gold_rush':
            for (const enemy of enemies) {
              enemy.currentStats.maxHp = Math.round(enemy.currentStats.maxHp * 1.3);
              enemy.currentHp = Math.round(enemy.currentHp * 1.3);
              enemy.healthBar.updateHealth(enemy.currentHp, enemy.currentStats.maxHp);
            }
            break;
          case 'element_chaos': {
            const elems = ['fire', 'ice', 'lightning', 'dark', 'holy'];
            const battleRng = rm.getRng();
            for (const hero of heroes) {
              (hero as any).element = battleRng.pick(elems);
            }
            break;
          }
          case 'speed_frenzy':
            for (const unit of [...heroes, ...enemies]) {
              unit.currentStats.attackSpeed *= 1.3;
            }
            break;
        }
      }
    }

    // Golden border for daily runs
    if (runState.isDaily) {
      const border = this.add.graphics();
      border.lineStyle(2, 0xccaa44, 0.6);
      border.strokeRect(1, 1, GAME_WIDTH - 2, GAME_HEIGHT - 2);
      border.setDepth(100);
    }

    // Record enemy encounters for codex
    for (const enemy of enemies) {
      MetaManager.recordEnemyEncounter(enemy.unitId);
    }

    // Hide regular enemy names by default (boss names always visible)
    for (const enemy of enemies) {
      if (!enemy.isBoss) {
        enemy.setNameVisible(false);
      }
    }

    // Boss entrance animation
    const bossUnit = enemies.find(e => e.isBoss);
    if (bossUnit) {
      const finalX = bossUnit.x;
      bossUnit.x = BOSS_ENTRANCE.START_X;

      // Title card
      const titleName = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15, bossUnit.unitName, 'title', {
        color: '#ffaa00',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(BOSS_ENTRANCE.TITLE_DEPTH).setAlpha(0);

      const titleSub = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 12, 'BOSS', 'body', {
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(BOSS_ENTRANCE.TITLE_DEPTH).setAlpha(0);

      // Fade in title
      this.tweens.add({
        targets: [titleName, titleSub],
        alpha: 1,
        duration: BOSS_ENTRANCE.TITLE_FADE_IN,
      });

      // Slide boss in
      this.tweens.add({
        targets: bossUnit,
        x: finalX,
        duration: BOSS_ENTRANCE.SLIDE_DURATION,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          // Screen shake on landing
          this.effects.screenShake(BOSS_ENTRANCE.SHAKE_INTENSITY, BOSS_ENTRANCE.SHAKE_DURATION);

          // Fade out title after hold
          this.time.delayedCall(BOSS_ENTRANCE.TITLE_HOLD, () => {
            this.tweens.add({
              targets: [titleName, titleSub],
              alpha: 0,
              duration: BOSS_ENTRANCE.TITLE_FADE_OUT,
              onComplete: () => {
                titleName.destroy();
                titleSub.destroy();
              },
            });
          });
        },
      });
    }

    // Create HUD (with skill queue integration)
    this.hud = new BattleHUD(this, heroes, enemies, (speed) => {
      this.battleSystem.speedMultiplier = speed;
    }, this.battleSystem.skillQueue);

    // Initialize ultimate system after heroes have skills
    this.ultimateSystem.activate(heroes);
    this.ultimateBar = new UltimateBar(this, heroes, this.ultimateSystem);
    this.hud.setUltimateBar(this.ultimateBar);

    // Keyboard shortcuts for skill bar (configurable via keybindings)
    const skillKeyNames = KeybindingConfig.getSkillKeys();
    skillKeyNames.forEach((keyName, idx) => {
      const keyCode = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[keyName];
      if (keyCode == null) return;
      const key = this.input.keyboard?.addKey(keyCode);
      key?.on('down', () => {
        if (this.battleSystem.battleState === 'fighting') {
          this.hud.fireSkillByHotkey(idx + 1);
        }
      });
    });

    // Ultimate hotkeys (Q/W/E/R)
    const ultKeyNames = KeybindingConfig.getUltimateKeys();
    ultKeyNames.forEach((keyName, idx) => {
      const keyCode = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[keyName];
      if (keyCode == null) return;
      const key = this.input.keyboard?.addKey(keyCode);
      key?.on('down', () => {
        if (this.battleSystem.battleState === 'fighting') {
          this.ultimateBar.fireByHotkey(idx);
        }
      });
    });

    // Unit animation system (idle floats, attack rush, cast pulse)
    this.allUnits = [...heroes, ...enemies];

    // Boss phase system (for multi-phase boss fights)
    const bossEnemy = enemies.find(e => e.isBoss);
    if (bossEnemy) {
      const phaseConfig = (bossPhaseData as Record<string, { phases: Array<{ hpPercent: number; spawns: string[]; bossEffect?: { type: string; value: number } }> }>)[bossEnemy.enemyData.id];
      if (phaseConfig) {
        this.bossPhaseSystem = new BossPhaseSystem(bossEnemy, {
          bossId: bossEnemy.enemyData.id,
          phases: phaseConfig.phases as any,
        });
      }
    }

    // Wave indicator for gauntlet
    if (this.isGauntlet) {
      this.waveIndicator = TextFactory.create(this, GAME_WIDTH / 2, 45, UI.wave.indicator(1, this.battleSystem.getTotalWaves()), 'body', {
        color: '#cc44cc', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(200);
    }

    this.unitAnimations = new UnitAnimationSystem(this, this.allUnits);

    // Listen for visual events (store refs for cleanup in shutdown)
    // NOTE: use this.allUnits (not a captured const) so wave transitions update correctly

    this.onDamage = (data) => {
      if (data.isCrit) {
        this.effects.screenShake(0.008, 150);
        this.effects.critSlowMotion();
        this.effects.critEdgeFlash();
      } else {
        this.effects.screenShake(0.003, 60);
      }
      const target = this.allUnits.find(u => u.unitId === data.targetId);
      const source = this.allUnits.find(u => u.unitId === data.sourceId);
      if (target) {
        this.particles.createHitEffect(target.x, target.y, data.element);
        this.effects.hitFlash(target);
        this.effects.hitKnockback(target, source?.x ?? target.x);

        // Element advantage/disadvantage label
        if (data.element && source?.element && target.element) {
          if (hasElementAdvantage(source.element, target.element)) {
            this.effects.showElementLabel(target.x, target.y, true);
          } else if (hasElementAdvantage(target.element, source.element)) {
            this.effects.showElementLabel(target.x, target.y, false);
          }
        }
      }
    };

    this.onHeal = (data) => {
      const target = this.allUnits.find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createHealEffect(target.x, target.y);
      }
    };

    this.onDeath = (data) => {
      const unit = this.allUnits.find(u => u.unitId === data.unitId);
      if (unit) {
        this.particles.createDeathEffect(unit.x, unit.y, unit.element, unit.isBoss);
        if (unit.isBoss) {
          this.effects.screenShake(0.025, 400);
          const elColor = unit.element ? getElementColor(unit.element) : 0xff4444;
          this.effects.screenFlash(elColor, 300);
        } else {
          this.effects.screenShake(0.01, 200);
        }
      }
    };

    this.onReaction = (data) => {
      const target = this.allUnits.find(u => u.unitId === data.targetId);
      if (target) {
        this.particles.createElementReactionEffect(target.x, target.y, data.element1, data.element2);
        this.effects.screenShake(0.012, 200);
        // Screen flash with the primary reaction element color
        const elColor = getElementColor(data.element1);
        this.effects.screenFlash(elColor);
      }
    };

    this.onSkillVisual = (data) => {
      const caster = this.allUnits.find(u => u.unitId === data.casterId);
      if (!caster) return;

      const visual = (skillVisualsData as Record<string, { type: string; color: string; count?: number }>)[data.skillId];
      const colorNum = visual ? parseInt(visual.color, 16) : 0xffff88;
      const skillEntry = (skillsData as { id: string; name: string }[]).find(s => s.id === data.skillId);
      const skillName = skillEntry?.name ?? data.skillId;

      // Floating skill name above caster
      this.effects.showSkillName(caster.x, caster.y, skillName, colorNum);
      this.particles.createSkillCastEffect(caster.x, caster.y, colorNum);

      if (!visual) {
        ErrorHandler.report('warn', 'BattleScene', `Missing skill visual for "${data.skillId}"`, { skillId: data.skillId });
        return;
      }

      const targets = data.targets
        .map(tid => this.allUnits.find(u => u.unitId === tid))
        .filter((u): u is Hero | Enemy => u !== undefined);
      const firstTarget = targets[0] ?? null;

      switch (visual.type) {
        case 'projectile': {
          const projCount = visual.count ?? 1;
          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            // If count > 1 and single-target, show multiple projectiles with spread
            const shotsForTarget = targets.length === 1 ? projCount : 1;
            for (let s = 0; s < shotsForTarget; s++) {
              const delay = i * 80 + s * 60;
              const offsetY = shotsForTarget > 1 ? (s - (shotsForTarget - 1) / 2) * 8 : 0;
              if (delay === 0) {
                this.effects.showProjectile(caster.x, caster.y, t.x, t.y + offsetY, colorNum);
                this.particles.createProjectileTrail(caster.x, caster.y, t.x, t.y + offsetY, colorNum);
              } else {
                this.time.delayedCall(delay, () => {
                  this.effects.showProjectile(caster.x, caster.y, t.x, t.y + offsetY, colorNum);
                  this.particles.createProjectileTrail(caster.x, caster.y, t.x, t.y + offsetY, colorNum);
                });
              }
            }
          }
          break;
        }
        case 'melee_impact':
          // Show impact indicator on all targets
          for (const t of targets) {
            this.effects.showSkillIndicator(caster, t, colorNum, 200);
          }
          break;
        case 'aoe_enemy':
          if (firstTarget) {
            this.effects.showAoeBlast(firstTarget.x, firstTarget.y, 60, colorNum);
            this.effects.showAoeIndicator(firstTarget.x, firstTarget.y, 60, colorNum, 500);
          }
          break;
        case 'aoe_ally':
        case 'aoe_self':
          this.effects.showAoeBlast(caster.x, caster.y, 50, colorNum, 500);
          break;
      }
    };

    this.onComboBreak = (data) => {
      const unit = this.allUnits.find(u => u.unitId === data.unitId);
      if (unit && unit.isAlive) {
        this.effects.showComboBreak(unit.x, unit.y);
      }
    };

    this.onSkillInterrupt = (data) => {
      const unit = this.allUnits.find(u => u.unitId === data.unitId);
      if (unit && unit.isAlive) {
        this.effects.showInterruptText(unit.x, unit.y);
      }
    };

    const eb = EventBus.getInstance();
    eb.on('unit:damage', this.onDamage);
    eb.on('unit:heal', this.onHeal);
    eb.on('unit:death', this.onDeath);
    eb.on('element:reaction', this.onReaction);
    eb.on('skill:use', this.onSkillVisual);
    eb.on('combo:break', this.onComboBreak);
    eb.on('skill:interrupt', this.onSkillInterrupt);

    // Track boss kills for meta progression
    this.onBossKill = (data) => {
      const enemy = this.battleSystem.enemies.find(e => e.unitId === data.targetId);
      if (enemy && enemy.isBoss) {
        MetaManager.recordBossKill(enemy.unitId);
      }
    };
    eb.on('unit:kill', this.onBossKill);

    // Show enemy name when attacked/targeted
    this.onAttackShowName = (data) => {
      // Hide previous
      if (this.lastShownEnemy && !this.lastShownEnemy.isBoss) {
        this.lastShownEnemy.setNameVisible(false);
      }
      // Show current target if it's an enemy (use battleSystem.enemies for wave support)
      const target = this.battleSystem.enemies.find(e => e.unitId === data.targetId);
      if (target && !target.isBoss) {
        target.setNameVisible(true);
        this.lastShownEnemy = target;
      }
    };
    eb.on('unit:attack', this.onAttackShowName);

    this.onBossPhase = (data) => {
      const aliveEnemies = this.allUnits.filter(u => u instanceof Enemy && u.isAlive);
      const bossUnit = aliveEnemies.find(u => (u as Enemy).isBoss) as Enemy | undefined;
      const spawnLevel = bossUnit?.level ?? 1;
      let currentEnemyCount = aliveEnemies.length;

      for (let i = 0; i < data.spawns.length; i++) {
        // 安全上限检查：场上敌人不超过 MAX_ENEMIES
        if (currentEnemyCount >= MAX_ENEMIES) break;

        const spawnData = (enemiesData as EnemyData[]).find(e => e.id === data.spawns[i]);
        if (!spawnData) continue;

        const yIndex = currentEnemyCount + i;
        const targetX = ENEMY_START_X + 40;
        const y = BATTLE_GROUND_Y - ((yIndex - 1) / 2) * UNIT_SPACING_Y;

        // 从屏幕右侧滑入，分批延迟入场
        const enemy = new Enemy(this, WAVE_TRANSITION.SLIDE_START_X, y, spawnData, spawnLevel);
        const delay = i * 300;

        this.time.delayedCall(delay, () => {
          this.allUnits.push(enemy);
          this.battleSystem.addUnit(enemy);
          this.tweens.add({
            targets: enemy,
            x: targetX,
            duration: WAVE_TRANSITION.SLIDE_DURATION,
            ease: 'Power2',
          });
        });

        currentEnemyCount++;
      }

      // Apply boss effect
      if (data.effect) {
        const boss = this.allUnits.find(u => u instanceof Enemy && (u as Enemy).isBoss);
        if (boss) {
          this.effects.showSkillName(boss.x, boss.y - 20, UI.battle.bossPhase(data.phaseIndex + 1), 0xffcc00);

          switch (data.effect.type) {
            case 'shield':
              boss.statusEffects.push({
                id: 'boss_shield', type: 'buff', name: '护盾',
                stat: 'defense', value: 9999,
                duration: data.effect.value / 1000,
              });
              boss.invalidateStats();
              this.effects.showSkillName(boss.x, boss.y - 40, UI.battle.bossShield, 0x44aaff);
              break;
            case 'enrage':
              boss.statusEffects.push({
                id: 'boss_enrage', type: 'buff', name: '狂暴',
                stat: 'attack', value: data.effect.value,
                duration: 999,
              });
              boss.invalidateStats();
              this.effects.showSkillName(boss.x, boss.y - 40, UI.battle.bossEnrage, 0xff4444);
              break;
            case 'damage_reduction':
              boss.statusEffects.push({
                id: 'boss_dmg_reduction', type: 'buff', name: '防御强化',
                stat: 'defense', value: data.effect.value,
                duration: 999,
              });
              boss.invalidateStats();
              this.effects.showSkillName(boss.x, boss.y - 40, UI.battle.bossDamageReduction, 0xffaa44);
              break;
          }
        }
      }
    };
    EventBus.getInstance().on('boss:phase', this.onBossPhase);

    // Threat & healer indicator graphics (single reusable objects, cleared each frame)
    this.threatGraphics = this.add.graphics().setDepth(5);
    this.healerGraphics = this.add.graphics().setDepth(5);
    this.threatGraphics.setVisible(false);
    this.healerGraphics.setVisible(false);

    // Threat toggle button (bottom-right area, near stats button)
    const threatBtn = TextFactory.create(this, GAME_WIDTH - 10, GAME_HEIGHT - 78, '[威胁线]', 'small', {
      color: '#888888',
    }).setOrigin(1, 1);
    const threatHit = this.add.rectangle(GAME_WIDTH - 35, GAME_HEIGHT - 83, 64, 22, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    threatHit.on('pointerup', () => {
      this.threatLinesVisible = !this.threatLinesVisible;
      this.threatGraphics.setVisible(this.threatLinesVisible);
      this.healerGraphics.setVisible(this.threatLinesVisible);
      threatBtn.setColor(this.threatLinesVisible ? '#ffcc44' : '#888888');
      if (!this.threatLinesVisible) {
        this.threatGraphics.clear();
        this.healerGraphics.clear();
      }
    });

    // Target selection mode handlers
    this.onTargetRequest = (data) => {
      this.enterTargetingMode(data.unitId, data.skillId, data.targetType);
    };
    this.onManualFire = (data) => {
      // Check if this is a targeted ultimate — consume energy
      const ultSkillId = this.ultimateSystem.getUltimateSkillId(data.unitId);
      if (ultSkillId && data.skillId === ultSkillId && data.targetId) {
        this.ultimateSystem.consumeEnergy(data.unitId);
      }
      this.battleSystem.executeQueuedSkill(data.unitId, data.skillId, data.targetId);
    };
    eb.on('skill:targetRequest', this.onTargetRequest);
    eb.on('skill:manualFire', this.onManualFire);

    // Act modifier indicator
    const actModDesc = this.battleSystem.actModifier?.getActDescription();
    if (actModDesc) {
      TextFactory.create(this, GAME_WIDTH / 2, 26, actModDesc, 'small', {
        color: '#887766',
      }).setOrigin(0.5);
    }

    // Gold display (top-right, near battle type label)
    TextFactory.create(this, GAME_WIDTH - 15, 10, `${rm.getGold()}G`, 'label', {
      color: colorToString(Theme.colors.gold),
    }).setOrigin(1, 0);

    // Pause button (top-right)
    const pauseBtn = TextFactory.create(this, GAME_WIDTH - 15, 26, UI.battle.pauseBtn, 'small', {
      color: '#888888',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());

    // ESC key for cancel targeting or pause
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey?.on('down', () => {
      if (this.targetingMode) {
        this.cancelTargetingMode();
      } else {
        this.togglePause();
      }
    });

    // Tab key for run overview
    const tabKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    tabKey?.on('down', () => {
      if (this.overviewPanel) return;
      if (!this.battleSystem.isPaused) {
        this.battleSystem.isPaused = true;
      }
      this.overviewPanel = new RunOverviewPanel(this, () => {
        this.overviewPanel = null;
        // Resume if no pause menu is open
        if (this.pauseElements.length === 0) {
          this.battleSystem.isPaused = false;
        }
      });
    });

    TutorialSystem.showTipIfNeeded(this, 'first_battle');

    // Trigger elite/boss tutorial tips based on node type
    if (node.type === 'elite') {
      TutorialSystem.showTipIfNeeded(this, 'first_elite');
    } else if (node.type === 'boss') {
      TutorialSystem.showTipIfNeeded(this, 'first_boss');
    }

    // Trigger synergy tutorial tip if any synergies are active
    if (rm.getState().activeSynergies && rm.getState().activeSynergies.length > 0) {
      TutorialSystem.showTipIfNeeded(this, 'first_synergy');
    }
  }

  private enterTargetingMode(unitId: string, skillId: string, targetType: string): void {
    this.targetingMode = true;
    this.targetingSkillInfo = { unitId, skillId, targetType };

    // Determine valid targets
    const validTargets = targetType === 'enemy'
      ? this.battleSystem.enemies.filter(e => e.isAlive)
      : this.battleSystem.heroes.filter(h => h.isAlive);

    // Dim overlay
    const dim = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.3,
    ).setDepth(90).setInteractive();
    dim.on('pointerup', () => this.cancelTargetingMode());
    this.targetingOverlays.push(dim);

    // Instruction text
    const instruction = TextFactory.create(this, GAME_WIDTH / 2, 20, '选择目标 (ESC取消)', 'body', {
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(91);
    this.targetingOverlays.push(instruction);

    // Highlight each valid target
    for (const target of validTargets) {
      const color = targetType === 'enemy' ? 0xff4444 : 0x44ff44;
      const ring = this.add.graphics().setDepth(91);
      ring.lineStyle(2, color, 0.8);
      ring.strokeCircle(target.x, target.y, 22);
      ring.fillStyle(color, 0.15);
      ring.fillCircle(target.x, target.y, 22);
      this.targetingOverlays.push(ring);

      // Pulse animation
      this.tweens.add({
        targets: ring,
        alpha: { from: 1, to: 0.5 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Clickable hit zone on each target
      const hitZone = this.add.circle(target.x, target.y, 24, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(92);
      const targetId = target.unitId;
      hitZone.on('pointerup', () => {
        this.confirmTarget(targetId);
      });
      this.targetingOverlays.push(hitZone);
    }
  }

  private confirmTarget(targetId: string): void {
    if (!this.targetingSkillInfo) return;

    const { unitId, skillId } = this.targetingSkillInfo;

    // Check if this is an ultimate skill (not in the skill queue)
    const ultSkillId = this.ultimateSystem.getUltimateSkillId(unitId);
    if (ultSkillId && skillId === ultSkillId) {
      this.ultimateSystem.consumeEnergy(unitId);
      EventBus.getInstance().emit('skill:manualFire', {
        unitId,
        skillId,
        targetId,
      });
    } else {
      this.battleSystem.skillQueue.fireSkill(unitId, skillId, targetId);
    }

    this.cancelTargetingMode();
  }

  private cancelTargetingMode(): void {
    this.targetingMode = false;
    this.targetingSkillInfo = null;
    for (const obj of this.targetingOverlays) {
      this.tweens.killTweensOf(obj);
      obj.destroy();
    }
    this.targetingOverlays = [];
  }

  private togglePause(): void {
    if (this.battleSystem.battleState !== 'fighting') return;

    if (this.battleSystem.isPaused) {
      this.resumeBattle();
    } else {
      this.pauseBattle();
    }
  }

  private pauseBattle(): void {
    this.battleSystem.isPaused = true;

    // Overlay
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6,
    ).setInteractive().setDepth(100);

    // Panel background
    const panelBg = this.add.graphics().setDepth(101);
    const pw = 240;
    const ph = 180;
    panelBg.fillStyle(Theme.colors.panel, 0.95);
    panelBg.fillRoundedRect(GAME_WIDTH / 2 - pw / 2, GAME_HEIGHT / 2 - ph / 2, pw, ph, 8);
    panelBg.lineStyle(2, Theme.colors.panelBorder, 0.8);
    panelBg.strokeRoundedRect(GAME_WIDTH / 2 - pw / 2, GAME_HEIGHT / 2 - ph / 2, pw, ph, 8);

    // Title
    const title = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, UI.battle.pause, 'subtitle', {
      color: colorToString(Theme.colors.secondary),
    }).setOrigin(0.5).setDepth(102);

    // Continue button
    const continueBtn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20,
      UI.battle.resume, 160, 32, () => this.resumeBattle(), Theme.colors.success);
    continueBtn.setDepth(102);

    // Settings button
    const settingsBtn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20,
      UI.battle.settings, 160, 32, () => {
        this.resumeBattle();
        SceneTransition.fadeTransition(this, 'SettingsScene', { returnScene: 'BattleScene' });
      }, Theme.colors.panelBorder);
    settingsBtn.setDepth(102);

    // Exit button (abandon battle → map)
    const exitBtn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60,
      UI.battle.abandonBattle, 160, 32, () => {
        this.resumeBattle();
        SceneTransition.fadeTransition(this, 'MapScene');
      }, Theme.colors.danger);
    exitBtn.setDepth(102);

    this.pauseElements = [overlay, panelBg, title, continueBtn, settingsBtn, exitBtn];
  }

  private resumeBattle(): void {
    this.battleSystem.isPaused = false;
    for (const el of this.pauseElements) {
      el.destroy();
    }
    this.pauseElements = [];
  }

  update(_time: number, delta: number): void {
    this.battleSystem.update(delta);
    if (this.battleSystem.battleState === 'fighting' && !this.battleSystem.isPaused) {
      this.ultimateSystem.update(delta * this.battleSystem.speedMultiplier);
    }
    this.hud.updatePortraits();

    // Update status visuals for all living units
    for (const unit of this.allUnits) {
      if (unit.isAlive) {
        unit.updateStatusVisuals();
      }
    }

    // Draw threat & healer indicator lines
    if (this.threatLinesVisible) {
      this.effects.drawThreatLines(this.threatGraphics, this.battleSystem.enemies);

      // Healer lines: find healers and their lowest-HP allies
      this.healerPulseTime += delta;
      const alpha = 0.15 + 0.2 * Math.abs(Math.sin(this.healerPulseTime / 600));
      const healers = this.battleSystem.heroes.filter(h => h.isAlive && (h.role === 'healer' || h.role === 'support'));
      const healerTargets = healers.map(() => {
        const allies = this.battleSystem.heroes.filter(h => h.isAlive);
        if (allies.length === 0) return null;
        return allies.reduce((lowest, h) =>
          (h.currentHp / h.currentStats.maxHp) < (lowest.currentHp / lowest.currentStats.maxHp) ? h : lowest,
        );
      }).filter((t): t is Hero => t !== null);
      this.effects.drawHealerLines(this.healerGraphics, healers, healerTargets, alpha);
    }

    if (this.battleSystem.battleState !== 'fighting' && !this.battleEndHandled) {
      this.battleEndHandled = true;
      this.handleBattleEnd();
    }
  }

  private handleWaveTransition(waveIndex: number, totalWaves: number): void {
    // Update wave indicator
    if (this.waveIndicator) {
      this.waveIndicator.setText(UI.wave.indicator(waveIndex + 1, totalWaves));
    }

    // Show "Wave N" text overlay
    const waveText = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, UI.wave.indicator(waveIndex + 1, totalWaves), 'title', {
      color: '#cc44cc', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(WAVE_TRANSITION.TEXT_DEPTH);

    this.tweens.add({
      targets: waveText,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1000,
      onComplete: () => waveText.destroy(),
    });

    // Spawn new enemies
    const waveData = this.waveEnemyData[waveIndex - 1]; // waveIndex is 1-based, array is 0-based
    const newEnemies: Enemy[] = waveData
      .map((e, i) => {
        const data = enemiesData.find(ed => ed.id === e.id) as EnemyData | undefined;
        if (!data) return null;
        const y = BATTLE_GROUND_Y - ((waveData.length - 1) / 2 - i) * UNIT_SPACING_Y;
        const enemy = new Enemy(this, WAVE_TRANSITION.SLIDE_START_X, y, data, e.level);
        // Slide in from right
        this.tweens.add({
          targets: enemy,
          x: ENEMY_START_X,
          duration: WAVE_TRANSITION.SLIDE_DURATION,
          ease: 'Power2',
        });
        return enemy;
      })
      .filter((e): e is Enemy => e !== null);

    // Register new enemies with battle system
    this.battleSystem.replaceEnemies(newEnemies);

    // Re-register new enemies with RelicSystem
    RelicSystem.updateEnemies(newEnemies);

    // Mutate allUnits in-place so captured references (UnitAnimationSystem, closures) stay synced
    this.allUnits.length = 0;
    this.allUnits.push(...this.battleSystem.heroes, ...newEnemies);

    // Record encounters for codex
    for (const enemy of newEnemies) {
      MetaManager.recordEnemyEncounter(enemy.unitId);
    }

    // Hide names of non-boss enemies
    for (const enemy of newEnemies) {
      if (!enemy.isBoss) enemy.setNameVisible(false);
    }
  }

  private handleBattleEnd(): void {
    const rm = RunManager.getInstance();
    const isVictory = this.battleSystem.battleState === 'victory';

    if (isVictory) {
      let goldEarned = this.isGauntlet
        ? (this.battleSystem.getBattleResult()?.goldEarned ?? this.battleSystem.getTotalGoldReward())
        : this.battleSystem.getTotalGoldReward();
      const endRunState = rm.getState();
      if (endRunState.isDaily && endRunState.dailyModifiers?.rules) {
        goldEarned = DailyChallengeManager.applyGoldModifier(goldEarned, endRunState.dailyModifiers.rules as DailyRule[]);
        const goldRushRule = (endRunState.dailyModifiers!.rules as DailyRule[]).find((r: any) => r.type === 'gold_rush');
        if (goldRushRule) {
          goldEarned = Math.round(goldEarned * 2);
        }
      }
      // Apply relic gold bonus
      const goldBonus = RelicSystem.getGoldBonus();
      if (goldBonus > 0) {
        goldEarned = Math.round(goldEarned * (1 + goldBonus));
      }

      let expEarned = this.isGauntlet
        ? (this.battleSystem.getBattleResult()?.expEarned ?? this.battleSystem.getTotalExpReward())
        : this.battleSystem.getTotalExpReward();
      // Apply relic exp bonus
      const expBonus = RelicSystem.getExpBonus();
      if (expBonus > 0) {
        expEarned = Math.round(expEarned * (1 + expBonus));
      }

      const survivors = this.battleSystem.heroes
        .filter(h => h.isAlive)
        .map(h => h.unitId);

      for (const hero of this.battleSystem.heroes) {
        rm.updateHeroHp(hero.unitId, hero.currentHp);
      }

      const result: BattleResult = {
        victory: true,
        goldEarned,
        expEarned,
        survivors,
      };

      rm.applyBattleResult(result);
      rm.markNodeCompleted(this.nodeIndex);
      SaveManager.autoSave();

      const endMap = rm.getMap();
      const endNode = this.nodeIndex < endMap.length ? endMap[this.nodeIndex] : undefined;
      if (endNode?.type === 'boss' && rm.isRunComplete()) {
        this.time.delayedCall(1500, () => {
          SceneTransition.fadeTransition(this, 'VictoryScene');
        });
      } else {
        this.time.delayedCall(1500, () => {
          SceneTransition.fadeTransition(this, 'RewardScene', { result });
        });
      }
    } else {
      this.time.delayedCall(1500, () => {
        SceneTransition.fadeTransition(this, 'GameOverScene');
      });
    }

    // Play victory/defeat SFX stinger
    const audio = AudioManager.getInstance();
    audio.playSfx(isVictory ? 'sfx_levelup' : 'sfx_event_bad');

    // Victory/defeat text with animation
    const text = isVictory ? UI.battle.victory : UI.battle.defeat;
    const color = isVictory ? colorToString(Theme.colors.success) : colorToString(Theme.colors.danger);
    const resultText = TextFactory.create(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, text, 'title', {
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0).setAlpha(0);

    this.tweens.add({
      targets: resultText,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  shutdown(): void {
    const eb = EventBus.getInstance();
    eb.off('unit:damage', this.onDamage);
    eb.off('unit:heal', this.onHeal);
    eb.off('unit:death', this.onDeath);
    eb.off('element:reaction', this.onReaction);
    eb.off('skill:use', this.onSkillVisual);
    eb.off('combo:break', this.onComboBreak);
    eb.off('skill:interrupt', this.onSkillInterrupt);
    eb.off('unit:kill', this.onBossKill);
    eb.off('skill:targetRequest', this.onTargetRequest);
    eb.off('skill:manualFire', this.onManualFire);
    eb.off('unit:attack', this.onAttackShowName);
    this.lastShownEnemy = null;
    if (this.bossPhaseSystem) {
      this.bossPhaseSystem.deactivate();
      this.bossPhaseSystem = null;
    }
    eb.off('boss:phase', this.onBossPhase);
    this.ultimateSystem.deactivate();
    this.ultimateBar.destroy();
    RelicSystem.deactivate();
    this.cancelTargetingMode();
    this.threatGraphics?.destroy();
    this.healerGraphics?.destroy();
    this.tweens.killAll();
    this.unitAnimations.destroy();
    this.particles.destroy();
    this.hud.destroy();
  }
}

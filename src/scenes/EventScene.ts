import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { EventData, EventChoice, EventOutcome, EventNodeData, ElementType } from '../types';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import eventsData from '../data/events.json';
import { ShopGenerator } from '../systems/ShopGenerator';
import { UI, getHeroDisplayName, ELEMENT_NAMES } from '../i18n';
import { AudioManager } from '../systems/AudioManager';

export class EventScene extends Phaser.Scene {
  private nodeIndex!: number;
  private choiceMade = false;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.choiceMade = false;
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Use the event assigned by MapGenerator if available, otherwise random fallback
    const eventPool = eventsData as EventData[];
    const node = rm.getMap()[this.nodeIndex];
    const eventNodeData = node?.data as EventNodeData | undefined;
    let event: EventData | undefined;
    if (eventNodeData?.eventId) {
      event = eventPool.find(e => e.id === eventNodeData.eventId);
    }
    if (!event) {
      event = rng.pick(eventPool);
    }

    // === Cinematic entry sequence ===

    // Letterbox bars
    const barHeight = 40;
    const topBar = this.add.rectangle(GAME_WIDTH / 2, barHeight / 2, GAME_WIDTH, barHeight, 0x000000).setDepth(50);
    const bottomBar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - barHeight / 2, GAME_WIDTH, barHeight, 0x000000).setDepth(50);

    // Title (starts invisible)
    const title = this.add.text(GAME_WIDTH / 2, 38, event.title, {
      fontSize: '18px',
      color: colorToString(Theme.colors.node.event),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Description (starts invisible)
    const desc = this.add.text(GAME_WIDTH / 2, 85, event.description, {
      fontSize: '11px',
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // Gold display
    this.add.text(GAME_WIDTH - 15, 12, `${rm.getGold()}G`, {
      fontSize: '11px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Step 1: Title fade-in (200ms delay)
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 400,
      delay: 200,
      ease: 'Sine.easeOut',
    });

    // Step 2: Description fade-in (400ms delay)
    this.tweens.add({
      targets: desc,
      alpha: 1,
      duration: 300,
      delay: 400,
      ease: 'Sine.easeOut',
    });

    // Step 3: Letterbox bars slide away (600ms delay)
    this.tweens.add({
      targets: topBar,
      y: -barHeight / 2,
      duration: 400,
      delay: 600,
      ease: 'Sine.easeInOut',
      onComplete: () => topBar.destroy(),
    });
    this.tweens.add({
      targets: bottomBar,
      y: GAME_HEIGHT + barHeight / 2,
      duration: 400,
      delay: 600,
      ease: 'Sine.easeInOut',
      onComplete: () => bottomBar.destroy(),
    });

    // Step 4: Choices stagger in (700ms + i*120ms)
    const choiceElements: Phaser.GameObjects.GameObject[] = [];
    event.choices.forEach((choice, i) => {
      const btnY = 165 + i * 55;
      const btn = new Button(
        this,
        GAME_WIDTH / 2,
        btnY,
        choice.text,
        400,
        40,
        () => this.makeChoice(choice, rng, rm),
      );
      btn.setAlpha(0);
      choiceElements.push(btn);

      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: { from: btnY + 15, to: btnY },
        duration: 300,
        delay: 700 + i * 120,
        ease: 'Back.easeOut',
      });

      // Show probability hints for multi-outcome choices
      if (choice.outcomes.length > 1) {
        const hints = choice.outcomes.map(o => {
          const pct = Math.round(o.probability * 100);
          const label = this.getOutcomeSentiment(o);
          return `${UI.event.probability(pct)} ${label}`;
        });
        const hintText = this.add.text(GAME_WIDTH / 2, btnY + 24, hints.join('  |  '), {
          fontSize: '8px',
          color: '#888899',
          fontFamily: 'monospace',
          align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
          targets: hintText,
          alpha: 1,
          duration: 200,
          delay: 800 + i * 120,
          ease: 'Sine.easeOut',
        });
      }
    });
  }

  /** Classify an outcome as positive/negative/neutral based on its effects. */
  private getOutcomeSentiment(outcome: EventOutcome): string {
    let positive = 0;
    let negative = 0;
    for (const e of outcome.effects) {
      switch (e.type) {
        case 'gold':
          if (e.value > 0) positive++; else if (e.value < 0) negative++;
          break;
        case 'heal': case 'stat_boost': case 'relic': case 'item': case 'recruit':
          positive++;
          break;
        case 'damage': case 'sacrifice':
          negative++;
          break;
        case 'transform':
          positive++;
          break;
      }
    }
    if (positive > 0 && negative > 0) return '风险';
    if (negative > 0) return '危险';
    if (positive > 0) return '有利';
    return '无事';
  }

  private makeChoice(choice: EventChoice, rng: ReturnType<RunManager['getRng']>, rm: RunManager): void {
    if (this.choiceMade) return;
    this.choiceMade = true;

    const roll = rng.next();
    let cumulative = 0;
    let selectedOutcome: EventOutcome = choice.outcomes[choice.outcomes.length - 1];

    for (const outcome of choice.outcomes) {
      cumulative += outcome.probability;
      if (roll <= cumulative) {
        selectedOutcome = outcome;
        break;
      }
    }

    for (const effect of selectedOutcome.effects) {
      switch (effect.type) {
        case 'gold':
          rm.addGold(effect.value);
          if (effect.value > 0) AudioManager.getInstance().playSfx('sfx_coin');
          break;
        case 'heal':
          rm.healAllHeroes(effect.value);
          break;
        case 'damage':
          rm.damageAllHeroes(effect.value);
          break;
        case 'stat_boost':
          for (const hero of rm.getHeroes()) {
            rm.addExp(hero, effect.value * 5);
          }
          break;
        case 'relic':
          if (effect.relicId) {
            rm.addRelic(effect.relicId);
          }
          break;
        case 'item': {
          const heroes = rm.getHeroes();
          if (heroes.length > 0) {
            const items = ShopGenerator.generate(rng, rm.getCurrentAct());
            if (items.length > 0) {
              const item = items[0];
              const hero = rng.pick(heroes);
              rm.equipItem(hero.id, item);
            }
          }
          break;
        }
        case 'transform':
          if (effect.element) {
            rm.setTemporaryElement(effect.element as ElementType);
          }
          break;
        case 'sacrifice': {
          const heroes = rm.getHeroes();
          if (heroes.length > 1) {
            const rngLocal = rm.getRng();
            const victim = rngLocal.pick(heroes);
            rm.removeHero(victim.id);
          }
          break;
        }
        case 'recruit':
          if (effect.heroId) {
            rm.addHero(effect.heroId);
          }
          break;
      }
    }

    rm.markNodeCompleted(this.nodeIndex);
    SaveManager.autoSave();

    // Fade out current content, then show outcome
    const allChildren = this.children.getAll();
    this.tweens.add({
      targets: allChildren,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.children.removeAll(true);
        this.showOutcome(selectedOutcome);
      },
    });
  }

  shutdown(): void {
    this.tweens.killAll();
  }

  private showOutcome(outcome: EventOutcome): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Brief sentiment flash + outcome SFX
    const sentiment = this.getOutcomeSentiment(outcome);
    const audio = AudioManager.getInstance();
    if (sentiment === '有利') {
      audio.playSfx('sfx_event_good');
    } else if (sentiment === '危险' || sentiment === '风险') {
      audio.playSfx('sfx_event_bad');
    }
    const flashColor = sentiment === '有利' ? 0x44ff44 : sentiment === '危险' ? 0xff4444 : sentiment === '风险' ? 0xffaa44 : 0xffffff;
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, flashColor, 0.2).setDepth(10);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });

    const outcomeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, outcome.description, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    const effectTexts = outcome.effects.map(e => {
      switch (e.type) {
        case 'gold': return UI.event.goldEffect(e.value);
        case 'heal': return UI.event.healEffect(e.value);
        case 'damage': return UI.event.damageEffect(e.value);
        case 'stat_boost': return UI.event.statBoost(e.value);
        case 'relic': return UI.event.relicAcquired(e.relicId ?? 'unknown');
        case 'item': return UI.event.itemGold(e.value || 30);
        case 'transform': {
          const elName = e.element ? (ELEMENT_NAMES[e.element] ?? e.element) : '未知';
          return `元素转化: ${elName}`;
        }
        case 'sacrifice': return '献祭了一名英雄';
        case 'recruit': return `招募: ${getHeroDisplayName(e.heroId ?? '')}`;
        default: return '';
      }
    }).filter(Boolean);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [outcomeText];

    if (effectTexts.length > 0) {
      const effectLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, effectTexts.join('\n'), {
        fontSize: '12px',
        color: '#aaccff',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0);
      fadeTargets.push(effectLabel);
    }

    const btn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, UI.event.continueBtn, 140, 40, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
    btn.setAlpha(0);
    fadeTargets.push(btn);

    // Fade in outcome content
    this.tweens.add({
      targets: fadeTargets,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });
  }
}

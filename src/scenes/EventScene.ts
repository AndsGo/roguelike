import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { EventData, EventChoice, EventOutcome, EventNodeData } from '../types';
import { Button } from '../ui/Button';
import { Theme, colorToString } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import eventsData from '../data/events.json';
import { UI } from '../i18n';

export class EventScene extends Phaser.Scene {
  private nodeIndex!: number;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
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

    // Title
    this.add.text(GAME_WIDTH / 2, 38, event.title, {
      fontSize: '18px',
      color: colorToString(Theme.colors.node.event),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description
    this.add.text(GAME_WIDTH / 2, 85, event.description, {
      fontSize: '11px',
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    // Gold display
    this.add.text(GAME_WIDTH - 15, 12, `${rm.getGold()}G`, {
      fontSize: '11px',
      color: colorToString(Theme.colors.gold),
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Choices
    event.choices.forEach((choice, i) => {
      new Button(
        this,
        GAME_WIDTH / 2,
        165 + i * 55,
        choice.text,
        400,
        40,
        () => this.makeChoice(choice, rng, rm),
      );
    });
  }

  private makeChoice(choice: EventChoice, rng: ReturnType<RunManager['getRng']>, rm: RunManager): void {
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
          break;
        case 'heal':
          rm.healAllHeroes(effect.value);
          break;
        case 'damage':
          rm.damageAllHeroes(effect.value);
          break;
        case 'stat_boost':
          for (const hero of rm.getHeroes()) {
            hero.exp += effect.value * 5;
          }
          break;
        case 'relic':
          if (effect.relicId) {
            rm.addRelic(effect.relicId);
          }
          break;
        case 'item':
          rm.addGold(effect.value || 30);
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
        this.children.removeAll();
        this.showOutcome(selectedOutcome);
      },
    });
  }

  private showOutcome(outcome: EventOutcome): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

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

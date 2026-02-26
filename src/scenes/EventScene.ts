import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { RunManager } from '../managers/RunManager';
import { EventData, EventChoice, EventOutcome } from '../types';
import { Button } from '../ui/Button';
import eventsData from '../data/events.json';

export class EventScene extends Phaser.Scene {
  private nodeIndex!: number;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data: { nodeIndex: number }): void {
    this.nodeIndex = data.nodeIndex;
  }

  create(): void {
    const rm = RunManager.getInstance();
    const rng = rm.getRng();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    // Pick a random event
    const eventPool = eventsData as EventData[];
    const event = rng.pick(eventPool);

    // Title
    this.add.text(GAME_WIDTH / 2, 40, event.title, {
      fontSize: '20px',
      color: '#cc88ff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Description
    this.add.text(GAME_WIDTH / 2, 90, event.description, {
      fontSize: '11px',
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    // Gold display
    this.add.text(GAME_WIDTH - 20, 15, `金币: ${rm.getGold()}`, {
      fontSize: '11px',
      color: '#ffdd44',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Choices
    event.choices.forEach((choice, i) => {
      new Button(
        this,
        GAME_WIDTH / 2,
        170 + i * 55,
        choice.text,
        400,
        40,
        () => this.makeChoice(choice, rng, rm),
      );
    });
  }

  private makeChoice(choice: EventChoice, rng: ReturnType<RunManager['getRng']>, rm: RunManager): void {
    // Roll outcome based on probabilities
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

    // Apply effects
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
          // Small permanent stat boost — simplified as exp
          for (const hero of rm.getHeroes()) {
            const data = rm.getHeroData(hero.id);
            hero.exp += effect.value * 5;
          }
          break;
        case 'item':
          // Would add random item — simplified for MVP
          rm.addGold(30);
          break;
      }
    }

    // Show outcome
    this.children.removeAll();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x111122);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, selectedOutcome.description, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);

    // Show effect summary
    const effectTexts = selectedOutcome.effects.map(e => {
      switch (e.type) {
        case 'gold': return `金币 ${e.value > 0 ? '+' : ''}${e.value}`;
        case 'heal': return `治疗 ${Math.round(e.value * 100)}% HP`;
        case 'damage': return `受到 ${Math.round(e.value * 100)}% HP 伤害`;
        case 'stat_boost': return `属性提升 +${e.value}`;
        default: return '';
      }
    }).filter(Boolean);

    if (effectTexts.length > 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, effectTexts.join('\n'), {
        fontSize: '12px',
        color: '#aaccff',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);
    }

    rm.markNodeCompleted(this.nodeIndex);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '继续', 140, 40, () => {
      this.scene.start('MapScene');
    });
  }
}

import { SeededRNG } from '../utils/rng';
import { SaveManager } from './SaveManager';

export interface DailyModifiers {
  title: string;
  description: string;
  seed: number;
  rules: DailyRule[];
  difficulty: string;
}

export interface DailyRule {
  type: 'enemy_element' | 'hero_restriction' | 'gold_modifier' | 'hp_modifier';
  label: string;
  value: any;
}

const DAILY_COMPLETION_KEY = 'roguelike_daily_completion';

const TITLE_POOL = [
  '烈焰试炼',
  '寒冰考验',
  '暗影挑战',
  '雷霆之路',
  '圣光征途',
  '绝地求生',
  '速通之日',
  '铁壁防线',
];

const ELEMENTS: string[] = ['fire', 'ice', 'lightning', 'dark', 'holy'];

const ELEMENT_LABELS: Record<string, string> = {
  fire: '火属性',
  ice: '冰属性',
  lightning: '雷属性',
  dark: '暗属性',
  holy: '圣属性',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  hard: '困难',
  nightmare: '噩梦',
};

/**
 * Generates deterministic daily challenges using date-based seeds.
 * All methods are static — no singleton instance needed.
 */
export class DailyChallengeManager {
  /** Deterministic hash from "YYYYMMDD" string using djb2 XOR variant */
  static generateSeedFromDate(dateStr: string): number {
    let hash = 5381;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) + hash) ^ dateStr.charCodeAt(i);
    }
    // Ensure positive 32-bit integer
    return (hash >>> 0);
  }

  /** Returns current date as "YYYYMMDD" */
  static getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  /** Returns today's deterministic seed */
  static getTodaysSeed(): number {
    return DailyChallengeManager.generateSeedFromDate(
      DailyChallengeManager.getTodayString()
    );
  }

  /** Generate daily modifiers deterministically from a seed */
  static getDailyModifiers(seed: number): DailyModifiers {
    const rng = new SeededRNG(seed);

    // Pick title
    const title = rng.pick(TITLE_POOL);

    // Pick difficulty
    const difficulty = rng.chance(0.5) ? 'hard' : 'nightmare';

    // Build rule pool and pick 1-2 rules
    const rulePool = DailyChallengeManager.buildRulePool(rng);
    const ruleCount = rng.chance(0.5) ? 1 : 2;
    const rules = rulePool.slice(0, ruleCount);

    // Build description
    const ruleDescs = rules.map(r => r.label).join('，');
    const description = `难度: ${DIFFICULTY_LABELS[difficulty]}｜${ruleDescs}`;

    return { title, description, seed, rules, difficulty };
  }

  /** Check if today's challenge has been completed */
  static isCompletedToday(): boolean {
    const saved = SaveManager.loadData<string>(DAILY_COMPLETION_KEY);
    return saved === DailyChallengeManager.getTodayString();
  }

  /** Mark today's challenge as completed */
  static markCompleted(): void {
    SaveManager.saveData(DAILY_COMPLETION_KEY, DailyChallengeManager.getTodayString());
  }

  /** Apply gold modifier from rules. Returns baseGold if no gold rule found. */
  static applyGoldModifier(baseGold: number, rules: DailyRule[]): number {
    const rule = rules.find(r => r.type === 'gold_modifier');
    if (!rule) return baseGold;
    return Math.round(baseGold * rule.value);
  }

  /** Apply HP modifier from rules. Returns baseHP if no hp rule found. */
  static applyHPModifier(baseHP: number, rules: DailyRule[]): number {
    const rule = rules.find(r => r.type === 'hp_modifier');
    if (!rule) return baseHP;
    return Math.round(baseHP * rule.value);
  }

  private static BEST_SCORE_KEY = 'roguelike_daily_best';

  /** Get the personal best daily challenge score */
  static getBestScore(): number {
    return SaveManager.loadData<number>(DailyChallengeManager.BEST_SCORE_KEY) ?? 0;
  }

  /** Update best score if new score is higher */
  static updateBestScore(score: number): void {
    if (score > DailyChallengeManager.getBestScore()) {
      SaveManager.saveData(DailyChallengeManager.BEST_SCORE_KEY, score);
    }
  }

  /** Get enemy element bonus string, or null if no element rule */
  static getEnemyElementBonus(rules: DailyRule[]): string | null {
    const rule = rules.find(r => r.type === 'enemy_element');
    return rule ? rule.value : null;
  }

  /** Build a shuffled pool of possible rules */
  private static buildRulePool(rng: SeededRNG): DailyRule[] {
    const element = rng.pick(ELEMENTS);
    const pool: DailyRule[] = [
      {
        type: 'enemy_element',
        label: `敌人强化: ${ELEMENT_LABELS[element]}+20%`,
        value: element,
      },
      {
        type: 'gold_modifier',
        label: rng.chance(0.5) ? '金币-30%' : '金币+50%',
        value: 0, // placeholder, set below
      },
      {
        type: 'hp_modifier',
        label: '英雄HP-20%',
        value: 0.8,
      },
    ];

    // Set gold modifier value based on label
    const goldRule = pool[1];
    goldRule.value = goldRule.label === '金币-30%' ? 0.7 : 1.5;

    return rng.shuffle(pool);
  }
}

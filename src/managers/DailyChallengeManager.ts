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
  type: 'enemy_element' | 'hero_restriction' | 'gold_modifier' | 'hp_modifier'
    | 'double_crit' | 'gold_rush' | 'element_chaos' | 'speed_frenzy';
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
      { type: 'enemy_element', label: `敌人强化: ${ELEMENT_LABELS[element]}+20%`, value: element },
      { type: 'gold_modifier', label: rng.chance(0.5) ? '金币-30%' : '金币+50%', value: 0 },
      { type: 'hp_modifier', label: '英雄HP-20%', value: 0.8 },
      { type: 'double_crit', label: '暴击伤害翻倍', value: null },
      { type: 'gold_rush', label: '金币×2，敌人HP+30%', value: null },
      { type: 'element_chaos', label: '英雄元素随机化', value: null },
      { type: 'speed_frenzy', label: '全体攻速+30%', value: null },
    ];

    const goldRule = pool.find(r => r.type === 'gold_modifier')!;
    goldRule.value = goldRule.label === '金币-30%' ? 0.7 : 1.5;

    const shuffled = rng.shuffle(pool);

    // Mutual exclusion: gold_rush and gold_modifier cannot co-exist
    const result: DailyRule[] = [];
    let hasGoldType = false;
    for (const rule of shuffled) {
      if ((rule.type === 'gold_modifier' || rule.type === 'gold_rush') && hasGoldType) continue;
      if (rule.type === 'gold_modifier' || rule.type === 'gold_rush') hasGoldType = true;
      result.push(rule);
    }

    return result;
  }

  static formatDailyRule(rule: DailyRule): { icon: string; text: string } {
    switch (rule.type) {
      case 'enemy_element': return { icon: '⚔', text: `${ELEMENT_LABELS[rule.value] ?? rule.value}属性敌人攻击+20%` };
      case 'gold_modifier': return { icon: '💰', text: `金币收益 ×${rule.value}` };
      case 'hp_modifier': return { icon: '❤', text: `英雄最大HP ×${rule.value}` };
      case 'double_crit': return { icon: '💥', text: '所有单位暴击伤害 ×2' };
      case 'gold_rush': return { icon: '🏆', text: '金币 ×2，敌人HP +30%' };
      case 'element_chaos': return { icon: '🌀', text: '英雄元素随机化' };
      case 'speed_frenzy': return { icon: '⚡', text: '所有单位攻速 +30%' };
      case 'hero_restriction': return { icon: '🚫', text: `禁用${rule.value ?? ''}职业英雄` };
      default: return { icon: '•', text: rule.type };
    }
  }

  static formatDailyRuleShort(rule: DailyRule): string {
    const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
    return `${icon}${text}`;
  }

  static generateGhostScores(seed: number): { name: string; score: number }[] {
    const rng = new SeededRNG(seed + 99999);
    const namePool = ['影行者', '剑圣', '魔导师', '守护者', '猎手',
                       '审判者', '风行者', '炼金师', '驭龙者', '星术士',
                       '铁壁', '暗刃', '圣盾', '雷鸣', '冰心',
                       '烈焰使', '月光', '战鬼', '灵铸', '破晓'];
    const names = rng.pickN(namePool, 5);
    const scores = names.map(name => ({ name, score: rng.nextInt(200, 1200) }));
    return scores.sort((a, b) => b.score - a.score);
  }
}

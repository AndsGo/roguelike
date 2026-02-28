import heroesData from './data/heroes.json';
import relicsData from './data/relics.json';

/** Look up the Chinese display name of a relic by ID */
function getRelicDisplayName(relicId: string): string {
  const relic = (relicsData as { id: string; name: string }[]).find(r => r.id === relicId);
  return relic?.name ?? relicId;
}

/**
 * Centralized Chinese localization strings for all UI text.
 */
export const UI = {
  // MainMenuScene
  mainMenu: {
    title: '自走棋\n自动战斗',
    subtitle: '自动战斗  |  策略  |  冒险',
    continueBtn: (stage: number, heroCount: number) => `继续 (第${stage}关, ${heroCount}名英雄)`,
    continue: '继续',
    newGame: '新游戏',
    upgrades: '升级',
    version: 'v0.3.0 - Phase B+',
    stats: (runs: number, victories: number, heroCount: number, totalHeroes: number, souls: number) =>
      `冒险: ${runs}  |  胜利: ${victories}  |  英雄: ${heroCount}/${totalHeroes}  |  灵魂: ${souls}`,
    confirmOverwrite: '现有存档将丢失。\n是否继续？',
    yes: '是',
    no: '否',
    upgradeTitle: '永久升级',
    souls: (n: number) => `灵魂: ${n}`,
    buy: '购买',
    max: '已满',
    close: '[关闭]',
  },

  // MapScene
  map: {
    title: '冒险地图',
    actLabel: (act: number, name: string) => `第${act}章: ${name}`,
    floorLabel: (act: number, name: string, floor: number) => `第${act}章: ${name} - 第${floor}层`,
    gold: (n: number) => `${n}G`,
    enterAct: (act: number) => `进入第${act}章`,
    continueBtn: '继续',
    runStats: (heroes: number, relics: number, completed: number, total: number) =>
      `英雄:${heroes}  遗物:${relics}  进度:${completed}/${total}`,
  },

  // Node types
  nodeType: {
    battle: '战斗',
    elite: '精英',
    boss: '首领',
    shop: '商店',
    event: '事件',
    rest: '休息',
  } as Record<string, string>,

  // BattleScene
  battle: {
    boss: '首领',
    elite: '精英',
    battle: '战斗',
    victory: '胜利',
    defeat: '失败',
    pause: '暂停',
    pauseBtn: '[暂停]',
    resume: '继续',
    settings: '设置',
    abandonBattle: '放弃战斗',
  },

  // RewardScene
  reward: {
    title: '胜利！',
    gold: (n: number) => `金币: +${n}`,
    exp: (n: number) => `经验: +${n}`,
    survivors: (n: number) => `存活: ${n}`,
    totalGold: (n: number) => `总金币: ${n}`,
    continueBtn: '继续',
    battleStatsHeader: '战斗统计',
    dmg: '伤害',
    heal: '治疗',
    kills: '击杀',
  },

  // ShopScene
  shop: {
    title: '商店',
    selectHero: '选择英雄:',
    leaveShop: '离开商店',
    buy: '购买',
    selectFirst: '请先选择一名英雄！',
    noGold: '金币不足！',
    equipped: (name: string) => `已装备 ${name}！`,
    replaced: (newName: string, oldName: string) => `已装备 ${newName}，替换了 ${oldName}`,
    vsEmpty: '对比: (空槽位)',
    vsSame: (name: string) => `对比 ${name}: 属性相同`,
    vs: (name: string) => `对比 ${name}: `,
  },

  // RestScene
  rest: {
    title: '休息',
    campfireText: '你的队伍在篝火旁休息...',
    teamStatus: '队伍状态:',
    restBtn: (percent: number) => `休息 (恢复${percent}%生命)`,
    restored: '队伍已恢复！',
    continueBtn: '继续',
  },

  // EventScene
  event: {
    goldEffect: (v: number) => `金币 ${v > 0 ? '+' : ''}${v}`,
    healEffect: (v: number) => `恢复 ${Math.round(v * 100)}% 生命`,
    damageEffect: (v: number) => `受到 ${Math.round(v * 100)}% 生命伤害`,
    statBoost: (v: number) => `属性提升 +${v}`,
    relicAcquired: (id: string) => `获得遗物: ${getRelicDisplayName(id)}`,
    itemGold: (v: number) => `金币 +${v}`,
    continueBtn: '继续',
    probability: (pct: number) => `${pct}%`,
  },

  // GameOverScene
  gameOver: {
    title: '游戏结束',
    subtitle: '你的队伍被击败了...',
    reached: (stage: number) => `到达: 第${stage}关`,
    goldEarned: (n: number) => `获得金币: ${n}`,
    soulsEarned: (n: number) => `获得灵魂: +${n}`,
    achievementsUnlocked: (n: number) => `解锁成就: ${n}`,
    andMore: (n: number) => `...还有${n}个`,
    unlockedHeroes: (names: string) => `已解锁英雄: ${names}`,
    mainMenu: '主菜单',
  },

  // VictoryScene
  victory: {
    title: '胜利！',
    subtitle: '你击败了最终首领！',
    finalTeam: '最终队伍:',
    finalGold: (n: number) => `最终金币: ${n}`,
    soulsEarned: (n: number) => `获得灵魂: +${n}`,
    achievementsUnlocked: (n: number) => `解锁成就: ${n}`,
    andMore: (n: number) => `...还有${n}个`,
    unlockedHeroes: (names: string) => `已解锁英雄: ${names}`,
    mainMenu: '主菜单',
  },

  // BattleHUD
  hud: {
    stats: '[统计]',
    dmgStats: '伤害统计',
  },

  // HeroCard
  heroCard: {
    atk: (v: number) => `攻:${v}`,
    def: (v: number) => `防:${v}`,
    atkDef: (atk: number, def: number) => `攻:${atk}  防:${def}`,
    spd: (v: number) => `速度: ${v}`,
    aspd: (v: number) => `攻速: ${v.toFixed(1)}`,
    spdAspd: (spd: number, aspd: number) => `速度: ${spd}  攻速: ${aspd.toFixed(1)}`,
    crit: (chance: number, dmg: number) => `暴击: ${Math.round(chance * 100)}%  x${dmg}`,
    magicPow: (v: number) => `法力: ${v}`,
    magicRes: (v: number) => `法抗: ${v}`,
    range: (v: number) => `射程: ${v}`,
    skills: (s: string) => `技能: ${s}`,
  },

  // Hero unlock
  heroUnlock: {
    title: '英雄解锁',
    unlocked: '已解锁',
    locked: '未解锁',
    default: '默认英雄',
    victory: '通关1次',
    runs3: '完成3次冒险',
    element: (e: string) => `元素: ${e}`,
    noElement: '无元素',
  },

  // Difficulty selection
  difficulty: {
    title: '选择难度',
    locked: (req: string) => `需要: ${req}`,
    victoryReq: (n: number) => `${n}次通关`,
    multiplier: (n: number) => `敌人 ×${n}`,
    rewardMultiplier: (n: number) => `奖励 ×${n}`,
    start: '开始',
  },

  // HeroDraftScene
  heroDraft: {
    title: '选择初始英雄',
    subtitle: '选择2-3名英雄开始冒险',
    locked: '未解锁',
    selected: (n: number, max: number) => `已选: ${n}/${max}`,
    startBtn: '开始冒险',
    needMore: '至少选择2名英雄',
    backBtn: '返回',
  },

  // Audio
  audio: {
    bgmOn: '音乐:开',
    bgmOff: '音乐:关',
    sfxOn: '音效:开',
    sfxOff: '音效:关',
    volume: '音量',
  },

  // SkillBar
  skillBar: {
    ready: '就绪',
    cooldown: '冷却中',
    auto: '自动',
    manual: '手动',
    semiAuto: '半自动',
  },

  // Act modifiers
  actModifier: {
    forest: '森林祝福: 每15秒全体治疗5%',
    volcano: '火焰大地: 静止单位受灼烧伤害',
    abyss: '深渊黑暗: 周期性降低攻击范围',
  },

  // Settings
  settings: {
    title: '设置',
    bgmVolume: '音乐音量',
    sfxVolume: '音效音量',
    resetTutorials: '重置教程',
    resetTutorialsDone: '已重置',
    resetMeta: '重置永久进度',
    resetMetaConfirm: '确认重置？所有升级和解锁将丢失！',
    resetMetaDone: '已重置所有永久进度',
    deleteSave: (slot: number) => `删除存档 ${slot + 1}`,
    deleteSaveConfirm: (slot: number) => `确认删除存档 ${slot + 1}？`,
    saveEmpty: (slot: number) => `存档 ${slot + 1}: 空`,
    saveInfo: (slot: number, floor: number, heroes: number) =>
      `存档 ${slot + 1}: 第${floor}关, ${heroes}英雄`,
    back: '返回',
    on: '开',
    off: '关',
    keybindings: '快捷键',
  },

  // Tutorial
  tutorial: {
    clickToContinue: '[ 点击继续 ]',
    skipAll: '[跳过教程]',
    skipped: '已跳过所有教程',
  },
};

/** Stat key → Chinese label */
export const STAT_LABELS: Record<string, string> = {
  attack: '攻击',
  defense: '防御',
  maxHp: '生命',
  hp: '生命',
  magicPower: '法力',
  magicResist: '法抗',
  speed: '速度',
  attackSpeed: '攻速',
  attackRange: '射程',
  critChance: '暴击率',
  critDamage: '暴击伤害',
};

/** Stat keys that should display as percentages */
const PERCENT_STATS = new Set(['critChance', 'critDamage', 'attackSpeed']);

/** Format a stat with Chinese label: `attack:+20` → `攻击:+20`, `critChance:0.05` → `暴击率:+5%` */
export function formatStat(key: string, value: number): string {
  const label = STAT_LABELS[key] ?? key;
  if (PERCENT_STATS.has(key)) {
    const pct = key === 'critDamage' ? value : Math.round(value * 100);
    const sign = pct > 0 ? '+' : '';
    return `${label}:${sign}${pct}${key === 'critDamage' ? '' : '%'}`;
  }
  const sign = value > 0 ? '+' : '';
  return `${label}:${sign}${value}`;
}

/** Format a stat diff for shop comparison: `attack:+5` → `攻击:+5` */
export function formatStatDiff(key: string, diff: number): string {
  const label = STAT_LABELS[key] ?? key;
  if (PERCENT_STATS.has(key)) {
    const pct = key === 'critDamage' ? diff : Math.round(diff * 100);
    const sign = pct > 0 ? '+' : '';
    return `${label}:${sign}${pct}${key === 'critDamage' ? '' : '%'}`;
  }
  const sign = diff > 0 ? '+' : '';
  return `${label}:${sign}${diff}`;
}

/** Equipment slot → Chinese label */
export const SLOT_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
};

/** Permanent upgrade names */
export const UPGRADE_NAMES: Record<string, string> = {
  starting_gold: '初始金币',
  starting_hp: '初始生命',
  exp_bonus: '经验加成',
  crit_bonus: '暴击加成',
  relic_chance: '遗物几率',
};

/** Look up the Chinese display name of a hero by ID */
export function getHeroDisplayName(heroId: string): string {
  const hero = (heroesData as { id: string; name: string }[]).find(h => h.id === heroId);
  return hero?.name ?? heroId;
}

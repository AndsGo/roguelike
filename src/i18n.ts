import heroesData from './data/heroes.json';
import enemiesData from './data/enemies.json';
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
    version: 'v1.11.0',
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
    hiddenNode: '???',
    hiddenCost: (cost: number) => `${cost}G 揭示`,
    hiddenNoGold: '金币不足',
    hiddenRevealed: '发现了隐藏路径！',
  },

  formation: {
    title: '阵型',
    front: '前排',
    back: '后排',
    autoAssign: '自动分配',
    tip: '前排英雄更容易被近战敌人攻击',
  },

  // Node types
  nodeType: {
    battle: '战斗',
    elite: '精英',
    boss: '首领',
    shop: '商店',
    event: '事件',
    rest: '休息',
    gauntlet: '连战',
  } as Record<string, string>,

  wave: {
    indicator: (current: number, total: number) => `第${current}波 / 共${total}波`,
    cleared: '波次清除！',
    next: '下一波即将到来...',
    gauntletTooltip: (waves: number) => `连战 · ${waves}波`,
  },

  // Mutations
  mutation: {
    title: '变异升级',
    locked: (remaining: number) => `再升级${remaining}级解锁变异`,
    unlocked: '已解锁',
    extra_draft_pick: '额外征召',
    shop_extra_item: '商人好感',
    start_with_relic: '遗物直觉',
    first_event_safe: '先知之眼',
    overkill_splash: '溢杀扩散',
    crit_cooldown: '暴击加速',
    heal_shield: '过量护盾',
    reaction_chain: '连锁反应',
    desc_extra_draft_pick: '英雄征召多提供1个选择',
    desc_shop_extra_item: '商店多展示1件商品',
    desc_start_with_relic: '每局开始获得1个随机遗物',
    desc_first_event_safe: '首个事件必有安全选项',
    desc_overkill_splash: '击杀溢出伤害30%溅射',
    desc_crit_cooldown: '暴击减少技能冷却1秒',
    desc_heal_shield: '溢出治疗转50%护盾',
    desc_reaction_chain: '元素反应25%传递元素',
  },

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
    ultimateReady: '终极技就绪!',
    ultimateUsed: '终极技释放!',
    bossPhase: (n: number) => `阶段 ${n}！`,
    bossShield: '护盾激活！',
    bossEnrage: '狂暴化！',
    bossDamageReduction: '防御强化！',
    statusDot: '灼烧',
    statusHot: '回复',
    statusStun: '眩晕',
    statusBuff: '增益',
    statusDebuff: '减益',
    statusSlow: '减速',
    statusTaunt: '嘲讽',
    statusPerSec: (v: number) => `${v}/秒`,
    statusRemaining: (s: number) => `${s.toFixed(1)}s`,
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
    synergyLabel: '协同:',
    synergyProgress: (name: string, count: number, next: number) => `${name}(${count}/${next})`,
    synergyActive: (name: string, count: number, threshold: number) => `${name}(${count}/${threshold})✓`,
  },

  // RestScene
  rest: {
    title: '休息',
    campfireText: '你的队伍在篝火旁休息...',
    teamStatus: '队伍状态:',
    restBtn: (percent: number) => `休息 (恢复${percent}%生命)`,
    trainBtn: '训练 (全队+经验)',
    scavengeBtn: '搜索 (获得金币)',
    restDesc: (percent: number) => `全队恢复${percent}%生命值`,
    trainDesc: (exp: number) => `每名英雄获得${exp}经验`,
    scavengeDesc: (min: number, max: number) => `获得${min}-${max}金币`,
    restored: '队伍已恢复！',
    trainResult: (exp: number) => `全队每人获得了 ${exp} 经验！`,
    scavengeResult: (gold: number) => `搜索到了 ${gold} 金币！`,
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
    riskLow: '低风险',
    riskMedium: '中风险',
    riskHigh: '高风险',
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
    retry: '再来一次',
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
    victory: (n: number) => `通关${n}次`,
    runs: (n: number) => `完成${n}次冒险`,
    floor: (n: number) => `到达第${n}层`,
    element_wins: (element: string, n: number) => `使用${n}名${element}英雄通关`,
    boss_kill: (bossName: string) => `击败${bossName}`,
    no_healer_win: '不携带治疗者通关',
    no_healer_win_hard: (diff: string) => `在${diff}难度下不携带治疗者通关`,
    full_element_team: (element: string) => `使用全${element}队伍通关`,
    relic_count: (n: number) => `携带${n}个以上遗物完成一局`,
    hero_used: (heroName: string) => `使用${heroName}通关`,
    element: (e: string) => `元素: ${e}`,
    noElement: '无元素',
  },

  // Element display names (for unlock conditions)
  elementNames: {
    fire: '火',
    ice: '冰',
    lightning: '雷',
    dark: '暗',
    holy: '圣',
  } as Record<string, string>,

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
    synergyPlaceholder: '选择英雄查看羁绊',
    noSynergy: '无羁绊',
  },

  // Audio
  audio: {
    bgmOn: '音乐:开',
    bgmOff: '音乐:关',
    sfxOn: '音效:开',
    sfxOff: '音效:关',
    volume: '音量',
  },

  // RunOverviewPanel
  runOverview: {
    title: '冒险概览',
    teamHeroes: '队伍英雄',
    relics: '获得遗物',
    synergies: '激活羁绊',
    runStats: '冒险信息',
    equipment: '装备一览',
    noRelics: '(无)',
    noSynergies: '(无)',
    close: '[ 关闭 ]',
    gold: (n: number) => `金币: ${n}`,
    floor: (act: number, floor: number) => `第${act}章 第${floor}层`,
    difficulty: (name: string) => `难度: ${name}`,
    threshold: (current: number, required: number) => `${current}/${required}`,
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

  // Shop categories (for map tooltips)
  shopCategory: {
    weapon: '武器为主',
    armor: '防具为主',
    accessory: '饰品为主',
    mixed: '综合商店',
  },

  // Codex
  codex: {
    title: '图鉴',
    heroTab: '英雄图鉴',
    monsterTab: '怪物图鉴',
    locked: '未解锁',
    unlockCondition: '解锁条件',
    unknown: '???',
    stats: '属性',
    skills: '技能',
    noSkills: '无技能',
    encounterUnlock: '在战斗中遇见即解锁',
    close: '[ 关闭 ]',
    heroCount: (unlocked: number, total: number) => `已解锁: ${unlocked}/${total}`,
    monsterCount: (seen: number, total: number) => `已发现: ${seen}/${total}`,
    baseStats: '基础属性',
    rewards: (gold: number, exp: number) => `奖励: ${gold}G / ${exp}EXP`,
    boss: '首领',
  },

  // BuildReviewPanel
  buildReview: {
    title: '战斗回顾',
    combatStats: '战斗数据',
    heroPerformance: '英雄表现',
    equipmentRelics: '装备与遗物',
    totalDamage: '总伤害',
    totalHealing: '总治疗',
    kills: '击杀',
    crits: '暴击',
    reactions: '元素反应',
    duration: '用时',
    goldEarned: '获得金币',
    goldSpent: '花费金币',
    maxCombo: '最大连击',
    skillsUsed: '使用技能',
    equipment: '装备',
    relics: '遗物',
    deaths: '阵亡',
    noEquipment: '无装备',
    close: '[关闭]',
  },

  // Daily challenge
  daily: {
    title: '每日挑战',
    completed: '今日已完成',
    start: '开始挑战',
    rules: '今日规则',
    info: '每天一次固定挑战，全球同步种子',
    score: (n: number) => `得分: ${n}`,
    challengeComplete: '每日挑战完成!',
    previewTitle: '每日挑战',
    difficulty: (name: string) => `难度: ${name}`,
    rulesLabel: '今日规则:',
    startBtn: '开始挑战',
    backBtn: '返回',
    leaderboardTitle: '每日排行',
    yourRank: (rank: number, total: number) => `排名: 第${rank}名 / ${total}人`,
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

/** Element name translations */
export const ELEMENT_NAMES: Record<string, string> = {
  fire: '火',
  ice: '冰',
  lightning: '雷',
  dark: '暗',
  holy: '光',
};

/** Race name translations */
export const RACE_NAMES: Record<string, string> = {
  human: '人类',
  elf: '精灵',
  beast: '兽族',
  demon: '恶魔',
  undead: '亡灵',
  dragon: '龙族',
  angel: '天使',
};

/** Class name translations */
export const CLASS_NAMES: Record<string, string> = {
  warrior: '战士',
  mage: '法师',
  rogue: '刺客',
  assassin: '刺客',
  ranger: '游侠',
  priest: '牧师',
  cleric: '牧师',
  knight: '骑士',
  paladin: '圣骑士',
};

/** Role name translations */
export const ROLE_NAMES: Record<string, string> = {
  tank: '坦克',
  melee_dps: '近战',
  ranged_dps: '远程',
  healer: '治疗',
  support: '辅助',
};

/** Achievement icon text to emoji mapping */
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  trophy: '\u{1F3C6}',
  medal: '\u{1F3C5}',
  lightning: '\u26A1',
  shield: '\u{1F6E1}',
  star: '\u2B50',
  sword: '\u2694\uFE0F',
  fire: '\u{1F525}',
  flame: '\u{1F525}',
  crown: '\u{1F451}',
  gem: '\u{1F48E}',
  scroll: '\u{1F4DC}',
  skull: '\u{1F480}',
  heart: '\u2764\uFE0F',
  magic: '\u2728',
  potion: '\u{1F9EA}',
  coin: '\u{1FA99}',
  book: '\u{1F4D6}',
  target: '\u{1F3AF}',
  muscle: '\u{1F4AA}',
  crystal: '\u{1F52E}',
  dragon: '\u{1F409}',
  hourglass: '\u231B',
  compass: '\u{1F9ED}',
  flag: '\u{1F3C1}',
  key: '\u{1F511}',
  bolt: '\u26A1',
  dice: '\u{1F3B2}',
  map: '\u{1F5FA}\uFE0F',
  arrow_up: '\u2B06\uFE0F',
  bag: '\u{1F4B0}',
  chest: '\u{1F4E6}',
  explosion: '\u{1F4A5}',
  nuke: '\u2622\uFE0F',
  wolf: '\u{1F43A}',
};

/** Format a hero unlock condition into a Chinese display string */
export function formatUnlockCondition(cond: {
  type: string;
  threshold?: number;
  element?: string;
  heroId?: string;
  bossId?: string;
  difficulty?: string;
  description: string;
}): string {
  switch (cond.type) {
    case 'default':
      return UI.heroUnlock.default;
    case 'victory':
      return UI.heroUnlock.victory(cond.threshold ?? 1);
    case 'runs':
      return UI.heroUnlock.runs(cond.threshold ?? 1);
    case 'floor':
      return UI.heroUnlock.floor(cond.threshold ?? 1);
    case 'element_wins':
      return UI.heroUnlock.element_wins(
        UI.elementNames[cond.element ?? ''] ?? cond.element ?? '',
        cond.threshold ?? 2,
      );
    case 'boss_kill': {
      const boss = (enemiesData as { id: string; name: string }[]).find(e => e.id === cond.bossId);
      return UI.heroUnlock.boss_kill(boss?.name ?? cond.bossId ?? '');
    }
    case 'no_healer_win':
      if (cond.difficulty) return UI.heroUnlock.no_healer_win_hard(cond.difficulty);
      return UI.heroUnlock.no_healer_win;
    case 'full_element_team':
      return UI.heroUnlock.full_element_team(
        UI.elementNames[cond.element ?? ''] ?? cond.element ?? '',
      );
    case 'relic_count':
      return UI.heroUnlock.relic_count(cond.threshold ?? 1);
    case 'hero_used': {
      const hero = (heroesData as { id: string; name: string }[]).find(h => h.id === cond.heroId);
      return UI.heroUnlock.hero_used(hero?.name ?? cond.heroId ?? '');
    }
    default:
      return cond.description;
  }
}

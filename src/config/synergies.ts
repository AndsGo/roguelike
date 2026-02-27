import { SynergyConfig } from '../types';

/**
 * Synergy definitions: race and class bonuses activated by team composition.
 */
export const SYNERGY_DEFINITIONS: SynergyConfig[] = [
  // ---- Race Synergies ----
  {
    id: 'synergy_human',
    name: '人类联盟',
    description: '人类获得均衡的属性加成',
    type: 'race',
    key: 'human',
    thresholds: [
      { count: 2, description: '全属性+5%', effects: [{ type: 'stat_boost', stat: 'attack', value: 5 }, { type: 'stat_boost', stat: 'defense', value: 5 }] },
      { count: 4, description: '全属性+15%', effects: [{ type: 'stat_boost', stat: 'attack', value: 15 }, { type: 'stat_boost', stat: 'defense', value: 15 }] },
    ],
  },
  {
    id: 'synergy_elf',
    name: '精灵优雅',
    description: '精灵获得攻速和暴击加成',
    type: 'race',
    key: 'elf',
    thresholds: [
      { count: 2, description: '攻速+10%', effects: [{ type: 'stat_boost', stat: 'attackSpeed', value: 0.1 }] },
      { count: 3, description: '暴击率+15%', effects: [{ type: 'stat_boost', stat: 'critChance', value: 0.15 }] },
    ],
  },
  {
    id: 'synergy_undead',
    name: '亡灵军团',
    description: '亡灵获得吸血和魔抗加成',
    type: 'race',
    key: 'undead',
    thresholds: [
      { count: 2, description: '法抗+10', effects: [{ type: 'stat_boost', stat: 'magicResist', value: 10 }] },
      { count: 4, description: '暗属性伤害+20%', effects: [{ type: 'damage_bonus', element: 'dark', value: 0.2 }] },
    ],
  },
  {
    id: 'synergy_demon',
    name: '恶魔契约',
    description: '恶魔获得强大力量，但需付出代价',
    type: 'race',
    key: 'demon',
    thresholds: [
      { count: 2, description: '攻击+20%', effects: [{ type: 'stat_boost', stat: 'attack', value: 20 }] },
      { count: 3, description: '法力+30%', effects: [{ type: 'stat_boost', stat: 'magicPower', value: 30 }] },
    ],
  },
  {
    id: 'synergy_beast',
    name: '野兽群落',
    description: '野兽获得速度和生命加成',
    type: 'race',
    key: 'beast',
    thresholds: [
      { count: 2, description: '速度+15%', effects: [{ type: 'stat_boost', stat: 'speed', value: 15 }] },
      { count: 3, description: '最大生命+100', effects: [{ type: 'stat_boost', stat: 'maxHp', value: 100 }] },
    ],
  },
  {
    id: 'synergy_dragon',
    name: '龙之威严',
    description: '龙族获得巨大力量',
    type: 'race',
    key: 'dragon',
    thresholds: [
      { count: 2, description: '全伤害+25%', effects: [{ type: 'damage_bonus', value: 0.25 }] },
    ],
  },

  // ---- Class Synergies ----
  {
    id: 'synergy_warrior',
    name: '战士之魂',
    description: '战士获得防御和生命加成',
    type: 'class',
    key: 'warrior',
    thresholds: [
      { count: 2, description: '防御+15', effects: [{ type: 'stat_boost', stat: 'defense', value: 15 }] },
      { count: 3, description: '最大生命+200', effects: [{ type: 'stat_boost', stat: 'maxHp', value: 200 }] },
    ],
  },
  {
    id: 'synergy_mage',
    name: '奥术之环',
    description: '法师增幅魔法伤害',
    type: 'class',
    key: 'mage',
    thresholds: [
      { count: 2, description: '法力+20', effects: [{ type: 'stat_boost', stat: 'magicPower', value: 20 }] },
      { count: 3, description: '元素反应伤害+30%', effects: [{ type: 'damage_bonus', value: 0.3 }] },
    ],
  },
  {
    id: 'synergy_ranger',
    name: '游侠精准',
    description: '游侠获得射程和暴击伤害加成',
    type: 'class',
    key: 'ranger',
    thresholds: [
      { count: 2, description: '攻击范围+50', effects: [{ type: 'stat_boost', stat: 'attackRange', value: 50 }] },
      { count: 3, description: '暴击伤害+0.5', effects: [{ type: 'stat_boost', stat: 'critDamage', value: 0.5 }] },
    ],
  },
  {
    id: 'synergy_cleric',
    name: '神圣祝福',
    description: '牧师提升治疗和抗性',
    type: 'class',
    key: 'cleric',
    thresholds: [
      { count: 2, description: '全体法抗+15', effects: [{ type: 'resistance', value: 15 }] },
    ],
  },
  {
    id: 'synergy_assassin',
    name: '暗影之术',
    description: '刺客获得暴击能力加成',
    type: 'class',
    key: 'assassin',
    thresholds: [
      { count: 2, description: '暴击率+15%', effects: [{ type: 'stat_boost', stat: 'critChance', value: 0.15 }] },
      { count: 3, description: '暴击伤害+1.0', effects: [{ type: 'stat_boost', stat: 'critDamage', value: 1.0 }] },
    ],
  },
  {
    id: 'synergy_paladin',
    name: '圣盾守护',
    description: '圣骑士保护队伍',
    type: 'class',
    key: 'paladin',
    thresholds: [
      { count: 2, description: '防御+20，法抗+10', effects: [{ type: 'stat_boost', stat: 'defense', value: 20 }, { type: 'stat_boost', stat: 'magicResist', value: 10 }] },
    ],
  },
];

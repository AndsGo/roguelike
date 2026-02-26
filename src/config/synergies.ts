import { SynergyConfig } from '../types';

/**
 * Synergy definitions: race and class bonuses activated by team composition.
 */
export const SYNERGY_DEFINITIONS: SynergyConfig[] = [
  // ---- Race Synergies ----
  {
    id: 'synergy_human',
    name: 'Human Alliance',
    description: 'Humans gain balanced stat bonuses',
    type: 'race',
    key: 'human',
    thresholds: [
      { count: 2, description: '+5% all stats', effects: [{ type: 'stat_boost', stat: 'attack', value: 5 }, { type: 'stat_boost', stat: 'defense', value: 5 }] },
      { count: 4, description: '+15% all stats', effects: [{ type: 'stat_boost', stat: 'attack', value: 15 }, { type: 'stat_boost', stat: 'defense', value: 15 }] },
    ],
  },
  {
    id: 'synergy_elf',
    name: 'Elven Grace',
    description: 'Elves gain attack speed and crit chance',
    type: 'race',
    key: 'elf',
    thresholds: [
      { count: 2, description: '+10% attack speed', effects: [{ type: 'stat_boost', stat: 'attackSpeed', value: 0.1 }] },
      { count: 3, description: '+15% crit chance', effects: [{ type: 'stat_boost', stat: 'critChance', value: 0.15 }] },
    ],
  },
  {
    id: 'synergy_undead',
    name: 'Undead Legion',
    description: 'Undead gain lifesteal and magic resist',
    type: 'race',
    key: 'undead',
    thresholds: [
      { count: 2, description: '+10 magic resist', effects: [{ type: 'stat_boost', stat: 'magicResist', value: 10 }] },
      { count: 4, description: 'Dark damage +20%', effects: [{ type: 'damage_bonus', element: 'dark', value: 0.2 }] },
    ],
  },
  {
    id: 'synergy_demon',
    name: 'Demon Pact',
    description: 'Demons gain raw power at a cost',
    type: 'race',
    key: 'demon',
    thresholds: [
      { count: 2, description: '+20% attack', effects: [{ type: 'stat_boost', stat: 'attack', value: 20 }] },
      { count: 3, description: '+30% magic power', effects: [{ type: 'stat_boost', stat: 'magicPower', value: 30 }] },
    ],
  },
  {
    id: 'synergy_beast',
    name: 'Beast Pack',
    description: 'Beasts gain speed and HP',
    type: 'race',
    key: 'beast',
    thresholds: [
      { count: 2, description: '+15% speed', effects: [{ type: 'stat_boost', stat: 'speed', value: 15 }] },
      { count: 3, description: '+100 max HP', effects: [{ type: 'stat_boost', stat: 'maxHp', value: 100 }] },
    ],
  },
  {
    id: 'synergy_dragon',
    name: 'Dragon Might',
    description: 'Dragons gain massive power',
    type: 'race',
    key: 'dragon',
    thresholds: [
      { count: 2, description: '+25% all damage', effects: [{ type: 'damage_bonus', value: 0.25 }] },
    ],
  },

  // ---- Class Synergies ----
  {
    id: 'synergy_warrior',
    name: 'Warrior Spirit',
    description: 'Warriors gain defense and HP',
    type: 'class',
    key: 'warrior',
    thresholds: [
      { count: 2, description: '+15 defense', effects: [{ type: 'stat_boost', stat: 'defense', value: 15 }] },
      { count: 3, description: '+200 max HP', effects: [{ type: 'stat_boost', stat: 'maxHp', value: 200 }] },
    ],
  },
  {
    id: 'synergy_mage',
    name: 'Arcane Circle',
    description: 'Mages amplify magic damage',
    type: 'class',
    key: 'mage',
    thresholds: [
      { count: 2, description: '+20 magic power', effects: [{ type: 'stat_boost', stat: 'magicPower', value: 20 }] },
      { count: 3, description: 'Element reactions +30% damage', effects: [{ type: 'damage_bonus', value: 0.3 }] },
    ],
  },
  {
    id: 'synergy_ranger',
    name: 'Ranger Precision',
    description: 'Rangers gain range and crit damage',
    type: 'class',
    key: 'ranger',
    thresholds: [
      { count: 2, description: '+50 attack range', effects: [{ type: 'stat_boost', stat: 'attackRange', value: 50 }] },
      { count: 3, description: '+0.5 crit damage', effects: [{ type: 'stat_boost', stat: 'critDamage', value: 0.5 }] },
    ],
  },
  {
    id: 'synergy_cleric',
    name: 'Divine Blessing',
    description: 'Clerics improve healing and resistance',
    type: 'class',
    key: 'cleric',
    thresholds: [
      { count: 2, description: '+15 magic resist for all', effects: [{ type: 'resistance', value: 15 }] },
    ],
  },
  {
    id: 'synergy_assassin',
    name: 'Shadow Arts',
    description: 'Assassins gain critical strike power',
    type: 'class',
    key: 'assassin',
    thresholds: [
      { count: 2, description: '+15% crit chance', effects: [{ type: 'stat_boost', stat: 'critChance', value: 0.15 }] },
      { count: 3, description: '+1.0 crit damage', effects: [{ type: 'stat_boost', stat: 'critDamage', value: 1.0 }] },
    ],
  },
  {
    id: 'synergy_paladin',
    name: 'Holy Shield',
    description: 'Paladins protect the team',
    type: 'class',
    key: 'paladin',
    thresholds: [
      { count: 2, description: '+20 defense, +10 magic resist', effects: [{ type: 'stat_boost', stat: 'defense', value: 20 }, { type: 'stat_boost', stat: 'magicResist', value: 10 }] },
    ],
  },
];

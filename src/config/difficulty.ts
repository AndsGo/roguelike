import { DifficultyConfig } from '../types';

export const DIFFICULTY_LEVELS: DifficultyConfig[] = [
  {
    id: 'normal',
    name: '普通',
    description: '适合新手的标准难度',
    enemyStatMultiplier: 1.0,
    enemyCountBonus: 0,
    goldMultiplier: 1.0,
    expMultiplier: 1.0,
    eliteChanceBonus: 0,
  },
  {
    id: 'hard',
    name: '困难',
    description: '更强的敌人，更好的奖励',
    enemyStatMultiplier: 1.3,
    enemyCountBonus: 1,
    goldMultiplier: 1.2,
    expMultiplier: 1.2,
    eliteChanceBonus: 0.1,
  },
  {
    id: 'nightmare',
    name: '噩梦',
    description: '仅限经验丰富的玩家',
    enemyStatMultiplier: 1.6,
    enemyCountBonus: 2,
    goldMultiplier: 1.5,
    expMultiplier: 1.5,
    eliteChanceBonus: 0.2,
  },
  {
    id: 'hell',
    name: '地狱',
    description: '终极挑战',
    enemyStatMultiplier: 2.0,
    enemyCountBonus: 3,
    goldMultiplier: 2.0,
    expMultiplier: 2.0,
    eliteChanceBonus: 0.3,
  },
];

export function getDifficultyConfig(id: string): DifficultyConfig {
  return DIFFICULTY_LEVELS.find(d => d.id === id) ?? DIFFICULTY_LEVELS[0];
}

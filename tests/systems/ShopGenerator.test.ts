import { describe, it, expect } from 'vitest';
import { ShopGenerator } from '../../src/systems/ShopGenerator';
import { SeededRNG } from '../../src/utils/rng';
import itemsData from '../../src/data/items.json';
import { ItemData } from '../../src/types';

const allItems = itemsData as ItemData[];

describe('ShopGenerator', () => {
  // ===== 基本生成 =====

  it('指定数量时返回正确数量的物品', () => {
    const rng = new SeededRNG(1);
    const items = ShopGenerator.generate(rng, 0, 5);
    expect(items.length).toBe(5);
  });

  it('不指定数量时返回 4-6 个物品', () => {
    // 跑多次确认范围
    for (let seed = 0; seed < 20; seed++) {
      const rng = new SeededRNG(seed);
      const items = ShopGenerator.generate(rng, 0);
      expect(items.length).toBeGreaterThanOrEqual(4);
      expect(items.length).toBeLessThanOrEqual(6);
    }
  });

  it('同一商店内无重复物品', () => {
    const rng = new SeededRNG(42);
    const items = ShopGenerator.generate(rng, 1, 6);
    const ids = items.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ===== 确定性 =====

  it('相同种子产生相同结果', () => {
    const items1 = ShopGenerator.generate(new SeededRNG(123), 0, 5);
    const items2 = ShopGenerator.generate(new SeededRNG(123), 0, 5);
    expect(items1.map(i => i.id)).toEqual(items2.map(i => i.id));
  });

  it('不同种子产生不同结果', () => {
    const items1 = ShopGenerator.generate(new SeededRNG(1), 0, 5);
    const items2 = ShopGenerator.generate(new SeededRNG(999), 0, 5);
    const ids1 = items1.map(i => i.id).join(',');
    const ids2 = items2.map(i => i.id).join(',');
    expect(ids1).not.toBe(ids2);
  });

  // ===== Act → Stage 映射 =====

  it('Act 0 使用 early 权重 (无 legendary)', () => {
    // 大量采样确认
    const legendaryCount = { count: 0, total: 0 };
    for (let seed = 0; seed < 50; seed++) {
      const items = ShopGenerator.generate(new SeededRNG(seed), 0, 5);
      legendaryCount.total += items.length;
      legendaryCount.count += items.filter(i => i.rarity === 'legendary').length;
    }
    // early 权重中 legendary=0, 不应出现
    expect(legendaryCount.count).toBe(0);
  });

  it('Act 1 使用 mid 权重 (无 legendary)', () => {
    const legendaryCount = { count: 0, total: 0 };
    for (let seed = 0; seed < 50; seed++) {
      const items = ShopGenerator.generate(new SeededRNG(seed), 1, 5);
      legendaryCount.total += items.length;
      legendaryCount.count += items.filter(i => i.rarity === 'legendary').length;
    }
    expect(legendaryCount.count).toBe(0);
  });

  it('Act 2+ 使用 late 权重 (legendary 可能出现)', () => {
    // late 权重 legendary=5, 样本足够大应有出现
    let hasLegendary = false;
    for (let seed = 0; seed < 200; seed++) {
      const items = ShopGenerator.generate(new SeededRNG(seed), 2, 6);
      if (items.some(i => i.rarity === 'legendary')) {
        hasLegendary = true;
        break;
      }
    }
    // 数据中需要有 legendary 物品才能出现
    const legendaryItems = allItems.filter(i => i.rarity === 'legendary');
    if (legendaryItems.length > 0) {
      expect(hasLegendary).toBe(true);
    }
  });

  // ===== 稀有度分布 =====

  it('early 阶段 common 占比最高', () => {
    const rarityCounts: Record<string, number> = {};
    for (let seed = 0; seed < 100; seed++) {
      const items = ShopGenerator.generate(new SeededRNG(seed), 0, 5);
      for (const item of items) {
        rarityCounts[item.rarity] = (rarityCounts[item.rarity] ?? 0) + 1;
      }
    }
    // common 应该是最多的 (权重 50)
    const commonCount = rarityCounts['common'] ?? 0;
    const uncommonCount = rarityCounts['uncommon'] ?? 0;
    expect(commonCount).toBeGreaterThan(uncommonCount);
  });

  // ===== 返回有效物品 =====

  it('返回的物品都有有效的 id/name/rarity/cost', () => {
    const rng = new SeededRNG(42);
    const items = ShopGenerator.generate(rng, 1, 6);
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.rarity).toBeTruthy();
      expect(item.cost).toBeGreaterThan(0);
    }
  });

  // ===== 边界情况 =====

  it('请求超过物品总数时不崩溃', () => {
    const rng = new SeededRNG(42);
    // 请求远超物品池的数量
    const items = ShopGenerator.generate(rng, 0, allItems.length + 10);
    // 最多返回 allItems.length 个（不重复）
    expect(items.length).toBeLessThanOrEqual(allItems.length);
    expect(items.length).toBeGreaterThan(0);
  });
});

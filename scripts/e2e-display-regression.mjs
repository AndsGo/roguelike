import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE_URL = process.env.E2E_URL ?? 'http://127.0.0.1:5173';
const OUT_DIR = path.resolve('docs/e2e-regression-2026-06-11');
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720, isMobile: false },
  { name: 'mobile-landscape', width: 844, height: 390, isMobile: true },
];

const badTextPatterns = [
  /undefined/i,
  /NaN/,
  /\[object Object\]/,
  /\uFFFD/,
];

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function analyzeImage(file) {
  const image = sharp(file).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let min = 255;
  let max = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a > 8) opaque++;
    const lum = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }
  return {
    width: info.width,
    height: info.height,
    contrast: max - min,
    opaqueRatio: opaque / (info.width * info.height),
  };
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
  });
  const page = await context.newPage();
  const result = {
    viewport: vp,
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    textIssues: [],
    numericChecks: [],
    interactions: [],
    sceneSamples: [],
  };

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      result.consoleErrors.push(msg.text().slice(0, 500));
    }
  });
  page.on('pageerror', err => result.pageErrors.push(err.message));
  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('favicon')) {
      result.requestFailures.push(`${req.failure()?.errorText ?? 'failed'} ${url}`);
    }
  });

  async function canvasBox() {
    const canvas = await page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 10_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No canvas bounding box');
    return box;
  }

  async function clickGame(x, y, label) {
    const box = await canvasBox();
    await page.mouse.click(box.x + x, box.y + y);
    result.interactions.push(label);
    await page.waitForTimeout(450);
  }

  async function tapGame(x, y, label) {
    const box = await canvasBox();
    await page.touchscreen.tap(box.x + x, box.y + y);
    result.interactions.push(label);
    await page.waitForTimeout(450);
  }

  const input = vp.isMobile ? tapGame : clickGame;

  async function activeScenes() {
    return page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      return game ? game.scene.getScenes(true).map(scene => scene.scene.key) : [];
    });
  }

  async function stageScene(sceneName, data = {}) {
    await page.evaluate(({ sceneName, data }) => {
      const game = window.__PHASER_GAME__;
      game.scene.getScenes(true).forEach(scene => {
        if (scene.scene.key !== sceneName) game.scene.stop(scene.scene.key);
      });
      game.scene.start(sceneName, data);
    }, { sceneName, data });
    await page.waitForTimeout(1200);
  }

  async function findButton(sceneName, matcherSource) {
    return page.evaluate(({ sceneName, matcherSource }) => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene.getScene(sceneName);
      if (!scene) return null;
      const matcher = new RegExp(matcherSource);
      const candidates = [];
      const walk = (obj, px = 0, py = 0) => {
        const x = px + (obj.x || 0);
        const y = py + (obj.y || 0);
        if (obj.type === 'Text' && matcher.test(String(obj.text ?? ''))) {
          try {
            const b = obj.getBounds();
            candidates.push({
              x: Math.round(b.centerX),
              y: Math.round(b.centerY),
              text: String(obj.text),
            });
          } catch {
            candidates.push({ x: Math.round(x), y: Math.round(y), text: String(obj.text) });
          }
        }
        if (obj.list) obj.list.forEach(child => walk(child, x, y));
      };
      scene.children.list.forEach(child => walk(child));
      return candidates[0] ?? null;
    }, { sceneName, matcherSource });
  }

  async function textSnapshot(sceneName) {
    return page.evaluate(sceneName => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene.getScene(sceneName);
      if (!game || !scene) return { sceneName, gameSize: null, texts: [] };
      const gameSize = { width: game.scale.gameSize.width, height: game.scale.gameSize.height };
      const texts = [];
      const walk = (obj, px = 0, py = 0, depth = 0) => {
        const x = px + (obj.x || 0);
        const y = py + (obj.y || 0);
        const objDepth = obj.depth ?? depth;
        if (obj.type === 'Text' && obj.visible !== false && (obj.alpha ?? 1) > 0.01) {
          let bounds = null;
          try {
            const b = obj.getBounds();
            bounds = {
              x: Math.round(b.x),
              y: Math.round(b.y),
              width: Math.round(b.width),
              height: Math.round(b.height),
            };
          } catch {
            bounds = {
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(obj.width || 0),
              height: Math.round(obj.height || 0),
            };
          }
          texts.push({
            text: String(obj.text ?? ''),
            x: Math.round(x),
            y: Math.round(y),
            depth: objDepth,
            fontSize: obj.style?.fontSize ?? null,
            bounds,
            interactive: Boolean(obj.input?.enabled),
          });
        }
        if (obj.list) obj.list.forEach(child => walk(child, x, y, objDepth));
      };
      scene.children.list.forEach(child => walk(child));
      return { sceneName, gameSize, texts };
    }, sceneName);
  }

  async function recordScene(sceneName, label, expectations = []) {
    await page.waitForTimeout(600);
    const active = await activeScenes();
    const file = path.join(OUT_DIR, `${vp.name}-${String(result.screenshots.length + 1).padStart(2, '0')}-${safeName(label)}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const image = await analyzeImage(file);
    const snapshot = await textSnapshot(sceneName);
    const textBlob = snapshot.texts.map(t => t.text).join('\n');
    const sample = snapshot.texts
      .filter(t => /\d|HP|Lv|G|金币|经验|伤害|治疗|击杀|%|\/|x/.test(t.text))
      .slice(0, 16)
      .map(t => t.text);

    result.screenshots.push({ label, file, image });
    result.sceneSamples.push({
      label,
      sceneName,
      activeScenes: active,
      textCount: snapshot.texts.length,
      numericSamples: sample,
    });

    if (image.contrast < 12 || image.opaqueRatio < 0.05) {
      result.textIssues.push(`[${label}] screenshot may be blank: contrast=${image.contrast}, opaque=${image.opaqueRatio.toFixed(3)}`);
    }

    for (const t of snapshot.texts) {
      if (badTextPatterns.some(re => re.test(t.text))) {
        result.textIssues.push(`[${label}] bad text "${t.text}" at ${t.x},${t.y}`);
      }
      const b = t.bounds;
      const gs = snapshot.gameSize;
      if (gs && b.width > 0 && b.height > 0) {
        const outside = b.x < -6 || b.y < -6 || b.x + b.width > gs.width + 6 || b.y + b.height > gs.height + 6;
        if (outside && t.depth >= 0) {
          result.textIssues.push(`[${label}] text out of game bounds "${t.text.slice(0, 80)}" bounds=${JSON.stringify(b)} game=${gs.width}x${gs.height}`);
        }
      }
    }

    for (const check of expectations) {
      const pass = check.pattern.test(textBlob);
      result.numericChecks.push({ label, name: check.name, pass });
      if (!pass) {
        result.textIssues.push(`[${label}] missing expected display: ${check.name}`);
      }
    }
  }

  async function startNewRun() {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      localStorage.setItem('roguelike_seen_tips', JSON.stringify([
        'first_battle',
        'first_shop',
        'first_event',
        'first_rest',
        'first_map',
        'first_element',
        'first_synergy',
        'first_relic',
        'first_elite',
        'first_boss',
        'first_evolution',
        'manual_skills',
      ]));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await recordScene('MainMenuScene', 'main menu', [
      { name: 'version or stats number', pattern: /\d/ },
    ]);

    await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene.getScene('MainMenuScene');
      scene?.showDifficultySelection?.();
    });
    result.interactions.push('main menu -> show difficulty dialog (scene-staged)');
    await page.waitForTimeout(450);
    await recordScene('MainMenuScene', 'difficulty dialog', [
      { name: 'difficulty multiplier', pattern: /x\d|倍|奖励|敌人/ },
    ]);

    await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      game.scene.getScenes(true).forEach(scene => {
        if (scene.scene.key !== 'HeroDraftScene') game.scene.stop(scene.scene.key);
      });
      game.scene.start('HeroDraftScene', { difficulty: 'normal' });
    });
    result.interactions.push('difficulty -> hero draft normal (scene-staged)');
    await page.waitForTimeout(1600);
    await recordScene('HeroDraftScene', 'hero draft initial', [
      { name: 'selection count', pattern: /\d\s*\/\s*\d/ },
    ]);

    const draftInfo = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene.getScene('HeroDraftScene');
      if (!scene) return { targets: [], maxSelection: 4 };
      const grid = scene.gridContainer;
      if (!grid?.list) return { targets: [], maxSelection: 4 };
      const targets = [];
      for (const card of grid.list) {
        if (card.type !== 'Container' || !card.list) continue;
        const hasHitZone = card.list.some(child => child.type === 'Rectangle' && child.input?.enabled);
        if (!hasHitZone) continue;
        const name = card.list.find(child => child.type === 'Text' && String(child.text ?? '').trim());
        let bounds = null;
        try { bounds = card.getBounds(); } catch {}
        targets.push({
          x: Math.round(bounds?.centerX ?? ((grid.x || 0) + (card.x || 0))),
          y: Math.round(bounds?.centerY ?? ((grid.y || 0) + (card.y || 0))),
          text: String(name?.text ?? 'hero'),
        });
      }
      const texts = [];
      const walk = obj => {
        if (obj.type === 'Text') texts.push(String(obj.text ?? ''));
        if (obj.list) obj.list.forEach(walk);
      };
      scene.children.list.forEach(walk);
      const selected = texts.find(t => /\d\s*\/\s*\d/.test(t));
      const match = selected?.match(/\/\s*(\d+)/);
      return { targets: targets.slice(0, 5), maxSelection: match ? Number(match[1]) : 4 };
    });
    await page.evaluate(maxSelection => {
      const scene = window.__PHASER_GAME__?.scene.getScene('HeroDraftScene');
      const ids = Array.from(scene?.cardContainers?.keys?.() ?? []).slice(0, maxSelection);
      ids.forEach(id => scene.toggleHeroSelection?.(id));
    }, draftInfo.maxSelection);
    result.interactions.push(`select ${draftInfo.maxSelection} heroes (scene-staged)`);
    await page.waitForTimeout(450);
    await recordScene('HeroDraftScene', 'hero draft selected', [
      { name: `selected ${draftInfo.maxSelection} of ${draftInfo.maxSelection}`, pattern: new RegExp(`${draftInfo.maxSelection}\\s*\\/\\s*${draftInfo.maxSelection}`) },
    ]);

    await page.evaluate(() => {
      const scene = window.__PHASER_GAME__?.scene.getScene('HeroDraftScene');
      scene?.startRun?.();
    });
    result.interactions.push('hero draft -> map (scene-staged)');
    await page.waitForTimeout(2000);
    const postStartScenes = await activeScenes();
    if (!postStartScenes.includes('MapScene')) {
      throw new Error(`Expected MapScene after hero draft, got ${postStartScenes.join(', ')}`);
    }
    await recordScene('MapScene', 'map initial', [
      { name: 'gold display', pattern: /\d+\s*G|金币/ },
      { name: 'floor or node number', pattern: /第\s*\d|层|Floor|\d+\s*\/\s*\d/ },
    ]);
  }

  async function clickFirstMapNode() {
    const node = await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game?.scene.getScene('MapScene');
      if (!scene) return null;
      const mapContainer = scene.mapContainer;
      const nodes = [];
      const walk = (obj, px = 0, py = 0) => {
        const x = px + (obj.x || 0);
        const y = py + (obj.y || 0);
        if (obj.input?.enabled && obj.type === 'Arc') {
          let bounds = null;
          try { bounds = obj.getBounds(); } catch {}
          nodes.push({
            x: Math.round(bounds?.centerX ?? x),
            y: Math.round(bounds?.centerY ?? y),
            alpha: obj.alpha ?? 1,
            cursor: obj.input?.cursor ?? '',
          });
        }
        if (obj.list) obj.list.forEach(child => walk(child, x, y));
      };
      if (mapContainer) walk(mapContainer);
      else scene.children.list.forEach(child => walk(child));
      return nodes
        .filter(n => n.alpha <= 0.02)
        .sort((a, b) => a.x - b.x)[0] ?? null;
    });
    if (!node) throw new Error('No clickable map node found');
    await input(node.x, node.y, 'map -> first node');
    await page.waitForTimeout(2500);
  }

  async function runBattleIfPresent() {
    const scenes = await activeScenes();
    if (!scenes.includes('BattleScene')) return;
    await recordScene('BattleScene', 'battle start', [
      { name: 'gold display', pattern: /\d+\s*G/ },
      { name: 'speed display', pattern: /\d+x/ },
      { name: 'skill or ultimate numbers', pattern: /%|\d+\s*x|Lv|HP/ },
    ]);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
    await recordScene('BattleScene', 'battle running', [
      { name: 'battle numeric state', pattern: /\d/ },
    ]);
  }

  await startNewRun();
  await clickFirstMapNode();
  await runBattleIfPresent();

  await stageScene('RewardScene', {
    result: {
      victory: true,
      goldEarned: 35,
      expEarned: 48,
      survivors: ['warrior', 'mage', 'archer'],
      heroStats: {
        warrior: { damage: 120, healing: 0, kills: 2 },
        mage: { damage: 180, healing: 0, kills: 3 },
        archer: { damage: 90, healing: 0, kills: 1 },
      },
    },
  });
  await recordScene('RewardScene', 'reward staged', [
    { name: 'gold reward 35', pattern: /35/ },
    { name: 'exp reward 48', pattern: /48/ },
    { name: 'survivor hp', pattern: /HP\s*:\s*\d+\s*\/\s*\d+/i },
    { name: 'battle stats', pattern: /伤害|治疗|击杀|\d{2,}/ },
  ]);

  await stageScene('ShopScene', { nodeIndex: 0 });
  await recordScene('ShopScene', 'shop staged', [
    { name: 'gold display', pattern: /\d+\s*G/ },
    { name: 'prices or buy controls', pattern: /\d+\s*G|购买/ },
  ]);

  const buy = await findButton('ShopScene', '购买');
  if (buy) {
    await input(buy.x, buy.y, 'shop -> buy first visible item');
    await recordScene('ShopScene', 'shop after buy', [
      { name: 'post-buy gold or sold state', pattern: /\d+\s*G|已购买|售罄|购买/ },
    ]);
  }

  await stageScene('RestScene', { nodeIndex: 0 });
  await recordScene('RestScene', 'rest staged', [
    { name: 'healing or hp numbers', pattern: /HP|\d+\s*\/\s*\d+|\+\d+|恢复/ },
  ]);

  await stageScene('EventScene', { nodeIndex: 0 });
  await recordScene('EventScene', 'event staged', [
    { name: 'choice effects or gold', pattern: /\d|G|金币|HP|获得|失去|选择/ },
  ]);

  await context.close();
  return result;
}

await waitForServer(BASE_URL);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const vp of VIEWPORTS) {
    results.push(await runViewport(browser, vp));
  }
} finally {
  await browser.close();
}

const report = [
  '# E2E Display Regression - 2026-06-11',
  '',
  `Base URL: ${BASE_URL}`,
  '',
];

for (const result of results) {
  const failures = [
    ...result.consoleErrors.map(e => `Console error: ${e}`),
    ...result.pageErrors.map(e => `Page error: ${e}`),
    ...result.requestFailures.map(e => `Request failed: ${e}`),
    ...result.textIssues,
    ...result.numericChecks.filter(c => !c.pass).map(c => `[${c.label}] missing ${c.name}`),
  ];
  report.push(`## ${result.viewport.name} (${result.viewport.width}x${result.viewport.height})`);
  report.push('');
  report.push(`Interactions: ${result.interactions.length}`);
  report.push(`Screenshots: ${result.screenshots.length}`);
  report.push(`Console errors: ${result.consoleErrors.length}`);
  report.push(`Display/text issues: ${result.textIssues.length}`);
  report.push('');
  report.push('### Scene Samples');
  for (const sample of result.sceneSamples) {
    report.push(`- ${sample.label}: active=${sample.activeScenes.join(', ')} text=${sample.textCount} numeric=${sample.numericSamples.slice(0, 6).join(' | ')}`);
  }
  report.push('');
  report.push('### Screenshots');
  for (const ss of result.screenshots) {
    report.push(`- ${ss.label}: ${path.basename(ss.file)} (${ss.image.width}x${ss.image.height}, contrast ${ss.image.contrast})`);
  }
  report.push('');
  report.push('### Failures');
  if (failures.length === 0) {
    report.push('- None');
  } else {
    failures.forEach(f => report.push(`- ${f}`));
  }
  report.push('');
}

await fs.writeFile(path.join(OUT_DIR, 'report.md'), `${report.join('\n')}\n`, 'utf8');
await fs.writeFile(path.join(OUT_DIR, 'result.json'), JSON.stringify(results, null, 2), 'utf8');

const totalFailures = results.reduce((sum, result) => (
  sum
  + result.consoleErrors.length
  + result.pageErrors.length
  + result.requestFailures.length
  + result.textIssues.length
  + result.numericChecks.filter(c => !c.pass).length
), 0);

console.log(`Report: ${path.join(OUT_DIR, 'report.md')}`);
console.log(`Screenshots: ${results.reduce((sum, r) => sum + r.screenshots.length, 0)}`);
console.log(`Failures: ${totalFailures}`);

if (totalFailures > 0) {
  process.exitCode = 1;
}

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error' && !msg.text().includes('favicon')) consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

console.log('=== Round 4 Test ===');
await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

let canvas = await page.$('canvas');

async function clickGame(x, y, desc) {
  if (!canvas) canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  if (!box) { console.log(`  SKIP click (${x},${y}): no canvas box`); return; }
  await page.mouse.click(box.x + x, box.y + y);
  if (desc) console.log(`  Click (${x}, ${y}): ${desc}`);
  await page.waitForTimeout(500);
}

let ssCount = 1;
async function ss(name) {
  const fname = `tests/screenshots/r4-${String(ssCount).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: fname });
  console.log(`  SS: ${fname}`);
  ssCount++;
}

function getScenes() {
  return page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    return g ? g.scene.getScenes(true).map(s => s.scene.key).join(', ') : '';
  });
}

async function findTexts(sceneName, minDepth = 0) {
  return page.evaluate(({sn, md}) => {
    const g = window.__PHASER_GAME__;
    const scene = g?.scene.getScene(sn);
    if (!scene) return [];
    const results = [];
    function walk(obj, px, py, cd) {
      const wx = (obj.x || 0) + px;
      const wy = (obj.y || 0) + py;
      const ed = cd ?? (obj.depth || 0);
      if (obj.type === 'Text' && obj.text && ed >= md) {
        results.push({ text: obj.text.substring(0, 120), x: Math.round(wx), y: Math.round(wy), depth: ed, interactive: !!(obj.input?.enabled) });
      }
      if ((obj.type === 'Container' || obj.list) && obj.list) {
        obj.list.forEach(c => walk(c, wx, wy, ed));
      }
    }
    scene.children.list.forEach(c => walk(c, 0, 0, null));
    return results;
  }, {sn: sceneName, md: minDepth});
}

function findBtn(sceneName, label) {
  return page.evaluate(({sn, lbl}) => {
    const g = window.__PHASER_GAME__;
    const scene = g?.scene.getScene(sn);
    if (!scene) return null;
    for (const child of scene.children.list) {
      if (child.type === 'Container' && child.list) {
        for (const sub of child.list) {
          if (sub.type === 'Text' && sub.text === lbl)
            return { x: Math.round(child.x), y: Math.round(child.y) };
        }
      }
    }
    return null;
  }, {sn: sceneName, lbl: label});
}

// Find accessible (clickable) map nodes - these are inside mapContainer
async function findMapNodes() {
  return page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g?.scene.getScene('MapScene');
    if (!scene) return [];
    // Find mapContainer
    let container = null;
    for (const child of scene.children.list) {
      if (child.type === 'Container' && child.list && child.list.length > 10) {
        container = child;
        break;
      }
    }
    if (!container) return [];

    // Find interactive circles (hitAreas) inside the container
    const nodes = [];
    for (const child of container.list) {
      if (child.input?.enabled && child.input?.cursor === 'pointer') {
        // This is an accessible node hitArea
        nodes.push({
          x: Math.round(child.x + container.x),
          y: Math.round(child.y + container.y),
          rawX: Math.round(child.x),
          rawY: Math.round(child.y),
        });
      }
    }
    return nodes;
  });
}

// Find hero hit zones in bottom panel (direct scene children with scrollFactor=0)
async function findHeroHitZones() {
  return page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g?.scene.getScene('MapScene');
    if (!scene) return [];
    const zones = [];
    for (const child of scene.children.list) {
      if (child.type === 'Rectangle' && child.input?.enabled && child.y > 350 && child.depth >= 100) {
        zones.push({ x: Math.round(child.x), y: Math.round(child.y) });
      }
    }
    return zones;
  });
}

const allIssues = [];
function scanForEnglish(texts, ctx) {
  for (const t of texts) {
    if (/\belf\b/i.test(t.text) && !/[\w]+\.[\w]+/i.test(t.text))
      allIssues.push(`[${ctx}] "elf": "${t.text}"`);
    if (/\b(cleric|paladin|assassin)\b/i.test(t.text))
      allIssues.push(`[${ctx}] class: "${t.text}"`);
    if (/\b(tank|melee_dps|ranged_dps|healer|support)\b/i.test(t.text))
      allIssues.push(`[${ctx}] role: "${t.text}"`);
    if (/\b(human|beast|demon|undead|dragon|angel)\b/i.test(t.text) && !/[\w]+\.[\w]+/i.test(t.text))
      allIssues.push(`[${ctx}] race: "${t.text}"`);
    if (/\[(fire|ice|lightning|dark|holy)\]/i.test(t.text))
      allIssues.push(`[${ctx}] element: "${t.text}"`);
    if (/^(BREAK!|CRITICAL|MISS|DODGE|BLOCK)$/i.test(t.text.trim()))
      allIssues.push(`[${ctx}] battle: "${t.text}"`);
  }
}

// ===== Clear saves =====
await page.evaluate(() => {
  localStorage.removeItem('roguelike_save_0');
  localStorage.removeItem('roguelike_save_1');
  localStorage.removeItem('roguelike_save_2');
});
await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
canvas = await page.$('canvas');
await ss('mainmenu');

// ===== New Game =====
console.log('\n=== New Game ===');
const ngBtn = await findBtn('MainMenuScene', '新游戏');
if (!ngBtn) { console.log('ERROR: no NewGame btn'); await browser.close(); process.exit(1); }
await clickGame(ngBtn.x, ngBtn.y, 'New Game');
await page.waitForTimeout(1000);

const startBtn = await page.evaluate(() => {
  const g = window.__PHASER_GAME__;
  const scene = g.scene.getScene('MainMenuScene');
  for (const c of scene.children.list) {
    if (c.type === 'Container' && c.list && c.depth >= 800) {
      for (const s of c.list) {
        if (s.type === 'Text' && s.text === '开始')
          return { x: Math.round(c.x), y: Math.round(c.y) };
      }
    }
  }
  return null;
});
if (startBtn) await clickGame(startBtn.x, startBtn.y, 'Normal Start');
await page.waitForTimeout(2000);

// ===== HeroDraft =====
let scenes = await getScenes();
if (scenes.includes('HeroDraftScene')) {
  console.log('\n=== HeroDraft: Select 3 Heroes ===');
  const draftTexts = await findTexts('HeroDraftScene');
  const hpTexts = draftTexts.filter(t => t.text.startsWith('HP:'));
  for (const hp of hpTexts.slice(0, 3)) {
    await clickGame(hp.x, hp.y - 30, `Hero x=${hp.x}`);
    await page.waitForTimeout(200);
  }
  await ss('selected');

  const startAdv = await findBtn('HeroDraftScene', '开始冒险');
  if (startAdv) {
    await clickGame(startAdv.x, startAdv.y, 'Start adventure');
    await page.waitForTimeout(3000);
  }
}

// ===== Map + Game Loop =====
scenes = await getScenes();
if (!scenes.includes('MapScene')) {
  console.log(`ERROR: expected MapScene, got ${scenes}`);
  await browser.close(); process.exit(1);
}

console.log('\n=== MapScene ===');
await ss('map-initial');

// Find clickable map nodes
let mapNodes = await findMapNodes();
console.log(`Accessible map nodes: ${mapNodes.length}`);
mapNodes.forEach(n => console.log(`  node at (${n.x}, ${n.y}) raw=(${n.rawX}, ${n.rawY})`));

// ===== Game Loop: process nodes =====
let nodesDone = 0;
const MAX = 4;

async function processScene() {
  scenes = await getScenes();

  // Battle
  if (scenes.includes('BattleScene')) {
    console.log('\n--- BattleScene ---');
    await page.waitForTimeout(2000);
    await ss('battle');

    const bTexts = await findTexts('BattleScene');
    console.log(`Battle texts: ${bTexts.length}`);
    scanForEnglish(bTexts, 'Battle');

    // Show HUD info
    const hud = bTexts.filter(t => t.y < 25 || t.y > 400);
    hud.forEach(t => console.log(`  HUD [${t.x},${t.y}] "${t.text}"`));

    // Test Tab for overview
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);
    await ss('battle-overview');
    const ovTexts = await findTexts('BattleScene', 799);
    console.log(`Battle overview: ${ovTexts.length} texts`);
    ovTexts.slice(0, 15).forEach(t => console.log(`  [${t.x},${t.y}] "${t.text}"`));
    scanForEnglish(ovTexts, 'BattleOverview');

    // Close overview
    await clickGame(50, 50, 'Close overview');
    await page.waitForTimeout(500);

    // Speed up + wait
    await page.keyboard.press('Space');
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(2000);
      scenes = await getScenes();
      if (!scenes.includes('BattleScene')) {
        console.log(`  Battle ended (${(i+1)*2}s). Now: ${scenes}`);
        break;
      }
    }
    await ss('post-battle');
    return true;
  }

  // Event
  if (scenes.includes('EventScene')) {
    console.log('\n--- EventScene ---');
    await page.waitForTimeout(1500);
    await ss('event');
    const eTexts = await findTexts('EventScene');
    console.log(`Event texts: ${eTexts.length}`);
    eTexts.forEach(t => console.log(`  [${t.x},${t.y}]${t.interactive?' [i]':''} "${t.text}"`));
    scanForEnglish(eTexts, 'Event');

    // Find and click first choice
    const choice = await page.evaluate(() => {
      const g = window.__PHASER_GAME__;
      const scene = g.scene.getScene('EventScene');
      if (!scene) return null;
      for (const c of scene.children.list) {
        if (c.type === 'Container' && c.input?.enabled) {
          const txt = c.list?.find(s => s.type === 'Text');
          return { x: Math.round(c.x), y: Math.round(c.y), text: txt?.text || '' };
        }
      }
      return null;
    });
    if (choice) {
      await clickGame(choice.x, choice.y, `Choice: "${choice.text}"`);
      await page.waitForTimeout(2000);
      // Look for continue button
      const cont = await page.evaluate(() => {
        const g = window.__PHASER_GAME__;
        const scene = g.scene.getScene('EventScene');
        if (!scene) return null;
        for (const c of scene.children.list) {
          if (c.type === 'Container' && c.input?.enabled) {
            const txt = c.list?.find(s => s.type === 'Text');
            return { x: Math.round(c.x), y: Math.round(c.y), text: txt?.text || '' };
          }
        }
        return null;
      });
      if (cont) {
        await clickGame(cont.x, cont.y, `Continue: "${cont.text}"`);
        await page.waitForTimeout(2000);
      }
    }
    return true;
  }

  // Shop
  if (scenes.includes('ShopScene')) {
    console.log('\n--- ShopScene ---');
    await page.waitForTimeout(1500);
    await ss('shop');
    const sTexts = await findTexts('ShopScene');
    console.log(`Shop texts: ${sTexts.length}`);
    sTexts.forEach(t => console.log(`  [${t.x},${t.y}]${t.interactive?' [i]':''} "${t.text}"`));
    scanForEnglish(sTexts, 'Shop');

    // Try buying cheapest item
    const buyBtns = await page.evaluate(() => {
      const g = window.__PHASER_GAME__;
      const scene = g.scene.getScene('ShopScene');
      if (!scene) return [];
      const btns = [];
      for (const c of scene.children.list) {
        if (c.type === 'Container' && c.input?.enabled) {
          const txt = c.list?.find(s => s.type === 'Text');
          if (txt?.text?.includes('购买'))
            btns.push({ x: Math.round(c.x), y: Math.round(c.y), text: txt.text });
        }
      }
      return btns;
    });
    if (buyBtns.length > 0) {
      await clickGame(buyBtns[0].x, buyBtns[0].y, `Buy: "${buyBtns[0].text}"`);
      await page.waitForTimeout(500);
      await ss('shop-bought');
    }

    // Leave
    const leaveBtn = await findBtn('ShopScene', '离开');
    if (leaveBtn) {
      await clickGame(leaveBtn.x, leaveBtn.y, 'Leave shop');
      await page.waitForTimeout(2000);
    }
    return true;
  }

  // Reward
  if (scenes.includes('RewardScene')) {
    console.log('\n--- RewardScene ---');
    await page.waitForTimeout(1000);
    await ss('reward');
    const rTexts = await findTexts('RewardScene');
    console.log(`Reward texts: ${rTexts.length}`);
    rTexts.forEach(t => console.log(`  [${t.x},${t.y}]${t.interactive?' [i]':''} "${t.text}"`));
    scanForEnglish(rTexts, 'Reward');

    // Click first reward option or skip
    const rBtn = await page.evaluate(() => {
      const g = window.__PHASER_GAME__;
      const scene = g.scene.getScene('RewardScene');
      if (!scene) return null;
      const btns = [];
      for (const c of scene.children.list) {
        if (c.type === 'Container' && c.input?.enabled) {
          const txt = c.list?.find(s => s.type === 'Text');
          btns.push({ x: Math.round(c.x), y: Math.round(c.y), text: txt?.text || '' });
        }
        if (c.type === 'Text' && c.input?.enabled) {
          btns.push({ x: Math.round(c.x), y: Math.round(c.y), text: c.text || '' });
        }
      }
      // Prefer skip/continue, then first option
      return btns.find(b => b.text.includes('跳过') || b.text.includes('继续')) || btns[0] || null;
    });
    if (rBtn) {
      await clickGame(rBtn.x, rBtn.y, `Reward: "${rBtn.text}"`);
      await page.waitForTimeout(2000);
    }
    return true;
  }

  // LevelUp
  if (scenes.includes('LevelUpScene')) {
    console.log('\n--- LevelUpScene ---');
    await page.waitForTimeout(1000);
    await ss('levelup');
    const lTexts = await findTexts('LevelUpScene');
    console.log(`LevelUp texts: ${lTexts.length}`);
    lTexts.forEach(t => console.log(`  [${t.x},${t.y}]${t.interactive?' [i]':''} "${t.text}"`));
    scanForEnglish(lTexts, 'LevelUp');

    const lBtn = await page.evaluate(() => {
      const g = window.__PHASER_GAME__;
      const scene = g.scene.getScene('LevelUpScene');
      if (!scene) return null;
      for (const c of scene.children.list) {
        if (c.type === 'Container' && c.input?.enabled) {
          const txt = c.list?.find(s => s.type === 'Text');
          return { x: Math.round(c.x), y: Math.round(c.y), text: txt?.text || '' };
        }
      }
      return null;
    });
    if (lBtn) {
      await clickGame(lBtn.x, lBtn.y, `LevelUp: "${lBtn.text}"`);
      await page.waitForTimeout(2000);
    }
    return true;
  }

  return false;
}

// Click first accessible node
if (mapNodes.length > 0) {
  await clickGame(mapNodes[0].x, mapNodes[0].y, `Map node (${mapNodes[0].x},${mapNodes[0].y})`);
  await page.waitForTimeout(3000);
}

while (nodesDone < MAX) {
  // Process current scene chain
  let processed = true;
  while (processed) {
    processed = await processScene();
    scenes = await getScenes();
  }

  if (scenes.includes('MapScene')) {
    nodesDone++;
    console.log(`\n=== Back to Map (node ${nodesDone}/${MAX}) ===`);
    await ss('map');

    if (nodesDone >= MAX) break;

    // Find next accessible node
    mapNodes = await findMapNodes();
    console.log(`Accessible nodes: ${mapNodes.length}`);
    if (mapNodes.length === 0) {
      console.log('No more accessible nodes!');
      break;
    }
    await clickGame(mapNodes[0].x, mapNodes[0].y, `Next node (${mapNodes[0].x},${mapNodes[0].y})`);
    await page.waitForTimeout(3000);
  } else if (scenes.includes('MainMenuScene') || scenes.includes('GameOverScene') || scenes.includes('VictoryScene')) {
    console.log(`Game ended: ${scenes}`);
    await ss('game-end');
    break;
  } else {
    // Wait and retry
    await page.waitForTimeout(3000);
    scenes = await getScenes();
    if (!scenes) break;
  }
}

// ===== Test Hero Detail on Map =====
scenes = await getScenes();
if (scenes.includes('MapScene')) {
  console.log('\n=== Test HeroDetailPopup ===');
  const heroZones = await findHeroHitZones();
  console.log(`Hero hit zones: ${heroZones.length}`);
  heroZones.forEach(h => console.log(`  [${h.x},${h.y}]`));

  if (heroZones.length > 0) {
    await clickGame(heroZones[0].x, heroZones[0].y, 'Hero detail');
    await page.waitForTimeout(1000);
    await ss('hero-detail');

    const detTexts = await findTexts('MapScene', 900);
    console.log(`Detail texts: ${detTexts.length}`);
    detTexts.forEach(t => console.log(`  [${t.x},${t.y}] "${t.text}"`));
    scanForEnglish(detTexts, 'HeroDetail');

    await clickGame(50, 50, 'Close detail');
    await page.waitForTimeout(500);
  }

  // ===== Test Save/Load =====
  console.log('\n=== Test Save ===');
  const hasSave = await page.evaluate(() => localStorage.getItem('roguelike_save_0') !== null);
  console.log(`Auto-save: ${hasSave}`);
}

// ===== Summary =====
console.log('\n\n========================================');
console.log('========== ROUND 4 SUMMARY ==========');
console.log('========================================');

console.log(`\nConsole Errors: ${consoleErrors.length}`);
consoleErrors.forEach(e => console.log(`  ERROR: ${e.substring(0, 300)}`));

console.log(`\nLocalization Issues: ${allIssues.length}`);
if (allIssues.length === 0) console.log('  None!');
else allIssues.forEach(i => console.log(`  BUG: ${i}`));

console.log(`\nNodes completed: ${nodesDone}`);
console.log(`Screenshots: ${ssCount - 1}`);

await browser.close();
console.log('\n=== Round 4 Complete ===');

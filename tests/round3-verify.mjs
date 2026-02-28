import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

console.log('=== Round 3 Verification ===');
await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const canvas = await page.$('canvas');

async function clickGame(x, y, desc) {
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + x, box.y + y);
  console.log(`  Click (${x}, ${y}): ${desc}`);
  await page.waitForTimeout(600);
}

let ssCount = 1;
async function ss(name) {
  const fname = `tests/screenshots/r3v-${String(ssCount).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: fname });
  console.log(`  Screenshot: ${fname}`);
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
        results.push({ text: obj.text.substring(0, 100), x: Math.round(wx), y: Math.round(wy), depth: ed });
      }
      if (obj.type === 'Container' && obj.list) {
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
          if (sub.type === 'Text' && sub.text === lbl) {
            return { x: Math.round(child.x), y: Math.round(child.y) };
          }
        }
      }
    }
    return null;
  }, {sn: sceneName, lbl: label});
}

const allIssues = [];

function scanForEnglish(texts, ctx) {
  for (const t of texts) {
    // Check for untranslated race/class/role/element
    if (/\belf\b/i.test(t.text) && !t.text.includes('.json')) {
      allIssues.push(`[${ctx}] Untranslated "elf": "${t.text}"`);
    }
    if (/\b(cleric|paladin|assassin|rogue|priest)\b/i.test(t.text)) {
      allIssues.push(`[${ctx}] Untranslated class: "${t.text}"`);
    }
    if (/\b(tank|melee_dps|ranged_dps|healer|support)\b/i.test(t.text)) {
      allIssues.push(`[${ctx}] Untranslated role: "${t.text}"`);
    }
    if (/\b(human|beast|demon|undead|dragon|angel)\b/i.test(t.text) && !t.text.includes('.json')) {
      allIssues.push(`[${ctx}] Untranslated race: "${t.text}"`);
    }
    if (/\[(fire|ice|lightning|dark|holy)\]/i.test(t.text)) {
      allIssues.push(`[${ctx}] Untranslated element: "${t.text}"`);
    }
    if (/^(BREAK!|COMBO|CRITICAL|MISS|DODGE|BLOCK)$/i.test(t.text.trim())) {
      allIssues.push(`[${ctx}] Untranslated: "${t.text}"`);
    }
    // Also check for English class names appearing as standalone or in race/class patterns
    if (/\b(warrior|mage|ranger|knight)\b/i.test(t.text) && !/[a-z_]+\.[a-z]+/i.test(t.text)) {
      allIssues.push(`[${ctx}] Untranslated class: "${t.text}"`);
    }
  }
}

// ===== Verify Help Panel =====
console.log('\n=== Verify Help Panel ===');
const helpBtn = await findBtn('MainMenuScene', '帮助');
if (helpBtn) {
  await clickGame(helpBtn.x, helpBtn.y, 'Help');
  await page.waitForTimeout(1000);

  const helpTexts = await findTexts('MainMenuScene', 799);
  // Focus on hero unlock section
  const heroLines = helpTexts.filter(t => t.text.includes('/') && !t.text.includes('×'));
  console.log('Hero unlock lines:');
  heroLines.forEach(t => console.log(`  "${t.text}"`));
  scanForEnglish(helpTexts, 'Help');

  await ss('help-verified');
  await clickGame(50, 50, 'Close help');
  await page.waitForTimeout(500);
}

// ===== Verify HeroDraft =====
console.log('\n=== Start New Game for HeroDraft ===');
const ngBtn = await findBtn('MainMenuScene', '新游戏');
if (ngBtn) {
  await clickGame(ngBtn.x, ngBtn.y, 'New Game');
  await page.waitForTimeout(1000);

  // Find Normal start button
  const startBtn = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('MainMenuScene');
    if (!scene) return null;
    const starts = [];
    for (const child of scene.children.list) {
      if (child.type === 'Container' && child.list && child.depth >= 800) {
        for (const sub of child.list) {
          if (sub.type === 'Text' && sub.text === '开始') {
            starts.push({ x: Math.round(child.x), y: Math.round(child.y) });
          }
        }
      }
    }
    return starts[0] || null;
  });

  if (startBtn) {
    await clickGame(startBtn.x, startBtn.y, 'Start Normal');
    await page.waitForTimeout(2000);
  }
}

let scenes = await getScenes();
if (scenes.includes('HeroDraftScene')) {
  console.log('\n=== Verify HeroDraftScene ===');
  const draftTexts = await findTexts('HeroDraftScene');
  const raceClassLines = draftTexts.filter(t => t.text.includes('/'));
  console.log('Race/class lines:');
  raceClassLines.forEach(t => console.log(`  "${t.text}"`));
  scanForEnglish(draftTexts, 'HeroDraft');
  await ss('draft-verified');

  // Select heroes (find containers that are interactive)
  const heroCards = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('HeroDraftScene');
    if (!scene) return [];
    const cards = [];
    for (const child of scene.children.list) {
      // Cards might be Graphics or Rectangles that are interactive
      if (child.input && child.input.enabled && child.y > 50 && child.y < 300 && child.x < 400) {
        cards.push({ x: Math.round(child.x), y: Math.round(child.y), type: child.type });
      }
    }
    return cards;
  });

  console.log(`Found ${heroCards.length} interactive hero cards`);
  // Click on hero card positions based on the text we found
  const heroPositions = draftTexts.filter(t => t.text.includes('/') || t.text.startsWith('HP:'));
  if (heroPositions.length > 0) {
    // Click on first 2 hero card areas
    const heroXs = [...new Set(heroPositions.map(t => t.x))].sort((a, b) => a - b);
    for (const hx of heroXs.slice(0, 2)) {
      await clickGame(hx, 110, `Hero card at x=${hx}`);
      await page.waitForTimeout(300);
    }
  }

  await page.waitForTimeout(500);
  await ss('heroes-selected');

  // Check selection count
  const selText = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('HeroDraftScene');
    if (!scene) return '';
    for (const child of scene.children.list) {
      if (child.type === 'Text' && child.text && child.text.includes('已选')) {
        return child.text;
      }
    }
    return '';
  });
  console.log(`Selection: "${selText}"`);

  // Click start
  const startAdventure = await findBtn('HeroDraftScene', '开始冒险');
  if (startAdventure) {
    await clickGame(startAdventure.x, startAdventure.y, 'Start adventure');
    await page.waitForTimeout(3000);
    scenes = await getScenes();
    console.log(`After start: ${scenes}`);
  }
}

// ===== MapScene =====
scenes = await getScenes();
if (scenes.includes('MapScene')) {
  console.log('\n=== MapScene ===');
  await ss('map');

  // Test overview panel
  const mapTexts = await findTexts('MapScene');
  const overviewBtn = mapTexts.find(t => t.text.includes('概览'));
  if (overviewBtn) {
    await clickGame(overviewBtn.x, overviewBtn.y, 'Overview');
    await page.waitForTimeout(1500);
    await ss('overview');

    const ovTexts = await findTexts('MapScene', 799);
    console.log('Overview content:');
    ovTexts.forEach(t => console.log(`  [${t.x},${t.y}] "${t.text}"`));
    scanForEnglish(ovTexts, 'Overview');

    await clickGame(50, 50, 'Close overview');
    await page.waitForTimeout(500);
  }

  // Try clicking first map node
  const mapNode = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('MapScene');
    if (!scene) return null;
    for (const child of scene.children.list) {
      if (child.input && child.input.enabled && child.y > 30 && child.y < 340 &&
          child.type !== 'Text' && child.depth < 100) {
        return { x: Math.round(child.x), y: Math.round(child.y), type: child.type };
      }
    }
    return null;
  });

  if (mapNode) {
    console.log(`\nClicking map node at (${mapNode.x}, ${mapNode.y})`);
    await clickGame(mapNode.x, mapNode.y, 'Map node');
    await page.waitForTimeout(4000);
    scenes = await getScenes();
    console.log(`Now in: ${scenes}`);
    await ss('after-node');

    // Battle scene
    if (scenes.includes('BattleScene')) {
      console.log('\n=== BattleScene ===');
      const battleTexts = await findTexts('BattleScene');
      scanForEnglish(battleTexts, 'Battle');

      // Speed up
      await page.keyboard.press('Space');

      // Wait for battle end
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(2000);
        scenes = await getScenes();
        if (!scenes.includes('BattleScene')) {
          console.log(`Battle ended! Now: ${scenes}`);
          await ss('post-battle');
          break;
        }
      }

      // Check reward/levelup scene
      scenes = await getScenes();
      if (scenes.includes('RewardScene')) {
        console.log('\n=== RewardScene ===');
        const rewardTexts = await findTexts('RewardScene');
        console.log('Reward texts:');
        rewardTexts.forEach(t => console.log(`  "${t.text}"`));
        scanForEnglish(rewardTexts, 'Reward');
        await ss('reward');

        // Click to select reward / continue
        const continueBtn = await page.evaluate(() => {
          const g = window.__PHASER_GAME__;
          const scene = g.scene.getScene('RewardScene');
          if (!scene) return null;
          for (const child of scene.children.list) {
            if (child.type === 'Container' && child.list) {
              for (const sub of child.list) {
                if (sub.type === 'Text' && (sub.text.includes('继续') || sub.text.includes('跳过') || sub.text.includes('下一'))) {
                  return { x: Math.round(child.x), y: Math.round(child.y), text: sub.text };
                }
              }
            }
          }
          return null;
        });

        if (continueBtn) {
          console.log(`Continue button: "${continueBtn.text}" at (${continueBtn.x}, ${continueBtn.y})`);
        }
      }

      if (scenes.includes('LevelUpScene')) {
        console.log('\n=== LevelUpScene ===');
        await page.waitForTimeout(1000);
        const lvlTexts = await findTexts('LevelUpScene');
        console.log('LevelUp texts:');
        lvlTexts.forEach(t => console.log(`  "${t.text}"`));
        scanForEnglish(lvlTexts, 'LevelUp');
        await ss('levelup');
      }
    }

    // Event scene
    if (scenes.includes('EventScene')) {
      console.log('\n=== EventScene ===');
      const eventTexts = await findTexts('EventScene');
      console.log('Event texts:');
      eventTexts.forEach(t => console.log(`  "${t.text}"`));
      scanForEnglish(eventTexts, 'Event');
      await ss('event');
    }

    // Shop scene
    if (scenes.includes('ShopScene')) {
      console.log('\n=== ShopScene ===');
      const shopTexts = await findTexts('ShopScene');
      console.log('Shop texts:');
      shopTexts.forEach(t => console.log(`  "${t.text}"`));
      scanForEnglish(shopTexts, 'Shop');
      await ss('shop');
    }
  }
}

// ===== Summary =====
console.log('\n\n========== SUMMARY ==========');
console.log(`Console Errors: ${consoleErrors.length}`);
consoleErrors.forEach(e => console.log(`  ERROR: ${e.substring(0, 300)}`));
console.log(`\nLocalization Issues: ${allIssues.length}`);
if (allIssues.length === 0) {
  console.log('  None found - all translations verified!');
} else {
  allIssues.forEach(i => console.log(`  BUG: ${i}`));
}

await browser.close();
console.log('\n=== Round 3 Verification Complete ===');

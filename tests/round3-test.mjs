import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });

const consoleErrors = [];
const consoleWarnings = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
  if (msg.type() === 'warning') consoleWarnings.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

console.log('=== Round 3 Test: Opening game ===');
await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const canvas = await page.$('canvas');
if (!canvas) { console.log('ERROR: No canvas!'); await browser.close(); process.exit(1); }

async function clickGame(x, y, desc) {
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + x, box.y + y);
  console.log(`  Click (${x}, ${y}): ${desc}`);
  await page.waitForTimeout(600);
}

let ssCount = 1;
async function ss(name) {
  const fname = `tests/screenshots/r3-${String(ssCount).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: fname });
  console.log(`  Screenshot: ${fname}`);
  ssCount++;
}

function getActiveScenes() {
  return page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    if (!g) return '';
    return g.scene.getScenes(true).map(s => s.scene.key).join(', ');
  });
}

// Find interactive elements in a scene by querying Phaser
async function findInteractives(sceneName) {
  return page.evaluate((sn) => {
    const g = window.__PHASER_GAME__;
    const scene = g?.scene.getScene(sn);
    if (!scene) return [];
    const results = [];
    function walk(obj, parentX, parentY) {
      const worldX = (obj.x || 0) + parentX;
      const worldY = (obj.y || 0) + parentY;
      if (obj.input && obj.input.enabled) {
        results.push({
          type: obj.type,
          text: obj.text?.substring(0, 40) || '',
          x: Math.round(worldX),
          y: Math.round(worldY),
          depth: obj.depth || 0,
          w: obj.width || 0,
          h: obj.height || 0,
        });
      }
      // Walk children of containers
      if (obj.type === 'Container' && obj.list) {
        obj.list.forEach(c => walk(c, worldX, worldY));
      }
    }
    scene.children.list.forEach(c => walk(c, 0, 0));
    return results;
  }, sceneName);
}

// Find all text objects in a scene (with depth filter)
async function findTexts(sceneName, minDepth = 0) {
  return page.evaluate(({sn, md}) => {
    const g = window.__PHASER_GAME__;
    const scene = g?.scene.getScene(sn);
    if (!scene) return [];
    const results = [];
    function walk(obj, parentX, parentY, containerDepth) {
      const worldX = (obj.x || 0) + parentX;
      const worldY = (obj.y || 0) + parentY;
      const effectiveDepth = containerDepth ?? (obj.depth || 0);
      if (obj.type === 'Text' && obj.text && effectiveDepth >= md) {
        results.push({
          text: obj.text.substring(0, 80),
          x: Math.round(worldX),
          y: Math.round(worldY),
          depth: effectiveDepth,
          interactive: !!(obj.input && obj.input.enabled),
        });
      }
      if (obj.type === 'Container' && obj.list) {
        obj.list.forEach(c => walk(c, worldX, worldY, effectiveDepth));
      }
    }
    scene.children.list.forEach(c => walk(c, 0, 0, null));
    return results;
  }, {sn: sceneName, md: minDepth});
}

// Scan for untranslated English text
function checkForEnglish(texts, context) {
  const issues = [];
  for (const t of texts) {
    // Check for common untranslated patterns
    if (/\b(tank|melee_dps|ranged_dps|healer|support)\b/i.test(t.text)) {
      issues.push(`[${context}] Untranslated role: "${t.text}"`);
    }
    if (/\b(human|beast|demon|undead|dragon|angel)\b/i.test(t.text) && !/[a-z_]+\.json/i.test(t.text)) {
      issues.push(`[${context}] Untranslated race: "${t.text}"`);
    }
    if (/\b(warrior|mage|rogue|ranger|priest|knight)\b/i.test(t.text)) {
      issues.push(`[${context}] Untranslated class: "${t.text}"`);
    }
    if (/\[(fire|ice|lightning|dark|holy)\]/i.test(t.text)) {
      issues.push(`[${context}] Untranslated element: "${t.text}"`);
    }
    if (/^(BREAK!|COMBO|CRITICAL|MISS|DODGE|BLOCK)$/i.test(t.text.trim())) {
      issues.push(`[${context}] Untranslated battle text: "${t.text}"`);
    }
  }
  return issues;
}

const allIssues = [];
let scenes = await getActiveScenes();
console.log(`Active scenes: ${scenes}`);
await ss('mainmenu');

// ========== Test 1: Main Menu Overview ==========
console.log('\n=== Test 1: Main Menu ===');
const menuTexts = await findTexts('MainMenuScene');
console.log(`Menu texts (${menuTexts.length}):`);
menuTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth}${t.interactive?' [i]':''} "${t.text}"`));

const menuInteractives = await findInteractives('MainMenuScene');
console.log(`Interactive elements (${menuInteractives.length}):`);
menuInteractives.forEach(e => console.log(`  [${e.x},${e.y}] ${e.type} d${e.depth} ${e.w}x${e.h} "${e.text}"`));

allIssues.push(...checkForEnglish(menuTexts, 'MainMenu'));

// ========== Test 2: Achievement Panel ==========
console.log('\n=== Test 2: Achievement Panel ===');
// Find the achievement button (text "成就")
const achBtn = menuInteractives.find(e => e.text === '' && e.type === 'Container');
// Buttons are Containers at x=400, need to find the one at y=310 (or similar)
// Actually, let's find by evaluating
const achBtnPos = await page.evaluate(() => {
  const g = window.__PHASER_GAME__;
  const scene = g.scene.getScene('MainMenuScene');
  // Buttons are containers. Find the one whose child text says "成就"
  for (const child of scene.children.list) {
    if (child.type === 'Container' && child.list) {
      for (const sub of child.list) {
        if (sub.type === 'Text' && sub.text === '成就') {
          return { x: Math.round(child.x), y: Math.round(child.y) };
        }
      }
    }
  }
  return null;
});

if (achBtnPos) {
  console.log(`Achievement button at (${achBtnPos.x}, ${achBtnPos.y})`);
  await clickGame(achBtnPos.x, achBtnPos.y, 'Achievement button');
  await page.waitForTimeout(1000);
  await ss('achievement');

  const achTexts = await findTexts('MainMenuScene', 799);
  console.log(`Achievement panel texts (${achTexts.length}):`);
  achTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
  allIssues.push(...checkForEnglish(achTexts, 'Achievement'));

  // Check for raw icon names in achievement panel
  const iconIssues = achTexts.filter(t =>
    /^(trophy|medal|star|sword|shield|map|arrow_up|bag|chest|crown|wolf|nuke|explosion)$/i.test(t.text.trim())
  );
  if (iconIssues.length > 0) {
    console.log('BUG: Raw icon names (not emoji):');
    iconIssues.forEach(t => allIssues.push(`[Achievement] Raw icon: "${t.text}"`));
  }

  // Close
  await clickGame(50, 50, 'Close achievement');
  await page.waitForTimeout(500);
} else {
  console.log('WARNING: Achievement button not found!');
}

// ========== Test 3: Help Panel ==========
console.log('\n=== Test 3: Help Panel ===');
const helpBtnPos = await page.evaluate(() => {
  const g = window.__PHASER_GAME__;
  const scene = g.scene.getScene('MainMenuScene');
  for (const child of scene.children.list) {
    if (child.type === 'Container' && child.list) {
      for (const sub of child.list) {
        if (sub.type === 'Text' && sub.text === '帮助') {
          return { x: Math.round(child.x), y: Math.round(child.y) };
        }
      }
    }
  }
  return null;
});

if (helpBtnPos) {
  console.log(`Help button at (${helpBtnPos.x}, ${helpBtnPos.y})`);
  await clickGame(helpBtnPos.x, helpBtnPos.y, 'Help button');
  await page.waitForTimeout(1000);
  await ss('help');

  const helpTexts = await findTexts('MainMenuScene', 799);
  console.log(`Help panel texts (${helpTexts.length}):`);
  helpTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
  allIssues.push(...checkForEnglish(helpTexts, 'Help'));

  await clickGame(50, 50, 'Close help');
  await page.waitForTimeout(500);
}

// ========== Test 4: Upgrade Panel ==========
console.log('\n=== Test 4: Upgrade Panel ===');
const upgradeBtnPos = await page.evaluate(() => {
  const g = window.__PHASER_GAME__;
  const scene = g.scene.getScene('MainMenuScene');
  for (const child of scene.children.list) {
    if (child.type === 'Container' && child.list) {
      for (const sub of child.list) {
        if (sub.type === 'Text' && sub.text === '升级') {
          return { x: Math.round(child.x), y: Math.round(child.y) };
        }
      }
    }
  }
  return null;
});

if (upgradeBtnPos) {
  console.log(`Upgrade button at (${upgradeBtnPos.x}, ${upgradeBtnPos.y})`);
  await clickGame(upgradeBtnPos.x, upgradeBtnPos.y, 'Upgrade button');
  await page.waitForTimeout(1000);
  await ss('upgrade');

  const upgradeTexts = await findTexts('MainMenuScene', 799);
  console.log(`Upgrade panel texts (${upgradeTexts.length}):`);
  upgradeTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
  allIssues.push(...checkForEnglish(upgradeTexts, 'Upgrade'));

  await clickGame(50, 50, 'Close upgrade');
  await page.waitForTimeout(500);
}

// ========== Test 5: Settings Scene ==========
console.log('\n=== Test 5: Settings Scene ===');
// Settings is a text "[设置]" at top right (785, 44)
await clickGame(775, 48, 'Settings text');
await page.waitForTimeout(1500);
scenes = await getActiveScenes();
console.log(`After settings click: ${scenes}`);

if (scenes.includes('SettingsScene')) {
  await ss('settings');
  const settingsTexts = await findTexts('SettingsScene');
  console.log(`Settings texts (${settingsTexts.length}):`);
  settingsTexts.forEach(t => console.log(`  [${t.x},${t.y}] "${t.text}"`));
  allIssues.push(...checkForEnglish(settingsTexts, 'Settings'));

  // Look for "返回" button
  const backBtn = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('SettingsScene');
    for (const child of scene.children.list) {
      if (child.type === 'Container' && child.list) {
        for (const sub of child.list) {
          if (sub.type === 'Text' && (sub.text.includes('返回') || sub.text.includes('Back'))) {
            return { x: Math.round(child.x), y: Math.round(child.y) };
          }
        }
      }
    }
    // Try direct text
    for (const child of scene.children.list) {
      if (child.type === 'Text' && (child.text?.includes('返回') || child.text?.includes('Back'))) {
        return { x: Math.round(child.x), y: Math.round(child.y) };
      }
    }
    return null;
  });

  if (backBtn) {
    await clickGame(backBtn.x, backBtn.y, 'Back button');
    await page.waitForTimeout(1000);
  }
} else {
  console.log('Settings did not open, still on: ' + scenes);
  // Maybe it uses pointerup, let me try keyboard
}

// Ensure we're back on MainMenu
scenes = await getActiveScenes();
if (!scenes.includes('MainMenuScene')) {
  console.log('WARNING: Not on MainMenu, current: ' + scenes);
}

// ========== Test 6: New Game → Difficulty → HeroDraft ==========
console.log('\n=== Test 6: New Game Flow ===');
const newGameBtnPos = await page.evaluate(() => {
  const g = window.__PHASER_GAME__;
  const scene = g.scene.getScene('MainMenuScene');
  if (!scene) return null;
  for (const child of scene.children.list) {
    if (child.type === 'Container' && child.list) {
      for (const sub of child.list) {
        if (sub.type === 'Text' && sub.text === '新游戏') {
          return { x: Math.round(child.x), y: Math.round(child.y) };
        }
      }
    }
  }
  return null;
});

if (newGameBtnPos) {
  console.log(`New Game button at (${newGameBtnPos.x}, ${newGameBtnPos.y})`);
  await clickGame(newGameBtnPos.x, newGameBtnPos.y, 'New Game');
  await page.waitForTimeout(1000);
  await ss('difficulty-select');

  // Find the "开始" button for Normal difficulty
  const startBtnPos = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('MainMenuScene');
    if (!scene) return null;
    // Find button containers with "开始" text
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
    return starts.length > 0 ? starts[0] : null; // First = Normal
  });

  if (startBtnPos) {
    console.log(`Start (Normal) button at (${startBtnPos.x}, ${startBtnPos.y})`);
    await clickGame(startBtnPos.x, startBtnPos.y, 'Start Normal');
    await page.waitForTimeout(3000);
    scenes = await getActiveScenes();
    console.log(`After start: ${scenes}`);
    await ss('after-start');
  } else {
    console.log('WARNING: Start button not found!');
  }
}

// ========== Test 7: HeroDraftScene ==========
scenes = await getActiveScenes();
if (scenes.includes('HeroDraftScene')) {
  console.log('\n=== Test 7: HeroDraftScene ===');
  const draftTexts = await findTexts('HeroDraftScene');
  console.log(`Draft texts (${draftTexts.length}):`);
  draftTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth}${t.interactive?' [i]':''} "${t.text}"`));
  allIssues.push(...checkForEnglish(draftTexts, 'HeroDraft'));

  // Select 4 heroes by clicking on them
  const heroCards = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('HeroDraftScene');
    if (!scene) return [];
    const cards = [];
    for (const child of scene.children.list) {
      if (child.type === 'Container' && child.input && child.input.enabled && child.y > 100 && child.y < 350) {
        cards.push({ x: Math.round(child.x), y: Math.round(child.y) });
      }
    }
    return cards.slice(0, 4);
  });

  console.log(`Hero cards found: ${heroCards.length}`);
  for (const card of heroCards) {
    await clickGame(card.x, card.y, `Hero card at (${card.x},${card.y})`);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
  await ss('heroes-selected');

  // Find and click confirm/start button
  const confirmBtn = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('HeroDraftScene');
    if (!scene) return null;
    for (const child of scene.children.list) {
      if (child.type === 'Container' && child.list) {
        for (const sub of child.list) {
          if (sub.type === 'Text' && (sub.text.includes('开始') || sub.text.includes('确认') || sub.text.includes('出发'))) {
            return { x: Math.round(child.x), y: Math.round(child.y), text: sub.text };
          }
        }
      }
    }
    return null;
  });

  if (confirmBtn) {
    console.log(`Confirm button: (${confirmBtn.x}, ${confirmBtn.y}) "${confirmBtn.text}"`);
    await clickGame(confirmBtn.x, confirmBtn.y, 'Confirm heroes');
    await page.waitForTimeout(3000);
    scenes = await getActiveScenes();
    console.log(`After confirm: ${scenes}`);
    await ss('after-draft');
  }
}

// ========== Test 8: MapScene ==========
scenes = await getActiveScenes();
if (scenes.includes('MapScene')) {
  console.log('\n=== Test 8: MapScene ===');
  await ss('map');

  const mapTexts = await findTexts('MapScene');
  console.log(`Map texts (${mapTexts.length}):`);
  mapTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth}${t.interactive?' [i]':''} "${t.text}"`));
  allIssues.push(...checkForEnglish(mapTexts, 'Map'));

  // Test RunOverviewPanel
  console.log('\n--- Test 8a: RunOverviewPanel ---');
  const overviewBtn = mapTexts.find(t => t.text.includes('概览'));
  if (overviewBtn) {
    await clickGame(overviewBtn.x, overviewBtn.y, 'Overview button');
    await page.waitForTimeout(1500);
    await ss('overview');

    const overviewTexts = await findTexts('MapScene', 799);
    console.log(`Overview texts (${overviewTexts.length}):`);
    overviewTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
    allIssues.push(...checkForEnglish(overviewTexts, 'Overview'));

    await clickGame(50, 50, 'Close overview');
    await page.waitForTimeout(500);
  }

  // Test HeroDetailPopup from map
  console.log('\n--- Test 8b: HeroDetail from Map ---');
  const heroInteractives = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('MapScene');
    if (!scene) return [];
    const results = [];
    for (const child of scene.children.list) {
      if (child.type === 'Text' && child.input && child.input.enabled && child.y > 350) {
        results.push({ x: Math.round(child.x), y: Math.round(child.y), text: child.text?.substring(0, 30) || '' });
      }
    }
    return results;
  });

  if (heroInteractives.length > 0) {
    const hero = heroInteractives[0];
    console.log(`Clicking hero: (${hero.x}, ${hero.y}) "${hero.text}"`);
    await clickGame(hero.x, hero.y, 'Hero in map panel');
    await page.waitForTimeout(1000);
    await ss('hero-detail-map');

    const popupTexts = await findTexts('MapScene', 900);
    console.log(`Popup texts (${popupTexts.length}):`);
    popupTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
    allIssues.push(...checkForEnglish(popupTexts, 'HeroDetail'));

    await clickGame(50, 50, 'Close hero detail');
    await page.waitForTimeout(500);
  }

  // Navigate to first available node
  console.log('\n--- Test 8c: Navigate to Node ---');
  const mapNodes = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('MapScene');
    if (!scene) return [];
    const nodes = [];
    for (const child of scene.children.list) {
      if (child.input && child.input.enabled && child.y > 30 && child.y < 350) {
        nodes.push({
          x: Math.round(child.x),
          y: Math.round(child.y),
          type: child.type,
          text: child.text?.substring(0, 20) || '',
          depth: child.depth || 0,
        });
      }
    }
    return nodes;
  });

  console.log(`Map nodes (${mapNodes.length}):`);
  mapNodes.forEach(n => console.log(`  [${n.x},${n.y}] ${n.type} d${n.depth} "${n.text}"`));

  // Click the first one that's likely a map node (not a UI button)
  const targetNode = mapNodes.find(n => n.type !== 'Text' || (!n.text.includes('概览') && !n.text.includes('设置')));
  if (targetNode) {
    console.log(`Clicking node: (${targetNode.x}, ${targetNode.y})`);
    await clickGame(targetNode.x, targetNode.y, 'Map node');
    await page.waitForTimeout(3000);
    scenes = await getActiveScenes();
    console.log(`After node click: ${scenes}`);
    await ss('after-node');

    // ========== Test 9: Battle/Event/Shop ==========
    if (scenes.includes('BattleScene')) {
      console.log('\n=== Test 9: BattleScene ===');
      await page.waitForTimeout(2000);
      await ss('battle');

      const battleTexts = await findTexts('BattleScene');
      console.log(`Battle texts (${battleTexts.length}):`);
      battleTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
      allIssues.push(...checkForEnglish(battleTexts, 'Battle'));

      // Test Tab key for RunOverview in battle
      console.log('\n--- Tab Overview ---');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1500);
      await ss('battle-overview');

      const battleOvTexts = await findTexts('BattleScene', 799);
      console.log(`Battle overview texts (${battleOvTexts.length}):`);
      battleOvTexts.slice(0, 20).forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
      allIssues.push(...checkForEnglish(battleOvTexts, 'BattleOverview'));

      // Close overview by clicking outside
      await clickGame(50, 50, 'Close battle overview');
      await page.waitForTimeout(500);

      // Speed up: press Space to toggle speed
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Wait for battle to end (max 60s)
      console.log('Waiting for battle to end...');
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(2000);
        scenes = await getActiveScenes();
        if (!scenes.includes('BattleScene')) {
          console.log(`Battle ended! Now: ${scenes}`);
          await ss('post-battle');
          break;
        }
        if (i % 5 === 4) console.log(`  Still in battle... (${(i+1)*2}s)`);
      }

      // Check RewardScene
      scenes = await getActiveScenes();
      if (scenes.includes('RewardScene')) {
        console.log('\n=== Test 10: RewardScene ===');
        const rewardTexts = await findTexts('RewardScene');
        console.log(`Reward texts (${rewardTexts.length}):`);
        rewardTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
        allIssues.push(...checkForEnglish(rewardTexts, 'Reward'));
      }

      if (scenes.includes('LevelUpScene')) {
        console.log('\n=== Test 10: LevelUpScene ===');
        const lvlTexts = await findTexts('LevelUpScene');
        console.log(`LevelUp texts (${lvlTexts.length}):`);
        lvlTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
        allIssues.push(...checkForEnglish(lvlTexts, 'LevelUp'));
      }
    }

    if (scenes.includes('EventScene')) {
      console.log('\n=== Test 9: EventScene ===');
      await page.waitForTimeout(1500);
      await ss('event');

      const eventTexts = await findTexts('EventScene');
      console.log(`Event texts (${eventTexts.length}):`);
      eventTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
      allIssues.push(...checkForEnglish(eventTexts, 'Event'));
    }

    if (scenes.includes('ShopScene')) {
      console.log('\n=== Test 9: ShopScene ===');
      await page.waitForTimeout(1500);
      await ss('shop');

      const shopTexts = await findTexts('ShopScene');
      console.log(`Shop texts (${shopTexts.length}):`);
      shopTexts.forEach(t => console.log(`  [${t.x},${t.y}] d${t.depth} "${t.text}"`));
      allIssues.push(...checkForEnglish(shopTexts, 'Shop'));
    }
  }
}

// ========== Summary ==========
console.log('\n\n========== SUMMARY ==========');

console.log(`\nConsole Errors (${consoleErrors.length}):`);
consoleErrors.forEach(e => console.log(`  ERROR: ${e.substring(0, 300)}`));

console.log(`\nConsole Warnings (${consoleWarnings.length}):`);
consoleWarnings.slice(0, 10).forEach(w => console.log(`  WARN: ${w.substring(0, 200)}`));

console.log(`\nLocalization Issues (${allIssues.length}):`);
if (allIssues.length === 0) {
  console.log('  None found!');
} else {
  allIssues.forEach(i => console.log(`  ${i}`));
}

await browser.close();
console.log('\n=== Round 3 Test Complete ===');

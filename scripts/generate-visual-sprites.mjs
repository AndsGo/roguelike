import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outDir = path.join(root, 'public', 'assets', 'visual');

const sheets = [
  {
    file: 'skill_fx_spritesheet.png',
    size: 32,
    frames: [
      { name: 'projectile', color: '#f8d35a', svg: projectile },
      { name: 'aoe_blast', color: '#ff5a3d', svg: ringBurst },
      { name: 'ignite', color: '#ff7a18', svg: flame },
      { name: 'freeze', color: '#8adfff', svg: snowflake },
      { name: 'shock', color: '#ffe94d', svg: bolt },
      { name: 'annihilate', color: '#b55cff', svg: voidMark },
    ],
  },
  {
    file: 'map_nodes_spritesheet.png',
    size: 32,
    frames: [
      { name: 'battle', color: '#d9d9e8', svg: crossedSwords },
      { name: 'elite', color: '#ffb347', svg: star },
      { name: 'boss', color: '#ff5a5a', svg: skull },
      { name: 'shop', color: '#ffd86b', svg: gem },
      { name: 'event', color: '#8fd3ff', svg: question },
      { name: 'rest', color: '#78e08f', svg: heart },
      { name: 'gauntlet', color: '#d7a1ff', svg: twinSwords },
    ],
  },
  {
    file: 'item_icons_spritesheet.png',
    size: 32,
    frames: [
      { name: 'weapon', color: '#c9d6df', svg: sword },
      { name: 'armor', color: '#9fb4c8', svg: shield },
      { name: 'accessory', color: '#e7c75f', svg: ring },
      { name: 'relic', color: '#b58cff', svg: relic },
      { name: 'common', color: '#b8b8b8', svg: rarityDiamond },
      { name: 'uncommon', color: '#55cc77', svg: rarityDiamond },
      { name: 'rare', color: '#5599ff', svg: rarityDiamond },
      { name: 'epic', color: '#aa66ff', svg: rarityDiamond },
      { name: 'legendary', color: '#ffb13b', svg: rarityDiamond },
    ],
  },
  {
    file: 'status_icons_spritesheet.png',
    size: 24,
    frames: [
      { name: 'dot', color: '#ff6538', svg: droplet },
      { name: 'hot', color: '#63e67b', svg: plus },
      { name: 'stun', color: '#ffe14a', svg: stun },
      { name: 'buff', color: '#66d9ff', svg: arrowUp },
      { name: 'debuff', color: '#ff6da8', svg: arrowDown },
      { name: 'taunt', color: '#ff9d3b', svg: shout },
      { name: 'counter_aura', color: '#c28bff', svg: counter },
    ],
  },
  {
    file: 'hud_fx_spritesheet.png',
    size: 32,
    frames: [
      { name: 'skill_ready', color: '#62f58a', svg: readySpark },
      { name: 'ultimate_ready', color: '#ffd34d', svg: ultimateBurst },
      { name: 'cooldown_done', color: '#8fd3ff', svg: check },
      { name: 'target_lock', color: '#ff6d6d', svg: targetLock },
    ],
  },
];

await fs.mkdir(outDir, { recursive: true });

for (const sheet of sheets) {
  const width = sheet.size * sheet.frames.length;
  const base = sharp({
    create: {
      width,
      height: sheet.size,
      channels: 4,
      background: '#00000000',
    },
  });
  const composites = sheet.frames.map((frame, index) => ({
    input: Buffer.from(frame.svg(sheet.size, frame.color)),
    left: index * sheet.size,
    top: 0,
  }));
  await base.composite(composites).png().toFile(path.join(outDir, sheet.file));
  console.log(`wrote ${sheet.file} (${sheet.frames.map(f => f.name).join(', ')})`);
}

function svgWrap(size, color, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="none"/>
    ${body(color, size)}
  </svg>`;
}

function projectile(size, color) {
  return svgWrap(size, color, (c) => `<path d="M4 16 L17 9 L28 16 L17 23 Z" fill="${c}"/><path d="M8 16 L17 12 L24 16 L17 20 Z" fill="#fff2a8"/>`);
}

function ringBurst(size, color) {
  return svgWrap(size, color, (c) => `<circle cx="16" cy="16" r="11" fill="none" stroke="${c}" stroke-width="4"/><circle cx="16" cy="16" r="4" fill="#fff0b0"/>`);
}

function flame(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 3 C21 9 26 14 22 23 C19 29 9 29 7 21 C6 15 11 12 13 7 C14 11 17 12 16 3 Z" fill="${c}"/><path d="M16 15 C19 19 18 25 14 26 C10 24 11 18 16 15 Z" fill="#ffe06a"/>`);
}

function snowflake(size, color) {
  return svgWrap(size, color, (c) => `<path d="M15 3 H17 V29 H15 Z M3 15 H29 V17 H3 Z M7 6 L26 25 L25 26 L6 7 Z M25 6 L26 7 L7 26 L6 25 Z" fill="${c}"/><rect x="12" y="12" width="8" height="8" fill="#e9fbff"/>`);
}

function bolt(size, color) {
  return svgWrap(size, color, (c) => `<path d="M19 2 L7 18 H15 L12 30 L25 13 H17 Z" fill="${c}"/><path d="M17 7 L12 15 H18 L16 22 L22 12 H16 Z" fill="#fff7a0"/>`);
}

function voidMark(size, color) {
  return svgWrap(size, color, (c) => `<circle cx="16" cy="16" r="11" fill="${c}" opacity="0.85"/><circle cx="19" cy="13" r="8" fill="#1a0c2c"/><circle cx="13" cy="20" r="3" fill="#f2dbff"/>`);
}

function crossedSwords(size, color) {
  return svgWrap(size, color, (c) => `<path d="M8 5 L27 24 L24 27 L5 8 Z M24 5 L5 24 L8 27 L27 8 Z" fill="${c}"/><rect x="5" y="22" width="7" height="3" fill="#7b5b38"/><rect x="20" y="22" width="7" height="3" fill="#7b5b38"/>`);
}

function star(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 3 L20 12 L30 12 L22 18 L25 28 L16 22 L7 28 L10 18 L2 12 L12 12 Z" fill="${c}"/>`);
}

function skull(size, color) {
  return svgWrap(size, color, (c) => `<path d="M8 9 C8 3 24 3 24 9 V18 H21 V25 H11 V18 H8 Z" fill="${c}"/><rect x="11" y="11" width="4" height="4" fill="#1a1010"/><rect x="17" y="11" width="4" height="4" fill="#1a1010"/><rect x="15" y="17" width="2" height="3" fill="#1a1010"/>`);
}

function gem(size, color) {
  return svgWrap(size, color, (c) => `<path d="M8 5 H24 L29 13 L16 29 L3 13 Z" fill="${c}"/><path d="M8 5 L12 13 H20 L24 5 Z" fill="#fff1a0" opacity="0.75"/>`);
}

function question(size, color) {
  return svgWrap(size, color, (c) => `<path d="M10 10 C10 4 23 4 23 11 C23 16 18 16 18 20 H14 C14 14 19 14 19 11 C19 8 14 8 14 11 Z" fill="${c}"/><rect x="14" y="24" width="4" height="4" fill="${c}"/>`);
}

function heart(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 27 L5 16 C-1 9 8 2 16 10 C24 2 33 9 27 16 Z" fill="${c}"/>`);
}

function twinSwords(size, color) {
  return svgWrap(size, color, (c) => `<path d="M9 3 H13 V22 H9 Z M19 3 H23 V22 H19 Z" fill="${c}"/><rect x="6" y="21" width="10" height="3" fill="#7b5b38"/><rect x="16" y="21" width="10" height="3" fill="#7b5b38"/>`);
}

function sword(size, color) {
  return svgWrap(size, color, (c) => `<path d="M20 2 L25 7 L12 22 L9 19 Z" fill="${c}"/><rect x="6" y="19" width="9" height="4" fill="#8b6238"/><rect x="5" y="24" width="5" height="5" fill="#c89b48"/>`);
}

function shield(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 3 L27 7 V16 C27 23 21 28 16 30 C11 28 5 23 5 16 V7 Z" fill="${c}"/><path d="M16 6 V26 C20 24 24 20 24 15 V9 Z" fill="#dfe8ef" opacity="0.45"/>`);
}

function ring(size, color) {
  return svgWrap(size, color, (c) => `<circle cx="16" cy="18" r="9" fill="none" stroke="${c}" stroke-width="4"/><path d="M12 6 H20 L23 11 L16 16 L9 11 Z" fill="#8fd3ff"/>`);
}

function relic(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 3 L27 11 V22 L16 29 L5 22 V11 Z" fill="${c}"/><circle cx="16" cy="16" r="5" fill="#f7eaff"/>`);
}

function rarityDiamond(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 4 L28 16 L16 28 L4 16 Z" fill="${c}"/><path d="M16 8 L24 16 L16 24 L8 16 Z" fill="#ffffff" opacity="0.25"/>`);
}

function droplet(size, color) {
  return svgWrap(size, color, (c, s) => `<path d="M${s / 2} 2 C20 9 22 13 22 17 C22 23 2 23 2 17 C2 13 4 9 ${s / 2} 2 Z" fill="${c}"/>`);
}

function plus(size, color) {
  return svgWrap(size, color, (c) => `<rect x="9" y="3" width="6" height="18" fill="${c}"/><rect x="3" y="9" width="18" height="6" fill="${c}"/>`);
}

function stun(size, color) {
  return svgWrap(size, color, (c) => `<path d="M14 2 L5 13 H11 L9 22 L20 9 H14 Z" fill="${c}"/>`);
}

function arrowUp(size, color) {
  return svgWrap(size, color, (c) => `<path d="M12 2 L22 12 H16 V22 H8 V12 H2 Z" fill="${c}"/>`);
}

function arrowDown(size, color) {
  return svgWrap(size, color, (c) => `<path d="M8 2 H16 V12 H22 L12 22 L2 12 H8 Z" fill="${c}"/>`);
}

function shout(size, color) {
  return svgWrap(size, color, (c) => `<path d="M3 9 H10 L20 3 V21 L10 15 H3 Z" fill="${c}"/><rect x="21" y="9" width="2" height="6" fill="#ffe6bd"/>`);
}

function counter(size, color) {
  return svgWrap(size, color, (c) => `<path d="M12 3 A9 9 0 1 1 4 16 H1 L5 22 L9 16 H6 A6 6 0 1 0 12 6 Z" fill="${c}"/>`);
}

function readySpark(size, color) {
  return svgWrap(size, color, (c) => `<path d="M16 2 L19 12 L30 16 L19 20 L16 30 L13 20 L2 16 L13 12 Z" fill="${c}"/>`);
}

function ultimateBurst(size, color) {
  return svgWrap(size, color, (c) => `<circle cx="16" cy="16" r="7" fill="${c}"/><path d="M16 1 L19 10 H13 Z M16 31 L13 22 H19 Z M1 16 L10 13 V19 Z M31 16 L22 19 V13 Z" fill="#fff0a8"/>`);
}

function check(size, color) {
  return svgWrap(size, color, (c) => `<path d="M5 16 L12 23 L27 8 L24 5 L12 17 L8 13 Z" fill="${c}"/>`);
}

function targetLock(size, color) {
  return svgWrap(size, color, (c) => `<circle cx="16" cy="16" r="9" fill="none" stroke="${c}" stroke-width="3"/><rect x="15" y="3" width="2" height="8" fill="${c}"/><rect x="15" y="21" width="2" height="8" fill="${c}"/><rect x="3" y="15" width="8" height="2" fill="${c}"/><rect x="21" y="15" width="8" height="2" fill="${c}"/>`);
}

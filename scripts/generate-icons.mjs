/**
 * Generate PWA icons + favicon from the warrior spritesheet's first frame.
 * Output: public/icons/icon-192.png, icon-512.png, public/favicon.png
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = new URL('../public/assets/units/prototypes/hero_warrior_spritesheet.png', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1');
const OUT_DIR = new URL('../public/icons/', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1');
const FAVICON = new URL('../public/favicon.png', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1');

await mkdir(OUT_DIR, { recursive: true });

// First idle frame is the top-left 320x256 cell.
const frame = await sharp(SRC)
  .extract({ left: 0, top: 0, width: 320, height: 256 })
  .trim()
  .toBuffer();

async function makeIcon(size, dest) {
  const sprite = await sharp(frame)
    .resize(Math.round(size * 0.78), Math.round(size * 0.78), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'nearest',
    })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 }, // theme background #1a1a2e
    },
  })
    .composite([{ input: sprite, gravity: 'centre' }])
    .png({ palette: true, colors: 256 })
    .toFile(dest);
  console.log(`wrote ${dest}`);
}

await makeIcon(192, `${OUT_DIR}icon-192.png`);
await makeIcon(512, `${OUT_DIR}icon-512.png`);
await makeIcon(64, FAVICON);

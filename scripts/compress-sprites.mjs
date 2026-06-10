/**
 * Quantize unit spritesheet PNGs to 256-color palette PNG8.
 *
 * Pixel-art sheets use few distinct colors, so palette quantization is
 * visually lossless here while cutting file size by ~60-80%. Files are
 * only overwritten when the result is actually smaller; git history is
 * the rollback path.
 *
 * Usage: node scripts/compress-sprites.mjs [--dry-run]
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../public/assets/units/', import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, '$1'); // strip leading slash on Windows
const DRY_RUN = process.argv.includes('--dry-run');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (extname(entry.name).toLowerCase() === '.png') yield path;
  }
}

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;
let skipped = 0;

for await (const file of walk(ROOT)) {
  const before = (await stat(file)).size;
  const input = await readFile(file);
  const output = await sharp(input)
    .png({ palette: true, colors: 256, compressionLevel: 9, effort: 10 })
    .toBuffer();

  totalBefore += before;
  if (output.length < before) {
    totalAfter += output.length;
    changed++;
    if (!DRY_RUN) await writeFile(file, output);
    console.log(`${(before / 1024).toFixed(0).padStart(6)} KB -> ${(output.length / 1024).toFixed(0).padStart(6)} KB  ${file.split(/[\\/]/).slice(-2).join('/')}`);
  } else {
    totalAfter += before;
    skipped++;
  }
}

console.log(`\n${changed} compressed, ${skipped} already optimal`);
console.log(`total: ${(totalBefore / 1048576).toFixed(1)} MB -> ${(totalAfter / 1048576).toFixed(1)} MB (${(100 - totalAfter / totalBefore * 100).toFixed(0)}% saved)${DRY_RUN ? ' [dry-run]' : ''}`);

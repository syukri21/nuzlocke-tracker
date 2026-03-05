import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/type-icons');

const TYPES = [
  'normal','fire','water','electric','grass','ice',
  'fighting','poison','ground','flying','psychic','bug',
  'rock','ghost','dragon','dark','steel','fairy'
];

// duiker101 Pokemon type SVG icons (open-source)
const BASE = 'https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons';

async function main() {
  console.log(`Downloading ${TYPES.length} type icons...`);
  for (const type of TYPES) {
    const url = `${BASE}/${type}.svg`;
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  [skip] ${type}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(OUT_DIR, `${type}.svg`), buf);
    console.log(`  ✓ ${type}`);
  }
  console.log('Done.');
}

main().catch(console.error);

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const locations = JSON.parse(readFileSync(join(root, 'src/data/locations.json'), 'utf8'));
const bosses = JSON.parse(readFileSync(join(root, 'src/data/bosses.json'), 'utf8'));

const combined = {
  meta: {
    game: 'Pokemon Lazarus',
    version: '1.0.0',
    description: 'Default game data for Pokemon Lazarus Nuzlocke Tracker. You can download this file, modify it, and re-upload it to customize your tracker.',
    schema: '1'
  },
  locations: locations.locations,
  bosses: bosses.bosses
};

const outPath = join(root, 'public/lazarus-default.json');
writeFileSync(outPath, JSON.stringify(combined, null, 2));

console.log(`Written to ${outPath}`);
console.log(`  locations: ${combined.locations.length}`);
console.log(`  bosses: ${combined.bosses.length}`);

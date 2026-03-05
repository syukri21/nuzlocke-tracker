import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOSSES = join(__dirname, '../src/data/bosses.json');
const OUT = join(__dirname, '../src/data/move-types.json');

const data = JSON.parse(readFileSync(BOSSES, 'utf8'));
const moves = new Set();
data.bosses.forEach(b => b.pokemon.forEach(p => p.moves.forEach(m => moves.add(m))));

const moveList = [...moves].sort();
console.log(`Fetching types for ${moveList.length} moves...`);

function toApiName(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const result = {};
let ok = 0, skip = 0;

for (const move of moveList) {
  const apiName = toApiName(move);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${apiName}`);
    if (!res.ok) {
      console.warn(`  [skip] ${move} (${apiName})`);
      skip++;
      continue;
    }
    const json = await res.json();
    result[move] = json.type.name;
    console.log(`  ✓ ${move} → ${json.type.name}`);
    ok++;
  } catch (e) {
    console.warn(`  [err] ${move}: ${e.message}`);
    skip++;
  }
}

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nDone. ${ok} OK, ${skip} skipped. Written to ${OUT}`);

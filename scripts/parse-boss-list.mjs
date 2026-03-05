import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TXT = join(__dirname, '../src/data/boss_list.txt');
const OUT = join(__dirname, '../src/data/bosses.json');

const text = readFileSync(TXT, 'utf8');
const rows = text.split('\n').map(r => r.split('\t'));

// Row indices (0-based, since rows[0] = line 1 of file):
// rows[3]  = Split row
// rows[4]  = Trainer Type row
// rows[5]  = Pool type row (1=ace, 2=regular, 3=alt pool)
// rows[6]  = Trainer info row
// rows[7]  = empty
// rows[8]  = Pokemon Name row
// rows[9]  = Level row
// rows[10] = Held Item row
// rows[11] = Ability row
// rows[12] = Moves row 1
// rows[13] = Moves row 2
// rows[14] = Moves row 3
// rows[15] = Moves row 4

const trainerTypeRow = rows[4];
const poolTypeRow    = rows[5];
const trainerRow     = rows[6];
const nameRow        = rows[8];
const levelRow       = rows[9];
const heldItemRow    = rows[10];
const abilityRow     = rows[11];
const moves1Row      = rows[12];
const moves2Row      = rows[13];
const moves3Row      = rows[14];
const moves4Row      = rows[15];

// Find trainer start columns (where trainerRow[col] is non-empty, col >= 1)
const trainerCols = [];
for (let col = 1; col < trainerRow.length; col++) {
  if (trainerRow[col]?.trim()) trainerCols.push(col);
}

function parseTrainerInfo(raw) {
  // Format: "Name, Location - LevelCap | Items | Notes"
  // or: "Name (tag), Location - LevelCap | Items"
  const pipeIdx = raw.indexOf(' | ');
  const nameLoc = pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw;
  const items = pipeIdx >= 0 ? raw.slice(pipeIdx + 3) : '';

  const levelMatch = nameLoc.match(/ - (\d+)$/);
  const levelCap = levelMatch ? parseInt(levelMatch[1]) : null;
  const nameAndLoc = levelMatch ? nameLoc.slice(0, levelMatch.index) : nameLoc;

  const commaIdx = nameAndLoc.indexOf(', ');
  const name = commaIdx >= 0 ? nameAndLoc.slice(0, commaIdx) : nameAndLoc;
  const location = commaIdx >= 0 ? nameAndLoc.slice(commaIdx + 2) : '';

  return { name, location, levelCap, items };
}

const bosses = [];

for (let t = 0; t < trainerCols.length; t++) {
  const startCol = trainerCols[t];
  const endCol = t + 1 < trainerCols.length ? trainerCols[t + 1] - 1 : trainerRow.length - 1;

  const raw = trainerRow[startCol].trim();
  const { name, location, levelCap, items } = parseTrainerInfo(raw);
  const trainerType = trainerTypeRow[startCol]?.trim() || '';

  const pokemon = [];
  for (let col = startCol; col <= endCol; col++) {
    const pokemonName = nameRow[col]?.trim();
    if (!pokemonName) continue;

    const level = parseInt(levelRow[col]?.trim()) || null;
    const rawHeld = heldItemRow[col]?.trim();
    const heldItem = (!rawHeld || rawHeld === '-') ? null : rawHeld;
    const ability = abilityRow[col]?.trim() || null;
    const poolType = poolTypeRow[col]?.trim();
    const isLead = poolType === '1';

    const moves = [
      moves1Row[col]?.trim(),
      moves2Row[col]?.trim(),
      moves3Row[col]?.trim(),
      moves4Row[col]?.trim(),
    ].filter(m => m && m !== '-');

    pokemon.push({ name: pokemonName, level, heldItem, ability, moves, isLead, isAce: false });
  }

  // Mark the last Pokemon as the ace
  if (pokemon.length > 0) pokemon[pokemon.length - 1].isAce = true;

  bosses.push({ name, location, levelCap, trainerType, items, pokemon });
}

writeFileSync(OUT, JSON.stringify({ bosses }, null, 2));
console.log(`Wrote ${bosses.length} bosses to ${OUT}`);
bosses.forEach(b => console.log(`  ${b.name} (${b.trainerType}, ${b.location}, lvl ${b.levelCap}): ${b.pokemon.length} Pokemon`));

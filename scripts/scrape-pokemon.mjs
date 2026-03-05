import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const locationsPath = join(__dirname, '../src/data/locations.json');
const outputPath = join(__dirname, '../src/data/pokemon-cache.json');

const SPECIAL_NAMES = {
  // Mr. family
  'mr-mime': 'mr-mime',
  'mime-jr': 'mime-jr',
  'mr-rime': 'mr-rime',
  // Nidoran
  'nidoran-f': 'nidoran-f',
  'nidoran-m': 'nidoran-m',
  // Misc special chars
  'farfetch-d': 'farfetchd',
  'sirfetch-d': 'sirfetchd',
  'type-null': 'type-null',
  'type--null': 'type-null',
  'ho-oh': 'ho-oh',
  'porygon-z': 'porygon-z',
  'jangmo-o': 'jangmo-o',
  // Flabébé / flabebe
  'flab-b-': 'flabebe',
  'flab-b': 'flabebe',
  'flabébé': 'flabebe',
  'flabebe': 'flabebe',
  // Mimikyu
  'mimikyu': 'mimikyu-disguised',
  // Basculin
  'basculin-white': 'basculin-white-striped',
  'basculin-red': 'basculin',
  // Alolan forms
  'alolan-grimer': 'grimer-alola',
  'alolan-muk': 'muk-alola',
  'alolan-meowth': 'meowth-alola',
  'alolan-persian': 'persian-alola',
  'alolan-raichu': 'raichu-alola',
  'alolan-sandshrew': 'sandshrew-alola',
  'alolan-vulpix': 'vulpix-alola',
  'exeggutor-alola': 'exeggutor-alola',
  // Galarian forms
  'galarian-corsola': 'corsola-galar',
  'galarian-linoone': 'linoone-galar',
  'galarian-meowth': 'meowth-galar',
  'galarian-ponyta': 'ponyta-galar',
  'galarian-rapidash': 'rapidash-galar',
  'galarian-zigzagoon': 'zigzagoon-galar',
  // Hisuian forms
  'hisuian-zorua': 'zorua-hisui',
  'hisuian-growlithe': 'growlithe-hisui',
  'hisuian-voltorb': 'voltorb-hisui',
  'hisuian-sliggoo': 'sliggoo-hisui',
  'hisuian-braviary': 'braviary-hisui',
  'hisuian-electrode': 'electrode-hisui',
  'hisuian-sneasel': 'sneasel-hisui',
  // Paldean forms
  'paldean-tauros': 'tauros-paldea-combat-breed',
  'paldean-tauros-a': 'tauros-paldea-combat-breed',
  'paldean-tauros-b': 'tauros-paldea-blaze-breed',
  'paldean-tauros-c': 'tauros-paldea-aqua-breed',
  'paldean-wooper': 'wooper-paldea',
  // Lycanroc
  'lycanroc': 'lycanroc-midday',
  'midnight-lycanroc': 'lycanroc-midnight',
  // Oricorio
  'oricorio-pa-u': 'oricorio-pau',
  // Gourgeist / Pumpkaboo (use average form)
  'gourgeist': 'gourgeist-average',
  'pumpkaboo': 'pumpkaboo-average',
  // Pyroar (both sexes map to same entry)
  'pyroar-': 'pyroar',
  'pyroar': 'pyroar',
};

const STAT_MAP = {
  hp: 'HP',
  attack: 'ATTACK',
  defense: 'DEFENSE',
  'special-attack': 'SP.ATTACK',
  'special-defense': 'SP.DEFENSE',
  speed: 'SPEED',
};

function formatName(name) {
  // Strip parenthetical notes like "(Cufant?)" that are data artifacts
  const stripped = name.replace(/\s*\(.*?\)/g, '').trim();
  // Normalize: lowercase, replace accents (é→e), remove non-alphanumeric except hyphens
  const normalized = stripped
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[♀♂]/g, '')   // strip gender symbols
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return SPECIAL_NAMES[normalized] || normalized;
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function fetchEvolutionLine(speciesName) {
  try {
    const species = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon-species/${speciesName}`);
    if (!species) return null;
    const chain = await fetchWithRetry(species.evolution_chain.url);
    if (!chain) return null;

    const line = [];
    const seen = new Set();
    const extract = (node) => {
      if (!seen.has(node.species.name)) {
        line.push(node.species.name);
        seen.add(node.species.name);
      }
      node.evolves_to.forEach(b => extract(b));
    };
    extract(chain.chain);
    return line;
  } catch {
    return null;
  }
}

async function main() {
  const locations = JSON.parse(readFileSync(locationsPath, 'utf8'));

  // Collect all unique pokemon names
  const allNames = new Set();
  for (const loc of locations.locations) {
    for (const encList of Object.values(loc.encounters)) {
      for (const p of encList) {
        allNames.add(p.name.toLowerCase());
      }
    }
  }

  const names = [...allNames].sort();
  console.log(`Fetching data for ${names.length} Pokemon...`);

  // Load existing cache so we can skip already-fetched entries
  let existingCache = {};
  try {
    existingCache = JSON.parse(readFileSync(outputPath, 'utf8'));
    console.log(`Loaded ${Object.keys(existingCache).length} existing entries, skipping those.`);
  } catch { /* file doesn't exist yet */ }

  const cache = { ...existingCache };
  const evolutionCache = {}; // species name → line (shared across variants)

  let done = 0;
  for (const name of names) {
    // Skip if already in cache
    if (cache[name]) {
      done++;
      continue;
    }
    const apiName = formatName(name);
    try {
      const data = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
      if (!data) {
        console.warn(`  [404] ${name} (tried: ${apiName})`);
        done++;
        continue;
      }

      const sprite = data.sprites?.front_default || null;
      const officialArtwork = data.sprites?.other?.['official-artwork']?.front_default || null;
      const stats = data.stats.map(s => ({
        name: STAT_MAP[s.stat.name] || s.stat.name.toUpperCase(),
        value: s.base_stat,
      }));
      const types = data.types.map(t => t.type.name);
      const speciesName = data.species?.name || apiName;

      // Reuse cached evolution line if already fetched for this species
      let evolutionLine = evolutionCache[speciesName];
      if (!evolutionLine) {
        evolutionLine = await fetchEvolutionLine(speciesName);
        if (evolutionLine) {
          evolutionLine.forEach(p => { evolutionCache[p] = evolutionLine; });
        }
      }

      cache[name] = { sprite, officialArtwork, stats, types, evolutionLine: evolutionLine || [name] };
      done++;
      process.stdout.write(`\r  ${done}/${names.length} - ${name.padEnd(25)}`);
    } catch (e) {
      console.warn(`\n  [ERR] ${name}: ${e.message}`);
      done++;
    }
  }

  console.log(`\nDone! Writing to pokemon-cache.json...`);
  writeFileSync(outputPath, JSON.stringify(cache, null, 2));
  console.log(`Saved ${Object.keys(cache).length} entries.`);
}

main().catch(console.error);

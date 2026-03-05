import { pokemonDataCache, evolutionLineCache, spriteCache } from '../components/PokemonSelect';

const LS_KEY = 'pokemon-cache-v4';

interface CacheEntry {
  sprite: string | null;
  officialArtwork: string | null;
  stats: { name: string; value: number }[];
  types: string[];
  evolutionLine: string[];
}

type PokemonCacheData = Record<string, CacheEntry>;

function loadIntoMemory(data: PokemonCacheData) {
  for (const [name, entry] of Object.entries(data)) {
    const spriteUrl = entry.officialArtwork || entry.sprite || '';
    if (!spriteUrl) continue;
    // Always store under lowercase key — lookups must use .toLowerCase()
    const key = name.toLowerCase();
    pokemonDataCache[key] = { sprite: spriteUrl, stats: entry.stats, types: entry.types, evolutionLine: entry.evolutionLine };
    spriteCache[key] = spriteUrl;
    if (entry.evolutionLine?.length) {
      entry.evolutionLine.forEach(p => { evolutionLineCache[p] = entry.evolutionLine; });
    }
  }
}

export async function initPokemonCache(): Promise<void> {
  // 1. Try localStorage first (instant on repeat visits)
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      loadIntoMemory(JSON.parse(stored));
      return;
    }
  } catch { /* fall through */ }

  // 2. First load — use bundled JSON
  const data: PokemonCacheData = (await import('../data/pokemon-cache.json')).default as PokemonCacheData;
  loadIntoMemory(data);

  // 3. Persist to localStorage for future visits
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

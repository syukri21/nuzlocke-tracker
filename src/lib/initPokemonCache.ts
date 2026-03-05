import { pokemonDataCache, evolutionLineCache, spriteCache } from '../components/PokemonSelect';

const LS_KEY = 'pokemon-cache-v1';

interface CacheEntry {
  sprite: string | null;
  officialArtwork: string | null;
  stats: { name: string; value: number }[];
  types: string[];
  evolutionLine: string[];
}

type PokemonCacheData = Record<string, CacheEntry>;

function populateMemoryCache(data: PokemonCacheData) {
  for (const [name, entry] of Object.entries(data)) {
    if (!entry.sprite && !entry.officialArtwork) continue;
    const spriteUrl = entry.officialArtwork || entry.sprite || '';
    pokemonDataCache[name] = {
      sprite: spriteUrl,
      stats: entry.stats,
      types: entry.types,
      evolutionLine: entry.evolutionLine,
    };
    if (spriteUrl) spriteCache[name] = spriteUrl;
    // Populate evolution line cache for all members of the line
    if (entry.evolutionLine?.length) {
      entry.evolutionLine.forEach(p => {
        evolutionLineCache[p] = entry.evolutionLine;
      });
    }
  }
}

export async function initPokemonCache(): Promise<void> {
  // 1. Try localStorage first (fastest)
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const data: PokemonCacheData = JSON.parse(stored);
      populateMemoryCache(data);
      return;
    }
  } catch {
    // localStorage parse error — fall through to JSON import
  }

  // 2. Load bundled JSON (first ever load)
  const data: PokemonCacheData = (await import('../data/pokemon-cache.json')).default as PokemonCacheData;
  populateMemoryCache(data);

  // 3. Persist to localStorage for future loads
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // localStorage quota exceeded — not fatal
  }
}

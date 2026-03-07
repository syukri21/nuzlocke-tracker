import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { EncounterOption } from '../types';
import evolutionOverridesJson from '../data/evolution-overrides.json';

const EVOLUTION_OVERRIDES = evolutionOverridesJson as unknown as Record<string, string[]>;

export interface PokemonSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: EncounterOption[];
}

// Global cache for Pokemon data to avoid redundant API calls
export interface PokemonData {
  sprite: string;
  stats: { name: string; value: number }[];
  types?: string[];
  evolutionLine?: string[];
}
export const pokemonDataCache: Record<string, PokemonData> = {};
export const evolutionLineCache: Record<string, string[]> = {};
export const movesCache: Record<string, string[]> = {};

export interface AbilityDetail {
  name: string;
  shortEffect: string;
  effect: string;
}

const ABILITY_LS_KEY = 'lazarus_ability_cache';
export const abilityCache: Record<string, AbilityDetail> = (() => {
  try {
    const saved = localStorage.getItem(ABILITY_LS_KEY);
    if (saved) return JSON.parse(saved) as Record<string, AbilityDetail>;
  } catch { /* ignore */ }
  return {};
})();

export const fetchAbilityDetail = async (name: string): Promise<AbilityDetail | null> => {
  const key = name.toLowerCase().replace(/\s+/g, '-');
  if (abilityCache[key]) return abilityCache[key];
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/ability/${key}`);
    if (res.ok) {
      const data = await res.json();
      const en = data.effect_entries.find((e: any) => e.language.name === 'en');
      const detail: AbilityDetail = {
        name: data.name,
        shortEffect: en?.short_effect ?? '',
        effect: en?.effect ?? '',
      };
      abilityCache[key] = detail;
      try { localStorage.setItem(ABILITY_LS_KEY, JSON.stringify(abilityCache)); } catch { /* ignore */ }
      return detail;
    }
  } catch { /* ignore */ }
  return null;
};

export interface MoveDetail {
  type: string;
  damageClass: 'physical' | 'special' | 'status';
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  description?: string;
}

const MOVE_DETAIL_LS_KEY = 'lazarus_move_detail_cache';

// Initialise from localStorage so cached details survive page reloads
export const moveDetailCache: Record<string, MoveDetail> = (() => {
  try {
    const saved = localStorage.getItem(MOVE_DETAIL_LS_KEY);
    if (saved) return JSON.parse(saved) as Record<string, MoveDetail>;
  } catch { /* ignore */ }
  return {};
})();

export const fetchMoveDetail = async (moveName: string): Promise<MoveDetail | null> => {
  const key = moveName.toLowerCase().replace(/\s+/g, '-');
  // Skip cache if description is missing (older cached entries lack it)
  if (moveDetailCache[key]?.description !== undefined) return moveDetailCache[key];
  // Strip apostrophes/backticks for PokeAPI URL (e.g. "king's-shield" → "kings-shield")
  const apiKey = key.replace(/[`']/g, '');
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/move/${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const en = data.effect_entries?.find((e: any) => e.language.name === 'en');
      const detail: MoveDetail = {
        type: data.type.name,
        damageClass: data.damage_class.name,
        power: data.power,
        accuracy: data.accuracy,
        pp: data.pp,
        description: en?.short_effect ?? '',
      };
      moveDetailCache[key] = detail;
      try { localStorage.setItem(MOVE_DETAIL_LS_KEY, JSON.stringify(moveDetailCache)); } catch { /* ignore */ }
      return detail;
    }
  } catch { /* ignore */ }
  return null;
};

export const prefetchMoveDetails = (moves: string[]): void => {
  moves.forEach(m => { if (!moveDetailCache[m.toLowerCase().replace(/\s+/g, '-')]) fetchMoveDetail(m); });
};
export const spriteCache: Record<string, string> = {}; // Keep for backward compatibility if needed

// Helper to handle edge cases in API names.
// PokeAPI regional form convention: {name}-{region} (e.g. electrode-hisui, vulpix-alola)
// but our data uses the prefix style: hisuian-electrode, alolan-vulpix, etc.
// Normalize a raw name string for PokeAPI lookups:
// translates gender symbols to -male/-female, strips other non-alphanumeric chars,
// collapses and trims hyphens.
const normalizeName = (name: string) =>
  name
    .replace(/[♂\u2642]/g, '-male')
    .replace(/[♀\u2640]/g, '-female')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '');

export const formatSpecialNames = (name: string) => {
  // True irregulars that don't follow any predictable pattern
  const specialCases: Record<string, string> = {
    'farfetch-d':         'farfetchd',
    'sirfetch-d':         'sirfetchd',
    'basculin-white':     'basculin-white-striped',
    'paldean-tauros':     'tauros-paldea-combat-breed',
    'mimikyu':            'mimikyu-disguised',
    'flabebe':            'flabebe',
    'aegislash':          'aegislash-shield',
    'wormadam':           'wormadam-plant',
    'shaymin':            'shaymin-land',
    'giratina':           'giratina-altered',
    'tornadus':           'tornadus-incarnate',
    'thundurus':          'thundurus-incarnate',
    'landorus':           'landorus-incarnate',
    'keldeo':             'keldeo-ordinary',
    'meloetta':           'meloetta-aria',
    'meowstic':           'meowstic-male',
    'zygarde':            'zygarde-50',
    'wishiwashi':         'wishiwashi-solo',
    'minior':             'minior-red-meteor',
    'toxtricity':         'toxtricity-amped',
    'indeedee':           'indeedee-male',
    // Lycanroc forms (our data uses adjective-first ordering)
    'dusk-lycanroc':      'lycanroc-dusk',
    'midnight-lycanroc':  'lycanroc-midnight',
    'midday-lycanroc':    'lycanroc-midday',
  };

  if (specialCases[name]) return specialCases[name];

  // Regional prefix → suffix  (hisuian-x → x-hisui, alolan-x → x-alola, etc.)
  const regional: [string, string][] = [
    ['hisuian-', '-hisui'],
    ['alolan-',  '-alola'],
    ['galarian-','-galar'],
    ['paldean-', '-paldea'],
  ];
  for (const [prefix, suffix] of regional) {
    if (name.startsWith(prefix)) return name.slice(prefix.length) + suffix;
  }

  return name;
};

// Derive the PokeAPI species name from the formatted pokemon name.
// Species endpoint uses base species (no form suffix), e.g. aegislash-shield → aegislash.
const toSpeciesName = (formattedName: string): string => {
  const explicit: Record<string, string> = {
    'lycanroc-dusk':       'lycanroc',
    'lycanroc-midnight':   'lycanroc',
    'lycanroc-midday':     'lycanroc',
    'aegislash-shield':    'aegislash',
    'aegislash-blade':     'aegislash',
    'minior-red-meteor':   'minior',
    'wishiwashi-solo':     'wishiwashi',
    'zygarde-50':          'zygarde',
    'pyroar-male':         'pyroar',
    'pyroar-female':       'pyroar',
    'basculegion-male':    'basculegion',
    'basculegion-female':  'basculegion',
    'indeedee-male':       'indeedee',
    'indeedee-female':     'indeedee',
    'meowstic-male':       'meowstic',
    'meowstic-female':     'meowstic',
  };
  if (explicit[formattedName]) return explicit[formattedName];
  // Strip regional suffixes (marowak-alola → marowak, electrode-hisui → electrode)
  for (const suffix of ['-alola', '-galar', '-hisui', '-paldea']) {
    if (formattedName.endsWith(suffix)) return formattedName.slice(0, -suffix.length);
  }
  return formattedName;
};

export const fetchPokemonMoves = async (name: string): Promise<string[]> => {
  const key = name.toLowerCase();
  if (movesCache[key]) return movesCache[key];
  try {
    const formattedName = formatSpecialNames(normalizeName(key));
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
    if (res.ok) {
      const data = await res.json();
      const moves: string[] = data.moves.map((m: any) => m.move.name as string);
      movesCache[key] = moves;
      return moves;
    }
  } catch { /* ignore */ }
  return [];
};

export const fetchPokemonData = async (name: string): Promise<PokemonData | null> => {
  const key = name.toLowerCase();
  if (pokemonDataCache[key]) return pokemonDataCache[key];
  try {
    const formattedName = formatSpecialNames(normalizeName(name));
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
    if (res.ok) {
      const data = await res.json();
      const spriteUrl = data.sprites?.front_default;
      const stats = data.stats.map((s: any) => ({
        name: s.stat.name.replace('special-', 'sp.').toUpperCase(),
        value: s.base_stat
      }));
      const types = data.types.map((t: any) => t.type.name as string);

      if (spriteUrl) {
        // Also try to get evolution line if not cached
        let evolutionLine = evolutionLineCache[name];
        if (!evolutionLine) {
          evolutionLine = await fetchEvolutionLine(name);
        }

        const pokemonData = { sprite: spriteUrl, stats, types, evolutionLine };
        pokemonDataCache[key] = pokemonData;
        spriteCache[key] = spriteUrl;
        return pokemonData;
      }
    }
  } catch (e) {
    console.error(`Failed to fetch data for ${name}`, e);
  }
  return null;
};

export const fetchEvolutionLine = async (name: string): Promise<string[]> => {
  if (evolutionLineCache[name]) return evolutionLineCache[name];

  // Check static overrides first (regional forms / Lazarus-specific evolutions)
  const normalizedKey = normalizeName(name);
  if (EVOLUTION_OVERRIDES[normalizedKey]) {
    const line = EVOLUTION_OVERRIDES[normalizedKey];
    evolutionLineCache[name] = line;
    evolutionLineCache[normalizedKey] = line;
    line.forEach(p => { evolutionLineCache[p] = line; });
    return line;
  }

  try {
    const formattedName = formatSpecialNames(normalizedKey);
    // 1. Get species data — species endpoint needs base species name (no form suffix)
    const speciesName = toSpeciesName(formattedName);
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesName}`);
    if (!speciesRes.ok) return [name];
    const speciesData = await speciesRes.json();

    // 2. Get evolution chain
    const chainRes = await fetch(speciesData.evolution_chain.url);
    if (!chainRes.ok) return [name];
    const chainData = await chainRes.json();

    // 3. Flatten the chain (handles branching like Eevee)
    const line: string[] = [];
    const seen = new Set<string>();

    const extract = (node: any) => {
      const sName = node.species.name;
      if (!seen.has(sName)) {
        line.push(sName);
        seen.add(sName);
      }
      // Recursively traverse all possible evolution paths
      if (node.evolves_to.length > 0) {
        node.evolves_to.forEach((branch: any) => extract(branch));
      }
    };
    extract(chainData.chain);

    // 4. Cache for all in line (PokeAPI names) and the original input name
    evolutionLineCache[name.toLowerCase()] = line;
    line.forEach(p => {
      evolutionLineCache[p] = line;
    });

    return line;
  } catch (e) {
    console.error(`Failed to fetch evolution for ${name}`, e);
    return [name];
  }
};

// Legacy shim
export const fetchSpriteForName = async (name: string): Promise<string | null> => {
  const data = await fetchPokemonData(name);
  return data?.sprite || null;
};

export function PokemonSelect({ value, onChange, options }: PokemonSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sprites, setSprites] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch sprites for visible options
  useEffect(() => {
    let mounted = true;

    const fetchSprites = async () => {
      // Items to fetch (we only need the selected value and the filtered options if open)
      const toFetch = new Set<string>();
      if (value) toFetch.add(value);
      if (isOpen) {
        filteredOptions.forEach(opt => toFetch.add(opt.name));
      }

      const newSprites: Record<string, string> = {};
      let needsUpdate = false;

      for (const name of toFetch) {
        if (spriteCache[name]) {
          newSprites[name] = spriteCache[name];
        } else {
          try {
            const formattedName = formatSpecialNames(normalizeName(name));
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
            if (res.ok) {
              const data = await res.json();
              const spriteUrl = data.sprites?.front_default;
              if (spriteUrl) {
                spriteCache[name] = spriteUrl;
                newSprites[name] = spriteUrl;
                needsUpdate = true;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch sprite for ${name}`, e);
          }
        }
      }

      if (mounted && (needsUpdate || Object.keys(newSprites).length > 0)) {
        setSprites(prev => ({ ...prev, ...newSprites }));
      }
    };

    fetchSprites();

    return () => {
      mounted = false;
    };
  }, [value, isOpen, searchQuery, options]); // re-run when these change

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getSpriteUrl = (pokemonName: string) => {
    return sprites[pokemonName] || spriteCache[pokemonName] || '';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[#2a2a2a] border border-white/10 rounded-md py-1.5 px-3 flex items-center justify-between text-xs transition-colors hover:border-white/20 focus:border-white/20 focus:outline-none",
          value ? "text-white" : "text-gray-400"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {value ? (
            <>
              {getSpriteUrl(value) ? (
                <img
                  src={getSpriteUrl(value)}
                  alt={value}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <div className="w-6 h-6 rounded-full border border-gray-500 border-dashed" />
              )}
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span>Find encounter</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#2a2a2a] border border-white/10 rounded-md shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10 flex items-center gap-2 sticky top-0 bg-[#2a2a2a] z-10">
            <Search className="h-3 w-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search Pokémon..."
              className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto w-full styled-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-2 px-3 text-xs text-gray-500 text-center">No Pokémon found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id + '-' + option.name}
                  type="button"
                  onClick={() => handleSelect(option.name)}
                  className={cn(
                    "w-full text-left py-1.5 px-3 text-xs flex items-center gap-2 hover:bg-white/10 transition-colors",
                    value === option.name ? "bg-white/5 text-white font-medium" : "text-gray-300"
                  )}
                >
                  {getSpriteUrl(option.name) ? (
                    <img
                      src={getSpriteUrl(option.name)}
                      alt={option.name}
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-gray-600 border-dashed flex-shrink-0" />
                  )}
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

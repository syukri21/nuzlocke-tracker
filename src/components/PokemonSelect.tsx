import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { EncounterOption } from '../types';

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
export const spriteCache: Record<string, string> = {}; // Keep for backward compatibility if needed

// Helper to handle edge cases in API names.
// PokeAPI regional form convention: {name}-{region} (e.g. electrode-hisui, vulpix-alola)
// but our data uses the prefix style: hisuian-electrode, alolan-vulpix, etc.
export const formatSpecialNames = (name: string) => {
  // True irregulars that don't follow any predictable pattern
  const specialCases: Record<string, string> = {
    'farfetch-d':       'farfetchd',
    'sirfetch-d':       'sirfetchd',
    'basculin-white':   'basculin-white-striped',
    'paldean-tauros':   'tauros-paldea-combat-breed',
    'mimikyu':          'mimikyu-disguised',
    'flabebe':          'flabebe',
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

export const fetchPokemonData = async (name: string): Promise<PokemonData | null> => {
  const key = name.toLowerCase();
  if (pokemonDataCache[key]) return pokemonDataCache[key];
  try {
    const formattedName = formatSpecialNames(name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
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

  try {
    const formattedName = formatSpecialNames(name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    // 1. Get species data
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${formattedName}`);
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

    // 4. Cache for all in line
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
            const formattedName = formatSpecialNames(name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
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

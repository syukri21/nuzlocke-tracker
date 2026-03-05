import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRunStore } from './hooks/useRunStore';
import locationsData from './data/locations.json';
import bossesData from './data/bosses.json';
import moveTypes from './data/move-types.json';
import { Skull, Package, Gamepad2, Search, Settings, Sun, ChevronRight, CheckCircle2, CircleSlash, Copy, Gift, Sparkles, Pencil, X, Ruler, Weight } from 'lucide-react';
import { cn } from "@/lib/utils";

import { PokemonSelect, fetchSpriteForName, spriteCache, pokemonDataCache, fetchPokemonData, evolutionLineCache, fetchEvolutionLine } from './components/PokemonSelect';
import { initPokemonCache } from './lib/initPokemonCache';

const STATUS_ACTIONS = [
  { key: 'Caught', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20', activeBg: 'bg-emerald-500/30', label: 'Catch' },
  { key: 'Fainted', icon: Skull, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/20', activeBg: 'bg-red-500/30', label: 'Dead' },
  { key: 'Missed', icon: CircleSlash, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/20', activeBg: 'bg-orange-500/30', label: 'Miss' },
  { key: 'Dupe', icon: Copy, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/20', activeBg: 'bg-yellow-500/30', label: 'Dupe' },
  { key: 'Gift', icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/20', activeBg: 'bg-purple-500/30', label: 'Gift' },
  { key: 'Shiny', icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/20', activeBg: 'bg-cyan-500/30', label: 'Shiny' },
] as const;

const STATUS_COLOR_MAP: Record<string, { text: string; bg: string }> = {
  Caught: { text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  Fainted: { text: 'text-red-400', bg: 'bg-red-500/20' },
  Missed: { text: 'text-orange-400', bg: 'bg-orange-500/20' },
  Dupe: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  Gift: { text: 'text-purple-400', bg: 'bg-purple-500/20' },
  Shiny: { text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  None: { text: 'text-gray-400', bg: 'bg-gray-500/20' },
};

const TYPE_BG: Record<string, string> = {
  normal: '#9099A1',   fire: '#FF9C54',    water: '#4D90D5',
  electric: '#F3D23B', grass: '#63BB5B',   ice: '#74CEC0',
  fighting: '#CE4069', poison: '#AB6AC8',  ground: '#D97845',
  flying: '#8FA8DD',   psychic: '#F97176', bug: '#90C12C',
  rock: '#C8B686',     ghost: '#5269AC',   dragon: '#0B6DC3',
  dark: '#5A5366',     steel: '#5A8EA2',   fairy: '#EC8FE6',
};

const Pokeball = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="47" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
    <path d="M3 50 A47 47 0 0 1 97 50" fill="rgba(220,50,50,0.5)"/>
    <path d="M3 50 A47 47 0 0 0 97 50" fill="rgba(255,255,255,0.07)"/>
    <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
    <circle cx="50" cy="50" r="11" fill="#1a1a1a" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
  </svg>
);

const TypeIcon = ({ type, size = 'md', label = true }: { type: string; size?: 'sm' | 'md' | 'lg'; label?: boolean }) => {
  const bg = TYPE_BG[type] || '#9099A1';
  const dims = label
    ? (size === 'sm' ? 'h-4 px-1.5 gap-1' : size === 'lg' ? 'h-7 px-2.5 gap-1.5' : 'h-5 px-2 gap-1')
    : (size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5');
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';
  const textSize = size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-[11px]' : 'text-[9px]';
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-bold uppercase tracking-wide text-white", dims)}
      style={{ backgroundColor: bg }}
      title={type}
    >
      <img src={`/type-icons/${type}.svg`} alt="" className={cn("object-contain flex-shrink-0", iconSize)} />
      {label && <span className={textSize}>{type}</span>}
    </span>
  );
};

const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-gray-500',
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  electric: 'bg-yellow-400',
  grass: 'bg-green-500',
  ice: 'bg-cyan-400',
  fighting: 'bg-red-700',
  poison: 'bg-purple-500',
  ground: 'bg-yellow-600',
  flying: 'bg-indigo-400',
  psychic: 'bg-pink-500',
  bug: 'bg-lime-500',
  rock: 'bg-yellow-700',
  ghost: 'bg-purple-700',
  dragon: 'bg-indigo-600',
  dark: 'bg-gray-700',
  steel: 'bg-slate-400',
  fairy: 'bg-pink-400',
};

// Defender-centric type chart: for each type, what attacking types are weak/resist/immune
const DEFENDER_CHART: Record<string, { weak: string[]; resist: string[]; immune: string[] }> = {
  normal:   { weak: ['fighting'], resist: [], immune: ['ghost'] },
  fire:     { weak: ['water', 'ground', 'rock'], resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune: [] },
  water:    { weak: ['electric', 'grass'], resist: ['fire', 'water', 'ice', 'steel'], immune: [] },
  electric: { weak: ['ground'], resist: ['electric', 'flying', 'steel'], immune: [] },
  grass:    { weak: ['fire', 'ice', 'poison', 'flying', 'bug'], resist: ['water', 'electric', 'grass', 'ground'], immune: [] },
  ice:      { weak: ['fire', 'fighting', 'rock', 'steel'], resist: ['ice'], immune: [] },
  fighting: { weak: ['flying', 'psychic', 'fairy'], resist: ['bug', 'rock', 'dark'], immune: [] },
  poison:   { weak: ['ground', 'psychic'], resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immune: [] },
  ground:   { weak: ['water', 'grass', 'ice'], resist: ['poison', 'rock'], immune: ['electric'] },
  flying:   { weak: ['electric', 'ice', 'rock'], resist: ['grass', 'fighting', 'bug'], immune: ['ground'] },
  psychic:  { weak: ['bug', 'ghost', 'dark'], resist: ['fighting', 'psychic'], immune: [] },
  bug:      { weak: ['fire', 'flying', 'rock'], resist: ['grass', 'fighting', 'ground'], immune: [] },
  rock:     { weak: ['water', 'grass', 'fighting', 'ground', 'steel'], resist: ['normal', 'fire', 'poison', 'flying'], immune: [] },
  ghost:    { weak: ['ghost', 'dark'], resist: ['poison', 'bug'], immune: ['normal', 'fighting'] },
  dragon:   { weak: ['ice', 'dragon', 'fairy'], resist: ['fire', 'water', 'electric', 'grass'], immune: [] },
  dark:     { weak: ['fighting', 'bug', 'fairy'], resist: ['ghost', 'dark'], immune: ['psychic'] },
  steel:    { weak: ['fire', 'fighting', 'ground'], resist: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune: ['poison'] },
  fairy:    { weak: ['poison', 'steel'], resist: ['fighting', 'bug', 'dark'], immune: ['dragon'] },
};

const ALL_TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

function getTypeMatchups(types: string[]) {
  const all = ALL_TYPES.map(attackType => {
    const mult = types.reduce((acc, defType) => {
      const chart = DEFENDER_CHART[defType];
      if (!chart) return acc;
      if (chart.immune.includes(attackType)) return acc * 0;
      if (chart.weak.includes(attackType)) return acc * 2;
      if (chart.resist.includes(attackType)) return acc * 0.5;
      return acc;
    }, 1);
    return { type: attackType, multiplier: mult };
  });
  return {
    superWeak:   all.filter(t => t.multiplier === 4),
    weak:        all.filter(t => t.multiplier === 2),
    resist:      all.filter(t => t.multiplier === 0.5),
    superResist: all.filter(t => t.multiplier === 0.25),
    immune:      all.filter(t => t.multiplier === 0),
  };
}

const STAT_COLORS: Record<string, string> = {
  HP: 'bg-red-500',
  ATTACK: 'bg-orange-500',
  DEFENSE: 'bg-yellow-500',
  'SP.ATTACK': 'bg-blue-500',
  'SP.DEFENSE': 'bg-green-500',
  SPEED: 'bg-pink-500',
};

interface DetailData {
  sprite: string;
  name: string;
  nickname?: string;
  types: string[];
  stats: { name: string; value: number }[];
  abilities: string[];
  height: number;
  weight: number;
  evolutionLine?: string[];
  moves?: string[];
  heldItem?: string | null;
}

function playSadMelody() {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  // Descending A minor melody
  const notes = [
    { freq: 440.00, t: 0.0 },  // A4
    { freq: 392.00, t: 0.75 }, // G4
    { freq: 349.23, t: 1.50 }, // F4
    { freq: 329.63, t: 2.25 }, // E4
    { freq: 293.66, t: 3.00 }, // D4
    { freq: 261.63, t: 3.75 }, // C4
    { freq: 246.94, t: 4.50 }, // B3
    { freq: 220.00, t: 5.50 }, // A3 — long final note
  ];
  notes.forEach(({ freq, t }, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5;
    vibratoGain.gain.value = 3;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const isLast = i === notes.length - 1;
    const dur = isLast ? 2.5 : 0.7;
    const start = ctx.currentTime + t;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.12);
    gain.gain.linearRampToValueAtTime(0.09, start + dur - 0.15);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    vibrato.start(start);
    osc.start(start);
    osc.stop(start + dur);
    vibrato.stop(start + dur);
  });
}

const SNOWFLAKES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 5,
  char: ['❄', '❅', '❆', '·'][Math.floor(Math.random() * 4)],
}));

function GraveyardCard({ locName, enc, sprite }: {
  locName: string;
  enc: { pokemonName?: string; nickname?: string; status: string };
  sprite?: string;
}) {
  const [tribute, setTribute] = useState(false);

  const handleTap = () => {
    if (tribute) return;
    setTribute(true);
    playSadMelody();
  };

  return (
    <div className={cn(
      "relative bg-[#212121] rounded-xl border border-white/5 p-4 transition-colors duration-[2000ms]",
      tribute && "border-blue-900/30 bg-[#181820]"
    )}>
      {/* Full-screen snow via portal */}
      {tribute && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[400] overflow-hidden">
          {SNOWFLAKES.map(sf => (
            <span
              key={sf.id}
              className="snowflake"
              style={{ left: `${sf.left}%`, animationDelay: `${sf.delay}s`, animationDuration: `${sf.duration}s` }}
            >
              {sf.char}
            </span>
          ))}
        </div>,
        document.body
      )}

      <div className="flex items-center gap-4">
        {/* Tappable image */}
        <button
          onClick={handleTap}
          className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-xl bg-black/40 border border-white/5 overflow-hidden cursor-pointer active:scale-95 transition-transform"
        >
          {sprite ? (
            <img
              src={sprite}
              alt={enc.pokemonName}
              className="w-14 h-14 object-contain transition-all duration-[3000ms]"
              style={tribute ? { filter: 'grayscale(1) blur(1.5px) brightness(0.5)', opacity: 0.6 } : {}}
            />
          ) : (
            <Skull className={cn("h-7 w-7 transition-colors duration-[3000ms]", tribute ? "text-gray-600" : "text-gray-700")} />
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {enc.nickname && (
            <div className={cn("text-base font-black truncate transition-colors duration-[2000ms]", tribute ? "text-gray-500" : "text-gray-300")}>
              {enc.nickname}
            </div>
          )}
          <div className={cn("font-bold truncate transition-colors duration-[2000ms]", enc.nickname ? "text-xs text-gray-600" : "text-sm text-gray-400")}>
            {enc.pokemonName}
          </div>
          <div className="text-[10px] text-gray-700 mt-0.5 truncate">Fell at {locName}</div>
          {tribute && (
            <div className="text-[9px] text-blue-400/40 mt-1 font-medium">Remembered forever</div>
          )}
        </div>

        <Skull className={cn("h-4 w-4 flex-shrink-0 transition-colors duration-[2000ms]", tribute ? "text-gray-700" : "text-red-900/60")} />
      </div>
    </div>
  );
}

export default function App() {
  const { state, updateEncounter, markFainted } = useRunStore();
  const [activeMainTab, setActiveMainTab] = useState<'Game' | 'Box' | 'Grave'>('Game');
  const [activeSubTab, setActiveSubTab] = useState<'Nuzlocke' | 'Routes' | 'Bosses' | 'Upcoming'>('Nuzlocke');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLocations, setEditingLocations] = useState<Set<string>>(new Set());
  const [detailPokemon, setDetailPokemon] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);

  // State to hold boss sprites once fetched
  const [bossSprites, setBossSprites] = useState<Record<string, string>>({});

  // Initialize Pokemon cache from localStorage or bundled JSON on startup
  useEffect(() => {
    initPokemonCache().then(() => {
      setCacheReady(true);
      // Populate boss sprites from cache
      const newSprites: Record<string, string> = {};
      bossesData.bosses.forEach(boss => {
        boss.pokemon.forEach(p => {
          if (pokemonDataCache[p.name.toLowerCase()]?.sprite) newSprites[p.name] = pokemonDataCache[p.name.toLowerCase()].sprite;
        });
      });
      setBossSprites(newSprites);
    });
  }, []);

  // After cache is ready, fetch data for any boxed/graveyard Pokemon not in the bundled cache
  // (e.g. evolutions like Jolteon that weren't in locations.json)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!cacheReady) return;
    const missing = [...state.box, ...state.graveyard]
      .map(loc => state.encounters[loc]?.pokemonName)
      .filter((name): name is string => !!name && !pokemonDataCache[name.toLowerCase()]);

    if (missing.length === 0) return;
    const unique = [...new Set(missing)];
    Promise.all(unique.map(name => fetchPokemonData(name))).then(() => {
      forceUpdate(n => n + 1);
    });
  }, [cacheReady, state.box, state.graveyard]);

  const toggleEditing = (locName: string) => {
    setEditingLocations(prev => {
      const next = new Set(prev);
      if (next.has(locName)) next.delete(locName);
      else next.add(locName);
      return next;
    });
  };

  const handleStatusAction = (locName: string, status: string) => {
    updateEncounter(locName, { status: status as any });
    // Collapse card after choosing a status
    setEditingLocations(prev => {
      const next = new Set(prev);
      next.delete(locName);
      return next;
    });
  };

  const handleEvolve = async (locName: string) => {
    const enc = state.encounters[locName];
    if (!enc || !enc.pokemonName) return;

    // Use cached line or fetch it
    let line = evolutionLineCache[enc.pokemonName.toLowerCase()];
    if (!line) {
      line = await fetchEvolutionLine(enc.pokemonName);
    }

    if (line.length <= 1) return; // No evolution

    const currentIndex = line.indexOf(enc.pokemonName.toLowerCase());
    const nextIndex = (currentIndex + 1) % line.length;
    const nextPokemon = line[nextIndex];

    // Pre-fetch data for the next pokemon to ensure instant image/stat swap
    await fetchPokemonData(nextPokemon);

    updateEncounter(locName, { pokemonName: nextPokemon });
  };

  const openPokemonDetail = useCallback(async (locName: string) => {
    const enc = state.encounters[locName];
    if (!enc?.pokemonName) return;

    setDetailLoading(true);
    setDetailPokemon(null);

    try {
      const { formatSpecialNames } = await import('./components/PokemonSelect');
      const name = enc.pokemonName;
      const formattedName = formatSpecialNames(name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      const STAT_NAME_MAP: Record<string, string> = {
        hp: 'HP',
        attack: 'ATTACK',
        defense: 'DEFENSE',
        'special-attack': 'SP.ATTACK',
        'special-defense': 'SP.DEFENSE',
        speed: 'SPEED',
      };
      const stats = data.stats.map((s: any) => ({
        name: STAT_NAME_MAP[s.stat.name] || s.stat.name.toUpperCase(),
        value: s.base_stat,
      }));

      setDetailPokemon({
        sprite: data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '',
        name,
        nickname: enc.nickname,
        types: data.types.map((t: any) => t.type.name),
        stats,
        abilities: data.abilities.map((a: any) => a.ability.name.replace(/-/g, ' ')),
        height: data.height,
        weight: data.weight,
      });
    } catch (e) {
      // fallback to cached data
      const cached = pokemonDataCache[(state.encounters[locName]?.pokemonName || '').toLowerCase()];
      if (cached) {
        setDetailPokemon({
          sprite: cached.sprite,
          name: state.encounters[locName].pokemonName!,
          nickname: state.encounters[locName].nickname,
          types: [],
          stats: cached.stats,
          abilities: [],
          height: 0,
          weight: 0,
        });
      }
    } finally {
      setDetailLoading(false);
    }
  }, [state.encounters]);

  const openBossDetail = useCallback(async (p: { name: string; level: number; heldItem: string | null; ability: string | null; moves: string[]; isAce: boolean; isLead: boolean }) => {
    setDetailLoading(true);
    setDetailPokemon(null);

    const cached = pokemonDataCache[p.name.toLowerCase()];
    if (cached) {
      setDetailPokemon({
        sprite: cached.sprite,
        name: p.name,
        types: cached.types || [],
        stats: cached.stats,
        abilities: p.ability ? [p.ability] : [],
        height: 0,
        weight: 0,
        moves: p.moves,
        heldItem: p.heldItem,
      });
      setDetailLoading(false);
      return;
    }

    try {
      const { formatSpecialNames } = await import('./components/PokemonSelect');
      const formattedName = formatSpecialNames(p.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      const STAT_NAME_MAP: Record<string, string> = { hp: 'HP', attack: 'ATTACK', defense: 'DEFENSE', 'special-attack': 'SP.ATTACK', 'special-defense': 'SP.DEFENSE', speed: 'SPEED' };
      setDetailPokemon({
        sprite: data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '',
        name: p.name,
        types: data.types.map((t: any) => t.type.name),
        stats: data.stats.map((s: any) => ({ name: STAT_NAME_MAP[s.stat.name] || s.stat.name.toUpperCase(), value: s.base_stat })),
        abilities: p.ability ? [p.ability] : data.abilities.map((a: any) => a.ability.name.replace(/-/g, ' ')),
        height: data.height,
        weight: data.weight,
        moves: p.moves,
        heldItem: p.heldItem,
      });
    } catch {
      setDetailPokemon({
        sprite: '',
        name: p.name,
        types: [],
        stats: [],
        abilities: p.ability ? [p.ability] : [],
        height: 0,
        weight: 0,
        moves: p.moves,
        heldItem: p.heldItem,
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Helper to capitalize first letter
  const cap = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const renderEncounterRow = (locName: string) => {
    const enc = state.encounters[locName] || { locationName: locName, status: 'None' };
    const loc = locationsData.locations.find(l => l.name === locName);

    const availablePokemonSet = new Map<string, { name: string, id: number }>();
    if (loc) {
      Object.values(loc.encounters).flat().forEach((p) => {
        if (p && p.name) availablePokemonSet.set(p.name, p);
      });
    }
    const availablePokemon = Array.from(availablePokemonSet.values());

    const selectedSprite = enc.pokemonName ? spriteCache[enc.pokemonName.toLowerCase()] : null;
    const isEditing = editingLocations.has(locName);
    const hasPokemon = !!enc.pokemonName;
    const isMissed = enc.status === 'Missed';
    const statusStyle = STATUS_COLOR_MAP[enc.status] || STATUS_COLOR_MAP.None;

    // ── Collapsed View (default) ──
    if (!isEditing) {
      return (
        <div
          key={locName}
          onClick={() => toggleEditing(locName)}
          className={cn(
            "relative bg-[#212121] rounded-xl border px-3 py-2.5 mb-3 last:mb-0 shadow-md flex items-center gap-3 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform",
            isMissed ? "border-white/5 opacity-50" : "border-white/5"
          )}
        >
          {isMissed && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
            </div>
          )}

          {/* Sprite or Pokeball */}
          <div className={cn("w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden", isMissed && "grayscale")}>
            {hasPokemon && selectedSprite ? (
              <img src={selectedSprite} alt={enc.pokemonName} className="w-9 h-9 object-contain" />
            ) : hasPokemon ? (
              <span className="text-[10px] text-gray-600 font-bold">{enc.pokemonName?.substring(0, 3)}</span>
            ) : (
              <Pokeball className="w-6 h-6 opacity-40" />
            )}
          </div>

          {/* Name + sublabel */}
          <div className="flex-1 min-w-0">
            {hasPokemon ? (
              <>
                <div className={cn("text-sm font-bold truncate", isMissed ? "text-gray-500 line-through" : "text-white")}>
                  {enc.nickname || enc.pokemonName}
                </div>
                <div className="text-[10px] text-gray-600 truncate">{locName}</div>
              </>
            ) : (
              <div className="text-sm font-semibold text-gray-500 truncate">{locName}</div>
            )}
          </div>

          {/* Status badge */}
          {hasPokemon && enc.status !== 'None' && (
            <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold border border-white/5 flex-shrink-0", statusStyle.bg, statusStyle.text)}>
              {enc.status}
            </div>
          )}
        </div>
      );
    }

    // ── Edit / Expanded Mode ──
    return (
      <div key={locName} className="bg-[#212121] rounded-xl border border-white/5 p-4 space-y-3 mb-3 last:mb-0 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-200 text-sm tracking-wide">{locName}</div>
          <button
            onClick={() => toggleEditing(locName)}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-medium cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Pokemon sprite preview */}
        {enc.pokemonName && selectedSprite && (
          <div className="flex items-center justify-center p-2 bg-black/20 rounded-lg border border-white/5">
            <img src={selectedSprite} alt={enc.pokemonName} className="w-16 h-16 object-contain drop-shadow-lg" />
          </div>
        )}

        {/* Pokemon Select */}
        <div className="w-full">
          <PokemonSelect
            value={enc.pokemonName || ''}
            onChange={(value) => updateEncounter(locName, { pokemonName: value, status: enc.status === 'None' ? 'None' : enc.status })}
            options={availablePokemon}
          />
        </div>

        {/* Nickname input */}
        <input
          type="text"
          placeholder="Nickname (optional)"
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2.5 px-3 text-xs focus:border-white/20 focus:outline-none transition-colors"
          value={enc.nickname || ''}
          onChange={(e) => updateEncounter(locName, { nickname: e.target.value })}
        />

        {/* Status Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {STATUS_ACTIONS.map(({ key, icon: Icon, color, bg, activeBg, label }) => (
            <button
              key={key}
              onClick={() => handleStatusAction(locName, key)}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer active:scale-95",
                enc.status === key ? `${activeBg} border-white/10` : `${bg} hover:border-white/10`
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", color)} />
              <span className={cn("text-[10px] font-bold", color)}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderBoxGridItem = (locName: string) => {
    const enc = state.encounters[locName];
    if (!enc || !enc.pokemonName) return null;

    const data = pokemonDataCache[enc.pokemonName.toLowerCase()];
    const topStats = data?.stats
      ? [...data.stats].sort((a, b) => b.value - a.value).slice(0, 3)
      : [];

    const statusStyle = STATUS_COLOR_MAP[enc.status] || STATUS_COLOR_MAP.None;

    return (
      <div
        key={locName}
        className="bg-[#212121] rounded-2xl border border-white/5 p-3 flex flex-col items-center shadow-lg relative overflow-hidden group cursor-pointer active:scale-95 transition-transform"
        onClick={() => openPokemonDetail(locName)}
      >
        {/* Background Decorative Type Glow (Simplified to status color) */}
        <div className={cn("absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-20", statusStyle.bg)} />

        {/* Type Badges Overlay (Top, horizontal) */}
        {data?.types && data.types.length > 0 && (
          <div className="absolute top-2 left-2 z-20 flex flex-row gap-0.5">
            {data.types.map(type => (
              <TypeIcon key={type} type={type} size="sm" label={false} />
            ))}
          </div>
        )}

        {/* Sprite */}
        <div className="w-18 h-18 mb-1 relative z-10 flex items-center justify-center">
          {data?.sprite ? (
            <img src={data.sprite} alt={enc.pokemonName} className="w-16 h-16 object-contain drop-shadow-xl group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-black/20 animate-pulse" />
          )}
        </div>

        {/* Name */}
        <div className="text-center w-full mb-0.5 px-1">
          <div className="text-[10px] font-black text-white truncate">
            {enc.nickname ? <>{enc.nickname} <span className="text-gray-500 font-medium">- {cap(enc.pokemonName)}</span></> : cap(enc.pokemonName)}
          </div>
        </div>

        {/* Location */}
        <div className="w-full text-center mb-1.5">
          <span className="text-[7px] text-gray-600 font-medium truncate block">{locName}</span>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-1 mb-2">
          {topStats.length > 0 ? (
            topStats.map(stat => (
              <div key={stat.name} className="bg-black/40 rounded-md py-1 px-0.5 flex flex-col items-center border border-white/5">
                <span className="text-[6px] font-black text-gray-500 leading-none mb-0.5">{stat.name}</span>
                <span className="text-[9px] font-black text-white leading-none">{stat.value}</span>
              </div>
            ))
          ) : (
            <div className="col-span-3 h-5" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); handleEvolve(locName); }}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 transition-all cursor-pointer active:scale-95"
            title="Evolve"
          >
            <Sparkles className="h-3 w-3" />
            <span className="text-[8px] font-bold">Evolve</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); markFainted(locName); }}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all cursor-pointer active:scale-95"
            title="Send to Graveyard"
          >
            <Skull className="h-3 w-3" />
            <span className="text-[8px] font-bold">Dead</span>
          </button>
        </div>
      </div>
    );
  };

  if (!cacheReady) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-t-2 border-red-500 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-500 text-xs font-black italic">P</span>
            </div>
          </div>
          <p className="text-sm font-bold text-white">Loading Pokédex...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex justify-center">
      {/* Mobile Container wrapper */}
      <div className="w-full max-w-[400px] min-h-screen bg-[#141414] text-gray-200 relative pb-24 shadow-2xl border-x border-white/5 overflow-x-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">

        {/* Compact Top Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#1a1a1a]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center text-xs font-black uppercase italic shadow-[0_0_15px_rgba(239,68,68,0.2)]">P</div>
            <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Pokemon Lazarus...</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Sun className="h-4 w-4 text-gray-400" /></button>
          </div>
        </header>

        {/* Content Area */}
        <main className="px-4 py-6">
          {activeMainTab === 'Game' && (
            <div className="space-y-6">

              {/* Top Navigation underneath header */}
              <div className="flex items-center justify-between mb-8">
                <div className="overflow-x-auto styled-scrollbar w-full pb-2">
                  <nav className="flex gap-4 min-w-max">
                    {['Nuzlocke', 'Routes', 'Bosses', 'Upcoming'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setActiveSubTab(tab as any); setSearchTerm(''); }}
                        className={cn(
                          "text-sm font-bold transition-all relative pb-1 whitespace-nowrap",
                          activeSubTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        {tab}
                        {activeSubTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={
                    activeSubTab === 'Bosses' ? 'Search bosses...' :
                    activeSubTab === 'Routes' ? 'Search routes or Pokémon...' :
                    activeSubTab === 'Upcoming' ? 'Search upcoming locations...' :
                    'Search location...'
                  }
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/10 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Nuzlocke Tab */}
              {activeSubTab === 'Nuzlocke' && (
                <div className="space-y-4">
                  {locationsData.locations
                    .filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(loc => renderEncounterRow(loc.name))}
                </div>
              )}

              {/* Routes Tab */}
              {activeSubTab === 'Routes' && (
                <div className="space-y-3">
                  {locationsData.locations
                    .filter(loc => {
                      const q = searchTerm.toLowerCase();
                      if (!q) return true;
                      if (loc.name.toLowerCase().includes(q)) return true;
                      return Object.values(loc.encounters).flat().some(p => p.name.toLowerCase().includes(q));
                    })
                    .map(loc => {
                      const allPokemon = Object.entries(loc.encounters);
                      return (
                        <div key={loc.name} className="bg-[#212121] rounded-xl border border-white/5 p-3 shadow-sm">
                          <div className="text-xs font-bold text-white mb-2">{loc.name}</div>
                          <div className="space-y-1.5">
                            {allPokemon.map(([method, pokemon]) => (
                              <div key={method} className="flex items-start gap-2">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide min-w-[60px] pt-0.5">{method.replace('Fishing ', '').replace('(', '').replace(')', '')}</span>
                                <div className="flex flex-wrap gap-1">
                                  {pokemon.map((p: { name: string; id: number }) => {
                                    const sprite = spriteCache[p.name.toLowerCase()];
                                    return (
                                      <div key={p.name} className="flex items-center gap-1 bg-black/30 rounded-md px-1.5 py-0.5">
                                        {sprite && <img src={sprite} alt={p.name} className="w-4 h-4 object-contain" />}
                                        <span className="text-[9px] text-gray-300">{p.name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Bosses Tab */}
              {activeSubTab === 'Bosses' && (
                <div className="space-y-3">
                  {bossesData.bosses
                    .filter(boss => {
                      const q = searchTerm.toLowerCase();
                      if (!q) return true;
                      return boss.name.toLowerCase().includes(q) ||
                        boss.location.toLowerCase().includes(q) ||
                        boss.trainerType.toLowerCase().includes(q) ||
                        boss.pokemon.some(p => p.name.toLowerCase().includes(q));
                    })
                    .map((boss, bi) => {
                      const acePokemon = boss.pokemon.find(p => p.isAce);
                      const trainerTypeColor =
                        boss.trainerType === 'Gym Leader' ? 'text-yellow-400 bg-yellow-400/10' :
                        boss.trainerType === 'Elite 4' ? 'text-purple-400 bg-purple-400/10' :
                        boss.trainerType === 'Champion' ? 'text-red-400 bg-red-400/10' :
                        boss.trainerType === 'Team Chimera' ? 'text-pink-400 bg-pink-400/10' :
                        'text-blue-400 bg-blue-400/10';
                      return (
                        <div key={`${boss.name}-${bi}`} className="flex flex-col bg-[#212121] rounded-xl border border-white/5 shadow-sm overflow-hidden">
                          {/* Header */}
                          <div className="p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-white">{boss.name}</h3>
                                  <span className={cn("text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", trainerTypeColor)}>{boss.trainerType}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-0.5">{boss.location}</p>
                              </div>
                              <div className="flex-shrink-0 px-2 py-1 bg-black/30 rounded text-xs font-bold text-gray-400 border border-white/5">
                                Lv {boss.levelCap}
                              </div>
                            </div>
                            {boss.items && (
                              <p className="text-[9px] text-gray-600 mt-1 leading-snug">{boss.items}</p>
                            )}
                          </div>
                          {/* Pokemon team */}
                          <div className="px-3 pb-3 flex flex-wrap gap-2">
                            {boss.pokemon.map((p, i) => (
                              <div key={i}
                                onClick={() => openBossDetail(p)}
                                className={cn(
                                  "flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 min-w-[48px] cursor-pointer active:scale-95 transition-transform",
                                  p.isAce ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-black/30 border border-white/5"
                                )}>
                                <div className="relative h-9 w-9 flex items-center justify-center">
                                  {bossSprites[p.name] ? (
                                    <img src={bossSprites[p.name]} alt={p.name} className="w-8 h-8 object-contain drop-shadow-md" />
                                  ) : (
                                    <span className="text-[9px] font-bold text-gray-600">{p.name.substring(0, 3)}</span>
                                  )}
                                </div>
                                <span className="text-[8px] text-gray-400 text-center leading-tight max-w-[48px] truncate">{p.name}</span>
                                <span className="text-[8px] text-gray-600">Lv {p.level}</span>
                                {p.isLead && (
                                  <span className="text-[7px] font-bold text-blue-400/80 uppercase tracking-wide">lead</span>
                                )}
                                {p.isAce && (
                                  <span className="text-[7px] font-bold text-yellow-400/90 uppercase tracking-wide">ace</span>
                                )}
                                {p.heldItem && (
                                  <span className="text-[7px] text-orange-400/80 text-center leading-tight max-w-[48px] truncate">{p.heldItem}</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Ace detail strip */}
                          {acePokemon && (
                            <div className="border-t border-white/5 px-3 py-2 bg-yellow-500/5">
                              <p className="text-[9px] text-yellow-500/70 font-medium">Ace: {acePokemon.name} — {acePokemon.ability} — {acePokemon.moves.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Upcoming Tab — locations not yet encountered */}
              {activeSubTab === 'Upcoming' && (
                <div className="space-y-4">
                  {locationsData.locations
                    .filter(loc => {
                      const enc = state.encounters[loc.name];
                      const notDone = !enc || enc.status === 'None';
                      if (!notDone) return false;
                      return loc.name.toLowerCase().includes(searchTerm.toLowerCase());
                    })
                    .map(loc => renderEncounterRow(loc.name))}
                  {locationsData.locations.filter(loc => {
                    const enc = state.encounters[loc.name];
                    return (!enc || enc.status === 'None') && loc.name.toLowerCase().includes(searchTerm.toLowerCase());
                  }).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#212121] rounded-2xl border border-dashed border-white/10 opacity-50">
                      <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500" />
                      <p className="text-sm font-medium text-gray-400">All caught up!</p>
                      <p className="text-[10px] text-gray-600 mt-1">No pending locations remaining.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeMainTab === 'Box' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pl-2 mb-6">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Boxed Pokemon</div>
                <div className="text-[10px] font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{state.box.length} Total</div>
              </div>
              {state.box.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {state.box.map(locName => renderBoxGridItem(locName))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#212121] rounded-2xl border border-dashed border-white/10 opacity-50">
                  <Package className="h-10 w-10 mb-3 text-gray-500" />
                  <p className="text-sm font-medium text-gray-400">Your box is empty</p>
                  <p className="text-[10px] text-gray-600 mt-1">Catch, Gift, or find Shiny Pokemon to fill it!</p>
                </div>
              )}
            </div>
          )}

          {activeMainTab === 'Grave' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 mb-4">Graveyard</div>
              {state.graveyard.length > 0 ? (
                state.graveyard.map(locName => {
                  const enc = state.encounters[locName];
                  if (!enc?.pokemonName) return null;
                  const sprite = spriteCache[enc.pokemonName.toLowerCase()];
                  return (
                    <GraveyardCard
                      key={locName}
                      locName={locName}
                      enc={enc}
                      sprite={sprite}
                    />
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#212121] rounded-2xl border border-dashed border-white/10 opacity-50">
                  <Skull className="h-10 w-10 mb-3 text-gray-500" />
                  <p className="text-sm font-medium text-gray-400">No fainted Pokemon yet</p>
                  <p className="text-[10px] text-gray-600 mt-1">Keep it that way! Good luck!</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Pokemon Detail Modal */}
        {(detailPokemon || detailLoading) && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setDetailPokemon(null)}
            />

            {/* Sheet */}
            <div className="relative w-full bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 shadow-2xl pb-10 max-h-[85vh] overflow-y-auto styled-scrollbar">
              <div className="w-full max-w-[400px] mx-auto relative">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Close */}
              <button
                onClick={() => setDetailPokemon(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>

              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                  <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
                </div>
              ) : detailPokemon && (
                <div className="px-5 pb-4">
                  {/* Sprite */}
                  <div className="flex justify-center mb-3">
                    {detailPokemon.sprite ? (
                      <img src={detailPokemon.sprite} alt={detailPokemon.name} className="w-32 h-32 object-contain drop-shadow-2xl" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center mb-3">
                    {detailPokemon.nickname && (
                      <div className="text-xl font-black text-white">{detailPokemon.nickname}</div>
                    )}
                    <div className={cn("font-bold text-gray-400", detailPokemon.nickname ? "text-sm" : "text-xl text-white")}>{cap(detailPokemon.name)}</div>
                  </div>

                  {/* Types */}
                  {detailPokemon.types.length > 0 && (
                    <div className="flex justify-center gap-2 mb-5">
                      {detailPokemon.types.map(type => (
                        <TypeIcon key={type} type={type} size="lg" />
                      ))}
                    </div>
                  )}

                  {/* Height / Weight */}
                  {(detailPokemon.height > 0 || detailPokemon.weight > 0) && (
                    <div className="flex justify-center gap-6 mb-5">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Ruler className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold text-white">{(detailPokemon.height / 10).toFixed(1)}m</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Weight className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold text-white">{(detailPokemon.weight / 10).toFixed(1)}kg</span>
                      </div>
                    </div>
                  )}

                  {/* Base Stats */}
                  <div className="mb-5">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Base Stats</div>
                    <div className="space-y-2">
                      {detailPokemon.stats.map(stat => (
                        <div key={stat.name} className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-gray-500 w-16 text-right flex-shrink-0">{stat.name}</span>
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", STAT_COLORS[stat.name] || 'bg-gray-500')}
                              style={{ width: `${Math.min((stat.value / 255) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-white w-6 flex-shrink-0">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Abilities */}
                  {detailPokemon.abilities.length > 0 && (
                    <div className="mb-5">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Abilities</div>
                      <div className="flex flex-wrap gap-2">
                        {detailPokemon.abilities.map(ability => (
                          <span key={ability} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-semibold text-gray-300 capitalize">
                            {ability}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Held Item */}
                  {detailPokemon.heldItem && (
                    <div className="mb-5">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Held Item</div>
                      <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] font-semibold text-orange-300">
                        {detailPokemon.heldItem}
                      </span>
                    </div>
                  )}

                  {/* Moves */}
                  {detailPokemon.moves && detailPokemon.moves.length > 0 && (
                    <div className="mb-5">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Moves</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {detailPokemon.moves.map(move => {
                          const moveType = (moveTypes as Record<string, string>)[move] || 'normal';
                          const bg = TYPE_BG[moveType] || '#9099A1';
                          return (
                            <div key={move} className="flex items-center gap-2 rounded-lg px-2.5 py-2 overflow-hidden" style={{ backgroundColor: `${bg}22`, border: `1px solid ${bg}44` }}>
                              <TypeIcon type={moveType} size="sm" label={false} />
                              <span className="text-[10px] font-semibold text-white leading-tight">{move}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Type Matchups */}
                  {detailPokemon.types.length > 0 && (() => {
                    const { superWeak, weak, resist, superResist, immune } = getTypeMatchups(detailPokemon.types);
                    const rows = [
                      { label: 'Super Weak', items: superWeak, badge: '4×', labelColor: 'text-red-400' },
                      { label: 'Weak', items: weak, badge: '2×', labelColor: 'text-orange-400' },
                      { label: 'Resist', items: resist, badge: '½×', labelColor: 'text-blue-400' },
                      { label: 'Super Resist', items: superResist, badge: '¼×', labelColor: 'text-cyan-400' },
                      { label: 'Immune', items: immune, badge: '0×', labelColor: 'text-gray-400' },
                    ].filter(r => r.items.length > 0);

                    if (rows.length === 0) return null;
                    return (
                      <div>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Type Matchups</div>
                        <div className="space-y-2">
                          {rows.map(({ label, items, badge, labelColor }) => (
                            <div key={label} className="flex items-start gap-2">
                              <div className="flex items-center gap-1 min-w-[72px] pt-0.5">
                                <span className={cn("text-[8px] font-black", labelColor)}>{badge}</span>
                                <span className="text-[8px] text-gray-600 font-bold">{label}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {items.map(({ type }) => (
                                  <TypeIcon key={type} type={type} size="sm" />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>{/* end max-w inner */}
            </div>
          </div>
        )}

        {/* Fixed Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/5 flex justify-around p-2 z-[100] rounded-t-2xl pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setActiveMainTab('Game')}
            className={cn("flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-all cursor-pointer", activeMainTab === 'Game' ? "text-white bg-white/5" : "text-gray-500 hover:text-gray-300")}
          >
            <Gamepad2 className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Game</span>
          </button>
          <button
            onClick={() => setActiveMainTab('Box')}
            className={cn("flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-all cursor-pointer", activeMainTab === 'Box' ? "text-white bg-white/5" : "text-gray-500 hover:text-gray-300")}
          >
            <Package className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Box</span>
          </button>
          <button
            onClick={() => setActiveMainTab('Grave')}
            className={cn("flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-all cursor-pointer", activeMainTab === 'Grave' ? "text-white bg-white/5" : "text-gray-500 hover:text-gray-300")}
          >
            <Skull className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Grave</span>
          </button>
        </div>

      </div>
    </div>
  );
}

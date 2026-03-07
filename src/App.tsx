import { useState, useEffect, useCallback, useRef } from 'react';
import { useRunStore } from './hooks/useRunStore';
import { useGameData } from './hooks/useGameData';
import { Skull, Package, Gamepad2, Search, CheckCircle2, X, RotateCcw, FileDown, FileUp, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

import { PokemonSelect, spriteCache, pokemonDataCache, fetchPokemonData, evolutionLineCache, fetchEvolutionLine, formatSpecialNames } from './components/PokemonSelect';
import { initPokemonCache } from './lib/initPokemonCache';
import { TypeIcon } from './components/TypeIcon';
import { Pokeball } from './components/Pokeball';
import { GraveyardCard } from './components/GraveyardCard';
import { EncounterRow } from './components/EncounterRow';
import { BoxGridItem } from './components/BoxGridItem';
import { DetailModal } from './components/DetailModal';
import { TeamBuilder } from './components/TeamBuilder';
import { STAT_NAME_MAP, cap, TYPE_BG } from './constants/gameConstants';
import { DetailData, Encounter } from './types';
import pokemonCacheJson from './data/pokemon-cache.json';

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { state, updateEncounter, markFainted, resetRun, moveToParty, moveToBox } = useRunStore();
  const { gameData, isCustom, importGameData, exportGameData, resetGameData, addLocation, addPokemonToLocation, setAllPokemonForLocation, removeLocation } = useGameData();

  const [activeMainTab, setActiveMainTab] = useState<'Game' | 'Team' | 'Box' | 'Grave'>('Game');
  const [activeSubTab, setActiveSubTab] = useState<'Nuzlocke' | 'Routes' | 'Bosses' | 'Upcoming'>('Nuzlocke');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLocations, setEditingLocations] = useState<Set<string>>(new Set());
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const [detailPokemon, setDetailPokemon] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const [bossSprites, setBossSprites] = useState<Record<string, string>>({});
  const [, forceUpdate] = useState(0);
  const [evolvingLocation, setEvolvingLocation] = useState<string | null>(null);

  // ── Routes tab state ───────────────────────────────────────────────────────
  const [insertAfterRoute, setInsertAfterRoute] = useState<string | null>(null);
  const [newRouteName, setNewRouteName] = useState('');
  const [addingPokemonToRoute, setAddingPokemonToRoute] = useState<string | null>(null);
  const [confirmRemoveRoute, setConfirmRemoveRoute] = useState<string | null>(null);

  // All Pokémon available as route picker options:
  // 1. Every Pokémon from every route (preserves proper names + ids)
  // 2. Every Pokémon from pokemon-cache (fills in evolutions, starters, gifts)
  const allPokemon = (() => {
    const map = new Map<string, { name: string; id: number }>();
    gameData.locations.forEach(loc => {
      (Object.values(loc.encounters).flat() as { name: string; id: number }[]).forEach(p => {
        if (p?.name) map.set(p.name.toLowerCase(), p);
      });
    });
    Object.keys(pokemonCacheJson).forEach((key, i) => {
      if (!map.has(key)) map.set(key, { name: cap(key), id: 9000 + i });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    initPokemonCache().then(async () => {
      setCacheReady(true);

      // Collect all unique boss pokemon names
      const allBossPokemon = Array.from(
        new Set(gameData.bosses.flatMap(boss => boss.pokemon.map(p => p.name)))
      );

      // Populate from cache first for instant display
      const sprites: Record<string, string> = {};
      allBossPokemon.forEach(name => {
        const cached = pokemonDataCache[name.toLowerCase()];
        if (cached?.sprite) sprites[name] = cached.sprite;
      });
      setBossSprites({ ...sprites });

      // Fetch missing ones from PokeAPI
      const missing = allBossPokemon.filter(name => !sprites[name]);
      await Promise.all(
        missing.map(async name => {
          const data = await fetchPokemonData(name);
          if (data?.sprite) {
            setBossSprites(prev => ({ ...prev, [name]: data.sprite }));
          }
        })
      );
    });
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    const missing = [...state.party, ...state.box, ...state.graveyard]
      .map(loc => state.encounters[loc]?.pokemonName)
      .filter((name): name is string => !!name && !pokemonDataCache[name.toLowerCase()]);

    if (missing.length === 0) return;
    Promise.all([...new Set(missing)].map(name => fetchPokemonData(name))).then(() => {
      forceUpdate(n => n + 1);
    });
  }, [cacheReady, state.party, state.box, state.graveyard]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 10) { setNavVisible(true); }
      else if (y > lastScrollY.current + 8) { setNavVisible(false); }
      else if (y < lastScrollY.current - 8) { setNavVisible(true); }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Encounter actions ─────────────────────────────────────────────────────

  const toggleEditing = (locName: string) => {
    setEditingLocations(prev => {
      const next = new Set(prev);
      next.has(locName) ? next.delete(locName) : next.add(locName);
      return next;
    });
  };

  const handleStatusAction = (locName: string, status: string) => {
    updateEncounter(locName, { status: status as any });
    setEditingLocations(prev => {
      const next = new Set(prev);
      next.delete(locName);
      return next;
    });
  };

  // ── Evolution ─────────────────────────────────────────────────────────────

  const handleEvolve = async (locName: string) => {
    const enc = state.encounters[locName];
    if (!enc?.pokemonName) return;

    let line = evolutionLineCache[enc.pokemonName.toLowerCase()];
    if (!line) line = await fetchEvolutionLine(enc.pokemonName);
    if (line.length <= 1) return;

    const normalizedCurrent = enc.pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const formattedCurrent = formatSpecialNames(normalizedCurrent);
    const currentIndex =
      line.indexOf(formattedCurrent) !== -1   ? line.indexOf(formattedCurrent) :
      line.indexOf(normalizedCurrent) !== -1   ? line.indexOf(normalizedCurrent) :
      line.indexOf(enc.pokemonName.toLowerCase());
    const nextPokemon = line[(currentIndex + 1) % line.length];
    await fetchPokemonData(nextPokemon);
    updateEncounter(locName, { pokemonName: nextPokemon });
  };

  const handleEvolveWithEffect = async (locName: string) => {
    const enc = state.encounters[locName];
    if (!enc?.pokemonName || evolvingLocation) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtx();

    let nextPokemonName: string | null = null;
    try {
      let line = evolutionLineCache[enc.pokemonName.toLowerCase()];
      if (!line) line = await fetchEvolutionLine(enc.pokemonName);
      if (line.length > 1) {
        const normalizedCurrent = enc.pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const formattedCurrent = formatSpecialNames(normalizedCurrent);
        const idx =
          line.indexOf(formattedCurrent) !== -1   ? line.indexOf(formattedCurrent) :
          line.indexOf(normalizedCurrent) !== -1   ? line.indexOf(normalizedCurrent) :
          line.indexOf(enc.pokemonName.toLowerCase());
        nextPokemonName = line[(idx + 1) % line.length];
      }
    } catch { /* no evolution */ }

    setEvolvingLocation(locName);
    setTimeout(() => handleEvolve(locName), 1000);

    let evolvedAudioBuffer: AudioBuffer | null = null;
    if (nextPokemonName) {
      try {
        const { formatSpecialNames } = await import('./components/PokemonSelect');
        const formattedName = formatSpecialNames(
          nextPokemonName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
        );
        const apiRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          const cryUrl = data.cries?.latest || data.cries?.legacy;
          if (cryUrl) {
            const cryRes = await fetch(cryUrl);
            evolvedAudioBuffer = await audioCtx.decodeAudioData(await cryRes.arrayBuffer());
          }
        }
      } catch { /* cry optional */ }
    }

    setTimeout(() => {
      setEvolvingLocation(null);
      if (evolvedAudioBuffer) {
        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.6;
        source.buffer = evolvedAudioBuffer;
        source.connect(gain);
        gain.connect(audioCtx.destination);
        source.start();
      }
    }, 2200);
  };

  // ── Detail modal ──────────────────────────────────────────────────────────

  const openPokemonDetail = useCallback(async (locName: string) => {
    const enc = state.encounters[locName];
    if (!enc?.pokemonName) return;

    setDetailLoading(true);
    setDetailPokemon(null);

    try {
      const { formatSpecialNames } = await import('./components/PokemonSelect');
      const formattedName = formatSpecialNames(enc.pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      setDetailPokemon({
        sprite: data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '',
        name: enc.pokemonName,
        nickname: enc.nickname,
        types: data.types.map((t: any) => t.type.name),
        stats: data.stats.map((s: any) => ({ name: STAT_NAME_MAP[s.stat.name] || s.stat.name.toUpperCase(), value: s.base_stat })),
        abilities: data.abilities.map((a: any) => a.ability.name.replace(/-/g, ' ')),
        height: data.height,
        weight: data.weight,
        moves: enc.moves,
      });
    } catch {
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

  const openBossDetail = useCallback(async (p: {
    name: string; level: number; heldItem: string | null;
    ability: string | null; moves: string[]; isAce: boolean; isLead: boolean;
  }) => {
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
      setDetailPokemon({ sprite: '', name: p.name, types: [], stats: [], abilities: p.ability ? [p.ability] : [], height: 0, weight: 0, moves: p.moves, heldItem: p.heldItem });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Import / Export ───────────────────────────────────────────────────────

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importGameData(ev.target?.result as string);
        setImportError(null);
        setImportSuccess(true);
        setTimeout(() => { setImportSuccess(false); setShowDataManager(false); }, 1500);
      } catch (err: any) {
        setImportError(err.message || 'Failed to import');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Loading screen ────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-[400px] min-h-screen bg-[#141414] text-gray-200 relative pb-24 shadow-2xl border-x border-white/5 overflow-x-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#1a1a1a]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Pokeball className="h-7 w-7 opacity-70" />
            <div className="flex items-center gap-1">
              {state.party.length === 0 ? (
                <span className="text-xs text-gray-600 font-medium italic">No party yet</span>
              ) : (
                state.party.map(locName => {
                  const enc = state.encounters[locName];
                  const sprite = enc?.pokemonName ? spriteCache[enc.pokemonName.toLowerCase()] : null;
                  return sprite ? (
                    <div key={locName} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      <img src={sprite} alt={enc.pokemonName} className="w-7 h-7 object-contain drop-shadow" />
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowDataManager(true); setImportError(null); setImportSuccess(false); }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
              title="Import / Export game data"
            >
              <FileDown className="h-4 w-4 text-gray-400" />
              {isCustom && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 hover:bg-red-500/10 rounded-full transition-colors"
              title="Reset run"
            >
              <RotateCcw className="h-4 w-4 text-gray-500 hover:text-red-400 transition-colors" />
            </button>
          </div>
        </header>

        {/* ── Reset confirmation ───────────────────────────────────────────── */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
            <div className="relative bg-[#1e1e1e] rounded-2xl border border-white/10 p-6 w-full max-w-[320px] shadow-2xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto mb-4">
                <RotateCcw className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-base font-black text-white text-center mb-2">Reset Run?</h2>
              <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
                This will permanently delete all your encounter data, boxed Pokémon, graveyard, and reset all route changes back to default. This cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { resetRun(); resetGameData(); setShowResetConfirm(false); }}
                  className="py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Data manager modal ───────────────────────────────────────────── */}
        {showDataManager && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDataManager(false)} />
            <div className="relative bg-[#1e1e1e] rounded-2xl border border-white/10 p-6 w-full max-w-[320px] shadow-2xl">
              <button
                onClick={() => setShowDataManager(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
              <div className="text-sm font-black text-white mb-1">Game Data</div>
              <div className="text-[10px] text-gray-500 mb-5 leading-relaxed">
                Download the default Lazarus data, tweak it (locations, bosses), then re-upload to customise your tracker.
                {isCustom && <span className="block mt-1 text-cyan-400">Custom data loaded.</span>}
              </div>

              <button
                onClick={exportGameData}
                className="w-full flex items-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors mb-3 cursor-pointer"
              >
                <FileDown className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-white">Download game data</div>
                  <div className="text-[9px] text-gray-500">Save current data as JSON</div>
                </div>
              </button>

              <label className="w-full flex items-center gap-3 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors mb-3 cursor-pointer">
                <FileUp className="h-4 w-4 text-green-400 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-white">Upload game data</div>
                  <div className="text-[9px] text-gray-500">Load a custom JSON file</div>
                </div>
                <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
              </label>

              {importSuccess && <div className="text-[10px] text-green-400 font-bold text-center mb-3">Imported successfully!</div>}
              {importError  && <div className="text-[10px] text-red-400 text-center mb-3 leading-snug">{importError}</div>}

              {isCustom && (
                <button
                  onClick={() => { resetGameData(); setShowDataManager(false); }}
                  className="w-full py-2 text-[10px] font-bold text-gray-500 hover:text-red-400 transition-colors"
                >
                  Reset to default Lazarus data
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="px-4 py-6">

          {/* ── Game tab ────────────────────────────────────────────────────── */}
          {activeMainTab === 'Game' && (
            <div className="space-y-6">
              {/* Sub-tab nav */}
              <div className="overflow-x-auto styled-scrollbar w-full pb-2">
                <nav className="flex gap-4 min-w-max">
                  {(['Nuzlocke', 'Routes', 'Bosses', 'Upcoming'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveSubTab(tab); setSearchTerm(''); }}
                      className={cn(
                        'text-sm font-bold transition-all relative pb-1 whitespace-nowrap',
                        activeSubTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                      )}
                    >
                      {tab}
                      {activeSubTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={
                    activeSubTab === 'Bosses'   ? 'Search bosses...' :
                    activeSubTab === 'Routes'   ? 'Search routes or Pokémon...' :
                    activeSubTab === 'Upcoming' ? 'Search upcoming locations...' :
                    'Search location...'
                  }
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/10 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* ── Nuzlocke sub-tab ─────────────────────────────────────── */}
              {activeSubTab === 'Nuzlocke' && (
                <div className="space-y-4">
                  {gameData.locations
                    .filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(loc => {
                      const enc = state.encounters[loc.name] || { locationName: loc.name, status: 'None' };
                      const availablePokemon = Array.from(
                        (Object.values(loc.encounters).flat() as { name: string; id: number }[]).reduce((map, p) => {
                          if (p?.name) map.set(p.name, p);
                          return map;
                        }, new Map<string, { name: string; id: number }>()).values()
                      );
                      return (
                        <EncounterRow
                          key={loc.name}
                          locName={loc.name}
                          enc={enc}
                          availablePokemon={availablePokemon}
                          sprite={enc.pokemonName ? spriteCache[enc.pokemonName.toLowerCase()] : undefined}
                          isEditing={editingLocations.has(loc.name)}
                          onToggleEditing={() => toggleEditing(loc.name)}
                          onStatusAction={(status) => handleStatusAction(loc.name, status)}
                          onUpdateEncounter={(partial) => updateEncounter(loc.name, partial as Partial<Encounter>)}
                        />
                      );
                    })}
                </div>
              )}

              {/* ── Routes sub-tab ───────────────────────────────────────── */}
              {activeSubTab === 'Routes' && (
                <div className="space-y-1.5">
                  {gameData.locations
                    .filter(loc => {
                      const q = searchTerm.toLowerCase();
                      if (!q) return true;
                      if (loc.name.toLowerCase().includes(q)) return true;
                      return Object.values(loc.encounters).flat().some((p: any) => p.name?.toLowerCase().includes(q));
                    })
                    .map(loc => (
                      <div key={loc.name}>
                        {/* Route card */}
                        <div className="bg-[#212121] rounded-xl border border-white/5 p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-white">{loc.name}</div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setAddingPokemonToRoute(r => r === loc.name ? null : loc.name);
                                }}
                                className="text-[8px] font-black text-cyan-500 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded transition-colors"
                              >
                                + Pokémon
                              </button>
                              <button
                                onClick={() => setConfirmRemoveRoute(loc.name)}
                                className="text-[8px] font-black text-red-500 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Existing Pokémon by method */}
                          <div className="space-y-1.5">
                            {Object.entries(loc.encounters).map(([method, pokemon]) => {
                              const pList = pokemon as { name: string; id: number }[];
                              const isAll = pList.length >= allPokemon.length && allPokemon.length > 0;
                              return (
                                <div key={method} className="flex items-start gap-2">
                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide min-w-[60px] pt-0.5">
                                    {method.replace('Fishing ', '').replace('(', '').replace(')', '')}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {isAll ? (
                                      <div className="flex items-center gap-1.5 bg-indigo-900/40 border border-indigo-500/30 rounded-md px-2 py-0.5">
                                        <Pokeball className="w-3.5 h-3.5 opacity-80" />
                                        <span className="text-[9px] text-indigo-300 font-medium">All Pokémon available</span>
                                      </div>
                                    ) : (
                                      pList.map(p => {
                                        const types = pokemonDataCache[p.name.toLowerCase()]?.types ?? [];
                                        return (
                                          <div key={p.name} title={p.name} className="flex items-center bg-black/30 rounded overflow-hidden border" style={{ borderColor: `${TYPE_BG[types[0]] || '#9099A1'}80`, boxShadow: `0 0 6px ${TYPE_BG[types[0]] || '#9099A1'}60` }}>
                                            {types.map((t, i) => (
                                              <span key={t} className={`inline-flex items-center justify-center w-3 h-3 flex-shrink-0${i === 0 ? ' rounded-l-sm' : ''}`} style={{ backgroundColor: TYPE_BG[t] || '#9099A1' }} title={t}>
                                                <img src={`${import.meta.env.BASE_URL}type-icons/${t}.svg`} alt={t} className="w-2 h-2 object-contain" />
                                              </span>
                                            ))}
                                            <span className="px-1 text-[8px] text-gray-400 leading-none">{p.name}</span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Pokémon picker (free-form, all Pokémon) */}
                          {addingPokemonToRoute === loc.name && (
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                              <button
                                onClick={() => {
                                  setAllPokemonForLocation(loc.name, allPokemon);
                                  setAddingPokemonToRoute(null);
                                }}
                                className="w-full text-xs py-1.5 rounded bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 font-medium transition-colors"
                              >
                                Add All ({allPokemon.length})
                              </button>
                              <PokemonSelect
                                value=""
                                options={allPokemon}
                                onChange={name => {
                                  const p = allPokemon.find(p => p.name === name);
                                  if (p) { addPokemonToLocation(loc.name, p); }
                                  setAddingPokemonToRoute(null);
                                }}
                              />
                            </div>
                          )}

                          {/* Add route below button */}
                          <button
                            onClick={() => {
                              setInsertAfterRoute(loc.name);
                              setNewRouteName('');
                              setAddingPokemonToRoute(null);
                            }}
                            className="w-full mt-2.5 py-1 text-[8px] font-black text-gray-600 hover:text-gray-400 border border-dashed border-white/5 hover:border-white/10 rounded-lg transition-colors"
                          >
                            + Add route below
                          </button>
                        </div>

                        {/* Inline new route form */}
                        {insertAfterRoute === loc.name && (
                          <div className="mt-1.5 bg-[#1a1a1a] border border-cyan-500/30 rounded-xl p-3 space-y-2">
                            <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">New Route</div>
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Route / location name…"
                                value={newRouteName}
                                onChange={e => setNewRouteName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && newRouteName.trim()) {
                                    addLocation(newRouteName.trim(), insertAfterRoute);
                                    setInsertAfterRoute(null);
                                    setNewRouteName('');
                                  }
                                  if (e.key === 'Escape') { setInsertAfterRoute(null); setNewRouteName(''); }
                                }}
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                              />
                              <button
                                disabled={!newRouteName.trim()}
                                onClick={() => {
                                  if (newRouteName.trim()) {
                                    addLocation(newRouteName.trim(), insertAfterRoute);
                                    setInsertAfterRoute(null);
                                    setNewRouteName('');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => { setInsertAfterRoute(null); setNewRouteName(''); }}
                                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 text-xs transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* ── Bosses sub-tab ───────────────────────────────────────── */}
              {activeSubTab === 'Bosses' && (
                <div className="space-y-3">
                  {gameData.bosses
                    .filter(boss => {
                      const q = searchTerm.toLowerCase();
                      if (!q) return true;
                      return (
                        boss.name.toLowerCase().includes(q) ||
                        boss.location.toLowerCase().includes(q) ||
                        boss.trainerType.toLowerCase().includes(q) ||
                        boss.pokemon.some(p => p.name.toLowerCase().includes(q))
                      );
                    })
                    .map((boss, bi) => {
                      const acePokemon = boss.pokemon.find(p => p.isAce);
                      const trainerTypeColor =
                        boss.trainerType === 'Gym Leader'   ? 'text-yellow-400 bg-yellow-400/10' :
                        boss.trainerType === 'Elite 4'      ? 'text-purple-400 bg-purple-400/10' :
                        boss.trainerType === 'Champion'     ? 'text-red-400 bg-red-400/10'       :
                        boss.trainerType === 'Team Chimera' ? 'text-pink-400 bg-pink-400/10'     :
                        'text-blue-400 bg-blue-400/10';
                      return (
                        <div key={`${boss.name}-${bi}`} className="flex flex-col bg-[#212121] rounded-xl border border-white/5 shadow-sm overflow-hidden">
                          <div className="p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-white">{boss.name}</h3>
                                  <span className={cn('text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded', trainerTypeColor)}>
                                    {boss.trainerType}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-0.5">{boss.location}</p>
                              </div>
                              <div className="flex-shrink-0 px-2 py-1 bg-black/30 rounded text-xs font-bold text-gray-400 border border-white/5">
                                Lv {boss.levelCap}
                              </div>
                            </div>
                            {boss.items && <p className="text-[9px] text-gray-600 mt-1 leading-snug">{boss.items}</p>}
                          </div>

                          <div className="px-3 pb-3 flex flex-wrap gap-2">
                            {boss.pokemon.map((p, i) => (
                              <div
                                key={i}
                                onClick={() => openBossDetail(p)}
                                className={cn(
                                  'flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 min-w-[48px] cursor-pointer active:scale-95 transition-transform',
                                  p.isAce ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-black/30 border border-white/5'
                                )}
                              >
                                <div className="relative h-9 w-9 flex items-center justify-center">
                                  {bossSprites[p.name] ? (
                                    <img src={bossSprites[p.name]} alt={p.name} className="w-8 h-8 object-contain drop-shadow-md" />
                                  ) : (
                                    <span className="text-[9px] font-bold text-gray-600">{p.name.substring(0, 3)}</span>
                                  )}
                                </div>
                                <span className="text-[8px] text-gray-400 text-center leading-tight max-w-[48px] truncate">{p.name}</span>
                                <span className="text-[8px] text-gray-600">Lv {p.level}</span>
                                {p.isLead && <span className="text-[7px] font-bold text-blue-400/80 uppercase tracking-wide">lead</span>}
                                {p.isAce  && <span className="text-[7px] font-bold text-yellow-400/90 uppercase tracking-wide">ace</span>}
                                {p.heldItem && <span className="text-[7px] text-orange-400/80 text-center leading-tight max-w-[48px] truncate">{p.heldItem}</span>}
                              </div>
                            ))}
                          </div>

                          {acePokemon && (
                            <div className="border-t border-white/5 px-3 py-2 bg-yellow-500/5">
                              <p className="text-[9px] text-yellow-500/70 font-medium">
                                Ace: {acePokemon.name} — {acePokemon.ability} — {acePokemon.moves.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ── Upcoming sub-tab ─────────────────────────────────────── */}
              {activeSubTab === 'Upcoming' && (() => {
                const pending = gameData.locations.filter(loc => {
                  const enc = state.encounters[loc.name];
                  return (!enc || enc.status === 'None') && loc.name.toLowerCase().includes(searchTerm.toLowerCase());
                });
                return (
                  <div className="space-y-4">
                    {pending.map(loc => {
                      const enc = state.encounters[loc.name] || { locationName: loc.name, status: 'None' };
                      const availablePokemon = Array.from(
                        (Object.values(loc.encounters).flat() as { name: string; id: number }[]).reduce((map, p) => {
                          if (p?.name) map.set(p.name, p);
                          return map;
                        }, new Map<string, { name: string; id: number }>()).values()
                      );
                      return (
                        <EncounterRow
                          key={loc.name}
                          locName={loc.name}
                          enc={enc}
                          availablePokemon={availablePokemon}
                          sprite={enc.pokemonName ? spriteCache[enc.pokemonName.toLowerCase()] : undefined}
                          isEditing={editingLocations.has(loc.name)}
                          onToggleEditing={() => toggleEditing(loc.name)}
                          onStatusAction={(status) => handleStatusAction(loc.name, status)}
                          onUpdateEncounter={(partial) => updateEncounter(loc.name, partial as Partial<Encounter>)}
                        />
                      );
                    })}
                    {pending.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 bg-[#212121] rounded-2xl border border-dashed border-white/10 opacity-50">
                        <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500" />
                        <p className="text-sm font-medium text-gray-400">All caught up!</p>
                        <p className="text-[10px] text-gray-600 mt-1">No pending locations remaining.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Team tab ────────────────────────────────────────────────────── */}
          {activeMainTab === 'Team' && (
            <TeamBuilder
              partyLocations={state.party}
              boxLocations={state.box}
              encounters={state.encounters}
              onMoveToParty={moveToParty}
              onMoveToBox={moveToBox}
              onEvolve={handleEvolveWithEffect}
              onMarkFainted={markFainted}
              onOpenDetail={openPokemonDetail}
              onSetMoves={(locName, moves) => updateEncounter(locName, { moves })}
              evolvingLocation={evolvingLocation}
            />
          )}

          {/* ── Box tab ─────────────────────────────────────────────────────── */}
          {activeMainTab === 'Box' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pl-2 mb-6">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Boxed Pokemon</div>
                <div className="text-[10px] font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{state.box.length} Total</div>
              </div>
              {state.box.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {state.box.map(locName => {
                    const enc = state.encounters[locName];
                    if (!enc?.pokemonName) return null;
                    return (
                      <BoxGridItem
                        key={locName}
                        locName={locName}
                        enc={enc}
                        data={pokemonDataCache[enc.pokemonName.toLowerCase()]}
                        isEvolving={evolvingLocation === locName}
                        onEvolve={() => handleEvolveWithEffect(locName)}
                        onMarkFainted={() => markFainted(locName)}
                        onOpenDetail={() => openPokemonDetail(locName)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#212121] rounded-2xl border border-dashed border-white/10 opacity-50">
                  <Package className="h-10 w-10 mb-3 text-gray-500" />
                  <p className="text-sm font-medium text-gray-400">Your box is empty</p>
                  <p className="text-[10px] text-gray-600 mt-1">Catch, Gift, or find Shiny Pokémon to fill it!</p>
                </div>
              )}
            </div>
          )}

          {/* ── Grave tab ───────────────────────────────────────────────────── */}
          {activeMainTab === 'Grave' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 mb-4">Graveyard</div>
              {state.graveyard.length > 0 ? (
                state.graveyard.map(locName => {
                  const enc = state.encounters[locName];
                  if (!enc?.pokemonName) return null;
                  return (
                    <GraveyardCard
                      key={locName}
                      locName={locName}
                      enc={enc}
                      sprite={spriteCache[enc.pokemonName.toLowerCase()]}
                    />
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#212121] rounded-2xl border border-dashed border-white/10 opacity-50">
                  <Skull className="h-10 w-10 mb-3 text-gray-500" />
                  <p className="text-sm font-medium text-gray-400">No fainted Pokémon yet</p>
                  <p className="text-[10px] text-gray-600 mt-1">Keep it that way! Good luck!</p>
                </div>
              )}
            </div>
          )}

        </main>

        {/* ── Remove route confirmation ────────────────────────────────────── */}
        {confirmRemoveRoute && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#212121] border border-white/10 rounded-2xl p-5 w-full max-w-[320px] shadow-2xl">
              <div className="text-sm font-bold text-white mb-1">Remove Route</div>
              <div className="text-xs text-gray-400 mb-4">
                Remove <span className="text-white font-semibold">"{confirmRemoveRoute}"</span> from the route list? This cannot be undone.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRemoveRoute(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeLocation(confirmRemoveRoute);
                    setConfirmRemoveRoute(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Detail modal ─────────────────────────────────────────────────── */}
        <DetailModal
          detail={detailPokemon}
          loading={detailLoading}
          onClose={() => setDetailPokemon(null)}
          bosses={gameData.bosses}
          partyDetails={state.party
            .map(loc => {
              const enc = state.encounters[loc];
              if (!enc?.pokemonName) return null;
              const cached = pokemonDataCache[enc.pokemonName.toLowerCase()];
              return {
                name: enc.pokemonName,
                nickname: enc.nickname,
                sprite: cached?.sprite || spriteCache[enc.pokemonName.toLowerCase()] || '',
                types: cached?.types || [],
                stats: cached?.stats || [],
                abilities: [],
                height: 0,
                weight: 0,
                moves: enc.moves,
              } as DetailData;
            })
            .filter((d): d is DetailData => d !== null)}
        />

        {/* ── Bottom nav ───────────────────────────────────────────────────── */}
        <div className={cn(
          'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/5 flex justify-around p-2 z-[100] rounded-t-2xl pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]',
          'transition-transform duration-300 ease-in-out',
          navVisible ? 'translate-y-0' : 'translate-y-full'
        )}>
          {([
            { tab: 'Game',  Icon: Gamepad2, label: 'Game'  },
            { tab: 'Team',  Icon: Swords,   label: 'Team'  },
            { tab: 'Box',   Icon: Package,  label: 'Box'   },
            { tab: 'Grave', Icon: Skull,    label: 'Grave' },
          ] as const).map(({ tab, Icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={cn(
                'flex flex-col items-center justify-center w-20 py-2 rounded-xl transition-all cursor-pointer',
                activeMainTab === tab ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

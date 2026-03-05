import { useState, useEffect } from 'react';
import { useRunStore } from './hooks/useRunStore';
import locationsData from './data/locations.json';
import bossesData from './data/bosses.json';
import { Skull, Package, Gamepad2, Search, Settings, Sun, ChevronRight, CheckCircle2, CircleSlash, Copy, Gift, Sparkles, Pencil } from 'lucide-react';
import { cn } from "@/lib/utils";

import { PokemonSelect, fetchSpriteForName, spriteCache } from './components/PokemonSelect';

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

export default function App() {
  const { state, updateEncounter } = useRunStore();
  const [activeMainTab, setActiveMainTab] = useState<'Game' | 'Box' | 'Grave'>('Game');
  const [activeSubTab, setActiveSubTab] = useState<'Nuzlocke' | 'Routes' | 'Bosses' | 'Upcoming'>('Nuzlocke');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLocations, setEditingLocations] = useState<Set<string>>(new Set());

  // State to hold boss sprites once fetched
  const [bossSprites, setBossSprites] = useState<Record<string, string>>({});

  // Fetch boss sprites on mount
  useEffect(() => {
    const fetchBossSprites = async () => {
      const allBossPokemon = new Set<string>();
      bossesData.bosses.forEach(boss => boss.keyPokemon.forEach(p => allBossPokemon.add(p)));

      const newSprites: Record<string, string> = {};
      for (const p of allBossPokemon) {
        const url = await fetchSpriteForName(p);
        if (url) newSprites[p] = url;
      }
      setBossSprites(newSprites);
    };
    fetchBossSprites();
  }, []);

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

    const selectedSprite = enc.pokemonName ? spriteCache[enc.pokemonName] : null;
    const isCompleted = enc.status !== 'None' && enc.pokemonName;
    const isEditing = editingLocations.has(locName);

    // ── Compact View Mode ──
    if (isCompleted && !isEditing) {
      const statusStyle = STATUS_COLOR_MAP[enc.status] || STATUS_COLOR_MAP.None;
      return (
        <div key={locName} className="bg-[#212121] rounded-xl border border-white/5 px-3 py-2.5 mb-3 last:mb-0 shadow-md flex items-center gap-3">
          {/* Sprite */}
          <div className="w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {selectedSprite ? (
              <img src={selectedSprite} alt={enc.pokemonName} className="w-9 h-9 object-contain" />
            ) : (
              <span className="text-[10px] text-gray-600 font-bold">{enc.pokemonName?.substring(0, 3)}</span>
            )}
          </div>

          {/* Name + Location */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{enc.nickname || enc.pokemonName}</div>
            <div className="text-[10px] text-gray-500 truncate">{locName}</div>
          </div>

          {/* Status Badge */}
          <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold border border-white/5 flex-shrink-0", statusStyle.bg, statusStyle.text)}>
            {enc.status}
          </div>

          {/* Edit Button */}
          <button
            onClick={() => toggleEditing(locName)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      );
    }

    // ── Edit Mode ──
    return (
      <div key={locName} className="bg-[#212121] rounded-xl border border-white/5 p-4 space-y-3 mb-3 last:mb-0 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-200 text-sm tracking-wide">{locName}</div>
          {isCompleted && (
            <button
              onClick={() => toggleEditing(locName)}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
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
                        onClick={() => setActiveSubTab(tab as any)}
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
                  placeholder="Search location..."
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/10 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Encounter List */}
              <div className="space-y-4">
                {locationsData.locations
                  .filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(loc => renderEncounterRow(loc.name))}
              </div>

              {/* Boss List */}
              <div className="mt-10 space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 mb-3">Upcoming Bosses</div>
                {bossesData.bosses.map(boss => (
                  <div key={boss.name} className="flex flex-col p-4 bg-[#212121] rounded-xl border border-white/5 shadow-sm relative overflow-hidden">
                    {/* Decorative gradient blur in background */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl" />

                    <div className="relative z-10 flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{boss.name}</h3>
                        <p className="text-xs text-gray-500">{boss.location}</p>
                      </div>
                      <div className="px-2 py-1 bg-[#1a1a1a] rounded text-xs font-bold text-gray-400 border border-white/5">
                        Lv {boss.levelCap}
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {boss.keyPokemon.map((p, i) => (
                          <div key={i} className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/5 shadow-inner">
                            {bossSprites[p] ? (
                              <img src={bossSprites[p]} alt={p} className="w-8 h-8 object-contain drop-shadow-md" />
                            ) : (
                              <span className="text-[10px] font-bold text-gray-600">{p.substring(0, 2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

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

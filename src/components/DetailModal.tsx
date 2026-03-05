import { useState, useEffect } from 'react';
import { X, Ruler, Weight, Swords, ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailData, BossEntry } from '../types';
import { STAT_COLORS, TYPE_BG, getTypeMatchups, cap } from '../constants/gameConstants';
import { TypeIcon } from './TypeIcon';
import { spriteCache, pokemonDataCache } from './PokemonSelect';
import moveTypesJson from '../data/move-types.json';

const moveTypes = moveTypesJson as Record<string, string>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMoveEffect(moveType: string, defenderTypes: string[]) {
  if (!defenderTypes.length) return { mult: 1, label: '1×', cls: '' };
  const { superWeak, weak, resist, superResist, immune } = getTypeMatchups(defenderTypes);
  if (immune.some(t => t.type === moveType))      return { mult: 0,    label: '0×', cls: 'bg-gray-600/80 text-gray-300' };
  if (superResist.some(t => t.type === moveType)) return { mult: 0.25, label: '¼×', cls: 'bg-blue-700 text-blue-100' };
  if (resist.some(t => t.type === moveType))      return { mult: 0.5,  label: '½×', cls: 'bg-blue-500 text-white' };
  if (superWeak.some(t => t.type === moveType))   return { mult: 4,    label: '4×', cls: 'bg-red-600 text-white' };
  if (weak.some(t => t.type === moveType))        return { mult: 2,    label: '2×', cls: 'bg-orange-500 text-white' };
  return { mult: 1, label: '', cls: '' };
}

function bossMaxThreat(boss: BossEntry, defenderTypes: string[]) {
  return Math.max(...boss.pokemon.flatMap(p =>
    p.moves.map(m => getMoveEffect(moveTypes[m] || 'normal', defenderTypes).mult)
  ));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DetailModalProps {
  detail: DetailData | null;
  loading: boolean;
  onClose: () => void;
  bosses?: BossEntry[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DetailModal({ detail, loading, onClose, bosses }: DetailModalProps) {
  const [view, setView] = useState<'detail' | 'bossPicker' | 'compare'>('detail');
  const [selectedBoss, setSelectedBoss] = useState<BossEntry | null>(null);
  const [bossSearch, setBossSearch] = useState('');

  // Reset compare state when the detail changes
  useEffect(() => {
    setView('detail');
    setSelectedBoss(null);
    setBossSearch('');
  }, [detail?.name]);

  if (!detail && !loading) return null;

  const defTypes = detail?.types ?? [];

  // ── Boss picker view ─────────────────────────────────────────────────────

  if (view === 'bossPicker') {
    const q = bossSearch.toLowerCase();
    const filtered = (bosses ?? []).filter(b =>
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      b.trainerType.toLowerCase().includes(q)
    ).sort((a, b) => bossMaxThreat(b, defTypes) - bossMaxThreat(a, defTypes));

    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[85vh] flex flex-col">
          <div className="w-full max-w-[400px] mx-auto flex flex-col flex-1 min-h-0">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pb-3 pt-1 border-b border-white/5 flex-shrink-0">
              <button
                onClick={() => setView('detail')}
                className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </button>
              <div className="flex-1">
                <div className="text-sm font-black text-white">Compare vs Boss</div>
                <div className="text-[10px] text-gray-500">
                  Sorted by threat to {cap(detail?.nickname || detail?.name)}
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 py-2 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                <Search className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search boss..."
                  className="bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none w-full"
                  value={bossSearch}
                  onChange={e => setBossSearch(e.target.value)}
                />
              </div>
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto styled-scrollbar px-4 py-2 space-y-1.5 pb-8">
              {filtered.map((boss, i) => {
                const maxMult = bossMaxThreat(boss, defTypes);
                const threatCls =
                  maxMult >= 4 ? 'text-red-400' :
                  maxMult >= 2 ? 'text-orange-400' :
                  maxMult <= 0 ? 'text-gray-600' :
                  maxMult < 1  ? 'text-blue-400' : 'text-gray-500';
                const aceSprite = (() => {
                  const ace = boss.pokemon.find(p => p.isAce) ?? boss.pokemon[boss.pokemon.length - 1];
                  return ace ? spriteCache[ace.name.toLowerCase()] : undefined;
                })();
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedBoss(boss); setView('compare'); }}
                    className="w-full flex items-center gap-3 bg-[#212121] hover:bg-[#2a2a2a] active:scale-[0.98] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2.5 transition-all text-left"
                  >
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-black/30 flex items-center justify-center">
                      {aceSprite
                        ? <img src={aceSprite} alt="" className="w-10 h-10 object-contain" />
                        : <span className="text-[8px] text-gray-600 font-bold">{boss.name.substring(0, 3)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-white truncate">{boss.name}</div>
                      <div className="text-[9px] text-gray-500 truncate">{boss.trainerType} · {boss.location}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={cn('text-[10px] font-black', threatCls)}>
                        {maxMult >= 4 ? '4× threat' : maxMult >= 2 ? '2× threat' : maxMult <= 0 ? 'immune' : maxMult < 1 ? 'resists' : 'neutral'}
                      </div>
                      <div className="text-[8px] text-gray-700">Lv cap {boss.levelCap}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Compare view ─────────────────────────────────────────────────────────

  if (view === 'compare' && selectedBoss && detail) {
    // Sort boss Pokémon: most threatening first
    const sortedPokemon = [...selectedBoss.pokemon].sort((a, b) => {
      const scoreOf = (p: typeof a) => Math.max(...p.moves.map(m =>
        getMoveEffect(moveTypes[m] || 'normal', defTypes).mult
      ));
      return scoreOf(b) - scoreOf(a);
    });

    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto styled-scrollbar pb-10">
          <div className="w-full max-w-[400px] mx-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pb-3 pt-1 border-b border-white/5">
              <button
                onClick={() => setView('bossPicker')}
                className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-white truncate">{selectedBoss.name}</div>
                <div className="text-[9px] text-gray-500">{selectedBoss.trainerType} · {selectedBoss.location} · Lv cap {selectedBoss.levelCap}</div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 transition-colors flex-shrink-0">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {/* Defender mini-header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-black/20 border-b border-white/5">
              <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest flex-shrink-0">Your Pokémon</div>
              {detail.sprite && <img src={detail.sprite} alt={detail.name} className="w-8 h-8 object-contain flex-shrink-0" />}
              <div className="min-w-0">
                <div className="text-xs font-black text-white truncate">{cap(detail.nickname || detail.name)}</div>
                <div className="flex gap-1 mt-0.5">
                  {defTypes.map(t => <TypeIcon key={t} type={t} size="sm" label={false} />)}
                </div>
              </div>
            </div>

            {/* Boss Pokémon cards */}
            <div className="px-4 py-3 space-y-3">
              {sortedPokemon.map((p, i) => {
                const sprite = spriteCache[p.name.toLowerCase()];
                const cachedData = pokemonDataCache[p.name.toLowerCase()];
                const movesWithEffect = p.moves.map(move => {
                  const mType = moveTypes[move] || 'normal';
                  const eff = getMoveEffect(mType, defTypes);
                  return { move, mType, eff };
                }).sort((a, b) => b.eff.mult - a.eff.mult);

                const maxMult = Math.max(...movesWithEffect.map(m => m.eff.mult));
                const cardAccent =
                  maxMult >= 4 ? 'border-red-500/30 bg-red-500/5' :
                  maxMult >= 2 ? 'border-orange-500/30 bg-orange-500/5' :
                  'border-white/5';

                return (
                  <div key={i} className={cn('rounded-2xl border p-3', cardAccent)}>
                    {/* Pokémon header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-black/30 flex items-center justify-center">
                        {sprite
                          ? <img src={sprite} alt={p.name} className="w-11 h-11 object-contain" />
                          : <span className="text-[8px] text-gray-600 font-bold">{p.name.substring(0, 3)}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white">{cap(p.name)}</span>
                          {p.isAce && (
                            <span className="text-[8px] font-black text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">ACE</span>
                          )}
                          {p.isLead && (
                            <span className="text-[8px] font-black text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">LEAD</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-gray-500">Lv {p.level}</span>
                          {cachedData?.types && (
                            <div className="flex gap-0.5">
                              {cachedData.types.map(t => <TypeIcon key={t} type={t} size="sm" label={false} />)}
                            </div>
                          )}
                        </div>
                        {p.ability && (
                          <div className="text-[8px] text-gray-600 mt-0.5 capitalize">{p.ability}</div>
                        )}
                      </div>
                    </div>

                    {/* Moves vs your Pokémon */}
                    <div className="text-[9px] font-black text-gray-600 uppercase tracking-wider mb-1.5">
                      Moves vs {cap(detail.nickname || detail.name)}
                    </div>
                    <div className="space-y-1">
                      {movesWithEffect.map(({ move, mType, eff }) => {
                        const bg = TYPE_BG[mType] || '#9099A1';
                        return (
                          <div
                            key={move}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-2.5 py-1.5',
                              eff.mult >= 2 ? 'bg-black/40' : 'bg-black/20'
                            )}
                            style={eff.mult >= 2 ? { borderLeft: `3px solid ${bg}` } : {}}
                          >
                            <TypeIcon type={mType} size="sm" label={false} />
                            <span className={cn('flex-1 text-[10px] font-semibold leading-tight', eff.mult >= 2 ? 'text-white' : 'text-gray-400')}>
                              {move}
                            </span>
                            {eff.label && (
                              <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0', eff.cls)}>
                                {eff.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Held item */}
                    {p.heldItem && (
                      <div className="mt-2 text-[8px] text-orange-400/70">
                        Held: {p.heldItem}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal detail view ───────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 shadow-2xl pb-10 max-h-[85vh] overflow-y-auto styled-scrollbar">
        <div className="w-full max-w-[400px] mx-auto relative">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
              <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
            </div>
          ) : detail && (
            <div className="px-5 pb-4">
              {/* Sprite */}
              <div className="flex justify-center mb-3">
                {detail.sprite ? (
                  <img src={detail.sprite} alt={detail.name} className="w-32 h-32 object-contain drop-shadow-2xl" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
                )}
              </div>

              {/* Name */}
              <div className="text-center mb-3">
                {detail.nickname && (
                  <div className="text-xl font-black text-white">{cap(detail.nickname)}</div>
                )}
                <div className={cn('font-bold text-gray-400', detail.nickname ? 'text-sm' : 'text-xl text-white')}>
                  {cap(detail.name)}
                </div>
              </div>

              {/* Types */}
              {detail.types.length > 0 && (
                <div className="flex justify-center gap-2 mb-5">
                  {detail.types.map(type => (
                    <TypeIcon key={type} type={type} size="lg" />
                  ))}
                </div>
              )}

              {/* Compare vs Boss button */}
              {bosses && bosses.length > 0 && detail.types.length > 0 && (
                <div className="flex justify-center mb-5">
                  <button
                    onClick={() => setView('bossPicker')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all active:scale-95"
                  >
                    <Swords className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-black">Compare vs Boss</span>
                  </button>
                </div>
              )}

              {/* Height / Weight */}
              {(detail.height > 0 || detail.weight > 0) && (
                <div className="flex justify-center gap-6 mb-5">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Ruler className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-white">{(detail.height / 10).toFixed(1)}m</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Weight className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-white">{(detail.weight / 10).toFixed(1)}kg</span>
                  </div>
                </div>
              )}

              {/* Base Stats */}
              <div className="mb-5">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Base Stats</div>
                <div className="space-y-2">
                  {detail.stats.map(stat => (
                    <div key={stat.name} className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-gray-500 w-16 text-right flex-shrink-0">{stat.name}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', STAT_COLORS[stat.name] || 'bg-gray-500')}
                          style={{ width: `${Math.min((stat.value / 255) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-white w-6 flex-shrink-0">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abilities */}
              {detail.abilities.length > 0 && (
                <div className="mb-5">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Abilities</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.abilities.map(ability => (
                      <span key={ability} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-semibold text-gray-300 capitalize">
                        {ability}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Held Item */}
              {detail.heldItem && (
                <div className="mb-5">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Held Item</div>
                  <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] font-semibold text-orange-300">
                    {detail.heldItem}
                  </span>
                </div>
              )}

              {/* Moves */}
              {detail.moves && detail.moves.length > 0 && (
                <div className="mb-5">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Moves</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {detail.moves.map(move => {
                      const moveType = moveTypes[move] || 'normal';
                      const bg = TYPE_BG[moveType] || '#9099A1';
                      return (
                        <div
                          key={move}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 overflow-hidden"
                          style={{ backgroundColor: `${bg}22`, border: `1px solid ${bg}44` }}
                        >
                          <TypeIcon type={moveType} size="sm" label={false} />
                          <span className="text-[10px] font-semibold text-white leading-tight">{move}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type Matchups */}
              {detail.types.length > 0 && (() => {
                const { superWeak, weak, resist, superResist, immune } = getTypeMatchups(detail.types);
                const rows = [
                  { label: 'Super Weak',   items: superWeak,   badge: '4×', labelColor: 'text-red-400'    },
                  { label: 'Weak',         items: weak,        badge: '2×', labelColor: 'text-orange-400' },
                  { label: 'Resist',       items: resist,      badge: '½×', labelColor: 'text-blue-400'   },
                  { label: 'Super Resist', items: superResist, badge: '¼×', labelColor: 'text-cyan-400'   },
                  { label: 'Immune',       items: immune,      badge: '0×', labelColor: 'text-gray-400'   },
                ].filter(r => r.items.length > 0);

                if (rows.length === 0) return null;
                return (
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Type Matchups</div>
                    <div className="space-y-2">
                      {rows.map(({ label, items, badge, labelColor }) => (
                        <div key={label} className="flex items-start gap-2">
                          <div className="flex items-center gap-1 min-w-[72px] pt-0.5">
                            <span className={cn('text-[8px] font-black', labelColor)}>{badge}</span>
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
        </div>
      </div>
    </div>
  );
}

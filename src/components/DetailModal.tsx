import { useState, useEffect } from 'react';
import { X, Ruler, Weight, Swords, ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailData, BossEntry } from '../types';
import { STAT_COLORS, TYPE_BG, getTypeMatchups, ALL_TYPES, cap } from '../constants/gameConstants';
import { TypeIcon } from './TypeIcon';
import { spriteCache, pokemonDataCache } from './PokemonSelect';
import moveTypesJson from '../data/move-types.json';
import { moveDetailCache, fetchMoveDetail, MoveDetail, abilityCache, fetchAbilityDetail, AbilityDetail } from './PokemonSelect';

// Normalize keys to lowercase-hyphenated to match PokeAPI move names
const moveTypes: Record<string, string> = Object.fromEntries(
  Object.entries(moveTypesJson as Record<string, string>).map(([k, v]) => [
    k.toLowerCase().replace(/\s+/g, '-'), v,
  ])
);

const DC_LABEL: Record<string, string> = { physical: 'Phys', special: 'Spec', status: 'Stat' };
const DC_COLOR: Record<string, string> = { physical: '#C03028', special: '#6890F0', status: '#705898' };

// ── Shared move detail hook ───────────────────────────────────────────────────

function useMoveDetail(move: string) {
  const key = move.toLowerCase().replace(/\s+/g, '-');
  const [detail, setDetail] = useState<MoveDetail | null>(() => moveDetailCache[key] ?? null);
  useEffect(() => {
    if (!detail) fetchMoveDetail(move).then(d => { if (d) setDetail(d); });
  }, [key]);
  return detail;
}

// ── Compare move row ──────────────────────────────────────────────────────────

function CompareMoveRow({ move, defTypes }: { move: string; defTypes: string[] }) {
  const detail = useMoveDetail(move);
  const mType = detail?.type ?? (moveTypes[move.toLowerCase()] ?? 'normal');
  const eff = getMoveEffect(mType, defTypes);
  const bg = TYPE_BG[mType] || '#9099A1';

  return (
    <div
      className="flex items-center rounded overflow-hidden border bg-black/30"
      style={{ borderColor: `${bg}50`, boxShadow: eff.mult >= 2 ? `0 0 8px ${bg}40` : 'none' }}
    >
      <span className="inline-flex items-center justify-center w-6 h-full flex-shrink-0 py-1.5" style={{ backgroundColor: bg }}>
        <img src={`${import.meta.env.BASE_URL}type-icons/${mType}.svg`} alt={mType} className="w-3 h-3 object-contain" />
      </span>
      <div className="flex-1 min-w-0 px-2 py-1">
        <div className="text-[10px] font-bold text-white truncate leading-none">{cap(move)}</div>
        {detail && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[7px] font-bold leading-none" style={{ color: DC_COLOR[detail.damageClass] }}>{DC_LABEL[detail.damageClass]}</span>
            {detail.accuracy !== null && <span className="text-[7px] text-gray-600 leading-none">{detail.accuracy}%</span>}
            {!detail && <div className="w-3 h-2 rounded bg-white/5 animate-pulse" />}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 pr-2 flex-shrink-0">
        {detail?.power !== null && detail?.power !== undefined && (
          <span className="text-[9px] font-black text-white/50">{detail.power}</span>
        )}
        {eff.label && (
          <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded', eff.cls)}>{eff.label}</span>
        )}
      </div>
    </div>
  );
}

// ── Ability badge ─────────────────────────────────────────────────────────────

function AbilityBadge({ ability }: { ability: string }) {
  const key = ability.toLowerCase().replace(/\s+/g, '-');
  const [detail, setDetail] = useState<AbilityDetail | null>(() => abilityCache[key] ?? null);
  useEffect(() => {
    if (!detail) fetchAbilityDetail(ability).then(d => { if (d) setDetail(d); });
  }, [key]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
      <div className="text-[10px] font-black text-white capitalize mb-1">{ability}</div>
      {detail ? (
        <div className="text-[9px] text-gray-400 leading-relaxed">{detail.shortEffect}</div>
      ) : (
        <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
      )}
    </div>
  );
}

// ── Move detail badge ─────────────────────────────────────────────────────────

function MoveDetailBadge({ move }: { move: string }) {
  const detail = useMoveDetail(move);

  const type = detail?.type ?? (moveTypes[move.toLowerCase().replace(/\s+/g, '-')] ?? 'normal');
  const color = TYPE_BG[type] || '#9099A1';

  // Types this move hits super-effectively
  const superEffective = ALL_TYPES.filter(t => getMoveEffect(type, [t]).mult >= 4);
  const effective      = ALL_TYPES.filter(t => getMoveEffect(type, [t]).mult === 2);

  return (
    <div className="rounded border bg-black/30" style={{ borderColor: `${color}80`, boxShadow: `0 0 8px ${color}50` }}>
      {/* Move header */}
      <div className="flex items-center overflow-hidden rounded-t">
        <span className="inline-flex items-center justify-center w-7 h-full flex-shrink-0 py-2" style={{ backgroundColor: color }}>
          <img src={`${import.meta.env.BASE_URL}type-icons/${type}.svg`} alt={type} className="w-3.5 h-3.5 object-contain" />
        </span>
        <div className="flex-1 min-w-0 px-2 py-1.5">
          <div className="text-[10px] font-bold text-white truncate leading-none">{cap(move)}</div>
          {detail && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[8px] font-bold leading-none" style={{ color: DC_COLOR[detail.damageClass] }}>{DC_LABEL[detail.damageClass]}</span>
              {detail.accuracy !== null && <span className="text-[8px] text-gray-500 leading-none">{detail.accuracy}%</span>}
            </div>
          )}
        </div>
        {detail?.power != null && (
          <span className="text-[11px] font-black text-white/60 pr-2 flex-shrink-0">{detail.power}</span>
        )}
      </div>

      {/* Coverage */}
      {(() => {
        const immune      = ALL_TYPES.filter(t => getMoveEffect(type, [t]).mult === 0);
        const superResist = ALL_TYPES.filter(t => getMoveEffect(type, [t]).mult === 0.25);
        const resist      = ALL_TYPES.filter(t => getMoveEffect(type, [t]).mult === 0.5);
        const all = [
          ...superEffective.map(t => ({ t, label: '4×', cls: 'text-red-300' })),
          ...effective.map(t => ({ t, label: '2×', cls: 'text-orange-300' })),
          ...resist.map(t => ({ t, label: '½×', cls: 'text-blue-400' })),
          ...superResist.map(t => ({ t, label: '¼×', cls: 'text-cyan-400' })),
          ...immune.map(t => ({ t, label: '0×', cls: 'text-gray-500' })),
        ];
        if (all.length === 0) return null;
        return (
          <div className="px-2 pb-1.5 pt-1 border-t flex flex-wrap gap-1" style={{ borderColor: `${color}30` }}>
            {all.map(({ t, label, cls }) => (
              <div key={t} title={t} className="flex items-center gap-0.5 rounded overflow-hidden border bg-black/30" style={{ borderColor: `${TYPE_BG[t] || '#9099A1'}80`, boxShadow: `0 0 5px ${TYPE_BG[t] || '#9099A1'}50` }}>
                <span className="inline-flex items-center justify-center w-4 h-4 flex-shrink-0" style={{ backgroundColor: TYPE_BG[t] || '#9099A1' }}>
                  <img src={`${import.meta.env.BASE_URL}type-icons/${t}.svg`} alt={t} className="w-3 h-3 object-contain" />
                </span>
                <span className={`text-[7px] font-black pr-1 leading-none ${cls}`}>{label}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

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
  partyDetails?: DetailData[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DetailModal({ detail, loading, onClose, bosses, partyDetails }: DetailModalProps) {
  const [view, setView] = useState<'detail' | 'bossPicker' | 'compare'>('detail');
  const [selectedBoss, setSelectedBoss] = useState<BossEntry | null>(null);
  const [bossSearch, setBossSearch] = useState('');
  const [bossPokeIndex, setBossPokeIndex] = useState(0);
  const [partyPokeIndex, setPartyPokeIndex] = useState(0);

  // Reset compare state when the detail changes; sync party index to the opened Pokemon
  useEffect(() => {
    setView('detail');
    setSelectedBoss(null);
    setBossSearch('');
    const idx = partyDetails?.findIndex(p => p.name === detail?.name) ?? -1;
    setPartyPokeIndex(idx >= 0 ? idx : 0);
  }, [detail?.name]);

  // Prefetch all moves for the selected boss team + all party moves when entering compare
  useEffect(() => {
    if (!selectedBoss) return;
    const partyMoves = partyDetails?.flatMap(pd => pd.moves ?? []) ?? detail?.moves ?? [];
    const allMoves = [...new Set(selectedBoss.pokemon.flatMap(bp => bp.moves).concat(partyMoves))];
    allMoves.forEach(m => { if (!moveDetailCache[m.toLowerCase()]) fetchMoveDetail(m); });
  }, [selectedBoss, detail?.moves, partyDetails]);

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
                    onClick={() => { setSelectedBoss(boss); setBossPokeIndex(0); setView('compare'); }}
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
    const bossTeam = selectedBoss.pokemon;
    const idx = Math.min(bossPokeIndex, bossTeam.length - 1);
    const p = bossTeam[idx];
    const sprite = spriteCache[p.name.toLowerCase()];
    const bossData = pokemonDataCache[p.name.toLowerCase()];
    const bossTypes = bossData?.types ?? [];

    // Active user pokemon (navigable via party prev/next)
    const hasParty = partyDetails && partyDetails.length > 0;
    const safePartyIdx = hasParty ? Math.min(partyPokeIndex, partyDetails!.length - 1) : 0;
    const activePoke = hasParty ? partyDetails![safePartyIdx] : detail;
    const userDefTypes = activePoke.types;

    // Sort boss moves by effectiveness vs the active user pokemon
    const sortedBossMoves = [...p.moves].sort((a, b) => {
      const typeA = moveDetailCache[a.toLowerCase()]?.type ?? moveTypes[a.toLowerCase()] ?? 'normal';
      const typeB = moveDetailCache[b.toLowerCase()]?.type ?? moveTypes[b.toLowerCase()] ?? 'normal';
      return getMoveEffect(typeB, userDefTypes).mult - getMoveEffect(typeA, userDefTypes).mult;
    });

    // Sort your moves by effectiveness vs boss
    const sortedYourMoves = [...(activePoke.moves ?? [])].sort((a, b) => {
      const typeA = moveDetailCache[a.toLowerCase()]?.type ?? moveTypes[a.toLowerCase()] ?? 'normal';
      const typeB = moveDetailCache[b.toLowerCase()]?.type ?? moveTypes[b.toLowerCase()] ?? 'normal';
      return getMoveEffect(typeB, bossTypes).mult - getMoveEffect(typeA, bossTypes).mult;
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
              <button onClick={() => setView('bossPicker')} className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 transition-colors flex-shrink-0">
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

            {/* Boss Pokémon navigator */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBossPokeIndex(i => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 disabled:opacity-20 transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>

                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-black/30 flex items-center justify-center">
                    {sprite
                      ? <img src={sprite} alt={p.name} className="w-13 h-13 object-contain" />
                      : <span className="text-[9px] text-gray-600 font-bold">{p.name.substring(0, 3)}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-white">{cap(p.name)}</span>
                      {p.isAce && <span className="text-[8px] font-black text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">ACE</span>}
                      {p.isLead && <span className="text-[8px] font-black text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">LEAD</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-500">Lv {p.level}</span>
                      {bossTypes.length > 0 && (
                        <div className="flex gap-0.5">{bossTypes.map(t => <TypeIcon key={t} type={t} size="sm" label={false} />)}</div>
                      )}
                    </div>
                    {p.ability && <div className="text-[8px] text-gray-600 mt-0.5 capitalize">{p.ability}</div>}
                    {p.heldItem && <div className="text-[8px] text-orange-400/70 mt-0.5">Held: {p.heldItem}</div>}
                  </div>
                </div>

                <button
                  onClick={() => setBossPokeIndex(i => Math.min(bossTeam.length - 1, i + 1))}
                  disabled={idx === bossTeam.length - 1}
                  className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 disabled:opacity-20 transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-1 mt-2">
                {bossTeam.map((_, i) => (
                  <button key={i} onClick={() => setBossPokeIndex(i)} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === idx ? 'bg-white/60' : 'bg-white/15')} />
                ))}
              </div>
            </div>

            {/* User Pokémon navigator */}
            {hasParty && (
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[8px] font-black text-gray-600 uppercase tracking-wider mb-2">Your Pokémon</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPartyPokeIndex(i => Math.max(0, i - 1))}
                    disabled={safePartyIdx === 0}
                    className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 disabled:opacity-20 transition-colors flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>

                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-black/30 flex items-center justify-center">
                      {activePoke.sprite
                        ? <img src={activePoke.sprite} alt={activePoke.name} className="w-11 h-11 object-contain" />
                        : <span className="text-[9px] text-gray-600 font-bold">{activePoke.name.substring(0, 3)}</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">
                        {cap(activePoke.nickname || activePoke.name)}
                      </div>
                      {activePoke.nickname && (
                        <div className="text-[9px] text-gray-500 truncate">{cap(activePoke.name)}</div>
                      )}
                      {userDefTypes.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {userDefTypes.map(t => <TypeIcon key={t} type={t} size="sm" label={false} />)}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setPartyPokeIndex(i => Math.min(partyDetails!.length - 1, i + 1))}
                    disabled={safePartyIdx === partyDetails!.length - 1}
                    className="p-1.5 rounded-full bg-white/8 hover:bg-white/15 disabled:opacity-20 transition-colors flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                  </button>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-1 mt-2">
                  {partyDetails!.map((_, i) => (
                    <button key={i} onClick={() => setPartyPokeIndex(i)} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === safePartyIdx ? 'bg-white/60' : 'bg-white/15')} />
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3 space-y-4">
              {/* Your moves → boss Pokémon */}
              <div>
                <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  {cap(activePoke.nickname || activePoke.name)}'s moves vs {cap(p.name)} {bossTypes.length === 0 && <span className="text-gray-700 normal-case font-normal">(type unknown)</span>}
                </div>
                {sortedYourMoves.length === 0 ? (
                  <div className="text-[9px] text-gray-700 italic">No moves set — assign moves on the Team page</div>
                ) : (
                  <div className="space-y-1">
                    {sortedYourMoves.map(move => <CompareMoveRow key={move} move={move} defTypes={bossTypes} />)}
                  </div>
                )}
              </div>

              {/* Boss moves → your Pokémon */}
              <div>
                <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  {cap(p.name)}'s moves vs {cap(activePoke.nickname || activePoke.name)}
                </div>
                <div className="space-y-1">
                  {sortedBossMoves.map(move => <CompareMoveRow key={move} move={move} defTypes={userDefTypes} />)}
                </div>
              </div>
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
                  <div className="space-y-2">
                    {detail.abilities.map(ability => (
                      <AbilityBadge key={ability} ability={ability} />
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
                    {detail.moves.map(move => (
                      <MoveDetailBadge key={move} move={move} />
                    ))}
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

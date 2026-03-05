import { useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, Sparkles, Skull } from 'lucide-react';
import { Encounter } from '../types';
import { cap, getTypeMatchups, ALL_TYPES, TYPE_BG } from '../constants/gameConstants';
import { TypeIcon } from './TypeIcon';
import { Pokeball } from './Pokeball';
import { pokemonDataCache, spriteCache } from './PokemonSelect';

// ── Types ─────────────────────────────────────────────────────────────────────

type Relation = 'superWeak' | 'weak' | 'neutral' | 'resist' | 'superResist' | 'immune' | 'empty';

interface PartyMember {
  locName: string;
  enc: Encounter;
}

interface TeamBuilderProps {
  partyLocations: string[];
  boxLocations: string[];
  encounters: Record<string, Encounter>;
  onMoveToParty: (locName: string) => void;
  onMoveToBox: (locName: string) => void;
  onEvolve: (locName: string) => void;
  onMarkFainted: (locName: string) => void;
  onOpenDetail: (locName: string) => void;
  evolvingLocation: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAT_SHORT: Record<string, string> = {
  HP: 'HP', ATTACK: 'Atk', DEFENSE: 'Def',
  'SP.ATTACK': 'SpA', 'SP.DEFENSE': 'SpD', SPEED: 'Spe',
};

const RELATION_COLOR: Record<Relation, string> = {
  superWeak:   'bg-red-600 ring-1 ring-red-400/50',
  weak:        'bg-orange-500',
  neutral:     'bg-white/8',
  resist:      'bg-blue-500/70',
  superResist: 'bg-blue-700 ring-1 ring-blue-400/50',
  immune:      'bg-gray-600',
  empty:       'bg-white/3',
};

const RELATION_LABEL: Record<Relation, string> = {
  superWeak: '4×', weak: '2×', neutral: '', resist: '½', superResist: '¼', immune: '0×', empty: '',
};

function getBST(pokemonName?: string) {
  if (!pokemonName) return 0;
  const data = pokemonDataCache[pokemonName.toLowerCase()];
  return data?.stats ? data.stats.reduce((s, st) => s + st.value, 0) : 0;
}

function getRelation(types: string[], attackType: string): Relation {
  if (!types || types.length === 0) return 'neutral';
  const { superWeak, weak, immune, superResist, resist } = getTypeMatchups(types);
  if (superWeak.some(t => t.type === attackType))  return 'superWeak';
  if (weak.some(t => t.type === attackType))        return 'weak';
  if (immune.some(t => t.type === attackType))      return 'immune';
  if (superResist.some(t => t.type === attackType)) return 'superResist';
  if (resist.some(t => t.type === attackType))      return 'resist';
  return 'neutral';
}

// ── Box picker modal ──────────────────────────────────────────────────────────

interface BoxPickerModalProps {
  boxLocations: string[];
  encounters: Record<string, Encounter>;
  onPick: (locName: string) => void;
  onClose: () => void;
}

function BoxPickerModal({ boxLocations, encounters, onPick, onClose }: BoxPickerModalProps) {
  const sorted = boxLocations
    .map(locName => ({ locName, enc: encounters[locName] }))
    .filter(m => m.enc?.pokemonName)
    .sort((a, b) => getBST(b.enc.pokemonName) - getBST(a.enc.pokemonName));

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-[400px] bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Handle + header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-white/5">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-white">Choose a Pokémon</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Sorted by strength (BST)</div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto styled-scrollbar py-2 px-3 space-y-1.5">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
              <Pokeball className="w-10 h-10" />
              <p className="text-sm text-gray-400 font-bold">Your box is empty</p>
            </div>
          ) : sorted.map(({ locName, enc }, rank) => {
            const data   = pokemonDataCache[enc.pokemonName!.toLowerCase()];
            const sprite = spriteCache[enc.pokemonName!.toLowerCase()];
            const bst    = getBST(enc.pokemonName);
            const typeColor = data?.types?.[0] ? TYPE_BG[data.types[0]] : '#333';

            return (
              <button
                key={locName}
                onClick={() => { onPick(locName); onClose(); }}
                className="w-full flex items-center gap-3 bg-[#212121] hover:bg-[#2a2a2a] active:scale-[0.98] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2.5 transition-all cursor-pointer text-left"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-5 text-center">
                  <span className={cn(
                    'text-[9px] font-black',
                    rank === 0 ? 'text-yellow-400' : rank === 1 ? 'text-gray-400' : rank === 2 ? 'text-orange-700' : 'text-gray-700'
                  )}>#{rank + 1}</span>
                </div>

                {/* Sprite */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${typeColor}18` }}
                >
                  {sprite
                    ? <img src={sprite} alt={enc.pokemonName} className="w-11 h-11 object-contain drop-shadow" />
                    : <div className="w-9 h-9 rounded-full bg-black/30 animate-pulse" />
                  }
                </div>

                {/* Name + types */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black text-white truncate leading-tight">
                    {cap(enc.nickname || enc.pokemonName)}
                  </div>
                  {enc.nickname && (
                    <div className="text-[9px] text-gray-600 truncate leading-tight">{cap(enc.pokemonName)}</div>
                  )}
                  <div className="flex gap-0.5 mt-1">
                    {data?.types?.map(t => <TypeIcon key={t} type={t} size="sm" label={false} />) ?? null}
                  </div>
                </div>

                {/* Stats column */}
                {data?.stats && (
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[9px] text-gray-600 font-bold">BST</span>
                      <span className="text-[12px] font-black text-white">{bst}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-x-1.5 gap-y-0.5">
                      {data.stats.map(st => (
                        <div key={st.name} className="text-right">
                          <span className="text-[7px] text-gray-600 font-bold">{STAT_SHORT[st.name] ?? st.name} </span>
                          <span className="text-[8px] text-gray-300 font-black">{st.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom padding for safe area */}
        <div className="flex-shrink-0 h-4" />
      </div>
    </div>,
    document.body
  );
}

// ── Empty slot (clickable) ────────────────────────────────────────────────────

function EmptySlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-[#1a1a1a] rounded-2xl border border-dashed border-white/10 p-3 flex flex-col items-center justify-center min-h-[158px] gap-2 relative overflow-hidden w-full cursor-pointer active:scale-[0.97] transition-transform group"
    >
      <div className="absolute top-0 left-0 right-0 h-[55%] bg-gradient-to-b from-red-900/10 to-transparent rounded-t-2xl" />
      <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-white/[0.02] to-transparent rounded-b-2xl" />
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-px bg-white/6" />

      <div className="relative z-10 group-hover:scale-110 transition-transform duration-200">
        <Pokeball className="w-12 h-12 opacity-20 group-hover:opacity-35 transition-opacity" />
      </div>
      <span className="relative z-10 text-[8px] text-white/20 group-hover:text-white/35 font-black uppercase tracking-[0.2em] transition-colors">
        Tap to add
      </span>
    </button>
  );
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({ member, onRemove, onEvolve, onMarkFainted, onOpenDetail, isEvolving }: {
  member: PartyMember;
  onRemove: () => void;
  onEvolve: () => void;
  onMarkFainted: () => void;
  onOpenDetail: () => void;
  isEvolving: boolean;
}) {
  const { enc, locName } = member;
  const data   = pokemonDataCache[enc.pokemonName?.toLowerCase() ?? ''];
  const sprite = enc.pokemonName ? spriteCache[enc.pokemonName.toLowerCase()] : undefined;
  const bst    = data?.stats ? data.stats.reduce((s, st) => s + st.value, 0) : 0;
  const bg     = data?.types?.[0] ? `${TYPE_BG[data.types[0]]}18` : 'transparent';

  return (
    <div
      className="bg-[#212121] rounded-2xl border border-white/5 p-3 shadow-lg relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{ backgroundColor: `color-mix(in srgb, ${bg} 30%, #212121)` }}
      onClick={onOpenDetail}
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-colors z-10"
        title="Move to Box"
      >
        <X className="w-2.5 h-2.5 text-gray-500 hover:text-red-400" />
      </button>

      {/* Evolution flash overlay */}
      {isEvolving && (
        <div className="absolute inset-0 z-30 pointer-events-none evolution-overlay rounded-2xl" />
      )}

      {/* Sprite + name */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
          {sprite
            ? <img src={sprite} alt={enc.pokemonName} className={cn('w-14 h-14 object-contain drop-shadow-lg', isEvolving && 'sprite-evolving')} />
            : <div className="w-12 h-12 rounded-full bg-black/30 animate-pulse" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-white truncate leading-tight pr-5">
            {cap(enc.nickname || enc.pokemonName)}
          </div>
          {enc.nickname && (
            <div className="text-[9px] text-gray-500 truncate leading-tight">{cap(enc.pokemonName)}</div>
          )}
          <div className="flex gap-0.5 mt-1">
            {data?.types?.map(t => <TypeIcon key={t} type={t} size="sm" label={false} />) ?? null}
          </div>
        </div>
      </div>

      {/* Stats */}
      {data?.stats ? (
        <>
          <div className="grid grid-cols-3 gap-1 mb-1">
            {data.stats.map(stat => (
              <div key={stat.name} className="bg-black/40 rounded-md px-1.5 py-1 flex items-center justify-between border border-white/5">
                <span className="text-[7px] font-bold text-gray-500">{STAT_SHORT[stat.name] ?? stat.name}</span>
                <span className="text-[8px] font-black text-white">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="text-right">
            <span className="text-[8px] text-gray-600 font-bold">BST <span className="text-gray-400">{bst}</span></span>
          </div>
        </>
      ) : (
        <div className="h-10 flex items-center justify-center">
          <div className="text-[9px] text-gray-700">Loading…</div>
        </div>
      )}

      <div className="text-[7px] text-gray-700 truncate mt-1 mb-2">{locName}</div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEvolve}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 transition-all cursor-pointer active:scale-95"
        >
          <Sparkles className="h-3 w-3" />
          <span className="text-[8px] font-bold">Evolve</span>
        </button>
        <button
          onClick={onMarkFainted}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all cursor-pointer active:scale-95"
        >
          <Skull className="h-3 w-3" />
          <span className="text-[8px] font-bold">Dead</span>
        </button>
      </div>
    </div>
  );
}

// ── Coverage matrix ───────────────────────────────────────────────────────────

function CoverageMatrix({ members }: { members: PartyMember[] }) {
  if (members.length === 0) {
    return (
      <div className="text-[11px] text-gray-600 text-center py-8 bg-[#212121] rounded-2xl border border-dashed border-white/8">
        Add Pokémon to your party to see type coverage
      </div>
    );
  }

  const matrix = ALL_TYPES.map(attackType =>
    members.map(m => {
      const types = pokemonDataCache[m.enc.pokemonName?.toLowerCase() ?? '']?.types;
      return types ? getRelation(types, attackType) : ('neutral' as Relation);
    })
  );

  const rows = ALL_TYPES
    .map((type, i) => ({ type, relations: matrix[i] }))
    .filter(row => row.relations.some(r => r !== 'neutral'))
    .sort((a, b) => {
      const score = (r: Relation[]) =>
        r.reduce((s, rel) =>
          s + (rel === 'superWeak' ? 4 : rel === 'weak' ? 2 : rel === 'immune' ? -4 : rel === 'superResist' ? -2 : rel === 'resist' ? -1 : 0)
        , 0);
      return score(b.relations) - score(a.relations);
    });

  return (
    <div className="bg-[#212121] rounded-2xl border border-white/5 overflow-hidden">
      {/* Column headers: party sprites */}
      <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-2.5 border-b border-white/5 bg-black/20">
        {/* Type col spacer */}
        <div className="w-6 sm:w-[88px] flex-shrink-0" />
        {Array.from({ length: 6 }).map((_, i) => {
          const m = members[i];
          const sprite = m ? spriteCache[m.enc.pokemonName?.toLowerCase() ?? ''] : undefined;
          return (
            <div key={i} className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 flex items-center justify-center">
              {sprite
                ? <img src={sprite} alt="" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
                : m
                  ? <span className="text-[6px] sm:text-[7px] text-gray-600 font-bold">{cap(m.enc.pokemonName)?.substring(0, 3)}</span>
                  : <span className="w-4 h-4 sm:w-5 sm:h-5 rounded border border-dashed border-white/8 block" />
              }
            </div>
          );
        })}
        <div className="hidden sm:block w-12 flex-shrink-0" />
      </div>

      {/* Type rows */}
      <div className="divide-y divide-white/3">
        {rows.map(({ type, relations }) => {
          const weak    = relations.filter(r => r === 'weak' || r === 'superWeak').length;
          const resist  = relations.filter(r => r === 'resist' || r === 'superResist' || r === 'immune').length;
          const has4x   = relations.some(r => r === 'superWeak');
          const isWeak  = weak > 0;
          return (
            <div
              key={type}
              className={cn(
                'flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1',
                isWeak ? (has4x ? 'bg-red-500/5' : 'bg-orange-500/5') : ''
              )}
            >
              {/* Type label: icon-only on xs, full badge on sm+ */}
              <div className="w-6 sm:w-[88px] flex-shrink-0">
                <span className="block sm:hidden"><TypeIcon type={type} size="sm" label={false} /></span>
                <span className="hidden sm:block"><TypeIcon type={type} size="sm" label /></span>
              </div>
              {Array.from({ length: 6 }).map((_, i) => {
                const rel: Relation = relations[i] ?? 'empty';
                return (
                  <div
                    key={i}
                    className={cn('w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 rounded-md sm:rounded-lg flex items-center justify-center', RELATION_COLOR[rel])}
                  >
                    {rel !== 'neutral' && rel !== 'empty' && (
                      <span className="text-[6px] sm:text-[7px] font-black text-white/90 leading-none">{RELATION_LABEL[rel]}</span>
                    )}
                  </div>
                );
              })}
              <div className="hidden sm:block w-12 flex-shrink-0 text-right">
                {isWeak ? (
                  <span className={cn('text-[9px] font-black', has4x ? 'text-red-400' : 'text-orange-400')}>
                    {weak > 1 ? `${weak} weak` : 'weak'}
                  </span>
                ) : resist > 0 ? (
                  <span className="text-[9px] font-black text-blue-400">
                    {resist > 1 ? `${resist} res` : 'res'}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap px-2 sm:px-3 py-2.5 border-t border-white/5 bg-black/20">
        {([
          ['superWeak', '4× weak'], ['weak', '2× weak'],
          ['resist', '½ resist'],   ['superResist', '¼ resist'], ['immune', 'immune'],
        ] as [Relation, string][]).map(([rel, label]) => (
          <div key={rel} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded flex-shrink-0', RELATION_COLOR[rel].split(' ')[0])} />
            <span className="text-[8px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TeamBuilder({ partyLocations, boxLocations, encounters, onMoveToParty, onMoveToBox, onEvolve, onMarkFainted, onOpenDetail, evolvingLocation }: TeamBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const members: PartyMember[] = partyLocations
    .map(locName => ({ locName, enc: encounters[locName] }))
    .filter(m => m.enc?.pokemonName) as PartyMember[];

  const partyFull = members.length >= 6;

  return (
    <div className="space-y-6">
      {/* Party header */}
      <div className="flex items-center justify-between pl-1">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Party</div>
        <div className="text-[10px] font-bold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{members.length} / 6</div>
      </div>

      {/* 2×3 party grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) =>
          members[i]
            ? <MemberCard
                key={members[i].locName}
                member={members[i]}
                onRemove={() => onMoveToBox(members[i].locName)}
                onEvolve={() => onEvolve(members[i].locName)}
                onMarkFainted={() => onMarkFainted(members[i].locName)}
                onOpenDetail={() => onOpenDetail(members[i].locName)}
                isEvolving={evolvingLocation === members[i].locName}
              />
            : <EmptySlot key={`empty-${i}`} onClick={() => !partyFull && setPickerOpen(true)} />
        )}
      </div>

      {/* Coverage header */}
      <div className="flex items-center justify-between pl-1">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Type Coverage</div>
        <div className="text-[9px] text-gray-600">sorted by threat</div>
      </div>

      <CoverageMatrix members={members} />

      {/* Box picker modal */}
      {pickerOpen && (
        <BoxPickerModal
          boxLocations={boxLocations}
          encounters={encounters}
          onPick={(locName) => onMoveToParty(locName)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

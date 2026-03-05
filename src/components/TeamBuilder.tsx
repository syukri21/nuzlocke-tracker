import { cn } from '@/lib/utils';
import { Encounter } from '../types';
import { cap, getTypeMatchups, ALL_TYPES, TYPE_BG } from '../constants/gameConstants';
import { TypeIcon } from './TypeIcon';
import { pokemonDataCache, spriteCache } from './PokemonSelect';

// ── Types ─────────────────────────────────────────────────────────────────────

type Relation = 'superWeak' | 'weak' | 'neutral' | 'resist' | 'superResist' | 'immune' | 'empty';

interface PartyMember {
  locName: string;
  enc: Encounter;
}

interface TeamBuilderProps {
  partyLocations: string[];
  encounters: Record<string, Encounter>;
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

function getRelation(types: string[], attackType: string): Relation {
  if (!types || types.length === 0) return 'neutral';
  const { superWeak, weak, immune, superResist, resist } = getTypeMatchups(types);
  if (superWeak.some(t => t.type === attackType))   return 'superWeak';
  if (weak.some(t => t.type === attackType))         return 'weak';
  if (immune.some(t => t.type === attackType))       return 'immune';
  if (superResist.some(t => t.type === attackType))  return 'superResist';
  if (resist.some(t => t.type === attackType))       return 'resist';
  return 'neutral';
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: PartyMember }) {
  const { enc, locName } = member;
  const data  = pokemonDataCache[enc.pokemonName?.toLowerCase() ?? ''];
  const sprite = enc.pokemonName ? spriteCache[enc.pokemonName.toLowerCase()] : undefined;
  const bst   = data?.stats ? data.stats.reduce((s, st) => s + st.value, 0) : 0;
  const bg    = data?.types?.[0] ? `${TYPE_BG[data.types[0]]}18` : 'transparent';

  return (
    <div className="bg-[#212121] rounded-2xl border border-white/5 p-3 shadow-lg relative overflow-hidden" style={{ backgroundColor: `color-mix(in srgb, ${bg} 30%, #212121)` }}>
      {/* Sprite + name row */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
          {sprite
            ? <img src={sprite} alt={enc.pokemonName} className="w-14 h-14 object-contain drop-shadow-lg" />
            : <div className="w-12 h-12 rounded-full bg-black/30 animate-pulse" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-white truncate leading-tight">
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

      {/* Stats grid */}
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
          <div className="text-[9px] text-gray-700">Loading stats…</div>
        </div>
      )}

      <div className="text-[7px] text-gray-700 truncate mt-1">{locName}</div>
    </div>
  );
}

// ── Empty slot ────────────────────────────────────────────────────────────────

function EmptySlot() {
  return (
    <div className="bg-[#212121] rounded-2xl border border-dashed border-white/8 p-3 flex flex-col items-center justify-center min-h-[158px] gap-1.5">
      <div className="w-8 h-8 rounded-full border border-dashed border-white/15 flex items-center justify-center">
        <span className="text-white/20 text-lg font-black">+</span>
      </div>
      <span className="text-[9px] text-gray-700 font-bold uppercase tracking-widest">Empty</span>
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

  // Build relation matrix: [attackType][memberIndex] = Relation
  const matrix = ALL_TYPES.map(attackType =>
    members.map(m => {
      const types = pokemonDataCache[m.enc.pokemonName?.toLowerCase() ?? '']?.types;
      return types ? getRelation(types, attackType) : 'neutral' as Relation;
    })
  );

  // Sort rows: most dangerous (most weaknesses) first, skip all-neutral
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

  // Summary counts per type row
  const getSummary = (relations: Relation[]) => {
    const weak = relations.filter(r => r === 'weak' || r === 'superWeak').length;
    const resist = relations.filter(r => r === 'resist' || r === 'superResist' || r === 'immune').length;
    const has4x = relations.some(r => r === 'superWeak');
    return { weak, resist, has4x };
  };

  return (
    <div className="bg-[#212121] rounded-2xl border border-white/5 overflow-hidden">
      {/* Column header: mini sprites */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-white/5 bg-black/20">
        <div className="w-[88px] flex-shrink-0" />
        {Array.from({ length: 6 }).map((_, i) => {
          const m = members[i];
          const sprite = m ? spriteCache[m.enc.pokemonName?.toLowerCase() ?? ''] : undefined;
          return (
            <div key={i} className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
              {sprite
                ? <img src={sprite} alt="" className="w-7 h-7 object-contain" />
                : m
                  ? <span className="text-[7px] text-gray-600 font-bold leading-none text-center">{cap(m.enc.pokemonName)?.substring(0, 3)}</span>
                  : <span className="w-5 h-5 rounded border border-dashed border-white/8 block" />
              }
            </div>
          );
        })}
        <div className="w-12 flex-shrink-0" />
      </div>

      {/* Type rows */}
      <div className="divide-y divide-white/3">
        {rows.map(({ type, relations }) => {
          const { weak, resist, has4x } = getSummary(relations);
          const isWeak = weak > 0;
          return (
            <div
              key={type}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 transition-colors',
                isWeak
                  ? has4x ? 'bg-red-500/5' : 'bg-orange-500/5'
                  : 'bg-transparent'
              )}
            >
              {/* Type label */}
              <div className="w-[88px] flex-shrink-0">
                <TypeIcon type={type} size="sm" label={true} />
              </div>

              {/* Relation cells */}
              {Array.from({ length: 6 }).map((_, i) => {
                const rel: Relation = relations[i] ?? 'empty';
                return (
                  <div
                    key={i}
                    className={cn('w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center', RELATION_COLOR[rel])}
                    title={RELATION_LABEL[rel] || '—'}
                  >
                    {rel !== 'neutral' && rel !== 'empty' && (
                      <span className="text-[7px] font-black text-white/90 leading-none">
                        {RELATION_LABEL[rel]}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Summary badge */}
              <div className="w-12 flex-shrink-0 text-right">
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
      <div className="flex items-center gap-3 flex-wrap px-3 py-2.5 border-t border-white/5 bg-black/20">
        {([
          ['superWeak', '4× weak'],
          ['weak', '2× weak'],
          ['resist', '½ resist'],
          ['superResist', '¼ resist'],
          ['immune', 'immune'],
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

export function TeamBuilder({ partyLocations, encounters }: TeamBuilderProps) {
  const members: PartyMember[] = partyLocations
    .map(locName => ({ locName, enc: encounters[locName] }))
    .filter(m => m.enc?.pokemonName) as PartyMember[];

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
            ? <MemberCard key={members[i].locName} member={members[i]} />
            : <EmptySlot key={`empty-${i}`} />
        )}
      </div>

      {/* Coverage matrix header */}
      <div className="flex items-center justify-between pl-1">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Type Coverage</div>
        <div className="text-[9px] text-gray-600">sorted by threat</div>
      </div>

      <CoverageMatrix members={members} />
    </div>
  );
}

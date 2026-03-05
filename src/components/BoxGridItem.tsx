import { Sparkles, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLOR_MAP, cap } from '../constants/gameConstants';
import { TypeIcon } from './TypeIcon';

interface PokemonData {
  sprite?: string;
  types?: string[];
  stats?: { name: string; value: number }[];
}

interface BoxGridItemProps {
  locName: string;
  enc: { pokemonName?: string; nickname?: string; status: string };
  data?: PokemonData;
  isEvolving: boolean;
  onEvolve: () => void;
  onMarkFainted: () => void;
  onOpenDetail: () => void;
}

export function BoxGridItem({
  locName,
  enc,
  data,
  isEvolving,
  onEvolve,
  onMarkFainted,
  onOpenDetail,
}: BoxGridItemProps) {
  const topStats = data?.stats
    ? [...data.stats].sort((a, b) => b.value - a.value).slice(0, 3)
    : [];

  const statusStyle = STATUS_COLOR_MAP[enc.status] || STATUS_COLOR_MAP.None;

  return (
    <div
      className="bg-[#212121] rounded-2xl border border-white/5 p-3 flex flex-col items-center shadow-lg relative overflow-hidden group cursor-pointer active:scale-95 transition-transform"
      onClick={onOpenDetail}
    >
      {/* Background glow */}
      <div className={cn('absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-20', statusStyle.bg)} />

      {/* Type badges */}
      {data?.types && data.types.length > 0 && (
        <div className="absolute top-2 left-2 z-20 flex flex-row gap-0.5">
          {data.types.map(type => (
            <TypeIcon key={type} type={type} size="sm" label={false} />
          ))}
        </div>
      )}

      {/* Evolution flash overlay */}
      {isEvolving && (
        <div className="absolute inset-0 z-30 pointer-events-none evolution-overlay rounded-2xl" />
      )}

      {/* Sprite */}
      <div className="w-18 h-18 mb-1 relative z-10 flex items-center justify-center">
        {data?.sprite ? (
          <img
            src={data.sprite}
            alt={enc.pokemonName}
            className={cn('w-16 h-16 object-contain drop-shadow-xl group-hover:scale-105 transition-transform', isEvolving && 'sprite-evolving')}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-black/20 animate-pulse" />
        )}
      </div>

      {/* Name */}
      <div className="text-center w-full mb-0.5 px-1">
        <div className="text-[10px] font-black text-white truncate">
          {enc.nickname
            ? <>{enc.nickname} <span className="text-gray-500 font-medium">- {cap(enc.pokemonName)}</span></>
            : cap(enc.pokemonName)
          }
        </div>
      </div>

      {/* Location */}
      <div className="w-full text-center mb-1.5">
        <span className="text-[7px] text-gray-600 font-medium truncate block">{locName}</span>
      </div>

      {/* Top stats */}
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

      {/* Action buttons */}
      <div className="w-full grid grid-cols-2 gap-1.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); onEvolve(); }}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 transition-all cursor-pointer active:scale-95"
          title="Evolve"
        >
          <Sparkles className="h-3 w-3" />
          <span className="text-[8px] font-bold">Evolve</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMarkFainted(); }}
          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all cursor-pointer active:scale-95"
          title="Send to Graveyard"
        >
          <Skull className="h-3 w-3" />
          <span className="text-[8px] font-bold">Dead</span>
        </button>
      </div>
    </div>
  );
}

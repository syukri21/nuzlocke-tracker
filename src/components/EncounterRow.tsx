import { cn } from '@/lib/utils';
import { Encounter } from '../types';
import { STATUS_ACTIONS, STATUS_COLOR_MAP, cap } from '../constants/gameConstants';
import { Pokeball } from './Pokeball';
import { PokemonSelect } from './PokemonSelect';

interface EncounterRowProps {
  locName: string;
  enc: Partial<Encounter> & { status: string };
  availablePokemon: { name: string; id: number }[];
  sprite?: string;
  isEditing: boolean;
  onToggleEditing: () => void;
  onStatusAction: (status: string) => void;
  onUpdateEncounter: (partial: Partial<Encounter>) => void;
}

export function EncounterRow({
  locName,
  enc,
  availablePokemon,
  sprite,
  isEditing,
  onToggleEditing,
  onStatusAction,
  onUpdateEncounter,
}: EncounterRowProps) {
  const hasPokemon = !!enc.pokemonName;
  const isMissed = enc.status === 'Missed';
  const statusStyle = STATUS_COLOR_MAP[enc.status] || STATUS_COLOR_MAP.None;

  // ── Collapsed View ────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <div
        onClick={onToggleEditing}
        className={cn(
          'relative bg-[#212121] rounded-xl border px-3 py-2.5 mb-3 last:mb-0 shadow-md flex items-center gap-3 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform',
          isMissed ? 'border-white/5 opacity-50' : 'border-white/5'
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
        <div className={cn('w-10 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden', isMissed && 'grayscale')}>
          {hasPokemon && sprite ? (
            <img src={sprite} alt={enc.pokemonName} className="w-9 h-9 object-contain" />
          ) : hasPokemon ? (
            <span className="text-[10px] text-gray-600 font-bold">{cap(enc.pokemonName)?.substring(0, 3)}</span>
          ) : (
            <Pokeball className="w-6 h-6 opacity-40" />
          )}
        </div>

        {/* Name + route */}
        <div className="flex-1 min-w-0">
          {hasPokemon ? (
            <>
              <div className={cn('text-sm font-bold truncate', isMissed ? 'text-gray-500 line-through' : 'text-white')}>
                {cap(enc.nickname || enc.pokemonName)}
              </div>
              <div className="text-[10px] text-gray-600 truncate">{locName}</div>
            </>
          ) : (
            <div className="text-sm font-semibold text-gray-500 truncate">{locName}</div>
          )}
        </div>

        {/* Status badge */}
        {hasPokemon && enc.status !== 'None' && (
          <div className={cn('px-2 py-1 rounded-md text-[10px] font-bold border border-white/5 flex-shrink-0', statusStyle.bg, statusStyle.text)}>
            {enc.status}
          </div>
        )}
      </div>
    );
  }

  // ── Expanded / Edit Mode ──────────────────────────────────────────────────
  return (
    <div className="bg-[#212121] rounded-xl border border-white/5 p-4 space-y-3 mb-3 last:mb-0 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-bold text-gray-200 text-sm tracking-wide">{locName}</div>
        <button
          onClick={onToggleEditing}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-medium cursor-pointer"
        >
          Done
        </button>
      </div>

      {/* Pokemon sprite preview */}
      {enc.pokemonName && sprite && (
        <div className="flex items-center justify-center p-2 bg-black/20 rounded-lg border border-white/5">
          <img src={sprite} alt={enc.pokemonName} className="w-16 h-16 object-contain drop-shadow-lg" />
        </div>
      )}

      {/* Pokemon Select */}
      <div className="w-full">
        <PokemonSelect
          value={enc.pokemonName || ''}
          onChange={(value) => onUpdateEncounter({ pokemonName: value, status: enc.status === 'None' ? 'None' : enc.status as any })}
          options={availablePokemon}
        />
      </div>

      {/* Nickname input */}
      <input
        type="text"
        placeholder="Nickname (optional)"
        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2.5 px-3 text-xs focus:border-white/20 focus:outline-none transition-colors"
        value={enc.nickname || ''}
        onChange={(e) => onUpdateEncounter({ nickname: e.target.value })}
      />

      {/* Status buttons */}
      <div className="grid grid-cols-3 gap-2">
        {STATUS_ACTIONS.map(({ key, icon: Icon, color, bg, activeBg, label }) => (
          <button
            key={key}
            onClick={() => onStatusAction(key)}
            className={cn(
              'flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer active:scale-95',
              enc.status === key ? `${activeBg} border-white/10` : `${bg} hover:border-white/10`
            )}
          >
            <Icon className={cn('h-5 w-5 mb-1', color)} />
            <span className={cn('text-[10px] font-bold', color)}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

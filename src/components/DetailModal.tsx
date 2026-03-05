import { X, Ruler, Weight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetailData } from '../types';
import { STAT_COLORS, TYPE_BG, getTypeMatchups, cap } from '../constants/gameConstants';
import { TypeIcon } from './TypeIcon';
import moveTypesJson from '../data/move-types.json';

const moveTypes = moveTypesJson as Record<string, string>;

interface DetailModalProps {
  detail: DetailData | null;
  loading: boolean;
  onClose: () => void;
}

export function DetailModal({ detail, loading, onClose }: DetailModalProps) {
  if (!detail && !loading) return null;

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

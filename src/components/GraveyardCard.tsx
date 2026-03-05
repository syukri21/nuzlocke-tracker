import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SNOWFLAKES, playSadMelody } from '../constants/gameConstants';

interface GraveyardCardProps {
  locName: string;
  enc: { pokemonName?: string; nickname?: string; status: string };
  sprite?: string;
}

export function GraveyardCard({ locName, enc, sprite }: GraveyardCardProps) {
  const [tribute, setTribute] = useState(false);

  const handleTap = () => {
    if (tribute) return;
    setTribute(true);
    playSadMelody();
  };

  return (
    <div className={cn(
      'relative bg-[#212121] rounded-xl border border-white/5 p-4 transition-colors duration-[2000ms]',
      tribute && 'border-blue-900/30 bg-[#181820]'
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
            <Skull className={cn('h-7 w-7 transition-colors duration-[3000ms]', tribute ? 'text-gray-600' : 'text-gray-700')} />
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {enc.nickname && (
            <div className={cn('text-base font-black truncate transition-colors duration-[2000ms]', tribute ? 'text-gray-500' : 'text-gray-300')}>
              {enc.nickname}
            </div>
          )}
          <div className={cn('font-bold truncate transition-colors duration-[2000ms]', enc.nickname ? 'text-xs text-gray-600' : 'text-sm text-gray-400')}>
            {enc.pokemonName}
          </div>
          <div className="text-[10px] text-gray-700 mt-0.5 truncate">First met at {locName}</div>
          {tribute && (
            <div className="text-[9px] text-blue-400/40 mt-1 font-medium">Remembered forever</div>
          )}
        </div>

        <Skull className={cn('h-4 w-4 flex-shrink-0 transition-colors duration-[2000ms]', tribute ? 'text-gray-700' : 'text-red-900/60')} />
      </div>
    </div>
  );
}

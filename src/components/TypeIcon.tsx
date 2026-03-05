import { cn } from '@/lib/utils';
import { TYPE_BG } from '../constants/gameConstants';

interface TypeIconProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
  label?: boolean;
}

export function TypeIcon({ type, size = 'md', label = true }: TypeIconProps) {
  const bg = TYPE_BG[type] || '#9099A1';

  const dims = label
    ? (size === 'sm' ? 'h-4 px-1.5 gap-1' : size === 'lg' ? 'h-7 px-2.5 gap-1.5' : 'h-5 px-2 gap-1')
    : (size === 'sm' ? 'h-4 w-4'           : size === 'lg' ? 'h-7 w-7'            : 'h-5 w-5');

  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';
  const textSize = size === 'sm' ? 'text-[7px]'   : size === 'lg' ? 'text-[11px]' : 'text-[9px]';

  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full font-bold uppercase tracking-wide text-white', dims)}
      style={{ backgroundColor: bg }}
      title={type}
    >
      <img
        src={`${import.meta.env.BASE_URL}type-icons/${type}.svg`}
        alt=""
        className={cn('object-contain flex-shrink-0', iconSize)}
      />
      {label && <span className={textSize}>{type}</span>}
    </span>
  );
}

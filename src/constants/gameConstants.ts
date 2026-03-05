import { CheckCircle2, Skull, CircleSlash, Copy, Gift, Sparkles } from 'lucide-react';

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Capitalise the first letter of every word (space- or hyphen-separated). */
export function cap(s?: string): string {
  if (!s) return '';
  return s.replace(/(^|[\s-])(\w)/g, (_, sep, c) => sep + c.toUpperCase());
}

// ── Status ────────────────────────────────────────────────────────────────────

export const STATUS_ACTIONS = [
  { key: 'Caught',  icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20', activeBg: 'bg-emerald-500/30', label: 'Catch' },
  { key: 'Fainted', icon: Skull,        color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/20',         activeBg: 'bg-red-500/30',     label: 'Dead'  },
  { key: 'Missed',  icon: CircleSlash,  color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/20',   activeBg: 'bg-orange-500/30',  label: 'Miss'  },
  { key: 'Dupe',    icon: Copy,         color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/20',   activeBg: 'bg-yellow-500/30',  label: 'Dupe'  },
  { key: 'Gift',    icon: Gift,         color: 'text-purple-400',  bg: 'bg-purple-500/15 border-purple-500/20',   activeBg: 'bg-purple-500/30',  label: 'Gift'  },
  { key: 'Shiny',   icon: Sparkles,     color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/20',       activeBg: 'bg-cyan-500/30',    label: 'Shiny' },
] as const;

export const STATUS_COLOR_MAP: Record<string, { text: string; bg: string }> = {
  Caught:  { text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  Fainted: { text: 'text-red-400',     bg: 'bg-red-500/20'     },
  Missed:  { text: 'text-orange-400',  bg: 'bg-orange-500/20'  },
  Dupe:    { text: 'text-yellow-400',  bg: 'bg-yellow-500/20'  },
  Gift:    { text: 'text-purple-400',  bg: 'bg-purple-500/20'  },
  Shiny:   { text: 'text-cyan-400',    bg: 'bg-cyan-500/20'    },
  None:    { text: 'text-gray-400',    bg: 'bg-gray-500/20'    },
};

// ── Type colours ──────────────────────────────────────────────────────────────

export const TYPE_BG: Record<string, string> = {
  normal:   '#9099A1', fire:     '#FF9C54', water:    '#4D90D5',
  electric: '#F3D23B', grass:    '#63BB5B', ice:      '#74CEC0',
  fighting: '#CE4069', poison:   '#AB6AC8', ground:   '#D97845',
  flying:   '#8FA8DD', psychic:  '#F97176', bug:      '#90C12C',
  rock:     '#C8B686', ghost:    '#5269AC', dragon:   '#0B6DC3',
  dark:     '#5A5366', steel:    '#5A8EA2', fairy:    '#EC8FE6',
};

export const TYPE_COLORS: Record<string, string> = {
  normal:   'bg-gray-500',   fire:     'bg-orange-500', water:    'bg-blue-500',
  electric: 'bg-yellow-400', grass:    'bg-green-500',  ice:      'bg-cyan-400',
  fighting: 'bg-red-700',    poison:   'bg-purple-500', ground:   'bg-yellow-600',
  flying:   'bg-indigo-400', psychic:  'bg-pink-500',   bug:      'bg-lime-500',
  rock:     'bg-yellow-700', ghost:    'bg-purple-700', dragon:   'bg-indigo-600',
  dark:     'bg-gray-700',   steel:    'bg-slate-400',  fairy:    'bg-pink-400',
};

// ── Type chart ────────────────────────────────────────────────────────────────

const DEFENDER_CHART: Record<string, { weak: string[]; resist: string[]; immune: string[] }> = {
  normal:   { weak: ['fighting'],                               resist: [],                                                         immune: ['ghost']              },
  fire:     { weak: ['water', 'ground', 'rock'],                resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],          immune: []                     },
  water:    { weak: ['electric', 'grass'],                      resist: ['fire', 'water', 'ice', 'steel'],                          immune: []                     },
  electric: { weak: ['ground'],                                 resist: ['electric', 'flying', 'steel'],                            immune: []                     },
  grass:    { weak: ['fire', 'ice', 'poison', 'flying', 'bug'], resist: ['water', 'electric', 'grass', 'ground'],                   immune: []                     },
  ice:      { weak: ['fire', 'fighting', 'rock', 'steel'],      resist: ['ice'],                                                    immune: []                     },
  fighting: { weak: ['flying', 'psychic', 'fairy'],             resist: ['bug', 'rock', 'dark'],                                    immune: []                     },
  poison:   { weak: ['ground', 'psychic'],                      resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'],            immune: []                     },
  ground:   { weak: ['water', 'grass', 'ice'],                  resist: ['poison', 'rock'],                                         immune: ['electric']           },
  flying:   { weak: ['electric', 'ice', 'rock'],                resist: ['grass', 'fighting', 'bug'],                               immune: ['ground']             },
  psychic:  { weak: ['bug', 'ghost', 'dark'],                   resist: ['fighting', 'psychic'],                                    immune: []                     },
  bug:      { weak: ['fire', 'flying', 'rock'],                 resist: ['grass', 'fighting', 'ground'],                            immune: []                     },
  rock:     { weak: ['water', 'grass', 'fighting', 'ground', 'steel'], resist: ['normal', 'fire', 'poison', 'flying'],              immune: []                     },
  ghost:    { weak: ['ghost', 'dark'],                          resist: ['poison', 'bug'],                                          immune: ['normal', 'fighting'] },
  dragon:   { weak: ['ice', 'dragon', 'fairy'],                 resist: ['fire', 'water', 'electric', 'grass'],                     immune: []                     },
  dark:     { weak: ['fighting', 'bug', 'fairy'],               resist: ['ghost', 'dark'],                                          immune: ['psychic']            },
  steel:    { weak: ['fire', 'fighting', 'ground'],             resist: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune: ['poison'] },
  fairy:    { weak: ['poison', 'steel'],                        resist: ['fighting', 'bug', 'dark'],                                immune: ['dragon']             },
};

export const ALL_TYPES = [
  'normal','fire','water','electric','grass','ice','fighting','poison',
  'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy',
];

export function getTypeMatchups(types: string[]) {
  const all = ALL_TYPES.map(attackType => {
    const mult = types.reduce((acc, defType) => {
      const chart = DEFENDER_CHART[defType];
      if (!chart) return acc;
      if (chart.immune.includes(attackType)) return acc * 0;
      if (chart.weak.includes(attackType)) return acc * 2;
      if (chart.resist.includes(attackType)) return acc * 0.5;
      return acc;
    }, 1);
    return { type: attackType, multiplier: mult };
  });
  return {
    superWeak:   all.filter(t => t.multiplier === 4),
    weak:        all.filter(t => t.multiplier === 2),
    resist:      all.filter(t => t.multiplier === 0.5),
    superResist: all.filter(t => t.multiplier === 0.25),
    immune:      all.filter(t => t.multiplier === 0),
  };
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export const STAT_COLORS: Record<string, string> = {
  HP:           'bg-red-500',
  ATTACK:       'bg-orange-500',
  DEFENSE:      'bg-yellow-500',
  'SP.ATTACK':  'bg-blue-500',
  'SP.DEFENSE': 'bg-green-500',
  SPEED:        'bg-pink-500',
};

export const STAT_NAME_MAP: Record<string, string> = {
  hp:              'HP',
  attack:          'ATTACK',
  defense:         'DEFENSE',
  'special-attack':  'SP.ATTACK',
  'special-defense': 'SP.DEFENSE',
  speed:           'SPEED',
};

// ── Graveyard snow ────────────────────────────────────────────────────────────

export const SNOWFLAKES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 5,
  char: ['❄', '❅', '❆', '·'][Math.floor(Math.random() * 4)],
}));

export function playSadMelody() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const notes = [
    { freq: 440.00, t: 0.0  },
    { freq: 392.00, t: 0.75 },
    { freq: 349.23, t: 1.50 },
    { freq: 329.63, t: 2.25 },
    { freq: 293.66, t: 3.00 },
    { freq: 261.63, t: 3.75 },
    { freq: 246.94, t: 4.50 },
    { freq: 220.00, t: 5.50 },
  ];
  notes.forEach(({ freq, t }, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5;
    vibratoGain.gain.value = 3;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const isLast = i === notes.length - 1;
    const dur = isLast ? 2.5 : 0.7;
    const start = ctx.currentTime + t;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.12);
    gain.gain.linearRampToValueAtTime(0.09, start + dur - 0.15);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    vibrato.start(start);
    osc.start(start);
    osc.stop(start + dur);
    vibrato.stop(start + dur);
  });
}

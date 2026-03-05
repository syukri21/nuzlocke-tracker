import { useState } from 'react';
import locationsData from '../data/locations.json';
import bossesData from '../data/bosses.json';

const GAME_DATA_KEY = 'lazarus_game_data';

type Location = typeof locationsData.locations[number];
type Boss = typeof bossesData.bosses[number];

interface GameData {
  locations: Location[];
  bosses: Boss[];
}

const DEFAULT_GAME_DATA: GameData = {
  locations: locationsData.locations,
  bosses: bossesData.bosses as Boss[],
};

export function useGameData() {
  const [gameData, setGameData] = useState<GameData>(() => {
    const saved = localStorage.getItem(GAME_DATA_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.locations) && Array.isArray(parsed.bosses)) {
          return { locations: parsed.locations, bosses: parsed.bosses };
        }
      } catch { /* fall through */ }
    }
    return DEFAULT_GAME_DATA;
  });

  const [isCustom, setIsCustom] = useState(() => !!localStorage.getItem(GAME_DATA_KEY));

  const importGameData = (jsonText: string): void => {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.locations) || !Array.isArray(parsed.bosses)) {
      throw new Error('Invalid format: expected { locations: [], bosses: [] }');
    }
    const data: GameData = { locations: parsed.locations, bosses: parsed.bosses };
    localStorage.setItem(GAME_DATA_KEY, JSON.stringify(data));
    setGameData(data);
    setIsCustom(true);
  };

  const exportGameData = () => {
    const data = {
      meta: {
        game: 'Pokemon Lazarus',
        version: '1.0.0',
        description: 'Game data for Pokemon Lazarus Nuzlocke Tracker.',
        schema: '1',
      },
      locations: gameData.locations,
      bosses: gameData.bosses,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lazarus-game-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetGameData = () => {
    localStorage.removeItem(GAME_DATA_KEY);
    setGameData(DEFAULT_GAME_DATA);
    setIsCustom(false);
  };

  return { gameData, isCustom, importGameData, exportGameData, resetGameData };
}

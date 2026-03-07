import { useState } from 'react';
import locationsData from '../data/locations.json';
import bossesData from '../data/bosses.json';

const GAME_DATA_KEY = 'lazarus_game_data';

type Boss = typeof bossesData.bosses[number];

export interface EncounterEntry { name: string; id: number; locStr?: string; }
export interface GameLocation { name: string; encounters: Record<string, EncounterEntry[]>; }

interface GameData {
  locations: GameLocation[];
  bosses: Boss[];
}

const getDefaultGameData = (): GameData => ({
  locations: locationsData.locations as GameLocation[],
  bosses: bossesData.bosses as Boss[],
});

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
    return getDefaultGameData();
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
    setGameData(getDefaultGameData());
    setIsCustom(false);
  };

  const addLocation = (name: string, insertAfterName: string | null) => {
    setGameData(prev => {
      const newLoc = { name, encounters: { Wild: [] as { name: string; id: number; locStr?: string }[] } };
      const newLocations = [...prev.locations];
      const idx = insertAfterName ? newLocations.findIndex(l => l.name === insertAfterName) : -1;
      if (idx >= 0) newLocations.splice(idx + 1, 0, newLoc);
      else newLocations.push(newLoc);
      const updated = { ...prev, locations: newLocations };
      localStorage.setItem(GAME_DATA_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsCustom(true);
  };

  const addPokemonToLocation = (locName: string, pokemon: { name: string; id: number }) => {
    setGameData(prev => {
      const newLocations = prev.locations.map(loc => {
        if (loc.name !== locName) return loc;
        const existing = (loc.encounters['Wild'] || []) as { name: string; id: number }[];
        if (existing.some(p => p.name === pokemon.name)) return loc;
        return { ...loc, encounters: { ...loc.encounters, Wild: [...existing, pokemon] } };
      });
      const updated = { ...prev, locations: newLocations };
      localStorage.setItem(GAME_DATA_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsCustom(true);
  };

  const setAllPokemonForLocation = (locName: string, pokemon: { name: string; id: number }[]) => {
    setGameData(prev => {
      const newLocations = prev.locations.map(loc => {
        if (loc.name !== locName) return loc;
        return { ...loc, encounters: { ...loc.encounters, Wild: pokemon } };
      });
      const updated = { ...prev, locations: newLocations };
      localStorage.setItem(GAME_DATA_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsCustom(true);
  };

  const removeLocation = (locName: string) => {
    setGameData(prev => {
      const newLocations = prev.locations.filter(loc => loc.name !== locName);
      const updated = { ...prev, locations: newLocations };
      localStorage.setItem(GAME_DATA_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsCustom(true);
  };

  return { gameData, isCustom, importGameData, exportGameData, resetGameData, addLocation, addPokemonToLocation, setAllPokemonForLocation, removeLocation };
}

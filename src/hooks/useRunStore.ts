import { useState, useEffect } from 'react';
import { RunState, Encounter, PokemonStatus } from '../types';

const INITIAL_STATE: RunState = {
  playerName: 'Trainer',
  difficulty: 'Normal',
  encounters: {},
  party: [],
  box: [],
  graveyard: []
};

export function useRunStore() {
  const [state, setState] = useState<RunState>(() => {
    const saved = localStorage.getItem('lazarus_nuzlocke_run');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('lazarus_nuzlocke_run', JSON.stringify(state));
  }, [state]);

  const updateEncounter = (locationName: string, encounter: Partial<Encounter>) => {
    setState(prev => {
      const existing = prev.encounters[locationName] || { 
        locationName, 
        status: 'None', 
        isPartyMember: false 
      };
      const updated = { ...existing, ...encounter };
      
      const newEncounters = { ...prev.encounters, [locationName]: updated };
      
      // Update collections based on status
      let newParty = [...prev.party];
      let newBox = [...prev.box];
      let newGraveyard = [...prev.graveyard];

      // Remove from everywhere first
      newParty = newParty.filter(loc => loc !== locationName);
      newBox = newBox.filter(loc => loc !== locationName);
      newGraveyard = newGraveyard.filter(loc => loc !== locationName);

      if (updated.status === 'Caught') {
        if (updated.isPartyMember) {
          newParty.push(locationName);
        } else {
          newBox.push(locationName);
        }
      } else if (updated.status === 'Fainted') {
        newGraveyard.push(locationName);
      }

      return {
        ...prev,
        encounters: newEncounters,
        party: newParty.slice(0, 6), // Max 6 in party
        box: newBox,
        graveyard: newGraveyard
      };
    });
  };

  const moveToParty = (locationName: string) => {
    updateEncounter(locationName, { isPartyMember: true, status: 'Caught' });
  };

  const moveToBox = (locationName: string) => {
    updateEncounter(locationName, { isPartyMember: false, status: 'Caught' });
  };

  const markFainted = (locationName: string, cause?: string, killer?: string) => {
    updateEncounter(locationName, { status: 'Fainted', causeOfDeath: cause, killer, isPartyMember: false });
  };

  return {
    state,
    updateEncounter,
    moveToParty,
    moveToBox,
    markFainted
  };
}

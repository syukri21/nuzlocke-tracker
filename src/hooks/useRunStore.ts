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

      const wasInParty = prev.party.includes(locationName);
      const wasInBox = prev.box.includes(locationName);
      const wasInGraveyard = prev.graveyard.includes(locationName);

      const isCaughtCategory = updated.status === 'Caught' || updated.status === 'Gift' || updated.status === 'Shiny';
      const shouldBeInParty = isCaughtCategory && updated.isPartyMember;
      const shouldBeInBox = isCaughtCategory && !updated.isPartyMember;
      const shouldBeInGraveyard = updated.status === 'Fainted';

      // 1. Handle Party
      if (shouldBeInParty) {
        if (!wasInParty) {
          newParty.push(locationName);
          newBox = newBox.filter(loc => loc !== locationName);
          newGraveyard = newGraveyard.filter(loc => loc !== locationName);
        }
      } else {
        newParty = newParty.filter(loc => loc !== locationName);
      }

      // 2. Handle Box
      if (shouldBeInBox) {
        if (!wasInBox) {
          newBox.push(locationName);
          newGraveyard = newGraveyard.filter(loc => loc !== locationName);
        }
      } else {
        newBox = newBox.filter(loc => loc !== locationName);
      }

      // 3. Handle Graveyard
      if (shouldBeInGraveyard) {
        if (!wasInGraveyard) {
          newGraveyard.push(locationName);
        }
      } else {
        newGraveyard = newGraveyard.filter(loc => loc !== locationName);
      }

      return {
        ...prev,
        encounters: newEncounters,
        party: newParty.slice(0, 6),
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

  const resetRun = () => {
    localStorage.removeItem('lazarus_nuzlocke_run');
    setState(INITIAL_STATE);
  };

  return {
    state,
    updateEncounter,
    moveToParty,
    moveToBox,
    markFainted,
    resetRun
  };
}

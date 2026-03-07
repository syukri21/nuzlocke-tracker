export type PokemonStatus = 'Caught' | 'Fainted' | 'Dupe' | 'Shiny' | 'Gift' | 'Missed' | 'None';

export interface Encounter {
  locationName: string;
  pokemonName?: string;
  status: PokemonStatus;
  nickname?: string;
  causeOfDeath?: string;
  killer?: string;
  isPartyMember: boolean;
  caughtAt?: number;
  moves?: string[];
}

export interface EncounterOption {
  name: string;
  id: number;
  locStr?: string;
}

export interface Location {
  name: string;
  encounters: {
    [method: string]: EncounterOption[];
  };
}

export interface Boss {
  name: string;
  location: string;
  levelCap: number;
  keyPokemon: string[];
}

export interface BossPokemon {
  name: string;
  level: number;
  heldItem: string | null;
  ability: string | null;
  moves: string[];
  isLead: boolean;
  isAce: boolean;
}

export interface BossEntry {
  name: string;
  location: string;
  levelCap: number;
  trainerType: string;
  items?: string;
  pokemon: BossPokemon[];
}

export interface DetailData {
  sprite: string;
  name: string;
  nickname?: string;
  types: string[];
  stats: { name: string; value: number }[];
  abilities: string[];
  height: number;
  weight: number;
  evolutionLine?: string[];
  moves?: string[];
  heldItem?: string | null;
}

export interface RunState {
  playerName: string;
  difficulty: 'Normal' | 'Hardcore';
  encounters: Record<string, Encounter>;
  party: string[]; // List of location names (as keys for encounters)
  box: string[];   // List of location names
  graveyard: string[]; // List of location names
}

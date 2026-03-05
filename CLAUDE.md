# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server (localhost:5173)
npm run build        # tsc + vite build (runs type-check first)
npm run lint         # eslint, zero warnings allowed
npm run preview      # serve dist/ on 0.0.0.0 for mobile testing

# Data scripts (run with node, not npm)
node scripts/generate-game-data.mjs   # regenerate public/lazarus-default.json from src/data/
node scripts/scrape-pokemon.mjs       # re-scrape pokemon-cache.json from PokeAPI
node scripts/scrape-move-types.mjs    # re-scrape move-types.json from PokeAPI
```

**Deployment:** push to `master` → GitHub Actions builds with `BASE_URL=/nuzlocke-tracker/` → deploys to `syukri21.github.io/nuzlocke-tracker/`.

Local dev uses `BASE_URL=/` (default). All asset paths that go into HTML/CSS must use `${import.meta.env.BASE_URL}` prefix (e.g. type icons).

## Architecture

### Data flow

The app has two separate persistence layers:

1. **Game data** (locations + bosses) — static JSON bundled at build time, overridable by the user uploading a custom JSON. Managed by `src/hooks/useGameData.ts` which reads from `localStorage` key `lazarus_game_data` and falls back to the bundled files.

2. **Run state** (encounters, party, box, graveyard) — mutable user data persisted to `localStorage` key `lazarus_nuzlocke_run` via `src/hooks/useRunStore.ts`.

### Pokemon data cache

Pokémon sprites, stats, and types are served from a bundled snapshot (`src/data/pokemon-cache.json`, 329 Pokémon pre-scraped from PokeAPI). On startup, `initPokemonCache()` loads this into three in-memory module-level Maps exported from `PokemonSelect.tsx`:

- `pokemonDataCache` — `Record<string, { sprite, stats, types, evolutionLine }>`
- `spriteCache` — `Record<string, string>` (sprite URL shortcut)
- `evolutionLineCache` — `Record<string, string[]>`

**All cache lookups must use `.toLowerCase()` keys.** If a Pokémon is missing from the cache (e.g. a post-evolution that wasn't in locations.json), `fetchPokemonData()` fetches it live from PokeAPI and fills the cache.

### Component tree

```
App.tsx                        — state wiring, routing between tabs, evolution logic
├── constants/gameConstants.ts — TYPE_BG, STATUS_ACTIONS, type chart, getTypeMatchups,
│                                STAT_COLORS, STAT_NAME_MAP, SNOWFLAKES, playSadMelody, cap()
├── hooks/useRunStore.ts        — encounter CRUD, party/box/graveyard state
├── hooks/useGameData.ts        — game data (locations+bosses) with import/export
│
├── components/EncounterRow.tsx — collapsed/expanded encounter card (Nuzlocke tab)
├── components/BoxGridItem.tsx  — box grid card with evolve + mark fainted
├── components/GraveyardCard.tsx— tribute animation (snow portal + sad melody)
├── components/DetailModal.tsx  — bottom-sheet Pokémon detail (stats, moves, type chart)
├── components/TeamBuilder.tsx  — party grid + type coverage matrix + box picker modal
├── components/TypeIcon.tsx     — type badge (icon + label, 3 sizes)
├── components/Pokeball.tsx     — SVG Pokéball
└── components/PokemonSelect.tsx— searchable dropdown + all PokeAPI fetch logic
```

`App.tsx` is the only component that holds state. All others are pure/presentational and receive data + callbacks via props.

### Key conventions

- **`cap(s)`** from `gameConstants.ts` — use for every displayed Pokémon/nickname name. Capitalises first letter of each word and each hyphen-segment (`mr-mime` → `Mr-Mime`).
- **Type icons** must use `${import.meta.env.BASE_URL}type-icons/${type}.svg` (not `/type-icons/...`) because of the GitHub Pages subdirectory base path.
- **Android Chrome audio** — `AudioContext` must be constructed synchronously inside the click handler, before any `await`, or the user-gesture lock is lost.
- **`createPortal`** is used for overlays that must escape the mobile container (snow effect, box picker modal). Import from `react-dom`.
- The `state.party` array stores location names (not Pokémon names). All collections (party, box, graveyard) are arrays of location names used as keys into `state.encounters`.

### Game data format

`public/lazarus-default.json` (and `localStorage` override) follows:
```json
{
  "meta": { "game": "Pokemon Lazarus", "schema": "1", ... },
  "locations": [{ "name": "...", "encounters": { "Method": [{ "name", "id", "locStr" }] } }],
  "bosses": [{ "name", "location", "levelCap", "trainerType", "items", "pokemon": [{ "name", "level", "heldItem", "ability", "moves", "isLead", "isAce" }] }]
}
```
Run `node scripts/generate-game-data.mjs` to regenerate this file from `src/data/locations.json` + `src/data/bosses.json`.

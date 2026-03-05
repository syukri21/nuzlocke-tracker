
## PRD: Pokémon Lazarus Nuzlocke Tracker

**Objective:** Provide a mobile/web application that allows players to track encounters, deaths, and team composition specifically for the Pokémon Lazarus fan game.

---

## 1. Core Functional Requirements

### 1.1 Custom Lazarus Database

Unlike standard trackers, this must support the **Lazarus-specific metadata**:

* **Regional Forms:** Support for Lazarus-only variants (e.g., Lazarus Arcanine).
* **Modified Types:** Accuracy regarding any type-chart changes unique to the fan game.
* **Location Mapping:** A pre-loaded list of every route, cave, and city in the Lazarus region.

### 1.2 Encounter Management

* **Status Tracking:** Mark encounters as *Caught, Fainted, Dupe, Shiny,* or *Gift*.
* **Area Filtering:** Automatically hide locations once an encounter is recorded.
* **Level Caps:** A reference guide showing the "Ace" Pokémon level for the next boss (Gym Leaders, Rival, Evil Team Admins).

### 1.3 Team & PC Management

* **The Graveyard:** A dedicated section for fainted Pokémon, including "Cause of Death" and "Killer Pokémon" notes.
* **Team Builder:** Visual display of current party types to identify defensive weaknesses (e.g., "Your team is 3x weak to Fairy").
* **Box Storage:** Track Pokémon that are alive but not currently in the party.

---

## 2. Technical Features & UI

| Feature | Requirement |
| --- | --- |
| **Cloud Sync** | Allow users to save their run progress across mobile and desktop. |
| **Ruleset Customization** | Toggle for *Dupes Clause, Shiny Clause, Level Caps,* and *Hardcore Mode*. |
| **Image Export** | Generate a "Run Summary" graphic (Infographic) showing the team and the graveyard for sharing on social media/Reddit. |
| **Search/Filter** | Quick search for Pokémon by name, type, or ability within the Lazarus Pokédex. |

---

## 3. User Flow

1. **Start Run:** User selects "New Run," chooses a difficulty (Normal/Hardcore), and names their character.
2. **Log Encounter:** User enters a new route -> Clicks "Add Encounter" -> Selects Pokémon from a dropdown (filtered by that route's spawn table) -> Assigns status.
3. **Update Party:** User drags Pokémon from "Box" to "Party."
4. **The Faint:** User clicks the "Skull" icon on a Pokémon -> Enters death details (Optional: "Died to a crit from Boss X") -> Pokémon moves to Graveyard.

---

## 4. Proposed Layout (Sitemap)

* **Dashboard:** Current Party, Next Gym Leader info, and "Quick Add" encounter button.
* **Route List:** Scrollable list of all locations in the Lazarus region.
* **Pokédex:** Lazarus-specific base stats, abilities, and evolution methods.
* **Statistics:** Win/Loss ratio, most common cause of death, and "MVP" (most battles participated in).

---

## 5. Next Steps for Development

> **Important Note:** To make this truly "Lazarus-ready," we need the **Encounter Table data** (which Pokémon appear where and at what % rates).

**Would you like me to create a data schema (JSON/SQL) for how the encounter tables should be structured for the app?**

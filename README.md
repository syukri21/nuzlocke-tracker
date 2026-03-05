<div align="center">

```
 ██████╗  ██████╗ ██╗  ██╗███████╗██████╗  █████╗ ██╗     ██╗
 ██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝██╔══██╗██╔══██╗██║     ██║
 ██████╔╝██║   ██║█████╔╝ █████╗  ██║  ██║███████║██║     ██║
 ██╔═══╝ ██║   ██║██╔═██╗ ██╔══╝  ██║  ██║██╔══██║██║     ╚═╝
 ██║     ╚██████╔╝██║  ██╗███████╗██████╔╝██║  ██║███████╗██╗
 ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝
```

# 🔴 Pokémon Lazarus — Nuzlocke Tracker

> *"A Pokémon that has fainted will never come back. Choose wisely, Trainer."*

[![Deploy](https://github.com/syukri21/nuzlocke-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/syukri21/nuzlocke-tracker/actions/workflows/deploy.yml)
[![Live](https://img.shields.io/badge/▶%20Play%20Live-GitHub%20Pages-brightgreen?style=flat)](https://syukri21.github.io/nuzlocke-tracker/)
[![PWA](https://img.shields.io/badge/📱%20PWA-Installable-blue?style=flat)](https://syukri21.github.io/nuzlocke-tracker/)

</div>

---

## 🗺️ What is this?

A **mobile-first Progressive Web App** for tracking your Pokémon Lazarus Nuzlocke run. Built to feel like a real Pokédex — dark theme, smooth animations, and all your run data saved locally on device.

Install it on Android or iOS from your browser — no app store needed.

---

## ⚔️ Features

### 📋 Nuzlocke Tab
- 48 locations from Pokémon Lazarus, synced with encounter tables
- Tap any route to expand and set your encounter
- Status actions: **Caught · Missed · Gift · Shiny · Fainted**
- Nickname your Pokémon
- Upcoming filter shows only routes you haven't hit yet

### 📦 Box
- Grid view of all your living Pokémon
- Base stats pulled from PokéAPI with top-3 stat display
- Type badges with colored icons
- **Evolve button** — plays the Pokémon's cry + white flash evolution animation
- Send to graveyard directly from the box

### 💀 Graveyard
- Every fallen Pokémon remembered
- Tap their image → snow falls across the screen, a sad melody plays, and their portrait slowly fades to grey
- *"First met at [location]"*

### 🏆 Bosses
- All 29 bosses — Gym Leaders, Elite 4, Team Chimera, Champion
- Full team data: levels, abilities, held items, moves with type icons
- Ace Pokémon highlighted in gold, lead Pokémon marked in blue
- Tap any Pokémon for full detail sheet

### 🔍 Detail Modal
- Sprite + types + base stats
- Type matchups: Super Weak · Weak · Resist · Super Resist · Immune
- Boss Pokémon show their actual moves with type-colored pills

---

## 📱 Install as App (PWA)

1. Open **[syukri21.github.io/nuzlocke-tracker](https://syukri21.github.io/nuzlocke-tracker/)** in Chrome on Android
2. Tap the menu `⋮` → **"Add to Home Screen"**
3. Launch from your home screen — no browser bar, fullscreen, works offline ✓

---

## 🛠️ Tech Stack

| | |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS v4 |
| **Data** | PokéAPI (cached to localStorage) |
| **Audio** | Web Audio API (Pokémon cries + evolution) |
| **PWA** | vite-plugin-pwa + Workbox |
| **Deploy** | GitHub Actions → GitHub Pages |

---

## 🚀 Run Locally

```bash
# Clone
git clone https://github.com/syukri21/nuzlocke-tracker.git
cd nuzlocke-tracker

# Install
npm install

# Dev server
npm run dev

# Build
npm run build
```

---

## 📂 Project Structure

```
src/
├── App.tsx                  # Main app + all UI components
├── components/
│   └── PokemonSelect.tsx    # Pokémon selector + cache layer
├── hooks/
│   └── useRunStore.ts       # Run state + localStorage persistence
├── data/
│   ├── locations.json       # 48 Lazarus locations + encounters
│   ├── bosses.json          # 29 bosses with full team data
│   ├── pokemon-cache.json   # 329 Pokémon pre-scraped from PokéAPI
│   └── move-types.json      # 313 move → type mappings
└── lib/
    └── initPokemonCache.ts  # Cache init on startup

scripts/
├── scrape-pokemon.mjs       # Scrape Pokémon data from PokéAPI
├── scrape-move-types.mjs    # Scrape move types from PokéAPI
├── parse-boss-list.mjs      # Parse boss TSV into JSON
└── download-type-icons.mjs  # Download SVG type icons
```

---

## ⚠️ Nuzlocke Rules Reminder

```
1. You may only catch the first Pokémon encountered in each area.
2. If a Pokémon faints, it is considered dead — release or box it permanently.
3. Nickname every Pokémon to build a bond.
4. Good luck, Trainer. You'll need it.
```

---

<div align="center">

*Made with ❤️ for the Pokémon Lazarus community*

`ᵔᴥᵔ` &nbsp; **May your team never see the graveyard** &nbsp; `ᵔᴥᵔ`

</div>

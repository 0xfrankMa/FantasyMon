# FantasyMon — Game Design Document

**Date**: 2026-03-01
**Stack**: React 18 + PixiJS 7 + TypeScript (Monorepo via Turborepo + pnpm)
**Platform**: Browser (Vite)

---

## 1. Concept

FantasyMon is a pet-raising roguelike browser game. The core loop blends:

- **Pokémon-style pet system** — species, types, natures, IVs/EVs, skills, evolution
- **Auto-battle (auto-chess)** — combat order determined by speed, fully automatic
- **Roguelike progression** — in-run dungeon with branching nodes and buffs; out-of-run persistent meta-game

The key to the game's success is the variety of pet species and the synergies / bonds between different pets and types.

---

## 2. Project Structure

Monorepo layout:

```
fantasymon/
├── packages/
│   ├── core/          # Pure TypeScript, zero runtime dependencies
│   │   ├── data/      # Species, skills, items definitions (TS/JSON)
│   │   ├── engine/    # Battle simulator, run state machine, roguelike logic
│   │   └── types/     # Shared type definitions
│   ├── ui/            # React 18 + Tailwind CSS
│   │   ├── metagame/  # Out-of-run: training, evolution, fusion, team builder
│   │   └── hud/       # In-run HUD: HP bars, buff list, stage progress
│   └── battle/        # PixiJS 7
│       ├── renderer/  # Sprite animations, VFX
│       └── timeline/  # Turn timeline, speed-ordered action display
└── apps/
    └── web/           # Vite entry point, localStorage save file
```

**Data persistence (MVP)**: `localStorage` with shape `SaveFile { roster, activeTeam, runState }`.

---

## 3. Core Data Model

### Pet

```typescript
interface Pet {
  id: string
  speciesId: string
  nickname?: string
  level: number            // 1–100
  exp: number
  nature: Nature           // 25 natures, random on capture
  ivs: StatBlock           // Random 0–31, permanent ceiling
  evs: StatBlock           // Earned via training items
  skills: SkillSlot[4]
  evolutionStage: number
}
```

### Species

```typescript
interface Species {
  id: string
  name: string
  type1: ElementType
  type2?: ElementType
  baseStats: StatBlock
  evolutions: EvolutionPath[]
  learnset: LearnsetEntry[]
  rarity: Rarity           // Common | Rare | Epic | Legendary
}
```

### Element Types (8)

Fire · Water · Grass · Electric · Dark · Light · Steel · Dragon

Type matchups stored as an 8×8 multiplier matrix (0.5 / 1.0 / 2.0).

### Nature (25)

Each nature boosts one stat by +5% and reduces another by −5% (mirrors Pokémon mechanic).

### Skill

```typescript
interface Skill {
  id: string
  name: string
  type: ElementType
  power: number
  accuracy: number
  category: 'physical' | 'special' | 'status'
  effect?: SkillEffect     // burn, slow, heal, shield, etc.
  cooldown: number         // turns before reuse in auto-battle
}
```

### StatBlock

`{ hp, atk, def, spAtk, spDef, speed }`

---

## 4. Game Loop

### Out-of-Run (Persistent Meta)

```
Main Hub
├── Roster       — manage all owned pets
├── Team Builder — pick 5 pets for the active squad
├── Training     — spend items to raise EVs, teach skills
├── Evolution    — spend materials to evolve a pet
├── Fusion       — merge two same-species pets to inherit a skill
└── Enter Run    — start a dungeon with the current team
```

### In-Run (Temporary, resets on end)

Linear path with branching node types:

| Node | Description |
|------|-------------|
| Normal Battle | Fight, then choose 1 of 3 in-run buffs |
| Elite Battle | Harder fight, higher-tier buff pool |
| Shop | Spend in-run currency on items / eggs |
| Rest | Restore team HP, or upgrade an existing buff |
| Boss | Clear for rare pet / skill drop + meta materials |

### In-Run Buff Tiers

| Tier | Example |
|------|---------|
| Single pet | "Squirrel: +15% crit rate" |
| Type-wide | "Fire-type pets: +20% ATK" |
| Full team | "Each enemy faint: restore 5% HP to all" |

**Failure policy**: No permanent punishment. Drops (eggs, skill books, evo stones, EV items) are awarded on run-end regardless.

---

## 5. Battle System

### Turn Order

Speed-priority turn-based (similar to FFX CTB), fully automatic:

```
Each turn:
1. Sort all living units by Speed (with nature + buff modifiers)
2. Highest-speed unit acts first
3. AI selects skill (priority + type advantage logic)
4. Calculate damage:
     dmg = BasePower × (Atk / Def) × typeMultiplier × natureMod × rand(0.85, 1.0)
5. Apply skill side-effects (burn, slow, shield, heal, etc.)
6. Check win condition: one side fully fainted → battle ends
```

### Rendering (PixiJS)

- Player's 5 pets on the bottom half of screen, enemies on top (Capybara GO-style)
- Each action triggers sprite animation (attack, hit, faint)
- Speed-order timeline UI rendered at top of screen
- All combat is automatic; buff selection happens between battles

### Engine / Renderer Decoupling

`BattleEngine` (in `core`) emits a typed event stream only:

```typescript
type BattleEvent =
  | { type: 'attack'; attackerId: string; targetId: string; damage: number }
  | { type: 'status'; unitId: string; effect: StatusEffect }
  | { type: 'faint'; unitId: string }
  | { type: 'battle_end'; winner: 'player' | 'enemy' }
```

PixiJS subscribes to these events. `core` has zero rendering knowledge, enabling headless simulation and unit testing of battle logic in Node.js.

---

## 6. MVP Scope

Start small, expand later:

- [ ] 10–15 species across 4 types
- [ ] 20 skills
- [ ] 3-node run (Normal → Elite → Boss)
- [ ] 5 in-run buffs per tier
- [ ] Basic out-of-run: team builder + level-up only
- [ ] Placeholder sprite art (colored rectangles with names)

Everything else (evolution, fusion, full buff pool, shop, rest nodes) comes after the core loop is fun.

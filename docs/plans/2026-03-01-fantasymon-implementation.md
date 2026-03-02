# FantasyMon MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable browser roguelike where the player fields a team of 5 pets through a 3-node dungeon run, with persistent out-of-run team management.

**Architecture:** Turborepo monorepo with three packages — `core` (pure TS battle + run logic, zero deps), `ui` (React 18 + Tailwind for menus/HUD), `battle` (PixiJS 7 renderer subscribing to core's event stream). The web app (Vite) wires them together with localStorage persistence.

**Tech Stack:** pnpm + Turborepo, TypeScript 5, Vitest, React 18, Tailwind CSS, PixiJS 7, Vite 5

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `pnpm-workspace.yaml`
- Create: `packages/core/package.json`
- Create: `packages/ui/package.json`
- Create: `packages/battle/package.json`
- Create: `apps/web/package.json`

**Step 1: Create root package.json**

```json
{
  "name": "fantasymon",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "persistent": true, "cache": false },
    "test": { "dependsOn": ["^build"] }
  }
}
```

**Step 4: Create packages/core/package.json**

```json
{
  "name": "@fantasymon/core",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "dev": "vitest"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 5: Create packages/ui/package.json**

```json
{
  "name": "@fantasymon/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**Step 6: Create packages/battle/package.json**

```json
{
  "name": "@fantasymon/battle",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "pixi.js": "^7.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**Step 7: Create apps/web/package.json**

```json
{
  "name": "fantasymon-web",
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@fantasymon/core": "workspace:*",
    "@fantasymon/ui": "workspace:*",
    "@fantasymon/battle": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 8: Install dependencies and verify**

```bash
cd /c/Users/yuema/FantasyMon
pnpm install
```

Expected: `node_modules` appears at root and in each package.

**Step 9: Create shared tsconfig**

Create `tsconfig.base.json` at root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: monorepo scaffolding with Turborepo + pnpm"
```

---

## Task 2: Core Types

**Files:**
- Create: `packages/core/src/types/index.ts`
- Create: `packages/core/src/index.ts`

**Step 1: Create the types file**

```typescript
// packages/core/src/types/index.ts

export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'dark' | 'light' | 'steel' | 'dragon'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export type SkillCategory = 'physical' | 'special' | 'status'

export interface StatBlock {
  hp: number
  atk: number
  def: number
  spAtk: number
  spDef: number
  speed: number
}

export interface Nature {
  id: string
  boostedStat: keyof Omit<StatBlock, 'hp'>
  reducedStat: keyof Omit<StatBlock, 'hp'>
}

export interface StatusEffect {
  type: 'burn' | 'slow' | 'shield' | 'poison'
  duration: number         // turns remaining
  value: number            // magnitude (e.g. 0.1 = 10% dmg per turn for burn)
}

export interface SkillEffect {
  statusEffect?: StatusEffect
  healPercent?: number     // % of target max HP healed
  statMod?: { stat: keyof StatBlock; multiplier: number }
}

export interface Skill {
  id: string
  name: string
  type: ElementType
  power: number
  accuracy: number         // 0–100
  category: SkillCategory
  effect?: SkillEffect
  cooldown: number         // turns before reuse
}

export interface SkillSlot {
  skill: Skill
  cooldownRemaining: number
}

export interface EvolutionPath {
  targetSpeciesId: string
  requiredLevel?: number
  requiredItemId?: string
}

export interface LearnsetEntry {
  skillId: string
  level: number            // level at which this skill can be learned
}

export interface Species {
  id: string
  name: string
  type1: ElementType
  type2?: ElementType
  baseStats: StatBlock
  evolutions: EvolutionPath[]
  learnset: LearnsetEntry[]
  rarity: Rarity
}

export interface Pet {
  id: string
  speciesId: string
  nickname?: string
  level: number
  exp: number
  nature: Nature
  ivs: StatBlock
  evs: StatBlock
  skills: SkillSlot[]
  evolutionStage: number
  currentHp: number        // tracked during battle
}

export type BattleEvent =
  | { type: 'turn_start'; order: string[] }
  | { type: 'attack'; attackerId: string; targetId: string; skillId: string; damage: number }
  | { type: 'status'; unitId: string; effect: StatusEffect }
  | { type: 'heal'; unitId: string; amount: number }
  | { type: 'faint'; unitId: string }
  | { type: 'battle_end'; winner: 'player' | 'enemy' }

export type RunNodeType = 'normal' | 'elite' | 'boss' | 'shop' | 'rest'

export interface RunNode {
  id: string
  type: RunNodeType
  completed: boolean
}

export interface InRunBuff {
  id: string
  name: string
  description: string
  tier: 'pet' | 'type' | 'team'
  apply: (pets: Pet[]) => Pet[]   // pure function, returns modified pets
}

export interface RunState {
  nodes: RunNode[]
  currentNodeIndex: number
  activeBuffs: InRunBuff[]
  inRunCurrency: number
}

export interface SaveFile {
  roster: Pet[]
  activeTeam: string[]     // array of Pet ids (max 5)
  runState: RunState | null
}
```

**Step 2: Create barrel export**

```typescript
// packages/core/src/index.ts
export * from './types/index'
```

**Step 3: Commit**

```bash
git add packages/core/src/
git commit -m "feat: core TypeScript type definitions"
```

---

## Task 3: Type Matchup Matrix

**Files:**
- Create: `packages/core/src/data/typeChart.ts`
- Create: `packages/core/src/data/typeChart.test.ts`

**Step 1: Write failing test**

```typescript
// packages/core/src/data/typeChart.test.ts
import { describe, it, expect } from 'vitest'
import { getTypeMultiplier } from './typeChart'

describe('getTypeMultiplier', () => {
  it('fire is super effective against grass', () => {
    expect(getTypeMultiplier('fire', 'grass')).toBe(2.0)
  })
  it('fire is not very effective against water', () => {
    expect(getTypeMultiplier('fire', 'water')).toBe(0.5)
  })
  it('neutral matchup returns 1.0', () => {
    expect(getTypeMultiplier('fire', 'electric')).toBe(1.0)
  })
})
```

**Step 2: Run to verify it fails**

```bash
cd packages/core && pnpm test
```

Expected: FAIL — "Cannot find module './typeChart'"

**Step 3: Implement typeChart**

```typescript
// packages/core/src/data/typeChart.ts
import type { ElementType } from '../types'

// Rows = attacking type, Cols = defending type
// Order: fire, water, grass, electric, dark, light, steel, dragon
const TYPES: ElementType[] = ['fire','water','grass','electric','dark','light','steel','dragon']

const MATRIX: number[][] = [
//         fire  water grass  elec  dark  light steel dragon
/* fire  */[1.0,  0.5,  2.0,  1.0,  1.0,  1.0,  0.5,  0.5],
/* water */[2.0,  0.5,  0.5,  1.0,  1.0,  1.0,  1.0,  1.0],
/* grass */[0.5,  2.0,  0.5,  1.0,  1.0,  1.0,  0.5,  1.0],
/* elec  */[1.0,  2.0,  0.5,  0.5,  1.0,  1.0,  2.0,  1.0],
/* dark  */[1.0,  1.0,  1.0,  1.0,  0.5,  0.5,  1.0,  2.0],
/* light */[1.0,  1.0,  1.0,  1.0,  2.0,  0.5,  1.0,  1.0],
/* steel */[0.5,  0.5,  1.0,  0.5,  1.0,  2.0,  0.5,  2.0],
/* dragon*/[1.0,  1.0,  1.0,  1.0,  0.5,  1.0,  0.5,  2.0],
]

export function getTypeMultiplier(attacking: ElementType, defending: ElementType): number {
  const row = TYPES.indexOf(attacking)
  const col = TYPES.indexOf(defending)
  return MATRIX[row][col]
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm test
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/core/src/data/
git commit -m "feat: type matchup matrix with tests"
```

---

## Task 4: Species & Skill Data (10 Species, 20 Skills)

**Files:**
- Create: `packages/core/src/data/skills.ts`
- Create: `packages/core/src/data/species.ts`

**Step 1: Create skills data**

```typescript
// packages/core/src/data/skills.ts
import type { Skill } from '../types'

export const SKILLS: Record<string, Skill> = {
  ember: { id:'ember', name:'Ember', type:'fire', power:40, accuracy:100, category:'special', cooldown:1 },
  flamethrower: { id:'flamethrower', name:'Flamethrower', type:'fire', power:90, accuracy:95, category:'special', effect:{ statusEffect:{ type:'burn', duration:2, value:0.05 } }, cooldown:3 },
  watergun: { id:'watergun', name:'Water Gun', type:'water', power:40, accuracy:100, category:'special', cooldown:1 },
  surf: { id:'surf', name:'Surf', type:'water', power:90, accuracy:95, category:'special', cooldown:3 },
  vinewhip: { id:'vinewhip', name:'Vine Whip', type:'grass', power:45, accuracy:100, category:'physical', cooldown:1 },
  solarbeam: { id:'solarbeam', name:'Solar Beam', type:'grass', power:120, accuracy:100, category:'special', cooldown:4 },
  thunderbolt: { id:'thunderbolt', name:'Thunderbolt', type:'electric', power:90, accuracy:100, category:'special', effect:{ statusEffect:{ type:'slow', duration:2, value:0.3 } }, cooldown:3 },
  spark: { id:'spark', name:'Spark', type:'electric', power:40, accuracy:100, category:'physical', cooldown:1 },
  shadowball: { id:'shadowball', name:'Shadow Ball', type:'dark', power:80, accuracy:100, category:'special', cooldown:2 },
  nightslash: { id:'nightslash', name:'Night Slash', type:'dark', power:70, accuracy:100, category:'physical', cooldown:2 },
  sacredfire: { id:'sacredfire', name:'Sacred Fire', type:'light', power:100, accuracy:95, category:'special', effect:{ healPercent:0.1 }, cooldown:4 },
  holybeam: { id:'holybeam', name:'Holy Beam', type:'light', power:60, accuracy:100, category:'special', cooldown:2 },
  ironhead: { id:'ironhead', name:'Iron Head', type:'steel', power:80, accuracy:100, category:'physical', effect:{ statusEffect:{ type:'shield', duration:1, value:0.2 } }, cooldown:2 },
  metalburst: { id:'metalburst', name:'Metal Burst', type:'steel', power:50, accuracy:100, category:'physical', cooldown:1 },
  dragonbreath: { id:'dragonbreath', name:'Dragon Breath', type:'dragon', power:60, accuracy:100, category:'special', effect:{ statusEffect:{ type:'slow', duration:1, value:0.2 } }, cooldown:2 },
  outrage: { id:'outrage', name:'Outrage', type:'dragon', power:120, accuracy:90, category:'physical', cooldown:4 },
  scratch: { id:'scratch', name:'Scratch', type:'fire', power:40, accuracy:100, category:'physical', cooldown:1 },
  tackle: { id:'tackle', name:'Tackle', type:'grass', power:35, accuracy:100, category:'physical', cooldown:1 },
  bite: { id:'bite', name:'Bite', type:'dark', power:60, accuracy:100, category:'physical', cooldown:1 },
  recover: { id:'recover', name:'Recover', type:'light', power:0, accuracy:100, category:'status', effect:{ healPercent:0.25 }, cooldown:4 },
}
```

**Step 2: Create species data**

```typescript
// packages/core/src/data/species.ts
import type { Species } from '../types'

export const SPECIES: Record<string, Species> = {
  embercub: {
    id:'embercub', name:'Embercub', type1:'fire', rarity:'common',
    baseStats:{ hp:45, atk:60, def:40, spAtk:65, spDef:40, speed:50 },
    evolutions:[{ targetSpeciesId:'blazelion', requiredLevel:16 }],
    learnset:[{ skillId:'scratch', level:1 },{ skillId:'ember', level:5 },{ skillId:'flamethrower', level:14 }]
  },
  blazelion: {
    id:'blazelion', name:'Blazelion', type1:'fire', rarity:'rare',
    baseStats:{ hp:65, atk:90, def:55, spAtk:95, spDef:55, speed:75 },
    evolutions:[],
    learnset:[{ skillId:'flamethrower', level:1 },{ skillId:'sacredfire', level:20 }]
  },
  aquafin: {
    id:'aquafin', name:'Aquafin', type1:'water', rarity:'common',
    baseStats:{ hp:50, atk:45, def:55, spAtk:70, spDef:60, speed:55 },
    evolutions:[{ targetSpeciesId:'tidalshark', requiredLevel:16 }],
    learnset:[{ skillId:'tackle', level:1 },{ skillId:'watergun', level:5 },{ skillId:'surf', level:14 }]
  },
  tidalshark: {
    id:'tidalshark', name:'Tidalshark', type1:'water', rarity:'rare',
    baseStats:{ hp:70, atk:65, def:75, spAtk:100, spDef:80, speed:70 },
    evolutions:[],
    learnset:[{ skillId:'surf', level:1 },{ skillId:'bite', level:10 }]
  },
  leafpup: {
    id:'leafpup', name:'Leafpup', type1:'grass', rarity:'common',
    baseStats:{ hp:45, atk:55, def:45, spAtk:55, spDef:65, speed:65 },
    evolutions:[{ targetSpeciesId:'thicketfox', requiredLevel:16 }],
    learnset:[{ skillId:'tackle', level:1 },{ skillId:'vinewhip', level:5 },{ skillId:'solarbeam', level:14 }]
  },
  thicketfox: {
    id:'thicketfox', name:'Thicketfox', type1:'grass', rarity:'rare',
    baseStats:{ hp:65, atk:75, def:60, spAtk:80, spDef:85, speed:90 },
    evolutions:[],
    learnset:[{ skillId:'solarbeam', level:1 },{ skillId:'vinewhip', level:5 }]
  },
  voltmouse: {
    id:'voltmouse', name:'Voltmouse', type1:'electric', rarity:'common',
    baseStats:{ hp:35, atk:55, def:35, spAtk:60, spDef:40, speed:90 },
    evolutions:[{ targetSpeciesId:'stormhare', requiredLevel:16 }],
    learnset:[{ skillId:'spark', level:1 },{ skillId:'thunderbolt', level:10 }]
  },
  stormhare: {
    id:'stormhare', name:'Stormhare', type1:'electric', rarity:'rare',
    baseStats:{ hp:55, atk:75, def:50, spAtk:90, spDef:60, speed:120 },
    evolutions:[],
    learnset:[{ skillId:'thunderbolt', level:1 },{ skillId:'spark', level:5 }]
  },
  ironpup: {
    id:'ironpup', name:'Ironpup', type1:'steel', rarity:'rare',
    baseStats:{ hp:60, atk:80, def:90, spAtk:40, spDef:80, speed:35 },
    evolutions:[],
    learnset:[{ skillId:'metalburst', level:1 },{ skillId:'ironhead', level:8 }]
  },
  shadowkit: {
    id:'shadowkit', name:'Shadowkit', type1:'dark', rarity:'rare',
    baseStats:{ hp:50, atk:85, def:45, spAtk:75, spDef:50, speed:80 },
    evolutions:[],
    learnset:[{ skillId:'bite', level:1 },{ skillId:'nightslash', level:6 },{ skillId:'shadowball', level:12 }]
  },
}
```

**Step 3: Export from core index**

Add to `packages/core/src/index.ts`:

```typescript
export * from './types/index'
export * from './data/typeChart'
export * from './data/skills'
export * from './data/species'
```

**Step 4: Commit**

```bash
git add packages/core/src/data/
git commit -m "feat: species and skill data (10 species, 20 skills)"
```

---

## Task 5: Pet Factory & Stat Calculator

**Files:**
- Create: `packages/core/src/engine/petFactory.ts`
- Create: `packages/core/src/engine/petFactory.test.ts`
- Create: `packages/core/src/engine/statCalc.ts`
- Create: `packages/core/src/engine/statCalc.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/core/src/engine/statCalc.test.ts
import { describe, it, expect } from 'vitest'
import { calcStat, calcMaxHp } from './statCalc'

describe('calcStat', () => {
  it('calculates a stat at level 50 with no EVs or IVs', () => {
    // Formula: floor(((2*base + iv + floor(ev/4)) * level / 100) + 5)
    const result = calcStat(60, 0, 0, 50)
    expect(result).toBe(65) // floor(((120)*50/100)+5) = floor(60+5) = 65
  })
  it('IVs increase the stat', () => {
    const withIv = calcStat(60, 31, 0, 50)
    const withoutIv = calcStat(60, 0, 0, 50)
    expect(withIv).toBeGreaterThan(withoutIv)
  })
})

describe('calcMaxHp', () => {
  it('HP uses a different formula', () => {
    // Formula: floor(((2*base + iv + floor(ev/4)) * level / 100) + level + 10)
    const result = calcMaxHp(45, 0, 0, 50)
    expect(result).toBe(105) // floor((90*50/100)+50+10) = floor(45+60) = 105
  })
})
```

```typescript
// packages/core/src/engine/petFactory.test.ts
import { describe, it, expect } from 'vitest'
import { createPet } from './petFactory'
import { SPECIES } from '../data/species'

describe('createPet', () => {
  it('creates a pet from a species id', () => {
    const pet = createPet('embercub', 5)
    expect(pet.speciesId).toBe('embercub')
    expect(pet.level).toBe(5)
    expect(pet.skills.length).toBeGreaterThan(0)
    expect(pet.currentHp).toBeGreaterThan(0)
  })
  it('pet starts with skills appropriate for its level', () => {
    const pet = createPet('embercub', 1)
    // At level 1, embercub only knows 'scratch'
    expect(pet.skills.map(s => s.skill.id)).toContain('scratch')
  })
})
```

**Step 2: Run to verify they fail**

```bash
cd packages/core && pnpm test
```

Expected: FAIL — module not found

**Step 3: Implement statCalc**

```typescript
// packages/core/src/engine/statCalc.ts
export function calcStat(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5)
}

export function calcMaxHp(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10)
}
```

**Step 4: Implement petFactory**

```typescript
// packages/core/src/engine/petFactory.ts
import { nanoid } from 'nanoid'
import type { Pet, Nature, StatBlock } from '../types'
import { SPECIES } from '../data/species'
import { SKILLS } from '../data/skills'
import { calcStat, calcMaxHp } from './statCalc'

const NATURES: Nature[] = [
  { id:'hardy',   boostedStat:'atk',   reducedStat:'atk'   },
  { id:'lonely',  boostedStat:'atk',   reducedStat:'def'   },
  { id:'brave',   boostedStat:'atk',   reducedStat:'speed' },
  { id:'adamant', boostedStat:'atk',   reducedStat:'spAtk' },
  { id:'naughty', boostedStat:'atk',   reducedStat:'spDef' },
  { id:'bold',    boostedStat:'def',   reducedStat:'atk'   },
  { id:'docile',  boostedStat:'def',   reducedStat:'def'   },
  { id:'relaxed', boostedStat:'def',   reducedStat:'speed' },
  { id:'impish',  boostedStat:'def',   reducedStat:'spAtk' },
  { id:'lax',     boostedStat:'def',   reducedStat:'spDef' },
  { id:'timid',   boostedStat:'speed', reducedStat:'atk'   },
  { id:'hasty',   boostedStat:'speed', reducedStat:'def'   },
  { id:'serious', boostedStat:'speed', reducedStat:'speed' },
  { id:'jolly',   boostedStat:'speed', reducedStat:'spAtk' },
  { id:'naive',   boostedStat:'speed', reducedStat:'spDef' },
  { id:'modest',  boostedStat:'spAtk', reducedStat:'atk'   },
  { id:'mild',    boostedStat:'spAtk', reducedStat:'def'   },
  { id:'quiet',   boostedStat:'spAtk', reducedStat:'speed' },
  { id:'bashful', boostedStat:'spAtk', reducedStat:'spAtk' },
  { id:'rash',    boostedStat:'spAtk', reducedStat:'spDef' },
  { id:'calm',    boostedStat:'spDef', reducedStat:'atk'   },
  { id:'gentle',  boostedStat:'spDef', reducedStat:'def'   },
  { id:'sassy',   boostedStat:'spDef', reducedStat:'speed' },
  { id:'careful', boostedStat:'spDef', reducedStat:'spAtk' },
  { id:'quirky',  boostedStat:'spDef', reducedStat:'spDef' },
]

function randomIvs(): StatBlock {
  const r = () => Math.floor(Math.random() * 32)
  return { hp:r(), atk:r(), def:r(), spAtk:r(), spDef:r(), speed:r() }
}

const ZERO_EVS: StatBlock = { hp:0, atk:0, def:0, spAtk:0, spDef:0, speed:0 }

export function createPet(speciesId: string, level: number): Pet {
  const species = SPECIES[speciesId]
  if (!species) throw new Error(`Unknown species: ${speciesId}`)

  const nature = NATURES[Math.floor(Math.random() * NATURES.length)]
  const ivs = randomIvs()
  const evs = { ...ZERO_EVS }

  const learnedSkills = species.learnset
    .filter(e => e.level <= level)
    .slice(-4) // keep last 4 learned skills
    .map(e => ({ skill: SKILLS[e.skillId], cooldownRemaining: 0 }))

  const maxHp = calcMaxHp(species.baseStats.hp, ivs.hp, evs.hp, level)

  return {
    id: nanoid(),
    speciesId,
    level,
    exp: 0,
    nature,
    ivs,
    evs,
    skills: learnedSkills,
    evolutionStage: 0,
    currentHp: maxHp,
  }
}
```

**Step 5: Add nanoid dependency to core**

```bash
cd packages/core && pnpm add nanoid
```

**Step 6: Run tests to verify they pass**

```bash
cd packages/core && pnpm test
```

Expected: PASS (all tests)

**Step 7: Commit**

```bash
git add packages/core/src/engine/
git commit -m "feat: pet factory and stat calculator with tests"
```

---

## Task 6: Battle Engine

**Files:**
- Create: `packages/core/src/engine/battleEngine.ts`
- Create: `packages/core/src/engine/battleEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/core/src/engine/battleEngine.test.ts
import { describe, it, expect } from 'vitest'
import { BattleEngine } from './battleEngine'
import { createPet } from './petFactory'

function makeTeam(speciesId: string, level: number, count: number) {
  return Array.from({ length: count }, () => createPet(speciesId, level))
}

describe('BattleEngine', () => {
  it('emits battle_end event', () => {
    const playerTeam = makeTeam('embercub', 10, 3)
    const enemyTeam = makeTeam('aquafin', 1, 1) // weak team at level 1
    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()
    const endEvent = events.find(e => e.type === 'battle_end')
    expect(endEvent).toBeDefined()
  })

  it('player wins against much weaker enemy', () => {
    const playerTeam = makeTeam('blazelion', 50, 5)
    const enemyTeam = makeTeam('aquafin', 1, 1)
    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()
    const endEvent = events.find(e => e.type === 'battle_end') as any
    expect(endEvent?.winner).toBe('player')
  })

  it('emits faint events for defeated units', () => {
    const playerTeam = makeTeam('blazelion', 50, 5)
    const enemyTeam = makeTeam('aquafin', 1, 1)
    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()
    const faintEvents = events.filter(e => e.type === 'faint')
    expect(faintEvents.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run to verify they fail**

```bash
cd packages/core && pnpm test
```

**Step 3: Implement BattleEngine**

```typescript
// packages/core/src/engine/battleEngine.ts
import type { Pet, BattleEvent, Skill } from '../types'
import { SPECIES } from '../data/species'
import { getTypeMultiplier } from '../data/typeChart'
import { calcStat, calcMaxHp } from './statCalc'

function getSpeed(pet: Pet): number {
  const species = SPECIES[pet.speciesId]
  let speed = calcStat(species.baseStats.speed, pet.ivs.speed, pet.evs.speed, pet.level)
  // Apply slow status
  const slow = pet.skills // we store status on pet temporarily — see note below
  return speed
}

function calcDamage(attacker: Pet, defender: Pet, skill: Skill): number {
  const atkSpecies = SPECIES[attacker.speciesId]
  const defSpecies = SPECIES[defender.speciesId]

  const attackStat = skill.category === 'physical'
    ? calcStat(atkSpecies.baseStats.atk, attacker.ivs.atk, attacker.evs.atk, attacker.level)
    : calcStat(atkSpecies.baseStats.spAtk, attacker.ivs.spAtk, attacker.evs.spAtk, attacker.level)

  const defenseStat = skill.category === 'physical'
    ? calcStat(defSpecies.baseStats.def, defender.ivs.def, defender.evs.def, defender.level)
    : calcStat(defSpecies.baseStats.spDef, defender.ivs.spDef, defender.evs.spDef, defender.level)

  const typeMulti = getTypeMultiplier(skill.type, defSpecies.type1)
    * (defSpecies.type2 ? getTypeMultiplier(skill.type, defSpecies.type2) : 1)

  const natureMod = attacker.nature.boostedStat === (skill.category === 'physical' ? 'atk' : 'spAtk') ? 1.05
    : attacker.nature.reducedStat === (skill.category === 'physical' ? 'atk' : 'spAtk') ? 0.95 : 1.0

  const rand = 0.85 + Math.random() * 0.15

  return Math.max(1, Math.floor(
    skill.power * (attackStat / defenseStat) * typeMulti * natureMod * rand
  ))
}

export class BattleEngine {
  private playerTeam: Pet[]
  private enemyTeam: Pet[]
  private events: BattleEvent[] = []

  constructor(playerTeam: Pet[], enemyTeam: Pet[]) {
    // Deep clone to avoid mutating originals
    this.playerTeam = playerTeam.map(p => ({ ...p, skills: p.skills.map(s => ({ ...s })) }))
    this.enemyTeam = enemyTeam.map(p => ({ ...p, skills: p.skills.map(s => ({ ...s })) }))
  }

  simulate(): BattleEvent[] {
    const MAX_TURNS = 200
    let turn = 0

    while (turn < MAX_TURNS) {
      const playerAlive = this.playerTeam.filter(p => p.currentHp > 0)
      const enemyAlive = this.enemyTeam.filter(p => p.currentHp > 0)

      if (playerAlive.length === 0) {
        this.events.push({ type: 'battle_end', winner: 'enemy' })
        break
      }
      if (enemyAlive.length === 0) {
        this.events.push({ type: 'battle_end', winner: 'player' })
        break
      }

      // Sort all alive units by speed descending
      const allUnits = [
        ...playerAlive.map(p => ({ pet: p, side: 'player' as const })),
        ...enemyAlive.map(p => ({ pet: p, side: 'enemy' as const })),
      ].sort((a, b) => {
        const sA = calcStat(SPECIES[a.pet.speciesId].baseStats.speed, a.pet.ivs.speed, a.pet.evs.speed, a.pet.level)
        const sB = calcStat(SPECIES[b.pet.speciesId].baseStats.speed, b.pet.ivs.speed, b.pet.evs.speed, b.pet.level)
        return sB - sA
      })

      this.events.push({ type: 'turn_start', order: allUnits.map(u => u.pet.id) })

      for (const { pet, side } of allUnits) {
        if (pet.currentHp <= 0) continue

        const opponents = side === 'player'
          ? this.enemyTeam.filter(p => p.currentHp > 0)
          : this.playerTeam.filter(p => p.currentHp > 0)

        if (opponents.length === 0) continue

        // Pick a ready skill (cooldown = 0), fallback to first
        const readySkill = pet.skills.find(s => s.cooldownRemaining === 0 && s.skill.power > 0)
          ?? pet.skills[0]

        if (!readySkill || readySkill.skill.category === 'status') continue

        const target = opponents[0] // always target first alive opponent

        if (Math.random() * 100 > readySkill.skill.accuracy) continue // missed

        const damage = calcDamage(pet, target, readySkill.skill)
        target.currentHp = Math.max(0, target.currentHp - damage)

        this.events.push({
          type: 'attack',
          attackerId: pet.id,
          targetId: target.id,
          skillId: readySkill.skill.id,
          damage
        })

        // Set cooldown
        readySkill.cooldownRemaining = readySkill.skill.cooldown

        if (target.currentHp === 0) {
          this.events.push({ type: 'faint', unitId: target.id })
        }
      }

      // Reduce all cooldowns by 1
      for (const unit of [...this.playerTeam, ...this.enemyTeam]) {
        for (const slot of unit.skills) {
          if (slot.cooldownRemaining > 0) slot.cooldownRemaining--
        }
      }

      turn++
    }

    if (turn >= MAX_TURNS) {
      this.events.push({ type: 'battle_end', winner: 'enemy' })
    }

    return this.events
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm test
```

Expected: PASS (all tests including typeChart tests)

**Step 5: Commit**

```bash
git add packages/core/src/engine/battleEngine.ts packages/core/src/engine/battleEngine.test.ts
git commit -m "feat: battle engine with turn order, damage calc, and event stream"
```

---

## Task 7: Run State Machine

**Files:**
- Create: `packages/core/src/engine/runEngine.ts`
- Create: `packages/core/src/engine/runEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// packages/core/src/engine/runEngine.test.ts
import { describe, it, expect } from 'vitest'
import { createRun, advanceNode, applyBuff } from './runEngine'

describe('createRun', () => {
  it('creates a 3-node run: normal -> elite -> boss', () => {
    const run = createRun()
    expect(run.nodes).toHaveLength(3)
    expect(run.nodes[0].type).toBe('normal')
    expect(run.nodes[1].type).toBe('elite')
    expect(run.nodes[2].type).toBe('boss')
  })
  it('starts at node 0', () => {
    const run = createRun()
    expect(run.currentNodeIndex).toBe(0)
  })
})

describe('advanceNode', () => {
  it('marks current node completed and increments index', () => {
    const run = createRun()
    const next = advanceNode(run)
    expect(next.nodes[0].completed).toBe(true)
    expect(next.currentNodeIndex).toBe(1)
  })
})
```

**Step 2: Implement runEngine**

```typescript
// packages/core/src/engine/runEngine.ts
import { nanoid } from 'nanoid'
import type { RunState, RunNode, InRunBuff, Pet } from '../types'

export function createRun(): RunState {
  const nodes: RunNode[] = [
    { id: nanoid(), type: 'normal', completed: false },
    { id: nanoid(), type: 'elite', completed: false },
    { id: nanoid(), type: 'boss', completed: false },
  ]
  return { nodes, currentNodeIndex: 0, activeBuffs: [], inRunCurrency: 0 }
}

export function advanceNode(run: RunState): RunState {
  const nodes = run.nodes.map((n, i) =>
    i === run.currentNodeIndex ? { ...n, completed: true } : n
  )
  return { ...run, nodes, currentNodeIndex: run.currentNodeIndex + 1 }
}

export function applyBuff(run: RunState, buff: InRunBuff): RunState {
  return { ...run, activeBuffs: [...run.activeBuffs, buff] }
}

export function isRunComplete(run: RunState): boolean {
  return run.currentNodeIndex >= run.nodes.length
}

export function getCurrentNode(run: RunState): RunNode | null {
  return run.nodes[run.currentNodeIndex] ?? null
}
```

**Step 3: Run tests**

```bash
cd packages/core && pnpm test
```

Expected: PASS

**Step 4: Export from core index**

Add to `packages/core/src/index.ts`:

```typescript
export * from './engine/statCalc'
export * from './engine/petFactory'
export * from './engine/battleEngine'
export * from './engine/runEngine'
```

**Step 5: Commit**

```bash
git add packages/core/src/engine/runEngine.ts packages/core/src/engine/runEngine.test.ts packages/core/src/index.ts
git commit -m "feat: roguelike run state machine with tests"
```

---

## Task 8: Vite App + localStorage Save

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/save.ts`
- Create: `apps/web/tailwind.config.js`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/index.css`
- Create: `apps/web/tsconfig.json`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FantasyMon</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**Step 3: Create save.ts**

```typescript
// apps/web/src/save.ts
import type { SaveFile } from '@fantasymon/core'

const KEY = 'fantasymon_save'

export function loadSave(): SaveFile | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as SaveFile } catch { return null }
}

export function writeSave(save: SaveFile): void {
  localStorage.setItem(KEY, JSON.stringify(save))
}

export function newSave(): SaveFile {
  return { roster: [], activeTeam: [], runState: null }
}
```

**Step 4: Create main.tsx**

```typescript
// apps/web/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 5: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**Step 6: Create postcss.config.js**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```

**Step 7: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #0f0f1a;
  color: #f0f0f0;
  font-family: system-ui, sans-serif;
}
```

**Step 8: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat: Vite web app scaffold with Tailwind and localStorage save"
```

---

## Task 9: App Shell & Team Builder Screen

**Files:**
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/screens/HomeScreen.tsx`
- Create: `apps/web/src/screens/TeamBuilderScreen.tsx`

**Step 1: Create App.tsx with simple screen routing**

```typescript
// apps/web/src/App.tsx
import React, { useState, useEffect } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { loadSave, newSave, writeSave } from './save'
import { HomeScreen } from './screens/HomeScreen'
import { TeamBuilderScreen } from './screens/TeamBuilderScreen'

export type Screen = 'home' | 'teambuilder' | 'run'

export function App() {
  const [save, setSave] = useState<SaveFile>(() => loadSave() ?? newSave())
  const [screen, setScreen] = useState<Screen>('home')

  useEffect(() => { writeSave(save) }, [save])

  if (screen === 'teambuilder') {
    return <TeamBuilderScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }

  return <HomeScreen save={save} setSave={setSave} onNavigate={setScreen} />
}
```

**Step 2: Create HomeScreen.tsx**

```typescript
// apps/web/src/screens/HomeScreen.tsx
import React from 'react'
import type { SaveFile } from '@fantasymon/core'
import { createPet } from '@fantasymon/core'
import type { Screen } from '../App'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onNavigate: (screen: Screen) => void
}

export function HomeScreen({ save, setSave, onNavigate }: Props) {
  function addStarterPets() {
    const starters = ['embercub', 'aquafin', 'leafpup'].map(id => createPet(id, 5))
    setSave({ ...save, roster: [...save.roster, ...starters], activeTeam: starters.map(p => p.id) })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold text-yellow-400">FantasyMon</h1>
      <p className="text-gray-400">Pet Raising Roguelike</p>

      {save.roster.length === 0 ? (
        <button
          onClick={addStarterPets}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400"
        >
          Start New Game
        </button>
      ) : (
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={() => onNavigate('teambuilder')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500"
          >
            Team Builder ({save.activeTeam.length}/5)
          </button>
          <button
            onClick={() => onNavigate('run')}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
          >
            Enter Dungeon
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create TeamBuilderScreen.tsx**

```typescript
// apps/web/src/screens/TeamBuilderScreen.tsx
import React from 'react'
import type { SaveFile, Pet } from '@fantasymon/core'
import { SPECIES } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

function PetCard({ pet, selected, onToggle }: { pet: Pet; selected: boolean; onToggle: () => void }) {
  const species = SPECIES[pet.speciesId]
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-600 bg-gray-800 hover:border-gray-400'
      }`}
    >
      <div className="font-bold text-lg">{species.name}</div>
      <div className="text-sm text-gray-400">Lv.{pet.level} · {species.type1}{species.type2 ? `/${species.type2}` : ''}</div>
      <div className="text-sm text-gray-400">HP {pet.currentHp} · SPD {pet.ivs.speed}</div>
    </div>
  )
}

export function TeamBuilderScreen({ save, setSave, onBack }: Props) {
  function togglePet(petId: string) {
    const active = save.activeTeam
    if (active.includes(petId)) {
      setSave({ ...save, activeTeam: active.filter(id => id !== petId) })
    } else if (active.length < 5) {
      setSave({ ...save, activeTeam: [...active, petId] })
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-3xl font-bold text-yellow-400">Team Builder</h2>
        <span className="text-gray-400">{save.activeTeam.length}/5 selected</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {save.roster.map(pet => (
          <PetCard
            key={pet.id}
            pet={pet}
            selected={save.activeTeam.includes(pet.id)}
            onToggle={() => togglePet(pet.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Verify dev server starts**

```bash
cd /c/Users/yuema/FantasyMon && pnpm dev
```

Expected: Vite dev server starts, browser shows "FantasyMon" title screen.

**Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat: app shell with home screen and team builder"
```

---

## Task 10: Battle Screen (PixiJS Renderer)

**Files:**
- Create: `packages/battle/src/BattleRenderer.ts`
- Create: `packages/battle/src/index.ts`
- Create: `apps/web/src/screens/BattleScreen.tsx`

**Step 1: Create BattleRenderer.ts**

This renders each pet as a colored rectangle with its name — placeholder art.

```typescript
// packages/battle/src/BattleRenderer.ts
import * as PIXI from 'pixi.js'
import type { BattleEvent, Pet } from '@fantasymon/core'
import { SPECIES } from '@fantasymon/core'

const TYPE_COLORS: Record<string, number> = {
  fire: 0xff4400, water: 0x0088ff, grass: 0x44cc44, electric: 0xffee00,
  dark: 0x442266, light: 0xffffaa, steel: 0x8899aa, dragon: 0x7700cc,
}

export class BattleRenderer {
  private app: PIXI.Application
  private unitSprites: Map<string, PIXI.Container> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      width: 800,
      height: 400,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    })
  }

  init(playerTeam: Pet[], enemyTeam: Pet[]) {
    this.app.stage.removeChildren()
    this.unitSprites.clear()

    playerTeam.forEach((pet, i) => this.createSprite(pet, i, 'player', playerTeam.length))
    enemyTeam.forEach((pet, i) => this.createSprite(pet, i, 'enemy', enemyTeam.length))
  }

  private createSprite(pet: Pet, index: number, side: 'player' | 'enemy', total: number) {
    const species = SPECIES[pet.speciesId]
    const color = TYPE_COLORS[species.type1] ?? 0x888888

    const container = new PIXI.Container()
    const rect = new PIXI.Graphics()
    rect.beginFill(color, 0.8)
    rect.drawRoundedRect(0, 0, 80, 60, 8)
    rect.endFill()

    const label = new PIXI.Text(species.name, { fontSize: 9, fill: 0xffffff, wordWrap: true, wordWrapWidth: 78 })
    label.x = 4; label.y = 4

    const hpText = new PIXI.Text(`HP:${pet.currentHp}`, { fontSize: 8, fill: 0xffffff })
    hpText.x = 4; hpText.y = 44
    hpText.name = 'hp'

    container.addChild(rect, label, hpText)

    const spacing = 800 / (total + 1)
    container.x = spacing * (index + 1) - 40
    container.y = side === 'player' ? 300 : 40

    container.name = pet.id
    this.app.stage.addChild(container)
    this.unitSprites.set(pet.id, container)
  }

  handleEvent(event: BattleEvent, allPets: Pet[]) {
    if (event.type === 'attack') {
      // Flash the attacker briefly
      const sprite = this.unitSprites.get(event.attackerId)
      if (sprite) {
        const rect = sprite.children[0] as PIXI.Graphics
        const origAlpha = rect.alpha
        rect.alpha = 1
        setTimeout(() => { rect.alpha = origAlpha }, 100)
      }
    }
    if (event.type === 'faint') {
      const sprite = this.unitSprites.get(event.unitId)
      if (sprite) sprite.visible = false
    }
    if (event.type === 'attack') {
      // Update target HP display
      const target = allPets.find(p => p.id === event.targetId)
      const sprite = this.unitSprites.get(event.targetId)
      if (target && sprite) {
        const hpText = sprite.getChildByName('hp') as PIXI.Text
        if (hpText) hpText.text = `HP:${target.currentHp}`
      }
    }
  }

  destroy() {
    this.app.destroy(false)
  }
}
```

**Step 2: Create packages/battle/src/index.ts**

```typescript
export { BattleRenderer } from './BattleRenderer'
```

**Step 3: Create BattleScreen.tsx**

```typescript
// apps/web/src/screens/BattleScreen.tsx
import React, { useEffect, useRef } from 'react'
import type { SaveFile, Pet } from '@fantasymon/core'
import { BattleEngine, createPet, createRun } from '@fantasymon/core'
import { BattleRenderer } from '@fantasymon/battle'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

export function BattleScreen({ save, setSave, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
    const enemyTeam = ['aquafin', 'voltmouse', 'leafpup'].map(id => createPet(id, playerTeam[0]?.level ?? 5))

    const renderer = new BattleRenderer(canvasRef.current)
    renderer.init(playerTeam, enemyTeam)

    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()

    // Replay events with delay for animation
    let delay = 0
    const allPets = [...playerTeam, ...enemyTeam]

    events.forEach(event => {
      delay += event.type === 'attack' ? 400 : event.type === 'faint' ? 600 : 50
      setTimeout(() => renderer.handleEvent(event, allPets), delay)
    })

    return () => renderer.destroy()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400">Battle</h2>
      </div>
      <canvas ref={canvasRef} className="rounded-lg border border-gray-700" />
    </div>
  )
}
```

**Step 4: Wire BattleScreen into App.tsx**

In `apps/web/src/App.tsx`, import and render `BattleScreen` when `screen === 'run'`:

```typescript
import { BattleScreen } from './screens/BattleScreen'

// Add inside App():
if (screen === 'run') {
  return <BattleScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
}
```

**Step 5: Verify the full game loop works**

```bash
cd /c/Users/yuema/FantasyMon && pnpm dev
```

1. Open browser at http://localhost:5173
2. Click "Start New Game" — 3 starter pets added
3. Click "Team Builder" — select pets
4. Click "Enter Dungeon" — battle renders, animations play
5. Click back to home

**Step 6: Commit**

```bash
git add packages/battle/ apps/web/src/screens/BattleScreen.tsx apps/web/src/App.tsx
git commit -m "feat: PixiJS battle renderer wired to battle engine"
```

---

## MVP Complete

At this point you have:
- [x] Monorepo scaffold
- [x] Core types
- [x] Type matchup matrix
- [x] 10 species + 20 skills
- [x] Pet factory (random nature, IVs)
- [x] Battle engine (speed-ordered turns, damage calc, event stream)
- [x] Run state machine (3-node: normal → elite → boss)
- [x] Vite app + localStorage
- [x] Home screen + Team builder
- [x] PixiJS battle renderer

**Next milestones** (out of MVP scope):
- In-run buff selection screen after each battle
- Shop and rest nodes
- Pet leveling and evolution UI
- Full roguelike run loop with win/lose screen

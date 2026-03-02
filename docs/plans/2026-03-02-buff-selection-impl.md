# Buff Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After winning a non-boss battle node, show 3 randomly chosen buff cards for the player to pick; the chosen buff persists for the rest of the run and boosts the team before every subsequent battle.

**Architecture:** New `buffs.ts` data module defines 9 buffs (3 per tier) and registers them in `BUFF_REGISTRY`. `runEngine.ts` gains a `pickRandomBuffs` helper. `BattleScreen.tsx` applies active buffs to a team copy before each fight and shows a buff-selection overlay after non-boss victories.

**Tech Stack:** TypeScript, React 18, Vitest (unit tests in `packages/core`)

---

## Task 1: Define the 9 buffs in `packages/core/src/data/buffs.ts`

**Files:**
- Create: `packages/core/src/data/buffs.ts`
- Test: `packages/core/src/data/buffs.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/core/src/data/buffs.test.ts
import { describe, it, expect } from 'vitest'
import { ALL_BUFFS } from './buffs'
import { BUFF_REGISTRY } from '../engine/runEngine'
import type { Pet } from '../types'

// minimal stub pet factory
function stubPet(overrides: Partial<Pet> & { id: string }): Pet {
  return {
    speciesId: 'embercub', nickname: undefined, level: 5, exp: 0,
    nature: { id: 'hardy', boostedStat: 'atk', reducedStat: 'atk' },
    ivs: { hp:15, atk:15, def:15, spAtk:15, spDef:15, speed:15 },
    evs: { hp:0, atk:0, def:0, spAtk:0, spDef:0, speed:0 },
    skills: [], evolutionStage: 0,
    currentHp: 20, maxHp: 20, statusEffects: [],
    ...overrides,
  }
}

describe('ALL_BUFFS', () => {
  it('has exactly 9 buffs', () => {
    expect(ALL_BUFFS).toHaveLength(9)
  })

  it('each buff is registered in BUFF_REGISTRY', () => {
    for (const buff of ALL_BUFFS) {
      expect(BUFF_REGISTRY[buff.id]).toBeDefined()
      expect(typeof BUFF_REGISTRY[buff.id].apply).toBe('function')
    }
  })

  it('team_fortify increases maxHp and currentHp by 15%', () => {
    const buff = ALL_BUFFS.find(b => b.id === 'team_fortify')!
    const pets = [stubPet({ id: 'p1', maxHp: 100, currentHp: 80 })]
    const result = buff.apply(pets)
    expect(result[0].maxHp).toBe(115)
    expect(result[0].currentHp).toBe(92)  // Math.round(80 * 1.15)
  })

  it('team_battle_cry increases atk by 15%', () => {
    const buff = ALL_BUFFS.find(b => b.id === 'team_battle_cry')!
    const pets = [stubPet({ id: 'p1', ivs: { hp:15,atk:20,def:10,spAtk:10,spDef:10,speed:10 }, evs: { hp:0,atk:0,def:0,spAtk:0,spDef:0,speed:0 } })]
    // We test that the apply function returns a different (boosted) object
    const result = buff.apply(pets)
    expect(result).not.toBe(pets)  // pure — new array
    expect(result[0]).not.toBe(pets[0])  // new pet object
  })

  it('pet_vanguard boosts only the fastest pet', () => {
    const buff = ALL_BUFFS.find(b => b.id === 'pet_vanguard')!
    const slow = stubPet({ id: 'slow', ivs: { hp:15,atk:10,def:10,spAtk:10,spDef:10,speed:10 }, evs: { hp:0,atk:0,def:0,spAtk:0,spDef:0,speed:0 } })
    const fast = stubPet({ id: 'fast', ivs: { hp:15,atk:10,def:10,spAtk:10,spDef:10,speed:30 }, evs: { hp:0,atk:0,def:0,spAtk:0,spDef:0,speed:0 } })
    const result = buff.apply([slow, fast])
    // fast pet got boosted, slow pet unchanged
    expect(result.find(p => p.id === 'fast')!.ivs.speed).toBeGreaterThan(fast.ivs.speed)
    expect(result.find(p => p.id === 'slow')!.ivs.speed).toBe(slow.ivs.speed)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm vitest run src/data/buffs.test.ts
```
Expected: FAIL — `Cannot find module './buffs'`

**Step 3: Create `packages/core/src/data/buffs.ts`**

```typescript
// packages/core/src/data/buffs.ts
import type { InRunBuff, Pet } from '../types'
import { BUFF_REGISTRY, registerBuff } from '../engine/runEngine'
import { SPECIES } from './species'

// Helper: compute a pet's effective speed for sorting (ivs.speed as proxy, full stat calc is in statCalc but we avoid circular dep)
function effectiveSpeed(p: Pet): number { return p.ivs.speed + p.evs.speed }
function effectiveAtk(p: Pet): number   { return p.ivs.atk + p.evs.atk }
function effectiveHp(p: Pet): number    { return p.currentHp }

const buffs: InRunBuff[] = [
  // ── Pet tier ──────────────────────────────────────────────────────────────
  {
    id: 'pet_vanguard',
    name: 'Vanguard',
    description: 'Your fastest pet gains +35% Speed.',
    tier: 'pet',
    apply(pets) {
      if (pets.length === 0) return pets
      const fastest = [...pets].sort((a, b) => effectiveSpeed(b) - effectiveSpeed(a))[0]
      return pets.map(p => p.id !== fastest.id ? p : {
        ...p,
        ivs: { ...p.ivs, speed: Math.round(p.ivs.speed * 1.35) },
      })
    },
  },
  {
    id: 'pet_survivor',
    name: 'Survivor',
    description: 'Your lowest-HP pet gains +25% max HP.',
    tier: 'pet',
    apply(pets) {
      if (pets.length === 0) return pets
      const weakest = [...pets].sort((a, b) => effectiveHp(a) - effectiveHp(b))[0]
      return pets.map(p => p.id !== weakest.id ? p : {
        ...p,
        maxHp: Math.round(p.maxHp * 1.25),
        currentHp: Math.round(p.currentHp * 1.25),
      })
    },
  },
  {
    id: 'pet_berserker',
    name: 'Berserker',
    description: 'Your highest ATK pet gains +25% ATK.',
    tier: 'pet',
    apply(pets) {
      if (pets.length === 0) return pets
      const strongest = [...pets].sort((a, b) => effectiveAtk(b) - effectiveAtk(a))[0]
      return pets.map(p => p.id !== strongest.id ? p : {
        ...p,
        ivs: { ...p.ivs, atk: Math.round(p.ivs.atk * 1.25) },
      })
    },
  },

  // ── Type tier ─────────────────────────────────────────────────────────────
  {
    id: 'type_fire_surge',
    name: 'Flame Surge',
    description: 'All Fire-type pets gain +20% ATK.',
    tier: 'type',
    apply(pets) {
      return pets.map(p => {
        const s = SPECIES[p.speciesId]
        if (!s || (s.type1 !== 'fire' && s.type2 !== 'fire')) return p
        return { ...p, ivs: { ...p.ivs, atk: Math.round(p.ivs.atk * 1.20) } }
      })
    },
  },
  {
    id: 'type_water_guard',
    name: 'Tidal Guard',
    description: 'All Water-type pets gain +20% DEF.',
    tier: 'type',
    apply(pets) {
      return pets.map(p => {
        const s = SPECIES[p.speciesId]
        if (!s || (s.type1 !== 'water' && s.type2 !== 'water')) return p
        return { ...p, ivs: { ...p.ivs, def: Math.round(p.ivs.def * 1.20) } }
      })
    },
  },
  {
    id: 'type_elec_dash',
    name: 'Lightning Dash',
    description: 'All Electric-type pets gain +20% Speed.',
    tier: 'type',
    apply(pets) {
      return pets.map(p => {
        const s = SPECIES[p.speciesId]
        if (!s || (s.type1 !== 'electric' && s.type2 !== 'electric')) return p
        return { ...p, ivs: { ...p.ivs, speed: Math.round(p.ivs.speed * 1.20) } }
      })
    },
  },

  // ── Team tier ─────────────────────────────────────────────────────────────
  {
    id: 'team_battle_cry',
    name: 'Battle Cry',
    description: 'All pets gain +15% ATK.',
    tier: 'team',
    apply: (pets) => pets.map(p => ({ ...p, ivs: { ...p.ivs, atk: Math.round(p.ivs.atk * 1.15) } })),
  },
  {
    id: 'team_tailwind',
    name: 'Tailwind',
    description: 'All pets gain +15% Speed.',
    tier: 'team',
    apply: (pets) => pets.map(p => ({ ...p, ivs: { ...p.ivs, speed: Math.round(p.ivs.speed * 1.15) } })),
  },
  {
    id: 'team_fortify',
    name: 'Fortify',
    description: 'All pets gain +15% max HP.',
    tier: 'team',
    apply: (pets) => pets.map(p => ({
      ...p,
      maxHp: Math.round(p.maxHp * 1.15),
      currentHp: Math.round(p.currentHp * 1.15),
    })),
  },
]

// Register all buffs so they survive save/load deserialization
buffs.forEach(b => registerBuff(b))

export const ALL_BUFFS: InRunBuff[] = buffs
```

**Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm vitest run src/data/buffs.test.ts
```
Expected: all 5 tests PASS

**Step 5: Commit**

```bash
git add packages/core/src/data/buffs.ts packages/core/src/data/buffs.test.ts
git commit -m "feat: define 9 in-run buffs with apply functions and BUFF_REGISTRY registration"
```

---

## Task 2: Add `pickRandomBuffs` to `runEngine.ts`

**Files:**
- Modify: `packages/core/src/engine/runEngine.ts`
- Test: `packages/core/src/engine/runEngine.test.ts`

**Step 1: Add test cases to existing `runEngine.test.ts`**

Open `packages/core/src/engine/runEngine.test.ts` and add at the bottom:

```typescript
import '../data/buffs'  // side-effect: populate BUFF_REGISTRY
import { pickRandomBuffs } from './runEngine'

describe('pickRandomBuffs', () => {
  it('returns exactly n buffs', () => {
    const picks = pickRandomBuffs(3)
    expect(picks).toHaveLength(3)
  })

  it('returns no duplicates', () => {
    const picks = pickRandomBuffs(3)
    const ids = picks.map(b => b.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('returns fewer if n > pool size', () => {
    const picks = pickRandomBuffs(999)
    expect(picks.length).toBeLessThanOrEqual(9)
  })

  it('each buff has an apply function', () => {
    for (const b of pickRandomBuffs(3)) {
      expect(typeof b.apply).toBe('function')
    }
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd packages/core && pnpm vitest run src/engine/runEngine.test.ts
```
Expected: FAIL — `pickRandomBuffs is not a function`

**Step 3: Add `pickRandomBuffs` to `runEngine.ts`**

Add at the bottom of `packages/core/src/engine/runEngine.ts` (before the last export line):

```typescript
// Returns n unique buffs chosen at random from the BUFF_REGISTRY
export function pickRandomBuffs(n: number): InRunBuff[] {
  const all = Object.values(BUFF_REGISTRY)
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/core && pnpm vitest run src/engine/runEngine.test.ts
```
Expected: all new tests PASS

**Step 5: Commit**

```bash
git add packages/core/src/engine/runEngine.ts packages/core/src/engine/runEngine.test.ts
git commit -m "feat: add pickRandomBuffs to runEngine"
```

---

## Task 3: Export buffs from `packages/core/src/index.ts`

**Files:**
- Modify: `packages/core/src/index.ts`

**Step 1: Add export line**

In `packages/core/src/index.ts`, add after the existing exports:

```typescript
export * from './data/buffs'
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/core && pnpm tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat: export buffs module from core"
```

---

## Task 4: Import buffs in `App.tsx` before `loadSave`

**Files:**
- Modify: `apps/web/src/App.tsx`

**Step 1: Add side-effect import**

In `apps/web/src/App.tsx`, add this import at the top (before other imports from `@fantasymon/core`):

```typescript
import '@fantasymon/core/src/data/buffs'  // side-effect: populate BUFF_REGISTRY before loadSave
```

Wait — since `core` re-exports everything including buffs via `export * from './data/buffs'`, simply importing `ALL_BUFFS` from `@fantasymon/core` is sufficient to ensure the registry is populated. Replace the above with:

```typescript
import { ALL_BUFFS } from '@fantasymon/core'  // ensures BUFF_REGISTRY is populated before loadSave
```

Add this at the top of `App.tsx` with the other imports. It will be used in the next task, so `ALL_BUFFS` won't be unused.

**Step 2: Verify dev server starts without errors**

```bash
cd apps/web && pnpm dev
```
Expected: server starts, no import errors in console

**Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: import ALL_BUFFS in App.tsx to populate BUFF_REGISTRY before loadSave"
```

---

## Task 5: Wire buff application and buff selection UI into `BattleScreen.tsx`

**Files:**
- Modify: `apps/web/src/screens/BattleScreen.tsx`

This is the main task. Make the following changes:

**Step 1: Update imports**

Add to the import from `@fantasymon/core`:
```typescript
import { BattleEngine, getCurrentNode, generateEnemyTeamForNode, advanceNode, applyBuff, pickRandomBuffs } from '@fantasymon/core'
import type { InRunBuff } from '@fantasymon/core'
```

Also import `ALL_BUFFS` is NOT needed here — `pickRandomBuffs` handles it.

**Step 2: Add `buffOptions` state**

After the `battleResult` useState, add:

```typescript
const [buffOptions, setBuffOptions] = useState<InRunBuff[] | null>(null)
```

**Step 3: Apply active buffs before BattleEngine in the useEffect**

In the `useEffect`, replace:
```typescript
const engine = new BattleEngine(playerTeam, enemyTeam)
```
with:
```typescript
// Apply in-run buffs to a copy of the player team (does not mutate the saved roster)
let buffedTeam = playerTeam
for (const buff of runState.activeBuffs) {
  buffedTeam = buff.apply(buffedTeam)
}
const engine = new BattleEngine(buffedTeam, enemyTeam)
```

**Step 4: Trigger buff selection after non-boss victory**

Replace the `setTimeout` that calls `setBattleResult`:
```typescript
timerIds.push(setTimeout(() => {
  if (endEvent) setBattleResult(endEvent.winner)
}, delay + 500))
```
with:
```typescript
timerIds.push(setTimeout(() => {
  if (!endEvent) return
  setBattleResult(endEvent.winner)
  const isLastNode = runState.currentNodeIndex === runState.nodes.length - 1
  if (endEvent.winner === 'player' && !isLastNode) {
    // Show buff selection 800ms after result appears
    timerIds.push(setTimeout(() => setBuffOptions(pickRandomBuffs(3)), 800))
  }
}, delay + 500))
```

**Step 5: Add buff selection overlay rendering**

Replace the entire `renderVictoryOverlay` function with:

```typescript
function renderVictoryOverlay() {
  const isLastNode = runState.currentNodeIndex === runState.nodes.length - 1

  // Buff selection phase
  if (buffOptions) {
    const tierColor: Record<string, string> = {
      pet: 'bg-purple-700 text-purple-100',
      type: 'bg-blue-700 text-blue-100',
      team: 'bg-green-700 text-green-100',
    }
    return (
      <>
        <div className="text-2xl font-bold text-yellow-400 mb-4">Choose a Buff</div>
        <div className="flex gap-4">
          {buffOptions.map(buff => (
            <button
              key={buff.id}
              onClick={() => {
                const nextRun = advanceNode(applyBuff(runState, buff))
                setSave({ ...save, runState: nextRun })
                onBack()
              }}
              className="flex flex-col items-start gap-2 p-4 w-48 bg-gray-800 border-2 border-gray-600 rounded-xl hover:border-yellow-400 hover:bg-gray-700 transition-colors text-left"
            >
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${tierColor[buff.tier]}`}>
                {buff.tier.toUpperCase()}
              </span>
              <span className="text-white font-bold">{buff.name}</span>
              <span className="text-gray-300 text-sm">{buff.description}</span>
            </button>
          ))}
        </div>
      </>
    )
  }

  // Victory confirmation phase
  return (
    <>
      <div className="text-4xl font-bold text-yellow-400">Victory!</div>
      <div className="text-gray-300">
        {isLastNode ? 'Run complete!' : 'Preparing buffs…'}
      </div>
      {isLastNode && (
        <button
          onClick={() => {
            const nextState = advanceNode(runState)
            setSave({ ...save, runState: nextState })
            onBack()
          }}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
        >
          Finish Run
        </button>
      )}
    </>
  )
}
```

**Step 6: Verify in browser**

1. Start dev server: `cd apps/web && pnpm dev`
2. Start new game → Enter Dungeon
3. Wait for battle to end (player wins)
4. Confirm Victory overlay appears, then "Choose a Buff" appears with 3 cards
5. Click a card — confirm game returns to home screen
6. Enter Dungeon again — confirm chosen buff persists (Node 2/3 now active)

**Step 7: Commit**

```bash
git add apps/web/src/screens/BattleScreen.tsx
git commit -m "feat: buff selection overlay after non-boss victory, apply active buffs before battle"
```

---

## Task 6: Verify full run flow end-to-end

**Step 1: Clear localStorage and play through**

In the browser dev console:
```javascript
localStorage.clear(); location.reload()
```

**Step 2: Play through a full run**

- Start New Game → Enter Dungeon
- Node 1 (Normal): win → choose a buff → back to home
- Node 2 (Elite): win → choose a buff → back to home
- Node 3 (Boss): win → "Run complete!" + "Finish Run" button (no buff selection)
- After run ends: `runState` should be `null` in localStorage

**Step 3: Verify buff persists across refresh**

- Win Node 1, choose a buff
- Hard-refresh the page (Ctrl+Shift+R)
- Enter Dungeon again
- Confirm Node 2 is active and the chosen buff still shows in `save.runState.activeBuffs`

**Step 4: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: <description of any issues found>"
```

# EXP + Level Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pets gain EXP from every battle and level up when the threshold is reached, with level-up banners shown in the victory overlay.

**Architecture:** Pure `grantExp` function in `runEngine.ts` handles all EXP math; `BattleScreen` calls it on player victory, merges results into `save.roster`, and renders informational banners above the existing buff UI.

**Tech Stack:** TypeScript, Vitest (unit tests), React useState

---

## Task 1: `grantExp` — pure function + unit tests

**Files:**
- Modify: `packages/core/src/engine/runEngine.ts`
- Modify: `packages/core/src/engine/runEngine.test.ts`

---

### Step 1: Add the failing tests

Append the following block to the **bottom** of `packages/core/src/engine/runEngine.test.ts` (after the existing `pickRandomBuffs` describe block):

```typescript
import { grantExp } from './runEngine'
import type { Pet } from '../types'

// Creates a real Pet at the given level using generateEnemyTeamForNode
function petAt(level: number, exp = 0): Pet {
  return { ...generateEnemyTeamForNode('normal', level)[0], exp }
}

describe('grantExp', () => {
  it('adds exp without leveling up when below threshold', () => {
    const pet = petAt(5)
    // threshold: 5 * 20 = 100; 50 < 100 → no level-up
    const { updatedPets, levelUps } = grantExp([pet], 50)
    expect(updatedPets[0].exp).toBe(50)
    expect(updatedPets[0].level).toBe(5)
    expect(levelUps).toHaveLength(0)
  })

  it('levels up exactly at threshold with 0 exp leftover', () => {
    const pet = petAt(5)
    // 100 EXP = exactly the threshold; 0 leftover
    const { updatedPets, levelUps } = grantExp([pet], 100)
    expect(updatedPets[0].level).toBe(6)
    expect(updatedPets[0].exp).toBe(0)
    expect(levelUps).toHaveLength(1)
    expect(levelUps[0].newLevel).toBe(6)
    expect(levelUps[0].petId).toBe(pet.id)
  })

  it('carries over excess exp after level-up', () => {
    const pet = petAt(5)
    // 110 EXP → levels up (threshold 100), 10 left over
    const { updatedPets, levelUps } = grantExp([pet], 110)
    expect(updatedPets[0].level).toBe(6)
    expect(updatedPets[0].exp).toBe(10)
    expect(levelUps).toHaveLength(1)
  })

  it('can level up multiple times from a single grant', () => {
    const pet = petAt(5)
    // 5→6 costs 100, 6→7 costs 120; total 220 for two level-ups
    const { updatedPets, levelUps } = grantExp([pet], 220)
    expect(updatedPets[0].level).toBe(7)
    expect(levelUps).toHaveLength(2)
    expect(levelUps.map(l => l.newLevel)).toEqual([6, 7])
  })

  it('increases maxHp and currentHp by the same delta on level-up', () => {
    const pet = petAt(5)
    const { updatedPets } = grantExp([pet], 100)
    const hpDelta = updatedPets[0].maxHp - pet.maxHp
    expect(hpDelta).toBeGreaterThan(0)
    expect(updatedPets[0].currentHp).toBe(pet.currentHp + hpDelta)
  })

  it('applies exp independently to multiple pets', () => {
    const pets = [petAt(5), petAt(10)]
    const { updatedPets, levelUps } = grantExp(pets, 100)
    // pet[0] at level 5: threshold 100 → levels up
    expect(updatedPets[0].level).toBe(6)
    // pet[1] at level 10: threshold 200 → no level-up on 100 EXP
    expect(updatedPets[1].level).toBe(10)
    expect(levelUps).toHaveLength(1)
  })
})
```

---

### Step 2: Run the tests — confirm they fail

```bash
cd packages/core && npx vitest run src/engine/runEngine.test.ts
```

Expected: 6 new tests fail with "grantExp is not a function" (or similar).

---

### Step 3: Add imports to `runEngine.ts`

At the top of `packages/core/src/engine/runEngine.ts`, add two imports to the existing import block:

```typescript
import { SPECIES } from '../data/species'
import { calcMaxHp } from './statCalc'
```

Full import block after change (lines 1-3):
```typescript
import type { RunState, RunNode, RunNodeType, InRunBuff, Pet } from '../types'
import { createPet } from './petFactory'
import { SPECIES } from '../data/species'
import { calcMaxHp } from './statCalc'
```

---

### Step 4: Implement `grantExp`

Append to the **end** of `packages/core/src/engine/runEngine.ts` (after `pickRandomBuffs`):

```typescript
export function grantExp(
  pets: Pet[],
  expAmount: number
): { updatedPets: Pet[]; levelUps: Array<{ petId: string; speciesId: string; newLevel: number }> } {
  const levelUps: Array<{ petId: string; speciesId: string; newLevel: number }> = []
  const updatedPets = pets.map(pet => {
    let { exp, level, currentHp, maxHp } = pet
    exp += expAmount
    while (exp >= level * 20) {
      exp -= level * 20
      level++
      const species = SPECIES[pet.speciesId]
      if (species) {
        const newMaxHp = calcMaxHp(species.baseStats.hp, pet.ivs.hp, pet.evs.hp, level)
        currentHp += newMaxHp - maxHp
        maxHp = newMaxHp
      }
      levelUps.push({ petId: pet.id, speciesId: pet.speciesId, newLevel: level })
    }
    return { ...pet, exp, level, currentHp, maxHp }
  })
  return { updatedPets, levelUps }
}
```

---

### Step 5: Run the tests — confirm they pass

```bash
cd packages/core && npx vitest run src/engine/runEngine.test.ts
```

Expected: all tests pass (existing + 6 new).

---

### Step 6: Commit

```bash
git add packages/core/src/engine/runEngine.ts packages/core/src/engine/runEngine.test.ts
git commit -m "feat: add grantExp function with unit tests"
```

---

## Task 2: BattleScreen integration

**Files:**
- Modify: `apps/web/src/screens/BattleScreen.tsx`

---

### Step 1: Update the import line

Replace the existing import from `@fantasymon/core` (line 4 of BattleScreen.tsx):

Old:
```typescript
import { BattleEngine, getCurrentNode, generateEnemyTeamForNode, advanceNode, applyBuff, pickRandomBuffs } from '@fantasymon/core'
```

New (add `grantExp` and `SPECIES`):
```typescript
import { BattleEngine, getCurrentNode, generateEnemyTeamForNode, advanceNode, applyBuff, pickRandomBuffs, grantExp, SPECIES } from '@fantasymon/core'
```

---

### Step 2: Add `levelUps` state

After the existing two `useState` declarations (lines 22-23):
```typescript
const [battleResult, setBattleResult] = useState<'player' | 'enemy' | null>(null)
const [buffOptions, setBuffOptions] = useState<InRunBuff[] | null>(null)
```

Add:
```typescript
const [levelUps, setLevelUps] = useState<Array<{ petId: string; speciesId: string; newLevel: number }>>([])
```

---

### Step 3: Grant EXP in the victory timer

Find the timer block that calls `setBattleResult` (currently lines 66-69):
```typescript
timerIds.push(setTimeout(() => {
  if (!endEvent) return
  setBattleResult(endEvent.winner)
}, delay + 500))
```

Replace with:
```typescript
timerIds.push(setTimeout(() => {
  if (!endEvent) return
  setBattleResult(endEvent.winner)
  if (endEvent.winner === 'player') {
    const expGained = enemyTeam.reduce((sum, p) => sum + p.level * 5, 0)
    const { updatedPets, levelUps: lvUps } = grantExp(playerTeam, expGained)
    const updatedById = Object.fromEntries(updatedPets.map(p => [p.id, p]))
    setSave({ ...save, roster: save.roster.map(p => updatedById[p.id] ?? p) })
    if (lvUps.length > 0) setLevelUps(lvUps)
  }
}, delay + 500))
```

Note: `playerTeam` (un-buffed) is used — not `buffedTeam` — so buff-modified HP values are not persisted to the roster.

---

### Step 4: Render level-up banners in `renderVictoryOverlay`

The `renderVictoryOverlay` function currently (lines 95-146) has two branches:
- `if (buffOptions)` → buff card grid
- else → Victory! / Preparing buffs… / Finish Run

Add a banner block rendered **above** both branches. The banners display pet name + new level and are purely informational (no click required).

Replace the entire `renderVictoryOverlay` function with:

```tsx
function renderVictoryOverlay() {
  if (!runState) return null  // defensive guard
  const rs = runState
  const isLastNode = rs.currentNodeIndex === rs.nodes.length - 1

  const levelUpBanners = levelUps.length > 0 && (
    <div className="flex flex-col items-center gap-1 mb-3">
      {levelUps.map((lu, i) => (
        <div key={i} className="text-yellow-300 font-semibold text-sm">
          ✨ {SPECIES[lu.speciesId]?.name ?? lu.speciesId} → Lv. {lu.newLevel}!
        </div>
      ))}
    </div>
  )

  if (buffOptions) {
    return (
      <>
        {levelUpBanners}
        <div className="text-2xl font-bold text-yellow-400 mb-4">Choose a Buff</div>
        <div className="flex gap-4">
          {buffOptions.map(buff => (
            <button
              key={buff.id}
              onClick={() => {
                const nextRun = advanceNode(applyBuff(rs, buff))
                setSave({ ...save, runState: nextRun })
                onBack()
              }}
              className="flex flex-col items-start gap-2 p-4 w-48 bg-gray-800 border-2 border-gray-600 rounded-xl hover:border-yellow-400 hover:bg-gray-700 transition-colors text-left"
            >
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${TIER_COLOR[buff.tier]}`}>
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

  return (
    <>
      {levelUpBanners}
      <div className="text-4xl font-bold text-yellow-400">Victory!</div>
      <div className="text-gray-300">
        {isLastNode ? 'Run complete!' : 'Preparing buffs…'}
      </div>
      {isLastNode && (
        <button
          onClick={() => {
            const nextState = advanceNode(rs)
            setSave({ ...save, runState: nextState })
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

---

### Step 5: Build check

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no TypeScript errors.

---

### Step 6: Commit

```bash
git add apps/web/src/screens/BattleScreen.tsx
git commit -m "feat: grant EXP on victory and show level-up banners"
```

---

## Task 3: E2E verification

### Step 1: Start the dev server

```bash
cd apps/web && npm run dev
```

### Step 2: Manual test — normal battle

1. Start a new run, enter a Normal battle, win.
2. In the victory overlay (before buff cards appear), any pets that leveled up should show "✨ [Name] → Lv. N!" banners.
3. After ~0.8s the buff cards appear. Banners remain visible above them.
4. Pick a buff and advance to home.
5. Re-enter the run → go to Team screen → confirm pets now show the higher level.

### Step 3: Manual test — EXP accumulates without leveling

1. Win a battle where EXP earned is less than `level × 20`.
2. No banners should appear.
3. Inspect the pet in the roster — `exp` should have increased.

### Step 4: Manual test — save persistence

1. Win a battle that causes a level-up.
2. Hard-refresh the page.
3. The pet should still be at the higher level (EXP persisted via `save.roster`).

### Step 5: Commit (if any minor fixes were needed)

```bash
git add -A
git commit -m "fix: E2E exp/levelup adjustments"
```

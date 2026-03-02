# Run-End Rewards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a reward screen after boss victory where players spend earned gold on pet level-ups and species unlocks, with unspent gold banked to a persistent wallet.

**Architecture:** `SaveFile` gains `wallet` and `unlockedSpecies` fields. After the boss win, `BattleScreen` stops calling `onBack()` — App.tsx detects `isRunComplete` and routes to the new `RunRewardScreen`. The screen tracks a local `remaining` budget; on leave it writes back to `SaveFile`.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, Vitest

---

## Task 1: Update SaveFile type, newSave(), and loadSave()

**Files:**
- Modify: `packages/core/src/types/index.ts`
- Modify: `apps/web/src/save.ts`

### Step 1: Update the SaveFile interface

In `packages/core/src/types/index.ts`, replace lines 125-129:

```typescript
export interface SaveFile {
  roster: Pet[]
  activeTeam: string[]     // array of Pet ids (max 5)
  runState: RunState | null
  wallet: number           // persistent gold banked across runs
  unlockedSpecies: string[] // species IDs the player can receive or buy
}
```

### Step 2: Update save.ts — add DEFAULT_UNLOCKED_SPECIES constant

In `apps/web/src/save.ts`, add this constant after the `KEY` declaration (line 9):

```typescript
// Species available from the start (all common-rarity species)
const DEFAULT_UNLOCKED_SPECIES = ['embercub', 'aquafin', 'leafpup', 'voltmouse']
```

### Step 3: Update loadSave() for backward compatibility

Replace the entire `loadSave` function body so old saves without wallet/unlockedSpecies get sensible defaults:

```typescript
export function loadSave(): SaveFile | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SerializableSaveFile & { wallet?: number; unlockedSpecies?: string[] }
    const rosterIds = new Set(parsed.roster.map(p => p.id))
    const activeTeam = parsed.activeTeam.filter(id => rosterIds.has(id))
    const base = {
      ...parsed,
      activeTeam,
      wallet: parsed.wallet ?? 0,
      unlockedSpecies: parsed.unlockedSpecies ?? [...DEFAULT_UNLOCKED_SPECIES],
    }
    if (!parsed.runState) return base as SaveFile
    return {
      ...base,
      runState: reconstructBuffs({
        ...parsed.runState,
        activeBuffs: parsed.runState.activeBuffs as any,
      }),
    }
  } catch {
    return null
  }
}
```

### Step 4: Update newSave()

Replace the `newSave` function:

```typescript
export function newSave(): SaveFile {
  return { roster: [], activeTeam: [], runState: null, wallet: 0, unlockedSpecies: [...DEFAULT_UNLOCKED_SPECIES] }
}
```

### Step 5: Verify TypeScript compiles

```bash
cd /c/Users/yuema/FantasyMon/apps/web && npx tsc --noEmit 2>&1
```
Expected: no errors (TypeScript will flag any component that uses `save.wallet` or `save.unlockedSpecies` incorrectly).

### Step 6: Commit

```bash
cd /c/Users/yuema/FantasyMon
git add packages/core/src/types/index.ts apps/web/src/save.ts
git commit -m "feat: add wallet and unlockedSpecies to SaveFile"
```

---

## Task 2: Remove onBack() from BattleScreen boss-win handler

**Files:**
- Modify: `apps/web/src/screens/BattleScreen.tsx` (lines 133-144)

The "Finish Run" button currently calls `setSave(nextState)` then `onBack()`. Removing `onBack()` lets App.tsx detect `isRunComplete` and route to `RunRewardScreen` automatically.

### Step 1: Find and update the handler

In `apps/web/src/screens/BattleScreen.tsx`, find this block inside `renderVictoryOverlay`:

```typescript
{isLastNode && (
  <button
    onClick={() => {
      const nextState = advanceNode(rs)
      setSave({ ...save, runState: nextState })
      onBack()
    }}
    className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
  >
    Finish Run
  </button>
)}
```

Replace with (remove only the `onBack()` line):

```typescript
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
```

### Step 2: Verify TypeScript

```bash
cd /c/Users/yuema/FantasyMon/apps/web && npx tsc --noEmit 2>&1
```
Expected: no errors.

### Step 3: Commit

```bash
cd /c/Users/yuema/FantasyMon
git add apps/web/src/screens/BattleScreen.tsx
git commit -m "feat: don't navigate home after boss win — let App route to reward screen"
```

---

## Task 3: Add RunRewardScreen routing to App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`

### Step 1: Add isRunComplete to the import and RunRewardScreen import

Replace line 4:
```typescript
import { ALL_BUFFS, getCurrentNode } from '@fantasymon/core' // ensures BUFF_REGISTRY populated before loadSave; eslint-disable-line @typescript-eslint/no-unused-vars
```
With:
```typescript
import { ALL_BUFFS, getCurrentNode, isRunComplete } from '@fantasymon/core' // ensures BUFF_REGISTRY populated before loadSave; eslint-disable-line @typescript-eslint/no-unused-vars
```

Add this import after line 10 (`import { RestScreen } from './screens/RestScreen'`):
```typescript
import { RunRewardScreen } from './screens/RunRewardScreen'
```

### Step 2: Add routing before node-type dispatch

Replace the `if (screen === 'run')` block (lines 24-33):

```typescript
if (screen === 'run') {
  if (save.runState && isRunComplete(save.runState)) {
    return <RunRewardScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }
  const currentNode = save.runState ? getCurrentNode(save.runState) : null
  if (currentNode?.type === 'shop') {
    return <ShopScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }
  if (currentNode?.type === 'rest') {
    return <RestScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }
  return <BattleScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
}
```

### Step 3: Skip TypeScript check (RunRewardScreen doesn't exist yet)

Don't run `tsc` — the import error will be fixed in Task 4.

### Step 4: Commit

```bash
cd /c/Users/yuema/FantasyMon
git add apps/web/src/App.tsx
git commit -m "feat: route to RunRewardScreen when run is complete"
```

---

## Task 4: Create RunRewardScreen.tsx

**Files:**
- Create: `apps/web/src/screens/RunRewardScreen.tsx`

### Step 1: Create the file

```typescript
// apps/web/src/screens/RunRewardScreen.tsx
import React, { useState } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { SPECIES, calcMaxHp } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

const UNLOCK_COSTS: Partial<Record<string, number>> = { rare: 50, epic: 100 }

export function RunRewardScreen({ save, setSave, onBack }: Props) {
  const earned = save.runState?.inRunCurrency ?? 0
  const [remaining, setRemaining] = useState(earned + save.wallet)
  const [roster, setRoster] = useState(save.roster)
  const [unlockedSpecies, setUnlockedSpecies] = useState(save.unlockedSpecies)

  const lockedSpecies = Object.entries(SPECIES).filter(
    ([id, s]) => !unlockedSpecies.includes(id) && (s.rarity === 'rare' || s.rarity === 'epic')
  )

  function handleLevelUp(petId: string) {
    const pet = roster.find(p => p.id === petId)
    if (!pet) return
    const cost = pet.level * 10
    if (remaining < cost) return
    const newLevel = pet.level + 1
    const species = SPECIES[pet.speciesId]
    if (!species) return
    const newMaxHp = calcMaxHp(species.baseStats.hp, pet.ivs.hp, pet.evs.hp, newLevel)
    setRoster(prev => prev.map(p =>
      p.id === petId ? { ...p, level: newLevel, maxHp: newMaxHp, currentHp: newMaxHp } : p
    ))
    setRemaining(prev => prev - cost)
  }

  function handleUnlock(speciesId: string) {
    const species = SPECIES[speciesId]
    if (!species) return
    const cost = UNLOCK_COSTS[species.rarity] ?? 0
    if (remaining < cost) return
    setUnlockedSpecies(prev => [...prev, speciesId])
    setRemaining(prev => prev - cost)
  }

  function handleLeave() {
    setSave({ ...save, wallet: remaining, runState: null, unlockedSpecies, roster })
    onBack()
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 p-8">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <h2 className="text-3xl font-bold text-yellow-400 flex-1">🏆 Run Complete!</h2>
        <span className="text-yellow-300 font-bold text-xl">💰 {remaining} remaining</span>
      </div>
      <p className="text-gray-400 text-sm">
        Earned this run: {earned}g · Previous wallet: {save.wallet}g
      </p>

      <div className="flex gap-8 w-full max-w-4xl">
        {/* Level Up Panel */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-3">⬆️ Level Up Pets</h3>
          <div className="flex flex-col gap-3">
            {roster.map(pet => {
              const cost = pet.level * 10
              const canAfford = remaining >= cost
              const species = SPECIES[pet.speciesId]
              return (
                <div key={pet.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="text-white font-bold">{species?.name ?? pet.speciesId}</div>
                    <div className="text-gray-400 text-sm">Lv. {pet.level}</div>
                  </div>
                  <span className="text-yellow-300 text-sm">💰 {cost}</span>
                  <button
                    onClick={() => handleLevelUp(pet.id)}
                    disabled={!canAfford}
                    className={`px-3 py-1 rounded font-bold text-sm ${
                      canAfford
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Level Up
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Unlock Species Panel */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-3">🔓 Unlock Species</h3>
          {lockedSpecies.length === 0 ? (
            <p className="text-gray-400">All species unlocked!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {lockedSpecies.map(([id, species]) => {
                const cost = UNLOCK_COSTS[species.rarity] ?? 0
                const canAfford = remaining >= cost
                return (
                  <div key={id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="text-white font-bold">{species.name}</div>
                      <div className="text-gray-400 text-sm capitalize">{species.type1} · {species.rarity}</div>
                    </div>
                    <span className="text-yellow-300 text-sm">💰 {cost}</span>
                    <button
                      onClick={() => handleUnlock(id)}
                      disabled={!canAfford}
                      className={`px-3 py-1 rounded font-bold text-sm ${
                        canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Unlock
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleLeave}
        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg mt-4"
      >
        Take Rewards & Leave →
      </button>
    </div>
  )
}
```

### Step 2: Verify TypeScript compiles cleanly

```bash
cd /c/Users/yuema/FantasyMon/apps/web && npx tsc --noEmit 2>&1
```
Expected: no errors.

### Step 3: Commit

```bash
cd /c/Users/yuema/FantasyMon
git add apps/web/src/screens/RunRewardScreen.tsx
git commit -m "feat: RunRewardScreen — level up pets and unlock species after run"
```

---

## Task 5: Filter ShopScreen and RestScreen to unlockedSpecies

**Files:**
- Modify: `apps/web/src/screens/ShopScreen.tsx`
- Modify: `apps/web/src/screens/RestScreen.tsx`

### Step 1: Update ShopScreen

In `apps/web/src/screens/ShopScreen.tsx`, `pickShopEggs` currently uses `Object.keys(SPECIES)`. Change it to accept an `allowedIds` parameter:

Replace the `pickShopEggs` function (lines 14-18):
```typescript
function pickShopEggs(count: number, allowedIds: string[]): string[] {
  const shuffled = [...allowedIds].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
```

Replace the `useState` call that uses `pickShopEggs` (line 26):
```typescript
const [eggIds] = useState<string[]>(() => pickShopEggs(3, save.unlockedSpecies))
```

### Step 2: Update RestScreen

In `apps/web/src/screens/RestScreen.tsx`, `rollRandomEvent` currently uses `Object.keys(SPECIES)` for wild pet events. Change it to accept `unlockedSpecies`:

Replace the `rollRandomEvent` function signature and pet branch (lines 17-24):
```typescript
function rollRandomEvent(baseLevel: number, unlockedSpecies: string[]): RandomEvent | null {
  if (Math.random() >= 0.2) return null
  const roll = Math.random()
  if (roll < 0.33) {
    return { type: 'pet', speciesId: unlockedSpecies[Math.floor(Math.random() * unlockedSpecies.length)] }
  }
  if (roll < 0.66) return { type: 'gold', amount: 10 }
  return { type: 'hp', percent: 5 }
}
```

Replace the `useState` call for `randomEvent` (line 40):
```typescript
const [randomEvent] = useState<RandomEvent | null>(() => rollRandomEvent(baseLevel, save.unlockedSpecies))
```

### Step 3: Verify TypeScript

```bash
cd /c/Users/yuema/FantasyMon/apps/web && npx tsc --noEmit 2>&1
```
Expected: no errors.

### Step 4: Commit

```bash
cd /c/Users/yuema/FantasyMon
git add apps/web/src/screens/ShopScreen.tsx apps/web/src/screens/RestScreen.tsx
git commit -m "feat: filter shop eggs and wild pet events to unlockedSpecies"
```

---

## Task 6: End-to-end verification

### Step 1: Run all core tests

```bash
cd /c/Users/yuema/FantasyMon/packages/core && pnpm vitest run 2>&1
```
Expected: all 42 tests pass.

### Step 2: Build the web app

```bash
cd /c/Users/yuema/FantasyMon/apps/web && pnpm build 2>&1
```
Expected: build succeeds, no TypeScript errors.

### Step 3: Verify via browser DevTools (after `pnpm dev`)

Open browser console after starting a new game:
```javascript
// Check new fields exist on a fresh save
JSON.parse(localStorage.getItem('fantasymon_save'))
// Expected: { roster: [], activeTeam: [], runState: null, wallet: 0, unlockedSpecies: ['embercub','aquafin','leafpup','voltmouse'] }
```

### Step 4: Simulate run completion in console

```javascript
// Force a completed run to test reward screen routing
const save = JSON.parse(localStorage.getItem('fantasymon_save'))
// Manually set runState with currentNodeIndex past nodes.length
save.runState = { nodes: [{id:'n1',type:'boss',completed:true}], currentNodeIndex: 1, activeBuffs: [], inRunCurrency: 80 }
localStorage.setItem('fantasymon_save', JSON.stringify(save))
// Reload page, click "Continue Run" → should see RunRewardScreen
```

### Step 5: Verify reward screen behavior

- Budget shows wallet (0) + inRunCurrency (80) = 80
- Level Up: click "Level Up" on a level-5 pet → costs 50g, remaining drops to 30g, pet shows Lv. 6
- Level Up again on same pet (Lv.6 → 7 costs 60g) → button disabled (only 30g left)
- Unlock Species: click "Unlock" on Blazelion (50g rare) → disabled (30g < 50g)
- Click "Take Rewards & Leave →" → goes to home, wallet shows 30g
- Start new run → shop/rest events should only show embercub/aquafin/leafpup/voltmouse species

### Step 6: Commit any fixes found

```bash
git add -p
git commit -m "fix: <description>"
```

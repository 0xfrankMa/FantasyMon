# Shop & Rest Nodes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Shop (buy pet eggs) and Rest (heal/upgrade buff/random event) nodes to the roguelike run, plus randomised 7-node run generation and per-battle currency rewards.

**Architecture:** `createRun()` in core generates a 7-node path (fixed start/end, 4 shuffled middle nodes). `advanceNode()` automatically grants currency based on completed node type. `App.tsx` reads `currentNode.type` and routes shop/rest to new screen components instead of `BattleScreen`.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, Vitest

---

## Task 1: Random 7-node run + currency rewards in runEngine.ts

**Files:**
- Modify: `packages/core/src/engine/runEngine.ts`
- Modify: `packages/core/src/engine/runEngine.test.ts`

### Step 1: Add tests

Open `packages/core/src/engine/runEngine.test.ts` and add these test cases to the existing `describe` blocks (or add new describes at the bottom):

```typescript
describe('createRun (7-node)', () => {
  it('generates exactly 7 nodes', () => {
    const run = createRun()
    expect(run.nodes).toHaveLength(7)
  })

  it('first node is always normal', () => {
    for (let i = 0; i < 10; i++) {
      expect(createRun().nodes[0].type).toBe('normal')
    }
  })

  it('second-to-last node is always elite', () => {
    for (let i = 0; i < 10; i++) {
      const run = createRun()
      expect(run.nodes[5].type).toBe('elite')
    }
  })

  it('last node is always boss', () => {
    for (let i = 0; i < 10; i++) {
      expect(createRun().nodes[6].type).toBe('boss')
    }
  })

  it('middle 4 nodes contain exactly one of: normal, elite, shop, rest', () => {
    const run = createRun()
    const middle = run.nodes.slice(1, 5).map(n => n.type)
    expect(middle.sort()).toEqual(['elite', 'normal', 'rest', 'shop'])
  })
})

describe('advanceNode currency', () => {
  it('awards 10 gold for completing a normal node', () => {
    const run = createRun()
    // force first node to be 'normal' (it always is)
    const advanced = advanceNode(run)
    expect(advanced.inRunCurrency).toBe(10)
  })

  it('awards 0 gold for completing a shop node', () => {
    const run = createRun()
    // Build a minimal run with a shop node at index 0
    const shopRun: typeof run = {
      ...run,
      nodes: [{ id: 'n1', type: 'shop', completed: false }, ...run.nodes.slice(1)],
    }
    const advanced = advanceNode(shopRun)
    expect(advanced.inRunCurrency).toBe(0)
  })

  it('awards 50 gold for completing a boss node', () => {
    const run = createRun()
    const bossRun: typeof run = {
      ...run,
      nodes: [{ id: 'n1', type: 'boss', completed: false }],
      currentNodeIndex: 0,
    }
    const advanced = advanceNode(bossRun)
    expect(advanced.inRunCurrency).toBe(50)
  })
})
```

### Step 2: Run tests to confirm they fail

```bash
cd C:\Users\yuema\FantasyMon\packages\core && pnpm vitest run src/engine/runEngine.test.ts
```
Expected: several FAIL (createRun returns 3 nodes, advanceNode doesn't add currency)

### Step 3: Update runEngine.ts

Replace `createRun` and `advanceNode` with:

```typescript
const CURRENCY_BY_NODE: Partial<Record<RunNodeType, number>> = {
  normal: 10,
  elite: 20,
  boss: 50,
}

export function createRun(): RunState {
  const middle: RunNode[] = (
    [
      { id: generateId(), type: 'normal' as RunNodeType, completed: false },
      { id: generateId(), type: 'elite'  as RunNodeType, completed: false },
      { id: generateId(), type: 'shop'   as RunNodeType, completed: false },
      { id: generateId(), type: 'rest'   as RunNodeType, completed: false },
    ] as RunNode[]
  ).sort(() => Math.random() - 0.5)

  const nodes: RunNode[] = [
    { id: generateId(), type: 'normal', completed: false },   // fixed start
    ...middle,                                                  // 4 shuffled
    { id: generateId(), type: 'elite',  completed: false },   // fixed pre-boss
    { id: generateId(), type: 'boss',   completed: false },   // fixed end
  ]
  return { nodes, currentNodeIndex: 0, activeBuffs: [], inRunCurrency: 0 }
}

export function advanceNode(run: RunState): RunState {
  if (run.currentNodeIndex >= run.nodes.length) {
    throw new Error('advanceNode: run is already complete')
  }
  const completedNode = run.nodes[run.currentNodeIndex]
  const reward = CURRENCY_BY_NODE[completedNode.type] ?? 0
  const nodes = run.nodes.map((n, i) =>
    i === run.currentNodeIndex ? { ...n, completed: true } : n
  )
  return {
    ...run,
    nodes,
    currentNodeIndex: run.currentNodeIndex + 1,
    inRunCurrency: run.inRunCurrency + reward,
  }
}
```

### Step 4: Run tests to confirm they pass

```bash
cd C:\Users\yuema\FantasyMon\packages\core && pnpm vitest run src/engine/runEngine.test.ts
```
Expected: all tests PASS

### Step 5: Commit

```bash
cd C:\Users\yuema\FantasyMon
git add packages/core/src/engine/runEngine.ts packages/core/src/engine/runEngine.test.ts
git commit -m "feat: 7-node random run generation and per-node currency rewards"
```

---

## Task 2: Route shop/rest nodes in App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`

### Step 1: Read App.tsx

Read the file to understand current imports and screen routing logic.

### Step 2: Add imports and routing

Add imports for the two new screens (they don't exist yet — TypeScript will error, that's OK for now — fix in Tasks 3+4):

```typescript
import { ShopScreen } from './screens/ShopScreen'
import { RestScreen } from './screens/RestScreen'
```

Also add `getCurrentNode` to the import from `@fantasymon/core`:
```typescript
import { ALL_BUFFS, getCurrentNode } from '@fantasymon/core'
```

Replace the `screen === 'run'` block:

```typescript
if (screen === 'run') {
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

### Step 3: Skip TypeScript check for now (screens don't exist yet)

Don't run `tsc` yet — the import errors will be fixed in Tasks 3 and 4.

### Step 4: Commit

```bash
cd C:\Users\yuema\FantasyMon
git add apps/web/src/App.tsx
git commit -m "feat: route shop/rest nodes to dedicated screens in App.tsx"
```

---

## Task 3: ShopScreen.tsx

**Files:**
- Create: `apps/web/src/screens/ShopScreen.tsx`

**No unit tests** for this UI component — verify manually in browser.

### Step 1: Create ShopScreen.tsx

```typescript
// apps/web/src/screens/ShopScreen.tsx
import React, { useState } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { SPECIES, createPet, advanceNode, getCurrentNode } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

const PRICES: Record<string, number> = { common: 15, rare: 25, epic: 40 }

function pickShopEggs(count: number): string[] {
  const ids = Object.keys(SPECIES)
  const shuffled = [...ids].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function ShopScreen({ save, setSave, onBack }: Props) {
  const runState = save.runState
  const currentNode = runState ? getCurrentNode(runState) : null
  const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
  const baseLevel = playerTeam[0]?.level ?? 5

  const [eggIds] = useState<string[]>(() => pickShopEggs(3))
  const [purchased, setPurchased] = useState<Set<string>>(() => new Set())
  const [currency, setCurrency] = useState(runState?.inRunCurrency ?? 0)

  if (!runState || !currentNode) return null

  function handleBuy(speciesId: string) {
    const species = SPECIES[speciesId]
    if (!species) return
    const price = PRICES[species.rarity] ?? 15
    if (currency < price) return
    const newPet = createPet(speciesId, baseLevel)
    const newCurrency = currency - price
    setCurrency(newCurrency)
    setPurchased(prev => new Set([...prev, speciesId + '_' + newPet.id]))
    setSave({
      ...save,
      roster: [...save.roster, newPet],
      runState: { ...runState, inRunCurrency: newCurrency },
    })
  }

  function handleLeave() {
    const nextRun = advanceNode({ ...runState, inRunCurrency: currency })
    setSave({ ...save, runState: nextRun })
    onBack()
  }

  const TYPE_COLORS: Record<string, string> = {
    fire: 'bg-orange-600', water: 'bg-blue-600', grass: 'bg-green-600',
    electric: 'bg-yellow-500', dark: 'bg-purple-700', light: 'bg-yellow-200',
    steel: 'bg-gray-500', dragon: 'bg-indigo-600',
  }
  const RARITY_COLORS: Record<string, string> = {
    common: 'text-gray-300', rare: 'text-blue-400', epic: 'text-purple-400', legendary: 'text-yellow-400',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-4 w-full max-w-3xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400 flex-1">🏪 Shop</h2>
        <span className="text-yellow-300 font-bold text-lg">💰 {currency}</span>
      </div>

      <p className="text-gray-400">Today's eggs — buy to add to your roster</p>

      <div className="flex gap-6">
        {eggIds.map((speciesId, i) => {
          const species = SPECIES[speciesId]
          if (!species) return null
          const price = PRICES[species.rarity] ?? 15
          const isBought = [...purchased].some(k => k.startsWith(speciesId + '_'))
          const canAfford = currency >= price

          return (
            <div
              key={speciesId + i}
              className="flex flex-col items-center gap-3 p-5 w-48 bg-gray-800 border-2 border-gray-600 rounded-xl"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${TYPE_COLORS[species.type1] ?? 'bg-gray-600'}`}>
                🥚
              </div>
              <div className="text-white font-bold text-center">{species.name}</div>
              <div className="flex gap-2">
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{species.type1}</span>
              </div>
              <div className={`text-sm font-semibold ${RARITY_COLORS[species.rarity]}`}>
                {species.rarity.charAt(0).toUpperCase() + species.rarity.slice(1)}
              </div>
              <div className="text-yellow-300 font-bold">💰 {price}</div>
              {isBought ? (
                <div className="text-green-400 font-semibold">✓ Purchased</div>
              ) : (
                <button
                  onClick={() => handleBuy(speciesId)}
                  disabled={!canAfford}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                    canAfford
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Buy
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleLeave}
        className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg mt-4"
      >
        Leave Shop →
      </button>
    </div>
  )
}
```

### Step 2: Verify TypeScript compiles

```bash
cd C:\Users\yuema\FantasyMon\apps\web && npx tsc --noEmit 2>&1
```
Expected: error only about RestScreen (not yet created), ShopScreen itself should be clean.

### Step 3: Commit

```bash
cd C:\Users\yuema\FantasyMon
git add apps/web/src/screens/ShopScreen.tsx
git commit -m "feat: ShopScreen — buy pet eggs with in-run currency"
```

---

## Task 4: RestScreen.tsx

**Files:**
- Create: `apps/web/src/screens/RestScreen.tsx`

### Step 1: Create RestScreen.tsx

```typescript
// apps/web/src/screens/RestScreen.tsx
import React, { useState } from 'react'
import type { SaveFile, InRunBuff } from '@fantasymon/core'
import { SPECIES, createPet, advanceNode, getCurrentNode } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

type RandomEvent =
  | { type: 'pet'; speciesId: string }
  | { type: 'gold'; amount: number }
  | { type: 'hp'; percent: number }

function rollRandomEvent(baseLevel: number): RandomEvent | null {
  if (Math.random() >= 0.2) return null
  const roll = Math.random()
  if (roll < 0.33) {
    const ids = Object.keys(SPECIES)
    return { type: 'pet', speciesId: ids[Math.floor(Math.random() * ids.length)] }
  }
  if (roll < 0.66) return { type: 'gold', amount: 10 }
  return { type: 'hp', percent: 5 }
}

function eventDescription(event: RandomEvent): string {
  if (event.type === 'pet') return `A wild ${SPECIES[event.speciesId]?.name ?? 'creature'} joined your roster!`
  if (event.type === 'gold') return `You found a gold pouch! +${event.amount} gold.`
  return `A healing spring! All pets gain +${event.percent}% max HP.`
}

export function RestScreen({ save, setSave, onBack }: Props) {
  const runState = save.runState
  const currentNode = runState ? getCurrentNode(runState) : null
  const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
  const baseLevel = playerTeam[0]?.level ?? 5

  const [randomEvent] = useState<RandomEvent | null>(() => rollRandomEvent(baseLevel))
  const [eventAcknowledged, setEventAcknowledged] = useState(false)
  const [upgradingBuff, setUpgradingBuff] = useState(false)
  const [done, setDone] = useState(false)

  if (!runState || !currentNode || done) return null

  // Apply random event to save once when acknowledged
  function acknowledgeEvent() {
    if (!randomEvent || !runState) return
    let updated = { ...save }
    if (randomEvent.type === 'pet') {
      const newPet = createPet(randomEvent.speciesId, baseLevel)
      updated = { ...updated, roster: [...updated.roster, newPet] }
    } else if (randomEvent.type === 'gold') {
      updated = { ...updated, runState: { ...runState, inRunCurrency: runState.inRunCurrency + randomEvent.amount } }
    } else if (randomEvent.type === 'hp') {
      const mult = 1 + randomEvent.percent / 100
      const roster = updated.roster.map(p =>
        save.activeTeam.includes(p.id)
          ? { ...p, maxHp: Math.round(p.maxHp * mult), currentHp: Math.round(p.currentHp * mult) }
          : p
      )
      updated = { ...updated, roster }
    }
    setSave(updated)
    setEventAcknowledged(true)
  }

  function handleHeal() {
    const roster = save.roster.map(p =>
      save.activeTeam.includes(p.id) ? { ...p, currentHp: p.maxHp } : p
    )
    const nextRun = advanceNode(runState)
    setSave({ ...save, roster, runState: nextRun })
    setDone(true)
    onBack()
  }

  function handleUpgradeBuff(buff: InRunBuff) {
    // Upgrading = apply the same buff again (compounds the effect multiplicatively)
    const roster = save.roster.map(p => {
      if (!save.activeTeam.includes(p.id)) return p
      const result = buff.apply([p])
      return result[0]
    })
    const nextRun = advanceNode({
      ...runState,
      activeBuffs: [...runState.activeBuffs, buff],
    })
    setSave({ ...save, roster, runState: nextRun })
    setDone(true)
    onBack()
  }

  const showEvent = randomEvent && !eventAcknowledged
  const canUpgrade = runState.activeBuffs.length > 0

  // Random event acknowledgement screen
  if (showEvent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-4 w-full max-w-lg">
          <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
          <h2 className="text-2xl font-bold text-yellow-400">✨ Random Event!</h2>
        </div>
        <div className="p-6 bg-gray-800 border-2 border-yellow-500 rounded-xl max-w-sm text-center">
          <div className="text-4xl mb-4">
            {randomEvent.type === 'pet' ? '🐾' : randomEvent.type === 'gold' ? '💰' : '💧'}
          </div>
          <p className="text-white text-lg">{eventDescription(randomEvent)}</p>
        </div>
        <button
          onClick={acknowledgeEvent}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg"
        >
          Continue
        </button>
      </div>
    )
  }

  // Buff selection sub-panel
  if (upgradingBuff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-2xl font-bold text-yellow-400">⬆️ Upgrade Which Buff?</h2>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {runState.activeBuffs.map(buff => (
            <button
              key={buff.id}
              onClick={() => handleUpgradeBuff(buff)}
              className="flex flex-col items-start p-4 bg-gray-800 border-2 border-gray-600 rounded-xl hover:border-yellow-400 hover:bg-gray-700 transition-colors text-left"
            >
              <span className="text-white font-bold">{buff.name}</span>
              <span className="text-gray-400 text-sm">{buff.description}</span>
              <span className="text-yellow-400 text-xs mt-1">→ Effect ×1.5 after upgrade</span>
            </button>
          ))}
        </div>
        <button onClick={() => setUpgradingBuff(false)} className="text-gray-400 hover:text-white">← Back</button>
      </div>
    )
  }

  // Main rest options
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-4 w-full max-w-lg">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400">🏕️ Rest Stop</h2>
      </div>
      <p className="text-gray-400">Choose one:</p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <div className="p-5 bg-gray-800 border-2 border-gray-600 rounded-xl">
          <div className="text-xl mb-1">💚 Full Heal</div>
          <p className="text-gray-400 text-sm mb-4">Restore all active pets to full HP.</p>
          <button
            onClick={handleHeal}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
          >
            Choose
          </button>
        </div>
        <div className={`p-5 bg-gray-800 border-2 rounded-xl ${canUpgrade ? 'border-gray-600' : 'border-gray-700 opacity-50'}`}>
          <div className="text-xl mb-1">⬆️ Upgrade Buff</div>
          <p className="text-gray-400 text-sm mb-4">
            {canUpgrade ? 'Amplify one of your active buffs.' : 'No active buffs to upgrade.'}
          </p>
          <button
            onClick={() => setUpgradingBuff(true)}
            disabled={!canUpgrade}
            className={`w-full py-2 font-bold rounded-lg ${
              canUpgrade
                ? 'bg-purple-700 hover:bg-purple-600 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Choose
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Verify TypeScript compiles

```bash
cd C:\Users\yuema\FantasyMon\apps\web && npx tsc --noEmit 2>&1
```
Expected: no errors.

### Step 3: Commit

```bash
cd C:\Users\yuema\FantasyMon
git add apps/web/src/screens/RestScreen.tsx
git commit -m "feat: RestScreen — full heal, buff upgrade, random events"
```

---

## Task 5: End-to-end verification

### Step 1: Start dev server

```bash
cd C:\Users\yuema\FantasyMon\apps\web && pnpm dev
```

### Step 2: Clear save and verify 7-node run in browser console

Open browser DevTools → Console:
```javascript
JSON.parse(localStorage.getItem('fantasymon_save')).runState.nodes.map(n => n.type)
// Expected: array of 7 types, first='normal', last='boss', sixth='elite'
```

### Step 3: Navigate to a Shop node

Play through battles until reaching a Shop node. Verify:
- Shop header shows current gold (should be ≥10 from first normal battle win)
- 3 egg cards show with species name, type, rarity, price
- Buy button disabled when gold is insufficient
- Buying adds pet to roster (check Team Builder)
- "Leave Shop →" advances to next node

### Step 4: Navigate to a Rest node

Play through to a Rest node. Verify:
- Random event may appear first (20% chance — reload a few times to trigger it)
- Full Heal restores all active pets to max HP
- Upgrade Buff option is greyed out when no buffs are active
- After winning a battle and choosing a buff, Rest node should show Upgrade Buff as enabled
- Upgrade Buff → selecting a buff → advances node and returns to home

### Step 5: Final commit if any fixes needed

```bash
git add -p
git commit -m "fix: <description>"
```

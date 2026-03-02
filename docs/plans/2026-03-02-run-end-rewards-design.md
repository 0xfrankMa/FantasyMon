# FantasyMon — Run-End Rewards Design

**Date**: 2026-03-02
**Feature**: Run-end reward screen — spend earned gold on pet level-ups and species unlocks

---

## 1. Data Model

Two new fields added to `SaveFile` (`packages/core/src/types/index.ts`):

```typescript
export interface SaveFile {
  roster: Pet[]
  activeTeam: string[]
  runState: RunState | null
  wallet: number            // persistent gold carried across runs
  unlockedSpecies: string[] // species IDs the player can receive/buy
}
```

`newSave()` (`apps/web/src/save.ts`) initializes:
- `wallet: 0`
- `unlockedSpecies`: all species IDs with rarity `'common'`

Common species are available from the start. Rare and epic species start locked.

### Unlock costs by rarity

| Rarity | Cost |
|--------|------|
| rare   | 50g  |
| epic   | 100g |

### Level-up cost

`cost = pet.level × 10` gold (e.g. level 5→6 costs 50g, level 10→11 costs 100g)

### Currency flow

- `save.runState.inRunCurrency` = gold earned this run
- `save.wallet` = gold banked from previous runs
- Total budget on reward screen = `inRunCurrency + wallet`
- On leave: `wallet = budget - spent`; `runState = null`

### Locked species effects

- `ShopScreen`: only shows eggs from `save.unlockedSpecies`
- `RestScreen` wild-pet event: only picks from `save.unlockedSpecies`

---

## 2. Routing

`App.tsx` adds one routing check before the existing node-type dispatch:

```typescript
if (screen === 'run') {
  if (save.runState && isRunComplete(save.runState)) {
    return <RunRewardScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }
  // existing shop/rest/battle routing...
}
```

`BattleScreen` boss-win "Finish Run" handler: remove the `onBack()` call. After `setSave(nextState)`, React re-renders, `isRunComplete` is true, App.tsx routes to `RunRewardScreen` automatically.

`RunRewardScreen` "Leave" button:
1. `wallet = budget - spent`
2. `setSave({ ...save, wallet, runState: null, unlockedSpecies: updatedUnlocked })`
3. `onBack()` → home screen

---

## 3. RunRewardScreen UI

**Header**: "🏆 Run Complete!" · live budget display `💰 {remaining}`

**Left panel — Level Up Pets**
- Lists every pet in `save.roster`
- Each row: species name · current level · cost badge (`💰 level × 10`) · "Level Up" button
- Button disabled when `remaining < cost`
- On click: `pet.level++`, recalculate `maxHp` via `calcStat(baseStats.hp, ivs.hp, evs.hp, newLevel) + 10`, set `currentHp = maxHp`, deduct cost
- Same pet can be leveled multiple times in one session

**Right panel — Unlock Species**
- Lists all species NOT in `save.unlockedSpecies`
- Each card: species name · type badge · rarity · cost · "Unlock" button
- Button disabled when `remaining < cost`
- On click: append species ID to `unlockedSpecies`, deduct cost

**Footer**: "Take Rewards & Leave →" — always available

---

## 4. Files Changed

| File | Change |
|------|--------|
| `packages/core/src/types/index.ts` | Add `wallet` and `unlockedSpecies` to `SaveFile` |
| `apps/web/src/save.ts` | Update `newSave()` to initialize `wallet` and `unlockedSpecies` |
| `packages/core/src/index.ts` | Export `isRunComplete` if not already exported |
| `apps/web/src/App.tsx` | Add `isRunComplete` routing before node-type dispatch |
| `apps/web/src/screens/BattleScreen.tsx` | Remove `onBack()` from boss-win handler |
| `apps/web/src/screens/RunRewardScreen.tsx` | **New** — reward screen UI |
| `apps/web/src/screens/ShopScreen.tsx` | Filter `pickShopEggs` to `save.unlockedSpecies` |
| `apps/web/src/screens/RestScreen.tsx` | Filter wild-pet event to `save.unlockedSpecies` |

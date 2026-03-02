# FantasyMon — Shop & Rest Nodes Design

**Date**: 2026-03-02
**Feature**: Shop node (egg buying) + Rest node (HP restore / buff upgrade / random events) + random run generation

---

## 1. Run Structure

Runs are **7 nodes**, generated randomly with fixed start/end:

```
Node 1:   Normal Battle   (fixed)
Nodes 2-5: shuffle([Normal, Elite, Shop, Rest])
Node 6:   Elite Battle   (fixed)
Node 7:   Boss Battle    (fixed)
```

`createRun()` is updated to produce this structure. The middle 4 nodes are a random permutation of one of each: normal, elite, shop, rest.

### Currency Rewards (on battle win)

| Node Type | Reward |
|-----------|--------|
| Normal    | +10 gold |
| Elite     | +20 gold |
| Boss      | +50 gold |

`inRunCurrency` is incremented in `advanceNode` (or in the victory handler) based on the completed node type.

---

## 2. Routing

`App.tsx` currently routes `screen === 'run'` entirely to `BattleScreen`. With shop and rest nodes, routing becomes:

```
screen === 'run'
  └─ currentNode.type === 'shop'  → <ShopScreen>
  └─ currentNode.type === 'rest'  → <RestScreen>
  └─ otherwise (battle nodes)     → <BattleScreen>
```

`App.tsx` reads `currentNode` from `save.runState` and renders the appropriate screen.

---

## 3. Shop Node

**File:** `apps/web/src/screens/ShopScreen.tsx`

### Layout

- Header: Back button · "🏪 Shop" title · gold display (`💰 {inRunCurrency}`)
- Body: 3 egg cards generated once on mount (random species from the full species pool)
- Footer: "Leave Shop →" button → `advanceNode` → `setSave` → `onBack()`

### Egg Cards

Each card shows:
- Species name + type badge
- Rarity badge (Common / Rare / Epic)
- Price: Common = 15g, Rare = 25g, Epic = 40g
- Buy button: disabled + grey when `inRunCurrency < price` or already purchased

On purchase:
1. Deduct price from `inRunCurrency`
2. `createPet(speciesId, baseLevel)` → append to `save.roster`
3. `setSave(...)` — card shows "Owned ✓"

`baseLevel` = `playerTeam[0]?.level ?? 5` (same as battle node scaling).

### Egg generation

3 species chosen at random from `Object.keys(SPECIES)` on component mount (no re-roll on re-render). Stored in `useState` so it's stable.

---

## 4. Rest Node

**File:** `apps/web/src/screens/RestScreen.tsx`

### Flow

1. On mount: roll `Math.random() < 0.2` → if true, show random event card first
2. After event acknowledged (or if no event): show two-option panel
3. Player picks one option → `advanceNode` → `setSave` → `onBack()`

### Random Event Pool (3 events, equal weight)

| Event | Effect |
|-------|--------|
| Wild pet found | `createPet(randomSpeciesId, baseLevel)` → append to roster |
| Found gold pouch | `inRunCurrency += 10` |
| Healing spring | All active team pets: `maxHp = Math.round(maxHp * 1.05)`, `currentHp = Math.round(currentHp * 1.05)` |

### Two-Option Panel

**Option A — Full Heal:**
- All pets in `save.activeTeam`: `currentHp = maxHp`
- Always available

**Option B — Upgrade Buff:**
- Only enabled when `runState.activeBuffs.length > 0`
- If multiple buffs: show a sub-list to pick which buff to upgrade
- Upgrade effect: for the chosen buff, re-run `buff.apply(playerTeam)` with a ×1.5 amplified version
- Implementation: create an upgraded copy of the buff (new `apply` that multiplies `inRunStatMults` values by 1.5 instead of the original factor), replace the buff in `activeBuffs`

---

## 5. Files Changed

| File | Change |
|------|--------|
| `packages/core/src/engine/runEngine.ts` | Update `createRun()` to generate 7-node random path; add currency reward to `advanceNode` |
| `apps/web/src/App.tsx` | Route shop/rest nodes to new screens |
| `apps/web/src/screens/ShopScreen.tsx` | **New** — egg shop UI |
| `apps/web/src/screens/RestScreen.tsx` | **New** — rest + random event UI |

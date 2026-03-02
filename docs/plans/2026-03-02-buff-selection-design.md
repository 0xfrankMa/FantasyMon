# FantasyMon — Post-Battle Buff Selection Design

**Date**: 2026-03-02
**Feature**: In-run buff selection overlay after each battle victory

---

## 1. Overview

After winning a non-boss battle node, the player is presented with 3 randomly chosen buffs and must pick one. The chosen buff persists for the remainder of the run and is applied to the player's team before every subsequent battle.

---

## 2. Buff Pool (9 buffs, 3 per tier)

### Pet Tier (targets one specific pet)

| ID | Name | Effect |
|----|------|--------|
| `pet_vanguard` | Vanguard | Fastest pet on team +35% Speed |
| `pet_survivor` | Survivor | Lowest-HP pet on team +25% max HP |
| `pet_berserker` | Berserker | Highest ATK pet on team +25% ATK |

### Type Tier (targets all pets of a given type)

| ID | Name | Effect |
|----|------|--------|
| `type_fire_surge` | Flame Surge | All Fire-type pets +20% ATK |
| `type_water_guard` | Tidal Guard | All Water-type pets +20% DEF |
| `type_elec_dash` | Lightning Dash | All Electric-type pets +20% Speed |

### Team Tier (targets the full team)

| ID | Name | Effect |
|----|------|--------|
| `team_battle_cry` | Battle Cry | All pets +15% ATK |
| `team_tailwind` | Tailwind | All pets +15% Speed |
| `team_fortify` | Fortify | All pets +15% max HP (and currentHp) |

---

## 3. UI Flow

```
battleResult = null        → battle in progress (canvas animation)
battleResult = 'enemy'     → Defeated overlay (unchanged)
battleResult = 'player'
  └─ non-boss node → 500ms delay → buffOptions = [3 random buffs]
  └─ boss node     → "Run Complete!" (no buff, run ends)

buffOptions set → Buff selection overlay shown (3 cards)
  └─ player clicks card → applyBuff + advanceNode → setSave → onBack()
```

**State added to BattleScreen:**
```typescript
const [buffOptions, setBuffOptions] = useState<InRunBuff[] | null>(null)
```

After `setBattleResult('player')`, a 500 ms setTimeout sets `buffOptions` to 3 random picks (skipped for boss nodes).

---

## 4. Buff Selection UI

Three cards rendered as an overlay on top of the canvas (same `absolute inset-0` pattern as victory/defeat overlays):

```
┌─────────────────────────────────────────┐
│           ✨ Choose a Buff ✨             │
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │ [tier] │  │ [tier] │  │ [tier] │    │
│  │  Name  │  │  Name  │  │  Name  │    │
│  │  desc  │  │  desc  │  │  desc  │    │
│  └────────┘  └────────┘  └────────┘    │
└─────────────────────────────────────────┘
```

- Tier badge color: pet=purple, type=blue, team=green
- Click any card to select — no confirmation needed
- On selection: `applyBuff(runState, chosen)` → `advanceNode` → `setSave` → `onBack()`

---

## 5. Buff Application in Battle

Before constructing `BattleEngine`, apply all active buffs to a copy of the player team:

```typescript
let buffedTeam = playerTeam
for (const buff of runState.activeBuffs) {
  buffedTeam = buff.apply(buffedTeam)
}
const engine = new BattleEngine(buffedTeam, enemyTeam)
```

Buffs modify in-memory copies only — the persisted `roster` stats are never mutated.

---

## 6. Serialization

`save.ts` already handles stripping `apply` on write and calling `reconstructBuffs` on load. The new `buffs.ts` module must be imported in `App.tsx` before `loadSave()` is called, so the `BUFF_REGISTRY` is populated in time for rehydration.

---

## 7. Files Changed

| File | Change |
|------|--------|
| `packages/core/src/data/buffs.ts` | **New** — 9 buff definitions, all registered via `registerBuff` |
| `packages/core/src/engine/runEngine.ts` | Add `pickRandomBuffs(n: number): InRunBuff[]` |
| `packages/core/src/index.ts` | Export `buffs` module |
| `apps/web/src/App.tsx` | Import `buffs.ts` side-effectfully before `loadSave` |
| `apps/web/src/screens/BattleScreen.tsx` | Apply active buffs before BattleEngine; add `buffOptions` state + buff selection overlay |

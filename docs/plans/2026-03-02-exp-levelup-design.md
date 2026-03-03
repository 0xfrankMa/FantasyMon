# FantasyMon — EXP + Level Up Design

**Date**: 2026-03-02
**Feature**: Pets gain EXP from battles and level up when the threshold is reached

---

## 1. EXP Formula + Level-Up Threshold

**EXP gained per battle:** `sum(enemyPet.level × 5)` across the full enemy team.
- Normal node (2 enemies at level 5): ~50 EXP
- Elite node (3 enemies at level 10): ~150 EXP
- Boss node (5 enemies at level 15): ~375 EXP

**All active-team pets** receive the full `expGained` amount.

**Level-up threshold:** `level × 20` EXP to advance to the next level.
- Level 5 → 6: 100 EXP required
- Level 10 → 11: 200 EXP required

**EXP carries over:** excess EXP after a level-up rolls into the next level. A pet can level up multiple times from one battle.

**HP on level-up:** `currentHp` increases by the same delta as `maxHp` — no full heal, but the stat gain is applied immediately.

**EXP persists across runs:** `Pet.exp` lives in `SaveFile.roster`.

---

## 2. Core Logic

New pure function in `packages/core/src/engine/runEngine.ts`:

```typescript
export function grantExp(
  pets: Pet[],
  expAmount: number
): { updatedPets: Pet[]; levelUps: Array<{ petId: string; speciesId: string; newLevel: number }> }
```

Per-pet logic:
1. `pet.exp += expAmount`
2. While `pet.exp >= pet.level * 20`:
   - Subtract threshold from `pet.exp`
   - Increment `pet.level`
   - Recalculate `newMaxHp = calcMaxHp(baseStats.hp, ivs.hp, evs.hp, newLevel)`
   - `currentHp += newMaxHp - oldMaxHp`
   - Record `{ petId, speciesId, newLevel }` in levelUps

Called from `BattleScreen` on player victory with the buffed `playerTeam` and full `enemyTeam`.

Unit-tested: basic gain, exact threshold, multi-level-up, HP delta.

---

## 3. BattleScreen Integration

**Trigger:** when `battleResult === 'player'` is set (same moment victory overlay appears).

**Flow:**
```
Win detected
  → grantExp(playerTeam, expGained) → updatedPets + levelUps
  → merge updatedPets into save.roster via setSave
  → store levelUps in useState
  → Victory overlay shows level-up banners above buff cards:
      "✨ Embercub → Lv. 6!"
      "✨ Aquafin → Lv. 7!"
  → (non-boss, after 1.3s) buff cards appear
  → player picks buff → advanceNode → onBack
```

Level-up banners are informational only — no extra click required.

EXP is granted to the **buffed** team (actual combatants), written back to `save.roster` by `pet.id`.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `packages/core/src/engine/runEngine.ts` | Add `grantExp` function |
| `packages/core/src/engine/runEngine.test.ts` | Unit tests for `grantExp` |
| `apps/web/src/screens/BattleScreen.tsx` | Call `grantExp` on victory, show level-up banners |

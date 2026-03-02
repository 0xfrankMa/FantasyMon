/**
 * IMPORTANT: All modules that call `registerBuff()` from @fantasymon/core
 * must be imported BEFORE calling `loadSave()`. Otherwise active buff
 * `apply` functions cannot be rehydrated and will be silently dropped.
 */
import type { SaveFile, RunState } from '@fantasymon/core'
import { reconstructBuffs } from '@fantasymon/core'

const KEY = 'fantasymon_save'

// Starter species (common-rarity); rare/epic must be unlocked via run-end rewards
const DEFAULT_UNLOCKED_SPECIES = ['embercub', 'aquafin', 'leafpup', 'voltmouse']

// Serializable version of SaveFile — activeBuffs store only metadata, not the apply function
type SerializableSaveFile = Omit<SaveFile, 'runState'> & {
  runState: (Omit<RunState, 'activeBuffs'> & {
    activeBuffs: Array<{ id: string; name: string; description: string; tier: 'pet' | 'type' | 'team' }>
  }) | null
}

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
      wallet: (typeof parsed.wallet === 'number' && Number.isFinite(parsed.wallet) && parsed.wallet >= 0) ? parsed.wallet : 0,
      unlockedSpecies: [...new Set(parsed.unlockedSpecies ?? DEFAULT_UNLOCKED_SPECIES)],
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

export function writeSave(save: SaveFile): void {
  const serializable: SerializableSaveFile = {
    ...save,
    runState: save.runState ? {
      ...save.runState,
      activeBuffs: save.runState.activeBuffs.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        tier: b.tier,
      })),
    } : null,
  }
  localStorage.setItem(KEY, JSON.stringify(serializable))
}

export function newSave(): SaveFile {
  return { roster: [], activeTeam: [], runState: null, wallet: 0, unlockedSpecies: [...DEFAULT_UNLOCKED_SPECIES] }
}

export function deleteSave(): void {
  localStorage.removeItem(KEY)
}

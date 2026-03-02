/**
 * IMPORTANT: All modules that call `registerBuff()` from @fantasymon/core
 * must be imported BEFORE calling `loadSave()`. Otherwise active buff
 * `apply` functions cannot be rehydrated and will be silently dropped.
 */
import type { SaveFile, RunState } from '@fantasymon/core'
import { reconstructBuffs } from '@fantasymon/core'

const KEY = 'fantasymon_save'

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
    const parsed = JSON.parse(raw) as SerializableSaveFile
    if (!parsed.runState) return parsed as unknown as SaveFile
    // Rehydrate buff apply functions from registry
    const rehydrated: SaveFile = {
      ...parsed,
      runState: reconstructBuffs({
        ...parsed.runState,
        activeBuffs: parsed.runState.activeBuffs as any,
      }),
    }
    return rehydrated
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
  return { roster: [], activeTeam: [], runState: null }
}

export function deleteSave(): void {
  localStorage.removeItem(KEY)
}

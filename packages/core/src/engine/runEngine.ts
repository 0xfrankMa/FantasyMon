// packages/core/src/engine/runEngine.ts
import type { RunState, RunNode, InRunBuff } from '../types'

function generateId(): string {
  return crypto.randomUUID()
}

export function createRun(): RunState {
  const nodes: RunNode[] = [
    { id: generateId(), type: 'normal', completed: false },
    { id: generateId(), type: 'elite', completed: false },
    { id: generateId(), type: 'boss', completed: false },
  ]
  return { nodes, currentNodeIndex: 0, activeBuffs: [], inRunCurrency: 0 }
}

export function advanceNode(run: RunState): RunState {
  if (run.currentNodeIndex >= run.nodes.length) {
    throw new Error('advanceNode: run is already complete')
  }
  const nodes = run.nodes.map((n, i) =>
    i === run.currentNodeIndex ? { ...n, completed: true } : n
  )
  return { ...run, nodes, currentNodeIndex: run.currentNodeIndex + 1 }
}

export function applyBuff(run: RunState, buff: InRunBuff): RunState {
  return { ...run, activeBuffs: [...run.activeBuffs, buff] }
}

export function isRunComplete(run: RunState): boolean {
  return run.currentNodeIndex >= run.nodes.length
}

export function getCurrentNode(run: RunState): RunNode | null {
  return run.nodes[run.currentNodeIndex] ?? null
}

export function generateEnemyTeamForNode(nodeType: RunNode['type'], playerLevel: number): string[] {
  // Returns array of speciesIds for enemy team based on node type
  // Enemy level is derived from playerLevel by the caller (petFactory.createPet)
  const normal = ['aquafin', 'leafpup', 'voltmouse']
  const elite = ['tidalshark', 'thicketfox', 'stormhare']
  const boss  = ['tidalshark', 'thicketfox', 'stormhare', 'ironpup', 'shadowkit']

  switch (nodeType) {
    case 'normal': return normal.slice(0, 2)
    case 'elite':  return elite.slice(0, 3)
    case 'boss':   return boss
    default:       throw new Error(`generateEnemyTeamForNode: no enemy roster for node type "${nodeType}"`)
  }
}

// Registry of all in-run buffs by id — used to reconstruct apply functions after deserialization
export const BUFF_REGISTRY: Record<string, InRunBuff> = {}

// Register a buff so it can be reconstructed after save/load
export function registerBuff(buff: InRunBuff): void {
  BUFF_REGISTRY[buff.id] = buff
}

// Reconstruct activeBuffs from serialized run state (replace apply-less objects with full buff objects)
export function reconstructBuffs(run: RunState): RunState {
  return {
    ...run,
    activeBuffs: run.activeBuffs
      .map(b => BUFF_REGISTRY[b.id] ?? b)
      .filter(b => typeof b.apply === 'function'),
  }
}

// packages/core/src/engine/runEngine.ts
import type { RunState, RunNode, InRunBuff, Pet } from '../types'
import { createPet } from './petFactory'

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

export function generateEnemyTeamForNode(nodeType: RunNode['type'], playerLevel = 5): Pet[] {
  // Enemy level scales up by node type to provide increasing difficulty
  const levelByType: Record<RunNode['type'], number> = {
    normal: playerLevel,
    elite:  playerLevel + 2,
    boss:   playerLevel + 5,
    shop:   playerLevel,
    rest:   playerLevel,
  }
  const enemyLevel = levelByType[nodeType] ?? playerLevel

  const normalIds = ['aquafin', 'leafpup', 'voltmouse']
  const eliteIds  = ['tidalshark', 'thicketfox', 'stormhare']
  const bossIds   = ['tidalshark', 'thicketfox', 'stormhare', 'ironpup', 'shadowkit']

  let speciesIds: string[]
  switch (nodeType) {
    case 'normal': speciesIds = normalIds.slice(0, 2); break
    case 'elite':  speciesIds = eliteIds.slice(0, 3);  break
    case 'boss':   speciesIds = bossIds;               break
    default:       throw new Error(`generateEnemyTeamForNode: no enemy roster for node type "${nodeType}"`)
  }

  return speciesIds.map(id => createPet(id, enemyLevel))
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

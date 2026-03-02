// packages/core/src/engine/runEngine.ts
import type { RunState, RunNode, InRunBuff, Pet } from '../types'

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
    default:       return normal.slice(0, 1)
  }
}

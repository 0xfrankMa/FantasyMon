// packages/core/src/engine/runEngine.ts
import type { RunState, RunNode, RunNodeType, InRunBuff, Pet } from '../types'
import { createPet } from './petFactory'
import { SPECIES } from '../data/species'
import { calcMaxHp } from './statCalc'

function generateId(): string {
  return crypto.randomUUID()
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
    { id: generateId(), type: 'normal', completed: false },
    ...middle,
    { id: generateId(), type: 'elite',  completed: false },
    { id: generateId(), type: 'boss',   completed: false },
  ]
  return { nodes, currentNodeIndex: 0, activeBuffs: [], inRunCurrency: 0 }
}

const CURRENCY_BY_NODE: Partial<Record<RunNodeType, number>> = {
  normal: 10,
  elite: 20,
  boss: 50,
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

// Returns n unique buffs chosen at random from the BUFF_REGISTRY
export function pickRandomBuffs(n: number): InRunBuff[] {
  const all = Object.values(BUFF_REGISTRY)
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

export function grantExp(
  pets: Pet[],
  expAmount: number
): { updatedPets: Pet[]; levelUps: Array<{ petId: string; speciesId: string; newLevel: number }> } {
  const levelUps: Array<{ petId: string; speciesId: string; newLevel: number }> = []
  const updatedPets = pets.map(pet => {
    let { exp, level, currentHp, maxHp } = pet
    exp += expAmount
    while (exp >= level * 20) {
      exp -= level * 20
      level++
      const species = SPECIES[pet.speciesId]
      if (species) {
        const newMaxHp = calcMaxHp(species.baseStats.hp, pet.ivs.hp, pet.evs.hp, level)
        currentHp += newMaxHp - maxHp
        maxHp = newMaxHp
      }
      levelUps.push({ petId: pet.id, speciesId: pet.speciesId, newLevel: level })
    }
    return { ...pet, exp, level, currentHp, maxHp }
  })
  return { updatedPets, levelUps }
}

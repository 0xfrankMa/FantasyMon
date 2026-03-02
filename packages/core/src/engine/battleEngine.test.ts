// packages/core/src/engine/battleEngine.test.ts
import { describe, it, expect } from 'vitest'
import { BattleEngine } from './battleEngine'
import { createPet } from './petFactory'

function makeTeam(speciesId: string, level: number, count: number) {
  return Array.from({ length: count }, () => createPet(speciesId, level))
}

describe('BattleEngine', () => {
  it('emits battle_end event', () => {
    const playerTeam = makeTeam('embercub', 10, 3)
    const enemyTeam = makeTeam('aquafin', 1, 1)
    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()
    const endEvent = events.find(e => e.type === 'battle_end')
    expect(endEvent).toBeDefined()
  })

  it('player wins against much weaker enemy', () => {
    const playerTeam = makeTeam('blazelion', 50, 5)
    const enemyTeam = makeTeam('aquafin', 1, 1)
    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()
    const endEvent = events.find(e => e.type === 'battle_end') as any
    expect(endEvent?.winner).toBe('player')
  })

  it('emits faint events for defeated units', () => {
    const playerTeam = makeTeam('blazelion', 50, 5)
    const enemyTeam = makeTeam('aquafin', 1, 1)
    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()
    const faintEvents = events.filter(e => e.type === 'faint')
    expect(faintEvents.length).toBeGreaterThan(0)
  })
})

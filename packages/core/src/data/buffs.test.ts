// packages/core/src/data/buffs.test.ts
import { describe, it, expect } from 'vitest'
import { ALL_BUFFS } from './buffs'
import { BUFF_REGISTRY } from '../engine/runEngine'
import type { Pet } from '../types'

function stubPet(id: string, overrides: Partial<Pet> = {}): Pet {
  return {
    id,
    speciesId: 'embercub',
    level: 5, exp: 0,
    nature: { id: 'hardy', boostedStat: 'atk', reducedStat: 'atk' },
    ivs: { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, speed: 15 },
    evs: { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 },
    skills: [], evolutionStage: 0,
    currentHp: 20, maxHp: 20, statusEffects: [],
    ...overrides,
  }
}

describe('ALL_BUFFS', () => {
  it('has exactly 9 buffs', () => {
    expect(ALL_BUFFS).toHaveLength(9)
  })

  it('each buff is registered in BUFF_REGISTRY with an apply function', () => {
    for (const buff of ALL_BUFFS) {
      const registered = BUFF_REGISTRY[buff.id]
      expect(registered, `buff "${buff.id}" should be in BUFF_REGISTRY`).toBeDefined()
      expect(typeof registered.apply, `buff "${buff.id}" apply should be a function`).toBe('function')
    }
  })

  it('team_fortify increases maxHp by 15% and currentHp by 15%', () => {
    const fortify = BUFF_REGISTRY['team_fortify']
    expect(fortify).toBeDefined()

    const pet = stubPet('p1', { maxHp: 100, currentHp: 80 })
    const result = fortify.apply([pet])

    expect(result[0].maxHp).toBe(115)
    expect(result[0].currentHp).toBe(92)
  })

  it('team_battle_cry sets inRunStatMults.atk to 1.15 on all pets', () => {
    const buff = ALL_BUFFS.find(b => b.id === 'team_battle_cry')!
    const pets = [stubPet('p1'), stubPet('p2')]
    const result = buff.apply(pets)
    expect(result[0].inRunStatMults?.atk).toBeCloseTo(1.15)
    expect(result[1].inRunStatMults?.atk).toBeCloseTo(1.15)
  })

  it('pet_vanguard boosts only the fastest pet via inRunStatMults.speed', () => {
    const vanguard = BUFF_REGISTRY['pet_vanguard']
    expect(vanguard).toBeDefined()

    const slowPet = stubPet('slow', { ivs: { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, speed: 10 } })
    const fastPet = stubPet('fast', { ivs: { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, speed: 30 } })

    const result = vanguard.apply([slowPet, fastPet])

    const resultSlow = result.find(p => p.id === 'slow')!
    const resultFast = result.find(p => p.id === 'fast')!

    // Slow pet should be unchanged (no inRunStatMults.speed set)
    expect(resultSlow.inRunStatMults?.speed).toBeUndefined()
    // Fast pet should have boosted speed multiplier
    expect(resultFast.inRunStatMults?.speed).toBeCloseTo(1.35)
  })
})

// packages/core/src/engine/runEngine.test.ts
import { describe, it, expect } from 'vitest'
import { createRun, advanceNode, applyBuff, isRunComplete, getCurrentNode, generateEnemyTeamForNode } from './runEngine'
import type { RunState } from '../types'

describe('createRun', () => {
  it('creates a 7-node run starting with normal and ending with elite -> boss', () => {
    const run = createRun()
    expect(run.nodes).toHaveLength(7)
    expect(run.nodes[0].type).toBe('normal')
    expect(run.nodes[5].type).toBe('elite')
    expect(run.nodes[6].type).toBe('boss')
  })
  it('starts at node 0', () => {
    const run = createRun()
    expect(run.currentNodeIndex).toBe(0)
  })
})

describe('advanceNode', () => {
  it('marks current node completed and increments index', () => {
    const run = createRun()
    const next = advanceNode(run)
    expect(next.nodes[0].completed).toBe(true)
    expect(next.currentNodeIndex).toBe(1)
  })
})

describe('applyBuff', () => {
  it('appends a buff to activeBuffs', () => {
    const run = createRun()
    const buff = { id: 'test-buff', name: 'Test', description: 'desc', tier: 'team' as const, apply: (pets: any) => pets }
    const next = applyBuff(run, buff)
    expect(next.activeBuffs).toHaveLength(1)
    expect(next.activeBuffs[0].id).toBe('test-buff')
  })
})

describe('isRunComplete', () => {
  it('returns false at start', () => {
    expect(isRunComplete(createRun())).toBe(false)
  })
  it('returns true after advancing past all nodes', () => {
    let run = createRun()
    run = advanceNode(run) // node 0 done, index=1
    run = advanceNode(run) // node 1 done, index=2
    run = advanceNode(run) // node 2 done, index=3
    run = advanceNode(run) // node 3 done, index=4
    run = advanceNode(run) // node 4 done, index=5
    run = advanceNode(run) // node 5 done, index=6
    run = advanceNode(run) // node 6 done, index=7
    expect(isRunComplete(run)).toBe(true)
  })
})

describe('getCurrentNode', () => {
  it('returns the current node', () => {
    const run = createRun()
    expect(getCurrentNode(run)?.type).toBe('normal')
  })
  it('returns null when run is complete', () => {
    let run = createRun()
    for (let i = 0; i < 7; i++) run = advanceNode(run)
    expect(getCurrentNode(run)).toBeNull()
  })
})

describe('generateEnemyTeamForNode', () => {
  it('returns 2 species for normal node', () => {
    expect(generateEnemyTeamForNode('normal', 5)).toHaveLength(2)
  })
  it('returns 3 species for elite node', () => {
    expect(generateEnemyTeamForNode('elite', 10)).toHaveLength(3)
  })
  it('returns 5 species for boss node', () => {
    expect(generateEnemyTeamForNode('boss', 15)).toHaveLength(5)
  })
  it('throws for non-combat node types', () => {
    expect(() => generateEnemyTeamForNode('shop' as any, 5)).toThrow()
  })
})

describe('createRun (7-node)', () => {
  it('generates exactly 7 nodes', () => {
    expect(createRun().nodes).toHaveLength(7)
  })
  it('first node is always normal', () => {
    for (let i = 0; i < 10; i++) expect(createRun().nodes[0].type).toBe('normal')
  })
  it('node at index 5 is always elite', () => {
    for (let i = 0; i < 10; i++) expect(createRun().nodes[5].type).toBe('elite')
  })
  it('last node is always boss', () => {
    for (let i = 0; i < 10; i++) expect(createRun().nodes[6].type).toBe('boss')
  })
  it('middle 4 nodes (index 1-4) contain exactly one each of normal/elite/shop/rest', () => {
    const run = createRun()
    const middle = run.nodes.slice(1, 5).map(n => n.type).sort()
    expect(middle).toEqual(['elite', 'normal', 'rest', 'shop'])
  })
})

describe('advanceNode currency', () => {
  it('awards 10 gold for completing a normal node', () => {
    const run = createRun() // first node is always normal
    expect(advanceNode(run).inRunCurrency).toBe(10)
  })
  it('awards 0 gold for completing a shop node', () => {
    const run = createRun()
    const shopRun: RunState = { ...run, nodes: [{ id: 'n1', type: 'shop', completed: false }, ...run.nodes.slice(1)] }
    expect(advanceNode(shopRun).inRunCurrency).toBe(0)
  })
  it('awards 50 gold for completing a boss node', () => {
    const run = createRun()
    const bossRun: RunState = { ...run, nodes: [{ id: 'n1', type: 'boss', completed: false }], currentNodeIndex: 0 }
    expect(advanceNode(bossRun).inRunCurrency).toBe(50)
  })
})

import '../data/buffs'  // side-effect: populate BUFF_REGISTRY
import { pickRandomBuffs, BUFF_REGISTRY, grantExp } from './runEngine'

describe('pickRandomBuffs', () => {
  it('returns exactly n buffs', () => {
    const picks = pickRandomBuffs(3)
    expect(picks).toHaveLength(3)
  })

  it('returns no duplicates', () => {
    const picks = pickRandomBuffs(3)
    const ids = picks.map(b => b.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('returns all buffs if n exceeds pool size', () => {
    const poolSize = Object.keys(BUFF_REGISTRY).length
    const picks = pickRandomBuffs(999)
    expect(picks).toHaveLength(poolSize)
  })

  it('each returned buff has an apply function', () => {
    for (const b of pickRandomBuffs(3)) {
      expect(typeof b.apply).toBe('function')
    }
  })
})

import type { Pet } from '../types'

// Creates a real Pet at the given level using generateEnemyTeamForNode
function petAt(level: number, exp = 0): Pet {
  return { ...generateEnemyTeamForNode('normal', level)[0], exp }
}

describe('grantExp', () => {
  it('adds exp without leveling up when below threshold', () => {
    const pet = petAt(5)
    // threshold: 5 * 20 = 100; 50 < 100 → no level-up
    const { updatedPets, levelUps } = grantExp([pet], 50)
    expect(updatedPets[0].exp).toBe(50)
    expect(updatedPets[0].level).toBe(5)
    expect(levelUps).toHaveLength(0)
  })

  it('levels up exactly at threshold with 0 exp leftover', () => {
    const pet = petAt(5)
    // 100 EXP = exactly the threshold; 0 leftover
    const { updatedPets, levelUps } = grantExp([pet], 100)
    expect(updatedPets[0].level).toBe(6)
    expect(updatedPets[0].exp).toBe(0)
    expect(levelUps).toHaveLength(1)
    expect(levelUps[0].newLevel).toBe(6)
    expect(levelUps[0].petId).toBe(pet.id)
  })

  it('carries over excess exp after level-up', () => {
    const pet = petAt(5)
    // 110 EXP → levels up (threshold 100), 10 left over
    const { updatedPets, levelUps } = grantExp([pet], 110)
    expect(updatedPets[0].level).toBe(6)
    expect(updatedPets[0].exp).toBe(10)
    expect(levelUps).toHaveLength(1)
  })

  it('can level up multiple times from a single grant', () => {
    const pet = petAt(5)
    // 5→6 costs 100, 6→7 costs 120; total 220 for two level-ups
    const { updatedPets, levelUps } = grantExp([pet], 220)
    expect(updatedPets[0].level).toBe(7)
    expect(levelUps).toHaveLength(2)
    expect(levelUps.map(l => l.newLevel)).toEqual([6, 7])
  })

  it('increases maxHp and currentHp by the same delta on level-up', () => {
    const pet = petAt(5)
    const { updatedPets } = grantExp([pet], 100)
    const hpDelta = updatedPets[0].maxHp - pet.maxHp
    expect(hpDelta).toBeGreaterThan(0)
    expect(updatedPets[0].currentHp).toBe(pet.currentHp + hpDelta)
  })

  it('applies exp independently to multiple pets', () => {
    const pets = [petAt(5), petAt(10)]
    const { updatedPets, levelUps } = grantExp(pets, 100)
    // pet[0] at level 5: threshold 100 → levels up
    expect(updatedPets[0].level).toBe(6)
    // pet[1] at level 10: threshold 200 → no level-up on 100 EXP
    expect(updatedPets[1].level).toBe(10)
    expect(levelUps).toHaveLength(1)
  })
})

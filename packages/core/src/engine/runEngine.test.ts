// packages/core/src/engine/runEngine.test.ts
import { describe, it, expect } from 'vitest'
import { createRun, advanceNode, applyBuff, isRunComplete, getCurrentNode, generateEnemyTeamForNode } from './runEngine'

describe('createRun', () => {
  it('creates a 3-node run: normal -> elite -> boss', () => {
    const run = createRun()
    expect(run.nodes).toHaveLength(3)
    expect(run.nodes[0].type).toBe('normal')
    expect(run.nodes[1].type).toBe('elite')
    expect(run.nodes[2].type).toBe('boss')
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
    run = advanceNode(advanceNode(advanceNode(run)))
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

import '../data/buffs'  // side-effect: populate BUFF_REGISTRY
import { pickRandomBuffs, BUFF_REGISTRY } from './runEngine'

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

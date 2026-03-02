// packages/core/src/engine/runEngine.test.ts
import { describe, it, expect } from 'vitest'
import { createRun, advanceNode, applyBuff } from './runEngine'

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

// packages/core/src/data/typeChart.test.ts
import { describe, it, expect } from 'vitest'
import { getTypeMultiplier } from './typeChart'

describe('getTypeMultiplier', () => {
  it('fire is super effective against grass', () => {
    expect(getTypeMultiplier('fire', 'grass')).toBe(2.0)
  })
  it('fire is not very effective against water', () => {
    expect(getTypeMultiplier('fire', 'water')).toBe(0.5)
  })
  it('neutral matchup returns 1.0', () => {
    expect(getTypeMultiplier('fire', 'electric')).toBe(1.0)
  })
})

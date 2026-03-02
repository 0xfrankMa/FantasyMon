// packages/core/src/engine/statCalc.test.ts
import { describe, it, expect } from 'vitest'
import { calcStat, calcMaxHp } from './statCalc'

describe('calcStat', () => {
  it('calculates a stat at level 50 with no EVs or IVs', () => {
    // Formula: floor(((2*base + iv + floor(ev/4)) * level / 100) + 5)
    const result = calcStat(60, 0, 0, 50)
    expect(result).toBe(65) // floor(((120)*50/100)+5) = floor(60+5) = 65
  })
  it('IVs increase the stat', () => {
    const withIv = calcStat(60, 31, 0, 50)
    const withoutIv = calcStat(60, 0, 0, 50)
    expect(withIv).toBeGreaterThan(withoutIv)
  })
})

describe('calcMaxHp', () => {
  it('HP uses a different formula', () => {
    // Formula: floor(((2*base + iv + floor(ev/4)) * level / 100) + level + 10)
    const result = calcMaxHp(45, 0, 0, 50)
    expect(result).toBe(105) // floor((90*50/100)+50+10) = floor(45+60) = 105
  })
})

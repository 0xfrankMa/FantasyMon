// packages/core/src/engine/petFactory.test.ts
import { describe, it, expect } from 'vitest'
import { createPet } from './petFactory'

describe('createPet', () => {
  it('creates a pet from a species id', () => {
    const pet = createPet('embercub', 5)
    expect(pet.speciesId).toBe('embercub')
    expect(pet.level).toBe(5)
    expect(pet.skills.length).toBeGreaterThan(0)
    expect(pet.currentHp).toBeGreaterThan(0)
  })
  it('pet starts with skills appropriate for its level', () => {
    const pet = createPet('embercub', 1)
    // At level 1, embercub only knows 'scratch'
    expect(pet.skills.map(s => s.skill.id)).toContain('scratch')
  })
})

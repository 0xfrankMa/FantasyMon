// packages/core/src/data/buffs.ts
import type { InRunBuff, Pet } from '../types'
import { registerBuff } from '../engine/runEngine'
import { SPECIES } from './species'

const buffs: InRunBuff[] = [
  // ── Pet tier ────────────────────────────────────────────────────────────────

  {
    id: 'pet_vanguard',
    name: 'Vanguard',
    description: 'Your fastest pet gains +35% Speed.',
    tier: 'pet',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      const target = pets.reduce((best, p) =>
        p.ivs.speed + p.evs.speed > best.ivs.speed + best.evs.speed ? p : best
      )
      return pets.map(p =>
        p.id === target.id
          ? { ...p, ivs: { ...p.ivs, speed: Math.round(p.ivs.speed * 1.35) } }
          : { ...p }
      )
    },
  },

  {
    id: 'pet_survivor',
    name: 'Survivor',
    description: 'Your lowest-HP pet gains +25% max HP.',
    tier: 'pet',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      const target = pets.reduce((lowest, p) =>
        p.currentHp < lowest.currentHp ? p : lowest
      )
      return pets.map(p =>
        p.id === target.id
          ? {
              ...p,
              maxHp: Math.round(p.maxHp * 1.25),
              currentHp: Math.round(p.currentHp * 1.25),
            }
          : { ...p }
      )
    },
  },

  {
    id: 'pet_berserker',
    name: 'Berserker',
    description: 'Your highest ATK pet gains +25% ATK.',
    tier: 'pet',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      const target = pets.reduce((best, p) =>
        p.ivs.atk + p.evs.atk > best.ivs.atk + best.evs.atk ? p : best
      )
      return pets.map(p =>
        p.id === target.id
          ? { ...p, ivs: { ...p.ivs, atk: Math.round(p.ivs.atk * 1.25) } }
          : { ...p }
      )
    },
  },

  // ── Type tier ────────────────────────────────────────────────────────────────

  {
    id: 'type_fire_surge',
    name: 'Flame Surge',
    description: 'All Fire-type pets gain +20% ATK.',
    tier: 'type',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      return pets.map(p => {
        const species = SPECIES[p.speciesId]
        if (species && (species.type1 === 'fire' || species.type2 === 'fire')) {
          return { ...p, ivs: { ...p.ivs, atk: Math.round(p.ivs.atk * 1.20) } }
        }
        return { ...p }
      })
    },
  },

  {
    id: 'type_water_guard',
    name: 'Tidal Guard',
    description: 'All Water-type pets gain +20% DEF.',
    tier: 'type',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      return pets.map(p => {
        const species = SPECIES[p.speciesId]
        if (species && (species.type1 === 'water' || species.type2 === 'water')) {
          return { ...p, ivs: { ...p.ivs, def: Math.round(p.ivs.def * 1.20) } }
        }
        return { ...p }
      })
    },
  },

  {
    id: 'type_elec_dash',
    name: 'Lightning Dash',
    description: 'All Electric-type pets gain +20% Speed.',
    tier: 'type',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      return pets.map(p => {
        const species = SPECIES[p.speciesId]
        if (species && (species.type1 === 'electric' || species.type2 === 'electric')) {
          return { ...p, ivs: { ...p.ivs, speed: Math.round(p.ivs.speed * 1.20) } }
        }
        return { ...p }
      })
    },
  },

  // ── Team tier ────────────────────────────────────────────────────────────────

  {
    id: 'team_battle_cry',
    name: 'Battle Cry',
    description: 'All pets gain +15% ATK.',
    tier: 'team',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      return pets.map(p => ({ ...p, ivs: { ...p.ivs, atk: Math.round(p.ivs.atk * 1.15) } }))
    },
  },

  {
    id: 'team_tailwind',
    name: 'Tailwind',
    description: 'All pets gain +15% Speed.',
    tier: 'team',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      return pets.map(p => ({ ...p, ivs: { ...p.ivs, speed: Math.round(p.ivs.speed * 1.15) } }))
    },
  },

  {
    id: 'team_fortify',
    name: 'Fortify',
    description: 'All pets gain +15% max HP.',
    tier: 'team',
    apply(pets: Pet[]): Pet[] {
      if (pets.length === 0) return pets
      return pets.map(p => ({
        ...p,
        maxHp: Math.round(p.maxHp * 1.15),
        currentHp: Math.round(p.currentHp * 1.15),
      }))
    },
  },
]

// Register all buffs into the global registry (side-effect on import)
buffs.forEach(b => registerBuff(b))

export const ALL_BUFFS: InRunBuff[] = buffs

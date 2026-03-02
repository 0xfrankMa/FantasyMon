// packages/core/src/engine/petFactory.ts
import type { Pet, Nature, StatBlock } from '../types'
import { SPECIES } from '../data/species'
import { SKILLS } from '../data/skills'
import { calcMaxHp } from './statCalc'

const NATURES: Nature[] = [
  { id:'hardy',   boostedStat:'atk',   reducedStat:'atk'   },
  { id:'lonely',  boostedStat:'atk',   reducedStat:'def'   },
  { id:'brave',   boostedStat:'atk',   reducedStat:'speed' },
  { id:'adamant', boostedStat:'atk',   reducedStat:'spAtk' },
  { id:'naughty', boostedStat:'atk',   reducedStat:'spDef' },
  { id:'bold',    boostedStat:'def',   reducedStat:'atk'   },
  { id:'docile',  boostedStat:'def',   reducedStat:'def'   },
  { id:'relaxed', boostedStat:'def',   reducedStat:'speed' },
  { id:'impish',  boostedStat:'def',   reducedStat:'spAtk' },
  { id:'lax',     boostedStat:'def',   reducedStat:'spDef' },
  { id:'timid',   boostedStat:'speed', reducedStat:'atk'   },
  { id:'hasty',   boostedStat:'speed', reducedStat:'def'   },
  { id:'serious', boostedStat:'speed', reducedStat:'speed' },
  { id:'jolly',   boostedStat:'speed', reducedStat:'spAtk' },
  { id:'naive',   boostedStat:'speed', reducedStat:'spDef' },
  { id:'modest',  boostedStat:'spAtk', reducedStat:'atk'   },
  { id:'mild',    boostedStat:'spAtk', reducedStat:'def'   },
  { id:'quiet',   boostedStat:'spAtk', reducedStat:'speed' },
  { id:'bashful', boostedStat:'spAtk', reducedStat:'spAtk' },
  { id:'rash',    boostedStat:'spAtk', reducedStat:'spDef' },
  { id:'calm',    boostedStat:'spDef', reducedStat:'atk'   },
  { id:'gentle',  boostedStat:'spDef', reducedStat:'def'   },
  { id:'sassy',   boostedStat:'spDef', reducedStat:'speed' },
  { id:'careful', boostedStat:'spDef', reducedStat:'spAtk' },
  { id:'quirky',  boostedStat:'spDef', reducedStat:'spDef' },
]

function randomIvs(): StatBlock {
  const r = () => Math.floor(Math.random() * 32)
  return { hp:r(), atk:r(), def:r(), spAtk:r(), spDef:r(), speed:r() }
}

const ZERO_EVS: StatBlock = { hp:0, atk:0, def:0, spAtk:0, spDef:0, speed:0 }

export function createPet(speciesId: string, level: number): Pet {
  const species = SPECIES[speciesId]
  if (!species) throw new Error(`Unknown species: ${speciesId}`)

  const nature = NATURES[Math.floor(Math.random() * NATURES.length)]
  const ivs = randomIvs()
  const evs = { ...ZERO_EVS }

  const learnedSkills = species.learnset
    .filter(e => e.level <= level)
    .sort((a, b) => a.level - b.level)
    .slice(-4) // keep last 4 learned skills
    .map(e => {
      const skill = SKILLS[e.skillId]
      if (!skill) throw new Error(`Unknown skill: ${e.skillId} in species ${speciesId}`)
      return { skill, cooldownRemaining: 0 }
    })

  const maxHp = calcMaxHp(species.baseStats.hp, ivs.hp, evs.hp, level)

  const evolutionStage = Object.values(SPECIES).some(
    s => s.evolutions.some(e => e.targetSpeciesId === speciesId)
  ) ? 1 : 0

  return {
    id: crypto.randomUUID(),
    speciesId,
    level,
    exp: 0,
    nature,
    ivs,
    evs,
    skills: learnedSkills,
    evolutionStage,
    currentHp: maxHp,
    maxHp,
    statusEffects: [],
  }
}

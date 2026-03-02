// packages/core/src/types/index.ts

export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'dark' | 'light' | 'steel' | 'dragon'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export type SkillCategory = 'physical' | 'special' | 'status'

export interface StatBlock {
  hp: number
  atk: number
  def: number
  spAtk: number
  spDef: number
  speed: number
}

export interface Nature {
  id: string
  boostedStat: keyof Omit<StatBlock, 'hp'>
  reducedStat: keyof Omit<StatBlock, 'hp'>
}

export interface StatusEffect {
  type: 'burn' | 'slow' | 'shield' | 'poison'
  duration: number         // turns remaining
  value: number            // magnitude (e.g. 0.1 = 10% dmg per turn for burn)
}

export interface SkillEffect {
  statusEffect?: StatusEffect
  healPercent?: number     // % of target max HP healed
  statMod?: { stat: keyof StatBlock; multiplier: number }
  target?: 'self' | 'opponent'  // who receives the effect (defaults to 'opponent' if omitted)
}

export interface Skill {
  id: string
  name: string
  type: ElementType
  power: number
  accuracy: number         // 0-100
  category: SkillCategory
  effect?: SkillEffect
  cooldown: number         // turns before reuse
}

export interface SkillSlot {
  skill: Skill
  cooldownRemaining: number
}

export interface EvolutionPath {
  targetSpeciesId: string
  requiredLevel?: number
  requiredItemId?: string
}

export interface LearnsetEntry {
  skillId: string
  level: number            // level at which this skill can be learned
}

export interface Species {
  id: string
  name: string
  type1: ElementType
  type2?: ElementType
  baseStats: StatBlock
  evolutions: EvolutionPath[]
  learnset: LearnsetEntry[]
  rarity: Rarity
}

export interface Pet {
  id: string
  speciesId: string
  nickname?: string
  level: number
  exp: number
  nature: Nature
  ivs: StatBlock
  evs: StatBlock
  skills: SkillSlot[]
  evolutionStage: number
  currentHp: number        // tracked during battle
  maxHp: number
  statusEffects: StatusEffect[]
}

export type BattleEvent =
  | { type: 'turn_start'; order: string[] }
  | { type: 'attack'; attackerId: string; targetId: string; skillId: string; damage: number }
  | { type: 'status'; unitId: string; effect: StatusEffect }
  | { type: 'heal'; unitId: string; amount: number }
  | { type: 'faint'; unitId: string }
  | { type: 'battle_end'; winner: 'player' | 'enemy' }

export type RunNodeType = 'normal' | 'elite' | 'boss' | 'shop' | 'rest'

export interface RunNode {
  id: string
  type: RunNodeType
  completed: boolean
}

export interface InRunBuff {
  id: string
  name: string
  description: string
  tier: 'pet' | 'type' | 'team'
  apply: (pets: Pet[]) => Pet[]   // pure function, returns modified pets
}

export interface RunState {
  nodes: RunNode[]
  currentNodeIndex: number
  activeBuffs: InRunBuff[]
  inRunCurrency: number
}

export interface SaveFile {
  roster: Pet[]
  activeTeam: string[]     // array of Pet ids (max 5)
  runState: RunState | null
}

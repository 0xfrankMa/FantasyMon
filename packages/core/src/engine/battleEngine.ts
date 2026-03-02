// packages/core/src/engine/battleEngine.ts
import type { Pet, BattleEvent, Skill, StatusEffect } from '../types'
import { SPECIES } from '../data/species'
import { getTypeMultiplier } from '../data/typeChart'
import { calcStat } from './statCalc'

function getEffectiveSpeed(pet: Pet): number {
  const species = SPECIES[pet.speciesId]
  let speed = calcStat(species.baseStats.speed, pet.ivs.speed, pet.evs.speed, pet.level)
  // Apply nature modifier
  if (pet.nature.boostedStat === 'speed') speed = Math.floor(speed * 1.05)
  if (pet.nature.reducedStat === 'speed') speed = Math.floor(speed * 0.95)
  // Apply slow status if present
  const slowEffect = pet.statusEffects?.find(s => s.type === 'slow')
  if (slowEffect) speed = Math.floor(speed * (1 - slowEffect.value))
  return speed
}

function calcDamage(attacker: Pet, defender: Pet, skill: Skill): number {
  const atkSpecies = SPECIES[attacker.speciesId]
  const defSpecies = SPECIES[defender.speciesId]

  const attackStat = skill.category === 'physical'
    ? calcStat(atkSpecies.baseStats.atk, attacker.ivs.atk, attacker.evs.atk, attacker.level)
    : calcStat(atkSpecies.baseStats.spAtk, attacker.ivs.spAtk, attacker.evs.spAtk, attacker.level)

  const defenseStat = skill.category === 'physical'
    ? calcStat(defSpecies.baseStats.def, defender.ivs.def, defender.evs.def, defender.level)
    : calcStat(defSpecies.baseStats.spDef, defender.ivs.spDef, defender.evs.spDef, defender.level)

  // Apply nature modifier to attack stat
  const atkNatureMod = skill.category === 'physical'
    ? (attacker.nature.boostedStat === 'atk' ? 1.05 : attacker.nature.reducedStat === 'atk' ? 0.95 : 1.0)
    : (attacker.nature.boostedStat === 'spAtk' ? 1.05 : attacker.nature.reducedStat === 'spAtk' ? 0.95 : 1.0)

  const typeMulti = getTypeMultiplier(skill.type, defSpecies.type1)
    * (defSpecies.type2 ? getTypeMultiplier(skill.type, defSpecies.type2) : 1)

  // Check if defender has shield status
  const shieldEffect = defender.statusEffects?.find(s => s.type === 'shield')
  const shieldReduction = shieldEffect ? (1 - shieldEffect.value) : 1

  const rand = 0.85 + Math.random() * 0.15

  return Math.max(1, Math.floor(
    skill.power * (attackStat * atkNatureMod / defenseStat) * typeMulti * shieldReduction * rand
  ))
}

export class BattleEngine {
  private playerTeam: Pet[]
  private enemyTeam: Pet[]
  private events: BattleEvent[] = []

  constructor(playerTeam: Pet[], enemyTeam: Pet[]) {
    // Deep clone to avoid mutating originals
    this.playerTeam = playerTeam.map(p => ({
      ...p,
      skills: p.skills.map(s => ({ ...s })),
      statusEffects: [],
    }))
    this.enemyTeam = enemyTeam.map(p => ({
      ...p,
      skills: p.skills.map(s => ({ ...s })),
      statusEffects: [],
    }))
  }

  simulate(): BattleEvent[] {
    const MAX_TURNS = 200
    let turn = 0

    while (turn < MAX_TURNS) {
      const playerAlive = this.playerTeam.filter(p => p.currentHp > 0)
      const enemyAlive = this.enemyTeam.filter(p => p.currentHp > 0)

      if (playerAlive.length === 0) {
        this.events.push({ type: 'battle_end', winner: 'enemy' })
        break
      }
      if (enemyAlive.length === 0) {
        this.events.push({ type: 'battle_end', winner: 'player' })
        break
      }

      // Sort all alive units by effective speed descending
      const allUnits = [
        ...playerAlive.map(p => ({ pet: p, side: 'player' as const })),
        ...enemyAlive.map(p => ({ pet: p, side: 'enemy' as const })),
      ].sort((a, b) => getEffectiveSpeed(b.pet) - getEffectiveSpeed(a.pet))

      this.events.push({ type: 'turn_start', order: allUnits.map(u => u.pet.id) })

      for (const { pet, side } of allUnits) {
        if (pet.currentHp <= 0) continue

        const opponents = side === 'player'
          ? this.enemyTeam.filter(p => p.currentHp > 0)
          : this.playerTeam.filter(p => p.currentHp > 0)

        if (opponents.length === 0) continue

        // Prefer offensive skills; use status/heal skills when HP is low or no offensive ready
        const readyOffensive = pet.skills.find(s => s.cooldownRemaining === 0 && s.skill.power > 0)
        const readyAny = pet.skills.find(s => s.cooldownRemaining === 0)
        const readySkill = (pet.currentHp < pet.maxHp * 0.4 && readyAny && readyAny.skill.category === 'status')
          ? readyAny
          : (readyOffensive ?? readyAny)

        if (!readySkill) continue

        const target = opponents[0]

        // Accuracy check
        if (Math.random() * 100 > readySkill.skill.accuracy) continue

        if (readySkill.skill.category === 'status') {
          // Handle status/heal skill (e.g. recover)
          if (readySkill.skill.effect?.healPercent) {
            // status-category heals always target self
            const healAmount = Math.max(1, Math.floor(pet.maxHp * readySkill.skill.effect.healPercent))
            pet.currentHp = Math.min(pet.maxHp, pet.currentHp + healAmount)
            this.events.push({ type: 'heal', unitId: pet.id, amount: healAmount })
          }
        } else {
          // Damage skill
          const damage = calcDamage(pet, target, readySkill.skill)
          target.currentHp = Math.max(0, target.currentHp - damage)

          this.events.push({
            type: 'attack',
            attackerId: pet.id,
            targetId: target.id,
            skillId: readySkill.skill.id,
            damage,
          })

          // Apply skill side effects
          if (readySkill.skill.effect) {
            const { statusEffect, healPercent, target: effectTarget } = readySkill.skill.effect

            if (statusEffect) {
              const effectRecipient = effectTarget === 'self' ? pet : target
              effectRecipient.statusEffects = effectRecipient.statusEffects ?? []
              // Don't stack the same status type
              if (!effectRecipient.statusEffects.find(s => s.type === statusEffect.type)) {
                effectRecipient.statusEffects.push({ ...statusEffect })
                this.events.push({ type: 'status', unitId: effectRecipient.id, effect: statusEffect })
              }
            }

            if (healPercent && effectTarget === 'self') {
              const healAmount = Math.floor(pet.maxHp * healPercent)
              pet.currentHp = Math.min(pet.maxHp, pet.currentHp + healAmount)
              this.events.push({ type: 'heal', unitId: pet.id, amount: healAmount })
            }
          }

          if (target.currentHp === 0) {
            this.events.push({ type: 'faint', unitId: target.id })
          }
        }

        // Set cooldown
        readySkill.cooldownRemaining = readySkill.skill.cooldown
      }

      // Tick cooldowns and status effects
      for (const unit of [...this.playerTeam, ...this.enemyTeam]) {
        for (const slot of unit.skills) {
          if (slot.cooldownRemaining > 0) slot.cooldownRemaining--
        }
        if (unit.statusEffects && unit.currentHp > 0) {
          unit.statusEffects = unit.statusEffects
            .map(s => ({ ...s, duration: s.duration - 1 }))

          for (const effect of unit.statusEffects) {
            // Apply periodic damage for burn/poison
            if (effect.type === 'burn' || effect.type === 'poison') {
              const dmg = Math.max(1, Math.floor(unit.maxHp * effect.value))
              unit.currentHp = Math.max(0, unit.currentHp - dmg)
              this.events.push({ type: 'status_damage', unitId: unit.id, amount: dmg, effectType: effect.type })
              if (unit.currentHp === 0) {
                this.events.push({ type: 'faint', unitId: unit.id })
              }
            }
          }

          // Remove expired effects and emit status_expire events
          const toExpire = unit.statusEffects.filter(s => s.duration <= 0)
          for (const expired of toExpire) {
            this.events.push({ type: 'status_expire', unitId: unit.id, effectType: expired.type })
          }
          unit.statusEffects = unit.statusEffects.filter(s => s.duration > 0)
        }
      }

      turn++
    }

    if (turn >= MAX_TURNS && !this.events.find(e => e.type === 'battle_end')) {
      this.events.push({ type: 'battle_end', winner: 'enemy' })
    }

    return this.events
  }
}

// apps/web/src/screens/RestScreen.tsx
import React, { useState } from 'react'
import type { SaveFile, InRunBuff } from '@fantasymon/core'
import { SPECIES, createPet, advanceNode, getCurrentNode } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

type RandomEvent =
  | { type: 'pet'; speciesId: string }
  | { type: 'gold'; amount: number }
  | { type: 'hp'; percent: number }

function rollRandomEvent(unlockedSpecies: string[]): RandomEvent | null {
  if (Math.random() >= 0.2) return null
  const roll = Math.random()
  if (roll < 0.33 && unlockedSpecies.length > 0) {
    return { type: 'pet', speciesId: unlockedSpecies[Math.floor(Math.random() * unlockedSpecies.length)] }
  }
  if (roll < 0.66) return { type: 'gold', amount: 10 }
  return { type: 'hp', percent: 5 }
}

function eventDescription(event: RandomEvent): string {
  if (event.type === 'pet') return `A wild ${SPECIES[event.speciesId]?.name ?? 'creature'} joined your roster!`
  if (event.type === 'gold') return `You found a gold pouch! +${event.amount} gold.`
  return `A healing spring! All pets gain +${event.percent}% max HP.`
}

export function RestScreen({ save, setSave, onBack }: Props) {
  const runState = save.runState
  const currentNode = runState ? getCurrentNode(runState) : null
  const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
  const baseLevel = playerTeam[0]?.level ?? 5

  const [randomEvent] = useState<RandomEvent | null>(() => rollRandomEvent(save.unlockedSpecies))
  const [eventAcknowledged, setEventAcknowledged] = useState(false)
  const [upgradingBuff, setUpgradingBuff] = useState(false)
  const [done, setDone] = useState(false)

  if (!runState || !currentNode || done) return null

  // Apply random event to save once when acknowledged
  function acknowledgeEvent() {
    if (!randomEvent) return
    let updated = { ...save }
    if (randomEvent.type === 'pet') {
      const newPet = createPet(randomEvent.speciesId, baseLevel)
      updated = { ...updated, roster: [...updated.roster, newPet] }
    } else if (randomEvent.type === 'gold') {
      updated = { ...updated, runState: { ...runState!, inRunCurrency: runState!.inRunCurrency + randomEvent.amount } }
    } else if (randomEvent.type === 'hp') {
      const mult = 1 + randomEvent.percent / 100
      const roster = updated.roster.map(p =>
        save.activeTeam.includes(p.id)
          ? { ...p, maxHp: Math.round(p.maxHp * mult), currentHp: Math.round(p.currentHp * mult) }
          : p
      )
      updated = { ...updated, roster }
    }
    setSave(updated)
    setEventAcknowledged(true)
  }

  function handleHeal() {
    const roster = save.roster.map(p =>
      save.activeTeam.includes(p.id) ? { ...p, currentHp: p.maxHp } : p
    )
    const nextRun = advanceNode(runState!)
    setSave({ ...save, roster, runState: nextRun })
    setDone(true)
    onBack()
  }

  function handleUpgradeBuff(buff: InRunBuff) {
    // Apply buff to the full active team so pet-tier buffs can compare across the team
    const activeTeamPets = save.roster.filter(p => save.activeTeam.includes(p.id))
    const upgraded = buff.apply(activeTeamPets)
    const upgradedById = Object.fromEntries(upgraded.map(p => [p.id, p]))
    const roster = save.roster.map(p => upgradedById[p.id] ?? p)
    const nextRun = advanceNode({
      ...runState!,
      activeBuffs: [...runState!.activeBuffs, buff],
    })
    setSave({ ...save, roster, runState: nextRun })
    setDone(true)
    onBack()
  }

  const showEvent = randomEvent && !eventAcknowledged
  const canUpgrade = runState.activeBuffs.length > 0

  // Random event acknowledgement screen
  if (showEvent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-4 w-full max-w-lg">
          <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
          <h2 className="text-2xl font-bold text-yellow-400">✨ Random Event!</h2>
        </div>
        <div className="p-6 bg-gray-800 border-2 border-yellow-500 rounded-xl max-w-sm text-center">
          <div className="text-4xl mb-4">
            {randomEvent.type === 'pet' ? '🐾' : randomEvent.type === 'gold' ? '💰' : '💧'}
          </div>
          <p className="text-white text-lg">{eventDescription(randomEvent)}</p>
        </div>
        <button
          onClick={acknowledgeEvent}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg"
        >
          Continue
        </button>
      </div>
    )
  }

  // Buff selection sub-panel
  if (upgradingBuff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-2xl font-bold text-yellow-400">⬆️ Upgrade Which Buff?</h2>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {runState.activeBuffs.map(buff => (
            <button
              key={buff.id}
              onClick={() => handleUpgradeBuff(buff)}
              className="flex flex-col items-start p-4 bg-gray-800 border-2 border-gray-600 rounded-xl hover:border-yellow-400 hover:bg-gray-700 transition-colors text-left"
            >
              <span className="text-white font-bold">{buff.name}</span>
              <span className="text-gray-400 text-sm">{buff.description}</span>
              <span className="text-yellow-400 text-xs mt-1">→ Effect ×1.5 after upgrade</span>
            </button>
          ))}
        </div>
        <button onClick={() => setUpgradingBuff(false)} className="text-gray-400 hover:text-white">← Back</button>
      </div>
    )
  }

  // Main rest options
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-4 w-full max-w-lg">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400">🏕️ Rest Stop</h2>
      </div>
      <p className="text-gray-400">Choose one:</p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <div className="p-5 bg-gray-800 border-2 border-gray-600 rounded-xl">
          <div className="text-xl mb-1">💚 Full Heal</div>
          <p className="text-gray-400 text-sm mb-4">Restore all active pets to full HP.</p>
          <button
            onClick={handleHeal}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
          >
            Choose
          </button>
        </div>
        <div className={`p-5 bg-gray-800 border-2 rounded-xl ${canUpgrade ? 'border-gray-600' : 'border-gray-700 opacity-50'}`}>
          <div className="text-xl mb-1">⬆️ Upgrade Buff</div>
          <p className="text-gray-400 text-sm mb-4">
            {canUpgrade ? 'Amplify one of your active buffs.' : 'No active buffs to upgrade.'}
          </p>
          <button
            onClick={() => setUpgradingBuff(true)}
            disabled={!canUpgrade}
            className={`w-full py-2 font-bold rounded-lg ${
              canUpgrade
                ? 'bg-purple-700 hover:bg-purple-600 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Choose
          </button>
        </div>
      </div>
    </div>
  )
}

// apps/web/src/screens/RunRewardScreen.tsx
import React, { useState } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { SPECIES, calcMaxHp } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

const UNLOCK_COSTS: Partial<Record<string, number>> = { rare: 50, epic: 100 }

export function RunRewardScreen({ save, setSave, onBack }: Props) {
  const earned = save.runState?.inRunCurrency ?? 0
  const [remaining, setRemaining] = useState(earned + save.wallet)
  const [roster, setRoster] = useState(save.roster)
  const [unlockedSpecies, setUnlockedSpecies] = useState(save.unlockedSpecies)

  const lockedSpecies = Object.entries(SPECIES).filter(
    ([id, s]) => !unlockedSpecies.includes(id) && (s.rarity === 'rare' || s.rarity === 'epic')
  )

  function handleLevelUp(petId: string) {
    const pet = roster.find(p => p.id === petId)
    if (!pet) return
    const cost = pet.level * 10
    if (remaining < cost) return
    const newLevel = pet.level + 1
    const species = SPECIES[pet.speciesId]
    if (!species) return
    const newMaxHp = calcMaxHp(species.baseStats.hp, pet.ivs.hp, pet.evs.hp, newLevel)
    setRoster(prev => prev.map(p =>
      p.id === petId ? { ...p, level: newLevel, maxHp: newMaxHp, currentHp: newMaxHp } : p
    ))
    setRemaining(prev => prev - cost)
  }

  function handleUnlock(speciesId: string) {
    const species = SPECIES[speciesId]
    if (!species) return
    const cost = UNLOCK_COSTS[species.rarity] ?? 0
    if (remaining < cost) return
    setUnlockedSpecies(prev => [...prev, speciesId])
    setRemaining(prev => prev - cost)
  }

  function handleLeave() {
    setSave({ ...save, wallet: remaining, runState: null, unlockedSpecies, roster })
    onBack()
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 p-8">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <h2 className="text-3xl font-bold text-yellow-400 flex-1">🏆 Run Complete!</h2>
        <span className="text-yellow-300 font-bold text-xl">💰 {remaining} remaining</span>
      </div>
      <p className="text-gray-400 text-sm">
        Earned this run: {earned}g · Previous wallet: {save.wallet}g
      </p>

      <div className="flex gap-8 w-full max-w-4xl">
        {/* Level Up Panel */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-3">⬆️ Level Up Pets</h3>
          <div className="flex flex-col gap-3">
            {roster.map(pet => {
              const cost = pet.level * 10
              const canAfford = remaining >= cost
              const species = SPECIES[pet.speciesId]
              return (
                <div key={pet.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="text-white font-bold">{species?.name ?? pet.speciesId}</div>
                    <div className="text-gray-400 text-sm">Lv. {pet.level}</div>
                  </div>
                  <span className="text-yellow-300 text-sm">💰 {cost}</span>
                  <button
                    onClick={() => handleLevelUp(pet.id)}
                    disabled={!canAfford}
                    className={`px-3 py-1 rounded font-bold text-sm ${
                      canAfford
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Level Up
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Unlock Species Panel */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-3">🔓 Unlock Species</h3>
          {lockedSpecies.length === 0 ? (
            <p className="text-gray-400">All species unlocked!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {lockedSpecies.map(([id, species]) => {
                const cost = UNLOCK_COSTS[species.rarity] ?? 0
                const canAfford = remaining >= cost
                return (
                  <div key={id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="text-white font-bold">{species.name}</div>
                      <div className="text-gray-400 text-sm capitalize">{species.type1} · {species.rarity}</div>
                    </div>
                    <span className="text-yellow-300 text-sm">💰 {cost}</span>
                    <button
                      onClick={() => handleUnlock(id)}
                      disabled={!canAfford}
                      className={`px-3 py-1 rounded font-bold text-sm ${
                        canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Unlock
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleLeave}
        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg mt-4"
      >
        Take Rewards & Leave →
      </button>
    </div>
  )
}

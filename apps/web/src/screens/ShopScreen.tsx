// apps/web/src/screens/ShopScreen.tsx
import React, { useState } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { SPECIES, createPet, advanceNode, getCurrentNode } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

const PRICES: Record<string, number> = { common: 15, rare: 25, epic: 40 }

function pickShopEggs(count: number): string[] {
  const ids = Object.keys(SPECIES)
  const shuffled = [...ids].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function ShopScreen({ save, setSave, onBack }: Props) {
  const runState = save.runState
  const currentNode = runState ? getCurrentNode(runState) : null
  const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
  const baseLevel = playerTeam[0]?.level ?? 5

  const [eggIds] = useState<string[]>(() => pickShopEggs(3))
  const [purchased, setPurchased] = useState<Set<string>>(() => new Set())
  const [currency, setCurrency] = useState(runState?.inRunCurrency ?? 0)

  if (!runState || !currentNode) return null

  const safeRunState = runState as import('@fantasymon/core').RunState

  function handleBuy(speciesId: string) {
    const species = SPECIES[speciesId]
    if (!species) return
    const price = PRICES[species.rarity] ?? 15
    if (currency < price) return
    const newPet = createPet(speciesId, baseLevel)
    const newCurrency = currency - price
    setCurrency(newCurrency)
    setPurchased(prev => new Set([...prev, speciesId + '_' + newPet.id]))
    setSave({
      ...save,
      roster: [...save.roster, newPet],
      runState: { ...safeRunState, inRunCurrency: newCurrency },
    })
  }

  function handleLeave() {
    const nextRun = advanceNode({ ...safeRunState, inRunCurrency: currency })
    setSave({ ...save, runState: nextRun })
    onBack()
  }

  const TYPE_COLORS: Record<string, string> = {
    fire: 'bg-orange-600', water: 'bg-blue-600', grass: 'bg-green-600',
    electric: 'bg-yellow-500', dark: 'bg-purple-700', light: 'bg-yellow-200',
    steel: 'bg-gray-500', dragon: 'bg-indigo-600',
  }
  const RARITY_COLORS: Record<string, string> = {
    common: 'text-gray-300', rare: 'text-blue-400', epic: 'text-purple-400', legendary: 'text-yellow-400',
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-4 w-full max-w-3xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400 flex-1">🏪 Shop</h2>
        <span className="text-yellow-300 font-bold text-lg">💰 {currency}</span>
      </div>

      <p className="text-gray-400">Today's eggs — buy to add to your roster</p>

      <div className="flex gap-6">
        {eggIds.map((speciesId, i) => {
          const species = SPECIES[speciesId]
          if (!species) return null
          const price = PRICES[species.rarity] ?? 15
          const isBought = [...purchased].some(k => k.startsWith(speciesId + '_'))
          const canAfford = currency >= price

          return (
            <div
              key={speciesId + i}
              className="flex flex-col items-center gap-3 p-5 w-48 bg-gray-800 border-2 border-gray-600 rounded-xl"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${TYPE_COLORS[species.type1] ?? 'bg-gray-600'}`}>
                🥚
              </div>
              <div className="text-white font-bold text-center">{species.name}</div>
              <div className="flex gap-2">
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{species.type1}</span>
              </div>
              <div className={`text-sm font-semibold ${RARITY_COLORS[species.rarity]}`}>
                {species.rarity.charAt(0).toUpperCase() + species.rarity.slice(1)}
              </div>
              <div className="text-yellow-300 font-bold">💰 {price}</div>
              {isBought ? (
                <div className="text-green-400 font-semibold">✓ Purchased</div>
              ) : (
                <button
                  onClick={() => handleBuy(speciesId)}
                  disabled={!canAfford}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                    canAfford
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Buy
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleLeave}
        className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg mt-4"
      >
        Leave Shop →
      </button>
    </div>
  )
}

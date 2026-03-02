// apps/web/src/screens/TeamBuilderScreen.tsx
import React from 'react'
import type { SaveFile, Pet } from '@fantasymon/core'
import { SPECIES } from '@fantasymon/core'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

function PetCard({ pet, selected, onToggle }: { pet: Pet; selected: boolean; onToggle: () => void }) {
  const species = SPECIES[pet.speciesId]
  const typeColors: Record<string, string> = {
    fire: 'text-orange-400', water: 'text-blue-400', grass: 'text-green-400',
    electric: 'text-yellow-300', dark: 'text-purple-400', light: 'text-yellow-100',
    steel: 'text-gray-300', dragon: 'text-violet-400',
  }

  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected
          ? 'border-yellow-400 bg-yellow-400/10'
          : 'border-gray-600 bg-gray-800 hover:border-gray-400'
      }`}
    >
      <div className="font-bold text-lg">{species?.name ?? pet.speciesId}</div>
      <div className={`text-sm ${typeColors[species?.type1 ?? ''] ?? 'text-gray-400'}`}>
        {species?.type1}{species?.type2 ? `/${species.type2}` : ''}
      </div>
      <div className="text-sm text-gray-400 mt-1">Lv.{pet.level}</div>
      <div className="text-xs text-gray-500 mt-1">
        HP {pet.currentHp}/{pet.maxHp}
      </div>
    </div>
  )
}

export function TeamBuilderScreen({ save, setSave, onBack }: Props) {
  function togglePet(petId: string) {
    const active = save.activeTeam
    if (active.includes(petId)) {
      setSave({ ...save, activeTeam: active.filter(id => id !== petId) })
    } else if (active.length < 5) {
      setSave({ ...save, activeTeam: [...active, petId] })
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-bold text-yellow-400">Team Builder</h2>
        <span className="text-gray-400">{save.activeTeam.length}/5 selected</span>
      </div>

      {save.activeTeam.length >= 5 && (
        <p className="text-yellow-300 text-sm mb-4">Team is full (5/5). Deselect a pet to swap.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {save.roster.map(pet => (
          <PetCard
            key={pet.id}
            pet={pet}
            selected={save.activeTeam.includes(pet.id)}
            onToggle={() => togglePet(pet.id)}
          />
        ))}
      </div>
    </div>
  )
}

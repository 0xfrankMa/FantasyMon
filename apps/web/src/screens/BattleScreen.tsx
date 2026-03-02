// apps/web/src/screens/BattleScreen.tsx
import React, { useEffect, useRef } from 'react'
import type { SaveFile, Pet } from '@fantasymon/core'
import { BattleEngine, createPet } from '@fantasymon/core'
import { BattleRenderer } from '@fantasymon/battle'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

export function BattleScreen({ save, setSave, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
    const baseLevel = playerTeam[0]?.level ?? 5
    const enemyTeam = ['aquafin', 'voltmouse', 'leafpup'].map(id => createPet(id, baseLevel))

    const renderer = new BattleRenderer(canvasRef.current)
    renderer.init(playerTeam, enemyTeam)

    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()

    // Replay events with timing for visual feedback
    let delay = 0
    const allPets = [...playerTeam, ...enemyTeam]
    events.forEach(event => {
      delay += event.type === 'attack' ? 400 : event.type === 'faint' ? 600 : 50
      setTimeout(() => renderer.handleEvent(event, allPets), delay)
    })

    return () => renderer.destroy()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400">Battle</h2>
      </div>
      <canvas ref={canvasRef} className="rounded-lg border border-gray-700" />
    </div>
  )
}

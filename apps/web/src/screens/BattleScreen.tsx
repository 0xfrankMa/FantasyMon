// apps/web/src/screens/BattleScreen.tsx
import React, { useEffect, useRef } from 'react'
import type { SaveFile } from '@fantasymon/core'
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
    if (playerTeam.length === 0) return

    const baseLevel = playerTeam[0]?.level ?? 5
    const enemyTeam = ['aquafin', 'voltmouse', 'leafpup'].map(id => createPet(id, baseLevel)) // TODO: generate enemy team from run state

    const renderer = new BattleRenderer(canvasRef.current)
    renderer.init(playerTeam, enemyTeam)

    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()

    // Replay events with timing for visual feedback
    let delay = 0
    const timerIds: ReturnType<typeof setTimeout>[] = []
    events.forEach(event => {
      delay += event.type === 'attack' ? 400 : event.type === 'faint' ? 600 : 50
      timerIds.push(setTimeout(() => renderer.handleEvent(event), delay))
    })

    return () => {
      timerIds.forEach(clearTimeout)
      renderer.destroy()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (save.activeTeam.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-400">No team selected. Go back and choose pets.</p>
        <button onClick={onBack} className="mt-4 text-yellow-400 hover:text-yellow-300">← Back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400">Battle</h2>
      </div>
      <canvas ref={canvasRef} width={800} height={400} className="rounded-lg border border-gray-700" />
    </div>
  )
}

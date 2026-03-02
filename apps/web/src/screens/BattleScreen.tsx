// apps/web/src/screens/BattleScreen.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { BattleEngine, getCurrentNode, generateEnemyTeamForNode, advanceNode } from '@fantasymon/core'
import { BattleRenderer } from '@fantasymon/battle'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

export function BattleScreen({ save, setSave, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [battleResult, setBattleResult] = useState<'player' | 'enemy' | null>(null)

  if (!save.runState) {
    // Defensive: should not normally happen — navigate away
    onBack()
    return null
  }
  const runState = save.runState
  const currentNode = getCurrentNode(runState)
  const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
  const baseLevel = playerTeam[0]?.level ?? 5
  const enemyTeam = currentNode ? generateEnemyTeamForNode(currentNode.type, baseLevel) : []

  useEffect(() => {
    if (!canvasRef.current || playerTeam.length === 0 || enemyTeam.length === 0) return

    const renderer = new BattleRenderer(canvasRef.current)
    renderer.init(playerTeam, enemyTeam)

    const engine = new BattleEngine(playerTeam, enemyTeam)
    const events = engine.simulate()

    // Find the winner from battle_end event
    const endEvent = events.find(e => e.type === 'battle_end') as
      | { type: 'battle_end'; winner: 'player' | 'enemy' }
      | undefined

    let delay = 0
    const timerIds: ReturnType<typeof setTimeout>[] = []
    events.forEach(event => {
      delay += event.type === 'attack' ? 400 : event.type === 'faint' ? 600 : 50
      timerIds.push(setTimeout(() => renderer.handleEvent(event), delay))
    })

    // Show outcome after last event
    timerIds.push(setTimeout(() => {
      if (endEvent) setBattleResult(endEvent.winner)
    }, delay + 500))

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

  function renderVictoryOverlay() {
    const isLastNode = runState.currentNodeIndex === runState.nodes.length - 1
    return (
      <>
        <div className="text-4xl font-bold text-yellow-400">Victory!</div>
        <div className="text-gray-300">
          {isLastNode ? 'Run complete!' : 'Node cleared.'}
        </div>
        <button
          onClick={() => {
            const nextState = advanceNode(runState)
            setSave({ ...save, runState: nextState })
            onBack()
          }}
          className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
        >
          {isLastNode ? 'Finish Run' : 'Continue →'}
        </button>
      </>
    )
  }

  const nodeLabel = currentNode
    ? `${currentNode.type.charAt(0).toUpperCase() + currentNode.type.slice(1)} Battle (Node ${runState.currentNodeIndex + 1}/${runState.nodes.length})`
    : 'Battle'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white">← Back</button>
        <h2 className="text-2xl font-bold text-yellow-400">{nodeLabel}</h2>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={800} height={400} className="rounded-lg border border-gray-700" />
        {battleResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4 rounded-lg">
            {battleResult === 'player' ? renderVictoryOverlay() : (
              <>
                <div className="text-4xl font-bold text-red-400">Defeated!</div>
                <div className="text-gray-300">Your run ends here.</div>
                <button
                  onClick={() => {
                    setSave({ ...save, runState: null })
                    onBack()
                  }}
                  className="px-6 py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-600"
                >
                  Back to Home
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// apps/web/src/screens/HomeScreen.tsx
import React from 'react'
import type { SaveFile } from '@fantasymon/core'
import { createPet, createRun, isRunComplete } from '@fantasymon/core'
import type { Screen } from '../App'

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onNavigate: (screen: Screen) => void
}

export function HomeScreen({ save, setSave, onNavigate }: Props) {
  function addStarterPets() {
    if (save.roster.length > 0) return
    const starters = ['embercub', 'aquafin', 'leafpup'].map(id => createPet(id, 5))
    setSave({ ...save, roster: [...save.roster, ...starters], activeTeam: starters.map(p => p.id) })
  }

  function startRun() {
    const newRun = createRun()
    setSave({ ...save, runState: newRun })
    onNavigate('run')
  }

  const runState = save.runState
  const runInProgress = runState !== null && !isRunComplete(runState)
  const runComplete = runState !== null && isRunComplete(runState)

  const currentNodeNumber = runState !== null ? runState.currentNodeIndex + 1 : 1
  const totalNodes = runState !== null ? runState.nodes.length : 3

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold text-yellow-400">FantasyMon</h1>
      <p className="text-gray-400">Pet Raising Roguelike</p>

      {save.roster.length === 0 ? (
        <button
          onClick={addStarterPets}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
        >
          Start New Game
        </button>
      ) : runComplete ? (
        // State C: Run complete
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl font-bold text-yellow-400">Congratulations!</div>
          <div className="text-gray-300">You cleared the entire dungeon run!</div>
          <div className="flex flex-col gap-3 w-64">
            <button
              onClick={() => onNavigate('teambuilder')}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
            >
              Team Builder ({save.activeTeam.length}/5)
            </button>
            <button
              onClick={() => setSave({ ...save, runState: null })}
              className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Start New Run
            </button>
          </div>
        </div>
      ) : runInProgress ? (
        // State B: Active run in progress
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={() => onNavigate('teambuilder')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
          >
            Team Builder ({save.activeTeam.length}/5)
          </button>
          <button
            onClick={() => onNavigate('run')}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors"
          >
            Continue Run (Node {currentNodeNumber}/{totalNodes})
          </button>
        </div>
      ) : (
        // State A: No active run
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={() => onNavigate('teambuilder')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors"
          >
            Team Builder ({save.activeTeam.length}/5)
          </button>
          <button
            onClick={startRun}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors"
          >
            Enter Dungeon
          </button>
        </div>
      )}
    </div>
  )
}

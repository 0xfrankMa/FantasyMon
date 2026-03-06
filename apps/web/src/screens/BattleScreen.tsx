// apps/web/src/screens/BattleScreen.tsx
import React, { useEffect, useRef, useState } from 'react'
import type { SaveFile, InRunBuff } from '@fantasymon/core'
import { BattleEngine, getCurrentNode, generateEnemyTeamForNode, advanceNode, applyBuff, pickRandomBuffs, grantExp, SPECIES } from '@fantasymon/core'
import { BattleRenderer } from '@fantasymon/battle'

// module-level constant — defined once, not recreated on every render
const TIER_COLOR: Record<InRunBuff['tier'], string> = {
  pet: 'bg-purple-700 text-purple-100',
  type: 'bg-blue-700 text-blue-100',
  team: 'bg-green-700 text-green-100',
}

interface Props {
  save: SaveFile
  setSave: (s: SaveFile) => void
  onBack: () => void
}

export function BattleScreen({ save, setSave, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [battleResult, setBattleResult] = useState<'player' | 'enemy' | null>(null)
  const [buffOptions, setBuffOptions] = useState<InRunBuff[] | null>(null)
  const [levelUps, setLevelUps] = useState<Array<{ petId: string; speciesId: string; newLevel: number }>>([])

  // Derive all values before hooks so they're available inside effects
  const runState = save.runState
  const currentNode = runState ? getCurrentNode(runState) : null
  const playerTeam = save.roster.filter(p => save.activeTeam.includes(p.id))
  const baseLevel = playerTeam[0]?.level ?? 5
  const enemyTeam = currentNode ? generateEnemyTeamForNode(currentNode.type, baseLevel) : []

  // Defensive: if somehow mounted without a run, navigate away via effect (not render)
  useEffect(() => {
    if (!runState) onBack()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canvasRef.current || !runState || playerTeam.length === 0 || enemyTeam.length === 0) return

    const renderer = new BattleRenderer(canvasRef.current)
    renderer.init(playerTeam, enemyTeam)

    // Apply in-run buffs to a copy of the player team (does not mutate the persisted roster)
    let buffedTeam = playerTeam
    for (const buff of runState.activeBuffs) {
      buffedTeam = buff.apply(buffedTeam)
    }
    const engine = new BattleEngine(buffedTeam, enemyTeam)
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
    const isLastNode = runState.currentNodeIndex === runState.nodes.length - 1

    timerIds.push(setTimeout(() => {
      if (!endEvent) return
      setBattleResult(endEvent.winner)
      if (endEvent.winner === 'player') {
        const expGained = enemyTeam.reduce((sum, p) => sum + p.level * 5, 0)
        const { updatedPets, levelUps: lvUps } = grantExp(playerTeam, expGained)
        const updatedById = Object.fromEntries(updatedPets.map(p => [p.id, p]))
        // Note: `save` is captured at mount. This is a pre-existing pattern in this
        // component (same for advanceNode/applyBuff calls). Safe here because the
        // roster is only updated on the first and only victory of this battle instance.
        setSave({ ...save, roster: save.roster.map(p => updatedById[p.id] ?? p) })
        if (lvUps.length > 0) setLevelUps(lvUps)
      }
    }, delay + 500))

    // Pre-schedule buff selection timer; only triggers for non-boss player victories
    if (!isLastNode) {
      timerIds.push(setTimeout(() => {
        if (endEvent?.winner === 'player') setBuffOptions(pickRandomBuffs(3))
      }, delay + 500 + 800))
    }

    return () => {
      timerIds.forEach(clearTimeout)
      renderer.destroy()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!runState) return null

  if (save.activeTeam.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-400">No team selected. Go back and choose pets.</p>
        <button onClick={onBack} className="mt-4 text-yellow-400 hover:text-yellow-300">← Back</button>
      </div>
    )
  }

  function renderVictoryOverlay() {
    if (!runState) return null  // defensive guard
    const rs = runState
    const isLastNode = rs.currentNodeIndex === rs.nodes.length - 1

    const levelUpBanners = levelUps.length > 0 && (
      <div className="flex flex-col items-center gap-1 mb-3">
        {levelUps.map(lu => (
          <div key={lu.petId + '-' + lu.newLevel} className="text-yellow-300 font-semibold text-sm">
            {/* belt-and-suspenders: grantExp already threw on unknown speciesId */}
            ✨ {SPECIES[lu.speciesId]?.name ?? lu.speciesId} → Lv. {lu.newLevel}!
          </div>
        ))}
      </div>
    )

    if (buffOptions) {
      return (
        <>
          {levelUpBanners}
          <div className="text-2xl font-bold text-yellow-400 mb-4">Choose a Buff</div>
          <div className="flex gap-4">
            {buffOptions.map(buff => (
              <button
                key={buff.id}
                onClick={() => {
                  const nextRun = advanceNode(applyBuff(rs, buff))
                  setSave({ ...save, runState: nextRun })
                  onBack()
                }}
                className="flex flex-col items-start gap-2 p-4 w-48 bg-gray-800 border-2 border-gray-600 rounded-xl hover:border-yellow-400 hover:bg-gray-700 transition-colors text-left"
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${TIER_COLOR[buff.tier]}`}>
                  {buff.tier.toUpperCase()}
                </span>
                <span className="text-white font-bold">{buff.name}</span>
                <span className="text-gray-300 text-sm">{buff.description}</span>
              </button>
            ))}
          </div>
        </>
      )
    }

    return (
      <>
        {levelUpBanners}
        <div className="text-4xl font-bold text-yellow-400">Victory!</div>
        <div className="text-gray-300">
          {isLastNode ? 'Run complete!' : 'Preparing buffs…'}
        </div>
        {isLastNode && (
          <button
            onClick={() => {
              const nextState = advanceNode(rs)
              setSave({ ...save, runState: nextState })
            }}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
          >
            Finish Run
          </button>
        )}
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

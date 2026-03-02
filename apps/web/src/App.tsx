// apps/web/src/App.tsx
import React, { useState, useEffect } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { ALL_BUFFS, getCurrentNode, isRunComplete } from '@fantasymon/core' // ensures BUFF_REGISTRY populated before loadSave; eslint-disable-line @typescript-eslint/no-unused-vars
import { loadSave, newSave, writeSave } from './save'
import { HomeScreen } from './screens/HomeScreen'
import { TeamBuilderScreen } from './screens/TeamBuilderScreen'
import { BattleScreen } from './screens/BattleScreen'
import { ShopScreen } from './screens/ShopScreen'
import { RestScreen } from './screens/RestScreen'
import { RunRewardScreen } from './screens/RunRewardScreen'

export type Screen = 'home' | 'teambuilder' | 'run'

export function App() {
  const [save, setSave] = useState<SaveFile>(() => loadSave() ?? newSave())
  const [screen, setScreen] = useState<Screen>('home')

  useEffect(() => { writeSave(save) }, [save])

  if (screen === 'teambuilder') {
    return <TeamBuilderScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }

  if (screen === 'run') {
    if (save.runState && isRunComplete(save.runState)) {
      return <RunRewardScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
    }
    const currentNode = save.runState ? getCurrentNode(save.runState) : null
    if (currentNode?.type === 'shop') {
      return <ShopScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
    }
    if (currentNode?.type === 'rest') {
      return <RestScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
    }
    return <BattleScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }

  return <HomeScreen save={save} setSave={setSave} onNavigate={setScreen} />
}

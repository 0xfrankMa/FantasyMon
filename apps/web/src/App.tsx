// apps/web/src/App.tsx
import React, { useState, useEffect } from 'react'
import type { SaveFile } from '@fantasymon/core'
import { loadSave, newSave, writeSave } from './save'
import { HomeScreen } from './screens/HomeScreen'
import { TeamBuilderScreen } from './screens/TeamBuilderScreen'

export type Screen = 'home' | 'teambuilder' | 'run'

export function App() {
  const [save, setSave] = useState<SaveFile>(() => loadSave() ?? newSave())
  const [screen, setScreen] = useState<Screen>('home')

  useEffect(() => { writeSave(save) }, [save])

  if (screen === 'teambuilder') {
    return <TeamBuilderScreen save={save} setSave={setSave} onBack={() => setScreen('home')} />
  }

  if (screen === 'run') {
    return <div>Battle coming soon!</div>
  }

  return <HomeScreen save={save} setSave={setSave} onNavigate={setScreen} />
}

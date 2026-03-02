// packages/battle/src/BattleRenderer.ts
import type { BattleEvent, Pet } from '@fantasymon/core'
import { SPECIES } from '@fantasymon/core'

const TYPE_COLORS: Record<string, string> = {
  fire: '#ff4400', water: '#0088ff', grass: '#44cc44', electric: '#ffee00',
  dark: '#442266', light: '#ffffaa', steel: '#8899aa', dragon: '#7700cc',
}

interface UnitState {
  x: number
  y: number
  color: string
  name: string
  currentHp: number
  maxHp: number
  visible: boolean
  flash: boolean
}

export class BattleRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private units: Map<string, UnitState> = new Map()
  private animFrameId: number | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.startLoop()
  }

  private startLoop() {
    const draw = () => {
      this.render()
      this.animFrameId = requestAnimationFrame(draw)
    }
    this.animFrameId = requestAnimationFrame(draw)
  }

  init(playerTeam: Pet[], enemyTeam: Pet[]) {
    this.units.clear()
    const place = (team: Pet[], side: 'player' | 'enemy') => {
      const spacing = 800 / (team.length + 1)
      team.forEach((pet, i) => {
        const species = SPECIES[pet.speciesId]
        this.units.set(pet.id, {
          x: spacing * (i + 1) - 40,
          y: side === 'player' ? 300 : 40,
          color: TYPE_COLORS[species.type1] ?? '#888888',
          name: species.name,
          currentHp: pet.currentHp,
          maxHp: pet.maxHp,
          visible: true,
          flash: false,
        })
      })
    }
    place(playerTeam, 'player')
    place(enemyTeam, 'enemy')
  }

  private render() {
    const ctx = this.ctx
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    for (const unit of this.units.values()) {
      if (!unit.visible) continue
      ctx.globalAlpha = unit.flash ? 0.3 : 1
      ctx.fillStyle = unit.color
      ctx.beginPath()
      ctx.roundRect(unit.x, unit.y, 80, 60, 8)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.font = '9px sans-serif'
      ctx.fillText(unit.name, unit.x + 4, unit.y + 14)
      ctx.font = '8px sans-serif'
      ctx.fillText(`HP:${unit.currentHp}`, unit.x + 4, unit.y + 52)
    }
  }

  handleEvent(event: BattleEvent) {
    if (event.type === 'attack') {
      const attacker = this.units.get(event.attackerId)
      if (attacker) {
        attacker.flash = true
        setTimeout(() => { attacker.flash = false }, 100)
      }
      const target = this.units.get(event.targetId)
      if (target) {
        target.currentHp = Math.max(0, target.currentHp - event.damage)
      }
    }
    if (event.type === 'faint') {
      const unit = this.units.get(event.unitId)
      if (unit) unit.visible = false
    }
    if (event.type === 'heal') {
      const unit = this.units.get(event.unitId)
      if (unit) unit.currentHp = Math.min(unit.maxHp, unit.currentHp + event.amount)
    }
  }

  destroy() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId)
    this.units.clear()
  }
}

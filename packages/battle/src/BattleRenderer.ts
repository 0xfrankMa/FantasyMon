// packages/battle/src/BattleRenderer.ts
import * as PIXI from 'pixi.js'
import type { BattleEvent, Pet } from '@fantasymon/core'
import { SPECIES } from '@fantasymon/core'

const TYPE_COLORS: Record<string, number> = {
  fire: 0xff4400, water: 0x0088ff, grass: 0x44cc44, electric: 0xffee00,
  dark: 0x442266, light: 0xffffaa, steel: 0x8899aa, dragon: 0x7700cc,
}

export class BattleRenderer {
  private app: PIXI.Application
  private unitSprites: Map<string, PIXI.Container> = new Map()
  private hpTracker: Map<string, number> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      width: 800,
      height: 400,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    })
  }

  init(playerTeam: Pet[], enemyTeam: Pet[]) {
    this.app.stage.removeChildren()
    this.unitSprites.clear()
    this.hpTracker.clear()
    ;[...playerTeam, ...enemyTeam].forEach(pet => this.hpTracker.set(pet.id, pet.currentHp))
    playerTeam.forEach((pet, i) => this.createSprite(pet, i, 'player', playerTeam.length))
    enemyTeam.forEach((pet, i) => this.createSprite(pet, i, 'enemy', enemyTeam.length))
  }

  private createSprite(pet: Pet, index: number, side: 'player' | 'enemy', total: number) {
    const species = SPECIES[pet.speciesId]
    const color = TYPE_COLORS[species.type1] ?? 0x888888

    const container = new PIXI.Container()
    const rect = new PIXI.Graphics()
    rect.beginFill(color, 0.8)
    rect.drawRoundedRect(0, 0, 80, 60, 8)
    rect.endFill()

    const label = new PIXI.Text(species.name, { fontSize: 9, fill: 0xffffff, wordWrap: true, wordWrapWidth: 78 })
    label.x = 4; label.y = 4

    const hpText = new PIXI.Text(`HP:${pet.currentHp}`, { fontSize: 8, fill: 0xffffff })
    hpText.x = 4; hpText.y = 44
    hpText.name = 'hp'

    container.addChild(rect, label, hpText)

    const spacing = 800 / (total + 1)
    container.x = spacing * (index + 1) - 40
    container.y = side === 'player' ? 300 : 40

    this.app.stage.addChild(container)
    this.unitSprites.set(pet.id, container)
  }

  handleEvent(event: BattleEvent) {
    if (event.type === 'attack') {
      // Flash attacker
      const sprite = this.unitSprites.get(event.attackerId)
      if (sprite) {
        const rect = sprite.children[0] as PIXI.Graphics
        rect.alpha = 0.3
        setTimeout(() => { rect.alpha = 1 }, 100)
      }
      // Update target HP
      const prevHp = this.hpTracker.get(event.targetId) ?? 0
      const newHp = Math.max(0, prevHp - event.damage)
      this.hpTracker.set(event.targetId, newHp)
      const targetSprite = this.unitSprites.get(event.targetId)
      if (targetSprite) {
        const hpText = targetSprite.getChildByName('hp') as PIXI.Text
        if (hpText) hpText.text = `HP:${newHp}`
      }
    }
    if (event.type === 'faint') {
      const sprite = this.unitSprites.get(event.unitId)
      if (sprite) sprite.visible = false
    }
  }

  destroy() {
    this.app.destroy(false)
  }
}

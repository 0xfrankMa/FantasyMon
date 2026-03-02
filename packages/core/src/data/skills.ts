// packages/core/src/data/skills.ts
import type { Skill } from '../types'

export const SKILLS: Record<string, Skill> = {
  ember: { id:'ember', name:'Ember', type:'fire', power:40, accuracy:100, category:'special', cooldown:1 },
  flamethrower: { id:'flamethrower', name:'Flamethrower', type:'fire', power:90, accuracy:95, category:'special', effect:{ statusEffect:{ type:'burn', duration:2, value:0.05 } }, cooldown:3 },
  watergun: { id:'watergun', name:'Water Gun', type:'water', power:40, accuracy:100, category:'special', cooldown:1 },
  surf: { id:'surf', name:'Surf', type:'water', power:90, accuracy:95, category:'special', cooldown:3 },
  vinewhip: { id:'vinewhip', name:'Vine Whip', type:'grass', power:45, accuracy:100, category:'physical', cooldown:1 },
  solarbeam: { id:'solarbeam', name:'Solar Beam', type:'grass', power:120, accuracy:100, category:'special', cooldown:4 },
  thunderbolt: { id:'thunderbolt', name:'Thunderbolt', type:'electric', power:90, accuracy:100, category:'special', effect:{ statusEffect:{ type:'slow', duration:2, value:0.3 } }, cooldown:3 },
  spark: { id:'spark', name:'Spark', type:'electric', power:40, accuracy:100, category:'physical', cooldown:1 },
  shadowball: { id:'shadowball', name:'Shadow Ball', type:'dark', power:80, accuracy:100, category:'special', cooldown:2 },
  nightslash: { id:'nightslash', name:'Night Slash', type:'dark', power:70, accuracy:100, category:'physical', cooldown:2 },
  sacredfire: { id:'sacredfire', name:'Sacred Fire', type:'light', power:100, accuracy:95, category:'special', effect:{ healPercent:0.1, target:'self' }, cooldown:4 },
  holybeam: { id:'holybeam', name:'Holy Beam', type:'light', power:60, accuracy:100, category:'special', cooldown:2 },
  ironhead: { id:'ironhead', name:'Iron Head', type:'steel', power:80, accuracy:100, category:'physical', effect:{ statusEffect:{ type:'shield', duration:1, value:0.2 }, target:'self' }, cooldown:2 },
  metalburst: { id:'metalburst', name:'Metal Burst', type:'steel', power:50, accuracy:100, category:'physical', cooldown:1 },
  dragonbreath: { id:'dragonbreath', name:'Dragon Breath', type:'dragon', power:60, accuracy:100, category:'special', effect:{ statusEffect:{ type:'slow', duration:1, value:0.2 } }, cooldown:2 },
  outrage: { id:'outrage', name:'Outrage', type:'dragon', power:120, accuracy:90, category:'physical', cooldown:4 },
  scratch: { id:'scratch', name:'Scratch', type:'fire', power:40, accuracy:100, category:'physical', cooldown:1 },
  tackle: { id:'tackle', name:'Tackle', type:'water', power:35, accuracy:100, category:'physical', cooldown:1 },
  bite: { id:'bite', name:'Bite', type:'dark', power:60, accuracy:100, category:'physical', cooldown:1 },
  recover: { id:'recover', name:'Recover', type:'light', power:0, accuracy:100, category:'status', effect:{ healPercent:0.25 }, cooldown:4 },
}

// packages/core/src/data/species.ts
import type { Species } from '../types'

export const SPECIES: Record<string, Species> = {
  embercub: {
    id:'embercub', name:'Embercub', type1:'fire', rarity:'common',
    baseStats:{ hp:45, atk:60, def:40, spAtk:65, spDef:40, speed:50 },
    evolutions:[{ targetSpeciesId:'blazelion', requiredLevel:16 }],
    learnset:[{ skillId:'scratch', level:1 },{ skillId:'ember', level:5 },{ skillId:'flamethrower', level:14 }]
  },
  blazelion: {
    id:'blazelion', name:'Blazelion', type1:'fire', rarity:'rare',
    baseStats:{ hp:65, atk:90, def:55, spAtk:95, spDef:55, speed:75 },
    evolutions:[],
    learnset:[{ skillId:'flamethrower', level:1 },{ skillId:'sacredfire', level:20 }]
  },
  aquafin: {
    id:'aquafin', name:'Aquafin', type1:'water', rarity:'common',
    baseStats:{ hp:50, atk:45, def:55, spAtk:70, spDef:60, speed:55 },
    evolutions:[{ targetSpeciesId:'tidalshark', requiredLevel:16 }],
    learnset:[{ skillId:'tackle', level:1 },{ skillId:'watergun', level:5 },{ skillId:'surf', level:14 }]
  },
  tidalshark: {
    id:'tidalshark', name:'Tidalshark', type1:'water', rarity:'rare',
    baseStats:{ hp:70, atk:65, def:75, spAtk:100, spDef:80, speed:70 },
    evolutions:[],
    learnset:[{ skillId:'surf', level:1 },{ skillId:'bite', level:10 }]
  },
  leafpup: {
    id:'leafpup', name:'Leafpup', type1:'grass', rarity:'common',
    baseStats:{ hp:45, atk:55, def:45, spAtk:55, spDef:65, speed:65 },
    evolutions:[{ targetSpeciesId:'thicketfox', requiredLevel:16 }],
    learnset:[{ skillId:'tackle', level:1 },{ skillId:'vinewhip', level:5 },{ skillId:'solarbeam', level:14 }]
  },
  thicketfox: {
    id:'thicketfox', name:'Thicketfox', type1:'grass', rarity:'rare',
    baseStats:{ hp:65, atk:75, def:60, spAtk:80, spDef:85, speed:90 },
    evolutions:[],
    learnset:[{ skillId:'solarbeam', level:1 },{ skillId:'vinewhip', level:5 }]
  },
  voltmouse: {
    id:'voltmouse', name:'Voltmouse', type1:'electric', rarity:'common',
    baseStats:{ hp:35, atk:55, def:35, spAtk:60, spDef:40, speed:90 },
    evolutions:[{ targetSpeciesId:'stormhare', requiredLevel:16 }],
    learnset:[{ skillId:'spark', level:1 },{ skillId:'thunderbolt', level:10 }]
  },
  stormhare: {
    id:'stormhare', name:'Stormhare', type1:'electric', rarity:'rare',
    baseStats:{ hp:55, atk:75, def:50, spAtk:90, spDef:60, speed:120 },
    evolutions:[],
    learnset:[{ skillId:'thunderbolt', level:1 },{ skillId:'spark', level:5 }]
  },
  ironpup: {
    id:'ironpup', name:'Ironpup', type1:'steel', rarity:'rare',
    baseStats:{ hp:60, atk:80, def:90, spAtk:40, spDef:80, speed:35 },
    evolutions:[],
    learnset:[{ skillId:'metalburst', level:1 },{ skillId:'ironhead', level:8 }]
  },
  shadowkit: {
    id:'shadowkit', name:'Shadowkit', type1:'dark', rarity:'rare',
    baseStats:{ hp:50, atk:85, def:45, spAtk:75, spDef:50, speed:80 },
    evolutions:[],
    learnset:[{ skillId:'bite', level:1 },{ skillId:'nightslash', level:6 },{ skillId:'shadowball', level:12 }]
  },
}

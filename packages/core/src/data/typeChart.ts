// packages/core/src/data/typeChart.ts
import type { ElementType } from '../types'

// Rows = attacking type, Cols = defending type
// Order: fire, water, grass, electric, dark, light, steel, dragon
const TYPES: ElementType[] = ['fire', 'water', 'grass', 'electric', 'dark', 'light', 'steel', 'dragon']

const MATRIX: number[][] = [
//         fire  water  grass  elec  dark  light  steel  dragon
/* fire  */[1.0,  0.5,   2.0,  1.0,  1.0,  1.0,   0.5,   0.5],
/* water */[2.0,  0.5,   0.5,  1.0,  1.0,  1.0,   1.0,   1.0],
/* grass */[0.5,  2.0,   0.5,  1.0,  1.0,  1.0,   0.5,   1.0],
/* elec  */[1.0,  2.0,   0.5,  0.5,  1.0,  1.0,   2.0,   1.0],
/* dark  */[1.0,  1.0,   1.0,  1.0,  0.5,  0.5,   1.0,   2.0],
/* light */[1.0,  1.0,   1.0,  1.0,  2.0,  0.5,   1.0,   1.0],
/* steel */[0.5,  0.5,   1.0,  0.5,  1.0,  2.0,   0.5,   2.0],
/* dragon*/[1.0,  1.0,   1.0,  1.0,  0.5,  1.0,   0.5,   2.0],
]

export function getTypeMultiplier(attacking: ElementType, defending: ElementType): number {
  const row = TYPES.indexOf(attacking)
  const col = TYPES.indexOf(defending)
  return MATRIX[row][col]
}

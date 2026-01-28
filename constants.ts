import { MaterialType, MaterialProperties } from './types';

export const MATERIALS: Record<MaterialType, MaterialProperties> = {
  [MaterialType.AIR]: {
    name: 'Air',
    speedOfSound: 343,
    density: 1.225,
    color: '#0f172a' // Slate 900 (Background)
  },
  [MaterialType.WATER]: {
    name: 'Water',
    speedOfSound: 1481,
    density: 997,
    color: '#0ea5e9' // Sky 500
  },
  [MaterialType.STEEL]: {
    name: 'Steel',
    speedOfSound: 5960,
    density: 7850,
    color: '#94a3b8' // Slate 400
  },
  [MaterialType.CUSTOM]: {
    name: 'Metamaterial',
    speedOfSound: 300,
    density: 1000,
    color: '#d946ef' // Fuchsia 500
  }
};

export const GRID_SIZE = 120; // 120x120 simulation grid
export const DX = 0.01; // 1cm per pixel
export const DT = 0.000005; // Time step (needs to satisfy Courant condition)

export enum MaterialType {
  AIR = 'AIR',
  WATER = 'WATER',
  STEEL = 'STEEL',
  CUSTOM = 'CUSTOM'
}

export interface MaterialProperties {
  name: string;
  speedOfSound: number; // m/s
  density: number; // kg/m^3
  color: string;
}

export interface SimulationConfig {
  frequency: number; // Hz
  sourceAmplitude: number;
  sourceX: number; // 0-1 relative
  sourceY: number; // 0-1 relative
  simulationSpeed: number;
  damping: number;
  gridResolution: number; // e.g., 100 for 100x100
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

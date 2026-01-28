import { GRID_SIZE, MATERIALS, DX, DT } from '../constants';
import { MaterialType } from '../types';

export class WaveSolver {
  u: Float32Array; // Current wave field
  uPrev: Float32Array; // Previous wave field
  velocityMap: Float32Array; // Speed of sound squared map
  dampingMap: Float32Array; // Damping coefficients
  size: number;
  
  constructor(size: number = GRID_SIZE) {
    this.size = size;
    const totalPixels = size * size;
    this.u = new Float32Array(totalPixels);
    this.uPrev = new Float32Array(totalPixels);
    this.velocityMap = new Float32Array(totalPixels);
    this.dampingMap = new Float32Array(totalPixels);
    
    // Initialize with Air
    this.resetMaterialMap(MaterialType.AIR);
  }

  resetMaterialMap(defaultMaterial: MaterialType) {
    const c = MATERIALS[defaultMaterial].speedOfSound;
    const c2 = c * c;
    for (let i = 0; i < this.velocityMap.length; i++) {
      this.velocityMap[i] = c2;
      this.dampingMap[i] = 1.0; // No damping inside
    }
    this.applyBoundaries();
  }

  updateMaterial(x: number, y: number, material: MaterialType, brushSize: number) {
    const c = MATERIALS[material].speedOfSound;
    const c2 = c * c;
    const r = Math.floor(brushSize / 2);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
          const idx = ny * this.size + nx;
          this.velocityMap[idx] = c2;
        }
      }
    }
  }

  applyBoundaries() {
    // Simple absorbing boundary layer (Perfectly Matched Layer is too complex for this demo, using lossy edges)
    const padding = 10;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (x < padding || x >= this.size - padding || y < padding || y >= this.size - padding) {
          const idx = y * this.size + x;
          // Distance to closest edge
          const dist = Math.min(x, this.size - 1 - x, y, this.size - 1 - y);
          const dampingFactor = 1.0 - 0.1 * ((padding - dist) / padding);
          this.dampingMap[idx] = Math.max(0.8, dampingFactor);
        }
      }
    }
  }

  step(sourceFreq: number, sourceAmp: number, sourceX: number, sourceY: number, time: number) {
    const s = this.size;
    
    // Convert source normalized position to index
    const sx = Math.floor(sourceX * (s - 1));
    const sy = Math.floor(sourceY * (s - 1));
    const sourceIdx = sy * s + sx;

    // Source Injection (Soft Source)
    // u[sourceIdx] += sourceAmp * Math.sin(2 * Math.PI * sourceFreq * time);
    // Hard Source for clearer visualization of frequency
    this.u[sourceIdx] = sourceAmp * Math.sin(2 * Math.PI * sourceFreq * time);

    const courrantNumberSq = (DT * DT) / (DX * DX);

    // FDTD Update Loop
    // OPTIMIZATION: Using flat arrays and pre-calculated indices
    for (let y = 1; y < s - 1; y++) {
      const rowOffset = y * s;
      for (let x = 1; x < s - 1; x++) {
        const i = rowOffset + x;
        
        const uC = this.u[i];
        const uP = this.uPrev[i];
        const c2 = this.velocityMap[i];
        const damp = this.dampingMap[i];

        // Laplacian (Central Difference)
        const laplacian = this.u[i + 1] + this.u[i - 1] + this.u[i + s] + this.u[i - s] - 4 * uC;

        // Wave Equation: u_new = 2*u - u_old + (c*dt/dx)^2 * Laplacian
        let uNext = 2 * uC - uP + c2 * courrantNumberSq * laplacian;

        // Apply Damping
        uNext *= damp;

        // Store result in uPrev (conceptually new u, we will swap pointers or rely on copy)
        // To save memory, we use a temp buffer strategy or just updated in place with double buffering.
        // For simplicity in JS class structure: 
        // We need a 'uNew' buffer technically. Let's do a swap strategy after the loop.
        // Wait, we can't update in place because neighbors need 'current' step.
        // We need a third buffer or swap logic.
      }
    }
  }

  // Optimized Step with buffer swapping
  stepOptimized(sourceFreq: number, sourceAmp: number, sourceX: number, sourceY: number, time: number): Float32Array {
    const s = this.size;
    const sizeSq = s * s;
    const courrantConst = (DT * DT) / (DX * DX);
    
    // Allocate a new buffer for the next step (or reuse a third one if we wanted to be super optimized, 
    // but allocating a TypedArray is fast enough for 14400 elements or we can keep a persistent 'next' buffer)
    // Let's assume we have a persistent 'uNext' for performance in a real app, 
    // but here we'll just map 'uPrev' -> 'u' -> 'uNext' cycle. 
    // Actually, standard FDTD needs: U(t+1), U(t), U(t-1).
    // Let's create a temporary U_Next buffer.
    const uNext = new Float32Array(sizeSq);

    const sx = Math.floor(sourceX * (s - 1));
    const sy = Math.floor(sourceY * (s - 1));
    const sourceIdx = sy * s + sx;

    // Apply source to current grid before calculating next
    this.u[sourceIdx] = sourceAmp * Math.sin(2 * Math.PI * sourceFreq * time);

    for (let y = 1; y < s - 1; y++) {
      let i = y * s + 1;
      for (let x = 1; x < s - 1; x++) {
        const c2 = this.velocityMap[i];
        const val = 2 * this.u[i] - this.uPrev[i] + 
                    c2 * courrantConst * (this.u[i+1] + this.u[i-1] + this.u[i+s] + this.u[i-s] - 4*this.u[i]);
        
        uNext[i] = val * this.dampingMap[i];
        i++;
      }
    }

    // Cycle buffers
    this.uPrev.set(this.u);
    this.u.set(uNext);

    return this.u;
  }
}

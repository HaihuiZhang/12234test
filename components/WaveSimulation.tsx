import React, { useRef, useEffect } from 'react';
import { WaveSolver } from '../services/waveSolver';
import { SimulationConfig } from '../types';

interface WaveSimulationProps {
  solver: WaveSolver;
  config: SimulationConfig;
  isRunning: boolean;
}

const WaveSimulation: React.FC<WaveSimulationProps> = ({ solver, config, isRunning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fixed: Initialize useRef with 0 to match number type
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true }); // Enable alpha for overlay
    if (!ctx) return;

    const renderLoop = () => {
      if (isRunning) {
        // Run physics steps multiple times per frame for speed
        const stepsPerFrame = Math.ceil(config.simulationSpeed * 5); 
        for (let i = 0; i < stepsPerFrame; i++) {
          timeRef.current += 1;
          solver.stepOptimized(
            config.frequency,
            config.sourceAmplitude,
            config.sourceX,
            config.sourceY,
            timeRef.current * 0.000005 // dt passed as time, actually used for sin source
          );
        }
      }

      // Visualization
      const size = solver.size;
      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;
      const waveField = solver.u;

      for (let i = 0; i < size * size; i++) {
        const val = waveField[i];
        
        // Diverging Colormap (Blue - Transparent - Red)
        // We want to see the underlying material, so near 0 is transparent
        const intensity = Math.min(255, Math.abs(val * 2000)); // Scale for visibility
        
        const pixelIndex = i * 4;
        
        if (val > 0) {
          // Positive Pressure (Red)
          data[pixelIndex] = 255;     // R
          data[pixelIndex + 1] = 50;  // G
          data[pixelIndex + 2] = 50;  // B
          data[pixelIndex + 3] = intensity; // Alpha
        } else {
          // Negative Pressure (Blue)
          data[pixelIndex] = 50;      // R
          data[pixelIndex + 1] = 100; // G
          data[pixelIndex + 2] = 255; // B
          data[pixelIndex + 3] = intensity; // Alpha
        }
      }

      // Draw simplified bitmap to canvas
      // To scale up without blurring, we might need a temp offscreen or CSS tricks
      // For now, we putImageData directly into a small canvas and let CSS scale it visually
      // BUT, the prop canvas is likely 600x600. We should scale carefully.
      
      // Better approach: Draw to a temporary small canvas then drawImage to big one.
      // Or just iterate pixels on the big canvas (slow).
      // Let's use the createBitmap method if supported or simple putImageData onto a small overlay.
      
      // Let's assume the canvas resolution matches the grid size for performance, 
      // and we rely on CSS 'image-rendering: pixelated'
      ctx.putImageData(imgData, 0, 0);

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [solver, isRunning, config]);

  return (
    <canvas
      ref={canvasRef}
      width={solver.size}
      height={solver.size}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default WaveSimulation;
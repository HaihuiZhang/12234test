import React, { useRef, useEffect, useState } from 'react';
import { WaveSolver } from '../services/waveSolver';
import { MaterialType, SimulationConfig } from '../types';
import { MATERIALS, GRID_SIZE } from '../constants';

interface UnitCellEditorProps {
  solver: WaveSolver;
  config: SimulationConfig;
  selectedMaterial: MaterialType;
  isDrawing: boolean;
  setIsDrawing: (v: boolean) => void;
  brushSize: number;
}

const UnitCellEditor: React.FC<UnitCellEditorProps> = ({
  solver,
  config,
  selectedMaterial,
  isDrawing,
  setIsDrawing,
  brushSize
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render the static material map
  const renderMaterialMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = solver.size;
    const pixelSize = canvas.width / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const c2 = solver.velocityMap[idx];
        
        // Reverse lookup material color roughly based on c2
        let color = MATERIALS[MaterialType.AIR].color;
        
        const airC2 = Math.pow(MATERIALS[MaterialType.AIR].speedOfSound, 2);
        const waterC2 = Math.pow(MATERIALS[MaterialType.WATER].speedOfSound, 2);
        const steelC2 = Math.pow(MATERIALS[MaterialType.STEEL].speedOfSound, 2);
        
        if (Math.abs(c2 - waterC2) < 1000) color = MATERIALS[MaterialType.WATER].color;
        else if (Math.abs(c2 - steelC2) < 1000) color = MATERIALS[MaterialType.STEEL].color;
        
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  };

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * solver.size);
    const y = Math.floor(((clientY - rect.top) / rect.height) * solver.size);

    solver.updateMaterial(x, y, selectedMaterial, brushSize);
    renderMaterialMap();
  };

  // Handle Drawing
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    paintAt(e.clientX, e.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    // Paint immediately on mouse down to handle clicks and start of drag
    paintAt(e.clientX, e.clientY);
  };

  useEffect(() => {
    renderMaterialMap();
  }, [solver, config]); 

  return (
    <div className="relative w-full aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-xl cursor-crosshair">
      {/* Base Material Layer */}
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
};

export default UnitCellEditor;
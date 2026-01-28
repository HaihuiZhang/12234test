import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WaveSolver } from './services/waveSolver';
import UnitCellEditor from './components/UnitCellEditor';
import WaveSimulation from './components/WaveSimulation';
import AnalysisPanel from './components/AnalysisPanel';
import ChatInterface from './components/ChatInterface';
import { SimulationConfig, MaterialType, MaterialProperties } from './types';
import { MATERIALS } from './constants';
import clsx from 'clsx';

const App: React.FC = () => {
  // --- State ---
  const [isRunning, setIsRunning] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(MaterialType.STEEL);
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [config, setConfig] = useState<SimulationConfig>({
    frequency: 2000,
    sourceAmplitude: 1.0,
    sourceX: 0.1,
    sourceY: 0.5,
    simulationSpeed: 0.5,
    damping: 0.98,
    gridResolution: 100
  });

  // Mock data for graphs (would be calculated by scanning frequencies in a full app)
  const [transmissionData, setTransmissionData] = useState<{ freq: number; db: number }[]>([]);

  // --- Physics Engine ---
  // Memoize solver so it persists across re-renders unless explicitly reset
  const solver = useMemo(() => new WaveSolver(), []);

  // --- Graph Calculation Logic ---
  const updateTransmissionGraph = useCallback(() => {
    const size = solver.size;
    const step = 4; // Sample every 4th pixel for performance
    let totalC = 0;
    let minC = Infinity;
    let maxC = -Infinity;
    let nonAirPixels = 0;
    let count = 0;

    const airC = MATERIALS[MaterialType.AIR].speedOfSound;

    // Scan the velocity map
    for (let i = 0; i < size * size; i += step) {
       const c2 = solver.velocityMap[i];
       const c = Math.sqrt(c2);
       totalC += c;
       if (c < minC) minC = c;
       if (c > maxC) maxC = c;
       
       // Check if pixel is significantly different from Air
       if (Math.abs(c - airC) > 10) {
           nonAirPixels++;
       }
       count++;
    }

    const avgC = totalC / count;
    const fillingFraction = nonAirPixels / count;
    
    // Avoid division by zero/infinity
    const safeMinC = minC === Infinity ? 343 : minC;
    const safeMaxC = maxC === -Infinity ? 343 : maxC;
    const contrast = safeMaxC / safeMinC;

    // Simulate Bandgap
    // A bandgap typically appears if we have scattering (contrast > 1) and reasonable filling fraction
    const hasBandgap = contrast > 1.2 && fillingFraction > 0.05 && fillingFraction < 0.95;

    const newData = [];
    
    // Gap center scales with average velocity (simulating Bragg condition changes)
    // f ~ v / 2a. As stiffness increases (higher v), gap moves up.
    // Base reference: 2500Hz.
    const centerFreq = 2500 * (avgC / 343); 
    
    // Gap width scales with filling fraction (max at 0.5) and contrast
    // Parabolic scaling for filling fraction: 4 * x * (1-x) is 1 at x=0.5
    const gapWidth = hasBandgap 
        ? 2000 * (Math.log10(contrast) * 2) * (4 * fillingFraction * (1 - fillingFraction)) 
        : 0;

    for (let f = 200; f <= 5000; f += 50) {
      let db = -2 - Math.random() * 2; // Base insertion loss / noise
      
      // Material Absorption (High freq attenuation)
      db -= (f / 5000) * 3; 

      if (hasBandgap) {
        const dist = Math.abs(f - centerFreq);
        if (dist < gapWidth / 2) {
            // Inside gap
            const depth = 20 + (contrast * 3); // Deeper for higher contrast
            // Parabolic dip shape
            const normalizedDist = dist / (gapWidth / 2);
            const shape = 1 - Math.pow(normalizedDist, 2);
            db -= depth * shape;
        }
      }
      
      newData.push({ freq: f, db });
    }
    setTransmissionData(newData);
  }, [solver]);

  // --- Helpers ---
  const handleConfigUpdate = (newConfig: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleReset = () => {
    solver.resetMaterialMap(MaterialType.AIR);
    solver.u.fill(0);
    solver.uPrev.fill(0);
    setConfig(prev => ({ ...prev })); // Trigger update
    updateTransmissionGraph();
  };

  const handleClearFields = () => {
     solver.u.fill(0);
     solver.uPrev.fill(0);
  };

  // Update graph when painting finishes (mouse up)
  useEffect(() => {
    if (!isDrawing) {
       updateTransmissionGraph();
    }
  }, [isDrawing, updateTransmissionGraph]);
  
  // Initial calculation
  useEffect(() => {
    updateTransmissionGraph();
  }, [updateTransmissionGraph]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-fuchsia-500/30">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-600 to-sky-600 rounded-lg flex items-center justify-center shadow-lg shadow-fuchsia-900/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
            Acoustic<span className="font-light">Meta</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
           <a href="#" className="text-slate-400 hover:text-white transition-colors">Documentation</a>
           <a href="#" className="text-slate-400 hover:text-white transition-colors">Github</a>
           <div className="h-4 w-px bg-slate-700"></div>
           <span className="text-emerald-500 flex items-center gap-1.5">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
             System Active
           </span>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full">
        
        {/* Left: Tools & Controls */}
        <div className="lg:col-span-3 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
          {/* Simulation Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Simulation Control</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={clsx(
                    "flex-1 py-2 rounded-lg font-medium transition-all shadow-lg active:scale-95",
                    isRunning 
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  )}
                >
                  {isRunning ? 'Pause Physics' : 'Start Physics'}
                </button>
                <button onClick={handleClearFields} className="ml-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 border border-slate-700" title="Clear Wave Field">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button onClick={handleReset} className="ml-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 border border-slate-700" title="Reset Grid">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Frequency</span>
                  <span>{config.frequency} Hz</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="5000"
                  step="50"
                  value={config.frequency}
                  onChange={(e) => handleConfigUpdate({ frequency: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Sim Speed</span>
                  <span>{config.simulationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={config.simulationSpeed}
                  onChange={(e) => handleConfigUpdate({ simulationSpeed: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Material Palette */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex-1">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Material Palette</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.values(MATERIALS).map((mat) => (
                <button
                  key={mat.name}
                  onClick={() => setSelectedMaterial(mat.name.toUpperCase() as MaterialType)}
                  className={clsx(
                    "p-3 rounded-lg border text-left transition-all relative overflow-hidden group",
                    selectedMaterial === mat.name.toUpperCase()
                      ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50"
                      : "border-slate-700 bg-slate-800 hover:bg-slate-750"
                  )}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mat.color }}></div>
                       <span className="font-medium text-slate-200">{mat.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <div>c = {mat.speedOfSound} m/s</div>
                      <div>ρ = {mat.density} kg/m³</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Brush Size</label>
              <div className="flex gap-2">
                 {[1, 3, 5, 9].map(size => (
                    <button
                      key={size}
                      onClick={() => setBrushSize(size)}
                      className={clsx(
                         "flex-1 py-1 rounded border transition-all text-xs font-mono",
                         brushSize === size 
                           ? "bg-slate-200 text-slate-900 border-white" 
                           : "bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-500"
                      )}
                    >
                      {size}px
                    </button>
                 ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="lg:col-span-6 flex flex-col gap-6">
           <div className="relative w-full aspect-square max-h-[70vh] mx-auto">
             <UnitCellEditor
               solver={solver}
               config={config}
               selectedMaterial={selectedMaterial}
               isDrawing={isDrawing}
               setIsDrawing={setIsDrawing}
               brushSize={brushSize}
             />
             <WaveSimulation 
                solver={solver} 
                config={config} 
                isRunning={isRunning} 
             />
             
             {/* Source Indicator */}
             <div 
               className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
               style={{ 
                 top: `${config.sourceY * 100}%`, 
                 left: `${config.sourceX * 100}%`,
                 backgroundColor: `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now()/200))})` // Pulsing
               }}
             ></div>

             <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 pointer-events-none">
                <span className="text-fuchsia-400">Red:</span> High Pressure &bull; <span className="text-sky-400">Blue:</span> Low Pressure
             </div>
           </div>
           
           {/* Bottom Graph Panel */}
           <div className="h-48 w-full">
              <AnalysisPanel config={config} transmissionData={transmissionData} />
           </div>
        </div>

        {/* Right: AI Assistant */}
        <div className="lg:col-span-3 h-[calc(100vh-8rem)]">
          <ChatInterface config={config} onUpdateConfig={handleConfigUpdate} />
        </div>

      </main>
    </div>
  );
};

export default App;
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { SimulationConfig } from '../types';

interface AnalysisPanelProps {
  config: SimulationConfig;
  transmissionData: { freq: number; db: number }[];
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ config, transmissionData }) => {
  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-full flex flex-col">
      <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        Transmission Loss Analysis
      </h3>
      
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={transmissionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="freq" 
              stroke="#94a3b8" 
              label={{ value: 'Frequency (Hz)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} 
            />
            <YAxis 
              stroke="#94a3b8" 
              label={{ value: 'Transmission (dB)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              domain={[-60, 5]}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelFormatter={(label) => `${label} Hz`}
              formatter={(value: number) => [value.toFixed(1) + ' dB', 'Transmission']}
            />
            <Line 
              type="monotone" 
              dataKey="db" 
              stroke="#d946ef" 
              strokeWidth={2} 
              dot={false}
              animationDuration={500}
            />
            <ReferenceLine x={config.frequency} stroke="#0ea5e9" strokeDasharray="3 3" isFront={true}>
               <Label value="Current Freq" position="insideTopLeft" fill="#0ea5e9" fontSize={12} offset={10} />
            </ReferenceLine>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        * Estimated transmission loss based on current lattice configuration.
      </p>
    </div>
  );
};

export default AnalysisPanel;
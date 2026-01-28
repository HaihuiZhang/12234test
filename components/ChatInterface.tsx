import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { SimulationConfig, ChatMessage } from '../types';

interface ChatInterfaceProps {
  config: SimulationConfig;
  onUpdateConfig: (newConfig: Partial<SimulationConfig>) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ config, onUpdateConfig }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your Acoustic Metamaterial Assistant. I can help you design phononic crystals or explain wave phenomena. How can I help?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await geminiService.sendMessage(history, userMsg.text, config);
      // Fixed: Use .text property instead of deprecated .response.text()
      const responseText = result.text || '';
      
      const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);

      // Handle Function Calls
      // Fixed: Use .functionCalls property instead of deprecated .response.functionCalls()
      const functionCalls = result.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'updateSimulationConfig') {
            const args = call.args as any;
            const updates: Partial<SimulationConfig> = {};
            
            if (args.frequency) updates.frequency = Number(args.frequency);
            if (args.sourceAmplitude) updates.sourceAmplitude = Number(args.sourceAmplitude);
            if (args.simulationSpeed) updates.simulationSpeed = Number(args.simulationSpeed);

            onUpdateConfig(updates);
            
            setMessages(prev => [...prev, {
              role: 'model',
              text: `I've updated the simulation parameters: ${JSON.stringify(updates, null, 2)}`,
              timestamp: Date.now()
            }]);
          }
        }
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error connecting to the AI service.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-900/50 p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-slate-200 font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI Designer
        </h3>
        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Gemini-3-Flash</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-sky-600 text-white rounded-br-none' 
                : 'bg-slate-700 text-slate-200 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-slate-700 rounded-lg rounded-bl-none p-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-900/50 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about bandgaps..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white rounded-lg px-4 py-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
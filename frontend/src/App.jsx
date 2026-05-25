import React from 'react';
import SmartChat from './components/SmartChat'; // ⚡ Importing your newly created component

export default function App() {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col justify-center items-center p-4 antialiased text-zinc-200 font-sans">
      <div className="w-full max-w-3xl bg-[#1e1e1e] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[750px] overflow-hidden">
        
        {/* Main Application Global Top Bar Header */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base font-bold tracking-tight text-white">
              Smart Multimodal Engineering Mentor
            </h1>
          </div>
          <span className="text-xs font-mono font-medium text-zinc-500">
            Claude-3.5-Sonnet v1
          </span>
        </div>

        {/* Dedicated Workspace Chat Interface Sandbox */}
        <div className="flex-1 flex flex-col bg-zinc-900/30 overflow-hidden">
          <SmartChat />
        </div>

      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Brain, Zap, Search } from "lucide-react";
import Intelligence from "./Intelligence";
import Operations from "./Operations";

export default function Intel() {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'operations'>('operations');

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center border-b border-green-900 pb-4 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Search className="text-purple-500" /> Intel
          </h2>
          <div className="flex bg-black border border-green-900 rounded p-0.5">
            <button 
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'operations' ? 'bg-yellow-600/20 text-yellow-500' : 'text-green-900 hover:text-green-700'}`}
            >
              <Zap size={12} /> OPERATIONS
            </button>
            <button 
              onClick={() => setActiveTab('intelligence')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'intelligence' ? 'bg-purple-600/20 text-purple-400' : 'text-green-900 hover:text-green-700'}`}
            >
              <Brain size={12} /> FIELD INTEL
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'operations' && (
          <div className="h-full animate-in fade-in duration-300">
            <Operations hideHeader />
          </div>
        )}
        {activeTab === 'intelligence' && (
          <div className="h-full animate-in fade-in duration-300">
            <Intelligence hideHeader />
          </div>
        )}
      </div>
    </div>
  );
}

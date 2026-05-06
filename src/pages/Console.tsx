import React, { useState } from "react";
import { Terminal as TerminalIcon, Folder, Wrench } from "lucide-react";
import Terminal from "./Terminal";
import FileSystem from "./FileSystem";

export default function Console() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'filesystem'>('terminal');

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center border-b border-green-900 pb-4 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <TerminalIcon className="text-green-500" /> Console
          </h2>
          <div className="flex bg-black border border-green-900 rounded p-0.5">
            <button 
              onClick={() => setActiveTab('terminal')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'terminal' ? 'bg-green-600/20 text-green-400' : 'text-green-900 hover:text-green-700'}`}
            >
              <TerminalIcon size={12} /> CLI CONSOLE
            </button>
            <button 
              onClick={() => setActiveTab('filesystem')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'filesystem' ? 'bg-blue-600/20 text-blue-400' : 'text-green-900 hover:text-green-700'}`}
            >
              <Folder size={12} /> FILESYSTEM
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'terminal' && (
          <div className="h-full animate-in fade-in duration-300">
            <Terminal />
          </div>
        )}
        {activeTab === 'filesystem' && (
          <div className="h-full animate-in fade-in duration-300">
            <FileSystem hideHeader />
          </div>
        )}
      </div>
    </div>
  );
}

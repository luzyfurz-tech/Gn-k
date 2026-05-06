import React, { useState, useEffect } from "react";
import { Plus, Target, Tag, Trash2, FileJson, Zap, Play, CheckCircle, XCircle, Eye, Shield, Activity } from "lucide-react";

export default function Operations({ hideHeader = false }: { hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<'scope' | 'runs'>('scope');
  
  // Targets State
  const [targets, setTargets] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTarget, setNewTarget] = useState({ hostname: "", ipRange: "", scopeNotes: "", tags: "" });

  // Scans State
  const [scans, setScans] = useState<any[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedTool, setSelectedTool] = useState("nmap");
  const [viewingScan, setViewingScan] = useState<any>(null);

  const fetchTargets = async () => {
    try {
      const res = await fetch("/api/targets");
      if (res.ok) {
        const data = await res.json();
        setTargets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Fetch targets error", e);
    }
  };

  const fetchScans = async () => {
    try {
      const res = await fetch("/api/scans");
      if (res.ok) {
        const data = await res.json();
        setScans(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Fetch scans error", e);
    }
  };

  useEffect(() => {
    fetchTargets();
    fetchScans();
    const interval = setInterval(fetchScans, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTarget)
    });
    setNewTarget({ hostname: "", ipRange: "", scopeNotes: "", tags: "" });
    setShowAdd(false);
    fetchTargets();
  };

  const handleStartScan = async () => {
    if (!selectedTarget) return alert("Select a target first.");
    
    setViewingScan({ toolName: selectedTool, status: 'starting', output: 'Dispatching agent...' });

    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("ollama_api_key")}`,
        "x-ai-provider": localStorage.getItem("ai_provider") || "ollama",
        "x-ollama-host": localStorage.getItem("ollama_host") || "https://ollama.com"
      },
      body: JSON.stringify({ 
        goal: `Scan target ${selectedTarget} using ${selectedTool}. Use 'start_scan' tool.`,
        model: localStorage.getItem("agent_model") || "llama3"
      })
    });

    if (!response.ok) {
        setViewingScan(null);
        return alert("Failed to dispatch agent.");
    }

    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) return;

    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.replace("data: ", ""));
            if (event.type === 'tool_call' && event.data.tool === 'start_scan') {
               fetchScans();
            }
            if (event.type === 'error') {
               setViewingScan((prev: any) => ({ ...prev, status: 'failed', output: (prev?.output || "") + "\nERROR: " + event.data.message }));
            }
            if (event.type === 'done') {
               fetchScans();
            }
          } catch (e) {}
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex justify-between items-center border-b border-green-900 pb-4">
          <div className="flex items-center gap-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="text-yellow-500" /> Operations
              </h2>
              <div className="flex bg-black border border-green-900 rounded p-0.5">
                  <button 
                    onClick={() => setActiveTab('scope')}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'scope' ? 'bg-green-600/20 text-green-400' : 'text-green-900 hover:text-green-700'}`}
                  >
                    <Shield size={12} /> ENGAGEMENT SCOPE
                  </button>
                  <button 
                    onClick={() => setActiveTab('runs')}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'runs' ? 'bg-blue-600/20 text-blue-400' : 'text-green-900 hover:text-green-700'}`}
                  >
                    <Activity size={12} /> JOB EXECUTION
                  </button>
              </div>
          </div>
          <div className="text-[10px] text-green-700 italic font-mono uppercase tracking-widest hidden md:block">
              Status: {activeTab === 'scope' ? "Defining Attack Surface" : "Executing Active Vectors"}
          </div>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-between items-center shrink-0 mb-2">
            <div className="flex bg-black border border-green-900 rounded p-0.5">
                <button 
                  onClick={() => setActiveTab('scope')}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'scope' ? 'bg-green-600/20 text-green-400' : 'text-green-900 hover:text-green-700'}`}
                >
                  <Shield size={12} /> ENGAGEMENT SCOPE
                </button>
                <button 
                  onClick={() => setActiveTab('runs')}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'runs' ? 'bg-blue-600/20 text-blue-400' : 'text-green-900 hover:text-green-700'}`}
                >
                  <Activity size={12} /> JOB EXECUTION
                </button>
            </div>
            <div className="text-[10px] text-yellow-700 italic uppercase tracking-widest">Active Stream: {activeTab}</div>
        </div>
      )}

      {activeTab === 'scope' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center">
             <h3 className="text-sm font-bold text-green-700 uppercase tracking-widest flex items-center gap-2">
                <Target size={14} /> Living Target Manifest
             </h3>
             <button 
                onClick={() => setShowAdd(true)}
                className="bg-green-900 px-3 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1 hover:bg-green-800 transition-colors"
              >
                <Plus size={14} /> Add Target
              </button>
           </div>

           {showAdd && (
             <form onSubmit={handleAddTarget} className="border border-green-900 p-4 rounded bg-green-900/10 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-green-700">Hostname / Label</label>
                   <input 
                     required
                     value={newTarget.hostname}
                     onChange={e => setNewTarget({...newTarget, hostname: e.target.value})}
                     className="w-full bg-black border border-green-900 p-2 rounded text-xs focus:outline-none focus:border-green-500 font-mono" 
                     placeholder="e.g. internal-db-01"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-green-700">IP Range / CIDR</label>
                   <input 
                     required
                     value={newTarget.ipRange}
                     onChange={e => setNewTarget({...newTarget, ipRange: e.target.value})}
                     className="w-full bg-black border border-green-900 p-2 rounded text-xs focus:outline-none focus:border-green-500 font-mono"
                     placeholder="e.g. 10.0.0.1/32"
                   />
                 </div>
               </div>
               <div className="flex justify-end gap-2">
                 <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1 text-[10px] font-bold text-green-700 uppercase">Cancel</button>
                 <button type="submit" className="bg-green-600/20 text-green-400 border border-green-500/30 px-4 py-1 text-[10px] font-bold uppercase rounded">Persist Target</button>
               </div>
             </form>
           )}

           <div className="border border-green-900 rounded overflow-hidden">
             <table className="w-full text-left text-xs">
               <thead className="bg-green-900/30 text-green-700 text-[10px] uppercase">
                 <tr>
                   <th className="p-3">Node Label</th>
                   <th className="p-3">Network Coordinate</th>
                   <th className="p-3">Tags</th>
                   <th className="p-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-green-900/50 font-mono">
                 {targets.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-green-900 italic uppercase tracking-tighter">Surface remains undefined.</td>
                   </tr>
                 ) : (
                   targets.map(target => (
                     <tr key={target.id} className="hover:bg-green-900/10">
                       <td className="p-3 text-green-200">{target.hostname}</td>
                       <td className="p-3 text-green-500">{target.ipRange}</td>
                       <td className="p-3">
                         <div className="flex gap-1">
                           {target.tags?.split(",").map((tag: string) => (
                             <span key={tag} className="text-[9px] border border-green-900/50 px-1 rounded flex items-center gap-1 bg-green-900/5 uppercase">
                               <Tag size={8} /> {tag.trim()}
                             </span>
                           ))}
                         </div>
                       </td>
                       <td className="p-3 text-right">
                         <button className="text-red-900 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="lg:col-span-1 space-y-4">
             <section className="border border-green-900 p-4 rounded bg-green-900/10 space-y-4 border-l-4 border-l-blue-500">
               <h3 className="font-bold text-[10px] uppercase tracking-widest text-blue-400">Mission Dispatcher</h3>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-bold text-green-800">Target Node</label>
                 <select 
                   value={selectedTarget}
                   onChange={e => setSelectedTarget(e.target.value)}
                   className="w-full bg-black border border-green-900 p-2 rounded text-[10px] text-green-100 focus:outline-none focus:border-blue-500 font-mono"
                 >
                   <option value="">Select Coordination...</option>
                   {targets.map(t => <option key={t.id} value={t.id}>{t.hostname} ({t.ipRange})</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] uppercase font-bold text-green-800">Vector Toolkit</label>
                 <select 
                   value={selectedTool}
                   onChange={e => setSelectedTool(e.target.value)}
                   className="w-full bg-black border border-green-900 p-2 rounded text-[10px] text-green-100 focus:outline-none focus:border-blue-500 font-mono"
                 >
                   <option value="nmap">Nmap (Port Scan)</option>
                   <option value="nikto">Nikto (Web Vuln)</option>
                   <option value="gobuster">Gobuster (Dir Brute)</option>
                   <option value="nuclei">Nuclei (App Scan)</option>
                 </select>
               </div>
               <button 
                 onClick={handleStartScan}
                 className="w-full bg-blue-900/40 border border-blue-500/50 hover:bg-blue-800/60 text-blue-100 py-2 rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all"
               >
                 <Play size={12} strokeWidth={3} /> INITIALIZE RUN
               </button>
             </section>
           </div>

           <div className="lg:col-span-3 border border-green-900 rounded overflow-hidden bg-black/20 flex flex-col h-[600px]">
             <div className="overflow-y-auto flex-1 custom-scrollbar">
               <table className="w-full text-left text-xs">
                 <thead className="bg-green-900/30 text-green-700 text-[10px] uppercase sticky top-0 backdrop-blur-sm">
                   <tr>
                     <th className="p-3">Coord Timestamp</th>
                     <th className="p-3">Vector</th>
                     <th className="p-3">Status</th>
                     <th className="p-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-green-900/50 font-mono">
                   {scans.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="p-12 text-center text-green-900 italic uppercase">No operational history found.</td>
                     </tr>
                   ) : (
                     scans.map(scan => (
                       <tr key={scan.id} className={`hover:bg-green-900/5 transition-colors ${viewingScan?.id === scan.id ? 'bg-blue-900/20' : ''}`}>
                         <td className="p-3 text-[10px] text-green-800">{new Date(scan.createdAt).toLocaleString()}</td>
                         <td className="p-3 font-bold text-blue-400">{scan.toolName}</td>
                         <td className="p-3">
                           <div className="flex items-center gap-2">
                             {scan.status === 'completed' && <CheckCircle size={12} className="text-green-500" />}
                             {scan.status === 'failed' && <XCircle size={12} className="text-red-500" />}
                             {scan.status === 'running' && <Loader2 className="animate-spin text-blue-500" size={12} />}
                             <span className={`capitalize text-[9px] tracking-widest ${scan.status === 'running' ? 'animate-pulse text-blue-400' : ''}`}>{scan.status}</span>
                           </div>
                         </td>
                         <td className="p-3 text-right">
                           <button 
                             onClick={() => setViewingScan(scan)}
                             className="text-blue-700 hover:text-blue-400 p-1 transition-colors"
                           >
                             <Eye size={16} />
                           </button>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>

             {viewingScan && (
               <div className="h-2/3 border-t border-green-900 bg-black/60 p-4 overflow-hidden flex flex-col border-t-4 border-t-blue-900">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter shadow-blue-500/50 shadow-sm px-1 italic">Stream Analysis: {viewingScan.toolName}</span>
                   <button onClick={() => setViewingScan(null)} className="text-red-900 hover:text-red-500 text-[10px] font-bold uppercase">Terminate View</button>
                 </div>
                 <div className="flex-1 overflow-y-auto bg-black p-4 rounded border border-blue-900/30 font-mono text-[10px] text-green-400 leading-relaxed custom-scrollbar">
                   {viewingScan.output || "Awaiting signal from agent. Initializing telemetry pipeline..."}
                 </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}

function Loader2({ size, className }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

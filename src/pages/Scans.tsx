import { useState, useEffect } from "react";
import { Zap, Play, Search, Trash2, Clock, CheckCircle, XCircle, Layout, Eye } from "lucide-react";

export default function Scans() {
  const [scans, setScans] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedTool, setSelectedTool] = useState("nmap");
  const [viewingScan, setViewingScan] = useState<any>(null);

  const fetchScans = () => fetch("/api/scans").then(res => res.json()).then(setScans);

  useEffect(() => {
    fetchScans();
    fetch("/api/targets").then(res => res.json()).then(setTargets);
    const interval = setInterval(fetchScans, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartScan = async () => {
    if (!selectedTarget) return alert("Select a target first.");
    
    await fetch("/api/agent/run", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("ollama_api_key")}`
      },
      body: JSON.stringify({ 
        goal: `Scan target ${selectedTarget} using ${selectedTool}. Use 'start_scan' tool.`,
        model: "manual-scan-trigger" 
      })
    });
    alert("Scan instruction dispatched to agent.");
    fetchScans();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="text-yellow-500" /> Security Scans
        </h2>
        <div className="text-[10px] text-green-700 italic">"Real-time monitoring of asynchronous task execution."</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <section className="border border-green-900 p-4 rounded bg-green-900/10 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-widest text-green-700">Dispatcher</h3>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-green-800">Target Node</label>
              <select 
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
                className="w-full bg-black border border-green-900 p-2 rounded text-xs text-green-100 focus:outline-none focus:border-green-500"
              >
                <option value="">Select Target...</option>
                {targets.map(t => <option key={t.id} value={t.id}>{t.hostname} ({t.ipRange})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-green-800">Vector Tool</label>
              <select 
                value={selectedTool}
                onChange={e => setSelectedTool(e.target.value)}
                className="w-full bg-black border border-green-900 p-2 rounded text-xs text-green-100 focus:outline-none focus:border-green-500"
              >
                <option value="nmap">Nmap (Port Scan)</option>
                <option value="nikto">Nikto (Web Vuln)</option>
                <option value="gobuster">Gobuster (Dir Brute)</option>
                <option value="sqlmap">Sqlmap (SQLi)</option>
                <option value="nuclei">Nuclei (App Scan)</option>
              </select>
            </div>
            <button 
              onClick={handleStartScan}
              className="w-full bg-green-900 hover:bg-green-800 text-green-100 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Play size={14} /> Execute Job
            </button>
          </section>
        </div>

        <div className="lg:col-span-3 border border-green-900 rounded overflow-hidden bg-black/20 flex flex-col h-[500px]">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-green-900/30 text-green-700 text-[10px] uppercase sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Tool</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-900/50">
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-green-900 italic">No operational history found.</td>
                  </tr>
                ) : (
                  scans.map(scan => (
                    <tr key={scan.id} className={`hover:bg-green-900/5 transition-colors ${viewingScan?.id === scan.id ? 'bg-green-900/10' : ''}`}>
                      <td className="p-3 text-[10px] text-green-800 font-mono">{new Date(scan.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-bold text-xs">{scan.toolName}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-xs">
                          {scan.status === 'completed' && <CheckCircle size={12} className="text-green-500" />}
                          {scan.status === 'failed' && <XCircle size={12} className="text-red-500" />}
                          {scan.status === 'running' && <Loader2 className="animate-spin text-yellow-500" size={12} />}
                          <span className="capitalize text-[10px] tracking-widest">{scan.status}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => setViewingScan(scan)}
                          className="text-green-700 hover:text-green-400 p-1 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button className="text-red-900 hover:text-red-500 p-1 ml-2 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {viewingScan && (
            <div className="h-1/2 border-t border-green-900 bg-black/60 p-4 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-green-700 uppercase">Output Stream: {viewingScan.toolName}</span>
                <button onClick={() => setViewingScan(null)} className="text-green-900 hover:text-green-500 text-xs">Close</button>
              </div>
              <div className="flex-1 overflow-y-auto bg-black p-4 rounded border border-green-900/30 font-mono text-[10px] text-green-400 leading-relaxed custom-scrollbar">
                {viewingScan.output || "No output captured yet. If process is still running, data will stream here shortly."}
              </div>
            </div>
          )}
        </div>
      </div>
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

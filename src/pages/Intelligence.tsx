import { useState, useEffect } from "react";
import { Bug, Download, ChevronDown, FileCheck, Trash2, Bot, ShieldCheck, Activity, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Intelligence({ hideHeader = false }: { hideHeader?: boolean }) {
  const [findings, setFindings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'findings' | 'logs' | 'reports'>('findings');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchData = async () => {
    try {
      const fResp = await fetch("/api/findings");
      if (fResp.ok) {
        const fData = await fResp.json();
        setFindings(Array.isArray(fData) ? fData : []);
      }

      const rResp = await fetch("/api/agent/runs");
      if (rResp.ok) {
        const rData = await rResp.json();
        setReports(Array.isArray(rData) ? rData.filter((r: any) => r.status === 'done' || r.summary) : []);
      }

      const lResp = await fetch("/api/logs");
      if (lResp.ok) {
        const lData = await lResp.json();
        setLogs(Array.isArray(lData) ? lData : []);
      }
    } catch (e) {
      console.error("Intelligence fetch error", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'crit': return 'bg-red-600 text-white border-red-400';
      case 'high': return 'bg-red-900/50 text-red-100 border-red-900';
      case 'med': return 'bg-yellow-900/50 text-yellow-100 border-yellow-900';
      case 'low': return 'bg-green-900/50 text-green-100 border-green-900';
      default: return 'bg-blue-900/50 text-blue-100 border-blue-900';
    }
  };

  const deleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this report? This action is restricted to the Security Operator.")) return;
    await fetch(`/api/agent/runs/${id}`, { method: 'DELETE' });
    fetchData();
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-green-900 pb-4 shrink-0 gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="text-purple-400" /> Intelligence
            </h2>
            
            <div className="flex bg-black/40 border border-green-900/30 rounded p-1">
              <button 
                onClick={() => setActiveTab('findings')}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all rounded uppercase tracking-tighter ${activeTab === 'findings' ? 'bg-green-600/20 text-green-400' : 'text-green-900 hover:text-green-700'}`}
              >
                VULNS ({findings.length})
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all rounded uppercase tracking-tighter ${activeTab === 'logs' ? 'bg-yellow-600/20 text-yellow-500' : 'text-green-900 hover:text-green-700'}`}
              >
                AUDIT ({logs.length})
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all rounded uppercase tracking-tighter ${activeTab === 'reports' ? 'bg-blue-600/20 text-blue-400' : 'text-green-900 hover:text-green-700'}`}
              >
                REPORTS ({reports.length})
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="bg-green-900/20 border border-green-900/50 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded flex items-center gap-1 hover:bg-green-900/40 text-green-500 transition-all">
              <Download size={14} /> Intelligence Export
            </button>
          </div>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-between items-center shrink-0 mb-2">
           <div className="flex bg-black/40 border border-green-900/30 rounded p-1">
              <button 
                onClick={() => setActiveTab('findings')}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all rounded uppercase tracking-tighter ${activeTab === 'findings' ? 'bg-green-600/20 text-green-400' : 'text-green-900 hover:text-green-700'}`}
              >
                VULNS ({findings.length})
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all rounded uppercase tracking-tighter ${activeTab === 'logs' ? 'bg-yellow-600/20 text-yellow-500' : 'text-green-900 hover:text-green-700'}`}
              >
                AUDIT ({logs.length})
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all rounded uppercase tracking-tighter ${activeTab === 'reports' ? 'bg-blue-600/20 text-blue-400' : 'text-green-900 hover:text-green-700'}`}
              >
                REPORTS ({reports.length})
              </button>
            </div>
            <div className="text-[10px] text-purple-700 italic uppercase tracking-widest">Packet Stream: {activeTab}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Tab-specific List View */}
        <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {activeTab === 'findings' && (
            findings.length === 0 ? (
              <div className="border border-green-900/30 rounded p-12 text-center text-green-900 italic bg-black/20 uppercase text-[10px] tracking-widest">
                "Silence is the residue of fear. No findings detected."
              </div>
            ) : (
              findings.map(finding => (
                <div 
                  key={finding.id} 
                  onClick={() => setSelectedItem(finding)}
                  className={`border transition-all cursor-pointer rounded overflow-hidden ${selectedItem?.id === finding.id ? 'border-green-400 bg-green-900/10' : 'border-green-900 bg-black/40 hover:bg-green-900/5'}`}
                >
                  <div className="p-3 flex items-center gap-4">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-green-100 truncate text-sm">{finding.title}</h3>
                      <p className="text-[10px] text-green-700 uppercase tracking-widest">{finding.affectedService || 'Unknown System'}</p>
                    </div>
                    <ChevronDown size={14} className={`text-green-900 transition-transform ${selectedItem?.id === finding.id ? 'rotate-180 text-green-400' : ''}`} />
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'logs' && (
            <div className="bg-black/40 border border-green-900/30 rounded flex flex-col h-full">
              <div className="p-3 border-b border-green-900/30 bg-green-900/10 text-[10px] uppercase font-bold text-yellow-600 flex justify-between">
                <span>SECURITY AUDIT STREAM</span>
                <span className="flex items-center gap-2"><Activity size={10} className="animate-pulse" /> LIVE</span>
              </div>
              <div className="p-4 space-y-1 font-mono text-[10px]">
                {logs.length === 0 ? (
                  <div className="text-green-900 text-center py-10 italic">No records in the audit buffer.</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-4 group p-1 hover:bg-green-900/10 border-b border-green-900/10 last:border-0">
                      <span className="text-green-800 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-yellow-600 shrink-0 font-bold">[{log.action}]</span>
                      <span className="text-green-400 truncate">{log.details}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            reports.length === 0 ? (
              <div className="border border-green-900/30 rounded p-12 text-center text-green-900 italic bg-black/20 uppercase text-[10px] tracking-widest">
                "Target history is clean. No reports archived."
              </div>
            ) : (
              reports.map(report => (
                <div 
                  key={report.id} 
                  onClick={() => setSelectedItem(report)}
                  className={`border transition-all cursor-pointer rounded overflow-hidden ${selectedItem?.id === report.id ? 'border-blue-400 bg-blue-900/10' : 'border-green-900 bg-black/40 hover:bg-green-900/5'}`}
                >
                  <div className="p-3 flex items-center gap-4">
                    <div className="bg-blue-900/20 p-2 rounded">
                      {report.agent_type === 'researcher' ? <Bot size={16} className="text-blue-400" /> : <ShieldCheck size={16} className="text-green-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-100 truncate text-sm line-clamp-1">{report.goal}</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {new Date(report.started_at).toLocaleString()} • {report.iteration_count} ITERATIONS
                      </p>
                    </div>
                    <button 
                      onClick={(e) => deleteReport(report.id, e)}
                      className="p-2 text-gray-800 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Detail View Container */}
        <div className="border border-green-900/30 bg-black/60 rounded p-6 overflow-y-auto custom-scrollbar flex flex-col border-t-4 border-t-purple-900">
          {activeTab === 'logs' ? (
             <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-40">
                <ShieldCheck size={80} className="text-yellow-600" />
                <div className="text-center">
                    <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-[0.3em] mb-2">Immutable Audit Subsystem</h3>
                    <p className="text-[10px] text-green-800 uppercase italic">Detailed logs are viewed in the tactical stream on the left.</p>
                </div>
             </div>
          ) : selectedItem ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-green-900/30 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-green-100 leading-tight">
                    {selectedItem.title || "Field Report Summary"}
                  </h3>
                  {selectedItem.severity && (
                    <span className={`text-[9px] uppercase font-bold px-3 py-1 rounded border shadow-lg ${getSeverityColor(selectedItem.severity)}`}>
                      {selectedItem.severity} RISK
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-400 font-mono uppercase tracking-widest">
                  {selectedItem.affectedService || `SOURCE ID: ${selectedItem.id}`}
                </p>
              </div>

              <div className="prose prose-invert prose-green max-w-none">
                {(selectedItem.summary || selectedItem.description) ? (
                  <div className="markdown-body text-green-400/90 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                    <ReactMarkdown>{selectedItem.summary || selectedItem.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-green-900 italic text-[10px] uppercase">No intelligence packet attached to this record.</p>
                )}
              </div>

              {selectedItem.remediation && (
                <div className="bg-green-900/10 border border-green-500/20 p-4 rounded mt-8 border-l-4 border-l-green-500">
                  <h4 className="text-[10px] font-bold uppercase text-green-500 mb-2 flex items-center gap-2">
                    <ShieldCheck size={12} /> Mitigation Protocol
                  </h4>
                  <p className="text-xs text-green-400 leading-relaxed italic">{selectedItem.remediation}</p>
                </div>
              )}
              
              {selectedItem.status === 'done' && (
                <div className="bg-blue-900/10 border border-blue-900/20 p-4 rounded mt-8 text-[10px]">
                  <h4 className="font-bold uppercase text-blue-400 mb-3 border-b border-blue-900/30 pb-1">SIGINT Telemetry</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-gray-500 uppercase font-mono">
                    <div className="flex justify-between"><span>Initiated:</span> <span className="text-gray-300">{new Date(selectedItem.started_at).toLocaleTimeString()}</span></div>
                    <div className="flex justify-between"><span>Model:</span> <span className="text-gray-300">{selectedItem.model}</span></div>
                    <div className="flex justify-between"><span>Completed:</span> <span className="text-gray-300">{new Date(selectedItem.ended_at).toLocaleTimeString()}</span></div>
                    <div className="flex justify-between"><span>Complexity:</span> <span className="text-gray-300">{selectedItem.iteration_count} Cycles</span></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-green-900 space-y-4">
              <FileCheck size={48} className="opacity-10" />
              <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-20 italic">
                Awaiting Data Selection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

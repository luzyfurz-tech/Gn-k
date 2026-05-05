import { useState, useEffect } from "react";
import { Activity, Clock, Shield } from "lucide-react";

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/logs").then(res => res.json()).then(setLogs);
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-green-500" /> Operational Audit
        </h2>
        <div className="text-[10px] text-green-700 italic">"Persistent trail of all shell executions, agent turns, and scans."</div>
      </div>

      <div className="flex-1 border border-green-900 rounded overflow-hidden flex flex-col">
        <div className="bg-green-900/20 p-2 text-[10px] uppercase font-bold text-green-700 flex justify-between">
          <span>Action Log</span>
          <span>Retention: 30 Days</span>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-2 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-green-900 text-center py-20 italic">No audit records found. Execute actions to populate logs.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-4 group p-1 hover:bg-green-900/5 transition-colors">
                <span className="text-green-800 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="text-green-300 shrink-0 font-bold uppercase tracking-tighter">[{log.action}]</span>
                <span className="text-green-600 truncate">{log.details}</span>
              </div>
            ))
          )}
          
          {/* Simulated demo logs for immediate visual feedback */}
          {logs.length === 0 && Array.from({ length: 15 }).map((_, i) => (
             <div key={i} className="flex gap-4 opacity-10 blur-[1px]">
               <span className="text-green-800 shrink-0">[{new Date(Date.now() - i * 60000).toLocaleTimeString()}]</span>
               <span className="text-green-300 shrink-0 font-bold uppercase tracking-tighter">[SYSLOG]</span>
               <span className="text-green-600">Encrypted heartbeat sequence #0x{i.toString(16)}... OK</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

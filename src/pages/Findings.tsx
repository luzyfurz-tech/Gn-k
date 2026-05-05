import { useState, useEffect } from "react";
import { Bug, Filter, Download, ExternalLink, ChevronDown } from "lucide-react";

export default function Findings() {
  const [findings, setFindings] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/findings")
      .then(res => res.json())
      .then(setFindings);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bug className="text-red-500" /> Vulnerability Findings
        </h2>
        <div className="flex gap-2">
          <button className="border border-green-900 px-3 py-1 text-xs rounded flex items-center gap-1 hover:bg-green-900/20">
            <Filter size={14} /> Filter
          </button>
          <button className="bg-green-900 px-3 py-1 text-xs rounded flex items-center gap-1 hover:bg-green-800">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {findings.length === 0 ? (
          <div className="border border-green-900 rounded p-12 text-center text-green-900 italic">
            "Silence is the residue of fear. No vulnerabilities detected... yet."
          </div>
        ) : (
          findings.map(finding => (
            <div key={finding.id} className="border border-green-900 bg-black/40 rounded overflow-hidden">
              <div className="p-3 flex items-center gap-4 hover:bg-green-900/5 cursor-pointer transition-colors group">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getSeverityColor(finding.severity)}`}>
                  {finding.severity}
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-green-100">{finding.title}</h3>
                  <p className="text-xs text-green-700">{finding.affectedService}</p>
                </div>
                <button className="text-green-900 group-hover:text-green-500">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

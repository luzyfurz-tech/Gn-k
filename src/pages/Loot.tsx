import { useState, useEffect } from "react";
import { Key, Database, Copy, ExternalLink, ShieldCheck } from "lucide-react";

export default function Loot() {
  const [loot, setLoot] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/loot").then(res => res.json()).then(setLoot);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Database className="text-yellow-600" /> Captured Loot
        </h2>
        <div className="text-[10px] text-green-700 italic">"Credentials, hashes, and sensitive data recovered from targets."</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loot.length === 0 ? (
          <div className="col-span-full border border-green-900 border-dashed p-12 text-center text-green-900 italic">
             No assets recovered yet. Deploy agent or run exploitation scripts.
          </div>
        ) : (
          loot.map(item => (
            <div key={item.id} className="border border-green-900 bg-black/40 rounded p-4 relative group hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-900/20 rounded">
                    <Key size={14} className="text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-green-100">{item.type}</h3>
                    <p className="text-[10px] text-green-700">{item.service || "Unspecified Service"}</p>
                  </div>
                </div>
                <span className="text-[10px] text-green-900">{new Date(item.captured_at).toLocaleDateString()}</span>
              </div>
              
              <div className="bg-black border border-green-900/50 p-2 rounded text-xs font-mono text-green-400 break-all relative">
                {item.data}
                <button 
                  onClick={() => copyToClipboard(item.data)}
                  className="absolute right-1 top-1 p-1 bg-black text-green-700 hover:text-green-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy size={12} />
                </button>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-1 text-[10px] text-green-800">
                  <ShieldCheck size={10} /> Verified
                </div>
                <button className="text-[10px] uppercase font-bold text-green-700 hover:text-green-500 flex items-center gap-1">
                  View Source <ExternalLink size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

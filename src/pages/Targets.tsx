import React, { useState, useEffect } from "react";
import { Plus, Target, Tag, Trash2, FileJson, FileSpreadsheet } from "lucide-react";

export default function Targets() {
  const [targets, setTargets] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTarget, setNewTarget] = useState({ hostname: "", ipRange: "", scopeNotes: "", tags: "" });

  const fetchTargets = () => {
    fetch("/api/targets")
      .then(res => res.json())
      .then(setTargets);
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Target /> Engagement Targets
        </h2>
        <div className="flex gap-2">
          <button className="border border-green-900 px-3 py-1 text-xs rounded flex items-center gap-1 hover:bg-green-900/20">
            <FileJson size={14} /> Export JSON
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-green-900 px-3 py-1 text-xs rounded flex items-center gap-1 hover:bg-green-800"
          >
            <Plus size={14} /> Add Target
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="border border-green-900 p-4 rounded bg-green-900/10 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-green-700">Hostname / Label</label>
              <input 
                required
                value={newTarget.hostname}
                onChange={e => setNewTarget({...newTarget, hostname: e.target.value})}
                className="w-full bg-black border border-green-900 p-2 rounded text-sm focus:outline-none focus:border-green-500" 
                placeholder="e.g. prod-api-01"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-green-700">IP Range / CIDR</label>
              <input 
                required
                value={newTarget.ipRange}
                onChange={e => setNewTarget({...newTarget, ipRange: e.target.value})}
                className="w-full bg-black border border-green-900 p-2 rounded text-sm focus:outline-none focus:border-green-500"
                placeholder="e.g. 192.168.1.0/24"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-green-700">Scope Notes</label>
            <textarea 
              value={newTarget.scopeNotes}
              onChange={e => setNewTarget({...newTarget, scopeNotes: e.target.value})}
              className="w-full bg-black border border-green-900 p-2 rounded text-sm focus:outline-none focus:border-green-500 h-20"
              placeholder="Out of scope: ... Social engineering allowed: ..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1 text-xs text-green-700">Cancel</button>
            <button type="submit" className="bg-green-900 px-4 py-1 text-xs rounded">Save Target</button>
          </div>
        </form>
      )}

      <div className="border border-green-900 rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-green-900/30 text-green-700 text-xs uppercase">
            <tr>
              <th className="p-3">Hostname</th>
              <th className="p-3">IP Range</th>
              <th className="p-3">Tags</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-900/50">
            {targets.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-green-900">No targets defined.</td>
              </tr>
            ) : (
              targets.map(target => (
                <tr key={target.id} className="hover:bg-green-900/10">
                  <td className="p-3 font-bold">{target.hostname}</td>
                  <td className="p-3 text-green-300 font-mono">{target.ipRange}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {target.tags?.split(",").map((tag: string) => (
                        <span key={tag} className="text-[10px] border border-green-900 px-1 rounded flex items-center gap-1">
                          <Tag size={8} /> {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button className="text-red-900 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { StickyNote, Save, Trash2, Clock, Check } from "lucide-react";

export default function Scratchpad() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/notes").then(res => res.json()).then(data => {
      setContent(data.content);
      if (data.updated_at) setLastSaved(new Date(data.updated_at));
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    setIsSaving(false);
    setLastSaved(new Date());
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <StickyNote className="text-orange-500" /> Operator Scratchpad
        </h2>
        <div className="flex items-center gap-4">
           {lastSaved && (
             <span className="text-[10px] text-green-950 italic flex items-center gap-1">
               <Check size={10} /> Auto-saved: {lastSaved.toLocaleTimeString()}
             </span>
           )}
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="bg-green-900 hover:bg-green-800 text-green-100 px-3 py-1 rounded text-xs flex items-center gap-2 transition-all disabled:opacity-50"
           >
             <Save size={14} /> {isSaving ? "Syncing..." : "Save Notes"}
           </button>
        </div>
      </div>

      <div className="flex-1 relative border border-green-900 rounded-lg p-1 bg-black/20 group">
        <textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full h-full bg-black/40 p-4 border-none focus:ring-0 outline-none resize-none font-mono text-sm text-green-400 placeholder:text-green-900"
          placeholder="# OPERATOR NOTES&#10;&#10;Found interesting endpoint at /v2/internal...&#10;Default credentials worked for SSH on 10.0.8.2...&#10;Potential buffer overflow in service running on port 9000..."
        />
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Clock size={48} className="text-green-950" />
        </div>
      </div>
    </div>
  );
}

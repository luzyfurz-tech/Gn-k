import { useState, useEffect } from "react";
import { Wrench, Download, ShieldCheck, ShieldAlert, Play, Terminal } from "lucide-react";

export default function Tools() {
  const [tools, setTools] = useState<any[]>([]);

  const fetchTools = () => fetch("/api/tools").then(res => res.json()).then(setTools);

  useEffect(() => {
    fetchTools();
  }, []);

  const installTool = async (name: string) => {
    await fetch("/api/findings", { // Re-using findings or creating a generic log
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ title: `Tool Installation`, description: `User triggered install of ${name}`, service: "TOOL_MGR" })
    });
    // In a real app we'd have /api/tools/install
    // For demo, we just refresh or handle locally
    alert(`Initializing ${name}... System is downloading binaries.`);
  };

  const handleRun = async (tool: string) => {
    const args = prompt(`Execute ${tool} with arguments:`, "-h");
    if (args === null) return;

    const apiKey = localStorage.getItem("ollama_api_key");
    const goal = `RUN_TOOL: ${tool} ${args}. Output result to a scan record.`;

    try {
      await fetch("/api/agent/run", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ goal, model: "manual-tool-call" })
      });
      alert(`Instruction sent to Agent. Tracking process in Scans tab.`);
    } catch (err) {
      alert("Failed to reach agent supervisor.");
    }
  };

  const groupedTools = tools.reduce((acc: any, tool: any) => {
    const cat = tool.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-center border-b border-green-900 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wrench className="text-green-400" /> Security Toolbag
        </h2>
        <div className="text-[10px] text-green-700 italic">"Full modular arsenal available for deployment."</div>
      </div>

      {Object.entries(groupedTools).map(([category, catTools]: [string, any]) => (
        <section key={category} className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-800 border-l-2 border-green-900 pl-3">
            {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {catTools.map((tool: any) => (
              <div key={tool.name} className={`border border-green-900 rounded p-4 bg-black/40 flex flex-col justify-between space-y-4 hover:border-green-500 transition-colors group ${tool.installed ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'opacity-60'}`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-green-100">{tool.name}</h3>
                      <p className="text-[10px] text-green-700 font-mono tracking-widest uppercase">{tool.installed ? 'Operational' : 'Available'}</p>
                    </div>
                    {tool.installed ? (
                      <ShieldCheck className="text-green-500" size={20} />
                    ) : (
                      <ShieldAlert className="text-green-900" size={20} />
                    )}
                  </div>
                  <p className="text-[10px] text-green-800 line-clamp-2 leading-relaxed h-8">
                    {tool.description || "No documentation available for this module."}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  {tool.installed ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRun(tool.name)}
                        className="flex-1 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-900 text-blue-100 text-[10px] uppercase font-bold py-1.5 rounded flex items-center justify-center gap-2 transition-all"
                      >
                        <Play size={12} fill="currentColor" /> Run
                      </button>
                      <button className="flex-1 text-[10px] uppercase font-bold text-green-700 border border-green-900 py-1.5 rounded hover:bg-green-900/20">
                        Terminal
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => installTool(tool.name)}
                      className="w-full bg-green-900 text-green-100 text-[10px] uppercase font-bold py-1.5 rounded hover:bg-green-800 flex items-center justify-center gap-2 transition-all"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

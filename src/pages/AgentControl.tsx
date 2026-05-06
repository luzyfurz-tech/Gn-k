import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, Play, Square, Loader2, ChevronRight, ChevronDown, Terminal as TerminalIcon, FileText, Bug, Search, AlertCircle, CheckCircle, X, MessageSquare, RefreshCw, Folder, AlertTriangle } from "lucide-react";
import ModelSelector from "../components/ModelSelector";

interface Step {
  id: string;
  kind: 'plan' | 'tool_call' | 'tool_result' | 'ask' | 'done' | 'error' | 'thought' | 'user';
  payload: any;
  created_at: number;
}

// Global state to survive tab unmounts
let globalSteps: Step[] = [];
let globalIsRunning = false;
let globalGoal = "";
let listeners: (() => void)[] = [];

let globalAgentType: 'operator' | 'researcher' = 'operator';

const notify = () => listeners.forEach(l => l());

const addStep = (stepOrUpdater: Step | ((prev: Step[]) => Step[])) => {
  if (typeof stepOrUpdater === 'function') {
    globalSteps = stepOrUpdater(globalSteps);
  } else {
    globalSteps = [...globalSteps, stepOrUpdater];
  }
  notify();
};

const setIsRunning = (val: boolean) => {
  globalIsRunning = val;
  notify();
};

const setGoal = (val: string) => {
  globalGoal = val;
  notify();
};

const performRun = async (targetGoal: string, modelToUse: string, elevated: boolean, agentType: 'operator' | 'researcher', history?: any[]) => {
  setIsRunning(true);
  
  if (!history || history.length === 0) {
    globalSteps = [];
    addStep({
      id: Math.random().toString(36),
      kind: 'user',
      payload: { text: targetGoal, agentType },
      created_at: Date.now()
    });
  } else {
    addStep({
      id: Math.random().toString(36),
      kind: 'user',
      payload: { text: targetGoal, agentType },
      created_at: Date.now()
    });
  }
  
  notify();
  
  const apiKey = localStorage.getItem("ollama_api_key");
  const host = localStorage.getItem("ollama_host") || "https://ollama.com";
  const provider = localStorage.getItem("ai_provider") || "ollama";

  try {
    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-ollama-host": host,
        "x-ai-provider": provider
      },
      body: JSON.stringify({ 
        goal: targetGoal, 
        model: modelToUse, 
        elevated,
        agentType,
        history: history ? [...history, { role: "user", content: targetGoal }] : undefined
      })
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
    if (!reader) throw new Error("No reader");

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
            addStep({
              id: Math.random().toString(36),
              kind: event.type,
              payload: event.data,
              created_at: Date.now()
            });
            if (event.type === 'done' || event.type === 'error') {
              setIsRunning(false);
            }
          } catch (e) { console.error("Parse error", e); }
        }
      }
    }
  } catch (err) {
      addStep({
          id: Math.random().toString(36),
          kind: 'error',
          payload: { message: err instanceof Error ? err.message : "Connection failed" },
          created_at: Date.now()
      });
      setIsRunning(false);
  }
};

export default function AgentControl() {
  const [activeTab, setActiveTab] = useState<'agent' | 'collab'>('agent');
  const [agentType, setAgentTypeInternal] = useState<'operator' | 'researcher'>(globalAgentType);
  const [, forceRender] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const steps = globalSteps;
  const isRunning = globalIsRunning;
  const goal = globalGoal;

  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("agent_model") || "");

  // Collaboration State
  const [queue, setQueue] = useState<string[]>([]);
  const [findings, setFindings] = useState<string[]>([]);
  const [selectedCollabFile, setSelectedCollabFile] = useState<{ path: string, content: string } | null>(null);
  const [collabLoading, setCollabLoading] = useState(false);

  useEffect(() => {
    const l = () => forceRender(n => n + 1);
    listeners.push(l);
    return () => { listeners = listeners.filter(x => x !== l); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, activeTab]);

  const fetchCollabFiles = async () => {
    setCollabLoading(true);
    try {
      const qResp = await fetch("/api/terminal/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "ls /tmp/collab/queue" })
      });
      if (qResp.ok) {
        const qData = await qResp.json();
        setQueue((qData.output || "").split("\n").filter(Boolean));
      }

      const fResp = await fetch("/api/terminal/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "ls /tmp/collab/findings" })
      });
      if (fResp.ok) {
        const fData = await fResp.json();
        setFindings((fData.output || "").split("\n").filter(Boolean));
      }
    } catch (e) {
      console.error(e);
    }
    setCollabLoading(false);
  };

  const readCollabFile = async (path: string) => {
    try {
      const resp = await fetch("/api/terminal/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `cat ${path}` })
      });
      if (resp.ok) {
        const data = await resp.json();
        setSelectedCollabFile({ path, content: data.output });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'collab') fetchCollabFiles();
  }, [activeTab]);

  const startRun = async () => {
    if (!goal) return;
    const modelToUse = selectedModel || localStorage.getItem("agent_model") || "llama3";
    const elevated = localStorage.getItem("ai_elevated") === "true";
    
    const history = globalSteps.map(s => {
      if (s.kind === 'user') return { role: 'user', content: s.payload.text };
      if (s.kind === 'thought') return { role: 'assistant', content: s.payload.text };
      if (s.kind === 'plan') return { role: 'assistant', content: `<plan>${s.payload.text}</plan>` };
      if (s.kind === 'tool_call') return { role: 'assistant', content: `<tool_call>${JSON.stringify(s.payload)}</tool_call>` };
      if (s.kind === 'tool_result') return { role: 'user', content: `Tool result: ${JSON.stringify(s.payload)}` };
      if (s.kind === 'done') return { role: 'assistant', content: `<done>${s.payload.summary}</done>` };
      if (s.kind === 'ask') return { role: 'assistant', content: `<ask>${s.payload.text}</ask>` };
      return null;
    }).filter(Boolean);

    const targetGoal = goal;
    setGoal(""); 
    performRun(targetGoal, modelToUse, elevated, agentType, history.length > 0 ? history : undefined);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-green-900 pb-4 gap-4 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="text-green-400" /> Agent Control
          </h2>
          <div className="flex bg-black border border-green-900 rounded p-0.5">
            <button 
              onClick={() => setActiveTab('agent')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'agent' ? 'bg-green-600/20 text-green-400' : 'text-green-900 hover:text-green-700'}`}
            >
              <TerminalIcon size={12} /> DEPLOYMENT
            </button>
            <button 
              onClick={() => setActiveTab('collab')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded flex items-center gap-2 transition-all ${activeTab === 'collab' ? 'bg-purple-600/20 text-purple-400' : 'text-green-900 hover:text-green-700'}`}
            >
              <RefreshCw size={12} className={collabLoading ? "animate-spin" : ""} /> COLLABORATION
            </button>
          </div>
        </div>

        {activeTab === 'agent' && (
          <div className="flex items-center gap-4">
            <div className="flex p-0.5 bg-black/40 border border-green-900/30 rounded">
              <button
                onClick={() => { globalAgentType = 'operator'; setAgentTypeInternal('operator'); notify(); }}
                className={`px-3 py-1 text-[9px] uppercase font-bold rounded transition-colors ${agentType === 'operator' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-green-900'}`}
              >
                OPERATOR
              </button>
              <button
                onClick={() => { globalAgentType = 'researcher'; setAgentTypeInternal('researcher'); notify(); }}
                className={`px-3 py-1 text-[9px] uppercase font-bold rounded transition-colors ${agentType === 'researcher' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-green-900'}`}
              >
                RESEARCHER
              </button>
            </div>
            <div className="w-48">
              <ModelSelector type="agent" onSelect={setSelectedModel} />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'agent' ? (
          <div className="flex flex-col h-full space-y-4">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
              {steps.length === 0 && !isRunning && (
                <div className="h-full flex flex-col items-center justify-center text-green-900/40 space-y-4 opacity-50">
                  <Bot size={80} className="animate-pulse" />
                  <p className="max-w-md text-center italic text-[11px] uppercase tracking-widest leading-relaxed">
                    "Standing by for mission parameters. Deploy {agentType} to initiate autonomous execution loop."
                  </p>
                </div>
              )}
              {steps.map((step, idx) => (
                <StepItem key={step.id} step={step} isLast={idx === steps.length - 1} />
              ))}
              {isRunning && (
                <div className="flex items-center gap-3 text-xs text-blue-500 animate-pulse font-mono font-bold tracking-tighter">
                   <Loader2 size={14} className="animate-spin" /> AGENT IS PROCESSING TELEMETRY...
                </div>
              )}
            </div>

            <div className="bg-black/80 border border-green-900/50 p-4 rounded-xl shadow-2xl shrink-0 backdrop-blur-md">
              <div className="flex gap-4">
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && startRun()}
                  placeholder={agentType === 'operator' ? "E.g. 'Gain root access on 10.0.1.5'..." : "E.g. 'Analyze the binary at /usr/bin/target'..."}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-green-100 placeholder:text-green-900/40 h-20 resize-none outline-none font-mono text-sm"
                  disabled={isRunning}
                />
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={isRunning ? undefined : startRun}
                    className={`p-4 rounded-full ${isRunning ? 'bg-green-900/20 text-green-900' : 'bg-green-500 text-black hover:bg-green-400'} transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]`}
                  >
                    {isRunning ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                  </button>
                  {isRunning && (
                    <button className="p-2 border border-red-900/50 text-red-500 rounded hover:bg-red-900/20 transition-all">
                      <Square size={16} fill="currentColor" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
               <div className="border border-green-900/30 rounded bg-black/40 p-5 flex flex-col border-t-4 border-t-blue-900 shadow-xl">
                 <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-3">
                   <Send size={16} /> Analysis Pipeline Queue
                 </h3>
                 <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                   {queue.map(f => (
                     <button
                       key={f}
                       onClick={() => readCollabFile(`/tmp/collab/queue/${f}`)}
                       className="w-full text-left p-3 text-xs font-mono border border-green-900/10 rounded-lg hover:bg-blue-900/20 text-gray-400 hover:text-blue-300 transition-all flex items-center gap-3 group"
                     >
                       <FileText size={16} className="group-hover:text-blue-400" /> {f}
                     </button>
                   ))}
                   {queue.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-2">
                        <Folder size={40} />
                        <p className="text-[10px] uppercase tracking-widest">Wait-state: Queue empty</p>
                     </div>
                   )}
                 </div>
               </div>

               <div className="border border-green-900/30 rounded bg-black/40 p-5 flex flex-col border-t-4 border-t-green-900 shadow-xl">
                 <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-green-500 mb-6 flex items-center gap-3">
                   <Search size={16} /> Joint Intelligence Reports
                 </h3>
                 <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                   {findings.map(f => (
                     <button
                       key={f}
                       onClick={() => readCollabFile(`/tmp/collab/findings/${f}`)}
                       className="w-full text-left p-3 text-xs font-mono border border-green-900/10 rounded-lg hover:bg-green-900/20 text-gray-400 hover:text-green-300 transition-all flex items-center gap-3 group"
                     >
                       <AlertTriangle size={16} className="text-yellow-600 group-hover:text-yellow-400" /> {f}
                     </button>
                   ))}
                   {findings.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-2">
                         <Bot size={40} />
                         <p className="text-[10px] uppercase tracking-widest">No intelligence synthesized</p>
                      </div>
                   )}
                 </div>
               </div>
            </div>

            {selectedCollabFile && (
              <div className="border border-green-900/50 rounded-xl bg-black p-5 h-80 flex flex-col shadow-2xl border-l-4 border-l-purple-500 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">{selectedCollabFile.path}</span>
                  </div>
                  <button onClick={() => setSelectedCollabFile(null)} className="text-green-900 hover:text-red-500 p-1">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto text-xs font-mono p-4 bg-purple-900/5 rounded border border-purple-900/20 text-green-400 custom-scrollbar whitespace-pre-wrap leading-relaxed shadow-inner">
                  {selectedCollabFile.content}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const StepItem: React.FC<{ step: Step, isLast: boolean }> = ({ step, isLast }) => {
  const [isOpen, setIsOpen] = useState(step.kind !== 'thought' && step.kind !== 'plan');

  const getIcon = () => {
    switch (step.kind) {
      case 'plan': return <Search size={16} className="text-blue-400" />;
      case 'thought': return <MessageSquare size={16} className="text-gray-500" />;
      case 'tool_call': return <TerminalIcon size={16} className="text-yellow-400" />;
      case 'tool_result': return <FileText size={16} className="text-green-600" />;
      case 'done': return <CheckCircle size={16} className="text-green-500" />;
      case 'ask': return <Bot size={16} className="text-purple-400" />;
      case 'user': return <Send size={16} className="text-blue-400" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      default: return <ChevronRight size={16} />;
    }
  };

  const getLabel = () => {
    switch (step.kind) {
      case 'plan': return 'Tactical Plan';
      case 'thought': return 'Reasoning Buffer';
      case 'tool_call': return `Executing vector: ${step.payload.tool}`;
      case 'tool_result': return 'IO Telemetry';
      case 'done': return 'MISSION ACCOMPLISHED';
      case 'ask': return 'HUMAN INTERVENTION REQUIRED';
      case 'user': return 'Direct Command';
      case 'error': return 'FATAL SYSTEM FAULT';
      default: return step.kind;
    }
  };

  return (
    <div className={`border-l-2 ${isLast && step.kind !== 'done' ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-green-900'} ml-2 pl-6 pb-4 relative`}>
      <div className="absolute -left-[9px] top-0 bg-black p-0.5">
        <div className={`w-4 h-4 rounded-full border-2 ${isLast ? 'border-green-500 bg-green-500/20 animate-pulse' : 'border-green-900'} flex items-center justify-center`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isLast ? 'bg-green-500' : 'bg-green-900'}`} />
        </div>
      </div>
      
      <div className="bg-black/60 border border-green-900/30 rounded-lg overflow-hidden group hover:border-green-800 transition-colors shadow-sm">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-green-900/10 text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 group-hover:text-green-400 transition-all"
        >
          <div className="flex items-center gap-3">
            {getIcon()}
            {getLabel()}
          </div>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        {isOpen && (
          <div className="p-4 border-t border-green-900/30 text-xs whitespace-pre-wrap font-mono leading-relaxed">
            {step.kind === 'plan' && <p className="text-blue-300 italic">{step.payload.text}</p>}
            {step.kind === 'thought' && <p className="text-gray-500 italic opacity-70">{step.payload.text}</p>}
            {step.kind === 'user' && <p className="text-blue-400 font-bold border-l-2 border-blue-900 pl-4 py-1">{step.payload.text}</p>}
            {step.kind === 'tool_call' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-600 font-bold">
                    <ChevronRight size={14} /> EXECUTING SUB-PROCESS...
                </div>
                <div className="bg-black/50 p-2 rounded border border-yellow-900/20 text-yellow-100 italic">
                    {step.payload.command || step.payload.tool_name || JSON.stringify(step.payload)}
                </div>
              </div>
            )}
            {step.kind === 'tool_result' && (
              <div className="space-y-3">
                <div className="text-[9px] text-green-900 font-sans flex justify-between uppercase font-bold tracking-widest">
                  <span>Exit: {step.payload.exitCode}</span>
                  <span>Latency: {step.payload.durationMs || '0'}ms</span>
                </div>
                <div className="bg-black p-3 rounded border border-green-900/30 text-[11px] text-green-400 max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner leading-normal">
                  {step.payload.stdout || step.payload.stderr || step.payload.content || JSON.stringify(step.payload.data || step.payload)}
                </div>
              </div>
            )}
            {step.kind === 'done' && (
                <div className="bg-green-900/10 border border-green-500/30 p-4 rounded-lg flex flex-col gap-4 border-l-4 border-l-green-500">
                    <div className="flex items-center gap-2 text-green-500 font-bold uppercase tracking-widest italic">
                        <CheckCircle size={18} /> Objective Finalized
                    </div>
                    <div className="text-green-300 italic text-sm leading-relaxed">{step.payload.summary}</div>
                </div>
            )}
            {step.kind === 'error' && (
              <div className="text-red-400 p-4 bg-red-900/10 rounded border border-red-900/30 flex flex-col gap-3 border-l-4 border-l-red-600">
                <div className="font-bold flex items-center gap-2 uppercase tracking-widest text-sm">
                  <AlertCircle size={18} /> System Level Interrupt
                </div>
                <div className="text-xs opacity-80 break-words font-mono italic">
                  {step.payload.message || "Unknown cryptographic or runtime fault encountered."}
                </div>
              </div>
            )}
            {step.kind === 'ask' && (
              <div className="space-y-4 border-l-4 border-l-purple-600 pl-4 py-2 bg-purple-900/5">
                <div className="text-purple-400 font-bold italic flex items-center gap-2">
                    <Bot size={16} /> AGENT QUERY...
                </div>
                <p className="text-purple-300">{step.payload.text}</p>
                <div className="flex gap-2 border-t border-purple-900/20 pt-4">
                  <input className="flex-1 bg-black border border-purple-900/50 rounded p-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none text-purple-100" placeholder="Awaiting operator response..." />
                  <button className="bg-purple-900/40 text-purple-300 border border-purple-600 px-4 py-1.5 rounded text-xs hover:bg-purple-800 transition-all font-bold uppercase">Dispatch</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

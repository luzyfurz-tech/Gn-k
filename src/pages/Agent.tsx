import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, Play, Square, Loader2, ChevronRight, ChevronDown, Terminal as TerminalIcon, FileText, Bug, Search } from "lucide-react";
import ModelSelector from "../components/ModelSelector";

interface Step {
  id: string;
  kind: 'plan' | 'tool_call' | 'tool_result' | 'ask' | 'done' | 'error';
  payload: any;
  created_at: number;
}

export default function Agent() {
  const [goal, setGoal] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("agent_model") || "");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const startRun = async () => {
    if (!goal || !selectedModel) return;
    setIsRunning(true);
    setSteps([]);
    
    const apiKey = localStorage.getItem("ollama_api_key");
    const host = localStorage.getItem("ollama_host") || "https://ollama.com";
    const elevated = localStorage.getItem("ai_elevated") === "true";

    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-ollama-host": host
      },
      body: JSON.stringify({ goal, model: selectedModel, elevated })
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.replace("data: ", ""));
            setSteps(prev => [...prev, {
              id: Math.random().toString(36),
              kind: event.type,
              payload: event.data,
              created_at: Date.now()
            }]);
            if (event.type === 'done' || event.type === 'error') setIsRunning(false);
          } catch (e) { console.error("Parse error", e); }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center gap-4 border-b border-green-900 pb-4">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Bot className="text-green-400" /> Autonomous Agent
        </div>
        <div className="w-64">
          <ModelSelector type="agent" onSelect={setSelectedModel} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
        {steps.length === 0 && !isRunning && (
          <div className="h-full flex flex-col items-center justify-center text-green-900 space-y-4">
            <Bot size={64} className="opacity-20 animate-pulse" />
            <p className="max-w-md text-center italic text-sm">
              "Deploy an agent to achieve a goal. It will plan, execute shell commands, run scans, and iterate until the job is done."
            </p>
          </div>
        )}
        {steps.map((step, idx) => (
          <StepItem key={step.id} step={step} isLast={idx === steps.length - 1} />
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-green-700 animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Agent is thinking...
          </div>
        )}
      </div>

      <div className="bg-black/60 border border-green-900 p-4 rounded-lg shadow-2xl">
        <div className="flex gap-4">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && startRun()}
            placeholder="e.g. 'Run a scan on 10.0.4.21'. Be specific to avoid unintended actions."
            className="flex-1 bg-transparent border-none focus:ring-0 text-green-100 placeholder:text-green-900 h-20 resize-none outline-none"
            disabled={isRunning}
          />
          <div className="flex flex-col gap-2">
            <button 
              onClick={isRunning ? undefined : startRun}
              className={`p-4 rounded-full ${isRunning ? 'bg-green-900/20 text-green-900' : 'bg-green-500 text-black hover:bg-green-400'} transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]`}
            >
              {isRunning ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
            </button>
            {isRunning && (
              <button className="p-2 border border-red-900 text-red-500 rounded hover:bg-red-900/20 flex items-center justify-center">
                <Square size={16} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StepItem: React.FC<{ step: Step, isLast: boolean }> = ({ step, isLast }) => {
  const [isOpen, setIsOpen] = useState(true);

  const getIcon = () => {
    switch (step.kind) {
      case 'plan': return <Search size={16} className="text-blue-400" />;
      case 'tool_call': return <TerminalIcon size={16} className="text-yellow-400" />;
      case 'tool_result': return <FileText size={16} className="text-green-600" />;
      case 'done': return <CheckCircle size={16} className="text-green-500" />;
      case 'ask': return <Bot size={16} className="text-purple-400" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      default: return <ChevronRight size={16} />;
    }
  };

  const getLabel = () => {
    switch (step.kind) {
      case 'plan': return 'Next Steps';
      case 'tool_call': return `Running tool: ${step.payload.tool}`;
      case 'tool_result': return 'Tool Output';
      case 'done': return 'Goal Achieved';
      case 'ask': return 'Operator Input Required';
      case 'error': return 'System Error';
      default: return step.kind;
    }
  };

  return (
    <div className={`border-l-2 ${isLast && step.kind !== 'done' ? 'border-green-500' : 'border-green-900'} ml-2 pl-6 pb-4 relative`}>
      <div className="absolute -left-[9px] top-0 bg-black p-0.5">
        <div className={`w-4 h-4 rounded-full border-2 ${isLast ? 'border-green-500 bg-green-500/20' : 'border-green-900'} flex items-center justify-center`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isLast ? 'bg-green-500' : 'bg-green-900'}`} />
        </div>
      </div>
      
      <div className="bg-black/40 border border-green-900/50 rounded overflow-hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-green-900/10 text-xs font-bold uppercase tracking-widest text-green-400"
        >
          <div className="flex items-center gap-2">
            {getIcon()}
            {getLabel()}
          </div>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        {isOpen && (
          <div className="p-3 border-t border-green-900/30 text-sm whitespace-pre-wrap font-mono">
            {step.kind === 'plan' && <p className="text-blue-200">{step.payload.text}</p>}
            {step.kind === 'tool_call' && (
              <div className="space-y-1">
                <p className="text-yellow-100">$ {step.payload.command || step.payload.tool_name}</p>
                <p className="text-xs text-green-900 font-sans italic">Awaiting completion...</p>
              </div>
            )}
            {step.kind === 'tool_result' && (
              <div className="space-y-2">
                <div className="text-[10px] text-green-700 font-sans flex justify-between">
                  <span>EXIT CODE: {step.payload.exitCode}</span>
                  <span>DURATION: {step.payload.durationMs}ms</span>
                </div>
                <div className="bg-black p-2 rounded border border-green-900/20 text-xs text-green-400 max-h-60 overflow-y-auto">
                  {step.payload.stdout || step.payload.stderr || "No output."}
                </div>
              </div>
            )}
            {step.kind === 'done' && <div className="text-green-300 p-2 bg-green-900/20 rounded border border-green-500/30">{step.payload.summary}</div>}
            {step.kind === 'ask' && (
              <div className="space-y-3">
                <p className="text-purple-300">{step.payload.text}</p>
                <div className="flex gap-2">
                  <input className="flex-1 bg-green-900/20 border border-green-900 rounded p-1 text-xs focus:ring-0 outline-none" placeholder="Reply to agent..." />
                  <button className="bg-green-900 px-3 py-1 rounded text-xs hover:bg-green-800">Reply</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircle({ size, className }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircle({ size, className }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

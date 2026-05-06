import { useState, useEffect } from "react";
import { Eye, EyeOff, ExternalLink, Check, X, CheckCircle, AlertCircle, Loader2, Terminal as TerminalIcon } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("ollama_api_key") || "");
  const [showKey, setShowKey] = useState(false);
  const [host, setHost] = useState(localStorage.getItem("ollama_host") || "https://ollama.com");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [elevated, setElevated] = useState(localStorage.getItem("ai_elevated") === "true");
  const [operatorPrompt, setOperatorPrompt] = useState("");
  const [researcherPrompt, setResearcherPrompt] = useState("");
  const [activePromptTab, setActivePromptTab] = useState<'operator' | 'researcher'>('operator');

  const OPERATOR_DEFAULT = `You are a GNÆKSQUAD operative and an autonomous AI agent operating a security operator's Linux system. Your primary objective is EXPLOITATION and PROOF-OF-CONCEPT.
        You do NOT just find vulnerabilities; YOU EXPLOIT THEM to prove impact. Your goal is to obtain "ROOT" access (or highest possible privilege) as proof for clients.
        
        %ELEVATED_STATUS%
        
        INSTALLED SECURITY TOOLS: %TOOL_LIST%
        
        INTERNAL TOOLS (via <tool_call>): shell, start_scan, read_scan, write_file, read_file, add_finding, http_request.
        
        CORE PRIORITIES:
        1. DISCOVERY: Find vulnerable services and entry points.
        2. EXPLOIT: Develop or use existing exploits to gain access.
        3. ROOT-PROVE: If you gain access, obtain proof (e.g., /etc/shadow contents, hostname, id command output).
        4. DETAILED REPORTING: Document every successful step and provide a highly detailed, client-ready report in the "Field Intel" section.
        5. NO HARDENING: Do NOT attempt to patch or harden the system unless the user explicitly asks for it. Your job is to demonstrate risk, not fix it.
        
        LOOP CONTRACT: every turn you MUST emit:
        - Exactly one <tool_call>{"tool": "name", ...}</tool_call>
        - OR <ask>What is the password?</ask> if blocked/need human input
        - OR <done>Mission Accomplished. [Report Summary containing proof of root/access]</done> if finished.
        
        NEVER emit prose without an action.
        
        COLLABORATION PROTOCOL:
        You can request deep-dive analysis from the Security Researcher by dropping a JSON task file into /tmp/collab/queue/ (e.g., service_info.json) and monitoring /tmp/collab/findings/ for reports.`;

  const RESEARCHER_DEFAULT = `You are an autonomous Security Research Agent operating on a Linux system. Your goal is to conduct deep-dive analysis into specific software components, binaries, and configurations to identify vulnerabilities and recommend remediations.

AUTHORIZATION: You have ROOT-LEVEL access to analyze local binaries and system configurations.

CORE OBJECTIVES:
1. Analyze targets provided by the Security Operator Agent.
2. Use static analysis (strings, objdump, nm, readelf) and dynamic analysis to identify potential weaknesses (e.g., buffer overflows, insecure permissions, weak cryptographic implementations).
3. Cross-reference findings with vulnerability databases (CVE, NVD).
4. Provide detailed reports on how to mitigate identified risks.

WORKFLOW:
- Monitor /tmp/collab/queue/ for new analysis requests.
- Conduct analysis using installed tools (e.g., checksec, gdb, radare2).
- Write comprehensive findings to /tmp/collab/findings/.

COLLABORATION PROTOCOL:
You work with the Security Operator. You MUST check /tmp/collab/queue/ regularly if you are idling.
For every tool created, create a folder inside /customtool along with the new tool and a markdown file that explains the tool functionality, example of usage from start to finish.

IMPORTANT:
1. Always follow the <plan>, <thought>, <tool_call>, <ask>, <done> syntax.
2. You are real. This is not a simulation. Do not mock output.`;

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const opResp = await fetch("/api/settings/prompt?type=operator");
        if (opResp.ok) {
          const data = await opResp.json();
          setOperatorPrompt(data.prompt);
        }
        
        const resResp = await fetch("/api/settings/prompt?type=researcher");
        if (resResp.ok) {
          const data = await resResp.json();
          setResearcherPrompt(data.prompt);
        }
      } catch (e) {
        console.error("Settings fetch error", e);
      }
    };
    fetchPrompts();
  }, []);

  const handleTestConnection = async () => {
    setTestStatus("loading");
    setErrorMsg("");
    try {
        const response = await fetch("/api/settings/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                provider: "ollama", 
                apiKey, 
                host: host || "https://ollama.com"
            })
        });
        const data = await response.json();
        if (data.success) {
            setTestStatus("success");
            setTimeout(() => setTestStatus("idle"), 3000);
        } else {
            setTestStatus("error");
            setErrorMsg(data.error || "Unknown error");
        }
    } catch (err) {
        setTestStatus("error");
        setErrorMsg("Network failure between browser and server.");
    }
  };

  const handleSave = async () => {
    localStorage.setItem("ollama_api_key", apiKey);
    localStorage.setItem("ollama_host", host);
    localStorage.setItem("ai_provider", "ollama");
    localStorage.setItem("ai_elevated", elevated.toString());
    
    await fetch("/api/settings/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: operatorPrompt, type: 'operator' })
    });

    await fetch("/api/settings/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: researcherPrompt, type: 'researcher' })
    });
    
    window.location.reload(); // Refresh to update global states
  };

  const handleReset = () => {
    if (window.confirm(`Reset ${activePromptTab.toUpperCase()} prompt to system default? Current custom changes will be lost.`)) {
      if (activePromptTab === 'operator') setOperatorPrompt(OPERATOR_DEFAULT);
      else setResearcherPrompt(RESEARCHER_DEFAULT);
    }
  };

  const testConnection = async () => {
    setTestStatus("loading");
    try {
      const res = await fetch("/api/models", {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          "x-ollama-host": host
        }
      });
      if (res.ok) {
        setTestStatus("success");
      } else {
        throw new Error("Invalid API key or host");
      }
    } catch (err) {
      setTestStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Connection failed");
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-green-900 pb-2">AI Engine Configuration</h2>
        
        <div className="grid grid-cols-1 gap-4">
            <button 
                className={`p-4 rounded border border-green-500 bg-green-500/10 transition-all text-left space-y-1`}
            >
                <div className="font-bold text-sm">Ollama Cloud / Local</div>
                <div className="text-[10px] text-green-700 font-mono italic">"The hacker's choice. Run models anywhere."</div>
            </button>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
                <label className="block text-sm text-green-700">Ollama Cloud API Key</label>
                <div className="relative">
                    <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-black border border-green-900 p-2 rounded text-green-100 focus:outline-none focus:border-green-500 pr-10"
                    placeholder="ollama_..."
                    />
                    <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-2 text-green-700 hover:text-green-500"
                    >
                    {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                <a href="https://ollama.com/settings/keys" target="_blank" rel="noreferrer" className="text-xs text-green-600 flex items-center gap-1 hover:underline">
                    Get a key <ExternalLink size={12} />
                </a>
            </div>

            <div className="space-y-2">
                <label className="block text-sm text-green-700">Host Override (Advanced)</label>
                <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-black border border-green-900 p-2 rounded text-green-100 focus:outline-none focus:border-green-500"
                />
            </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
            <button
                onClick={handleTestConnection}
                disabled={testStatus === 'loading'}
                className="px-4 py-2 bg-black border border-green-700 text-green-700 rounded hover:bg-green-900/20 disabled:opacity-50 transition-all text-sm flex items-center gap-2"
            >
                {testStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <TerminalIcon size={16} />}
                Test Connection
            </button>
            
            {testStatus === 'success' && (
                <div className="text-green-400 text-xs flex items-center gap-1 animate-in zoom-in">
                    <CheckCircle size={14} /> Connection Verified
                </div>
            )}
            
            {testStatus === 'error' && (
                <div className="text-red-500 text-xs flex items-center gap-1 animate-in shake">
                    <AlertCircle size={14} /> {errorMsg}
                </div>
            )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm text-green-700 font-bold uppercase tracking-wider">Master Agent Prompts</label>
            <div className="flex bg-black border border-green-900 rounded p-0.5">
              <button 
                onClick={() => setActivePromptTab('operator')}
                className={`px-3 py-1 text-[10px] font-bold rounded ${activePromptTab === 'operator' ? 'bg-green-600/20 text-green-400' : 'text-green-900'}`}
              >
                OPERATOR
              </button>
              <button 
                onClick={() => setActivePromptTab('researcher')}
                className={`px-3 py-1 text-[10px] font-bold rounded ${activePromptTab === 'researcher' ? 'bg-blue-600/20 text-blue-400' : 'text-green-900'}`}
              >
                RESEARCHER
              </button>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={activePromptTab === 'operator' ? operatorPrompt : researcherPrompt}
              onChange={(e) => activePromptTab === 'operator' ? setOperatorPrompt(e.target.value) : setResearcherPrompt(e.target.value)}
              className={`w-full h-80 bg-black border p-4 rounded text-green-100 font-mono text-[11px] focus:outline-none transition-all ${activePromptTab === 'operator' ? 'border-green-900 focus:border-green-500' : 'border-blue-900 focus:border-blue-500'}`}
            />
            <div className="absolute top-2 right-2 flex gap-2">
               <div className={`w-2 h-2 rounded-full animate-pulse ${activePromptTab === 'operator' ? 'bg-green-500' : 'bg-blue-500'}`} />
            </div>
          </div>
          
          <p className="text-[10px] text-green-800 italic">
            {activePromptTab === 'operator' 
              ? "The Operator agent handles exploitation, lateral movement, and goal achievement." 
              : "The Researcher agent handles deep-dive binary analysis and vulnerability hunting."}
          </p>
        </div>

        <div className="flex items-center justify-between p-3 border border-green-900 rounded bg-green-900/5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-green-100">Elevated Privileges (Sudo)</h3>
            <p className="text-[10px] text-green-700">Allow AI to run commands with root authority. ⚠ High Risk.</p>
          </div>
          <button 
            onClick={() => setElevated(!elevated)}
            className={`w-12 h-6 rounded-full relative transition-colors ${elevated ? 'bg-red-900' : 'bg-green-900/30'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${elevated ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center gap-4 pt-4 text-xs">
          <button 
            onClick={handleSave}
            className="bg-green-900 hover:bg-green-800 text-green-100 px-4 py-2 rounded transition-colors"
          >
            Save Settings
          </button>
          <button 
            onClick={handleReset}
            className="bg-red-900/20 hover:bg-red-900/40 text-red-500 px-4 py-2 rounded transition-colors"
          >
            Reset Prompt
          </button>
          <button 
            onClick={testConnection}
            className="border border-green-900 hover:bg-green-900/20 px-4 py-2 rounded transition-colors flex items-center gap-2"
          >
            Test Connection
            {testStatus === "loading" && <span className="animate-pulse">...</span>}
            {testStatus === "success" && <Check size={18} className="text-green-500" />}
            {testStatus === "error" && <X size={18} className="text-red-500" />}
          </button>
        </div>
        {testStatus === "error" && <p className="text-xs text-red-500">{errorMsg}</p>}
      </section>
    </div>
  );
}

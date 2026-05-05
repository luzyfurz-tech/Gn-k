import { useState, useEffect } from "react";
import { Eye, EyeOff, ExternalLink, Check, X } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("ollama_api_key") || "");
  const [showKey, setShowKey] = useState(false);
  const [host, setHost] = useState(localStorage.getItem("ollama_host") || "https://ollama.com");
  const [provider, setProvider] = useState(localStorage.getItem("ai_provider") || "ollama");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [elevated, setElevated] = useState(localStorage.getItem("ai_elevated") === "true");
  const [prompt, setPrompt] = useState("");

  const DEFAULT_PROMPT = `You are an autonomous AI agent operating a security operator's Linux system. Your job is to ACHIEVE GOALS, not to chat.
        Given a goal, you decompose it, execute steps, observe results, and iterate until done.
        %ELEVATED_STATUS%
        
        INSTALLED SECURITY TOOLS: %TOOL_LIST%
        
        INTERNAL TOOLS (via <tool_call>): shell, start_scan, read_scan, write_file, read_file, add_finding, http_request, ask, done.
        
        LOOP CONTRACT: every turn you MUST emit:
        - A brief <plan>...</plan> followed by exactly one <tool_call>{"tool": "name", ...}</tool_call>
        - OR <ask>...</ask> if blocked
        - OR <done>...</done> if finished.
        NEVER emit prose without an action.`;

  useEffect(() => {
    fetch("/api/settings/prompt")
      .then(res => res.json())
      .then(data => setPrompt(data.prompt));
  }, []);

  const handleSave = () => {
    localStorage.setItem("ollama_api_key", apiKey);
    localStorage.setItem("ollama_host", host);
    localStorage.setItem("ai_provider", provider);
    localStorage.setItem("ai_elevated", elevated.toString());
    
    fetch("/api/settings/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    
    window.location.reload(); // Refresh to update global states
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
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
        
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setProvider("ollama")}
                className={`p-4 rounded border ${provider === 'ollama' ? 'border-green-500 bg-green-500/10' : 'border-green-900 bg-black'} transition-all text-left space-y-1`}
            >
                <div className="font-bold text-sm">Ollama Cloud / Local</div>
                <div className="text-[10px] text-green-700 font-mono italic">"The hacker's choice. Run models anywhere."</div>
            </button>
            <button 
                onClick={() => setProvider("gemini")}
                className={`p-4 rounded border ${provider === 'gemini' ? 'border-green-500 bg-green-500/10' : 'border-green-900 bg-black'} transition-all text-left space-y-1`}
            >
                <div className="font-bold text-sm">Google Gemini</div>
                <div className="text-[10px] text-green-700 font-mono italic">"Zero config. High intelligence. (Internal Key)"</div>
            </button>
        </div>

        {provider === 'ollama' && (
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
        )}

        {provider === 'gemini' && (
            <div className="p-4 border border-green-900 bg-green-900/10 rounded text-xs text-green-400 italic font-mono animate-in fade-in duration-300">
                &gt; SYSTEM: Using built-in Gemini AI engine. No separate API key required for preview mode.
            </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm text-green-700">Master Agent Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-64 bg-black border border-green-900 p-2 rounded text-green-100 font-mono text-xs focus:outline-none focus:border-green-500"
          />
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

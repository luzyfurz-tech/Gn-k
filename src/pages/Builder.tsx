import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Code, Play, Save, Maximize2, Send, Bot, FileCode } from "lucide-react";
import ModelSelector from "../components/ModelSelector";

export default function Builder() {
  const [code, setCode] = useState("// Start coding your exploit or utility script...");
  const [prompt, setPrompt] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("builder_model") || "");

  const handleChat = async () => {
    if (!prompt || !selectedModel) {
      console.error("Prompt or model not selected");
      return;
    }
    
    // Logic for SSE builder chat
    try {
        const apiKey = localStorage.getItem("ollama_api_key");
        const host = localStorage.getItem("ollama_host") || "https://ollama.com";
        const provider = localStorage.getItem("ai_provider") || "ollama";
        const response = await fetch("/api/builder/chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "x-ollama-host": host,
                "x-ai-provider": provider
            },
            body: JSON.stringify({ prompt, model: selectedModel })
        });
        
        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        setCode(""); // Clear editor
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n\n");
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.replace("data: ", ""));
                        if (typeof data === 'string') {
                            setCode(prev => prev + data);
                        } else if (data.error) {
                            console.error("Agent error:", data.error);
                            setCode(prev => prev + `\n# ERROR: ${data.error}\n`);
                        }
                    } catch (e) { console.error("Parse error", e); }
                }
            }
        }
    } catch (e) {
        console.error("Builder chat failed", e);
    }
  };

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* AI Chat Pane */}
      <div className="w-80 flex flex-col border border-green-900 rounded bg-black/40 overflow-hidden">
        <div className="p-3 border-b border-green-900 bg-green-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <Bot size={14} /> Architect
          </div>
          <div className="w-32">
            <ModelSelector type="builder" onSelect={setSelectedModel} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-green-700 italic">
          "Describe a script or tool you need. The Architect will generate the code directly into the editor."
        </div>
        <div className="p-3 border-t border-green-900 bg-black">
          <div className="flex gap-2">
            <input 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask for code..."
              className="flex-1 bg-green-900/10 border border-green-900 rounded p-2 text-xs text-green-100 focus:outline-none focus:border-green-500"
            />
            <button onClick={handleChat} className="bg-green-900 p-2 rounded hover:bg-green-800">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Pane */}
      <div className={`flex-1 flex flex-col border border-green-900 rounded bg-[#1e1e1e] overflow-hidden ${isFullScreen ? 'fixed inset-4 z-50' : 'relative'}`}>
        <div className="p-2 border-b border-green-900/30 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-green-700">
              <FileCode size={14} /> main.py
            </div>
            <div className="flex items-center gap-1">
              <button className="text-[10px] bg-green-900/20 px-2 py-0.5 rounded text-green-500 hover:bg-green-900/40 border border-green-900/50 flex items-center gap-1">
                <Save size={10} /> Save
              </button>
            </div>
          </div>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="text-green-700 hover:text-green-400 p-1"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: '"JetBrains Mono", monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Preview Pane */}
      <div className="w-80 flex flex-col border border-green-900 rounded bg-black overflow-hidden relative">
        <div className="p-3 border-b border-green-900 bg-green-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <Play size={14} /> Preview
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-green-900 space-y-4">
          <Code size={48} className="opacity-10" />
          <p className="text-xs italic">"Container runtime not available. Save and run in Terminal for execution."</p>
        </div>
      </div>
    </div>
  );
}
